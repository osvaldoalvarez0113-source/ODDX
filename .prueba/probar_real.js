'use strict';
// Prueba con datos REALES (corre en GitHub Actions): abre cada app, toca el primer juego y sus pestañas, saca capturas y texto.
const { chromium } = require('playwright'), fs = require('fs');
const BASE = 'http://127.0.0.1:8080/', out = 'salida'; fs.mkdirSync(out, { recursive: true });
const log = []; const L = (...a) => { const t = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); log.push(t); console.log(t); };
const espera = ms => new Promise(r => setTimeout(r, ms));
async function abrir(b, pagina, nombre, antes) {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' }), errs = [], fallas = [];
  pg.on('requestfailed', r => { if (/espn/.test(r.url())) fallas.push(r.url().slice(0, 120) + ' ' + (r.failure() && r.failure().errorText)); });
  pg.on('response', r => { if (/espn/.test(r.url()) && r.status() >= 400) fallas.push(r.status() + ' ' + r.url().slice(0, 120)); });
  pg._fallas = fallas;
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/espn\.com/, async r => { try { const h = Object.assign({}, r.request().headers()); delete h.origin; delete h.referer; h['user-agent'] = 'ova'; const resp = await r.fetch({ headers: h }); await r.fulfill({ response: resp, headers: Object.assign({}, resp.headers(), { 'access-control-allow-origin': '*' }) }); } catch (e) { await r.abort(); } });   /* desde 127.0.0.1 ESPN no manda CORS: se pasa por aquí */
  await pg.route('**/acceso.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));   /* sin el candado de códigos para probar */
  await pg.goto(BASE + pagina + (pagina.includes('?') ? '&' : '?') + 'admin-acceso', { waitUntil: 'domcontentloaded' });
  await pg.evaluate(() => { document.documentElement.style.visibility = 'visible'; const a = document.getElementById('ovaAcc'); if (a) a.remove(); });
  if (antes) await antes(pg);
  await espera(9000);
  return { pg, errs };
}
async function tocarTabs(pg, nombre, tabs, sel) {
  L(nombre, 'DOM:', await pg.evaluate(() => ({ games: document.querySelectorAll('.game').length, ids: [...document.querySelectorAll('.game')].slice(0, 2).map(g => (g.parentNode && (g.parentNode.id || g.parentNode.className)) + ' :: ' + g.outerHTML.slice(0, 300)), estado: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400) })));
  const g = await pg.$(sel.juego); if (!g) { L(nombre, 'SIN JUEGOS'); return; }
  await (await g.$(sel.cabeza) || g).click(); await espera(8000);
  if (!(await g.$('.tb'))) { await (await g.$(sel.cabeza) || g).click(); await espera(8000); }
  for (const t of tabs) {
    const b = await g.$('.tb[data-t="' + t + '"]'); if (!b) { L(nombre, 'sin pestaña', t); continue; }
    await b.click(); await espera(t === 'j' || t === 'jug' ? 9000 : 2500);
    const pane = await g.$(sel.pane(t));
    const txt = pane ? (await pane.innerText()).replace(/\s+/g, ' ').slice(0, 900) : 'SIN PANEL';
    L('---', nombre, t, txt);
    try { await (pane || g).screenshot({ path: `${out}/${nombre}-${t}.png` }); } catch (e) { }
  }
  return g;
}
(async () => {
  const b = await chromium.launch();
  // MLB en una fecha pasada (temporada 2026)
  for (const fecha of ['2026-09-20']) {
    const { pg, errs } = await abrir(b, 'index.html', 'mlb', async pg => {
      await espera(2500);
      await pg.evaluate(f => { const fe = document.getElementById('fecha'); fe.value = f; fe.dispatchEvent(new Event('change', { bubbles: true })); const c = document.getElementById('cargar'); if (c) c.click(); }, fecha);
    });
    await espera(8000);
    const g = await tocarTabs(pg, 'mlb', ['v', 'p', 'j'], { juego: '#slate .game', cabeza: '.head', pane: t => '.tab[data-t="' + t + '"]' });
    if (g) {
      // 💾 de la primera jugada de Jugadores y cerrar ese pick con el boxscore de ESPN
      const bt = await g.$('.tab[data-t="j"] [data-pj="0"]');
      if (bt) { await bt.click(); await espera(500); }
      const r = await pg.evaluate(async () => {
        const a = JSON.parse(localStorage.getItem('ventaja_picks_v1') || '[]'), p = a.filter(x => /^PROP /.test(x.m)).pop();
        if (!p) return { sinPick: true };
        const res = await window.OVAMlbExtra.resolverProp(p); return { pick: p, res };
      });
      L('MLB pick de jugador y cierre:', r);
    }
    L('MLB errores JS:', errs.slice(0, 6), 'ESPN fallas:', pg._fallas.slice(0, 4));
    await pg.close();
  }
  // NBA, NHL, NFL y fútbol de hoy (sin pestaña Cuotas): Veredicto, Paso a paso y el 💾 del «¿Hay pick?»
  for (const [pagina, nombre, tabs] of [['nba.html', 'nba', ['ver', 'paso', 'num']], ['nhl.html', 'nhl', ['ver', 'paso']], ['nfl.html', 'nfl', ['ver', 'paso']], ['futbol.html', 'futbol', ['ver', 'paso']]]) {
    const { pg, errs } = await abrir(b, pagina, nombre);
    const esF = nombre === 'futbol';
    const g = await tocarTabs(pg, nombre, tabs, { juego: esF ? '#juegos .game' : '#juegos .game', cabeza: '.head', pane: t => esF ? '[id$="' + t + '"].pane' : '.pane[data-p="' + t + '"]' });
    if (g) {
      const vb = await g.$('.tb[data-t="ver"]'); if (vb) { await vb.click(); await espera(800); }
      const inp = await g.$(esF ? 'input[id$="vlO"]' : 'input[data-vl="o"]');
      if (inp) { await inp.fill('150'); await espera(500); const bG = await g.$((esF ? '[id$="vlR"]' : '[data-vl="r"]') + ' button'); L(nombre, '💾 en ¿Hay pick?:', bG ? await bG.innerText() : 'NO SALE'); }
      L(nombre, 'pestañas:', await g.$$eval('.tabs .tb', x => x.map(y => y.textContent)));
    }
    L(nombre, 'errores JS:', errs.slice(0, 6), 'ESPN fallas:', pg._fallas.slice(0, 4));
    await pg.close();
  }
  await b.close();
  fs.writeFileSync(out + '/salida.txt', log.join('\n') + '\n');
})().catch(e => { console.error(e); fs.writeFileSync(out + '/salida.txt', log.join('\n') + '\nERROR ' + e.stack); process.exit(0); });
