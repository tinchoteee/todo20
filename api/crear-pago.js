// Crea el cobro en Mercado Pago (Checkout Pro) para el pedido del carrito: el cliente paga en la página de Mercado Pago.
// Variable de entorno necesaria en Vercel: MP_ACCESS_TOKEN (credencial de producción de Mercado Pago).
const { armarPedido, leerBody, baseDe } = require("./_pedido.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "Falta configurar la credencial de Mercado Pago." });

  let pedido, preferencia;
  try {
    const base = baseDe(req);
    pedido = await armarPedido(leerBody(req), base);
    preferencia = {
      items: pedido.items,
      payer: { name: pedido.cliente.nombre, email: pedido.cliente.email },
      external_reference: pedido.numero,
      statement_descriptor: "NACI REINA",
      back_urls: { success: `${base}/?pago=aprobado`, pending: `${base}/?pago=pendiente`, failure: `${base}/?pago=rechazado` },
      auto_return: "approved",
      notification_url: pedido.notificationUrl,
      metadata: pedido.metadata
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
  return res.status(200).json({ url: data.init_point, pedido: pedido.numero });
};
