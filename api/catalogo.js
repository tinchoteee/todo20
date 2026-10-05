// Catálogo para Meta (Facebook/Instagram) y Google Merchant Center: una planilla CSV que se arma sola
// con los productos activos, sus precios y agotados del editor. Meta y Google la leen todos los días desde
// https://nacireinacalzados.com/api/catalogo  (un ítem por modelo; el id es el mismo que manda el Píxel).
const CATALOGO = require("../productos.js");
const { productosActuales } = require("./_catalogo.js");
const aplicarAjustes = require("../ajustes.js");

const BASE = "https://nacireinacalzados.com/";
const NOMBRE_CAT = { botas: "Botas", borcegos: "Borcegos", chavitos: "Chavitos", zapatos: "Zapatos", zapatillas: "Zapatillas", sandalias: "Sandalias", suecos: "Suecos" };
const celda = v => {
  const s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const url = f => BASE + String(f).split("/").map(encodeURIComponent).join("/");

module.exports = async function handler(req, res) {
  const productos = (await productosActuales()).filter(p => !p.oculto);
  const pctT = Number((CATALOGO.transferencia || {}).porcentaje) || 0;
  const cols = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "additional_image_link", "brand", "google_product_category", "product_type", "color", "size"];
  const filas = [cols.join(",")];
  for (const p of productos) {
    const colores = (p.colores || []).filter(c => !c.oculto);
    const rango = aplicarAjustes.rangoDe(p);
    if (!rango) continue;                                   // sin precio no se publica
    const fotos = [...new Set(colores.map(c => c.foto).filter(Boolean))].sort((a, b) => /\.webp$/i.test(a) - /\.webp$/i.test(b));   // Meta prefiere JPG
    if (!fotos.length) continue;
    const talles = p.talles || [];
    const desc = [
      p.desc || p.nombre,
      colores.length ? `Colores: ${colores.map(c => c.nombre).join(", ")}.` : "",
      talles.length ? `Talles del ${talles[0]} al ${talles[talles.length - 1]}.` : "",
      "Envíos a todo el país o retiro en Ramos Mejía.",
      pctT ? `${pctT}% OFF pagando con transferencia.` : ""
    ].filter(Boolean).join(" ");
    filas.push([
      p.id,
      p.nombre,
      desc,
      p.agotado ? "out of stock" : "in stock",
      "new",
      `${rango.min.toFixed(2)} ARS`,
      `${BASE}?p=${p.id}`,
      url(fotos[0]),
      fotos.slice(1, 10).map(url).join(","),
      "Nací Reina",
      187,                                                    // Google: Indumentaria y accesorios > Calzado
      `Calzado > ${NOMBRE_CAT[p.cat] || p.cat}`,
      colores.map(c => c.nombre).join("/"),
      talles.join("/")
    ].map(celda).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send("﻿" + filas.join("\n"));
};
