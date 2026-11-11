/* ===================================================================
   OVA · JUGADORES (props de jugador) — pestaña «Jugadores» de cada juego en NBA, NHL y NFL
   Saca de ESPN las líneas de DraftKings por jugador, les quita el margen de la casa y muestra los 2 jugadores
   principales de cada equipo con:
     · la probabilidad de cada línea (precio sin margen = lo que mejor predice, medido),
     · cuántas veces la pasó en sus últimos juegos y su promedio de la temporada,
     · «Las 2 jugadas del juego»: las 2 líneas más probables, de jugadores distintos (sin las de cuota peor que −250).
   NBA: puntos, rebotes, asistencias, triples, pts+reb+ast · NHL: puntos, asistencias, tiros a puerta (y atajadas)
   NFL: yardas de pase / carrera / recepción, pases de TD y recepciones. En la NFL ESPN trae la línea pero NO el precio:
   ahí la jugada sale solo del historial del jugador y se avisa.
   Fútbol no tiene: ESPN/DraftKings no publica líneas por jugador (solo de equipo). MLB queda para cuando haya temporada.
   Medición: docs/MEDICION-PROPS-JUGADOR-2026-11.md (NBA 109,977 props · NHL 120,768 · NFL 12,232): lo que dice el precio
   pasa casi exacto y apostar a ciegas pierde por el margen. Aquí NO hay un modelo propio: es el mercado bien leído.
   Los picks guardados (mercado 'PROP') se resuelven solos con el boxscore de ESPN (resolver()).
   Sin DOM en las funciones de cálculo: las usan las pruebas (pruebas.js).
   =================================================================== */
