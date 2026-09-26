/*OVA_FUTBOL_MEJORAS — lesionados y clima como contexto (no entran al modelo).
  Reutiliza lo que ya existe en futbol.html: ESPN_SLUG, ESPN_BASE, LIGA_ACTUAL,
  mismoEquipo, parseFecha, pintarGameBody. Todo con try/catch: si algo falla,
  simplemente no se muestra nada — nunca rompe el resto de la app. */
(function(){
try{

function ymdESPN(fechaEuropea){
  var t = (typeof parseFecha==='function') ? parseFecha(fechaEuropea) : null;
  if(t===null) return null;
  var d = new Date(t);
  var p2 = function(n){ return (n<10?'0':'')+n; };
  return d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate());
}
function ventanaFechas(ymd){
  if(!ymd) return [];
  var y=+ymd.slice(0,4), m=+ymd.slice(4,6)-1, dd=+ymd.slice(6,8);
  var base = new Date(y,m,dd), out=[];
  [-1,0,1,2].forEach(function(n){
    var x = new Date(base.getTime()+n*86400000);
    var p2=function(v){ return (v<10?'0':'')+v; };
    out.push(x.getFullYear()+p2(x.getMonth()+1)+p2(x.getDate()));
  });
  return out;
}

// ---------- encontrar el evento de ESPN de este partido (para sacar ids y venue) ----------
var CACHE_EVENTO = {};
function buscarEventoESPN(slug, nombreLocal, nombreVisita, fechaEuropea){
  var ck = slug+'|'+nombreLocal+'|'+nombreVisita+'|'+fechaEuropea;
  if(CACHE_EVENTO[ck] !== undefined) return Promise.resolve(CACHE_EVENTO[ck]);
  var dias = ventanaFechas(ymdESPN(fechaEuropea));
  if(!dias.length) return Promise.resolve(null);
  return Promise.all(dias.map(function(d){
    return fetch(ESPN_BASE+slug+'/scoreboard?dates='+d).then(function(r){
      return r.ok ? r.json() : null;
    }).catch(function(){ return null; });
  })).then(function(resultados){
    var evento = null;
    resultados.forEach(function(j){
      if(evento || !j || !j.events) return;
      j.events.forEach(function(e){
        if(evento) return;
        var comp = e.competitions && e.competitions[0];
        if(!comp || !comp.competitors || comp.competitors.length<2) return;
        var h=null,a=null;
        comp.competitors.forEach(function(c){ if(c.homeAway==='home') h=c; else if(c.homeAway==='away') a=c; });
        if(!h||!a) return;
        var nomL = h.team && (h.team.displayName||h.team.name);
        var nomV = a.team && (a.team.displayName||a.team.name);
        if(nomL && nomV && mismoEquipo(nomL,nombreLocal) && mismoEquipo(nomV,nombreVisita)){
          evento = {home:h, away:a, venue: comp.venue || null};
        }
      });
    });
    CACHE_EVENTO[ck] = evento;
    return evento;
  }).catch(function(){ CACHE_EVENTO[ck]=null; return null; });
}

// ---------- lesionados por equipo (ESPN) ----------
var CACHE_LESION = {};
function lesionadosDeEquipo(slug, teamId){
  if(!teamId) return Promise.resolve([]);
  var ck = slug+'|'+teamId;
  if(CACHE_LESION[ck]) return Promise.resolve(CACHE_LESION[ck]);
  var url = ESPN_BASE+slug+'/teams/'+teamId+'/injuries';
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
    var lista = [];
    var items = (j && (j.injuries || (j.items))) || [];
    items.forEach(function(it){
      var nombre = (it.athlete && (it.athlete.displayName||it.athlete.fullName)) || it.displayName || '';
      var estado = (it.status && (it.status.name||it.status)) || it.type && it.type.description || '';
      if(nombre) lista.push(estado ? (nombre+' — '+estado) : nombre);
    });
    CACHE_LESION[ck] = lista;
    return lista;
  }).catch(function(){ CACHE_LESION[ck]=[]; return []; });
}

