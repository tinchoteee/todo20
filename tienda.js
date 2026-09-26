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
const CATS = [
  { id: "todo", nombre: "Todo" }, { id: "botas", nombre: "Botas" }, { id: "borcegos", nombre: "Borcegos" },
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
const precioTxt = p => { const r = rangoDe(p); return !r ? "Consultar precio" : r.min !== r.max ? "Desde " + pesos(r.min) : pesos(r.min); };
const colorDe = (p, cid) => (p.colores || []).find(c => c.id === cid);
const nombreCat = id => (CATS.find(c => c.id === id) || { nombre: id }).nombre;
const fotoDe = (p, cid) => (colorDe(p, cid) || {}).foto || p.foto || ((p.colores || []).find(c => c.foto) || {}).foto || "";
const img = (src, alt = "") => src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : "";
const wa = texto => (WHATSAPP ? `https://wa.me/${WHATSAPP}` : "https://wa.me/") + (texto ? "?text=" + encodeURIComponent(texto) : "");
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def } catch (e) { return def } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };

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
function problemaItem(i) {
  const p = producto(i.id);
  if (!(precioDe(p, i.color) > 0)) return "Precio a consultar";
  if (!talleDisponible(p, i.color, i.talle)) return "Se agotó";
  return null;
}

// ---------- Carrito ----------
let carrito = leer("nacireina-carrito", []).filter(i => producto(i.id) && producto(i.id).talles.includes(i.talle));
const subtotal = () => carrito.reduce((a, i) => a + precioDe(producto(i.id), i.color) * i.cant, 0);
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
  ex ? ex.cant++ : carrito.push({ id, color, talle, cant: 1 });
  guardarCarrito();
}

function pintarCarrito() {
  const cant = carrito.reduce((a, i) => a + i.cant, 0);
  $("#contador").textContent = cant || "";
  $("#abrirCarrito").setAttribute("aria-label", `Ver carrito (${cant} ${cant === 1 ? "producto" : "productos"})`);
  $("#panelF").hidden = !carrito.length;
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
  $("#subtotal").textContent = sinPrecio ? (sub ? pesos(sub) + " + a consultar" : "A consultar") : pesos(sub);
  const g = ENVIO.gratisDesde || 0;
  $("#barraGratis").hidden = !g;
  if (g) {
    const falta = g - sub;
    $("#barraGratis").innerHTML = (falta <= 0 ? `<span class="gratis">¡Tenés envío gratis!</span>` : `Te faltan <b>${pesos(falta)}</b> para el envío gratis`)
      + `<div class="barra"><i style="width:${Math.min(100, sub / g * 100)}%"></i></div>`;
  }
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
function abrirCarrito() { $("#velo").hidden = false; $("#panel").hidden = false; $("#cerrarCarrito").focus(); }
function cerrarCarrito() { $("#velo").hidden = true; $("#panel").hidden = true; }

$("#abrirCarrito").addEventListener("click", abrirCarrito);
$("#cerrarCarrito").addEventListener("click", cerrarCarrito);
$("#velo").addEventListener("click", cerrarCarrito);
$("#items").addEventListener("click", e => {
  const m = e.target.closest("[data-mas]"), n = e.target.closest("[data-menos]");
  if (m) { const i = carrito[+m.dataset.mas]; i.cant = Math.min(10, i.cant + 1); guardarCarrito(); }
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
  return `<a class="card${p.agotado ? " agotado" : ""}" href="#p/${p.id}">
    <div class="foto">${img(fotoDe(p), p.nombre)}${p.agotado ? '<span class="tag">Agotado</span>' : rangoDe(p) ? "" : '<span class="tag">Consultar</span>'}</div>
    <div>
      <h3>${esc(p.nombre)}</h3>
      <div class="meta">${esc(nombreCat(p.cat))}${cols.length > 1 ? ` · ${cols.length} colores` : cols.length ? ` · ${esc(cols[0].nombre)}` : ""}</div>
    </div>
    ${cols.length > 1 ? `<div class="puntos">${cols.map(c => `<i style="--sw:${esc(c.hex)}" title="${esc(c.nombre)}"></i>`).join("")}</div>` : ""}
    <div class="precio">${precioTxt(p)}</div>
  </a>`;
}
function pintarCatalogo() {
  $("#cats").innerHTML = CATS.map(c => `<button class="cat" data-cat="${c.id}" aria-pressed="${c.id === catActual}">${c.nombre}</button>`).join("");
  // Los agotados van al final
  $("#grilla").innerHTML = PRODUCTOS.filter(p => catActual === "todo" || p.cat === catActual)
    .sort((a, b) => a.agotado - b.agotado).map(tarjeta).join("");
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.dataset.cat === catActual));
}
$("#nav").innerHTML = CATS.filter(c => c.id !== "todo").map(c => `<a href="#cat/${c.id}" data-cat="${c.id}">${c.nombre}</a>`).join("");
$("#cats").addEventListener("click", e => {
  const b = e.target.closest(".cat"); if (!b) return;
  catActual = b.dataset.cat; pintarCatalogo();
});

