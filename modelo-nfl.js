/* ===================================================================
   OVA · MODELO NFL (sin DOM; lo usan nfl.html, el backtest de GitHub y las pruebas)
   Rating de margen en PUNTOS (estilo Elo de margen de victoria), igual de simple que el de la NBA:
     margen esperado (local) = rating local - rating visita + ventaja de local (0 si es cancha neutral)
                               + ajuste de descanso (semana corta: pierde; semana libre "bye": gana)
     total esperado = promedio corrido de la liga + tendencia de total de cada equipo
   Al empezar cada temporada los ratings se encogen hacia 0 (carry): la NFL cambia mucho de un ano al otro.
   Numeros clave: en la NFL los marcadores se agrupan en 3 y 7 puntos; la curva normal subestima los margenes
   exactos de 3, 7, 6, 10 y 14. Los "pesos clave" se miden del propio historial y corrigen la probabilidad de cubrir.
   =================================================================== */
(function (root) {
  'use strict';
  const PDEF = { kM: 0.09, kT: 0.04, carry: 0.7, H: 1.8, Rs: 1.0, Bb: 0.8, Z: 1 };
  // Rs = puntos que pierde un equipo en semana corta (juega con 5 dias o menos de descanso)
  // Bb = puntos que gana un equipo que viene de semana libre (11 dias o mas)
  // Z  = cuanto se le cree a la diferencia de ratings (1 = todo); se mide como pendiente en el backtest
  const SIG_M = 13.3, SIG_T = 13.6, LG0 = 44.5;

  function seasonOf(ts) { const d = new Date(ts - 10 * 3600e3); const m = d.getUTCMonth(), y = d.getUTCFullYear(); return m >= 6 ? y : y - 1; }
  function dayKey(ts) { return Math.floor((ts - 10 * 3600e3) / 864e5); }
  function Phi(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return 0.5 * (1 + s * (1 - poly * Math.exp(-x * x)));
  }
  const pdf = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) * ((x - mu) / s)) / (s * Math.sqrt(2 * Math.PI));
  function sigmas(S) { return { sM: S.nn > 100 ? Math.sqrt(S.sseM / S.nn) : SIG_M, sT: S.nn > 100 ? Math.sqrt(S.sseT / S.nn) : SIG_T }; }
  function nuevoEstado() { return { m: {}, t: {}, last: {}, cnt: {}, lg: LG0, season: null, sseM: 0, sseT: 0, nn: 0, n: 0 }; }
  // ajuste de descanso en puntos para un equipo segun los dias desde su ultimo juego (gap)
  function descanso(gap, P) {
    if (gap === null || gap === undefined || gap > 40 || gap < 1) return 0;
    if (gap <= 5) return -P.Rs;
    if (gap >= 11) return P.Bb;
    return 0;
  }
  function paso(S, g, P, cb) {
    const sk = seasonOf(g.ts);
    if (S.season !== null && sk !== S.season) {
      for (const k in S.m) S.m[k] *= P.carry;
      for (const k in S.t) S.t[k] *= P.carry;
      S.cnt = {};
    }
    S.season = sk;
    const dk = dayKey(g.ts);
    const mh = S.m[g.h] || 0, ma = S.m[g.a] || 0, th = S.t[g.h] || 0, ta = S.t[g.a] || 0;
    const gH = S.last[g.h] !== undefined ? dk - S.last[g.h] : null, gA = S.last[g.a] !== undefined ? dk - S.last[g.a] : null;
    const ha = g.neutral ? 0 : P.H;
    const rd = descanso(gH, P) - descanso(gA, P);
    const pm = mh - ma + ha + rd;
    const pt = S.lg + th + ta;
    const mar = g.hs - g.as, tot = g.hs + g.as;
    if (cb) cb(g, { pm: pm, pt: pt, mar: mar, tot: tot, cH: S.cnt[g.h] || 0, cA: S.cnt[g.a] || 0, S: S, lg: S.lg, rd: mh - ma, b0: pm - (mh - ma), gH: gH, gA: gA });
    const e = Math.max(-35, Math.min(35, mar - pm));
    S.m[g.h] = mh + P.kM * e; S.m[g.a] = ma - P.kM * e;
    const eT = Math.max(-35, Math.min(35, tot - pt));
    S.t[g.h] = th + P.kT * eT; S.t[g.a] = ta + P.kT * eT;
    S.lg += 0.01 * (tot - S.lg);
    S.last[g.h] = dk; S.last[g.a] = dk;
    S.cnt[g.h] = (S.cnt[g.h] || 0) + 1; S.cnt[g.a] = (S.cnt[g.a] || 0) + 1;
    S.n++;
    if (S.n > 120) { S.sseM += (mar - pm) * (mar - pm); S.sseT += (tot - pt) * (tot - pt); S.nn++; }
  }
  function correr(games, P, cb) { const S = nuevoEstado(); for (let i = 0; i < games.length; i++) paso(S, games[i], P, cb); return S; }
  // rest = {gH,gA}: dias desde el ultimo juego de cada equipo (null/undefined si no se sabe)
  function predecir(S, P, g, rest) {
    rest = rest || {};
    const sk = seasonOf(g.ts), esc = (S.season !== null && sk > S.season) ? P.carry : 1;
    const mh = (S.m[g.h] || 0) * esc, ma = (S.m[g.a] || 0) * esc, th = (S.t[g.h] || 0) * esc, ta = (S.t[g.a] || 0) * esc;
    const Zc = (P.Z === undefined ? 1 : P.Z);
    const rH = descanso(rest.gH, P), rA = descanso(rest.gA, P);
    const pm = (mh - ma) * Zc + (g.neutral ? 0 : P.H) + rH - rA + (g.adjH || 0) - (g.adjA || 0);
    const pt = S.lg + th + ta, sg = sigmas(S);
    return { pm: pm, pt: pt, sM: sg.sM, sT: sg.sT, rH: rH, rA: rA, pH: pML(pm, sg.sM), mh: mh, ma: ma };
  }
  // P(gana el local) con margen normal; el empate (0.3% de los juegos) se reparte.
  function pML(pm, s) { const h = 1 - Phi((0.5 - pm) / s), a = Phi((-0.5 - pm) / s); return h / (h + a); }
  // P(X>t) con X ~ Normal(mu,s); con linea entera hay "push"
  function pCover(mu, s, t) {
    if (Number.isInteger(t)) { const w = 1 - Phi((t + 0.5 - mu) / s); return { w: w, p: Phi((t + 0.5 - mu) / s) - Phi((t - 0.5 - mu) / s) }; }
    return { w: 1 - Phi((t - mu) / s), p: 0 };
  }
  function pRango(mu, s, a, b) { return Phi((b + 0.5 - mu) / s) - Phi((a - 0.5 - mu) / s); }

  /* ---------- numeros clave ---------- */
  // Pesos W[|k|] = (margenes exactos de |k| vistos) / (los que la normal esperaba), calculados sin mirar el futuro (cada juego usa su propio pm).
  function pesosClave(games, P, opt) {
    opt = opt || {}; const prior = opt.prior === undefined ? 8 : opt.prior;
    const obs = new Array(46).fill(0), exp = new Array(46).fill(0); let n = 0;
    correr(games, P, function (g, x) {
      if (x.cH < 3 || x.cA < 3) return;
      const sg = sigmas(x.S).sM; n++;
      const k0 = Math.abs(x.mar); if (k0 <= 45) obs[k0]++;
      for (let k = 0; k <= 45; k++) { exp[k] += (k === 0 ? pdf(0, x.pm, sg) : pdf(k, x.pm, sg) + pdf(-k, x.pm, sg)); }
    });
    const W = new Array(46).fill(1);
    if (n < 400) return { W: W, n: n, ok: false };
    for (let k = 0; k <= 45; k++) W[k] = Math.max(0.35, Math.min(3, (obs[k] + prior) / (exp[k] + prior)));
    return { W: W, n: n, ok: true, obs: obs, exp: exp };
  }
  // distribucion del margen (enteros -45..45) ya corregida con los pesos clave
  function distMargen(mu, s, W) {
    const out = new Array(91); let sum = 0;
    for (let k = -45; k <= 45; k++) { const v = (Phi((k + 0.5 - mu) / s) - Phi((k - 0.5 - mu) / s)) * (W ? W[Math.abs(k)] : 1); out[k + 45] = v; sum += v; }
    for (let i = 0; i < 91; i++) out[i] /= sum;
    return out;
  }
  // probabilidad de que el local cubra la linea L (el local recibe L puntos): margen + L > 0; push si == 0
  function pCoverK(mu, s, L, W) {
    const d = distMargen(mu, s, W); let w = 0, p = 0;
    for (let k = -45; k <= 45; k++) { const x = k + L; if (x > 1e-9) w += d[k + 45]; else if (Math.abs(x) <= 1e-9) p += d[k + 45]; }
    return { w: w, p: p };
  }
  function pMLk(mu, s, W) { const d = distMargen(mu, s, W); let h = 0, a = 0; for (let k = -45; k <= 45; k++) { if (k > 0) h += d[k + 45]; else if (k < 0) a += d[k + 45]; } return h / (h + a); }

  /* ---------- medicion ---------- */
  function evaluar(games, P, sk, opt) {
    opt = opt || {};
    const r = { n: 0, ok: 0, ll: 0, llb: 0, aeM: 0, aeMb: 0, aeT: 0, aeTb: 0, sqM: 0, sqT: 0, sl: { n: 0, sxx: 0, sxy: 0, syy: 0 },
      qW: { s: 0, s2: 0 }, qM: { s: 0, s2: 0 }, qT: { s: 0, s2: 0 }, bins: [{ n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }] };
    let frH = 1, frA = 1, mb = 2.5;
    correr(games, P, function (g, x) {
      const mar = x.mar, tot = x.tot, real = mar > 0;
      if (seasonOf(g.ts) === sk && x.cH >= 3 && x.cA >= 3 && (!opt.filtro || opt.filtro(g)) && mar !== 0) {
        const Zc = (P.Z === undefined ? 1 : P.Z), pmZ = x.b0 + Zc * x.rd, sg = sigmas(x.S), pH = pML(pmZ, sg.sM);
        const yS = x.mar - x.b0; r.sl.n++; r.sl.sxx += x.rd * x.rd; r.sl.sxy += x.rd * yS; r.sl.syy += yS * yS;
        const lm = -Math.log(Math.max(real ? pH : 1 - pH, 1e-9)), lb = -Math.log((real ? frH : frA) / (frH + frA));
        r.n++; if ((pH >= 0.5) === real) r.ok++; r.ll += lm; r.llb += lb;
        const eM = Math.abs(mar - pmZ), eMb = Math.abs(mar - mb), eT = Math.abs(tot - x.pt), eTb = Math.abs(tot - x.lg);
        r.aeM += eM; r.aeMb += eMb; r.aeT += eT; r.aeTb += eTb;
        r.sqM += eM * eM; r.sqT += eT * eT;
        [[r.qW, lb - lm], [r.qM, eMb - eM], [r.qT, eTb - eT]].forEach(function (z) { z[0].s += z[1]; z[0].s2 += z[1] * z[1]; });
        const pf = Math.max(pH, 1 - pH), won = (pH >= 0.5) === real, bi = pf < 0.6 ? 0 : (pf < 0.7 ? 1 : (pf < 0.8 ? 2 : 3));
        r.bins[bi].n++; r.bins[bi].pred += pf; if (won) r.bins[bi].won++;
      }
      if (real) frH++; else if (mar < 0) frA++;
      mb += (mar - mb) / 300;
    });
    return r;
  }
  function pendiente(sl) {
    if (!sl || sl.n < 100 || sl.sxx <= 0) return { b: 1, se: Infinity, z: 0, n: sl ? sl.n : 0 };
    const b = sl.sxy / sl.sxx, sse = Math.max(sl.syy - b * sl.sxy, 0), se = Math.sqrt(sse / Math.max(sl.n - 1, 1) / sl.sxx);
    return { b: b, se: se, z: se > 0 ? (1 - b) / se : 0, n: sl.n };
  }
  function zRecomendado(sl) { const p = pendiente(sl); if (p.z > 2) return Math.max(0.7, Math.min(1, Math.round(p.b * 100) / 100)); return 1; }
  function dif(q, n) { const m = n ? q.s / n : 0, v = n > 1 ? Math.max(q.s2 - q.s * q.s / n, 0) / (n - 1) : 0; return { d: m, se: Math.sqrt(v / Math.max(n, 1)), n: n }; }
  function verdTxt(v, minD) {
    const z = v.se > 0 ? v.d / v.se : 0;
    if (z > 2 && v.d > minD) return { t: '✓ le gana', c: 'var(--good)' };
    if (z < -2 && v.d < -minD) return { t: '✗ peor', c: 'var(--bad)' };
    return { t: '≈ igual', c: 'var(--mut)' };
  }
  function gridMargen(games, sk, filtro, base) {
    let best = null;
    [0.05, 0.08, 0.11, 0.15].forEach(function (kM) { [0.5, 0.65, 0.8].forEach(function (carry) { [1.2, 1.8, 2.4].forEach(function (H) { [0, 1, 2].forEach(function (Rs) { [0, 0.8, 1.6].forEach(function (Bb) {
      const P = Object.assign({}, base, { kM: kM, carry: carry, H: H, Rs: Rs, Bb: Bb });
      const r = evaluar(games, P, sk, { filtro: filtro });
      if (r.n && (!best || r.sqM < best.r.sqM)) best = { P: P, r: r };
    }); }); }); }); });
    return best;
  }
  function gridTotal(games, sk, filtro, base) {
    let best = null;
    [0.02, 0.04, 0.07, 0.10].forEach(function (kT) {
      const P = Object.assign({}, base, { kT: kT });
      const r = evaluar(games, P, sk, { filtro: filtro });
      if (r.n && (!best || r.sqT < best.r.sqT)) best = { P: P, r: r };
    });
    return best;
  }

  const api = { PDEF: PDEF, SIG_M: SIG_M, SIG_T: SIG_T, seasonOf: seasonOf, dayKey: dayKey, Phi: Phi, descanso: descanso, nuevoEstado: nuevoEstado, paso: paso, correr: correr, predecir: predecir,
    pML: pML, pCover: pCover, pRango: pRango, pesosClave: pesosClave, distMargen: distMargen, pCoverK: pCoverK, pMLk: pMLk,
    evaluar: evaluar, dif: dif, verdTxt: verdTxt, gridMargen: gridMargen, gridTotal: gridTotal, sigmas: sigmas, pendiente: pendiente, zRecomendado: zRecomendado };
  root.OVA_NFL = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
