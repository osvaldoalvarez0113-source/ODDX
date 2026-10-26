'use strict';
/* ===================================================================
   OVA · PRECIOS DEL MERCADO DE PREDICCION (Polymarket, API publica "gamma", sin llave)
   Corre en GitHub Actions cada 10 minutos (pred.yml). Para cada deporte baja los juegos que vienen, saca el precio del "moneyline"
   (quien gana) y deja un archivo chico  pred-<dep>.json  en la rama «pred».  Las apps lo leen:
     · cuando no hay precio de Pinnacle ni de ESPN (se acabo la cuota de OddsPapi, o ESPN ya lo quito porque el juego empezo),
     · en vivo: el precio sigue moviendose mientras se juega (ESPN lo borra al arrancar),
     · para comparar contra Pinnacle (un mercado de apostadores casuales contra uno de profesionales).
   Un precio de 62¢ es una probabilidad de 62%. Los dos lados suman ~100¢ (la diferencia es el margen); se normaliza.
   =================================================================== */
const fs = require('fs');
const G = 'https://gamma-api.polymarket.com';
const DEPS = ['nfl', 'nba', 'nhl', 'mlb'];                 // deportes de EE. UU.: el slug es  liga-visita-local-AAAA-MM-DD
const SLUG = /^(nfl|nba|nhl|mlb)-([a-z0-9]+)-([a-z0-9]+)-(\d{4})-(\d{2})-(\d{2})$/;

const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
function lista(s) { try { const a = typeof s === 'string' ? JSON.parse(s) : s; return Array.isArray(a) ? a : null; } catch (e) { return null; } }

/* precio de un lado = punto medio entre lo que piden y lo que ofrecen; si no hay libro, el ultimo precio de outcomePrices */
function precioLados(m) {
  const nombres = lista(m.outcomes), pr = lista(m.outcomePrices);
  if (!nombres || !pr || nombres.length !== 2 || pr.length !== 2) return null;
  let p0 = num(pr[0]), p1 = num(pr[1]);
  const bb = num(m.bestBid), ba = num(m.bestAsk);
  if (bb !== null && ba !== null && ba >= bb && ba - bb <= 0.08) p0 = (bb + ba) / 2, p1 = 1 - p0;      // el libro del primer lado manda si es estrecho
  if (p0 === null || p1 === null || p0 < 0 || p1 < 0 || p0 + p1 <= 0) return null;
  const s = p0 + p1;
  return { nombres, p: [p0 / s, p1 / s], suma: s };
}

/* eventos de la API -> lista de juegos {slug, a, h, pa, ph, vol, liq, ini, upd}; a = visita, h = local (en los deportes de EE. UU. Polymarket pone primero a la visita) */
function parsearEventos(eventos, ahora) {
  const out = [];
  (Array.isArray(eventos) ? eventos : []).forEach(e => {
    const sl = SLUG.exec(String(e.slug || '')); if (!sl) return;
    if (e.closed === true) return;
    const ml = (e.markets || []).find(m => m && m.sportsMarketType === 'moneyline' && m.closed !== true);
    if (!ml) return;
    const pl = precioLados(ml); if (!pl) return;
    const ini = Date.parse(String(ml.gameStartTime || e.startTime || '').replace(' ', 'T').replace(/\+00$/, 'Z'));
    if (!isFinite(ini)) return;
    if (ini < ahora - 12 * 36e5) return;                    // juegos de hace mas de 12 h ya no sirven
    out.push({ slug: e.slug, dep: sl[1], a: pl.nombres[0], h: pl.nombres[1], pa: +pl.p[0].toFixed(4), ph: +pl.p[1].toFixed(4),
      vol: Math.round(num(ml.volumeNum !== undefined ? ml.volumeNum : ml.volume) || 0), liq: Math.round(num(ml.liquidityNum !== undefined ? ml.liquidityNum : ml.liquidity) || 0),
      ini: new Date(ini).toISOString(), upd: ml.updatedAt || null, live: e.live === true, ended: e.ended === true, score: e.score || null });
  });
  return out;
}

async function pedir(path, intentos) {
  for (let k = 0; k < (intentos || 3); k++) {
    try {
      const r = await fetch(G + path, { headers: { accept: 'application/json', 'user-agent': 'ova-pred/1.0' } });
      if (r.ok) return await r.json();
      if (r.status >= 400 && r.status < 500 && r.status !== 429) return null;
    } catch (e) { }
    await new Promise(r => setTimeout(r, 1500 * (k + 1)));
  }
  return null;
}

