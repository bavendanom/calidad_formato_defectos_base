// ====== Variables globales para los datos dinámicos ======
let datosLineas = {};
let tiposDefecto = {};

// ====== DOM Elements ======
const lineaSelect = document.getElementById("linea");
const productoSelect = document.getElementById("producto");
const presentacionSelect = document.getElementById("presentacion");
const tipoSelect = document.getElementById("tipo_defecto");
const descripcionSelect = document.getElementById("descripcion_defecto");
const alertBox = document.getElementById("alert-container");
const inspectorSelect = document.getElementById("inspector");

// --- Elementos para gestión de inspectores ---
const btnAgregarInspector = document.getElementById("btnAgregarInspector");
const nuevoInspectorInput = document.getElementById("nuevo_inspector_nombre");
const btnEliminarInspector = document.getElementById("btnEliminarInspector");


// ====== Función para solicitar autorización ======
async function solicitarAutorizacion() {
  const password = prompt("🔒 Ingrese la contraseña de autorización:");
  if (!password) return false;

  try {
    const res = await fetch("/verificar-autorizacion/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.autorizado) {
      return true;
    } else {
      alert("❌ Contraseña incorrecta. No tiene permiso para realizar esta acción.");
      return false;
    }
  } catch (error) {
    console.error("Error al verificar autorización:", error);
    alert("⚠️ Error de conexión al verificar la contraseña.");
    return false;
  }
}


// ====== Lógica de actualización de combos ======

lineaSelect.onchange = () => {
  productoSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  presentacionSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  const linea = lineaSelect.value;
  if (linea && datosLineas[linea]) {
    for (const p in datosLineas[linea]) {
      productoSelect.add(new Option(p, p));
    }
  }
};

productoSelect.onchange = () => {
  presentacionSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  const linea = lineaSelect.value;
  const producto = productoSelect.value;
  if (linea && producto && datosLineas[linea][producto]) {
    datosLineas[linea][producto].forEach(pres => {
      presentacionSelect.add(new Option(pres, pres));
    });
  }
};

tipoSelect.onchange = () => {
  descripcionSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  const tipo = tipoSelect.value;
  if (tipo && tiposDefecto[tipo]) {
    tiposDefecto[tipo].forEach(desc => {
      descripcionSelect.add(new Option(desc, desc));
    });
  }
};

// ====== Funciones de Carga de Datos (API) ======

/**
 * Carga los datos para los combos (líneas, productos, defectos) desde la API.
 * "http://127.0.0.1:8001/combos/"
 */
async function cargarDatosParaCombos() {
  try {
    const res = await fetch("/combos/");
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    datosLineas = data.LINEA_PRODUCTO_PRESENTACION;
    tiposDefecto = data.TIPO_DEFECTO_DESCRIPCION;
    inicializarCombos();
  } catch (error) {
    console.error("Error crítico cargando datos de combos:", error);
    alert("No se pudo cargar la configuración inicial de la aplicación. Recargue la página.");
  }
}

/**
 * Rellena los selects iniciales una vez que los datos han sido cargados.
 */
function inicializarCombos() {
  lineaSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  tipoSelect.innerHTML = "<option value=''>Seleccionar...</option>";

  for (const linea in datosLineas) lineaSelect.add(new Option(linea, linea));
  for (const tipo in tiposDefecto) tipoSelect.add(new Option(tipo, tipo));
}

/**
 * Carga la lista de inspectores desde la API y la muestra en el select.
 */
async function cargarInspectores() {
  try {
    const res = await fetch("/inspectores/");
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const inspectores = await res.json();
    
    inspectorSelect.innerHTML = "<option value=''>Seleccionar...</option>"; // Limpiar
    inspectores.forEach(inspector => {
      inspectorSelect.add(new Option(inspector, inspector));
    });
  } catch (error) {
    console.error("Error al cargar inspectores:", error);
    inspectorSelect.innerHTML = "<option value=''>Error al cargar</option>";
  }
}

/**
 * Carga los últimos defectos registrados en la tabla.
 */
async function cargarDefectos() {
  const tbody = document.getElementById("tablaDefectos");
  try {
    const res = await fetch("/defectos/ultimos/");
    const data = await res.json();
    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Sin registros aún</td></tr>`;
      return;
    }
    data.forEach(d => {
      const fechaFormateada = new Date(d.fecha_hora).toLocaleString('es-CO');
      const row = `<tr>
        <td>${d.id}</td> <td>${fechaFormateada}</td> <td>${d.inspector}</td><td>${d.lote}</td>
        <td>${d.linea}</td> <td>${d.producto}</td> <td>${d.presentacion}</td>
        <td>${d.tipo_defecto}</td> <td>${d.descripcion_defecto}</td>
        <td class="text-center">${d.cantidad_defectos}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error al cargar defectos:", error);
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">No se pudieron cargar los registros.</td></tr>`;
  }
}

