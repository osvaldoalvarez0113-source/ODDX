// Backtest de FIP / xFIP del abridor, salida por salida (mismo método que backtests/backtestmarcel.html).
// Pregunta: ¿FIP (o xFIP) predice mejor las carreras limpias de la próxima salida que el ERA solo?
//
// REGLA FIJADA ANTES DE CORRER (la misma de backtestmarcel):
//   Tres temporadas (2024, 2025, 2026): se ajusta con dos y se mide en la tercera, y así con cada una.
//   Una comparación PASA si mejora el error en las tres pruebas, con peso positivo del dato nuevo en las tres,
//   y la t de las tres juntas es >= 2. Entre 1.3 y 2 = dudoso (se archiva). Menos = descartado.
//   Si pasa, entra a la app como opción APAGADA por defecto; solo sería el valor por defecto si el efecto llega a 1 punto.
//   Comparaciones PRINCIPALES (las que deciden): B vs A (FIP suma al ERA) y E1 vs E0 (FIP suma al historial de 3 años).
//   Las demás (FIP reemplaza al ERA, y las de xFIP) se reportan como información: seis comparaciones en total, así que
//   un solo "pasa" suelto se mira con cuidado.
//
// Uso: node scripts/medicion/backtest_fip.js     -> escribe resultado_fip.txt y filas_fip.json
'use strict';
const fs = require('fs');

const API = 'https://statsapi.mlb.com/api/v1';
const PRIOR_APP = 40;     // innings de liga que la app le suma a un abridor
const PAD_HIST = 60;      // innings de liga con que se acolcha el historial
const PESOS = [5, 4, 3];  // año-1, año-2, año-3
const PTS_PER_RUN = 6;    // multiplicador de OVA
const SEAS = [2024, 2025, 2026];

const OUT = [];
function P(s) { OUT.push(s); console.log(s); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function getJSON(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await globalThis.fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ova-backtest/1.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (i === 4) throw e; await sleep(500 * (i + 1)); }
  }
}
function addDays(iso, n) { return new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10); }
function ipToNum(ip) {
  if (ip == null) return 0;
  const n = parseFloat(String(ip));
  if (!isFinite(n)) return 0;
  const dec = Math.round((n - Math.trunc(n)) * 10);
  return Math.trunc(n) + (dec === 1 ? 1 / 3 : dec === 2 ? 2 / 3 : 0);
}
const num = x => (x == null || x === '' || isNaN(+x)) ? 0 : +x;

// ---------- datos ----------
async function getPitcherIds(season) {
  const a = season + '-03-15', b = season + '-09-30', ids = {};
  let s = a, k = 0;
  while (s <= b) {
    let e = addDays(s, 13); if (e > b) e = b;
    k++; console.log('Calendario ' + season + ': tramo ' + k);
    const d = await getJSON(API + '/schedule?sportId=1&gameType=R&startDate=' + s + '&endDate=' + e + '&hydrate=probablePitcher');
    (d.dates || []).forEach(day => (day.games || []).forEach(g => ['home', 'away'].forEach(l => {
      const p = g.teams && g.teams[l] && g.teams[l].probablePitcher;
      if (p && p.id) ids[p.id] = 1;
    })));
    s = addDays(e, 1);
  }
  return Object.keys(ids);
}

const FBSEEN = { con: 0, total: 0 };   // ¿trae airOuts el API? (para xFIP)
// salidas de la temporada con lo acumulado ANTES de cada una
function salidasDe(splits) {
  const sp = splits.slice().sort((x, y) => (x.date || '') < (y.date || '') ? -1 : ((x.date || '') > (y.date || '') ? 1 : 0));
  const cum = { ip: 0, er: 0, hr: 0, bb: 0, k: 0, fb: 0 }, out = [];
  sp.forEach(s => {
    const st = s.stat || {}, ip = ipToNum(st.inningsPitched), er = num(st.earnedRuns), gs = num(st.gamesStarted);
    const hr = num(st.homeRuns), bb = num(st.baseOnBalls) + num(st.hitByPitch), k = num(st.strikeOuts);
    const fb = num(st.airOuts) + hr;
    FBSEEN.total++; if (st.airOuts != null) FBSEEN.con++;
    if (gs === 1 && ip >= 1) out.push({ ci: cum.ip, ce: cum.er, ch: cum.hr, cb: cum.bb, ck: cum.k, cf: cum.fb, ip, er });
    cum.ip += ip; cum.er += er; cum.hr += hr; cum.bb += bb; cum.k += k; cum.fb += fb;
  });
  return out;
}
// historial por temporada (suma equipos si lo cambiaron)
function historialDe(splits, season) {
  const h = {};
  splits.forEach(s => {
    const yr = +s.season;
    if (!(yr >= season - 3 && yr < season)) return;
    const st = s.stat || {};
    FBSEEN.total++; if (st.airOuts != null) FBSEEN.con++;
    const o = h[yr] || (h[yr] = { ip: 0, er: 0, hr: 0, bb: 0, k: 0, fb: 0 });
    const hr = num(st.homeRuns);
    o.ip += ipToNum(st.inningsPitched); o.er += num(st.earnedRuns);
    o.hr += hr; o.bb += num(st.baseOnBalls) + num(st.hitByPitch); o.k += num(st.strikeOuts); o.fb += num(st.airOuts) + hr;
  });
  return h;
}
function pHist(h, season, L) {
  let nu = 0, de = 0, ipTot = 0;
  for (let k = 0; k < 3; k++) {
    const o = h[season - 1 - k];
    if (!o || o.ip <= 0) continue;
    nu += PESOS[k] * 9 * o.er; de += PESOS[k] * o.ip; ipTot += o.ip;
  }
  if (ipTot < 40) return null;
  return (nu + PAD_HIST * L) / (de + PAD_HIST);
}