(function (root) {
  'use strict';
  var CASA = '100'; /* DraftKings en ESPN */
  var TOPE = 0.72;  /* «las 2 jugadas» no incluyen líneas de más de 72% (cuota peor que −250): casi no pagan */
  var z = function (v) { return isFinite(v) ? v : 0; };
  var OT = ' (incl. overtime)';
  /* t = nombre del mercado en ESPN · m = sus «hitos» (X+) · log(s) = valor en el gamelog · box(b) = valor en el boxscore */
  var DEPS = {
    nba: { sp: 'basketball', lg: 'nba', medido: '109,977 props de NBA', tipos: [
      { k: 'pts', t: 'Total Points', m: 'Points Milestones', n: 'Puntos', c: 'puntos', log: function (s) { return s.points; }, box: function (b) { return z(b.points); } },
      { k: 'reb', t: 'Total Rebounds', m: 'Rebounds Milestones', n: 'Rebotes', c: 'rebotes', log: function (s) { return s.totalRebounds; }, box: function (b) { return z(b.rebounds); } },
      { k: 'ast', t: 'Total Assists', m: 'Assists Milestones', n: 'Asistencias', c: 'asistencias', log: function (s) { return s.assists; }, box: function (b) { return z(b.assists); } },
      { k: 'tri', t: 'Total 3-Point Field Goals', m: '3-Point Field Goals Milestones', n: 'Triples', c: 'triples', log: function (s) { return z(s['threePointFieldGoalsMade-threePointFieldGoalsAttempted']); }, box: function (b) { return z(b['threePointFieldGoalsMade-threePointFieldGoalsAttempted']); } },
      { k: 'pra', t: 'Total Points, Rebounds, and Assists', m: 'Points + Assists + Rebounds Milestones', n: 'Pts+Reb+Ast', c: 'pts+reb+ast', log: function (s) { return s.points + s.totalRebounds + s.assists; }, box: function (b) { return z(b.points) + z(b.rebounds) + z(b.assists); } }],
      elegir: function (P, ids) { return ids.filter(function (i) { return P[i].pts; }).sort(function (a, b) { return P[b].pts.L - P[a].pts.L; }).slice(0, 2); } },
    nhl: { sp: 'hockey', lg: 'nhl', medido: '120,768 props de NHL', tipos: [
      { k: 'pts', t: 'Total Points', m: 'Points Milestones', n: 'Puntos (gol o asistencia)', c: 'puntos', log: function (s) { return s.points; }, box: function (b) { return z(b.goals) + z(b.assists); } },
      { k: 'ast', t: 'Total Assists', m: 'Assists Milestones', n: 'Asistencias', c: 'asistencias', log: function (s) { return s.assists; }, box: function (b) { return z(b.assists); } },
      { k: 'sog', t: 'Total Shots on Goal', m: 'Shots on Goal Milestones', n: 'Tiros a puerta', c: 'tiros a puerta', log: function (s) { return s.shotsTotal; }, box: function (b) { return z(b.shotsTotal); } },
      { k: 'sav', t: 'Total Saves', m: 'Goalkeeper Saves Milestones', n: 'Atajadas', c: 'atajadas', log: function (s) { return s.saves; }, box: function (b) { return z(b.saves); } }],
      elegir: function (P, ids) { return ids.filter(function (i) { return P[i].pts; }).sort(function (a, b) { return (P[b].pts.L - P[a].pts.L) || (z(P[b].pts.pO) - z(P[a].pts.pO)); }).slice(0, 2); } },
    nfl: { sp: 'football', lg: 'nfl', medido: '12,232 props de NFL', tipos: [
      { k: 'pyd', t: 'Total Passing Yards' + OT, m: 'Passing Yards Milestones', n: 'Yardas de pase', c: 'yardas de pase', log: function (s) { return s.passingYards; }, box: function (b) { return z(b.passingYards); } },
      { k: 'ptd', t: 'Total Passing Touchdowns' + OT, m: 'Passing Touchdown Milestones', n: 'Pases de touchdown', c: 'pases de TD', log: function (s) { return s.passingTouchdowns; }, box: function (b) { return z(b.passingTouchdowns); } },
      { k: 'ryd', t: 'Total Rushing Yards' + OT, m: 'Rushing Yards Milestones', n: 'Yardas por tierra', c: 'yardas por tierra', log: function (s) { return s.rushingYards; }, box: function (b) { return z(b.rushingYards); } },
      { k: 'cyd', t: 'Total Receiving Yards' + OT, m: 'Receiving Yards Milestones', n: 'Yardas de recepción', c: 'yardas de recepción', log: function (s) { return s.receivingYards; }, box: function (b) { return z(b.receivingYards); } },
      { k: 'rec', t: 'Total Receptions' + OT, m: 'Receptions Milestones', n: 'Recepciones', c: 'recepciones', log: function (s) { return s.receptions; }, box: function (b) { return z(b.receptions); } }],
      /* el mariscal + el de más yardas esperadas entre corredores y receptores */
      elegir: function (P, ids) {
        var qb = ids.filter(function (i) { return P[i].pyd; }).sort(function (a, b) { return P[b].pyd.L - P[a].pyd.L; })[0];
        var yd = function (i) { return Math.max(P[i].ryd ? P[i].ryd.L : 0, P[i].cyd ? P[i].cyd.L : 0); };
        var ot = ids.filter(function (i) { return !P[i].pyd && yd(i) > 0; }).sort(function (a, b) { return yd(b) - yd(a); })[0];
        return [qb, ot].filter(Boolean);
      } }
  };
  function D(dep) { return DEPS[dep] || DEPS.nba; }
  var TIPOS = DEPS.nba.tipos;

  /* ---------------- cálculo (sin DOM) ---------------- */
  function imp(a) { a = +a; if (!isFinite(a) || a === 0) return null; return a > 0 ? 100 / (a + 100) : -a / (-a + 100); }
  function am(p) { if (!(p > 0 && p < 1)) return '—'; var a = p >= 0.5 ? -100 * p / (1 - p) : 100 * (1 - p) / p; return (a > 0 ? '+' : '') + Math.round(a); }
  function idAtleta(it) { var m = /athletes\/(\d+)/.exec((it && it.athlete && it.athlete.$ref) || ''); return m ? m[1] : null; }
  function linea(it) { var v = it && it.current && it.current.target && it.current.target.value; return isFinite(+v) && v !== null && v !== undefined ? +v : null; }
  function cuota(it) { var v = it && it.odds && it.odds.american && it.odds.american.value; return isFinite(+v) && +v !== 0 ? +v : null; }
  function num(v) { var m = /^-?\d+(\.\d+)?/.exec(String(v == null ? '' : v)); return m ? parseFloat(m[0]) : NaN; }

  /* items crudos de propBets → { atleta: { pts:{L,o,u,pO}, … } }   (pO = null cuando ESPN no trae precio: pasa en la NFL)
     DraftKings manda Más y Menos sin etiqueta. Se reconoce el Más porque cuesta lo mismo que «X+» (X = línea redondeada
     hacia arriba) en los hitos del mismo jugador; si no hay hito, el primero es el Más (comprobado con juegos reales). */
  function leerProps(items, dep) {
    var g = {};
    (items || []).forEach(function (it) {
      var a = idAtleta(it), t = it && it.type && it.type.name; if (!a || !t) return;
      var k = a + '|' + t; (g[k] = g[k] || []).push(it);
    });
    var out = {};
    D(dep).tipos.forEach(function (T) {
      Object.keys(g).forEach(function (k) {
        var p = k.split('|'); if (p[1] !== T.t) return;
        var a = p[0], fil = g[k].filter(function (it) { return linea(it) !== null; });
        var porL = {}; fil.forEach(function (it) { var L = linea(it); (porL[L] = porL[L] || []).push(it); });
        var mejor = null;
        Object.keys(porL).forEach(function (Ls) {
          var par = porL[Ls], L = +Ls, r;
          var con = par.filter(function (it) { return cuota(it) !== null; });
          if (con.length === 2) {
            var c0 = cuota(con[0]), c1 = cuota(con[1]), o = c0, u = c1;
            var hit = (g[a + '|' + T.m] || []).filter(function (it) { return linea(it) === Math.ceil(L) && cuota(it) !== null; })[0];
            if (hit) { var cm = cuota(hit); if (Math.abs(imp(cm) - imp(c1)) < Math.abs(imp(cm) - imp(c0))) { o = c1; u = c0; } }
            var io = imp(o), iu = imp(u); if (!io || !iu) return;
            r = { L: L, o: o, u: u, pO: io / (io + iu), vig: io + iu - 1 };
          } else if (!con.length && par.length >= 1) r = { L: L, o: null, u: null, pO: null, vig: null };
          else return;
          if (!mejor || (mejor.pO === null && r.pO !== null) || (mejor.pO !== null && r.pO !== null && Math.abs(r.pO - 0.5) < Math.abs(mejor.pO - 0.5))) mejor = r; /* si hubiera dos líneas, la principal */
        });
        if (mejor) { (out[a] = out[a] || {})[T.k] = mejor; }
      });
    });
    return out;
  }

  /* gamelog de ESPN → juegos de esta temporada, del más nuevo al más viejo; cada uno con el valor de cada mercado (o null) */
  function leerLog(gl, dep) {
    var nm = (gl && gl.names) || [], tipos = D(dep).tipos;
    if (!nm.length) return [];
    var out = [];
    ((gl && gl.seasonTypes) || []).forEach(function (st) {
      if (/pre.?season|all.?star|spring|exhibition/i.test(st.displayName || '')) return;
      (st.categories || []).forEach(function (c) {
        if (c.type && c.type !== 'event') return;
        (c.events || []).forEach(function (e) {
          var s = {}; (e.stats || []).forEach(function (v, i) { if (nm[i]) s[nm[i]] = num(v); });
          var x = { id: String(e.eventId || ''), min: z(s.minutes) };
          tipos.forEach(function (T) { var v; try { v = T.log(s); } catch (er) { v = NaN; } x[T.k] = isFinite(v) ? v : null; });
          out.push(x);
        });
      });
    });
    return out;
  }
  /* cuántas veces pasó del lado (O/U) en los últimos n (solo juegos con ese dato) */
  function tasa(log, k, L, lado, n) {
    var l = (log || []).filter(function (x) { return x[k] !== null && x[k] !== undefined; }).slice(0, n || 10); if (!l.length) return null;
    var h = l.filter(function (x) { return lado === 'O' ? x[k] > L : x[k] < L; }).length;
    return { h: h, n: l.length };
  }
  function prom(log, k) { var l = (log || []).filter(function (x) { return x[k] !== null && x[k] !== undefined; }); if (!l.length) return null; return l.reduce(function (s, x) { return s + x[k]; }, 0) / l.length; }

  /* 2 jugadores principales del equipo (sin los que están fuera); cada deporte elige a su manera */
  function principales(props, ids, fuera, dep) {
    return D(dep).elegir(props, ids.filter(function (id) { return props[id] && !(fuera && fuera[id]); }));
  }
  /* cada línea con su lado más probable; logs = {id: [juegos]}. Sin precio, el lado sale del historial (p = null) */
  function candidatas(props, ids, logs, dep) {
    var c = [];
    ids.forEach(function (id) {
      D(dep).tipos.forEach(function (T) {
        var r = props[id] && props[id][T.k]; if (!r) return;
        var lg = logs && logs[id], lado, p = null, t;
        if (r.pO !== null) { lado = r.pO >= 0.5 ? 'O' : 'U'; p = lado === 'O' ? r.pO : 1 - r.pO; t = tasa(lg, T.k, r.L, lado, 10); }
        else { var tO = tasa(lg, T.k, r.L, 'O', 10); if (!tO) return; lado = tO.h / tO.n >= 0.5 ? 'O' : 'U'; t = lado === 'O' ? tO : tasa(lg, T.k, r.L, 'U', 10); }
        c.push({ id: id, k: T.k, n: T.n, c: T.c, L: r.L, lado: lado, p: p, cuota: p === null ? null : (lado === 'O' ? r.o : r.u), t: t });
      });
    });
    return c;
  }
  /* las 2 jugadas del juego: más probables según el precio (hasta 72%); si empatan, la que más veces pasó.
     Sin precio: la que más veces pasó (con 4+ juegos). Nunca dos del mismo jugador. «respaldo» = la pasó 6+ de cada 10 (5+ juegos). */
  function jugadas(cands) {
    var r = function (x) { return x.t && x.t.n ? x.t.h / x.t.n : 0.5; };
    var s = function (x) { return x.p !== null ? x.p : (x.t.h + 1) / (x.t.n + 2); };
    var l = cands.filter(function (x) { return x.p !== null ? x.p <= TOPE : (x.t && x.t.n >= 4); }).sort(function (a, b) { return (s(b) - s(a)) || (r(b) - r(a)); });
    var out = [], usados = {};
    l.forEach(function (x) { if (out.length < 2 && !usados[x.id]) { usados[x.id] = 1; x.respaldo = !!(x.t && x.t.n >= 5 && x.t.h / x.t.n >= 0.6); out.push(x); } });
    return out;
  }
  /* boxscore del summary → {atleta: {mercado: valor}} solo de los que jugaron */
  function leerBox(sum, dep) {
    var crudo = {}, tipos = D(dep).tipos;
    (((sum && sum.boxscore) || {}).players || []).forEach(function (t) {
      (t.statistics || []).forEach(function (g) {
        var k = g.keys || g.names || [];
        (g.athletes || []).forEach(function (a) {
          var s = a.stats || [], id = String(a.athlete && a.athlete.id); if (!s.length || a.didNotPlay) return;
          var b = crudo[id] = crudo[id] || {};
          s.forEach(function (v, i) { if (k[i] && !(k[i] in b)) b[k[i]] = num(v); });
        });
      });
    });
    var o = {};
    Object.keys(crudo).forEach(function (id) { var b = crudo[id], x = { min: z(b.minutes) }; tipos.forEach(function (T) { var v; try { v = T.box(b); } catch (e) { v = NaN; } x[T.k] = isFinite(v) ? v : null; }); o[id] = x; });
    return o;
  }
  function resolverUno(p, box) {
    var st = box[String(p.ath)];
    if (!st) return 'push'; /* no jugó: las casas devuelven la apuesta */
    var v = st[p.st]; if (v === null || v === undefined || !isFinite(v)) return null;
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
  function site(dep) { var d = D(dep); return 'https://site.api.espn.com/apis/site/v2/sports/' + d.sp + '/' + d.lg + '/'; }
  function bajarProps(ev, dep) {
    var d = D(dep), base = 'https://sports.core.api.espn.com/v2/sports/' + d.sp + '/leagues/' + d.lg + '/events/' + ev + '/competitions/' + ev + '/odds/' + CASA + '/propBets?limit=1000&page=';
    return getJ(base + 1).then(function (r) {
      var items = (r && r.items) || [], pc = Math.min(4, (r && r.pageCount) || 1), m = [];
      for (var pg = 2; pg <= pc; pg++) m.push(getJ(base + pg).then(function (x) { return (x && x.items) || []; }).catch(function () { return []; }));
      return Promise.all(m).then(function (rs) { rs.forEach(function (x) { items = items.concat(x); }); return items; });
    });
  }
  /* la plantilla viene plana (NBA) o por grupos (NHL: Centers…, NFL: offense… injuredReserveOrOut) */
  function leerRoster(r) {
    var ath = (r && r.athletes) || [], l = [];
    ath.forEach(function (a) { if (a && a.items) a.items.forEach(function (x) { l.push({ a: x, grp: a.position || '' }); }); else l.push({ a: a, grp: '' }); });
    return l.map(function (o) {
      var a = o.a, est = ((a.injuries || [])[0] || {}).status || '';
      if (!est && /injuredReserve/i.test(o.grp)) est = 'Out';
      return { id: String(a.id), n: a.displayName || a.fullName || '', s: a.shortName || a.displayName || '', est: est };
    });
  }
  function bajarRoster(tid, dep) { return getJ(site(dep) + 'teams/' + tid + '/roster').then(leerRoster); }
  function bajarLog(id, dep) { var d = D(dep); return getJ('https://site.web.api.espn.com/apis/common/v3/sports/' + d.sp + '/' + d.lg + '/athletes/' + id + '/gamelog').then(function (g) { return leerLog(g, dep); }).catch(function () { return []; }); }

  /* ---------------- pintar ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function pct(p) { return (p * 100).toFixed(0) + '%'; }
  function cTxt(c) { return c > 0 ? '+' + c : '' + c; }
  function ladoTxt(l) { return l === 'O' ? 'Más de' : 'Menos de'; }
  function tTxt(t) { return t && t.n ? t.h + ' de ' + t.n : '—'; }
  function nota(dep, sinPrecio) {
    var d = D(dep);
    return '<details class="nota" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">¿De dónde sale y qué tan confiable es?</summary>' +
      'Las líneas son de <b>DraftKings</b> (vía ESPN) y se actualizan solas. ' +
      (sinPrecio ? '<b>En este juego ESPN trae la línea pero no el precio</b>, así que no hay % de la casa: el lado sale solo de cuántas veces el jugador la pasó en sus últimos juegos. Son muy pocos juegos; tómalo como una pista, no como una probabilidad. '
        : 'El % es el precio <b>sin el margen de la casa</b>: medido en ' + d.medido + ', lo que dice ese número pasa casi exacto, así que es la mejor probabilidad que hay. ') +
      '«Pasó» es cuántas veces el jugador pasó ese lado en sus últimos juegos (hasta 10) y «prom.» su promedio de la temporada: sirven de respaldo, no mejoran el precio. ' +
      '«Las 2 jugadas» deja fuera las líneas de más de 72% (cuota peor que −250) porque casi no pagan. ' +
      '<b>Ojo:</b> en esa misma medición, apostar todas las props perdía por el margen de la casa (6-8%). Lo más probable no es lo mismo que rentable. ' +
      'Si el jugador no juega, la casa devuelve la apuesta y aquí cuenta como «push».</details>';
  }

  function pintar(pane, g, H, A, dep) {
    dep = DEPS[dep] ? dep : 'nba';
    pane.innerHTML = '<div class="estado">Cargando líneas de jugadores…</div>';
    var ev = String(g.id);
    Promise.all([bajarProps(ev, dep), bajarRoster(g.h, dep), bajarRoster(g.a, dep)]).then(function (r) {
      var props = leerProps(r[0], dep), rosH = r[1], rosA = r[2], nom = {}, fuera = {}, est = {};
      rosH.concat(rosA).forEach(function (x) { nom[x.id] = x; est[x.id] = x.est; if (/^out$|injured reserve/i.test(x.est)) fuera[x.id] = 1; });
      var idsH = principales(props, rosH.map(function (x) { return x.id; }), fuera, dep), idsA = principales(props, rosA.map(function (x) { return x.id; }), fuera, dep);
      if (!idsH.length && !idsA.length) {
        pane.innerHTML = '<div class="pick no"><b>Sin líneas de jugadores todavía</b>DraftKings suele publicarlas ' + (dep === 'nfl' ? 'unos días antes' : 'la mañana') + ' del juego. ' + (g.done ? 'Este juego ya terminó.' : (g.live ? 'Con el juego en vivo las quitan.' : 'Vuelve a abrir esta pestaña más tarde.')) + '</div>' + nota(dep, false);
        return;
      }
      var todos = idsA.concat(idsH);
      return Promise.all(todos.map(function (id) { return bajarLog(id, dep); })).then(function (ls) {
        var logs = {}; todos.forEach(function (id, i) { logs[id] = ls[i]; });
        var cands = candidatas(props, todos, logs, dep), top = jugadas(cands);
        var sinPrecio = todos.every(function (id) { return Object.keys(props[id]).every(function (k) { return props[id][k].pO === null; }); });
        var nm = function (id) { return (nom[id] && nom[id].n) || ('Jugador ' + id); };
        var h = '<h3 style="margin-top:0">⭐ Las 2 jugadas del juego</h3>';
        if (sinPrecio) h += '<div class="aviso">ESPN no trae el precio de estas líneas: salen solo del historial del jugador.</div>';
        if (!top.length) h += '<div class="pick no"><b>Nada claro aquí</b>' + (sinPrecio ? 'Todavía hay muy pocos juegos de estos jugadores para elegir un lado.' : 'Las líneas de este juego no dan una jugada dentro del tope.') + '</div>';
        top.forEach(function (x, i) {
          h += '<div class="pick' + (x.respaldo ? '' : ' no') + '"><b>' + esc(nm(x.id)) + ' · ' + ladoTxt(x.lado) + ' ' + x.L + ' ' + x.c + '</b>' +
            (x.p !== null ? pct(x.p) + ' de probabilidad · cuota ' + cTxt(x.cuota) + ' · ' : 'sin precio · ') + 'pasó ' + tTxt(x.t) + (x.respaldo ? ' 💪' : (x.p !== null ? ' (sin respaldo en sus últimos juegos)' : '')) +
            ' <button class="btnChico" data-pj="' + i + '" style="margin-left:6px">💾</button></div>';
        });
        [[A, idsA], [H, idsH]].forEach(function (par) {
          var T = par[0], ids = par[1]; if (!ids.length) return;
          h += '<h3>' + esc(T.n || T.ab) + '</h3>';
          ids.forEach(function (id) {
            var lg = logs[id], e = est[id];
            h += '<div class="nota" style="margin:8px 0 4px"><b style="color:var(--txt)">' + esc(nm(id)) + '</b>' + (e ? ' · <span style="color:var(--bad,#f87171)">⚠️ ' + esc(e) + '</span>' : '') + (lg && lg.length ? ' · ' + lg.length + ' juegos esta temporada' : '') + '</div><div class="lineas">';
            D(dep).tipos.forEach(function (Tp) {
              var q = props[id][Tp.k]; if (!q) return;
              var pr = prom(lg, Tp.k), sub = (pr !== null ? 'prom. ' + pr.toFixed(1) : ''), der;
              if (q.pO !== null) {
                var lado = q.pO >= 0.5 ? 'O' : 'U', p = lado === 'O' ? q.pO : 1 - q.pO, t = tasa(lg, Tp.k, q.L, lado, 10);
                sub = 'Más ' + cTxt(q.o) + ' · Menos ' + cTxt(q.u) + (sub ? ' · ' + sub : '');
                der = (lado === 'O' ? 'Más' : 'Menos') + ' ' + pct(p) + '<br><small style="font-weight:400;color:var(--mut)">pasó ' + tTxt(t) + '</small>';
              } else {
                var tO = tasa(lg, Tp.k, q.L, 'O', 10);
                der = tO ? 'Más: ' + tTxt(tO) + '<br><small style="font-weight:400;color:var(--mut)">sin precio</small>' : '<small style="font-weight:400;color:var(--mut)">sin precio</small>';
              }
              h += '<div class="linea"><span>' + Tp.n + ' ' + q.L + (sub ? '<br><small style="color:var(--mut2,var(--mut))">' + sub + '</small>' : '') + '</span><b style="text-align:right">' + der + '</b></div>';
            });
            h += '</div>';
          });
        });
        h += nota(dep, sinPrecio);
        pane.innerHTML = h;
        pane.querySelectorAll('[data-pj]').forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation(); var x = top[+b.dataset.pj], gp = pintar.guardar || root.guardarPick;
            if (typeof gp !== 'function') return;
            gp({ hId: g.h, aId: g.a, hN: H.n, aN: A.n, ts: g.ts, mercado: 'PROP', side: x.lado, linea: x.L,
              seleccion: nm(x.id) + ' ' + ladoTxt(x.lado) + ' ' + x.L + ' ' + x.c, cuota: x.cuota === null ? 'sin precio' : x.cuota, prob: x.p, ev: ev, ath: x.id, st: x.k });
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
  function resolver(regGet, regSet, dep) {
    var a = regGet(), pend = a.filter(function (p) { return p.mercado === 'PROP' && p.estado === 'pendiente' && p.ev && p.ts < Date.now() - 2.5 * 3600e3; });
    if (!pend.length) return Promise.resolve(false);
    var evs = {}; pend.forEach(function (p) { evs[p.ev] = 1; });
    return Promise.all(Object.keys(evs).map(function (ev) {
      return fetch(site(dep) + 'summary?event=' + ev).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (s) {
        var c = s && s.header && s.header.competitions && s.header.competitions[0], st = c && c.status && c.status.type;
        return { ev: ev, fin: !!(st && st.completed), box: s ? leerBox(s, dep) : {} };
      });
    })).then(function (rs) {
      var cambio = false, m = {}; rs.forEach(function (x) { m[x.ev] = x; });
      pend.forEach(function (p) { var x = m[p.ev]; if (!x || !x.fin) return; var e = resolverUno(p, x.box); if (e) { p.estado = e; cambio = true; } });
      if (cambio) regSet(a);
      return cambio;
    });
  }

  var API = { leerProps: leerProps, leerLog: leerLog, tasa: tasa, prom: prom, principales: principales, candidatas: candidatas, jugadas: jugadas,
    leerBox: leerBox, leerRoster: leerRoster, resolverUno: resolverUno, imp: imp, am: am, TIPOS: TIPOS, DEPS: DEPS, TOPE: TOPE, pintar: pintar, resolver: resolver };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OVAJugadores = API;
})(typeof window !== 'undefined' ? window : globalThis);
