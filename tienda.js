"use strict";
// Tienda Nací Reina: catálogo, página de producto, carrito y checkout por pasos.
// Los productos, precios y la configuración del envío están en productos.js.
// Los precios y agotados que se cambian desde el editor (admin.html) llegan de /api/stock.

let PRODUCTOS = aplicarAjustes(CATALOGO.productos, {});
const ENVIO = CATALOGO.envio;
const WHATSAPP = CATALOGO.whatsapp || "";
const PROVINCIAS = ["CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa",
  "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];
const CELU = matchMedia("(max-width: 760px)");   // vista de celular
const CATS = [
  { id: "todo", nombre: "Todo" }, { id: "botas", nombre: "Botas" }, { id: "borcegos", nombre: "Borcegos" },
  { id: "chavitos", nombre: "Chavitos" },
  { id: "zapatos", nombre: "Zapatos" }, { id: "zapatillas", nombre: "Zapatillas" },
  { id: "sandalias", nombre: "Sandalias" }, { id: "suecos", nombre: "Suecos" }
].filter(c => c.id === "todo" || PRODUCTOS.some(p => p.cat === c.id));

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
const producto = id => PRODUCTOS.find(p => p.id === id);
const precioDe = aplicarAjustes.precioDe;   // precio del color elegido (o del modelo)
const rangoDe = aplicarAjustes.rangoDe;     // { min, max } entre todos los colores, o null si es a consultar
const paresDe = aplicarAjustes.paresDe;     // pares que quedan de un talle (null = no se lleva la cuenta)
const precioTxt = p => { const r = rangoDe(p); return !r ? "Consultar precio" : r.min !== r.max ? "Desde " + pesos(r.min) : pesos(r.min); };
const colorDe = (p, cid) => (p.colores || []).find(c => c.id === cid);
const nombreCat = id => (CATS.find(c => c.id === id) || { nombre: id }).nombre;
const fotoDe = (p, cid) => (colorDe(p, cid) || {}).foto || p.foto || ((p.colores || []).find(c => c.foto) || {}).foto || "";
const img = (src, alt = "") => src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : "";
const wa = texto => (WHATSAPP ? `https://wa.me/${WHATSAPP}` : "https://wa.me/") + (texto ? "?text=" + encodeURIComponent(texto) : "");
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def } catch (e) { return def } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };

// ---------- Datos públicos del servidor y Píxel de Meta ----------
// El número del píxel se carga en Vercel (META_PIXEL_ID). Sin número, no se mide nada.
const configPublica = fetch("/api/config").then(r => r.json()).catch(() => ({}));
const pixelListo = configPublica.then(c => {
  if (!c.metaPixelId) return false;
  /* Código oficial de Meta */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", String(c.metaPixelId));
  fbq("track", "PageView");
  return true;
});
const medir = (evento, datos, id) => pixelListo.then(ok => { if (ok) fbq("track", evento, { currency: "ARS", ...datos }, id ? { eventID: id } : undefined); });

async function api(ruta, datos) {
  let r;
  try {
    r = await fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  } catch (e) { throw new Error("No pudimos conectarnos. Revisá tu conexión y probá de nuevo."); }
  if (r.status === 404 || r.status === 501) throw new Error("Esto funciona cuando la página está publicada en internet.");
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Algo salió mal. Probá de nuevo en un momento.");
  return d;
}

// Último stock conocido (para que la página no parpadee mientras llega el actualizado)
PRODUCTOS = aplicarAjustes(CATALOGO.productos, leer("nacireina-stock", {}));

// ---------- Stock ----------
// ¿Hay stock de ese talle? (si no se eligió color, alcanza con que algún color lo tenga)
function talleDisponible(p, cid, t) {
  if (p.agotado) return false;
  const cols = p.colores || [];
  if (!cols.length) return true;
  return (cid ? cols.filter(c => c.id === cid) : cols).some(c => !c.agotado && !c.sinTalle.includes(t));
}
// Máximo que se puede llevar de un talle: los pares que quedan (si se lleva la cuenta), hasta 10
const maxCant = (p, cid, t) => Math.min(10, paresDe(p, cid, t) ?? 10);
function problemaItem(i) {
  const p = producto(i.id);
  if (!(precioDe(p, i.color) > 0)) return "Precio a consultar";
  if (!talleDisponible(p, i.color, i.talle)) return "Se agotó";
  return null;
}

// ---------- Carrito ----------
let carrito = leer("nacireina-carrito", []).filter(i => producto(i.id) && producto(i.id).talles.includes(i.talle));
const subtotal = () => carrito.reduce((a, i) => a + precioDe(producto(i.id), i.color) * i.cant, 0);
// Descuento por monto (ver "descuento" en productos.js): misma cuenta que hace el servidor al cobrar
const DESCUENTO = CATALOGO.descuento || { desde: 0, porcentaje: 0 };
const cuenta = extra => aplicarAjustes.conDescuento(carrito.map(i => ({ precio: precioDe(producto(i.id), i.color), cant: i.cant })), DESCUENTO, extra);
// Descuento por transferencia: solo si el servidor tiene cargados los datos de la cuenta (ver /api/config)
let transf = null;
configPublica.then(c => {
  transf = c && c.transferencia ? c.transferencia : null;
  const faq = document.querySelector("[data-transf-faq]");
  if (faq && transf && transf.porcentaje) faq.textContent = `También podés pagar con transferencia bancaria y tenés ${transf.porcentaje}% OFF en los productos.`;
  if (!$("#vista-producto").hidden && sel.id) pintarProducto();
  if (!$("#vista-checkout").hidden) pintarCheckout();
  pintarAvisoTransf();
});
// Cartelito en el carrito y en el resumen del checkout: "con transferencia pagás $X (5% OFF)"
function pintarAvisoTransf() {
  const hay = transf && transf.porcentaje && carrito.length && !hayConsultar();
  const txt = hay ? `💸 <b>${transf.porcentaje}% OFF pagando con transferencia bancaria</b>: tus productos te quedan en <b>${pesos(cuenta(transf.porcentaje).total)}</b>${$("#vista-checkout").hidden ? "" : ". Elegilo en el paso 3 (Pago)"}.` : "";
  document.querySelectorAll("[data-aviso-transf]").forEach(el => { el.hidden = !hay; el.innerHTML = txt; });
}
const totalProductos = () => cuenta().total;
const hayConsultar = () => carrito.some(problemaItem);
const detalleItem = i => { const p = producto(i.id), c = colorDe(p, i.color); return `${c ? c.nombre + " · " : ""}Talle ${i.talle}`; };

function guardarCarrito() {
  escribir("nacireina-carrito", carrito);
  pintarCarrito();
  if (!$("#vista-checkout").hidden) {
    if (!carrito.length || hayConsultar()) { location.hash = ""; return; }
    ck.cot = null; ck.opcion = null; ck.sucursal = null; if (ck.paso > 2) ck.paso = 2; pintarCheckout();
  }
}
function agregar(id, color, talle) {
  const ex = carrito.find(i => i.id === id && i.talle === talle && i.color === color);
  if (ex) ex.cant = Math.min(maxCant(producto(id), color, talle), ex.cant + 1); else carrito.push({ id, color, talle, cant: 1 });
  guardarCarrito();
  const p = producto(id);
  medir("AddToCart", { content_ids: [String(id)], content_name: p.nombre, content_type: "product", value: precioDe(p, color) || 0 });
}

