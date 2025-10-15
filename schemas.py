# schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from pydantic import BaseModel, validator
from typing import ClassVar

# ==============================================
# Esquema de creación (para POST)
# ==============================================
class DefectoCreate(BaseModel):
    fecha_hora: datetime = Field(
        ...,
        example="2025-10-07T12:00:00"
    )
    inspector: str = Field(..., example="Juan Pérez")
    lote: str = Field(..., example="L-12345")
    linea: str = Field(..., example="Línea 1")
    producto: str = Field(..., example="Tradicional Aguardiente")
    presentacion: str = Field(..., example="750 ml")
    maquina: str = Field(..., example="Monoblock")
    tipo_defecto: str = Field(..., example="LLENADO")
    descripcion_defecto: str = Field(..., example="Nivel de llenado alto o bajo")
    cantidad_defectos: int = Field(..., example=5)


    @validator("producto")
    def producto_valido(cls, v, values):
        linea = values.get("linea")
        if linea not in LINEA_PRODUCTO_PRESENTACION:
            raise ValueError(f"Línea inválida: {linea}")
        if v not in LINEA_PRODUCTO_PRESENTACION[linea]:
            raise ValueError(f"Producto '{v}' no corresponde a la línea '{linea}'")
        return v

    @validator("presentacion")
    def presentacion_valida(cls, v, values):
        linea = values.get("linea")
        producto = values.get("producto")
        if linea and producto:
            opciones = LINEA_PRODUCTO_PRESENTACION[linea][producto]
            if v not in opciones:
                raise ValueError(f"Presentación '{v}' no válida para '{producto}' en '{linea}'")
        return v

    @validator("descripcion_defecto")
    def descripcion_valida(cls, v, values):
        tipo = values.get("tipo_defecto")
        if tipo not in TIPO_DEFECTO_DESCRIPCION:
            raise ValueError(f"Tipo de defecto inválido: {tipo}")
        if v not in TIPO_DEFECTO_DESCRIPCION[tipo]:
            raise ValueError(f"Descripción '{v}' no corresponde al tipo de defecto '{tipo}'")
        return v


# ==============================================
# Esquema de respuesta (para GET /defectos/)
# ==============================================
class DefectoResponse(DefectoCreate):
    id: int = Field(..., example=1)

    class Config:
        from_attributes = True


# ==============================================
# --- ESQUEMAS PARA INSPECTORES ---
# ==============================================
class InspectorBase(BaseModel):
    nombre: str = Field(..., example="Juan Pérez")

class InspectorCreate(InspectorBase):
    pass

class Inspector(InspectorBase):
    id: int

    class Config:
        from_attributes = True


# Diccionarios de referencia
LINEA_PRODUCTO_PRESENTACION = {
    "Línea 1": {
        "Tradicional Aguardiente": ["750 ml", "375 ml"],
        "Nueva Imagen RVC": ["1000 ml", "750 ml", "375 ml"],
        "V2 Cuadrado": ["1000 ml", "750 ml"],
        "Plano Tradicional Platino": ["375 ml"],
        "PET Plano": ["375 ml"],
        "Tradicional Llanero": ["375 ml"],
        "Smirnoff": ["750 ml", "375 ml"]
    },
    "Línea 2": {
        "Tradicional Nariño": ["750 ml"],
        "Tradicional Alcohol": ["750 ml", "375 ml"],
        "Nueva Imagen Roble Blanco": ["750 ml"],
        "Nueva Imagen 5 secretos": ["750 ml"],
        "Nueva Imagen Ron Tradicional": ["1000 ml", "750 ml"],
        "RVC": ["375 ml"],
        "Plano Tradicional Extra": ["750 ml", "375 ml"]
    },
    "Línea 3": {
        "Amarillo CO-8 (T-CORK)": ["1000 ml", "750 ml", "375 ml"],
        "Ron 3 años CO (GUALA 3)": ["750 ml"],
        "Ron 3 años D- (GUALA 3)": ["375 ml"],
        "RVC 8 años CO (T-CORK)": ["750 ml", "375 ml"],
        "Aguardiente Xs CO-8 (T-CORK)": ["750 ml"]
    },
    "Línea 4": {
        "Cheers Crema de Ron": ["750 ml", "375 ml"],
        "Garrafa": ["1750 ml"],
        "Aguardiente Amarillo": ["1500 ml", "750 ml", "375 ml"],
        "Ron 8 años": ["750 ml", "375 ml"]
    },
    "Línea 5": {
        "Caja": ["1000 ml"]
    }
}

TIPO_DEFECTO_DESCRIPCION = {
    "LLENADO": [
        "Partículas extrañas",
        "Nivel de llenado alto o bajo",
        "Botella rota / con fisura abierta",
        "Turbio, color diferente"
    ],
    "CAPSULADO": [
        "Botella sin tapa / sin capuchón",
        "Tapa descentrada",
        "Tapa revenida",
        "Precinto roto",
        "Litografía diferente",
        "Filtración"
    ],
    "LÁMPARA": [
        "Partículas extrañas (vidrio, cartón, metal, insectos, etc.)",
        "Sin etiqueta",
        "Dos o más etiquetas",
        "Etiqueta equivocada"
    ],
    "ETIQUETADO": [
        "Posición incorrecta (volada, descentrada, invertida)",
        "Daño físico (rasgada, arrugada, doblada, pelada, manchada)",
        "Mal pegada",
        "Despegada",
        "Defectuosa",
        "Sin video jet"
    ],
    "VIDEO JET": [
        "Video jet sin código de barras",
        "Diferente tape-etiqueta",
        "Incompleto, borroso",
        "Incorrecto"
    ],
    "EMBALAJE": [
        "Cinta mal pegada",
        "Etiqueta dañada",
        "Faltante de unidades",
        "Partición incompleta / sin celda",
        "Caja deteriorada (rasgada, húmeda, sucia)",
        "Caja no corresponde con producto"
    ]
}

    