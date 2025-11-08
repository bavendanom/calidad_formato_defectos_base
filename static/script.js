// ============================================================================
// SISTEMA DE REGISTRO DE DEFECTOS - SCRIPT PRINCIPAL
// ============================================================================
// Autor: Brayan Avendaño / Maquinando Controls
// Versión: 2.0
// Descripción: Gestión completa del sistema de registro de defectos en líneas
//              de producción, incluyendo autoguardado, historial y administración.
// ============================================================================

// ============================================================================
// MARK: CONFIGURACIÓN Y CONSTANTES
// ============================================================================

/**
 * Configuración de turnos de trabajo disponibles.
 * Cada turno define las horas de inspección específicas.
 * @constant {Object.<number, string[]>}
 */
const TURNOS = {
  1: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "15:30", "Total día"],
  2: ["15:30", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "Total día"],
  3: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "Total día"],
  4: ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "Total día"]
};

/**
 * Estructura de defectos por línea de producción.
 * Define tipos de defectos, colores y descripciones específicas por línea.
 * @constant {Object.<string, Array|string>}
 */
const DEFECTOS_POR_LINEA = {
  "Linea 1": [
    { tipo: "LLENADO", color: "red", descripciones: [
      "Partículas extrañas (vidrio, cartón, metal, insectos, etc.)",
      "Nivel de llenado alto o bajo",
      "Botella rota / con fisura abierta",
      "Turbio, color diferente"
    ]},
    { tipo: "CAPSULADO", color: "green", descripciones: [
      "Botella sin tapa / sin capuchón",
      "Tapa descentrada",
      "Tapa reventada",
      "Precinto roto",
      "Litografía diferente",
      "Filtración"
    ]},
    { tipo: "LÁMPARA", color: "blue", descripciones: [
      "Partículas extrañas (vidrio, cartón, metal, insectos, etc.)"
    ]},
    { tipo: "ETIQUETADO", color: "orange", descripciones: [
      "Sin etiqueta",
      "Dos o más etiquetas",
      "Etiqueta equivocada",
      "Posición incorrecta",
      "Daño físico",
      "Mal pegada",
      "Defectos contraetiqueta"
    ]},
    { tipo: "VIDEO JET", color: "purple", descripciones: [
      "Sin video jet",
      "Video jet sin código de barras",
      "Diferente tape-etiqueta",
      "Incompleto, borroso",
      "Incorrecto",
      "Cinta mal pegada",
      "Etiqueta dañada"
    ]},
    { tipo: "EMBALAJE", color: "teal", descripciones: [
      "Faltante de unidades",
      "Partición incompleta o sin ella",
      "Caja deteriorada (rasgada, húmeda, sucia)",
      "Caja no corresponde con producto"
    ]}
  ],
  "Linea 2": "same",
  "Linea 3": "same",
  "Linea 4": "same",
  "Tetrapack": [
    { tipo: "DEFECTOS GENERALES", color: "blue", descripciones: [
      "Video JET",
      "Daño manipulación",
      "Formación envase",
      "Sellado longitudinal",
      "Superficie interna",
      "Sellado transversal",
      "Flasps despegados",
      "Otros"
    ]}
  ],
  "Shot": "sameTetrapack"
};

/**
 * Colores asignados a cada tipo de defecto para visualización.
 * @constant {Object.<string, string>}
 */
const COLORES_TIPO_DEFECTO = {
  "LLENADO": "#ffe6e6",
  "CAPSULADO": "#e6ffe6",
  "LÁMPARA": "#e6e6ff",
  "LAMPARA": "#e6e6ff",
  "ETIQUETADO": "#fff3e6",
  "VIDEO JET": "#ffe6ff",
  "EMBALAJE": "#e6ffff",
  "DEFECTOS GENERALES": "#f0f0f0"
};


// ============================================================================
// MARK: VARIABLES GLOBALES DE ESTADO
// ============================================================================

// --- Elementos del DOM (inicializados en DOMContentLoaded) ---
let tabs, inspectorSelect, btnHoy, btnConsultar, tablaContainer;
let botonesTurno, btnGuardar;

// --- Estado de la línea actual ---
let currentLinea = "Linea 1";
let turnoActual = 1;
let horas = TURNOS[1];

/**
 * Mapeo de turnos guardados por línea.
 * @type {Object.<string, number>}
 */
let turnoPorLinea = {
  "Linea 1": 1,
  "Linea 2": 1,
  "Linea 3": 1,
  "Linea 4": 1,
  "Tetrapack": 1,
  "Shot": 1
};

// --- Variables de historial ---
let tipoHistorialActual = "detallado"; // "detallado" o "resumen"
let paginaActualHistorial = 1;
let filtroFechaInicio = '';
let filtroFechaFin = '';
let filtroTipoDefecto = 'todos';
let filtroLote = '';
let filtroCodigoAX = '';

// --- Variables de autocompletado ---
let autocompletadoActivo = false;
let sugerenciaSeleccionada = -1;
let autocompletadoFiltroActivo = false;
let sugerenciaFiltroSeleccionada = -1;
let autocompletadoFiltroContainer = null;

// --- Variables de administración ---
let adminAutenticado = false;
let intentosLogin = 3;
let bloqueadoHasta = null;
let modalLoginAdmin = null;
let destinoPendiente = null;

// --- Variables de UI ---
let celdaActiva = null;


// ============================================================================
// MARK: INICIALIZACIÓN DEL SISTEMA
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarElementosDOM();
  configurarEventListeners();
  inicializarVista();
});

/**
 * Inicializa referencias a elementos del DOM.
 */
function inicializarElementosDOM() {
  tabs = document.querySelectorAll("#lineTabs .nav-link");
  inspectorSelect = document.getElementById("inspector");
  btnHoy = document.getElementById("btnHoy");
  btnConsultar = document.getElementById("btnConsultar");
  tablaContainer = document.getElementById("tablaDefectos");
  botonesTurno = document.querySelectorAll(".btn-turno");
  btnGuardar = document.getElementById("btnGuardar");
}

/**
 * Configura todos los event listeners principales del sistema.
 */
function configurarEventListeners() {
  configurarTabs();
  configurarTurnos();
  configurarFormulario();
  configurarGuardado();
  configurarAutocompletado();
}

/**
 * Inicializa la vista por defecto del sistema.
 */
function inicializarVista() {
  cargarInspectores();
  renderTabla("Linea 1");
  
  // Cargar turno guardado para línea inicial
  const turnoInicial = parseInt(localStorage.getItem("turno_Linea 1")) || turnoPorLinea["Linea 1"];
  horas = TURNOS[turnoInicial];
  turnoActual = turnoInicial;
  
  // Marcar botón activo
  botonesTurno.forEach(b => {
    if (parseInt(b.dataset.turno) === turnoInicial) b.classList.add("active");
    else b.classList.remove("active");
  });
  
  // Cargar estado guardado
  setTimeout(() => loadState("Linea 1"), 50);
}


// ============================================================================
// MARK: GESTIÓN DE PESTAÑAS Y NAVEGACIÓN
// ============================================================================

/**
 * Configura el comportamiento de las pestañas de líneas de producción.
 */
function configurarTabs() {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => manejarCambioTab(tab));
  });
}

/**
 * Maneja el cambio de pestaña entre líneas.
 * @param {HTMLElement} tab - Elemento de pestaña clickeado
 */
function manejarCambioTab(tab) {
  const linea = tab.dataset.linea;

  // Si es pestaña Admin, verificar autenticación
  if (linea === "Admin") {
    ocultarFormulario();
    ocultarHistorial();
    ocultarBotonGuardar();
    verificarAccesoAdmin(linea);
    
    document.querySelector("#lineTabs .active").classList.remove("active");
    tab.classList.add("active");
    return;
  }

  // Cerrar sesión de admin al cambiar de pestaña
  if (adminAutenticado) {
    adminAutenticado = false;
  }

  // Mostrar elementos de interfaz normal
  mostrarFormulario();
  mostrarBotonGuardar();

  // Guardar estado de línea anterior
  saveState(currentLinea);

  // Cambiar visualmente la pestaña activa
  document.querySelector("#lineTabs .active").classList.remove("active");
  tab.classList.add("active");

  currentLinea = linea;

  // Cargar turno guardado para esta línea
  const turnoGuardado = parseInt(localStorage.getItem(`turno_${linea}`)) || turnoPorLinea[linea] || 1;
  turnoPorLinea[linea] = turnoGuardado;
  turnoActual = turnoGuardado;
  horas = TURNOS[turnoGuardado];

  // Renderizar tabla
  renderTabla(linea);

  // Marcar botón del turno activo
  botonesTurno.forEach(b => {
    if (parseInt(b.dataset.turno) === turnoGuardado) b.classList.add("active");
    else b.classList.remove("active");
  });

  // Cargar celdas guardadas
  setTimeout(() => loadState(linea), 50);
}


