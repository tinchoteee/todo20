// Arma el kit para publicar en Facebook Marketplace (marketplace/kit.html y kit.csv) desde productos.js
const C = require("../productos.js");
const fs = require("fs");
const BASE = "https://nacireinacalzados.com/";
const pesos = n => "$" + Number(n).toLocaleString("es-AR");
const ETIQ = {
  botas: ["botas mujer","botas texanas","botas de moda","botas cuero","botas cortas","botinetas","calzado mujer","botas invierno","botas taco","botas western"],
  borcegos: ["borcegos mujer","borcegos","botas borcego","borcego plataforma","calzado mujer","borcegos de moda","borcego negro","botas invierno","borcego cuero","borcego cordones"],
  chavitos: ["chavitos","chavitos mujer","botitas","botinetas","calzado mujer","botas cortas","gamuza","suela crepe","calzado comodo","botas invierno"],
  zapatos: ["zapatos mujer","zapatos","mocasines","calzado mujer","zapatos de moda","zapatos cuero","zapatos comodos","zapatos punta","calzado elegante","zapatos casual"],
  zapatillas: ["zapatillas mujer","zapatillas","zapatillas urbanas","zapatillas plataforma","sneakers","calzado mujer","zapatillas de moda","zapatillas blancas","zapatillas comodas","zapatillas cuero"],
  sandalias: ["sandalias mujer","sandalias","sandalias plataforma","chinelas","sandalias verano","calzado mujer","sandalias de moda","sandalias taco","sandalias cuero","ojotas"],
  suecos: ["suecos mujer","suecos","zuecos","suecos cuero","calzado mujer","suecos de moda","suecos gamuza","sandalias","calzado comodo","suecos plataforma"]
};
const COMUNES = ["Ramos Mejía","La Matanza","Nací Reina","envíos a todo el país","calzado nacional","talles 35 al 40"];
const productos = C.productos.filter(p => !p.oculto);
const filas = productos.map(p => {
  const cols = (p.colores || []).filter(c => !c.oculto);
  const precios = [...new Set(cols.map(c => c.precio || p.precio).filter(Boolean))].sort((a,b)=>a-b);
  const talles = p.talles || [];
  const rango = talles.length ? `${talles[0]} al ${talles[talles.length-1]}` : "";
  const tags = [];
  const add = t => { t = t.trim(); if (t && t.length <= 30 && !tags.some(x => x.toLowerCase() === t.toLowerCase())) tags.push(t); };
  (ETIQ[p.cat] || []).forEach(add);
  cols.forEach(c => add(`${(ETIQ[p.cat]||[p.cat])[0].split(" ")[0]} ${c.nombre.toLowerCase()}`));
  COMUNES.forEach(t => add(t.replace("35 al 40", rango)));
  const nom = p.nombre.toLowerCase().replace(/sin cordones/g, "sin-cordones");
  nom.split(/\s+/).filter(w => w.length > 4).forEach(w => add(w.replace("sin-cordones", "sin cordones")));
  ["calzado de moda","tienda de calzado","zapatería"].forEach(add);
  const titulo = p.nombre.slice(0, 99);
  const precioTxt = precios.length ? pesos(precios[0]) : "Consultar";
  const desc = [
    `${p.nombre}. ${p.desc || ""}`.trim(),
    cols.length ? `Colores: ${cols.map(c => c.nombre + (c.precio && precios.length > 1 ? ` (${pesos(c.precio)})` : "")).join(", ")}.` : "",
    rango ? `Talles: del ${rango}.` : "",
    "✅ Envíos a todo el país o retiro en nuestro local de Ramos Mejía.",
    `✅ ${C.transferencia && C.transferencia.porcentaje ? C.transferencia.porcentaje + "% OFF pagando con transferencia." : ""} Tarjeta y Mercado Pago.`,
    `🛒 Comprá online en ${BASE.replace("https://","").replace(/\/$/,"")}`
  ].filter(Boolean).join("\n");
  return { id: p.id, cat: p.cat, titulo, precio: precioTxt, desc, tags: tags.slice(0, 20), fotos: cols.map(c => ({ color: c.nombre, url: BASE + c.foto })) };
});
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const csvc = s => '"' + String(s).replace(/"/g,'""') + '"';
fs.writeFileSync(__dirname + "/kit.csv", "﻿" + ["id,categoria,titulo,precio,descripcion,etiquetas,fotos"].concat(filas.map(f =>
  [f.id, f.cat, f.titulo, f.precio, f.desc, f.tags.join(", "), f.fotos.map(x => x.url).join(" ")].map(csvc).join(","))).join("\n"));
fs.writeFileSync(__dirname + "/kit.html", `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kit Marketplace</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;background:#fff;color:#1F0A16}article{border:1px solid #EADCE3;border-radius:14px;padding:14px;margin:14px 0}h2{margin:0 0 4px;font-size:19px}.p{color:#E0157F;font-weight:700}pre{white-space:pre-wrap;background:#FFF4F9;padding:10px;border-radius:8px;font:inherit}.t{display:flex;flex-wrap:wrap;gap:6px}.t span{background:#FFE2F0;border-radius:99px;padding:3px 10px;font-size:14px}.f{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.f img{width:110px;height:110px;object-fit:cover;border-radius:8px}label{display:flex;gap:6px;align-items:center;margin-top:8px}</style>
<h1>Kit para Facebook Marketplace · ${filas.length} productos</h1><p>Por cada producto: copiá título, precio, descripción y las etiquetas; bajá las fotos (tocá y mantené apretado → Guardar). Tildá "Publicado" para no repetir.</p>
${filas.map(f => `<article><h2>${esc(f.titulo)}</h2><div class="p">${esc(f.precio)}</div><pre>${esc(f.desc)}</pre><b>Etiquetas (${f.tags.length}):</b><div class="t">${f.tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div><div class="f">${f.fotos.map(x=>`<a href="${x.url}" download><img src="${x.url}" alt="${esc(x.color)}"></a>`).join("")}</div><label><input type="checkbox" data-id="${f.id}"> Publicado</label></article>`).join("")}
<script>document.querySelectorAll("input[data-id]").forEach(c=>{try{c.checked=localStorage.getItem("mp"+c.dataset.id)==="1"}catch(e){};c.onchange=()=>{try{localStorage.setItem("mp"+c.dataset.id,c.checked?"1":"0")}catch(e){}}})</script>`);
console.log(filas.length, "productos; etiquetas min", Math.min(...filas.map(f=>f.tags.length)));
