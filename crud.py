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