// ============================================================================
// MARK: GESTIÓN DE TURNOS
// ============================================================================

/**
 * Configura los botones de cambio de turno.
 */
function configurarTurnos() {
  botonesTurno.forEach(btn => {
    btn.addEventListener("click", () => manejarCambioTurno(btn));
  });
}

/**
 * Maneja el cambio de turno manteniendo los datos por posición.
 * @param {HTMLElement} btn - Botón de turno clickeado
 */
function manejarCambioTurno(btn) {
  // Capturar datos actuales por posición
  const datosActuales = capturarDatosPorPosicion();
  
  turnoActual = parseInt(btn.dataset.turno);
  turnoPorLinea[currentLinea] = turnoActual;
  horas = TURNOS[turnoActual];

  // Actualizar botón activo
  botonesTurno.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  // Renderizar nueva tabla
  renderTabla(currentLinea);
  
  // Restaurar datos por posición
  setTimeout(() => {
    restaurarDatosPorPosicion(datosActuales);
  }, 100);

  localStorage.setItem(`turno_${currentLinea}`, turnoActual);
}


// ============================================================================
// MARK: RENDERIZADO DE TABLA DE DEFECTOS
// ============================================================================

/**
 * Renderiza la tabla de defectos para una línea específica.
 * @param {string} linea - Nombre de la línea de producción
 */
function renderTabla(linea) {
  tablaContainer.innerHTML = "";

  const tabla = crearEstructuraTabla();
  const tbody = document.createElement("tbody");
  const defectos = obtenerDefectos(linea);

  defectos.forEach(grupo => {
    agregarFilasTipoDefecto(tbody, grupo);
  });

  configurarEventosTabla(tabla);
  tabla.appendChild(tbody);
  tablaContainer.appendChild(tabla);

  mostrarSeccionHistorial(linea);
}

/**
 * Crea la estructura base de la tabla HTML.
 * @returns {HTMLTableElement} Elemento tabla con encabezados
 */
function crearEstructuraTabla() {
  const tabla = document.createElement("table");
  tabla.className = "table table-bordered align-middle text-center defectos-table";
  
  // Encabezado
  const thead = document.createElement("thead");
  let headRow = "<tr><th class='text-start'>Defectos</th>";
  horas.forEach(h => headRow += `<th>${h}</th>`);
  headRow += "</tr>";
  thead.innerHTML = headRow;
  tabla.appendChild(thead);
  
  return tabla;
}

/**
 * Agrega las filas de un tipo de defecto al tbody.
 * @param {HTMLElement} tbody - Elemento tbody donde agregar filas
 * @param {Object} grupo - Objeto con tipo, color y descripciones
 */
function agregarFilasTipoDefecto(tbody, grupo) {
  // Fila de encabezado del tipo
  const rowTipo = document.createElement("tr");
  rowTipo.innerHTML = `<td colspan="${horas.length + 1}" class="tipo-defecto" style="color:${grupo.color}; font-weight:bold;">${grupo.tipo}</td>`;
  tbody.appendChild(rowTipo);

  // Filas de descripciones
  grupo.descripciones.forEach(desc => {
    const fila = crearFilaDescripcion(desc, grupo);
    tbody.appendChild(fila);
  });

  // Fila de observaciones
  const rowObservaciones = crearFilaObservaciones(grupo);
  tbody.appendChild(rowObservaciones);
}

/**
 * Crea una fila de descripción con celdas editables.
 * @param {string} desc - Descripción del defecto
 * @param {Object} grupo - Grupo de defecto (tipo y color)
 * @returns {HTMLElement} Fila TR completa
 */
function crearFilaDescripcion(desc, grupo) {
  const fila = document.createElement("tr");
  let celdas = `<td class="text-start">${desc}</td>`;
  
  horas.forEach((h) => {
    if (h === "Total día") {
      celdas += `<td class="total-dia bg-light">0</td>`;
    } else {
      celdas += `<td contenteditable="true" class="celda-input" data-hora="${h}" data-tipo="${grupo.tipo}" data-desc="${desc}"></td>`;
    }
  });
  
  fila.innerHTML = celdas;
  return fila;
}

/**
 * Crea la fila de observaciones para un tipo de defecto.
 * @param {Object} grupo - Grupo de defecto
 * @returns {HTMLElement} Fila TR de observaciones
 */
function crearFilaObservaciones(grupo) {
  const rowObservaciones = document.createElement("tr");
  rowObservaciones.innerHTML = `
    <td class="text-start fw-bold">📝 Observaciones:</td>
    <td colspan="${horas.length}" class="observaciones-tipo">
      <input 
        type="text" 
        class="form-control form-control-sm observacion-input" 
        data-tipo="${grupo.tipo}"
        placeholder="Observaciones para ${grupo.tipo} (máx. 100 caracteres)" 
        maxlength="100">
    </td>
  `;
  return rowObservaciones;
}

/**
 * Configura todos los eventos de interacción de la tabla.
 * @param {HTMLTableElement} tabla - Elemento tabla
 */
function configurarEventosTabla(tabla) {
  // Evento de input (validación y recálculo)
  tabla.addEventListener("input", e => {
    if (e.target.classList.contains("celda-input")) {
      validarSoloNumeros(e.target);
      recalcularTotal(e.target.closest("tr"));
    }
  });

  // Evento de keydown (prevenir caracteres inválidos)
  tabla.addEventListener("keydown", e => {
    if (e.target.classList.contains("celda-input")) {
      manejarTecladoCelda(e);
    }
  });

  // Evento de paste (limpiar caracteres inválidos)
  tabla.addEventListener("paste", e => {
    if (e.target.classList.contains("celda-input")) {
      manejarPegadoCelda(e);
    }
  });

  // Eventos de focus (resaltado)
  tabla.addEventListener("focusin", e => {
    if (e.target.classList.contains("celda-input")) {
      resaltarCelda(e.target);
    }
  });

  tabla.addEventListener("focusout", e => {
    if (e.target.classList.contains("celda-input")) {
      quitarResaltado();
    }
  });
}

/**
 * Obtiene la estructura de defectos para una línea específica.
 * @param {string} linea - Nombre de la línea
 * @returns {Array} Array de objetos con tipo, color y descripciones
 */
function obtenerDefectos(linea) {
  if (["Linea 2", "Linea 3", "Linea 4"].includes(linea)) {
    return DEFECTOS_POR_LINEA["Linea 1"];
  }
  if (linea === "Shot") {
    return DEFECTOS_POR_LINEA["Tetrapack"];
  }
  if (DEFECTOS_POR_LINEA[linea]) {
    return DEFECTOS_POR_LINEA[linea];
  }
  console.warn(`No se encontró estructura para ${linea}, usando Línea 1`);
  return DEFECTOS_POR_LINEA["Linea 1"];
}


// ============================================================================
// MARK: VALIDACIÓN Y CÁLCULOS DE CELDAS
// ============================================================================

/**
 * Valida que una celda contenga solo números.
 * @param {HTMLElement} celda - Elemento celda contenteditable
 */
function validarSoloNumeros(celda) {
  const texto = celda.textContent;
  
  if (texto.trim() === '') return;
  
  const soloNumeros = texto.replace(/\D/g, '');
  
  if (texto !== soloNumeros) {
    const seleccion = window.getSelection();
    const rango = seleccion.getRangeAt(0);
    const posicion = rango.startOffset;
    
    celda.textContent = soloNumeros;
    
    try {
      const nuevoRango = document.createRange();
      nuevoRango.setStart(celda.childNodes[0] || celda, Math.min(posicion, soloNumeros.length));
      nuevoRango.collapse(true);
      seleccion.removeAllRanges();
      seleccion.addRange(nuevoRango);
    } catch (e) {
      celda.focus();
    }
  }
}

/**
 * Maneja el evento keydown en celdas editables.
 * @param {KeyboardEvent} e - Evento de teclado
 */
