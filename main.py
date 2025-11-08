# main.py
"""
API FastAPI para Control de Calidad - Sistema de Registro de Defectos.

Este módulo implementa una API REST completa para gestionar el registro,
consulta y análisis de defectos en líneas de producción. Incluye funcionalidades
de autenticación, autocompletado, historial y gestión de inspectores.

Autor: Brayan Avendaño / Maquinando Controls
Versión: 2.0
Fecha: 2024
"""
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from typing import List
import models, schemas, crud
from database import engine, Base, get_db
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware  # IMPORTANTE: Agregar esto
import logging
import time
from pydantic import BaseModel
import os
from typing import List
from schemas import (
    TiposDefectosCreate,
    TiposDefectosDescripcionCreate
)

# ===============================
# MARK: CONFIGURACIÓN INICIAL
# ===============================

logging.basicConfig(level=logging.DEBUG)

print("Base de datos conectada a:", engine.url)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Control de Calidad - Defectos")

# Función para esperar a que la base de datos esté disponible
def wait_for_db(max_retries=5, retry_interval=5):
    """
    Espera a que la base de datos esté disponible antes de continuar.
    
    Implementa un mecanismo de reintentos para conectar a la base de datos,
    
    Args:
        max_retries (int, optional): Número máximo de intentos de conexión. 
            Defaults to 5.
        retry_interval (int, optional): Segundos de espera entre reintentos. 
            Defaults to 5.
    
    Returns:
        bool: True si la conexión fue exitosa, False en caso contrario.
    
    Raises:
        OperationalError: Si no se puede conectar después de todos los intentos.
    
    Example:
        >>> wait_for_db(max_retries=3, retry_interval=10)
        ✅ Conexión a la base de datos exitosa (intento 1)
        True
    """
    for attempt in range(max_retries):
        try:
            # Intentar conectar a la base de datos
            with engine.connect() as conn:
                print(f"✅ Conexión a la base de datos exitosa (intento {attempt + 1})")
                return True
        except OperationalError as e:
            print(f"❌ Intento {attempt + 1} de {max_retries}: No se pudo conectar a la base de datos")
            print(f"   Error: {e}")
            if attempt < max_retries - 1:
                print(f"   Reintentando en {retry_interval} segundos...")
                time.sleep(retry_interval)
            else:
                print("❌ No se pudo conectar a la base de datos después de todos los intentos")
                raise e
    return False

# Crear tablas si no existen (después de esperar a que la BD esté disponible)
try:
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente!")
except Exception as e:
    print(f"❌ Error al crear tablas: {e}")

#app = FastAPI(title="API Control de Calidad - Defectos")