function pintarCarrito() {
  const cant = carrito.reduce((a, i) => a + i.cant, 0);
  const c = $("#contador"), antes = Number(c.textContent) || 0;
  c.textContent = cant || "";
  if (cant > antes) { const b = $("#abrirCarrito"); b.classList.remove("salto"); void b.offsetWidth; b.classList.add("salto"); }
  $("#abrirCarrito").setAttribute("aria-label", `Ver carrito (${cant} ${cant === 1 ? "producto" : "productos"})`);
  $("#panelF").hidden = !carrito.length;
  if (typeof pintarAvisoTransf === "function") pintarAvisoTransf();
  $("#items").innerHTML = carrito.length ? carrito.map((i, n) => { const p = producto(i.id); const prob = problemaItem(i); return `
    <div class="item">
      <a class="mini" href="#p/${p.id}">${img(fotoDe(p, i.color), p.nombre)}</a>
      <div>
        <b>${esc(p.nombre)}</b>
        <div class="det">${esc(detalleItem(i))}</div>
        ${prob === "Se agotó" ? `<div class="aviso-error">Se agotó · <button class="link" data-quitar="${n}">Sacar del carrito</button></div>` : ""}
        <div class="abajo">
          <div class="cant"><button data-menos="${n}" aria-label="Quitar uno">−</button><span>${i.cant}</span><button data-mas="${n}" aria-label="Sumar uno">+</button></div>
          <span class="m">${precioDe(p, i.color) > 0 ? pesos(precioDe(p, i.color) * i.cant) : "A consultar"}</span>
        </div>
      </div>
    </div>`; }).join("") : `<div class="vacio"><img class="isotipo-grande" src="img/isotipo.svg" alt="">Tu carrito está vacío.<br><br><a class="link" href="#catalogo" data-cerrar>Ver productos</a></div>`;

  const sub = subtotal();
  const sinPrecio = carrito.some(i => !(precioDe(producto(i.id), i.color) > 0));
  const cta = cuenta();
  $("#subtotal").textContent = sinPrecio ? (sub ? pesos(cta.total) + " + a consultar" : "A consultar") : pesos(cta.total);
  $("#filaDescuento").hidden = !cta.porcentaje;
  if (cta.porcentaje) $("#filaDescuento").innerHTML = `<span>Descuento ${cta.porcentaje}% OFF</span><span>−${pesos(cta.descuento)}</span>`;
  pintarBarraBeneficios(sub);
  $("#notaConsultar").hidden = !hayConsultar();
  $("#notaConsultar").textContent = carrito.some(i => problemaItem(i) === "Se agotó")
    ? "Hay productos que se agotaron. Sacalos del carrito para seguir con la compra."
    : "Hay productos con precio a consultar. Para pagar online, consultalos por WhatsApp o sacalos del carrito.";
  $("#iniciarCompra").toggleAttribute("aria-disabled", hayConsultar());
  $("#iniciarCompra").style.opacity = hayConsultar() ? ".45" : "";
  $("#iniciarCompra").style.pointerEvents = hayConsultar() ? "none" : "";
  let t = "¡Hola Nací Reina! Quiero consultar por:\n\n" + carrito.map(i => `• ${i.cant} x ${producto(i.id).nombre} - ${detalleItem(i)}`).join("\n");
  $("#waCarrito").href = wa(t);
}
// Barra de beneficios del carrito: se llena a medida que se suman productos (envío gratis y descuento)
function pintarBarraBeneficios(sub) {
  const metas = [];
  if (ENVIO.gratisDesde > 0) metas.push({ monto: ENVIO.gratisDesde, texto: "envío gratis", logrado: "¡Tenés envío gratis!", ic: "🚚" });
  if (DESCUENTO.desde > 0) metas.push({ monto: DESCUENTO.desde, texto: `${DESCUENTO.porcentaje}% OFF`, logrado: `¡Tenés ${DESCUENTO.porcentaje}% OFF en tu compra!`, ic: "🏷️" });
  metas.sort((a, b) => a.monto - b.monto);
  $("#barraGratis").hidden = !metas.length;
  if (!metas.length) return;
  const tope = metas[metas.length - 1].monto;
  const proxima = metas.find(m => sub < m.monto);
  const logradas = metas.filter(m => sub >= m.monto);
  let msj;
  if (!proxima) msj = `<span class="gratis">¡Tenés ${metas.map(m => m.texto).join(" y ")}!</span>`;
  else msj = (logradas.length ? `<span class="gratis">${logradas[logradas.length - 1].logrado}</span> ` : "")
    + `Te faltan <b>${pesos(proxima.monto - sub)}</b> para ${logradas.length ? "sumar " : "tener "}<b>${proxima.texto}</b>`;
  $("#barraGratis").innerHTML = `<div class="barra-msj">${msj}</div>
    <div class="barra"><i style="width:${Math.min(100, sub / tope * 100)}%"></i>
      ${metas.map(m => `<span class="meta${sub >= m.monto ? " ok" : ""}" style="left:${m.monto / tope * 100}%" title="${esc(m.texto)} desde ${pesos(m.monto)}">${m.ic}</span>`).join("")}</div>
    <div class="barra-metas">${metas.map(m => `<span style="left:${m.monto / tope * 100}%">${esc(m.texto)}<br>${pesos(m.monto)}</span>`).join("")}</div>`;
}
function abrirCarrito() { $("#velo").hidden = false; $("#panel").hidden = false; $("#cerrarCarrito").focus(); }
function cerrarCarrito() { $("#velo").hidden = true; $("#panel").hidden = true; }

$("#abrirCarrito").addEventListener("click", abrirCarrito);
$("#cerrarCarrito").addEventListener("click", cerrarCarrito);
$("#velo").addEventListener("click", cerrarCarrito);
$("#items").addEventListener("click", e => {
  const m = e.target.closest("[data-mas]"), n = e.target.closest("[data-menos]");
  if (m) { const i = carrito[+m.dataset.mas]; i.cant = Math.min(maxCant(producto(i.id), i.color, i.talle), i.cant + 1); guardarCarrito(); }
  if (n) { const k = +n.dataset.menos; carrito[k].cant--; if (carrito[k].cant <= 0) carrito.splice(k, 1); guardarCarrito(); }
  const q = e.target.closest("[data-quitar]");
  if (q) { carrito.splice(+q.dataset.quitar, 1); guardarCarrito(); }
  if (e.target.closest("a")) cerrarCarrito();
});
$("#iniciarCompra").addEventListener("click", cerrarCarrito);

// ---------- Inicio y catálogo ----------
let catActual = "todo";

function tarjeta(p) {
  const cols = p.colores || [];
  // Carrusel: si los colores tienen fotos distintas, la tarjeta las va pasando sola (ver "Carrusel de las tarjetas")
  const fotos = [...new Set(cols.map(c => c.foto).filter(Boolean))];
  const carrusel = fotos.length > 1 && !p.agotado;
  const fotoHtml = carrusel
    ? fotos.map((f, i) => `<img src="${esc(f)}" alt="${i ? "" : esc(p.nombre)}" loading="lazy"${i ? "" : ' class="on"'}>`).join("")
    : img(fotoDe(p), p.nombre);
  return `<a class="card${p.agotado ? " agotado" : ""}" href="#p/${p.id}">
    <div class="foto${carrusel ? " carrusel" : ""}">${fotoHtml}${p.agotado ? '<span class="tag">Agotado</span>' : rangoDe(p) ? "" : '<span class="tag">Consultar</span>'}</div>
    <div>
      <h3>${esc(p.nombre)}</h3>
      <div class="meta">${esc(nombreCat(p.cat))}${cols.length > 1 ? ` · ${cols.length} colores` : cols.length ? ` · ${esc(cols[0].nombre)}` : ""}</div>
    </div>
    ${cols.length > 1 ? `<div class="puntos">${cols.map(c => `<i style="--sw:${esc(c.hex)}" title="${esc(c.nombre)}"${carrusel && c.foto ? ` data-foto="${fotos.indexOf(c.foto)}"${c.foto === fotos[0] ? ' class="on"' : ""}` : ""}></i>`).join("")}</div>` : ""}
    <div class="precio">${precioTxt(p)}</div>
  </a>`;
}
function pintarCatalogo() {
  $("#cats").innerHTML = CATS.map(c => `<button class="cat" data-cat="${c.id}" aria-pressed="${c.id === catActual}">${c.nombre}</button>`).join("");
  // Agrupados por categoría; los agotados van al final
  const orden = p => CATS.findIndex(c => c.id === p.cat);
  const grilla = $("#grilla");
  // En el celular, "Todo" se muestra en filas por categoría que se deslizan de costado (menos scroll hacia abajo)
  const enFilas = catActual === "todo" && CELU.matches;
  grilla.classList.toggle("filas", enFilas);
  grilla.innerHTML = enFilas
    ? CATS.filter(c => c.id !== "todo").map(c => {
        const ps = PRODUCTOS.filter(p => p.cat === c.id).sort((a, b) => a.agotado - b.agotado);
        return ps.length ? `<div class="fila-cat">
          <div class="fila-tit"><h3>${esc(c.nombre)}</h3><button type="button" class="ver-todos" data-cat="${c.id}">Ver ${ps.length} →</button></div>
          <div class="fila-scroll">${ps.map(tarjeta).join("")}</div>
        </div>` : "";
      }).join("")
    : PRODUCTOS.filter(p => catActual === "todo" || p.cat === catActual)
        .sort((a, b) => a.agotado - b.agotado || orden(a) - orden(b)).map(tarjeta).join("");
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.dataset.cat === catActual));
  const activa = $("#cats .cat[aria-pressed=true]");
  if (activa) activa.scrollIntoView({ block: "nearest", inline: "center" });
  if (typeof animarEntrada === "function") animarEntrada(grilla);
}
CELU.addEventListener("change", () => pintarCatalogo());
$("#grilla").addEventListener("click", e => {
  const b = e.target.closest(".ver-todos"); if (!b) return;
  catActual = b.dataset.cat; pintarCatalogo(); $("#catalogo").scrollIntoView({ behavior: "smooth" });
});
$("#nav").innerHTML = CATS.filter(c => c.id !== "todo").map(c => `<a href="#cat/${c.id}" data-cat="${c.id}">${c.nombre}</a>`).join("");
$("#cats").addEventListener("click", e => {
  const b = e.target.closest(".cat"); if (!b) return;
  catActual = b.dataset.cat; pintarCatalogo();
});

