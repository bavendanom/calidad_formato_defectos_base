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
