FROM python:3.11-slim

WORKDIR /app

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Exponer puerto
EXPOSE 8001

# Comando de ejecución (la inicialización de BD se hará en main.py)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]