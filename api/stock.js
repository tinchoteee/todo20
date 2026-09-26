// Precios y agotados actuales (los que se cargan desde el editor). La página los pide al abrir.
const { leerAjustes } = require("./_catalogo.js");

module.exports = async function handler(req, res) {
  // Se guarda 15 segundos en la red de Vercel: los cambios del editor se ven casi al instante
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
  return res.status(200).json(await leerAjustes());
};