function manejarTecladoCelda(e) {
  const teclasPermitidas = [
    'Backspace', 'Delete', 'Tab', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];
  
  if (e.ctrlKey || e.metaKey) return;
  
  if (!teclasPermitidas.includes(e.key)) {
    e.preventDefault();
    e.target.classList.add('celda-invalida');
    setTimeout(() => e.target.classList.remove('celda-invalida'), 200);
  }
}

/**
 * Maneja el evento de pegado en celdas editables.
 * @param {ClipboardEvent} e - Evento de clipboard
 */
function manejarPegadoCelda(e) {
  e.preventDefault();
  const texto = (e.clipboardData || window.clipboardData).getData('text');
  const soloNumeros = texto.replace(/\D/g, '');
  if (soloNumeros) {
    document.execCommand('insertText', false, soloNumeros);
  }
}

/**
 * Recalcula el total de una fila sumando todas las celdas.
 * @param {HTMLElement} fila - Elemento TR de la fila
 */
function recalcularTotal(fila) {
  let total = 0;
  fila.querySelectorAll(".celda-input").forEach(celda => {
    const val = parseInt(celda.textContent.trim());
    if (!isNaN(val)) total += val;
  });
  const totalCell = fila.querySelector(".total-dia");
  if (totalCell) totalCell.textContent = total;
}


// ============================================================================
// MARK: RESALTADO VISUAL DE CELDAS
// ============================================================================

/**
 * Resalta la celda activa, su fila y su columna.
 * @param {HTMLElement} celda - Celda a resaltar
 */
function resaltarCelda(celda) {
  quitarResaltado();
  celdaActiva = celda;
  const tabla = celda.closest("table");
  const fila = celda.closest("tr");
  const colIndex = Array.from(celda.parentNode.children).indexOf(celda);

  fila.classList.add("highlight-row");
  
  tabla.querySelectorAll(`tr td:nth-child(${colIndex + 1}), tr th:nth-child(${colIndex + 1})`).forEach(td => {
    td.classList.add("highlight-col");
  });
  
  celda.classList.add("highlight-active-cell");
}

/**
 * Quita todo el resaltado de la tabla.
 */
function quitarResaltado() {
  document.querySelectorAll(".highlight-row").forEach(el => el.classList.remove("highlight-row"));
  document.querySelectorAll(".highlight-col").forEach(el => el.classList.remove("highlight-col"));
  document.querySelectorAll(".highlight-active-cell").forEach(el => el.classList.remove("highlight-active-cell"));
}


// ============================================================================
// MARK: PERSISTENCIA DE DATOS (LOCALSTORAGE)
// ============================================================================

/**
 * Genera la clave de localStorage para una línea específica.
 * @param {string} linea - Nombre de la línea
 * @returns {string} Clave para localStorage
 */
function makeKey(linea) {
  return `registro_v2_state_${linea.replace(/\s+/g,'_')}`;
}

/**
 * Guarda el estado completo de una línea en localStorage.
 * @param {string} linea - Nombre de la línea
 */
function saveState(linea) {
  const state = {};
  
  // Guardar formulario
  state.form = {
    fecha: document.getElementById("fecha").value || "",
    inspector: document.getElementById("inspector").value || "",
    codigoAX: document.getElementById("codigoAX").value || "",
    lote: document.getElementById("lote").value || "",
    codigoInfo: document.getElementById("codigoInfo").textContent || "---",
    nombreInfo: document.getElementById("nombreInfo").textContent || "---",
    envaseInfo: document.getElementById("envaseInfo").textContent || "---",
    destinoInfo: document.getElementById("destinoInfo").textContent || "---",
    lineasInfo: document.getElementById("lineasInfo").textContent || "---"
  };
  
  // Guardar celdas de la tabla
  state.celdas = [];
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo || "";
    const desc = cell.dataset.desc || "";
    const hora = cell.dataset.hora || "";
    const valor = cell.textContent.trim() || "";
    state.celdas.push({ tipo, desc, hora, valor });
  });
  
  // Guardar observaciones por tipo
  state.observaciones = [];
  document.querySelectorAll(".observacion-input").forEach(input => {
    const tipo = input.dataset.tipo || "";
    const valor = input.value.trim() || "";
    if (valor) {
      state.observaciones.push({ tipo, valor });
    }
  });
  
  localStorage.setItem(makeKey(linea), JSON.stringify(state));
}

/**
 * Carga el estado guardado de una línea desde localStorage.
 * @param {string} linea - Nombre de la línea
 */
function loadState(linea) {
  const raw = localStorage.getItem(makeKey(linea));
  if (!raw) return;
  
  try {
    const state = JSON.parse(raw);
    
    // Restaurar formulario
    if (state.form) {
      document.getElementById("fecha").value = state.form.fecha || "";
      document.getElementById("inspector").value = state.form.inspector || "";
      document.getElementById("codigoAX").value = state.form.codigoAX || "";
      document.getElementById("lote").value = state.form.lote || "";
      document.getElementById("codigoInfo").textContent = state.form.codigoInfo || "---";
      document.getElementById("nombreInfo").textContent = state.form.nombreInfo || "---";
      document.getElementById("envaseInfo").textContent = state.form.envaseInfo || "---";
      document.getElementById("destinoInfo").textContent = state.form.destinoInfo || "---";
      document.getElementById("lineasInfo").textContent = state.form.lineasInfo || "---";
    }
    
    // Restaurar celdas de tabla
    if (Array.isArray(state.celdas)) {
      document.querySelectorAll(".celda-input").forEach(c => c.textContent = "");
      
      state.celdas.forEach(it => {
        const selector = `.celda-input[data-tipo="${CSS.escape(it.tipo)}"][data-desc="${CSS.escape(it.desc)}"][data-hora="${CSS.escape(it.hora)}"]`;
        const cell = document.querySelector(selector);
        if (cell) cell.textContent = it.valor;
      });
    }
    
    // Restaurar observaciones
    if (Array.isArray(state.observaciones)) {
      document.querySelectorAll(".observacion-input").forEach(input => input.value = "");
      
      state.observaciones.forEach(obs => {
        const selector = `.observacion-input[data-tipo="${CSS.escape(obs.tipo)}"]`;
        const input = document.querySelector(selector);
        if (input) input.value = obs.valor;
      });
    }
  } catch (e) {
    console.error("Error cargando estado:", e);
  }
}

/**
 * Captura los datos actuales de la tabla por posición (para cambio de turno).
 * @returns {Object} Objeto con celdas y observaciones
 */
function capturarDatosPorPosicion() {
  const datos = [];
  const filas = document.querySelectorAll("tbody tr");
  let filaRealIndex = 0;
  
  filas.forEach((fila) => {
    if (fila.querySelector('.tipo-defecto')) return;
    
    const celdas = fila.querySelectorAll('.celda-input');
    const filaDatos = [];
    
    celdas.forEach((celda, colIndex) => {
      filaDatos.push({
        valor: celda.textContent.trim(),
        colIndex: colIndex
      });
    });
    
    datos.push({
      filaIndex: filaRealIndex,
      celdas: filaDatos
    });
    
    filaRealIndex++;
  });
  
  // Capturar observaciones
  const observaciones = [];
  document.querySelectorAll(".observacion-input").forEach(input => {
    observaciones.push({
      tipo: input.dataset.tipo,
      valor: input.value.trim()
    });
  });
  
  return {
    celdas: datos,
    observaciones: observaciones
  };
}

/**
 * Restaura los datos capturados en la nueva tabla (después de cambio de turno).
 * @param {Object} datos - Datos capturados con capturarDatosPorPosicion()
 */
function restaurarDatosPorPosicion(datos) {
  const datosCeldas = datos.celdas || datos;
  const datosObservaciones = datos.observaciones || [];
  const filas = document.querySelectorAll("tbody tr");
  let filaRealIndex = 0;
  
  filas.forEach((fila) => {
    if (fila.querySelector('.tipo-defecto')) return;
    
    const datosFila = datosCeldas.find(d => d.filaIndex === filaRealIndex);
    if (datosFila) {
      const celdas = fila.querySelectorAll('.celda-input');
      
      datosFila.celdas.forEach(datoCelda => {
        if (datoCelda.colIndex < celdas.length) {
          celdas[datoCelda.colIndex].textContent = datoCelda.valor;
        }
      });
      
      recalcularTotal(fila);
    }
    
    filaRealIndex++;
  });
  
  // Restaurar observaciones
  datosObservaciones.forEach(obs => {
    const input = document.querySelector(`.observacion-input[data-tipo="${CSS.escape(obs.tipo)}"]`);
    if (input) {
      input.value = obs.valor;
    }
  });
}