// ---------- Página de producto ----------
const sel = { id: null, color: null, talle: null, foto: null };

function mostrarProducto(id, colorPedido) {
  const p = producto(id);
  if (!p) { location.hash = ""; return; }
  if (sel.id !== id) medir("ViewContent", { content_ids: [String(id)], content_name: p.nombre, content_type: "product", value: (rangoDe(p) || {}).min || 0 });
  const pedido = (p.colores || []).some(c => c.id === colorPedido) ? colorPedido : null;
  if (sel.id !== id) Object.assign(sel, { id, color: pedido || (p.colores && p.colores.length === 1 ? p.colores[0].id : null), talle: null, foto: null });
  document.title = `${p.nombre} · Nací Reina Calzados`;
  $("#migas").innerHTML = `<a href="#">Inicio</a> / <a href="#cat/${p.cat}">${esc(nombreCat(p.cat))}</a> / ${esc(p.nombre)}`;
  $("#pCat").textContent = nombreCat(p.cat);
  $("#pNombre").textContent = p.nombre;
  $("#pDesc").textContent = p.desc || "";
  $("#pDesc").hidden = !p.desc;
  $("#pFalta").textContent = "";
  $("#calcRes").innerHTML = "";
  pintarProducto();

  const rel = PRODUCTOS.filter(x => x.id !== p.id && x.cat === p.cat);
  const otros = PRODUCTOS.filter(x => x.id !== p.id && x.cat !== p.cat);
  const sugeridos = [...rel, ...otros].filter(x => !x.agotado).slice(0, 4);
  $("#grillaRel").innerHTML = sugeridos.map(tarjeta).join("");
  $("#relacionados").hidden = !sugeridos.length;
}
function pintarProducto() {
  const p = producto(sel.id);
  const cols = p.colores || [];
  // Galería: una foto por color (y la foto general si la hay)
  const fotos = [];
  cols.forEach(c => { if (c.foto) fotos.push({ src: c.foto, color: c.id }); });
  if (p.foto && !fotos.some(f => f.src === p.foto)) fotos.unshift({ src: p.foto, color: null });
  const actual = sel.foto || fotoDe(p, sel.color);
  const colFoto = colorDe(p, sel.color);
  // Si el color elegido todavía no tiene foto propia, se aclara que la foto es de otro color
  const nota = colFoto && !colFoto.foto && !sel.foto ? `<span class="foto-nota">Foto de referencia en otro color · este modelo también viene en ${esc(colFoto.nombre)}</span>` : "";
  $("#fotoGrande").innerHTML = img(actual, p.nombre).replace(' loading="lazy"', "") + nota;
  $("#miniaturas").innerHTML = fotos.length > 1 ? fotos.map(f => `<button data-foto="${esc(f.src)}" data-color="${f.color || ""}" aria-pressed="${f.src === actual}" aria-label="Ver foto">${img(f.src)}</button>`).join("") : "";

  const colSel = colorDe(p, sel.color);
  const colAgotado = c => c.agotado || p.talles.every(t => c.sinTalle.includes(t));
  $("#pColoresBox").hidden = !cols.length;
  $("#pColorNombre").textContent = colSel ? colSel.nombre + (colAgotado(colSel) ? " · agotado" : "") : "Elegí uno";
  $("#pColores").innerHTML = cols.map(c => `<button class="swatch${colAgotado(c) ? " sin-stock" : ""}" data-c="${c.id}" aria-pressed="${sel.color === c.id}" aria-label="${esc(c.nombre)}${colAgotado(c) ? " (agotado)" : ""}" title="${esc(c.nombre)}${colAgotado(c) ? " · agotado" : ""}" style="--sw:${esc(c.hex)}"></button>`).join("");
  $("#pTalles").innerHTML = p.talles.map(t => { const hay = talleDisponible(p, sel.color, t);
    return `<button class="talle" data-t="${t}" aria-pressed="${sel.talle === t}"${hay ? "" : ` disabled aria-label="Talle ${t}, agotado"`}>${t}</button>`; }).join("");
  // Pocos pares del talle elegido: se avisa (empuja a comprar y evita sorpresas)
  const quedan = sel.color && sel.talle ? paresDe(p, sel.color, sel.talle) : null;
  $("#pQuedan").textContent = quedan > 0 && quedan <= 3 ? (quedan === 1 ? "¡Queda el último par de este talle!" : `¡Quedan solo ${quedan} pares de este talle!`) : "";

  // Precio: el del color elegido; si todavía no eligió color, "Desde $X" cuando los colores cuestan distinto
  const precioSel = colSel ? precioDe(p, colSel.id) : 0;
  $("#pPrecio").textContent = colSel ? (precioSel > 0 ? pesos(precioSel) : "Consultar precio") : precioTxt(p);
  const tienePrecio = colSel ? precioSel > 0 : Boolean(rangoDe(p));
  // "o $X con transferencia"
  const base = colSel ? precioSel : (rangoDe(p) || {}).min;
  $("#pTransf").hidden = !(transf && transf.porcentaje && base > 0);
  if (!$("#pTransf").hidden) $("#pTransf").innerHTML = `${colSel || !rangoDe(p) || rangoDe(p).min === rangoDe(p).max ? "" : "Desde "}<b>${pesos(Math.round(base * (100 - transf.porcentaje) / 100))}</b> con transferencia (${transf.porcentaje}% OFF)`;

  const consulta = `¡Hola Nací Reina! Quiero consultar por ${p.nombre}${colSel ? " color " + colSel.nombre : ""}${sel.talle ? " talle " + sel.talle : ""}.`;
  const botonWa = texto => `<a class="btn btn-wa${tienePrecio ? "" : " lleno"}" href="${wa(consulta)}" target="_blank" rel="noopener">${texto}</a>`;
  if (p.agotado) $("#pAcciones").innerHTML = `<button class="btn btn-negro" disabled>Agotado</button>` + botonWa("Consultar si vuelve a entrar");
  else if (colSel && colAgotado(colSel)) $("#pAcciones").innerHTML = `<button class="btn btn-negro" disabled>Agotado en ${esc(colSel.nombre)}</button>` + (WHATSAPP ? botonWa("Consultar por WhatsApp") : "");
  else if (tienePrecio) $("#pAcciones").innerHTML = `<button class="btn btn-negro" id="agregarBtn">Agregar al carrito</button>` + (WHATSAPP ? botonWa("Consultar por WhatsApp") : "");
  else $("#pAcciones").innerHTML = botonWa("Consultar precio por WhatsApp");
}
$("#vista-producto").addEventListener("click", e => {
  const p = producto(sel.id); if (!p) return;
  const f = e.target.closest("[data-foto]");
  if (f) { sel.foto = f.dataset.foto; if (f.dataset.color) sel.color = f.dataset.color; pintarProducto(); return; }
  const s = e.target.closest(".swatch");
  if (s) {
    sel.color = s.dataset.c; sel.foto = null; $("#pFalta").textContent = "";
    if (sel.talle && !talleDisponible(p, sel.color, sel.talle)) sel.talle = null; // ese talle no hay en este color
    pintarProducto(); return;
  }
  const t = e.target.closest(".talle");
  if (t) { sel.talle = +t.dataset.t; $("#pFalta").textContent = ""; pintarProducto(); return; }
  if (e.target.closest("#agregarBtn")) {
    const faltaColor = (p.colores || []).length && !sel.color;
    if (faltaColor || !sel.talle) { $("#pFalta").textContent = faltaColor && !sel.talle ? "Elegí el color y tu talle." : faltaColor ? "Elegí un color." : "Elegí tu talle."; return; }
    agregar(p.id, sel.color, sel.talle);
    festejar($("#agregarBtn"));
    setTimeout(abrirCarrito, SIN_MOVIMIENTO ? 0 : 450);
  }
});

