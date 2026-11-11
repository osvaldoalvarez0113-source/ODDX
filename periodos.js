/* ===================================================================
   OVA · POR TRAMOS (1er cuarto, 1a mitad, 1er periodo) — NBA, NFL y NHL
   No es un modelo aparte: convierte lo que la app ya usa para el juego completo (margen y total esperados, o % de ganar
   en la NHL) en los mercados del tramo. Coeficientes ajustados con juegos reales con marcador por periodo y linea
   (NBA 7,775 · NFL 2,015 · NHL 7,174) y medidos hacia adelante: docs/MEDICION-PERIODOS-2026-11.md.
   Se regeneran con  python3 -I scripts/medicion/periodos.py CARPETA salida.md coef.json
   Sin DOM en calc(): lo usan nba.html, usdeporte.js (NHL/NFL) y las pruebas.
   =================================================================== */
(function (root) {
  'use strict';
  var C = {"nba":{"q1":{"bm":0.33064,"bt":[-2.62521,0.26416],"be":[-3.07999,0.00753,-0.00498],"Tm":226.00289,"bw":0.06797,"qm":[-16.81,-14.16,-12.49,-11.31,-10.42,-9.65,-8.84,-8.16,-7.51,-6.98,-6.48,-5.83,-5.31,-4.84,-4.49,-3.98,-3.5,-3.15,-2.52,-2.18,-1.8,-1.32,-0.87,-0.5,-0.14,0.34,0.69,1.16,1.5,1.98,2.5,2.86,3.34,3.81,4.19,4.69,5.18,5.69,6.31,6.82,7.5,8.18,8.86,9.81,10.64,11.66,12.82,14.49,16.92],"qt":[-16.32,-14.25,-12.57,-11.36,-10.42,-9.53,-8.79,-8.15,-7.42,-6.87,-6.3,-5.74,-5.26,-4.75,-4.32,-3.89,-3.43,-3.0,-2.53,-2.09,-1.7,-1.3,-0.83,-0.42,-0.0,0.38,0.77,1.14,1.57,1.95,2.4,2.85,3.26,3.74,4.15,4.66,5.15,5.7,6.21,6.77,7.41,8.0,8.64,9.41,10.33,11.55,12.93,14.68,17.09]},"h1":{"bm":0.58702,"bt":[0.36564,0.50172],"be":[-3.30938,-0.03113,-0.00087],"Tm":226.00289,"bw":0.09081,"qm":[-22.58,-19.17,-17.05,-15.35,-14.07,-12.82,-11.82,-10.89,-10.01,-9.35,-8.6,-7.83,-7.16,-6.53,-5.88,-5.28,-4.64,-4.08,-3.42,-2.82,-2.18,-1.75,-1.23,-0.7,-0.12,0.42,0.95,1.42,2.01,2.64,3.18,3.71,4.33,4.91,5.6,6.23,6.89,7.53,8.17,8.95,9.83,10.88,11.77,12.64,13.88,15.31,17.05,19.08,22.77],"qt":[-24.5,-21.01,-18.52,-16.74,-15.25,-13.78,-12.74,-11.74,-11.0,-10.01,-9.27,-8.5,-7.74,-7.01,-6.49,-5.76,-5.02,-4.5,-3.99,-3.25,-2.52,-1.99,-1.26,-0.53,-0.01,0.51,1.01,1.74,2.46,3.0,3.51,4.23,4.94,5.49,6.24,6.99,7.52,8.48,9.24,9.99,10.98,11.99,12.99,14.23,15.47,16.99,18.98,21.26,24.99]}},"nfl":{"q1":{"bm":0.242,"bt":[0.72906,0.18041],"be":[-1.25287,-0.01618,-0.01072],"Tm":45.22109,"bw":0.07085,"qm":[-13.72,-11.47,-9.7,-8.69,-7.85,-7.51,-6.64,-6.27,-5.98,-5.54,-5.09,-4.6,-4.09,-3.64,-3.27,-2.89,-2.4,-2.18,-1.81,-1.57,-1.31,-0.85,-0.73,-0.6,-0.24,0.36,0.7,0.85,1.33,1.67,2.12,2.27,2.43,3.15,3.52,3.89,4.57,4.94,5.33,5.67,6.15,6.27,6.64,7.6,8.09,8.81,10.17,11.59,13.15],"qt":[-9.12,-8.76,-8.31,-7.49,-6.66,-6.3,-6.03,-5.76,-5.49,-5.13,-4.58,-3.89,-3.3,-2.94,-2.66,-2.48,-2.3,-2.12,-1.94,-1.76,-1.59,-1.49,-1.31,-1.13,-0.86,-0.48,-0.02,0.34,0.53,0.88,1.24,1.42,1.6,1.87,2.51,3.43,3.92,4.24,4.6,4.79,5.06,5.42,5.69,6.24,7.15,7.88,8.89,11.02,12.08]},"h1":{"bm":0.59118,"bt":[0.00813,0.51169],"be":[-2.54339,-0.00542,-0.00421],"Tm":45.22109,"bw":0.1022,"qm":[-20.21,-17.38,-15.08,-13.75,-12.66,-11.77,-10.84,-9.57,-8.76,-8.15,-7.63,-6.75,-6.07,-5.48,-5.07,-4.52,-4.14,-3.57,-2.86,-2.3,-1.85,-1.48,-1.08,-0.48,0.14,0.56,1.09,1.52,1.98,2.44,3.01,3.75,4.34,4.89,5.36,6.07,6.82,7.48,8.16,8.92,9.57,10.47,11.34,12.23,12.96,14.4,16.07,18.46,21.44],"qt":[-15.84,-13.78,-12.45,-11.31,-10.73,-9.79,-9.08,-8.33,-7.8,-7.24,-6.75,-6.28,-5.78,-5.27,-4.83,-4.31,-3.9,-3.48,-3.13,-2.53,-2.24,-1.76,-1.26,-0.83,-0.48,-0.16,0.26,0.73,1.15,1.44,1.82,2.5,2.99,3.71,4.22,4.74,5.24,5.73,6.22,6.83,7.73,8.44,9.17,10.27,11.22,12.24,14.05,16.09,19.21]}},"nhl":{"f":0.2903,"c":0.3467}};
  var PR = []; for (var i = 1; i < 50; i++) PR.push(i / 50);
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  /* P(residuo > r) con los 49 cuantiles q (2%..98%) de lo que paso de verdad; colas pegadas a 1% y 99% */
  function pmas(q, r) {
    var n = q.length, f;
    if (r <= q[0]) f = 0.01; else if (r >= q[n - 1]) f = 0.99;
    else { var k = 0; while (k < n - 2 && q[k + 1] < r) k++; var d = q[k + 1] - q[k]; f = PR[k] + (d > 0 ? (r - q[k]) / d : 0) * (PR[k + 1] - PR[k]); }
    return 1 - Math.min(0.99, Math.max(0.01, f));
  }
  function tramo(c, pm, pt) {
    var mu = c.bm * pm, mt = c.bt[0] + c.bt[1] * pt;
    var pe = sig(c.be[0] + c.be[1] * Math.abs(pm) + c.be[2] * (pt - c.Tm)), pw = sig(c.bw * pm);
    var med = mu + c.qm[24], medT = mt + c.qt[24];
    return { mu: mu, mt: mt, pE: pe, pH: pw, pA: 1 - pw, med: med, medT: medT,
      spJ: Math.round(-med * 2) / 2, totJ: Math.round(medT * 2) / 2,
      cover: function (L) { return pmas(c.qm, -L - mu); },   /* el local recibe L: cubre si margen + L > 0 */
      over: function (L) { return pmas(c.qt, L - mt); } };
  }
  function pois(k, l) { var p = Math.exp(-l); for (var j = 1; j <= k; j++) p *= l / j; return p; }
  function nhl(pH, pt) {
    var c = C.nhl, p = Math.min(0.97, Math.max(0.03, pH)), lam = c.f * pt, q = sig(c.c * Math.log(p / (1 - p)));
    var lh = lam * q, la = lam * (1 - q), h = 0, e = 0, a = 0;
    for (var x = 0; x <= 9; x++) for (var y = 0; y <= 9; y++) { var v = pois(x, lh) * pois(y, la); if (x > y) h += v; else if (x < y) a += v; else e += v; }
    var s = h + e + a; h /= s; e /= s; a /= s;
    var p0 = Math.exp(-lam), p1 = p0 * lam, p2 = p1 * lam / 2;
    return { lam: lam, pGol: 1 - p0, pO15: 1 - p0 - p1, pO25: 1 - p0 - p1 - p2, pH: h, pE: e, pA: a, pH2: h / (h + a), pA2: a / (h + a) };
  }
  /* x = {pm: margen esperado del local, pt: total esperado, pH: % de que gane el local} */
  function calc(dep, x) {
    if (!x || !isFinite(x.pt)) return null;
    if (dep === 'nhl') return isFinite(x.pH) ? { dep: dep, p1: nhl(x.pH, x.pt) } : null;
    if (!C[dep] || !isFinite(x.pm)) return null;
    return { dep: dep, q1: tramo(C[dep].q1, x.pm, x.pt), h1: tramo(C[dep].h1, x.pm, x.pt) };
  }

  /* ---------------- pintar ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function pct(p) { return (p * 100).toFixed(1) + '%'; }
  function am(p) { if (!(p > 0 && p < 1)) return '—'; var a = p >= 0.5 ? -100 * p / (1 - p) : 100 * (1 - p) / p; return (a > 0 ? '+' : '') + Math.round(a); }
  function fmtL(L) { return (L > 0 ? '+' : (L < 0 ? '−' : '')) + Math.abs(L).toFixed(1).replace('.0', ''); }
  function fila(t, p, extra) { return '<div class="linea"><span>' + t + '</span><b>' + pct(p) + ' · ' + am(p) + (extra || '') + '</b></div>'; }
  var FUERTE = ' <span style="color:var(--good,#3ddc97)">💪</span>';
  var NOTA = {
    nba: 'Medido en 5,296 juegos (2022–2026) con números que no habían visto esos juegos: cuando decía 65% o más, el favorito ganó el 1er cuarto 73 de cada 100 veces y la 1a mitad 72 de cada 100.',
    nfl: 'Medido en 1,527 juegos (2021–2026) con números que no habían visto esos juegos: cuando decía 65% o más, el favorito ganó la 1a mitad 72 de cada 100 veces (446 juegos). En el 1er cuarto casi nunca pasa de 65% y uno de cada cinco termina empatado.',
    nhl: 'Medido en 4,373 juegos (2023–2026): «hay gol» dijo 82.7% y pasó 82.8%; «más de 1.5» dijo 52.6% y pasó 53.8%. <b>Ojo con el ganador del 1er periodo:</b> es casi una moneda (el favorito lo ganó 56 de cada 100 sin contar empates, y viene bajando cada temporada), no lo trates como pick fuerte.'
  };
  function bloqueTramo(nom, art, t, hAb, aAb, pasoT) {
    var favH = t.pH >= 0.5, pf = favH ? t.pH : t.pA, fav = favH ? hAb : aAb, o = '';
    o += '<h3>' + nom + '</h3><div class="marcadores">' +
      '<div><b>' + pct(pf) + '</b><small>' + esc(fav) + ' gana ' + art + '</small></div>' +
      '<div><b>' + (Math.abs(t.spJ) < 0.5 ? 'Parejo' : esc(fav) + ' ' + fmtL(-Math.abs(t.spJ))) + '</b><small>hándicap justo</small></div>' +
      '<div><b>' + t.totJ.toFixed(1).replace('.0', '') + '</b><small>total justo</small></div></div><div class="lineas" style="margin-top:6px">';
    o += fila(esc(fav) + ' gana ' + art + ' (si empatan, devuelven)', pf, pf >= 0.65 ? FUERTE : '');
    o += fila('Empate ' + (art === 'el 1er cuarto' ? 'en el 1er cuarto' : 'al medio tiempo'), t.pE);
    var b = Math.floor(-t.med) + 0.5; for (var d = -1; d <= 1; d++) { var L = b + d; o += fila(esc(hAb) + ' ' + fmtL(L) + ' en ' + art, t.cover(L)); }
    var bt = Math.floor(t.medT) + 0.5; for (d = -1; d <= 1; d++) { var Lt = bt + d * pasoT; o += fila('Más de ' + Lt + ' en ' + art, t.over(Lt)); }
    return o + '</div>';
  }
  /* devuelve el bloque completo (cadena vacia si falta algun dato) */
  function html(dep, x, hAb, aAb) {
    var r; try { r = calc(dep, x); } catch (e) { r = null; }
    if (!r) return '';
    var o = '<div class="ovaTramos"><h3 style="margin-top:0">⏱️ Por tramos</h3>';
    if (dep === 'nhl') {
      var p = r.p1, favH = p.pH2 >= 0.5, pf = favH ? p.pH2 : p.pA2, fav = favH ? hAb : aAb;
      o += '<div class="marcadores"><div><b>' + pct(p.pGol) + '</b><small>hay gol en el 1er periodo</small></div><div><b>' + pct(p.pO15) + '</b><small>más de 1.5 en el 1P</small></div><div><b>' + p.lam.toFixed(2) + '</b><small>goles esperados 1P</small></div></div>' +
        '<h3>1er periodo: quién lo gana</h3><div class="marcadores"><div><b>' + pct(p.pA) + '</b><small>' + esc(aAb) + '</small></div><div><b>' + pct(p.pE) + '</b><small>empate</small></div><div><b>' + pct(p.pH) + '</b><small>' + esc(hAb) + '</small></div></div>' +
        '<div class="lineas" style="margin-top:6px">' + fila('Hay gol en el 1er periodo', p.pGol) + fila('Sin goles en el 1er periodo', 1 - p.pGol) + fila('Más de 1.5 en el 1er periodo', p.pO15) + fila('Menos de 1.5 en el 1er periodo', 1 - p.pO15) + fila('Más de 2.5 en el 1er periodo', p.pO25) +
        fila(esc(fav) + ' gana el 1P (si empatan, devuelven)', pf) + '</div>';
    } else {
      o += bloqueTramo('1er cuarto', 'el 1er cuarto', r.q1, hAb, aAb, 1) + bloqueTramo('1a mitad', 'la 1a mitad', r.h1, hAb, aAb, dep === 'nba' ? 2 : 1);
    }
    o += '<details class="nota" style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">¿De dónde sale y qué tan confiable es?</summary>' +
      'Cada fila: probabilidad y cuota justa (lo mínimo que te tienen que pagar). Sale de lo que la app ya usa para el juego completo (' + (dep === 'nhl' ? '% de ganar y total de goles' : 'margen y total esperados') + '), convertido al tramo con lo que pasó en juegos reales. No es una ventaja sobre la casa: ella arma estos precios igual. Sirve para saber qué tan probable es cada cosa en ESTE juego y si te la están pagando bien.<br><br>' + NOTA[dep] + '</details></div>';
    return o;
  }
  var API = { calc: calc, html: html, pmas: pmas, C: C };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OVAPeriodos = API;
})(typeof window !== 'undefined' ? window : globalThis);
