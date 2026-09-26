// Base de datos chiquita (Upstash Redis, gratis) para guardar el stock, los precios editados y los pedidos.
// Se conecta sola si en Vercel agregás la integración "Upstash for Redis" (crea estas variables):
//   KV_REST_API_URL y KV_REST_API_TOKEN   (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN)
const URL_DB = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_DB = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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

module.exports = { hayDB, comando, leer, guardar, guardarSiNoExiste, agregarPedido, listarPedidos, actualizarPedido };