// Calculadora de envío en la página de producto
const opcionesProv = `<option value="">Provincia</option>` + PROVINCIAS.map(p => `<option>${p}</option>`).join("");
$("#calcProv").innerHTML = opcionesProv;
$("#ckProv").innerHTML = opcionesProv;
const zonaGuardada = leer("nacireina-cp", {});
$("#calcCP").value = zonaGuardada.cp || ""; $("#calcProv").value = zonaGuardada.provincia || ""; $("#calcLoc").value = zonaGuardada.localidad || "";
const diasTxt = d => d && d.min ? (d.max && d.max !== d.min ? `Llega entre ${d.min} y ${d.max} días hábiles` : `Llega en ${d.min} días hábiles`) : "";

$("#calcForm").addEventListener("submit", async e => {
  e.preventDefault();
  // El correo cotiza por localidad: sin ella no hay precio real
  const cp = $("#calcCP").value.trim(), provincia = $("#calcProv").value, localidad = $("#calcLoc").value.trim();
  if (!/\d{4}/.test(cp) || !provincia || !localidad) { $("#calcRes").innerHTML = `<p class="aviso-error">Ingresá tu código postal, provincia y localidad.</p>`; return; }
  escribir("nacireina-cp", { cp, provincia, localidad });
  $("#calcRes").innerHTML = `<p class="cargando">Calculando…</p>`;
  try {
    const r = await api("/api/cotizar-envio", { cp, provincia, localidad, items: [{ id: sel.id, color: sel.color, cant: 1 }] });
    $("#calcRes").innerHTML = `<ul class="opciones-envio">${r.opciones.map(o => `<li><span>${esc(o.nombre)}<small>${esc(o.tipo === "local" ? o.detalle : diasTxt(o.dias))}</small></span><b class="${o.precio ? "" : "gratis"}">${o.precio ? pesos(o.precio) : "Gratis"}</b></li>`).join("")}</ul>`;
  } catch (err) {
    $("#calcRes").innerHTML = `<p class="aviso-error">${esc(err.message)}</p>`;
  }
});

// ---------- Checkout por pasos ----------
const ck = { paso: 1, cot: null, opcion: null, sucursal: null };
const datos = leer("nacireina-datos", {});
[["ckEmail", "email"], ["ckNombre", "nombre"], ["ckTel", "telefono"], ["ckDni", "dni"], ["ckCalle", "calle"], ["ckNum", "numero"], ["ckPiso", "piso"], ["ckLoc", "localidad"]]
  .forEach(([id, k]) => { if (datos[k]) document.getElementById(id).value = datos[k]; });
$("#ckCP").value = zonaGuardada.cp || ""; $("#ckProv").value = zonaGuardada.provincia || "";
const val = id => document.getElementById(id).value.trim();

function mostrarCheckout() {
  if (!carrito.length || hayConsultar()) { location.hash = ""; abrirCarrito(); return; }
  document.title = "Finalizar compra · Nací Reina Calzados";
  medir("InitiateCheckout", { value: cuenta().total, num_items: carrito.reduce((a, i) => a + i.cant, 0), content_ids: carrito.map(i => String(i.id)), content_type: "product" });
  // Si ya calculó el envío en la página del producto, se completa solo
  const z = leer("nacireina-cp", {});
  if (!val("ckCP") && z.cp) { $("#ckCP").value = z.cp; $("#ckProv").value = z.provincia || ""; }
  if (!val("ckLoc") && z.localidad) $("#ckLoc").value = z.localidad;
  pintarCheckout();
}
function pintarCheckout() {
  // Resumen
  $("#resLineas").innerHTML = carrito.map(i => { const p = producto(i.id); return `
    <div class="linea"><div class="mini">${img(fotoDe(p, i.color), p.nombre)}<span class="q">${i.cant}</span></div>
      <div><b>${esc(p.nombre)}</b><span>${esc(detalleItem(i))}</span></div><div class="m">${pesos(precioDe(p, i.color) * i.cant)}</div></div>`; }).join("");
  const envio = ck.opcion ? ck.opcion.precio : null;
  const cta = cuenta();
  $("#resCuentas").innerHTML = `<div><span>Subtotal</span><span>${pesos(cta.subtotal)}</span></div>
    ${cta.porcentaje ? `<div class="gratis"><span>Descuento ${cta.porcentaje}% OFF</span><span>−${pesos(cta.descuento)}</span></div>` : ""}
    <div><span>Envío</span><span>${envio == null ? '<span style="color:var(--tinta-2)">Se calcula en el paso 2</span>' : envio ? pesos(envio) : '<span class="gratis">Gratis</span>'}</span></div>
    <div class="tot"><span>Total</span><span>${pesos(cta.total + (envio || 0))}</span></div>`;
  $("#pagarTxt").textContent = `Pagar ${pesos(cta.total + (envio || 0))} con Mercado Pago`;
  pintarAvisoTransf();
  // Transferencia: mismo pedido con el descuento extra (sobre los productos, no sobre el envío)
  $("#conTransf").hidden = !(transf && transf.porcentaje);
  if (transf && transf.porcentaje) {
    const ct = cuenta(transf.porcentaje);
    $("#pctTransf").textContent = transf.porcentaje;
    $("#totalTransf").textContent = pesos(ct.total + (envio || 0));
    $("#ahorroTransf").textContent = ` (ahorrás ${pesos(ct.descuentoTransferencia)})`;
  }

  // Pasos
  for (let n = 1; n <= 3; n++) {
    const el = $("#paso" + n);
    el.classList.toggle("cerrado", n !== ck.paso);
    el.classList.toggle("bloqueado", n > ck.paso);
    const li = document.querySelector(`#pasosCk li[data-p="${n}"]`);
    li.classList.toggle("hecho", n < ck.paso);
    if (n === ck.paso) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    const ed = el.querySelector("[data-editar]"); if (ed) ed.hidden = !(n < ck.paso);
    const res = $("#res" + n); if (res) res.hidden = !(n < ck.paso);
  }
  $("#res1").textContent = [val("ckNombre"), val("ckTel"), val("ckEmail")].filter(Boolean).join(" · ");
  if (ck.opcion) {
    const o = ck.opcion;
    $("#res2").textContent = o.tipo === "local" ? `Retiro en el local · ${CATALOGO.local.direccion}`
      : o.tipo === "sucursal" ? `${o.nombre} · ${ck.sucursal ? ck.sucursal.nombre : ""}`
      : `${o.nombre} · ${val("ckCalle")} ${val("ckNum")}${val("ckPiso") ? " " + val("ckPiso") : ""}, ${val("ckLoc")}`;
  }
  pintarOpciones();
  pintarTarjeta();
}
function irPaso(n) { ck.paso = n; pintarCheckout(); $("#paso" + n).scrollIntoView({ behavior: "smooth", block: "start" }); }

