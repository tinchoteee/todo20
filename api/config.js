// Datos públicos que necesita la página. La clave pública de Mercado Pago no es secreta:
// solo sirve para que el formulario de tarjeta funcione (no permite cobrar ni ver pagos).
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    mpPublicKey: process.env.MP_PUBLIC_KEY || null,
    metaPixelId: (process.env.META_PIXEL_ID || "").replace(/\D/g, "") || null  // Píxel de Meta (también es público)
  });
};