// fila: {y, ip, ci, e, ph, f, x}
//   e  = ERA de la temporada jalado a la liga (40 IP), igual que la app
//   ph = historial de 3 años (Marcel)
//   f  = FIP crudo (13HR+3BB-2K)/IP de la temporada, jalado a la liga con los mismos 40 IP (la constante se la come el intercepto)
//   x  = xFIP crudo: igual, pero con los HR sustituidos por (HR/FB de la liga) x FB, con FB ~ airOuts + HR
function construirFilas(pitchers, season) {
  let ipL = 0, erL = 0, hrL = 0, fbL = 0, bbL = 0, kL = 0;
  pitchers.forEach(p => {
    const o = p.hist[season - 1];
    if (o) { ipL += o.ip; erL += o.er; hrL += o.hr; fbL += o.fb; bbL += o.bb; kL += o.k; }
  });
  const L = ipL > 0 ? erL * 9 / ipL : 4.2;                                  // ERA de liga del año previo
  const LF = ipL > 0 ? (13 * hrL + 3 * bbL - 2 * kL) / ipL : 0;             // FIP crudo de liga por IP
  const hrfb = fbL > 0 ? hrL / fbL : null;                                  // HR/FB de liga
  const tieneFB = hrfb != null && FBSEEN.total > 0 && FBSEEN.con / FBSEEN.total > 0.9;
  const LXok = tieneFB && ipL > 0 ? (13 * hrfb * fbL + 3 * bbL - 2 * kL) / ipL : null;  // xFIP crudo de liga por IP
  const rows = [];
  pitchers.forEach(p => {
    const ph = pHist(p.hist, season, L);
    if (ph == null) return;
    p.starts.forEach(s => {
      const e = (9 * s.ce + PRIOR_APP * L) / (s.ci + PRIOR_APP);
      const f = (13 * s.ch + 3 * s.cb - 2 * s.ck + PRIOR_APP * LF) / (s.ci + PRIOR_APP);
      const x = LXok == null ? null : (13 * hrfb * s.cf + 3 * s.cb - 2 * s.ck + PRIOR_APP * LXok) / (s.ci + PRIOR_APP);
      rows.push({ y: +(s.er * 9 / s.ip).toFixed(3), ip: +s.ip.toFixed(3), ci: +s.ci.toFixed(2), e: +e.toFixed(3), ph: +ph.toFixed(3), f: +f.toFixed(3), x: x == null ? null : +x.toFixed(3) });
    });
  });
  return { rows, L, LF, hrfb, tieneFB };
}

const HISTC = {};   // yearByYear por abridor, una sola llamada para las tres temporadas
async function bajarSeason(season, ids) {
  const out = []; let idx = 0, done = 0;
  async function worker() {
    for (;;) {
      const i = idx++;
      if (i >= ids.length) return;
      try {
        const a = await getJSON(API + '/people/' + ids[i] + '/stats?stats=gameLog&group=pitching&season=' + season + '&gameType=R');
        if (!HISTC[ids[i]]) {
          const b = await getJSON(API + '/people/' + ids[i] + '/stats?stats=yearByYear&group=pitching&gameType=R');
          HISTC[ids[i]] = (b.stats && b.stats[0] && b.stats[0].splits) || [];
        }
        const sa = (a.stats && a.stats[0] && a.stats[0].splits) || [];
        out.push({ starts: salidasDe(sa), hist: historialDe(HISTC[ids[i]], season) });
      } catch (e) { /* abridor que falla se salta */ }
      done++;
      if (done % 50 === 0) console.log('Abridores ' + season + ': ' + done + '/' + ids.length);
    }
  }
  const ws = []; for (let k = 0; k < 6; k++) ws.push(worker());
  await Promise.all(ws);
  return out;
}

