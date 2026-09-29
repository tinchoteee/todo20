// Devuelve las opciones de envío (correo a domicilio, a sucursal, retiro en el local) para un código postal.
// Lo usan el "Calculá tu envío" de la página de producto y el paso de Entrega del checkout.
const { cotizar, lineasDelPedido } = require("./_envios.js");
const { productosActuales } = require("./_catalogo.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    // Para cotizar alcanza con el producto y la cantidad (el talle y el color no cambian el envío)
    const lineas = lineasDelPedido(body.items, await productosActuales(), { exigirPrecio: false, exigirTalle: false });
    const subtotal = lineas.reduce((a, l) => a + l.precio * l.cant, 0);
    const r = await cotizar({ cp: body.cp, provincia: body.provincia, localidad: String(body.localidad || "").slice(0, 80), lineas, subtotal });
    // No se mandan al navegador los datos internos de Zipnova
    r.opciones = r.opciones.map(({ zipnova, ...o }) => o);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(r);
  } catch (e) {
    return res.status(400).json({ error: e.message || "No pudimos calcular el envío." });
  }
};