$("#vista-checkout").addEventListener("click", e => {
  const ed = e.target.closest("[data-editar]");
  if (ed) irPaso(+ed.dataset.editar);
});

// Paso 1: datos
$("#form1").addEventListener("submit", e => {
  e.preventDefault();
  document.querySelectorAll("#form1 .in").forEach(i => i.classList.remove("mal"));
  const faltan = [];
  const marcar = (id, txt) => { document.getElementById(id).classList.add("mal"); faltan.push(txt); };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("ckEmail"))) marcar("ckEmail", "tu email");
  if (val("ckNombre").split(/\s+/).length < 2) marcar("ckNombre", "tu nombre y apellido");
  if (val("ckTel").replace(/\D/g, "").length < 8) marcar("ckTel", "tu teléfono con código de área");
  if (!/^\d{7,8}$/.test(val("ckDni").replace(/\D/g, ""))) marcar("ckDni", "tu DNI (7 u 8 números)");
  if (faltan.length) { $("#falta1").textContent = "Completá " + juntar(faltan) + "."; document.querySelector("#form1 .mal").focus(); return; }
  $("#falta1").textContent = "";
  guardarDatos();
  irPaso(2);
  if (!ck.cot && val("ckCP") && $("#ckProv").value && val("ckLoc")) cotizarCheckout();
});
const juntar = l => l.length > 1 ? l.slice(0, -1).join(", ") + " y " + l[l.length - 1] : l[0];
function guardarDatos() {
  escribir("nacireina-datos", { email: val("ckEmail"), nombre: val("ckNombre"), telefono: val("ckTel"), dni: val("ckDni"),
    calle: val("ckCalle"), numero: val("ckNum"), piso: val("ckPiso"), localidad: val("ckLoc") });
}

// Paso 2: entrega
$("#formCP").addEventListener("submit", e => { e.preventDefault(); cotizarCheckout(); });
["ckCP", "ckProv", "ckLoc"].forEach(id => document.getElementById(id).addEventListener("change", () => { ck.cot = null; ck.opcion = null; ck.sucursal = null; pintarCheckout(); }));

async function cotizarCheckout() {
  const cp = val("ckCP"), provincia = $("#ckProv").value, localidad = val("ckLoc");
  if (!/\d{4}/.test(cp) || !provincia || !localidad) { $("#falta2").textContent = "Ingresá tu código postal, provincia y localidad."; return; }
  escribir("nacireina-cp", { cp, provincia, localidad });
  $("#falta2").textContent = "";
  ck.cot = null; ck.opcion = null; ck.sucursal = null;
  $("#opcionesCk").innerHTML = `<p class="cargando">Buscando opciones de envío…</p>`;
  try {
    ck.cot = await api("/api/cotizar-envio", { cp, provincia, localidad, items: carrito.map(i => ({ id: i.id, color: i.color, cant: i.cant })) });
  } catch (err) {
    $("#opcionesCk").innerHTML = "";
    // Aunque no se pueda cotizar, siempre se puede retirar en el local
    ck.cot = { opciones: [{ id: "local", tipo: "local", nombre: "Retiro en el local", precio: 0, detalle: CATALOGO.local.direccion }] };
    $("#falta2").textContent = err.message;
  }
  pintarCheckout();
}
function pintarOpciones() {
  if (!ck.cot) { if (!$("#opcionesCk").querySelector(".cargando")) $("#opcionesCk").innerHTML = ""; $("#ckDomicilio").hidden = true; $("#ckSucursal").hidden = true; return; }
  $("#opcionesCk").innerHTML = ck.cot.opciones.map(o => `
    <label class="radio"><input type="radio" name="opcion" value="${esc(o.id)}"${ck.opcion && ck.opcion.id === o.id ? " checked" : ""}>
      <span class="txt"><b>${esc(o.nombre)}</b><small>${esc(o.tipo === "local" ? o.detalle : o.tipo === "sucursal" ? `${diasTxt(o.dias) || "Retirás en la sucursal que elijas"}` : diasTxt(o.dias))}</small></span>
      <span class="pr">${o.precio ? pesos(o.precio) : `<span class="gratis">Gratis</span>`}${o.precioOriginal > o.precio ? `<br><s style="font-weight:400;color:var(--tinta-2);font-size:13px">${pesos(o.precioOriginal)}</s>` : ""}</span>
    </label>`).join("");
  const o = ck.opcion;
  $("#ckDomicilio").hidden = !o || o.tipo !== "domicilio";
  $("#ckSucursal").hidden = !o || o.tipo !== "sucursal";
  if (o && o.tipo === "sucursal") {
    $("#listaSucursales").innerHTML = o.sucursales.map(s => `
      <label class="radio"><input type="radio" name="sucursal" value="${esc(s.id)}"${ck.sucursal && ck.sucursal.id === s.id ? " checked" : ""}>
        <span class="txt"><b>${esc(s.nombre)}</b><small>${esc(s.direccion)}${s.horario ? "<br>" + esc(s.horario) : ""}</small></span></label>`).join("");
  }
}
$("#paso2").addEventListener("change", e => {
  if (e.target.name === "opcion") { ck.opcion = ck.cot.opciones.find(o => o.id === e.target.value); ck.sucursal = null; $("#falta2").textContent = ""; pintarCheckout(); }
  if (e.target.name === "sucursal") { ck.sucursal = ck.opcion.sucursales.find(s => s.id === e.target.value); $("#falta2").textContent = ""; }
});
$("#continuar2").addEventListener("click", () => {
  document.querySelectorAll("#paso2 .in").forEach(i => i.classList.remove("mal"));
  const o = ck.opcion;
  if (!ck.cot) { $("#falta2").textContent = "Ingresá tu código postal y tocá “Ver opciones de envío”."; return; }
  if (!o) { $("#falta2").textContent = "Elegí cómo querés recibir tu pedido."; return; }
  const faltan = [];
  const marcar = (id, txt) => { document.getElementById(id).classList.add("mal"); faltan.push(txt); };
  if (o.tipo === "domicilio") {
    if (!val("ckCalle")) marcar("ckCalle", "la calle");
    if (!val("ckNum")) marcar("ckNum", "el número");
    if (!val("ckLoc")) marcar("ckLoc", "la localidad");
  }
  if (o.tipo === "sucursal") {
    if (!val("ckLoc")) marcar("ckLoc", "la localidad");
    if (!ck.sucursal && !faltan.length) { $("#falta2").textContent = "Elegí la sucursal del correo donde vas a retirar."; return; }
  }
  if (faltan.length) { $("#falta2").textContent = "Completá " + juntar(faltan) + "."; return; }
  $("#falta2").textContent = "";
  guardarDatos();
  irPaso(3);
});