// ---------- estadística (pesos = innings de la salida) ----------
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => r.concat([b[i]]));
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    const tmp = M[i]; M[i] = M[p]; M[p] = tmp;
    for (let j = i + 1; j < n; j++) {
      const f = M[j][i] / M[i][i];
      for (let k = i; k <= n; k++) M[j][k] -= f * M[i][k];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}
function fitW(X, y, w) {
  const k = X[0].length, A = [], b = [];
  for (let i = 0; i < k; i++) { A.push(new Array(k).fill(0)); b.push(0); }
  for (let r = 0; r < X.length; r++) {
    for (let i = 0; i < k; i++) {
      b[i] += w[r] * X[r][i] * y[r];
      for (let j = 0; j < k; j++) A[i][j] += w[r] * X[r][i] * X[r][j];
    }
  }
  return solve(A, b);
}
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
function tOf(d) {
  const n = d.length; let m = 0; for (let i = 0; i < n; i++) m += d[i]; m /= n;
  let v = 0; for (let i = 0; i < n; i++) v += (d[i] - m) * (d[i] - m);
  return m / (Math.sqrt(v / (n - 1)) / Math.sqrt(n));
}
const XOF = (rows, keys) => rows.map(r => [1].concat(keys.map(k => r[k])));

// ajusta con `train`, mide en `test`: modelo base (keysA) contra candidato (keysB)
function crossfit(train, test, keysA, keysB, nuevo) {
  const y = train.map(r => r.y), w = train.map(r => r.ip);
  const bA = fitW(XOF(train, keysA), y, w), bB = fitW(XOF(train, keysB), y, w);
  const xa = XOF(test, keysA), xb = XOF(test, keysB), d = [];
  let sa = 0, sb = 0, sw = 0, dif = 0;
  for (let i = 0; i < test.length; i++) {
    const wi = test[i].ip, pa = dot(bA, xa[i]), pb = dot(bB, xb[i]);
    const ea = test[i].y - pa, eb = test[i].y - pb;
    d.push(wi * (ea * ea - eb * eb)); sa += wi * ea * ea; sb += wi * eb * eb; sw += wi; dif += wi * Math.abs(pb - pa);
  }
  return { n: test.length, impr: (sa - sb) / sa, t: tOf(d), d, sa, sb, cambio: dif / sw, wNuevo: bB[1 + keysB.indexOf(nuevo)], bB, keysB };
}

const fmt = (x, d) => (x == null || isNaN(x)) ? '–' : x.toFixed(d);

function comparar(R, titulo, keysA, keysB, nuevo, principal) {
  const rowsOk = s => R[s].filter(r => keysB.concat(keysA).every(k => r[k] != null));
  const res = [];
  P('');
  P('=== ' + titulo + (principal ? '  [PRINCIPAL]' : '  [informativa]') + ' ===');
  P('Base: y ~ ' + keysA.join(' + ') + '   |   Candidato: y ~ ' + keysB.join(' + '));
  SEAS.forEach(test => {
    let train = []; SEAS.forEach(o => { if (o !== test) train = train.concat(rowsOk(o)); });
    const c = crossfit(train, rowsOk(test), keysA, keysB, nuevo); c.test = test; res.push(c);
    P('  ajustar con las otras dos -> medir ' + test + ' (' + c.n + ' salidas): mejora ' + fmt(c.impr * 100, 2) + '%  t ' + fmt(c.t, 2) + '  peso de ' + nuevo + ' ' + fmt(c.wNuevo, 3));
  });
  let dAll = [], saT = 0, sbT = 0;
  res.forEach(c => { dAll = dAll.concat(c.d); saT += c.sa; sbT += c.sb; });
  const tPool = tOf(dAll), imprPool = (saT - sbT) / saT;
  const allPos = res.every(c => c.impr > 0 && c.wNuevo > 0);
  const nFuertes = res.filter(c => c.t >= 2).length;
  let all = []; SEAS.forEach(s => { all = all.concat(rowsOk(s)); });
  let ipm = 0; all.forEach(r => { ipm += r.ip; }); ipm /= all.length;
  let cambio = 0; res.forEach(c => { cambio += c.cambio; }); cambio /= res.length;
  const porSalida = cambio * ipm / 9, pts = porSalida * PTS_PER_RUN;
  P('  Las tres juntas: mejora ' + fmt(imprPool * 100, 2) + '%  t ' + fmt(tPool, 2) + '  | pruebas con t>=2: ' + nFuertes + ' de 3  | mejoran las tres con peso positivo: ' + (allPos ? 'sí' : 'no'));
  const strong = allPos && tPool >= 2, mid = allPos && tPool >= 1.3 && !strong;
  const veredicto = strong ? 'PASA' : (mid ? 'DUDOSO (se archiva)' : 'DESCARTADO');
  P('  Tamaño: cambia el pronóstico de un abridor ~' + fmt(porSalida, 2) + ' carreras por salida = ~' + fmt(pts, 1) + ' puntos de probabilidad en la escala de OVA.');
  P('  VEREDICTO: ' + veredicto + (strong ? (pts >= 1 ? ' -> efecto >= 1 punto: podría ir por defecto' : ' -> opción APAGADA por defecto (efecto < 1 punto)') : ''));
  const yF = all.map(r => r.y), wF = all.map(r => r.ip);
  const bF = fitW(XOF(all, keysB), yF, wF);
  P('  Coeficientes finales (tres temporadas juntas): a=' + bF[0].toFixed(4) + keysB.map((k, i) => ' b_' + k + '=' + bF[i + 1].toFixed(4)).join(''));
  return { titulo, principal, veredicto, impr: imprPool, t: tPool, pts, allPos, nFuertes, coef: bF, keys: keysB };
}