// ============================================================================
// MARK: CONFIGURACIÓN DEL FORMULARIO
// ============================================================================

/**
 * Configura todos los eventos del formulario principal.
 */
function configurarFormulario() {
  // Botón "Hoy"
  btnHoy.addEventListener("click", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    document.getElementById("fecha").value = hoy;
  });

  // Botón "Consultar" producto
  btnConsultar.addEventListener("click", consultarProducto);
}

/**
 * Consulta información de un producto por su código AX.
 */
async function consultarProducto() {
  const codigo = document.getElementById("codigoAX").value.trim();
  if (!codigo) {
    alert("Ingrese un código AX");
    return;
  }

  try {
    const res = await fetch(`/producto/${codigo}`);
    if (!res.ok) {
      alert("Código no encontrado");
      return;
    }

    const prod = await res.json();
    document.getElementById("codigoInfo").textContent = prod.codigo;
    document.getElementById("nombreInfo").textContent = prod.nombre_producto;
    document.getElementById("envaseInfo").textContent = prod.tipo_envase;
    document.getElementById("destinoInfo").textContent = prod.destino;
    document.getElementById("lineasInfo").textContent = prod.posibles_lineas_produccion;
  } catch (error) {
    console.error("Error al consultar producto:", error);
    alert("Error al consultar producto");
  }
}

/**
 * Carga la lista de inspectores desde la API.
 */
async function cargarInspectores() {
  try {
    const res = await fetch("/inspectores/");
    if (!res.ok) throw new Error(`Error ${res.status}`);
    
    const inspectores = await res.json();
    
    inspectorSelect.innerHTML = "<option value=''>Seleccionar...</option>";
    inspectores.forEach(inspector => {
      inspectorSelect.add(new Option(inspector, inspector));
    });
  } catch (error) {
    console.error("Error al cargar inspectores:", error);
    inspectorSelect.innerHTML = "<option value=''>Error al cargar</option>";
  }
}


// ============================================================================
// MARK: AUTOCOMPLETADO DE CÓDIGO AX (FORMULARIO)
// ============================================================================

/**
 * Configura el autocompletado del campo de código AX en el formulario.
 */
function configurarAutocompletado() {
  const inputCodigoAX = document.getElementById("codigoAX");
  const autocompletadoContainer = document.createElement("div");
  autocompletadoContainer.id = "autocompletado";
  autocompletadoContainer.className = "autocompletado-container";
  inputCodigoAX.parentElement.style.position = "relative";
  inputCodigoAX.parentElement.appendChild(autocompletadoContainer);

  // Evento: Escribir en el campo
  inputCodigoAX.addEventListener("input", async (e) => {
    const termino = e.target.value.trim();
    
    if (termino.length < 1) {
      ocultarAutocompletado();
      return;
    }
    
    await buscarSugerencias(termino, autocompletadoContainer);
  });

  // Evento: Navegación con teclado
  inputCodigoAX.addEventListener("keydown", (e) => {
    manejarTecladoAutocompletado(e, autocompletadoContainer);
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!inputCodigoAX.contains(e.target) && !autocompletadoContainer.contains(e.target)) {
      ocultarAutocompletado();
    }
  });
}

/**
 * Busca sugerencias de productos en el backend.
 * @param {string} termino - Término de búsqueda
 * @param {HTMLElement} container - Contenedor de sugerencias
 */
async function buscarSugerencias(termino, container) {
  try {
    const res = await fetch(`/api/productos/buscar/?q=${encodeURIComponent(termino)}`);
    if (!res.ok) throw new Error("Error en búsqueda");
    
    const resultados = await res.json();
    mostrarSugerencias(resultados, container, seleccionarSugerencia);
  } catch (error) {
    console.error("Error al buscar sugerencias:", error);
    ocultarAutocompletado();
  }
}

/**
 * Muestra las sugerencias en el contenedor especificado.
 * @param {Array} resultados - Array de resultados
 * @param {HTMLElement} container - Contenedor DOM
 * @param {Function} callback - Función a ejecutar al seleccionar
 */
function mostrarSugerencias(resultados, container, callback) {
  if (resultados.length === 0) {
    container.style.display = "none";
    autocompletadoActivo = false;
    return;
  }
  
  container.innerHTML = resultados.map((item, index) => `
    <div class="sugerencia-item" data-codigo="${item.codigo}" data-index="${index}">
      <span class="codigo-sugerencia">${item.codigo}</span>
    </div>
  `).join('');
  
  container.querySelectorAll(".sugerencia-item").forEach(item => {
    item.addEventListener("click", () => callback(item.dataset.codigo));
  });
  
  autocompletadoActivo = true;
  sugerenciaSeleccionada = -1;
  container.style.display = "block";
}

/**
 * Maneja la navegación con teclado en el autocompletado.
 * @param {KeyboardEvent} e - Evento de teclado
 * @param {HTMLElement} container - Contenedor de sugerencias
 */
function manejarTecladoAutocompletado(e, container) {
  if (!autocompletadoActivo) return;
  
  const sugerencias = container.querySelectorAll(".sugerencia-item");
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    sugerenciaSeleccionada = Math.min(sugerenciaSeleccionada + 1, sugerencias.length - 1);
    actualizarSeleccion(sugerencias);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    sugerenciaSeleccionada = Math.max(sugerenciaSeleccionada - 1, -1);
    actualizarSeleccion(sugerencias);
  } else if (e.key === "Enter" && sugerenciaSeleccionada >= 0) {
    e.preventDefault();
    sugerencias[sugerenciaSeleccionada].click();
  } else if (e.key === "Escape") {
    ocultarAutocompletado();
  }
}

/**
 * Actualiza la selección visual de las sugerencias.
 * @param {NodeList} sugerencias - Lista de elementos de sugerencia
 */
function actualizarSeleccion(sugerencias) {
  sugerencias.forEach((item, index) => {
    if (index === sugerenciaSeleccionada) {
      item.classList.add("seleccionado");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("seleccionado");
    }
  });
}

/**
 * Oculta el panel de autocompletado.
 */
function ocultarAutocompletado() {
  const container = document.getElementById("autocompletado");
  if (container) {
    container.style.display = "none";
  }
  autocompletadoActivo = false;
  sugerenciaSeleccionada = -1;
}

/**
 * Selecciona una sugerencia y consulta el producto automáticamente.
 * @param {string} codigo - Código del producto seleccionado
 */
async function seleccionarSugerencia(codigo) {
  const inputCodigoAX = document.getElementById("codigoAX");
  inputCodigoAX.value = codigo;
  ocultarAutocompletado();
  
  try {
    const res = await fetch(`/producto/${codigo}`);
    if (!res.ok) {
      alert("Error al consultar producto");
      return;
    }
    
    const prod = await res.json();
    document.getElementById("codigoInfo").textContent = prod.codigo;
    document.getElementById("nombreInfo").textContent = prod.nombre_producto;
    document.getElementById("envaseInfo").textContent = prod.tipo_envase;
    document.getElementById("destinoInfo").textContent = prod.destino;
    document.getElementById("lineasInfo").textContent = prod.posibles_lineas_produccion;
    
    // Feedback visual
    inputCodigoAX.classList.add("consulta-exitosa");
    setTimeout(() => inputCodigoAX.classList.remove("consulta-exitosa"), 1000);
  } catch (error) {
    console.error("Error al consultar producto:", error);
    alert("Error al consultar producto");
  }
}


// ============================================================================
// MARK: GUARDADO DE DATOS
// ============================================================================

/**
 * Configura los eventos relacionados con el guardado de datos.
 */
function configurarGuardado() {
  btnGuardar.addEventListener("click", mostrarModalConfirmacion);
  document.getElementById("btnConfirmarGuardado").addEventListener("click", confirmarGuardado);
}

/**
 * Muestra el modal de confirmación antes de guardar.
 */
function mostrarModalConfirmacion() {
  if (!validarCamposObligatorios()) {
    return;
  }

  const sumasPorTipo = calcularSumaPorTipo();
  const datosDescripciones = recopilarDatosDescripciones();
  
  if (Object.keys(sumasPorTipo).every(tipo => sumasPorTipo[tipo] === 0) && datosDescripciones.length === 0) {
    alert("⚠️ No hay datos para guardar (todos los valores son 0).");
    return;
  }

  const modal = new bootstrap.Modal(document.getElementById('modalConfirmarGuardado'));
  modal.show();
}