/* baja los eventos activos de un deporte, pagina a pagina, hasta pasar la ventana de 8 dias (o 8 paginas) */
async function bajarDeporte(tag, ahora, log) {
  const todos = [];
  const desde = new Date(ahora - 12 * 36e5).toISOString(), hasta = new Date(ahora + 8 * 864e5).toISOString();
  for (let off = 0, pag = 0; pag < 8; off += 50, pag++) {
    const j = await pedir('/events?tag_id=' + tag + '&active=true&closed=false&limit=50&offset=' + off + '&order=startTime&ascending=true&end_date_min=' + encodeURIComponent(desde) + '&end_date_max=' + encodeURIComponent(hasta));
    if (!Array.isArray(j)) { log('  pagina ' + pag + ': sin respuesta'); break; }
    todos.push(...j);
    if (j.length < 50) break;
  }
  return todos;
}

/* ---------- FUTBOL (1X2): cada partido son 3 mercados "Will X win?" (local, empate, visita); se piden con sports_market_types=moneyline para no bajar los 30 MB de subeventos ---------- */
const LIGAS_FUT = ['epl', 'lal', 'bun', 'sea', 'fl1', 'ucl'];
const SLUG_FUT = /^(epl|lal|bun|sea|fl1|ucl)-([a-z0-9]+)-([a-z0-9]+)-(\d{4})-(\d{2})-(\d{2})$/;
function precioSi(m) {
  const pr = lista(m.outcomePrices), bb = num(m.bestBid), ba = num(m.bestAsk);
  let p = pr ? num(pr[0]) : null;
  if (bb !== null && ba !== null && ba >= bb && ba - bb <= 0.08) p = (bb + ba) / 2;
  return p;
}
/* mercados moneyline de futbol -> [{slug, liga, h, a, ph, pd, pa, vol, liq, ini, upd}] (h = local, a = visita; el nombre sale del mercado del empate «Draw (Local vs. Visita)») */
function parsearFutbol(mercados, ahora) {
  const por = {};
  (Array.isArray(mercados) ? mercados : []).forEach(m => {
    if (!m || m.sportsMarketType !== 'moneyline' || m.closed === true) return;
    const ev = (m.events && m.events[0]) || {}; const base = String(ev.slug || String(m.slug || '').replace(/-(draw|[a-z0-9]{2,4})$/, ''));
    const sl = SLUG_FUT.exec(base); if (!sl) return;
    (por[base] = por[base] || { sl: sl, ms: [] }).ms.push(m);
  });
  const out = [];
  Object.keys(por).forEach(base => {
    const { sl, ms } = por[base]; if (ms.length !== 3) return;
    const dm = ms.find(m => /^draw/i.test(String(m.groupItemTitle || ''))); if (!dm) return;
    const nn = /^draw\s*\((.+?)\s+vs\.?\s+(.+)\)\s*$/i.exec(String(dm.groupItemTitle)); if (!nn) return;
    const h = nn[1], a = nn[2];
    const mh = ms.find(m => m !== dm && String(m.groupItemTitle) === h), ma = ms.find(m => m !== dm && String(m.groupItemTitle) === a);
    if (!mh || !ma) return;
    const p = [precioSi(mh), precioSi(dm), precioSi(ma)]; if (p.some(x => x === null || x < 0)) return;
    const s = p[0] + p[1] + p[2]; if (!(s > 0.8 && s < 1.3)) return;
    const ini = Date.parse(String(dm.gameStartTime || '').replace(' ', 'T').replace(/\+00$/, 'Z')); if (!isFinite(ini) || ini < ahora - 6 * 36e5) return;
    out.push({ slug: base, liga: sl[1], h, a, ph: +(p[0] / s).toFixed(4), pd: +(p[1] / s).toFixed(4), pa: +(p[2] / s).toFixed(4),
      vol: Math.round(Math.min(...[mh, dm, ma].map(m => num(m.volumeNum) || 0))), liq: Math.round(Math.min(...[mh, dm, ma].map(m => num(m.liquidityNum) || 0))),
      ini: new Date(ini).toISOString(), upd: dm.updatedAt || null });
  });
  return out.sort((x, y) => Date.parse(x.ini) - Date.parse(y.ini));
}
async function bajarFutbol(tag, ahora) {
  const desde = new Date(ahora - 6 * 36e5).toISOString(), hasta = new Date(ahora + 8 * 864e5).toISOString(), todos = [];
  for (let off = 0, pag = 0; pag < 6; off += 100, pag++) {
    const j = await pedir('/markets?tag_id=' + tag + '&active=true&closed=false&limit=100&offset=' + off + '&sports_market_types=moneyline&end_date_min=' + encodeURIComponent(desde) + '&end_date_max=' + encodeURIComponent(hasta));
    if (!Array.isArray(j)) break; todos.push(...j); if (j.length < 100) break;
  }
  return todos;
}

