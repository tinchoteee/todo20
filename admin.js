"use strict";
// Editor de Nací Reina: stock (talles, colores y modelos agotados), precios y pedidos.

const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
const PRODUCTOS = CATALOGO.productos.filter(p => !p.oculto);
const fotoDe = p => p.foto || ((p.colores || []).find(c => c.foto) || {}).foto || "img/isotipo.svg";

let permiso = sessionStorage.getItem("nr-permiso") || "";
let guardado = { productos: {} };   // lo que está en la base de datos
let ajustes = { productos: {} };    // lo que se está editando
let pedidos = [];

async function api(metodo, datos) {
  let r;
  try {
    r = await fetch("/api/admin", {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(permiso ? { Authorization: "Bearer " + permiso } : {}) },
      ...(datos ? { body: JSON.stringify(datos) } : {})
    });
  } catch (e) { throw new Error("Sin conexión. Revisá internet y probá de nuevo."); }
  if (r.status === 404) throw new Error("El editor funciona cuando la página está publicada en Vercel.");
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && permiso) { salir(); throw new Error(d.error || "Tu sesión venció."); }
  if (!r.ok) throw new Error(d.error || "Algo salió mal.");
  return d;
}

// ---------- Login ----------
$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  $("#errorLogin").textContent = "";
  try {
    const d = await api("POST", { accion: "entrar", clave: $("#clave").value });
    permiso = d.permiso; sessionStorage.setItem("nr-permiso", permiso);
    $("#clave").value = "";
    await cargar();
  } catch (err) { $("#errorLogin").textContent = err.message; }
});
function salir() {
  permiso = ""; sessionStorage.removeItem("nr-permiso");
  $("#pantallaEditor").hidden = true; $("#pantallaLogin").hidden = false;
}
$("#salir").addEventListener("click", () => { if (!hayCambios() || confirm("Tenés cambios sin guardar. ¿Salir igual?")) salir(); });

async function cargar() {
  const d = await api("GET");
  guardado = d.ajustes && d.ajustes.productos ? d.ajustes : { productos: {} };
  ajustes = structuredClone(guardado);
  pedidos = d.pedidos || [];
  $("#pantallaLogin").hidden = true; $("#pantallaEditor").hidden = false;
  pintarStock(); pintarPedidos(); pintarEstado(d.config || {});
  if (!d.config.baseDeDatos) mostrarTab("estado");
}

// ---------- Pestañas ----------
function mostrarTab(t) {
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  ["stock", "pedidos", "estado"].forEach(x => { $("#tab-" + x).hidden = x !== t; });
  $("#barraGuardar").hidden = t !== "stock" || !hayCambios();
}
document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) mostrarTab(b.dataset.tab); });

// ---------- Stock y precios ----------
const aj = id => (ajustes.productos[id] = ajustes.productos[id] || {});
const ajColor = (id, cid) => { const a = aj(id); a.colores = a.colores || {}; return (a.colores[cid] = a.colores[cid] || {}); };
const hayCambios = () => JSON.stringify(limpio(ajustes)) !== JSON.stringify(limpio(guardado));
const cambiado = id => JSON.stringify(limpio({ productos: { [id]: ajustes.productos[id] } })) !== JSON.stringify(limpio({ productos: { [id]: guardado.productos[id] } }));

// Saca lo vacío para poder comparar
function limpio(a) {
  const out = {};
  for (const [id, p] of Object.entries((a && a.productos) || {})) {
    if (!p) continue;
    const r = {};
    if (p.precio > 0) r.precio = Math.round(p.precio);
    if (p.agotado) r.agotado = true;
    const cols = {};
    for (const [cid, c] of Object.entries(p.colores || {})) {
      const rc = {};
      if (c.precio > 0) rc.precio = Math.round(c.precio);
      if (c.agotado) rc.agotado = true;
      if (c.sinTalle && c.sinTalle.length) rc.sinTalle = [...c.sinTalle].sort((x, y) => x - y);
      if (Object.keys(rc).length) cols[cid] = rc;
    }
    if (Object.keys(cols).length) r.colores = cols;
    if (Object.keys(r).length) out[id] = r;
  }
  return { productos: out };
}

