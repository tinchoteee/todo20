// Carrusel de Instagram (1080x1350) — Nací Reina
const { chromium } = require('playwright');
const path = require('path');
const R = '/home/user/todo20/';
const C = require(R + 'productos.js');
const OUT = __dirname; // fonts.css (DM Serif Display + Figtree) se baja de Google Fonts a esta carpeta
const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');
const foto = (id, col) => { const p = C.productos.find(x => x.id === id); const c = p.colores.find(x => x.id === col); return { nombre: p.nombre, foto: 'file://' + R + c.foto, precio: c.precio || p.precio }; };
const fuentes = 'file://' + OUT + '/fonts.css';
const logo = 'file://' + R + 'img/logo.jpg';

const base = `
<link rel="stylesheet" href="${fuentes}">
<style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;font-family:Figtree,sans-serif;color:#fff;
 background:radial-gradient(120% 80% at 85% 0%,#8a1257 0%,#4a0c33 45%,#1F0A16 100%);position:relative}
.serif{font-family:'DM Serif Display',serif;font-weight:400}
.rosa{color:#FF7DBE}
.logo{background:#fff;border-radius:26px;padding:14px 18px;display:inline-block}
.logo img{height:120px;display:block}
.pie{position:absolute;left:0;right:0;bottom:46px;text-align:center;font-size:30px;color:#f3d6e6;letter-spacing:.3px}
.num{position:absolute;top:52px;right:60px;font-size:26px;font-weight:700;color:#f3d6e6;opacity:.8}
.grilla{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:0 60px}
.card{background:#f7f2f5;border-radius:34px;overflow:hidden;position:relative;height:440px;display:grid;grid-template-rows:1fr auto}
.card img{width:100%;height:100%;object-fit:cover;min-height:0}
.card .pr{position:absolute;left:20px;bottom:20px;background:#E0157F;color:#fff;font-weight:800;font-size:32px;padding:8px 20px;border-radius:99px}
.card .nm{padding:12px 20px 16px;font-size:24px;font-weight:700;color:#1F0A16;background:#fff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .pr{bottom:auto;top:18px}
h1{font-size:104px;line-height:.95}
h2{font-size:92px;line-height:1}
.sub{font-size:34px;color:#f3d6e6;margin-top:14px;line-height:1.3}
.flecha{display:inline-block;background:#E0157F;border-radius:99px;padding:16px 34px;font-size:32px;font-weight:800}
</style>`;

const catalogo = (n, titulo, sub, items) => `${base}
<div class="num">${n}/7</div>
<div style="padding:90px 60px 44px"><h2 class="serif">${titulo}</h2><p class="sub">${sub}</p></div>
<div class="grilla">${items.map(([id, col, corto]) => { const f = foto(id, col); if (corto) f.nombre = corto; return `<div class="card"><img src="${f.foto}"><div class="nm">${f.nombre}</div><span class="pr">${pesos(f.precio)}</span></div>`; }).join('')}</div>
<div class="pie">Comprá online en <b>nacireinacalzados.com</b></div>`;

const slides = [
  // 1 Portada
  `${base}
  <div style="position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr">
   <div style="padding:70px 60px 0;display:flex;align-items:center;gap:34px">
     <span class="logo"><img src="${logo}"></span>
     <div><h1 class="serif">Pisá<br><i class="rosa">fuerte.</i></h1></div>
   </div>
   <div style="position:relative;margin:44px 60px 150px;border-radius:40px;overflow:hidden">
     <img src="file://${R}fotos/puesta-sandalia-umma-negra.jpg" style="width:100%;height:100%;object-fit:cover">
     <div style="position:absolute;left:0;right:0;bottom:0;padding:40px;background:linear-gradient(#1F0A1600,#1F0A16dd)">
       <p style="font-size:44px;font-weight:800;line-height:1.15">Los mejores calzados<br>al mejor precio y calidad</p>
     </div>
   </div>
  </div>
  <div class="pie" style="bottom:54px"><span class="flecha">Deslizá y elegí el tuyo →</span></div>`,
  // 2-5 Catálogo
  catalogo(2, 'Sandalias', 'Para pisar fuerte todo el verano', [[92, 'negro'], [106, 'negro'], [105, 'violeta'], [101, 'habano', 'Sandalia de gamuza y corcho']]),
  catalogo(3, 'Suecos', 'Cómodos y con mucha onda', [[81, 'vaca'], [80, 'negro'], [91, 'bison'], [98, 'chocolate']]),
  catalogo(4, 'Botas y borcegos', 'Texanas, botinetas y más', [[1, 'marron'], [84, 'suela'], [96, 'chocolate'], [14, 'blanco']]),
  catalogo(5, 'Para él también', 'Zapatillas y chavitos de hombre', [[72, 'negrocamel'], [103, 'negro'], [86, 'suela'], [88, 'negro']]),
  // 6 Beneficios
  `${base}
  <div class="num">6/7</div>
  <div style="padding:110px 70px 0"><h2 class="serif">Comprar es<br><i class="rosa">fácil</i></h2></div>
  <div style="display:grid;gap:34px;padding:70px 70px 0">
   ${[['💸', `${C.transferencia.porcentaje}% OFF`, 'pagando con transferencia'],
      ['🚚', 'Envío gratis', `en compras desde ${pesos(C.envio.gratisDesde)}`],
      ['🏷️', `${C.descuento.porcentaje}% OFF`, `en compras desde ${pesos(C.descuento.desde)}`],
      ['📦', 'Envíos a todo el país', 'o retirá gratis en Ramos Mejía']].map(([ic, t, s]) => `
     <div style="display:flex;align-items:center;gap:30px;background:#ffffff14;border:2px solid #ffffff22;border-radius:30px;padding:28px 34px">
       <span style="font-size:64px;width:92px;height:92px;display:grid;place-items:center;background:#E0157F;border-radius:50%">${ic}</span>
       <div><div style="font-size:48px;font-weight:800">${t}</div><div style="font-size:32px;color:#f3d6e6">${s}</div></div>
     </div>`).join('')}
  </div>
  <div class="pie">Pagás con tarjeta, débito o Mercado Pago</div>`,
  // 7 Código
  `${base}
  <div class="num">7/7</div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px">
    <span class="logo" style="margin-bottom:56px"><img src="${logo}" style="height:150px"></span>
    <p style="font-size:40px;font-weight:700;color:#f3d6e6">Un regalo para vos 👑</p>
    <h2 class="serif" style="font-size:150px;margin:10px 0 24px"><span class="rosa">5% OFF</span></h2>
    <p style="font-size:36px;color:#f3d6e6;margin-bottom:26px">con el código</p>
    <div style="border:5px dashed #FF7DBE;border-radius:30px;padding:22px 60px;font-size:96px;font-weight:800;letter-spacing:8px;background:#ffffff10">REINA5</div>
    <p style="font-size:34px;line-height:1.35;margin-top:46px;color:#f3d6e6">Escribilo al finalizar tu compra en<br><b style="color:#fff;font-size:44px">nacireinacalzados.com</b></p>
  </div>
  <div class="pie" style="font-size:28px">WhatsApp 11 2474 1073 · Av. de Mayo 1600, Ramos Mejía</div>`,
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < slides.length; i++) {
    const f = path.join(OUT, `s${i + 1}.html`);
    require('fs').writeFileSync(f, '<!doctype html><meta charset="utf-8">' + slides[i]);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `nacireina-carrusel-${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close();
  console.log('listo');
})();
