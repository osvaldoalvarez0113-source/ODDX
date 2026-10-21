'use strict';
// OVA · NBA: ¿la linea de cierre ya descuenta bien las AUSENCIAS de jugadores importantes?
// Para cada juego (2024-25 y 2025-26) se mide cuanto "talento" le falta a cada equipo (jugadores que suelen
// jugar y esa noche no jugaron, segun el boxscore de ESPN) y se prueba si eso explica el margen REAL
// despues de descontar la linea de cierre. Si el coeficiente c es ~0, la linea ya lo sabe y no hay ventaja.
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
/* ---------- boxscore: quien jugo y cuanto produjo ---------- */
function leerBox(j) {
  const res = {};   // teamId -> [{id,min,prod,jugo}]
  const eq = j && j.boxscore && j.boxscore.players; if (!eq) return null;
  eq.forEach(t => {
    const tid = String(t.team && t.team.id), lista = [];
    (t.statistics || []).forEach(bloque => {
      const lab = bloque.labels || [], iM = lab.indexOf('MIN'), iP = lab.indexOf('PTS'), iR = lab.indexOf('REB'), iA = lab.indexOf('AST');
      (bloque.athletes || []).forEach(at => {
        const st = at.stats || [], jugo = !at.didNotPlay && st.length > 0 && num(st[iM]) > 0;
        lista.push({ id: String(at.athlete && at.athlete.id), min: jugo ? num(st[iM]) : 0, prod: jugo ? (num(st[iP]) || 0) + 0.7 * (num(st[iR]) || 0) + 0.7 * (num(st[iA]) || 0) : 0, jugo });
      });
    });
    res[tid] = lista;
  });
  return Object.keys(res).length >= 2 ? res : null;
}
/* ---------- talento que falta ---------- */
function faltantes(games) {          // games ordenados por fecha; recorre cada temporada por separado
  const S = {};                       // season -> team -> {pl: id -> {g,min,prod}, n}
  games.forEach(g => {
    const sk = g.sk; S[sk] = S[sk] || {};
    ['h', 'a'].forEach(lado => {
      const tid = g[lado], T = S[sk][tid] = S[sk][tid] || { pl: {}, n: 0 }, caja = g.box[tid];
      // talento esperado = top 8 por minutos promedio entre los que han jugado >=5 juegos y estan en la plantilla reciente
      const vet = Object.keys(T.pl).map(id => ({ id, ...T.pl[id], mpg: T.pl[id].min / T.pl[id].g, ppg: T.pl[id].prod / T.pl[id].g }))
        .filter(p => p.g >= 5 && p.mpg >= 16 && T.n - p.ult <= 12).sort((x, y) => y.mpg - x.mpg).slice(0, 8);
      const jugaron = new Set((caja || []).filter(p => p.jugo).map(p => p.id));
      g['miss_' + lado] = T.n >= 10 ? vet.filter(p => !jugaron.has(p.id)).reduce((a, p) => a + p.ppg, 0) : null;
      g['have_' + lado] = T.n >= 10 ? vet.reduce((a, p) => a + p.ppg, 0) : null;
      (caja || []).forEach(p => { if (!p.jugo) return; const q = T.pl[p.id] = T.pl[p.id] || { g: 0, min: 0, prod: 0, ult: 0 }; q.g++; q.min += p.min; q.prod += p.prod; q.ult = T.n + 1; });
      T.n++;
    });
  });
}
async function main() {
  let out = '## NBA · ¿la linea descuenta bien las ausencias de jugadores importantes?\n\n';
  const log = t => { out += t + '\n\n'; console.log(t); };
  const todos = []; for (const sk of SEASONS) { const g = await temporada(sk); g.forEach(x => x.sk = sk); console.log('temporada ' + sk + ': ' + g.length + ' juegos'); todos.push(...g); }
  const uni = new Map(); todos.forEach(g => { if (!uni.has(g.id)) uni.set(g.id, g); });
  const games = [...uni.values()].sort((a, b) => a.ts - b.ts);
  console.log('Bajando boxscores y lineas de ' + games.length + ' juegos...');
  await pool(games.map(g => async () => {
    const [bx, ln] = await Promise.all([pedir(ESPN + 'summary?event=' + g.id).catch(e => { errores.push('box ' + g.id + ' ' + e.message.slice(0, 60)); return null; }), pedir(CORE(g.id)).catch(() => null)]);
    g.box = bx ? leerBox(bx) : null; g.linea = ln ? lineaCore(ln, g.abH) : null;
  }), 8, (h, t) => { if (h % 400 === 0) console.log('  ' + h + '/' + t); });
  const conBox = games.filter(g => g.box), conLinea = games.filter(g => g.box && g.linea && g.linea.spread != null);
  const ej = conBox[0] && conBox[0].box[conBox[0].h] ? conBox[0].box[conBox[0].h].slice(0, 3) : null;
  log('### Datos\n```\njuegos: ' + games.length + ' · con boxscore: ' + conBox.length + ' · con boxscore y spread: ' + conLinea.length + '\nerrores de descarga: ' + errores.length + (errores.length ? ' (primeros: ' + errores.slice(0, 3).join(' | ') + ')' : '') + '\nejemplo de jugadores leidos: ' + JSON.stringify(ej) + '\n```');
  if (conLinea.length < 800) { log('NO TERMINO: muy pocos juegos con boxscore y linea.'); fs.writeFileSync('resultado_nba_lesiones.txt', out); return; }
  faltantes(conBox.filter(g => g.box[g.h] && g.box[g.a]));
  const rows = conLinea.filter(g => g.miss_h != null && g.miss_a != null && g.have_h > 0 && g.have_a > 0).map(g => ({
    sk: g.sk, mar: g.hs - g.as, mk: -g.linea.spread, mh: g.miss_h, ma: g.miss_a, hh: g.have_h, ha: g.have_a, tot: g.hs + g.as, total: g.linea.total }));
  log('Juegos medibles (ambos equipos con >=10 juegos previos): ' + rows.length + '. Talento que falta = produccion promedio (PTS + 0.7·REB + 0.7·AST) de los jugadores habituales (top 8 por minutos) que NO jugaron esa noche.');
  const D = rows.map(r => r.mh - r.ma);       // positivo = al local le falta mas
  const st = ms(D.map(Math.abs));
  log('### 1) ¿Cuantos juegos tienen ausencias grandes?\n' + tabla(['Diferencia de talento que falta (local − visita)', 'Juegos', 'Margen real − linea (pts, + = el local rindio mas de lo que decia la linea)', 'z'],
    [[' ≤ −15 (le falta mucho a la VISITA)', r => r <= -15], ['−15 a −8', r => r > -15 && r <= -8], ['−8 a 8 (parejo)', r => r > -8 && r < 8], ['8 a 15', r => r >= 8 && r < 15], ['≥ 15 (le falta mucho al LOCAL)', r => r >= 15]].map(([lab, fn]) => {
      const v = rows.filter(r => fn(r.mh - r.ma)).map(r => r.mar - r.mk), q = ms(v); return [lab, v.length, f(q.m, 2) + ' ± ' + f(2 * q.se, 2), f(q.z, 1)]; })));
  const X = rows.map(r => [1, r.mk, r.mh - r.ma]), y = rows.map(r => r.mar), g1 = ols(X, y);
  log('### 2) Regresion: margen real = a + b·(linea) + c·(talento que falta, local − visita)\n**c** = cuanto vale la ausencia ENCIMA de lo que ya dice la linea (0 = la linea ya lo sabe; negativo = la linea se queda corta con las ausencias del local).\n\n' +
    (g1 ? tabla(['b (linea)', 'c (ausencias)', 'z de c'], [[f(g1.b[1], 3) + ' ± ' + f(2 * g1.se[1], 3), f(g1.b[2], 3) + ' ± ' + f(2 * g1.se[2], 3), f(g1.b[2] / (g1.se[2] || 1), 1)]]) : 'sin solucion'));
  const sks = [...new Set(rows.map(r => r.sk))].sort();
  log('### 3) Misma regresion por temporada (¿se repite?)\n' + tabla(['Temporada', 'Juegos', 'c ± 2·se', 'z'], sks.map(s => { const rr = rows.filter(r => r.sk === s), g = ols(rr.map(r => [1, r.mk, r.mh - r.ma]), rr.map(r => r.mar)); return g ? [s + '-' + String(s + 1).slice(2), rr.length, f(g.b[2], 3) + ' ± ' + f(2 * g.se[2], 3), f(g.b[2] / (g.se[2] || 1), 1)] : [s, rr.length, '—', '—']; })));
  // efecto "crudo": sin linea, cuanto vale la ausencia en puntos de margen
  const g0 = ols(rows.map(r => [1, r.mh - r.ma]), rows.map(r => r.mar));
  log('### 4) Efecto crudo (sin mirar la linea): margen real = a + c·(talento que falta)\n' + (g0 ? 'c = ' + f(g0.b[1], 3) + ' ± ' + f(2 * g0.se[1], 3) + ' pts de margen por cada punto de produccion que falta (si c ≈ −0.3, perder 15 de produccion cuesta ~4.5 pts). Esto prueba que las ausencias importan; la seccion 2 dice si la linea ya las cobra.' : 'sin solucion'));
  // apostar: contra la linea a favor del equipo al que NO le falta
  const ap = t => { let w = 0, l = 0; const rets = []; rows.forEach(r => { const d = r.mh - r.ma; if (Math.abs(d) < t) return; if (r.mar === r.mk) return; const apHome = d > 0 ? false : true;  // apostar por el equipo sano
      const gana = apHome ? r.mar > r.mk : r.mar < r.mk; if (gana) { w++; rets.push(100 / 110); } else { l++; rets.push(-1); } }); const q = ms(rets); return [t + '+', w + l, w + '-' + l, f(100 * w / Math.max(w + l, 1), 1) + '%', f(100 * q.m, 1) + '% ± ' + f(200 * q.se, 1) + '%']; };
  log('### 5) Apostar por el equipo SANO contra la linea de cierre (a −110; hay que ganar 52.4%)\n' + tabla(['Diferencia de talento', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se'], [8, 12, 16, 20].map(ap)));
  log('### Resumen\n```\nc (ausencias encima de la linea) = ' + (g1 ? f(g1.b[2], 3) + ' ± ' + f(2 * g1.se[2], 3) : '—') + '\nSi el intervalo incluye 0, la linea de cierre ya descuenta las ausencias y no hay ventaja en usarlas.\n```');
  fs.writeFileSync('resultado_nba_lesiones.txt', out);
  fs.writeFileSync('resultado_nba_lesiones.json', JSON.stringify({ n: rows.length, c: g1 && g1.b[2], se: g1 && g1.se[2] }));
}
main().catch(e => { console.error(e); fs.writeFileSync('resultado_nba_lesiones.txt', 'ERROR: ' + (e && e.stack || e)); process.exit(1); });
