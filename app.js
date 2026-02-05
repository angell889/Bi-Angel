document.addEventListener("DOMContentLoaded", () => {
  fetch("./ventas_raw.csv")
    .then(res => {
      if (!res.ok) throw new Error("No se pudo cargar el CSV");
      return res.text();
    })
    .then(csv => iniciar(csv))
    .catch(err => {
      document.body.innerHTML =
        "<h2 style='padding:20px;color:red'>Error cargando datos</h2><p>" +
        err.message +
        "</p>";
    });
});

function iniciar(csv) {
  const lineas = csv.trim().split("\n");
  if (lineas.length < 2) return;

  const cabecera = lineas[0].split(",").map(c => c.trim());

  const raw = lineas.slice(1).map(l => {
    const valores = l.split(",");
    let obj = {};
    cabecera.forEach((c, i) => obj[c] = valores[i]?.trim() || "");
    return obj;
  });

  const clean = limpiar(raw);

  pintarTabla("tablaRaw", raw.slice(0, 10));
  pintarTabla("tablaClean", clean.slice(0, 10));

  calcularKPIs(clean);
  crearGraficos(clean);
  rankingProductos(clean);
}

/* ---------------- LIMPIEZA ---------------- */

function limpiar(data) {
  const set = new Set();

  return data.filter(d => {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha)) return false;
    d.fechaObj = fecha;

    d.producto = d.producto.toLowerCase().trim();
    if (!d.producto) return false;

    d.unidades = Number(d.unidades);
    d.precio_unitario = Number(d.precio_unitario);
    if (d.unidades <= 0 || d.precio_unitario <= 0) return false;

    d.importe = d.unidades * d.precio_unitario;

    d.franja = d.franja.toLowerCase().includes("desa")
      ? "Desayuno"
      : "Comida";

    const fam = d.familia.toLowerCase();
    if (fam.includes("beb")) d.familia = "Bebida";
    else if (fam.includes("entra")) d.familia = "Entrante";
    else if (fam.includes("post")) d.familia = "Postre";
    else d.familia = "Principal";

    const key = JSON.stringify(d);
    if (set.has(key)) return false;
    set.add(key);

    return true;
  });
}

/* ---------------- KPIs ---------------- */

function calcularKPIs(data) {
  let ventas = 0;
  let unidades = 0;
  let ventasPorDia = {};

  data.forEach(d => {
    ventas += d.importe;
    unidades += d.unidades;

    const dia = d.fechaObj.toLocaleDateString("es-ES", { weekday: "long" });
    ventasPorDia[dia] = (ventasPorDia[dia] || 0) + d.importe;
  });

  const mejorDia = Object.entries(ventasPorDia)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  document.getElementById("kpiVentas").textContent = ventas.toFixed(2);
  document.getElementById("kpiUnidades").textContent = unidades;
  document.getElementById("kpiTicket").textContent =
    (ventas / data.length).toFixed(2);
  document.getElementById("kpiDia").textContent = mejorDia;
}

/* ---------------- GRÁFICOS ---------------- */

function crearGraficos(data) {
  const porProducto = agrupar(data, "producto");
  const top = Object.entries(porProducto).sort((a,b)=>b[1]-a[1]).slice(0,5);

  new Chart(document.getElementById("chartTop"), {
    type: "bar",
    data: {
      labels: top.map(t => t[0]),
      datasets: [{
        data: top.map(t => t[1]),
        backgroundColor: "#1f6f54"
      }]
    }
  });

  const porFranja = agrupar(data, "franja");
  new Chart(document.getElementById("chartFranja"), {
    type: "pie",
    data: {
      labels: Object.keys(porFranja),
      datasets: [{
        data: Object.values(porFranja)
      }]
    }
  });

  const porFamilia = agrupar(data, "familia");
  new Chart(document.getElementById("chartFamilia"), {
    type: "bar",
    data: {
      labels: Object.keys(porFamilia),
      datasets: [{
        data: Object.values(porFamilia),
        backgroundColor: "#e76f51"
      }]
    }
  });
}

function agrupar(data, campo) {
  let obj = {};
  data.forEach(d => obj[d[campo]] = (obj[d[campo]] || 0) + d.importe);
  return obj;
}

/* ---------------- RANKING ---------------- */

function rankingProductos(data) {
  const porProducto = agrupar(data, "producto");
  const lista = Object.entries(porProducto).sort((a,b)=>b[1]-a[1]);

  const ul = document.getElementById("rankingProductos");
  ul.innerHTML = "";

  lista.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p[0]} → ${p[1].toFixed(2)} €`;
    ul.appendChild(li);
  });
}

/* ---------------- TABLAS ---------------- */

function pintarTabla(id, data) {
  const table = document.getElementById(id);
  table.innerHTML = "";

  if (!data.length) return;

  const trHead = document.createElement("tr");
  Object.keys(data[0]).forEach(k => {
    if (k !== "fechaObj") {
      const th = document.createElement("th");
      th.textContent = k;
      trHead.appendChild(th);
    }
  });
  table.appendChild(trHead);

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
