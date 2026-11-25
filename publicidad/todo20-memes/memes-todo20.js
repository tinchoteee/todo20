// Memes originales (1080x1350) — versión TODO20 (naranja, blanco y negro). Sin personajes ni fotos de terceros.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname;
const F = n => 'file:///home/user/todo20/fotos/' + n;
const P = n => 'file://' + OUT + '/' + n + '.png';
const base = `<link rel="stylesheet" href="file://${OUT}/fonts.css"><style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;font-family:Figtree,sans-serif;position:relative;background:#fff;color:#111}
.marca{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-size:26px;letter-spacing:4px;color:#8a7a82;font-weight:500}
.cut{filter:drop-shadow(0 16px 16px #0003);position:absolute}
.t{font-weight:800;line-height:1.12}
</style>`;
const marca = (c) => `<div class="marca" style="display:flex;align-items:center;justify-content:center;gap:14px;bottom:22px${c ? `;color:${c}` : ''}"><img src="${P('logo-todo20')}" style="width:70px;border-radius:50%;background:#fff;box-shadow:0 4px 12px #0003">@todo20calzados.rm</div>`;

// Burbujas de chat (genérico, sin logos de apps)
const chat = (titulo, msgs) => `<div style="position:absolute;inset:0;background:#efe7de">
  <div style="background:#2b1a22;color:#fff;padding:70px 50px 30px;display:flex;align-items:center;gap:26px">
    <span style="font-size:44px">‹</span><span style="width:84px;height:84px;border-radius:50%;background:#ffd2b0;display:grid;place-items:center;font-size:48px">${titulo.ic}</span>
    <div><div style="font-size:42px;font-weight:700">${titulo.n}</div><div style="font-size:26px;opacity:.7">${titulo.s}</div></div></div>
  <div style="padding:40px 50px;display:flex;flex-direction:column;gap:22px">
  ${msgs.map(([quien, txt, hora]) => `<div style="align-self:${quien === 'yo' ? 'flex-end;background:#ffe0c8' : 'flex-start;background:#fff'};max-width:78%;padding:20px 28px 14px;border-radius:26px;font-size:42px;line-height:1.25;box-shadow:0 2px 0 #0001">${txt}<div style="text-align:right;font-size:22px;color:#8a7a82;margin-top:4px">${hora}${quien === 'yo' ? ' ✓✓' : ''}</div></div>`).join('')}
  </div></div>`;

