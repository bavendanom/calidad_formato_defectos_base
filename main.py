# main.py
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






logging.basicConfig(level=logging.DEBUG)

print("Base de datos conectada a:", engine.url)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Control de Calidad - Defectos")

# Función para esperar a que la base de datos esté disponible
def wait_for_db(max_retries=5, retry_interval=5):
    """Espera a que la base de datos esté disponible antes de continuar"""
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
# CONFIGURACIÓN CORS CRÍTICA
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===============================
# Servir archivos estáticos y plantillas
# ===============================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def mostrar_formulario(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/formulario", response_class=HTMLResponse)
def mostrar_formulario_alternativo(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ----------------------------
# Ruta raíz API
# ----------------------------
@app.get("/api/")
def root():
    return {"mensaje": "API de Control de Calidad funcionando correctamente"}


@app.get("/producto/{codigo}", response_model=schemas.InfoProductoOut)
def get_producto(codigo: str, db: Session = Depends(get_db)):
    producto = crud.get_producto_by_codigo(db, codigo)
    if not producto:
        return {"error": "No encontrado"}
    return producto

#  Búsqueda de productos para autocompletado
@app.get("/api/productos/buscar/")
def buscar_productos(q: str, db: Session = Depends(get_db)):
    """
    Busca productos por código para autocompletado.
    Parámetro q: término de búsqueda (mínimo 2 caracteres)
    """
    if len(q) < 2:
        return []
    
    # Buscar productos cuyo código contenga el término de búsqueda
    productos = db.query(models.InfoProducto).filter(
        models.InfoProducto.codigo.ilike(f"%{q}%")
    ).limit(10).all()
    
    # Retornar solo los códigos
    return [{"codigo": p.codigo} for p in productos]

@app.get("/inspectores/", response_model=List[str])  
def obtener_inspectores(db: Session = Depends(get_db)):
    """Devuelve solo los nombres de los inspectores."""
    inspectores = crud.get_inspectores(db)
    return [inspector.nombre for inspector in inspectores]

# 🆕 NUEVO: Obtener inspectores completos (con ID)
@app.get("/api/inspectores/", response_model=List[schemas.InspectorResponse])
def obtener_inspectores_completos(db: Session = Depends(get_db)):
    """Devuelve todos los inspectores con su ID (para admin)."""
    return crud.get_inspectores(db)


# 🆕 NUEVO: Crear inspector
@app.post("/api/inspectores/", response_model=schemas.InspectorResponse)
def crear_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(get_db)):
    """Crea un nuevo inspector."""
    try:
        return crud.crear_inspector(db, inspector.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 🆕 NUEVO: Eliminar inspector
@app.delete("/api/inspectores/{inspector_id}")
def eliminar_inspector(inspector_id: int, db: Session = Depends(get_db)):
    """Elimina un inspector por ID."""
    try:
        return crud.eliminar_inspector(db, inspector_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# 🆕 NUEVO: Obtener historial de registros
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
    Obtiene el historial de registros con filtros opcionales.
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
        lote=lote,  # 🆕 NUEVO
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


# 🆕 NUEVO: Obtener tipos de defectos únicos para filtros
@app.get("/api/tipos-defectos/")
def obtener_tipos_defectos(linea: str = None, db: Session = Depends(get_db)):
    """Obtiene lista única de tipos de defectos."""
    return crud.obtener_tipos_defectos_unicos(db, linea)


# ======================================================
# MARK: GUARDADO DE DEFECTOS
# ======================================================

@app.post("/guardar_defectos/")
def guardar_defectos(
    registros: List[TiposDefectosCreate],
    db: Session = Depends(get_db)
):
    """Guarda los totales por tipo de defecto (botón Guardar manual)."""
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
    """Autoguarda las descripciones y cantidades (cada 60 min)."""
    try:
        for data in registros:
            crud.crear_tipos_defectos_descripcion(db, data)
        return {"status": "ok", "message": f"{len(registros)} registros autoguardados correctamente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

# 🆕 NUEVO: Autenticación para Admin
# ======================================================
# MARK: AUTENTICACIÓN ADMIN
# ======================================================

# Contraseña configurable (puedes cambiarla aquí o usar variables de entorno)
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

class LoginRequest(BaseModel):
    password: str

@app.post("/api/admin/login")
def admin_login(request: LoginRequest):
    """
    Verifica la contraseña de administrador.
    Retorna un token de sesión si es correcta.
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


# 🆕 NUEVO: Obtener historial de resumen (tipos_defectos)
@app.get("/api/historial-resumen/")
def obtener_historial_resumen(
    linea: str = None,
    limite: int = 20,
    pagina: int = 1,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None,
    lote: str = None,  # 🆕 NUEVO
    codigo: str = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial de la tabla tipos_defectos (resumen por tipo).
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