// Paso 3: pago
function datosPedido() {
  const o = ck.opcion;
  return {
    items: carrito.map(i => ({ id: i.id, talle: i.talle, color: i.color, cant: i.cant })),
    cliente: { nombre: val("ckNombre"), telefono: val("ckTel"), email: val("ckEmail"), dni: val("ckDni") },
    entrega: { opcion: o.id, sucursal: ck.sucursal ? ck.sucursal.id : null, cp: val("ckCP"), provincia: $("#ckProv").value,
      localidad: val("ckLoc"), calle: val("ckCalle"), numero: val("ckNum"), piso: val("ckPiso") }
  };
}
function recordarPedido(numero, total, cliente) {
  escribir("nacireina-ultimo-pedido", {
    numero, total,
    lineas: carrito.map(i => `${i.cant} x ${producto(i.id).nombre} - ${detalleItem(i)}`),
    cliente, entrega: $("#res2").textContent, local: ck.opcion.tipo === "local"
  });
}
$("#pagar").addEventListener("click", async () => {
  const o = ck.opcion;
  if (!o) { irPaso(2); return; }
  const pedido = datosPedido();
  $("#pagar").disabled = true; $("#pagarTxt").textContent = "Conectando con Mercado Pago…"; $("#falta3").textContent = "";
  try {
    const r = await api("/api/crear-pago", pedido);
    recordarPedido(r.pedido, totalProductos() + o.precio, pedido.cliente);
    location.href = r.url;
  } catch (err) {
    $("#pagar").disabled = false; pintarCheckout();
    $("#falta3").textContent = err.message;
    if (/agot/i.test(err.message)) actualizarStock(); // algo se agotó mientras compraba: se marca en el carrito
  }
});
// ---------- Pago por transferencia ----------
$("#pagarTransf").addEventListener("click", async () => {
  const o = ck.opcion;
  if (!o) { irPaso(2); return; }
  const pedido = datosPedido();
  const b = $("#pagarTransf"); b.disabled = true; b.textContent = "Registrando tu pedido…"; $("#falta3").textContent = "";
  try {
    const r = await api("/api/transferencia", pedido);
    const lineas = carrito.map(i => `${i.cant} x ${producto(i.id).nombre} - ${detalleItem(i)}`);
    carrito = []; escribir("nacireina-carrito", carrito); pintarCarrito();
    const c = r.cuenta || {};
    const dato = (t, v, copiar) => v ? `<div class="dato-transf"><span>${t}</span><b>${esc(v)}</b>${copiar ? `<button class="link" data-copiar="${esc(copiar)}">Copiar</button>` : ""}</div>` : "";
    const msj = r.cuenta ? `¡Hola Nací Reina! Hice la transferencia del pedido ${r.pedido} por ${pesos(r.total)}. Te mando el comprobante.`
      : `¡Hola Nací Reina! Hice el pedido ${r.pedido} para pagar con transferencia (${pesos(r.total)}). ¿Me pasan el alias?`;
    $("#resTit").textContent = "¡Pedido reservado!";
    const hayDatos = Boolean(c.alias || c.cbu);
    $("#resCuerpo").innerHTML = (hayDatos
      ? `<p style="margin:0">Tu pedido <b>${esc(r.pedido)}</b> quedó reservado. Para confirmarlo, transferí <b>${pesos(r.total)}</b> a esta cuenta:</p>
      <div class="datos-transf">${dato("Alias", c.alias, c.alias)}${dato("CBU/CVU", c.cbu, c.cbu)}${dato("Titular", c.titular)}${dato("Banco", c.banco)}${dato("Monto", pesos(r.total), String(r.total).replace(".", ","))}</div>`
      : `<p style="margin:0">Tu pedido <b>${esc(r.pedido)}</b> quedó reservado con el descuento. Tenés que transferir <b>${pesos(r.total)}</b>: escribinos por WhatsApp y te pasamos el alias para hacerlo.</p>`) + `
      <ul>${lineas.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      <p style="margin:0">Después mandanos el comprobante por WhatsApp. Cuando veamos el pago, te avisamos y preparamos tu pedido.</p>
      ${WHATSAPP ? `<a class="btn btn-wa lleno" href="${wa(msj)}" target="_blank" rel="noopener">${r.cuenta ? "Mandar comprobante por WhatsApp" : "Pedir el alias por WhatsApp"}</a>` : ""}`;
    history.pushState(null, "", location.pathname); ruta();   // vuelve al inicio sin cerrar el cartel
    $("#resultado").hidden = false;
  } catch (err) {
    $("#falta3").textContent = err.message;
    if (/agot|quedan|queda 1/i.test(err.message)) actualizarStock();
  }
  b.disabled = false; b.textContent = "Confirmar y pagar con transferencia";
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copiar]"); if (!b) return;
  navigator.clipboard && navigator.clipboard.writeText(b.dataset.copiar).then(() => { b.textContent = "¡Copiado!"; setTimeout(() => { b.textContent = "Copiar"; }, 1500); });
});
$("#seguirComprando").addEventListener("click", () => { location.hash = ""; });

