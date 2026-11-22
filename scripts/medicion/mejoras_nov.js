'use strict';
/* ===================================================================
   MEDICIÓN «HAZ TODO PARA MEJORAR» (22-nov-2026). Solo mide: no toca la app. Corre en GitHub Actions (medir-mejoras.yml).
   1) MLB · viento y temperatura sobre el total, ahora con las líneas de cierre de 2023-2026 (rama cierres; antes faltaban 2024 y 2025).
   2) NBA · ritmo (posesiones por juego de cada equipo, de los box scores de ESPN) sobre el total.
   3) Árbitros NBA y NHL · ¿una cuadrilla mueve al local o al total más de lo que ya dice la línea de cierre?

   REGLA (fijada antes de correr): cada idea se ajusta con las demás temporadas y se mide en la que quedó afuera (una por una).
   Entra solo si mejora en la MAYORÍA de las temporadas medidas Y, todo junto, sus aciertos le ganan a la línea con z ≥ 2
   (totales: el Más/Menos que señala acierta más de 50%; ganador: menor pérdida log que el cierre y más aciertos).
   Datos: cierres-mlb.json, filas_nba.json, datos-nhl.json; MLB Stats API (clima oficial); ESPN summary (box y árbitros).
   Guarda lo bajado de ESPN en resumenes.json (rama datos-resumenes) para no repetirlo.
   Uso: node scripts/medicion/mejoras_nov.js
   =================================================================== */
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); if (r.status === 429) await sleep(2000 * (i + 1)); } catch (e) { } await sleep(600 * (i + 1)); } return null; }
async function pool(items, k, fn) { let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < items.length) { const x = items[i++]; await fn(x); } })); }
const L = [], log = s => { L.push(s); console.log(s); };
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100);
const nv = (h, a) => { const x = imp(h), y = imp(a), s = x + y; return s > 0.98 && s < 1.15 ? x / s : null; };
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function mco(X, y) {   // mínimos cuadrados con constante: devuelve [b0, b1, ...]
  const p = X[0].length + 1, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  X.forEach((f0, i) => { const f = [1].concat(f0); for (let a = 0; a < p; a++) { b[a] += f[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += f[a] * f[c]; } });
  for (let i = 0; i < p; i++) A[i][i] += 1e-9;
  const M = A.map((f, i) => f.concat([b[i]]));
  for (let i = 0; i < p; i++) { let m = i; for (let k = i + 1; k < p; k++) if (Math.abs(M[k][i]) > Math.abs(M[m][i])) m = k; [M[i], M[m]] = [M[m], M[i]]; const d = M[i][i] || 1e-12; for (let j = i; j <= p; j++) M[i][j] /= d; for (let k = 0; k < p; k++) if (k !== i) { const f = M[k][i]; for (let j = i; j <= p; j++) M[k][j] -= f * M[i][j]; } }
  return M.map(f => f[p]);
}
/* TOTALES: con una temporada afuera, ¿el Más/Menos que señala la idea (|efecto| ≥ u) acierta más de 50%? */
function totalesFuera(F, cols, u) {
  const temps = [...new Set(F.map(f => f.s))].sort(), por = [];
  let W = 0, N = 0;
  temps.forEach(t => {
    const tr = F.filter(f => f.s !== t), te = F.filter(f => f.s === t); if (tr.length < 300 || te.length < 100) return;
    const c = mco(tr.map(f => cols.map(k => f[k])), tr.map(f => f.y)), me = c[0];
    let w = 0, n = 0;
    te.forEach(f => { const e = cols.reduce((s, k, i) => s + c[i + 1] * f[k], 0); if (Math.abs(e) < u || f.y === 0) return; n++; if (Math.sign(e) === Math.sign(f.y)) w++; });
    por.push({ t, n, pct: n ? 100 * w / n : null, mejora: n ? w / n > 0.5 : false }); W += w; N += n;
  });
  const z = N ? (W - N / 2) / Math.sqrt(N / 4) : 0, may = por.filter(p => p.mejora).length;
  return { por, n: N, pct: N ? 100 * W / N : null, z, entra: N > 0 && may > por.length / 2 && z >= 2 };
}
function tablaTot(nombre, R) {
  log('| ' + nombre + ' | ' + R.n + ' | ' + (R.pct == null ? '—' : R.pct.toFixed(1) + '%') + ' | ' + R.z.toFixed(2) + ' | ' + R.por.map(p => p.t + ': ' + (p.pct == null ? '—' : p.pct.toFixed(0) + '% (' + p.n + ')')).join(' · ') + ' | ' + (R.entra ? '**entra**' : 'no') + ' |');
}

/* ---------------- 1) MLB clima ---------------- */
function vientoMlb(w) { const m = /(\d+)\s*mph,?\s*(.*)/i.exec(w || ''); if (!m) return null; const v = +m[1], d = m[2].toLowerCase(); return { v, sig: /out to/.test(d) ? 1 : /in from/.test(d) ? -1 : 0 }; }
async function mlb() {
  const C = leer('cierres-mlb.json', null); if (!C) { log('MLB: falta cierres-mlb.json'); return; }
  const lin = new Map();
  Object.values(C.temps).forEach(t => t.juegos.forEach(g => { if (g.done && !g.skip && g.linea && g.linea.tot) { const k = new Date(g.ts - 8 * 36e5).toISOString().slice(0, 10) + '|' + g.nh; (lin.get(k) || lin.set(k, []).get(k)).push(g); } }));
  const F = [];
  for (const anio of [2023, 2024, 2025, 2026]) {
    const j = await get(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&startDate=${anio}-03-15&endDate=${anio}-11-05&hydrate=weather,venue,team`);
    if (!j) { log('MLB sin calendario ' + anio); continue; }
    let n = 0;
    (j.dates || []).forEach(d => (d.games || []).forEach(g => {
      try {
        if (!g.status || g.status.codedGameState !== 'F' || g.doubleHeader !== 'N') return;
        const ls = lin.get(d.date + '|' + g.teams.home.team.name); if (!ls || ls.length !== 1) return;
        const tl = ls[0].linea.tot, w = g.weather || {}, cond = String(w.condition || ''), vi = vientoMlb(w.wind), t = parseFloat(w.temp);
        const techo = /dome|roof closed/i.test(cond) || /dome|roof/i.test(String(w.wind || '')); if (techo || !vi || !isFinite(t)) return;
        const tot = g.teams.home.score + g.teams.away.score;
        F.push({ s: anio, y: tot - tl, out: vi.sig > 0 ? vi.v : 0, inn: vi.sig < 0 ? vi.v : 0, temp: t - 70 }); n++;
      } catch (e) { }
    }));
    log('MLB ' + anio + ': ' + n + ' juegos al aire libre con línea de cierre y clima oficial'); await sleep(400);
  }
  log('\n## 1) MLB · viento y temperatura sobre el total de cierre (' + F.length + ' juegos, 2023-2026)\n');
  const c = mco(F.map(f => [f.out, f.inn, f.temp]), F.map(f => f.y));
  log('Todo junto (carreras): viento afuera ' + c[1].toFixed(3) + ' por mph · viento adentro ' + c[2].toFixed(3) + ' por mph · temperatura ' + c[3].toFixed(3) + ' por °F sobre 70.\n');
  log('Una temporada afuera cada vez; el Más/Menos que señala cuando el efecto esperado es ≥ u carreras:\n\n| Idea | Picks | Acierta | z | Por temporada | ¿Entra? |\n|---|---|---|---|---|---|');
  const out = {};
  [0.25, 0.5].forEach(u => { out['clima_' + u] = totalesFuera(F, ['out', 'inn', 'temp'], u); tablaTot('Viento + temperatura (≥' + u + ' carreras)', out['clima_' + u]); });
  out.viento = totalesFuera(F, ['out'], 0.25); tablaTot('Solo viento hacia afuera (≥0.25)', out.viento);
  return out;
}

/* ---------------- ESPN summary (box + árbitros), con caché ---------------- */
function statDe(team, ...nombres) { const st = (team && team.statistics) || []; for (const n of nombres) { const s = st.find(x => x.name === n); if (s) return s.displayValue; } return null; }
const par = v => { const m = /(\d+)\s*-\s*(\d+)/.exec(String(v || '')); return m ? [+m[1], +m[2]] : null; };
function resumenNBA(j) {
  if (!j) return null;
  const off = ((j.gameInfo && j.gameInfo.officials) || []).map(o => o.displayName || o.fullName).filter(Boolean);
  const T = (j.boxscore && j.boxscore.teams) || [], pos = {};
  T.forEach(t => {
    const fg = par(statDe(t, 'fieldGoalsMade-fieldGoalsAttempted')), ft = par(statDe(t, 'freeThrowsMade-freeThrowsAttempted'));
    const orb = parseFloat(statDe(t, 'offensiveRebounds')), to = parseFloat(statDe(t, 'totalTurnovers', 'turnovers'));
    if (fg && ft && isFinite(orb) && isFinite(to)) pos[String(t.team && t.team.id)] = Math.round(10 * (fg[1] - orb + to + 0.44 * ft[1])) / 10;
  });
  return { o: off, p: pos };
}
function resumenNHL(j) {
  if (!j) return null;
  const off = ((j.gameInfo && j.gameInfo.officials) || []).filter(o => !o.position || !/lines/i.test((o.position.name || o.position.displayName || ''))).map(o => o.displayName || o.fullName).filter(Boolean);
  return { o: off };
}
async function resumenes(dep, ids, cache) {
  const C = cache[dep] || (cache[dep] = {}), falta = ids.filter(id => !(id in C));
  log(dep + ': ' + ids.length + ' juegos, ' + falta.length + ' resúmenes por bajar');
  let k = 0;
  await pool(falta, 8, async id => {
    const j = await get('https://site.api.espn.com/apis/site/v2/sports/' + (dep === 'nba' ? 'basketball/nba' : 'hockey/nhl') + '/summary?event=' + id, 3);
    C[id] = j ? (dep === 'nba' ? resumenNBA(j) : resumenNHL(j)) : null;
    if (++k % 1000 === 0) { console.log('  ' + dep + ' ' + k + '/' + falta.length); fs.writeFileSync('resumenes.json', JSON.stringify(cache)); }
  });
  fs.writeFileSync('resumenes.json', JSON.stringify(cache));
  return C;
}

/* ---------------- 2) NBA ritmo ---------------- */
function nbaRitmo(filas, R) {
  const G = filas.filter(f => f.tot && f.total && R[f.id] && R[f.id].p).sort((a, b) => a.ts - b.ts), hist = {}, F = [];
  let lig = [];
  G.forEach(f => {
    const ps = R[f.id].p, ids = Object.keys(ps); if (ids.length !== 2) return;
    const h = String(f.h != null ? f.h : ''), m = ids.map(id => hist[id + '|' + f.sk] || []);
    const ok = m.every(x => x.length >= 10) && lig.length >= 200;
    if (ok) {
      const pm = x => prom(x.slice(-15)), lg = prom(lig.slice(-600));
      const esp = (pm(m[0]) + pm(m[1])) / 2 - lg;   // posesiones esperadas sobre la liga
      const mod = f.V0 && isFinite(f.V0.pt) ? f.V0.pt - f.total : 0;
      F.push({ s: f.sk, y: f.tot - f.total, pace: esp, mod });
    }
    ids.forEach(id => { const k = id + '|' + f.sk; (hist[k] || (hist[k] = [])).push(ps[id]); });
    lig.push((ps[ids[0]] + ps[ids[1]]) / 2);
  });
  log('\n## 2) NBA · ritmo (posesiones esperadas sobre la liga) contra el total de cierre (' + F.length + ' juegos)\n');
  const c = mco(F.map(f => [f.pace]), F.map(f => f.y));
  log('Todo junto: ' + c[1].toFixed(3) + ' puntos de total por cada posesión de ritmo de más.\n');
  log('| Idea | Picks | Acierta | z | Por temporada | ¿Entra? |\n|---|---|---|---|---|---|');
  const out = {};
  /* el efecto ajustado es chico (la línea ya trae el ritmo): se cuentan señales desde 0.25 y 0.5 puntos */
  [0.25, 0.5].forEach(u => {
    out['ritmo_' + u] = totalesFuera(F, ['pace'], u); tablaTot('Ritmo solo (≥' + u + ' puntos)', out['ritmo_' + u]);
    out['modelo_' + u] = totalesFuera(F, ['mod'], u); tablaTot('Total del modelo OVA solo (≥' + u + ', para comparar)', out['modelo_' + u]);
    out['mixto_' + u] = totalesFuera(F, ['mod', 'pace'], u); tablaTot('Modelo OVA + ritmo (≥' + u + ')', out['mixto_' + u]);
  });
  return out;
}

/* ---------------- 3) Árbitros ---------------- */
/* juegos: [{id, s, ts, pH (cierre sin margen), gana 0/1, yT (total real − línea) o null}]; R: {id: {o: [árbitros]}}.
   Efecto de cada árbitro = promedio de sus residuos en las temporadas de ajuste, encogido n/(n+K). Cuadrilla = promedio. */
function arbitros(dep, J, R, opt) {
  opt = opt || {}; const K = opt.K || 60, THR = opt.thr || 0.03, ANTES = !!opt.soloAntes, CALLA = !!opt.calla;
  const _log = log; const log2 = CALLA ? () => { } : _log;
  const temps = [...new Set(J.map(j => j.s))].sort(), filasW = [], porT = [], totT = [];
  let llC = 0, llA = 0, aC = 0, aA = 0, N = 0, W = 0, NT = 0;
  temps.forEach(t => {
    const tr = J.filter(j => ANTES ? j.s < t : j.s !== t), te = J.filter(j => j.s === t); if (tr.length < 500 || te.length < 200) return;
    const ef = {}, et = {};
    tr.forEach(j => { const o = (R[j.id] && R[j.id].o) || []; o.forEach(a => { const e = ef[a] || (ef[a] = [0, 0]); e[0] += j.gana - j.pH; e[1]++; if (j.yT != null) { const u = et[a] || (et[a] = [0, 0]); u[0] += Math.sign(j.yT); u[1]++; } }); });
    const cuad = (j, M) => { const o = (R[j.id] && R[j.id].o) || []; const v = o.map(a => M[a] ? M[a][0] / (M[a][1] + K) : null).filter(x => x !== null); return v.length ? prom(v) : null; };
    /* el peso del efecto se ajusta con las temporadas de ajuste (logit del cierre + b·cuadrilla) */
    const xs = [], ys = []; tr.forEach(j => { const c = cuad(j, ef); if (c !== null) { xs.push([c]); ys.push(j.gana - j.pH); } });
    const b = xs.length > 300 ? mco(xs, ys)[1] : 0;
    let l0 = 0, l1 = 0, a0 = 0, a1 = 0, n = 0, wT = 0, nT = 0;
    te.forEach(j => {
      const c = cuad(j, ef); if (c === null) return;
      const p1 = Math.min(0.97, Math.max(0.03, j.pH + b * c));
      l0 -= Math.log(j.gana ? j.pH : 1 - j.pH); l1 -= Math.log(j.gana ? p1 : 1 - p1);
      if ((j.pH >= 0.5) === !!j.gana) a0++; if ((p1 >= 0.5) === !!j.gana) a1++; n++;
      const ct = cuad(j, et); if (ct !== null && j.yT != null && j.yT !== 0 && Math.abs(ct) >= THR) { nT++; if (Math.sign(ct) === Math.sign(j.yT)) wT++; }
    });
    porT.push({ t, n, mejora: l1 < l0, a0, a1 }); llC += l0; llA += l1; aC += a0; aA += a1; N += n;
    totT.push({ t, n: nT, pct: nT ? 100 * wT / nT : null, mejora: nT ? wT / nT > 0.5 : false }); W += wT; NT += nT;
  });
  log2('\n## 3' + (dep === 'nba' ? 'a' : 'b') + ') Árbitros ' + dep.toUpperCase() + ' (' + J.length + ' juegos; efecto de cada árbitro sacado SOLO de las otras temporadas)\n');
  const may = porT.filter(p => p.mejora).length, entraG = N > 0 && may > porT.length / 2 && llA < llC && aA > aC;
  log2('**Ganador:** pérdida log cierre ' + (llC / N).toFixed(4) + ' → con árbitros ' + (llA / N).toFixed(4) + ' · aciertos ' + (100 * aC / N).toFixed(1) + '% → ' + (100 * aA / N).toFixed(1) + '% · mejora en ' + may + ' de ' + porT.length + ' temporadas → ' + (entraG ? '**entra**' : 'no entra'));
  const zT = NT ? (W - NT / 2) / Math.sqrt(NT / 4) : 0, mayT = totT.filter(p => p.mejora).length, entraT = NT > 0 && mayT > totT.length / 2 && zT >= 2;
  log2('\n**Total (Más/Menos según la cuadrilla):** ' + NT + ' picks, acierta ' + (NT ? (100 * W / NT).toFixed(1) : '—') + '% (z ' + zT.toFixed(2) + ') · ' + totT.map(p => p.t + ': ' + (p.pct == null ? '—' : p.pct.toFixed(0) + '% (' + p.n + ')')).join(' · ') + ' → ' + (entraT ? '**entra**' : 'no entra'));
  return { ganador: { n: N, llC: llC / N, llA: llA / N, aC: 100 * aC / N, aA: 100 * aA / N, may, de: porT.length, entra: entraG }, total: { n: NT, pct: NT ? 100 * W / NT : null, z: zT, entra: entraT } };
}

/* ¿aguanta si se cambian los ajustes? y lo realista: el efecto de cada árbitro solo con temporadas ANTERIORES */
function sensibilidad(dep, J, R, RES) {
  log('\nSensibilidad del total de árbitros ' + dep.toUpperCase() + ' (encogimiento K, umbral de la cuadrilla, y solo temporadas anteriores):\n\n| K | Umbral | Solo antes | Picks | Acierta | z | ¿Entra? |\n|---|---|---|---|---|---|---|');
  const S = [];
  [30, 60, 120].forEach(K => [0.02, 0.03, 0.05].forEach(thr => [false, true].forEach(sa => {
    const r = arbitros(dep, J, R, { K, thr, soloAntes: sa, calla: true }).total; S.push(r);
    log('| ' + K + ' | ' + thr + ' | ' + (sa ? 'sí' : 'no') + ' | ' + r.n + ' | ' + (r.pct == null ? '—' : r.pct.toFixed(1) + '%') + ' | ' + r.z.toFixed(2) + ' | ' + (r.entra ? 'sí' : 'no') + ' |');
  })));
  RES[dep + 'ArbSens'] = { pasan: S.filter(x => x.entra).length, de: S.length };
}
module.exports = { sensibilidad, mco, totalesFuera, nbaRitmo, arbitros, resumenNBA, resumenNHL, vientoMlb };
if (require.main !== module) return;
(async () => {
  log('# Medición «haz todo para mejorar» (' + new Date().toISOString().slice(0, 10) + ')\n');
  log('Regla fijada antes de correr: una temporada afuera cada vez; entra solo si mejora en la mayoría de las temporadas y, todo junto, le gana a la línea con z ≥ 2 (ganador: menor pérdida log y más aciertos).\n');
  const RES = {};
  try { RES.mlb = await mlb(); } catch (e) { log('MLB: ERROR ' + e.message); }
  const cache = leer('resumenes.json', {});
  try {
    const filas = leer('filas_nba.json', []).filter(f => f.ty === 2 || f.ty === 3);
    /* local de cada fila: filas_nba no guarda los ids de equipo; se toman del resumen (el primer id del box = visita en ESPN) */
    const R = await resumenes('nba', filas.map(f => String(f.id)), cache);
    RES.nbaRitmo = nbaRitmo(filas.map(f => Object.assign({}, f, { id: String(f.id) })), R);
    const J = filas.filter(f => f.mlH && f.mlA && f.mar).map(f => { const p = nv(f.mlH, f.mlA); return p === null ? null : { id: String(f.id), s: f.sk, ts: f.ts, pH: p, gana: f.mar > 0 ? 1 : 0, yT: f.tot && f.total ? f.tot - f.total : null }; }).filter(Boolean);
    RES.nbaArb = arbitros('nba', J, R);
    sensibilidad('nba', J, R, RES);
  } catch (e) { log('NBA: ERROR ' + e.stack); }
  try {
    const D = leer('datos-nhl.json', { temps: {} }), J = [];
    Object.keys(D.temps).forEach(y => D.temps[y].juegos.forEach(g => { if (!g.done || g.skip || !g.linea || !g.linea.ml || g.hs === g.as) return; const p = nv(g.linea.ml[0], g.linea.ml[1]); if (p === null) return; J.push({ id: g.id, s: +y, ts: g.ts, pH: p, gana: g.hs > g.as ? 1 : 0, yT: g.linea.tot ? g.hs + g.as - g.linea.tot : null }); }));
    const R = await resumenes('nhl', J.map(j => j.id), cache);
    RES.nhlArb = arbitros('nhl', J, R);
    sensibilidad('nhl', J, R, RES);
  } catch (e) { log('NHL: ERROR ' + e.stack); }
  fs.writeFileSync('resultado_mejoras.md', L.join('\n') + '\n');
  fs.writeFileSync('resultado_mejoras.json', JSON.stringify(RES, null, 1));
})();
