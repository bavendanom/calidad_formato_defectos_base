# crud.py
"""
Operaciones CRUD (Create, Read, Update, Delete) para el sistema de control de calidad.

Este módulo contiene todas las funciones de acceso a datos para interactuar con
la base de datos. Implementa la lógica de negocio para productos, inspectores,
registro de defectos e historial.

Módulos relacionados:
    - models.py: Define las tablas SQLAlchemy
    - schemas.py: Define los esquemas Pydantic de validación
    - main.py: Utiliza estas funciones en los endpoints de la API

Author: Brayan Avendaño / Maquinando Controls
Version: 2.0
"""
from sqlalchemy.orm import Session
import models, schemas


# ===============================
# MARK: PRODUCTOS
# ===============================


def get_producto_by_codigo(db: Session, codigo: str):
    """
    Obtiene un producto de la base de datos por su código AX.
    
    Realiza una búsqueda exacta en la tabla info_producto utilizando el código
    como clave de búsqueda. Útil para obtener información completa del producto
    en el formulario de registro.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy para consultas a la base de datos.
        codigo (str): Código AX único del producto (ej: "4-03-0000-0019").
    
    Returns:
        Optional[models.InfoProducto]: Objeto InfoProducto con todos sus atributos
            (nombre, envase, destino, líneas de producción) si existe, None si no
            se encuentra el código.
    
    Example:
        >>> producto = get_producto_by_codigo(db, "4-03-0000-0019")
        >>> print(producto.nombre_producto)
        "JUGO NARANJA 1L"
        >>> print(producto.tipo_envase)
        "BOTELLA PET"
    
    Note:
        - La búsqueda es case-sensitive
        - Retorna None en lugar de lanzar excepción si no existe
        - El código debe existir previamente en la tabla info_producto
    """
    return db.query(models.InfoProducto).filter(models.InfoProducto.codigo == codigo).first()


# ===============================
# MARK: INSPECTORES
# ===============================
def get_inspectores(db: Session):
    """
    Obtiene la lista completa de inspectores registrados en el sistema.
    
    Consulta todos los inspectores sin filtros ni paginación. Utilizado para
    poblar el selector de inspectores en el formulario y en el panel de
    administración.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
    
    Returns:
        List[models.Inspector]: Lista de objetos Inspector con id y nombre.
            Lista vacía si no hay inspectores registrados.
    
    Example:
        >>> inspectores = get_inspectores(db)
        >>> for inspector in inspectores:
        ...     print(f"{inspector.id}: {inspector.nombre}")
        1: Juan Pérez
        2: María García
        3: Carlos López
    
    Note:
        - No aplica ordenamiento específico (orden de inserción)
        - Retorna lista vacía, nunca None
    """
    return db.query(models.Inspector).all()


def crear_inspector(db: Session, nombre: str):
    """
    Crea un nuevo inspector en el sistema.
    
    Valida que el nombre del inspector sea único antes de crear el registro.
    Realiza commit automático a la base de datos y retorna el objeto creado
    con su ID asignado.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        nombre (str): Nombre completo del inspector (debe ser único, 3-100 caracteres).
    
    Returns:
        models.Inspector: Objeto Inspector recién creado con ID asignado por la BD.
    
    Raises:
        ValueError: Si ya existe un inspector con ese nombre exacto (case-sensitive).
    
    Example:
        >>> nuevo_inspector = crear_inspector(db, "Pedro Ramírez")
        >>> print(nuevo_inspector.id)
        4
        >>> print(nuevo_inspector.nombre)
        "Pedro Ramírez"
        
        >>> crear_inspector(db, "Pedro Ramírez")  # Duplicado
        ValueError: El inspector ya existe
    
    Note:
        - La validación de nombre es case-sensitive
        - Hace commit automático a la base de datos
        - El ID es auto-generado por SQLAlchemy
        - No valida formato del nombre (espacios, caracteres especiales, etc.)
    
    Security:
        - Validar longitud y caracteres en el schema antes de llamar esta función
        - No sanitiza entrada, debe hacerse en capa de validación Pydantic
    """
    inspector_existente = db.query(models.Inspector).filter(models.Inspector.nombre == nombre).first()
    if inspector_existente:
        raise ValueError("El inspector ya existe")
    
    nuevo_inspector = models.Inspector(nombre=nombre)
    db.add(nuevo_inspector)
    db.commit()
    db.refresh(nuevo_inspector)
    return nuevo_inspector


