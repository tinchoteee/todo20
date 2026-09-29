// Pedido con pago por transferencia bancaria (con el descuento de productos.js → transferencia).
// No cobra nada: guarda el pedido como "esperando transferencia", reserva los pares y le muestra al cliente
// los datos de la cuenta. Cuando el dueño ve la plata, lo pasa a "Pagado" desde el editor (ahí se crea el envío).
// Variables de entorno en Vercel: TRANSFERENCIA_ALIAS y/o TRANSFERENCIA_CBU, y TRANSFERENCIA_TITULAR.
const CATALOGO = require("../productos.js");
const db = require("./_db.js");
const { armarPedido, leerBody, baseDe } = require("./_pedido.js");
const { moverStock, mandarEmail, textoEntrega, esc, pesos } = require("./_procesar.js");

const datosCuenta = () => {
  const alias = String(process.env.TRANSFERENCIA_ALIAS || "").trim(), cbu = String(process.env.TRANSFERENCIA_CBU || "").trim();
  if (!alias && !cbu) return null;
  return { alias, cbu, titular: String(process.env.TRANSFERENCIA_TITULAR || "").trim(), banco: String(process.env.TRANSFERENCIA_BANCO || "").trim() };
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const cuenta = datosCuenta();
  if (!cuenta || !(Number((CATALOGO.transferencia || {}).porcentaje) >= 0)) return res.status(400).json({ error: "El pago por transferencia no está disponible. Elegí otro medio de pago." });
  if (!db.hayDB()) return res.status(503).json({ error: "No pudimos registrar el pedido. Probá con otro medio de pago." });

  // Máximo 5 pedidos por transferencia por hora desde la misma conexión (para que nadie reserve todo el stock)
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sin-ip";
  const n = await db.comando("INCR", "nacireina:transf:" + ip);
  if (n === 1) await db.comando("EXPIRE", "nacireina:transf:" + ip, 3600);
  if (n > 5) return res.status(429).json({ error: "Hiciste varios pedidos seguidos. Escribinos por WhatsApp y te ayudamos." });

  let pedido;
  try { pedido = await armarPedido(leerBody(req), baseDe(req), { transferencia: true }); }
  catch (err) { return res.status(400).json({ error: err.message || "Revisá los datos del pedido." }); }

  const m = pedido.metadata;
  const detalle = [...m.detalle, ...(m.descuento ? [`Descuento ${m.descuento}`] : [])];
  const registro = {
    numero: pedido.numero, fecha: new Date().toISOString(), total: pedido.total, metodo: "transferencia",
    cliente: pedido.cliente, detalle, estado: "esperando-transferencia",
    entrega: { ...pedido.entrega, zipnova: undefined },
    datos: { productos: m.productos, entrega: pedido.entrega, cliente: pedido.cliente, subtotal: m.subtotal },   // para crear el envío al confirmar
    stockReservado: true
  };
  const stock = await moverStock(m.productos, pedido.numero);   // se reservan los pares mientras espera el pago
  try { await db.agregarPedido(registro); }
  catch (err) {
    console.error("No se pudo guardar el pedido por transferencia", pedido.numero, err.message);
    await moverStock(m.productos, pedido.numero, -1);
    return res.status(500).json({ error: "No pudimos registrar el pedido. Probá de nuevo en un momento." });
  }
  console.log("Pedido por transferencia", pedido.numero, pedido.total);

  if (process.env.RESEND_API_KEY) {
    const lista = `<ul>${detalle.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`;
    const c = pedido.cliente;
    if (process.env.AVISOS_EMAIL) {
      await mandarEmail({
        para: process.env.AVISOS_EMAIL, clave: `transf-local-${pedido.numero}`,
        asunto: `Pedido por transferencia ${pedido.numero} - ${pesos(pedido.total)} (esperando pago)`,
        html: `<h2>Nuevo pedido por transferencia: ${esc(pedido.numero)}</h2>
          <p><b>Tiene que transferir:</b> ${pesos(pedido.total)}. Cuando veas la plata en tu cuenta, entrá al editor → Pedidos y pasalo a <b>"Pagado"</b> (ahí se crea el envío).</p>
          <p>Si en unos días no paga, pasalo a "Cancelado" y los pares vuelven solos al stock.</p>
          <h3>Productos</h3>${lista}
          ${stock.length ? `<h3>Stock reservado</h3><ul>${stock.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          <h3>Cliente</h3><p>${esc(c.nombre)}${c.dni ? " · DNI " + esc(c.dni) : ""}<br>Tel: ${esc(c.telefono)}<br>${esc(c.email)}</p>
          <h3>Entrega</h3><p>${textoEntrega(pedido.entrega)}</p>`
      });
    }
    if (process.env.RESEND_FROM && c.email) {
      await mandarEmail({
        para: c.email, clave: `transf-cliente-${pedido.numero}`,
        asunto: `Tu pedido ${pedido.numero} en Nací Reina: datos para transferir`,
        html: `<h2>¡Gracias, ${esc(String(c.nombre || "").split(" ")[0])}!</h2>
          <p>Tu pedido <b>${esc(pedido.numero)}</b> quedó reservado. Para confirmarlo, transferí <b>${pesos(pedido.total)}</b> a:</p>
          <p>${cuenta.alias ? `Alias: <b>${esc(cuenta.alias)}</b><br>` : ""}${cuenta.cbu ? `CBU/CVU: <b>${esc(cuenta.cbu)}</b><br>` : ""}${cuenta.titular ? `Titular: ${esc(cuenta.titular)}<br>` : ""}${cuenta.banco ? `Banco: ${esc(cuenta.banco)}` : ""}</p>
          <p>Después mandanos el comprobante por WhatsApp al ${esc(String(CATALOGO.whatsapp || "").replace(/^549/, ""))} o respondé este email.</p>
          ${lista}<p><b>Entrega:</b> ${textoEntrega(pedido.entrega)}</p>`
      });
    }
  }
  return res.status(200).json({ pedido: pedido.numero, total: pedido.total, cuenta });
};
module.exports.datosCuenta = datosCuenta;
