// Crea el cobro en Mercado Pago (Checkout Pro) para el pedido del carrito.
// Los precios salen de productos.js y el envío se vuelve a cotizar acá: nunca se usa lo que manda el navegador.
// Variable de entorno necesaria en Vercel: MP_ACCESS_TOKEN (credencial de producción de Mercado Pago).
const { cotizar, lineasDelPedido } = require("./_envios.js");
const { productosActuales } = require("./_catalogo.js");

const texto = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "Falta configurar la credencial de Mercado Pago." });

  let preferencia, numero;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const lineas = lineasDelPedido(body.items, await productosActuales());
    const subtotal = lineas.reduce((a, l) => a + l.precio * l.cant, 0);

    const c = body.cliente || {};
    const cliente = { nombre: texto(c.nombre, 80), telefono: texto(c.telefono, 30), email: texto(c.email, 120), dni: texto(c.dni, 12) };
    if (!cliente.nombre || !cliente.telefono) throw new Error("Completá tu nombre y teléfono.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) throw new Error("Ingresá un email válido: ahí te llega el seguimiento del envío.");

    // Envío: se vuelve a cotizar y se busca la opción elegida
    const e = body.entrega || {};
    const cot = e.opcion === "local"
      ? { opciones: [{ id: "local", tipo: "local", nombre: "Retiro en el local", precio: 0 }] }
      : await cotizar({ cp: e.cp, provincia: e.provincia, localidad: texto(e.localidad, 80), lineas, subtotal });
    const opcion = cot.opciones.find(o => o.id === e.opcion);
    if (!opcion) throw new Error("La opción de envío cambió. Volvé a elegir cómo lo recibís.");

    const entrega = { tipo: opcion.tipo, opcion: opcion.nombre, precio: opcion.precio };
    if (opcion.tipo === "domicilio") {
      Object.assign(entrega, { calle: texto(e.calle, 120), numero: texto(e.numero, 10), piso: texto(e.piso, 30),
        localidad: texto(e.localidad, 80), provincia: cot.provincia, cp: cot.cp });
      if (!entrega.calle || !entrega.numero || !entrega.localidad) throw new Error("Completá la dirección de envío.");
    } else if (opcion.tipo === "sucursal") {
      const s = opcion.sucursales.find(x => x.id === String(e.sucursal));
      if (!s) throw new Error("Elegí la sucursal de Andreani donde vas a retirar.");
      Object.assign(entrega, { sucursal: `${s.nombre} (${s.direccion})`, sucursal_id: s.id, localidad: texto(e.localidad, 80), provincia: cot.provincia, cp: cot.cp });
    }
    if (opcion.zipnova) entrega.zipnova = opcion.zipnova;

    const items = lineas.map(l => ({
      id: String(l.producto.id),
      title: `${l.producto.nombre}${l.color ? " - " + l.color.nombre : ""} - Talle ${l.talle}`,
      quantity: l.cant, unit_price: l.precio, currency_id: "ARS"
    }));
    if (opcion.precio > 0) items.push({ id: "envio", title: opcion.nombre, quantity: 1, unit_price: opcion.precio, currency_id: "ARS" });

    numero = "NR-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();
    const base = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
    preferencia = {
      items,
      payer: { name: cliente.nombre, ...(cliente.email ? { email: cliente.email } : {}) },
      external_reference: numero,
      statement_descriptor: "NACI REINA",
      back_urls: { success: `${base}/?pago=aprobado`, pending: `${base}/?pago=pendiente`, failure: `${base}/?pago=rechazado` },
      auto_return: "approved",
      notification_url: `${base}/api/webhook-mp`,
      // Todo el pedido viaja con el pago: el aviso por email lo lee de acá
      metadata: { pedido: numero, cliente, entrega,
        detalle: items.filter(i => i.id !== "envio").map(i => `${i.quantity} x ${i.title} ($${i.unit_price})`),
        productos: lineas.map(l => ({ id: l.producto.id, cant: l.cant })), subtotal }
    };
  } catch (err) {
    return res.status(400).json({ error: err.message || "Revisá los datos del pedido." });
  }

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(preferencia)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.init_point) {
    console.error("Mercado Pago rechazó la preferencia", r.status, JSON.stringify(data));
    return res.status(502).json({ error: "No pudimos conectar con Mercado Pago. Probá de nuevo en un momento." });
  }
  return res.status(200).json({ url: data.init_point, pedido: numero });
};
