# models.py
"""
Autor: Brayan Avendaño / Maquinando Controls
Versión: 2.0
Fecha: 2024
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


#MARK: INFO PRODUCTO
class InfoProducto(Base):
    __tablename__ = "info_producto"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True)
    nombre_producto = Column(String)
    tipo_envase = Column(String)
    destino = Column(String)
    posibles_lineas_produccion = Column(String)


#MARK: INSPECTORES
class Inspector(Base):
    __tablename__ = "inspectores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)


#MARK: TIPOS DEFECTOS
class TiposDefectos(Base):
    __tablename__ = "tipos_defectos"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    codigo = Column(String, index=True)
    inspector = Column(String)
    lote = Column(String, index=True)
    nombre = Column(String)
    envase = Column(String)
    destino = Column(String)
    linea_produccion = Column(String, index=True)
    tipo_defecto = Column(String, index=True)
    suma_tipo_defecto = Column(Integer, default=0)
    observaciones = Column(String(100), default="---")
    
    # RELACIÓN 1:N con descripciones
    descripciones = relationship(
        "TiposDefectosDescripcion", 
        back_populates="tipos_defectos",
        cascade="all, delete-orphan"
    )

    # Índice compuesto para búsquedas comunes
    __table_args__ = (
        Index('idx_tipos_defectos_busqueda', 'linea_produccion', 'fecha_hora', 'tipo_defecto'),
    )

#MARK: TIPOS DEFECTOS DESCRIPCION
class TiposDefectosDescripcion(Base):
    __tablename__ = "tipos_defectos_descripcion"

    id = Column(Integer, primary_key=True, index=True)
    
    # FOREIGN KEY: Relación con tabla padre
    id_tipos_defectos = Column(
        Integer, 
        ForeignKey('tipos_defectos.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    # Campos específicos del detalle
    fecha = Column(Date, nullable=False, index=True) 
    hora = Column(String, nullable=False) 
    descripcion_defecto = Column(String, default="---")
    cantidad_defectos = Column(Integer, default=0)
    
    # RELACIÓN inversa con padre
    tipos_defectos = relationship("TiposDefectos", back_populates="descripciones")

    # Índice compuesto para mejorar JOINs
    __table_args__ = (
        Index('idx_descripcion_fk_fecha', 'id_tipos_defectos', 'fecha'),
    )