function ficha(p) {
  const a = ajustes.productos[p.id] || {};
  const precio = a.precio > 0 ? a.precio : p.precio;
  return `<article class="ficha${a.agotado ? " off" : ""}${cambiado(p.id) ? " cambiada" : ""}" data-id="${p.id}">
    <div class="ficha-h"><img src="${esc(fotoDe(p))}" alt=""><div><b>${esc(p.nombre)}</b><small>${esc(p.cat)}</small></div></div>
    <label class="fila-precio"><span style="font-weight:600">Precio $</span>
      <input class="in" inputmode="numeric" data-precio value="${precio > 0 ? precio : ""}" placeholder="Consultar" aria-label="Precio de ${esc(p.nombre)}"></label>
    <label class="interruptor">Modelo agotado <input type="checkbox" class="sw" data-agotado${a.agotado ? " checked" : ""}></label>
    ${(p.colores || []).map(c => { const ac = (a.colores || {})[c.id] || {}; const sin = ac.sinTalle || [];
      const precioColor = ac.precio > 0 ? ac.precio : c.precio > 0 ? c.precio : ""; return `
      <div class="color-box${ac.agotado ? " off" : ""}" data-cid="${esc(c.id)}">
        <label class="interruptor"><span class="color-nom"><i style="--sw:${esc(c.hex)}"></i>${esc(c.nombre)}</span>
          <span style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">Color agotado <input type="checkbox" class="sw" data-color-agotado${ac.agotado ? " checked" : ""}></span></label>
        <label class="fila-precio" style="font-size:14px"><span>Precio de este color $</span>
          <input class="in" inputmode="numeric" data-precio-color value="${precioColor}" placeholder="igual al modelo" aria-label="Precio de ${esc(p.nombre)} en ${esc(c.nombre)}" style="padding:8px 10px"></label>
        <div class="chips">${p.talles.map(t => `<button class="chip" data-talle="${t}" aria-pressed="${!sin.includes(t)}" aria-label="Talle ${t} ${sin.includes(t) ? "agotado" : "disponible"}">${t}</button>`).join("")}</div>
      </div>`; }).join("")}
  </article>`;
}
function pintarStock() {
  const q = $("#buscar").value.trim().toLowerCase();
  $("#listaProd").innerHTML = PRODUCTOS.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.cat.includes(q)).map(ficha).join("")
    || `<p class="ayuda">No hay productos con “${esc(q)}”.</p>`;
  actualizarBarra();
}
function repintarFicha(id) {
  const vieja = document.querySelector(`.ficha[data-id="${id}"]`);
  const t = document.createElement("div"); t.innerHTML = ficha(PRODUCTOS.find(p => p.id === id));
  vieja.replaceWith(t.firstElementChild);
  actualizarBarra();
}
function actualizarBarra() {
  const n = PRODUCTOS.filter(p => cambiado(p.id)).length;
  $("#barraGuardar").hidden = !n || $("#tab-stock").hidden;
  $("#txtCambios").textContent = n === 1 ? "1 producto con cambios" : `${n} productos con cambios`;
}
$("#buscar").addEventListener("input", pintarStock);

$("#listaProd").addEventListener("click", e => {
  const chip = e.target.closest(".chip"); if (!chip) return;
  const id = +chip.closest(".ficha").dataset.id, cid = chip.closest(".color-box").dataset.cid, t = +chip.dataset.talle;
  const c = ajColor(id, cid);
  const sin = new Set(c.sinTalle || []);
  sin.has(t) ? sin.delete(t) : sin.add(t);
  c.sinTalle = [...sin];
  repintarFicha(id);
});
$("#listaProd").addEventListener("change", e => {
  const f = e.target.closest(".ficha"); if (!f) return;
  const id = +f.dataset.id;
  if (e.target.matches("[data-agotado]")) aj(id).agotado = e.target.checked;
  else if (e.target.matches("[data-color-agotado]")) ajColor(id, e.target.closest(".color-box").dataset.cid).agotado = e.target.checked;
  else if (e.target.matches("[data-precio]")) {
    const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
    const base = PRODUCTOS.find(p => p.id === id).precio;
    aj(id).precio = v > 0 && v !== base ? v : undefined;
  } else if (e.target.matches("[data-precio-color]")) {
    const cid = e.target.closest(".color-box").dataset.cid;
    const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
    const base = (PRODUCTOS.find(p => p.id === id).colores.find(c => c.id === cid) || {}).precio;
    ajColor(id, cid).precio = v > 0 && v !== base ? v : undefined;
  } else return;
  repintarFicha(id);
});

$("#descartar").addEventListener("click", () => { ajustes = structuredClone(guardado); pintarStock(); });
$("#guardar").addEventListener("click", async () => {
  const b = $("#guardar"); b.disabled = true; b.textContent = "Guardando…";
  try {
    const d = await api("POST", { accion: "guardar", ajustes: limpio(ajustes) });
    guardado = d.ajustes; ajustes = structuredClone(guardado);
    pintarStock();
    avisar("✓ Guardado. La tienda ya muestra los cambios.");
  } catch (err) { alert(err.message); }
  b.disabled = false; b.textContent = "Guardar";
});
window.addEventListener("beforeunload", e => { if (hayCambios()) { e.preventDefault(); e.returnValue = ""; } });

function avisar(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  d.setAttribute("role", "status");
  d.style.cssText = "position:fixed;left:50%;top:76px;transform:translateX(-50%);background:var(--ok);color:#fff;padding:10px 16px;border-radius:99px;font-weight:700;z-index:50;box-shadow:0 6px 18px rgba(0,0,0,.2)";
  document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
}

// ---------- Pedidos ----------
const ESTADOS = { "pagado": "Pagado · preparar", "envio-creado": "Envío creado", "despachado": "Despachado", "listo-para-retirar": "Listo para retirar", "entregado": "Entregado", "cancelado": "Cancelado" };
const telWa = t => { let d = String(t || "").replace(/\D/g, ""); if (d.startsWith("549")) return d; if (d.startsWith("54")) d = d.slice(2); if (d.startsWith("0")) d = d.slice(1); d = d.replace(/^(\d{2,4})15/, "$1"); return "549" + d; };

