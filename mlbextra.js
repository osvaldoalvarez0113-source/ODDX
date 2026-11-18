/* ===================================================================
   OVA · MLB: lo que ya tenían NBA, NHL, NFL, fútbol y tenis (window.OVAMlbExtra)
   · 🧠 El análisis (analista.js) con razones de béisbol: abridores, bullpen quemado, muestra corta, juego de bullpen.
   · 🗂️ Memoria de la temporada (memoria.js) · Cómo vienen jugando (forma.js) · Observaciones (observaciones.js).
   Los marcadores de la temporada salen de hist-mlb.json (robot scripts/archivo_mlb.js, API oficial de la MLB, mismos ids
   de equipo que index.html). Lo pinta pinnacle.js dentro del Veredicto. No cambia ningún número ni pick.
   =================================================================== */
(function (root) {
  'use strict';
  var GAMES = null, TEAMS = {}, cargando = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function leer(j) {
    if (!j || !j.g) return null;
    TEAMS = j.teams || {};
    return j.g.map(function (r) { return { id: r[0], ts: r[1], h: String(r[2]), a: String(r[3]), hs: r[4], as: r[5] }; });
  }
  function cargar() {
    if (GAMES || cargando || !root.fetch) return;
    cargando = true;
    root.fetch('hist-mlb.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      GAMES = leer(j); cargando = false;
      try { if (GAMES && root.OVAMercado && root.OVAMercado.repintar) root.OVAMercado.repintar(); } catch (e) { }
    }).catch(function () { cargando = false; });
  }
  /* ERA que de verdad usa la fórmula para el abridor (función de index.html) */
  function era(se, l5) { try { return typeof root.eraUsado === 'function' ? root.eraUsado(se, l5) : (se && se.era); } catch (e) { return null; } }
  function quemado(q) { return !!(q && ((q.seguidos && q.seguidos.length >= 2) || (q.ayer && q.ayer.length >= 3))); }

  /* razones propias del béisbol, del lado del favorito: [peso, texto, clave] */
  function razonesMlb(d, favA, F, R) {
    var a = [], c = [];
    var pF = favA ? d.pa : d.ph, pR = favA ? d.ph : d.pa, eF = favA ? era(d.sea, d.l5a) : era(d.seh, d.l5h), eR = favA ? era(d.seh, d.l5h) : era(d.sea, d.l5a);
    var nb = function (p) { return '<b class="anN">' + esc((p && p.fullName) || 'su abridor') + '</b>'; };
    if (isFinite(eF) && isFinite(eR)) {
      if (eR - eF >= 1) a.push([1.3, 'abre ' + nb(pF) + ' (ERA ' + eF.toFixed(2) + ') contra ' + nb(pR) + ' (ERA ' + eR.toFixed(2) + ')']);
      else if (eF - eR >= 1) c.push([1.3, 'el abridor de ' + F + ', ' + nb(pF) + ', viene peor (ERA ' + eF.toFixed(2) + ' contra ' + eR.toFixed(2) + ' de ' + nb(pR) + ')']);
    }
    var qF = favA ? d.qa : d.qh, qR = favA ? d.qh : d.qa;
    if (quemado(qF) && quemado(qR)) { /* se empareja: lo dice la nota */ }
    else if (quemado(qF)) c.push([1.0, 'el bullpen de ' + F + ' viene quemado (relevistas que tiraron días seguidos)', 'bull']);
    else if (quemado(qR)) a.push([0.9, 'el bullpen de ' + R + ' viene quemado (relevistas que tiraron días seguidos)', 'bull']);
    var sF = favA ? d.sea : d.seh;
    if (sF && sF.ip != null && sF.ip < 20) c.push([0.7, nb(pF) + ' lleva muy pocos innings esta temporada (' + Math.round(sF.ip) + '): su número es poco confiable']);
    return { a: a, c: c, ambosQuemados: quemado(qF) && quemado(qR) };
  }
  /* ctx para OVAAnalista. el = tarjeta del juego (el._d, el._calc) · mk = mercado sin margen {pA, pH} o null */
  function ctx(el, mk, bullpenJuego) {
    var d = el && el._d, c = el && el._calc; if (!d || !c) return null;
    cargar();
    var ovaA = +c.pA / 100, ovaH = +c.pH / 100, pA = mk ? mk.pA : ovaA, pH = mk ? mk.pH : ovaH, favA = pA > pH;
    var A = d.a.team, H = d.h.team, ts = (d.fecha && d.fecha.getTime) ? d.fecha.getTime() : Date.now(), idA = String(A.id), idH = String(H.id);
    var F = root.OVAForma, fA = null, fH = null, mem = null, ac = null;
    if (GAMES) {
      try { if (F) { fA = F.calc(GAMES, idA, ts, false, 'mlb'); fH = F.calc(GAMES, idH, ts, true, 'mlb'); } } catch (e) { }
      try { if (root.OVAMemEquipo) mem = root.OVAMemEquipo.calc(GAMES, ts, 'mlb'); } catch (e) { }
    }
    try { if (root.OVAAciertos) ac = root.OVAAciertos.fila('mlb', Math.max(pA, pH), !favA, !!mk); } catch (e) { }
    var anA = root.OVAAnalista, nm = function (t) { return t.name || t.abbreviation || ''; };
    var Fb = '<b class="anN">' + esc(favA ? (A.teamName || nm(A)) : (H.teamName || nm(H))) + '</b>', Rb = '<b class="anN">' + esc(favA ? (H.teamName || nm(H)) : (A.teamName || nm(A))) + '</b>';
    var rz = razonesMlb(d, favA, Fb, Rb), alert = rz.c.slice(), af = rz.a.slice();
    if (bullpenJuego) alert.push([1.0, 'juego de bullpen: el abridor casi no lanzará y el número de OVA depende de él']);
    var nota = rz.ambosQuemados ? 'Los dos bullpens vienen quemados: se empareja.' : '';
    var poco = !!((d.l5a && d.l5a.n < 5) || (d.l5h && d.l5h.n < 5) || (d.sea && d.sea.ip < 20) || (d.seh && d.seh.ip < 20));
    return { dep: 'mlb', fav: nm(favA ? A : H), riv: nm(favA ? H : A), favLocal: !favA, p: Math.max(pA, pH), merc: !!mk,
      pMod: mk ? (favA ? ovaA : ovaH) : null, vivo: !!(mk && mk.vivo), ac: ac, fF: favA ? fA : fH, fR: favA ? fH : fA, mov: null,
      alertas: alert, aFavor: af, poco: poco, nota: nota, bajasFav: [], bajasRiv: [],
      memFav: mem ? mem[favA ? idA : idH] : null, memRiv: mem ? mem[favA ? idH : idA] : null };
  }
  function analisis(el, mk, bullpenJuego) {
    try { var c = ctx(el, mk, bullpenJuego); return c && root.OVAAnalista ? root.OVAAnalista.html(c) : ''; } catch (e) { return ''; }
  }
  /* «Cómo vienen jugando» + «Observaciones» (van debajo de Qué tan confiable es) */
  function bloques(el, mk) {
    var d = el && el._d, c = el && el._calc; if (!d || !c || !GAMES) return '';
    var A = d.a.team, H = d.h.team, ts = (d.fecha && d.fecha.getTime) ? d.fecha.getTime() : Date.now();
    var g = { h: String(H.id), a: String(A.id), ts: ts }, pH = mk ? mk.pH : +c.pH / 100, o = '';
    var logo = function (id) { return 'https://www.mlbstatic.com/team-logos/' + id + '.svg'; };
    try { if (root.OVAForma) o += root.OVAForma.html(GAMES, g, { n: H.name }, { n: A.name }, pH, 'mlb'); } catch (e) { }
    try { if (root.OVAObs) o += root.OVAObs.html(GAMES, g, { n: H.name, logo: logo(H.id) }, { n: A.name, logo: logo(A.id) }, 'mlb'); } catch (e) { }
    return o;
  }
  function listo() { return !!GAMES; }
  var API = { cargar: cargar, ctx: ctx, analisis: analisis, bloques: bloques, listo: listo, razonesMlb: razonesMlb, _set: function (j) { GAMES = leer(j); } };
  root.OVAMlbExtra = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  try { if (typeof document !== 'undefined') cargar(); } catch (e) { }
})(typeof window !== 'undefined' ? window : globalThis);
