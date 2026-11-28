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
  /* ---------- ESPN para MLB: el juego de ESPN (id y equipos) y sus líneas de DraftKings ----------
     La app de MLB usa la API oficial; ESPN da el ganador de apertura y de ahora, el total y los props de jugador. */
  var ESPN = {}, MEMS = {};
  function nick(n) { var w = String(n || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' '), l = w[w.length - 1] || ''; return (l === 'sox' || l === 'jays') && w.length > 1 ? w[w.length - 2] + ' ' + l : l; }
  var amN = function (v) { if (v == null) return null; var n = parseFloat(String(v).replace(/[−–—]/g, '-').replace(/[^0-9.+-]/g, '')); return isFinite(n) && Math.abs(n) >= 100 ? n : null; };
  var blq = function (x) { return x && (x.close || x.current || x.open); };
  function oddsDe(c) {
    var o = c && c.odds && c.odds[0], r = {}; if (!o) return null;
    if (o.moneyline) {
      var h = amN(blq(o.moneyline.home) && blq(o.moneyline.home).odds), a = amN(blq(o.moneyline.away) && blq(o.moneyline.away).odds); if (h && a) { r.mlH = h; r.mlA = a; }
      var oh = o.moneyline.home && o.moneyline.home.open && amN(o.moneyline.home.open.odds), oa = o.moneyline.away && o.moneyline.away.open && amN(o.moneyline.away.open.odds); if (oh && oa) { r.mlHo = oh; r.mlAo = oa; }
    }
    if (o.total) {
      var ov = blq(o.total.over), un = blq(o.total.under), ln = parseFloat(String((ov && ov.line) || (un && un.line) || '').replace(/[^0-9.]/g, ''));
      if (ln > 0) { r.total = ln; var t1 = amN(ov && ov.odds), t2 = amN(un && un.odds); if (t1 && t2) { r.toO = t1; r.toU = t2; } }
    }
    if (r.total === undefined && +o.overUnder > 0) r.total = +o.overUnder;
    return (r.mlH || r.total) ? r : null;
  }
  function diaET(ts) { try { return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, ''); } catch (e) { return ''; } }
  function marcador(f) {
    if (MEMS[f]) return MEMS[f];
    var pr = root.fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=' + f + '&limit=40').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    MEMS[f] = pr; pr.catch(function () { delete MEMS[f]; }); return pr;
  }
  /* el juego de ESPN que corresponde al de la app (mismos equipos; con doble jornada, el más cercano en hora) */
  function buscarEspn(sb, nomA, nomH, ts) {
    var kA = nick(nomA), kH = nick(nomH), mejor = null;
    ((sb && sb.events) || []).forEach(function (e) {
      var c = e.competitions && e.competitions[0]; if (!c) return;
      var h = (c.competitors || []).filter(function (x) { return x.homeAway === 'home'; })[0], a = (c.competitors || []).filter(function (x) { return x.homeAway === 'away'; })[0];
      if (!h || !a || nick(h.team.displayName) !== kH || nick(a.team.displayName) !== kA) return;
      var d = Math.abs(Date.parse(e.date) - ts);
      if (!mejor || d < mejor.d) mejor = { d: d, id: String(e.id), h: String(h.team.id), a: String(a.team.id), hN: h.team.displayName, aN: a.team.displayName, hAb: h.team.abbreviation, aAb: a.team.abbreviation,
        ts: Date.parse(e.date), done: !!(e.status && e.status.type && e.status.type.completed), live: !!(e.status && e.status.type && e.status.type.state === 'in'), odds: oddsDe(c) };
    });
    return mejor;
  }
  function espnDe(el) {
    var d = el && el._d; if (!d || !d.a || !d.h || !root.fetch) return Promise.resolve(null);
    var ts = (d.fecha && d.fecha.getTime) ? d.fecha.getTime() : Date.now(), k = d.a.team.name + '|' + d.h.team.name + '|' + ts;
    if (ESPN[k]) return ESPN[k];
    var f = diaET(ts);
    return (ESPN[k] = marcador(f).then(function (sb) { return buscarEspn(sb, d.a.team.name, d.h.team.name, ts); }).catch(function () { delete ESPN[k]; return null; }));
  }
  /* 🧑 Jugadores de MLB (jugadores.js): props de DraftKings del juego de ESPN; el 💾 guarda en Mis picks de MLB */
  function jugadores(el, pane) {
    if (!pane) return;
    if (!root.OVAJugadores) { pane.innerHTML = '<div class="nota">No se pudo cargar la pestaña de jugadores.</div>'; return; }
    pane.innerHTML = '<div class="estado">Buscando el juego en ESPN…</div>';
    espnDe(el).then(function (m) {
      if (!m) { pane.innerHTML = '<div class="pick no"><b>No encontré este juego en ESPN</b>Sin el juego de ESPN no hay líneas de jugadores. Vuelve a abrir la pestaña más tarde.</div>'; return; }
      var J = root.OVAJugadores, d = el._d;
      J.pintar.guardar = function (x) {
        if (typeof root.regAdd !== 'function') return;
        var f = (function () { try { var t = new Date(m.ts); return t.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); } catch (e) { return ''; } })();
        root.regAdd({ f: f, juego: (d.a.team.abbreviation || m.aAb) + ' @ ' + (d.h.team.abbreviation || m.hAb), m: 'PROP ' + x.seleccion, p: x.prob != null ? Math.round(x.prob * 1000) / 10 : null,
          am: x.cuota, plat: 'book', org: 'jugadores', cierre: null, res: null, ev: x.ev, ath: x.ath, st: x.st, side: x.side, linea: x.linea, pk: el._pk || d.gamePk || null });
        try { if (typeof root.pintarRegistro === 'function') root.pintarRegistro(); } catch (e) { }
      };
      J.pintar(pane, { id: m.id, h: m.h, a: m.a, ts: m.ts, done: m.done, live: m.live }, { n: m.hN, ab: m.hAb }, { n: m.aN, ab: m.aAb }, 'mlb');
    });
  }
  /* cierra un pick PROP de MLB con el boxscore de ESPN → {res:'G'|'P'|'E'} o {why} */
  function resolverProp(p) {
    if (!p || !p.ev || !root.OVAJugadores || !root.fetch) return Promise.resolve({ why: 'pick de jugador sin juego de ESPN' });
    if (p.st === 'tb') return Promise.resolve({ why: 'bases totales: ESPN no trae dobles ni triples, ciérralo a mano' });
    return root.fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=' + p.ev).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (!s) return { why: 'ESPN no respondió' };
      var e = root.OVAJugadores.resolverUno({ ath: p.ath, st: p.st, side: p.side, linea: p.linea }, root.OVAJugadores.leerBox(s, 'mlb'));
      return e === 'ganado' ? { res: 'G' } : (e === 'perdido' ? { res: 'P' } : (e === 'push' ? { res: 'E' } : { why: 'no encontré el dato del jugador' }));
    }).catch(function () { return { why: 'ESPN no respondió' }; });
  }

  /* 📐 Paso a paso (pasoapaso.js) de MLB: el ganador del mercado (Pinnacle o Polymarket) o de OVA; el total es el de OVA
     (el escáner de MLB solo trae el ganador). La tabla contra el juego usa el pitagórico (exponente 1.83). */
  function paso(el, alLlegar) {
    try {
      if (alLlegar && !el._espnPaso) espnDe(el).then(function (m) { if (m && m.odds) { el._espnPaso = m; try { alLlegar(paso(el)); } catch (e) { } } });
      var d = el && el._d, c = el && el._calc; if (!d || !c || !root.OVAPaso) return '<div class="nota">No se pudo armar el paso a paso.</div>';
      cargar();
      var mk = null; try { mk = root.OVAMercado && root.OVAMercado.de ? root.OVAMercado.de(el) : null; } catch (e) { }
      var A = d.a.team, H = d.h.team, ts = (d.fecha && d.fecha.getTime) ? d.fecha.getTime() : Date.now(), F = root.OVAForma;
      var es = el._espnPaso, o = (es && es.odds) || {}, pE = null;
      if (o.mlH && o.mlA) { var ih = o.mlH > 0 ? 100 / (o.mlH + 100) : -o.mlH / (-o.mlH + 100), ia = o.mlA > 0 ? 100 / (o.mlA + 100) : -o.mlA / (-o.mlA + 100); pE = ih / (ih + ia); }
      var pH = mk ? mk.pH : (pE !== null ? pE : +c.pH / 100), T = o.total ? o.total : (isFinite(c.T) ? Math.round(c.T * 2) / 2 : null), pMas = null;
      if (o.total && o.toO && o.toU) { var a1 = o.toO > 0 ? 100 / (o.toO + 100) : -o.toO / (-o.toO + 100), a2 = o.toU > 0 ? 100 / (o.toU + 100) : -o.toU / (-o.toU + 100); pMas = a1 / (a1 + a2); }
      return root.OVAPaso.html({ dep: 'mlb', nL: H.name, nV: A.name, p: pH, sinMercado: !mk && pE === null,
        mkTxt: mk ? (mk.src === 'pred' ? 'Polymarket' + (mk.vivo ? ' (en vivo)' : '') : 'Pinnacle') : (pE !== null ? 'ESPN (DraftKings)' : ''),
        cuotas: (o.mlH && o.mlA) ? { tipo: 'am', v: [o.mlH, o.mlA], casa: 'DraftKings (ESPN)', misma: !mk } : null, abre: (o.mlHo && o.mlAo) ? [o.mlHo, o.mlAo] : null,
        tot: T, totCasa: !!o.total, pMasTot: pMas, modL: isFinite(c.lamHt) ? c.lamHt : null, modV: isFinite(c.lamAt) ? c.lamAt : null,
        fL: GAMES && F ? F.calc(GAMES, String(H.id), ts, true, 'mlb') : null, fV: GAMES && F ? F.calc(GAMES, String(A.id), ts, false, 'mlb') : null });
    } catch (e) { return '<div class="nota">No se pudo armar el paso a paso de este juego.</div>'; }
  }
  function listo() { return !!GAMES; }
  var API = { cargar: cargar, paso: paso, espnDe: espnDe, buscarEspn: buscarEspn, oddsDe: oddsDe, jugadores: jugadores, resolverProp: resolverProp, ctx: ctx, analisis: analisis, bloques: bloques, listo: listo, razonesMlb: razonesMlb, _set: function (j) { GAMES = leer(j); } };
  root.OVAMlbExtra = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  try { if (typeof document !== 'undefined') cargar(); } catch (e) { }
})(typeof window !== 'undefined' ? window : globalThis);
