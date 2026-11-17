// Portada 3D (2026-11, pedido del dueño: "igual de imponente que POWER UP"):
// una corona de oro en el centro con un anillo de calzados que gira alrededor, brillitos rosa y dorado que suben
// en espiral, hilos de luz de la corona a los zapatos y reflejo en el piso (Three.js, en vendor/).
// Se arrastra con el mouse o el dedo; tocando un zapato se abre ese producto y tocando la corona hay lluvia de coronas.
// Lo carga tienda.js cuando la página ya terminó de cargar. Sin WebGL o con "reducir movimiento" queda la portada de siempre.
import * as THREE from "./vendor/three.module.min.js";

const hero = document.querySelector(".hero");
const movil = matchMedia("(max-width: 760px)").matches;
const tactil = !matchMedia("(hover: hover) and (pointer: fine)").matches;
const flojo = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
const ROSA = 0xE0157F, ORO = 0xF2C46B, TINTA = 0x1F0A16;

function productosParaAnillo() {
  // Más nuevos primero, una foto por modelo. Sin las retro Reina (diseño de tres tiras: no va en publicidad)
  const lista = (window.CATALOGO && CATALOGO.productos || []).filter(p => !p.oculto && p.id !== 31 && (p.colores || []).some(c => c.foto));
  const vistos = new Set(), out = [];
  for (const p of [...lista].sort((a, b) => b.id - a.id)) {
    const foto = p.colores.find(c => c.foto).foto;
    if (vistos.has(foto)) continue;
    vistos.add(foto); out.push({ id: p.id, nombre: p.nombre, foto });
  }
  return out.slice(0, movil ? 10 : 14);
}

function texturaPunto(dura) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(dura, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Reflejos del oro: una "sala" oscura con tiras de luz cálida y rosa
function entornoOro(renderer) {
  const sala = new THREE.Scene();
  sala.background = new THREE.Color(0x0a0306);
  const tiras = [[0, 6, 0, 10, 0.7, 0xfff1d6, 7], [-6, 1, -2, 0.6, 8, 0xffffff, 6], [6, 2, 3, 0.6, 6, 0xff7dbe, 5], [0, -1, -7, 9, 0.4, 0xffe0a0, 5], [3, 4, 6, 4, 0.35, 0xffffff, 6]];
  for (const [x, y, z, w, h, col, k] of tiras) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0);
    sala.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(sala, 0.04).texture;
  pmrem.dispose();
  return tex;
}

// Corona de verdad en 3D (se ve corona desde todos los ángulos mientras gira): aro, picos con perlas y piedras rosas
function armarCorona(env) {
  const oro = new THREE.MeshStandardMaterial({ color: ORO, metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 2.2, side: THREE.DoubleSide });
  const piedra = new THREE.MeshStandardMaterial({ color: ROSA, metalness: 0.2, roughness: 0.08, emissive: 0x7a0638, emissiveIntensity: 0.9, envMap: env, envMapIntensity: 1.5 });
  const perla = new THREE.MeshStandardMaterial({ color: 0xfff6ee, metalness: 0.3, roughness: 0.18, envMap: env, envMapIntensity: 1.6 });
  const g = new THREE.Group(), R = 1, PICOS = 8;
  const aro = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R, 0.55, 64, 1, true), oro);
  g.add(aro);
  for (const [y, r] of [[-0.28, R * 1.0], [0.27, R * 1.04]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 12, 64), oro);
    t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t);
  }
  const terciopelo = new THREE.Mesh(new THREE.SphereGeometry(R * 0.96, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xc21a6e, roughness: 0.75, metalness: 0, emissive: 0x3a0420 }));
  terciopelo.scale.y = 0.65; terciopelo.position.y = 0.05; g.add(terciopelo);
  const cruzAlto = 0.95;
  for (let i = 0; i < PICOS; i++) {
    const a = (i / PICOS) * Math.PI * 2, x = Math.sin(a) * R * 1.04, z = Math.cos(a) * R * 1.04;
    const alto = i % 2 ? 0.62 : 0.9;
    const pico = new THREE.Mesh(new THREE.ConeGeometry(0.26, alto, 4), oro);
    pico.position.set(x, 0.27 + alto / 2, z); pico.rotation.y = a; pico.scale.z = 0.35;   // finito hacia afuera, como una lámina
    g.add(pico);
    const p = new THREE.Mesh(new THREE.SphereGeometry(i % 2 ? 0.07 : 0.09, 16, 12), perla);
    p.position.set(x, 0.27 + alto + 0.05, z); g.add(p);
    const gema = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), piedra);
    gema.position.set(Math.sin(a) * R * 1.07, 0, Math.cos(a) * R * 1.07); gema.scale.set(1, 1.35, 0.6);
    gema.lookAt(0, 0, 0); g.add(gema);
  }
  // Cruz/orbe arriba
  const orbe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), oro);
  orbe.position.y = cruzAlto; g.add(orbe);
  const gemaTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), piedra);
  gemaTop.position.y = cruzAlto + 0.26; gemaTop.scale.y = 1.4; g.add(gemaTop);
  return g;
}