const memes = {
  // 1. Chat con mamá
  'meme-mama-caja': `${base}${chat({ ic: '👩', n: 'Mamá', s: 'en línea' }, [
    ['ella', '¿Y esa caja que llegó? 🤨', '18:02'],
    ['yo', 'Es vieja ma, la tenía guardada', '18:03'],
    ['ella', 'Tiene la fecha de hoy', '18:03'],
    ['yo', '...', '18:07'],
    ['yo', 'Mirá qué lindas igual 🥹👇', '18:07'],
  ])}<img class="cut" src="${P('suecos-petty-vaca')}" style="right:60px;bottom:110px;width:450px;transform:rotate(-6deg)">${marca()}`,

  // 2. Nadie / yo a las 3 AM
  'meme-3am': `${base}
  <div style="padding:90px 80px 0" class="t">
    <p style="font-size:64px">Nadie:</p>
    <p style="font-size:64px;margin-top:22px">Absolutamente nadie:</p>
    <p style="font-size:64px;margin-top:22px">Yo a las 3 AM:</p>
  </div>
  <div style="position:absolute;left:80px;right:80px;top:500px;height:740px;background:#121014;border-radius:56px;padding:50px 46px;color:#fff;box-shadow:0 30px 60px #0004">
    <div style="font-size:28px;opacity:.6;text-align:center">03:12 · 🔋 4%</div>
    <div style="background:#fff;border-radius:30px;height:400px;margin-top:30px;position:relative;overflow:hidden">
      <img src="${P('sandalia-dos-tiras-animal-print')}" style="position:absolute;left:50%;top:50%;width:420px;transform:translate(-50%,-50%)"></div>
    <div style="font-size:32px;margin-top:26px;font-weight:700">Sandalia de dos tiras animal print</div>
    <div style="margin-top:22px;background:#F26A0F;border-radius:99px;text-align:center;padding:22px;font-size:36px;font-weight:800">Agregar al carrito 🛒 (otra vez)</div>
  </div>${marca()}`,

  // 3. Expectativa vs realidad
  'meme-expectativa': `${base}<style>body{background:#fff}</style>
  <div style="display:grid;grid-template-rows:1fr 1fr;height:100%">
    <div style="position:relative;border-bottom:6px solid #111">
      <span style="position:absolute;top:50px;left:60px;background:#111;color:#fff;font-size:46px;font-weight:800;padding:10px 26px">EXPECTATIVA</span>
      <p class="t" style="position:absolute;top:150px;left:60px;font-size:50px">“Voy a mirar nomás”</p>
      <img class="cut" src="${P('sandalia-vibora-hebillas-camel')}" style="left:560px;top:250px;width:420px">
    </div>
    <div style="position:relative">
      <span style="position:absolute;top:40px;left:60px;background:#F26A0F;color:#fff;font-size:46px;font-weight:800;padding:10px 26px">REALIDAD</span>
      <img class="cut" src="${P('sandalia-vibora-hebillas-camel')}" style="left:40px;top:150px;width:330px;transform:rotate(-10deg)">
      <img class="cut" src="${P('sueco-diana-negro')}" style="left:370px;top:120px;width:330px;transform:rotate(6deg)">
      <img class="cut" src="${P('sandalia-dos-tiras-animal-print')}" style="left:720px;top:140px;width:300px;transform:rotate(-4deg)">
      <img class="cut" src="${P('suecos-petty-vaca')}" style="left:140px;top:380px;width:330px;transform:rotate(4deg)">
      <img class="cut" src="${P('sueco-tejido-chocolate')}" style="left:530px;top:390px;width:330px;transform:rotate(-6deg)">
    </div>
  </div>${marca()}`,

  // 4. Notas del celu: lista del súper
  'meme-lista-super': `${base}<style>body{background:#fffbea}</style>
  <div style="padding:90px 80px 0">
    <p style="font-size:30px;color:#b08a00;font-weight:700">‹ Notas</p>
    <p class="t" style="font-size:76px;margin-top:30px">Lista del súper 🛒</p>
    <div style="font-size:52px;line-height:1.75;margin-top:30px;font-family:Figtree;font-weight:500">
      ☑️ Leche<br>☑️ Pan<br>☑️ Huevos<br>☑️ Sandalia franciscana violeta<br>☑️ Yerba<br>
      <span style="color:#F26A0F;font-weight:800">☑️ Unos suecos (¿qué tiene?)</span><br>
      <s style="color:#999">☐ Ahorrar</s>
    </div>
  </div>
  <img class="cut" src="${P('sandalia-franciscana-vibora-violeta')}" style="right:30px;bottom:90px;width:420px;transform:rotate(-8deg)">
  ${marca()}`,

  // 5. Mi psicóloga
  'meme-psicologa': `${base}
  <div style="padding:80px 70px 0" class="t">
    <p style="font-size:58px">Mi psicóloga: ¿Y qué es lo que<br>te hace feliz de verdad?</p>
    <p style="font-size:58px;margin-top:34px">Yo:</p>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:880px;overflow:hidden">
    <img src="${F('puesta-sandalia-franciscana-plataforma-negra.jpg')}" style="width:100%;height:100%;object-fit:cover;object-position:center 70%"></div>
  ${marca('#fff')}`,

  // 6. Pies invierno vs verano
  'meme-mis-pies': `${base}
  <p class="t" style="text-align:center;font-size:64px;padding-top:80px">Mis pies cuando llega el verano:</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:60px 50px 0">
    <div style="text-align:center"><div style="background:#e8eef6;border-radius:36px;height:640px;display:grid;place-items:center;font-size:260px">🧦</div><p class="t" style="font-size:44px;margin-top:22px">Mayo – Octubre<br><span style="font-weight:500;color:#666">en cautiverio</span></p></div>
    <div style="text-align:center"><div style="background:#ffe6d3;border-radius:36px;height:640px;position:relative;overflow:hidden"><img src="${F('puesta-sandalia-umma-negra.jpg')}" style="width:100%;height:100%;object-fit:cover;object-position:center 80%"></div><p class="t" style="font-size:44px;margin-top:22px">Noviembre<br><span style="font-weight:500;color:#F26A0F">LIBRES 👑</span></p></div>
  </div>${marca()}`,

  // 7. No me regales flores
  'meme-flores': `${base}<style>body{background:#fff4ec}</style>
  <div style="text-align:center;padding-top:110px" class="t">
    <p style="font-size:70px">No me regales flores 💐</p>
    <p style="font-size:44px;font-weight:500;margin-top:20px;color:#666">se mueren en una semana</p>
    <p style="font-size:70px;margin-top:70px">Regalame estas 👇</p>
    <p style="font-size:44px;font-weight:500;margin-top:20px;color:#F26A0F">me duran todo el año</p>
  </div>
  <img class="cut" src="${P('botineta-vibora-suela')}" style="left:220px;bottom:110px;width:640px">
  ${marca()}`,
  // 8. ¿Otras botas?
  'meme-otras-botas': `${base}
  <div style="padding:90px 70px 0" class="t">
    <p style="font-size:58px">— ¿Para qué querés otras botas<br>si ya tenés unas?</p>
    <p style="font-size:58px;margin-top:34px">Yo:</p>
  </div>
  <img class="cut" src="${P('bota-texana-bordada-marron')}" style="left:30px;bottom:150px;width:350px;transform:rotate(-6deg)">
  <img class="cut" src="${P('botineta-vibora-suela')}" style="left:370px;bottom:190px;width:350px">
  <img class="cut" src="${P('bota-texana-tachas-blanca')}" style="right:30px;bottom:140px;width:350px;transform:rotate(6deg)">
  <p class="t" style="position:absolute;left:0;right:0;top:470px;text-align:center;font-size:46px;color:#F26A0F">“no son iguales, mirá bien”</p>
  ${marca()}`,

  // 9. Zapatillas nuevas vs las viejas
  'meme-zapatillas': `${base}<style>body{background:#fff4ec}</style>
  <p class="t" style="text-align:center;font-size:58px;padding-top:110px">Mis zapatillas nuevas<br>vs. las de siempre:</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:60px 50px 0">
    <div style="text-align:center"><div style="background:#fff;border-radius:36px;height:600px;display:grid;place-items:center;box-shadow:0 10px 30px #0001"><img src="${P('zapatilla-falcon-negro-camel')}" style="width:88%"></div><p class="t" style="font-size:42px;margin-top:22px">Las nuevas<br><span style="font-weight:500;color:#F26A0F">impecables ✨</span></p></div>
    <div style="text-align:center"><div style="background:#e9e4df;border-radius:36px;height:600px;display:grid;place-items:center;font-size:230px">🥲</div><p class="t" style="font-size:42px;margin-top:22px">Las de siempre<br><span style="font-weight:500;color:#666">pidiendo jubilación</span></p></div>
  </div>${marca()}`,

};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [n, html] of Object.entries(memes)) {
    const f = path.join(OUT, 'todo20-' + n + '.html');
    fs.writeFileSync(f, '<!doctype html><meta charset="utf-8">' + html);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `todo20-${n}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close(); console.log('listo');
})();
