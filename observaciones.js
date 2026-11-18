/* ===================================================================
   OVA · OBSERVACIONES (window.OVAObs) — NBA, NHL y NFL, igual que en fútbol (torneos.js)
   Las rachas llamativas de cada equipo, con su escudo: victorias o derrotas seguidas, en casa o de visita,
   cuánto anota, si sus juegos van altos o bajos, si gana o pierde por mucho.
   Sale de los juegos de la temporada que la app ya tiene: no baja nada y no cambia ningún número ni pick.
   Como en fútbol, es contexto: medidas solas, las rachas no le ganan al precio (docs/PATRONES-2026-10.md).
   =================================================================== */
(function (root) {
  'use strict';
  /* alto = anota «mucho» · bajo = anota «poco» · ancho = gana o pierde «por mucho» · u = ventana de juegos · q = palabra */
  var CFG = {
    mlb: { alto: 6, bajo: 2, ancho: 4, u: 10, q: 'carreras', j: 'juegos' },
    nba: { alto: 120, bajo: 105, ancho: 10, u: 10, q: 'puntos', j: 'juegos' },
    nhl: { alto: 4, bajo: 2, ancho: 3, u: 10, q: 'goles', j: 'juegos' },
    nfl: { alto: 27, bajo: 17, ancho: 14, u: 6, q: 'puntos', j: 'juegos' }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  /* juegos del equipo en la temporada (más reciente primero): {f, c, casa} */
  function de(games, id, ts, dep) {
    var F = root.OVAForma, ini = F ? F.inicioTemp(ts, dep) : 0;
    return (games || []).filter(function (x) { return x && (x.h === id || x.a === id) && x.ts < ts && x.ts >= ini && isFinite(x.hs) && isFinite(x.as) && x.hs !== null && x.done !== false && !x.skip; })
      .sort(function (a, b) { return b.ts - a.ts; })
      .map(function (x) { var L = x.h === id; return { f: +(L ? x.hs : x.as), c: +(L ? x.as : x.hs), casa: L }; });
  }
  /* promedio de la liga (puntos totales por juego) en la temporada */
  function mediaLiga(games, ts, dep) {
    var F = root.OVAForma, ini = F ? F.inicioTemp(ts, dep) : 0, s = 0, n = 0;
    (games || []).forEach(function (x) { if (x && x.ts < ts && x.ts >= ini && isFinite(x.hs) && isFinite(x.as) && x.hs !== null) { s += +x.hs + +x.as; n++; } });
    return n >= 20 ? s / n : null;
  }
  function rachas(js, dep, local, media) {
    var c = CFG[dep] || CFG.nba, out = [];
    if (!js || js.length < 3) return out;
    function seguidos(l, cond) { var n = 0; for (var i = 0; i < l.length; i++) { if (cond(l[i])) n++; else break; } return n; }
    var gana = seguidos(js, function (m) { return m.f > m.c; }), pierde = seguidos(js, function (m) { return m.f < m.c; });
    if (gana >= 3) out.push({ t: 'ha ganado sus últimos ' + gana + ' ' + c.j + '.', p: gana + 2, c: 'b' });
    if (pierde >= 3) out.push({ t: 'ha perdido sus últimos ' + pierde + ' ' + c.j + '.', p: pierde + 2, c: 'm' });
    var sede = js.filter(function (m) { return m.casa === !!local; }), dond = local ? 'en casa' : 'de visita';
    var gs = seguidos(sede, function (m) { return m.f > m.c; }), ps = seguidos(sede, function (m) { return m.f < m.c; });
    if (gs >= 4 && gs > gana) out.push({ t: 'ha ganado sus últimos ' + gs + ' ' + dond + '.', p: gs + 1, c: 'b' });
    if (ps >= 4 && ps > pierde) out.push({ t: 'ha perdido sus últimos ' + ps + ' ' + dond + '.', p: ps + 1, c: 'm' });
    var u = js.slice(0, c.u), n = u.length;
    if (n >= Math.min(6, c.u)) {
      var al = u.filter(function (m) { return m.f >= c.alto; }).length, ba = u.filter(function (m) { return m.f <= c.bajo; }).length;
      var gm = u.filter(function (m) { return m.f - m.c >= c.ancho; }).length, pm = u.filter(function (m) { return m.c - m.f >= c.ancho; }).length;
      if (al / n >= 0.6) out.push({ t: 'anotó ' + c.alto + ' ' + c.q + ' o más en ' + al + ' de sus últimos ' + n + '.', p: al - n / 2, c: 'b' });
      else if (ba / n >= 0.6) out.push({ t: 'anotó ' + c.bajo + ' ' + c.q + ' o menos en ' + ba + ' de sus últimos ' + n + '.', p: ba - n / 2, c: 'm' });
      if (gm / n >= 0.5) out.push({ t: 'ganó por ' + c.ancho + ' o más en ' + gm + ' de sus últimos ' + n + '.', p: gm - n / 3, c: 'b' });
      else if (pm / n >= 0.5) out.push({ t: 'perdió por ' + c.ancho + ' o más en ' + pm + ' de sus últimos ' + n + '.', p: pm - n / 3, c: 'm' });
      if (media) {
        var ov = u.filter(function (m) { return m.f + m.c > media; }).length;
        if (ov / n >= 0.7) out.push({ t: 'sus juegos se fueron por encima del promedio de la liga (' + media.toFixed(dep === 'nhl' || dep === 'mlb' ? 1 : 0) + ') en ' + ov + ' de ' + n + '.', p: ov - n / 2 });
        else if (ov / n <= 0.3) out.push({ t: 'sus juegos se quedaron por debajo del promedio de la liga (' + media.toFixed(dep === 'nhl' || dep === 'mlb' ? 1 : 0) + ') en ' + (n - ov) + ' de ' + n + '.', p: (n - ov) - n / 2 });
      }
    }
    return out.sort(function (a, b) { return b.p - a.p; }).slice(0, 3);
  }
  var CSS = '.ovt-obs{display:flex;align-items:center;gap:10px;margin:7px 0}' +
    '.ovt-obs img,.ovt-obs i{width:28px;height:28px;border-radius:50%;object-fit:contain;flex:none;background:var(--bg2)}' +
    '.ovt-obs span{flex:1;background:var(--bg2);border-left:3px solid var(--line2);border-radius:12px;padding:9px 11px;font-size:13.5px;line-height:1.35}' +
    '.ovt-obs span.b{border-left-color:var(--good)}.ovt-obs span.m{border-left-color:var(--bad)}';
  function css() { try { if (typeof document !== 'undefined' && document.head && !document.getElementById('ovtObsCss')) { var st = document.createElement('style'); st.id = 'ovtObsCss'; st.textContent = CSS; document.head.appendChild(st); } } catch (e) { } }
  /* bloque del Veredicto. H y A: {n, logo} */
  function html(games, g, H, A, dep) {
    try {
      css();
      var media = mediaLiga(games, g.ts, dep), h = '';
      [[A, g.a, false], [H, g.h, true]].forEach(function (z) {
        rachas(de(games, z[1], g.ts, dep), dep, z[2] && !g.neutral, media).forEach(function (r) {
          h += '<div class="ovt-obs">' + (z[0].logo ? '<img src="' + esc(z[0].logo) + '" alt="" onerror="this.style.visibility=\'hidden\'">' : '<i></i>') +
            '<span class="' + (r.c || '') + '"><b>' + esc(z[0].n) + '</b> ' + esc(r.t) + '</span></div>';
        });
      });
      return '<div class="rv"><h4>Observaciones</h4>' + (h || '<div class="nota">Ninguna racha llamativa en los últimos juegos de los dos.</div>') +
        '<div class="nota" style="margin-top:4px">Rachas de esta temporada. Son contexto: el precio ya las trae casi siempre.</div></div>';
    } catch (e) { return ''; }
  }
  var API = { rachas: rachas, de: de, mediaLiga: mediaLiga, html: html, CFG: CFG };
  root.OVAObs = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
