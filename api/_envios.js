// Cotización de envíos. Lo usan /api/cotizar-envio (para mostrar precios) y /api/crear-pago
// (para cobrar el envío correcto: el precio siempre se vuelve a calcular acá, nunca se toma del navegador).
//
// Con Zipnova configurado, cotiza Andreani (u otros correos) según código postal, peso y tamaño.
// Variables de entorno en Vercel (se sacan del panel de Zipnova → Configuración → API):
//   ZIPNOVA_API_TOKEN, ZIPNOVA_API_SECRET, ZIPNOVA_ACCOUNT_ID
//   ZIPNOVA_ORIGIN_ID (opcional: el id de la dirección del local; si falta usa la dirección por defecto)
// Sin Zipnova, usa los costos fijos de  envio.zonasDeRespaldo  en productos.js.
const CATALOGO = require("../productos.js");
const aplicarAjustes = require("../ajustes.js");

const ZIPNOVA_URL = "https://api.zipnova.com.ar/v2/shipments/quote";

const PROVINCIAS = ["CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa",
  "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];

const cpValido = cp => (String(cp || "").match(/\d{4}/) || [])[0] || null;

function cajaDe(p) {
  const cajas = CATALOGO.envio.cajas;
  return cajas[p.caja] || cajas[p.cat] || cajas.botas;
}

// Duración ISO de Zipnova ("P3D", "PT24H") → días
function dias(iso) {
  const m = /P(?:(\d+)D)?(?:T(\d+)H)?/.exec(iso || "");
  if (!m) return null;
  return Number(m[1] || 0) + Math.ceil(Number(m[2] || 0) / 24);
}

async function cotizarZipnova({ cp, provincia, localidad, lineas, valor }) {
  const auth = Buffer.from(`${process.env.ZIPNOVA_API_TOKEN}:${process.env.ZIPNOVA_API_SECRET}`).toString("base64");
  const items = [];
  for (const { producto, cant } of lineas) {
    const c = cajaDe(producto);
    for (let i = 0; i < cant; i++) {
      items.push({ sku: String(producto.id), description: producto.nombre, weight: c.peso, height: c.alto, width: c.ancho, length: c.largo });
    }
  }
  const body = {
    account_id: Number(process.env.ZIPNOVA_ACCOUNT_ID),
    ...(process.env.ZIPNOVA_ORIGIN_ID ? { origin_id: Number(process.env.ZIPNOVA_ORIGIN_ID) } : {}),
    source: "nacireina-web",
    destination: { zipcode: cp, state: provincia, ...(localidad ? { city: localidad } : {}) },
    declared_value: valor,
    items,
    type_packaging: "none",
    sort_by: "price"
  };
  let r;
  try {
    r = await fetch(ZIPNOVA_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    console.error("Zipnova no respondió", e.name, e.message);
    throw new Error("No pudimos conectar con el correo. Probá de nuevo en un momento.");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Zipnova no cotizó", r.status, JSON.stringify(data).slice(0, 500));
    throw new Error("No pudimos calcular el envío para ese código postal. Revisá el código postal y la provincia.");
  }

  const preferido = (CATALOGO.envio.transportista || "").toLowerCase();
  let resultados = (data.all_results || []).filter(o => o.selectable && o.amounts && o.carrier && o.service_type);
  const delPreferido = resultados.filter(o => preferido && o.carrier.name.toLowerCase().includes(preferido));
  if (delPreferido.length) resultados = delPreferido;

  // Una opción por correo y tipo de servicio (la más barata)
  const porClave = new Map();
  for (const o of resultados) {
    const clave = `${o.carrier.id}-${o.service_type.code}`;
    const precio = Math.ceil(o.amounts.price_incl_tax ?? o.amounts.price);
    if (porClave.has(clave) && porClave.get(clave).precio <= precio) continue;
    const t = (o.delivery_time && o.delivery_time.times && o.delivery_time.times.total) || {};
    const sucursal = o.service_type.code === "pickup_point";
    porClave.set(clave, {
      id: clave,
      tipo: sucursal ? "sucursal" : "domicilio",
      nombre: `${o.carrier.name} · ${sucursal ? "retiro en sucursal" : "a domicilio"}${o.service_type.is_urgent ? " (express)" : ""}`,
      transportista: o.carrier.name,
      precio,
      dias: { min: o.delivery_time?.min ?? dias(t.min), max: o.delivery_time?.max ?? dias(t.max) },
      // Datos que hacen falta para crear el envío en Zipnova
      zipnova: { carrier_id: o.carrier.id, service_type: o.service_type.code, logistic_type: o.logistic_type },
      sucursales: sucursal ? (o.pickup_points || []).map(s => ({
        id: String(s.point_id),
        nombre: s.description,
        direccion: [s.location?.street, s.location?.street_number].filter(Boolean).join(" ") + (s.location?.city ? `, ${s.location.city}` : ""),
        horario: s.open_hours || ""
      })) : undefined
    });
  }
  return [...porClave.values()].filter(o => o.tipo === "domicilio" || (o.sucursales && o.sucursales.length));
}

function cotizarPorZona({ provincia }) {
  const z = CATALOGO.envio.zonasDeRespaldo;
  const precio = z[provincia] ?? z.resto;
  return [{ id: "zona", tipo: "domicilio", nombre: "Envío a domicilio", transportista: "Andreani", precio, dias: { min: null, max: null } }];
}

// lineas: [{ producto, cant }]; subtotal: suma de los productos (para el envío gratis)
async function cotizar({ cp, provincia, localidad, lineas, subtotal }) {
  const codigo = cpValido(cp);
  if (!codigo) throw new Error("Ingresá un código postal válido (4 números).");
  if (!PROVINCIAS.includes(provincia)) throw new Error("Elegí tu provincia.");
  if (!lineas.length) throw new Error("No hay productos para cotizar.");

  const conZipnova = process.env.ZIPNOVA_API_TOKEN && process.env.ZIPNOVA_API_SECRET && process.env.ZIPNOVA_ACCOUNT_ID;
  const opciones = conZipnova
    ? await cotizarZipnova({ cp: codigo, provincia, localidad, lineas, valor: subtotal })
    : cotizarPorZona({ provincia });
  if (!opciones.length) throw new Error("No hay envíos disponibles para ese código postal.");

  const gratisDesde = CATALOGO.envio.gratisDesde || 0;
  const gratis = gratisDesde > 0 && subtotal >= gratisDesde;
  for (const o of opciones) { o.precioOriginal = o.precio; if (gratis) o.precio = 0; }
  opciones.sort((a, b) => a.precio - b.precio || a.precioOriginal - b.precioOriginal);

  opciones.push({ id: "local", tipo: "local", nombre: "Retiro en el local", transportista: null, precio: 0, precioOriginal: 0,
    detalle: CATALOGO.local.direccion, dias: { min: null, max: null } });
  return { cp: codigo, provincia, opciones, gratisDesde, gratis };
}

// Arma las líneas del pedido a partir de lo que manda el navegador, validando todo contra el catálogo
// (productos: el catálogo con los ajustes del editor, de _catalogo.js)
function lineasDelPedido(items, productos, { exigirPrecio = true, exigirTalle = true } = {}) {
  const lineas = [];
  for (const it of (Array.isArray(items) ? items : []).slice(0, 30)) {
    const producto = productos.find(x => x.id === Number(it.id));
    if (!producto) throw new Error("Hay un producto que ya no está disponible. Actualizá la página.");
    const color = (producto.colores || []).find(c => c.id === it.color);
    // Precio del color elegido (si no se eligió color todavía, el más barato del modelo, solo para cotizar el envío)
    const rango = aplicarAjustes.rangoDe(producto);
    const precio = color ? aplicarAjustes.precioDe(producto, color.id) : (rango ? rango.min : 0);
    if (exigirPrecio && !(precio > 0)) throw new Error(`“${producto.nombre}”${color ? " en " + color.nombre : ""} tiene precio a consultar: consultalo por WhatsApp.`);
    const cant = Math.max(1, Math.min(10, parseInt(it.cant, 10) || 1));
    const linea = { producto, cant, precio, color };
    if (exigirTalle) {
      if (producto.agotado) throw new Error(`“${producto.nombre}” se agotó. Sacalo del carrito para seguir.`);
      const talle = Number(it.talle);
      if (!producto.talles.includes(talle)) throw new Error(`El talle ${it.talle} de “${producto.nombre}” no está disponible.`);
      if ((producto.colores || []).length && !color) throw new Error(`Elegí un color para “${producto.nombre}”.`);
      if (color && color.agotado) throw new Error(`“${producto.nombre}” en ${color.nombre} se agotó. Sacalo del carrito para seguir.`);
      if (color && color.sinTalle.includes(talle)) throw new Error(`El talle ${talle} de “${producto.nombre}”${color ? " en " + color.nombre : ""} se agotó. Sacalo del carrito para seguir.`);
      linea.talle = talle;
    }
    lineas.push(linea);
  }
  if (!lineas.length) throw new Error("El pedido está vacío.");
  return lineas;
}

module.exports = { cotizar, lineasDelPedido, PROVINCIAS };
