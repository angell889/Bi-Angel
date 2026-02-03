fetch("ventas_raw.csv")
  .then(res => res.text())
  .then(texto => procesarCSV(texto));

let datosClean = [];

function procesarCSV(texto) {
  const lineas = texto.trim().split("\n");
  const cabecera = lineas[0].split(",");

  const datosRaw = lineas.slice(1).map(l => {
    const valores = l.split(",");
    let obj = {};
    cabecera.forEach((c, i) => obj[c.trim()] = valores[i]?.trim());
    return obj;
  });

  mostrarTabla(datosRaw.slice(0, 10), "tablaRaw");

  const antes = datosRaw.length;
  datosClean = limpiarDatos(datosRaw);
  const despues = datosClean.length;

  document.getElementById("infoFilas").innerText =
    `Filas antes de limpiar: ${antes} | Filas después de limpiar: ${despues}`;

  mostrarTabla(datosClean.slice(0, 10), "tablaClean");
  calcularKPIs(datosClean);
  crearGraficos(datosClean);
}

function limpiarDatos(datos) {
  const vistos = new Set();
  let limpio = [];

  datos.forEach(d => {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha)) return;

    let franja = d.franja.toLowerCase();
    if (franja.includes("desa")) franja = "Desayuno";
    else if (franja.includes("com")) franja = "Comida";
    else return;

    let familia = d.familia.toLowerCase();
    if (familia.includes("beb")) familia = "Bebida";
    else if (familia.includes("entra")) familia = "Entrante";
    else if (familia.includes("princ")) familia = "Principal";
    else if (familia.includes("post")) familia = "Postre";
    else return;

    if (!d.producto) return;
    const producto = d.producto.trim().toLowerCase();

    const unidades = Number(d.unidades);
    const precio = Number(d.precio_unitario);
    if (unidades <= 0 || precio <= 0) return;

    const importe = unidades * precio;

    const fila = {
      fecha: fecha.toISOString().split("T")[0],
      franja,
      producto,
      familia,
      unidades,
      precio_unitario: precio,
      importe
    };

    const clave = JSON.stringify(fila);
    if (!vistos.has(clave)) {
      vistos.add(clave);
      limpio.push(fila);
    }
  });

  return limpio;
}

function calcularKPIs(datos) {
  const totalVentas = datos.reduce((s, d) => s + d.importe, 0);
  const totalUnidades = datos.reduce((s, d) => s + d.unidades, 0);

  const porProducto = agrupar(datos, "producto");
  const porFranja = agrupar(datos, "franja");
  const porFamilia = agrupar(datos, "familia");

  document.getElementById("kpiVentas").innerHTML =
    `<strong>Ventas totales</strong><br>€ ${totalVentas.toFixed(2)}`;

  document.getElementById("kpiUnidades").innerHTML =
    `<strong>Unidades totales</strong><br>${totalUnidades}`;

  document.getElementById("kpiTop").innerHTML =
    `<strong>Top 5 productos</strong><br>` +
    Object.entries(porProducto)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => `${e[0]} (€${e[1].toFixed(2)})`)
      .join("<br>");

  document.getElementById("kpiFranja").innerHTML =
    `<strong>Ventas por franja</strong><br>` +
    Object.entries(porFranja).map(e => `${e[0]} (€${e[1].toFixed(2)})`).join("<br>");

  document.getElementById("kpiFamilia").innerHTML =
    `<strong>Ventas por familia</strong><br>` +
    Object.entries(porFamilia).map(e => `${e[0]} (€${e[1].toFixed(2)})`).join("<br>");
}

function crearGraficos(datos) {
  const porProducto = agrupar(datos, "producto");
  const porFranja = agrupar(datos, "franja");
  const porFamilia = agrupar(datos, "familia");

  const top5 = Object.entries(porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById("chartTop"), {
    type: "bar",
    data: { labels: top5.map(e => e[0]), datasets: [{ data: top5.map(e => e[1]) }] }
  });

  new Chart(document.getElementById("chartFranja"), {
    type: "pie",
    data: { labels: Object.keys(porFranja), datasets: [{ data: Object.values(porFranja) }] }
  });

  new Chart(document.getElementById("chartFamilia"), {
    type: "pie",
    data: { labels: Object.keys(porFamilia), datasets: [{ data: Object.values(porFamilia) }] }
  });
}

function agrupar(datos, campo) {
  return datos.reduce((acc, d) => {
    acc[d[campo]] = (acc[d[campo]] || 0) + d.importe;
    return acc;
  }, {});
}

function mostrarTabla(datos, id) {
  const tabla = document.getElementById(id);
  if (datos.length === 0) return;

  tabla.innerHTML = "";
  const thead = tabla.createTHead();
  const filaHead = thead.insertRow();
  Object.keys(datos[0]).forEach(k => {
    const th = document.createElement("th");
    th.innerText = k;
    filaHead.appendChild(th);
  });

  const tbody = tabla.createTBody();
  datos.forEach(d => {
    const fila = tbody.insertRow();
    Object.values(d).forEach(v => fila.insertCell().innerText = v);
  });
}

function descargarCSV() {
  const cab = Object.keys(datosClean[0]).join(",");
  const filas = datosClean.map(d => Object.values(d).join(","));
  const csv = [cab, ...filas].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ventas_clean.csv";
  a.click();
}
