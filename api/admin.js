// Editor de la tienda (lo usa admin.html). Todo, menos "entrar", necesita el permiso de login.
//   POST { accion: "entrar", clave }                → { permiso }
//   GET                                               → { ajustes, pedidos, config }
//   POST { accion: "guardar", ajustes, pares }       → guarda precios, agotados y los pares por talle que cambiaron
//   POST { accion: "estado", numero, estado }        → marca un pedido (ej: "entregado")
const CATALOGO = require("../productos.js");
const db = require("./_db.js");
const { login, permisoValido } = require("./_admin.js");
const { leerAjustes, olvidarCache } = require("./_catalogo.js");

const { moverStock, crearEnvioZipnova } = require("./_procesar.js");

const ESTADOS = ["esperando-transferencia", "pagado", "envio-creado", "despachado", "listo-para-retirar", "entregado", "cancelado"];

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

// Pares por talle: solo claves "id|color|talle" que existen; número de 0 a 9999, o null para dejar de contar
function limpiarPares(entrada) {
  const salida = {};
  for (const [k, v] of Object.entries(entrada || {}).slice(0, 2000)) {
    const [id, cid, t] = String(k).split("|");
    const p = CATALOGO.productos.find(x => x.id === Number(id));
    if (!p || !(p.colores || []).some(c => c.id === cid) || !p.talles.includes(Number(t))) continue;
    if (v == null || v === "") { salida[`${p.id}|${cid}|${Number(t)}`] = null; continue; }
    const n = parseInt(v, 10);
    if (n >= 0 && n <= 9999) salida[`${p.id}|${cid}|${Number(t)}`] = n;
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
          zipnovaError: await db.leer("nacireina:zipnova-error"),   // último error al cotizar (null = anda bien)
          emails: Boolean(process.env.RESEND_API_KEY && process.env.AVISOS_EMAIL),
          transferencia: Boolean(process.env.TRANSFERENCIA_ALIAS || process.env.TRANSFERENCIA_CBU)
        }
      });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    if (!db.hayDB()) return res.status(503).json({ error: "Falta conectar la base de datos (Upstash) en Vercel para guardar cambios." });

    if (body.accion === "guardar") {
      const ajustes = limpiarAjustes(body.ajustes);
      await db.guardar("nacireina:ajustes", ajustes);
      await db.cambiarPares(limpiarPares(body.pares));   // solo los talles que se tocaron: no pisa ventas recientes
      olvidarCache();
      return res.status(200).json({ ok: true, ajustes, pares: await db.leerPares() });
    }
    if (body.accion === "estado") {
      if (!ESTADOS.includes(body.estado)) return res.status(400).json({ error: "Estado desconocido." });
      const numero = String(body.numero);
      const pedido = await db.buscarPedido(numero);
      if (!pedido) return res.status(404).json({ error: "No encontré ese pedido." });
      const cambios = { estado: body.estado };
      let aviso = "";
      if (pedido.metodo === "transferencia") {
        // Cancelado: los pares reservados vuelven al stock (una sola vez)
        if (body.estado === "cancelado" && pedido.stockReservado) {
          await moverStock(pedido.datos && pedido.datos.productos, numero, -1);
          cambios.stockReservado = false;
          aviso = "Los pares volvieron al stock.";
        }
        // Si se reactiva un pedido cancelado, se vuelven a reservar
        if (body.estado !== "cancelado" && pedido.estado === "cancelado" && pedido.stockReservado === false) {
          await moverStock(pedido.datos && pedido.datos.productos, numero);
          cambios.stockReservado = true;
        }
        // Pagado: se crea el envío en Zipnova, igual que con Mercado Pago
        const conZipnova = process.env.ZIPNOVA_API_TOKEN && process.env.ZIPNOVA_API_SECRET && process.env.ZIPNOVA_ACCOUNT_ID;
        const d = pedido.datos || {};
        if (body.estado === "pagado" && !pedido.envio && d.entrega && d.entrega.tipo !== "local" && d.entrega.zipnova && conZipnova && process.env.ZIPNOVA_CREAR_ENVIOS !== "no") {
          try {
            cambios.envio = await crearEnvioZipnova(numero, d);
            cambios.estado = "envio-creado"; cambios.envioError = undefined;
            aviso = "Envío creado en Zipnova.";
          } catch (err) {
            console.error("No se pudo crear el envío en Zipnova", numero, err.message);
            cambios.envioError = "No se pudo crear el envío automáticamente: crealo desde el panel de Zipnova.";
            aviso = cambios.envioError;
          }
        }
      }
      await db.actualizarPedido(numero, cambios);
      return res.status(200).json({ ok: true, pedido: { ...pedido, ...cambios }, aviso });
    }
    return res.status(400).json({ error: "Acción desconocida." });
  } catch (e) {
    if (!e.status) console.error("Error en el editor", e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Algo salió mal. Probá de nuevo." });
  }
};
