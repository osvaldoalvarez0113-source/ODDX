/* ===================================================================
   OVA · JUGADORES (props de jugador) — app NBA, pestaña «Jugadores» de cada juego
   Saca de ESPN las líneas de DraftKings por jugador (puntos, rebotes, asistencias, triples y pts+reb+ast),
   les quita el margen de la casa y muestra los 2 jugadores principales de cada equipo con:
     · la probabilidad de cada línea (precio sin margen = lo que mejor predice, medido),
     · cuántas veces la pasó en sus últimos 10 juegos y su promedio de la temporada,
     · «Las 2 jugadas del juego»: las 2 líneas más probables, de jugadores distintos.
   Medición: docs/MEDICION-PROPS-JUGADOR-2026-11.md (109,977 props de NBA): lo que dice el precio pasa casi
   exacto y apostar a ciegas pierde 6-10% por el margen. Aquí NO hay un modelo propio: es el mercado bien leído.
   Los picks guardados (mercado 'PROP') se resuelven solos con el boxscore de ESPN (resolver()).
   Sin DOM en las funciones de cálculo: las usan las pruebas (pruebas.js).
   =================================================================== */
(function (root) {
  'use strict';
  var CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/';
  var SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
  var WEB = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/';
  var CASA = '100'; /* DraftKings en ESPN */
  var TIPOS = [
    { k: 'pts', t: 'Total Points', m: 'Points Milestones', n: 'Puntos', c: 'puntos' },
    { k: 'reb', t: 'Total Rebounds', m: 'Rebounds Milestones', n: 'Rebotes', c: 'rebotes' },
    { k: 'ast', t: 'Total Assists', m: 'Assists Milestones', n: 'Asistencias', c: 'asistencias' },
    { k: 'tri', t: 'Total 3-Point Field Goals', m: '3-Point Field Goals Milestones', n: 'Triples', c: 'triples' },
    { k: 'pra', t: 'Total Points, Rebounds, and Assists', m: 'Points + Assists + Rebounds Milestones', n: 'Pts+Reb+Ast', c: 'pts+reb+ast' }
  ];

  /* ---------------- cálculo (sin DOM) ---------------- */
  function imp(a) { a = +a; if (!isFinite(a) || a === 0) return null; return a > 0 ? 100 / (a + 100) : -a / (-a + 100); }
  function am(p) { if (!(p > 0 && p < 1)) return '—'; var a = p >= 0.5 ? -100 * p / (1 - p) : 100 * (1 - p) / p; return (a > 0 ? '+' : '') + Math.round(a); }
  function idAtleta(it) { var m = /athletes\/(\d+)/.exec((it && it.athlete && it.athlete.$ref) || ''); return m ? m[1] : null; }
  function linea(it) { var v = it && it.current && it.current.target && it.current.target.value; return isFinite(+v) && v !== null ? +v : null; }
  function cuota(it) { var v = it && it.odds && it.odds.american && it.odds.american.value; return isFinite(+v) && +v !== 0 ? +v : null; }

  /* items crudos de propBets → { atleta: { pts:{L,o,u,pO}, reb:…, … } }
     DraftKings manda Más y Menos sin etiqueta. Se reconoce el Más porque cuesta lo mismo que «X+» (X = línea redondeada
     hacia arriba) en los hitos del mismo jugador; si no hay hito, el primero es el Más (comprobado con 3 juegos el 11-nov-2026). */
  function leerProps(items) {
    var g = {};
    (items || []).forEach(function (it) {
      var a = idAtleta(it), t = it && it.type && it.type.name; if (!a || !t) return;
      var k = a + '|' + t; (g[k] = g[k] || []).push(it);
    });
    var out = {};
    TIPOS.forEach(function (T) {
      Object.keys(g).forEach(function (k) {
        var p = k.split('|'); if (p[1] !== T.t) return;
        var a = p[0], fil = g[k].filter(function (it) { return linea(it) !== null && cuota(it) !== null; });
        var porL = {}; fil.forEach(function (it) { var L = linea(it); (porL[L] = porL[L] || []).push(it); });
        var mejor = null;
        Object.keys(porL).forEach(function (Ls) {
          var par = porL[Ls]; if (par.length !== 2) return;
          var L = +Ls, c0 = cuota(par[0]), c1 = cuota(par[1]), o = c0, u = c1;
          var hit = (g[a + '|' + T.m] || []).filter(function (it) { return linea(it) === Math.ceil(L) && cuota(it) !== null; })[0];
          if (hit) { var cm = cuota(hit); if (Math.abs(imp(cm) - imp(c1)) < Math.abs(imp(cm) - imp(c0))) { o = c1; u = c0; } }
          var io = imp(o), iu = imp(u); if (!io || !iu) return;
          var r = { L: L, o: o, u: u, pO: io / (io + iu), vig: io + iu - 1 };
          if (!mejor || Math.abs(r.pO - 0.5) < Math.abs(mejor.pO - 0.5)) mejor = r; /* si hubiera dos líneas, la principal */
        });
        if (mejor) { (out[a] = out[a] || {})[T.k] = mejor; }
      });
    });
    return out;
  }

  /* gamelog de ESPN → juegos de esta temporada, del más nuevo al más viejo: {pts,reb,ast,tri,pra,min} */
  function leerLog(gl) {
    var nm = (gl && gl.names) || [], ix = function (n) { return nm.indexOf(n); };
    var iP = ix('points'), iR = ix('totalRebounds'), iA = ix('assists'), iT = ix('threePointFieldGoalsMade-threePointFieldGoalsAttempted'), iM = ix('minutes');
    if (iP < 0) return [];
    var out = [];
    ((gl && gl.seasonTypes) || []).forEach(function (st) {
      if (/pre.?season|all.?star/i.test(st.displayName || '')) return;
      (st.categories || []).forEach(function (c) {
        if (c.type && c.type !== 'event') return;
        (c.events || []).forEach(function (e) {
          var s = e.stats || [], n = function (i) { var v = parseFloat(String(s[i] == null ? '' : s[i]).split('-')[0]); return isFinite(v) ? v : 0; };
          var x = { id: String(e.eventId || ''), pts: n(iP), reb: n(iR), ast: n(iA), tri: iT >= 0 ? n(iT) : 0, min: iM >= 0 ? n(iM) : 0 };
          x.pra = x.pts + x.reb + x.ast; out.push(x);
        });
      });
    });
    return out;
  }
  /* cuántas veces pasó del lado (O/U) en los últimos n */
  function tasa(log, k, L, lado, n) {
    var l = (log || []).slice(0, n || 10); if (!l.length) return null;
    var h = l.filter(function (x) { return lado === 'O' ? x[k] > L : x[k] < L; }).length;
    return { h: h, n: l.length };
  }
  function prom(log, k) { if (!log || !log.length) return null; return log.reduce(function (s, x) { return s + x[k]; }, 0) / log.length; }

  /* 2 jugadores principales del equipo: los de línea de puntos más alta (sin los que están fuera) */
  function principales(props, ids, fuera) {
    return ids.filter(function (id) { return props[id] && props[id].pts && !(fuera && fuera[id]); })
      .sort(function (a, b) { return props[b].pts.L - props[a].pts.L; }).slice(0, 2);
  }
  /* cada línea con su lado más probable; logs = {id: [juegos]} */
  function candidatas(props, ids, logs) {
    var c = [];
    ids.forEach(function (id) {
      TIPOS.forEach(function (T) {
        var r = props[id] && props[id][T.k]; if (!r) return;
        var lado = r.pO >= 0.5 ? 'O' : 'U', p = lado === 'O' ? r.pO : 1 - r.pO;
        c.push({ id: id, k: T.k, n: T.n, c: T.c, L: r.L, lado: lado, p: p, cuota: lado === 'O' ? r.o : r.u, t: tasa(logs && logs[id], T.k, r.L, lado, 10) });
      });
    });
    return c;
  }
  /* las 2 jugadas del juego: más probables según el precio; si empatan, la que más veces pasó en los últimos 10.
     Nunca dos del mismo jugador. «respaldo» = la pasó 6+ de sus últimos 10 (con al menos 5 juegos). */
  function jugadas(cands) {
    var r = function (x) { return x.t && x.t.n ? x.t.h / x.t.n : 0.5; };
    var l = cands.slice().sort(function (a, b) { return (b.p - a.p) || (r(b) - r(a)); });
    var out = [], usados = {};
    l.forEach(function (x) { if (out.length < 2 && !usados[x.id]) { usados[x.id] = 1; x.respaldo = !!(x.t && x.t.n >= 5 && x.t.h / x.t.n >= 0.6); out.push(x); } });
    return out;
  }
  function valorBox(st, k) { if (!st) return null; return k === 'pra' ? st.pts + st.reb + st.ast : st[k]; }
  /* boxscore del summary → {atleta: {pts,reb,ast,tri,min}} solo de los que jugaron */
  function leerBox(sum) {
    var o = {};
    (((sum && sum.boxscore) || {}).players || []).forEach(function (t) {
      (t.statistics || []).forEach(function (g) {
        var k = g.keys || g.names || [], ix = function (n) { return k.indexOf(n); };
        (g.athletes || []).forEach(function (a) {
          var s = a.stats || []; if (!s.length || a.didNotPlay) return;
          var n = function (i) { var v = parseFloat(String(s[i] == null ? '' : s[i]).split('-')[0]); return isFinite(v) ? v : 0; };
          var x = { pts: n(ix('points')), reb: n(ix('rebounds')), ast: n(ix('assists')), tri: n(ix('threePointFieldGoalsMade-threePointFieldGoalsAttempted')), min: n(ix('minutes')) };
          if (x.min > 0 || x.pts || x.reb || x.ast) o[String(a.athlete && a.athlete.id)] = x;
        });
      });
    });
    return o;
  }
  function resolverUno(p, box) {
    var st = box[String(p.ath)];
    if (!st) return 'push'; /* no jugó: las casas devuelven la apuesta */
    var v = valorBox(st, p.st); if (v === null || !isFinite(v)) return null;
    if (v === p.linea) return 'push';
    return (p.side === 'O' ? v > p.linea : v < p.linea) ? 'ganado' : 'perdido';
  }

  /* ---------------- red (con memoria) ---------------- */
  var MEM = {};
  function getJ(u) {
    if (MEM[u]) return MEM[u];
    var pr = fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    MEM[u] = pr; pr.catch(function () { delete MEM[u]; });
    return pr;
  }
  function bajarProps(ev) {
    var base = CORE + ev + '/competitions/' + ev + '/odds/' + CASA + '/propBets?limit=1000&page=';
    return getJ(base + 1).then(function (r) {
      var items = (r && r.items) || [], pc = Math.min(4, (r && r.pageCount) || 1), m = [];
      for (var pg = 2; pg <= pc; pg++) m.push(getJ(base + pg).then(function (x) { return (x && x.items) || []; }).catch(function () { return []; }));
      return Promise.all(m).then(function (rs) { rs.forEach(function (x) { items = items.concat(x); }); return items; });
    });
  }
  function bajarRoster(tid) {
    return getJ(SITE + 'teams/' + tid + '/roster').then(function (r) {
      return ((r && r.athletes) || []).map(function (a) {
        var est = ((a.injuries || [])[0] || {}).status || '';
        return { id: String(a.id), n: a.displayName || a.fullName || '', s: a.shortName || a.displayName || '', est: est };
      });
    });
  }
  function bajarLog(id) { return getJ(WEB + id + '/gamelog').then(leerLog).catch(function () { return []; }); }

  /* ---------------- pintar ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function pct(p) { return (p * 100).toFixed(0) + '%'; }
  function cTxt(c) { return c > 0 ? '+' + c : '' + c; }
  function ladoTxt(l) { return l === 'O' ? 'Más de' : 'Menos de'; }
  function tTxt(t) { return t && t.n ? t.h + '/' + t.n : '—'; }
  var NOTA = '<details class="nota" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">¿De dónde sale y qué tan confiable es?</summary>' +
    'Las líneas son de <b>DraftKings</b> (vía ESPN) y se actualizan solas. El % es el precio <b>sin el margen de la casa</b>: medido en 109,977 props de NBA, lo que dice ese número pasa casi exacto, así que es la mejor probabilidad que hay. ' +
    '«Últ. 10» es cuántas veces el jugador pasó ese lado en sus últimos 10 juegos y «prom.» su promedio de la temporada: sirven de respaldo, no mejoran el precio. ' +
    '<b>Ojo:</b> en esa misma medición, apostar todas las props perdía 6-10% por el margen (el Menos pierde menos que el Más). Lo más probable no es lo mismo que rentable. ' +
    'Si el jugador no juega, la casa devuelve la apuesta y aquí cuenta como «push».</details>';

  function pintar(pane, g, H, A) {
    pane.innerHTML = '<div class="estado">Cargando líneas de jugadores…</div>';
    var ev = String(g.id);
    Promise.all([bajarProps(ev), bajarRoster(g.h), bajarRoster(g.a)]).then(function (r) {
      var props = leerProps(r[0]), rosH = r[1], rosA = r[2], nom = {}, fuera = {}, est = {};
      rosH.concat(rosA).forEach(function (x) { nom[x.id] = x; est[x.id] = x.est; if (/^out$/i.test(x.est)) fuera[x.id] = 1; });
      var idsH = principales(props, rosH.map(function (x) { return x.id; }), fuera), idsA = principales(props, rosA.map(function (x) { return x.id; }), fuera);
      if (!idsH.length && !idsA.length) {
        pane.innerHTML = '<div class="pick no"><b>Sin líneas de jugadores todavía</b>DraftKings suele publicarlas la mañana del juego. ' + (g.done ? 'Este juego ya terminó.' : (g.live ? 'Con el juego en vivo las quitan.' : 'Vuelve a abrir esta pestaña más tarde.')) + '</div>' + NOTA;
        return;
      }
      var todos = idsA.concat(idsH);
      return Promise.all(todos.map(bajarLog)).then(function (ls) {
        var logs = {}; todos.forEach(function (id, i) { logs[id] = ls[i]; });
        var cands = candidatas(props, todos, logs), top = jugadas(cands);
        var nm = function (id) { return (nom[id] && nom[id].n) || ('Jugador ' + id); };
        var h = '<h3 style="margin-top:0">⭐ Las 2 jugadas del juego</h3>';
        top.forEach(function (x, i) {
          h += '<div class="pick' + (x.respaldo ? '' : ' no') + '"><b>' + esc(nm(x.id)) + ' · ' + ladoTxt(x.lado) + ' ' + x.L + ' ' + x.c + '</b>' +
            pct(x.p) + ' de probabilidad · cuota ' + cTxt(x.cuota) + ' · últ. 10: ' + tTxt(x.t) + (x.respaldo ? ' 💪' : ' (sin respaldo en sus últimos juegos)') +
            ' <button class="btnChico" data-pj="' + i + '" style="margin-left:6px">💾</button></div>';
        });
        [[A, idsA], [H, idsH]].forEach(function (par) {
          var T = par[0], ids = par[1]; if (!ids.length) return;
          h += '<h3>' + esc(T.n || T.ab) + '</h3>';
          ids.forEach(function (id) {
            var lg = logs[id], e = est[id];
            h += '<div class="nota" style="margin:8px 0 4px"><b style="color:var(--txt)">' + esc(nm(id)) + '</b>' + (e ? ' · <span style="color:var(--bad,#f87171)">⚠️ ' + esc(e) + '</span>' : '') + (lg && lg.length ? ' · ' + lg.length + ' juegos esta temporada' : '') + '</div><div class="lineas">';
            TIPOS.forEach(function (Tp) {
              var q = props[id][Tp.k]; if (!q) return;
              var lado = q.pO >= 0.5 ? 'O' : 'U', p = lado === 'O' ? q.pO : 1 - q.pO, pr = prom(lg, Tp.k), t = tasa(lg, Tp.k, q.L, lado, 10);
              h += '<div class="linea"><span>' + Tp.n + ' ' + q.L + '<br><small style="color:var(--mut2,var(--mut))">Más ' + cTxt(q.o) + ' · Menos ' + cTxt(q.u) + (pr !== null ? ' · prom. ' + pr.toFixed(1) : '') + '</small></span>' +
                '<b>' + (lado === 'O' ? 'Más' : 'Menos') + ' ' + pct(p) + '<br><small style="font-weight:400;color:var(--mut)">últ. 10: ' + tTxt(t) + '</small></b></div>';
            });
            h += '</div>';
          });
        });
        h += NOTA;
        pane.innerHTML = h;
        pane.querySelectorAll('[data-pj]').forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation(); var x = top[+b.dataset.pj];
            if (typeof root.guardarPick !== 'function') return;
            root.guardarPick({ hId: g.h, aId: g.a, hN: H.n, aN: A.n, ts: g.ts, mercado: 'PROP', side: x.lado, linea: x.L,
              seleccion: nm(x.id) + ' ' + ladoTxt(x.lado) + ' ' + x.L + ' ' + x.c, cuota: x.cuota, prob: x.p, ev: ev, ath: x.id, st: x.k });
            b.textContent = '✓'; b.disabled = true;
          };
        });
      });
    }).catch(function () {
      pane.innerHTML = '<div class="pick no"><b>ESPN no respondió</b>No se pudieron bajar las líneas de jugadores ahora mismo. Cierra y vuelve a abrir esta pestaña.</div>';
      delete pane.dataset.c;
    });
  }

  /* resuelve los picks 'PROP' pendientes con el boxscore; devuelve true si cambió algo */
  function resolver(regGet, regSet) {
    var a = regGet(), pend = a.filter(function (p) { return p.mercado === 'PROP' && p.estado === 'pendiente' && p.ev && p.ts < Date.now() - 2.5 * 3600e3; });
    if (!pend.length) return Promise.resolve(false);
    var evs = {}; pend.forEach(function (p) { evs[p.ev] = 1; });
    return Promise.all(Object.keys(evs).map(function (ev) {
      return fetch(SITE + 'summary?event=' + ev).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (s) {
        var c = s && s.header && s.header.competitions && s.header.competitions[0], st = c && c.status && c.status.type;
        return { ev: ev, fin: !!(st && st.completed), box: s ? leerBox(s) : {} };
      });
    })).then(function (rs) {
      var cambio = false, m = {}; rs.forEach(function (x) { m[x.ev] = x; });
      pend.forEach(function (p) { var x = m[p.ev]; if (!x || !x.fin) return; var e = resolverUno(p, x.box); if (e) { p.estado = e; cambio = true; } });
      if (cambio) regSet(a);
      return cambio;
    });
  }

  var API = { leerProps: leerProps, leerLog: leerLog, tasa: tasa, prom: prom, principales: principales, candidatas: candidatas, jugadas: jugadas,
    leerBox: leerBox, resolverUno: resolverUno, imp: imp, am: am, TIPOS: TIPOS, pintar: pintar, resolver: resolver };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OVAJugadores = API;
})(typeof window !== 'undefined' ? window : globalThis);
