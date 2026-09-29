// Datos públicos que necesita la página. La clave pública de Mercado Pago no es secreta:
// solo sirve para que el formulario de tarjeta funcione (no permite cobrar ni ver pagos).
const CATALOGO = require("../productos.js");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    mpPublicKey: process.env.MP_PUBLIC_KEY || null,
    metaPixelId: String(process.env.META_PIXEL_ID || CATALOGO.metaPixel || "").replace(/\D/g, "") || null  // Píxel de Meta (también es público)
  });
};
