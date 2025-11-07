document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("#lineTabs .nav-link");
  const inspectorSelect = document.getElementById("inspector");
  const btnHoy = document.getElementById("btnHoy");
  const btnConsultar = document.getElementById("btnConsultar");
  const tablaContainer = document.getElementById("tablaDefectos");

  // --- HORAS PREDEFINIDAS (por defecto turno 1) ---
  let horas = ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "15:30", "Total día"];

  // --- TURNOS DISPONIBLES ---
  const turnos = {
    1: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "15:30", "Total día"],
    2: ["15:30", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "Total día"],
    3: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "Total día"],
    4: ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "Total día"]
  };

  // --- ESTRUCTURA DE DEFECTOS POR LÍNEA ---
  const defectosPorLinea = {
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

  // ======================================================
  // MARK: VARIABLES GLOBALES DE HISTORIAL (DECLARAR AQUÍ)
  // ======================================================
  let tipoHistorialActual = "detallado"; // "detallado" o "resumen"
  let paginaActualHistorial = 1;
  let filtroFechaInicio = '';
  let filtroFechaFin = '';
  let filtroTipoDefecto = 'todos';
  let filtroLote = ''; 
  let filtroCodigoAX = ''; 

  let autocompletadoFiltroContainer = null;


  // ==============================
  // MARK: CAMBIO DE TURNO (MANTIENE DATOS POR POSICIÓN)
  // ==============================

  const botonesTurno = document.querySelectorAll(".btn-turno");
  let turnoActual = 1;

  botonesTurno.forEach(btn => {
    btn.addEventListener("click", () => {
      // 🆕 CAPTURAR DATOS ACTUALES POR POSICIÓN (no por hora)
      const datosActuales = capturarDatosPorPosicion();
      
      turnoActual = parseInt(btn.dataset.turno);
      turnoPorLinea[currentLinea] = turnoActual;
      horas = turnos[turnoActual];

      // Actualizar botón activo
      botonesTurno.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Renderizar nueva tabla
      renderTabla(currentLinea);
      
      // 🆕 RESTAURAR DATOS POR POSICIÓN después de renderizar
      setTimeout(() => {
        restaurarDatosPorPosicion(datosActuales);
      }, 100);

      localStorage.setItem(`turno_${currentLinea}`, turnoActual);
    });
  });


  // ==============================
  // MARK: Renderizar tabla de defectos 
  // ==============================
  function renderTabla(linea) {
    tablaContainer.innerHTML = "";

    const scrollContainer = document.createElement("div");
    scrollContainer.style.maxHeight = "600px";
    scrollContainer.style.overflowY = "auto";
    scrollContainer.style.position = "relative";

    const tabla = document.createElement("table");
    tabla.className = "table table-bordered align-middle text-center defectos-table";
    
    // Encabezado de horas
    const thead = document.createElement("thead");
    let headRow = "<tr><th class='text-start'>Defectos</th>";
    horas.forEach(h => headRow += `<th>${h}</th>`);
    headRow += "</tr>";
    thead.innerHTML = headRow;
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    const defectos = obtenerDefectos(linea);

    defectos.forEach(grupo => {
      // Fila de tipo
      const rowTipo = document.createElement("tr");
      rowTipo.innerHTML = `<td colspan="${horas.length + 1}" class="tipo-defecto" style="color:${grupo.color}; font-weight:bold;">${grupo.tipo}</td>`;
      tbody.appendChild(rowTipo);

      // Filas de descripción
      grupo.descripciones.forEach(desc => {
        const fila = document.createElement("tr");
        let celdas = `<td class="text-start">${desc}</td>`;
        horas.forEach((h, idx) => {
          if (h === "Total día") {
            celdas += `<td class="total-dia bg-light">0</td>`;
          } else {
            celdas += `<td contenteditable="true" class="celda-input" data-hora="${h}" data-tipo="${grupo.tipo}" data-desc="${desc}"></td>`;
          }
        });
        fila.innerHTML = celdas;
        tbody.appendChild(fila);
      });

      // 🆕 NUEVA FILA: Observaciones para este tipo
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
      tbody.appendChild(rowObservaciones);
    });

    // Eventos de interacción en celdas (mantener código existente)
    tabla.addEventListener("input", e => {
      if (e.target.classList.contains("celda-input")) {
        validarSoloNumeros(e.target);
        recalcularTotal(e.target.closest("tr"));
      }
    });

    tabla.addEventListener("keydown", e => {
      if (e.target.classList.contains("celda-input")) {
        const tecla = e.key;
        const teclasPermitidas = [
          'Backspace', 'Delete', 'Tab', 'Enter', 
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
        ];
        if (e.ctrlKey || e.metaKey) return;
        if (!teclasPermitidas.includes(tecla)) {
          e.preventDefault();
          e.target.classList.add('celda-invalida');
          setTimeout(() => e.target.classList.remove('celda-invalida'), 200);
        }
      }
    });

    tabla.addEventListener("paste", e => {
      if (e.target.classList.contains("celda-input")) {
        e.preventDefault();
        const texto = (e.clipboardData || window.clipboardData).getData('text');
        const soloNumeros = texto.replace(/\D/g, '');
        if (soloNumeros) {
          document.execCommand('insertText', false, soloNumeros);
        }
      }
    });

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

    tabla.appendChild(tbody);
    tablaContainer.appendChild(tabla);

    mostrarSeccionHistorial(linea);
  }
function obtenerDefectos(linea) {
  // Si Linea 2–4 → heredan estructura de Linea 1
  if (["Linea 2", "Linea 3", "Linea 4"].includes(linea)) return defectosPorLinea["Linea 1"];
  // Si Shot → hereda Tetrapack
  if (linea === "Shot") return defectosPorLinea["Tetrapack"];
  // Si Tetrapack tiene estructura propia, úsala
  if (defectosPorLinea[linea]) return defectosPorLinea[linea];
  // fallback de seguridad
  console.warn(`No se encontró estructura para ${linea}, usando Línea 1`);
  return defectosPorLinea["Linea 1"];
}


// =====================
// MARK: Persistencia por pestaña
// =====================
let currentLinea = "Linea 1"; // línea activa actual

let turnoPorLinea = {
  "Linea 1": 1,
  "Linea 2": 1,
  "Linea 3": 1,
  "Linea 4": 1,
  "Tetrapack": 1,
  "Shot": 1
};


function makeKey(linea) {
  return `registro_v2_state_${linea.replace(/\s+/g,'_')}`;
}

function saveState(linea) {
  const state = {};
  // guardar formulario
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
  // 📊 Guardar datos de la tabla
  state.celdas = [];
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo || "";
    const desc = cell.dataset.desc || "";
    const hora = cell.dataset.hora || "";
    const valor = cell.textContent.trim() || "";
    state.celdas.push({ tipo, desc, hora, valor });
  });
  
  // 🆕 GUARDAR OBSERVACIONES POR TIPO
  state.observaciones = [];
  document.querySelectorAll(".observacion-input").forEach(input => {
    const tipo = input.dataset.tipo || "";
    const valor = input.value.trim() || "";
    if (valor) { // Solo guardar si tiene contenido
      state.observaciones.push({ tipo, valor });
    }
  });
  
  // Guardar en localStorage
  localStorage.setItem(makeKey(linea), JSON.stringify(state));
}

