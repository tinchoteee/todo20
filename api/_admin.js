// Acceso al editor. La contraseña se define en Vercel con la variable ADMIN_CLAVE.
// Al entrar se entrega un permiso firmado que dura 12 horas (si cambiás la contraseña, deja de valer).
const crypto = require("crypto");
const db = require("./_db.js");

const DURACION = 12 * 60 * 60 * 1000;
const firma = (texto) => crypto.createHmac("sha256", "nacireina:" + process.env.ADMIN_CLAVE).update(texto).digest("base64url");

function igual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function crearPermiso() {
  const vence = String(Date.now() + DURACION);
  return `${vence}.${firma(vence)}`;
}

function permisoValido(req) {
  if (!process.env.ADMIN_CLAVE) return false;
  const h = String(req.headers.authorization || "");
  const [vence, f] = h.replace(/^Bearer\s+/i, "").split(".");
  return Boolean(vence && f && Number(vence) > Date.now() && igual(f, firma(vence)));
}

// Máximo 10 contraseñas equivocadas cada 15 minutos por conexión
const claveIntentos = req => "nacireina:intentos:" + (String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sin-ip");

async function login(req, clave) {
  if (!process.env.ADMIN_CLAVE) throw Object.assign(new Error("Falta configurar ADMIN_CLAVE en Vercel."), { status: 500 });
  if (db.hayDB() && Number(await db.comando("GET", claveIntentos(req)) || 0) >= 10) {
    throw Object.assign(new Error("Demasiados intentos. Esperá 15 minutos."), { status: 429 });
  }
  if (!igual(clave, process.env.ADMIN_CLAVE)) {
    if (db.hayDB()) {
      const n = await db.comando("INCR", claveIntentos(req));
      if (n === 1) await db.comando("EXPIRE", claveIntentos(req), 900);
    }
    throw Object.assign(new Error("Contraseña incorrecta."), { status: 401 });
  }
  return crearPermiso();
}

module.exports = { login, permisoValido };
