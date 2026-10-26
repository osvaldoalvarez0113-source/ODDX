'use strict';
/* ¿Sirve la diferencia entre Polymarket y la línea de cierre de las casas?
   Para cada juego YA TERMINADO de la temporada 2026 (NFL, NHL, NBA) junta:
     · el precio de Polymarket justo antes de empezar (historial público del mercado),
     · la línea de cierre de ESPN/DraftKings sin margen,
     · quién ganó.
   Hipótesis escrita ANTES de mirar (una sola, sin buscar en los datos):
     H1: cuando Polymarket ve al local MÁS probable que la casa, el local gana más de lo que dice la casa (y al revés).
     Se mide con la regresión (ganó − precio casa) = b · (precio Polymarket − precio casa). b = 0 → la casa ya lo sabe todo; b > 0 → Polymarket suma.
   Corte fuera de muestra: juegos desde CORTE (los anteriores sirven solo para ver el tamaño del efecto).
   Corre en GitHub Actions (el taller no alcanza ESPN ni Polymarket). Uso: node scripts/divergencia.js */
const fs = require('fs');
const L = require('./lib_medir.js');
const D = require('./datos_nhl_nfl.js');
const OVAPred = require('../prediccion.js');
const G = 'https://gamma-api.polymarket.com', C = 'https://clob.polymarket.com';
const CORTE = Date.parse('2026-10-26T00:00:00Z');
D.ESPN.nba = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
D.CORE.nba = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/';
const INICIO = { nfl: '2026-09-01', nhl: '2026-10-01', nba: '2026-10-01' };
const SLUG = /^(nfl|nba|nhl)-[a-z0-9]+-[a-z0-9]+-\d{4}-\d{2}-\d{2}$/;
fs.mkdirSync('salida_div', { recursive: true });
const log = []; const P = s => { log.push(s); console.log(s); };

async function mercadosCerrados(tag, dep) {
  const out = [], desde = new Date(INICIO[dep] + 'T00:00:00Z').toISOString(), hasta = new Date(Date.now() + 864e5).toISOString();
  for (let off = 0; off < 1500; off += 100) {
    let arr;
    try { arr = await L.pedir(G + '/markets?tag_id=' + tag + '&closed=true&limit=100&offset=' + off + '&sports_market_types=moneyline&end_date_min=' + encodeURIComponent(desde) + '&end_date_max=' + encodeURIComponent(hasta)); }
    catch (e) { P(dep + ' offset ' + off + ': ' + e.message); break; }
    if (!Array.isArray(arr) || !arr.length) break;
    out.push(...arr); if (arr.length < 100) break;
  }
  return out;
}
const lista = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
const tsMk = m => Date.parse(String(m.gameStartTime || '').replace(' ', 'T').replace(/\+00$/, 'Z'));

async function precioAntes(m, ini) {
  const toks = lista(m.clobTokenIds); if (!toks || !toks[0]) return null;
  const t = ms => Math.floor(ms / 1000);
  const j = await L.pedir(C + '/prices-history?market=' + toks[0] + '&startTs=' + t(ini - 8 * 36e5) + '&endTs=' + t(ini) + '&fidelity=10');
  const h = (j && j.history || []).filter(x => x.t * 1000 <= ini && isFinite(+x.p));
  if (!h.length) return null;
  const u = h[h.length - 1]; if (ini - u.t * 1000 > 4 * 36e5) return null;       // último dato muy viejo
  return { p: +u.p, min: Math.round((ini - u.t * 1000) / 6e4) };
}