// ---------- Pago con tarjeta dentro de la página (formulario de Mercado Pago) ----------
// Los datos de la tarjeta los carga el formulario de Mercado Pago, que los convierte en un código de un solo uso:
// a nuestro servidor solo llega ese código. Si falta la clave pública, se paga solo con el botón de Mercado Pago.
const pagoTarjeta = { clave: undefined, mp: null, brick: null, monto: null, armando: false };
function cargarScript(src) {
  return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
}
async function prepararTarjeta() {
  if (pagoTarjeta.clave === undefined) {
    try { pagoTarjeta.clave = (await configPublica).mpPublicKey || null; } catch (e) { pagoTarjeta.clave = null; }
  }
  if (!pagoTarjeta.clave) return false;
  if (!window.MercadoPago) { try { await cargarScript("https://sdk.mercadopago.com/js/v2"); } catch (e) { pagoTarjeta.clave = null; return false; } }
  if (!pagoTarjeta.mp) pagoTarjeta.mp = new MercadoPago(pagoTarjeta.clave, { locale: "es-AR" });
  return true;
}
function sacarTarjeta() {
  if (pagoTarjeta.brick) { try { pagoTarjeta.brick.unmount(); } catch (e) {} }
  pagoTarjeta.brick = null; pagoTarjeta.monto = null;
}
async function pintarTarjeta() {
  const enPago = !$("#vista-checkout").hidden && ck.paso === 3 && ck.opcion;
  if (!enPago) { sacarTarjeta(); return; }
  const monto = Math.round((totalProductos() + (ck.opcion.precio || 0)) * 100) / 100;
  if ((pagoTarjeta.brick && pagoTarjeta.monto === monto) || pagoTarjeta.armando) return;
  pagoTarjeta.armando = true;
  try {
    if (!(await prepararTarjeta())) { $("#conTarjeta").hidden = true; return; }
    sacarTarjeta();
    $("#conTarjeta").hidden = false; $("#tarjetaCargando").hidden = false;
    $("#textoMP").textContent = "Pagá con tu cuenta de Mercado Pago (dinero en cuenta o tarjetas guardadas).";
    $("#pagarTxt").textContent = "Pagar con mi cuenta de Mercado Pago";
    pagoTarjeta.monto = monto;
    pagoTarjeta.brick = await pagoTarjeta.mp.bricks().create("cardPayment", "tarjetaBrick", {
      initialization: { amount: monto, payer: { email: val("ckEmail") } },
      customization: {
        visual: { style: { theme: "default", customVariables: { baseColor: "#E0157F", borderRadiusLarge: "14px" } } },
        paymentMethods: { maxInstallments: 12 }
      },
      callbacks: {
        onReady: () => { $("#tarjetaCargando").hidden = true; },
        onError: err => { console.error("Formulario de tarjeta", err); },
        onSubmit: formData => pagarConTarjeta(formData)
      }
    });
  } catch (e) {
    console.error("No se pudo cargar el formulario de tarjeta", e);
    $("#conTarjeta").hidden = true;
  } finally { pagoTarjeta.armando = false; }
}
async function pagarConTarjeta(formData) {
  $("#falta3").textContent = "";
  const pedido = datosPedido();
  try {
    const r = await api("/api/pagar-tarjeta", { ...pedido, tarjeta: formData });
    if (r.estado === "aprobado" || r.estado === "pendiente") {
      recordarPedido(r.pedido, r.total, pedido.cliente);
      location.href = `${location.pathname}?pago=${r.estado}`;
      return;
    }
    $("#falta3").textContent = r.error || "El pago fue rechazado. Probá con otra pagoTarjeta.";
  } catch (err) {
    $("#falta3").textContent = err.message;
    if (/agot/i.test(err.message)) actualizarStock();
  }
  // El código de la tarjeta sirve una sola vez: se vuelve a armar el formulario para reintentar
  sacarTarjeta(); setTimeout(pintarTarjeta, 50);
  $("#falta3").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- Navegación entre vistas ----------
function ruta() {
  const h = decodeURIComponent(location.hash.slice(1));
  const vista = h.startsWith("p/") ? "producto" : h === "checkout" ? "checkout" : "inicio";
  ["inicio", "producto", "checkout"].forEach(v => { $("#vista-" + v).hidden = v !== vista; });
  $("#flotante").hidden = !WHATSAPP || vista === "checkout";
  if (vista === "producto") { const [pid, col] = h.slice(2).split("/"); mostrarProducto(+pid, col); window.scrollTo(0, 0); return; }
  if (vista === "checkout") { mostrarCheckout(); window.scrollTo(0, 0); return; }
  document.title = "Nací Reina Calzados | Botas, zapatillas y sandalias en Ramos Mejía";
  if (h.startsWith("cat/")) { catActual = h.slice(4); pintarCatalogo(); $("#catalogo").scrollIntoView(); return; }
  pintarCatalogo();
  const destino = h && document.getElementById(h);
  if (destino && destino.tagName === "DETAILS") destino.open = true;
  if (destino) destino.scrollIntoView(); else window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { $("#resultado").hidden = true; cerrarCarrito(); ruta(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#arrepentimiento").hidden) $("#arrepentimiento").hidden = true;
  else if (!$("#resultado").hidden) $("#resultado").hidden = true; else cerrarCarrito();
});

// ---------- Textos que dependen de la configuración ----------
if (ENVIO.gratisDesde > 0) {
  const pctTransf = Number((CATALOGO.transferencia || {}).porcentaje) || 0;
  $("#aviso").innerHTML = `<b>Envío gratis</b> desde ${pesos(ENVIO.gratisDesde)}${DESCUENTO.desde > 0 ? ` · <b>${DESCUENTO.porcentaje}% OFF</b> desde ${pesos(DESCUENTO.desde)}` : ""}${pctTransf ? ` · <b>${pctTransf}% OFF</b> con transferencia` : ""} · Envíos a todo el país`;
  $("#pGratis").textContent = `Envío gratis en compras desde ${pesos(ENVIO.gratisDesde)}.`;
  $("#ventajaEnvio").textContent = `Gratis desde ${pesos(ENVIO.gratisDesde)}. A domicilio o a sucursal.`;
}
// Franja de arriba: en el celular pasa como cinta (una sola línea en vez de tres)
{
  const a = $("#aviso"), txt = a.innerHTML;
  a.innerHTML = `<div class="cinta"><span>${txt}</span><span aria-hidden="true">${txt}</span></div>`;
}
if (WHATSAPP) $("#flotante").href = wa("¡Hola Nací Reina! Tengo una consulta:");

// ---------- Carrusel del inicio: una foto de fondo por promo (los montos salen de productos.js) ----------
{
  const pctTransf = Number((CATALOGO.transferencia || {}).porcentaje) || 0;
  const fotos = [...document.querySelectorAll(".hero-fotos img")];
  const promos = [
    ENVIO.gratisDesde > 0 && { b: `<em>Envío gratis</em> desde ${pesos(ENVIO.gratisDesde)}` },
    DESCUENTO.desde > 0 && DESCUENTO.porcentaje > 0 && { b: `<em>${DESCUENTO.porcentaje}% OFF</em> desde ${pesos(DESCUENTO.desde)}`, s: "Sumá a tu carrito y obtené beneficios" },
    pctTransf > 0 && { b: `<em>${pctTransf}% OFF</em> con transferencia`, s: "Hacemos envíos a todo el país" }
  ].map((p, i) => p && { ...p, foto: fotos[i] }).filter(Boolean);
  fotos.forEach(f => { if (!promos.some(p => p.foto === f)) f.remove(); });
  $("#promos").innerHTML = promos.map((p, i) => `<p class="promo${i ? "" : " on"}"><b>${p.b}</b>${p.s ? `<span>${p.s}</span>` : ""}</p>`).join("");
  $("#heroPuntos").innerHTML = promos.length > 1 ? promos.map((p, i) => `<button type="button" aria-label="Promoción ${i + 1}" aria-pressed="${!i}"></button>`).join("") : "";
  let actual = 0, timer = null;
  const mostrar = i => {
    actual = (i + promos.length) % promos.length;
    promos.forEach((p, j) => p.foto.classList.toggle("on", j === actual));
    document.querySelectorAll("#promos .promo").forEach((el, j) => el.classList.toggle("on", j === actual));
    document.querySelectorAll("#heroPuntos button").forEach((b, j) => b.setAttribute("aria-pressed", j === actual));
  };
  if (promos.length) mostrar(0);
  const arrancar = () => {
    clearInterval(timer);
    if (promos.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => { if (!document.hidden) mostrar(actual + 1); }, 5000);
  };
  $("#heroPuntos").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    mostrar([...b.parentNode.children].indexOf(b)); arrancar();
  });
  arrancar();
}
document.querySelectorAll("[data-gratis]").forEach(el => { el.textContent = ENVIO.gratisDesde > 0 ? `En compras desde ${pesos(ENVIO.gratisDesde)} el envío es gratis.` : ""; });

// ---------- Botón de arrepentimiento ----------
const formArrOriginal = $("#arrCuerpo").innerHTML;
document.addEventListener("click", e => {
  if (e.target.closest("[data-arrepentimiento]")) {
    if (!$("#arrNombre")) $("#arrCuerpo").innerHTML = formArrOriginal; // si ya había mandado una, formulario nuevo
    $("#arrepentimiento").hidden = false; $("#arrNombre").focus();
  }
  if (e.target.closest("[data-cerrar-arr]") || e.target === $("#arrepentimiento")) $("#arrepentimiento").hidden = true;
});
$("#formArr").addEventListener("submit", async e => {
  e.preventDefault();
  const datos = { nombre: $("#arrNombre").value.trim(), email: $("#arrEmail").value.trim(), telefono: $("#arrTel").value.trim(), pedido: $("#arrPedido").value.trim(), motivo: $("#arrMotivo").value.trim() };
  if (!datos.nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email) || !datos.pedido) { $("#arrError").textContent = "Completá tu nombre, email y número de pedido."; return; }
  $("#arrError").textContent = "";
  try {
    const r = await api("/api/arrepentimiento", datos);
    $("#arrCuerpo").innerHTML = `<p style="margin:0">Recibimos tu solicitud. Tu código de trámite es <b>${esc(r.codigo)}</b>: guardalo.</p><p style="margin:0;color:var(--tinta-2)">Te vamos a contactar en las próximas 24 horas hábiles para coordinar la devolución del producto y el reintegro del dinero.</p><button type="button" class="btn btn-negro" data-cerrar-arr>Cerrar</button>`;
  } catch (err) {
    $("#arrError").textContent = err.message + (WHATSAPP ? " También podés pedirlo por WhatsApp." : "");
  }
});

// ---------- Vuelta de Mercado Pago ----------
(function () {
  const estado = new URLSearchParams(location.search).get("pago");
  if (!estado) return;
  history.replaceState(null, "", location.pathname);
  const ult = leer("nacireina-ultimo-pedido", null);
  const lista = ult ? `<ul>${ult.lineas.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p style="margin:0"><b>Total: ${pesos(ult.total)}</b><br>${esc(ult.entrega)}</p>` : "";
  let tit, cuerpo;
  if (estado === "aprobado" || estado === "pendiente") {
    carrito = []; escribir("nacireina-carrito", carrito);
  }
  if (estado === "aprobado") {
    tit = "¡Gracias por tu compra!";
    if (ult) medir("Purchase", { value: ult.total, content_type: "product" }, ult.numero);
    cuerpo = `<img class="isotipo-grande" src="img/isotipo.svg" alt="" style="margin:0"><p style="margin:0">Recibimos tu pago${ult ? ` del pedido <b>${esc(ult.numero)}</b>` : ""}. ${ult && ult.local ? "Te avisamos por WhatsApp cuando esté listo para retirar." : "Te avisamos por WhatsApp cuando lo despachemos, con el número de seguimiento."}</p>${lista}`;
    if (WHATSAPP && ult) {
      const t = `¡Hola Nací Reina! Ya pagué el pedido ${ult.numero}:\n\n${ult.lineas.map(l => "• " + l).join("\n")}\n\nTotal: ${pesos(ult.total)}\nNombre: ${ult.cliente.nombre}\nEntrega: ${ult.entrega}`;
      cuerpo += `<a class="btn btn-wa lleno" href="${wa(t)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>`;
    }
  } else if (estado === "pendiente") {
    tit = "Tu pago está en proceso";
    cuerpo = `<p style="margin:0">Mercado Pago todavía está procesando el pago${ult ? ` del pedido <b>${esc(ult.numero)}</b>` : ""}. Cuando se apruebe, te contactamos.</p>${lista}`;
  } else {
    tit = "El pago no se completó";
    cuerpo = `<p style="margin:0">No se hizo ningún cobro. Tu carrito sigue guardado: podés intentar de nuevo con otro medio de pago.</p><a class="btn btn-mp" href="#checkout" id="reintentar">Volver a intentar</a>`;
  }
  $("#resTit").textContent = tit; $("#resCuerpo").innerHTML = cuerpo; $("#resultado").hidden = false;
  $("#reintentar")?.addEventListener("click", () => { $("#resultado").hidden = true; });
})();
$("#resCerrar").addEventListener("click", () => { $("#resultado").hidden = true; });
$("#resultado").addEventListener("click", e => { if (e.target === $("#resultado")) $("#resultado").hidden = true; });

