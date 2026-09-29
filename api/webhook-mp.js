// Mercado Pago llama a esta dirección cada vez que cambia un pago. Cuando un pago queda aprobado,
// lo procesa (_procesar.js): guarda el pedido, crea el envío en Zipnova y avisa por email.
//
// Variables de entorno en Vercel:
//   MP_ACCESS_TOKEN (obligatoria)
//   ZIPNOVA_* (ver _envios.js)  ·  ZIPNOVA_CREAR_ENVIOS = "no" para crear los envíos a mano
//   RESEND_API_KEY + AVISOS_EMAIL  → email al local con cada venta
//   RESEND_FROM (opcional, ej: "Nací Reina <ventas@nacireina.com.ar>") → también se le escribe al cliente
const { procesarPagoAprobado } = require("./_procesar.js");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const b = (typeof req.body === "object" && req.body) || {};
  const tipo = b.type || b.topic || q.type || q.topic;
  const id = (b.data && b.data.id) || q["data.id"] || q.id;
  if (tipo !== "payment" || !id) return res.status(200).send("ok");

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).send("Falta MP_ACCESS_TOKEN");

  // Se consulta el pago directamente a Mercado Pago (no se confía en lo que llega en el aviso)
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) { console.error("No se pudo leer el pago", id, r.status); return res.status(500).send("error"); }
  const pago = await r.json();
  if (pago.status !== "approved") return res.status(200).send("ok");

  await procesarPagoAprobado(pago);
  return res.status(200).send("ok");
};
