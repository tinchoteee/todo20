// Placa "No importa cuál sea tu SEXO / medias GRATIS" (1080x1350 y 1080x1080) — Nací Reina
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = __dirname, M = path.join(__dirname, '..', 'carrusel-instagram', 'portadas');   // recortes .png sin fondo (se generan con rembg)
const P = (n, dir = M) => 'file://' + path.join(dir, n + '.png');
const logo = 'file:///home/user/todo20/img/logo.jpg';

// Par de medias dibujado (blancas con rayas fucsia y puño dorado)
const media = (rot, x, y, s) => `<svg viewBox="0 0 120 220" style="position:absolute;left:${x}px;top:${y}px;width:${s}px;transform:rotate(${rot}deg);filter:drop-shadow(0 14px 14px #0003)">
  <defs><linearGradient id="g${x}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e6ec"/></linearGradient></defs>
  <path d="M20 10 H80 V120 Q80 140 95 152 L108 162 Q125 178 112 198 Q98 216 72 204 L30 178 Q10 166 15 140 Z" fill="url(#g${x})" stroke="#d9c7d1" stroke-width="2"/>
  <rect x="20" y="10" width="60" height="22" rx="3" fill="#E0157F"/>
  <rect x="20" y="42" width="60" height="9" fill="#E0157F"/><rect x="20" y="58" width="60" height="9" fill="#F2C46B"/>
  <path d="M74 180 Q96 196 110 186" fill="none" stroke="#E0157F" stroke-width="10" stroke-linecap="round"/>
  <path d="M15 140 Q12 120 28 112" fill="none" stroke="#E0157F" stroke-width="9" stroke-linecap="round" opacity=".9"/>
</svg>`;

const pieza = (alto) => `<link rel="stylesheet" href="file://${D}/fonts.css"><style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:${alto}px;overflow:hidden;font-family:Figtree,sans-serif;position:relative;
 background:radial-gradient(60% 50% at 50% 45%,#8a1257 0%,#4a0c33 55%,#1F0A16 100%)}
.rayos{position:absolute;inset:-30%;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(242,196,107,.0) 0deg 9deg,rgba(242,196,107,.16) 9deg 12deg,rgba(242,196,107,0) 12deg 24deg)}
.card{position:absolute;left:60px;right:60px;top:${alto > 1100 ? 230 : 150}px;bottom:${alto > 1100 ? 74 : 60}px;border-radius:44px;background:linear-gradient(180deg,#fdf6f9,#f3e3ec);box-shadow:0 30px 80px #0006}
.chico{font-weight:500;color:#2a1a22;text-align:center}
.gigante{font-weight:900;text-align:center;letter-spacing:-6px;line-height:.85;color:#fff;
  text-shadow:0 0 0 #fff,6px 8px 0 #E0157F,10px 16px 30px rgba(224,21,127,.45);-webkit-text-stroke:3px #f3d6e6}
.marca{position:absolute;left:0;right:0;bottom:${alto > 1100 ? 22 : 16}px;text-align:center;font-size:24px;letter-spacing:4px;color:#f3d6e6;font-weight:500}
</style>
<div class="rayos"></div>
<div style="position:absolute;top:${alto > 1100 ? 50 : 22}px;left:0;right:0;text-align:center"><span style="display:inline-block;background:#fff;border-radius:22px;padding:10px 16px;box-shadow:0 10px 30px #0005"><img src="${logo}" style="height:${alto > 1100 ? 140 : 100}px;display:block"></span></div>
<div class="card">
  <p class="chico" style="font-size:46px;margin-top:${alto > 1100 ? 44 : 26}px">No importa cuál sea tu</p>
  <p class="gigante" style="font-size:${alto > 1100 ? 250 : 200}px;margin-top:6px">SEXO</p>
  <p class="chico" style="font-size:40px;margin-top:${alto > 1100 ? 26 : 14}px">Con tu compra de calzado te llevás <b style="color:#E0157F">unas medias</b></p>
  <p class="gigante" style="font-size:${alto > 1100 ? 250 : 200}px;margin-top:${alto > 1100 ? 14 : 6}px">GRATIS</p>
  ${alto > 1100 ? `
  <img src="${P('sandalia-umma-negra')}" style="position:absolute;left:-10px;bottom:30px;width:300px;filter:drop-shadow(0 14px 14px #0003)">
  <img src="${P('zapatilla-falcon-negro-camel', D)}" style="position:absolute;left:250px;bottom:20px;width:330px;filter:drop-shadow(0 14px 14px #0003)">
  <img src="${P('bota-texana-tachas-blanca', D)}" style="position:absolute;left:520px;bottom:40px;width:260px;filter:drop-shadow(0 14px 14px #0003)">
  ${media(-14, 760, 790, 150)}${media(12, 840, 770, 150)}` : `
  <img src="${P('sandalia-umma-negra')}" style="position:absolute;left:0;bottom:30px;width:220px;filter:drop-shadow(0 14px 14px #0003)">
  <img src="${P('zapatilla-falcon-negro-camel', D)}" style="position:absolute;left:210px;bottom:20px;width:250px;filter:drop-shadow(0 14px 14px #0003)">
  <img src="${P('bota-texana-tachas-blanca', D)}" style="position:absolute;left:470px;bottom:30px;width:200px;filter:drop-shadow(0 14px 14px #0003)">
  ${media(-14, 700, 640, 120)}${media(12, 790, 625, 120)}`}
</div>
<div class="marca">@nacireinacalzados · nacireinacalzados.com</div>`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
  for (const [n, alto] of [['feed-4x5', 1350], ['cuadrado', 1080]]) {
    const p = await b.newPage({ viewport: { width: 1080, height: alto } });
    const f = path.join(D, n + '.html');
    fs.writeFileSync(f, '<!doctype html><meta charset="utf-8">' + pieza(alto));
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D, `nacireina-medias-gratis-${n}.jpg`), type: 'jpeg', quality: 92 });
    await p.close();
  }
  await b.close(); console.log('listo');
})();
