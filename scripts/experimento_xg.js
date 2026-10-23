'use strict';
// OVA: fútbol — ¿cierra la brecha con el mercado si el modelo usa un xG aproximado (tiros) en vez de goles?
// (D) mezcla con la cuota del mercado, (F) días de descanso? Todo "camina hacia adelante": cada partido se predice
// solo con lo que había antes. Se mide contra el cierre de Pinnacle (football-data.co.uk). Solo mide, no toca la app.
// Uso: node scripts/experimento_futbol.js        (DATA_DIR=carpeta usa CSV locales en vez de bajarlos)
const fs = require('fs');
const LIGAS = [['E0', 'Premier League'], ['SP1', 'La Liga'], ['I1', 'Serie A'], ['D1', 'Bundesliga'], ['F1', 'Ligue 1']];
const TEMPS = (process.env.TEMPS_FUTBOL || '2122,2223,2324,2425,2526').split(',');
const TEST = ['2324', '2425', '2526'];          // temporadas donde se mide
const TUNE = ['2122', '2223'];                  // temporadas donde se ajustan los parámetros nuevos (sin mirar las de prueba)
const urlCsv = (t, code) => 'https://www.football-data.co.uk/mmz4281/' + t + '/' + code + '.csv';
const MAXG = 8;
/* ================= datos ================= */
function csvFilas(txt) {
  txt = txt.replace(/^﻿/, '');
  const lines = txt.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const split = l => { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
  const cab = split(lines[0]).map(s => s.trim()), out = [];
  for (let i = 1; i < lines.length; i++) { const v = split(lines[i]); if (v.length < 5) continue; const r = {}; cab.forEach((c, k) => { if (c) r[c] = (v[k] || '').trim(); }); out.push(r); }
  return out;
}
function fechaCsv(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (!m) return null;
  let y = +m[3]; if (y < 100) y += y > 70 ? 1900 : 2000; return Date.UTC(y, +m[2] - 1, +m[1]);
}
const nm = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const trio = (r, a, b, c) => { const x = nm(r[a]), y = nm(r[b]), z = nm(r[c]); return (x > 1 && y > 1 && z > 1) ? [x, y, z] : null; };
const par = (r, a, b) => { const x = nm(r[a]), y = nm(r[b]); return (x > 1 && y > 1) ? [x, y] : null; };
const FUENTES_1X2 = [['PSC', 'Pinnacle cierre'], ['AvgC', 'Promedio cierre'], ['B365C', 'Bet365 cierre'], ['PS', 'Pinnacle previo'], ['Avg', 'Promedio previo'], ['B365', 'Bet365 previo']];
const FUENTES_OU = [['PC>2.5', 'PC<2.5', 'Pinnacle cierre'], ['AvgC>2.5', 'AvgC<2.5', 'Promedio cierre'], ['B365C>2.5', 'B365C<2.5', 'Bet365 cierre'], ['P>2.5', 'P<2.5', 'Pinnacle previo'], ['Avg>2.5', 'Avg<2.5', 'Promedio previo'], ['B365>2.5', 'B365<2.5', 'Bet365 previo']];
function devig(o) { const inv = o.map(x => 1 / x), s = inv.reduce((a, b) => a + b, 0); return inv.map(x => x / s); }
function leerPartidos(filas, t, lg) {
  const out = [];
  filas.forEach(r => {
    const d = fechaCsv(r.Date), gh = nm(r.FTHG), ga = nm(r.FTAG), h = r.HomeTeam, a = r.AwayTeam;
    if (d === null || gh === null || ga === null || !h || !a) return;
    const m = { t, lg, d, day: Math.floor(d / 864e5), h, a, gh, ga, y: gh > ga ? 0 : (gh === ga ? 1 : 2) };
    { const hs = nm(r.HS), as = nm(r.AS), hst = nm(r.HST), ast = nm(r.AST), hc = nm(r.HC), ac = nm(r.AC); if (hs !== null && as !== null && hst !== null && ast !== null && hs >= hst && as >= ast) m.tiros = { h: { sh: hs, sot: hst, co: hc === null ? 0 : hc }, a: { sh: as, sot: ast, co: ac === null ? 0 : ac } }; }
    for (const [p, nombre] of FUENTES_1X2) { const o = trio(r, p + 'H', p + 'D', p + 'A'); if (o) { m.mk = devig(o); m.mkSrc = nombre; m.mkO = o; break; } }
    for (const [p1, p2, nombre] of FUENTES_OU) { const o = par(r, p1, p2); if (o) { m.ou = devig(o)[0]; m.ouSrc = nombre; m.ouO = o; break; } }
    m.ps = trio(r, 'PSCH', 'PSCD', 'PSCA') || trio(r, 'PSH', 'PSD', 'PSA');
    m.avg = trio(r, 'AvgCH', 'AvgCD', 'AvgCA') || trio(r, 'AvgH', 'AvgD', 'AvgA') || trio(r, 'B365CH', 'B365CD', 'B365CA');
    m.mx = trio(r, 'MaxCH', 'MaxCD', 'MaxCA') || trio(r, 'MaxH', 'MaxD', 'MaxA');
    m.ouPs = par(r, 'PC>2.5', 'PC<2.5') || par(r, 'P>2.5', 'P<2.5');
    m.ouAvg = par(r, 'AvgC>2.5', 'AvgC<2.5') || par(r, 'Avg>2.5', 'Avg<2.5') || par(r, 'B365C>2.5', 'B365C<2.5');
    out.push(m);
  });
  return out.sort((a, b) => a.d - b.d);
}

/* ================= distribucion de goles (igual que el app) ================= */
const PM = {};
function pmf(l) { const key = Math.round(l * 1000); if (PM[key]) return PM[key]; const a = [Math.exp(-l)]; for (let k = 1; k <= MAXG; k++) a.push(a[k - 1] * l / k); return (PM[key] = a); }
function tauDC(i, j, lL, lV, rho) { if (i === 0 && j === 0) return 1 - lL * lV * rho; if (i === 0 && j === 1) return 1 + lL * rho; if (i === 1 && j === 0) return 1 + lV * rho; if (i === 1 && j === 1) return 1 - rho; return 1; }
function dist(lL, lV, rho) {
  const pl = pmf(lL), pv = pmf(lV); let pH = 0, pD = 0, pA = 0, o25 = 0, bt = 0, s = 0;
  for (let i = 0; i <= MAXG; i++) for (let j = 0; j <= MAXG; j++) {
    let p = pl[i] * pv[j]; if (rho) { p *= tauDC(i, j, lL, lV, rho); if (p < 0) p = 0; }
    s += p; if (i > j) pH += p; else if (i === j) pD += p; else pA += p; if (i + j > 2.5) o25 += p; if (i >= 1 && j >= 1) bt += p;
  }
  return { p: [pH / s, pD / s, pA / s], o25: o25 / s, bt: bt / s };
}
function mezcla(a, b, w) { return w * a + (1 - w) * b; }

/* ================= Dixon-Coles de producción (futbol.html: xi 1.6, Kp 5, rho -0.06, promo 1) ================= */
const CFG = { xi: 1.6, Kp: 5, rho: -0.06, promo: 1, win: 1100, wt: 0.5 };
function porFecha(ms) { const g = []; let cur = null; ms.forEach(m => { if (!cur || cur.day !== m.day) { cur = { day: m.day, ms: [] }; g.push(cur); } cur.ms.push(m); }); return g; }
function dcAjuste(tr, dayNow, cfg) {
  const idx = {}, names = []; tr.forEach(m => { [m.h, m.a].forEach(n => { if (idx[n] === undefined) { idx[n] = names.length; names.push(n); } }); });
  const n = names.length, att = new Float64Array(n).fill(1), def = new Float64Array(n).fill(1), cnt = new Float64Array(n);
  const H = new Int32Array(tr.length), A = new Int32Array(tr.length), W = new Float64Array(tr.length);
  tr.forEach((m, i) => { H[i] = idx[m.h]; A[i] = idx[m.a]; W[i] = Math.exp(-cfg.xi * (dayNow - m.day) / 365); cnt[H[i]] += 1; cnt[A[i]] += 1; });
  const a0 = new Float64Array(n).fill(1), d0 = new Float64Array(n).fill(1);
  if (cfg.promo) for (let i = 0; i < n; i++) if (cnt[i] < 8) { a0[i] = 0.85; d0[i] = 1.15; }
  let c = 1.35, gam = 1.25;
  for (let it = 0; it < 28; it++) {
    const nA = new Float64Array(n), dA = new Float64Array(n), nD = new Float64Array(n), dD = new Float64Array(n); let sgh = 0, sg = 0;
    for (let i = 0; i < tr.length; i++) {
      const m = tr[i], w = W[i], h = H[i], a = A[i];
      nA[h] += w * m.gh; dA[h] += w * c * def[a] * gam; nA[a] += w * m.ga; dA[a] += w * c * def[h];
      nD[a] += w * m.gh; dD[a] += w * c * att[h] * gam; nD[h] += w * m.ga; dD[h] += w * c * att[a];
      sgh += w * m.gh; sg += w * (m.gh + m.ga);
    }
    for (let i = 0; i < n; i++) { att[i] = (nA[i] + cfg.Kp * c * a0[i]) / (dA[i] + cfg.Kp * c); def[i] = (nD[i] + cfg.Kp * c * d0[i]) / (dD[i] + cfg.Kp * c); }
    let ma = 0, md = 0; for (let i = 0; i < n; i++) { ma += att[i]; md += def[i]; } ma /= n; md /= n; for (let i = 0; i < n; i++) { att[i] /= ma; def[i] /= md; }
    let e2 = 0; for (let i = 0; i < tr.length; i++) e2 += W[i] * att[H[i]] * def[A[i]];
    gam = sgh / Math.max(c * e2, 1e-9);
    let eg2 = 0; for (let i = 0; i < tr.length; i++) eg2 += W[i] * (att[H[i]] * def[A[i]] * gam + att[A[i]] * def[H[i]]);
    c = sg / Math.max(eg2, 1e-9);
  }
  let sw = 0, sh = 0, sa = 0; for (let i = 0; i < tr.length; i++) { sw += W[i]; sh += W[i] * tr[i].gh; sa += W[i] * tr[i].ga; }
  return { idx, att, def, c, gam, hAvg: sh / sw, aAvg: sa / sw, tr, H, A, W, n };
}
/* multiplicadores por equipo y por lugar: goles reales entre goles que esperaba el modelo, encogidos hacia 1 con K partidos de creencia */
function splitLocal(f, K) {
  const n = f.n, oHA = new Float64Array(n), eHA = new Float64Array(n), oHD = new Float64Array(n), eHD = new Float64Array(n),
    oAA = new Float64Array(n), eAA = new Float64Array(n), oAD = new Float64Array(n), eAD = new Float64Array(n);
  for (let i = 0; i < f.tr.length; i++) {
    const m = f.tr[i], w = f.W[i], h = f.H[i], a = f.A[i];
    const eh = f.c * f.att[h] * f.def[a] * f.gam, ea = f.c * f.att[a] * f.def[h];
    oHA[h] += w * m.gh; eHA[h] += w * eh; oHD[h] += w * m.ga; eHD[h] += w * ea;
    oAA[a] += w * m.ga; eAA[a] += w * ea; oAD[a] += w * m.gh; eAD[a] += w * eh;
  }
  const mu = 1.3, r = (o, e, i) => (o[i] + K * mu) / (e[i] + K * mu);
  return i => ({ ha: r(oHA, eHA, i), hd: r(oHD, eHD, i), aa: r(oAA, eAA, i), ad: r(oAD, eAD, i) });
}
/* corre el DC día por día y devuelve, por partido, las lambdas base y las de cada variante de local/visita */
const KS = [8, 16, 32, 64];
function correrDC(ms, cb) {
  let lo = 0;
  porFecha(ms).forEach(grp => {
    const dayNow = grp.day; while (lo < ms.length && ms[lo].day < dayNow - CFG.win) lo++;
    let hi = lo; while (hi < ms.length && ms[hi].day < dayNow) hi++;
    const tr = ms.slice(lo, hi); if (tr.length < 60) return;
    const f = dcAjuste(tr, dayNow, CFG);
    const sp = KS.map(K => splitLocal(f, K));
    const g0 = dist(f.hAvg, f.aAvg, CFG.rho);
    grp.ms.forEach(m => {
      const ih = f.idx[m.h], ia = f.idx[m.a];
      const get = i => i === undefined ? { a: 0.85, d: 1.15 } : { a: f.att[i], d: f.def[i] };
      const x = get(ih), y = get(ia), lL = f.c * x.a * y.d * f.gam, lV = f.c * y.a * x.d;
      const split = KS.map((K, k) => (ih === undefined || ia === undefined) ? [lL, lV] : (() => { const h = sp[k](ih), a = sp[k](ia); return [lL * h.ha * a.ad, lV * a.aa * h.hd]; })());
      cb(m, { lL, lV, split, g0 });
    });
  });
}
function predDe(lL, lV, g0) {
  const d = dist(lL, lV, CFG.rho);
  return { p: d.p, o25: mezcla(d.o25, g0.o25, CFG.wt) };
}

/* ================= Elo (con diferencia de goles) y su conversión a 1X2 ================= */
function corrieElo(ms, cb) {
  const R = {}, K = 20, HA = 60; let season = null;
  porFecha(ms).forEach(grp => {
    const first = grp.ms[0];
    if (first.t !== season) { season = first.t; Object.keys(R).forEach(k => { R[k] = 1500 + 0.75 * (R[k] - 1500); }); }
    grp.ms.forEach(m => { const rh = R[m.h] === undefined ? 1450 : R[m.h], ra = R[m.a] === undefined ? 1450 : R[m.a]; cb(m, rh - ra); });
    grp.ms.forEach(m => {
      const rh = R[m.h] === undefined ? 1450 : R[m.h], ra = R[m.a] === undefined ? 1450 : R[m.a];
      const e = 1 / (1 + Math.pow(10, -(rh - ra + HA) / 400)), s = m.gh > m.ga ? 1 : (m.gh === m.ga ? 0.5 : 0);
      const gd = Math.abs(m.gh - m.ga), mult = gd <= 1 ? 1 : (gd === 2 ? 1.5 : (11 + gd) / 8), dlt = K * mult * (s - e);
      R[m.h] = rh + dlt; R[m.a] = ra - dlt;
    });
  });
}
const sig = z => 1 / (1 + Math.exp(-z));
function eloProbs(d, th) { const z = (d + th.ha) / th.s; const pH = sig(z - th.c), pA = sig(-z - th.c); return [pH, Math.max(1 - pH - pA, 1e-4), pA]; }

/* ================= medidas ================= */
const llp = (p, y) => -Math.log(Math.max(p[y], 1e-9));
const rps = (p, y) => { const c1 = p[0] - (y === 0 ? 1 : 0), c2 = p[0] + p[1] - (y <= 1 ? 1 : 0); return (c1 * c1 + c2 * c2) / 2; };
const llb = (p, y) => -Math.log(Math.max(y ? p : 1 - p, 1e-9));
function pool(pm, pk, w) { const q = [Math.pow(pm[0], w) * Math.pow(pk[0], 1 - w), Math.pow(pm[1], w) * Math.pow(pk[1], 1 - w), Math.pow(pm[2], w) * Math.pow(pk[2], 1 - w)], s = q[0] + q[1] + q[2]; return [q[0] / s, q[1] / s, q[2] / s]; }
function stats(v) { const n = v.length; if (!n) return { n: 0, m: 0, se: 0, z: 0 }; const m = v.reduce((a, b) => a + b, 0) / n; let q = 0; v.forEach(x => q += (x - m) * (x - m)); const se = n > 1 ? Math.sqrt(q / (n - 1) / n) : 0; return { n, m, se, z: se > 0 ? m / se : 0 }; }

async function bajar(t, code) {
  if (process.env.DATA_DIR) { const f = process.env.DATA_DIR + '/' + t + '_' + code + '.csv'; return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; }
  for (let i = 0; i < 3; i++) { try { const r = await fetch(urlCsv(t, code)); if (r.ok) return await r.text(); } catch (e) { /* reintenta */ } await new Promise(r => setTimeout(r, 1500)); }
  return '';
}


/* ================= xG aproximado con los tiros que trae football-data (HS, AS, HST, AST) ================= */
const XG_VARIANTES = [];
async function main() {
  const out = []; const P = s => { out.push(s); console.log(s); };
  let todos = [];
  const porLiga = {};
  for (const [code, nombre] of LIGAS) {
    let L = [];
    for (const t of TEMPS) { const filas = csvFilas(await bajar(t, code)); L = L.concat(leerPartidos(filas, t, code)); }
    L.sort((a, b) => a.d - b.d); porLiga[code] = L; todos = todos.concat(L); P(nombre + ': ' + L.length + ' partidos');
  }
  if (todos.length < 1000) { P('SIN DATOS'); fs.writeFileSync('resultado_xg.txt', out.join('\n')); process.exit(1); }
  const conTiros = todos.filter(m => m.tiros);
  P('Partidos con tiros (HS, AS, HST, AST): ' + conTiros.length + ' de ' + todos.length);

  // 1) convertir tiros en goles esperados: goles = a·(tiros a puerta) + b·(tiros fuera) [+ c·corners], ajustado SOLO con las temporadas de ajuste
  const ajuste = conTiros.filter(m => TUNE.includes(m.t));
  const fila = (s, conCorners) => { const f = [s.sot, Math.max(s.sh - s.sot, 0)]; if (conCorners) f.push(s.co); return f; };
  function ols(X, y) {            // sin intercepto
    const k = X[0].length, A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
    X.forEach((x, r) => { for (let i = 0; i < k; i++) { b[i] += x[i] * y[r]; for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; } });
    for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = c + 1; r < k; r++) { const f = A[r][c] / A[c][c]; for (let j = c; j < k; j++) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; } }
    const x = new Array(k).fill(0); for (let i = k - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < k; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x;
  }
  const X1 = [], X2 = [], Y = [];
  ajuste.forEach(m => { [[m.tiros.h, m.gh], [m.tiros.a, m.ga]].forEach(([s, g]) => { X1.push(fila(s, false)); X2.push(fila(s, true)); Y.push(g); }); });
  const c1 = ols(X1, Y), c2 = ols(X2, Y);
  P('\nConversión tiros → goles esperados (ajustada con ' + TUNE.join('+') + ', ' + Y.length + ' equipos-partido):');
  P('  goles ≈ ' + c1[0].toFixed(3) + '·(tiros a puerta) + ' + c1[1].toFixed(3) + '·(tiros fuera)');
  P('  goles ≈ ' + c2[0].toFixed(3) + '·(tiros a puerta) + ' + c2[1].toFixed(3) + '·(tiros fuera) + ' + c2[2].toFixed(3) + '·(corners)');
  // qué tanto explica el xG aproximado los goles vs. los propios goles pasados: correlación del xG de un partido con los goles del MISMO equipo en el siguiente
  const xgDe = (s, c, conCorners) => { const f = fila(s, conCorners); let v = 0; for (let i = 0; i < f.length; i++) v += c[i] * f[i]; return Math.max(v, 0.05); };

  // 2) construir copias de los partidos con "goles" sustituidos por la entrada nueva; el resultado real (y) no cambia
  const variantes = {
    'A. Goles reales (modelo actual)': m => [m.gh, m.ga],
    'B. xG aprox. (tiros a puerta + fuera)': m => m.tiros ? [xgDe(m.tiros.h, c1, false), xgDe(m.tiros.a, c1, false)] : [m.gh, m.ga],
    'B2. xG aprox. (+ corners)': m => m.tiros ? [xgDe(m.tiros.h, c2, true), xgDe(m.tiros.a, c2, true)] : [m.gh, m.ga],
    'C. Mitad goles, mitad xG aprox.': m => m.tiros ? [0.5 * m.gh + 0.5 * xgDe(m.tiros.h, c1, false), 0.5 * m.ga + 0.5 * xgDe(m.tiros.a, c1, false)] : [m.gh, m.ga],
    'C2. 25% goles, 75% xG aprox.': m => m.tiros ? [0.25 * m.gh + 0.75 * xgDe(m.tiros.h, c1, false), 0.25 * m.ga + 0.75 * xgDe(m.tiros.a, c1, false)] : [m.gh, m.ga],
  };
  const XIS = [0.8, 1.2, 1.6];
  const pred = {};       // nombre|xi -> Map(partido original -> {lL, lV, g0})
  const nombres = Object.keys(variantes);
  nombres.forEach(nom => XIS.forEach(xi => {
    const mapa = new Map();
    Object.keys(porLiga).forEach(code => {
      const orig = porLiga[code], clon = orig.map(m => { const [x, y] = variantes[nom](m); return Object.assign({}, m, { gh: x, ga: y, _o: m }); });
      const cfg0 = CFG; const cfg = Object.assign({}, CFG, { xi }); const guarda = Object.assign({}, CFG); Object.assign(CFG, cfg);
      correrDC(clon, (m, x) => mapa.set(m._o, x));
      Object.assign(CFG, guarda);
    });
    pred[nom + '|' + xi] = mapa; console.log('hecho ' + nom + ' xi=' + xi);
  }));

  // 3) medir
  const test = todos.filter(m => TEST.includes(m.t) && m.mk), tune23 = todos.filter(m => m.t === '2223');
  const lossDe = (nom, xi, set) => { const mp = pred[nom + '|' + xi]; const v = []; set.forEach(m => { const o = mp.get(m); if (o) v.push(llp(dist(o.lL, o.lV, CFG.rho).p, m.y)); }); return stats(v).m; };
  const mkL = stats(test.map(m => llp(m.mk, m.y))).m;
  const base = lossDe(nombres[0], 1.6, test);
  P('\n=== 1X2 · ' + test.length + ' partidos de prueba (' + TEST.join(', ') + ') · log loss, menos es mejor ===');
  P('Mercado (Pinnacle cierre): ' + mkL.toFixed(4) + ' · Modelo actual (goles, xi 1.6): ' + base.toFixed(4) + ' · brecha total: ' + ((base - mkL) * 1000).toFixed(1) + ' milésimas');
  P('xi = qué tan rápido pierde peso el partido viejo (el actual usa 1.6). "Elegida" = la xi con mejor pérdida en 2022-23, sin mirar la prueba.\n');
  const resumen = {};
  nombres.forEach(nom => {
    let elegida = XIS[0], bt = Infinity; XIS.forEach(xi => { const l = lossDe(nom, xi, tune23); if (l < bt) { bt = l; elegida = xi; } });
    XIS.forEach(xi => {
      const mp = pred[nom + '|' + xi], mpB = pred[nombres[0] + '|1.6'], d = [], dm = [], bySeason = {};
      test.forEach(m => { const o = mp.get(m), ob = mpB.get(m); if (!o || !ob) return; const a = llp(dist(o.lL, o.lV, CFG.rho).p, m.y), b = llp(dist(ob.lL, ob.lV, CFG.rho).p, m.y); d.push(a - b); dm.push(a - llp(m.mk, m.y)); (bySeason[m.t] = bySeason[m.t] || []).push(a - b); });
      const s = stats(d), cierra = -s.m / (base - mkL) * 100;
      P(nom.padEnd(40) + ' xi ' + xi + (xi === elegida ? ' (elegida)' : '          ') + ' pérdida ' + (base + s.m).toFixed(4) + ' · vs actual ' + (s.m * 1000).toFixed(2) + ' (z ' + s.z.toFixed(1) + ') · cierra ' + cierra.toFixed(1) + '% de la brecha · por temporada ' + Object.entries(bySeason).map(([t, v]) => t + ':' + (stats(v).m * 1000).toFixed(1)).join(' '));
      resumen[nom + '|' + xi] = { l: base + s.m, dBase: s.m, z: s.z, cierra, elegida: xi === elegida };
    });
  });

  // 4) ¿le suma algo al mercado la mejor variante? (mezcla geométrica modelo + mercado)
  let mejor = null; Object.keys(resumen).forEach(k => { if (resumen[k].elegida && (!mejor || resumen[k].l < resumen[mejor].l)) mejor = k; });
  P('\nMejor variante (entre las elegidas): ' + mejor + ' · pérdida ' + resumen[mejor].l.toFixed(4));
  P('=== Mezcla de esa variante con la cuota del mercado: ¿le gana al mercado solo? (negativo = sí, en milésimas) ===');
  const mpM = pred[mejor];
  [1, 0.7, 0.5, 0.3, 0.2, 0.1, 0.05].forEach(w => {
    const d = []; test.forEach(m => { const o = mpM.get(m); if (!o) return; d.push(llp(pool(dist(o.lL, o.lV, CFG.rho).p, m.mk, w), m.y) - llp(m.mk, m.y)); });
    const s = stats(d); P('peso del modelo ' + Math.round(w * 100) + '%: diferencia con el mercado ' + (s.m * 1000).toFixed(2) + ' (z ' + s.z.toFixed(1) + ')');
  });
  const mpA = pred[nombres[0] + '|1.6'];
  P('--- referencia: lo mismo con el modelo actual (goles) ---');
  [0.3, 0.1, 0.05].forEach(w => {
    const d = []; test.forEach(m => { const o = mpA.get(m); if (!o) return; d.push(llp(pool(dist(o.lL, o.lV, CFG.rho).p, m.mk, w), m.y) - llp(m.mk, m.y)); });
    const s = stats(d); P('peso del modelo ' + Math.round(w * 100) + '%: diferencia con el mercado ' + (s.m * 1000).toFixed(2) + ' (z ' + s.z.toFixed(1) + ')');
  });
  P('\nHecho. Nada de esto cambia la app: solo mide.');
  fs.writeFileSync('resultado_xg.txt', out.join('\n') + '\n');
  fs.writeFileSync('resultado_xg.json', JSON.stringify({ n: test.length, mkL, base, resumen, coef1: c1, coef2: c2 }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
