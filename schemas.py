# schemas.py
"""
Esquemas de validación Pydantic para el sistema de control de calidad.

Este módulo define todos los modelos de datos utilizados para validación,
serialización y documentación de la API. Pydantic valida automáticamente
los tipos de datos, longitudes y formatos antes de procesar las peticiones.

Los esquemas se organizan en tres categorías:
    - Base: Campos comunes compartidos
    - Create: Para crear nuevos registros (sin ID)
    - Out/Response: Para respuestas de la API (con ID y campos generados)

Convenciones de nomenclatura:
    - *Base: Clase base con campos comunes
    - *Create: Schema para creación (POST requests)
    - *Out/*Response: Schema para respuestas (GET requests)

Related modules:
    - models.py: Define las tablas SQLAlchemy correspondientes
    - crud.py: Usa estos schemas para operaciones de BD
    - main.py: Declara estos schemas en los endpoints

Author: Brayan Avendaño / Maquinando Controls
Version: 2.0
"""
from pydantic import BaseModel, Field
from datetime import datetime
from pydantic import BaseModel, validator
from typing import ClassVar
from datetime import date


# ===============================
# MARK: PRODUCTOS
# ===============================
class InfoProductoOut(BaseModel):
    """
    Schema de respuesta para información de productos del catálogo.
    
    Representa un producto completo del sistema con toda su información
    asociada. Usado cuando se consulta un producto por su código AX.
    
    Attributes:
        id (int): Identificador único del producto en la base de datos.
        codigo (str): Código AX único del producto (ej: "4-03-0000-0019").
        nombre_producto (str): Nombre comercial completo del producto.
        tipo_envase (str): Tipo de envase (ej: "BOTELLA PET", "TETRAPACK").
        destino (str): Destino del producto (ej: "NACIONAL", "EXPORTACIÓN").
        posibles_lineas_produccion (str): Líneas donde se puede producir,
            separadas por comas (ej: "Linea 1, Linea 2").
    
    Config:
        orm_mode (bool): Permite crear instancias desde objetos SQLAlchemy.
    
    Example:
        >>> producto = InfoProductoOut(
        ...     id=1,
        ...     codigo="4-03-0000-0019",
        ...     nombre_producto="JUGO NARANJA 1L",
        ...     tipo_envase="BOTELLA PET",
        ...     destino="NACIONAL",
        ...     posibles_lineas_produccion="Linea 1, Linea 2"
        ... )
        >>> print(producto.codigo)
        "4-03-0000-0019"
    
    Note:
        - orm_mode=True permite: InfoProductoOut.from_orm(db_producto)
        - Este schema NO se usa para crear productos (solo lectura)
    """
    id: int
    codigo: str
    nombre_producto: str
    tipo_envase: str
    destino: str
    posibles_lineas_produccion: str
    class Config:
        orm_mode = True

# ===============================
# MARK:INSPECTORES
# ===============================

class InspectorOut(BaseModel):
    """
    Schema de respuesta básico para inspectores (legacy).
    
    Versión simplificada del schema de inspector, mantenida por compatibilidad
    con endpoints antiguos. Usar InspectorResponse para nuevos desarrollos.
    
    Attributes:
        id (int): Identificador único del inspector.
        nombre (str): Nombre completo del inspector.
    
    Config:
        from_attributes (bool): Permite conversión desde objetos ORM (Pydantic v2).
    
    Example:
        >>> inspector = InspectorOut(id=1, nombre="Juan Pérez")
        >>> print(inspector.nombre)
        "Juan Pérez"
    
    Deprecated:
        Usar InspectorResponse en lugar de InspectorOut para consistencia.
    """
    id: int
    nombre: str
    class Config:
        from_attributes = True

class InspectorCreate(BaseModel):
    """
    Schema para crear un nuevo inspector en el sistema.
    
    Valida que el nombre del inspector cumpla con requisitos de longitud
    antes de intentar guardarlo en la base de datos.
    
    Attributes:
        nombre (str): Nombre completo del inspector.
            - Mínimo 3 caracteres
            - Máximo 100 caracteres
            - Campo obligatorio (...)
    
    Example:
        >>> inspector = InspectorCreate(nombre="María García")
        >>> print(inspector.nombre)
        "María García"
        
        >>> # Validación automática
        >>> InspectorCreate(nombre="AB")  # Error: mínimo 3 caracteres
        ValidationError: nombre: ensure this value has at least 3 characters
    
    Validation:
        - min_length=3: Evita nombres demasiado cortos
        - max_length=100: Previene nombres excesivamente largos
        - required (...): Campo obligatorio, no acepta None
    
    Note:
        - No valida caracteres especiales o formato
        - La unicidad se valida en crud.crear_inspector()
        - El ID se genera automáticamente en la BD
    """
    nombre: str = Field(..., min_length=3, max_length=100)

