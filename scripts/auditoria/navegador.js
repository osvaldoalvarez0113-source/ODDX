'use strict';
// Abre cada página con datos reales a tamaño iPhone y anota errores, llamadas fallidas, desbordes y lo que guarda Auto. Uso: node scripts/auditoria/navegador.js
const { chromium, devices } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.css': 'text/css' };
const PAG = [['hub', 'hub.html'], ['mlb', 'index.html'], ['fut', 'futbol.html'], ['nba', 'nba.html'], ['nhl', 'nhl.html'], ['nfl', 'nfl.html'], ['herr', 'herramientas.html#auto']];
const out = [], log = s => { out.push(s); console.log(s); };
fs.mkdirSync('auditoria', { recursive: true });
const srv = http.createServer((q, r) => { const f = path.join(R, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8770, async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  for (const [k, u] of PAG) {
    const p = await ctx.newPage(), err = [], fall = [], con = [];
    p.on('pageerror', e => err.push(e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') con.push(m.type() + ': ' + m.text().slice(0, 160)); });
    p.on('requestfailed', q => fall.push(q.url().slice(0, 120) + ' ' + (q.failure() || {}).errorText));
    p.on('response', q => { if (q.status() >= 400) fall.push(q.status() + ' ' + q.url().slice(0, 120)); });
    const t0 = Date.now(); try { await p.goto('http://localhost:8770/' + u, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) { err.push('goto ' + e.message.slice(0, 100)); }
    await p.waitForTimeout(15000);
    const info = await p.evaluate(() => { const d = document.documentElement; const anchos = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 6).map(e => (e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ')[0] : e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right));
      const txt = document.body.innerText.replace(/\s+/g, ' '); const st = (document.querySelector('#status,.status,#estado,.estadoCarga') || {}).innerText || '';
      let auto = []; try { auto = JSON.parse(localStorage.getItem('ova_auto_v1') || '[]'); } catch (e) {}
      const ids = {}; [...document.querySelectorAll('[id]')].forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
      return { scroll: d.scrollWidth - innerWidth, anchos, st: st.slice(0, 160), errores: (txt.match(/(No se pudo|Error|error|falló|undefined|NaN|null%)[^.|]{0,80}/g) || []).slice(0, 5), auto: auto.length, autoCr: auto.filter(x => x.cr).length, autoApps: [...new Set(auto.map(x => x.app))].join(','), sinMercado: auto.filter(x => !x.k1 && !x.k0).length, dup: Object.keys(ids).filter(i => ids[i] > 1).slice(0, 5) }; }).catch(e => ({ fallo: e.message }));
    log(`\n## ${k} (${Math.round((Date.now() - t0) / 1000)} s)\n${JSON.stringify(info)}\nerrores JS: ${JSON.stringify(err)}\nconsola: ${JSON.stringify(con.slice(0, 8))}\nllamadas fallidas: ${JSON.stringify([...new Set(fall)].slice(0, 10))}`);
    await p.screenshot({ path: 'auditoria/' + k + '.png' }).catch(() => {});
    if (['nba', 'nhl', 'nfl', 'fut'].includes(k)) { const sel = k === 'fut' ? '[data-vista="algane"]' : '[data-v="vAlgane"]'; try { await p.click(sel, { timeout: 4000 }); await p.waitForTimeout(2500); const g = await p.evaluate(() => (document.querySelector('.gnPanel') || {}).innerText || 'SIN PANEL'); log('Al gane: ' + g.replace(/\s+/g, ' ').slice(0, 300)); await p.screenshot({ path: 'auditoria/' + k + '_algane.png' }); } catch (e) { log('Al gane: no se pudo abrir ' + e.message.slice(0, 80)); } }
    await p.close();
  }
  fs.writeFileSync('auditoria/resultado.txt', out.join('\n') + '\n'); await b.close(); srv.close();
});
