# schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from pydantic import BaseModel, validator
from typing import ClassVar


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

