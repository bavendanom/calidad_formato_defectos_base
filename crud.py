# crud.py
from sqlalchemy.orm import Session
import models, schemas


#MARK: INFO PRODUCTO
# --- FUNCIONES CRUD PARA INSPECTORES ---
def get_producto_by_codigo(db: Session, codigo: str):
    return db.query(models.InfoProducto).filter(models.InfoProducto.codigo == codigo).first()


#MARK: INSPECTORES
# --- FUNCIONES CRUD PARA INSPECTORES ---
def get_inspectores(db: Session):
    return db.query(models.Inspector).all()

# 🆕 NUEVO: Crear inspector
def crear_inspector(db: Session, nombre: str):
    """Crea un nuevo inspector si no existe"""
    inspector_existente = db.query(models.Inspector).filter(models.Inspector.nombre == nombre).first()
    if inspector_existente:
        raise ValueError("El inspector ya existe")
    
    nuevo_inspector = models.Inspector(nombre=nombre)
    db.add(nuevo_inspector)
    db.commit()
    db.refresh(nuevo_inspector)
    return nuevo_inspector

# 🆕 NUEVO: Eliminar inspector
def eliminar_inspector(db: Session, inspector_id: int):
    """Elimina un inspector por ID"""
    inspector = db.query(models.Inspector).filter(models.Inspector.id == inspector_id).first()
    if not inspector:
        raise ValueError("Inspector no encontrado")
    
    db.delete(inspector)
    db.commit()
    return {"mensaje": f"Inspector '{inspector.nombre}' eliminado correctamente"}



# ======================================================
# MARK: TIPOS DEFECTOS
# ======================================================
def crear_tipos_defectos(db: Session, data: schemas.TiposDefectosCreate):
    registro = models.TiposDefectos(**data.dict())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


# ======================================================
# MARK: TIPOS DEFECTOS DESCRIPCION
# ======================================================
def crear_tipos_defectos_descripcion(db: Session, data: schemas.TiposDefectosDescripcionCreate):
    registro = models.TiposDefectosDescripcion(**data.dict())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


# ======================================================
# MARK: HISTORIAL DE REGISTROS
# ======================================================
def obtener_historial_registros(
    db: Session, 
    linea_produccion: str = None, 
    limite: int = 20, 
    offset: int = 0,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None
):
    """
    Obtiene el historial de registros con filtros opcionales.
    
    Args:
        db: Sesión de base de datos
        linea_produccion: Filtrar por línea (None = todas)
        limite: Número máximo de registros
        offset: Número de registros a saltar (para paginación)
        fecha_inicio: Fecha inicial (formato: YYYY-MM-DD)
        fecha_fin: Fecha final (formato: YYYY-MM-DD)
        tipo_defecto: Filtrar por tipo de defecto
    """
    query = db.query(models.TiposDefectosDescripcion)
    
    # Filtrar por línea de producción
    if linea_produccion:
        query = query.filter(models.TiposDefectosDescripcion.linea_produccion == linea_produccion)
    
    # Filtrar por rango de fechas
    if fecha_inicio:
        query = query.filter(models.TiposDefectosDescripcion.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(models.TiposDefectosDescripcion.fecha <= fecha_fin)
    
    # Filtrar por tipo de defecto
    if tipo_defecto and tipo_defecto != "todos":
        query = query.filter(models.TiposDefectosDescripcion.tipo_defecto == tipo_defecto)
    
    # Ordenar por fecha y hora descendente (más recientes primero)
    query = query.order_by(
        models.TiposDefectosDescripcion.fecha.desc(),
        models.TiposDefectosDescripcion.hora.desc(),
        models.TiposDefectosDescripcion.id.desc()
    )
    
    # Aplicar paginación
    registros = query.offset(offset).limit(limite).all()
    
    # Obtener total de registros (para paginación)
    total = query.count()
    
    return {
        "registros": registros,
        "total": total,
        "pagina_actual": offset // limite + 1,
        "total_paginas": (total + limite - 1) // limite
    }


def obtener_tipos_defectos_unicos(db: Session, linea_produccion: str = None):
    """Obtiene lista única de tipos de defectos para filtros."""
    query = db.query(models.TiposDefectosDescripcion.tipo_defecto).distinct()
    
    if linea_produccion:
        query = query.filter(models.TiposDefectosDescripcion.linea_produccion == linea_produccion)
    
    return [tipo[0] for tipo in query.all() if tipo[0]]