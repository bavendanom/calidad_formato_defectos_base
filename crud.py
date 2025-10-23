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


