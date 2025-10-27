#load_info_productos
import csv
from database import SessionLocal
from database import SessionLocal, engine, Base
import models

# CREAR TABLAS PRIMERO
print("Creando tablas...")
Base.metadata.create_all(bind=engine)
print("Tablas creadas exitosamente!")

count = 0
db = SessionLocal()
with open("data/info_producto.csv", newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if not db.query(models.InfoProducto).filter_by(codigo=row["codigo"]).first():
            prod = models.InfoProducto(
                codigo=row["codigo"],
                nombre_producto=row["nombre_producto"],
                tipo_envase=row["tipo_envase"],
                destino=row["destino"],
                posibles_lineas_produccion=row["posibles_lineas_produccion"]
            )
            db.add(prod)
            count += 1
    db.commit()
db.close()
print("--- Datos cargados correctamente ---")
print(f"--- {count} registros cargados correctamente ---")