const anchoTextura = flojo ? 480 : movil ? 640 : 900;
async function texturaFoto(url) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  try {
    const bmp = await createImageBitmap(img, { resizeWidth: anchoTextura, resizeHeight: Math.round(anchoTextura * img.naturalHeight / img.naturalWidth), resizeQuality: "high", imageOrientation: "flipY" });
    const t = new THREE.Texture(bmp); t.flipY = false; t.needsUpdate = true; return t;
  } catch (e) {
    const t = new THREE.Texture(img); t.needsUpdate = true; return t;
  }
}

function iniciar() {
  const productos = productosParaAnillo();
  if (!hero || productos.length < 4) return false;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !flojo, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { return false; }
  let resolucion = Math.min(devicePixelRatio || 1, flojo ? 1 : movil ? 1.5 : 1.75);
  renderer.setPixelRatio(resolucion);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const lienzo = renderer.domElement;
  lienzo.className = "hero-3d";
  lienzo.setAttribute("aria-hidden", "true");
  hero.prepend(lienzo);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(TINTA, 9, 21);
  const camara = new THREE.PerspectiveCamera(movil ? 46 : 34, 1, 0.1, 60);
  const punto = texturaPunto(0.25), halo = texturaPunto(0.02);
  const env = entornoOro(renderer);

  // ---- Corona en el centro ----
  const nucleo = new THREE.Group();
  escena.add(nucleo);
  const corona = armarCorona(env);
  corona.scale.setScalar(movil ? 0.95 : 1.15);
  corona.rotation.x = 0.28;
  nucleo.add(corona);
  const resplandor = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xff6fb5, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  resplandor.scale.setScalar(6); resplandor.position.z = -0.8;
  nucleo.add(resplandor);
  const luz1 = new THREE.PointLight(0xffe2b0, 18, 12), luz2 = new THREE.PointLight(0xff5fae, 12, 12);
  escena.add(luz1, luz2, new THREE.AmbientLight(0xffffff, 0.25));

  // ---- Anillo de zapatos (y su reflejo en el piso) ----
  const anillo = new THREE.Group(), reflejo = new THREE.Group();
  anillo.rotation.x = 0.1;
  escena.add(anillo, reflejo);
  const N = productos.length, ancho = 1.8, alto = 1.8;
  const radio = Math.max(3.6, (N * (ancho + 0.4)) / (2 * Math.PI));
  const altura = -1.1, piso = altura - alto / 2 - 0.5;
  reflejo.scale.y = -1; reflejo.position.y = piso * 2; reflejo.rotation.x = -0.1;
  const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // Fotos con las puntas redondeadas, como las tarjetas de la tienda
  const forma = new THREE.Shape(), w = ancho / 2, h = alto / 2, rr = 0.16;
  forma.moveTo(-w + rr, -h); forma.lineTo(w - rr, -h); forma.quadraticCurveTo(w, -h, w, -h + rr); forma.lineTo(w, h - rr);
  forma.quadraticCurveTo(w, h, w - rr, h); forma.lineTo(-w + rr, h); forma.quadraticCurveTo(-w, h, -w, h - rr); forma.lineTo(-w, -h + rr); forma.quadraticCurveTo(-w, -h, -w + rr, -h);
  const geo = new THREE.ShapeGeometry(forma, 6);
  const uv = geo.attributes.uv, pos0 = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos0.getX(i) + w) / ancho, (pos0.getY(i) + h) / alto);
  const bordeGeo = new THREE.EdgesGeometry(geo);
  const paneles = [];
  productos.forEach((p, i) => {
    const a = (i / N) * Math.PI * 2;
    const ubicar = g => { g.position.set(Math.sin(a) * radio, 0, Math.cos(a) * radio); g.rotation.y = a; return g; };
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a0f1d, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
    const matRef = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    texturaFoto(p.foto).then(tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = anisotropia; mat.map = tex; matRef.map = tex; mat.color.set(0xffffff); mat.needsUpdate = matRef.needsUpdate = true; }).catch(() => {});
    const foto = new THREE.Mesh(geo, mat);
    foto.userData = p;
    const borde = new THREE.LineSegments(bordeGeo, new THREE.LineBasicMaterial({ color: 0xff7dbe, transparent: true, opacity: 0.7 }));
    borde.scale.setScalar(1.03);
    const grupo = ubicar(new THREE.Group());
    grupo.add(foto, borde);
    anillo.add(grupo);
    const grupoRef = ubicar(new THREE.Group());
    grupoRef.add(new THREE.Mesh(geo, matRef));
    reflejo.add(grupoRef);
    paneles.push({ grupo, grupoRef, foto, mat, matRef, escala: 1, brillo: 0 });
  });

  // ---- Piso: grilla rosa + velo que se funde con el reflejo ----
  const grilla = new THREE.GridHelper(44, 44, ROSA, ROSA);
  grilla.material.transparent = true; grilla.material.opacity = 0.14;
  grilla.position.y = piso;
  escena.add(grilla);
  const velo = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: TINTA, transparent: true, opacity: 0.55, depthWrite: false }));
  velo.rotation.x = -Math.PI / 2; velo.position.y = piso + 0.01;
  escena.add(velo);

  // ---- Polvo brillante de fondo ----
  const cantPolvo = flojo ? 140 : movil ? 220 : 480;
  const pos = new Float32Array(cantPolvo * 3);
  for (let i = 0; i < cantPolvo; i++) { pos[i * 3] = (Math.random() - 0.5) * 28; pos[i * 3 + 1] = (Math.random() - 0.3) * 11; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const polvo = new THREE.Points(pgeo, new THREE.PointsMaterial({ map: punto, color: 0xffd3ea, size: movil ? 0.09 : 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(polvo);

  // ---- Brillitos rosa y dorado que suben en espiral ----
  const cantChispas = flojo ? 90 : movil ? 140 : 300;
  const chispas = Array.from({ length: cantChispas }, () => ({ a: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * (radio - 1), y: piso + Math.random() * 6, v: 0.25 + Math.random() * 0.7 }));
  const cpos = new Float32Array(cantChispas * 3), ccol = new Float32Array(cantChispas * 3);
  const cRosa = new THREE.Color(0xff5fae), cOro = new THREE.Color(0xffd27a);
  chispas.forEach((c, i) => { const col = i % 3 ? cRosa : cOro; ccol.set([col.r, col.g, col.b], i * 3); });
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
  cgeo.setAttribute("color", new THREE.BufferAttribute(ccol, 3));
  escena.add(new THREE.Points(cgeo, new THREE.PointsMaterial({ map: punto, vertexColors: true, size: movil ? 0.12 : 0.1, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---- Hilos de luz: de la corona a un zapato (líneas reusadas, no se crean en cada uno) ----
  const PUNTOS = 24, hilos = [];
  for (let i = 0; i < N + 6; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PUNTOS * 3), 3));
    const linea = new THREE.Line(g, new THREE.LineBasicMaterial({ color: i % 2 ? 0xff7dbe : 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    linea.visible = false; linea.frustumCulled = false;
    escena.add(linea);
    hilos.push({ linea, vida: 0, total: 1 });
  }
  const desde = new THREE.Vector3(), destino = new THREE.Vector3(), medio = new THREE.Vector3(), tmp = new THREE.Vector3();
  const curva = new THREE.QuadraticBezierCurve3(desde, medio, destino);
  function hiloAPanel(p, fuerza = 1) {
    const d = hilos.find(x => x.vida <= 0);
    if (!d) return;
    nucleo.getWorldPosition(desde); desde.y += 0.6;
    p.foto.getWorldPosition(destino);
    medio.addVectors(desde, destino).multiplyScalar(0.5); medio.y += 1.4 + Math.random() * fuerza;
    const arr = d.linea.geometry.attributes.position;
    for (let i = 0; i < PUNTOS; i++) { curva.getPoint(i / (PUNTOS - 1), tmp); arr.setXYZ(i, tmp.x, tmp.y, tmp.z); }
    arr.needsUpdate = true;
    d.total = d.vida = 0.55; d.linea.visible = true;
    p.brillo = 1;
  }

  // ---- Tamaño ----
  let caja = lienzo.getBoundingClientRect(), anchoPrev = 0, altoPrev = 0, altoHero = hero.offsetHeight || 1;
  function medir() {
    const ww = lienzo.clientWidth || hero.clientWidth, hh = lienzo.clientHeight || hero.clientHeight;
    altoHero = hero.offsetHeight || 1;
    caja = lienzo.getBoundingClientRect();
    if (!ww || !hh || (ww === anchoPrev && hh === altoPrev)) return;
    anchoPrev = ww; altoPrev = hh;
    renderer.setSize(ww, hh, false);
    camara.aspect = ww / hh;
    camara.userData.z = radio + (movil ? 7.6 : Math.max(8.5, 12 - camara.aspect * 1.3));
    // En compu la escena va corrida a la derecha: a la izquierda queda el "Pisá fuerte." sin taparse
    if (!movil && camara.aspect > 1.2) camara.setViewOffset(ww, hh, -ww * 0.18, 0, ww, hh); else camara.clearViewOffset();
    camara.updateProjectionMatrix();
  }
  medir();
  if ("ResizeObserver" in window) new ResizeObserver(() => medir()).observe(hero); else addEventListener("resize", medir);

  // ---- Interacción ----
  let giro = 0, vel = 0.0025, arrastrando = false, ultimoX = 0, movio = 0, carga = 0, scroll = 0, mouseMovido = true;
  const mouse = new THREE.Vector2(9, 9), objetivo = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  let encima = null, cursor = "";
  const aPunto = e => ({ x: ((e.clientX - caja.left) / caja.width) * 2 - 1, y: -((e.clientY - caja.top) / caja.height) * 2 + 1 });
  const partesCorona = [];
  corona.traverse(o => { if (o.isMesh) { o.userData.corona = true; partesCorona.push(o); } });
  const queHay = () => {
    raycaster.setFromCamera(mouse, camara);
    const hit = raycaster.intersectObjects(objetivosToque, false)[0];
    return hit && (hit.object.userData.corona || hit.object.material.opacity > 0.5) ? hit.object : null;
  };
  function coronar(e) {
    carga = 1;
    paneles.forEach((p, i) => setTimeout(() => hiloAPanel(p, 1.6), i * 40));
    hero.classList.remove("hero--brillo"); void hero.offsetWidth; hero.classList.add("hero--brillo");
    if (typeof window.festejar === "function") {   // la lluvia de coronas de la tienda, desde donde se tocó
      const marca = document.createElement("span");
      marca.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`;
      document.body.append(marca); window.festejar(marca); setTimeout(() => marca.remove(), 50);
    }
  }
  hero.addEventListener("pointerdown", e => {
    if (e.target.closest("a, button")) return;
    caja = lienzo.getBoundingClientRect();
    arrastrando = true; ultimoX = e.clientX; movio = 0;
    const p = aPunto(e); mouse.set(p.x, p.y); mouseMovido = true;
  });
  addEventListener("pointerup", e => {
    if (!arrastrando) return;
    arrastrando = false;
    if (movio >= 6 || e.target.closest("a, button")) return;
    const p = aPunto(e); mouse.set(p.x, p.y);
    const tocado = queHay();
    if (!tocado) return;
    if (tocado.userData.corona) coronar(e);
    else location.hash = "p/" + tocado.userData.id;
  });
  addEventListener("pointercancel", () => { arrastrando = false; });
  addEventListener("pointermove", e => {
    if (!visible) return;
    const p = aPunto(e); mouse.set(p.x, p.y); mouseMovido = true;
    objetivo.x = p.x; objetivo.y = p.y;
    if (arrastrando) { const dx = e.clientX - ultimoX; ultimoX = e.clientX; movio += Math.abs(dx); vel = dx * 0.0009; giro += dx * 0.004; }
  }, { passive: true });
  addEventListener("scroll", () => {
    scroll = Math.min(1, Math.max(0, scrollY / altoHero));
    if (visible) caja = lienzo.getBoundingClientRect();
  }, { passive: true });

  let sinContexto = false;
  lienzo.addEventListener("webglcontextlost", e => { e.preventDefault(); sinContexto = true; });
  lienzo.addEventListener("webglcontextrestored", () => { sinContexto = false; });

  // ---- Animación (solo cuando la portada se ve) ----
  let visible = true, reloj = new THREE.Clock(), entrada = 0, proxHilo = 1.2, cuadros = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) caja = lienzo.getBoundingClientRect(); }).observe(hero);
  const inicio = document.getElementById("vista-inicio");
  const objetivosToque = [...partesCorona, ...paneles.map(p => p.foto)];
  hero.classList.add("hero--3d");
  const ayuda = document.createElement("p");
  ayuda.className = "hero-ayuda3d"; ayuda.setAttribute("aria-hidden", "true");
  ayuda.textContent = movil ? "Tocá la corona ♛" : "Arrastrá para girar · tocá la corona ♛";
  hero.appendChild(ayuda);
  let muestras = 0, sumaMs = 0, nivel = 0;
  function cuidarFluidez(ms) {
    if (nivel >= 3 || entrada < 1) return;
    muestras++; sumaMs += Math.min(ms, 100);
    if (muestras < 90) return;
    const prom = sumaMs / muestras; muestras = sumaMs = 0;
    if (prom < 24) return;
    nivel++;
    if (resolucion > 1) { resolucion = Math.max(1, resolucion - 0.5); renderer.setPixelRatio(resolucion); anchoPrev = 0; medir(); }
    else if (nivel >= 2) { reflejo.visible = false; polvo.visible = false; nivel = 3; }
  }

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible || sinContexto || document.hidden || (inicio && inicio.hidden)) { reloj.getDelta(); return; }
    const crudo = reloj.getDelta(), dt = Math.min(crudo, 0.05), t = performance.now() / 1000;
    cuidarFluidez(crudo * 1000);
    entrada = Math.min(1, entrada + dt * 0.6);
    const suave = 1 - Math.pow(1 - entrada, 3);
    carga = Math.max(0, carga - dt * 0.6);

    if (!arrastrando) vel += (0.0025 + scroll * 0.01 + carga * 0.02 - vel) * 0.03;
    giro += vel * (dt * 60);
    anillo.rotation.y = reflejo.rotation.y = giro;
    anillo.position.y = altura + Math.sin(t / 1.6) * 0.08;
    anillo.scale.setScalar(0.55 + 0.45 * suave);
    reflejo.scale.set(anillo.scale.x, -anillo.scale.y, anillo.scale.z);
    reflejo.position.y = piso * 2 - anillo.position.y;

    // Corona: entra creciendo, flota, gira y sigue un poco al mouse
    nucleo.position.y = Math.sin(t * 1.3) * 0.12 + 0.55;
    corona.rotation.y += dt * (0.5 + carga * 8);
    nucleo.rotation.x += (-objetivo.y * 0.2 - nucleo.rotation.x) * 0.06;
    nucleo.rotation.z += (objetivo.x * -0.15 - nucleo.rotation.z) * 0.06;
    nucleo.scale.setScalar((0.2 + 0.8 * suave) * (1 + carga * 0.2 + Math.sin(t * 3) * 0.012));
    resplandor.material.opacity = 0.22 + carga * 0.6 + Math.sin(t * 2.2) * 0.05;
    luz1.position.set(Math.cos(t * 0.9) * 3.5, 2.5, Math.sin(t * 0.9) * 3.5);
    luz2.position.set(Math.cos(t * 0.7 + 3) * 3, -0.5, Math.sin(t * 0.7 + 3) * 3);
    luz1.intensity = 18 + carga * 50;

    const subir = 1 + carga * 4 + scroll * 1.5;
    chispas.forEach((c, i) => {
      c.y += c.v * dt * subir; c.a += dt * (0.25 + c.v * 0.3) * subir;
      if (c.y > 5) { c.y = piso; c.r = 0.6 + Math.random() * (radio - 1); }
      cpos[i * 3] = Math.cos(c.a) * c.r; cpos[i * 3 + 1] = c.y; cpos[i * 3 + 2] = Math.sin(c.a) * c.r;
    });
    cgeo.attributes.position.needsUpdate = true;
    polvo.rotation.y += dt * 0.02;

    proxHilo -= dt;
    if (proxHilo <= 0 && entrada > 0.6) { hiloAPanel(paneles[(Math.random() * N) | 0]); proxHilo = 0.9 + Math.random() * 1.6; }
    for (const d of hilos) {
      if (d.vida <= 0) continue;
      d.vida -= dt;
      d.linea.material.opacity = Math.max(0, d.vida / d.total) * 0.9;
      if (d.vida <= 0) d.linea.visible = false;
    }

    camara.position.x += (objetivo.x * 0.9 - camara.position.x) * 0.05;
    camara.position.y += (1.5 + objetivo.y * 0.5 + scroll * 2.4 - camara.position.y) * 0.06;
    camara.position.z += (camara.userData.z - scroll * 2 - camara.position.z) * 0.06;
    camara.lookAt(0, movil ? -0.7 : -0.2, 0);

    if (!tactil && (mouseMovido || (cuadros & 1))) {
      mouseMovido = false;
      encima = queHay();
      const c = encima ? "pointer" : arrastrando ? "grabbing" : "grab";
      if (c !== cursor) lienzo.style.cursor = cursor = c;
    }
    cuadros++;
    for (const p of paneles) {
      const meta = p.foto === encima ? 1.12 : 1;
      p.escala += (meta - p.escala) * 0.15;
      p.grupo.scale.setScalar(p.escala); p.grupoRef.scale.setScalar(p.escala);
      p.brillo = Math.max(0, p.brillo - dt * 2.5);
      if (p.mat.map) {
        p.mat.opacity = Math.min(1, p.mat.opacity + dt * 1.5);
        p.matRef.opacity = p.mat.opacity * 0.16;
        p.mat.color.setScalar(1 + p.brillo * 0.35);
      }
    }
    renderer.render(escena, camara);
  }
  cuadro();
  return true;
}

let armada = false;
try { armada = iniciar(); } catch (e) { console.warn("Portada 3D no disponible", e); }
if (!armada && hero) { hero.classList.remove("hero--3d"); hero.querySelector(".hero-3d")?.remove(); }
