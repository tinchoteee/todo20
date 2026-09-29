// Datos públicos que necesita la página. La clave pública de Mercado Pago no es secreta:
// solo sirve para que el formulario de tarjeta funcione (no permite cobrar ni ver pagos).
const CATALOGO = require("../productos.js");
const { datosCuenta } = require("./transferencia.js");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    mpPublicKey: process.env.MP_PUBLIC_KEY || null,
    // Pago por transferencia (productos.js → transferencia). Si en Vercel están los datos de la cuenta se muestran al confirmar;
    // si no, el pedido se guarda igual y se le avisa al cliente que le pasan los datos por WhatsApp.
    transferencia: Number((CATALOGO.transferencia || {}).porcentaje) > 0 ? { porcentaje: Number(CATALOGO.transferencia.porcentaje), conDatos: Boolean(datosCuenta()) } : null,
    metaPixelId: String(process.env.META_PIXEL_ID || CATALOGO.metaPixel || "").replace(/\D/g, "") || null  // Píxel de Meta (también es público)
  });
};
