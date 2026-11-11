/* ===================================================================
   OVA · CÓMO VIENEN (window.OVAForma) — bloque del Veredicto en NBA, NHL, NFL, fútbol y tenis
   La «memoria» de la temporada en palabras: cómo viene jugando cada equipo (últimos juegos, racha, en casa / de visita,
   ataque y defensa recientes contra su promedio, nivel de los rivales, descanso) y una lectura contra el favorito
   del mercado: si la forma lo respalda, si está pareja o si el no favorito llega mejor.
   Sale de los partidos que cada app ya tiene cargados: no baja nada y NO cambia ningún número ni pick.
   Medido (docs/MEDICION-6-TEMPORADAS-2026-10.md): meter descanso y forma reciente al modelo de NBA no mejoró el
   pronóstico (error 14.07 → 14.06), y las rachas no le ganan al precio en fútbol, NHL ni NFL (docs/PATRONES-2026-10.md):
   la línea ya los trae. Es contexto para decidir, no una ventaja.
   Sin DOM en calc()/lectura(): las usan las pruebas.
   =================================================================== */
(function (root) {
  'use strict';
  var DIA = 864e5;
  /* mes = mes en que arranca la temporada (0 = enero) · n/m = ventana larga y corta · esc = margen que vale «1» en la nota
     tr = cambio de ataque/defensa que se menciona · dec = decimales · min = juegos mínimos para opinar */
  var CFG = {
    nba: { mes: 8, n: 10, m: 5, esc: 15, tr: 4, dec: 0, min: 5, b2b: true, que: 'juegos' },
    nhl: { mes: 8, n: 10, m: 5, esc: 1.5, tr: 0.6, dec: 1, min: 5, b2b: true, que: 'juegos' },
    nfl: { mes: 7, n: 5, m: 3, esc: 14, tr: 5, dec: 0, min: 3, sem: true, que: 'juegos' },
    fut: { mes: 6, n: 10, m: 5, esc: 1.2, tr: 0.5, dec: 1, min: 5, emp: true, que: 'partidos' }
  };
  function cfg(dep) { return CFG[dep] || CFG.nba; }
  function inicioTemp(ts, dep) { var c = cfg(dep), d = new Date(ts), y = d.getMonth() >= c.mes ? d.getFullYear() : d.getFullYear() - 1; return new Date(y, c.mes, 1).getTime(); }
  function de(games, id, ts, dep) {
    var ini = inicioTemp(ts, dep);
    return games.filter(function (x) { return (x.h === id || x.a === id) && x.ts < ts && x.ts >= ini && x.hs != null && x.as != null && x.done !== false && !x.skip; })
      .sort(function (a, b) { return b.ts - a.ts; })
      .map(function (x) { var loc = x.h === id, f = loc ? x.hs : x.as, c = loc ? x.as : x.hs; return { ts: x.ts, loc: loc, f: f, c: c, w: f > c, e: f === c, r: loc ? x.a : x.h, res: f > c ? 'V' : (f === c ? 'E' : 'D') }; });
  }
  function rec(l) { var w = l.filter(function (x) { return x.w; }).length, e = l.filter(function (x) { return x.e; }).length; return { w: w, e: e, l: l.length - w - e, n: l.length, pct: l.length ? (w + e / 2) / l.length : 0 }; }
  function med(l, k) { return l.length ? l.reduce(function (s, x) { return s + x[k]; }, 0) / l.length : null; }

  /* todo lo que se sabe de un equipo antes del juego (ts). loc = juega en casa hoy */
  function calc(games, id, ts, loc, dep) {
    var c = cfg(dep), js = de(games, id, ts, dep); if (!js.length) return null;
    var u10 = js.slice(0, c.n), u5 = js.slice(0, c.m), sede = js.filter(function (x) { return x.loc === !!loc; });
    var racha = 1; while (racha < js.length && js[racha].res === js[0].res) racha++;
    var inv = 0; while (inv < js.length && js[inv].res !== 'D') inv++;
    /* nivel de los rivales recientes: su % de victorias en la temporada (sin contar los juegos contra este equipo) */
    var pr = [], memo = {};
    u10.forEach(function (x) {
      if (!(x.r in memo)) { var o = de(games, x.r, ts, dep).filter(function (y) { return y.r !== id; }); memo[x.r] = o.length >= 3 ? rec(o).pct : null; }
      if (memo[x.r] !== null) pr.push(memo[x.r]);
    });
    var t = rec(js), r10 = rec(u10), m5 = med(u5, 'f') - med(u5, 'c'), mT = med(js, 'f') - med(js, 'c');
    var o = { n: js.length, temp: t, u10: r10, u5: rec(u5), racha: { w: js[0].w, res: js[0].res, n: racha }, inv: inv, sede: rec(sede),
      pf5: med(u5, 'f'), pc5: med(u5, 'c'), pfT: med(js, 'f'), pcT: med(js, 'c'), m5: m5, mT: mT,
      rivales: pr.length >= 3 ? pr.reduce(function (s, x) { return s + x; }, 0) / pr.length : null,
      desc: Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date(js[0].ts).setHours(0, 0, 0, 0)) / DIA),
      en7: js.filter(function (x) { return x.ts > ts - 7 * DIA; }).length,
      ult: u10.map(function (x) { return x.res; }) };
    /* nota de forma: ventana larga (de −1 a +1) + margen de la ventana corta (esc = 1) */
    o.nota = (r10.pct - 0.5) * 2 + Math.max(-1, Math.min(1, m5 / c.esc));
    o.etq = o.n < c.min ? 'poco' : (r10.pct >= 0.7 && m5 > 0 ? 'caliente' : (r10.pct <= 0.3 && m5 < 0 ? 'frio' : (m5 - mT >= c.tr ? 'sube' : (m5 - mT <= -c.tr ? 'baja' : 'parejo'))));
    return o;
  }
  /* favH = el favorito del mercado (o del modelo si no hay precio) es el local */
  function lectura(fH, fA, favH, dep) {
    var mn = cfg(dep).min;
    if (!fH || !fA || fH.n < mn || fA.n < mn) return { k: 'poco' };
    var fav = favH ? fH : fA, no = favH ? fA : fH, d = fav.nota - no.nota;
    return { k: d >= 0.5 ? 'respalda' : (d <= -0.5 ? 'contra' : 'pareja'), d: d };
  }

  /* ---------------- pintar ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function sg(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
  var ETQ = { caliente: '🔥 Caliente', frio: '❄️ Frío', sube: '↗ Subiendo', baja: '↘ Bajando', parejo: '➖ Parejo', poco: '… Pocos juegos' };
  var RES = { V: ['victoria seguida', 'victorias seguidas'], D: ['derrota seguida', 'derrotas seguidas'], E: ['empate seguido', 'empates seguidos'] };
  function recTxt(r, c) { return c.emp ? r.w + '-' + r.e + '-' + r.l : r.w + '-' + r.l + (r.e ? '-' + r.e : ''); }   /* fútbol: G-E-P · NFL con empate: G-P-E */
  function frases(f, loc, dep) {
    var c = cfg(dep), o = [];
    o.push('<b>' + recTxt(f.u10, c) + '</b> en sus últimos ' + f.u10.n + ' (temporada ' + recTxt(f.temp, c) + ')' +
      (f.racha.n >= 2 ? ', <b>' + f.racha.n + ' ' + RES[f.racha.res][1] + '</b>' : '') + (c.emp && f.inv >= 4 && f.inv > (f.racha.res === 'V' ? f.racha.n : 0) ? ', ' + f.inv + ' sin perder' : '') + '.' + (c.emp ? ' (ganados-empatados-perdidos)' : ''));
    if (f.sede.n >= 2) o.push((loc ? 'En casa' : 'De visita') + ': ' + recTxt(f.sede, c) + '.');
    var da = f.pf5 - f.pfT, dd = f.pc5 - f.pcT;
    o.push('Últimos ' + f.u5.n + ': anota ' + f.pf5.toFixed(c.dec) + ' y recibe ' + f.pc5.toFixed(c.dec) + ' (margen ' + sg(f.m5) + '; en la temporada ' + sg(f.mT) + ').' +
      (Math.abs(da) >= c.tr ? ' El ataque viene ' + (da > 0 ? 'mejor' : 'peor') + ' que su promedio (' + sg(da) + ').' : '') +
      (Math.abs(dd) >= c.tr ? ' La defensa viene ' + (dd < 0 ? 'mejor' : 'peor') + ' (' + (dd < 0 ? 'recibe ' + Math.abs(dd).toFixed(1) + ' menos' : 'recibe ' + dd.toFixed(1) + ' más') + ').' : ''));
    if (f.rivales !== null) o.push('Rivales recientes: ' + (f.rivales >= 0.56 ? '<b>duros</b>' : (f.rivales <= 0.44 ? '<b>flojos</b>' : 'de nivel medio')) + '.');
    if (c.b2b) o.push(f.desc <= 1 ? '<b>Jugó ayer</b> (back-to-back).' : (f.desc >= 4 ? 'Llega descansado: ' + f.desc + ' días sin jugar.' : 'Descanso normal (' + f.desc + ' días).') + (f.en7 >= 4 ? ' Carga pesada: ' + f.en7 + ' juegos en 7 días.' : ''));
    else if (c.sem) { if (f.desc <= 5) o.push('<b>Semana corta</b>: ' + f.desc + ' días de descanso.'); else if (f.desc >= 13) o.push('Viene de semana libre (' + f.desc + ' días sin jugar).'); }
    else { if (f.desc <= 3) o.push('<b>Poco descanso</b>: jugó hace ' + f.desc + ' días.'); else if (f.desc >= 10) o.push('Llega descansado: ' + f.desc + ' días sin jugar.'); }
    return o.join(' ');
  }
  function cuadros(l) { return '<div class="forma" style="display:flex;gap:3px;flex-wrap:wrap;margin:0 0 7px">' + l.map(function (r) { return '<span class="' + r + '">' + r + '</span>'; }).join('') + '</div>'; }
  function cabeza(n, etq) { return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><b style="color:var(--txt);font-size:13.5px">' + esc(n) + '</b><b style="white-space:nowrap">' + ETQ[etq] + '</b></div>'; }
  function tarjeta(Tm, f, loc, dep) {
    if (!f) return '<div class="observ"><b>' + esc(Tm.n) + '</b>: sin ' + cfg(dep).que + ' de esta temporada todavía.</div>';
    return '<div class="observ">' + cabeza(Tm.n, f.etq) + cuadros(f.ult) + frases(f, loc, dep) + '</div>';
  }
  function lecturaHtml(k, fav, no, pf, corte) {
    var p = pf === null ? '' : ' (' + pf + '%)';
    if (k === 'respalda') return '<span class="rvSig ok">✓ La forma respalda al favorito</span><div class="nota" style="margin:7px 0 0;font-size:13px"><b>' + esc(fav) + '</b>' + p + ' llega mejor que ' + esc(no) + '. Números y momento dicen lo mismo.</div>';
    if (k === 'contra') return '<span class="rvSig bad">⚠️ El no favorito llega mejor</span><div class="nota" style="margin:7px 0 0;font-size:13px"><b>' + esc(no) + '</b> viene jugando mejor que el favorito ' + esc(fav) + p + '. ' +
      (pf !== null && pf >= corte ? 'El precio igual pone lejos al favorito: mira bajas y lesiones antes de ir en contra.' : 'Juego para pensarlo dos veces: o lo dejas pasar o miras al no favorito con mejor pago.') + '</div>';
    if (k === 'pareja') return '<span class="rvSig mid">≈ Forma pareja</span><div class="nota" style="margin:7px 0 0;font-size:13px">Ninguno llega claramente mejor. El momento no cambia lo que dicen los números.</div>';
    return '<span class="rvSig mid">… Muy pocos juegos para leer la forma</span>';
  }
  function pie(dep) {
    var c = cfg(dep);
    return '<details class="nota" style="margin-top:6px"><summary style="cursor:pointer;font-weight:700">¿Cómo se lee y cuánto pesa?</summary>' +
      'Cuadritos: últimos ' + c.n + ' ' + c.que + ', el más reciente primero. 🔥 = sacó 70% o más y viene ganando por margen; ❄️ = lo contrario; ↗ / ↘ = sus últimos ' + c.m + ' van claramente mejor o peor que su temporada. ' +
      '«Rivales» dice contra quién consiguió esos resultados: una buena racha contra equipos flojos vale menos. ' +
      '<b>Ojo:</b> esto no cambia el % de arriba. Se midió meter la forma y las rachas en los modelos y no mejoraron el pronóstico, porque el mercado ya las ve. Sirve para decidir con más confianza o para dejar pasar un juego, no como ventaja segura.</details>';
  }
  /* pH = probabilidad del local según el mercado (o el modelo si no hay precio); en fútbol, pH y pA sin el empate */
  function html(games, g, H, A, pH, dep, pfVer) {
    var fH, fA; try { fH = calc(games, g.h, g.ts, true, dep); fA = calc(games, g.a, g.ts, false, dep); } catch (e) { return ''; }
    if (!fH && !fA) return '';
    var favH = pH >= 0.5, L = lectura(fH, fA, favH, dep), fav = favH ? H : A, no = favH ? A : H, pf = Math.round((pfVer > 0 ? pfVer : (favH ? pH : 1 - pH)) * 100);
    return '<div class="rv"><h4>Cómo vienen jugando</h4>' + lecturaHtml(L.k, fav.n, no.n, pf, dep === 'fut' ? 55 : 65) + '<div style="margin-top:9px">' + tarjeta(A, fA, false, dep) + tarjeta(H, fH, true, dep) + '</div>' + pie(dep) + '</div>';
  }
  /* tenis: solo hay la tira de los últimos 10 (V/D, el más viejo primero) de cada jugador */
  function tira(s) {
    var l = String(s || '').split('').filter(function (x) { return x === 'V' || x === 'D'; }).reverse(); if (!l.length) return null;
    var w = l.filter(function (x) { return x === 'V'; }).length, r = 1; while (r < l.length && l[r] === l[0]) r++;
    var u5 = l.slice(0, 5), w5 = u5.filter(function (x) { return x === 'V'; }).length, pct = w / l.length;
    return { n: l.length, w: w, l: l.length - w, ult: l, racha: { res: l[0], n: r }, w5: w5, n5: u5.length, nota: (pct - 0.5) * 2 + (w5 / u5.length - 0.5),
      etq: l.length < 5 ? 'poco' : (pct >= 0.7 ? 'caliente' : (pct <= 0.3 ? 'frio' : (w5 / u5.length - pct >= 0.25 ? 'sube' : (w5 / u5.length - pct <= -0.25 ? 'baja' : 'parejo')))) };
  }
  function tenis(sA, sB, nA, nB, pA) {
    var a = tira(sA), b = tira(sB); if (!a && !b) return '';
    var favA = pA >= 0.5, k = (!a || !b || a.n < 5 || b.n < 5) ? 'poco' : (function () { var d = (favA ? a.nota - b.nota : b.nota - a.nota); return d >= 0.5 ? 'respalda' : (d <= -0.5 ? 'contra' : 'pareja'); })();
    var tj = function (n, f) {
      if (!f) return '<div class="observ"><b>' + esc(n) + '</b>: sin partidos recientes en la base.</div>';
      return '<div class="observ">' + cabeza(n, f.etq) + cuadros(f.ult) + '<b>' + f.w + '-' + f.l + '</b> en sus últimos ' + f.n + (f.racha.n >= 2 ? ', <b>' + f.racha.n + ' ' + RES[f.racha.res][1] + '</b>' : '') + '. Últimos ' + f.n5 + ': ' + f.w5 + '-' + (f.n5 - f.w5) + '.</div>';
    };
    return '<div class="rv"><h4>Cómo vienen jugando</h4>' + lecturaHtml(k, favA ? nA : nB, favA ? nB : nA, Math.round((favA ? pA : 1 - pA) * 100), 70) + '<div style="margin-top:9px">' + tj(nA, a) + tj(nB, b) + '</div>' +
      '<details class="nota" style="margin-top:6px"><summary style="cursor:pointer;font-weight:700">¿Cómo se lee y cuánto pesa?</summary>Cuadritos: últimos 10 partidos del jugador en cualquier torneo y superficie, el más reciente primero. No dice contra quién fueron ni en qué cancha. <b>Ojo:</b> no cambia el % de arriba; el Elo ya sube y baja con cada resultado. Es contexto, no una ventaja segura.</details></div>';
  }
  var API = { calc: calc, lectura: lectura, html: html, tenis: tenis, tira: tira, inicioTemp: inicioTemp, CFG: CFG };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OVAForma = API;
})(typeof window !== 'undefined' ? window : globalThis);