async function main() {
  const ahora = Date.now(); fs.mkdirSync('salida_pred', { recursive: true });
  const L = []; const log = s => { L.push(s); console.log(s); };
  const sp = await pedir('/sports'); if (!Array.isArray(sp)) { log('Polymarket /sports no respondio: se conservan los archivos anteriores'); fs.writeFileSync('salida_pred/log.txt', L.join('\n')); return; }
  let hubo = 0;
  for (const dep of DEPS) {
    const m = sp.find(x => String(x.sport).toLowerCase() === dep); if (!m || !m.primaryTagId) { log(dep + ': no aparece en /sports'); continue; }
    const ev = await bajarDeporte(m.primaryTagId, ahora, log);
    const juegos = parsearEventos(ev, ahora).sort((a, b) => Date.parse(a.ini) - Date.parse(b.ini));
    log(dep + ': ' + ev.length + ' eventos · ' + juegos.length + ' juegos con precio' + (juegos[0] ? ' · ejemplo ' + juegos[0].slug + ' ' + juegos[0].a + ' ' + Math.round(juegos[0].pa * 100) + '% / ' + juegos[0].h + ' ' + Math.round(juegos[0].ph * 100) + '%' : ''));
    log('  slugs: ' + ev.map(e => e.slug + (e.closed ? '[closed]' : '') + (e.ended ? '[ended]' : '') + (e.live ? '[live]' : '')).filter(x => SLUG.test(x.replace(/\[.*$/, ''))).join(' '));
    if (dep === 'nfl') { const d = await pedir('/events/slug/nfl-kc-sea-2026-10-25', 1); log('  diag nfl-kc-sea-2026-10-25: ' + (d ? JSON.stringify({ closed: d.closed, active: d.active, live: d.live, ended: d.ended, score: d.score, period: d.period, gameStatus: d.gameStatus, endDate: d.endDate, startTime: d.startTime, mk: (d.markets || []).slice(0, 2).map(x => [x.sportsMarketType, x.closed, x.outcomePrices, x.bestBid, x.bestAsk, x.gameStartTime]) }) : 'sin respuesta')); }
    if (!ev.length) continue;                             // si Polymarket no trajo nada, no pisamos el archivo anterior
    fs.writeFileSync('salida_pred/pred-' + dep + '.json', JSON.stringify({ v: 1, dep, generado: new Date(ahora).toISOString(), juegos }));
    hubo++;
  }
  // fútbol: todas las ligas juntas en pred-futbol.json
  const fut = [];
  for (const lg of LIGAS_FUT) {
    const m = sp.find(x => String(x.sport).toLowerCase() === lg); if (!m || !m.primaryTagId) { log(lg + ': no aparece en /sports'); continue; }
    // si la etiqueta principal no trae nada (Serie A, Champions), se prueban las otras etiquetas de la liga
    const tags = [m.primaryTagId].concat(String(m.tags || '').split(',').map(x => +x.trim()).filter(x => x && x !== 1 && x !== 100639 && x !== 100350 && x !== m.primaryTagId));
    let mk = [], js = [];
    for (const tg of tags) { mk = await bajarFutbol(tg, ahora); js = parsearFutbol(mk, ahora); if (js.length) { if (tg !== m.primaryTagId) log('  ' + lg + ': la etiqueta ' + tg + ' sí trae partidos'); break; } }
    log(lg + ': ' + mk.length + ' mercados · ' + js.length + ' partidos con 1X2' + (js[0] ? ' · ejemplo ' + js[0].h + ' ' + Math.round(js[0].ph * 100) + '% / empate ' + Math.round(js[0].pd * 100) + '% / ' + js[0].a + ' ' + Math.round(js[0].pa * 100) + '%' : ''));
    fut.push(...js);
  }
  if (fut.length) { fs.writeFileSync('salida_pred/pred-futbol.json', JSON.stringify({ v: 1, dep: 'futbol', generado: new Date(ahora).toISOString(), juegos: fut })); hubo++; }
  fs.writeFileSync('salida_pred/log.txt', L.join('\n'));
  if (!hubo) log('Nada que guardar');
}
if (require.main === module) main(); else module.exports = { parsearEventos, precioLados, SLUG, parsearFutbol };
