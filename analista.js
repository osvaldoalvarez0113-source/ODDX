/* ===================================================================
   OVA · EL ANÁLISIS (window.OVAAnalista) — primer bloque del Veredicto en NBA, NHL, NFL, fútbol y tenis
   Escribe en palabras lo que un analista diría del juego, cruzando lo que la app ya tiene:
     el % del favorito (mercado o modelo), si el modelo opina igual, cuántas veces se cumplió ese % (aciertos.js),
     cómo vienen jugando los dos (forma.js), descanso, movimiento de la línea, bajas y avisos de cada deporte.
   Es fijo: con los mismos datos dice siempre lo mismo (no es una IA, no baja nada y no cambia ningún número ni pick).
   La CONFIANZA sale solo de lo medido: el % de aciertos de ese tramo y si modelo y mercado coinciden
   (docs/MEDICION-PICKS-GANADORES-2026-11.md: cuando discrepan, el lado del mercado gana más, pero acierta menos).
   La forma y el descanso se cuentan como contexto (a favor / en contra): medidos solos no suben aciertos.
   Sin DOM: analizar() devuelve el texto por partes y html() lo pinta. Lo usan las pruebas.
   =================================================================== */
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function p0(x) { return Math.round(x * 100) + '%'; }
  var NIV = ['dejar', 'baja', 'media', 'alta'];
  var ETQ = { alta: '🟢 Confianza alta', media: '🟡 Confianza media', baja: '🟠 Confianza baja', dejar: '🔴 Para dejar pasar' };
  /* cortes de confianza por deporte, sobre lo que de verdad ganó el favorito en ese tramo (fútbol es a 3 resultados) */
  var CORTE = { nba: [0.70, 0.60], nhl: [0.64, 0.56], nfl: [0.70, 0.60], fut: [0.62, 0.50], tenis: [0.72, 0.62] };
  var QUE = { nba: 'juegos', nhl: 'juegos', nfl: 'juegos', fut: 'partidos', tenis: 'partidos' };

  /* razones de forma: [peso, texto]. f = calc() de forma.js (o tira() en tenis), n = nombre, dep */
  function razonesForma(f, n, dep, local, esFav) {
    var a = [], c = [];   // a = suma para este lado, c = resta
    if (!f || f.n < 3) return { a: a, c: c };
    var N = '<b>' + esc(n) + '</b>', u = f.u10 || null, tenis = dep === 'tenis';
    var w10 = tenis ? f.w : u.w, n10 = tenis ? f.n : u.n, pct = n10 ? w10 / n10 : 0.5;
    if (f.racha && f.racha.n >= 3 && (f.racha.res === 'V' || f.racha.w)) a.push([1.2 + 0.1 * Math.min(f.racha.n, 8), N + ' viene de ' + f.racha.n + ' victorias seguidas']);
    else if (f.racha && f.racha.n >= 3 && f.racha.res === 'D') c.push([1.2 + 0.1 * Math.min(f.racha.n, 8), N + ' arrastra ' + f.racha.n + ' derrotas seguidas']);
    if (n10 >= 5 && pct >= 0.7 && !(f.racha && f.racha.n >= 3 && f.racha.res === 'V')) a.push([1.1, N + ' ganó ' + w10 + ' de sus últimos ' + n10]);
    if (n10 >= 5 && pct <= 0.3 && !(f.racha && f.racha.n >= 3 && f.racha.res === 'D')) c.push([1.1, N + ' solo ganó ' + w10 + ' de sus últimos ' + n10]);
    if (!tenis) {
      if (f.etq === 'sube') a.push([0.8, N + ' viene jugando mejor que su promedio de la temporada']);
      if (f.etq === 'baja') c.push([0.8, N + ' viene jugando peor que su promedio de la temporada']);
      if (f.sede && f.sede.n >= 4) {
        var sp = (f.sede.w + (f.sede.e || 0) / 2) / f.sede.n, rec = f.sede.w + '-' + (dep === 'fut' ? f.sede.e + '-' : '') + f.sede.l;
        if (sp >= 0.7) a.push([0.7, N + (local ? ' es fuerte en casa (' : ' rinde bien de visita (') + rec + ')']);
        if (sp <= 0.35) c.push([0.7, N + (local ? ' está flojo en casa este año (' : ' sufre de visita (') + rec + ')']);
      }
      if (f.rivales !== null && f.rivales !== undefined && pct >= 0.6 && f.rivales <= 0.44) c.push([0.5, 'la buena racha de ' + N + ' fue contra rivales flojos']);
      /* descanso */
      if (dep === 'nba' || dep === 'nhl') {
        if (f.desc <= 1) c.push([1.3, N + ' jugó ayer (back-to-back)']);
        else if (f.en7 >= 4) c.push([0.6, N + ' lleva ' + f.en7 + ' juegos en 7 días']);
      } else if (dep === 'nfl') {
        if (f.desc <= 5) c.push([1.0, N + ' viene de semana corta (' + f.desc + ' días)']);
        else if (f.desc >= 13) a.push([0.9, N + ' viene de semana libre']);
      } else if (dep === 'fut') {
        if (f.desc <= 3) c.push([0.8, N + ' jugó hace ' + f.desc + ' días']);
      }
    } else if (f.n5 >= 5) {
      if (f.w5 >= 4 && !(f.racha && f.racha.n >= 3 && f.racha.res === 'V')) a.push([0.8, N + ' ganó ' + f.w5 + ' de sus últimos 5']);
      if (f.w5 <= 1 && !(f.racha && f.racha.n >= 3 && f.racha.res === 'D')) c.push([0.8, N + ' perdió ' + (5 - f.w5) + ' de sus últimos 5']);
    }
    return { a: a, c: c };
  }

  /* ctx: { dep, fav, riv, favLocal (true/false/null), p (% del favorito que se muestra), merc (true si p es del mercado),
           pMod (% del modelo para el MISMO favorito, o null), vivo, ac {pct, n} (tramo medido), fF / fR (forma del favorito / rival),
           mov (pts que se movió la línea HACIA el favorito; negativo = en contra), alertas [[peso, texto]], aFavor [[peso, texto]],
           pE (empate, fútbol), extras [{t, p}], nota (texto final propio del deporte), poco (pocos datos), pre (pretemporada) } */
  function analizar(ctx) {
    var dep = ctx.dep, fav = ctx.fav, riv = ctx.riv, p = ctx.p;
    if (!(p > 0 && p < 1) || !fav) return null;
    var F = '<b>' + esc(fav) + '</b>', R = '<b>' + esc(riv) + '</b>';
    var cor = CORTE[dep] || CORTE.nba, ref = (ctx.ac && ctx.ac.pct > 0) ? ctx.ac.pct : p;
    var nivel = ref >= cor[0] ? 3 : (ref >= cor[1] ? 2 : 1), porque = [];
    /* 1. el pronóstico */
    var lado = ctx.favLocal === true ? ' en casa' : (ctx.favLocal === false ? ' de visita' : '');
    var parejo = dep === 'fut' ? p < 0.45 : p < 0.55;
    var s1 = parejo ? 'Juego muy parejo: el más probable es ' + F + lado + ' con apenas ' + p0(p) + '.' : F + ' es el favorito' + lado + ' con ' + p0(p) + (ctx.merc ? '' : ' (solo el modelo, no hay precio del mercado)') + '.';
    if (dep === 'fut' && ctx.pE > 0) s1 += ' El empate tiene ' + p0(ctx.pE) + '.';
    /* 2. modelo contra mercado */
    var s2 = '';
    if (ctx.merc && ctx.pMod > 0 && !ctx.vivo) {
      var gap = (p - ctx.pMod) * 100, mismo = dep === 'fut' ? ctx.modMismo !== false : ctx.pMod >= 0.5;
      if (!mismo) { s2 = 'Ojo: el modelo se va con ' + R + '. Cuando no se ponen de acuerdo, el lado del mercado gana más veces, pero acierta menos de lo normal.'; nivel -= 1; porque.push('modelo y mercado no coinciden'); }
      else if (Math.abs(gap) <= 3) s2 = 'El modelo y el mercado lo ven igual (' + p0(ctx.pMod) + ' y ' + p0(p) + ').';
      else if (gap > 7) { s2 = 'El modelo lo ve menos claro (' + p0(ctx.pMod) + '): el precio sabe algo que los números no ven, normalmente lesiones o alineaciones.'; nivel -= 1; porque.push('el modelo lo ve bastante menos claro'); }
      else if (gap > 0) s2 = 'El modelo lo ve un poco menos claro (' + p0(ctx.pMod) + '), pero va con el mismo.';
      else s2 = 'El modelo lo ve todavía más claro (' + p0(ctx.pMod) + ').';
    }
    /* 3. cuántas veces se cumple */
    var s3 = (ctx.ac && ctx.ac.n >= 50 && !ctx.vivo) ? 'Con un % así, el favorito ganó <b>' + Math.round(ctx.ac.pct * 100) + ' de cada 100</b> ' + QUE[dep] + ' en temporadas pasadas.' : '';
    /* 4. a favor y en contra */
    var rf = razonesForma(ctx.fF, fav, dep, ctx.favLocal === true, true), rr = razonesForma(ctx.fR, riv, dep, ctx.favLocal === false, false);
    var aFav = rf.a.concat(rr.c), cFav = rf.c.concat(rr.a);
    if (ctx.mov >= 2) aFav.push([1.0, 'la línea se movió ' + ctx.mov.toFixed(0) + ' pts hacia ' + F + ' desde que abrió']);
    if (ctx.mov <= -2) cFav.push([1.2, 'la línea se movió ' + Math.abs(ctx.mov).toFixed(0) + ' pts hacia ' + R + ' desde que abrió (alguien sabe algo)']);
    (ctx.aFavor || []).forEach(function (x) { aFav.push(x); });
    (ctx.alertas || []).forEach(function (x) { cFav.push(x); });
    var orden = function (l) { return l.sort(function (x, y) { return y[0] - x[0]; }).slice(0, 3).map(function (x) { return x[1]; }); };
    var A = orden(aFav), C = orden(cFav);
    var pesoC = cFav.reduce(function (s, x) { return s + x[0]; }, 0), pesoA = aFav.reduce(function (s, x) { return s + x[0]; }, 0);
    if (pesoC - pesoA >= 2.5 && nivel >= 2) { nivel -= 1; porque.push('llega con más cosas en contra que a favor'); }
    if (ctx.poco) { nivel -= 1; porque.push('hay pocos datos de uno de los dos'); }
    if (ctx.pre) { nivel = Math.min(nivel, 1); porque.push('es pretemporada'); }
    if (parejo) nivel = Math.min(nivel, 1);
    nivel = Math.max(0, Math.min(3, nivel));
    var k = NIV[nivel];
    /* 5. qué haría */
    var s5;
    if (ctx.vivo) s5 = 'El juego ya empezó: el % de arriba es en vivo y ya cuenta el marcador.';
    else if (k === 'alta') s5 = 'Es de los picks sólidos: sirve al ganador directo o como pata de una combinada de 2.';
    else if (k === 'media') s5 = 'Sirve como pick sencillo. Para combinada, mejor busca uno más fuerte.';
    else if (k === 'baja') s5 = 'Si lo juegas, que sea poco y solo.';
    else s5 = 'Lo más sano es dejarlo pasar.';
    if (!ctx.vivo && dep === 'fut' && ctx.pE >= 0.26 && ctx.pDoble > 0 && (k === 'baja' || k === 'dejar' || k === 'media')) s5 += ' Si te gusta ' + F + ', la doble oportunidad (' + esc(fav) + ' o empate) sale ' + p0(ctx.pDoble) + '.';
    var ex = (ctx.extras || []).filter(function (x) { return x && x.p >= 0.74; }).sort(function (x, y) { return y.p - x.p; })[0];
    if (!ctx.vivo && ex) s5 += ' Algo más probable en este juego: <b>' + esc(ex.t) + '</b> (' + p0(ex.p) + ').';
    if (ctx.nota) s5 += ' ' + ctx.nota;
    var s4 = (!A.length && !C.length && !ctx.vivo) ? 'Ninguno de los dos llega con algo especial (rachas, descanso, bajas): manda el %.' : '';
    return { k: k, etq: ETQ[k], intro: [s1, s2, s3, s4].filter(Boolean).join(' '), aFavor: A, enContra: C, porque: porque, cierre: s5 };
  }

  function lista(t, l, cls) {
    if (!l.length) return '';
    return '<div class="anL"><div class="anT ' + cls + '">' + t + '</div>' + l.map(function (x) { return '<div class="anI">' + x.charAt(0).toUpperCase() + x.slice(1) + '.</div>'; }).join('') + '</div>';
  }
  var CSS = '<style id="anCss">.anBox{border:1px solid var(--line2);border-radius:var(--r2,14px);padding:13px 14px;background:var(--bg2);margin-bottom:12px}' +
    '.anHd{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.anHd b{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--mut2)}' +
    '.anChip{font-size:12px;font-weight:800;padding:4px 9px;border-radius:20px;background:var(--bg1,rgba(255,255,255,.06));white-space:nowrap}' +
    '.anP{font-size:13.5px;line-height:1.55;color:var(--txt)}.anL{margin-top:9px}.anT{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}' +
    '.anT.ok{color:var(--good,#3ecf8e)}.anT.bad{color:var(--bad,#ff6b6b)}.anI{font-size:13px;line-height:1.5;color:var(--mut);padding-left:12px;position:relative}.anI:before{content:"·";position:absolute;left:2px;font-weight:900}' +
    '.anC{margin-top:10px;font-size:13.5px;line-height:1.5;color:var(--txt);border-top:1px solid var(--line2);padding-top:9px}</style>';
  function html(ctx) {
    var r; try { r = analizar(ctx); } catch (e) { return ''; }
    if (!r) return '';
    var css = (typeof document !== 'undefined' && document.getElementById && document.getElementById('anCss')) ? '' : CSS;
    return css + '<div class="anBox"><div class="anHd"><b>🧠 El análisis</b><span class="anChip">' + r.etq + '</span></div>' +
      '<div class="anP">' + r.intro + '</div>' + lista('A favor de ' + esc(ctx.fav), r.aFavor, 'ok') + lista('En contra', r.enContra, 'bad') +
      '<div class="anC"><b>Qué haría:</b> ' + r.cierre + (r.porque.length ? ' <span style="color:var(--mut)">(Baja la confianza: ' + r.porque.join('; ') + '.)</span>' : '') + '</div>' +
      '<details class="nota" style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">¿Cómo se arma este análisis?</summary>Lo escribe la app con reglas fijas: con los mismos datos dice siempre lo mismo. ' +
      'La confianza sale de lo medido: cuántas veces ganó el favorito con ese % en temporadas pasadas y si el modelo y el mercado coinciden. ' +
      'Lo de «a favor» y «en contra» (rachas, descanso, local o visita, la línea) es contexto: medido solo, no sube los aciertos, porque el precio ya lo trae casi todo. No ve noticias de última hora.</details></div>';
  }
  function impP(a) { a = +a; return a < 0 ? -a / (-a + 100) : 100 / (a + 100); }
  /* NBA, NHL y NFL: arma el ctx con lo que tiene cada juego.
     o = { dep, g, games, H, A (equipos con .n), pHMod (modelo, local), pMk (mercado sin margen, local, o null), vivo, alertas, nota } */
  function ctxUS(o) {
    var g = o.g, merc = o.pMk !== null && o.pMk !== undefined, pH = merc ? o.pMk : o.pHMod, favH = pH >= 0.5, F = root.OVAForma, ac = null, fH = null, fA = null, mov = null;
    try { if (F) { fH = F.calc(o.games || [], g.h, g.ts, true, o.dep); fA = F.calc(o.games || [], g.a, g.ts, false, o.dep); } } catch (e) { }
    try { if (root.OVAAciertos) ac = root.OVAAciertos.fila(o.dep, Math.max(pH, 1 - pH), favH, merc); } catch (e) { }
    var od = g.odds; if (od && od.mlH && od.mlA && od.mlHo && od.mlAo && !o.vivo) {
      var nv = function (x, y) { var a = impP(x), b = impP(y); return a / (a + b); }, d = (nv(od.mlH, od.mlA) - nv(od.mlHo, od.mlAo)) * 100; mov = favH ? d : -d;
    }
    return { dep: o.dep, fav: favH ? o.H.n : o.A.n, riv: favH ? o.A.n : o.H.n, favLocal: g.neutral ? null : favH, p: Math.max(pH, 1 - pH), merc: merc,
      pMod: merc && isFinite(o.pHMod) ? (favH ? o.pHMod : 1 - o.pHMod) : null, vivo: !!o.vivo, ac: ac, fF: favH ? fH : fA, fR: favH ? fA : fH, mov: mov,
      alertas: o.alertas || [], aFavor: o.aFavor || [], pre: !!g.pre, nota: o.nota || '' };
  }
  var API = { analizar: analizar, html: html, razonesForma: razonesForma, ctxUS: ctxUS, CORTE: CORTE };
  root.OVAAnalista = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
