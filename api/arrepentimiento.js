// Botón de arrepentimiento (Resolución 424/2020): el cliente pide cancelar su compra dentro de los 10 días.
// Se le da un código de trámite, se guarda la solicitud y se avisa al local por email.
const db = require("./_db.js");
const texto = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const s = { nombre: texto(b.nombre, 80), email: texto(b.email, 120), telefono: texto(b.telefono, 30), pedido: texto(b.pedido, 30), motivo: texto(b.motivo, 500) };
  if (!s.nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email) || !s.pedido) {
    return res.status(400).json({ error: "Completá tu nombre, email y número de pedido." });
  }
  s.codigo = "ARR-" + Date.now().toString(36).toUpperCase().slice(-6);
  s.fecha = new Date().toISOString();

  if (db.hayDB()) {
    try { await db.comando("LPUSH", "nacireina:arrepentimientos", JSON.stringify(s)); } catch (e) { console.error("No se guardó el arrepentimiento", e.message); }
  }
  if (process.env.RESEND_API_KEY && process.env.AVISOS_EMAIL) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Nací Reina <onboarding@resend.dev>",
        to: [process.env.AVISOS_EMAIL],
        subject: `Botón de arrepentimiento ${s.codigo} - pedido ${s.pedido}`,
        html: `<h2>Pedido de arrepentimiento ${esc(s.codigo)}</h2>
          <p>Un cliente pidió cancelar su compra. Tenés que devolverle el dinero (desde Mercado Pago) cuando te devuelva el producto sin uso.</p>
          <p><b>Pedido:</b> ${esc(s.pedido)}<br><b>Nombre:</b> ${esc(s.nombre)}<br><b>Email:</b> ${esc(s.email)}<br><b>Teléfono:</b> ${esc(s.telefono)}</p>
          <p><b>Motivo:</b> ${esc(s.motivo || "(no indicó)")}</p>`
      })
    }).catch(e => ({ ok: false, text: async () => e.message }));
    if (!r.ok) console.error("No se pudo avisar el arrepentimiento", await r.text());
  }
  return res.status(200).json({ codigo: s.codigo });
};
