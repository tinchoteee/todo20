// Portadas "meme" para el carrusel de Instagram (1080x1350) — Nací Reina
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = 'file:///home/user/todo20/';
const OUT = __dirname;
const F = n => R + 'fotos/' + n;
const P = n => 'file://' + OUT + '/' + n + '.png'; // calzado recortado sin fondo
const base = `<link rel="stylesheet" href="file://${OUT}/fonts.css"><style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;font-family:Figtree,sans-serif;position:relative;background:#fff;color:#111}
.marca{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:26px;letter-spacing:4px;color:#5a4a52;font-weight:500}
.mul{mix-blend-mode:multiply}
</style>`;
const marca = (c = '#5a4a52') => `<div class="marca" style="color:${c}">@nacireinacalzados</div>`;

// Meme clásico: frase entre comillas + cartelito + foto con piernas
const clasico = (frase, cartel, foto, colorCartel) => `${base}
<div style="padding:70px 70px 0;text-align:center">
  <p style="font-family:Figtree;font-weight:800;font-size:70px;line-height:1.12">“${frase}”</p>
  <span style="display:inline-block;margin-top:26px;background:${colorCartel};color:#fff;font-size:52px;font-weight:700;padding:10px 30px;border-radius:14px">${cartel}</span>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:900px;overflow:hidden">
  <img src="${foto}" style="width:100%;height:100%;object-fit:cover;object-position:center 75%">
</div>
<div class="marca" style="color:#fff;text-shadow:0 1px 6px #0006">@nacireinacalzados</div>`;

const BEIGE = '#efe2d3';
const piezas = {
  'portada-ahorrar': clasico('este mes<br>voy a ahorrar', 'yo en un descuido:', F('puesta-bota-texana-tachas-blanca.jpg'), '#E0157F'),
  'portada-primer-sueldo': clasico('ya quiero trabajar<br>para ayudar en casa', 'yo con mi primer sueldo:', F('puesta-sandalia-umma-negra.jpg'), '#7a1240'),

  'portada-estoy-a-esto': `${base}<style>body{background:${BEIGE}}</style>
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(120deg,#0000 0 90px,#ffffff30 90px 150px)"></div>
  <p style="position:absolute;top:150px;left:0;right:0;text-align:center;font-family:Anton;font-size:170px;color:#7a0f2e;white-space:nowrap">Estoy a esto...</p>
  <p style="position:absolute;top:400px;left:130px;font-size:46px;line-height:1.25;color:#2a1a20">de comprarme esas sandalias<br>que “no necesito”...</p>
  <img src="${P('sandalia-franciscana-plataforma-negra')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;left:140px;top:580px;width:820px">
  ${marca('#7a5a60')}`,

  'portada-no-se-que-regalarte': `${base}
  <p style="position:absolute;top:110px;left:0;right:0;text-align:center;font-family:Anton;font-size:104px">“NO SÉ QUÉ REGALARTE”</p>
  <p style="position:absolute;top:270px;left:120px;font-size:64px">Yo:</p>
  <div style="position:absolute;left:40px;top:560px;font-size:260px;line-height:1;transform:rotate(-8deg)">👉</div>
  <div style="position:absolute;left:110px;top:820px;font-size:200px;line-height:1">👉</div>
  <img src="${P('bota-texana-bordada-marron')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;left:450px;top:380px;width:560px">
  ${marca()}`,

  'portada-psicologo': `${base}
  <img src="${F('puesta-bota-texana-bordada-marron.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%">
  <div style="position:absolute;left:190px;top:90px;width:700px;background:#fbfaf7;padding:44px 40px;transform:rotate(-3deg);box-shadow:0 18px 40px #0004;font-family:'Gochi Hand';font-size:56px;line-height:1.3;text-align:center;color:#1a1a1a">
    HAY QUIENES TE MANDAN<br>AL PSICÓLOGO<br>Y OTROS QUE TE<br>REGALAN BOTAS ♥<br><span style="font-size:72px">ELEGÍ BIEN</span>
  </div>
  <div class="marca" style="color:#fff;text-shadow:0 1px 6px #0006">@nacireinacalzados</div>`,

  // Mini carrusel de 3: pasos para quitarte la tristeza
  'pasos-1': `${base}<style>body{background:${BEIGE}}</style>
  <div style="position:absolute;top:260px;left:0;right:0;text-align:center">
    <p style="font-family:'Lilita One';font-size:130px;color:#111;transform:rotate(-4deg)">Pasos para</p>
    <p style="font-family:'Lilita One';font-size:190px;color:#FF8CC6;-webkit-text-stroke:6px #E0157F;line-height:1.05">QUITARTE</p>
    <p style="font-family:'Lilita One';font-size:150px;color:#111">la tristeza ✨</p>
  </div>
  <div style="position:absolute;bottom:170px;left:0;right:0;text-align:center;font-size:230px">🥺</div>
  ${marca('#7a5a60')}`,
  'pasos-2': `${base}<style>body{background:${BEIGE}}</style>
  <img src="${P('sandalia-umma-negra')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;left:-60px;top:-40px;width:470px;transform:rotate(-12deg)">
  <img src="${P('sandalia-franciscana-vibora-violeta')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;right:-50px;top:-30px;width:460px;transform:rotate(10deg)">
  <p style="position:absolute;top:400px;left:0;right:0;text-align:center;font-family:'Lilita One';font-size:170px;transform:rotate(-5deg)">paso #1 ✨</p>
  <div style="position:absolute;top:620px;left:0;right:0;text-align:center"><span style="display:inline-block;background:#FFB3DA;border:6px solid #111;box-shadow:12px 12px 0 #111;border-radius:99px;padding:22px 60px;font-family:'Lilita One';font-size:76px">COMPRAR SANDALIAS</span></div>
  <img src="${P('sandalia-gamuza-hebillas-habano')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;left:-40px;bottom:-20px;width:520px;transform:rotate(8deg)">
  <img src="${P('sandalia-carla-chocolate')}" style="filter:drop-shadow(0 18px 18px #0003);position:absolute;right:-40px;bottom:-30px;width:520px;transform:rotate(-8deg)">
  `,
  'pasos-3': `${base}<style>body{background:${BEIGE}}</style>
  <p style="position:absolute;top:150px;left:0;right:0;text-align:center;font-family:'Lilita One';font-size:190px">¡Listooo!</p>
  <div style="position:absolute;top:380px;left:0;right:0;text-align:center"><span style="display:inline-block;background:#FFB3DA;border:6px solid #111;box-shadow:12px 12px 0 #111;border-radius:99px;padding:20px 60px;font-family:'Lilita One';font-size:70px">NO HAY MÁS PASOS</span></div>
  <div style="position:absolute;top:600px;left:0;right:0;text-align:center;font-size:200px">😁👑</div>
  <div style="position:absolute;top:900px;left:0;right:0;text-align:center;font-size:44px;line-height:1.4;color:#2a1a20">
    Elegí las tuyas en <b>nacireinacalzados.com</b><br>y con el código <b style="background:#111;color:#fff;padding:2px 18px;border-radius:10px">REINA5</b> tenés 5% OFF
  </div>
  ${marca('#7a5a60')}`,
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [n, html] of Object.entries(piezas)) {
    const f = path.join(OUT, n + '.html');
    fs.writeFileSync(f, '<!doctype html><meta charset="utf-8">' + html);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `nacireina-${n}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close(); console.log('listo');
})();