/**
 * Confirma y ejecuta el guardado de datos.
 */
async function confirmarGuardado() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarGuardado'));
  modal.hide();
  await ejecutarGuardado();
}

/**
 * Valida que todos los campos obligatorios estén completos.
 * @returns {boolean} True si todos los campos son válidos
 */
function validarCamposObligatorios() {
  const campos = [
    { id: "fecha", nombre: "Fecha" },
    { id: "inspector", nombre: "Inspector" },
    { id: "codigoAX", nombre: "Código AX" },
    { id: "lote", nombre: "Lote" },
    { id: "nombreInfo", nombre: "Nombre del producto" },
    { id: "envaseInfo", nombre: "Envase" },
    { id: "destinoInfo", nombre: "Destino" }
  ];

  let faltantes = [];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo.id);
    const valor = elemento.value || elemento.textContent || "";

    if (!valor.trim() || valor === "---") {
      faltantes.push(campo.nombre);
      elemento.classList.add("campo-faltante");
      setTimeout(() => elemento.classList.remove("campo-faltante"), 2500);
    }
  });

  if (faltantes.length > 0) {
    alert(`⚠️ Debes completar los siguientes campos antes de guardar:\n\n• ${faltantes.join("\n• ")}`);
    return false;
  }

  return true;
}

/**
 * Calcula la suma total de defectos por tipo.
 * @returns {Object} Objeto con sumas por tipo de defecto
 */
function calcularSumaPorTipo() {
  const sumas = {};
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo;
    const valor = parseInt(cell.textContent.trim()) || 0;
    if (!sumas[tipo]) sumas[tipo] = 0;
    sumas[tipo] += valor;
  });
  console.log("🧮 Sumatorias por tipo:", sumas);
  return sumas;
}

/**
 * Ejecuta el proceso completo de guardado en el backend.
 */
async function ejecutarGuardado() {
  try {
    const sumasPorTipo = calcularSumaPorTipo();
    const linea = currentLinea;
    const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "---";
    const lote = document.getElementById("lote").value || "---";
    const inspector = document.getElementById("inspector").value || "---";
    const nombre = document.getElementById("nombreInfo").textContent || "---";
    const envase = document.getElementById("envaseInfo").textContent || "---";
    const destino = document.getElementById("destinoInfo").textContent || "---";

    const datosParaGuardar = [];

    // Obtener observaciones por tipo
    const observacionesPorTipo = {};
    document.querySelectorAll(".observacion-input").forEach(input => {
      const tipo = input.dataset.tipo;
      const obs = input.value.trim() || "---";
      observacionesPorTipo[tipo] = obs;
    });

    // Guardar solo tipos con suma > 0
    for (const [tipo, suma] of Object.entries(sumasPorTipo)) {
      if (suma > 0) {
        datosParaGuardar.push({
          codigo,
          inspector,
          lote,
          nombre,
          envase,
          destino,
          linea_produccion: linea,
          tipo_defecto: tipo,
          suma_tipo_defecto: suma,
          observaciones: observacionesPorTipo[tipo] || "---"
        });
      }
    }

    const datosDescripciones = recopilarDatosDescripciones();

    console.log("📦 Datos para tipos_defectos:", datosParaGuardar);
    console.log("📋 Datos para tipos_defectos_descripcion:", datosDescripciones);

    // Guardar en tipos_defectos
    if (datosParaGuardar.length > 0) {
      const resTipos = await fetch("/guardar_defectos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosParaGuardar)
      });

      if (!resTipos.ok) throw new Error(`Error ${resTipos.status} en tipos_defectos`);
      const dataTipos = await resTipos.json();
      console.log("Tipos defectos guardados:", dataTipos);
    }

    // Guardar en tipos_defectos_descripcion
    if (datosDescripciones.length > 0) {
      const resDesc = await fetch("/auto_guardado/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosDescripciones)
      });

      if (!resDesc.ok) throw new Error(`Error ${resDesc.status} en tipos_defectos_descripcion`);
      const dataDesc = await resDesc.json();
      console.log("Descripciones guardadas:", dataDesc);
    }

    alert("Datos guardados correctamente");
    limpiarFormularioDespuesGuardar();
    
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);

  } catch (err) {
    console.error("❌ Error al guardar:", err);
    alert("❌ Error al guardar los datos.");
  }
}

/**
 * Recopila datos detallados por hora y descripción para guardar.
 * @returns {Array} Array de objetos con datos detallados
 */
function recopilarDatosDescripciones() {
  const linea = currentLinea;
  const fecha = document.getElementById("fecha").value || new Date().toISOString().slice(0, 10);
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "";
  const inspector = document.getElementById("inspector").value || "---";
  const lote = document.getElementById("lote").value || "---";
  const nombre = document.getElementById("nombreInfo").textContent || "";
  const envase = document.getElementById("envaseInfo").textContent || "";
  const destino = document.getElementById("destinoInfo").textContent || "";

  const datosDescripciones = [];

  document.querySelectorAll("tbody tr").forEach(fila => {
    if (fila.querySelector('.tipo-defecto')) return;

    const descripcion = fila.querySelector('td:first-child').textContent.trim();

    let filaAnterior = fila.previousElementSibling;
    while (filaAnterior && !filaAnterior.querySelector('.tipo-defecto')) {
      filaAnterior = filaAnterior.previousElementSibling;
    }
    if (!filaAnterior) return;

    const tipo = filaAnterior.querySelector('.tipo-defecto').textContent.trim();

    fila.querySelectorAll(".celda-input").forEach(celda => {
      const valor = parseInt(celda.textContent.trim()) || 0;
      const hora = celda.dataset.hora;

      if (valor > 0 && hora && hora !== "Total día") {
        datosDescripciones.push({
          fecha,
          hora,
          codigo,
          inspector,
          lote,
          nombre,
          envase,
          destino,
          linea_produccion: linea,
          tipo_defecto: tipo,
          descripcion_defecto: descripcion,
          cantidad_defectos: valor
        });
      }
    });
  });

  console.log("📋 Datos detallados por hora para guardar:", datosDescripciones);
  return datosDescripciones;
}

/**
 * Limpia el formulario y tabla después de guardar exitosamente.
 */
function limpiarFormularioDespuesGuardar() {
  // Limpiar tabla
  document.querySelectorAll(".celda-input").forEach(c => (c.textContent = ""));
  document.querySelectorAll(".total-dia").forEach(c => (c.textContent = "0"));
  
  // Limpiar información del producto
  document.getElementById("codigoInfo").textContent = "---";
  document.getElementById("nombreInfo").textContent = "---";
  document.getElementById("envaseInfo").textContent = "---";
  document.getElementById("destinoInfo").textContent = "---";
  document.getElementById("lineasInfo").textContent = "---";

  // Limpiar observaciones
  document.querySelectorAll(".observacion-input").forEach(input => {
    input.value = "";
  });
}


// ============================================================================
// MARK: GESTIÓN DE VISIBILIDAD DE ELEMENTOS UI
// ============================================================================

/**
 * Oculta el formulario principal.
 */
function ocultarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "none";
  }
}

/**
 * Muestra el formulario principal.
 */
function mostrarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "block";
  }
}

/**
 * Oculta la sección de historial.
 */
function ocultarHistorial() {
  const historialSection = document.getElementById("seccionHistorial");
  if (historialSection) {
    historialSection.style.display = "none";
  }
}

/**
 * Oculta el botón de guardar.
 */
function ocultarBotonGuardar() {
  const btnGuardar = document.getElementById("btnGuardar");
  if (btnGuardar) {
    btnGuardar.style.display = "none";
  }
}

/**
 * Muestra el botón de guardar.
 */
function mostrarBotonGuardar() {
  const btnGuardar = document.getElementById("btnGuardar");
  if (btnGuardar) {
    btnGuardar.parentElement.style.display = "block";
  }
}


// ============================================================================
// MARK: AUTENTICACIÓN DE ADMINISTRADOR
// ============================================================================

/**
 * Verifica acceso de administrador y muestra modal de login si es necesario.
 * @param {string} linea - Línea destino (Admin)
 */