# ===============================
# MARK: CONFIGURACIÓN CORS
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===============================
# MARK: CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS Y PLANTILLAS
# ===============================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ===============================
# MARK: ENDPOINTS DE INTERFAZ WEB
# ===============================
@app.get("/", response_class=HTMLResponse)
def mostrar_formulario(request: Request):
    """
    Renderiza la página principal del sistema.
    
    Muestra el formulario de registro de defectos con todas las líneas
    de producción disponibles.
    
    Args:
        request (Request): Objeto de solicitud FastAPI requerido por Jinja2.
    
    Returns:
        HTMLResponse: Página HTML renderizada con index.html.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/formulario", response_class=HTMLResponse)
def mostrar_formulario_alternativo(request: Request):
    """
    Ruta alternativa para mostrar el formulario principal.
    
    Endpoint adicional que renderiza la misma interfaz que la raíz (/),
    útil para mantener compatibilidad con rutas antiguas.
    
    Args:
        request (Request): Objeto de solicitud FastAPI.
    
    Returns:
        HTMLResponse: Página HTML renderizada con index.html.
    """
    return templates.TemplateResponse("index.html", {"request": request})


# ===============================
# MARK: ENDPOINTS DE API - PRODUCTOS
# ===============================
@app.get("/api/")
def root():
    """
    Endpoint raíz de la API para verificar disponibilidad.
    
    Returns:
        dict: Mensaje de confirmación de que la API está funcionando.
    
    Example:
        >>> GET /api/
        {"mensaje": "API de Control de Calidad funcionando correctamente"}
    """
    return {"mensaje": "API de Control de Calidad funcionando correctamente"}


@app.get("/producto/{codigo}", response_model=schemas.InfoProductoOut)
def get_producto(codigo: str, db: Session = Depends(get_db)):
    """
    Obtiene información completa de un producto por su código AX.
    
    Consulta la base de datos de productos para recuperar toda la información
    asociada a un código específico, incluyendo nombre, tipo de envase, destino
    y líneas de producción posibles.
    
    Args:
        codigo (str): Código AX del producto (ej: "4-03-0000-0019").
        db (Session, optional): Sesión de base de datos inyectada por FastAPI.
    
    Returns:
        InfoProductoOut: Objeto con información completa del producto.
    
    Example:
        >>> GET /producto/4-03-0000-0019
        {
            "id": 1,
            "codigo": "4-03-0000-0019",
            "nombre_producto": "JUGO NARANJA 1L",
            "tipo_envase": "BOTELLA PET",
            "destino": "NACIONAL",
            "posibles_lineas_produccion": "Linea 1, Linea 2"
        }
    
    Note:
        Si el código no existe, retorna {"error": "No encontrado"}.
    """
    producto = crud.get_producto_by_codigo(db, codigo)
    if not producto:
        return {"error": "No encontrado"}
    return producto

#  Búsqueda de productos para autocompletado
@app.get("/api/productos/buscar/")
def buscar_productos(q: str, db: Session = Depends(get_db)):
    """
    Busca productos por código para autocompletado en el formulario.
    
    Implementa búsqueda parcial case-insensitive en la base de datos de productos,
    útil para el autocompletado en tiempo real del campo de código AX.
    
    Args:
        q (str): Término de búsqueda (mínimo 2 caracteres).
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        List[dict]: Lista de diccionarios con códigos que coinciden con la búsqueda.
            Máximo 10 resultados.
    
    Example:
        >>> GET /api/productos/buscar/?q=4-03
        [
            {"codigo": "4-03-0000-0019"},
            {"codigo": "4-03-0000-0020"},
            {"codigo": "4-03-0001-0015"}
        ]
    
    Note:
        - Retorna lista vacía si q tiene menos de 2 caracteres
        - Usa búsqueda ILIKE para coincidir parcialmente
    """
    if len(q) < 2:
        return []
    
    # Buscar productos cuyo código contenga el término de búsqueda
    productos = db.query(models.InfoProducto).filter(
        models.InfoProducto.codigo.ilike(f"%{q}%")
    ).limit(10).all()
    
    # Retornar solo los códigos
    return [{"codigo": p.codigo} for p in productos]



# ===============================
# MARK: ENDPOINTS DE API - INSPECTORES
# ===============================
@app.get("/inspectores/", response_model=List[str])  
def obtener_inspectores(db: Session = Depends(get_db)):
    """
    Obtiene lista de nombres de inspectores para el selector del formulario.
    
    Endpoint legacy que retorna solo los nombres de inspectores, usado por
    el formulario principal para poblar el dropdown de selección.
    
    Args:
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        List[str]: Lista de nombres de inspectores registrados.
    
    Example:
        >>> GET /inspectores/
        ["Juan Pérez", "María García", "Carlos López"]
    """
    inspectores = crud.get_inspectores(db)
    return [inspector.nombre for inspector in inspectores]

# Obtener inspectores completos (con ID)
@app.get("/api/inspectores/", response_model=List[schemas.InspectorResponse])
def obtener_inspectores_completos(db: Session = Depends(get_db)):
    """
    Obtiene lista completa de inspectores con ID para el panel de administración.
    
    Retorna información completa de todos los inspectores registrados, incluyendo
    su ID único. Usado exclusivamente por el panel de administración para gestión
    de inspectores.
    
    Args:
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        List[InspectorResponse]: Lista de objetos con id y nombre de cada inspector.
    
    Example:
        >>> GET /api/inspectores/
        [
            {"id": 1, "nombre": "Juan Pérez"},
            {"id": 2, "nombre": "María García"}
        ]
    """
    return crud.get_inspectores(db)


# Crear inspector
@app.post("/api/inspectores/", response_model=schemas.InspectorResponse)
def crear_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo inspector en el sistema.
    
    Valida que el nombre del inspector sea único y tiene al menos 3 caracteres.
    Solo accesible desde el panel de administración autenticado.
    
    Args:
        inspector (InspectorCreate): Objeto con el nombre del inspector.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        InspectorResponse: Inspector creado con su ID asignado.
    
    Raises:
        HTTPException 400: Si el inspector ya existe o el nombre es inválido.
    
    Example:
        >>> POST /api/inspectores/
        >>> Body: {"nombre": "Pedro Ramírez"}
        {"id": 3, "nombre": "Pedro Ramírez"}
    """
    try:
        return crud.crear_inspector(db, inspector.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Eliminar inspector
@app.delete("/api/inspectores/{inspector_id}")
def eliminar_inspector(inspector_id: int, db: Session = Depends(get_db)):
    """
    Elimina un inspector del sistema por su ID.
    
    Solo accesible desde el panel de administración. Elimina permanentemente
    el inspector de la base de datos.
    
    Args:
        inspector_id (int): ID único del inspector a eliminar.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        dict: Mensaje de confirmación con el nombre del inspector eliminado.
    
    Raises:
        HTTPException 404: Si el inspector_id no existe.
    
    Example:
        >>> DELETE /api/inspectores/3
        {"mensaje": "Inspector 'Pedro Ramírez' eliminado correctamente"}
    
    Warning:
        Esta acción es irreversible. No elimina los registros de defectos
        asociados al inspector.
    """
    try:
        return crud.eliminar_inspector(db, inspector_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))



