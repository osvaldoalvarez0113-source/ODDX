/* OVA · Precio del mercado de predicción (Polymarket) para cada juego.
   El robot  scripts/pred.js  (pred.yml, cada 10 min) deja un archivo por deporte en la rama «pred». Aquí se lee y se empareja con el juego de ESPN.
   Un precio de 62¢ = 62% de probabilidad. Sirve cuando no hay Pinnacle ni línea de ESPN, y sobre todo EN VIVO (ESPN borra su línea al empezar el juego). */
(function (root) {
  'use strict';
  var BASE = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/pred/pred-';
  var cache = {};

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  /* Polymarket nombra al equipo por su apodo («Wild», «Trail Blazers») o a veces completo; ESPN trae «Minnesota Wild». */
  function esDe(nick, completo) { var n = norm(nick), f = norm(completo); return !!n && !!f && (f === n || f.slice(-(n.length + 1)) === ' ' + n); }

  /* lista del archivo + nombres de ESPN + hora de inicio -> {pH, pA, vol, liq, upd, edad, vivo} o null */
  function buscar(arch, nomLocal, nomVisita, ts, ahora) {
    if (!arch || !arch.juegos || !nomLocal || !nomVisita) return null;
    ahora = ahora || Date.now();
    for (var i = 0; i < arch.juegos.length; i++) {
      var j = arch.juegos[i], dt = Math.abs(Date.parse(j.ini) - ts);
      if (!(dt <= 30 * 36e5)) continue;
      var dir = esDe(j.h, nomLocal) && esDe(j.a, nomVisita), inv = !dir && esDe(j.h, nomVisita) && esDe(j.a, nomLocal);
      if (!dir && !inv) continue;
      var edad = ahora - Date.parse(arch.generado || 0);
      return { pH: dir ? j.ph : j.pa, pA: dir ? j.pa : j.ph, vol: j.vol || 0, liq: j.liq || 0, upd: j.upd || null, edad: isFinite(edad) ? edad : null, vivo: j.live === true, fin: j.ended === true, marc: j.score || null };
    }
    return null;
  }
  /* poca plata en el mercado = precio poco confiable */
  function fino(p) { return !p || (p.vol < 1500 && p.liq < 20000); }

  function cargar(dep, ttl) {
    ttl = ttl === undefined ? 120000 : ttl;
    var c = cache[dep]; if (c && Date.now() - c.t < ttl) return c.p;
    var p = fetch(BASE + dep + '.json?v=' + Math.floor(Date.now() / 60000)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) { if (!j && c && c.v) return c.v; return j; });
    cache[dep] = { t: Date.now(), p: p }; p.then(function (v) { if (cache[dep]) cache[dep].v = v; });
    return p;
  }
  var API = { norm: norm, esDe: esDe, buscar: buscar, fino: fino, cargar: cargar, BASE: BASE };
  root.OVAPred = API;

  /* ---------- Kalshi (NBA, NHL y NFL): el robot scripts/kalshi.js deja kalshi-<dep>.json en la rama «kalshi». Solo se muestra: no entra a ningún cálculo. ---------- */
  var KBASE = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/kalshi/kalshi-', KFEE = 0.07, MIN_EV = 0.03, KARCH = {};
  /* ESPN y Kalshi escriben distinto algunas siglas */
  var SIGLAS = { WAS: 'WSH', JAC: 'JAX', NOP: 'NO', SAS: 'SA', GSW: 'GS', NYK: 'NY', UTAH: 'UTA', LAK: 'LA', SJS: 'SJ', TBL: 'TB', NJD: 'NJ' };
  function sigla(s) { s = String(s || '').toUpperCase(); return SIGLAS[s] || s; }
  function diaET(ts) { try { return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); } catch (e) { return ''; } }
  function kBuscar(arch, abH, abA, ts) {
    if (!arch || !arch.juegos) return null;
    var d = diaET(ts), h = sigla(abH), a = sigla(abA);
    for (var i = 0; i < arch.juegos.length; i++) {
      var j = arch.juegos[i]; if (j.d !== d || !j.e || j.e.length !== 2) continue;
      var x = sigla(j.e[0].s), y = sigla(j.e[1].s), eH = x === h && y === a ? j.e[0] : (x === a && y === h ? j.e[1] : null);
      if (!eH) continue;
      return { cH: eH.c, cA: eH === j.e[0] ? j.e[1].c : j.e[0].c, gen: arch.generado };
    }
    return null;
  }
  /* comprar a c centavos cuando el precio justo es fair (0-1): costo con comisión estimada, ganancia esperada y precio máximo para dejar 3% */
  function kLeer(fair, c) {
    var costo = function (x) { return x + KFEE * x * (1 - x); }, p = c / 100, lo = 0.01, hi = 0.99;
    for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if (fair / costo(m) - 1 >= MIN_EV) lo = m; else hi = m; }
    var ev = fair / costo(p) - 1;
    return { ev: ev, tope: Math.floor(lo * 100), entra: ev >= MIN_EV };
  }
  function kEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* bloque del Veredicto. pH = probabilidad justa del local según el mercado. */
  function kHtml(k, nH, nA, pH, ahora) {
    if (!k || !(pH > 0 && pH < 1)) return '';
    var edad = Math.round(((ahora || Date.now()) - Date.parse(k.gen)) / 60000);
    if (!(edad <= 180)) return '';
    var fila = function (n, c, f) {
      var r = kLeer(f, c);
      return '<div class="linea"><span>' + kEsc(n) + ': ' + c + '¢ · justo ' + (f * 100).toFixed(1) + '¢</span><b style="color:var(--' + (r.entra ? 'good' : 'mut') + ')">' + (r.entra ? '✓ Hay margen' : 'Entra a ' + r.tope + '¢ o menos') + '</b></div>';
    };
    return '<h4>Kalshi</h4><div class="lineas">' + fila(nA, k.cA, 1 - pH) + fila(nH, k.cH, pH) + '</div>' +
      '<div class="nota" style="margin-top:6px">Precio de compra de hace ' + Math.max(edad, 0) + ' min, compáralo en Kalshi antes de entrar. Justo = mercado sin margen. «Entra» deja 3% de ganancia esperada después de la comisión estimada; no es una señal probada. En 8,384 juegos, comprar entre 55 y 60¢ rindió −8.6% ±3.4 con comisión.</div>';
  }
  function kCargar(dep) {
    if (typeof fetch === 'undefined') return Promise.resolve(null);
    return fetch(KBASE + dep + '.json?v=' + Math.floor(Date.now() / 6e5)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) KARCH[dep] = j; return j; }).catch(function () { return null; });
  }
  root.OVAKalshi = { sigla: sigla, buscar: kBuscar, leer: kLeer, html: kHtml, cargar: kCargar, arch: function (dep) { return KARCH[dep] || null; } };
  API.kalshi = root.OVAKalshi;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
