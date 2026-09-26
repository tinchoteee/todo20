// Catálogo "vivo": productos.js + los cambios del editor (precios y agotados) guardados en la base de datos.
const CATALOGO = require("../productos.js");
const aplicarAjustes = require("../ajustes.js");
const db = require("./_db.js");

let cache = null, cacheHasta = 0;

async function leerAjustes() {
  try { return await db.leer("nacireina:ajustes", {}) || {}; }
  catch (e) { console.error("No se pudieron leer los ajustes", e.message); return {}; }
}

async function productosActuales() {
  if (cache && Date.now() < cacheHasta) return cache;
  cache = aplicarAjustes(CATALOGO.productos, await leerAjustes());
  cacheHasta = Date.now() + 5000;
  return cache;
}
const olvidarCache = () => { cacheHasta = 0; };

module.exports = { productosActuales, leerAjustes, olvidarCache };