function loadState(linea) {
  const raw = localStorage.getItem(makeKey(linea));
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    // formulario
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
    // 📊 Restaurar tabla
    if (Array.isArray(state.celdas)) {
      // Limpiar celdas primero
      document.querySelectorAll(".celda-input").forEach(c => c.textContent = "");
      
      // Restaurar valores
      state.celdas.forEach(it => {
        const selector = `.celda-input[data-tipo="${CSS.escape(it.tipo)}"][data-desc="${CSS.escape(it.desc)}"][data-hora="${CSS.escape(it.hora)}"]`;
        const cell = document.querySelector(selector);
        if (cell) cell.textContent = it.valor;
      });
    }
    
    // 🆕 RESTAURAR OBSERVACIONES POR TIPO
    if (Array.isArray(state.observaciones)) {
      // Limpiar observaciones primero
      document.querySelectorAll(".observacion-input").forEach(input => input.value = "");
      
      // Restaurar valores
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

// =====================
// MARK: Suma automática por fila
// =====================
function recalcularTotal(fila) {
  let total = 0;
  fila.querySelectorAll(".celda-input").forEach(celda => {
    const val = parseInt(celda.textContent.trim());
    if (!isNaN(val)) total += val;
  });
  const totalCell = fila.querySelector(".total-dia");
  if (totalCell) totalCell.textContent = total;
}

// ==============================
// MARK: FUNCIONES PARA DATOS POR POSICIÓN (CORREGIDO)
// ==============================

/**
 * Captura todos los datos de la tabla actual por posición (índice de fila y columna)
 */
function capturarDatosPorPosicion() {
  const datos = [];
  const filas = document.querySelectorAll("tbody tr");
  let filaRealIndex = 0; // 🆕 Solo cuenta filas de datos, no encabezados
  
  filas.forEach((fila, filaIndex) => {
    // Saltar filas de tipo (encabezados)
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
      filaIndex: filaRealIndex, // 🆕 Usar índice real de filas de datos
      celdas: filaDatos
    });
    
    filaRealIndex++; // 🆕 Incrementar solo para filas de datos
  });
  
  // 🆕 CAPTURAR OBSERVACIONES
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
 * Restaura los datos en la nueva tabla por posición
 */
function restaurarDatosPorPosicion(datos) {

  // 🆕 Manejar formato antiguo y nuevo
  const datosCeldas = datos.celdas || datos;
  const datosObservaciones = datos.observaciones || [];
  const filas = document.querySelectorAll("tbody tr");
  let filaRealIndex = 0; // 🆕 Solo contar filas de datos
  
  filas.forEach((fila, filaIndex) => {
    // Saltar filas de tipo
    if (fila.querySelector('.tipo-defecto')) return;
    
    // Buscar datos para esta fila usando el índice real
    const datosFila = datosCeldas.find(d => d.filaIndex === filaRealIndex);
    if (datosFila) {
      const celdas = fila.querySelectorAll('.celda-input');
      
      datosFila.celdas.forEach(datoCelda => {
        if (datoCelda.colIndex < celdas.length) {
          celdas[datoCelda.colIndex].textContent = datoCelda.valor;
        }
      });
      
      // Recalcular total para esta fila
      recalcularTotal(fila);
    }
    
    filaRealIndex++; // 🆕 Incrementar solo para filas de datos
  });
  // 🆕 RESTAURAR OBSERVACIONES
  datosObservaciones.forEach(obs => {
    const input = document.querySelector(`.observacion-input[data-tipo="${CSS.escape(obs.tipo)}"]`);
    if (input) {
      input.value = obs.valor;
    }
  });
}


// =====================
// MARK: Validación: Solo números en celdas
// =====================
function validarSoloNumeros(celda) {
  const texto = celda.textContent;
  
  // Si está vacío, permitir (para poder borrar)
  if (texto.trim() === '') {
    return;
  }
  
  // Extraer solo dígitos
  const soloNumeros = texto.replace(/\D/g, '');
  
  // Si el contenido cambió, actualizar
  if (texto !== soloNumeros) {
    // Guardar posición del cursor
    const seleccion = window.getSelection();
    const rango = seleccion.getRangeAt(0);
    const posicion = rango.startOffset;
    
    // Actualizar contenido
    celda.textContent = soloNumeros;
    
    // Restaurar cursor (si es posible)
    try {
      const nuevoRango = document.createRange();
      nuevoRango.setStart(celda.childNodes[0] || celda, Math.min(posicion, soloNumeros.length));
      nuevoRango.collapse(true);
      seleccion.removeAllRanges();
      seleccion.addRange(nuevoRango);
    } catch (e) {
      // Si falla, colocar cursor al final
      celda.focus();
    }
  }
}

// =====================
// MARK: Resaltado de celda activa (fila + columna)
// =====================
let celdaActiva = null;

function resaltarCelda(celda) {
  quitarResaltado();
  celdaActiva = celda;
  const tabla = celda.closest("table");
  const fila = celda.closest("tr");
  const colIndex = Array.from(celda.parentNode.children).indexOf(celda);

  // 👇 Resaltar TODA la fila (no solo una clase)
  fila.classList.add("highlight-row");
  
  // 👇 Resaltar columna
  tabla.querySelectorAll(`tr td:nth-child(${colIndex + 1}), tr th:nth-child(${colIndex + 1})`).forEach(td => {
    td.classList.add("highlight-col");
  });
  
  // 👇 Resaltar la celda activa con efecto especial
  celda.classList.add("highlight-active-cell");
}

function quitarResaltado() {
  document.querySelectorAll(".highlight-row").forEach(el => el.classList.remove("highlight-row"));
  document.querySelectorAll(".highlight-col").forEach(el => el.classList.remove("highlight-col"));
  document.querySelectorAll(".highlight-active-cell").forEach(el => el.classList.remove("highlight-active-cell"));
}



  // ======================================================
  // MARK: CAMBIAR PESTAÑA (con autenticación para Admin)
  // ======================================================
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const linea = tab.dataset.linea;

      // 🆕 Si es pestaña Admin, verificar autenticación
      if (linea === "Admin") {
        ocultarFormulario();
        ocultarHistorial();
        ocultarBotonGuardar(); // 🆕 Ocultar botón Guardar
        verificarAccesoAdmin(linea);
        
        // Cambiar visualmente la pestaña activa
        document.querySelector("#lineTabs .active").classList.remove("active");
        tab.classList.add("active");
        
        return;
      }

      // 🆕 Si NO es Admin, mostrar formulario y botón guardar
      mostrarFormulario();
      mostrarBotonGuardar(); // 🆕 Mostrar botón Guardar

      // Cerrar sesión de admin al cambiar de pestaña
      if (adminAutenticado) {
        adminAutenticado = false;
      }

      // Guardar estado de la línea anterior
      saveState(currentLinea);

      // Cambiar visualmente la pestaña activa
      document.querySelector("#lineTabs .active").classList.remove("active");
      tab.classList.add("active");

      currentLinea = linea;

      // Cargar turno guardado
      const turnoGuardado = parseInt(localStorage.getItem(`turno_${linea}`)) || turnoPorLinea[linea] || 1;
      turnoPorLinea[linea] = turnoGuardado;
      turnoActual = turnoGuardado;
      horas = turnos[turnoGuardado];

      // Renderizar tabla
      renderTabla(linea);

      // Marcar botón del turno activo
      botonesTurno.forEach(b => {
        if (parseInt(b.dataset.turno) === turnoGuardado) b.classList.add("active");
        else b.classList.remove("active");
      });

      // Cargar celdas guardadas
      setTimeout(() => loadState(linea), 50);
    });
  });

  // ==============================
  // MARK: Función para ocultar botón Guardar Y observaciones
  // ==============================
  function ocultarBotonGuardar() {
    const contenedorObservaciones = document.getElementById("contenedorObservaciones");
    if (contenedorObservaciones) {
      contenedorObservaciones.style.display = "none";
    }
  }

  // ==============================
  // MARK: Función para mostrar botón Guardar Y observaciones
  // ==============================
  function mostrarBotonGuardar() {
    const contenedorObservaciones = document.getElementById("contenedorObservaciones");
    if (contenedorObservaciones) {
      contenedorObservaciones.style.display = "block";
    }
  }

  // ==============================
  // MARK: Función para ocultar el formulario
  // ==============================
  function ocultarFormulario() {
    const formSection = document.getElementById("formSection");
    if (formSection) {
      formSection.style.display = "none";
    }
  }

  // ==============================
  // MARK: Función para mostrar el formulario
  // ==============================
  function mostrarFormulario() {
    const formSection = document.getElementById("formSection");
    if (formSection) {
      formSection.style.display = "block";
    }
  }
  // ==============================
  // MARK: Función para ocultar historial
  // ==============================
  function ocultarHistorial() {
    const historialSection = document.getElementById("seccionHistorial");
    if (historialSection) {
      historialSection.style.display = "none";
    }
  }

