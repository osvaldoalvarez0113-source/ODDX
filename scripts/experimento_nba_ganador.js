'use strict';
// OVA · NBA: prueba SOLO DE GANADOR (sin buscar valor): ¿a que % acierta el favorito de la linea y el del modelo?
// Mide en 2024-25 y 2025-26: siempre-local, favorito de la linea de cierre (lo que usa la app) y favorito del modelo solo.
const fs = require('fs');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const CORE = id => 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/' + id + '/competitions/' + id + '/odds';
const SEASONS = (process.env.TEMPS_NBA || '2024,2025').split(',').map(s => parseInt(s, 10));
const pad2 = n => (n < 10 ? '0' : '') + n;
const ymd = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
const dormir = ms => new Promise(r => setTimeout(r, ms));
const num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return isFinite(n) ? n : null; };
const errores = [];
async function pedir(url) {
  for (let i = 0; i < 5; i++) {
    let r;
    try { r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (ova-experimento)' } }); }
    catch (e) { if (i === 4) throw e; await dormir(800 * (i + 1)); continue; }
    if (r.status === 429 || r.status === 503) { await dormir(1200 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 110));
    return r.json();
  }
  throw new Error('429/503 repetido ' + url.slice(0, 100));
}
async function pool(tareas, n, cb) {
  const out = new Array(tareas.length); let i = 0, h = 0;
  async function w() { while (i < tareas.length) { const k = i++; try { out[k] = await tareas[k](); } catch (e) { errores.push(String(e.message).slice(0, 140)); out[k] = null; } h++; if (cb) cb(h, tareas.length); } }
  await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, w));
  return out;
}
const ms = v => { const n = v.length; if (!n) return { n: 0, m: 0, se: 0, z: 0 }; const m = v.reduce((a, b) => a + b, 0) / n; let q = 0; v.forEach(x => q += (x - m) * (x - m)); const se = n > 1 ? Math.sqrt(q / (n - 1) / n) : 0; return { n, m, se, z: se ? m / se : 0 }; };
function ols(X, y) {
  const n = X.length, k = X[0].length, A = Array.from({ length: k }, () => new Array(2 * k).fill(0)), xty = new Array(k).fill(0);
  for (let r = 0; r < n; r++) for (let i = 0; i < k; i++) { xty[i] += X[r][i] * y[r]; for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j]; }
  for (let i = 0; i < k; i++) A[i][k + i] = 1;
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; for (let j = 0; j < 2 * k; j++) A[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A[r][j] -= f * A[c][j]; }
  }
  const inv = A.map(r => r.slice(k)), b = inv.map(r => r.reduce((a, v, j) => a + v * xty[j], 0));
  let sse = 0; for (let r = 0; r < n; r++) { let p = 0; for (let i = 0; i < k; i++) p += b[i] * X[r][i]; sse += (y[r] - p) ** 2; }
  const s2 = sse / Math.max(n - k, 1);
  return { b, se: inv.map((r, i) => Math.sqrt(Math.max(s2 * r[i], 0))) };
}
const f = (x, d) => (x == null || !isFinite(x)) ? '—' : x.toFixed(d === undefined ? 2 : d);
const tabla = (cab, filas) => '| ' + cab.join(' | ') + ' |\n|' + cab.map(() => '---').join('|') + '|\n' + filas.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n';

