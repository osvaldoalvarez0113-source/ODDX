/*OVA_FUTBOL_MEJORAS v3 — lesionados y clima como contexto (no entran al modelo).
  v3 corrige lesionados: site.api.espn.com no trae lesionados de futbol; el
  endpoint real es sports.core.api.espn.com, y devuelve $ref que hay que volver
  a pedir (primero el registro de la lesion, despues el jugador). */
(function(){

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

var CACHE_EVENTO = {};
function buscarEventoESPN(slug, nombreLocal, nombreVisita, fechaEuropea){
  var ck = slug+'|'+nombreLocal+'|'+nombreVisita+'|'+fechaEuropea;
  if(CACHE_EVENTO[ck] !== undefined) return Promise.resolve(CACHE_EVENTO[ck]);
  var dias = ventanaFechas(ymdESPN(fechaEuropea));
  if(!dias.length) return Promise.resolve(null);
  return Promise.all(dias.map(function(d){
    return fetch(ESPN_BASE+slug+'/scoreboard?dates='+d)
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; });
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
  });
}

// ---------- lesionados: ESPN "core" API, con resolucion de $ref ----------
// Formato real: /injuries devuelve {items:[{$ref:".../injuries/123"}]}
// Cada uno de esos hay que pedirlo aparte para sacar el status y el $ref del
// jugador; y el jugador HAY que pedirlo aparte otra vez para el nombre.
// Maximo 8 lesiones por equipo para no disparar demasiadas peticiones.
var CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
var CACHE_LESION = {};
function fetchJSON(url){
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
}
function lesionadosDeEquipo(slug, teamId){
  if(!teamId) return Promise.resolve({lista:[], nota:'sin id de equipo'});
  var ck = slug+'|'+teamId;
  if(CACHE_LESION[ck]) return Promise.resolve(CACHE_LESION[ck]);
  var url = CORE_BASE+slug+'/teams/'+teamId+'/injuries?lang=en&region=us';
  return fetchJSON(url).then(function(j){
    if(!j) return {lista:[], nota:'ESPN (core) no respondió para este equipo/liga'};
    var items = j.items || [];
    if(!items.length) return {lista:[], nota:'ESPN no lista lesionados para este equipo ahora mismo'};
    var pendientes = items.slice(0,8).map(function(it){ return it.$ref; }).filter(Boolean);
    return Promise.all(pendientes.map(function(refUrl){
      return fetchJSON(refUrl).then(function(det){
        if(!det) return null;
        var estado = (det.status && (det.status.name||det.status)) || (det.type && det.type.description) || '';
        var refAtleta = det.athlete && det.athlete.$ref;
        if(!refAtleta) return estado ? ('(jugador) — '+estado) : null;
        return fetchJSON(refAtleta).then(function(atl){
          var nombre = atl && (atl.displayName || atl.fullName);
          if(!nombre) return null;
          return estado ? (nombre+' — '+estado) : nombre;
        });
      });
    })).then(function(nombres){
      var lista = nombres.filter(Boolean);
      return {lista:lista, nota: lista.length ? '' : 'ESPN listó lesiones pero no se pudo leer el detalle'};
    });
  }).then(function(out){ CACHE_LESION[ck]=out; return out; });
}

var CACHE_GEO = {}, CACHE_CLIMA = {};
function geocodificarCiudad(ciudad){
  if(CACHE_GEO[ciudad] !== undefined) return Promise.resolve(CACHE_GEO[ciudad]);
  var url = 'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(ciudad)+'&count=1';
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
    var res = (j && j.results && j.results[0]) || null;
    var out = res ? {lat:res.latitude, lon:res.longitude} : null;
    CACHE_GEO[ciudad] = out;
    return out;
  }).catch(function(){ CACHE_GEO[ciudad]=null; return null; });
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

