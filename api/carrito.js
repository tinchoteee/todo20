// Carritos abandonados: cuando alguien deja su email en el checkout y no termina la compra,
// a las 2 horas le llega UN email con lo que eligió y un botón para retomarla (como hacen las tiendas grandes).
// Si compra antes, el email se cancela (ver cancelarRecordatorio, lo llaman _procesar.js y transferencia.js).
// Un recordatorio por persona cada 7 días como máximo, y cada email trae un link para no recibir más.
//
// Necesita en Vercel: RESEND_API_KEY y RESEND_FROM (dominio propio verificado en Resend; sin eso no se le
// puede escribir a clientes) y la base de datos. Si falta algo, no hace nada.
//   CARRITO_RECORDATORIO = "no"  → apaga los recordatorios
const crypto = require("crypto");
const CATALOGO = require("../productos.js");
const aplicarAjustes = require("../ajustes.js");
const db = require("./_db.js");
const { productosActuales } = require("./_catalogo.js");

const WEB = "https://nacireinacalzados.com";
const MINUTOS = 120;
const DIAS_ENTRE_RECORDATORIOS = 7;
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
const limpio = email => String(email || "").trim().toLowerCase().slice(0, 120);
const clave = (tipo, email) => `nacireina:carrito:${tipo}:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
const activo = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM && db.hayDB() && process.env.CARRITO_RECORDATORIO !== "no");
// Firma del link de baja (para que nadie pueda dar de baja a otra persona)
const firma = email => crypto.createHmac("sha256", process.env.ADMIN_CLAVE || process.env.RESEND_API_KEY || "nacireina").update("baja:" + email).digest("hex").slice(0, 24);

async function resend(ruta, cuerpo) {
  const r = await fetch("https://api.resend.com" + ruta, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(8000)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

// Cancela el recordatorio pendiente de ese email (compró, o cambió el carrito). Nunca corta la venta.
async function cancelarRecordatorio(email, { compro = false } = {}) {
  email = limpio(email);
  if (!email || !db.hayDB() || !process.env.RESEND_API_KEY) return;
  try {
    const pendiente = await db.leer(clave("pendiente", email));
    if (pendiente && pendiente.id && Date.parse(pendiente.envio) > Date.now()) {
      await resend(`/emails/${encodeURIComponent(pendiente.id)}/cancel`);
      await db.comando("DEL", clave("pendiente", email));
    }
    // Si compró, se libera la espera de 7 días: un carrito nuevo más adelante puede tener su recordatorio
    if (compro) await db.comando("DEL", clave("pendiente", email));
  } catch (e) { console.error("No se pudo cancelar el recordatorio de carrito", e.message); }
}

function htmlRecordatorio({ nombre, lineas, link, baja }) {
  const e = CATALOGO.envio, t = CATALOGO.transferencia;
  const filas = lineas.map(l => `<tr>
      <td style="padding:8px 12px 8px 0;width:84px">${l.foto ? `<img src="${WEB}/${esc(l.foto)}" alt="" width="84" style="border-radius:10px;display:block">` : ""}</td>
      <td style="padding:8px 0;font-size:15px;line-height:1.4"><b>${esc(l.nombre)}</b><br>${l.color ? esc(l.color) + " · " : ""}Talle ${esc(l.talle)}${l.cant > 1 ? " · x" + l.cant : ""}<br>${l.precio > 0 ? pesos(l.precio) : ""}</td>
    </tr>`).join("");
  const beneficios = [
    t && t.porcentaje ? `${t.porcentaje}% OFF pagando con transferencia` : "",
    e && e.gratisDesde ? `Envío gratis desde ${pesos(e.gratisDesde)}` : "",
    "Cambios dentro de los 30 días"
  ].filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1F0A16;max-width:520px;margin:auto">
    <h2 style="font-size:24px;margin:0 0 8px">${nombre ? esc(nombre) + ", t" : "T"}u carrito te está esperando 👑</h2>
    <p style="font-size:16px;line-height:1.5;margin:0 0 14px">Dejaste esto en Nací Reina Calzados. Dejamos tu carrito listo para que termines la compra cuando quieras. Ojo: el stock es limitado.</p>
    <table style="border-collapse:collapse;width:100%">${filas}</table>
    <p style="margin:22px 0"><a href="${esc(link)}" style="background:#E0157F;color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;display:inline-block;font-size:16px">Terminar mi compra</a></p>
    <ul style="font-size:15px;line-height:1.6;padding-left:20px;margin:0 0 18px">${beneficios}</ul>
    <p style="font-size:14px;line-height:1.5">¿Tenés alguna duda con el talle o el envío? Respondé este email o escribinos por WhatsApp y te ayudamos.</p>
    <p style="font-size:12px;color:#6E4A5E;line-height:1.5;margin-top:26px">Nací Reina Calzados · ${esc(CATALOGO.local.direccion)}<br>
    Te escribimos porque dejaste tu email al iniciar una compra en nacireinacalzados.com. <a href="${esc(baja)}" style="color:#6E4A5E">No quiero recibir recordatorios</a>.</p>
  </div>`;
}

