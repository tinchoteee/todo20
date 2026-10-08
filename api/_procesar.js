// Procesa un pago aprobado de Mercado Pago (lo usan el aviso de Mercado Pago y el pago con tarjeta en la página):
//   1. Guarda el pedido (se ve en el editor, pestaña Pedidos).
//   2. Crea el envío en Zipnova (Correo Argentino / OCA), que genera la etiqueta y coordina el retiro.
//   3. Avisa por email al local (y al cliente, si hay un dominio propio configurado).
// Es seguro llamarla más de una vez con el mismo pago: se procesa una sola vez (hace falta la base de datos).
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
    // Si el cliente responde el email, la respuesta le llega al local (AVISOS_EMAIL)
    body: JSON.stringify({ from: process.env.RESEND_FROM || "Nací Reina <onboarding@resend.dev>", to: [para], subject: asunto, html,
      ...(process.env.AVISOS_EMAIL && para !== process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}) })
  });
  if (!r.ok) console.error("No se pudo mandar el email", para, r.status, await r.text());
}

function textoEntrega(e) {
  if (e.tipo === "local") return `Retiro en el local (${CATALOGO.local.direccion})`;
  if (e.tipo === "sucursal") return `${e.opcion}: <b>${esc(e.sucursal)}</b>`;
  return `${esc(e.opcion)}:<br>${esc(e.calle)} ${esc(e.numero)}${e.piso ? " " + esc(e.piso) : ""}<br>${esc(e.localidad)}, ${esc(e.provincia)} (CP ${esc(e.cp)})`;
}

// Descuenta del stock los pares vendidos (solo talles que llevan la cuenta). signo -1 = devolverlos.
// Devuelve las líneas de texto "X, talle 38: quedan 2 pares" para el email.
async function moverStock(productos, numero, signo = 1) {
  const stock = [];
  if (!db.hayDB()) return stock;
  for (const it of Array.isArray(productos) ? productos : []) {
    if (it.talle == null || it.talle === "") continue;
    try {
      const clave = `${Number(it.id)}|${it.color || ""}|${Number(it.talle)}`;
      const cant = Math.max(1, Number(it.cant) || 1);
      const quedan = signo > 0 ? await db.descontarPares(clave, cant) : await db.devolverPares(clave, cant);
      if (quedan == null) continue;
      const p = CATALOGO.productos.find(x => x.id === Number(it.id)) || {};
      const c = (p.colores || []).find(x => x.id === it.color);
      stock.push(`${p.nombre || "Producto " + it.id}${c ? " " + c.nombre : ""}, talle ${it.talle}: ${quedan === 0 ? "se agotó" : quedan === 1 ? "queda 1 par" : `quedan ${quedan} pares`}`);
    } catch (err) { console.error("No se pudo mover el stock", numero, it, err.message); }
  }
  if (stock.length) require("./_catalogo.js").olvidarCache();
  return stock;
}

async function procesarPagoAprobado(pago) {
  // Mercado Pago puede avisar varias veces del mismo pago: se procesa una sola vez
  if (db.hayDB() && !(await db.guardarSiNoExiste(`nacireina:pago:${pago.id}`, { fecha: new Date().toISOString() }))) {
    return false;
  }

  const m = pago.metadata || {};
  const cliente = m.cliente || {};
  const entrega = m.entrega || {};
  const detalle = [...(Array.isArray(m.detalle) ? m.detalle : []), ...(m.descuento ? [`Descuento ${m.descuento}`] : [])];
  const numero = m.pedido || pago.external_reference || String(pago.id);
  const pedido = {
    numero, pagoId: pago.id, fecha: new Date().toISOString(), total: pago.transaction_amount,
    cliente, detalle, estado: "pagado",
    entrega: { ...entrega, zipnova: undefined }
  };
  console.log("Pago aprobado", numero, pago.id, pago.transaction_amount);

  // Descuenta los pares vendidos (solo de los talles que llevan la cuenta) y arma el aviso de stock
  const stock = await moverStock(m.productos, numero);

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

  // Si tenía un recordatorio de carrito pendiente, ya no hace falta
  if (cliente.email) await require("./carrito.js").cancelarRecordatorio(cliente.email, { compro: true });

  if (process.env.RESEND_API_KEY) {
    const lista = `<ul>${detalle.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`;
    let aviso = "";
    if (entrega.tipo === "local") aviso = "<p>👉 Prepará el pedido: lo retira en el local.</p>";
    else if (pedido.envio) aviso = `<p>✅ <b>Envío creado en Zipnova</b>${pedido.envio.seguimiento ? " (seguimiento: " + esc(pedido.envio.seguimiento) + ")" : ""}. Imprimí la etiqueta desde el panel de Zipnova, pegala en la caja y entregala cuando pase el correo (o llevala a una sucursal).</p>`;
    else aviso = `<p>⚠️ ${esc(pedido.envioError || "Creá el envío desde el panel de Zipnova con estos datos.")}</p>`;

    if (process.env.AVISOS_EMAIL) {
      await mandarEmail({
        para: process.env.AVISOS_EMAIL, clave: `local-${pago.id}`,
        asunto: `Nueva venta ${numero} - ${pesos(pago.transaction_amount)}`,
        html: `<h2>Nueva venta: ${esc(numero)}</h2>
          <p><b>Cobrado:</b> ${pesos(pago.transaction_amount)} · Pago de Mercado Pago N° ${esc(pago.id)}</p>
          ${aviso}
          <h3>Productos</h3>${lista}
          ${stock.length ? `<h3>Stock después de esta venta</h3><ul>${stock.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
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
          <p>${entrega.tipo === "local" ? "Te avisamos cuando esté listo para retirar." : "Te vamos a mandar el número de seguimiento del correo cuando lo despachemos."}</p>
          <p>Cualquier consulta, respondé este email o escribinos por WhatsApp.<br>Nací Reina Calzados · ${esc(CATALOGO.local.direccion)}</p>`
      });
    }
  }
  return true;
}

module.exports = { procesarPagoAprobado, moverStock, crearEnvioZipnova, mandarEmail, textoEntrega, esc, pesos };
