# schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from pydantic import BaseModel, validator
from typing import ClassVar
from datetime import date


#MARK: INFO PRODUCTO
## --- ESQUEMAS PARA LA INFORMACION DEL PRODUCTO---
class InfoProductoOut(BaseModel):
    id: int
    codigo: str
    nombre_producto: str
    tipo_envase: str
    destino: str
    posibles_lineas_produccion: str
    class Config:
        orm_mode = True

#MARK: INSPECTORES
# --- ESQUEMAS PARA INSPECTORES ---
class InspectorOut(BaseModel):
    id: int
    nombre: str
    class Config:
        from_attributes = True

# 🆕 NUEVO: Esquema para crear inspector
class InspectorCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)

# 🆕 NUEVO: Esquema completo con ID
class InspectorResponse(BaseModel):
    id: int
    nombre: str
    class Config:
        orm_mode = True

# ======================================================
# MARK: TIPOS DEFECTOS
# ======================================================
from datetime import datetime

class TiposDefectosBase(BaseModel):
    codigo: str
    nombre: str
    envase: str
    destino: str
    linea_produccion: str
    tipo_defecto: str
    suma_tipo_defecto: int
    observaciones: str = "---"

class TiposDefectosCreate(TiposDefectosBase):
    pass

class TiposDefectosOut(TiposDefectosBase):
    id: int
    fecha_hora: datetime
    class Config:
        orm_mode = True


# ======================================================
# MARK: TIPOS DEFECTOS DESCRIPCION
# ======================================================
class TiposDefectosDescripcionBase(BaseModel):
    fecha: date                            
    hora: str 
    codigo: str
    nombre: str
    envase: str
    destino: str
    linea_produccion: str
    tipo_defecto: str
    descripcion_defecto: str = "---"
    cantidad_defectos: int = 0

class TiposDefectosDescripcionCreate(TiposDefectosDescripcionBase):
    pass

class TiposDefectosDescripcionOut(TiposDefectosDescripcionBase):
    id: int
    class Config:
        orm_mode = True