// ==============================
// MARK: Función para ocultar el formulario
// ==============================
function ocultarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "none";
  }
}

// ==============================
// MARK: Función para mostrar el formulario
// ==============================
function mostrarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "block";
  }
}

// ==============================
// MARK: Función para ocultar historial
// ==============================
function ocultarHistorial() {
  const historialSection = document.getElementById("seccionHistorial");
  if (historialSection) {
    historialSection.style.display = "none";
  }
}



  // Render inicial
  renderTabla("Linea 1");

  // Cargar turno guardado para la línea inicial
  const turnoInicial = parseInt(localStorage.getItem("turno_Linea 1")) || turnoPorLinea["Linea 1"];
  horas = turnos[turnoInicial]; 
  turnoActual = turnoInicial;

  // Marcar botón activo en la interfaz
  botonesTurno.forEach(b => {
    if (parseInt(b.dataset.turno) === turnoInicial) b.classList.add("active");
    else b.classList.remove("active");
  });


  // Fecha - Botón "Hoy"
  btnHoy.addEventListener("click", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    document.getElementById("fecha").value = hoy;
  });

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


// ======================================================
// MARK: CONTADOR DE CARACTERES PARA OBSERVACIONES
// ======================================================
const inputObservaciones = document.getElementById("observaciones");
const contadorObservaciones = document.getElementById("contadorObservaciones");

