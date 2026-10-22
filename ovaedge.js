/* ovaedge.js - OVA Edge
 * Modulo de matematica de apuestas para OVA (MLB, futbol, NBA). Un solo archivo, sin dependencias.
 * Se carga con:  <script src="ovaedge.js"></script>   y queda en  window.OVAEdge
 * (en Node:  var E = require('./ovaedge.js') )
 *
 * Trae 4 piezas:
 *   1) Quitar el vig:      OVAEdge.devig([-150, +130], 'shin')      -> probabilidades justas
 *   2) Kelly prudente:     OVAEdge.kelly({p:0.57, american:-110, se:0.035})
 *   3) CLV:                OVAEdge.evVsClose(...) y OVAEdge.summarizeCLV([...])
 *   4) Calibracion:        OVAEdge.brier / reliability / plattFit / isotonicFit
 *   5) Monte Carlo:        OVAEdge.simulateGame({muHome:4.7, muAway:4.3}) -> ML, run line, totales, F5
 *   +  Todo junto:         OVAEdge.analyzeMoneyline({...})
 *
 * Nada aqui cambia las carreras esperadas de tu formula: las recibe ya calculadas.
 * Este modulo no crea ventaja, mide si la hay y reparte la apuesta con cuidado.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function sum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; }
  function logit(p) { p = clamp(p, 1e-9, 1 - 1e-9); return Math.log(p / (1 - p)); }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /* Cuotas americanas */
  function amToDec(am) { return am > 0 ? 1 + am / 100 : 1 + 100 / (-am); }
  function amToProb(am) { return 1 / amToDec(am); }
  function probToAm(p) {
    p = clamp(p, 1e-6, 1 - 1e-6);
    return p >= 0.5 ? -Math.round(100 * p / (1 - p)) : Math.round(100 * (1 - p) / p);
  }

  /* ------------------------------------------------------------------ */
  /* 1) Quitar el vig                                                    */
  /* ------------------------------------------------------------------ */
  /* odds: cuotas americanas de TODOS los resultados de un mercado ([-150, +130]).
   * method: 'shin' (default), 'power' o 'mult'.
   * Devuelve { probs, overround, method }. Las probs suman 1. */
  function devig(odds, method) {
    var m = method || 'shin';
    var q = odds.map(amToProb);
    var S = sum(q);
    var p, i, lo, hi, mid, f;

    if (S <= 1 + 1e-12 || m === 'mult') {
      p = q.map(function (x) { return x / S; });
      return { probs: p, overround: S - 1, method: S <= 1 + 1e-12 ? 'mult' : m };
    }

    if (m === 'power') {
      lo = 1; hi = 30;
      for (i = 0; i < 80; i++) {
        mid = (lo + hi) / 2;
        f = 0; q.forEach(function (x) { f += Math.pow(x, mid); });
        if (f > 1) lo = mid; else hi = mid;
      }
      var k = (lo + hi) / 2;
      p = q.map(function (x) { return Math.pow(x, k); });
      return { probs: p, overround: S - 1, method: 'power', k: k };
    }

    /* Shin */
    function shinSum(z) {
      var t = 0;
      for (var j = 0; j < q.length; j++) {
        t += (Math.sqrt(z * z + 4 * (1 - z) * q[j] * q[j] / S) - z) / (2 * (1 - z));
      }
      return t;
    }
    lo = 0; hi = 0.5;
    for (i = 0; i < 80; i++) {
      mid = (lo + hi) / 2;
      if (shinSum(mid) > 1) lo = mid; else hi = mid;
    }
    var z = (lo + hi) / 2;
    p = q.map(function (x) {
      return (Math.sqrt(z * z + 4 * (1 - z) * x * x / S) - z) / (2 * (1 - z));
    });
    var tot = sum(p);
    p = p.map(function (x) { return x / tot; });
    return { probs: p, overround: S - 1, method: 'shin', z: z };
  }

  /* Mezcla modelo + mercado en escala logit. w = peso del modelo (0..1). */
  function blend(pModel, pMarket, w) {
    var ww = w == null ? 0.5 : w;
    return sigmoid(ww * logit(pModel) + (1 - ww) * logit(pMarket));
  }

  /* ------------------------------------------------------------------ */
  /* 2) Kelly fraccional usando el limite inferior                       */
  /* ------------------------------------------------------------------ */
  /* opts: p (prob de ganar), american o dec, pPush (default 0),
   *       se (error de tu estimado, default 0.035), z (default 1),
   *       fraction (default 0.25), cap (tope de bankroll, default 0.05)
   * La apuesta se calcula con p - z*se, no con p. */
  function kelly(opts) {
    var dec = opts.dec != null ? opts.dec : amToDec(opts.american);
    var b = dec - 1;
    var pPush = opts.pPush || 0;
    var se = opts.se == null ? 0.035 : opts.se;
    var z = opts.z == null ? 1 : opts.z;
    var fraction = opts.fraction == null ? 0.25 : opts.fraction;
    var cap = opts.cap == null ? 0.05 : opts.cap;

    function fstar(pw) {
      var ql = 1 - pw - pPush;
      if (ql < 0) ql = 0;
      var denom = b * (pw + ql);
      if (denom <= 0) return 0;
      return (pw * b - ql) / denom;
    }
    function ev(pw) { return pw * b - (1 - pw - pPush); }

    var pLow = clamp(opts.p - z * se, 0, 1 - pPush);
    var fFull = Math.max(0, fstar(opts.p));
    var fLow = Math.max(0, fstar(pLow));
    var stake = Math.min(cap, fraction * fLow);

    return {
      dec: dec,
      p: opts.p,
      pLow: pLow,
      ev: ev(opts.p),
      evLow: ev(pLow),
      fullKelly: fFull,
      fullKellyLow: fLow,
      stake: stake,
      verdict: stake > 0 ? 'apostar' : 'sin apuesta'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3) CLV                                                              */
  /* ------------------------------------------------------------------ */
  /* takenAm: cuota que agarraste. closeAmThis/closeAmOther: cuotas de cierre
   * de tu lado y del lado contrario (para quitar el vig del cierre).
   * evVsClose = lo que valia tu cuota contra la probabilidad justa de cierre.
   * Positivo sostenido = le ganas a la linea de cierre = hay ventaja real. */
  function evVsClose(takenAm, closeAmThis, closeAmOther, method) {
    var fair = devig([closeAmThis, closeAmOther], method || 'shin').probs[0];
    var dec = amToDec(takenAm);
    return {
      pFairClose: fair,
      evVsClose: dec * fair - 1,
      probGain: fair - amToProb(takenAm)
    };
  }

  /* values: arreglo de numeros evVsClose (uno por pick). */
  function summarizeCLV(values) {
    var n = values.length;
    if (n === 0) return { n: 0 };
    var mean = sum(values) / n;
    var v = 0, pos = 0, i;
    for (i = 0; i < n; i++) { v += (values[i] - mean) * (values[i] - mean); if (values[i] > 0) pos++; }
    var sd = n > 1 ? Math.sqrt(v / (n - 1)) : 0;
    var se = n > 1 ? sd / Math.sqrt(n) : 0;
    return {
      n: n,
      mean: mean,
      sd: sd,
      se: se,
      t: se > 0 ? mean / se : 0,
      pctPositive: pos / n,
      /* regla practica: con t < 2 todavia no se puede distinguir de suerte */
      lectura: n < 30 ? 'muy pocos picks' : (se > 0 && mean / se >= 2 ? 'ventaja probable' : 'no se distingue de suerte')
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4) Calibracion                                                      */
  /* ------------------------------------------------------------------ */
  function brier(preds, outs) {
    var s = 0;
    for (var i = 0; i < preds.length; i++) s += (preds[i] - outs[i]) * (preds[i] - outs[i]);
    return s / preds.length;
  }

  function logLoss(preds, outs) {
    var s = 0;
    for (var i = 0; i < preds.length; i++) {
      var p = clamp(preds[i], 1e-9, 1 - 1e-9);
      s += outs[i] ? -Math.log(p) : -Math.log(1 - p);
    }
    return s / preds.length;
  }

  /* Brier skill vs. predecir siempre la frecuencia base: >0 = mejor que eso. */
  function brierSkill(preds, outs) {
    var base = sum(outs) / outs.length;
    var ref = 0;
    for (var i = 0; i < outs.length; i++) ref += (base - outs[i]) * (base - outs[i]);
    ref /= outs.length;
    return ref > 0 ? 1 - brier(preds, outs) / ref : 0;
  }

  /* Tabla de confiabilidad: cuando dices X%, cuanto pasa de verdad. */
  function reliability(preds, outs, bins) {
    var nb = bins || 10, out = [], i, b;
    for (b = 0; b < nb; b++) out.push({ lo: b / nb, hi: (b + 1) / nb, n: 0, meanPred: 0, freq: 0 });
    for (i = 0; i < preds.length; i++) {
      b = Math.min(nb - 1, Math.floor(preds[i] * nb));
      out[b].n++; out[b].meanPred += preds[i]; out[b].freq += outs[i];
    }
    return out.filter(function (r) { return r.n > 0; }).map(function (r) {
      return { lo: r.lo, hi: r.hi, n: r.n, meanPred: r.meanPred / r.n, freq: r.freq / r.n };
    });
  }

  /* Platt: p' = sigmoid(a * logit(p) + b). Sirve con pocos datos (100+). */
  function plattFit(preds, outs) {
    var a = 1, b = 0, iter, i;
    for (iter = 0; iter < 100; iter++) {
      var g0 = 0, g1 = 0, h00 = 1e-6, h01 = 0, h11 = 1e-6;
      for (i = 0; i < preds.length; i++) {
        var x = logit(preds[i]);
        var s = sigmoid(a * x + b);
        var r = s - outs[i];
        var w = s * (1 - s);
        g0 += r * x; g1 += r;
        h00 += w * x * x; h01 += w * x; h11 += w;
      }
      var det = h00 * h11 - h01 * h01;
      if (Math.abs(det) < 1e-12) break;
      var da = (h11 * g0 - h01 * g1) / det;
      var db = (-h01 * g0 + h00 * g1) / det;
      a -= da; b -= db;
      if (Math.abs(da) + Math.abs(db) < 1e-10) break;
    }
    return { a: a, b: b, apply: function (p) { return sigmoid(a * logit(p) + b); } };
  }

  /* Isotonica (PAVA): curva escalonada creciente. Pide cientos de datos (300+),
   * con pocos se sobreajusta. */
  function isotonicFit(preds, outs) {
    var idx = [], i;
    for (i = 0; i < preds.length; i++) idx.push(i);
    idx.sort(function (a, b) { return preds[a] - preds[b]; });
    var blocks = [];
    for (i = 0; i < idx.length; i++) {
      blocks.push({ sy: outs[idx[i]], sx: preds[idx[i]], w: 1 });
      while (blocks.length > 1) {
        var a = blocks[blocks.length - 2], b = blocks[blocks.length - 1];
        if (a.sy / a.w >= b.sy / b.w) {
          blocks.splice(blocks.length - 2, 2, { sy: a.sy + b.sy, sx: a.sx + b.sx, w: a.w + b.w });
        } else break;
      }
    }
    var xs = blocks.map(function (k) { return k.sx / k.w; });
    var ys = blocks.map(function (k) { return k.sy / k.w; });
    function apply(p) {
      if (p <= xs[0]) return ys[0];
      if (p >= xs[xs.length - 1]) return ys[ys.length - 1];
      var lo = 0, hi = xs.length - 1;
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] <= p) lo = m; else hi = m; }
      var t = (p - xs[lo]) / (xs[hi] - xs[lo]);
      return ys[lo] + t * (ys[hi] - ys[lo]);
    }
    return { apply: apply, blocks: blocks.length, xs: xs, ys: ys };
  }

  /* ------------------------------------------------------------------ */
  /* 5) Monte Carlo del juego                                            */
  /* ------------------------------------------------------------------ */
  /* Pythagenpat, para cruzar el resultado de la simulacion. */
  function pythagenpat(rs, ra) {
    var x = Math.pow(rs + ra, 0.287);
    var a = Math.pow(rs, x), b = Math.pow(ra, x);
    return a / (a + b);
  }

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeSamplers(rand) {
    var spare = null;
    function normal() {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = 0, v = 0, r, f;
      while (u === 0) u = rand();
      v = rand();
      r = Math.sqrt(-2 * Math.log(u)); f = 2 * Math.PI * v;
      spare = r * Math.sin(f);
      return r * Math.cos(f);
    }
    function gammaShape(k) { /* Marsaglia-Tsang, escala 1 */
      if (k < 1) {
        var u = rand(); while (u === 0) u = rand();
        return gammaShape(k + 1) * Math.pow(u, 1 / k);
      }
      var d = k - 1 / 3, c = 1 / Math.sqrt(9 * d), x, v, u2;
      for (;;) {
        do { x = normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v; u2 = rand();
        if (u2 < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u2) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    }
    function gammaMean1(k) { return gammaShape(k) / k; }
    function poisson(lam) {
      if (lam <= 0) return 0;
      if (lam < 30) {
        var L = Math.exp(-lam), k = 0, p = 1;
        do { k++; p *= rand(); } while (p > L);
        return k - 1;
      }
      var v = Math.round(lam + Math.sqrt(lam) * normal());
      return v < 0 ? 0 : v;
    }
    return { gammaMean1: gammaMean1, poisson: poisson };
  }

  /* Simula n juegos. Carreras de cada equipo = Poisson mezclada con Gamma
   * (binomial negativa), con un factor compartido del juego (clima, parque,
   * arbitro) que da la correlacion positiva entre los dos equipos.
   *
   * o.muHome, o.muAway : carreras esperadas (las de tu formula, ya con encogimiento)
   * o.n       : simulaciones (default 20000; usa 100000 para un solo juego a detalle)
   * o.seed    : semilla, para que el resultado se repita
   * o.kc      : forma de la Gamma compartida (default 26 -> correlacion ~0.08)
   * o.kt      : forma de la Gamma de cada equipo (default 4.75)
   *             Con estos defaults, equipo de 4.5 carreras: varianza ~9.7.
   *             Ajustalos con tus datos reales de carreras por equipo.
   * o.f5Frac  : fraccion de carreras en las primeras 5 entradas (default 0.56, medido por ti)
   * o.extraMult: carreras por entrada extra vs. entrada normal (default 1.8, corredor fantasma)
   * o.noExtras: true = solo 9 entradas (el empate se queda empate y pHome no lo cuenta).
   *             Sirve para comparar contra modelos de 9 entradas; con meanFix:1.
   */
  function simulateGame(o) {
    var n = o.n || 20000;
    var rand = makeRng(o.seed == null ? 20261022 : o.seed);
    var S = makeSamplers(rand);
    var kc = o.kc || 26, kt = o.kt || 4.75;
    var f5 = o.f5Frac == null ? 0.56 : o.f5Frac;
    var xm = o.extraMult == null ? 1.8 : o.extraMult;
    /* Las entradas extra suman ~3.2% de carreras encima de las 9 reglamentarias. Como tu mu ya es
     * promedio por juego completo (incluye extras), se bajan las 9 entradas para que la media final
     * quede en mu. Pon meanFix:1 si tus mu son solo de 9 entradas. */
    var fix = o.meanFix == null ? 1 / 1.032 : o.meanFix;
    var muH = o.muHome, muA = o.muAway;

    var H = new Int16Array(n), A = new Int16Array(n), H5 = new Int16Array(n), A5 = new Int16Array(n);
    var i, wins = 0, tiesReg = 0;

    for (i = 0; i < n; i++) {
      var E = S.gammaMean1(kc);
      var lh0 = muH * E * S.gammaMean1(kt);
      var la0 = muA * E * S.gammaMean1(kt);
      var lh = lh0 * fix, la = la0 * fix;
      var h5 = S.poisson(lh * f5), a5 = S.poisson(la * f5);
      var h = h5 + S.poisson(lh * (1 - f5));
      var a = a5 + S.poisson(la * (1 - f5));
      if (h === a) {
        tiesReg++;
        if (!o.noExtras) {
          var g = 0;
          while (h === a && g < 40) { h += S.poisson(lh0 / 9 * xm); a += S.poisson(la0 / 9 * xm); g++; }
          if (h === a) { if (rand() < 0.5) h++; else a++; }
        }
      }
      H[i] = h; A[i] = a; H5[i] = h5; A5[i] = a5;
      if (h > a) wins++;
    }

    var pHome = wins / n;

    function cmp(arrX, arrY, line, sign) {
      /* sign +1: cubre si (X - Y) + line > 0 */
      var w = 0, p = 0, l = 0;
      for (var j = 0; j < n; j++) {
        var d = (arrX[j] - arrY[j]) * sign + line;
        if (d > 1e-9) w++; else if (d < -1e-9) l++; else p++;
      }
      return { win: w / n, push: p / n, lose: l / n };
    }
    function totalOf(X, Y, line) {
      var ov = 0, un = 0, pu = 0;
      for (var j = 0; j < n; j++) {
        var t = X[j] + Y[j];
        if (t > line) ov++; else if (t < line) un++; else pu++;
      }
      return { over: ov / n, under: un / n, push: pu / n };
    }
    function teamTot(arr, line) {
      var ov = 0, un = 0, pu = 0;
      for (var j = 0; j < n; j++) {
        if (arr[j] > line) ov++; else if (arr[j] < line) un++; else pu++;
      }
      return { over: ov / n, under: un / n, push: pu / n };
    }

    var res = {
      n: n, muHome: muH, muAway: muA,
      pHome: pHome, pAway: 1 - pHome,
      se: Math.sqrt(pHome * (1 - pHome) / n),
      pTieAfter9: tiesReg / n,
      meanHome: sum(H) / n, meanAway: sum(A) / n,
      /* run line: spread('home', -1.5) = prob de que local gane por 2+ */
      spread: function (side, line) { return side === 'home' ? cmp(H, A, line, 1) : cmp(A, H, line, 1); },
      total: function (line) { return totalOf(H, A, line); },
      teamTotal: function (side, line) { return teamTot(side === 'home' ? H : A, line); },
      /* primeras 5 entradas: ML a 3 lados (el empate existe) */
      f5: function () {
        var hw = 0, aw = 0, t = 0;
        for (var j = 0; j < n; j++) { if (H5[j] > A5[j]) hw++; else if (H5[j] < A5[j]) aw++; else t++; }
        return { home: hw / n, away: aw / n, tie: t / n };
      },
      f5Total: function (line) { return totalOf(H5, A5, line); },
      f5Spread: function (side, line) { return side === 'home' ? cmp(H5, A5, line, 1) : cmp(A5, H5, line, 1); },
      /* distribucion del total: arreglo p[t] = prob de que el total sea t */
      totalDist: function (max) {
        var m = max || 30, d = new Array(m + 1), j;
        for (j = 0; j <= m; j++) d[j] = 0;
        for (j = 0; j < n; j++) { var t = Math.min(m, H[j] + A[j]); d[t]++; }
        return d.map(function (x) { return x / n; });
      }
    };
    return res;
  }

  /* EV por unidad apostada con empate/push: pw gana, pp devuelve, resto pierde. */
  function ev(pw, pp, american) {
    return pw * (amToDec(american) - 1) - (1 - pw - (pp || 0));
  }

  /* ------------------------------------------------------------------ */
  /* Todo junto: moneyline                                               */
  /* ------------------------------------------------------------------ */
  /* o: americanHome, americanAway (cuotas del book),
   *    pModel (opcional: prob de ganar del LOCAL segun tu formula de OVA),
   *    muHome, muAway (si no das pModel, se simula con estas),
   *    blendW (peso del modelo contra el mercado, default 1 = solo modelo),
   *    se, fraction, cap, method (ver kelly/devig)
   * Devuelve el mercado sin vig, la prob del modelo, y la apuesta sugerida por lado. */
  function analyzeMoneyline(o) {
    var mk = devig([o.americanHome, o.americanAway], o.method || 'shin');
    var sim = null, pH;
    if (o.pModel != null) pH = o.pModel;
    else { sim = simulateGame({ muHome: o.muHome, muAway: o.muAway, n: o.n || 20000, seed: o.seed }); pH = sim.pHome; }
    var w = o.blendW == null ? 1 : o.blendW;
    var pFinalH = w >= 1 ? pH : blend(pH, mk.probs[0], w);
    var se = o.se == null ? (sim ? Math.sqrt(0.035 * 0.035 + sim.se * sim.se) : 0.035) : o.se;

    function side(p, am, pm) {
      var k = kelly({ p: p, american: am, se: se, fraction: o.fraction, cap: o.cap });
      return { pModel: p, pMarket: pm, edge: p - pm, ev: k.ev, evLow: k.evLow, stake: k.stake, verdict: k.verdict };
    }
    return {
      overround: mk.overround,
      market: { home: mk.probs[0], away: mk.probs[1] },
      model: { home: pFinalH, away: 1 - pFinalH, pythagenpat: sim ? pythagenpat(o.muHome, o.muAway) : null },
      home: side(pFinalH, o.americanHome, mk.probs[0]),
      away: side(1 - pFinalH, o.americanAway, mk.probs[1]),
      sim: sim
    };
  }

  var API = {
    amToDec: amToDec, amToProb: amToProb, probToAm: probToAm,
    devig: devig, blend: blend,
    kelly: kelly, ev: ev,
    evVsClose: evVsClose, summarizeCLV: summarizeCLV,
    brier: brier, logLoss: logLoss, brierSkill: brierSkill, reliability: reliability,
    plattFit: plattFit, isotonicFit: isotonicFit,
    pythagenpat: pythagenpat, simulateGame: simulateGame,
    analyzeMoneyline: analyzeMoneyline,
    version: '1.0'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.OVAEdge = API;
})(typeof window !== 'undefined' ? window : this);