/**
 * Establece la fecha y hora actual en el campo correspondiente.
 */
function setFechaHoraActual() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Ajusta a la zona horaria local
    document.getElementById('fecha_hora').value = now.toISOString().slice(0, 16);
}

// ====== Event Listeners ======

// --- Botón Limpiar ---
document.getElementById("btnLimpiar").addEventListener("click", () => {
  document.getElementById("defectoForm").reset();
  productoSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  presentacionSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  descripcionSelect.innerHTML = "<option value=''>Seleccionar...</option>";
  setFechaHoraActual(); // <-- Mejora UX
  alertBox.innerHTML = `<div class="alert alert-info mt-3">Formulario limpiado</div>`;
  setTimeout(() => alertBox.innerHTML = "", 3000);
});

// --- Enviar Formulario de Defectos ---
document.getElementById("defectoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    fecha_hora: document.getElementById("fecha_hora").value,
    inspector: document.getElementById("inspector").value,
    lote: document.getElementById("lote").value,
    linea: lineaSelect.value,
    producto: productoSelect.value,
    presentacion: presentacionSelect.value,
    tipo_defecto: tipoSelect.value,
    descripcion_defecto: descripcionSelect.value,
    cantidad_defectos: parseInt(document.getElementById("cantidad_defectos").value)
  };

  try {
    const res = await fetch("/defectos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alertBox.innerHTML = `<div class="alert alert-success mt-3">✅ Defecto guardado correctamente</div>`;
      document.getElementById("defectoForm").reset();
      setFechaHoraActual();
      cargarDefectos();
    } else {
      const errorData = await res.json();
      alertBox.innerHTML = `<div class="alert alert-danger mt-3">❌ Error: ${errorData.detail || 'No se pudo guardar'}</div>`;
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    alertBox.innerHTML = `<div class="alert alert-warning mt-3">⚠️ Error de conexión al servidor</div>`;
  }
  setTimeout(() => alertBox.innerHTML = "", 5000);
});

// --- Botón Añadir Inspector (con contraseña) ---
btnAgregarInspector.addEventListener("click", async () => {
  const autorizado = await solicitarAutorizacion();
  if (!autorizado) return;

  const nombre = nuevoInspectorInput.value.trim();
  if (!nombre) {
    alert("Por favor, ingrese el nombre del nuevo inspector.");
    return;
  }

  try {
    const res = await fetch("/inspectores/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre })
    });

    if (res.ok) {
      nuevoInspectorInput.value = "";
      alertBox.innerHTML = `<div class="alert alert-success mt-3">✅ Inspector añadido</div>`;
      await cargarInspectores();
    } else {
      const errorData = await res.json();
      alertBox.innerHTML = `<div class="alert alert-danger mt-3">❌ ${errorData.detail}</div>`;
    }
  } catch (error) {
    console.error("Error de conexión al añadir inspector:", error);
    alertBox.innerHTML = `<div class="alert alert-warning mt-3">⚠️ Error de conexión al servidor</div>`;
  }
  setTimeout(() => alertBox.innerHTML = "", 4000);
});
// --- Botón Eliminar Inspector (con contraseña) ---
btnEliminarInspector.addEventListener("click", async () => {
  const autorizado = await solicitarAutorizacion();
  if (!autorizado) return;

  const nombreInspector = inspectorSelect.value;
  
  if (!nombreInspector) {
    alert("Por favor, seleccione un inspector de la lista para eliminar.");
    return;
  }

  const confirmado = confirm(`¿Está seguro de que desea eliminar al inspector "${nombreInspector}"?`);
  if (!confirmado) return;

  try {
    const nombreCodificado = encodeURIComponent(nombreInspector);
    const res = await fetch(`/inspectores/${nombreCodificado}`, {
      method: "DELETE"
    });

    if (res.ok) {
      alertBox.innerHTML = `<div class="alert alert-success mt-3">✅ Inspector eliminado correctamente.</div>`;
      await cargarInspectores();
    } else {
      const errorData = await res.json();
      alertBox.innerHTML = `<div class="alert alert-danger mt-3">❌ ${errorData.detail}</div>`;
    }
  } catch (error) {
    console.error("Error de conexión al eliminar inspector:", error);
    alertBox.innerHTML = `<div class="alert alert-warning mt-3">⚠️ Error de conexión al servidor</div>`;
  }
  setTimeout(() => alertBox.innerHTML = "", 4000);
});


// ====== Carga Inicial de la Página ======
window.onload = () => {
  setFechaHoraActual();
  cargarDatosParaCombos();
  cargarInspectores();
  cargarDefectos();
};