if (inputObservaciones && contadorObservaciones) {
  inputObservaciones.addEventListener("input", () => {
    const longitud = inputObservaciones.value.length;
    contadorObservaciones.textContent = longitud;
    
    // Cambiar color si se acerca al límite
    if (longitud > 90) {
      contadorObservaciones.classList.add("text-danger");
    } else if (longitud > 70) {
      contadorObservaciones.classList.add("text-warning");
      contadorObservaciones.classList.remove("text-danger");
    } else {
      contadorObservaciones.classList.remove("text-warning", "text-danger");
    }
  });
}


  // Consultar producto AX
  btnConsultar.addEventListener("click", async () => {
    const codigo = document.getElementById("codigoAX").value.trim();
    if (!codigo) return alert("Ingrese un código AX");

    const res = await fetch(`/producto/${codigo}`);
    if (!res.ok) return alert("Código no encontrado");

    const prod = await res.json();
    document.getElementById("codigoInfo").textContent = prod.codigo;
    document.getElementById("nombreInfo").textContent = prod.nombre_producto;
    document.getElementById("envaseInfo").textContent = prod.tipo_envase;
    document.getElementById("destinoInfo").textContent = prod.destino;
    document.getElementById("lineasInfo").textContent = prod.posibles_lineas_produccion;
  });

  cargarInspectores();


// ======================================================
// MARK: AUTOCOMPLETADO DE CÓDIGO AX
// ======================================================

let autocompletadoActivo = false;
let sugerenciaSeleccionada = -1;

const inputCodigoAX = document.getElementById("codigoAX");
const autocompletadoContainer = document.createElement("div");
autocompletadoContainer.id = "autocompletado";
autocompletadoContainer.className = "autocompletado-container";
inputCodigoAX.parentElement.style.position = "relative";
inputCodigoAX.parentElement.appendChild(autocompletadoContainer);

// Evento: Escribir en el campo
inputCodigoAX.addEventListener("input", async (e) => {
  const termino = e.target.value.trim();
  
  // Si tiene menos de 2 caracteres, ocultar sugerencias
  if (termino.length < 1) {
    ocultarAutocompletado();
    return;
  }
  
  // Buscar sugerencias
  await buscarSugerencias(termino);
});

// Evento: Navegación con teclado
inputCodigoAX.addEventListener("keydown", (e) => {
  if (!autocompletadoActivo) return;
  
  const sugerencias = autocompletadoContainer.querySelectorAll(".sugerencia-item");
  
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
});

// Cerrar al hacer clic fuera
document.addEventListener("click", (e) => {
  if (!inputCodigoAX.contains(e.target) && !autocompletadoContainer.contains(e.target)) {
    ocultarAutocompletado();
  }
});

/**
 * Busca sugerencias en el backend
 */
async function buscarSugerencias(termino) {
  try {
    const res = await fetch(`/api/productos/buscar/?q=${encodeURIComponent(termino)}`);
    if (!res.ok) throw new Error("Error en búsqueda");
    
    const resultados = await res.json();
    mostrarSugerencias(resultados);
  } catch (error) {
    console.error("Error al buscar sugerencias:", error);
    ocultarAutocompletado();
  }
}

/**
 * Muestra las sugerencias en el DOM
 */
