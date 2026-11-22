/* OVA · LIGA DE MODELOS en las apps (window.OVALiga)
   El robot scripts/liga.js (GitHub Actions, cada 30 minutos) guarda antes de cada juego lo que dicen varios competidores
   (OVA, el modelo propio y sus variantes, el mercado, ESPN, Polymarket, el consenso), los califica con ESPN, sube de titular
   al que más acierte cuando escogen distinto y arma el mapa de confianza. Deja todo en la rama «liga» (liga.json).
   Aquí solo se LEE:
     1) debajo de «🧠 El análisis» de cada juego sale la línea de la liga: quién es el titular, qué escoge y cuánto viene
        acertando en juegos así (si todavía no hay 30 juegos en esa zona, lo dice: no inventa confianza);
     2) Herramientas → 🏆 Liga: la tabla de cada deporte, los duelos contra el titular, el mapa y los cambios de titular.
     📚 HISTORIA (desde el 22-nov-2026): liga.json → historia (scripts/historia_liga.js) trae cuánto acertó el favorito por zona con
        miles de juegos ya jugados. En el Veredicto la dice aciertos.js (📊, un solo número); aquí sale en Herramientas → Liga.
     3) LA APP CONTRA EL ROBOT: cada vez que abres un juego que no ha empezado, anota en el teléfono (ova_liga_cmp) el % que da el
        modelo de la app al favorito y el que guardó el robot como «Modelo OVA», para ver si la copia del robot es fiel.
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
  /* ---------- historia (scripts/historia_liga.js → liga.json.historia): miles de juegos ya jugados por zona ---------- */
  function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function claseDe(pc) { return pc >= 60 ? 'ok' : (pc < 50 ? 'bad' : 'mid'); }
  /* [juegos, aciertos, decía, peor año, mejor año] de la zona; si la historia no tiene esa zona con lado (tenis), la franja sola */
  function historiaDe(d, dep, zona) {
    var H = d && d.historia && d.historia.deportes && d.historia.deportes[DEP[dep] || dep]; if (!H || !zona) return null;
    var z = H.zonas && H.zonas[zona], banda = false;
    if (!z) { z = H.bandas && H.bandas[String(zona).split(' · ')[0]]; banda = !!z; }
    if (!z || !(z[0] > 0)) return null;
    var y0 = String(H.desde || '').slice(0, 4), y1 = String(H.hasta || '').slice(0, 4);
    return { n: z[0], w: z[1], pct: Math.round(100 * z[1] / z[0]), dice: z[2], rango: z.length > 4 ? [z[3], z[4]] : null, banda: banda,
      fuente: H.fuente || 'el favorito', anos: y0 && y1 && y0 !== y1 ? y0 + '–' + y1 : y1 };
  }
  /* la línea en palabras: {tit, quien, p, zona, conf, txt, clase} */
  function lectura(d, x, favApp) {
    if (!d || !x) return null;
    var T = d.deportes && d.deportes[x.dep], min = (d.reglas && d.reglas.CONF_MIN) || 30;
    var quien = x.pick === 'L' ? x.local : (x.pick === 'A' ? x.visita : 'Empate');
    var r = { tit: nombreDe(d, x.tit), quien: quien, p: Math.round(x.p * 100), zona: x.zona, n: x.zn || 0, w: x.zw || 0, min: min };
    r.distinto = !!(favApp && x.pick !== 'D' && !mismo(quien, favApp)) || (x.pick === 'D' && !!favApp);
    /* la historia de la zona ya sale en el Veredicto (📊 «Cuántas veces acierta este %», aciertos.js lee la misma historia):
       aquí no se repite; la 🏆 habla de lo EN VIVO */
    if (r.n >= min) { r.pctZona = Math.round(100 * r.w / r.n); r.clase = claseDe(r.pctZona); r.txt = 'En vivo, en juegos así (' + x.zona + ') el titular viene acertando ' + r.pctZona + '% (' + r.w + ' de ' + r.n + ').'; }
    else if (r.n > 0) { r.clase = 'mid'; r.txt = 'En vivo lleva ' + r.w + ' de ' + r.n + ' en juegos así (' + x.zona + '); con ' + min + ' empieza a contar. Lo de temporadas pasadas está arriba (📊).'; }
    else { r.clase = 'mid'; r.txt = 'En vivo todavía no hay juegos así (' + x.zona + '; la liga empezó el 21-nov-2026). Lo de temporadas pasadas está arriba (📊).'; }
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
      (r.extra ? '<div style="color:var(--mut2,#A09472);font-size:12px;margin-top:2px">' + esc(r.extra) + '</div>' : '') +
      (r.global ? '<div style="color:var(--mut2,#A09472);font-size:12px;margin-top:2px">En todo el deporte: ' + r.global.aciertos + ' de ' + r.global.jugados + ' (' + r.global.pct + '%).</div>' : '') +
      '</div>';
  }

  /* ---------- la app contra el robot ---------- */
  var KCMP = 'ova_liga_cmp';
  /* % del robot («Modelo OVA») para el favorito de la app; null si no se puede emparejar */
  function robotPara(x, fav) {
    var pr = x && x.ps && x.ps.modelo; if (!pr) return null;
    var esL = mismo(x.local, fav), esV = mismo(x.visita, fav);
    if (esL === esV) return null;
    return esL ? pr[0] : pr[1];
  }
  function anotar(x, q, ahora) {
    if (!x || !(x.ts > ahora) || !(q.a > 0 && q.a < 1)) return null;
    var rob = robotPara(x, q.f); if (rob === null) return null;
    var e = { dep: x.dep, ts: x.ts, fav: q.f, app: Math.round(q.a * 1000) / 1000, rob: Math.round(rob * 1000) / 1000, t: ahora, tres: x.ps.modelo[2] > 0 };
    try {
      var o = JSON.parse(root.localStorage.getItem(KCMP) || '{}'); o[x.dep + '|' + x.ext] = e;
      var ks = Object.keys(o); if (ks.length > 500) ks.sort(function (a, b) { return o[a].t - o[b].t; }).slice(0, ks.length - 500).forEach(function (k) { delete o[k]; });
      root.localStorage.setItem(KCMP, JSON.stringify(o));
    } catch (err) { }
    return e;
  }
  function resumenCmp(o) {
    var r = {};
    Object.keys(o || {}).forEach(function (k) {
      var e = o[k], R = r[e.dep] || (r[e.dep] = { n: 0, suma: 0, max: 0, peor: null, lados: 0, nl: 0 }), d = Math.abs(e.app - e.rob) * 100;
      R.n++; R.suma += d; if (d > R.max) { R.max = d; R.peor = e; }
      if (!e.tres) { R.nl++; if ((e.app >= 0.5) === (e.rob >= 0.5)) R.lados++; }
    });
    Object.keys(r).forEach(function (k) { var R = r[k]; R.prom = R.suma / R.n; R.mismoLado = R.nl ? 100 * R.lados / R.nl : null; });
    return r;
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
        anotar(x, q, Date.now());
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
          var pa = ctx.merc ? ctx.pMod : ctx.p;   // lo que dice el MODELO de la app del favorito (sin el mercado)
          h += '<div class="ovaLiga" data-q="' + esc(JSON.stringify({ d: ctx.dep, f: ctx.fav, r: ctx.riv, a: typeof pa === 'number' && isFinite(pa) ? pa : null })) + '"></div>';
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
  /* la tabla compacta de la historia: por franja (sin el lado), solo las que tienen 30+ juegos */
  function historiaTabla(d, k, min) {
    var H = d && d.historia && d.historia.deportes && d.historia.deportes[k]; if (!H || !H.bandas) return '';
    var bs = Object.keys(H.bandas).filter(function (b) { return H.bandas[b][0] >= min; });
    if (!bs.length) return '';
    bs.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    var h = '<details style="margin:10px 2px 0"><summary style="font-size:13px;cursor:pointer">📚 Historia: ' + miles(H.n) + ' juegos (' + esc(String(H.desde).slice(0, 4)) + '–' + esc(String(H.hasta).slice(0, 4)) + ') · el favorito acertó ' + H.pct + '%</summary>' +
      '<div style="font-size:12px;color:var(--mut2);margin:6px 0">Cuánto acertó ' + esc(H.fuente || 'el favorito') + ' según qué tan favorito era. «Años»: su peor y su mejor temporada.</div>' +
      '<table class="tab"><tr><th>Franja</th><th>Juegos</th><th>Real</th><th>Decía</th><th>Años</th></tr>';
    bs.forEach(function (b) { var c = H.bandas[b], pc = 100 * c[1] / c[0];
      h += '<tr><td>' + esc(b) + '</td><td class="n">' + miles(c[0]) + '</td><td class="n"><b>' + pc.toFixed(1) + '%</b></td><td class="n">' + c[2].toFixed(1) + '%</td><td class="n">' + (c.length > 4 ? c[3] + '–' + c[4] + '%' : '—') + '</td></tr>'; });
    return h + '</table></details>';
  }
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
    if (!deps.length) h += '<div class="vacio" style="padding:16px">Todavía no hay juegos guardados. El robot corre cada 30 minutos.</div>';
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
        h += '<table class="tab"><tr><th>Zona</th><th>Acertó</th><th>Real</th><th>Decía</th><th>📚</th></tr>';
        zk.forEach(function (q) { var c = z[q], hz = historiaDe(d, k, q); h += '<tr' + (c.suficiente ? '' : ' style="color:var(--mut2)"') + '><td>' + esc(q) + '</td><td class="n">' + c.aciertos + '/' + c.juegos + '</td><td class="n"><b>' + c.pct.toFixed(1) + '%</b></td><td class="n">' + c.dice.toFixed(1) + '%</td><td class="n">' + (hz && hz.n >= (R.CONF_MIN || 30) ? hz.pct + '%' : '—') + '</td></tr>'; });
        h += '</table><div style="font-size:11.5px;color:var(--mut2);margin:4px 2px">📚 = lo que pasó en la historia en esa misma zona.</div>';
      }
      h += historiaTabla(d, k, R.CONF_MIN || 30);
    });
    var mm = d.mercados || {}, mmk = ORDEN.filter(function (k) { return mm[k]; });
    h += '<h3 style="margin:18px 2px 8px;font-size:16px">🎯 Totales y hándicap</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Con la línea de ESPN de cada juego, antes de empezar: ¿acierta más el Modelo OVA o el mercado en el Más/Menos y en el hándicap? «Duelos»: solo los juegos donde escogieron distinto.</div>';
    if (!mmk.length) h += '<div class="vacio" style="padding:12px;font-size:13px">Todavía no hay juegos calificados con línea (empezó el 21-nov-2026).</div>';
    mmk.forEach(function (k) {
      [['tot', 'Total (Más/Menos)'], ['han', 'Hándicap']].forEach(function (tp) {
        var T = mm[k][tp[0]]; if (!T) return;
        var fila = function (c) { var x = T.comp[c]; return x ? x.aciertos + '/' + x.jugados + ' (' + x.pct.toFixed(1) + '%)' : '—'; };
        var du = T.duelo || {};
        h += '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px"><b>' + esc((d.deportes[k] && d.deportes[k].nombre) || k) + ' · ' + tp[1] + '</b><br>Modelo OVA: ' + fila('modelo') + ' · Mercado: ' + fila('mercado') +
          (du.n ? '<br><span style="color:var(--mut2)">Duelos: el modelo ganó ' + du.gana + ' de ' + du.n + (du.n >= 20 ? ' (z ' + du.z + (du.z >= 1.645 ? ', le gana claro' : (du.z <= -1.645 ? ', pierde claro' : ', todavía parejo')) + ')' : ' (faltan ' + (20 - du.n) + ' para que diga algo)') + '</span>' : '') + '</div>';
      });
    });
    var NOMBRE_IDEA = { nba_viajes: 'NBA · viajes y altura', futbol_descanso: 'Fútbol · cansancio (Europa y copas)', nfl_epa: 'NFL · EPA por jugada' };
    var med = d.mediciones || {}, mk = Object.keys(med);
    if (mk.length) {
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">Ideas medidas</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Cada idea se ajusta en una temporada y se mide en otra. Solo entra a la liga si mejora en la mayoría de las pruebas; se vuelve a medir sola en cada vuelta.</div>';
      mk.forEach(function (k) {
        var m = med[k] || {}, pr = m.pruebas || [], mej = pr.filter(function (x) { return x.perdidaCon < x.perdidaSin; }).length;
        var aS = 0, aC = 0, n = 0; pr.forEach(function (x) { aS += x.aciertosSin * x.juegos; aC += x.aciertosCon * x.juegos; n += x.juegos; });
        h += '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px"><b>' + esc(NOMBRE_IDEA[k] || k) + '</b> · ' +
          (m.entra ? '<span style="color:var(--good,#6FD39A);font-weight:700">entra a la liga</span>' : '<span style="color:var(--bad,#F08A78);font-weight:700">no pasa</span>') +
          '<br><span style="color:var(--mut2)">Mejoró en ' + mej + ' de ' + pr.length + ' pruebas' + (n ? ' · aciertos ' + (aS / n).toFixed(1) + '% → ' + (aC / n).toFixed(1) + '%' : '') + '</span></div>';
      });
    }
    var fb = d.fabrica;
    if (fb && fb.deportes) {
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">🏭 Fábrica de los domingos</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Prueba cientos de versiones de las constantes de cada modelo contra todas las temporadas. Pasa solo la que mejora en cada temporada y con z alto. Última: ' + esc(String(fb.generado || '').slice(0, 10)) + '</div>';
      ORDEN.filter(function (k) { return fb.deportes[k]; }).forEach(function (k) {
        var x = fb.deportes[k], cam = function (c) { return Object.keys(c || {}).map(function (q) { return q + ' ' + c[q]; }).join(', '); };
        h += '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px"><b>' + esc((d.deportes[k] && d.deportes[k].nombre) || k) + '</b>: probó ' + (x.probadas || 0) + ', pasaron ' + (x.pasaron || 0) +
          (x.mejor ? ' → <span style="color:var(--good,#6FD39A)">entra «afinado» (' + esc(cam(x.mejor.cambios)) + ', z ' + x.mejor.z + ')</span>' :
            (x.casi ? '<br><span style="color:var(--mut2)">La más cerca: ' + esc(cam(x.casi.cambios)) + ', z ' + x.casi.z + ' (pedía ' + x.zExigido + '). Las constantes de hoy siguen siendo las mejores.</span>' : '')) + '</div>';
      });
    }
    var dt = d.detective || [];
    h += '<h3 style="margin:18px 2px 8px;font-size:16px">🔎 Detective de fallos</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Grupos donde el titular acierta claramente menos de lo que decía (15+ juegos). Con tantos grupos, alguno sale por suerte: es una pista, no una verdad.</div>';
    h += dt.length ? '<table class="tab"><tr><th>Grupo</th><th>Acertó</th><th>Real</th><th>Decía</th></tr>' + dt.map(function (g) { return '<tr><td>' + esc(g.grupo) + '</td><td class="n">' + g.aciertos + '/' + g.juegos + '</td><td class="n"><b>' + g.real.toFixed(1) + '%</b></td><td class="n">' + g.decia.toFixed(1) + '%</td></tr>'; }).join('') + '</table>'
      : '<div class="vacio" style="padding:12px;font-size:13px">Nada raro todavía (o pocos juegos calificados).</div>';
    var au = d.autopsia;
    if (au && au.deportes) {
      var TT = au.tipos || {}, ordT = ['info', 'modelo', 'sorpresa', 'suerte', 'sin'];
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">🔬 Por qué falló tu modelo</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Cada vez que el modelo de la app falla, el robot lo compara con el mercado y le pone una causa. No cambia ningún número: dice qué tipo de fallo pesa más. 🩹 Faltó información = el mercado se movió 4+ puntos en contra antes del juego (baja o alineación). 📉 El modelo se equivocó = el mercado escogía lo otro y acertó. 🔄 Sorpresa = el mercado también fallaba. 🎲 Mala suerte = era parejo (menos de 60%).</div>';
      var dks = ORDEN.filter(function (k) { return au.deportes[k]; });
      h += dks.length ? dks.map(function (k) {
        var x = au.deportes[k];
        return '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px"><b>' + esc((d.deportes[k] && d.deportes[k].nombre) || k) + '</b> · ' + x.fallos + ' fallos<br>' +
          ordT.filter(function (t) { return x.tipos[t]; }).map(function (t) { return esc(TT[t] || t) + ' <b>' + x.tipos[t] + '</b> (' + x.pct[t] + '%)'; }).join(' · ') +
          '<br><span style="color:var(--mut2)">' + esc(x.conclusion) + '</span></div>';
      }).join('') : '<div class="vacio" style="padding:12px;font-size:13px">Todavía no hay fallos calificados.</div>';
      var ul = (au.ultimos || []).slice(0, 8);
      if (ul.length) h += '<div style="font-size:12px;color:var(--mut2);margin:8px 2px 4px">Últimos fallos:</div>' + ul.map(function (f) {
        return '<div class="caja" style="padding:8px 12px;margin-bottom:5px;font-size:12px"><b>' + esc(f.juego) + '</b>' + (f.marcador ? ' (' + esc(f.marcador) + ')' : '') + ' · escogió ' + esc(f.escogio) + ' ' + Math.round(100 * f.p) + '%, salió ' + esc(f.salio) + '<br>' + esc(TT[f.tipo] || f.tipo) + ': ' + esc(f.txt) + '</div>';
      }).join('');
    }
    var sa = d.salud;
    if (sa && sa.filas) {
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">🛡️ Vigilante de los robots</h3><table class="tab"><tr><th>Robot</th><th>Estado</th></tr>' + sa.filas.map(function (f) {
        var col = f.estado === 'al día' ? 'var(--good,#6FD39A)' : (f.estado === 'fuera de temporada' ? 'var(--mut2)' : 'var(--bad,#F08A78)');
        return '<tr><td>' + esc(f.nombre) + '</td><td style="color:' + col + '">' + esc(f.estado) + (f.horas != null ? ' · ' + f.horas + ' h' : '') + '</td></tr>'; }).join('') + '</table>';
      (sa.problemas || []).forEach(function (p) { h += '<div class="caja" style="padding:8px 12px;margin-top:6px;font-size:13px;color:var(--bad,#F08A78)">⚠️ ' + esc(p.txt) + '</div>'; });
    }
    var cmp = {}; try { cmp = resumenCmp(JSON.parse(root.localStorage.getItem(KCMP) || '{}')); } catch (e) { }
    var NOMD = { nba: 'NBA', nhl: 'NHL', nfl: 'NFL', fut: 'Fútbol', futbol: 'Fútbol', tenis: 'Tenis', mlb: 'MLB' };
    h += '<h3 style="margin:18px 2px 8px;font-size:16px">📏 La app contra el robot</h3><div style="font-size:12px;color:var(--mut2);margin:0 2px 6px">Cada vez que abres un juego que no ha empezado, se compara el % que da el modelo de tu app al favorito con el que guardó el robot («Modelo OVA»). Si se separan mucho, la liga no está midiendo exactamente tu fórmula.</div>';
    var ck = Object.keys(cmp);
    if (!ck.length) h += '<div class="vacio" style="padding:12px;font-size:13px">Todavía nada: se llena solo cuando abras juegos en las apps.</div>';
    else {
      h += '<table class="tab"><tr><th>Deporte</th><th>Juegos</th><th>Diferencia</th><th>Máx.</th><th>Mismo lado</th></tr>';
      ck.forEach(function (k) { var R = cmp[k], col = R.prom <= 1.5 ? 'var(--good,#6FD39A)' : (R.prom <= 4 ? 'var(--warn,#F0CE6B)' : 'var(--bad,#F08A78)');
        h += '<tr><td>' + esc(NOMD[k] || k) + '</td><td class="n">' + R.n + '</td><td class="n" style="color:' + col + '"><b>' + R.prom.toFixed(1) + ' pts</b></td><td class="n">' + R.max.toFixed(1) + '</td><td class="n">' + (R.mismoLado === null ? '—' : R.mismoLado.toFixed(0) + '%') + '</td></tr>'; });
      h += '</table><div style="font-size:12px;color:var(--mut2);margin:6px 2px">Verde: hasta 1.5 puntos (copia fiel) · amarillo: hasta 4 · rojo: más. «Mismo lado»: los dos le dan más de 50% al mismo equipo.</div>';
    }
    h += '<div style="margin:16px 2px;font-size:13px"><a href="record.html" style="color:var(--acc,#C9A24A)">📜 Ver el récord sellado (página pública) ›</a></div>';
    var pz = d.pesos || {}, pk = ORDEN.filter(function (k) { return pz[k]; });
    if (pk.length) {
      h += '<h3 style="margin:18px 2px 8px;font-size:16px">Mezcla que aprende: cuánto pesa cada uno</h3>';
      pk.forEach(function (k) {
        var w = pz[k]; h += '<div class="caja" style="padding:10px 12px;margin-bottom:6px;font-size:13px"><b>' + esc((d.deportes[k] && d.deportes[k].nombre) || k) + '</b>: ' +
          Object.keys(w).sort(function (a, b) { return w[b] - w[a]; }).map(function (m) { return esc(nombreDe(d, m)) + ' ' + Math.round(w[m] * 100) + '%'; }).join(' · ') + '</div>';
      });
    }
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

  var API = { historiaDe: historiaDe, historiaTabla: historiaTabla, robotPara: robotPara, anotar: anotar, resumenCmp: resumenCmp, buscar: buscar, lectura: lectura, htmlLinea: htmlLinea, pantallaHtml: pantallaHtml, pantalla: pantalla, cargar: cargar, envolver: envolver, mismo: mismo, URL: URL };
  root.OVALiga = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (!root.document) return;
  /* analista.js se carga antes que este archivo; por si acaso, se reintenta un rato */
  if (!envolver()) { var n = 0, t = root.setInterval(function () { if (envolver() || ++n > 40) root.clearInterval(t); }, 250); }
  if (root.document.querySelector && root.document.querySelector('.anBox')) root.setTimeout(llenar, 300);
})(typeof window !== 'undefined' ? window : globalThis);
