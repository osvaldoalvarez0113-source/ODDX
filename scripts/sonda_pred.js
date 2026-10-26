'use strict';
/* SONDA 3 de Polymarket: ¿se puede reconstruir el precio de ANTES del juego de partidos ya terminados?
   Prueba la lista de mercados cerrados y el historial de precios (clob.polymarket.com/prices-history) con varias formas. */
const fs = require('fs');
const G = 'https://gamma-api.polymarket.com', C = 'https://clob.polymarket.com';
fs.mkdirSync('salida_pred', { recursive: true });
const log = []; const P = s => { log.push(s); console.log(s); };
async function get(url, guardar) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ova-sonda/3.0' } });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { }
    P(r.status + ' · ' + (txt.length / 1e3).toFixed(0) + ' KB · ' + (Date.now() - t0) + ' ms · ' + url.replace(/%3A/g, ':').slice(0, 230));
    if (guardar && j) fs.writeFileSync('salida_pred/' + guardar, JSON.stringify(j, null, 1).slice(0, 200000));
    return { j, txt, status: r.status };
  } catch (e) { P('ERROR ' + e.message + ' · ' + url.slice(0, 200)); return { j: null, txt: '', status: 0 }; }
}
(async () => {
  const sp = (await get(G + '/sports')).j || [];
  const nhl = sp.find(x => x.sport === 'nhl'), nfl = sp.find(x => x.sport === 'nfl'), lal = sp.find(x => x.sport === 'lal');
  const ahora = Date.now(), d = n => new Date(ahora - n * 864e5).toISOString();
  for (const [nom, m, dias] of [['nhl', nhl, 14], ['nfl', nfl, 60], ['lal', lal, 30]]) {
    if (!m) continue;
    const w = '&end_date_min=' + encodeURIComponent(d(dias)) + '&end_date_max=' + encodeURIComponent(d(0));
    const r = await get(G + '/markets?tag_id=' + m.primaryTagId + '&closed=true&limit=100&sports_market_types=moneyline' + w, 'cerrados-' + nom + '.json');
    const arr = Array.isArray(r.j) ? r.j : [];
    P(nom + ': ' + arr.length + ' mercados cerrados; ejemplo: ' + JSON.stringify(arr.slice(0, 2).map(x => ({ s: x.slug, g: x.groupItemTitle, o: x.outcomes, p: x.outcomePrices, t: x.gameStartTime, tok: String(x.clobTokenIds || '').slice(0, 60), lp: x.lastTradePrice }))));
    const x = arr.find(y => y.clobTokenIds); if (!x) continue;
    const tok = JSON.parse(x.clobTokenIds)[0]; const ini = Date.parse(String(x.gameStartTime).replace(' ', 'T').replace(/\+00$/, 'Z'));
    P(nom + ': probando historial de ' + x.slug + ' inicio ' + new Date(ini).toISOString());
    const t = s => Math.floor(s / 1000);
    await get(C + '/prices-history?market=' + tok + '&startTs=' + t(ini - 6 * 36e5) + '&endTs=' + t(ini + 36e5) + '&fidelity=10', 'hist-' + nom + '-a.json');
    await get(C + '/prices-history?market=' + tok + '&startTs=' + t(ini - 6 * 36e5) + '&endTs=' + t(ini + 36e5) + '&fidelity=60', 'hist-' + nom + '-b.json');
    await get(C + '/prices-history?market=' + tok + '&interval=max&fidelity=60', 'hist-' + nom + '-c.json');
    await get(C + '/prices-history?market=' + tok + '&interval=all&fidelity=60');
  }
  fs.writeFileSync('salida_pred/log.txt', log.join('\n'));
})();