async function main() {
  const R = {}, meta = {};
  for (const season of SEAS) {
    const ids = await getPitcherIds(season);
    console.log('Abridores ' + season + ': ' + ids.length + ', bajando salidas...');
    const pit = await bajarSeason(season, ids);
    const f = construirFilas(pit, season);
    if (f.rows.length < 500) throw new Error('muy pocas salidas utilizables en ' + season + ' (' + f.rows.length + ')');
    R[season] = f.rows; meta[season] = { L: f.L, LF: f.LF, hrfb: f.hrfb, tieneFB: f.tieneFB };
    console.log('Listo ' + season + ': ' + f.rows.length + ' salidas');
  }
  P('BACKTEST FIP / xFIP DEL ABRIDOR');
  SEAS.forEach(s => P(s + ': ' + R[s].length + ' salidas | ERA liga año previo ' + fmt(meta[s].L, 2) + ' | HR/FB liga ' + fmt(meta[s].hrfb, 3) + (meta[s].tieneFB ? '' : ' (sin airOuts: xFIP no se mide)')));
  const hayX = SEAS.every(s => meta[s].tieneFB);
  const res = [];
  res.push(comparar(R, 'B vs A: FIP suma al ERA de la temporada', ['e'], ['e', 'f'], 'f', true));
  res.push(comparar(R, 'E1 vs E0: FIP suma al historial de 3 años (lo que ya tiene la app apagado)', ['e', 'ph'], ['e', 'ph', 'f'], 'f', true));
  res.push(comparar(R, 'C vs A: FIP reemplaza al ERA', ['e'], ['f'], 'f', false));
  if (hayX) {
    res.push(comparar(R, 'BX vs A: xFIP suma al ERA de la temporada', ['e'], ['e', 'x'], 'x', false));
    res.push(comparar(R, 'EX1 vs E0: xFIP suma al historial de 3 años', ['e', 'ph'], ['e', 'ph', 'x'], 'x', false));
    res.push(comparar(R, 'CX vs A: xFIP reemplaza al ERA', ['e'], ['x'], 'x', false));
  } else P('\n(xFIP no se mide: el API no trajo airOuts en las tres temporadas)');
  P('');
  P('RESUMEN');
  res.forEach(r => P('  ' + (r.principal ? '[P] ' : '    ') + r.titulo + ' -> ' + r.veredicto + ' (mejora ' + fmt(r.impr * 100, 2) + '%, t ' + fmt(r.t, 2) + ', ~' + fmt(r.pts, 1) + ' pts)'));
  const pasan = res.filter(r => r.principal && r.veredicto === 'PASA');
  P(pasan.length ? '\nCONCLUSION: pasa una comparación principal -> FIP entra como opción apagada.' : '\nCONCLUSION: ninguna comparación principal pasa -> FIP no aporta sobre lo que ya hay; se archiva.');
  fs.writeFileSync('resultado_fip.txt', OUT.join('\n'));
  fs.writeFileSync('filas_fip.json', JSON.stringify({ meta, filas: R }));
}

module.exports = { main, crossfit, comparar, construirFilas, salidasDe, historialDe, pHist, fitW, tOf, XOF, SEAS };
if (require.main === module) main().catch(e => { console.error(e); try { fs.writeFileSync('resultado_fip.txt', OUT.join('\n') + '\nFALLO: ' + e.message); } catch (_) {} process.exit(1); });
