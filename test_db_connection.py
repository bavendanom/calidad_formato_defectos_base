import psycopg2

connection = psycopg2.connect(
    host="localhost",
    database="control_calidad",
    user="admin_calidad",
    password="12345",
    port=5432
)

cursor = connection.cursor()
cursor.execute("SELECT * FROM defectos;")
rows = cursor.fetchall()

for row in rows:
    print(row)

cursor.close()
connection.close()


