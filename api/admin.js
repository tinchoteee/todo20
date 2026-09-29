// Editor de la tienda (lo usa admin.html). Todo, menos "entrar", necesita el permiso de login.
//   POST { accion: "entrar", clave }                → { permiso }
//   GET                                               → { ajustes, pedidos, config }
//   POST { accion: "guardar", ajustes }              → guarda precios y agotados
//   POST { accion: "estado", numero, estado }        → marca un pedido (ej: "entregado")
const CATALOGO = require("../productos.js");
const db = require("./_db.js");
const { login, permisoValido } = require("./_admin.js");
const { leerAjustes, olvidarCache } = require("./_catalogo.js");

const ESTADOS = ["pagado", "envio-creado", "despachado", "listo-para-retirar", "entregado", "cancelado"];

// Deja solo datos válidos: productos, colores y talles que existen, precios razonables
function limpiarAjustes(entrada) {
  const salida = { productos: {} };
  const ent = (entrada && entrada.productos) || {};
  for (const p of CATALOGO.productos) {
    const a = ent[p.id]; if (!a) continue;
    const r = {};
    const precio = Math.round(Number(a.precio));
    if (precio > 0 && precio <= 10000000) r.precio = precio;
    if (a.agotado) r.agotado = true;
    const colores = {};
    for (const c of p.colores || []) {
      const ac = a.colores && a.colores[c.id]; if (!ac) continue;
      const rc = {};
      const precioColor = Math.round(Number(ac.precio));
      if (precioColor > 0 && precioColor <= 10000000) rc.precio = precioColor;
      if (ac.agotado) rc.agotado = true;
      const sin = (Array.isArray(ac.sinTalle) ? ac.sinTalle : []).map(Number).filter(t => p.talles.includes(t));
      if (sin.length) rc.sinTalle = [...new Set(sin)].sort((x, y) => x - y);
      if (Object.keys(rc).length) colores[c.id] = rc;
    }
    if (Object.keys(colores).length) r.colores = colores;
    if (Object.keys(r).length) salida.productos[p.id] = r;
  }
  return salida;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    if (req.method === "POST" && body.accion === "entrar") {
      return res.status(200).json({ permiso: await login(req, String(body.clave || "")) });
    }
    if (!permisoValido(req)) return res.status(401).json({ error: "Tu sesión venció. Volvé a entrar." });

    if (req.method === "GET") {
      return res.status(200).json({
        ajustes: await leerAjustes(),
        pedidos: await db.listarPedidos(),
        config: {
          baseDeDatos: db.hayDB(),
          mercadoPago: Boolean(process.env.MP_ACCESS_TOKEN),
          tarjetaEnPagina: Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_PUBLIC_KEY),
          zipnova: Boolean(process.env.ZIPNOVA_API_TOKEN && process.env.ZIPNOVA_API_SECRET && process.env.ZIPNOVA_ACCOUNT_ID),
          envioAutomatico: process.env.ZIPNOVA_CREAR_ENVIOS !== "no",
          emails: Boolean(process.env.RESEND_API_KEY && process.env.AVISOS_EMAIL)
        }
      });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    if (!db.hayDB()) return res.status(503).json({ error: "Falta conectar la base de datos (Upstash) en Vercel para guardar cambios." });

    if (body.accion === "guardar") {
      const ajustes = limpiarAjustes(body.ajustes);
      await db.guardar("nacireina:ajustes", ajustes);
      olvidarCache();
      return res.status(200).json({ ok: true, ajustes });
    }
    if (body.accion === "estado") {
      if (!ESTADOS.includes(body.estado)) return res.status(400).json({ error: "Estado desconocido." });
      const ok = await db.actualizarPedido(String(body.numero), { estado: body.estado });
      return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ error: "No encontré ese pedido." });
    }
    return res.status(400).json({ error: "Acción desconocida." });
  } catch (e) {
    if (!e.status) console.error("Error en el editor", e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Algo salió mal. Probá de nuevo." });
  }
};