function verificarAccesoAdmin(linea) {
  if (adminAutenticado) {
    mostrarPanelAdmin();
    return;
  }

  destinoPendiente = linea;
  mostrarModalLogin();
}

/**
 * Muestra el modal de login de administrador.
 */
function mostrarModalLogin() {
  document.getElementById("passwordAdmin").value = "";
  document.getElementById("errorLoginAdmin").classList.add("d-none");
  document.getElementById("bloqueoLoginAdmin").classList.add("d-none");
  
  actualizarIntentosRestantes();

  if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
    mostrarBloqueo();
  }

  modalLoginAdmin = new bootstrap.Modal(document.getElementById('modalLoginAdmin'));
  modalLoginAdmin.show();

  setTimeout(() => {
    document.getElementById("passwordAdmin").focus();
  }, 500);
  
  configurarEventosModalLogin();
}

/**
 * Configura los eventos del modal de login.
 */
function configurarEventosModalLogin() {
  const btnIngresar = document.getElementById("btnIngresarAdmin");
  const btnCancelar = document.getElementById("btnCancelarLoginAdmin");
  const passwordInput = document.getElementById("passwordAdmin");
  
  // Reemplazar listeners anteriores
  const nuevoIngresar = btnIngresar.cloneNode(true);
  btnIngresar.parentNode.replaceChild(nuevoIngresar, btnIngresar);
  
  const nuevoCancelar = btnCancelar.cloneNode(true);
  btnCancelar.parentNode.replaceChild(nuevoCancelar, btnCancelar);
  
  document.getElementById("btnIngresarAdmin").addEventListener("click", intentarLogin);
  document.getElementById("btnCancelarLoginAdmin").addEventListener("click", cancelarLogin);
  
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      intentarLogin();
    }
  });
}

/**
 * Intenta autenticar al usuario administrador.
 */
async function intentarLogin() {
  if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
    mostrarBloqueo();
    return;
  }

  const password = document.getElementById("passwordAdmin").value.trim();

  if (!password) {
    mostrarErrorLogin("Debe ingresar una contraseña");
    return;
  }

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      adminAutenticado = true;
      intentosLogin = 3;
      bloqueadoHasta = null;
      
      modalLoginAdmin.hide();
      mostrarPanelAdmin();
    } else {
      intentosLogin--;
      actualizarIntentosRestantes();

      if (intentosLogin <= 0) {
        bloqueadoHasta = Date.now() + 30000;
        mostrarBloqueo();
      } else {
        mostrarErrorLogin(`Contraseña incorrecta. Intentos restantes: ${intentosLogin}`);
      }
    }
  } catch (error) {
    console.error("Error en login:", error);
    mostrarErrorLogin("Error al conectar con el servidor");
  }
}

/**
 * Muestra mensaje de error en el modal de login.
 * @param {string} mensaje - Mensaje de error
 */
function mostrarErrorLogin(mensaje) {
  document.getElementById("mensajeErrorLogin").textContent = mensaje;
  document.getElementById("errorLoginAdmin").classList.remove("d-none");
}

/**
 * Muestra el bloqueo temporal por intentos fallidos.
 */
function mostrarBloqueo() {
  document.getElementById("btnIngresarAdmin").disabled = true;
  document.getElementById("bloqueoLoginAdmin").classList.remove("d-none");
  
  const intervalo = setInterval(() => {
    const tiempoRestante = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
    
    if (tiempoRestante <= 0) {
      clearInterval(intervalo);
      intentosLogin = 3;
      bloqueadoHasta = null;
      document.getElementById("btnIngresarAdmin").disabled = false;
      document.getElementById("bloqueoLoginAdmin").classList.add("d-none");
      actualizarIntentosRestantes();
    } else {
      document.getElementById("tiempoBloqueo").textContent = tiempoRestante;
    }
  }, 1000);
}

/**
 * Actualiza el contador de intentos restantes en el modal.
 */
function actualizarIntentosRestantes() {
  document.getElementById("intentosRestantes").textContent = intentosLogin;
}

/**
 * Cancela el login y vuelve a la pestaña anterior.
 */
function cancelarLogin() {
  modalLoginAdmin.hide();
  adminAutenticado = false;
  
  const tabLineaActual = document.querySelector(`[data-linea="${currentLinea}"]`);
  if (tabLineaActual) {
    tabLineaActual.click();
  }
}

/**
 * Cierra la sesión de administrador.
 */
function cerrarSesionAdmin() {
  if (confirm("¿Está seguro de cerrar la sesión de administrador?")) {
    adminAutenticado = false;
    intentosLogin = 3;
    
    const tabLinea1 = document.querySelector('[data-linea="Linea 1"]');
    if (tabLinea1) {
      tabLinea1.click();
    }
  }
}


// ============================================================================
// MARK: PANEL DE ADMINISTRACIÓN
// ============================================================================

/**
 * Muestra el panel de administración de inspectores.
 */
async function mostrarPanelAdmin() {
  tablaContainer.innerHTML = `
    <div class="admin-panel">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">🔧 Administración de Inspectores</h4>
        <button class="btn btn-danger btn-sm" id="btnCerrarSesionAdmin">
          🔒 Cerrar Sesión
        </button>
      </div>
      
      <div class="card mb-4">
        <div class="card-body">
          <h5>➕ Agregar Inspector</h5>
          <div class="input-group">
            <input type="text" id="nuevoInspector" class="form-control" placeholder="Nombre del inspector" maxlength="100">
            <button class="btn btn-success" id="btnAgregarInspector">Agregar</button>
          </div>
          <small class="text-muted">Mínimo 3 caracteres</small>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h5>👥 Inspectores Registrados</h5>
          <table class="table table-striped table-hover">
            <thead class="table-primary">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaInspectores">
              <tr><td colspan="3" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await cargarInspectoresAdmin();

  document.getElementById("btnCerrarSesionAdmin").addEventListener("click", cerrarSesionAdmin);
  document.getElementById("btnAgregarInspector").addEventListener("click", agregarInspector);
  
  document.getElementById("nuevoInspector").addEventListener("keypress", (e) => {
    if (e.key === "Enter") agregarInspector();
  });
}

/**
 * Carga la lista de inspectores en el panel de administración.
 */
async function cargarInspectoresAdmin() {
  try {
    const res = await fetch("/api/inspectores/");
    if (!res.ok) throw new Error(`Error ${res.status}`);
    
    const inspectores = await res.json();
    const tbody = document.getElementById("tablaInspectores");
    
    if (inspectores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay inspectores registrados</td></tr>';
      return;
    }

    tbody.innerHTML = inspectores.map(inspector => `
      <tr>
        <td>${inspector.id}</td>
        <td><strong>${inspector.nombre}</strong></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="eliminarInspector(${inspector.id}, '${inspector.nombre}')">
            🗑️ Eliminar
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error al cargar inspectores:", error);
    document.getElementById("tablaInspectores").innerHTML = 
      '<tr><td colspan="3" class="text-center text-danger">Error al cargar inspectores</td></tr>';
  }
}

/**
 * Agrega un nuevo inspector al sistema.
 */
async function agregarInspector() {
  const input = document.getElementById("nuevoInspector");
  const nombre = input.value.trim();

  if (nombre.length < 3) {
    alert("⚠️ El nombre debe tener al menos 3 caracteres");
    return;
  }

  try {
    const res = await fetch("/api/inspectores/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Error al crear inspector");
    }

    alert(`✅ Inspector "${nombre}" agregado correctamente`);
    input.value = "";
    await cargarInspectoresAdmin();
  } catch (error) {
    alert(`❌ ${error.message}`);
  }
}

/**
 * Elimina un inspector del sistema.
 * @param {number} id - ID del inspector
 * @param {string} nombre - Nombre del inspector
 */