function pintarPedidos() {
  if (!pedidos.length) { $("#listaPedidos").innerHTML = `<p class="ayuda">Todavía no hay ventas online. Cuando alguien pague, el pedido aparece acá (y te llega por email).</p>`; return; }
  $("#listaPedidos").innerHTML = pedidos.map(p => {
    const e = p.entrega || {}, c = p.cliente || {};
    const entrega = e.tipo === "local" ? "Retira en el local" : e.tipo === "sucursal" ? `${esc(e.opcion)} · ${esc(e.sucursal)}` : `${esc(e.opcion)} · ${esc(e.calle)} ${esc(e.numero)}${e.piso ? " " + esc(e.piso) : ""}, ${esc(e.localidad)}, ${esc(e.provincia)} (CP ${esc(e.cp)})`;
    const msj = e.tipo === "local"
      ? `¡Hola ${String(c.nombre || "").split(" ")[0]}! Tu pedido ${p.numero} de Nací Reina ya está listo para retirar en ${CATALOGO.local.direccion}.`
      : `¡Hola ${String(c.nombre || "").split(" ")[0]}! Tu pedido ${p.numero} de Nací Reina ya fue despachado${e.opcion ? " por " + String(e.opcion).split(" · ")[0] : ""}.${p.envio && p.envio.seguimiento ? " Seguimiento: " + p.envio.seguimiento : ""}`;
    return `<article class="pedido">
      <div class="pedido-h"><b>${esc(p.numero)} · ${pesos(p.total)}</b><span class="estado-pill ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span></div>
      <small style="color:var(--tinta-2)">${new Date(p.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · ${esc(c.nombre)} · ${esc(c.telefono)}${c.dni ? " · DNI " + esc(c.dni) : ""}</small>
      <ul>${(p.detalle || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      <div><b>Entrega:</b> ${entrega}</div>
      ${p.envio ? `<div>✅ Envío creado en Zipnova${p.envio.seguimiento ? ` · seguimiento <b>${esc(p.envio.seguimiento)}</b>` : ""}. Imprimí la etiqueta desde el panel de Zipnova.</div>` : ""}
      ${p.envioError ? `<div class="aviso-error">⚠️ ${esc(p.envioError)}</div>` : ""}
      <div class="acc">
        <select class="in" data-estado="${esc(p.numero)}" aria-label="Estado del pedido">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}"${k === p.estado ? " selected" : ""}>${v}</option>`).join("")}</select>
        <a class="btn btn-wa" href="https://wa.me/${telWa(c.telefono)}?text=${encodeURIComponent(msj)}" target="_blank" rel="noopener">Avisar al cliente</a>
      </div>
    </article>`;
  }).join("");
}
$("#listaPedidos").addEventListener("change", async e => {
  const s = e.target.closest("[data-estado]"); if (!s) return;
  try {
    await api("POST", { accion: "estado", numero: s.dataset.estado, estado: s.value });
    const p = pedidos.find(x => x.numero === s.dataset.estado); if (p) p.estado = s.value;
    pintarPedidos(); avisar("✓ Estado actualizado");
  } catch (err) { alert(err.message); }
});

// ---------- Estado de la configuración ----------
function pintarEstado(cfg) {
  const items = [
    [cfg.mercadoPago, "Mercado Pago", "Cobros online con tarjeta, débito y dinero en cuenta.", "Falta MP_ACCESS_TOKEN en Vercel: sin esto no se puede cobrar."],
    [cfg.baseDeDatos, "Base de datos (Upstash)", "Guarda el stock, los precios y los pedidos.", "Falta conectar Upstash en Vercel: sin esto no se guardan los cambios de este editor ni los pedidos."],
    [cfg.zipnova, "Zipnova · envíos por correo", "Cotiza el envío según el código postal.", "Falta configurar Zipnova: mientras tanto el envío se cobra con los precios fijos por zona."],
    [cfg.zipnova && cfg.baseDeDatos && cfg.envioAutomatico, "Envío automático", "Cada venta pagada crea sola el envío en Zipnova.", "Desactivado: los envíos se crean a mano desde el panel de Zipnova."],
    [cfg.emails, "Avisos por email", "Te llega un email con cada venta.", "Falta RESEND_API_KEY y AVISOS_EMAIL: no vas a recibir emails de las ventas."]
  ];
  $("#listaEstado").innerHTML = items.map(([ok, tit, si, no]) => `<div class="check"><span class="ic">${ok ? "✅" : "⚠️"}</span><div><b>${tit}</b><p>${ok ? si : no}</p></div></div>`).join("")
    + `<p class="ayuda">Los pasos para configurar cada cosa están en el archivo CONFIGURACION.md.</p>`;
}

// Si ya había entrado en esta pestaña, entra directo
if (permiso) cargar().catch(() => salir());
