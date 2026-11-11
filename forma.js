/* ===================================================================
   OVA · CÓMO VIENEN (window.OVAForma) — app NBA, bloque del Veredicto
   La «memoria» de la temporada en palabras: cómo viene jugando cada equipo (últimos 10, racha, en casa / de visita,
   ataque y defensa de los últimos 5 contra su promedio, nivel de los rivales, descanso) y una lectura contra el favorito
   del mercado: si la forma lo respalda, si está pareja o si el no favorito llega mejor.
   Sale de los partidos que la app ya tiene cargados (GAMES): no baja nada y NO cambia ningún número ni pick.
   Medido (docs/MEDICION-6-TEMPORADAS-2026-10.md): meter descanso y forma reciente al modelo de NBA no mejoró el
   pronóstico (error 14.07 → 14.06), porque la línea ya los trae. Es contexto para decidir, no una ventaja.
   Sin DOM en calc()/lectura(): las usan las pruebas.
   =================================================================== */
(function (root) {
  'use strict';
  var DIA = 864e5;
  function inicioTemp(ts) { var d = new Date(ts), y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; return new Date(y, 8, 1).getTime(); }
  function de(games, id, ts) {
    var ini = inicioTemp(ts);
    return games.filter(function (x) { return (x.h === id || x.a === id) && x.ts < ts && x.ts >= ini && x.hs != null && x.as != null && x.done !== false && !x.skip; })
      .sort(function (a, b) { return b.ts - a.ts; })
      .map(function (x) { var loc = x.h === id, f = loc ? x.hs : x.as, c = loc ? x.as : x.hs; return { ts: x.ts, loc: loc, f: f, c: c, w: f > c, r: loc ? x.a : x.h }; });
  }
  function rec(l) { var w = l.filter(function (x) { return x.w; }).length; return { w: w, l: l.length - w, n: l.length }; }
  function med(l, k) { return l.length ? l.reduce(function (s, x) { return s + x[k]; }, 0) / l.length : null; }

  /* todo lo que se sabe de un equipo antes del juego (ts). loc = juega en casa hoy */
  function calc(games, id, ts, loc) {
    var js = de(games, id, ts); if (!js.length) return null;
    var u10 = js.slice(0, 10), u5 = js.slice(0, 5), sede = js.filter(function (x) { return x.loc === !!loc; });
    var racha = 1; while (racha < js.length && js[racha].w === js[0].w) racha++;
    /* nivel de los rivales de los últimos 10: su % de victorias en la temporada (sin contar los juegos contra este equipo) */
    var pr = [], memo = {};
    u10.forEach(function (x) {
      if (!(x.r in memo)) { var o = de(games, x.r, ts).filter(function (y) { return y.r !== id; }); memo[x.r] = o.length >= 3 ? rec(o).w / o.length : null; }
      if (memo[x.r] !== null) pr.push(memo[x.r]);
    });
    var t = rec(js), r10 = rec(u10), m5 = med(u5, 'f') - med(u5, 'c'), mT = med(js, 'f') - med(js, 'c');
    var o = { n: js.length, temp: t, u10: r10, u5: rec(u5), racha: { w: js[0].w, n: racha }, sede: rec(sede),
      pf5: med(u5, 'f'), pc5: med(u5, 'c'), pfT: med(js, 'f'), pcT: med(js, 'c'), m5: m5, mT: mT,
      rivales: pr.length >= 3 ? pr.reduce(function (s, x) { return s + x; }, 0) / pr.length : null,
      desc: Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date(js[0].ts).setHours(0, 0, 0, 0)) / DIA),
      en7: js.filter(function (x) { return x.ts > ts - 7 * DIA; }).length,
      ult: u10.map(function (x) { return x.w ? 'V' : 'D'; }) };
    /* nota de forma: últimos 10 (de −1 a +1) + margen de los últimos 5 (15 pts = 1) */
    o.nota = (r10.w / r10.n - 0.5) * 2 + Math.max(-1, Math.min(1, m5 / 15));
    o.etq = o.n < 5 ? 'poco' : (r10.w / r10.n >= 0.7 && m5 > 0 ? 'caliente' : (r10.w / r10.n <= 0.3 && m5 < 0 ? 'frio' : (m5 - mT >= 4 ? 'sube' : (m5 - mT <= -4 ? 'baja' : 'parejo'))));
    return o;
  }
  /* favH = el favorito del mercado (o del modelo si no hay precio) es el local */
  function lectura(fH, fA, favH) {
    if (!fH || !fA || fH.n < 5 || fA.n < 5) return { k: 'poco' };
    var fav = favH ? fH : fA, no = favH ? fA : fH, d = fav.nota - no.nota;
    return { k: d >= 0.5 ? 'respalda' : (d <= -0.5 ? 'contra' : 'pareja'), d: d };
  }

  /* ---------------- pintar ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function sg(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
  var ETQ = { caliente: '🔥 Caliente', frio: '❄️ Frío', sube: '↗ Subiendo', baja: '↘ Bajando', parejo: '➖ Parejo', poco: '… Pocos juegos' };
  function frases(f, loc) {
    var o = [];
    o.push('<b>' + f.u10.w + '-' + f.u10.l + '</b> en sus últimos ' + f.u10.n + ' (temporada ' + f.temp.w + '-' + f.temp.l + ')' +
      (f.racha.n >= 2 ? ', <b>' + f.racha.n + ' ' + (f.racha.w ? 'victorias' : 'derrotas') + ' seguidas</b>' : '') + '.');
    if (f.sede.n >= 2) o.push((loc ? 'En casa' : 'De visita') + ': ' + f.sede.w + '-' + f.sede.l + '.');
    var da = f.pf5 - f.pfT, dd = f.pc5 - f.pcT;
    o.push('Últimos ' + f.u5.n + ': anota ' + f.pf5.toFixed(0) + ' y recibe ' + f.pc5.toFixed(0) + ' (margen ' + sg(f.m5) + '; en la temporada ' + sg(f.mT) + ').' +
      (Math.abs(da) >= 4 ? ' El ataque viene ' + (da > 0 ? 'mejor' : 'peor') + ' que su promedio (' + sg(da) + ').' : '') +
      (Math.abs(dd) >= 4 ? ' La defensa viene ' + (dd < 0 ? 'mejor' : 'peor') + ' (' + (dd < 0 ? 'recibe ' + Math.abs(dd).toFixed(1) + ' menos' : 'recibe ' + dd.toFixed(1) + ' más') + ').' : ''));
    if (f.rivales !== null) o.push('Rivales recientes: ' + (f.rivales >= 0.56 ? '<b>duros</b>' : (f.rivales <= 0.44 ? '<b>flojos</b>' : 'de nivel medio')) + ' (ganan ' + Math.round(f.rivales * 100) + '% de sus juegos).');
    o.push(f.desc <= 1 ? '<b>Jugó ayer</b> (back-to-back).' : (f.desc >= 4 ? 'Llega descansado: ' + f.desc + ' días sin jugar.' : 'Descanso normal (' + f.desc + ' días).') + (f.en7 >= 4 ? ' Carga pesada: ' + f.en7 + ' juegos en 7 días.' : ''));
    return o.join(' ');
  }
  function tarjeta(Tm, f, loc) {
    if (!f) return '<div class="observ"><b>' + esc(Tm.n) + '</b>: sin juegos de esta temporada todavía.</div>';
    var cuad = f.ult.map(function (r) { return '<span class="' + r + '">' + r + '</span>'; }).join('');
    return '<div class="observ"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><b style="color:var(--txt);font-size:13.5px">' + esc(Tm.n) + '</b><b style="white-space:nowrap">' + ETQ[f.etq] + '</b></div>' +
      '<div class="forma" style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:7px">' + cuad + '</div>' + frases(f, loc) + '</div>';
  }
  /* pmk = probabilidad del local según el mercado (o el modelo si no hay precio) */
  function html(games, g, H, A, pH) {
    var fH, fA; try { fH = calc(games, g.h, g.ts, true); fA = calc(games, g.a, g.ts, false); } catch (e) { return ''; }
    if (!fH && !fA) return '';
    var favH = pH >= 0.5, L = lectura(fH, fA, favH), fav = favH ? H : A, no = favH ? A : H, pf = Math.round((favH ? pH : 1 - pH) * 100), t;
    if (L.k === 'respalda') t = '<span class="rvSig ok">✓ La forma respalda al favorito</span><div class="rvP" style="margin-top:7px"><b>' + esc(fav.n) + '</b> (' + pf + '%) llega mejor que ' + esc(no.n) + '. Números y momento dicen lo mismo.</div>';
    else if (L.k === 'contra') t = '<span class="rvSig bad">⚠️ El no favorito llega mejor</span><div class="rvP" style="margin-top:7px"><b>' + esc(no.n) + '</b> viene jugando mejor que el favorito ' + esc(fav.n) + ' (' + pf + '%). ' +
      (pf >= 65 ? 'El precio igual pone lejos al favorito: mira lesiones antes de ir en contra.' : 'Juego para pensarlo dos veces: o lo dejas pasar o miras al no favorito con mejor pago.') + '</div>';
    else if (L.k === 'pareja') t = '<span class="rvSig mid">≈ Forma pareja</span><div class="rvP" style="margin-top:7px">Ninguno llega claramente mejor. El momento no cambia lo que dicen los números.</div>';
    else t = '<span class="rvSig mid">… Muy pocos juegos para leer la forma</span>';
    return '<div class="rv"><h4>Cómo vienen jugando</h4>' + t + '<div style="margin-top:9px">' + tarjeta(A, fA, false) + tarjeta(H, fH, true) + '</div>' +
      '<details class="nota" style="margin-top:6px"><summary style="cursor:pointer;font-weight:700">¿Cómo se lee y cuánto pesa?</summary>' +
      'Cuadritos: últimos 10 juegos, el más reciente primero. 🔥 = ganó 7+ de 10 y viene ganando por margen; ❄️ = perdió 7+ de 10; ↗ / ↘ = sus últimos 5 van 4+ puntos mejor o peor que su temporada. ' +
      '«Rivales» dice contra quién consiguió esa racha: un 8-2 contra equipos flojos vale menos. ' +
      '<b>Ojo:</b> esto no cambia el % de arriba. Se midió meter la forma y el descanso al modelo de NBA y no mejoró el pronóstico, porque el mercado ya los ve. Sirve para decidir con más confianza o para dejar pasar un juego, no como ventaja segura.</details></div>';
  }
  var API = { calc: calc, lectura: lectura, html: html, inicioTemp: inicioTemp };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OVAForma = API;
})(typeof window !== 'undefined' ? window : globalThis);
