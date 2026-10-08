// Opiniones de compradores (solo de compras reales).
// Unos días después de cada compra pagada, al cliente le llega un email con un link firmado para opinar
// (pedirOpinion, lo llama _procesar.js). Una opinión por pedido. Se publican en la página del producto.
// Al dueño le llega cada opinión por email, con un link para ocultarla si es spam o un insulto.
//
//   GET                         → { opiniones: [{ nombre, estrellas, texto, fecha, productos: [ids] }] }
//   POST { numero, ids, k, estrellas, texto, nombre } → guarda la opinión (k = firma del link)
//   GET ?ocultar=NUMERO&f=FIRMA → la oculta (link del email del dueño)
//
// Necesita la base de datos; el email al cliente, además, RESEND_API_KEY + RESEND_FROM.
//   OPINIONES_PEDIR = "no" → no se mandan los emails pidiendo opinión
const crypto = require("crypto");
const CATALOGO = require("../productos.js");
const db = require("./_db.js");

const WEB = "https://nacireinacalzados.com";
const CLAVE = "nacireina:opiniones";
const DIAS_ENVIO = 10, DIAS_RETIRO = 3;   // cuánto se espera para pedir la opinión
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firma = texto => crypto.createHmac("sha256", process.env.ADMIN_CLAVE || process.env.RESEND_API_KEY || "nacireina").update(String(texto)).digest("hex").slice(0, 24);
const idsValidos = ids => [...new Set(String(ids || "").split("-").map(Number).filter(n => CATALOGO.productos.some(p => p.id === n)))].slice(0, 12);

async function mandar(cuerpo) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// Programa el email que le pide la opinión al cliente. Nunca corta la venta.
async function pedirOpinion({ numero, email, nombre, productos, retiro }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !email || !db.hayDB() || process.env.OPINIONES_PEDIR === "no") return;
  try {
    const ids = idsValidos((Array.isArray(productos) ? productos : []).map(p => p.id).join("-"));
    if (!ids.length) return;
    const lista = ids.join("-");
    const link = `${WEB}/?opinar=${encodeURIComponent(numero)}&ids=${lista}&k=${firma(`opinar:${numero}:${lista}`)}&utm_source=email&utm_medium=email&utm_campaign=opinion`;
    const nombres = ids.map(id => CATALOGO.productos.find(p => p.id === id).nombre);
    const primero = String(nombre || "").trim().split(/\s+/)[0].slice(0, 30);
    await mandar({
      from: process.env.RESEND_FROM, to: [email],
      scheduled_at: new Date(Date.now() + (retiro ? DIAS_RETIRO : DIAS_ENVIO) * 86400000).toISOString(),
      subject: "¿Cómo te quedó tu compra en Nací Reina? 👑",
      ...(process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}),
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#1F0A16;max-width:520px;margin:auto">
        <h2 style="font-size:24px;margin:0 0 8px">${primero ? esc(primero) + ", ¿c" : "¿C"}ómo te quedó?</h2>
        <p style="font-size:16px;line-height:1.5">Gracias por comprar en Nací Reina Calzados (${esc(nombres.join(", "))}). Contanos en un minuto qué te pareció: tu opinión ayuda a otras personas a elegir.</p>
        <p style="margin:22px 0"><a href="${esc(link)}" style="background:#E0157F;color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block;font-size:16px">Dejar mi opinión</a></p>
        <p style="font-size:14px;line-height:1.5">Si tuviste algún problema con tu pedido, respondé este email y lo resolvemos.</p>
        <p style="font-size:12px;color:#6E4A5E;margin-top:26px">Nací Reina Calzados · ${esc(CATALOGO.local.direccion)}<br>Es el único email que te mandamos por esta compra para pedirte tu opinión.</p>
      </div>`
    });
  } catch (e) { console.error("No se pudo programar el pedido de opinión", numero, e.message); }
}

async function listar() {
  if (!db.hayDB()) return [];
  const plano = await db.comando("HGETALL", CLAVE) || [];
  const valores = Array.isArray(plano) ? plano.filter((_, i) => i % 2) : Object.values(plano);
  return valores.map(v => { try { return JSON.parse(v); } catch (e) { return null; } })
    .filter(o => o && !o.oculta)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .map(({ nombre, estrellas, texto, fecha, productos }) => ({ nombre, estrellas, texto, fecha, productos }));
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  try {
    if (req.method === "GET" && q.ocultar) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const numero = String(q.ocultar);
      if (q.f !== firma("ocultar:" + numero) || !db.hayDB()) return res.status(400).send("<p>El link no es válido.</p>");
      const actual = await db.comando("HGET", CLAVE, numero);
      if (actual) await db.comando("HSET", CLAVE, numero, JSON.stringify({ ...JSON.parse(actual), oculta: true }));
      return res.status(200).send(`<div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;text-align:center"><h2>Listo</h2><p>Esa opinión ya no se muestra en la página.</p></div>`);
    }
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      return res.status(200).json({ opiniones: await listar() });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    if (!db.hayDB()) return res.status(503).json({ error: "No pudimos guardar tu opinión. Probá más tarde." });

    const b = (typeof req.body === "object" && req.body) || {};
    const numero = String(b.numero || "").slice(0, 60), ids = idsValidos(b.ids);
    if (!numero || !ids.length || b.k !== firma(`opinar:${numero}:${ids.join("-")}`)) return res.status(400).json({ error: "El link para opinar no es válido. Abrilo de nuevo desde el email." });
    const estrellas = Math.round(Number(b.estrellas));
    if (!(estrellas >= 1 && estrellas <= 5)) return res.status(400).json({ error: "Elegí de 1 a 5 estrellas." });
    const texto = String(b.texto || "").replace(/\s+/g, " ").trim().slice(0, 600);
    const nombre = String(b.nombre || "").replace(/[^\p{L} .'-]/gu, "").trim().split(/\s+/)[0].slice(0, 30) || "Cliente";
    const opinion = { numero, nombre, estrellas, texto, fecha: new Date().toISOString(), productos: ids };
    if (!(await db.comando("HSETNX", CLAVE, numero, JSON.stringify(opinion)))) return res.status(400).json({ error: "Ya recibimos tu opinión de esta compra. ¡Gracias!" });

    if (process.env.RESEND_API_KEY && process.env.AVISOS_EMAIL) {
      await mandar({
        from: process.env.RESEND_FROM || "Nací Reina <onboarding@resend.dev>", to: [process.env.AVISOS_EMAIL],
        subject: `Nueva opinión: ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)} de ${nombre}`,
        html: `<p><b>${esc(nombre)}</b> opinó sobre el pedido ${esc(numero)}: ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)}</p><p>${esc(texto) || "(sin comentario)"}</p>
          <p>Ya se muestra en la página del producto. Solo si es spam o un insulto: <a href="${WEB}/api/opiniones?ocultar=${encodeURIComponent(numero)}&f=${firma("ocultar:" + numero)}">ocultarla</a>.</p>`
      }).catch(e => console.error("Email de opinión", e.message));
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Opiniones", e.message);
    return res.status(500).json({ error: "Algo salió mal. Probá de nuevo en un momento." });
  }
};

module.exports.pedirOpinion = pedirOpinion;
