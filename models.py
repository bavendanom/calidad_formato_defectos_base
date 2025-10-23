# models.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base



#MARK: INFO PRODUCTO
# --- MODELO PARA INFORMACION DEL PRODUCTO ---
class InfoProducto(Base):
    __tablename__ = "info_producto"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True)
    nombre_producto = Column(String)
    tipo_envase = Column(String)
    destino = Column(String)
    posibles_lineas_produccion = Column(String)


#MARK: INSPECTORES
# --- MODELO PARA INSPECTORES ---
class Inspector(Base):
    __tablename__ = "inspectores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)


#MARK: TIPOS DEFECTOS
class TiposDefectos(Base):
    __tablename__ = "tipos_defectos"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    codigo = Column(String)
    nombre = Column(String)
    envase = Column(String)
    destino = Column(String)
    linea_produccion = Column(String)
    tipo_defecto = Column(String)
    suma_tipo_defecto = Column(Integer, default=0)


#MARK: TIPOS DEFECTOS DESCRIPCION
class TiposDefectosDescripcion(Base):
    __tablename__ = "tipos_defectos_descripcion"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    codigo = Column(String)
    nombre = Column(String)
    envase = Column(String)
    destino = Column(String)
    linea_produccion = Column(String)
    tipo_defecto = Column(String)
    descripcion_defecto = Column(String, default="---")
    cantidad_defectos = Column(Integer, default=0)
