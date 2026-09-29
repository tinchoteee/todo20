// Cobra con tarjeta de crédito o débito desde el formulario de Mercado Pago que está dentro de la página.
// Los datos de la tarjeta nunca llegan acá: el formulario de Mercado Pago los convierte en un "token"
// de un solo uso, y con ese token se hace el cobro.
// Variables de entorno en Vercel: MP_ACCESS_TOKEN (cobra) y MP_PUBLIC_KEY (la usa el formulario).
const { armarPedido, leerBody, baseDe } = require("./_pedido.js");
const { procesarPagoAprobado } = require("./_procesar.js");

// Motivos de rechazo de Mercado Pago, explicados para el cliente
const MOTIVOS = {
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_call_for_authorize: "Tenés que autorizar el pago con tu banco. Llamalos y volvé a intentar.",
  cc_rejected_card_disabled: "La tarjeta no está activa. Llamá a tu banco para activarla o usá otra.",
  cc_rejected_duplicated_payment: "Ya hiciste un pago igual hace un momento. Si lo necesitás, usá otra tarjeta.",
  cc_rejected_high_risk: "El pago fue rechazado por seguridad. Probá con otra tarjeta o pagá con tu cuenta de Mercado Pago.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Probá con otra tarjeta.",
  cc_rejected_invalid_installments: "Esa tarjeta no acepta esa cantidad de cuotas. Elegí otra.",
  cc_rejected_blacklist: "No pudimos procesar el pago. Probá con otra tarjeta.",
  cc_rejected_card_error: "No pudimos procesar el pago. Probá con otra tarjeta.",
  cc_rejected_other_reason: "Tu banco rechazó el pago. Probá con otra tarjeta."
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "Falta configurar la credencial de Mercado Pago." });

  let pedido, cobro;
  try {
    const body = leerBody(req);
    const t = body.tarjeta || {};
    if (!t.token || !t.payment_method_id) throw new Error("Faltan los datos de la tarjeta. Completalos de nuevo.");
    pedido = await armarPedido(body, baseDe(req));
    const doc = (t.payer && t.payer.identification) || {};
    const [nombre, ...apellido] = pedido.cliente.nombre.split(/\s+/);
    cobro = {
      transaction_amount: pedido.total,   // siempre el total calculado acá, no el que muestra el navegador
      token: String(t.token),
      description: `Pedido ${pedido.numero} - Nací Reina Calzados`,
      installments: Math.max(1, Number(t.installments) || 1),
      payment_method_id: String(t.payment_method_id),
      ...(t.issuer_id ? { issuer_id: String(t.issuer_id) } : {}),
      payer: {
        email: (t.payer && t.payer.email) || pedido.cliente.email,
        ...(doc.number ? { identification: { type: String(doc.type || "DNI"), number: String(doc.number) } } : {})
      },
      external_reference: pedido.numero,
      statement_descriptor: "NACI REINA",
      notification_url: pedido.notificationUrl,
      metadata: pedido.metadata,
      // Datos extra que ayudan a que Mercado Pago apruebe el pago
      additional_info: {
        items: pedido.items.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, unit_price: i.unit_price })),
        payer: { first_name: nombre, last_name: apellido.join(" "), phone: { number: pedido.cliente.telefono } }
      }
    };
  } catch (err) {
    return res.status(400).json({ error: err.message || "Revisá los datos del pedido." });
  }

  const r = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": pedido.numero },
    body: JSON.stringify(cobro)
  });
  const pago = await r.json().catch(() => ({}));
  if (!r.ok || !pago.id) {
    console.error("Mercado Pago no pudo crear el pago", r.status, JSON.stringify(pago).slice(0, 500));
    return res.status(502).json({ error: "No pudimos procesar el pago. Revisá los datos de la tarjeta o probá con otra." });
  }

  if (pago.status === "approved") {
    // Se procesa ya (pedido, envío y email); si después llega el aviso de Mercado Pago, no se repite
    try { await procesarPagoAprobado(pago); } catch (err) { console.error("No se pudo procesar el pago aprobado", pago.id, err.message); }
    return res.status(200).json({ estado: "aprobado", pedido: pedido.numero, total: pedido.total });
  }
  if (pago.status === "in_process" || pago.status === "pending") {
    return res.status(200).json({ estado: "pendiente", pedido: pedido.numero, total: pedido.total });
  }
  return res.status(200).json({ estado: "rechazado", error: MOTIVOS[pago.status_detail] || "El pago fue rechazado. Probá con otra tarjeta o pagá con tu cuenta de Mercado Pago." });
};
