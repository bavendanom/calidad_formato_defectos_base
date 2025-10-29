document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("#lineTabs .nav-link");
  const inspectorSelect = document.getElementById("inspector");
  const btnHoy = document.getElementById("btnHoy");
  const btnConsultar = document.getElementById("btnConsultar");
  const tablaContainer = document.getElementById("tablaDefectos");

  // --- HORAS PREDEFINIDAS (por defecto turno 1) ---
  let horas = ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "Total día"];

  // --- TURNOS DISPONIBLES ---
  const turnos = {
    1: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "Total día"],
    2: ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "Total día"],
    3: ["23:00", "0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "Total día"],
    4: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "Total día"],
    5: ["19:00", "20:00", "21:00", "22:00", "23:00", "0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "Total día"]
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

  // ==============================
  // 🔹 CAMBIO DE TURNO
  // ==============================

  const botonesTurno = document.querySelectorAll(".btn-turno");
  let turnoActual = 1;

  botonesTurno.forEach(btn => {
    btn.addEventListener("click", () => {
      turnoActual = parseInt(btn.dataset.turno);

      // Guardar turno seleccionado para la línea actual
      turnoPorLinea[currentLinea] = turnoActual;

      // Actualizar las horas globales y la tabla
      horas = turnos[turnoActual];

      // Actualizar visualmente el botón activo
      botonesTurno.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Volver a renderizar la tabla con las nuevas horas
      renderTabla(currentLinea);

      // Guardar también en localStorage (para persistencia entre sesiones)
      localStorage.setItem(`turno_${currentLinea}`, turnoActual);

      console.log(`🕒 Turno ${turnoActual} seleccionado para ${currentLinea}:`, horas);
    });
  });



  // --- Renderizar tabla de defectos ---
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
    });

    // --- Eventos de interacción en celdas ---
    tabla.addEventListener("input", e => {
      if (e.target.classList.contains("celda-input")) {
        validarSoloNumeros(e.target);
        recalcularTotal(e.target.closest("tr"));
      }
    });

    // 🆕 NUEVO: Prevenir entrada de caracteres no numéricos
    tabla.addEventListener("keydown", e => {
      if (e.target.classList.contains("celda-input")) {
        const tecla = e.key;
        
        // Permitir: números, backspace, delete, tab, enter, flechas
        const teclasPermitidas = [
          'Backspace', 'Delete', 'Tab', 'Enter', 
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
        ];
        
        // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        
        // Si la tecla no está permitida, prevenir
        if (!teclasPermitidas.includes(tecla)) {
          e.preventDefault();
          // Feedback visual opcional
          e.target.classList.add('celda-invalida');
          setTimeout(() => e.target.classList.remove('celda-invalida'), 200);
        }
      }
    });

    // 🆕 NUEVO: Prevenir pegado de texto no numérico
    tabla.addEventListener("paste", e => {
      if (e.target.classList.contains("celda-input")) {
        e.preventDefault();
        
        // Obtener texto pegado
        const texto = (e.clipboardData || window.clipboardData).getData('text');
        
        // Extraer solo números
        const soloNumeros = texto.replace(/\D/g, '');
        
        // Insertar solo números
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
  // guardar tabla
  state.celdas = [];
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo || "";
    const desc = cell.dataset.desc || "";
    const hora = cell.dataset.hora || "";
    const valor = cell.textContent.trim() || "";
    state.celdas.push({ tipo, desc, hora, valor });
  });
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
    // tabla
    if (Array.isArray(state.celdas)) {
      document.querySelectorAll(".celda-input").forEach(c => c.textContent = "");
      state.celdas.forEach(it => {
        const selector = `.celda-input[data-tipo="${CSS.escape(it.tipo)}"][data-desc="${CSS.escape(it.desc)}"][data-hora="${CSS.escape(it.hora)}"]`;
        const cell = document.querySelector(selector);
        if (cell) cell.textContent = it.valor;
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


// =====================
// 🔹 Validación: Solo números en celdas
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
// MARK: CAMBIAR PESTAÑA (con lógica para ocultar formulario en Admin)
// ======================================================
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const linea = tab.dataset.linea;

    // 🆕 Si es pestaña Admin, ocultar formulario y mostrar panel admin
    if (linea === "Admin") {
      ocultarFormulario();
      mostrarPanelAdmin();
      
      // Cambiar visualmente la pestaña activa
      document.querySelector("#lineTabs .active").classList.remove("active");
      tab.classList.add("active");
      
      return; // No ejecutar el resto del código de líneas normales
    }

    // 🆕 Si NO es Admin, mostrar formulario normal
    mostrarFormulario();

    // Guardar estado de la línea anterior
    saveState(currentLinea);

    // Cambiar visualmente la pestaña activa
    document.querySelector("#lineTabs .active").classList.remove("active");
    tab.classList.add("active");

    currentLinea = linea;

    // Cargar turno guardado (desde memoria o localStorage)
    const turnoGuardado = parseInt(localStorage.getItem(`turno_${linea}`)) || turnoPorLinea[linea] || 1;
    turnoPorLinea[linea] = turnoGuardado;
    turnoActual = turnoGuardado;
    horas = turnos[turnoGuardado];

    // Renderizar tabla con el horario correcto
    renderTabla(linea);

    // Marcar el botón del turno activo
    botonesTurno.forEach(b => {
      if (parseInt(b.dataset.turno) === turnoGuardado) b.classList.add("active");
      else b.classList.remove("active");
    });

    // Cargar celdas guardadas
    setTimeout(() => loadState(linea), 50);
  });
});