def eliminar_inspector(db: Session, inspector_id: int):
    """
    Elimina un inspector del sistema por su ID.
    
    Busca el inspector por ID y lo elimina permanentemente de la base de datos.
    Esta operación es irreversible pero NO elimina los registros de defectos
    asociados al inspector (mantiene integridad de datos históricos).
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        inspector_id (int): ID único del inspector a eliminar.
    
    Returns:
        Dict[str, str]: Diccionario con mensaje de confirmación conteniendo el
            nombre del inspector eliminado.
    
    Raises:
        ValueError: Si el inspector_id no existe en la base de datos.
    
    Example:
        >>> resultado = eliminar_inspector(db, 4)
        >>> print(resultado)
        {"mensaje": "Inspector 'Pedro Ramírez' eliminado correctamente"}
        
        >>> eliminar_inspector(db, 999)  # ID inexistente
        ValueError: Inspector no encontrado
    
    Warning:
        - Esta operación es IRREVERSIBLE
        - No elimina registros de defectos asociados al inspector
        - Los registros históricos mantendrán el nombre del inspector como texto
        - Considerar implementar "soft delete" (campo activo/inactivo) en lugar
            de eliminación física para mantener auditoría completa
    
    Note:
        - Hace commit automático a la base de datos
        - No requiere confirmación adicional (implementar en capa de UI)
    """
    inspector = db.query(models.Inspector).filter(models.Inspector.id == inspector_id).first()
    if not inspector:
        raise ValueError("Inspector no encontrado")
    
    db.delete(inspector)
    db.commit()
    return {"mensaje": f"Inspector '{inspector.nombre}' eliminado correctamente"}



# ===============================
# MARK: REGISTRO DE DEFECTOS
# ===============================
def crear_tipos_defectos(db: Session, data: schemas.TiposDefectosCreate):
    """
    Crea un registro consolidado de defectos por tipo (guardado manual).
    
    Guarda el total de defectos agrupados por tipo en la tabla tipos_defectos.
    Este registro incluye observaciones específicas del tipo de defecto y
    representa el resumen cuando el usuario presiona "Guardar" en el formulario.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        data (schemas.TiposDefectosCreate): Objeto validado con Pydantic conteniendo:
            - codigo: Código AX del producto
            - inspector: Nombre del inspector
            - lote: Número de lote
            - nombre: Nombre del producto
            - envase: Tipo de envase
            - destino: Destino del producto
            - linea_produccion: Línea donde se registró
            - tipo_defecto: Tipo de defecto (LLENADO, CAPSULADO, etc.)
            - suma_tipo_defecto: Total de defectos de este tipo
            - observaciones: Observaciones específicas (opcional)
    
    Returns:
        models.TiposDefectos: Objeto recién creado con ID y fecha_hora asignados
            automáticamente por la base de datos.
    
    Example:
        >>> from schemas import TiposDefectosCreate
        >>> data = TiposDefectosCreate(
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
        >>> registro = crear_tipos_defectos(db, data)
        >>> print(registro.id)
        123
        >>> print(registro.fecha_hora)
        2024-01-15 14:30:25.123456
    
    Note:
        - fecha_hora se genera automáticamente con func.now() en el modelo
        - Hace commit automático
        - No valida si ya existe un registro similar (permite duplicados)
        - Usado en conjunto con crear_tipos_defectos_descripcion para guardar
            tanto el resumen como el detalle
    """
    registro = models.TiposDefectos(**data.dict())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def crear_tipos_defectos_descripcion(db: Session, data: schemas.TiposDefectosDescripcionCreate):
    """
    Crea un registro detallado de defecto con descripción específica y hora.
    
    Guarda el detalle completo de cada defecto encontrado: hora exacta, descripción
    específica y cantidad. Permite trazabilidad completa y análisis detallado por
    hora del día. Se guarda en la tabla tipos_defectos_descripcion.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        data (schemas.TiposDefectosDescripcionCreate): Objeto validado conteniendo:
            - fecha: Fecha del registro (date)
            - hora: Hora del registro (str, ej: "08:00")
            - codigo: Código AX del producto
            - lote: Número de lote
            - nombre: Nombre del producto
            - envase: Tipo de envase
            - destino: Destino del producto
            - linea_produccion: Línea donde se registró
            - tipo_defecto: Tipo general (LLENADO, CAPSULADO, etc.)
            - descripcion_defecto: Descripción específica del defecto
            - cantidad_defectos: Cantidad encontrada en esa hora específica
    
    Returns:
        models.TiposDefectosDescripcion: Objeto recién creado con ID asignado.
    
    Example:
        >>> from schemas import TiposDefectosDescripcionCreate
        >>> from datetime import date
        >>> data = TiposDefectosDescripcionCreate(
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
        >>> registro = crear_tipos_defectos_descripcion(db, data)
        >>> print(f"Guardado: {registro.cantidad_defectos} defectos a las {registro.hora}")
        Guardado: 3 defectos a las 08:00
    
    Note:
        - Permite análisis detallado por hora del día
        - Cada celda con valor > 0 de la tabla genera un registro
        - No valida duplicados (pueden existir múltiples registros con mismos datos)
        - Usado en el "autoguardado" junto con crear_tipos_defectos
        - La hora se almacena como String, no como Time (por diseño del sistema)
    """
    registro = models.TiposDefectosDescripcion(**data.dict())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


