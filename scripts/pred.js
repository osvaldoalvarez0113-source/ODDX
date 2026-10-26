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
      ini: new Date(ini).toISOString(), upd: ml.updatedAt || null });
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
  fs.writeFileSync('salida_pred/log.txt', L.join('\n'));
  if (!hubo) log('Nada que guardar');
}
if (require.main === module) main(); else module.exports = { parsearEventos, precioLados, SLUG };