class InspectorResponse(BaseModel):
    """
    Schema de respuesta completo para inspectores con ID.
    
    Usado en respuestas de la API que incluyen el ID del inspector,
    especialmente en el panel de administración y después de crear
    un nuevo inspector.
    
    Attributes:
        id (int): Identificador único auto-generado por la base de datos.
        nombre (str): Nombre completo del inspector.
    
    Config:
        orm_mode (bool): Permite crear desde objetos SQLAlchemy.
    
    Example:
        >>> # Respuesta después de crear inspector
        >>> response = InspectorResponse(id=5, nombre="Pedro Ramírez")
        >>> print(f"Inspector #{response.id}: {response.nombre}")
        "Inspector #5: Pedro Ramírez"
        
        >>> # Conversión desde ORM
        >>> db_inspector = db.query(Inspector).first()
        >>> response = InspectorResponse.from_orm(db_inspector)
    
    Use Cases:
        - POST /api/inspectores/ (respuesta después de crear)
        - GET /api/inspectores/ (lista completa con IDs)
        - Panel de administración (para mostrar y eliminar)
    """
    id: int
    nombre: str
    class Config:
        orm_mode = True

# ===============================
# MARK:TIPOS DE DEFECTOS (RESUMEN)
# ===============================

from datetime import datetime

class TiposDefectosBase(BaseModel):
    """
    Schema base para registros consolidados de defectos por tipo.
    
    Contiene los campos comunes compartidos entre las variantes Create y Out.
    Representa el total de defectos de un tipo específico encontrados en un
    guardado manual (botón "Guardar" del formulario).
    
    Attributes:
        codigo (str): Código AX del producto inspeccionado.
        inspector (str): Nombre del inspector que realizó el registro.
        lote (str): Número de lote del producto.
        nombre (str): Nombre comercial del producto.
        envase (str): Tipo de envase del producto.
        destino (str): Destino del producto (NACIONAL/EXPORTACIÓN).
        linea_produccion (str): Línea donde se encontró el defecto.
        tipo_defecto (str): Categoría del defecto (LLENADO, CAPSULADO, etc.).
        suma_tipo_defecto (int): Total de defectos de este tipo encontrados.
        observaciones (str): Observaciones específicas del tipo de defecto.
            Defaults to "---" si no se proporcionan.
    
    Note:
        - Esta es una clase base, no se usa directamente
        - Heredada por TiposDefectosCreate y TiposDefectosOut
        - No incluye id ni fecha_hora (campos auto-generados)
    """
    codigo: str
    inspector: str
    lote: str  
    nombre: str
    envase: str
    destino: str
    linea_produccion: str
    tipo_defecto: str
    suma_tipo_defecto: int
    observaciones: str = "---"

class TiposDefectosCreate(TiposDefectosBase):
    """
    Schema para crear un registro consolidado de defectos.
    
    Usado cuando el usuario presiona "Guardar" en el formulario para registrar
    el total de defectos por tipo. Se guarda en la tabla tipos_defectos.
    
    Inherits:
        Todos los campos de TiposDefectosBase.
    
    Example:
        >>> defecto = TiposDefectosCreate(
        ...     codigo="4-03-0000-0019",
        ...     inspector="Juan Pérez",
        ...     lote="115",
        ...     nombre="JUGO NARANJA 1L",
        ...     envase="BOTELLA PET",
        ...     destino="NACIONAL",
        ...     linea_produccion="Linea 1",
        ...     tipo_defecto="LLENADO",
        ...     suma_tipo_defecto=15,
        ...     observaciones="Nivel bajo detectado múltiples veces"
        ... )
        
        >>> # Usado en endpoint
        >>> POST /guardar_defectos/
        >>> Body: [defecto.dict()]
    
    Note:
        - No incluye id (auto-generado)
        - No incluye fecha_hora (se genera con func.now())
        - suma_tipo_defecto debe ser >= 0
        - Generalmente se envían múltiples registros (uno por tipo)
    """
    pass

class TiposDefectosOut(TiposDefectosBase):
    """
    Schema de respuesta para registros consolidados de defectos.
    
    Incluye campos auto-generados por la base de datos (id y fecha_hora).
    Usado en consultas de historial resumido.
    
    Attributes:
        id (int): Identificador único del registro.
        fecha_hora (datetime): Timestamp de cuándo se guardó el registro.
    
    Inherits:
        Todos los campos de TiposDefectosBase.
    
    Config:
        orm_mode (bool): Permite conversión desde SQLAlchemy.
    
    Example:
        >>> # Respuesta del historial resumido
        >>> GET /api/historial-resumen/
        >>> {
        ...     "id": 123,
        ...     "fecha_hora": "2024-01-15T14:30:25.123456",
        ...     "codigo": "4-03-0000-0019",
        ...     "tipo_defecto": "LLENADO",
        ...     "suma_tipo_defecto": 15,
        ...     ...
        ... }
    
    Note:
        - fecha_hora es timezone-aware (server_default=func.now())
        - Usado exclusivamente para lectura (GET requests)
    """
    id: int
    fecha_hora: datetime
    class Config:
        orm_mode = True