async function deporte(dep, tag, DIAG) {
  const mks = (await mercadosCerrados(tag, dep)).filter(m => SLUG.test(String(m.slug || '')));
  P(dep + ': ' + mks.length + ' mercados cerrados de moneyline');
  const juegos = (await D.temporada(dep, 2026, DIAG)).filter(g => g.done && !g.skip);
  P(dep + ': ' + juegos.length + ' juegos terminados en ESPN');
  await D.bajarLineas(dep, juegos, DIAG);
  const conLinea = juegos.filter(g => g.linea && g.linea.ml);
  P(dep + ': ' + conLinea.length + ' con línea de cierre');
  const filas = [];
  await L.pool(mks.map(m => async () => {
    const o = lista(m.outcomes), pr = lista(m.outcomePrices); if (!o || !pr || o.length !== 2) return;
    const p0 = +pr[0], p1 = +pr[1]; if (!((p0 === 1 && p1 === 0) || (p0 === 0 && p1 === 1))) return;   // anulado o sin resolver
    const ini = tsMk(m); if (!isFinite(ini)) return;
    const g = conLinea.find(x => Math.abs(x.ts - ini) <= 30 * 36e5 && OVAPred.esDe(o[0], x.na) && OVAPred.esDe(o[1], x.nh));   // Polymarket: primero la visita
    if (!g) return;
    const ant = await precioAntes(m, ini); if (!ant) return;
    const dk = L.sinMargen(g.linea.ml[0], g.linea.ml[1]);
    filas.push({ dep, id: g.id, ts: g.ts, h: g.nh, a: g.na, pmH: +(1 - ant.p).toFixed(4), min: ant.min, dkH: +dk[0].toFixed(4), mlH: g.linea.ml[0], mlA: g.linea.ml[1], gana: p1 === 1 ? 1 : 0, vol: m.volumeNum || 0 });
  }), 6);
  P(dep + ': ' + filas.length + ' juegos con las tres cosas');
  return filas;
}

