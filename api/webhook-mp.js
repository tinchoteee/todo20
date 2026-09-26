// Mercado Pago llama a esta dirección cada vez que cambia un pago. Cuando un pago queda aprobado:
//   1. Guarda el pedido (se ve en el editor, pestaña Pedidos).
//   2. Crea el envío de Andreani en Zipnova, que genera la etiqueta y coordina el retiro.
//   3. Avisa por email al local (y al cliente, si hay un dominio propio configurado).
//
// Variables de entorno en Vercel:
//   MP_ACCESS_TOKEN (obligatoria)
//   ZIPNOVA_* (ver _envios.js)  ·  ZIPNOVA_CREAR_ENVIOS = "no" para crear los envíos a mano
//   RESEND_API_KEY + AVISOS_EMAIL  → email al local con cada venta
//   RESEND_FROM (opcional, ej: "Nací Reina <ventas@nacireina.com.ar>") → también se le escribe al cliente
const CATALOGO = require("../productos.js");
const db = require("./_db.js");

const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = n => "$" + Number(n || 0).toLocaleString("es-AR");

async function crearEnvioZipnova(numero, m) {
  const e = m.entrega || {}, c = m.cliente || {};
  const auth = Buffer.from(`${process.env.ZIPNOVA_API_TOKEN}:${process.env.ZIPNOVA_API_SECRET}`).toString("base64");
  const items = [];
  for (const { id, cant } of m.productos || []) {
    const p = CATALOGO.productos.find(x => x.id === Number(id)); if (!p) continue;
    const caja = CATALOGO.envio.cajas[p.caja] || CATALOGO.envio.cajas[p.cat] || CATALOGO.envio.cajas.botas;
    for (let i = 0; i < Number(cant || 1); i++) items.push({ sku: String(p.id), description: p.nombre, weight: caja.peso, height: caja.alto, width: caja.ancho, length: caja.largo });
  }
  const destino = {
    name: c.nombre, document: String(c.dni || "").replace(/\D/g, ""), email: c.email || process.env.AVISOS_EMAIL, phone: c.telefono,
    city: e.localidad, state: e.provincia, zipcode: e.cp
  };
  if (e.tipo === "domicilio") Object.assign(destino, { street: e.calle, street_number: e.numero, street_extras: e.piso || undefined });
  if (e.tipo === "sucursal") destino.point_id = Number(e.sucursal_id) || e.sucursal_id;
  const body = {
    account_id: Number(process.env.ZIPNOVA_ACCOUNT_ID),
    origin_id: process.env.ZIPNOVA_ORIGIN_ID || "auto",
    external_id: numero.slice(0, 30),
    source: "nacireina-web",
    declared_value: Number(m.subtotal) || 0,
    service_type: e.zipnova && e.zipnova.service_type,
    logistic_type: e.zipnova && e.zipnova.logistic_type,
    carrier_id: e.zipnova && e.zipnova.carrier_id,
    process_immediately: process.env.ZIPNOVA_PROCESAR === "no" ? 0 : 1,
    type_packaging: "none",
    destination: destino,
    items
  };
  const r = await fetch("https://api.zipnova.com.ar/v2/shipments", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Zipnova respondió ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return { id: d.id, seguimiento: d.tracking || d.carrier_tracking_id || null, codigoCorreo: d.carrier_tracking_id || null };
}

async function mandarEmail({ para, asunto, html, clave }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": clave },
    body: JSON.stringify({ from: process.env.RESEND_FROM || "Nací Reina <onboarding@resend.dev>", to: [para], subject: asunto, html })
  });
  if (!r.ok) console.error("No se pudo mandar el email", para, r.status, await r.text());
}