# ===============================
# MARK: TIPOS DE DEFECTOS (DETALLE)
# ===============================
class TiposDefectosDescripcionBase(BaseModel):
    """
    Schema base para registros detallados de defectos con descripción específica.
    
    Contiene los campos comunes para el registro detallado por hora de cada
    defecto individual encontrado. Permite trazabilidad completa y análisis
    granular por hora del día.
    
    Attributes:
        fecha (date): Fecha del registro en formato YYYY-MM-DD.
        hora (str): Hora del registro en formato "HH:MM" (ej: "08:00", "15:30").
        id_tipos_defectos: 
        tipo_defecto (str): Tipo general del defecto (LLENADO, CAPSULADO, etc.).
        descripcion_defecto (str): Descripción específica del defecto.
            Ej: "Nivel de llenado bajo", "Tapa descentrada".
            Defaults to "---".
        cantidad_defectos (int): Cantidad de defectos encontrados en esa hora.
            Defaults to 0.
    
    Note:
        - fecha es tipo date (no datetime)
        - hora se almacena como string por diseño del sistema
        - Cada celda de la tabla con valor > 0 genera un registro
        - descripcion_defecto es más específica que tipo_defecto
    
    Example Structure:
        tipo_defecto: "LLENADO" (categoría general)
        descripcion_defecto: "Nivel de llenado bajo" (detalle específico)
    """
    fecha: date
    hora: str
    id_tipos_defectos: int  # Foreign key al registro padre
    descripcion_defecto: str = "---"
    cantidad_defectos: int = 0

class TiposDefectosDescripcionCreate(TiposDefectosDescripcionBase):
    """
    Schema para crear un registro detallado de defecto con hora específica.
    
    Usado en el "autoguardado" para registrar cada celda de la tabla con
    valor > 0. Permite análisis detallado por hora y descripción específica.
    Se guarda en la tabla tipos_defectos_descripcion.
    
    Inherits:
        Todos los campos de TiposDefectosDescripcionBase.
    
    Example:
        >>> from datetime import date
        >>> defecto_detallado = TiposDefectosDescripcionCreate(
        ...     fecha=date(2024, 1, 15),
        ...     hora="08:00",
        ...     codigo="4-03-0000-0019",
        ...     lote="115",
        ...     nombre="JUGO NARANJA 1L",
        ...     envase="BOTELLA PET",
        ...     destino="NACIONAL",
        ...     linea_produccion="Linea 1",
        ...     tipo_defecto="LLENADO",
        ...     descripcion_defecto="Nivel de llenado bajo",
        ...     cantidad_defectos=3
        ... )
        
        >>> # Usado en endpoint
        >>> POST /auto_guardado/
        >>> Body: [defecto_detallado.dict()]
    
    Use Case:
        Al guardar, el frontend recorre cada celda de la tabla:
        - Hora: 08:00, Descripción: "Nivel bajo", Cantidad: 3 → 1 registro
        - Hora: 09:00, Descripción: "Nivel bajo", Cantidad: 5 → 1 registro
        - Hora: 08:00, Descripción: "Partículas", Cantidad: 2 → 1 registro
        
        Resultado: 3 registros detallados para análisis granular.
    
    Note:
        - No incluye id (auto-generado)
        - cantidad_defectos debe ser > 0 para guardarse
        - Múltiples registros pueden tener misma hora pero diferente descripción
    
    Validation:
        - fecha: Debe ser formato date válido
        - hora: String, no valida formato (responsabilidad del frontend)
        - cantidad_defectos: Acepta 0 pero frontend solo envía > 0
    """
    pass

class TiposDefectosDescripcionOut(TiposDefectosDescripcionBase):
    """
    Schema de respuesta para registros detallados de defectos.
    
    Incluye el ID auto-generado por la base de datos. Usado en consultas
    del historial detallado.
    
    Attributes:
        id (int): Identificador único del registro detallado.
    
    Inherits:
        Todos los campos de TiposDefectosDescripcionBase.
    
    Config:
        orm_mode (bool): Permite conversión desde SQLAlchemy.
    
    Example:
        >>> # Respuesta del historial detallado
        >>> GET /api/historial/
        >>> {
        ...     "id": 456,
        ...     "fecha": "2024-01-15",
        ...     "hora": "08:00",
        ...     "codigo": "4-03-0000-0019",
        ...     "tipo_defecto": "LLENADO",
        ...     "descripcion_defecto": "Nivel de llenado bajo",
        ...     "cantidad_defectos": 3,
        ...     ...
        ... }
    
    Use Cases:
        - GET /api/historial/ (historial detallado)
        - Análisis de defectos por hora del día
        - Reportes de trazabilidad completa
        - Identificación de patrones horarios
    
    Note:
        - Usado exclusivamente para lectura (GET requests)
        - Permite análisis más granular que TiposDefectosOut
    """
    id: int
    class Config:
        orm_mode = True

# Actualizar forward reference
TiposDefectosDescripcionOut.update_forward_refs()