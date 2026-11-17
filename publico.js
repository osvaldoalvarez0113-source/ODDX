/* OVA · El modelo, nutrido con el pronóstico público de ESPN (window.OVAPublico) — NBA (BPI) y NFL (FPI)
   Medido en docs/MEDICION-MODELOS-PUBLICOS-2026-11.md y docs/NUTRIR-MODELO-2026-11.md, siempre en la temporada que quedó afuera:
     NBA  6,748 juegos: el modelo solo acierta 65.8 %; mezclado con el BPI, 67.2 % (+95 aciertos, z 3.5). Peso del BPI 0.70.
     NFL  1,591 juegos: el modelo solo acierta 63.9 %; mezclado con el FPI, 65.2 % (+20 aciertos). Peso del FPI 0.80.
   El margen esperado también mejora (NBA: error 10.94 → 10.74 pts), así que la mezcla se pasa a margen y de ahí sale todo lo demás.
   La mezcla es en logit:  p = sig( (1 − w)·logit(modelo) + w·logit(ESPN) ).
   Qué hace aquí: pide a ESPN el pronóstico de los juegos que TODAVÍA NO EMPIEZAN, lo guarda en el teléfono y se lo pone a cada juego
   (g.espn = probabilidad del local). Una vez que el juego empieza ya no se vuelve a pedir: se queda el número de antes del juego.
   Si ESPN no responde, la app sigue con su modelo de siempre. No toca el precio del mercado ni tus picks. */
(function (root) {
  'use strict';
  var W = { nba: 0.70, nfl: 0.80 };
  var RUTA = { nba: 'basketball/leagues/nba', nfl: 'football/leagues/nfl' };
  var HORIZ = { nba: 3 * 864e5, nfl: 8 * 864e5 };          /* solo los juegos cercanos: lejos de eso el pronóstico cambia mucho */
  var KEY = 'ova_publico_v1', FRESCO = 6 * 3600e3, VIEJO = 12 * 864e5, MAX_MS = 3500;

  function clamp(p) { return Math.min(Math.max(p, 1e-4), 1 - 1e-4); }
  function logit(p) { p = clamp(p); return Math.log(p / (1 - p)); }
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function valido(p) { return typeof p === 'number' && isFinite(p) && p > 0.01 && p < 0.99; }

  /* respuesta de ESPN (…/predictor) -> probabilidad del local (0-1) o null */
  function leer(j) {
    function gp(t) {
      var st = t && t.statistics; if (!st || !st.length) return null;
      for (var i = 0; i < st.length; i++) if (st[i] && st[i].name === 'gameProjection' && isFinite(st[i].value)) return +st[i].value / 100;
      return null;
    }
    if (!j) return null;
    var h = gp(j.homeTeam), a = gp(j.awayTeam);
    var p = h !== null ? h : (a !== null ? 1 - a : null);
    return valido(p) ? p : null;
  }
  /* modelo + ESPN -> probabilidad mezclada; null si falta algo (la app sigue con su modelo) */
  function mezclar(pMod, pEspn, dep) {
    var w = W[dep];
    if (w === undefined || !valido(pEspn) || typeof pMod !== 'number' || !isFinite(pMod)) return null;
    return sig((1 - w) * logit(pMod) + w * logit(pEspn));
  }
  /* margen esperado cuya probabilidad de ganar (fn(pm)) es p; fn tiene que crecer con pm */
  function margenDe(p, fn, lo, hi) {
    lo = lo === undefined ? -45 : lo; hi = hi === undefined ? 45 : hi;
    for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (fn(mid) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  function leerMem(ls) { try { var m = JSON.parse(ls.getItem(KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; } }
  function guardarMem(ls, m) { try { ls.setItem(KEY, JSON.stringify(m)); } catch (e) { } }
  /* qué juegos hay que pedir ahora: sin empezar, dentro del horizonte, y sin número fresco guardado */
  function porPedir(dep, juegos, mem, ahora) {
    var d = mem[dep] || {}, out = [];
    (juegos || []).forEach(function (g) {
      if (!g || g.id === undefined || g.id === null || !(g.ts > ahora) || g.ts - ahora > HORIZ[dep]) return;
      var c = d[String(g.id)];
      if (!c || ahora - c.t > FRESCO) out.push(String(g.id));
    });
    return out;
  }
  /* pone g.espn con lo guardado (también en juegos ya empezados: es el número de ANTES del juego) */
  function aplicar(dep, juegos, mem) {
    var d = mem[dep] || {}, n = 0;
    (juegos || []).forEach(function (g) { var c = g && d[String(g.id)]; if (c && valido(c.h)) { g.espn = c.h; n++; } else if (g) g.espn = null; });
    return n;
  }
  function limpiar(mem, ahora) {
    Object.keys(mem).forEach(function (dep) { var d = mem[dep]; if (!d || typeof d !== 'object') { delete mem[dep]; return; } Object.keys(d).forEach(function (id) { if (!d[id] || ahora - d[id].t > VIEJO) delete d[id]; }); });
    return mem;
  }
  function pedir(dep, id) {
    var url = 'https://sports.core.api.espn.com/v2/sports/' + RUTA[dep] + '/events/' + id + '/competitions/' + id + '/predictor?lang=en&region=us';
    return root.fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(leer).catch(function () { return null; });
  }
  /* Baja lo que falte y deja g.espn en cada juego. Nunca tarda más de MAX_MS: lo que no llegó a tiempo queda guardado para la próxima vez. */
  function rellenar(dep, juegos, opt) {
    opt = opt || {};
    var ls = opt.ls || root.localStorage, ahora = opt.ahora || Date.now();
    if (!RUTA[dep] || !ls) return Promise.resolve(0);
    var mem = limpiar(leerMem(ls), ahora), faltan = porPedir(dep, juegos, mem, ahora);
    aplicar(dep, juegos, mem);
    if (!faltan.length || !root.fetch) return Promise.resolve(0);
    var i = 0, hechos = 0;
    function uno() {
      if (i >= faltan.length) return Promise.resolve();
      var id = faltan[i++];
      return pedir(dep, id).then(function (h) { if (h !== null) { (mem[dep] = mem[dep] || {})[id] = { h: Math.round(h * 1e4) / 1e4, t: ahora }; hechos++; } return uno(); });
    }
    var cola = []; for (var k = 0; k < Math.min(6, faltan.length); k++) cola.push(uno());
    var todo = Promise.all(cola).then(function () { guardarMem(ls, mem); aplicar(dep, juegos, mem); return hechos; });
    var tope = new Promise(function (res) { root.setTimeout(function () { aplicar(dep, juegos, mem); res(hechos); }, opt.maxMs === undefined ? MAX_MS : opt.maxMs); });
    return Promise.race([todo, tope]);
  }

  var API = { W: W, leer: leer, mezclar: mezclar, margenDe: margenDe, porPedir: porPedir, aplicar: aplicar, limpiar: limpiar, rellenar: rellenar, KEY: KEY };
  root.OVAPublico = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
