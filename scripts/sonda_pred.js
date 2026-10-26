'use strict';
/* SONDA del mercado de prediccion (Polymarket, API publica "gamma"; no pide llave).
   Corre en GitHub Actions (el taller no alcanza esos sitios). Guarda en la carpeta "salida_pred/" una muestra CRUDA y chica de cada respuesta
   para ver la forma real de los datos antes de escribir el lector definitivo. */
const fs = require('fs');
const G = 'https://gamma-api.polymarket.com';
const out = 'salida_pred'; fs.mkdirSync(out, { recursive: true });
const log = []; const P = s => { log.push(s); console.log(s); };
async function get(path) {
  const t0 = Date.now();
  try {
    const r = await fetch(G + path, { headers: { accept: 'application/json', 'user-agent': 'ova-sonda/1.0' } });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { }
    P('GET ' + path + ' -> ' + r.status + ' · ' + txt.length + ' bytes · ' + (Date.now() - t0) + ' ms · CORS=' + (r.headers.get('access-control-allow-origin') || 'no'));
    return { status: r.status, j, txt };
  } catch (e) { P('GET ' + path + ' -> ERROR ' + e.message); return { status: 0, j: null, txt: '' }; }
}
const save = (n, x) => fs.writeFileSync(out + '/' + n, typeof x === 'string' ? x : JSON.stringify(x, null, 1).slice(0, 400000));
(async () => {
  const sp = await get('/sports'); save('sports.json', sp.j || sp.txt.slice(0, 5000));
  const deportes = ['nfl', 'nba', 'nhl', 'mlb', 'epl', 'lal', 'bun', 'sea', 'fl1', 'ucl', 'mls'];
  const lista = Array.isArray(sp.j) ? sp.j : [];
  P('deportes en /sports: ' + lista.map(x => x.sport).join(', '));
  for (const d of deportes) {
    const m = lista.find(x => String(x.sport).toLowerCase() === d); if (!m) { P(d + ': no aparece en /sports'); continue; }
    P(d + ': ' + JSON.stringify(m));
    const tags = String(m.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    const tag = tags.find(t => t !== '1') || tags[0];
    const tm = await get('/teams?league=' + d + '&limit=100'); save('teams-' + d + '.json', tm.j || tm.txt.slice(0, 3000));
    if (tag) {
      const ev = await get('/events?tag_id=' + tag + '&active=true&closed=false&limit=40&order=startTime&ascending=true'); save('events-' + d + '.json', ev.j || ev.txt.slice(0, 3000));
      if (Array.isArray(ev.j)) P(d + ': ' + ev.j.length + ' eventos; primeros: ' + ev.j.slice(0, 5).map(e => e.slug + ' [' + (e.markets || []).map(x => x.sportsMarketType || '?').join('|') + ']').join(' ; '));
    }
  }
  fs.writeFileSync(out + '/log.txt', log.join('\n'));
})();
