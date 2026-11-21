/* OVA · LIGA DE MODELOS en las apps (window.OVALiga)
   El robot scripts/liga.js (GitHub Actions, cada 2 h) guarda antes de cada juego lo que dicen varios competidores
   (OVA, el modelo propio y sus variantes, el mercado, ESPN, Polymarket, el consenso), los califica con ESPN, sube de titular
   al que más acierte cuando escogen distinto y arma el mapa de confianza. Deja todo en la rama «liga» (liga.json).
   Aquí solo se LEE:
     1) debajo de «🧠 El análisis» de cada juego sale la línea de la liga: quién es el titular, qué escoge y cuánto viene
        acertando en juegos así (si todavía no hay 30 juegos en esa zona, lo dice: no inventa confianza);
     2) Herramientas → 🏆 Liga: la tabla de cada deporte, los duelos contra el titular, el mapa y los cambios de titular.
   No cambia ningún número ni pick de la app, ni toca tus registros. Sin internet no sale nada. */
(function (root) {
  'use strict';
  var URL = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/liga/liga.json';
  var KEY = 'ova_liga_v1', FRESCO = 10 * 60e3;
  var DEP = { fut: 'futbol', futbol: 'futbol', nba: 'nba', nhl: 'nhl', nfl: 'nfl', mlb: 'mlb', tenis: 'tenis' };
  var LADO = { L: 'local', A: 'visita', D: 'empate' };
  var DATOS = null, PROMESA = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var PARAR = { fc: 1, cf: 1, afc: 1, sc: 1, de: 1, del: 1, la: 1, el: 1, the: 1, club: 1, ac: 1, as: 1, ud: 1, cd: 1 };
  function tokens(n) {
    var t = String(n == null ? '' : n).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { }
    return t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w && !PARAR[w]; });
  }
  function mismo(a, b) {
    var ta = tokens(a), tb = tokens(b); if (!ta.length || !tb.length) return false;
    var c = ta.length <= tb.length ? ta : tb, l = ta.length <= tb.length ? tb : ta;
    return c.every(function (w) { return l.indexOf(w) >= 0; });
  }
  function nombreDe(d, k) { return (d && d.nombres && d.nombres[k]) || k; }

  /* ---------- funciones puras (se prueban en node) ---------- */
  /* el juego de la liga que corresponde a un análisis: mismo deporte y los dos nombres (en cualquier orden), el más cercano */
  function buscar(d, dep, a, b) {
    dep = DEP[dep] || dep;
    var l = (d && d.proximos) || [], mejor = null;
    for (var i = 0; i < l.length; i++) {
      var x = l[i]; if (x.dep !== dep) continue;
      var ok = (mismo(x.local, a) && mismo(x.visita, b)) || (mismo(x.local, b) && mismo(x.visita, a));
      if (ok && (!mejor || x.ts < mejor.ts)) mejor = x;
    }
    return mejor;
  }
  /* la línea en palabras: {tit, quien, p, zona, conf, txt, clase} */
  function lectura(d, x, favApp) {
    if (!d || !x) return null;
    var T = d.deportes && d.deportes[x.dep], min = (d.reglas && d.reglas.CONF_MIN) || 30;
    var quien = x.pick === 'L' ? x.local : (x.pick === 'A' ? x.visita : 'Empate');
    var r = { tit: nombreDe(d, x.tit), quien: quien, p: Math.round(x.p * 100), zona: x.zona, n: x.zn || 0, w: x.zw || 0, min: min };
    r.distinto = !!(favApp && x.pick !== 'D' && !mismo(quien, favApp)) || (x.pick === 'D' && !!favApp);
    if (r.n >= min) { r.pctZona = Math.round(100 * r.w / r.n); r.clase = r.pctZona >= 60 ? 'ok' : (r.pctZona < 50 ? 'bad' : 'mid'); r.txt = 'En juegos así (' + x.zona + ') el titular viene acertando ' + r.pctZona + '% (' + r.w + ' de ' + r.n + ').'; }
    else if (r.n > 0) { r.clase = 'mid'; r.txt = 'Juntando datos: en juegos así lleva ' + r.w + ' de ' + r.n + '. Con menos de ' + min + ' todavía no dice nada.'; }
    else { r.clase = 'mid'; r.txt = 'Todavía no hay juegos así calificados (' + x.zona + '): la liga empezó a contar el 21-nov-2026.'; }
    if (T && T.modelos && T.modelos[x.tit] && T.modelos[x.tit].jugados) r.global = T.modelos[x.tit];
    return r;
  }
  function htmlLinea(r) {
    if (!r) return '';
    var col = r.clase === 'ok' ? 'var(--good,#6FD39A)' : (r.clase === 'bad' ? 'var(--bad,#F08A78)' : 'var(--mut2,#A09472)');
    return '<div class="lgBox" style="margin:-4px 0 12px;padding:10px 12px;border:1px solid var(--line2,#43381F);border-radius:12px;background:var(--bg1,rgba(255,255,255,.04));font-size:13px;line-height:1.45">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px"><b style="font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--mut2,#A09472)">🏆 Liga de modelos</b>' +
      '<a href="herramientas.html#liga" style="font-size:11.5px;color:var(--acc,#C9A24A);text-decoration:none;white-space:nowrap">Ver la tabla ›</a></div>' +
      '<div>Titular: <b>' + esc(r.tit) + '</b> → escoge <b>' + esc(r.quien) + '</b> ' + r.p + '%' + (r.distinto ? ' <span style="color:var(--warn,#F0CE6B);font-weight:700">· distinto al favorito de arriba</span>' : '') + '</div>' +
      '<div style="color:' + col + ';margin-top:2px">' + esc(r.txt) + '</div>' +
      (r.global ? '<div style="color:var(--mut2,#A09472);font-size:12px;margin-top:2px">En todo el deporte: ' + r.global.aciertos + ' de ' + r.global.jugados + ' (' + r.global.pct + '%).</div>' : '') +
      '</div>';
  }

  /* ---------- datos ---------- */
  function cargar(forzar) {
    if (PROMESA && !forzar) return PROMESA;
    try { if (!DATOS) { var c = JSON.parse(root.localStorage.getItem(KEY) || 'null'); if (c && c.d) DATOS = c.d; if (c && Date.now() - c.t < FRESCO && !forzar) return (PROMESA = Promise.resolve(DATOS)); } } catch (e) { }
    if (!root.fetch) return Promise.resolve(DATOS);
    PROMESA = root.fetch(URL + '?v=' + Math.floor(Date.now() / FRESCO)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.v === 1) { DATOS = j; try { root.localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: j })); } catch (e) { } }
      return DATOS;
    }).catch(function () { return DATOS; });
    return PROMESA;
  }

  /* ---------- debajo de «El análisis» ---------- */
  function llenar() {
    if (!root.document) return;
    var huecos = root.document.querySelectorAll('.ovaLiga:not([data-ok])'); if (!huecos.length) return;
    cargar().then(function (d) {
      Array.prototype.forEach.call(root.document.querySelectorAll('.ovaLiga:not([data-ok])'), function (h) {
        h.setAttribute('data-ok', '1');
        var q; try { q = JSON.parse(h.getAttribute('data-q') || '{}'); } catch (e) { return; }
        var x = buscar(d, q.d, q.f, q.r); if (!x) return;
        h.innerHTML = htmlLinea(lectura(d, x, q.f));
      });
    });
  }
  function envolver() {
    var A = root.OVAAnalista; if (!A || !A.html || A.html._liga) return !!(A && A.html && A.html._liga);
    var orig = A.html;
    var nuevo = function (ctx) {
      var h = orig.apply(this, arguments);
      try {
        if (h && ctx && !ctx.vivo && DEP[ctx.dep] && ctx.fav && ctx.riv) {
          h += '<div class="ovaLiga" data-q="' + esc(JSON.stringify({ d: ctx.dep, f: ctx.fav, r: ctx.riv })) + '"></div>';
          root.setTimeout(llenar, 60); root.setTimeout(llenar, 900);
        }
      } catch (e) { }
      return h;
    };
    nuevo._liga = true; A.html = nuevo;
    return true;
  }

  /* ---------- Herramientas → 🏆 Liga ---------- */
  var ORDEN = ['nba', 'nhl', 'nfl', 'futbol', 'tenis', 'mlb'];
  function pct(x) { return x == null ? '—' : x.toFixed(1) + '%'; }
  function pantallaHtml(d) {
    if (!d) return '<div class="vacio" style="padding:16px">No se pudo leer la liga. Revisa la conexión y vuelve a abrir esta pestaña.</div>';
    var R = d.reglas || {}, h = '';
    h += '<div class="caja" style="padding:14px;margin-bottom:12px;font-size:13.5px;line-height:1.5">' +
      '<b style="font-size:15px">🏆 Liga de modelos</b><br>Antes de cada juego se guarda lo que dice cada competidor; después se califica solo con el resultado de ESPN. ' +
      'El <b>titular</b> (⭐) es el que sale en cada juego. Un suplente le quita el puesto solo si, cuando escogen distinto, le gana claro: ' +
      (R.ASCENSO_MIN || 20) + '+ duelos y z ≥ ' + (R.ASCENSO_Z || 1.645) + ' (regla fijada el ' + esc(R.fijadas || '') + ', antes de ver datos).' +
      '<div style="color:var(--mut2);font-size:12px;margin-top:6px">Guardados: ' + ((d.totales && d.totales.guardados) || 0) + ' · calificados: ' + ((d.totales && d.totales.calificados) || 0) +
      ' · actualizado ' + esc(String(d.generado || '').slice(0, 16).replace('T', ' ')) + ' UTC</div></div>';
    var deps = ORDEN.filter(function (k) { return d.deportes && d.deportes[k]; });
    if (!deps.length) h += '<div class="vacio" style="padding:16px">Todavía no hay juegos guardados. El robot corre cada 2 horas.</div>';
    deps.forEach(function (k) {
      var T = d.deportes[k], mods = Object.keys(T.modelos || {}).sort(function (a, b) { var x = T.modelos[a], y = T.modelos[b]; return (y.pct == null ? -1 : y.pct) - (x.pct == null ? -1 : x.pct) || y.jugados - x.jugados; });
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">' + esc(T.nombre) + '</h3><table class="tab"><tr><th>Competidor</th><th>Acertó</th><th>%</th><th>Brier</th><th>Por jugar</th></tr>';
      mods.forEach(function (m) {
        var M = T.modelos[m];
        h += '<tr' + (m === T.titular ? ' class="sel"' : '') + '><td>' + (m === T.titular ? '⭐ ' : '') + esc(M.nombre || m) + '</td><td class="n">' + (M.jugados ? M.aciertos + '/' + M.jugados : '—') +
          '</td><td class="n"><b>' + pct(M.pct) + '</b></td><td class="n">' + (M.brier == null ? '—' : M.brier.toFixed(3)) + '</td><td class="n">' + M.pend + '</td></tr>';
      });
      h += '</table>';
      var du = T.duelos || {}, dk = Object.keys(du).filter(function (m) { return du[m].n > 0; });
      if (dk.length) {
        h += '<div style="font-size:12px;color:var(--mut2);margin:10px 2px 4px">Duelos contra el titular (solo juegos donde escogieron distinto)</div><table class="tab"><tr><th>Suplente</th><th>Ganó</th><th>Perdió</th><th>z</th><th></th></tr>';
        dk.sort(function (a, b) { return du[b].z - du[a].z; }).forEach(function (m) {
          var x = du[m], falta = Math.max(0, (R.ASCENSO_MIN || 20) - x.n);
          h += '<tr><td>' + esc(nombreDe(d, m)) + '</td><td class="n">' + x.gana + '</td><td class="n">' + x.pierde + '</td><td class="n">' + x.z.toFixed(2) + '</td><td class="n" style="font-size:11.5px;color:var(--mut2)">' +
            (falta ? 'faltan ' + falta : (x.z >= (R.ASCENSO_Z || 1.645) ? 'sube' : 'no le gana')) + '</td></tr>';
        });
        h += '</table>';
      }
      var z = T.confianza || {}, zk = Object.keys(z).sort();
      h += '<div style="font-size:12px;color:var(--mut2);margin:10px 2px 4px">Mapa de confianza del titular (gris = menos de ' + (R.CONF_MIN || 30) + ' juegos: todavía no dice nada)</div>';
      if (!zk.length) h += '<div class="vacio" style="padding:12px;font-size:13px">Sin juegos calificados todavía.</div>';
      else {
        h += '<table class="tab"><tr><th>Zona</th><th>Acertó</th><th>Real</th><th>Decía</th></tr>';
        zk.forEach(function (q) { var c = z[q]; h += '<tr' + (c.suficiente ? '' : ' style="color:var(--mut2)"') + '><td>' + esc(q) + '</td><td class="n">' + c.aciertos + '/' + c.juegos + '</td><td class="n"><b>' + c.pct.toFixed(1) + '%</b></td><td class="n">' + c.dice.toFixed(1) + '%</td></tr>'; });
        h += '</table>';
      }
    });
    if (d.cambios && d.cambios.length) {
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">Cambios de titular</h3>';
      d.cambios.slice(0, 15).forEach(function (c) { h += '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px">' + esc(String(c.fecha).slice(0, 10)) + ' · ' + esc((d.deportes[c.dep] && d.deportes[c.dep].nombre) || c.dep) + ': sale <b>' + esc(nombreDe(d, c.sale)) + '</b>, entra <b>' + esc(nombreDe(d, c.entra)) + '</b><br><span style="color:var(--mut2)">' + esc(c.detalle) + '</span></div>'; });
    }
    h += '<div style="font-size:12px;color:var(--mut2);margin:14px 2px;line-height:1.5"><b>Brier</b>: qué tan bien calibrado está el %: más bajo = mejor. <b>Decía</b>: el % promedio que daba el titular en esa zona; <b>Real</b>: lo que pasó.</div>';
    return h;
  }
  function pantalla(cont) {
    if (!cont) return;
    cont.innerHTML = '<div class="vacio" style="padding:16px">Cargando la liga…</div>';
    cargar(true).then(function (d) { cont.innerHTML = pantallaHtml(d); });
  }

  var API = { buscar: buscar, lectura: lectura, htmlLinea: htmlLinea, pantallaHtml: pantallaHtml, pantalla: pantalla, cargar: cargar, envolver: envolver, mismo: mismo, URL: URL };
  root.OVALiga = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (!root.document) return;
  /* analista.js se carga antes que este archivo; por si acaso, se reintenta un rato */
  if (!envolver()) { var n = 0, t = root.setInterval(function () { if (envolver() || ++n > 40) root.clearInterval(t); }, 250); }
  if (root.document.querySelector && root.document.querySelector('.anBox')) root.setTimeout(llenar, 300);
})(typeof window !== 'undefined' ? window : globalThis);