// ---------- Página de producto ----------
const sel = { id: null, color: null, talle: null, foto: null };

function mostrarProducto(id) {
  const p = producto(id);
  if (!p) { location.hash = ""; return; }
  if (sel.id !== id) Object.assign(sel, { id, color: p.colores && p.colores.length === 1 ? p.colores[0].id : null, talle: null, foto: null });
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

  // Precio: el del color elegido; si todavía no eligió color, "Desde $X" cuando los colores cuestan distinto
  const precioSel = colSel ? precioDe(p, colSel.id) : 0;
  $("#pPrecio").textContent = colSel ? (precioSel > 0 ? pesos(precioSel) : "Consultar precio") : precioTxt(p);
  const tienePrecio = colSel ? precioSel > 0 : Boolean(rangoDe(p));

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
    abrirCarrito();
  }
});

// Calculadora de envío en la página de producto
const opcionesProv = `<option value="">Provincia</option>` + PROVINCIAS.map(p => `<option>${p}</option>`).join("");
$("#calcProv").innerHTML = opcionesProv;
$("#ckProv").innerHTML = opcionesProv;
const zonaGuardada = leer("nacireina-cp", {});
$("#calcCP").value = zonaGuardada.cp || ""; $("#calcProv").value = zonaGuardada.provincia || "";
const diasTxt = d => d && d.min ? (d.max && d.max !== d.min ? `Llega entre ${d.min} y ${d.max} días hábiles` : `Llega en ${d.min} días hábiles`) : "";

$("#calcForm").addEventListener("submit", async e => {
  e.preventDefault();
  const cp = $("#calcCP").value.trim(), provincia = $("#calcProv").value;
  if (!/\d{4}/.test(cp) || !provincia) { $("#calcRes").innerHTML = `<p class="aviso-error">Ingresá tu código postal y provincia.</p>`; return; }
  escribir("nacireina-cp", { cp, provincia });
  $("#calcRes").innerHTML = `<p class="cargando">Calculando…</p>`;
  try {
    const r = await api("/api/cotizar-envio", { cp, provincia, items: [{ id: sel.id, color: sel.color, cant: 1 }] });
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
  // Si ya calculó el envío en la página del producto, se completa solo
  const z = leer("nacireina-cp", {});
  if (!val("ckCP") && z.cp) { $("#ckCP").value = z.cp; $("#ckProv").value = z.provincia || ""; }
  pintarCheckout();
}
function pintarCheckout() {
  // Resumen
  $("#resLineas").innerHTML = carrito.map(i => { const p = producto(i.id); return `
    <div class="linea"><div class="mini">${img(fotoDe(p, i.color), p.nombre)}<span class="q">${i.cant}</span></div>
      <div><b>${esc(p.nombre)}</b><span>${esc(detalleItem(i))}</span></div><div class="m">${pesos(precioDe(p, i.color) * i.cant)}</div></div>`; }).join("");
  const envio = ck.opcion ? ck.opcion.precio : null;
  $("#resCuentas").innerHTML = `<div><span>Subtotal</span><span>${pesos(subtotal())}</span></div>
    <div><span>Envío</span><span>${envio == null ? '<span style="color:var(--tinta-2)">Se calcula en el paso 2</span>' : envio ? pesos(envio) : '<span class="gratis">Gratis</span>'}</span></div>
    <div class="tot"><span>Total</span><span>${pesos(subtotal() + (envio || 0))}</span></div>`;
  $("#pagarTxt").textContent = `Pagar ${pesos(subtotal() + (envio || 0))} con Mercado Pago`;

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
  if (!ck.cot && val("ckCP") && $("#ckProv").value) cotizarCheckout();
});
const juntar = l => l.length > 1 ? l.slice(0, -1).join(", ") + " y " + l[l.length - 1] : l[0];
function guardarDatos() {
  escribir("nacireina-datos", { email: val("ckEmail"), nombre: val("ckNombre"), telefono: val("ckTel"), dni: val("ckDni"),
    calle: val("ckCalle"), numero: val("ckNum"), piso: val("ckPiso"), localidad: val("ckLoc") });
}

// Paso 2: entrega
$("#formCP").addEventListener("submit", e => { e.preventDefault(); cotizarCheckout(); });
["ckCP", "ckProv"].forEach(id => document.getElementById(id).addEventListener("change", () => { ck.cot = null; ck.opcion = null; ck.sucursal = null; pintarCheckout(); }));

async function cotizarCheckout() {
  const cp = val("ckCP"), provincia = $("#ckProv").value;
  if (!/\d{4}/.test(cp) || !provincia) { $("#falta2").textContent = "Ingresá tu código postal y provincia."; return; }
  escribir("nacireina-cp", { cp, provincia });
  $("#falta2").textContent = "";
  ck.cot = null; ck.opcion = null; ck.sucursal = null;
  $("#opcionesCk").innerHTML = `<p class="cargando">Buscando opciones de envío…</p>`;
  try {
    ck.cot = await api("/api/cotizar-envio", { cp, provincia, localidad: val("ckLoc"), items: carrito.map(i => ({ id: i.id, color: i.color, cant: i.cant })) });
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
    if (!ck.sucursal && !faltan.length) { $("#falta2").textContent = "Elegí la sucursal de Andreani donde vas a retirar."; return; }
  }
  if (faltan.length) { $("#falta2").textContent = "Completá " + juntar(faltan) + "."; return; }
  $("#falta2").textContent = "";
  guardarDatos();
  irPaso(3);
});