function pintarMejoras(bodyEl, p){
  var caja = document.createElement('div');
  caja.innerHTML = '<h3>Lesionados y clima</h3><div class="nota" id="ovaMejDiag">Iniciando…</div>';

  var forPane = bodyEl.querySelector('[id$="for"]');
  if(!forPane){
    bodyEl.appendChild(caja);
    document.getElementById('ovaMejDiag').textContent = 'No encontré la pestaña Forma dentro de este partido (bug real — avísame).';
    return;
  }
  forPane.appendChild(caja);
  var diag = caja.querySelector('#ovaMejDiag');

  var slug = (typeof ESPN_SLUG !== 'undefined') ? ESPN_SLUG[LIGA_ACTUAL] : null;
  if(!slug){ diag.textContent = 'Esta liga no tiene fuente ESPN configurada.'; return; }

  diag.textContent = 'Buscando el partido en ESPN…';
  buscarEventoESPN(slug, p.local, p.visita, p.fecha).then(function(ev){
    if(!ev){
      diag.textContent = 'No encontré este partido en ESPN todavía (puede que falte por publicarse, o que los nombres no crucen) — sin lesionados ni clima por ahora.';
      return;
    }
    diag.textContent = 'Partido encontrado en ESPN. Buscando lesionados…';
    var idL = ev.home.team && ev.home.team.id;
    var idV = ev.away.team && ev.away.team.id;

    Promise.all([
      lesionadosDeEquipo(slug, idL),
      lesionadosDeEquipo(slug, idV)
    ]).then(function(res){
      var lesL = res[0], lesV = res[1];
      var html = '';
      if(lesL.lista.length) html += '<div class="observ"><b>'+p.local+'</b>: '+lesL.lista.slice(0,6).join(', ')+'</div>';
      if(lesV.lista.length) html += '<div class="observ"><b>'+p.visita+'</b>: '+lesV.lista.slice(0,6).join(', ')+'</div>';
      if(!lesL.lista.length && !lesV.lista.length){
        html = '<div class="nota">Sin lesionados listados por ESPN. Detalle: '+p.local+' → '+(lesL.nota||'ok')+' · '+p.visita+' → '+(lesV.nota||'ok')+'</div>';
      }
      diag.outerHTML = html;

      var venue = ev.venue;
      var ciudad = venue && venue.address && venue.address.city;
      if(!ciudad){
        caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: ESPN no trajo la ciudad del estadio para este partido.</div>');
        return;
      }
      geocodificarCiudad(ciudad).then(function(geo){
        if(!geo){
          caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: no pude ubicar "'+ciudad+'".</div>');
          return;
        }
        climaDeCiudad(geo.lat, geo.lon).then(function(c){
          if(!c){
            caja.insertAdjacentHTML('beforeend', '<div class="nota">Clima: Open-Meteo no respondió para '+ciudad+'.</div>');
            return;
          }
          caja.insertAdjacentHTML('beforeend',
            '<div class="observ">🌤️ '+ciudad+': <b>'+Math.round(c.temp)+'°C</b> · viento <b>'+Math.round(c.viento)+' km/h</b></div>'+
            '<div class="nota" style="margin-top:4px">Solo informativo — no entra al cálculo del modelo.</div>');
        });
      });
    });
  }).catch(function(e){
    diag.textContent = 'Error buscando el partido en ESPN: '+e.message;
  });
}

try{
  if(typeof pintarGameBody === 'function'){
    var _pgb = pintarGameBody;
    pintarGameBody = function(bodyEl, p, eL, eV){
      _pgb(bodyEl, p, eL, eV);
      try{
        pintarMejoras(bodyEl, p);
      }catch(e){
        var d = document.createElement('div');
        d.className = 'nota';
        d.textContent = 'mejoras.js falló al pintar: '+(e && e.message || e);
        bodyEl.appendChild(d);
      }
    };
  } else {
    console.error('mejoras.js: pintarGameBody no existe todavía al cargar este script.');
  }
}catch(e){
  console.error('mejoras.js: error al instalar el parche:', e);
}
})();
