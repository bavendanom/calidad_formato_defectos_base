# crud.py
from sqlalchemy.orm import Session
import models, schemas

def get_defectos(db: Session):
   return db.query(models.Defecto).all()

def get_ultimos_defectos(db: Session, limit: int = 10):
    """Obtiene los últimos 'limit' defectos registrados."""
    return (
        db.query(models.Defecto)
        .order_by(models.Defecto.id.desc())
        .limit(limit)
        .all()
    )

def create_defecto(db: Session, defecto: schemas.DefectoCreate):
    db_defecto = models.Defecto(**defecto.dict())
    db.add(db_defecto)
    db.commit()
    db.refresh(db_defecto)
    return db_defecto


# ==============================================
# --- FUNCIONES CRUD PARA INSPECTORES ---
# ==============================================

def get_inspector_by_name(db: Session, nombre: str):
    """Busca un inspector por su nombre."""
    return db.query(models.Inspector).filter(models.Inspector.nombre == nombre).first()

def get_inspectores(db: Session):
    """Devuelve todos los inspectores ordenados por nombre."""
    return db.query(models.Inspector).order_by(models.Inspector.nombre).all()

def create_inspector(db: Session, inspector: schemas.InspectorCreate):
    """Crea un nuevo inspector en la base de datos."""
    db_inspector = models.Inspector(nombre=inspector.nombre)
    db.add(db_inspector)
    db.commit()
    db.refresh(db_inspector)
    return db_inspector

def delete_inspector(db: Session, nombre: str):
    """Elimina un inspector por su nombre."""
    db_inspector = get_inspector_by_name(db, nombre)
    if db_inspector:
        db.delete(db_inspector)
        db.commit()
    return db_inspector