module.exports = async function handler(req, res) {
  // Las opiniones entran por acá (vercel.json manda /api/opiniones a esta función): el plan gratis de Vercel permite 12 funciones
  if ((req.query || {}).op === "opiniones") return require("./_opiniones.js")(req, res);
  // Link de baja del email
  if (req.method === "GET") {
    const q = req.query || {}, email = limpio(q.baja);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!email || q.f !== firma(email)) return res.status(400).send("<p>El link no es válido.</p>");
    if (db.hayDB()) { await db.guardar(clave("baja", email), { fecha: new Date().toISOString() }); await cancelarRecordatorio(email); }
    return res.status(200).send(`<div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;text-align:center"><h2>Listo</h2><p>No te vamos a mandar más recordatorios de carrito.</p><p><a href="${WEB}">Volver a Nací Reina</a></p></div>`);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!activo()) return res.status(200).json({ ok: true });

  const b = (typeof req.body === "object" && req.body) || {};
  const email = limpio(b.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(200).json({ ok: true });

  try {
    // Máximo 10 por hora desde la misma conexión (para que no se use para mandar emails a cualquiera)
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sin-ip";
    const n = await db.comando("INCR", "nacireina:carrito:ip:" + ip);
    if (n === 1) await db.comando("EXPIRE", "nacireina:carrito:ip:" + ip, 3600);
    if (n > 10) return res.status(200).json({ ok: true });

    if (await db.leer(clave("baja", email))) return res.status(200).json({ ok: true });

    const productos = await productosActuales();
    const lineas = [];
    for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 12)) {
      const p = productos.find(x => x.id === Number(it.id) && !x.oculto && !x.agotado);
      const talle = Number(it.talle);
      if (!p || !p.talles.includes(talle)) continue;
      const color = (p.colores || []).find(c => c.id === it.color);
      if (color && (color.agotado || color.sinTalle.includes(talle))) continue;
      const cant = Math.max(1, Math.min(10, parseInt(it.cant, 10) || 1));
      lineas.push({ id: p.id, colorId: color ? color.id : "", nombre: p.nombre, color: color ? color.nombre : "", talle, cant,
        precio: color ? aplicarAjustes.precioDe(p, color.id) : (p.precio || 0), foto: (color && color.foto) || p.foto || "" });
    }
    if (!lineas.length) return res.status(200).json({ ok: true });

    const pendiente = await db.leer(clave("pendiente", email));
    if (pendiente) {
      // Ya se le mandó uno hace poco: no se insiste
      if (Date.parse(pendiente.envio) <= Date.now()) return res.status(200).json({ ok: true });
      // Todavía no salió: se reemplaza por el carrito actual
      if (pendiente.id) await resend(`/emails/${encodeURIComponent(pendiente.id)}/cancel`).catch(() => {});
    }

    const envio = new Date(Date.now() + MINUTOS * 60000).toISOString();
    const carrito = lineas.map(l => [l.id, l.colorId, l.talle, l.cant].join(".")).join(",");
    const link = `${WEB}/?carrito=${encodeURIComponent(carrito)}&utm_source=email&utm_medium=email&utm_campaign=carrito`;
    const baja = `${WEB}/api/carrito?baja=${encodeURIComponent(email)}&f=${firma(email)}`;
    const nombre = String(b.nombre || "").trim().split(/\s+/)[0].slice(0, 30);
    const d = await resend("/emails", {
      from: process.env.RESEND_FROM, to: [email], scheduled_at: envio,
      subject: "Tu carrito te está esperando en Nací Reina 👑",
      html: htmlRecordatorio({ nombre, lineas, link, baja }),
      ...(process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}),
      headers: { "List-Unsubscribe": `<${baja}>` }
    });
    await db.comando("SET", clave("pendiente", email), JSON.stringify({ id: d.id, envio }), "EX", DIAS_ENTRE_RECORDATORIOS * 86400);
  } catch (e) { console.error("Recordatorio de carrito", e.message); }
  return res.status(200).json({ ok: true });
};

module.exports.cancelarRecordatorio = cancelarRecordatorio;
module.exports.interno = { htmlRecordatorio, firma };
