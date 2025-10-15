# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import models, schemas, crud
from database import engine, Base, get_db
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware  # IMPORTANTE: Agregar esto
import logging

logging.basicConfig(level=logging.DEBUG)

print("Base de datos conectada a:", engine.url)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Control de Calidad - Defectos")

# Función para esperar a que la base de datos esté disponible
def wait_for_db(max_retries=5, retry_interval=5):
    """Espera a que la base de datos esté disponible antes de continuar"""
    for attempt in range(max_retries):
        try:
            # Intentar conectar a la base de datos
            with engine.connect() as conn:
                print(f"✅ Conexión a la base de datos exitosa (intento {attempt + 1})")
                return True
        except OperationalError as e:
            print(f"❌ Intento {attempt + 1} de {max_retries}: No se pudo conectar a la base de datos")
            print(f"   Error: {e}")
            if attempt < max_retries - 1:
                print(f"   Reintentando en {retry_interval} segundos...")
                time.sleep(retry_interval)
            else:
                print("❌ No se pudo conectar a la base de datos después de todos los intentos")
                raise e
    return False

# Crear tablas si no existen (después de esperar a que la BD esté disponible)
try:
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente!")
except Exception as e:
    print(f"❌ Error al crear tablas: {e}")

app = FastAPI(title="API Control de Calidad - Defectos")

# ===============================
# CONFIGURACIÓN CORS CRÍTICA
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# Servir archivos estáticos y plantillas
# ===============================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def mostrar_formulario(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/formulario", response_class=HTMLResponse)
def mostrar_formulario_alternativo(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ----------------------------
# Ruta raíz API
# ----------------------------
@app.get("/api/")
def root():
    return {"mensaje": "API de Control de Calidad funcionando correctamente"}

# ----------------------------
# POST: Crear un defecto
# ----------------------------
@app.post("/defectos/", response_model=schemas.DefectoResponse)
def crear_defecto(defecto: schemas.DefectoCreate, db: Session = Depends(get_db)):
    try:
        # Las validaciones jerárquicas se realizan en schemas.py
        nuevo_defecto = crud.create_defecto(db, defecto)
        return nuevo_defecto
    except ValueError as e:
        # Errores de validación de Pydantic (combo incorrecto, tipo-defecto, etc.)
        raise HTTPException(status_code=422, detail=str(e))
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error de integridad: {str(e.orig)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# ----------------------------
# GET: Listar todos los defectos
# ----------------------------
@app.get("/defectos/", response_model=List[schemas.DefectoResponse])
def obtener_defectos(db: Session = Depends(get_db)):
    return db.query(models.Defecto).order_by(models.Defecto.fecha_hora.desc()).all()

# ----------------------------
# GET: Obtener un defecto por ID
# ----------------------------
@app.get("/defectos/{id}", response_model=schemas.DefectoResponse)
def obtener_defecto_por_id(id: int, db: Session = Depends(get_db)):
    defecto = db.query(models.Defecto).filter(models.Defecto.id == id).first()
    if not defecto:
        raise HTTPException(status_code=404, detail="Defecto no encontrado")
    return defecto

# ----------------------------
# GET: Diccionarios para combos en Swagger
# ----------------------------
@app.get("/combos/", response_model=dict)
def obtener_combos():
    """
    Devuelve las opciones jerárquicas para línea -> producto -> presentación
    y tipo_defecto -> descripcion_defecto
    Útil para Swagger y clientes para poblar combos dinámicos.
    """
    return {
        "LINEA_PRODUCTO_PRESENTACION": schemas.LINEA_PRODUCTO_PRESENTACION,
        "TIPO_DEFECTO_DESCRIPCION": schemas.TIPO_DEFECTO_DESCRIPCION,
        "MAQUINAS": ["Encintadora", "Monoblock", "Capsuladora", "Etiquetadora", "Encajonadora", "Armadora"]
    }

# ============================================
# GET: Listar los últimos defectos registrados
# ============================================
@app.get("/defectos/ultimos/", response_model=list[schemas.DefectoResponse])
def obtener_ultimos_defectos(limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_ultimos_defectos(db, limit)

# ============================================
# GESTIÓN DE INSPECTORES (CONECTADO A LA BASE DE DATOS)
# ============================================

@app.get("/inspectores/", response_model=List[str])  
def obtener_inspectores(db: Session = Depends(get_db)):
    """Devuelve solo los nombres de los inspectores."""
    inspectores = crud.get_inspectores(db)
    return [inspector.nombre for inspector in inspectores]

@app.post("/inspectores/", response_model=schemas.Inspector)
async def agregar_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(get_db)):
    """Agrega un nuevo inspector a la base de datos."""
    db_inspector = crud.get_inspector_by_name(db, nombre=inspector.nombre)
    if db_inspector:
        raise HTTPException(status_code=400, detail=f"El inspector '{inspector.nombre}' ya existe.")
    return crud.create_inspector(db=db, inspector=inspector)

@app.delete("/inspectores/{nombre_inspector}", response_model=schemas.Inspector)
def eliminar_inspector(nombre_inspector: str, db: Session = Depends(get_db)):
    """Elimina un inspector de la base de datos por su nombre."""
    from urllib.parse import unquote
    nombre_decodificado = unquote(nombre_inspector)
    
    db_inspector = crud.get_inspector_by_name(db, nombre=nombre_decodificado)
    if not db_inspector:
        raise HTTPException(status_code=404, detail=f"El inspector '{nombre_decodificado}' no fue encontrado.")
    
    crud.delete_inspector(db, nombre=nombre_decodificado)
    return db_inspector