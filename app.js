document.addEventListener("DOMContentLoaded", () => {
  fetch("ventas_raw.csv")
    .then(res => res.text())
    .then(texto => procesarCSV(texto))
    .catch(() => alert("❌ No se pudo cargar ventas_raw.csv"));
});

let datosClean = [];

function procesarCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  const cabecera = lineas[0].split(",");

  const datosRaw = lineas.slice(1).map(l => {
    const v = l.split(",");
    let o = {};
    cabecera.forEach((c,i)=>o[c.trim()] = v[i]?.trim());
    return o;
  });

  mostrarTabla(datosRaw.slice(0,10),"tablaRaw");

  datosClean = limpiar(datosRaw);

  document.getElementById("infoFilas").innerText =
    `Filas antes: ${datosRaw.length} | Filas después: ${datosClean.length}`;

  mostrarTabla(datosClean.slice(0,10),"tablaClean");
  calcularKPIs(datosClean);
  graficos(datosClean);
}

function limpiar(datos){
  const set = new Set();
  const out = [];

  datos.forEach(d=>{
    const fecha = new Date(d.fecha);
    if(isNaN(fecha)) return;

    const franja = d.franja?.toLowerCase().includes("desa") ? "Desayuno" :
                   d.franja?.toLowerCase().includes("com") ? "Comida" : null;
    if(!franja) return;

    const familia =
      d.familia?.toLowerCase().includes("beb") ? "Bebida" :
      d.familia?.toLowerCase().includes("entra") ? "Entrante" :
      d.familia?.toLowerCase().includes("princ") ? "Principal" :
      d.familia?.toLowerCase().includes("post") ? "Postre" : null;
    if(!familia) return;

    if(!d.producto) return;
    const producto = d.producto.trim().toLowerCase();

    const unidades = Number(d.unidades);
    const precio = Number(d.precio_unitario);
    if(unidades<=0 || precio<=0) return;

    const fila = {
      fecha: fecha.toISOString().split("T")[0],
      franja, producto, familia,
      unidades,
      precio_unitario: precio,
      importe: unidades * precio
    };

    const key = JSON.stringify(fila);
    if(!set.has(key)){ set.add(key); out.push(fila); }
  });

  return out;
}

function calcularKPIs(d){
  const totalVentas = d.reduce((s,x)=>s+x.importe,0);
  const totalUnidades = d.reduce((s,x)=>s+x.unidades,0);

  const agr = (c)=>d.reduce((a,x)=>(a[x[c]]=(a[x[c]]||0)+x.importe,a),{});

  const pProd = agr("producto");
  const pFran = agr("franja");
  const pFam  = agr("familia");

  kpiVentas.innerHTML = `<b>Ventas totales</b><br>€ ${totalVentas.toFixed(2)}`;
  kpiUnidades.innerHTML = `<b>Unidades</b><br>${totalUnidades}`;
  kpiTop.innerHTML = `<b>Top productos</b><br>` +
    Object.entries(pProd).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(e=>`${e[0]} (€${e[1].toFixed(2)})`).join("<br>");
  kpiFranja.innerHTML = `<b>Ventas por franja</b><br>` +
    Object.entries(pFran).map(e=>`${e[0]} €${e[1].toFixed(2)}`).join("<br>");
  kpiFamilia.innerHTML = `<b>Ventas por familia</b><br>` +
    Object.entries(pFam).map(e=>`${e[0]} €${e[1].toFixed(2)}`).join("<br>");
}

function graficos(d){
  const agr = (c)=>d.reduce((a,x)=>(a[x[c]]=(a[x[c]]||0)+x.importe,a),{});

  const prod = Object.entries(agr("producto")).sort((a,b)=>b[1]-a[1]).slice(0,5);

  new Chart(chartTop,{type:"bar",
    data:{labels:prod.map(x=>x[0]),datasets:[{data:prod.map(x=>x[1])}]}});
  new Chart(chartFranja,{type:"pie",
    data:{labels:Object.keys(agr("franja")),datasets:[{data:Object.values(agr("franja"))}]}});
  new Chart(chartFamilia,{type:"pie",
    data:{labels:Object.keys(agr("familia")),datasets:[{data:Object.values(agr("familia"))}]}});
}

function mostrarTabla(d,id){
  const t=document.getElementById(id); if(!d.length) return;
  t.innerHTML="";
  const h=t.createTHead().insertRow();
  Object.keys(d[0]).forEach(k=>h.appendChild(document.createElement("th")).innerText=k);
  const b=t.createTBody();
  d.forEach(r=>{
    const row=b.insertRow();
    Object.values(r).forEach(v=>row.insertCell().innerText=v);
  });
}

function descargarCSV(){
  const cab=Object.keys(datosClean[0]).join(",");
  const filas=datosClean.map(d=>Object.values(d).join(","));
  const csv=[cab,...filas].join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="ventas_clean.csv";
  a.click();
}