// Paso 3: pago
$("#pagar").addEventListener("click", async () => {
  const o = ck.opcion;
  if (!o) { irPaso(2); return; }
  const pedido = {
    items: carrito.map(i => ({ id: i.id, talle: i.talle, color: i.color, cant: i.cant })),
    cliente: { nombre: val("ckNombre"), telefono: val("ckTel"), email: val("ckEmail"), dni: val("ckDni") },
    entrega: { opcion: o.id, sucursal: ck.sucursal ? ck.sucursal.id : null, cp: val("ckCP"), provincia: $("#ckProv").value,
      localidad: val("ckLoc"), calle: val("ckCalle"), numero: val("ckNum"), piso: val("ckPiso") }
  };
  $("#pagar").disabled = true; $("#pagarTxt").textContent = "Conectando con Mercado Pago…"; $("#falta3").textContent = "";
  try {
    const r = await api("/api/crear-pago", pedido);
    escribir("nacireina-ultimo-pedido", {
      numero: r.pedido, total: subtotal() + o.precio,
      lineas: carrito.map(i => `${i.cant} x ${producto(i.id).nombre} - ${detalleItem(i)}`),
      cliente: pedido.cliente, entrega: $("#res2").textContent, local: o.tipo === "local"
    });
    location.href = r.url;
  } catch (err) {
    $("#pagar").disabled = false; pintarCheckout();
    $("#falta3").textContent = err.message;
    if (/agot/i.test(err.message)) actualizarStock(); // algo se agotó mientras compraba: se marca en el carrito
  }
});
$("#seguirComprando").addEventListener("click", () => { location.hash = ""; });

// ---------- Navegación entre vistas ----------
function ruta() {
  const h = decodeURIComponent(location.hash.slice(1));
  const vista = h.startsWith("p/") ? "producto" : h === "checkout" ? "checkout" : "inicio";
  ["inicio", "producto", "checkout"].forEach(v => { $("#vista-" + v).hidden = v !== vista; });
  $("#flotante").hidden = !WHATSAPP || vista === "checkout";
  if (vista === "producto") { mostrarProducto(+h.slice(2)); window.scrollTo(0, 0); return; }
  if (vista === "checkout") { mostrarCheckout(); window.scrollTo(0, 0); return; }
  document.title = "Nací Reina Calzados";
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
  $("#aviso").innerHTML = `<b>Envío gratis</b> en compras desde ${pesos(ENVIO.gratisDesde)} · Envíos con Andreani a todo el país`;
  $("#pGratis").textContent = `Envío gratis en compras desde ${pesos(ENVIO.gratisDesde)}.`;
  $("#ventajaEnvio").textContent = `Gratis desde ${pesos(ENVIO.gratisDesde)}. A domicilio o a sucursal.`;
}
if (WHATSAPP) $("#flotante").href = wa("¡Hola Nací Reina! Tengo una consulta:");
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
    cuerpo = `<img class="isotipo-grande" src="img/isotipo.svg" alt="" style="margin:0"><p style="margin:0">Recibimos tu pago${ult ? ` del pedido <b>${esc(ult.numero)}</b>` : ""}. ${ult && ult.local ? "Te avisamos por WhatsApp cuando esté listo para retirar." : "Te avisamos por WhatsApp cuando lo despachemos con Andreani, con el número de seguimiento."}</p>${lista}`;
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
    refrescarVista();
  } catch (e) { /* sin conexión: se usa el último stock conocido */ }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") actualizarStock(); });

pintarCarrito();
ruta();
actualizarStock();