function mostrarSugerencias(resultados) {
  if (resultados.length === 0) {
    ocultarAutocompletado();
    return;
  }
  
  autocompletadoContainer.innerHTML = resultados.map((item, index) => `
    <div class="sugerencia-item" data-codigo="${item.codigo}" data-index="${index}">
      <span class="codigo-sugerencia">${item.codigo}</span>
    </div>
  `).join('');
  
  // Agregar eventos de clic a cada sugerencia
  autocompletadoContainer.querySelectorAll(".sugerencia-item").forEach(item => {
    item.addEventListener("click", () => seleccionarSugerencia(item.dataset.codigo));
  });
  
  autocompletadoActivo = true;
  sugerenciaSeleccionada = -1;
  autocompletadoContainer.style.display = "block";
}

/**
 * Oculta el panel de sugerencias
 */
function ocultarAutocompletado() {
  autocompletadoContainer.style.display = "none";
  autocompletadoActivo = false;
  sugerenciaSeleccionada = -1;
}

/**
 * Actualiza la selección visual con teclado
 */
function actualizarSeleccion(sugerencias) {
  sugerencias.forEach((item, index) => {
    if (index === sugerenciaSeleccionada) {
      item.classList.add("seleccionado");
    } else {
      item.classList.remove("seleccionado");
    }
  });
}

/**
 * Selecciona una sugerencia y ejecuta la consulta
 */
async function seleccionarSugerencia(codigo) {
  // Autocompletar el campo
  inputCodigoAX.value = codigo;
  ocultarAutocompletado();
  
  // Ejecutar consulta automáticamente
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


/**
 * Calcula la suma de todos los defectos por tipo.
 * Recorre las celdas de la tabla actual y agrupa las cantidades por tipo.
 */
function calcularSumaPorTipo() {
  const sumas = {}; // { "LLENADO": 5, "CAPSULADO": 10, ... }
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo;
    const valor = parseInt(cell.textContent.trim()) || 0;
    if (!sumas[tipo]) sumas[tipo] = 0;
    sumas[tipo] += valor;
  });
  console.log("🧮 Sumatorias por tipo:", sumas);
  return sumas;
}



// ======================================================
// MARK: FUNCIONES DE GUARDADO (Manual y Automático)
// ======================================================

/**
 * Recorre la tabla y arma un JSON con todas las descripciones y cantidades.
 * Se envía a /auto_guardado/
 */

function recopilarDatosParaGuardar() {
  const linea = currentLinea;
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "";
  const lote = document.getElementById("lote").value || "---"; 
  const inspector = document.getElementById("inspector").value || "---"; 
  const nombre = document.getElementById("nombreInfo").textContent || "";
  const envase = document.getElementById("envaseInfo").textContent || "";
  const destino = document.getElementById("destinoInfo").textContent || "";

  const datos = [];

  // Seleccionar todos los encabezados de tipo
  const tipos = document.querySelectorAll(".tipo-defecto");

  tipos.forEach(tipoRow => {
    const tipo = tipoRow.textContent.trim();
    let sumaTipo = 0;

    // Recorre las filas siguientes hasta encontrar otro encabezado de tipo o el final
    let fila = tipoRow.nextElementSibling;
    while (fila && !fila.classList.contains("tipo-defecto")) {
      // Buscar la celda de total día en esta fila
      const totalCell = fila.querySelector(".total-dia");
      if (totalCell) {
        const val = parseInt(totalCell.textContent.trim());
        if (!isNaN(val)) sumaTipo += val;
      }
      fila = fila.nextElementSibling;
    }

    datos.push({
      codigo,
      nombre,
      envase,
      destino,
      linea_produccion: linea,
      tipo_defecto: tipo,
      suma_tipo_defecto: sumaTipo
    });
  });

  console.log("📦 Datos recopilados para guardar:", datos);
  return datos;
}

/**
 * Envía los datos al backend mediante POST.
 */
async function enviarDatos(url, registros) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registros)
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    console.log(`✅ ${data.message}`);
  } catch (err) {
    console.error(`❌ Error al enviar datos a ${url}:`, err);
  }
}



// ======================================================
// MARK: BOTÓN GUARDAR CON CONFIRMACIÓN
// ======================================================

// Al hacer clic en "Guardar", mostrar modal de confirmación
btnGuardar.addEventListener("click", () => {
  // Validar campos antes de mostrar el modal
  const camposValidos = validarCamposObligatorios();
  
  if (!camposValidos) {
    return; // No mostrar modal si hay campos faltantes
  }

  // Verificar si hay datos para guardar
  const sumasPorTipo = calcularSumaPorTipo();
  const datosDescripciones = recopilarDatosDescripciones();
  
  if (Object.keys(sumasPorTipo).every(tipo => sumasPorTipo[tipo] === 0) && datosDescripciones.length === 0) {
    alert("⚠️ No hay datos para guardar (todos los valores son 0).");
    return;
  }

  // Mostrar modal de confirmación
  const modal = new bootstrap.Modal(document.getElementById('modalConfirmarGuardado'));
  modal.show();
});

// Al confirmar en el modal, ejecutar el guardado
document.getElementById("btnConfirmarGuardado").addEventListener("click", async () => {
  // Cerrar modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarGuardado'));
  modal.hide();

  // Ejecutar guardado
  await ejecutarGuardado();
});

/**
 * Valida los campos obligatorios y retorna true si todo está bien
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
 *  Ejecuta el proceso de guardado completo
 */
