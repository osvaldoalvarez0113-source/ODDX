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
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
