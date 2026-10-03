/* OVA Fútbol · Selecciones (países) — parche independiente.
   Se carga DESPUÉS de mejoras.js. No toca worldfootball: trae partidos y resultados de ESPN.
   Agrega al selector: UEFA Nations League, Concacaf Nations League y Amistosos.
   Va como las copas: sin modelo Poisson (solo partidos, forma y cara a cara). */
(function(){
 try{
  var SEL = {
   uefanl:     {nombre:'UEFA Nations League',      slugs:['uefa.nations']},
   concacafnl: {nombre:'Concacaf Nations League',  slugs:['concacaf.nations.league']},
   amistosos:  {nombre:'Amistosos de selecciones', slugs:['fifa.friendly']}
  };
  var DIAS_ATRAS = 14, DIAS_ADELANTE = 21;

  // registrar en las tablas globales que ya usa la app
  Object.keys(SEL).forEach(function(k){
   LIGAS[k] = {nombre:SEL[k].nombre, esCopa:true, esSeleccion:true, urlPartidos:''};
   ESPN_SLUG[k] = SEL[k].slugs[0];
  });

  // opciones en el selector
  var sel = document.getElementById('ligaSel');
  if(sel && !sel.querySelector('optgroup[data-sel]')){
   var og = document.createElement('optgroup');
   og.label = 'Selecciones (países, sin modelo)';
   og.setAttribute('data-sel','1');
   og.innerHTML =
    '<option value="uefanl">🇪🇺 UEFA Nations League</option>'+
    '<option value="concacafnl">🌎 Concacaf Nations League</option>'+
    '<option value="amistosos">🌍 Amistosos de selecciones</option>';
   sel.appendChild(og);
  }

  // ---- ESPN: un día de scoreboard -> partidos con escudo/bandera ----
  function parseDia(json){
   var out = [];
   ((json && json.events) || []).forEach(function(e){
    var comp = e.competitions && e.competitions[0];
    if(!comp || !comp.competitors || comp.competitors.length < 2) return;
    var h = null, a = null;
    comp.competitors.forEach(function(c){ if(c.homeAway==='home') h = c; else if(c.homeAway==='away') a = c; });
    if(!h || !a){ h = comp.competitors[0]; a = comp.competitors[1]; }
    if(!h.team || !a.team) return;
    var st = (e.status && e.status.type) || (comp.status && comp.status.type) || {};
    var ts = Date.parse(e.date); if(!isFinite(ts)) return;
    var gl = numESPN(h.score), gv = numESPN(a.score);
    var terminado = st.completed === true && gl !== null && gv !== null;
    var enVivo = st.state === 'in';
    var d = new Date(ts);
    out.push({
     id: e.id,
     local: h.team.displayName || h.team.name, visita: a.team.displayName || a.team.name,
     escudoLocal: h.team.logo || '', escudoVisita: a.team.logo || '',
     hrefLocal: null, hrefVisita: null,
     ts: ts, fecha: fechaPunto(d), hora: '',
     horaLocal: d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
     terminado: terminado, enVivo: enVivo && !terminado,
     marcadorVivo: (enVivo && !terminado && gl !== null && gv !== null) ? {l:gl, v:gv} : null,
     golesLocal: terminado ? gl : null, golesVisita: terminado ? gv : null
    });
   });
   return out;
  }
  function bajarSlug(slug, dias, errores){
   var out = [], i = 0, activos = 0;
   return new Promise(function(resolve){
    function sig(){
     while(activos < 8 && i < dias.length){
      (function(dia){
       activos++;
       fetch(ESPN_BASE + slug + '/scoreboard?dates=' + ymd(dia))
        .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function(j){ out = out.concat(parseDia(j)); })
        .catch(function(e){ errores.push(ymd(dia) + ': ' + e.message); })
        .then(function(){ activos--; sig(); });
      })(dias[i++]);
     }
     if(i >= dias.length && activos === 0) resolve(out);
    }
    sig();
   });
  }

  // ---- carga de una competencia de selecciones ----
  var _cargarLiga = cargarLiga;
  cargarLiga = function(clave){
   if(!SEL[clave]) return _cargarLiga(clave);
   var mio = ++CARGA_ID;
   LIGA_ACTUAL = clave;
   CACHE_PERFIL = {}; DIAG = {}; MUESTRAS = {pend:[], term:[]};
   LIGA_ES_COPA = true;
   var liga = LIGAS[clave];
   var estado = document.getElementById('estado');
   estado.className = 'estado';
   estado.textContent = 'Bajando ' + liga.nombre + ' de ESPN...';
   document.getElementById('juegos').innerHTML = '';
   document.getElementById('algane').innerHTML = '';
   document.getElementById('backtestOut').innerHTML = '';
   document.getElementById('diagOut').style.display = 'none';
   EQUIPOS = []; TERMINADOS = []; FUENTE_TERM = 'ESPN';

   var dias = [], hoy = new Date();
   for(var k = -DIAS_ATRAS; k <= DIAS_ADELANTE; k++){
    var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k);
    dias.push(d);
   }
   var errores = [];
   bajarSlug(SEL[clave].slugs[0], dias, errores).then(function(todos){
    if(mio !== CARGA_ID) return;
    var vistos = {}, unicos = [];
    todos.forEach(function(p){ if(p.id && vistos[p.id]) return; if(p.id) vistos[p.id] = true; unicos.push(p); });
    var term = unicos.filter(function(p){ return p.terminado; });
    var inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    var pend = unicos.filter(function(p){ return !p.terminado && p.ts >= inicioHoy; })
                     .sort(function(a, b){ return a.ts - b.ts; });
    DIAG.espn = {modo:'día por día', nota:'selecciones (' + SEL[clave].slugs[0] + ')', leidos:unicos.length,
                 terminados:term.length, errores:errores, enCache:0, desde:ymd(dias[0])};
    if(!unicos.length && errores.length){
     estado.textContent = '✗ ESPN no respondió para ' + liga.nombre + ' (' + errores[0] + '). Toca 🔍 Diagnóstico.';
     estado.className = 'estado bad';
     return;
    }
    TERMINADOS = term;
    PENDIENTES_TODOS = pend;
    DIA_SELECCIONADO = null;
    pintarSelectorDias();
    aplicarSelectorDias();
    document.getElementById('algane').innerHTML =
     '<div class="estado">"Al gane" no aplica a selecciones: no hay modelo de probabilidad para ellas.</div>';
    pintarEstado(liga);
    if(!unicos.length){
     estado.textContent = 'ESPN respondió pero no trae partidos de ' + liga.nombre + ' en estas fechas (o el código del torneo no es ese). Toca 🔍 Diagnóstico.';
     estado.className = 'estado warn';
    }
   }).catch(function(e){
    if(mio !== CARGA_ID) return;
    estado.textContent = '✗ No se pudo cargar ' + liga.nombre + ': ' + e.message;
    estado.className = 'estado bad';
   });
  };

  // el aviso de "copa de eliminación directa" no aplica a selecciones
  var _copa = pintarGameBodyCopa;
  pintarGameBodyCopa = function(bodyEl, p){
   _copa(bodyEl, p);
   if(LIGAS[LIGA_ACTUAL] && LIGAS[LIGA_ACTUAL].esSeleccion){
    var av = bodyEl.querySelector('.aviso');
    if(av) av.textContent = '🌍 Selecciones: pocos partidos y alineaciones que cambian mucho, así que aquí no se corre el modelo Poisson. Solo forma reciente y cara a cara.';
    var h3 = bodyEl.querySelectorAll('h3');
    if(h3[1]) h3[1].textContent = 'Cara a cara (últimas 2 semanas y próximas)';
   }
  };

  // si la app ya estaba parada en una de estas, no hace falta nada; si no, queda lista en el selector
 }catch(e){ if(window.console) console.error('selecciones.js', e); }
})();