# ===============================
# MARK: HISTORIAL Y CONSULTAS
# ===============================
def obtener_historial_registros(
    db: Session, 
    linea_produccion: str = None, 
    limite: int = 20, 
    offset: int = 0,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None,
    lote: str = None,  
    codigo: str = None
):
    """
    Obtiene historial detallado de defectos con múltiples filtros y paginación.
    
    Consulta la tabla tipos_defectos_descripcion para recuperar registros detallados
    por hora y descripción específica. Soporta filtrado por múltiples criterios de
    manera simultánea y paginación eficiente para grandes volúmenes de datos.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        linea_produccion (str, optional): Filtrar por línea específica 
            (ej: "Linea 1", "Tetrapack"). None = todas las líneas.
        limite (int, optional): Número máximo de registros por página. Defaults to 20.
        offset (int, optional): Número de registros a saltar para paginación. 
            Defaults to 0. Para página 2 con límite 20, offset=20.
        fecha_inicio (str, optional): Fecha inicial en formato "YYYY-MM-DD" (inclusive).
        fecha_fin (str, optional): Fecha final en formato "YYYY-MM-DD" (inclusive).
        tipo_defecto (str, optional): Filtrar por tipo específico. "todos" = sin filtro.
        lote (str, optional): Búsqueda parcial case-insensitive en número de lote.
        codigo (str, optional): Búsqueda parcial case-insensitive en código AX.
    
    Returns:
        Dict[str, Any]: Diccionario con estructura:
            {
                "registros": List[models.TiposDefectosDescripcion],
                "total": int,  # Total de registros que cumplen filtros
                "pagina_actual": int,  # Número de página actual (1-indexed)
                "total_paginas": int  # Total de páginas disponibles
            }
    
    Example:
        >>> resultado = obtener_historial_registros(
        ...     db, 
        ...     linea_produccion="Linea 1",
        ...     fecha_inicio="2024-01-01",
        ...     fecha_fin="2024-01-31",
        ...     tipo_defecto="LLENADO",
        ...     limite=10,
        ...     offset=0
        ... )
        >>> print(f"Total encontrados: {resultado['total']}")
        Total encontrados: 45
        >>> print(f"Mostrando página: {resultado['pagina_actual']} de {resultado['total_paginas']}")
        Mostrando página: 1 de 5
        >>> for reg in resultado['registros']:
        ...     print(f"{reg.fecha} - {reg.descripcion_defecto}: {reg.cantidad_defectos}")
        15/01/2024 - Nivel de llenado bajo: 3
        15/01/2024 - Partículas extrañas: 2
        ...
    
    Note:
        - Búsquedas en lote y código son parciales (ILIKE) y case-insensitive
        - Los registros se ordenan por ID descendente (más recientes primero)
        - Si total=0, retorna registros=[] y pagina_actual=1, total_paginas=0
        - Todos los filtros son opcionales y se aplican de manera acumulativa (AND)
        - El cálculo de total_paginas usa ceil: (total + limite - 1) // limite
    
    Performance:
        - Usa índices en: linea_produccion, fecha, tipo_defecto, codigo, lote
        - Para datasets grandes (>100k registros), considerar agregar índices compuestos
        - El count() puede ser costoso con muchos filtros; considerar caching
    """
    query = db.query(
        models.TiposDefectosDescripcion,
        models.TiposDefectos
    ).join(
        models.TiposDefectos,
        models.TiposDefectosDescripcion.id_tipos_defectos == models.TiposDefectos.id
    )
    
    # Filtros aplicados a la tabla PADRE
    if linea_produccion:
        query = query.filter(models.TiposDefectos.linea_produccion == linea_produccion)
    
    if fecha_inicio:
        query = query.filter(models.TiposDefectosDescripcion.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(models.TiposDefectosDescripcion.fecha <= fecha_fin)
    
    if tipo_defecto and tipo_defecto != "todos":
        query = query.filter(models.TiposDefectos.tipo_defecto == tipo_defecto)

    if lote:
        query = query.filter(models.TiposDefectos.lote.ilike(f"%{lote}%"))
    
    if codigo:
        query = query.filter(models.TiposDefectos.codigo.ilike(f"%{codigo}%"))
    
    # Ordenar por ID de descripción (más recientes primero)
    query = query.order_by(models.TiposDefectosDescripcion.id.desc())
    
    # IMPORTANTE: Contar ANTES de paginar
    total = query.count()
    
    # Aplicar paginación
    resultados = query.offset(offset).limit(limite).all()
    
    # 🔧 CORRECCIÓN: Formatear correctamente las tuplas del JOIN
    registros = []
    for desc, padre in resultados:  # desc = TiposDefectosDescripcion, padre = TiposDefectos
        registros.append({
            "id": desc.id,
            "fecha": desc.fecha,
            "hora": desc.hora,
            "codigo": padre.codigo,
            "lote": padre.lote,
            "nombre": padre.nombre,
            "envase": padre.envase,
            "destino": padre.destino,
            "linea_produccion": padre.linea_produccion,
            "tipo_defecto": padre.tipo_defecto,
            "descripcion_defecto": desc.descripcion_defecto,
            "cantidad_defectos": desc.cantidad_defectos
        })
    
    return {
        "registros": registros,
        "total": total,
        "pagina_actual": offset // limite + 1,
        "total_paginas": (total + limite - 1) // limite
    }


def obtener_tipos_defectos_unicos(db: Session, linea_produccion: str = None):
    """
    Obtiene lista única de tipos de defectos para poblar filtros del historial.
    
    Consulta los tipos de defectos existentes en la tabla tipos_defectos_descripcion
    y retorna valores únicos. Útil para generar dinámicamente las opciones del
    selector de "Tipo de Defecto" en los filtros del historial.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        linea_produccion (str, optional): Filtrar tipos por línea específica.
            None = retorna tipos de todas las líneas.
    
    Returns:
        List[str]: Lista de strings con tipos de defectos únicos encontrados,
            ordenados según aparición en BD. Lista vacía si no hay registros.
    
    Example:
        >>> tipos = obtener_tipos_defectos_unicos(db, "Linea 1")
        >>> print(tipos)
        ['LLENADO', 'CAPSULADO', 'ETIQUETADO', 'VIDEO JET', 'EMBALAJE', 'LÁMPARA']
        
        >>> tipos_tetrapack = obtener_tipos_defectos_unicos(db, "Tetrapack")
        >>> print(tipos_tetrapack)
        ['DEFECTOS GENERALES']
    
    Note:
        - Usa .distinct() de SQLAlchemy para evitar duplicados
        - Filtra valores None/null automáticamente
        - No ordena alfabéticamente (mantiene orden de aparición)
        - Consulta solo tabla tipos_defectos_descripcion (no tipos_defectos)
        - Para obtener tipos de la tabla de resumen, crear función similar
    
    Use Case:
        Frontend hace llamada a /api/tipos-defectos/ al cargar página del historial
        para poblar el <select> de filtros dinámicamente basado en datos reales.
    """
    # Consultar la tabla correcta (TiposDefectos)
    query = db.query(models.TiposDefectos.tipo_defecto).distinct()
    
    # Filtrar por línea de producción en la misma tabla
    if linea_produccion:
        # Esto filtra la consulta para que solo devuelva tipos de defecto
        # que realmente existen en la línea seleccionada.
        query = query.filter(models.TiposDefectos.linea_produccion == linea_produccion)

    resultados = query.all()
        
    return [tipo[0] for tipo in resultados if tipo[0]]


def obtener_historial_resumen(
    db: Session, 
    linea_produccion: str = None, 
    limite: int = 20, 
    offset: int = 0,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_defecto: str = None,
    lote: str = None,  
    codigo: str = None 
):
    """
    Obtiene historial detallado de defectos con múltiples filtros y paginación.
    
    Consulta la tabla tipos_defectos_descripcion para recuperar registros detallados
    por hora y descripción específica. Soporta filtrado por múltiples criterios de
    manera simultánea y paginación eficiente para grandes volúmenes de datos.
    
    Args:
        db (Session): Sesión activa de SQLAlchemy.
        linea_produccion (str, optional): Filtrar por línea específica 
            (ej: "Linea 1", "Tetrapack"). None = todas las líneas.
        limite (int, optional): Número máximo de registros por página. Defaults to 20.
        offset (int, optional): Número de registros a saltar para paginación. 
            Defaults to 0. Para página 2 con límite 20, offset=20.
        fecha_inicio (str, optional): Fecha inicial en formato "YYYY-MM-DD" (inclusive).
        fecha_fin (str, optional): Fecha final en formato "YYYY-MM-DD" (inclusive).
        tipo_defecto (str, optional): Filtrar por tipo específico. "todos" = sin filtro.
        lote (str, optional): Búsqueda parcial case-insensitive en número de lote.
        codigo (str, optional): Búsqueda parcial case-insensitive en código AX.
    
    Returns:
        Dict[str, Any]: Diccionario con estructura:
            {
                "registros": List[models.TiposDefectosDescripcion],
                "total": int,  # Total de registros que cumplen filtros
                "pagina_actual": int,  # Número de página actual (1-indexed)
                "total_paginas": int  # Total de páginas disponibles
            }
    
    Example:
        >>> resultado = obtener_historial_registros(
        ...     db, 
        ...     linea_produccion="Linea 1",
        ...     fecha_inicio="2024-01-01",
        ...     fecha_fin="2024-01-31",
        ...     tipo_defecto="LLENADO",
        ...     limite=10,
        ...     offset=0
        ... )
        >>> print(f"Total encontrados: {resultado['total']}")
        Total encontrados: 45
        >>> print(f"Mostrando página: {resultado['pagina_actual']} de {resultado['total_paginas']}")
        Mostrando página: 1 de 5
        >>> for reg in resultado['registros']:
        ...     print(f"{reg.fecha} - {reg.descripcion_defecto}: {reg.cantidad_defectos}")
        15/01/2024 - Nivel de llenado bajo: 3
        15/01/2024 - Partículas extrañas: 2
        ...
    
    Note:
        - Búsquedas en lote y código son parciales (ILIKE) y case-insensitive
        - Los registros se ordenan por ID descendente (más recientes primero)
        - Si total=0, retorna registros=[] y pagina_actual=1, total_paginas=0
        - Todos los filtros son opcionales y se aplican de manera acumulativa (AND)
        - El cálculo de total_paginas usa ceil: (total + limite - 1) // limite
    
    Performance:
        - Usa índices en: linea_produccion, fecha, tipo_defecto, codigo, lote
        - Para datasets grandes (>100k registros), considerar agregar índices compuestos
        - El count() puede ser costoso con muchos filtros; considerar caching
    """
    query = db.query(models.TiposDefectos)
    
    # Filtrar por línea de producción
    if linea_produccion:
        query = query.filter(models.TiposDefectos.linea_produccion == linea_produccion)
    
    # Filtrar por rango de fechas (usando fecha_hora)
    if fecha_inicio:
        from datetime import datetime
        fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        query = query.filter(models.TiposDefectos.fecha_hora >= fecha_inicio_dt)
    if fecha_fin:
        from datetime import datetime
        fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d")
        # Agregar 1 día para incluir todo el día
        from datetime import timedelta
        fecha_fin_dt = fecha_fin_dt + timedelta(days=1)
        query = query.filter(models.TiposDefectos.fecha_hora < fecha_fin_dt)
    
    # Filtrar por tipo de defecto
    if tipo_defecto and tipo_defecto != "todos":
        query = query.filter(models.TiposDefectos.tipo_defecto == tipo_defecto)
    
    # Filtrar por lote
    if lote:
        query = query.filter(models.TiposDefectos.lote.ilike(f"%{lote}%"))
    
    # Filtrar por código
    if codigo:
        query = query.filter(models.TiposDefectos.codigo.ilike(f"%{codigo}%"))
    
    # Ordenar por fecha descendente
    query = query.order_by(models.TiposDefectos.id.desc())
    
    # Aplicar paginación
    registros = query.offset(offset).limit(limite).all()
    
    # Obtener total de registros
    total = query.count()
    
    return {
        "registros": registros,
        "total": total,
        "pagina_actual": offset // limite + 1,
        "total_paginas": (total + limite - 1) // limite
    }