// Función para ocultar el formulario
function ocultarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "none";
  }
}

// Función para mostrar el formulario
function mostrarFormulario() {
  const formSection = document.getElementById("formSection");
  if (formSection) {
    formSection.style.display = "block";
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
// 🔹 FUNCIONES DE GUARDADO (Manual y Automático)
// ======================================================

/**
 * Recorre la tabla y arma un JSON con todas las descripciones y cantidades.
 * Se envía a /auto_guardado/
 */

function recopilarDatosParaGuardar() {
  const linea = currentLinea;
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "";
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

  console.log("📦 Datos recopilados para guardar:", datos); // <-- para depuración
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
// MARK: BOTÓN GUARDAR ACTUALIZADO (ambas tablas)
// ======================================================
btnGuardar.addEventListener("click", async () => {
  // === 🧩 VALIDACIÓN DE CAMPOS OBLIGATORIOS ===
  const campos = [
    { id: "fecha", nombre: "Fecha" },
    { id: "inspector", nombre: "Inspector" },
    { id: "codigoAX", nombre: "Código AX" },
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
    return;
  }

  // === 🔢 CALCULAR SUMAS POR TIPO ===
  const sumasPorTipo = calcularSumaPorTipo();
  console.log("🧮 Sumatorias calculadas:", sumasPorTipo);

  // === 📦 RECOLECTAR DATOS PARA TIPOS_DEFECTOS (SOLO > 0) ===
  const linea = currentLinea;
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "---";
  const nombre = document.getElementById("nombreInfo").textContent || "---";
  const envase = document.getElementById("envaseInfo").textContent || "---";
  const destino = document.getElementById("destinoInfo").textContent || "---";

  const datosParaGuardar = [];

  // SOLO guardar tipos con suma > 0
  for (const [tipo, suma] of Object.entries(sumasPorTipo)) {
    if (suma > 0) {
      datosParaGuardar.push({
        codigo,
        nombre,
        envase,
        destino,
        linea_produccion: linea,
        tipo_defecto: tipo,
        suma_tipo_defecto: suma
      });
    }
  }

  // === 📋 RECOLECTAR DATOS PARA TIPOS_DEFECTOS_DESCRIPCION (SOLO > 0) ===
  const datosDescripciones = recopilarDatosDescripciones();

  // === 🚨 VERIFICAR SI HAY DATOS ===
  if (datosParaGuardar.length === 0 && datosDescripciones.length === 0) {
    alert("⚠️ No hay datos para guardar (todos los valores son 0).");
    return;
  }

  console.log("📦 Datos para tipos_defectos:", datosParaGuardar);
  console.log("📋 Datos para tipos_defectos_descripcion:", datosDescripciones);

  // === 🚀 ENVIAR DATOS A AMBAS TABLAS ===
  try {
    // Guardar en tipos_defectos
    if (datosParaGuardar.length > 0) {
      const resTipos = await fetch("/guardar_defectos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosParaGuardar)
      });

      if (!resTipos.ok) throw new Error(`Error ${resTipos.status} en tipos_defectos`);
      const dataTipos = await resTipos.json();
      console.log("✅ Tipos defectos guardados:", dataTipos);
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
      console.log("✅ Descripciones guardadas:", dataDesc);
    }

    alert("✅ Datos guardados correctamente en ambas tablas.");

    // === 🧹 LIMPIAR TABLA ===
    document.querySelectorAll(".celda-input").forEach(c => (c.textContent = ""));
    document.querySelectorAll(".total-dia").forEach(c => (c.textContent = "0"));
    // === Limpiar formulario principal ===
    document.getElementById("fecha").value = "";
    document.getElementById("inspector").value = "";
    document.getElementById("codigoAX").value = "";
    document.getElementById("lote").value = "";

    // === Limpiar información del producto ===
    document.getElementById("codigoInfo").textContent = "---";
    document.getElementById("nombreInfo").textContent = "---";
    document.getElementById("envaseInfo").textContent = "---";
    document.getElementById("destinoInfo").textContent = "---";
    document.getElementById("lineasInfo").textContent = "---";
    
  } catch (err) {
    console.error("❌ Error al guardar:", err);
    alert("❌ Error al guardar los datos.");
  }
});

// ======================================================
// 🔹 FUNCIÓN CALCULAR SUMAS POR TIPO
// ======================================================
function calcularSumaPorTipo() {
  const sumas = {};
  
  document.querySelectorAll(".celda-input").forEach(cell => {
    const tipo = cell.dataset.tipo;
    const valor = parseInt(cell.textContent.trim()) || 0;
    
    if (!sumas[tipo]) sumas[tipo] = 0;
    sumas[tipo] += valor;
  });
  
  console.log("🔢 Sumas calculadas por tipo:", sumas);
  return sumas;
}   

// ======================================================
// 🔹 FUNCIÓN PARA RECOPILAR DATOS POR HORA Y DESCRIPCIÓN
// ======================================================
function recopilarDatosDescripciones() {
  const linea = currentLinea;
  const fecha = document.getElementById("fecha").value || new Date().toISOString().slice(0, 10);
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "";
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
          fecha,                 // 🔹 Nueva columna
          hora,                  // 🔹 Nueva columna
          codigo,
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
// MARK: GESTIÓN DE INSPECTORES (ADMIN)
// ======================================================

// Detectar cuando se activa la pestaña Admin
tabs.forEach(tab => {
  if (tab.dataset.linea === "Admin") {
    tab.addEventListener("click", () => {
      mostrarPanelAdmin();
    });
  }
});

async function mostrarPanelAdmin() {
  tablaContainer.innerHTML = `
    <div class="admin-panel">
      <h4 class="mb-4">🔧 Administración de Inspectores</h4>
      
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

  // Event listener para agregar inspector
  document.getElementById("btnAgregarInspector").addEventListener("click", agregarInspector);
  
  // Permitir agregar con Enter
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
    input.value = ""; // Limpiar input
    await cargarInspectoresAdmin(); // Recargar tabla
  } catch (error) {
    alert(`❌ ${error.message}`);
  }
}

async function eliminarInspector(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar al inspector "${nombre}"?`)) {
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
    await cargarInspectoresAdmin(); // Recargar tabla
  } catch (error) {
    alert(`❌ ${error.message}`);
  }
}

// Hacer la función global para que onclick funcione
window.eliminarInspector = eliminarInspector;

});
