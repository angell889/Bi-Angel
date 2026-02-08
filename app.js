let rawData = [];
let cleanData = [];

// Cargar CSV
fetch('ventas_raw.csv')
  .then(res => res.text())
  .then(text => procesarCSV(text));

function procesarCSV(texto) {
  const filas = texto.trim().split('\n');
  const headers = filas[0].split(',');

  rawData = filas.slice(1).map(f => {
    const valores = f.split(',');
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = valores[i]?.trim());
    return obj;
  });

  limpiarDatos();
  mostrarTablas();
  calcularKPIs();
  crearGraficos();
  crearRanking();
}

// Limpieza
function limpiarDatos() {
  const vistos = new Set();

  cleanData = rawData.filter(r => {
    const fecha = new Date(r.fecha);
    if (isNaN(fecha)) return false;

    r.franja = r.franja.toLowerCase().includes('desa') ? 'Desayuno' : 'Comida';

    const familiasValidas = ['bebida','entrante','principal','postre'];
    if (!familiasValidas.includes(r.familia.toLowerCase())) return false;
    r.familia = r.familia.charAt(0).toUpperCase() + r.familia.slice(1).toLowerCase();

    if (!r.producto) return false;
    r.producto = r.producto.trim().toLowerCase();

    r.unidades = Number(r.unidades);
    r.precio_unitario = Number(r.precio_unitario);
    if (r.unidades <= 0 || r.precio_unitario <= 0) return false;

    r.importe = r.unidades * r.precio_unitario;

    const clave = JSON.stringify(r);
    if (vistos.has(clave)) return false;
    vistos.add(clave);

    r.fechaObj = fecha;
    return true;
  });
}

// KPIs
function calcularKPIs() {
  const ventas = cleanData.reduce((a,b) => a + b.importe, 0);
  const unidades = cleanData.reduce((a,b) => a + b.unidades, 0);

  document.getElementById('kpiVentas').innerText = ventas.toFixed(2) + ' €';
  document.getElementById('kpiUnidades').innerText = unidades;

  const porDia = {};
  const porFranja = {};

  cleanData.forEach(r => {
    const dia = r.fechaObj.toLocaleDateString('es-ES',{weekday:'long'});
    porDia[dia] = (porDia[dia] || 0) + r.importe;
    porFranja[r.franja] = (porFranja[r.franja] || 0) + r.importe;
  });

  document.getElementById('kpiDia').innerText =
    Object.entries(porDia).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';

  document.getElementById('kpiFranja').innerText =
    Object.entries(porFranja).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
}

// Gráficos
function crearGraficos() {
  const porProducto = {};
  const porFranja = {};
  const porFamilia = {};

  cleanData.forEach(r => {
    porProducto[r.producto] = (porProducto[r.producto] || 0) + r.importe;
    porFranja[r.franja] = (porFranja[r.franja] || 0) + r.importe;
    porFamilia[r.familia] = (porFamilia[r.familia] || 0) + r.importe;
  });

  const topProductos = Object.entries(porProducto)
    .sort((a,b)=>b[1]-a[1]).slice(0,5);

  new Chart(document.getElementById('chartTopProductos'), {
    type: 'bar',
    data: {
      labels: topProductos.map(p=>p[0]),
      datasets: [{ data: topProductos.map(p=>p[1]), backgroundColor:'#4FA3A5' }]
    }
  });

  new Chart(document.getElementById('chartFranja'), {
    type: 'pie',
    data: {
      labels: Object.keys(porFranja),
      datasets: [{ data: Object.values(porFranja), backgroundColor:['#0A4D68','#4FA3A5'] }]
    }
  });

  new Chart(document.getElementById('chartFamilia'), {
    type: 'bar',
    data: {
      labels: Object.keys(porFamilia),
      datasets: [{ data: Object.values(porFamilia), backgroundColor:'#F4B942' }]
    }
  });
}

// Ranking
function crearRanking() {
  const porProducto = {};
  cleanData.forEach(r=>{
    porProducto[r.producto]=(porProducto[r.producto]||0)+r.importe;
  });

  const tabla = document.getElementById('tablaRanking');
  tabla.innerHTML = '<tr><th>Producto</th><th>Ventas (€)</th></tr>';

  Object.entries(porProducto)
    .sort((a,b)=>b[1]-a[1])
    .forEach(p=>{
      tabla.innerHTML += `<tr><td>${p[0]}</td><td>${p[1].toFixed(2)}</td></tr>`;
    });
}

// Tablas
function mostrarTablas() {
  crearTabla('tablaRaw', rawData.slice(0,10));
  crearTabla('tablaClean', cleanData.slice(0,10));
}

function crearTabla(id, datos) {
  const tabla = document.getElementById(id);
  if (!datos.length) return;

  tabla.innerHTML = '<tr>' + Object.keys(datos[0]).map(h=>`<th>${h}</th>`).join('') + '</tr>';
  datos.forEach(d=>{
    tabla.innerHTML += '<tr>' + Object.values(d).map(v=>`<td>${v}</td>`).join('') + '</tr>';
  });
}

// Descargar CSV limpio
function descargarCSV() {
  const headers = Object.keys(cleanData[0]).filter(h=>h!=='fechaObj');
  let csv = headers.join(',') + '\n';

  cleanData.forEach(r=>{
    csv += headers.map(h=>r[h]).join(',') + '\n';
  });

  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ventas_clean.csv';
  a.click();
}function crearGraficos() {

  // TOP 5 PRODUCTOS
  const ctxTop = document.getElementById('chartTopProductos');
  if (ctxTop) {
    new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: topProductos.map(p => p.producto),
        datasets: [{
          label: 'Ventas (€)',
          data: topProductos.map(p => p.importe),
        }]
      }
    });
  }

  // VENTAS POR FRANJA
  const ctxFranja = document.getElementById('chartFranja');
  if (ctxFranja) {
    new Chart(ctxFranja, {
      type: 'pie',
      data: {
        labels: Object.keys(ventasPorFranja),
        datasets: [{
          data: Object.values(ventasPorFranja),
        }]
      }
    });
  }

  // VENTAS POR FAMILIA
  const ctxFamilia = document.getElementById('chartFamilia');
  if (ctxFamilia) {
    new Chart(ctxFamilia, {
      type: 'pie',
      data: {
        labels: Object.keys(ventasPorFamilia),
        datasets: [{
          data: Object.values(ventasPorFamilia),
    
