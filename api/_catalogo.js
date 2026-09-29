// Catálogo "vivo": productos.js + los cambios del editor (precios y agotados) guardados en la base de datos.
const CATALOGO = require("../productos.js");
const aplicarAjustes = require("../ajustes.js");
const db = require("./_db.js");

let cache = null, cacheHasta = 0;

// Aumentos generales de precios: los precios de productos.js se suben a mano; los que el dueño cargó
// en el editor (base de datos) se suben acá una sola vez, la primera vez que se leen después de publicar.
const AUMENTOS = [{ id: "2026-09-29-10", porcentaje: 10 }];
async function aplicarAumentos() {
  if (!db.hayDB()) return;
  for (const au of AUMENTOS) {
    if (!(await db.guardarSiNoExiste(`nacireina:aumento:${au.id}`, { fecha: new Date().toISOString() }))) continue;
    try {
      const aj = await db.leer("nacireina:ajustes", {}) || {};
      const sube = n => Math.round(n * (100 + au.porcentaje) / 100);
      for (const p of Object.values(aj.productos || {})) {
        if (p.precio > 0) p.precio = sube(p.precio);
        for (const c of Object.values(p.colores || {})) if (c.precio > 0) c.precio = sube(c.precio);
      }
      await db.guardar("nacireina:ajustes", aj);
      console.log("Aumento aplicado a los precios del editor", au.id);
    } catch (e) {
      await db.comando("DEL", `nacireina:aumento:${au.id}`).catch(() => {});   // se reintenta la próxima vez
      throw e;
    }
  }
}

// Precios y agotados del editor + los pares que hay de cada talle
async function leerAjustes() {
  let ajustes = {}, pares = {};
  try { await aplicarAumentos(); } catch (e) { console.error("No se pudo aplicar el aumento", e.message); }
  try { ajustes = await db.leer("nacireina:ajustes", {}) || {}; }
  catch (e) { console.error("No se pudieron leer los ajustes", e.message); }
  try { pares = await db.leerPares(); }
  catch (e) { console.error("No se pudieron leer los pares", e.message); }
  return { ...ajustes, pares };
}

async function productosActuales() {
  if (cache && Date.now() < cacheHasta) return cache;
  cache = aplicarAjustes(CATALOGO.productos, await leerAjustes());
  cacheHasta = Date.now() + 5000;
  return cache;
}
const olvidarCache = () => { cacheHasta = 0; };

module.exports = { productosActuales, leerAjustes, olvidarCache };
