document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("#lineTabs .nav-link");
  const inspectorSelect = document.getElementById("inspector");
  const btnHoy = document.getElementById("btnHoy");
  const btnConsultar = document.getElementById("btnConsultar");
  const tablaContainer = document.getElementById("tablaDefectos");

  // --- HORAS PREDEFINIDAS ---
  const horas = ["6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "Total día"];

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

  // --- Renderizar tabla de defectos ---
  function renderTabla(linea) {
    tablaContainer.innerHTML = "";
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
        recalcularTotal(e.target.closest("tr"));
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
// 🔹 Persistencia por pestaña
// =====================
let currentLinea = "Linea 1"; // línea activa actual

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
    lote: document.getElementById("lote").value || ""
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
// 🔹 Suma automática por fila
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
// 🔹 Resaltado de celda activa
// =====================
let celdaActiva = null;

function resaltarCelda(celda) {
  quitarResaltado();
  celdaActiva = celda;
  const tabla = celda.closest("table");
  const fila = celda.closest("tr");
  const colIndex = Array.from(celda.parentNode.children).indexOf(celda);

  // resaltar fila
  fila.classList.add("highlight-row");
  // resaltar columna
  tabla.querySelectorAll(`tr td:nth-child(${colIndex + 1})`).forEach(td => {
    td.classList.add("highlight-col");
  });
}

function quitarResaltado() {
  document.querySelectorAll(".highlight-row").forEach(el => el.classList.remove("highlight-row"));
  document.querySelectorAll(".highlight-col").forEach(el => el.classList.remove("highlight-col"));
}



  // 🔹 Cambiar pestaña
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // guardar estado de la linea anterior
    saveState(currentLinea);

    document.querySelector("#lineTabs .active").classList.remove("active");
    tab.classList.add("active");
    const linea = tab.dataset.linea;
    currentLinea = linea;
    renderTabla(linea);

    // pequeña espera para que DOM de la tabla esté listo
    setTimeout(() => {
      loadState(linea);
    }, 50);
  });
});


  // Render inicial
  renderTabla("Linea 1");

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
// 🔹 BOTÓN GUARDAR ACTUALIZADO (ambas tablas)
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

    alert("✅ Datos guardados correctamente en ambas tablas. Solo se guardaron valores > 0.");

    // === 🧹 LIMPIAR TABLA ===
    document.querySelectorAll(".celda-input").forEach(c => (c.textContent = ""));
    document.querySelectorAll(".total-dia").forEach(c => (c.textContent = "0"));
    
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
// 🔹 FUNCIÓN PARA RECOPILAR DATOS DETALLADOS (tipos_defectos_descripcion)
// ======================================================
function recopilarDatosDescripciones() {
  const linea = currentLinea;
  const codigo = document.getElementById("codigoInfo").textContent || document.getElementById("codigoAX").value || "";
  const nombre = document.getElementById("nombreInfo").textContent || "";
  const envase = document.getElementById("envaseInfo").textContent || "";
  const destino = document.getElementById("destinoInfo").textContent || "";

  const datosDescripciones = [];

  // Recorrer todas las filas de descripción
  document.querySelectorAll("tbody tr").forEach(fila => {
    // Saltar las filas de tipo (encabezados)
    if (fila.querySelector('.tipo-defecto')) return;

    const descripcion = fila.querySelector('td:first-child').textContent.trim();
    const totalCell = fila.querySelector('.total-dia');
    const total = parseInt(totalCell.textContent.trim()) || 0;

    // Solo guardar si el total es mayor a 0
    if (total > 0) {
      // Encontrar el tipo de defecto correspondiente (fila anterior que sea tipo-defecto)
      let filaAnterior = fila.previousElementSibling;
      while (filaAnterior && !filaAnterior.querySelector('.tipo-defecto')) {
        filaAnterior = filaAnterior.previousElementSibling;
      }
      
      if (filaAnterior) {
        const tipo = filaAnterior.querySelector('.tipo-defecto').textContent.trim();
        
        datosDescripciones.push({
          codigo,
          nombre,
          envase,
          destino,
          linea_produccion: linea,
          tipo_defecto: tipo,
          descripcion_defecto: descripcion,
          cantidad_defectos: total
        });
      }
    }
  });

  console.log("📋 Datos de descripciones para guardar:", datosDescripciones);
  return datosDescripciones;
}
});