# ===============================
# MARK: ENDPOINTS DE API - HISTORIAL
# ===============================

# Obtener historial de registros
@app.get("/api/historial/")
def obtener_historial(
    linea: str = None,
    limite: int = 20,
    pagina: int = 1,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None,
    lote: str = None, 
    codigo: str = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene historial detallado de defectos con filtros y paginación.
    
    Consulta la tabla tipos_defectos_descripcion para obtener el registro
    detallado por hora de cada tipo de defecto encontrado. Soporta múltiples
    filtros simultáneos y paginación para grandes volúmenes de datos.
    
    Args:
        linea (str, optional): Filtrar por línea de producción 
            (ej: "Linea 1", "Tetrapack"). None = todas las líneas.
        limite (int, optional): Número de registros por página. Defaults to 20.
        pagina (int, optional): Número de página a consultar. Defaults to 1.
        fecha_inicio (str, optional): Fecha inicial en formato YYYY-MM-DD.
        fecha_fin (str, optional): Fecha final en formato YYYY-MM-DD.
        tipo_defecto (str, optional): Filtrar por tipo específico 
            (ej: "LLENADO", "CAPSULADO").
        lote (str, optional): Búsqueda parcial en número de lote.
        codigo (str, optional): Búsqueda parcial en código AX.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        dict: Diccionario con estructura:
            - registros (List[dict]): Lista de registros de la página actual.
            - total (int): Total de registros que cumplen los filtros.
            - pagina_actual (int): Número de página actual.
            - total_paginas (int): Total de páginas disponibles.
    
    Example:
        >>> GET /api/historial/?linea=Linea%201&fecha_inicio=2024-01-01&limite=10
        {
            "registros": [
                {
                    "id": 123,
                    "fecha": "15/01/2024",
                    "hora": "08:00",
                    "codigo": "4-03-0000-0019",
                    "lote": "115",
                    ...
                }
            ],
            "total": 45,
            "pagina_actual": 1,
            "total_paginas": 5
        }
    
    Note:
        - Las búsquedas en lote y código son parciales (ILIKE)
        - Los registros se ordenan por ID descendente (más recientes primero)
    """
    offset = (pagina - 1) * limite
    resultado = crud.obtener_historial_registros(
        db=db,
        linea_produccion=linea,
        limite=limite,
        offset=offset,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        tipo_defecto=tipo_defecto,
        lote=lote, 
        codigo=codigo
    )
    
    # Serializar registros
    registros_serializados = []
    for reg in resultado["registros"]:
        registros_serializados.append({
            "id": reg.id,
            "fecha": reg.fecha.strftime("%d/%m/%Y") if reg.fecha else None,
            "hora": reg.hora,
            "codigo": reg.codigo,
            "lote": reg.lote,
            "nombre": reg.nombre,
            "envase": reg.envase,
            "destino": reg.destino,
            "linea_produccion": reg.linea_produccion,
            "tipo_defecto": reg.tipo_defecto,
            "descripcion_defecto": reg.descripcion_defecto,
            "cantidad_defectos": reg.cantidad_defectos
        })
    
    return {
        "registros": registros_serializados,
        "total": resultado["total"],
        "pagina_actual": resultado["pagina_actual"],
        "total_paginas": resultado["total_paginas"]
    }

# Obtener historial de resumen (tipos_defectos)
@app.get("/api/historial-resumen/")
def obtener_historial_resumen(
    linea: str = None,
    limite: int = 20,
    pagina: int = 1,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None,
    lote: str = None,  
    codigo: str = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene historial resumido de defectos agrupados por tipo.
    
    Consulta la tabla tipos_defectos para obtener totales consolidados
    por tipo de defecto. Útil para análisis y reportes agregados.
    
    Args:
        linea (str, optional): Filtrar por línea de producción.
        limite (int, optional): Registros por página. Defaults to 20.
        pagina (int, optional): Número de página. Defaults to 1.
        fecha_inicio (str, optional): Fecha inicial (YYYY-MM-DD).
        fecha_fin (str, optional): Fecha final (YYYY-MM-DD).
        tipo_defecto (str, optional): Filtrar por tipo específico.
        lote (str, optional): Búsqueda parcial en lote.
        codigo (str, optional): Búsqueda parcial en código AX.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        dict: Estructura con registros resumidos, total, página actual y total de páginas.
    
    Example:
        >>> GET /api/historial-resumen/?linea=Linea%201&tipo_defecto=LLENADO
        {
            "registros": [
                {
                    "id": 45,
                    "fecha_hora": "2024-01-15T14:30:00",
                    "codigo": "4-03-0000-0019",
                    "tipo_defecto": "LLENADO",
                    "suma_tipo_defecto": 15,
                    "observaciones": "Nivel bajo detectado en varios momentos"
                }
            ],
            "total": 12,
            "pagina_actual": 1,
            "total_paginas": 2
        }
    
    Note:
        - Cada registro representa el total de un tipo de defecto en un guardado
        - Incluye observaciones generales del tipo de defecto
    """
    offset = (pagina - 1) * limite
    resultado = crud.obtener_historial_resumen(
        db=db,
        linea_produccion=linea,
        limite=limite,
        offset=offset,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        tipo_defecto=tipo_defecto,
        lote=lote,
        codigo=codigo
    )
    
    # Serializar registros
    registros_serializados = []
    for reg in resultado["registros"]:
        registros_serializados.append({
            "id": reg.id,
            "fecha_hora": reg.fecha_hora.isoformat() if reg.fecha_hora else None,
            "codigo": reg.codigo,
            "lote": reg.lote,
            "nombre": reg.nombre,
            "envase": reg.envase,
            "destino": reg.destino,
            "linea_produccion": reg.linea_produccion,
            "tipo_defecto": reg.tipo_defecto,
            "suma_tipo_defecto": reg.suma_tipo_defecto,
            "observaciones": reg.observaciones
        })
    
    return {
        "registros": registros_serializados,
        "total": resultado["total"],
        "pagina_actual": resultado["pagina_actual"],
        "total_paginas": resultado["total_paginas"]
    }




# Obtener tipos de defectos únicos para filtros
@app.get("/api/tipos-defectos/")
def obtener_tipos_defectos(linea: str = None, db: Session = Depends(get_db)):
    """
    Obtiene lista única de tipos de defectos para filtros del historial.
    
    Consulta los tipos de defectos existentes en la base de datos para
    poblar el selector de filtros en la interfaz de historial.
    
    Args:
        linea (str, optional): Filtrar tipos por línea de producción específica.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        List[str]: Lista de tipos de defectos únicos encontrados.
    
    Example:
        >>> GET /api/tipos-defectos/?linea=Linea%201
        ["LLENADO", "CAPSULADO", "ETIQUETADO", "VIDEO JET", "EMBALAJE"]
    
    Note:
        Útil para generar dinámicamente las opciones del filtro de tipo de defecto.
    """
    return crud.obtener_tipos_defectos_unicos(db, linea)

# Búsqueda de códigos AX en registros de defectos para autocompletado
@app.get("/api/codigos/buscar/")
def buscar_codigos_defectos(
    q: str, 
    linea: str = None,
    tipo_historial: str = "detallado",  # "detallado" o "resumen"
    db: Session = Depends(get_db)
):
    """
    Busca códigos AX en registros de defectos para autocompletado de filtros.
    
    Implementa búsqueda inteligente de códigos AX directamente en los registros
    de defectos (no en el catálogo de productos), adaptándose al tipo de historial
    activo (detallado o resumen). Útil para el autocompletado del filtro de código
    en la sección de historial.
    
    Args:
        q (str): Término de búsqueda (mínimo 2 caracteres).
        linea (str, optional): Filtrar por línea de producción específica.
            None o "Admin" busca en todas las líneas.
        tipo_historial (str, optional): Tabla a consultar: "detallado" 
            (tipos_defectos_descripcion) o "resumen" (tipos_defectos). 
            Defaults to "detallado".
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        List[dict]: Lista de diccionarios con códigos únicos encontrados.
            Máximo 10 resultados.
    
    Example:
        >>> GET /api/codigos/buscar/?q=4-03&linea=Linea%201&tipo_historial=detallado
        [
            {"codigo": "4-03-0000-0019"},
            {"codigo": "4-03-0000-0020"}
        ]
    
    Note:
        - Búsqueda case-insensitive (ILIKE)
        - Retorna lista vacía si q < 2 caracteres
        - Se adapta automáticamente al tipo de historial que el usuario está viendo
    """
    if len(q) < 2:
        return []
    
    # Determinar en qué tabla buscar según el tipo de historial activo
    if tipo_historial == "detallado":
        query = db.query(models.TiposDefectosDescripcion.codigo).distinct()
        
        # Filtrar por código
        query = query.filter(models.TiposDefectosDescripcion.codigo.ilike(f"%{q}%"))
        
        # Filtrar por línea si se especifica
        if linea and linea != "Admin":
            query = query.filter(models.TiposDefectosDescripcion.linea_produccion == linea)
        
        # Limitar resultados
        codigos = query.limit(10).all()
    else:  # resumen
        query = db.query(models.TiposDefectos.codigo).distinct()
        
        # Filtrar por código
        query = query.filter(models.TiposDefectos.codigo.ilike(f"%{q}%"))
        
        # Filtrar por línea si se especifica
        if linea and linea != "Admin":
            query = query.filter(models.TiposDefectos.linea_produccion == linea)
        
        # Limitar resultados
        codigos = query.limit(10).all()
    
    # Retornar solo los códigos únicos
    return [{"codigo": codigo[0]} for codigo in codigos if codigo[0]]


# ===============================
# MARK: ENDPOINTS DE API - GUARDADO DE DEFECTOS
# ===============================

@app.post("/guardar_defectos/")
def guardar_defectos(
    registros: List[TiposDefectosCreate],
    db: Session = Depends(get_db)
):
    """
    Guarda totales consolidados por tipo de defecto (guardado manual).
    
    Endpoint llamado cuando el usuario presiona el botón "Guardar" en el formulario.
    Guarda los totales agrupados por tipo de defecto en la tabla tipos_defectos,
    incluyendo observaciones específicas por tipo.
    
    Args:
        registros (List[TiposDefectosCreate]): Lista de registros con totales
            por tipo de defecto a guardar.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        dict: Mensaje de confirmación con el número de registros guardados.
    
    Raises:
        HTTPException 500: Si ocurre un error durante el guardado.
    
    Example:
        >>> POST /guardar_defectos/
        >>> Body: [
                {
                    "codigo": "4-03-0000-0019",
                    "inspector": "Juan Pérez",
                    "lote": "115",
                    "tipo_defecto": "LLENADO",
                    "suma_tipo_defecto": 15,
                    "observaciones": "Nivel bajo"
                }
            ]
        {"status": "ok", "message": "1 registros guardados correctamente."}
    
    Note:
        - Hace rollback automático si hay errores
        - Solo guarda tipos con suma > 0
    """
    try:
        for data in registros:
            crud.crear_tipos_defectos(db, data)
        return {"status": "ok", "message": f"{len(registros)} registros guardados correctamente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auto_guardado/")
def auto_guardado(
    registros: List[TiposDefectosDescripcionCreate],
    db: Session = Depends(get_db)
):
    """
    Autoguarda descripciones detalladas y cantidades por hora (guardado automático).
    
    Endpoint llamado automáticamente desde el frontend para guardar el detalle
    completo de cada defecto: descripción específica, hora y cantidad. Se guarda
    en la tabla tipos_defectos_descripcion para mantener trazabilidad completa.
    
    Args:
        registros (List[TiposDefectosDescripcionCreate]): Lista de registros
            detallados con descripción, hora y cantidad específica.
        db (Session, optional): Sesión de base de datos.
    
    Returns:
        dict: Mensaje de confirmación con el número de registros guardados.
    
    Raises:
        HTTPException 500: Si ocurre un error durante el guardado.
    
    Example:
        >>> POST /auto_guardado/
        >>> Body: [
                {
                    "fecha": "2024-01-15",
                    "hora": "08:00",
                    "codigo": "4-03-0000-0019",
                    "tipo_defecto": "LLENADO",
                    "descripcion_defecto": "Nivel de llenado bajo",
                    "cantidad_defectos": 3
                }
            ]
        {"status": "ok", "message": "1 registros autoguardados correctamente."}
    
    Note:
        - Guarda cada celda con valor > 0 individualmente
        - Permite análisis detallado por hora y descripción específica
    """
    try:
        for data in registros:
            crud.crear_tipos_defectos_descripcion(db, data)
        return {"status": "ok", "message": f"{len(registros)} registros autoguardados correctamente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

# ===============================
# MARK: ENDPOINTS DE API - AUTENTICACIÓN
# ===============================

# Contraseña configurable (puedes cambiarla aquí o usar variables de entorno)
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

class LoginRequest(BaseModel):
    """
    Modelo de solicitud para autenticación de administrador.
    
    Attributes:
        password (str): Contraseña de administrador a verificar.
    """
    password: str

@app.post("/api/admin/login")
def admin_login(request: LoginRequest):
    """
    Verifica credenciales de administrador y retorna token de sesión.
    
    Endpoint de autenticación para acceso al panel de administración.
    Valida la contraseña contra la contraseña configurada del sistema.
    
    Args:
        request (LoginRequest): Objeto con la contraseña a verificar
    Returns:
        dict: Diccionario con estado de autenticación:
            - success (bool): True si la autenticación fue exitosa.
            - message (str): Mensaje descriptivo del resultado.
            - session_token (str): Token de sesión para mantener autenticación.
    
    Raises:
        HTTPException 401: Si la contraseña es incorrecta.
    
    Example:
        >>> POST /api/admin/login
        >>> Body: {"password": "admin123"}
        {
            "success": true,
            "message": "Autenticación exitosa",
            "session_token": "admin_authenticated"
        }
    
    Security:
        - La contraseña se configura mediante variable de entorno ADMIN_PASSWORD
        - En producción, implementar JWT tokens y hash de contraseñas
        - Considerar implementar rate limiting para prevenir fuerza bruta
    
    Note:
        Este es un sistema de autenticación básico. Para producción, se recomienda:
        - Usar JWT (JSON Web Tokens)
        - Hash de contraseñas con bcrypt
        - Implementar rate limiting
        - Agregar autenticación de dos factores
    """
    if request.password == ADMIN_PASSWORD:
        return {
            "success": True,
            "message": "Autenticación exitosa",
            "session_token": "admin_authenticated"
        }
    else:
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta"
        )