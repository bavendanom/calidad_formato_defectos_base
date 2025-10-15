# models.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

# --- MODELO PARA DEFECTOS ---
class Defecto(Base):
    __tablename__ = "defectos"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime) 
    inspector = Column(String(100))
    lote = Column(String(50))
    linea = Column(String(50))
    producto = Column(String(100))
    presentacion = Column(String(50))
    maquina = Column(String(50))
    tipo_defecto = Column(String(100))
    descripcion_defecto = Column(String(200))
    cantidad_defectos = Column(Integer)


# --- MODELO PARA INSPECTORES ---
class Inspector(Base):
    __tablename__ = "inspectores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)