async function ejecutarGuardado() {
  try {
    const sumasPorTipo = calcularSumaPorTipo();
    console.log("🧮 Sumatorias calculadas:", sumasPorTipo);

    const linea = currentLinea;
    const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "---";
    const lote = document.getElementById("lote").value || "---"; 
    const inspector = document.getElementById("inspector").value || "---"; 
    const nombre = document.getElementById("nombreInfo").textContent || "---";
    const envase = document.getElementById("envaseInfo").textContent || "---";
    const destino = document.getElementById("destinoInfo").textContent || "---";

    const datosParaGuardar = [];

    // 🆕 OBTENER OBSERVACIONES POR TIPO
    const observacionesPorTipo = {};
    document.querySelectorAll(".observacion-input").forEach(input => {
      const tipo = input.dataset.tipo;
      const obs = input.value.trim() || "---";
      observacionesPorTipo[tipo] = obs;
    });

    // SOLO guardar tipos con suma > 0
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
          observaciones: observacionesPorTipo[tipo] || "---"  // 🆕 Observación específica
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

    // Limpiar tabla
    document.querySelectorAll(".celda-input").forEach(c => (c.textContent = ""));
    document.querySelectorAll(".total-dia").forEach(c => (c.textContent = "0"));
    
    // Limpiar formulario
    //document.getElementById("fecha").value = "";
    //document.getElementById("inspector").value = "";
    //document.getElementById("codigoAX").value = "";
    //document.getElementById("lote").value = "";

    // Limpiar información del producto
    document.getElementById("codigoInfo").textContent = "---";
    document.getElementById("nombreInfo").textContent = "---";
    document.getElementById("envaseInfo").textContent = "---";
    document.getElementById("destinoInfo").textContent = "---";
    document.getElementById("lineasInfo").textContent = "---";

    // LIMPIAR OBSERVACIONES POR TIPO
    document.querySelectorAll(".observacion-input").forEach(input => {
      input.value = "";
    });
    
    paginaActualHistorial = 1;
    cargarHistorial(currentLinea);

  } catch (err) {
    console.error("❌ Error al guardar:", err);
    alert("❌ Error al guardar los datos.");
  }
}
// ======================================================
// 🔹 FUNCIÓN PARA RECOPILAR DATOS POR HORA Y DESCRIPCIÓN
// ======================================================
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

  // Recorre todas las filas del cuerpo de la tabla
  document.querySelectorAll("tbody tr").forEach(fila => {
    // Saltar las filas de tipo (encabezados)
    if (fila.querySelector('.tipo-defecto')) return;

    const descripcion = fila.querySelector('td:first-child').textContent.trim();

    // Buscar el tipo de defecto (fila anterior tipo-defecto)
    let filaAnterior = fila.previousElementSibling;
    while (filaAnterior && !filaAnterior.querySelector('.tipo-defecto')) {
      filaAnterior = filaAnterior.previousElementSibling;
    }
    if (!filaAnterior) return;

    const tipo = filaAnterior.querySelector('.tipo-defecto').textContent.trim();

    // Recorre cada celda editable (una por hora)
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


// ======================================================
// MARK: AUTENTICACIÓN Y GESTIÓN DE INSPECTORES (ADMIN)
// ======================================================

let adminAutenticado = false;
let intentosLogin = 3;
let bloqueadoHasta = null;

// Variables para manejar el modal
let modalLoginAdmin = null;
let destinoPendiente = null; // Guardar la línea a la que se quiere ir

/**
 * Verifica si el usuario está autenticado para acceder a Admin
 */
function verificarAccesoAdmin(linea) {
  if (adminAutenticado) {
    // Ya está autenticado, mostrar panel directamente
    mostrarPanelAdmin();
    return;
  }

  // Guardar destino y mostrar modal de login
  destinoPendiente = linea;
  mostrarModalLogin();
}

/**
 * Muestra el modal de login
 */
function mostrarModalLogin() {
  // Limpiar campos
  document.getElementById("passwordAdmin").value = "";
  document.getElementById("errorLoginAdmin").classList.add("d-none");
  document.getElementById("bloqueoLoginAdmin").classList.add("d-none");
  
  // Actualizar intentos
  actualizarIntentosRestantes();

  // Verificar si está bloqueado
  if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
    mostrarBloqueo();
  }

  // Mostrar modal
  modalLoginAdmin = new bootstrap.Modal(document.getElementById('modalLoginAdmin'));
  modalLoginAdmin.show();

  // Focus en el input de contraseña
  setTimeout(() => {
    document.getElementById("passwordAdmin").focus();
  }, 500);
}

/**
 * Intenta autenticar al usuario
 */
async function intentarLogin() {
  // Verificar bloqueo
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
      // Login exitoso
      adminAutenticado = true;
      intentosLogin = 3;
      bloqueadoHasta = null;
      
      modalLoginAdmin.hide();
      
      // Mostrar panel admin
      mostrarPanelAdmin();
    } else {
      // Login fallido
      intentosLogin--;
      actualizarIntentosRestantes();

      if (intentosLogin <= 0) {
        // Bloquear por 30 segundos
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
 * Muestra mensaje de error en el modal
 */
function mostrarErrorLogin(mensaje) {
  document.getElementById("mensajeErrorLogin").textContent = mensaje;
  document.getElementById("errorLoginAdmin").classList.remove("d-none");
}

/**
 * Muestra el bloqueo temporal
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
 * Actualiza el contador de intentos restantes
 */
function actualizarIntentosRestantes() {
  document.getElementById("intentosRestantes").textContent = intentosLogin;
}

/**
 * Cancela el login y vuelve a la pestaña anterior
 */
function cancelarLogin() {
  modalLoginAdmin.hide();
  adminAutenticado = false;
  
  // Volver a la pestaña anterior (Línea 1 por defecto)
  const tabLineaActual = document.querySelector(`[data-linea="${currentLinea}"]`);
  if (tabLineaActual) {
    tabLineaActual.click();
  }
}

/**
 * Cierra la sesión de admin
 */
function cerrarSesionAdmin() {
  if (confirm("¿Está seguro de cerrar la sesión de administrador?")) {
    adminAutenticado = false;
    intentosLogin = 3;
    
    // Volver a Línea 1
    const tabLinea1 = document.querySelector('[data-linea="Linea 1"]');
    if (tabLinea1) {
      tabLinea1.click();
    }
  }
}

// Event listeners para el modal de login
document.getElementById("btnIngresarAdmin").addEventListener("click", intentarLogin);
document.getElementById("btnCancelarLoginAdmin").addEventListener("click", cancelarLogin);

// Permitir login con Enter
document.getElementById("passwordAdmin").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    intentarLogin();
  }
});

