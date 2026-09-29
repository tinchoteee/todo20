// Arma el pedido a partir de lo que manda el navegador. Lo usan los dos medios de pago
// (Checkout Pro y tarjeta en la página). Los precios salen de productos.js y el envío se vuelve
// a cotizar acá: nunca se usa lo que manda el navegador.
const { cotizar, lineasDelPedido } = require("./_envios.js");
const { productosActuales } = require("./_catalogo.js");
const CATALOGO = require("../productos.js");
const aplicarAjustes = require("../ajustes.js");

const texto = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

async function armarPedido(body, base) {
  const lineas = lineasDelPedido(body.items, await productosActuales());
  const subtotal = lineas.reduce((a, l) => a + l.precio * l.cant, 0);

  const c = body.cliente || {};
  const cliente = { nombre: texto(c.nombre, 80), telefono: texto(c.telefono, 30), email: texto(c.email, 120), dni: texto(c.dni, 12) };
  if (!cliente.nombre || !cliente.telefono) throw new Error("Completá tu nombre y teléfono.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) throw new Error("Ingresá un email válido: ahí te llega el seguimiento del envío.");

  // Envío: se vuelve a cotizar y se busca la opción elegida
  const e = body.entrega || {};
  const cot = e.opcion === "local"
    ? { opciones: [{ id: "local", tipo: "local", nombre: "Retiro en el local", precio: 0 }] }
    : await cotizar({ cp: e.cp, provincia: e.provincia, localidad: texto(e.localidad, 80), lineas, subtotal });
  const opcion = cot.opciones.find(o => o.id === e.opcion);
  if (!opcion) throw new Error("La opción de envío cambió. Volvé a elegir cómo lo recibís.");

  const entrega = { tipo: opcion.tipo, opcion: opcion.nombre, precio: opcion.precio };
  if (opcion.tipo === "domicilio") {
    Object.assign(entrega, { calle: texto(e.calle, 120), numero: texto(e.numero, 10), piso: texto(e.piso, 30),
      localidad: texto(e.localidad, 80), provincia: cot.provincia, cp: cot.cp });
    if (!entrega.calle || !entrega.numero || !entrega.localidad) throw new Error("Completá la dirección de envío.");
  } else if (opcion.tipo === "sucursal") {
    const s = opcion.sucursales.find(x => x.id === String(e.sucursal));
    if (!s) throw new Error("Elegí la sucursal del correo donde vas a retirar.");
    Object.assign(entrega, { sucursal: `${s.nombre} (${s.direccion})`, sucursal_id: s.id, localidad: texto(e.localidad, 80), provincia: cot.provincia, cp: cot.cp });
  }
  if (opcion.zipnova) entrega.zipnova = opcion.zipnova;

  // Descuento por monto (15% desde $220.000): se aplica a cada producto, no al envío
  const cuenta = aplicarAjustes.conDescuento(lineas.map(l => ({ precio: l.precio, cant: l.cant })), CATALOGO.descuento);
  const items = lineas.map((l, i) => ({
    id: String(l.producto.id),
    title: `${l.producto.nombre}${l.color ? " - " + l.color.nombre : ""} - Talle ${l.talle}${cuenta.porcentaje ? ` (${cuenta.porcentaje}% OFF)` : ""}`,
    quantity: l.cant, unit_price: cuenta.precios[i], currency_id: "ARS"
  }));
  if (opcion.precio > 0) items.push({ id: "envio", title: opcion.nombre, quantity: 1, unit_price: opcion.precio, currency_id: "ARS" });

  const numero = "NR-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();
  return {
    numero, cliente, entrega, items,
    total: Math.round((cuenta.total + (opcion.precio || 0)) * 100) / 100,
    notificationUrl: `${base}/api/webhook-mp`,
    // Todo el pedido viaja con el pago: el aviso por email y el envío lo leen de acá
    metadata: { pedido: numero, cliente, entrega,
      detalle: items.filter(i => i.id !== "envio").map(i => `${i.quantity} x ${i.title} ($${i.unit_price})`),
      productos: lineas.map(l => ({ id: l.producto.id, color: l.color ? l.color.id : "", talle: l.talle, cant: l.cant })), subtotal: cuenta.total,
      ...(cuenta.porcentaje ? { descuento: `${cuenta.porcentaje}% OFF: -$${cuenta.descuento.toLocaleString("es-AR")}` } : {}) }
  };
}

const leerBody = req => typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
const baseDe = req => `https://${req.headers["x-forwarded-host"] || req.headers.host}`;

module.exports = { armarPedido, leerBody, baseDe };
