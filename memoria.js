/* ===================================================================
   OVA · MEMORIA POR EQUIPO (window.OVAMemEquipo) — NBA, NHL, NFL, fútbol y tenis
   Lo que la app recuerda de cada equipo en la temporada, juego por juego:
     · cómo responde cuando entra de FAVORITO (récord) y cuando entra de NO FAVORITO (cuántas sorpresas da),
     · si gana más o menos de lo que se esperaba de él antes de cada juego.
   «Favorito» y «lo esperado» salen de un rating de resultados (tipo Elo) que se recorre en orden, cada juego solo con lo
   anterior: no mira el futuro. No es el modelo de la app ni el mercado (de esos no hay historial juego por juego).
   En tenis la memoria (12 meses) viene hecha del robot (ratings-tenis.json, campo «memoria»).
   Sale de los partidos que cada app ya tiene: no baja nada y NO cambia ningún número ni pick. Lo usa El análisis (analista.js).
   =================================================================== */
(function (root) {
  'use strict';
  /* K = cuánto aprende de cada juego · H = ventaja de local (puntos Elo) · reg = cuánto vuelve al promedio al cambiar de temporada */
  var CFG = { mlb: { K: 4, H: 24, reg: 0.33 }, nba: { K: 20, H: 70, reg: 0.25 }, nhl: { K: 10, H: 35, reg: 0.35 }, nfl: { K: 25, H: 50, reg: 0.33 }, fut: { K: 20, H: 65, reg: 0.3 } };
  function pElo(d) { return 1 / (1 + Math.pow(10, -d / 400)); }
  /* games = [{h, a, hs, as, ts, neutral}] terminados (cualquier orden). Devuelve {id: {fav:{n,w}, dog:{n,w}, n, w, esp}} de la temporada de ts, antes de ts. */
  function calc(games, ts, dep) {
    var c = CFG[dep] || CFG.nba, F = root.OVAForma, ini = F ? F.inicioTemp(ts, dep) : 0, R = {}, M = {}, temp = null;
    var l = (games || []).filter(function (x) { return x && x.ts < ts && isFinite(x.hs) && isFinite(x.as) && x.hs !== null && x.as !== null && x.done !== false && !x.skip; })
      .sort(function (a, b) { return a.ts - b.ts; });
    function m(id) { return M[id] || (M[id] = { fav: { n: 0, w: 0 }, dog: { n: 0, w: 0 }, n: 0, w: 0, esp: 0 }); }
    l.forEach(function (g) {
      var t = F ? F.inicioTemp(g.ts, dep) : 0;
      if (temp !== null && t !== temp) Object.keys(R).forEach(function (k) { R[k] = 1500 + (R[k] - 1500) * (1 - c.reg); });
      temp = t;
      var rh = R[g.h] === undefined ? 1500 : R[g.h], ra = R[g.a] === undefined ? 1500 : R[g.a];
      var pH = pElo(rh - ra + (g.neutral ? 0 : c.H)), res = g.hs > g.as ? 1 : (g.hs < g.as ? 0 : 0.5);
      if (g.ts >= ini) {
        [[g.h, pH, res], [g.a, 1 - pH, 1 - res]].forEach(function (z) {
          var o = m(z[0]), gano = z[2] === 1 ? 1 : 0, lado = z[1] >= 0.5 ? o.fav : o.dog;
          lado.n++; lado.w += gano; o.n++; o.w += gano; o.esp += z[1];
        });
      }
      R[g.h] = rh + c.K * (res - pH); R[g.a] = ra - c.K * (res - pH);
    });
    return M;
  }
  /* tenis: [favN, favW, dogN, dogW, esperadas×10, victorias] del robot */
  function deTenis(a) {
    if (!a || a.length < 6) return null;
    return { fav: { n: a[0], w: a[1] }, dog: { n: a[2], w: a[3] }, n: a[0] + a[2], w: a[5], esp: a[4] / 10 };
  }
  /* cuánto tiene que pasarse de lo esperado para mencionarlo */
  var DIF = { mlb: 4, nba: 2.5, nhl: 2.5, nfl: 1.5, fut: 2, tenis: 3 };
  /* cortes por deporte (el favorito normal gana ~66% en NBA y NFL, ~58% en NHL, ~50% en fútbol a 3 resultados, ~70% en tenis):
     [le cuesta de favorito si gana ≤, cumple si gana ≥, el no favorito sorprende si gana ≥] */
  var CORTES = { mlb: [0.45, 0.70, 0.50], nba: [0.5, 0.8, 0.45], nhl: [0.45, 0.72, 0.5], nfl: [0.5, 0.8, 0.45], fut: [0.42, 0.72, 0.35], tenis: [0.55, 0.85, 0.45] };
  /* razones para El análisis: [peso, texto] a favor del favorito y en contra */
  function razones(mF, mR, fav, riv, dep, esc) {
    var k = CORTES[dep] || CORTES.nba, a = [], c = [], F = '<b class="anN">' + esc(fav) + '</b>', R = '<b class="anN">' + esc(riv) + '</b>', d = DIF[dep] || 2.5, emp = dep === 'fut' ? ' (el empate cuenta como no ganó)' : '';
    var rec = function (x) { return x.w + '-' + (x.n - x.w); };
    if (mF && mF.fav.n >= 5) {
      var pf = mF.fav.w / mF.fav.n;
      if (pf >= k[1]) a.push([0.9, 'cuando entra de favorito cumple: ' + F + ' va ' + rec(mF.fav) + ' en ese papel esta temporada']);
      else if (pf <= k[0]) c.push([1.1, 'de favorito le cuesta: ' + F + ' va ' + rec(mF.fav) + ' en ese papel esta temporada' + emp]);
    }
    if (mR && mR.dog.n >= 5) {
      var pd = mR.dog.w / mR.dog.n;
      if (pd >= k[2]) c.push([1.0, R + ' da sorpresas: de no favorito ganó ' + mR.dog.w + ' de ' + mR.dog.n]);
      else if (pd <= 0.15 && mR.dog.n >= 6) a.push([0.7, R + ' casi nunca sorprende: de no favorito ganó ' + mR.dog.w + ' de ' + mR.dog.n]);
    }
    if (mF && mF.n >= 6) { var dF = mF.w - mF.esp; if (dF >= d) a.push([0.5, F + ' está ganando más de lo esperado (' + mF.w + ' victorias, se esperaban ' + mF.esp.toFixed(0) + ')']); else if (dF <= -d) c.push([0.5, F + ' está ganando menos de lo esperado (' + mF.w + ' victorias, se esperaban ' + mF.esp.toFixed(0) + ')']); }
    if (mR && mR.n >= 6) { var dR = mR.w - mR.esp; if (dR >= d) c.push([0.5, R + ' está ganando más de lo esperado (' + mR.w + ', se esperaban ' + mR.esp.toFixed(0) + ')']); else if (dR <= -d) a.push([0.4, R + ' está ganando menos de lo esperado (' + mR.w + ', se esperaban ' + mR.esp.toFixed(0) + ')']); }
    a.forEach(function (x) { x[2] = 'mem'; }); c.forEach(function (x) { x[2] = 'mem'; });   /* 'mem' = contexto: no mueve la confianza */
    return { a: a, c: c };
  }
  /* una línea por equipo para el bloque «Memoria de la temporada» */
  function linea(m, n, dep, esc) {
    if (!m || m.n < 3) return '<b class="anN">' + esc(n) + '</b>: todavía pocos ' + (dep === 'fut' || dep === 'tenis' ? 'partidos' : 'juegos') + '.';
    var r = function (x) { return x.n ? x.w + '-' + (x.n - x.w) : '—'; }, df = m.w - m.esp;
    return '<b class="anN">' + esc(n) + '</b>: de favorito ' + r(m.fav) + ' · de no favorito ' + r(m.dog) + ' · ' + (Math.abs(df) < 1 ? 'gana lo esperado' : (df > 0 ? 'gana ' + df.toFixed(1) + ' más de lo esperado' : 'gana ' + Math.abs(df).toFixed(1) + ' menos de lo esperado')) + '.';
  }
  var API = { calc: calc, deTenis: deTenis, razones: razones, linea: linea, CFG: CFG, pElo: pElo };
  root.OVAMemEquipo = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