/* ---------- partidos del dia (resultados) ---------- */
function parseDia(j) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a) return;
    const st = (e.status && e.status.type) || {}, ty = parseInt(e.season && e.season.type, 10) || 2;
    const hs = parseInt(h.score, 10), as = parseInt(a.score, 10);
    if (!(st.completed === true) || !isFinite(hs) || !isFinite(as) || ty === 1 || ty === 4) return;
    if (/all.?star|rising stars|celebrity/i.test((e.name || '') + (e.shortName || ''))) return;
    out.push({ id: String(e.id), ts: Date.parse(e.date), h: String(h.team.id), a: String(a.team.id), abH: h.team.abbreviation || '', hs, as, ty });
  });
  return out;
}
async function temporada(sk) {
  const dias = []; for (let d = new Date(Date.UTC(sk, 9, 15)); d <= new Date(Date.UTC(sk + 1, 5, 25)); d = new Date(d.getTime() + 864e5)) dias.push(new Date(d));
  const res = await pool(dias.map(d => async () => parseDia(await pedir(ESPN + 'scoreboard?dates=' + ymd(d) + '&limit=300'))), 10);
  return [].concat(...res.filter(Boolean));
}
/* ---------- linea de cierre (mismo lector del backtest anterior) ---------- */
function lineaCore(j, abH) {
  let mejor = null;
  ((j && j.items) || []).forEach(it => {
    const hO = it.homeTeamOdds || {}; let sp = null;
    const cps = hO.close && hO.close.pointSpread; if (cps) sp = num(cps.american !== undefined ? cps.american : cps.alternateDisplayValue);
    if (sp !== null && Math.abs(sp) > 40) sp = null;
    if (sp === null && isFinite(+it.spread) && hO.favorite !== undefined) { const v = Math.abs(+it.spread); sp = hO.favorite ? -v : v; }
    if (sp === null && typeof it.details === 'string') { const m = it.details.match(/^\s*([A-Za-z]{2,4})\s+([+-]?\d+(?:\.\d+)?)/); if (m && abH) { const v = parseFloat(m[2]); sp = m[1].toUpperCase() === String(abH).toUpperCase() ? v : -v; } }
    let tot = null; const ct = it.close && it.close.total; if (ct) tot = num(ct.alternateDisplayValue !== undefined ? ct.alternateDisplayValue : ct.american);
    if (tot !== null && (tot < 150 || tot > 300)) tot = null;
    if (tot === null && isFinite(+it.overUnder) && +it.overUnder > 150 && +it.overUnder < 300) tot = +it.overUnder;
    const dk = /draftkings/i.test((it.provider && it.provider.name) || ''), pts = (sp !== null ? 2 : 0) + (tot !== null ? 1 : 0);
    if (pts > 0 && (!mejor || pts > mejor.pts || (pts === mejor.pts && dk && !mejor.dk))) mejor = { spread: sp, total: tot, pts, dk };
  });
  return mejor;
}
/* ---------- el modelo de la app (V0) sacado tal cual de correr_deportes.js ---------- */
function cargarModelo() {
  const src = fs.readFileSync(__dirname + '/correr_deportes.js', 'utf8');
  const a = src.indexOf('const CFG0 ='), b = src.indexOf('function mseSeason');
  if (a < 0 || b < 0) throw new Error('no encontre el modelo en correr_deportes.js');
  const seasonOf = ts => { const d = new Date(ts - 10 * 3600e3); return d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };
  const dayKey = ts => Math.floor((ts - 10 * 3600e3) / 864e5);
  return new Function('seasonOf', 'dayKey', src.slice(a, b) + '\nreturn { rate, CFG0 };')(seasonOf, dayKey);
}
const wilson = (w, n) => { if (!n) return [0, 0]; const z = 1.96, p = w / n, d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - r) / d, (c + r) / d]; };
const fila = (lab, w, n) => { const [lo, hi] = wilson(w, n); return [lab, n, f(100 * w / Math.max(n, 1), 1) + '%', f(100 * lo, 1) + '–' + f(100 * hi, 1) + '%']; };
async function main() {
  let out = '## NBA · prueba de solo-ganador (sin mirar cuotas ni valor)\n\n';
  const log = t => { out += t + '\n\n'; console.log(t); };
  const todos = []; for (const sk of [2023, ...SEASONS]) { const g = await temporada(sk); g.forEach(x => x.sk = sk); console.log('temporada ' + sk + ': ' + g.length + ' juegos'); todos.push(...g); }
  const uni = new Map(); todos.forEach(g => { if (!uni.has(g.id)) uni.set(g.id, g); });
  const games = [...uni.values()].sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  const objetivo = games.filter(g => SEASONS.includes(g.sk));
  console.log('Bajando lineas de ' + objetivo.length + ' juegos...');
  await pool(objetivo.map(g => async () => { const j = await pedir(CORE(g.id)).catch(() => null); g.linea = j ? lineaCore(j, g.abH) : null; }), 8, (h, t) => { if (h % 400 === 0) console.log('  ' + h + '/' + t); });
  const M = cargarModelo(), pred = new Map();
  M.rate(games, M.CFG0, (g, x) => { if (x.cH >= 5 && x.cA >= 5) pred.set(g.id, x.pm); });
  const rows = objetivo.filter(g => g.linea && g.linea.spread != null && g.linea.spread !== 0 && pred.has(g.id) && g.hs !== g.as).map(g => ({
    sk: g.sk, homeWin: g.hs > g.as, favH: g.linea.spread < 0, sp: Math.abs(g.linea.spread), mH: pred.get(g.id) > 0, ty: g.ty }));
  log('### Datos\n```\njuegos con linea y modelo listo: ' + rows.length + ' · errores: ' + errores.length + '\n```');
  if (rows.length < 800) { log('NO TERMINO: muy pocos juegos.'); fs.writeFileSync('resultado_nba_ganador.txt', out); return; }
  const ac = (rs, fn) => { let w = 0; rs.forEach(r => { if (fn(r)) w++; }); return w; };
  const mer = r => r.favH === r.homeWin, mod = r => r.mH === r.homeWin, loc = r => r.homeWin;
  log('### 1) ¿Cuantas veces acierta quien gana?\n' + tabla(['Metodo', 'Juegos', '% aciertos', 'Intervalo 95%'], [
    fila('Siempre el LOCAL', ac(rows, loc), rows.length), fila('Favorito de la LINEA (lo que usa la app)', ac(rows, mer), rows.length), fila('Favorito del MODELO solo', ac(rows, mod), rows.length)]));
  const grupos = [['spread < 3 (parejo)', r => r.sp < 3], ['3 a 6', r => r.sp >= 3 && r.sp < 6], ['6 a 9', r => r.sp >= 6 && r.sp < 9], ['9 a 12', r => r.sp >= 9 && r.sp < 12], ['12 o mas (favorito claro)', r => r.sp >= 12]];
  log('### 2) Favorito de la linea, segun que tan favorito es (spread)\n' + tabla(['Spread', 'Juegos', '% aciertos', 'Intervalo 95%'], grupos.map(([l, fn]) => { const rs = rows.filter(fn); return fila(l, ac(rs, mer), rs.length); })));
  log('### 3) Cuando el MODELO y la LINEA eligen distinto\n' + (() => { const rs = rows.filter(r => r.mH !== r.favH); return tabla(['Quien', 'Juegos', '% aciertos', 'Intervalo 95%'], [fila('Gana el favorito de la LINEA', ac(rs, mer), rs.length), fila('Gana el favorito del MODELO', ac(rs, mod), rs.length)]); })());
  const sks = [...new Set(rows.map(r => r.sk))].sort();
  log('### 4) Por temporada (favorito de la linea / del modelo / local)\n' + tabla(['Temporada', 'Juegos', 'Linea', 'Modelo', 'Local'], sks.map(s => { const rs = rows.filter(r => r.sk === s), n = rs.length; return [s + '-' + String(s + 1).slice(2), n, f(100 * ac(rs, mer) / n, 1) + '%', f(100 * ac(rs, mod) / n, 1) + '%', f(100 * ac(rs, loc) / n, 1) + '%']; })));
  fs.writeFileSync('resultado_nba_ganador.txt', out);
}
main().catch(e => { console.error(e); fs.writeFileSync('resultado_nba_ganador.txt', 'ERROR: ' + (e && e.stack || e)); process.exit(1); });
