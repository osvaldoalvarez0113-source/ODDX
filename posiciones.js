/* OVA · TABLA DE POSICIONES (window.OVAPosiciones) — por ahora NBA; pensada para sumar NHL y NFL.
   Sale en la pestaña «Números» de cada juego, como en la app de fútbol: la conferencia de cada equipo con los dos resaltados.
   Fuente: la clasificación de ESPN (site.api.espn.com/apis/v2/sports/basketball/nba/standings), guardada 30 minutos.
   Si ESPN no responde, se arma con los juegos de esta temporada que ya tiene la app (ganados, perdidos, % y diferencia).
   Zonas de la NBA: 1–6 entran directo a playoffs, 7–10 van al play-in. Solo lee: no toca ningún número del modelo. */
(function (root) {
  'use strict';
  var URL = { nba: 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings' };
  var KEY = 'ova_posiciones_v1', FRESCO = 30 * 60e3;
  /* conferencia de cada equipo de la NBA por id de ESPN (para el respaldo sin ESPN) */
  var ESTE = { 1: 1, 2: 1, 4: 1, 5: 1, 8: 1, 11: 1, 14: 1, 15: 1, 17: 1, 18: 1, 19: 1, 20: 1, 27: 1, 28: 1, 30: 1 };
  var CACHE = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stat(e, nombres) {
    var st = (e && e.stats) || [];
    for (var i = 0; i < st.length; i++) if (nombres.indexOf(st[i].name) >= 0 || nombres.indexOf(st[i].type) >= 0) return st[i];
    return null;
  }
  function num(s) { if (!s) return null; var v = s.value != null ? +s.value : parseFloat(s.displayValue); return isFinite(v) ? v : null; }

  /* ESPN → [{nombre, abrev, equipos:[{id, n, ab, g, p, pct, jd, dif, racha, sem}]}] */
  function leerESPN(j) {
    var grupos = (j && j.children) || [], out = [];
    grupos.forEach(function (c) {
      var en = (c.standings && c.standings.entries) || []; if (!en.length) return;
      var eqs = en.map(function (e) {
        var t = e.team || {}, g = num(stat(e, ['wins'])), p = num(stat(e, ['losses']));
        var jd = stat(e, ['gamesBehind']), ra = stat(e, ['streak']), se = num(stat(e, ['playoffSeed']));
        var dif = num(stat(e, ['differential', 'pointDifferential'])), pf = num(stat(e, ['avgPointsFor'])), pc = num(stat(e, ['avgPointsAgainst']));
        if (dif === null && pf !== null && pc !== null) dif = pf - pc;
        else if (dif !== null && g !== null && p !== null && g + p > 0 && Math.abs(dif) > 40) dif = dif / (g + p);   // a veces viene el total, no por juego
        return { id: String(t.id || ''), n: t.displayName || t.name || '', ab: t.abbreviation || '', g: g, p: p,
          pct: g !== null && p !== null && g + p ? g / (g + p) : null, jd: jd ? (jd.displayValue || (num(jd) === 0 ? '—' : String(num(jd)))) : null,
          dif: dif, racha: ra ? (ra.displayValue || '') : '', sem: se };
      }).filter(function (x) { return x.id && x.g !== null; });
      eqs.sort(function (a, b) { return (a.sem && b.sem) ? a.sem - b.sem : ((b.pct || 0) - (a.pct || 0)); });
      out.push({ nombre: c.name || c.abbreviation || '', abrev: c.abbreviation || '', equipos: eqs });
    });
    return out;
  }
  /* respaldo: con los juegos terminados de la temporada que ya tiene la app */
  function desdeJuegos(games, teams, temp, seasonOf) {
    var m = {};
    (games || []).forEach(function (x) {
      if (!x.done || x.skip || (seasonOf && seasonOf(x.ts) !== temp)) return;
      [[x.h, x.hs, x.as], [x.a, x.as, x.hs]].forEach(function (r) {
        var e = m[r[0]] || (m[r[0]] = { id: String(r[0]), g: 0, p: 0, pf: 0, pc: 0 });
        if (r[1] > r[2]) e.g++; else e.p++; e.pf += r[1]; e.pc += r[2];
      });
    });
    var conf = [{ nombre: 'Conferencia Este', abrev: 'Este', equipos: [] }, { nombre: 'Conferencia Oeste', abrev: 'Oeste', equipos: [] }];
    Object.keys(m).forEach(function (id) {
      if (!(+id >= 1 && +id <= 30)) return;
      var e = m[id], n = e.g + e.p, t = (teams && teams[id]) || {};
      conf[ESTE[id] ? 0 : 1].equipos.push({ id: id, n: t.n || id, ab: t.ab || '', g: e.g, p: e.p, pct: n ? e.g / n : null, dif: n ? (e.pf - e.pc) / n : null, racha: '', jd: null });
    });
    conf.forEach(function (c) {
      c.equipos.sort(function (a, b) { return (b.pct || 0) - (a.pct || 0) || (b.dif || 0) - (a.dif || 0); });
      var L = c.equipos[0]; c.equipos.forEach(function (e) { var d = L ? ((L.g - e.g) + (e.p - L.p)) / 2 : 0; e.jd = d === 0 ? '—' : d.toFixed(1).replace(/\.0$/, ''); });
    });
    return conf.filter(function (c) { return c.equipos.length; });
  }

  function tablaHtml(conf, ids, dep) {
    var h = '<div style="font-size:12.5px;font-weight:700;margin:10px 2px 4px">' + esc(nombreConf(conf.nombre)) + '</div>' +
      '<table class="tabpos" style="width:100%;border-collapse:collapse;font-size:11.5px"><tr class="cab"><td class="num">#</td><td>Equipo</td><td class="c">G-P</td><td class="c">%</td><td class="c">JD</td><td class="c">Dif</td><td class="c">Racha</td></tr>';
    conf.equipos.forEach(function (e, i) {
      var pos = i + 1, dest = ids.indexOf(e.id) >= 0, zona = dep === 'nba' ? (pos <= 6 ? '' : (pos <= 10 ? 'play' : 'fuera')) : '';
      var corte = dep === 'nba' && (pos === 7 || pos === 11) ? ' style="border-top:2px dashed var(--line2,#43381F)"' : '';
      h += '<tr' + (dest ? ' class="destacada"' : '') + corte + '><td class="num">' + pos + '</td><td class="eqn">' + esc(e.n) + (zona === 'play' ? ' <small style="color:var(--mut2)">·play-in</small>' : '') +
        '</td><td class="c">' + e.g + '-' + e.p + '</td><td class="c">' + (e.pct == null ? '—' : e.pct.toFixed(3).replace(/^0/, '')) + '</td><td class="c">' + esc(e.jd == null ? '—' : e.jd) +
        '</td><td class="c">' + (e.dif == null ? '—' : (e.dif > 0 ? '+' : '') + e.dif.toFixed(1)) + '</td><td class="c">' + esc(e.racha || '—') + '</td></tr>';
    });
    return h + '</table>';
  }
  function nombreConf(n) { return String(n || '').replace(/Eastern Conference/i, 'Conferencia Este').replace(/Western Conference/i, 'Conferencia Oeste'); }

  /* las conferencias de los dos equipos (una sola si son de la misma) */
  function html(confs, hId, aId, dep, fuente) {
    var ids = [String(hId), String(aId)], usadas = confs.filter(function (c) { return c.equipos.some(function (e) { return ids.indexOf(e.id) >= 0; }); });
    if (!usadas.length) return '<div class="nota">No se pudo armar la tabla de posiciones.</div>';
    return usadas.map(function (c) { return tablaHtml(c, ids, dep); }).join('') +
      '<div class="nota" style="margin-top:6px">G-P = ganados y perdidos · % = de victorias · JD = juegos detrás del líder de la conferencia · Dif = puntos a favor menos en contra por juego.' +
      (dep === 'nba' ? ' Del 1 al 6 entran directo a playoffs; del 7 al 10, al play-in.' : '') + (fuente === 'app' ? ' (Armada con los juegos de la app: ESPN no respondió.)' : '') + '</div>';
  }

  function cargar(dep) {
    if (CACHE[dep]) return CACHE[dep];
    try { var c = JSON.parse(root.localStorage.getItem(KEY + dep) || 'null'); if (c && Date.now() - c.t < FRESCO && c.d && c.d.length) return (CACHE[dep] = Promise.resolve(c.d)); } catch (e) { }
    if (!root.fetch || !URL[dep]) return Promise.resolve(null);
    CACHE[dep] = root.fetch(URL[dep]).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var d = leerESPN(j); if (!d.length) { CACHE[dep] = null; return null; }
      try { root.localStorage.setItem(KEY + dep, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { }
      return d;
    }).catch(function () { CACHE[dep] = null; return null; });
    return CACHE[dep];
  }
  /* pinta en el elemento; resp = función que arma la tabla con los juegos de la app si ESPN falla */
  function pintar(el, dep, hId, aId, resp) {
    if (!el) return;
    cargar(dep).then(function (d) {
      var fuente = 'espn';
      if (!d || !d.length) { d = resp ? resp() : null; fuente = 'app'; }
      el.innerHTML = d && d.length ? html(d, hId, aId, dep, fuente) : '<div class="nota">Sin conexión con ESPN para la tabla de posiciones.</div>';
    });
  }

  var API = { leerESPN: leerESPN, desdeJuegos: desdeJuegos, html: html, pintar: pintar, cargar: cargar, URL: URL };
  root.OVAPosiciones = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
