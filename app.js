fetch("ventas_raw.csv")
  .then(res => res.text())
  .then(text => iniciar(text));

function iniciar(csv) {
  const filas = csv.trim().split("\n");
  const cabecera = filas.shift().split(",");

  const raw = filas.map(f => {
    const v = f.split(",");
    let obj = {};
    cabecera.forEach((c, i) => obj[c.trim()] = v[i]?.trim());
    return obj;
  });

  const clean = limpiarDatos(raw);

  mostrarTablas(raw, clean);
  calcularKPIs(clean);
  graficos(clean);
  ranking(clean);
}

// ---------------- LIMPIEZA ----------------
function limpiarDatos(data) {
  let vistos = new Set();

  return data.filter(d => {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha)) return false;

    d.franja = d.franja.toLowerCase().includes("desa") ? "Desayuno" : "Comida";

    const fam = d.familia.toLowerCase();
    if (fam.includes("beb")) d.familia = "Bebida";
    else if (fam.includes("entra")) d.familia = "Entrante";
    else if (fam.includes("post")) d.familia = "Postre";
    else d.familia = "Principal";

    if (!d.producto) return false;
    d.producto = d.producto.toLowerCase().trim();

    d.unidades = Number(d.unidades);
    d.precio_unitario = Number(d.precio_unitario);
    if (d.unidades <= 0 || d.precio_unitario <= 0) return false;

    d.importe = d.unidades * d.precio_unitario;

    const key = JSON.stringify(d);
    if (vistos.has(key)) return false;
    vistos.add(key);

    d.fechaObj = fecha;
    return true;
  });
}

// ---------------- KPIs ----------------
function calcularKPIs(data) {
  let ventas = 0, unidades = 0;
  let ventasPorDia = {};

  data.forEach(d => {
    ventas += d.importe;
    unidades += d.unidades;

    const dia = d.fechaObj.toLocaleDateString("es-ES", { weekday: "long" });
    ventasPorDia[dia] = (ventasPorDia[dia] || 0) + d.importe;
  });

  const mejorDia = Object.entries(ventasPorDia)
    .sort((a,b) => b[1]-a[1])[0]?.[0] || "-";

  document.getElementById("kpiVentas").textContent = ventas.toFixed(2);
  document.getElementById("kpiUnidades").textContent = unidades;
  document.getElementById("kpiTicket").textContent = (ventas / data.length).toFixed(2);
  document.getElementById("kpiDia").textContent = mejorDia;
}

// ---------------- GRÁFICOS ----------------
function graficos(data) {
  const porProducto = agrupar(data, "producto");
  const top = Object.entries(porProducto).sort((a,b)=>b[1]-a[1]).slice(0,5);

  new Chart(chartTop, {
    type: "bar",
    data: {
      labels: top.map(t=>t[0]),
      datasets: [{ data: top.map(t=>t[1]), backgroundColor: "#1f6f54" }]
    }
  });

  const porFranja = agrupar(data, "franja");
  new Chart(chartFranja, {
    type: "pie",
    data: {
      labels: Object.keys(porFranja),
      datasets: [{ data: Object.values(porFranja) }]
    }
  });

  const porFamilia = agrupar(data, "familia");
  new Chart(chartFamilia, {
    type: "bar",
    data: {
      labels: Object.keys(porFamilia),
      datasets: [{ data: Object.values(porFamilia), backgroundColor: "#f4a261" }]
    }
  });
}

function agrupar(data, campo) {
  let obj = {};
  data.forEach(d => obj[d[campo]] = (obj[d[campo]] || 0) + d.importe);
  return obj;
}

// ---------------- RANKING ----------------
function ranking(data) {
  const porProducto = agrupar(data, "producto");
  const lista = Object.entries(porProducto).sort((a,b)=>b[1]-a[1]);

  const ul = document.getElementById("rankingProductos");
  lista.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p[0]} → ${p[1].toFixed(2)} €`;
    ul.appendChild(li);
  });
}

// ---------------- TABLAS ----------------
function mostrarTablas(raw, clean) {
  pintarTabla("tablaRaw", raw.slice(0,10));
  pintarTabla("tablaClean", clean.slice(0,10));
}

function pintarTabla(id, data) {
  const table = document.getElementById(id);
  table.innerHTML = "";

  if (!data.length) return;

  const thead = document.createElement("tr");
  Object.keys(data[0]).forEach(k => {
    if (k !== "fechaObj") {
      const th = document.createElement("th");
      th.textContent = k;
      thead.appendChild(th);
    }
  });
  table.appendChild(thead);

  data.forEach(d => {
    const tr = document.createElement("tr");
    Object.keys(d).forEach(k => {
      if (k !== "fechaObj") {
        const td = document.createElement("td");
        td.textContent = d[k];
        tr.appendChild(td);
      }
    });
    table.appendChild(tr);
  });
}
