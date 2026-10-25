/* ===================================================================
   OVA · MODELO NHL (sin DOM; lo usan nhl.html, el backtest de GitHub y las pruebas)
   El hockey es un deporte de pocos goles: la curva normal NO sirve. Aqui los goles de cada equipo son Poisson:
     goles esperados local   = (total esperado + margen esperado) / 2
     goles esperados visita  = (total esperado - margen esperado) / 2
   El margen esperado sale de un rating en GOLES (estilo Elo de margen) con ventaja de local y back-to-back.
   Empate en los 60 min -> tiempo extra / shootout: el ganador lo decide una moneda casi pareja que se inclina un poco
   hacia el mejor equipo (Q). ESPN suma +1 gol al ganador del shootout; aqui un shootout cuenta como margen 0 y total sin ese gol.
   De UNA sola distribucion salen: ganador (con OT/SO), linea de gol (+-1.5), totales (5.5, 6, 6.5...), y 60 minutos (1X2).
   =================================================================== */
(function (root) {
  'use strict';
  const PDEF = { kM: 0.015, kT: 0.008, carry: 0.7, H: 0.2, R: 0.25, Q: 0.25, KT: 0.023, Z: 1 };
  // Q = cuanto inclina el tiempo extra hacia el mejor equipo (logit por gol de margen esperado).
  // KT = los goles totales varian MENOS que un Poisson puro (medido: varianza 0.88 de la media en 6,747 juegos 2021-26); se aprieta la curva de totales con un peso exp(-KT*(s-media)^2/2).
  // OTG = fraccion de empates a 60' que se deciden con gol en OT (medido: 67%; el resto es shootout).
  const OTG = 0.67, LG0 = 6.1, NMAX = 16;

  function seasonOf(ts) { const d = new Date(ts - 10 * 3600e3); const m = d.getUTCMonth(), y = d.getUTCFullYear(); return m >= 7 ? y : y - 1; }
  function dayKey(ts) { return Math.floor((ts - 10 * 3600e3) / 864e5); }
  const sig = z => 1 / (1 + Math.exp(-z));
  function nuevoEstado() { return { m: {}, t: {}, last: {}, cnt: {}, lg: LG0, season: null, n: 0, nn: 0, sseM: 0, sseT: 0 }; }

  // poisson hasta NMAX
  function pois(l) { const o = new Array(NMAX + 1); let p = Math.exp(-l); o[0] = p; for (let i = 1; i <= NMAX; i++) { p *= l / i; o[i] = p; } return o; }

  /* Distribucion completa de un juego. pm = margen esperado (goles, local menos visita), pt = total esperado de goles.
     Devuelve:
       pH, pA          ganador final (incluye OT y shootout)
       regH, regE, regA  resultado a los 60 minutos (gana local / empate / gana visita)
       M[k+NMAX]       margen final al estilo ESPN (k = -NMAX..NMAX); un empate de 60' se vuelve +-1 (quien gane OT/SO)
       T[s]            total de goles (sin el gol del shootout); el OT suma 1 gol con probabilidad OTG */
  function dist(pm, pt, P) {
    const mu = Math.max(0.6, pt), d = Math.max(-mu + 0.4, Math.min(mu - 0.4, pm));
    const lh = (mu + d) / 2, la = (mu - d) / 2;
    const ph = pois(lh), pa = pois(la);
    const q = sig((P && P.Q !== undefined ? P.Q : PDEF.Q) * d);
    const M = new Array(2 * NMAX + 1).fill(0), T = new Array(2 * NMAX + 3).fill(0);
    let regH = 0, regE = 0, regA = 0, tot = 0;
    for (let i = 0; i <= NMAX; i++) for (let j = 0; j <= NMAX; j++) {
      const p = ph[i] * pa[j]; tot += p;
      if (i > j) { regH += p; M[i - j + NMAX] += p; T[i + j] += p; }
      else if (i < j) { regA += p; M[i - j + NMAX] += p; T[i + j] += p; }
      else { regE += p; M[1 + NMAX] += p * q; M[-1 + NMAX] += p * (1 - q); T[i + j] += p * (1 - OTG); T[Math.min(i + j + 1, 2 * NMAX + 2)] += p * OTG; }
    }
    const s = 1 / tot;
    for (let k = 0; k < M.length; k++) M[k] *= s;
    for (let k = 0; k < T.length; k++) T[k] *= s;
    const kt = P && P.KT !== undefined ? P.KT : PDEF.KT;
    if (kt > 0) {
      let mu2 = 0; for (let k = 0; k < T.length; k++) mu2 += k * T[k];
      let sw = 0; for (let k = 0; k < T.length; k++) { T[k] *= Math.exp(-0.5 * kt * (k - mu2) * (k - mu2)); sw += T[k]; }
      for (let k = 0; k < T.length; k++) T[k] /= sw;
    }
    regH *= s; regE *= s; regA *= s;
    return { pH: regH + regE * q, pA: regA + regE * (1 - q), regH: regH, regE: regE, regA: regA, M: M, T: T, lh: lh, la: la, q: q };
  }
  // el local recibe la linea L (ej. -1.5 / +1.5): cubre si margen + L > 0
  function pCoverM(D, L) { let w = 0, p = 0; for (let k = -NMAX; k <= NMAX; k++) { const x = k + L; if (x > 1e-9) w += D.M[k + NMAX]; else if (Math.abs(x) <= 1e-9) p += D.M[k + NMAX]; } return { w: w, p: p }; }
  // total: Mas de L (push si L entero)
  function pOver(D, L) { let w = 0, p = 0; for (let s = 0; s < D.T.length; s++) { if (s > L + 1e-9) w += D.T[s]; else if (Math.abs(s - L) <= 1e-9) p += D.T[s]; } return { w: w, p: p }; }
  function mediaTotal(D) { let m = 0; for (let s = 0; s < D.T.length; s++) m += s * D.T[s]; return m; }
  function mediaMargen(D) { let m = 0; for (let k = -NMAX; k <= NMAX; k++) m += k * D.M[k + NMAX]; return m; }
  // el pm que hace que la probabilidad de ganar del local sea pk, dado el total (para leer la linea de gol implicita del mercado)
  function pmDeProb(pk, pt, P) {
    let lo = -2.5, hi = 2.5;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (dist(mid, pt, P).pH < pk) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
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
    const bH = S.last[g.h] !== undefined && dk - S.last[g.h] === 1, bA = S.last[g.a] !== undefined && dk - S.last[g.a] === 1;
    const pm = mh - ma + (g.neutral ? 0 : P.H) + (bA ? P.R : 0) - (bH ? P.R : 0);
    const pt = S.lg + th + ta;
    // shootout: el marcador de ESPN le suma 1 al ganador; aqui es empate (margen 0) y el total pierde ese gol
    const mar = g.so ? 0 : g.hs - g.as, tot = g.hs + g.as - (g.so ? 1 : 0);
    if (cb) cb(g, { pm: pm, pt: pt, mar: mar, tot: tot, cH: S.cnt[g.h] || 0, cA: S.cnt[g.a] || 0, S: S, lg: S.lg, rd: mh - ma, b0: pm - (mh - ma), bH: bH, bA: bA });
    const e = Math.max(-4, Math.min(4, mar - pm));
    S.m[g.h] = mh + P.kM * e; S.m[g.a] = ma - P.kM * e;
    const eT = Math.max(-5, Math.min(5, tot - pt));
    S.t[g.h] = th + P.kT * eT; S.t[g.a] = ta + P.kT * eT;
    S.lg += 0.004 * (tot - S.lg);
    S.last[g.h] = dk; S.last[g.a] = dk;
    S.cnt[g.h] = (S.cnt[g.h] || 0) + 1; S.cnt[g.a] = (S.cnt[g.a] || 0) + 1;
    S.n++;
    if (S.n > 300) { S.sseM += (mar - pm) * (mar - pm); S.sseT += (tot - pt) * (tot - pt); S.nn++; }
  }
  function correr(games, P, cb) { const S = nuevoEstado(); for (let i = 0; i < games.length; i++) paso(S, games[i], P, cb); return S; }
  // rest = {dH,dA}: dayKey del ultimo juego de cada equipo
  function predecir(S, P, g, rest) {
    rest = rest || {};
    const sk = seasonOf(g.ts), esc = (S.season !== null && sk > S.season) ? P.carry : 1, dk = dayKey(g.ts);
    const bH = rest.dH !== undefined && dk - rest.dH === 1, bA = rest.dA !== undefined && dk - rest.dA === 1;
    const mh = (S.m[g.h] || 0) * esc, ma = (S.m[g.a] || 0) * esc, th = (S.t[g.h] || 0) * esc, ta = (S.t[g.a] || 0) * esc;
    const Zc = (P.Z === undefined ? 1 : P.Z);
    const pm = (mh - ma) * Zc + (g.neutral ? 0 : P.H) + (bA ? P.R : 0) - (bH ? P.R : 0) + (g.adjH || 0) - (g.adjA || 0);
    const pt = S.lg + th + ta;
    const D = dist(pm, pt, P);
    return { pm: pm, pt: pt, bH: bH, bA: bA, pH: D.pH, D: D, mh: mh, ma: ma };
  }

  /* ---------- medicion ---------- */
  function evaluar(games, P, sk, opt) {
    opt = opt || {};
    const r = { n: 0, ok: 0, ll: 0, llb: 0, aeM: 0, aeMb: 0, aeT: 0, aeTb: 0, sqM: 0, sqT: 0, sl: { n: 0, sxx: 0, sxy: 0, syy: 0 },
      qW: { s: 0, s2: 0 }, qM: { s: 0, s2: 0 }, qT: { s: 0, s2: 0 }, bins: [{ n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }, { n: 0, pred: 0, won: 0 }] };
    let frH = 1, frA = 1;
    correr(games, P, function (g, x) {
      const home = g.so ? (g.hs > g.as) : (g.hs > g.as);   // ganador final (el shootout ya viene con +1 para el ganador)
      if (seasonOf(g.ts) === sk && x.cH >= 8 && x.cA >= 8 && (!opt.filtro || opt.filtro(g))) {
        const Zc = (P.Z === undefined ? 1 : P.Z), pmZ = x.b0 + Zc * x.rd, D = dist(pmZ, x.pt, P), pH = D.pH;
        const yS = x.mar - x.b0; r.sl.n++; r.sl.sxx += x.rd * x.rd; r.sl.sxy += x.rd * yS; r.sl.syy += yS * yS;
        const lm = -Math.log(Math.max(home ? pH : 1 - pH, 1e-9)), lb = -Math.log((home ? frH : frA) / (frH + frA));
        r.n++; if ((pH >= 0.5) === home) r.ok++; r.ll += lm; r.llb += lb;
        const eM = Math.abs(x.mar - pmZ), eMb = Math.abs(x.mar - 0.15), eT = Math.abs(x.tot - x.pt), eTb = Math.abs(x.tot - x.lg);
        r.aeM += eM; r.aeMb += eMb; r.aeT += eT; r.aeTb += eTb; r.sqM += eM * eM; r.sqT += eT * eT;
        [[r.qW, lb - lm], [r.qM, eMb - eM], [r.qT, eTb - eT]].forEach(function (z) { z[0].s += z[1]; z[0].s2 += z[1] * z[1]; });
        const pf = Math.max(pH, 1 - pH), won = (pH >= 0.5) === home, bi = pf < 0.55 ? 0 : (pf < 0.62 ? 1 : (pf < 0.70 ? 2 : 3));
        r.bins[bi].n++; r.bins[bi].pred += pf; if (won) r.bins[bi].won++;
      }
      if (home) frH++; else frA++;
    });
    return r;
  }
  function pendiente(sl) {
    if (!sl || sl.n < 200 || sl.sxx <= 0) return { b: 1, se: Infinity, z: 0, n: sl ? sl.n : 0 };
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
  // la rejilla se evalua con la perdida (log-loss) del ganador: es lo que mas importa en hockey
  function gridMargen(games, sk, filtro, base) {
    let best = null;
    [0.015, 0.025, 0.04, 0.06].forEach(function (kM) { [0.5, 0.7, 0.85].forEach(function (carry) { [0.08, 0.14, 0.20].forEach(function (H) { [0, 0.12, 0.25].forEach(function (R) {
      const P = Object.assign({}, base, { kM: kM, carry: carry, H: H, R: R });
      const r = evaluar(games, P, sk, { filtro: filtro });
      if (r.n && (!best || r.ll < best.r.ll)) best = { P: P, r: r };
    }); }); }); });
    return best;
  }
  function gridTotal(games, sk, filtro, base) {
    let best = null;
    [0.008, 0.015, 0.025, 0.04].forEach(function (kT) {
      const P = Object.assign({}, base, { kT: kT });
      const r = evaluar(games, P, sk, { filtro: filtro });
      if (r.n && (!best || r.sqT < best.r.sqT)) best = { P: P, r: r };
    });
    return best;
  }

  const api = { PDEF: PDEF, OTG: OTG, NMAX: NMAX, seasonOf: seasonOf, dayKey: dayKey, dist: dist, pCoverM: pCoverM, pOver: pOver, mediaTotal: mediaTotal, mediaMargen: mediaMargen, pmDeProb: pmDeProb,
    nuevoEstado: nuevoEstado, paso: paso, correr: correr, predecir: predecir, evaluar: evaluar, dif: dif, verdTxt: verdTxt, gridMargen: gridMargen, gridTotal: gridTotal, pendiente: pendiente, zRecomendado: zRecomendado };
  root.OVA_NHL = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
