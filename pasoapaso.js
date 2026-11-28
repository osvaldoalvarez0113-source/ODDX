/* ===================================================================
   OVA · PASO A PASO (window.OVAPaso) — pestaña «Paso a paso» del juego en fútbol, NBA, NHL, NFL y tenis
   Explica el juego como se hizo a mano con Osvaldo el 27-nov-2026 (Forest 3-2 Chelsea):
     1) De la cuota al %: cuota → % con la comisión → % sin comisión (y cuánta comisión cobra la casa).
     2) Lo que espera la casa: goles / puntos / carreras de cada equipo despejados de la cuota y el total.
     3) La tabla contra el juego: récord contra lo que «debería» tener por su diferencia de goles o puntos.
     4) Las opciones, de más a menos chance de acertar, con su cuota justa.
     5) Qué mirar antes del juego (lo que más pesa en cada deporte).
   Es fijo: no baja nada, no cambia ningún %, ningún pick ni ningún número de las otras pestañas.
   Lo medido (docs/): el precio ya trae casi todo; «juega mejor que su récord» (pitagórico de MLB, suerte/PDO de NHL,
   memoria y forma) NO le gana al precio. Aquí se enseña para ENTENDER el juego, no como ventaja.
   Sin DOM: todas las cuentas son funciones puras (las usan las pruebas) y html() devuelve el texto.
   =================================================================== */
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function p0(x) { return Math.round(x * 100) + '%'; }
  function p1(x) { return (x * 100).toFixed(1) + '%'; }
  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  /* ---- cuotas ---- */
  function impAm(a) { a = +a; if (!a || !isFinite(a)) return null; return a > 0 ? 100 / (a + 100) : -a / (-a + 100); }
  function impDec(d) { d = +d; return d > 1 ? 1 / d : null; }
  function amer(p) { if (!(p > 0 && p < 1)) return '—'; var a = p >= 0.5 ? -Math.round(p / (1 - p) * 100) : Math.round((1 - p) / p * 100); return (a > 0 ? '+' : '') + a; }
  function deci(p) { return p > 0 ? (1 / p).toFixed(2) : '—'; }
  /* lista de cuotas (americanas o decimales) → % con comisión, suma y % sin comisión */
  function sinComision(cuotas, tipo) {
    var c = cuotas.map(function (x) { return tipo === 'dec' ? impDec(x) : impAm(x); });
    if (c.some(function (x) { return x === null; })) return null;
    var s = c.reduce(function (a, b) { return a + b; }, 0);
    return { con: c, suma: s, sin: c.map(function (x) { return x / s; }), margen: s - 1 };
  }

  /* ---- Poisson ---- */
  function pmf(l, k) { var p = Math.exp(-l); for (var i = 1; i <= k; i++) p *= l / i; return p; }
  function matriz(lL, lV, max) {
    max = max || 12; var a = [], b = [], i, j;
    for (i = 0; i <= max; i++) { a.push(pmf(lL, i)); b.push(pmf(lV, i)); }
    var r = { L: 0, E: 0, V: 0, tot: [], btts: 0, anL: 1 - a[0], anV: 1 - b[0], dif: {} };
    for (i = 0; i <= 2 * max; i++) r.tot.push(0);
    for (i = 0; i <= max; i++) for (j = 0; j <= max; j++) {
      var p = a[i] * b[j];
      if (i > j) r.L += p; else if (i === j) r.E += p; else r.V += p;
      r.tot[i + j] += p; if (i > 0 && j > 0) r.btts += p;
      r.dif[i - j] = (r.dif[i - j] || 0) + p;
    }
    return r;
  }
  function pMas(r, linea) { var s = 0; for (var k = 0; k < r.tot.length; k++) if (k > linea) s += r.tot[k]; return s; }
  /* margen del local ≥ k (k puede ser negativo: «pierde por menos de…») */
  function pDif(r, k) { var s = 0; for (var d in r.dif) if (+d >= k) s += r.dif[d]; return s; }
  /* fútbol: goles esperados que cuadran con el 1X2 del mercado (local y visita) y, si hay, con el Más de 2.5 */
  function golesDe1x2(pL, pV, pMas25) {
    var best = null;
    function prueba(a, b) {
      if (a < 0.15 || b < 0.1) return;
      var r = matriz(a, b, 10), e = (r.L - pL) * (r.L - pL) + (r.V - pV) * (r.V - pV) + (pMas25 == null ? 0 : (pMas(r, 2.5) - pMas25) * (pMas(r, 2.5) - pMas25));
      if (!best || e < best.e) best = { e: e, L: a, V: b };
    }
    var a, b;
    if (pMas25 == null) { for (a = 0.2; a <= 2.5; a += 0.01) prueba(a, 2.65 - a); }   /* sin total: se fija la media de goles de las grandes ligas */
    else {
      for (a = 0.3; a <= 3.6; a += 0.06) for (b = 0.2; b <= 3.4; b += 0.06) prueba(a, b);
      var a0 = best.L, b0 = best.V;
      for (a = a0 - 0.07; a <= a0 + 0.07; a += 0.01) for (b = b0 - 0.07; b <= b0 + 0.07; b += 0.01) prueba(a, b);
    }
    return best ? { L: Math.round(best.L * 100) / 100, V: Math.round(best.V * 100) / 100, conTotal: pMas25 != null } : null;
  }
  /* NHL / MLB: goles o carreras con el ganador a 2 lados (el empate se decide a moneda en tiempo extra) y el total */
  function golesDe2(pL, total, pMasTot) {
    var best = null, T = total || 6;
    for (var s = Math.max(0.5, T - 1.6); s <= T + 1.6; s += 0.05) {
      var lo = 0.05, hi = 0.95, f = 0.5;
      for (var it = 0; it < 22; it++) { f = (lo + hi) / 2; var r0 = matriz(s * f, s * (1 - f), 16); if (r0.L + r0.E / 2 < pL) lo = f; else hi = f; }
      var r = matriz(s * f, s * (1 - f), 16), e = pMasTot == null ? Math.abs(s - T) : Math.abs(pMas(r, total) - pMasTot);
      if (!best || e < best.e) best = { e: e, s: s, f: f };
    }
    return best ? { L: Math.round(best.s * best.f * 100) / 100, V: Math.round(best.s * (1 - best.f) * 100) / 100, conTotal: pMasTot != null } : null;
  }
  /* NBA / NFL: puntos con el hándicap del local (negativo = favorito) y el total */
  function puntosDe(sp, tot) { if (sp == null || tot == null) return null; return { L: (tot - sp) / 2, V: (tot + sp) / 2 }; }
  function phi(x) { var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
  var SD = { nba: { m: 12.5, t: 18.5 }, nfl: { m: 13.5, t: 13.5 } };

  /* ---- la tabla contra el juego ---- */
  var EXP = { nba: 14, nfl: 2.37, nhl: 2.05, mlb: 1.83 };
  /* f = OVAForma.calc(): temp {w,e,l,n}, pfT, pcT (promedios por juego). Devuelve lo que «debería» tener */
  function tablaVsJuego(f, dep) {
    if (!f || !f.temp || f.temp.n < (dep === 'nfl' ? 4 : 6) || f.pfT == null || f.pcT == null) return null;
    var t = f.temp, n = t.n;
    if (dep === 'fut') {
      var r = matriz(Math.max(0.05, f.pfT), Math.max(0.05, f.pcT), 10), xp = (3 * r.L + r.E) * n, pts = 3 * t.w + t.e;
      return { n: n, real: pts, esp: xp, dif: pts - xp, txtReal: t.w + '-' + t.e + '-' + t.l + ' (' + pts + ' pts)', txtEsp: Math.round(xp) + ' pts', umbral: 3, unidad: 'puntos' };
    }
    var k = EXP[dep] || 2, pf = Math.pow(f.pfT, k), pa = Math.pow(f.pcT, k), pe = pf / (pf + pa), wEsp = pe * n, wReal = t.w + t.e / 2;
    return { n: n, real: wReal, esp: wEsp, dif: wReal - wEsp, txtReal: t.w + '-' + t.l + (t.e ? '-' + t.e : ''), txtEsp: Math.round(wEsp) + '-' + Math.round(n - wEsp),
      umbral: dep === 'nfl' ? 1 : (dep === 'mlb' ? 3 : 2), unidad: 'victorias' };
  }
  function lecturaTabla(nom, tv, dep, xg) {
    if (!tv) return '<li>' + nom + ': todavía pocos juegos esta temporada para leerlo.</li>';
    var que = dep === 'fut' ? 'goles' : (dep === 'nhl' ? 'goles' : (dep === 'mlb' ? 'carreras' : 'puntos'));
    var o = '<li>' + nom + ': lleva <b>' + esc(tv.txtReal) + '</b>; por su diferencia de ' + que + ' debería ir ~<b>' + esc(tv.txtEsp) + '</b>. ';
    if (tv.dif <= -tv.umbral) o += '<b>Juega mejor de lo que dice la tabla</b> (le faltan ~' + Math.round(-tv.dif) + ' ' + tv.unidad + ': mala suerte en los juegos cerrados).';
    else if (tv.dif >= tv.umbral) o += '<b>Su récord es mejor de lo que juega</b> (le sobran ~' + Math.round(tv.dif) + ' ' + tv.unidad + ': ganó juegos cerrados).';
    else o += 'Su récord cuadra con cómo juega.';
    if (xg) {
      var rx = matriz(Math.max(0.05, xg.f), Math.max(0.05, xg.c), 10), xpx = (3 * rx.L + rx.E) * tv.n, dx = tv.real - xpx;
      o += ' Por sus tiros crea ~' + n1(xg.f) + ' y permite ~' + n1(xg.c) + ' goles por partido (goles esperados aprox.): con eso debería ir ~<b>' + Math.round(xpx) + ' pts</b>. ';
      if (dx <= -3) o += '<b>Por cómo juega, merece más de lo que dice la tabla</b> (~' + Math.round(-dx) + ' pts más).';
      else if (dx >= 3) o += '<b>Por cómo juega, la tabla lo trata mejor de lo que merece</b> (~' + Math.round(dx) + ' pts de más).';
      else o += 'Los tiros cuadran con su tabla.';
    }
    return o + '</li>';
  }

  /* ---- opciones, de más a menos chance ---- */
  function opcionesFut(nL, nV, x12, r) {
    var o = [[nL + ' gana', x12[0]], ['Empate', x12[1]], [nV + ' gana', x12[2]], [nL + ' o empate', x12[0] + x12[1]], [nV + ' o empate', x12[2] + x12[1]], ['Gana cualquiera (no hay empate)', x12[0] + x12[2]]];
    if (r) o.push(['Más de 1.5 goles', pMas(r, 1.5)], ['Más de 2.5 goles', pMas(r, 2.5)], ['Menos de 2.5 goles', 1 - pMas(r, 2.5)], ['Menos de 3.5 goles', 1 - pMas(r, 3.5)],
      ['Ambos anotan', r.btts], ['Ambos anotan: No', 1 - r.btts], [nL + ' anota', r.anL], [nV + ' anota', r.anV]);
    return o;
  }
  function opcionesUS(dep, nL, nV, pL, sp, tot, r) {
    var o = [[nL + ' gana', pL], [nV + ' gana', 1 - pL]];
    if ((dep === 'nba' || dep === 'nfl') && sp != null) {
      var s = SD[dep], mu = -sp, fav = sp <= 0 ? nL : nV, aL = Math.abs(sp), cov = function (k) { return 1 - phi((k - mu) / s.m); };
      o.push([fav + ' gana por más de ' + aL, 0.5], [(fav === nL ? nV : nL) + ' gana o pierde por menos de ' + aL, 0.5]);
      var amp = aL + (dep === 'nba' ? 6 : 7), pAmp = fav === nL ? 1 - cov(amp) : cov(-amp);
      o.push([(fav === nL ? nV : nL) + ' gana o pierde por menos de ' + amp, pAmp]);
      if (tot != null) { var d = dep === 'nba' ? 10 : 7; o.push(['Más de ' + tot + ' puntos', 0.5], ['Menos de ' + tot + ' puntos', 0.5], ['Más de ' + (tot - d) + ' puntos', 1 - phi(-d / s.t)], ['Menos de ' + (tot + d) + ' puntos', phi(d / s.t)]); }
    } else if (r) {
      var q = dep === 'mlb' ? 'carreras' : 'goles', fav2 = pL >= 0.5 ? nL : nV, favL = pL >= 0.5;
      o.push([fav2 + ' gana por 2 o más', favL ? pDif(r, 2) : 1 - pDif(r, -1)], [(favL ? nV : nL) + ' gana o pierde por 1', favL ? 1 - pDif(r, 2) : pDif(r, -1)]);
      if (tot != null) o.push(['Más de ' + tot + ' ' + q, pMas(r, tot)], ['Menos de ' + tot + ' ' + q, 1 - pMas(r, tot)], ['Más de ' + (tot - 1) + ' ' + q, pMas(r, tot - 1)], ['Menos de ' + (tot + 1) + ' ' + q, 1 - pMas(r, tot + 1)]);
      o.push(['Ambos anotan', r.btts]);
    }
    return o;
  }
  /* tenis: con el % del partido se despeja el % por set (a 3 o 5 sets) */
  function setDe(p, bo) {
    var gana = function (s) { var w = (bo + 1) / 2, t = 0; for (var l = 0; l < w; l++) t += comb(w - 1 + l, l) * Math.pow(s, w) * Math.pow(1 - s, l); return t; };
    var lo = 0.01, hi = 0.99; for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if (gana(m) < p) lo = m; else hi = m; } return (lo + hi) / 2;
  }
  function comb(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function opcionesTenis(nA, nB, pA, bo) {
    bo = bo || 3; var s = setDe(pA, bo), w = (bo + 1) / 2, sinPerder = function (x) { return Math.pow(x, w); };
    var o = [[nA + ' gana', pA], [nB + ' gana', 1 - pA], [nA + ' gana al menos un set', 1 - sinPerder(1 - s)], [nB + ' gana al menos un set', 1 - sinPerder(s)],
      [nA + ' gana sin perder set', sinPerder(s)], [nB + ' gana sin perder set', sinPerder(1 - s)]];
    if (bo === 3) o.push(['Se juega el 3er set', 2 * s * (1 - s)], ['Termina en 2 sets', 1 - 2 * s * (1 - s)]);
    return { o: o, s: s };
  }
  function tablaOpciones(o) {
    o = o.filter(function (x) { return x[1] > 0.005 && x[1] < 0.995; }).sort(function (a, b) { return b[1] - a[1]; });
    return '<div class="psTab psT3"><div class="th">Opción</div><div class="th n">Chance</div><div class="th n">Cuota justa</div>' +
      o.map(function (x) { return '<div class="nm">' + esc(x[0]) + '</div><div class="n"><b>' + p0(x[1]) + '</b></div><div class="n">' + amer(x[1]) + ' · ' + deci(x[1]) + '</div>'; }).join('') + '</div>';
  }

  var MIRAR = {
    fut: ['La <b>alineación</b> (sale ~1 hora antes): si falta el goleador o el portero titular, o si rota por copa entre semana.', 'Si la cuota se mueve fuerte cerca del partido: casi siempre es una baja o una rotación.', 'Equipos que juegan mejor de lo que dice la tabla (punto 3): la tabla engaña más que los goles esperados.'],
    nba: ['<b>Quién juega:</b> si falta una estrella cambia todo (sale en 🚑 bajas que pesan).', 'Segunda noche seguida (back-to-back) y descansos de estrellas.', 'Si la línea se movió desde que abrió: casi siempre es una noticia de bajas.'],
    nhl: ['<b>El portero titular</b>: es lo que más mueve un juego de NHL (se confirma en la mañana).', 'Juegos en noches seguidas: el portero suplente suele jugar la segunda.', 'Si la línea se movió desde que abrió.'],
    nfl: ['<b>El mariscal de campo (QB)</b>: si no juega el titular, el juego es otro.', 'Clima (viento fuerte baja los puntos) y semana corta.', 'Si la línea se movió en la semana: casi siempre es una baja.'],
    mlb: ['<b>El lanzador abridor</b> (y si lo cambian a última hora).', 'El bullpen: si viene cansado de los juegos anteriores.', 'El lineup (sale 2-4 horas antes) y el viento en parques abiertos.'],
    tenis: ['Si viene de un <b>partido largo</b> ayer (cansancio) o de una lesión.', 'La superficie: hay jugadores que cambian mucho de arcilla a dura o hierba.', 'Clasificación y torneos chicos: ahí el mercado sabe más que cualquier modelo.']
  };

  /* ctx: { dep, nL, nV, fL, fV (OVAForma.calc), mkTxt (de dónde sale el precio),
            cuotas: {tipo:'am'|'dec'|'cent', v:[...], nombres:[...]} (las de la casa, para el paso 1) o null,
            p: [pL,pE,pV] (fútbol) o pL (2 lados), sinMercado: true si es el % del modelo,
            pMas25 (fútbol), sp, tot, pMasTot (NHL/MLB), xgL, xgV {f,c} (fútbol, por tiros), bo (tenis) } */
  function html(c) {
    try {
      var dep = c.dep, nL = esc(c.nL), nV = esc(c.nV), o = '<div class="ps">';
      /* 1) de la cuota al % */
      o += '<h3>1) De la cuota al %</h3>';
      var nombres = c.cuotas && c.cuotas.nombres ? c.cuotas.nombres : (dep === 'fut' ? [c.nL, 'Empate', c.nV] : [c.nL, c.nV]);
      if (c.cuotas && c.cuotas.v && c.cuotas.v.length) {
        var t = c.cuotas.tipo, cents = t === 'cent', sc = sinComision(cents ? c.cuotas.v.map(function (x) { return 100 / x; }) : c.cuotas.v, cents ? 'dec' : t);
        if (sc) {
          o += '<div class="psTab"><div class="th">Resultado</div><div class="th n">Cuota</div><div class="th n">% con comisión</div><div class="th n">% real</div>' +
            nombres.map(function (n, i) { return '<div class="nm">' + esc(n) + '</div><div class="n">' + esc(cents ? c.cuotas.v[i] + '¢' : (t === 'am' && c.cuotas.v[i] > 0 ? '+' : '') + c.cuotas.v[i]) + '</div><div class="n">' + p1(sc.con[i]) + '</div><div class="n"><b>' + p1(sc.sin[i]) + '</b></div>'; }).join('') + '</div>';
          o += '<div class="nota">Los % con comisión suman <b>' + p1(sc.suma) + '</b>: ese ' + p1(sc.margen) + ' de más es lo que se queda la casa' + (cents ? ' (en Kalshi es la diferencia entre comprar los dos lados)' : '') + '. Dividiendo cada uno entre ' + p1(sc.suma) + ' sale el % real.' +
            (t === 'am' ? ' Cómo se pasa: con <b>−</b>, número ÷ (número + 100); con <b>+</b>, 100 ÷ (número + 100).' : (t === 'dec' ? ' Cómo se pasa: 1 ÷ cuota.' : '')) + '</div>';
        }
      }
      var P = c.p, pPrin = Array.isArray(P) ? P : [P, 1 - P], conTabla = !!(c.cuotas && c.cuotas.v && c.cuotas.v.length);
      if (!conTabla) {
        o += '<div class="psTab psT3"><div class="th">Resultado</div><div class="th n">% real</div><div class="th n">Cuota justa</div>' +
          nombres.map(function (n, i) { return '<div class="nm">' + esc(n) + '</div><div class="n"><b>' + p1(pPrin[i]) + '</b></div><div class="n">' + amer(pPrin[i]) + ' · ' + deci(pPrin[i]) + '</div>'; }).join('') + '</div>' +
          '<div class="nota">' + (c.sinMercado ? 'Sin precio del mercado: es el % del modelo.' : 'Precio de ' + esc(c.mkTxt || 'mercado') + ', ya sin comisión.') +
          ' La «cuota justa» es la que pagaría una casa sin comisión; tu casa paga un poco menos (cobra ~4-5%). Para pasar una cuota a %: con <b>−</b>, número ÷ (número + 100); con <b>+</b>, 100 ÷ (número + 100); en decimal, 1 ÷ cuota. Luego se divide cada % entre la suma de todos para quitar la comisión.</div>';
      } else o += '<div class="nota">Precio usado: ' + esc(c.mkTxt || 'mercado, sin comisión') + '. ' + nombres.map(function (n, i) { return esc(n) + ' <b>' + p0(pPrin[i]) + '</b>'; }).join(' · ') + '</div>';

      /* 2) lo que espera la casa */
      var r = null, ex = null;
      if (dep === 'fut' && Array.isArray(P)) { ex = golesDe1x2(P[0], P[2], c.pMas25); if (ex) r = matriz(ex.L, ex.V, 10); }
      else if ((dep === 'nhl' || dep === 'mlb') && P != null) { ex = golesDe2(P, c.tot, c.pMasTot); if (ex) r = matriz(ex.L, ex.V, 16); }
      if (dep !== 'tenis') {
        o += '<h3>2) Lo que espera la casa</h3>';
        if ((dep === 'nba' || dep === 'nfl')) {
          var pt = puntosDe(c.sp, c.tot);
          o += pt ? '<div class="psChips"><div>' + nL + '<b>' + n1(pt.L) + '</b><small>puntos</small></div><div>' + nV + '<b>' + n1(pt.V) + '</b><small>puntos</small></div></div>' +
            '<div class="nota">Sale del hándicap (' + esc(c.nL) + ' ' + (c.sp > 0 ? '+' : '') + c.sp + ') y el total (' + c.tot + '): local = (total − hándicap) ÷ 2. La casa espera que ' + esc(c.sp <= 0 ? c.nL : c.nV) + ' gane por ~' + Math.abs(c.sp) + '.</div>' :
            '<div class="nota">Todavía no hay hándicap y total de la casa para este juego.</div>';
        } else if (ex) {
          var q = dep === 'mlb' ? 'carreras' : 'goles';
          o += '<div class="psChips"><div>' + nL + '<b>' + ex.L.toFixed(2) + '</b><small>' + q + '</small></div><div>' + nV + '<b>' + ex.V.toFixed(2) + '</b><small>' + q + '</small></div><div>Total<b>' + (ex.L + ex.V).toFixed(2) + '</b><small>' + q + '</small></div></div>' +
            '<div class="nota">Son los ' + q + ' que cuadran con el precio' + (ex.conTotal ? ' del ganador y del Más/Menos' : (dep === 'fut' ? ' del 1X2 (sin precio del total se toma la media de goles de las grandes ligas, 2.65)' : ' del ganador y la línea del total')) + '. Es el partido que la casa tiene en la cabeza; de ahí salen las opciones del punto 4.</div>';
        } else o += '<div class="nota">Sin precio suficiente para despejarlo.</div>';
      }

      /* 3) la tabla contra el juego */
      if (dep !== 'tenis') {
        o += '<h3>3) La tabla contra el juego</h3><ul class="psLs">' + lecturaTabla('<b>' + nL + '</b>', tablaVsJuego(c.fL, dep), dep, c.xgL) + lecturaTabla('<b>' + nV + '</b>', tablaVsJuego(c.fV, dep), dep, c.xgV) + '</ul>' +
          '<div class="nota">«Debería» = lo que da su diferencia de ' + (dep === 'nba' || dep === 'nfl' ? 'puntos' : (dep === 'mlb' ? 'carreras' : 'goles')) + ' por juego (a favor contra en contra). Cuando la tabla y la diferencia no cuadran, la diferencia dice más de lo que viene. Ojo: la casa también lo sabe; medido en OVA, esto no le gana al precio. Sirve para entender por qué la cuota no sigue la tabla.</div>';
      }

      /* 4) opciones */
      o += '<h3>' + (dep === 'tenis' ? '2' : '4') + ') Las opciones, de más a menos chance</h3>';
      var ops;
      if (dep === 'fut') ops = opcionesFut(c.nL, c.nV, pPrin, r);
      else if (dep === 'tenis') { var ot = opcionesTenis(c.nL, c.nV, pPrin[0], c.bo); ops = ot.o; o += '<div class="nota">Con ' + p0(pPrin[0]) + ' para ' + nL + ' en el partido, su chance de ganar cada set es ~' + p0(ot.s) + (c.bo === 5 ? ' (a 5 sets)' : '') + '.</div>'; }
      else ops = opcionesUS(dep, c.nL, c.nV, pPrin[0], c.sp, c.tot, r);
      o += tablaOpciones(ops) + '<div class="nota">Más chance = paga menos: la «cuota justa» es lo mínimo que tendrían que pagarte para que valga la pena. Acertar seguido no es lo mismo que ganar dinero.' +
        ((dep === 'nba' || dep === 'nfl') && c.sp != null ? ' El hándicap y el total de la casa están hechos para quedar ~50/50.' : '') + ' Son aproximados: salen de la cuota, no de una medición propia de cada mercado.</div>';

      /* 5) qué mirar */
      o += '<h3>' + (dep === 'tenis' ? '3' : '5') + ') Qué mirar antes</h3><ul class="psLs">' + (MIRAR[dep] || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
      o += '<div class="nota">Lo honesto: la cuota ya trae casi todo lo que se sabe. Donde uno puede ver algo es en lo que llega tarde a la cuota (una baja, una rotación) y en lo que la tabla esconde.</div></div>';
      return CSS + o;
    } catch (e) { return '<div class="nota">No se pudo armar el paso a paso de este juego.</div>'; }
  }
  var CSS = '<style>.ps h3{margin:14px 0 6px}.psTab{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:5px 8px;font-size:12.5px;align-items:center;margin:4px 0}' +
    '.psTab.psT3{grid-template-columns:minmax(0,1.9fr) minmax(0,.7fr) minmax(0,1.1fr)}.psTab .th{color:var(--mut2,#888);font-size:11px;font-weight:700}.psTab .n{text-align:right;font-variant-numeric:tabular-nums}' +
    '.psTab .nm{overflow-wrap:anywhere}.psChips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}.psChips>div{flex:1 1 90px;background:var(--bg2,rgba(127,127,127,.12));border-radius:10px;padding:8px 10px;font-size:12px}' +
    '.psChips b{display:block;font-size:19px;margin-top:2px}.psChips small{color:var(--mut2,#888)}.psLs{margin:4px 0;padding-left:18px;font-size:13px;line-height:1.45}.psLs li{margin:4px 0}</style>';

  var api = { html: html, sinComision: sinComision, impAm: impAm, amer: amer, matriz: matriz, pMas: pMas, golesDe1x2: golesDe1x2, golesDe2: golesDe2, puntosDe: puntosDe,
    tablaVsJuego: tablaVsJuego, opcionesFut: opcionesFut, opcionesUS: opcionesUS, opcionesTenis: opcionesTenis, setDe: setDe };
  root.OVAPaso = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
