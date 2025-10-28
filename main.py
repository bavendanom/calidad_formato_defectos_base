# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from typing import List
import models, schemas, crud
from database import engine, Base, get_db
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware  # IMPORTANTE: Agregar esto
import logging
import time
import os
from typing import List
from schemas import (
    TiposDefectosCreate,
    TiposDefectosDescripcionCreate
)






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

#app = FastAPI(title="API Control de Calidad - Defectos")

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


@app.get("/producto/{codigo}", response_model=schemas.InfoProductoOut)
def get_producto(codigo: str, db: Session = Depends(get_db)):
    producto = crud.get_producto_by_codigo(db, codigo)
    if not producto:
        return {"error": "No encontrado"}
    return producto



@app.get("/inspectores/", response_model=List[str])  
def obtener_inspectores(db: Session = Depends(get_db)):
    """Devuelve solo los nombres de los inspectores."""
    inspectores = crud.get_inspectores(db)
    return [inspector.nombre for inspector in inspectores]

# 🆕 NUEVO: Obtener inspectores completos (con ID)
@app.get("/api/inspectores/", response_model=List[schemas.InspectorResponse])
def obtener_inspectores_completos(db: Session = Depends(get_db)):
    """Devuelve todos los inspectores con su ID (para admin)."""
    return crud.get_inspectores(db)


# 🆕 NUEVO: Crear inspector
@app.post("/api/inspectores/", response_model=schemas.InspectorResponse)
def crear_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(get_db)):
    """Crea un nuevo inspector."""
    try:
        return crud.crear_inspector(db, inspector.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 🆕 NUEVO: Eliminar inspector
@app.delete("/api/inspectores/{inspector_id}")
def eliminar_inspector(inspector_id: int, db: Session = Depends(get_db)):
    """Elimina un inspector por ID."""
    try:
        return crud.eliminar_inspector(db, inspector_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ======================================================
# MARK: GUARDADO DE DEFECTOS
# ======================================================

@app.post("/guardar_defectos/")
def guardar_defectos(
    registros: List[TiposDefectosCreate],
    db: Session = Depends(get_db)
):
    """Guarda los totales por tipo de defecto (botón Guardar manual)."""
    try:
        for data in registros:
            crud.crear_tipos_defectos(db, data)
        return {"status": "ok", "message": f"{len(registros)} registros guardados correctamente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auto_guardado/")
def auto_guardado(
    registros: List[TiposDefectosDescripcionCreate],
    db: Session = Depends(get_db)
):
    """Autoguarda las descripciones y cantidades (cada 60 min)."""
    try:
        for data in registros:
            crud.crear_tipos_defectos_descripcion(db, data)
        return {"status": "ok", "message": f"{len(registros)} registros autoguardados correctamente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