function textoEntrega(e) {
  if (e.tipo === "local") return `Retiro en el local (${CATALOGO.local.direccion})`;
  if (e.tipo === "sucursal") return `${e.opcion}: <b>${esc(e.sucursal)}</b>`;
  return `${esc(e.opcion)}:<br>${esc(e.calle)} ${esc(e.numero)}${e.piso ? " " + esc(e.piso) : ""}<br>${esc(e.localidad)}, ${esc(e.provincia)} (CP ${esc(e.cp)})`;
}

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

  // Mercado Pago puede avisar varias veces del mismo pago: se procesa una sola vez
  if (db.hayDB() && !(await db.guardarSiNoExiste(`nacireina:pago:${pago.id}`, { fecha: new Date().toISOString() }))) {
    return res.status(200).send("ya procesado");
  }

  const m = pago.metadata || {};
  const cliente = m.cliente || {};
  const entrega = m.entrega || {};
  const detalle = Array.isArray(m.detalle) ? m.detalle : [];
  const numero = m.pedido || pago.external_reference || String(pago.id);
  const pedido = {
    numero, pagoId: pago.id, fecha: new Date().toISOString(), total: pago.transaction_amount,
    cliente, detalle, estado: "pagado",
    entrega: { ...entrega, zipnova: undefined }
  };
  console.log("Pago aprobado", numero, pago.id, pago.transaction_amount);

  // Envío automático (solo con base de datos, para no crear nunca dos envíos del mismo pedido)
  const conZipnova = process.env.ZIPNOVA_API_TOKEN && process.env.ZIPNOVA_API_SECRET && process.env.ZIPNOVA_ACCOUNT_ID;
  if (entrega.tipo !== "local" && entrega.zipnova && conZipnova && db.hayDB() && process.env.ZIPNOVA_CREAR_ENVIOS !== "no") {
    try {
      const envio = await crearEnvioZipnova(numero, m);
      Object.assign(pedido, { estado: "envio-creado", envio });
    } catch (err) {
      console.error("No se pudo crear el envío en Zipnova", numero, err.message);
      pedido.envioError = "No se pudo crear el envío automáticamente: crealo desde el panel de Zipnova.";
    }
  }

  if (db.hayDB()) {
    try { await db.agregarPedido(pedido); } catch (err) { console.error("No se pudo guardar el pedido", numero, err.message); }
  }

  if (process.env.RESEND_API_KEY) {
    const lista = `<ul>${detalle.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`;
    let aviso = "";
    if (entrega.tipo === "local") aviso = "<p>👉 Prepará el pedido: lo retira en el local.</p>";
    else if (pedido.envio) aviso = `<p>✅ <b>Envío creado en Zipnova</b>${pedido.envio.seguimiento ? " (seguimiento: " + esc(pedido.envio.seguimiento) + ")" : ""}. Imprimí la etiqueta desde el panel de Zipnova, pegala en la caja y entregala cuando pase Andreani (o llevala a una sucursal).</p>`;
    else aviso = `<p>⚠️ ${esc(pedido.envioError || "Creá el envío desde el panel de Zipnova con estos datos.")}</p>`;

    if (process.env.AVISOS_EMAIL) {
      await mandarEmail({
        para: process.env.AVISOS_EMAIL, clave: `local-${pago.id}`,
        asunto: `Nueva venta ${numero} - ${pesos(pago.transaction_amount)}`,
        html: `<h2>Nueva venta: ${esc(numero)}</h2>
          <p><b>Cobrado:</b> ${pesos(pago.transaction_amount)} · Pago de Mercado Pago N° ${esc(pago.id)}</p>
          ${aviso}
          <h3>Productos</h3>${lista}
          <h3>Cliente</h3><p>${esc(cliente.nombre)}${cliente.dni ? " · DNI " + esc(cliente.dni) : ""}<br>Tel: ${esc(cliente.telefono)}${cliente.email ? "<br>" + esc(cliente.email) : ""}</p>
          <h3>Entrega</h3><p>${textoEntrega(entrega)}</p>`
      });
    }
    // Al cliente solo se le puede escribir con un dominio propio verificado en Resend
    if (process.env.RESEND_FROM && cliente.email) {
      await mandarEmail({
        para: cliente.email, clave: `cliente-${pago.id}`,
        asunto: `¡Gracias por tu compra en Nací Reina! Pedido ${numero}`,
        html: `<h2>¡Gracias por tu compra, ${esc(String(cliente.nombre || "").split(" ")[0])}!</h2>
          <p>Recibimos tu pago de <b>${pesos(pago.transaction_amount)}</b>. Tu número de pedido es <b>${esc(numero)}</b>.</p>
          ${lista}
          <p><b>Entrega:</b> ${textoEntrega(entrega)}</p>
          <p>${entrega.tipo === "local" ? "Te avisamos cuando esté listo para retirar." : "Te vamos a mandar el número de seguimiento de Andreani cuando lo despachemos."}</p>
          <p>Cualquier consulta, respondé este email o escribinos por WhatsApp.<br>Nací Reina Calzados · ${esc(CATALOGO.local.direccion)}</p>`
      });
    }
  }
  return res.status(200).send("ok");
};