// ======================================================
// PANEL DE ADMINISTRACIÓN
// ======================================================

async function mostrarPanelAdmin() {
  tablaContainer.innerHTML = `
    <div class="admin-panel">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">🔧 Administración de Inspectores</h4>
        <button class="btn btn-danger btn-sm" id="btnCerrarSesionAdmin">
          🔒 Cerrar Sesión
        </button>
      </div>
      
      <!-- Formulario para agregar inspector -->
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

      <!-- Tabla de inspectores -->
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

  // Cargar inspectores
  await cargarInspectoresAdmin();

  // Event listeners
  document.getElementById("btnCerrarSesionAdmin").addEventListener("click", cerrarSesionAdmin);
  document.getElementById("btnAgregarInspector").addEventListener("click", agregarInspector);
  
  document.getElementById("nuevoInspector").addEventListener("keypress", (e) => {
    if (e.key === "Enter") agregarInspector();
  });
}

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

// Hacer función global
window.eliminarInspector = eliminarInspector;
// ======================================================
// MARK: HISTORIAL DE REGISTROS
// ======================================================



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

  inicializarAutocompletadoFiltro();
  
  // Configurar botones de alternancia
  const btnDetallado = document.getElementById("btnHistorialDetallado");
  const btnResumen = document.getElementById("btnHistorialResumen");
  const btnRefrescar = document.getElementById("btnRefrescarHistorial");
  const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
  
  // Remover listeners anteriores
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
 * Carga los tipos de defectos para el filtro
 */
async function cargarTiposDefectosParaFiltro(linea) {
  try {
    const lineaParam = linea === "Admin" ? "" : `?linea=${encodeURIComponent(linea)}`;
    const res = await fetch(`/api/tipos-defectos/${lineaParam}`);
    
    if (!res.ok) throw new Error("Error al cargar tipos de defectos");
    
    const tipos = await res.json();
    const select = document.getElementById("filtroTipoDefecto");
    
    // Limpiar opciones existentes (excepto "Todos")
    select.innerHTML = '<option value="todos">Todos</option>';
    
    // Agregar tipos únicos
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
 * Carga el historial de registros desde el backend
 */
async function cargarHistorial(linea, pagina = 1) {
  try {
    const tbody = document.getElementById("historialTableBody");
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Cargando...</td></tr>';
    
    // Determinar qué endpoint usar
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
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error al cargar historial</td></tr>';
  }
}

/**
 * Muestra el historial en la tabla
 */
function mostrarHistorial(data) {
  const tbody = document.getElementById("historialTableBody");
  
  if (data.registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No hay registros</td></tr>';
    document.getElementById("paginacionHistorial").innerHTML = '';
    return;
  }
  
  const coloresTipoDefecto = {
    "LLENADO": "#ffe6e6",
    "CAPSULADO": "#e6ffe6",
    "LÁMPARA": "#e6e6ff",
    "LAMPARA": "#e6e6ff",
    "ETIQUETADO": "#fff3e6",
    "VIDEO JET": "#ffe6ff",
    "EMBALAJE": "#e6ffff",
    "DEFECTOS GENERALES": "#f0f0f0"
  };
  
  if (tipoHistorialActual === "detallado") {
    // Vista detallada (tipos_defectos_descripcion)
    tbody.innerHTML = data.registros.map(reg => {
      const color = coloresTipoDefecto[reg.tipo_defecto] || "#ffffff";
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
    // Vista resumen (tipos_defectos)
    tbody.innerHTML = data.registros.map(reg => {
      const color = coloresTipoDefecto[reg.tipo_defecto] || "#ffffff";
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
 * Muestra los controles de paginación
 */
function mostrarPaginacion(data, linea) {
  const container = document.getElementById("paginacionHistorial");
  
  if (data.total_paginas <= 1) {
    container.innerHTML = '';
    return;
  }

  // 🆕 LIMITAR A MÁXIMO 10 PÁGINAS
  const totalPaginasMostrar = Math.min(data.total_paginas, 10);
  
  let html = '<div class="d-flex justify-content-between align-items-center mt-3">';
  html += `<span class="text-muted">Mostrando ${data.registros.length} de ${data.total} registros</span>`;
  html += '<div class="btn-group">';
  
  // Botón anterior
  if (data.pagina_actual > 1) {
    html += `<button class="btn btn-sm btn-outline-primary" onclick="cambiarPagina(${data.pagina_actual - 1})">← Anterior</button>`;
  }
  
  // Números de página
  for (let i = 1; i <= totalPaginasMostrar; i++) {
    if (i === data.pagina_actual) {
      html += `<button class="btn btn-sm btn-primary" disabled>${i}</button>`;
    } else if (Math.abs(i - data.pagina_actual) <= 2 || i === 1 || i === data.total_paginas) {
      html += `<button class="btn btn-sm btn-outline-primary" onclick="cambiarPagina(${i})">${i}</button>`;
    } else if (Math.abs(i - data.pagina_actual) === 3) {
      html += `<button class="btn btn-sm btn-outline-secondary" disabled>...</button>`;
    }
  }

  if (data.total_paginas > 10) {
    html += `<button class="btn btn-sm btn-outline-secondary" disabled>... (+${data.total_paginas - 10})</button>`;
  }
  
  // Botón siguiente
  if (data.pagina_actual < totalPaginasMostrar) {
    html += `<button class="btn btn-sm btn-outline-primary" onclick="cambiarPagina(${data.pagina_actual + 1})">Siguiente →</button>`;
  }
  
  html += '</div></div>';
  container.innerHTML = html;
}

/**
 * Cambia de página en el historial
 */
function cambiarPagina(pagina) {
  paginaActualHistorial = pagina;
  cargarHistorial(currentLinea, pagina);
}


// ======================================================
// MARK: AUTOCOMPLETADO DE CÓDIGO AX EN FILTROS DEL HISTORIAL
// ======================================================

let autocompletadoFiltroActivo = false;
let sugerenciaFiltroSeleccionada = -1;

/**
 * Inicializa el autocompletado para el filtro de código AX
 */
function inicializarAutocompletadoFiltro() {
  const inputFiltroCodigo = document.getElementById("filtroCodigoAX");
  
  if (!inputFiltroCodigo) {
    console.warn("Input filtroCodigoAX no encontrado");
    return;
  }
  
  // Crear contenedor de autocompletado si no existe
  if (!autocompletadoFiltroContainer) {
    autocompletadoFiltroContainer = document.createElement("div");
    autocompletadoFiltroContainer.id = "autocompletadoFiltro";
    autocompletadoFiltroContainer.className = "autocompletado-container";
    inputFiltroCodigo.parentElement.style.position = "relative";
    inputFiltroCodigo.parentElement.appendChild(autocompletadoFiltroContainer);
  }
  
  // Limpiar listeners anteriores clonando el elemento
  const nuevoInput = inputFiltroCodigo.cloneNode(true);
  inputFiltroCodigo.parentNode.replaceChild(nuevoInput, inputFiltroCodigo);
  
  // Evento: Escribir en el campo
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
  });
  
  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!nuevoInput.contains(e.target) && !autocompletadoFiltroContainer.contains(e.target)) {
      ocultarAutocompletadoFiltro();
    }
  });
}

/**
 * Busca sugerencias de códigos en los registros de defectos
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
 * Muestra las sugerencias en el DOM
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
  
  // Agregar eventos de clic a cada sugerencia
  autocompletadoFiltroContainer.querySelectorAll(".sugerencia-item").forEach(item => {
    item.addEventListener("click", () => seleccionarSugerenciaFiltro(item.dataset.codigo));
  });
  
  autocompletadoFiltroActivo = true;
  sugerenciaFiltroSeleccionada = -1;
  autocompletadoFiltroContainer.style.display = "block";
}

/**
 * Oculta el panel de sugerencias
 */
function ocultarAutocompletadoFiltro() {
  if (autocompletadoFiltroContainer) {
    autocompletadoFiltroContainer.style.display = "none";
  }
  autocompletadoFiltroActivo = false;
  sugerenciaFiltroSeleccionada = -1;
}

/**
 * Actualiza la selección visual con teclado
 */
function actualizarSeleccionFiltro(sugerencias) {
  sugerencias.forEach((item, index) => {
    if (index === sugerenciaFiltroSeleccionada) {
      item.classList.add("seleccionado");
      // Scroll automático para mantener la selección visible
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("seleccionado");
    }
  });
}

/**
 * Selecciona una sugerencia (solo llena el campo, NO aplica el filtro automáticamente)
 */
function seleccionarSugerenciaFiltro(codigo) {
  const inputFiltroCodigo = document.getElementById("filtroCodigoAX");
  
  if (inputFiltroCodigo) {
    inputFiltroCodigo.value = codigo;
    
    // Feedback visual
    inputFiltroCodigo.classList.add("consulta-exitosa");
    setTimeout(() => inputFiltroCodigo.classList.remove("consulta-exitosa"), 1000);
  }
  
  ocultarAutocompletadoFiltro();
}

// Hacer función global para onclick
window.cambiarPagina = cambiarPagina;

});