/* ---------- estadística ---------- */
const media = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
function brier(f) { const d = f.map(r => (r.pmH - r.gana) ** 2 - (r.dkH - r.gana) ** 2), m = media(d), v = media(d.map(x => (x - m) ** 2)); return { n: f.length, bPM: media(f.map(r => (r.pmH - r.gana) ** 2)), bDK: media(f.map(r => (r.dkH - r.gana) ** 2)), dif: m, z: f.length > 2 ? m / Math.sqrt(v / f.length) : 0 }; }
function regresion(f) {                            // (gana − dk) = b · (pm − dk); error estándar robusto
  const x = f.map(r => r.pmH - r.dkH), y = f.map(r => r.gana - r.dkH), sxx = x.reduce((s, v) => s + v * v, 0);
  if (!sxx || f.length < 10) return { n: f.length, b: null };
  const b = x.reduce((s, v, i) => s + v * y[i], 0) / sxx, se = Math.sqrt(x.reduce((s, v, i) => s + v * v * (y[i] - b * v) ** 2, 0)) / sxx;
  return { n: f.length, b, se, z0: b / se, z1: (b - 1) / se, sdx: Math.sqrt(media(x.map(v => v * v))) };
}
function apuesta(f, umbral) {                       // apostar al lado que Polymarket ve más probable que la casa, a la cuota de la casa
  const s = f.filter(r => Math.abs(r.pmH - r.dkH) >= umbral); let roi = [], res = [], exp = [];
  s.forEach(r => { const loc = r.pmH > r.dkH, ml = loc ? r.mlH : r.mlA, g = loc ? r.gana : 1 - r.gana, pr = loc ? r.dkH : 1 - r.dkH;
    roi.push(L.pago(ml, g ? 1 : -1)); res.push(g - pr); exp.push(pr * (1 - pr)); });
  const n = s.length, m = media(res), z = n ? m / Math.sqrt(exp.reduce((a, b) => a + b, 0) / n / n) : 0, r = media(roi), sd = Math.sqrt(media(roi.map(x => (x - r) ** 2)));
  return { n, ganaDeMas: m, z, roi: r, roiEE: n ? sd / Math.sqrt(n) : 0 };
}
const fp = (x, d) => x === null || x === undefined || !isFinite(x) ? '—' : (x * 100).toFixed(d === undefined ? 1 : d) + '%';
function informe(todas) {
  let md = '# Polymarket contra la línea de cierre (temporada 2026)\n\nGenerado ' + new Date().toISOString() + '\n\n';
  const grupos = [['TODOS', todas], ['NFL', todas.filter(r => r.dep === 'nfl')], ['NHL', todas.filter(r => r.dep === 'nhl')], ['NBA', todas.filter(r => r.dep === 'nba')]];
  const tp = [['Grupo', 'Juegos', 'Brier Polymarket', 'Brier casa', 'Dif (PM−casa)', 'z']];
  const tr = [['Grupo', 'Juegos', 'Diferencia típica', 'b (Polymarket suma)', 'z (b=0)', 'z (b=1)']];
  grupos.forEach(([n, f]) => { if (f.length < 5) return; const b = brier(f), r = regresion(f);
    tp.push([n, f.length, b.bPM.toFixed(4), b.bDK.toFixed(4), (b.dif >= 0 ? '+' : '') + b.dif.toFixed(4), b.z.toFixed(1)]);
    tr.push([n, f.length, fp(r.sdx), r.b === null ? '—' : r.b.toFixed(2) + ' ± ' + r.se.toFixed(2), r.b === null ? '—' : r.z0.toFixed(1), r.b === null ? '—' : r.z1.toFixed(1)]); });
  md += '## 1. ¿Quién acierta mejor? (Brier: menos es mejor)\n\n' + L.tabla(tp[0], tp.slice(1)) + '\n';
  md += '## 2. ¿La diferencia trae información? (H1, una sola prueba)\n\n' + L.tabla(tr[0], tr.slice(1)) +
    '\n- b = 0: la casa ya incluye todo lo que sabe Polymarket. b = 1: Polymarket manda. z(b=0) ≥ 2 con juegos NUEVOS es lo que se necesita para usarla como señal.\n\n';
  const ta = [['Grupo', 'Diferencia mínima', 'Apuestas', 'Gana de más que el precio', 'z', 'ROI a la cuota de la casa']];
  grupos.slice(0, 1).forEach(([n, f]) => [0.02, 0.03, 0.05].forEach(u => { const a = apuesta(f, u); ta.push([n, '≥ ' + u * 100 + ' pts', a.n, fp(a.ganaDeMas), a.z.toFixed(1), fp(a.roi) + ' ± ' + fp(a.roiEE)]); }));
  md += '## 3. Si se apostara al lado que Polymarket ve mejor que la casa\n\n' + L.tabla(ta[0], ta.slice(1)) + '\n';
  const nuevos = todas.filter(r => r.ts >= CORTE), r2 = regresion(nuevos), b2 = brier(nuevos);
  md += '## 4. Fuera de muestra (juegos desde 26-oct-2026)\n\n' + (nuevos.length < 30 ? '- Solo ' + nuevos.length + ' juegos: todavía no se puede decir nada. Se vuelve a correr con el tiempo.\n' :
    '- ' + nuevos.length + ' juegos: b = ' + r2.b.toFixed(2) + ' ± ' + r2.se.toFixed(2) + ' (z ' + r2.z0.toFixed(1) + '); Brier PM−casa ' + b2.dif.toFixed(4) + ' (z ' + b2.z.toFixed(1) + ')\n');
  md += '\n## Lectura honesta\n\n- Los precios de Polymarket se toman del último dato del historial antes del inicio (≤ 4 h); la casa es el cierre de DraftKings/ESPN sin margen.\n- Una sola hipótesis (H1), así que no hace falta corrección por tantas pruebas; aun así, con pocos juegos el error es grande.\n- Aunque H1 dé positivo, para volverse señal en las apps tiene que repetirse con los juegos posteriores al corte.\n';
  return md;
}

async function main() {
  const sp = await L.pedir(G + '/sports'); const DIAG = { errores: [] }; let todas = [];
  for (const dep of ['nfl', 'nhl', 'nba']) {
    const s = sp.find(x => x.sport === dep); if (!s) { P(dep + ': no está en /sports'); continue; }
    try { todas = todas.concat(await deporte(dep, s.primaryTagId, DIAG)); } catch (e) { P(dep + ' ERROR ' + e.message); }
  }
  P('errores ESPN: ' + DIAG.errores.length + (DIAG.errores[0] ? ' · ' + DIAG.errores[0] : ''));
  fs.writeFileSync('salida_div/divergencia-datos.json', JSON.stringify(todas));
  fs.writeFileSync('salida_div/divergencia.md', informe(todas));
  fs.writeFileSync('salida_div/log.txt', log.join('\n'));
  console.log(fs.readFileSync('salida_div/divergencia.md', 'utf8'));
}
if (require.main === module) main(); else module.exports = { brier, regresion, apuesta, informe };