// ---------- Carrusel de las tarjetas ----------
// Cada 2,8 segundos, las tarjetas que se ven en pantalla pasan a la foto del color siguiente
// (y se marca ese color en los puntitos). No corre si la persona pidió menos movimiento en su celular.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setInterval(() => {
    if (document.hidden) return;
    document.querySelectorAll(".card .foto.carrusel").forEach(f => {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const imgs = f.querySelectorAll("img");
      const i = [...imgs].findIndex(x => x.classList.contains("on"));
      const sig = (i + 1) % imgs.length;
      if (!imgs[sig].complete) return;   // espera a que cargue la próxima foto
      imgs[i].classList.remove("on"); imgs[sig].classList.add("on");
      f.closest(".card").querySelectorAll(".puntos i[data-foto]").forEach(p => p.classList.toggle("on", +p.dataset.foto === sig));
    });
  }, 2800);
}

// ---------- Stock actualizado ----------
// Se pide al abrir la página y cada vez que se vuelve a la pestaña (por si algo se agotó mientras tanto)
function refrescarVista() {
  pintarCarrito();
  if (!$("#vista-producto").hidden && sel.id) pintarProducto();
  else if (!$("#vista-checkout").hidden) { if (!carrito.length || hayConsultar()) { location.hash = ""; abrirCarrito(); } else pintarCheckout(); }
  else pintarCatalogo();
}
async function actualizarStock() {
  try {
    const r = await fetch("/api/stock", { cache: "no-store" });
    if (!r.ok) return;
    const ajustes = await r.json();
    escribir("nacireina-stock", ajustes);
    PRODUCTOS = aplicarAjustes(CATALOGO.productos, ajustes);
    // Si en el carrito hay más pares de los que quedan, se baja a los que hay
    let bajo = false;
    for (const i of carrito) { const p = producto(i.id); const m = p ? maxCant(p, i.color, i.talle) : 10; if (m > 0 && i.cant > m) { i.cant = m; bajo = true; } }
    if (bajo) escribir("nacireina-carrito", carrito);
    refrescarVista();
  } catch (e) { /* sin conexión: se usa el último stock conocido */ }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") actualizarStock(); });

pintarCarrito();
// Links de publicidad y catálogos: ?p=84 (y opcional &c=negro) abre ese producto. Se conservan los utm_* para medir.
{
  const q = new URLSearchParams(location.search), pid = q.get("p");
  if (pid && /^\d+$/.test(pid)) {
    const col = q.get("c"); q.delete("p"); q.delete("c");
    const resto = q.toString();
    history.replaceState(null, "", location.pathname + (resto ? "?" + resto : "") + "#p/" + pid + (col ? "/" + encodeURIComponent(col) : ""));
  }
}
ruta();
actualizarStock();

// ---------- Animaciones de entrada ----------
// Las secciones y tarjetas aparecen suavemente (de abajo hacia arriba) cuando entran en pantalla.
// No corre si la persona pidió menos movimiento en su celular.
var SIN_MOVIMIENTO = matchMedia("(prefers-reduced-motion: reduce)").matches;
var observador = !SIN_MOVIMIENTO && "IntersectionObserver" in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visto"); observador.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" })
  : null;
function animarEntrada(raiz) {
  if (!observador) return;
  raiz.querySelectorAll(".card, .fila-tit").forEach((el, i) => {
    if (el.classList.contains("visto")) return;
    el.classList.add("revelar"); el.style.setProperty("--d", (i % 4) * 70 + "ms"); observador.observe(el);
  });
}
if (observador) {
  document.querySelectorAll(".bloque > h2, .bloque > .sub, .ventaja, .card-l, #ayuda details").forEach((el, i) => {
    el.classList.add("revelar"); el.style.setProperty("--d", (i % 3) * 80 + "ms"); observador.observe(el);
  });
  animarEntrada($("#grilla"));
}

// ---------- Efectos "wow" (inspirados en Power Up) ----------
// Números que cuentan solos al aparecer (modelos y colores salen del catálogo)
{
  const valores = {
    modelos: PRODUCTOS.length,
    colores: PRODUCTOS.reduce((n, p) => n + (p.colores || []).length, 0)
  };
  const contar = el => {
    const fin = valores[el.dataset.contar] ?? Number(el.dataset.contar), pre = el.dataset.pre || "";
    if (SIN_MOVIMIENTO) { el.textContent = pre + fin; return; }
    const t0 = performance.now(), dur = 1600;
    const paso = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = pre + Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  const nums = document.querySelectorAll("[data-contar]");
  if ("IntersectionObserver" in window) {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { contar(e.target); o.unobserve(e.target); } }), { threshold: .6 });
    nums.forEach(n => o.observe(n));
  } else nums.forEach(contar);
  // El texto del manifiesto entra palabra por palabra
  document.querySelectorAll(".revelar-pal").forEach(el => {
    if (SIN_MOVIMIENTO || !observador) return;
    let i = 0;
    const partir = nodo => [...nodo.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w.trim()) { f.append(w); return; }
          const s = document.createElement("span"); s.className = "pal"; s.style.setProperty("--d", (i++ * 70) + "ms"); s.textContent = w; f.append(s);
        });
        n.replaceWith(f);
      } else partir(n);
    });
    partir(el);
    observador.observe(el);
  });
}
// Cursor propio en la compu: un círculo rosa que sigue al mouse y se agranda sobre lo que se puede tocar
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !SIN_MOVIMIENTO) {
  const cur = $("#cursor"); let x = -100, y = -100, cx = x, cy = y;
  document.addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; cur.classList.add("on"); });
  document.addEventListener("mouseleave", () => cur.classList.remove("on"));
  document.addEventListener("mouseover", e => cur.classList.toggle("grande", !!e.target.closest("a, button, .card, summary, label")));
  (function mover() { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(mover); })();
  // Tarjetas que se inclinan en 3D siguiendo el mouse
  document.addEventListener("mousemove", e => {
    const f = e.target.closest(".card .foto"); document.querySelectorAll(".card .foto.inclinada").forEach(o => { if (o !== f) { o.classList.remove("inclinada"); o.style.transform = ""; } });
    if (!f) return;
    const r = f.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
    f.classList.add("inclinada"); f.style.transform = `perspective(700px) rotateY(${dx * 10}deg) rotateX(${-dy * 10}deg)`;
  });
}
// Lluvia de coronas y corazones al agregar al carrito
function festejar(desde) {
  if (SIN_MOVIMIENTO || !desde) return;
  const r = desde.getBoundingClientRect(), simbolos = ["♛", "✦", "♥", "✧", "♛"];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement("span"); s.className = "chispa"; s.textContent = simbolos[i % simbolos.length];
    const ang = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 120;
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;--x:${Math.cos(ang) * dist}px;--y:${Math.sin(ang) * dist - 60}px;--r:${(Math.random() - .5) * 120}deg;color:${i % 3 ? "#E0157F" : "#D4A017"};font-size:${14 + Math.random() * 16}px`;
    document.body.append(s); setTimeout(() => s.remove(), 1100);
  }
}
