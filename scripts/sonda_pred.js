'use strict';
/* SONDA 2 del mercado de prediccion (Polymarket): ¿hay una forma LIVIANA de pedir solo los partidos de futbol (1X2)?
   Prueba varias consultas y anota estado, tamano y cuantos resultados trae cada una. */
const fs = require('fs');
const G = 'https://gamma-api.polymarket.com';
fs.mkdirSync('salida_pred', { recursive: true });
const log = []; const P = s => { log.push(s); console.log(s); };
const ahora = Date.now(), desde = new Date(ahora - 6 * 36e5).toISOString(), hasta = new Date(ahora + 6 * 864e5).toISOString();
async function get(path, guardar) {
  const t0 = Date.now();
  try {
    const r = await fetch(G + path, { headers: { accept: 'application/json', 'user-agent': 'ova-sonda/2.0' } });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { }
    const n = Array.isArray(j) ? j.length : (j && j.events ? j.events.length : -1);
    P(r.status + ' · ' + (txt.length / 1e6).toFixed(2) + ' MB · ' + (Date.now() - t0) + ' ms · ' + n + ' elementos · ' + path.slice(0, 230));
    if (guardar && j) fs.writeFileSync('salida_pred/' + guardar, JSON.stringify(j, null, 1).slice(0, 300000));
    return j;
  } catch (e) { P('ERROR ' + e.message + ' · ' + path.slice(0, 200)); return null; }
}
(async () => {
  const sp = await get('/sports');
  const lal = (sp || []).find(x => x.sport === 'lal'); const tag = lal ? lal.primaryTagId : 780;
  const w = '&end_date_min=' + encodeURIComponent(desde) + '&end_date_max=' + encodeURIComponent(hasta);
  // A) eventos de la liga en la ventana (lo que hace hoy el robot)
  await get('/events?tag_id=' + tag + '&active=true&closed=false&limit=50' + w);
  // B) mercados "moneyline" de la liga, sin los subeventos
  const m1 = await get('/markets?tag_id=' + tag + '&active=true&closed=false&limit=100&sports_market_types=moneyline' + w, 'markets-sm.json');
  const m2 = await get('/markets?tag_id=' + tag + '&active=true&closed=false&limit=100&sports_market_type=moneyline' + w);
  const m3 = await get('/markets?tag_id=' + tag + '&active=true&closed=false&limit=100' + w, 'markets-todos.json');
  // C) eventos con exclusion de subeventos
  await get('/events?tag_id=' + tag + '&active=true&closed=false&limit=50&exclude_tag_id=100639' + w);
  await get('/events?series_id=' + (lal ? lal.series : 10193) + '&active=true&closed=false&limit=50&order=startTime&ascending=true' + w, 'events-series.json');
  // D) una consulta por slug conocido (futbol): el slug del primer partido que aparezca
  const ev = await get('/events?tag_id=' + tag + '&active=true&closed=false&limit=20' + w);
  const bases = (ev || []).map(e => e.slug).filter(s => /^lal-[a-z0-9]+-[a-z0-9]+-\d{4}-\d{2}-\d{2}$/.test(s));
  P('slugs base: ' + bases.join(' '));
  if (bases.length) await get('/events?' + bases.slice(0, 6).map(s => 'slug=' + s).join('&'));
  if (Array.isArray(m3)) P('tipos en /markets (todos): ' + JSON.stringify(m3.reduce((a, x) => { const k = x.sportsMarketType || '?'; a[k] = (a[k] || 0) + 1; return a; }, {})));
  if (Array.isArray(m1) && m1[0]) P('ejemplo /markets sports_market_types: ' + JSON.stringify({ slug: m1[0].slug, q: m1[0].question, g: m1[0].groupItemTitle, t: m1[0].sportsMarketType, ev: (m1[0].events || []).map(e => e.slug), o: m1[0].outcomePrices }));
  fs.writeFileSync('salida_pred/log.txt', log.join('\n'));
})();
