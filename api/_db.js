// Base de datos chiquita (Upstash Redis, gratis) para guardar el stock, los precios editados y los pedidos.
// Se conecta sola si en Vercel agregás la integración "Upstash for Redis" (crea estas variables):
//   KV_REST_API_URL y KV_REST_API_TOKEN   (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN)
// Si al conectarla se eligió otro prefijo (ej. STORAGE_KV_REST_API_URL), también la encuentra.
const variable = (...finales) => {
  for (const f of finales) if (process.env[f]) return process.env[f];
  for (const f of finales) { const k = Object.keys(process.env).find(n => n.endsWith("_" + f) && process.env[n]); if (k) return process.env[k]; }
  return undefined;
};
const URL_DB = () => variable("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL", "REST_API_URL");
const TOKEN_DB = () => variable("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "REST_API_TOKEN");

const hayDB = () => Boolean(URL_DB() && TOKEN_DB());

async function comando(...args) {
  const r = await fetch(URL_DB(), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN_DB()}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("Base de datos: " + (d.error || r.status));
  return d.result;
}

async function leer(clave, def = null) {
  if (!hayDB()) return def;
  const v = await comando("GET", clave);
  if (v == null) return def;
  try { return JSON.parse(v); } catch (e) { return def; }
}
const guardar = (clave, valor) => comando("SET", clave, JSON.stringify(valor));
// Guarda solo si la clave no existe. Devuelve true si la guardó (sirve para no hacer algo dos veces).
const guardarSiNoExiste = async (clave, valor) => (await comando("SET", clave, JSON.stringify(valor), "NX")) === "OK";

// Lista de pedidos (los más nuevos primero, se guardan los últimos 200)
async function agregarPedido(pedido) {
  await comando("LPUSH", "nacireina:pedidos", JSON.stringify(pedido));
  await comando("LTRIM", "nacireina:pedidos", 0, 199);
}
async function listarPedidos() {
  if (!hayDB()) return [];
  const lista = await comando("LRANGE", "nacireina:pedidos", 0, 199);
  return (lista || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
}
async function actualizarPedido(numero, cambios) {
  const lista = await comando("LRANGE", "nacireina:pedidos", 0, 199) || [];
  for (let i = 0; i < lista.length; i++) {
    const p = JSON.parse(lista[i]);
    if (p.numero === numero) { await comando("LSET", "nacireina:pedidos", i, JSON.stringify({ ...p, ...cambios })); return true; }
  }
  return false;
}

// Pares por talle: un "hash" de Redis con claves "id|color|talle" → cantidad.
// Va aparte de los ajustes para que una venta y el editor no se pisen.
const PARES = "nacireina:pares";
async function leerPares() {
  if (!hayDB()) return {};
  const plano = await comando("HGETALL", PARES) || [];
  const out = {};
  if (Array.isArray(plano)) for (let i = 0; i < plano.length; i += 2) out[plano[i]] = Number(plano[i + 1]);
  else Object.assign(out, plano);
  return out;
}
// cambios: { "id|color|talle": número o null (null = dejar de llevar la cuenta) }
async function cambiarPares(cambios) {
  const poner = [], sacar = [];
  for (const [k, v] of Object.entries(cambios)) v == null ? sacar.push(k) : poner.push(k, String(v));
  if (poner.length) await comando("HSET", PARES, ...poner);
  if (sacar.length) await comando("HDEL", PARES, ...sacar);
}
// Descuenta pares vendidos (nunca baja de 0). Si ese talle no lleva la cuenta, no hace nada y devuelve null.
const DESCONTAR = "local v=redis.call('HGET',KEYS[1],ARGV[1]) if not v then return -1 end " +
  "local n=tonumber(v)-tonumber(ARGV[2]) if n<0 then n=0 end redis.call('HSET',KEYS[1],ARGV[1],n) return n";
async function descontarPares(clave, cant) {
  const n = await comando("EVAL", DESCONTAR, 1, PARES, clave, String(cant));
  return n === -1 ? null : n;
}

// Devuelve pares (pedido cancelado). Solo si ese talle lleva la cuenta.
const DEVOLVER = "local v=redis.call('HGET',KEYS[1],ARGV[1]) if not v then return -1 end " +
  "local n=tonumber(v)+tonumber(ARGV[2]) redis.call('HSET',KEYS[1],ARGV[1],n) return n";
async function devolverPares(clave, cant) {
  const n = await comando("EVAL", DEVOLVER, 1, PARES, clave, String(cant));
  return n === -1 ? null : n;
}
// Busca un pedido por número (entre los últimos 200)
async function buscarPedido(numero) {
  return (await listarPedidos()).find(p => p.numero === numero) || null;
}

module.exports = { hayDB, leerPares, cambiarPares, descontarPares, devolverPares, buscarPedido, comando, leer, guardar, guardarSiNoExiste, agregarPedido, listarPedidos, actualizarPedido };