// ---------- clima (Open-Meteo, por ciudad del venue de ESPN) ----------
var CACHE_GEO = {}, CACHE_CLIMA = {};
function geocodificarCiudad(ciudad, pais){
  var ck = (ciudad||'')+'|'+(pais||'');
  if(CACHE_GEO[ck] !== undefined) return Promise.resolve(CACHE_GEO[ck]);
  if(!ciudad) { CACHE_GEO[ck]=null; return Promise.resolve(null); }
  var url = 'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(ciudad)+'&count=1';
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
    var res = (j && j.results && j.results[0]) || null;
    var out = res ? {lat:res.latitude, lon:res.longitude} : null;
    CACHE_GEO[ck] = out;
    return out;
  }).catch(function(){ CACHE_GEO[ck]=null; return null; });
}
function climaDeCiudad(lat, lon){
  var ck = lat+','+lon;
  if(CACHE_CLIMA[ck]) return Promise.resolve(CACHE_CLIMA[ck]);
  var url = 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+
    '&current=temperature_2m,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh';
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
    var c = j && j.current;
    var out = c ? {temp:c.temperature_2m, viento:c.wind_speed_10m} : null;
    CACHE_CLIMA[ck] = out;
    return out;
  }).catch(function(){ return null; });
}

// ---------- pintar el bloque en la pestaña Forma ----------
function pintarMejoras(bodyEl, p){
  var slug = (typeof ESPN_SLUG !== 'undefined') ? ESPN_SLUG[LIGA_ACTUAL] : null;
  if(!slug) return;
  var forPane = bodyEl.querySelector('[id$="for"]');
  if(!forPane) return;

  var caja = document.createElement('div');
  caja.innerHTML = '<h3>Lesionados y clima</h3><div class="nota" style="margin:0 0 8px">Buscando…</div>';
  forPane.appendChild(caja);

  buscarEventoESPN(slug, p.local, p.visita, p.fecha).then(function(ev){
    if(!ev){
      caja.querySelector('.nota').textContent = 'No encontré este partido en ESPN todavía (puede que falte por publicarse) — sin datos de lesionados ni clima.';
      return;
    }
    var idL = ev.home.team && ev.home.team.id;
    var idV = ev.away.team && ev.away.team.id;

    Promise.all([
      lesionadosDeEquipo(slug, idL),
      lesionadosDeEquipo(slug, idV)
    ]).then(function(res){
      var lesL = res[0], lesV = res[1];
      var htmlLes = '';
      if(lesL.length || lesV.length){
        if(lesL.length) htmlLes += '<div class="observ"><b>'+p.local+'</b>: '+lesL.slice(0,6).join(', ')+'</div>';
        if(lesV.length) htmlLes += '<div class="observ"><b>'+p.visita+'</b>: '+lesV.slice(0,6).join(', ')+'</div>';
      } else {
        htmlLes = '<div class="nota" style="margin:0 0 8px">Sin lesionados reportados por ESPN para ninguno de los dos equipos (o ESPN no publica lesionados para esta liga).</div>';
      }
      caja.querySelector('.nota').outerHTML = htmlLes;
    });

    var venue = ev.venue;
    var ciudad = venue && venue.address && venue.address.city;
    var pais = venue && venue.address && venue.address.country;
    if(!ciudad){
      caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: no tengo la ciudad del estadio para este partido.</div>');
      return;
    }
    geocodificarCiudad(ciudad, pais).then(function(geo){
      if(!geo){
        caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: no pude ubicar "'+ciudad+'" para pedir el pronóstico.</div>');
        return;
      }
      climaDeCiudad(geo.lat, geo.lon).then(function(c){
        if(!c){
          caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: no se pudo consultar el pronóstico de '+ciudad+'.</div>');
          return;
        }
        caja.insertAdjacentHTML('beforeend',
          '<div class="observ">🌤️ '+ciudad+': <b>'+Math.round(c.temp)+'°C</b> · viento <b>'+Math.round(c.viento)+' km/h</b></div>'+
          '<div class="nota" style="margin-top:4px">Solo informativo — no se ha medido su efecto sobre los goles en tu backtest, así que no entra al cálculo del modelo.</div>');
      });
    });
  });
}

if(typeof pintarGameBody === 'function'){
  var _pgb = pintarGameBody;
  pintarGameBody = function(bodyEl, p, eL, eV){
    _pgb(bodyEl, p, eL, eV);
    try{ pintarMejoras(bodyEl, p); }catch(e){ if(window.console) console.error('ova mejoras', e); }
  };
}

}catch(e){ if(window.console) console.error('ova futbol mejoras (fuera)', e); }
})();