async function eliminarInspector(id, nombre) {
  if (!confirm(`¿Está seguro de eliminar al inspector "${nombre}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/inspectores/${id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Error al eliminar inspector");
    }

    alert(`✅ Inspector "${nombre}" eliminado correctamente`);
    await cargarInspectoresAdmin();
  } catch (error) {
    alert(`❌ ${error.message}`);
  }
}

// Hacer función global para onclick en HTML
window.eliminarInspector = eliminarInspector;


// ============================================================================
// MARK: HISTORIAL DE REGISTROS
// ============================================================================

/**
 * Muestra la sección de historial para una línea específica.
 * @param {string} linea - Nombre de la línea
 */
function mostrarSeccionHistorial(linea) {
  const historialSection = document.getElementById("seccionHistorial");
  const tituloLinea = document.getElementById("tituloLineaHistorial");
  
  historialSection.style.display = "block";
  tituloLinea.textContent = linea === "Admin" ? "Todas las Líneas" : linea;
  
  cargarTiposDefectosParaFiltro(linea);
  cargarHistorial(linea);

  setTimeout(() => {
    inicializarAutocompletadoFiltro();
  }, 100);
  
  configurarBotonesHistorial();
}

/**
 * Configura los botones de control del historial.
 */
function configurarBotonesHistorial() {
  const btnDetallado = document.getElementById("btnHistorialDetallado");
  const btnResumen = document.getElementById("btnHistorialResumen");
  const btnRefrescar = document.getElementById("btnRefrescarHistorial");
  const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
  
  // Remover listeners anteriores clonando elementos
  const nuevoDetallado = btnDetallado.cloneNode(true);
  btnDetallado.parentNode.replaceChild(nuevoDetallado, btnDetallado);
  
  const nuevoResumen = btnResumen.cloneNode(true);
  btnResumen.parentNode.replaceChild(nuevoResumen, btnResumen);
  
  const nuevoRefrescar = btnRefrescar.cloneNode(true);
  btnRefrescar.parentNode.replaceChild(nuevoRefrescar, btnRefrescar);
  
  const nuevoAplicar = btnAplicarFiltros.cloneNode(true);
  btnAplicarFiltros.parentNode.replaceChild(nuevoAplicar, btnAplicarFiltros);
  
  // Agregar nuevos listeners
  document.getElementById("btnHistorialDetallado").addEventListener("click", () => {
    tipoHistorialActual = "detallado";
    actualizarEstadoBotones();
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);
  });
  
  document.getElementById("btnHistorialResumen").addEventListener("click", () => {
    tipoHistorialActual = "resumen";
    actualizarEstadoBotones();
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);
  });
  
  document.getElementById("btnRefrescarHistorial").addEventListener("click", () => {
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);
  });
  
  document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
    filtroFechaInicio = document.getElementById("filtroFechaInicio").value;
    filtroFechaFin = document.getElementById("filtroFechaFin").value;
    filtroTipoDefecto = document.getElementById("filtroTipoDefecto").value;
    filtroLote = document.getElementById("filtroLote").value.trim();
    filtroCodigoAX = document.getElementById("filtroCodigoAX").value.trim();
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);
  });
  
  actualizarEstadoBotones();
}

/**
 * Actualiza el estado visual de los botones de historial.
 */
function actualizarEstadoBotones() {
  const btnDetallado = document.getElementById("btnHistorialDetallado");
  const btnResumen = document.getElementById("btnHistorialResumen");
  
  if (tipoHistorialActual === "detallado") {
    btnDetallado.classList.add("active");
    btnDetallado.classList.remove("btn-outline-primary");
    btnDetallado.classList.add("btn-primary");
    
    btnResumen.classList.remove("active");
    btnResumen.classList.remove("btn-success");
    btnResumen.classList.add("btn-outline-success");
  } else {
    btnResumen.classList.add("active");
    btnResumen.classList.remove("btn-outline-success");
    btnResumen.classList.add("btn-success");
    
    btnDetallado.classList.remove("active");
    btnDetallado.classList.remove("btn-primary");
    btnDetallado.classList.add("btn-outline-primary");
  }
}

/**
 * Carga los tipos de defectos disponibles para el filtro.
 * @param {string} linea - Nombre de la línea
 */
async function cargarTiposDefectosParaFiltro(linea) {
  try {
    const lineaParam = linea === "Admin" ? "" : `?linea=${encodeURIComponent(linea)}`;
    const res = await fetch(`/api/tipos-defectos/${lineaParam}`);
    
    if (!res.ok) throw new Error("Error al cargar tipos de defectos");
    
    const tipos = await res.json();
    const select = document.getElementById("filtroTipoDefecto");
    
    select.innerHTML = '<option value="todos">Todos</option>';
    
    tipos.forEach(tipo => {
      const option = document.createElement("option");
      option.value = tipo;
      option.textContent = tipo;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar tipos de defectos:", error);
  }
}

/**
 * Carga el historial de registros desde el backend.
 * @param {string} linea - Nombre de la línea
 * @param {number} pagina - Número de página
 */
async function cargarHistorial(linea, pagina = 1) {
  try {
    const tbody = document.getElementById("historialTableBody");
    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Cargando...</td></tr>';
    
    const endpoint = tipoHistorialActual === "detallado" ? "/api/historial/" : "/api/historial-resumen/";
    
    let url = `${endpoint}?pagina=${pagina}&limite=20`;
    
    if (linea !== "Admin") {
      url += `&linea=${encodeURIComponent(linea)}`;
    }
    
    if (filtroFechaInicio) url += `&fecha_inicio=${filtroFechaInicio}`;
    if (filtroFechaFin) url += `&fecha_fin=${filtroFechaFin}`;
    if (filtroTipoDefecto !== "todos") url += `&tipo_defecto=${encodeURIComponent(filtroTipoDefecto)}`;
    if (filtroLote) url += `&lote=${encodeURIComponent(filtroLote)}`;
    if (filtroCodigoAX) url += `&codigo=${encodeURIComponent(filtroCodigoAX)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al cargar historial");
    
    const data = await res.json();
    mostrarHistorial(data);
  } catch (error) {
    console.error("Error al cargar historial:", error);
    const tbody = document.getElementById("historialTableBody");
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Error al cargar historial</td></tr>';
  }
}

/**
 * Muestra el historial en la tabla HTML.
 * @param {Object} data - Datos del historial del backend
 */
function mostrarHistorial(data) {
  const tbody = document.getElementById("historialTableBody");
  
  if (data.registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">No hay registros</td></tr>';
    document.getElementById("paginacionHistorial").innerHTML = '';
    return;
  }
  
  if (tipoHistorialActual === "detallado") {
    tbody.innerHTML = data.registros.map(reg => {
      const color = COLORES_TIPO_DEFECTO[reg.tipo_defecto] || "#ffffff";
      return `
        <tr style="background-color: ${color};">
          <td>${reg.id || '---'}</td>
          <td>${reg.fecha || '---'}</td>
          <td>${reg.hora || '---'}</td>
          <td><strong>${reg.codigo || '---'}</strong></td>
          <td>${reg.lote || '---'}</td>
          <td>${reg.nombre || '---'}</td>
          <td>${reg.envase || '---'}</td>
          <td>${reg.destino || '---'}</td>
          <td><span class="badge" style="background-color: ${color}; color: #000; border: 1px solid #ddd;">${reg.tipo_defecto || '---'}</span></td>
          <td>${reg.descripcion_defecto || '---'}</td>
          <td class="text-center"><strong>${reg.cantidad_defectos || 0}</strong></td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = data.registros.map(reg => {
      const color = COLORES_TIPO_DEFECTO[reg.tipo_defecto] || "#ffffff";
      const fechaHora = reg.fecha_hora ? new Date(reg.fecha_hora).toLocaleString('es-CO') : '---';
      return `
        <tr style="background-color: ${color};">
          <td>${reg.id || '---'}</td>
          <td colspan="2">${fechaHora}</td>
          <td><strong>${reg.codigo || '---'}</strong></td>
          <td>${reg.lote || '---'}</td>
          <td>${reg.nombre || '---'}</td>
          <td>${reg.envase || '---'}</td>
          <td>${reg.destino || '---'}</td>
          <td><span class="badge" style="background-color: ${color}; color: #000; border: 1px solid #ddd;">${reg.tipo_defecto || '---'}</span></td>
          <td>${reg.observaciones || '---'}</td>
          <td class="text-center"><strong>${reg.suma_tipo_defecto || 0}</strong></td>
        </tr>
      `;
    }).join('');
  }
  
  mostrarPaginacion(data, currentLinea);
}

/**
 * Muestra los controles de paginación del historial.
 * @param {Object} data - Datos del historial con info de paginación
 * @param {string} linea - Nombre de la línea actual
 */
function mostrarPaginacion(data, linea) {
  const container = document.getElementById("paginacionHistorial");
  
  if (data.total_paginas <= 1) {
    container.innerHTML = '';
    return;
  }

  const totalPaginasMostrar = Math.min(data.total_paginas, 10);
  
  let html = '<div class="d-flex justify-content-between align-items-center mt-3">';
  html += `<span class="text-muted">Mostrando ${data.registros.length} de ${data.total} registros</span>`;
  html += '<div class="btn-group">';
  
  // Botón anterior
  if (data.pagina_actual > 1) {
    html += `<button class="btn btn-sm btn-outline-primary" data-pagina="${data.pagina_actual - 1}">← Anterior</button>`;
  }

  // Números de página
  for (let i = 1; i <= totalPaginasMostrar; i++) {
    if (i === data.pagina_actual) {
      html += `<button class="btn btn-sm btn-primary" disabled>${i}</button>`;
    } else if (Math.abs(i - data.pagina_actual) <= 2 || i === 1 || i === data.total_paginas) {
      html += `<button class="btn btn-sm btn-outline-primary" data-pagina="${i}">${i}</button>`;
    } else if (Math.abs(i - data.pagina_actual) === 3) {
      html += `<button class="btn btn-sm btn-outline-secondary" disabled>...</button>`;
    }
  }

  if (data.total_paginas > 10) {
    html += `<button class="btn btn-sm btn-outline-secondary" disabled>... (+${data.total_paginas - 10})</button>`;
  }

  // Botón siguiente
  if (data.pagina_actual < totalPaginasMostrar) {
    html += `<button class="btn btn-sm btn-outline-primary" data-pagina="${data.pagina_actual + 1}">Siguiente →</button>`;
  }
  
  html += '</div></div>';
  container.innerHTML = html;

// Agregar event listeners a los botones de paginación
  container.querySelectorAll('button[data-pagina]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Detener propagación del evento
      const pagina = parseInt(btn.dataset.pagina);
      cambiarPagina(pagina);
      return false; // Prevenir cualquier comportamiento por defecto adicional
    });
  });
}

/**
 * Cambia de página en el historial.
 * @param {number} pagina - Número de página destino
 */
function cambiarPagina(pagina) {
  paginaActualHistorial = pagina;
  
  // Guardar la posición actual del scroll ANTES de cualquier cambio
  const scrollActual = window.pageYOffset || document.documentElement.scrollTop;
  
  cargarHistorial(currentLinea, pagina);
  
  // Restaurar el scroll inmediatamente y también después de cargar
  window.scrollTo(0, scrollActual);
  
  setTimeout(() => {
    window.scrollTo(0, scrollActual);
  }, 50);
  
  setTimeout(() => {
    window.scrollTo(0, scrollActual);
  }, 150);
}

// Hacer función global para onclick
window.cambiarPagina = cambiarPagina;


// ============================================================================
// MARK: AUTOCOMPLETADO EN FILTROS DE HISTORIAL
// ============================================================================

/**
 * Inicializa el autocompletado para el filtro de código AX en historial.
 */
function inicializarAutocompletadoFiltro() {
  const inputFiltroCodigo = document.getElementById("filtroCodigoAX");
  
  if (!inputFiltroCodigo) {
    console.warn("Input filtroCodigoAX no encontrado");
    return;
  }
  
  // Crear contenedor si no existe
  if (!autocompletadoFiltroContainer) {
    autocompletadoFiltroContainer = document.createElement("div");
    autocompletadoFiltroContainer.id = "autocompletadoFiltro";
    autocompletadoFiltroContainer.className = "autocompletado-container";
    inputFiltroCodigo.parentElement.style.position = "relative";
    inputFiltroCodigo.parentElement.appendChild(autocompletadoFiltroContainer);
  }
  
  // Limpiar listeners anteriores
  const nuevoInput = inputFiltroCodigo.cloneNode(true);
  inputFiltroCodigo.parentNode.replaceChild(nuevoInput, inputFiltroCodigo);
  
  // Evento: Escribir
  nuevoInput.addEventListener("input", async (e) => {
    const termino = e.target.value.trim();
    
    if (termino.length < 2) {
      ocultarAutocompletadoFiltro();
      return;
    }
    
    await buscarSugerenciasFiltro(termino);
  });
  
  // Evento: Navegación con teclado
  nuevoInput.addEventListener("keydown", (e) => {
    manejarTecladoAutocompletadoFiltro(e);
  });
  
  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!nuevoInput.contains(e.target) && !autocompletadoFiltroContainer.contains(e.target)) {
      ocultarAutocompletadoFiltro();
    }
  });
}

/**
 * Busca sugerencias de códigos en registros de defectos.
 * @param {string} termino - Término de búsqueda
 */
async function buscarSugerenciasFiltro(termino) {
  try {
    const lineaParam = currentLinea === "Admin" ? "" : `&linea=${encodeURIComponent(currentLinea)}`;
    const tipoParam = `&tipo_historial=${tipoHistorialActual}`;
    
    const res = await fetch(`/api/codigos/buscar/?q=${encodeURIComponent(termino)}${lineaParam}${tipoParam}`);
    
    if (!res.ok) throw new Error("Error en búsqueda");
    
    const resultados = await res.json();
    mostrarSugerenciasFiltro(resultados);
  } catch (error) {
    console.error("Error al buscar sugerencias de códigos:", error);
    ocultarAutocompletadoFiltro();
  }
}

/**
 * Muestra las sugerencias del filtro en el DOM.
 * @param {Array} resultados - Array de resultados
 */
function mostrarSugerenciasFiltro(resultados) {
  if (resultados.length === 0) {
    ocultarAutocompletadoFiltro();
    return;
  }
  
  autocompletadoFiltroContainer.innerHTML = resultados.map((item, index) => `
    <div class="sugerencia-item" data-codigo="${item.codigo}" data-index="${index}">
      <span class="codigo-sugerencia">${item.codigo}</span>
    </div>
  `).join('');
  
  autocompletadoFiltroContainer.querySelectorAll(".sugerencia-item").forEach(item => {
    item.addEventListener("click", () => seleccionarSugerenciaFiltro(item.dataset.codigo));
  });
  
  autocompletadoFiltroActivo = true;
  sugerenciaFiltroSeleccionada = -1;
  autocompletadoFiltroContainer.style.display = "block";
}

/**
 * Maneja la navegación con teclado en autocompletado de filtros.
 * @param {KeyboardEvent} e - Evento de teclado
 */
function manejarTecladoAutocompletadoFiltro(e) {
  if (!autocompletadoFiltroActivo) return;
  
  const sugerencias = autocompletadoFiltroContainer.querySelectorAll(".sugerencia-item");
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    sugerenciaFiltroSeleccionada = Math.min(sugerenciaFiltroSeleccionada + 1, sugerencias.length - 1);
    actualizarSeleccionFiltro(sugerencias);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    sugerenciaFiltroSeleccionada = Math.max(sugerenciaFiltroSeleccionada - 1, -1);
    actualizarSeleccionFiltro(sugerencias);
  } else if (e.key === "Enter" && sugerenciaFiltroSeleccionada >= 0) {
    e.preventDefault();
    sugerencias[sugerenciaFiltroSeleccionada].click();
  } else if (e.key === "Escape") {
    ocultarAutocompletadoFiltro();
  }
}

/**
 * Actualiza la selección visual en autocompletado de filtros.
 * @param {NodeList} sugerencias - Lista de elementos de sugerencia
 */
function actualizarSeleccionFiltro(sugerencias) {
  sugerencias.forEach((item, index) => {
    if (index === sugerenciaFiltroSeleccionada) {
      item.classList.add("seleccionado");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("seleccionado");
    }
  });
}

/**
 * Selecciona una sugerencia del filtro (solo llena el campo).
 * @param {string} codigo - Código seleccionado
 */
function seleccionarSugerenciaFiltro(codigo) {
  const inputFiltroCodigo = document.getElementById("filtroCodigoAX");
  
  if (inputFiltroCodigo) {
    inputFiltroCodigo.value = codigo;
    
    inputFiltroCodigo.classList.add("consulta-exitosa");
    setTimeout(() => inputFiltroCodigo.classList.remove("consulta-exitosa"), 1000);
  }
  
  ocultarAutocompletadoFiltro();
}

/**
 * Oculta el panel de autocompletado del filtro.
 */
function ocultarAutocompletadoFiltro() {
  if (autocompletadoFiltroContainer) {
    autocompletadoFiltroContainer.style.display = "none";
  }
  autocompletadoFiltroActivo = false;
  sugerenciaFiltroSeleccionada = -1;
}


// ============================================================================
// FIN DEL SCRIPT
// ============================================================================