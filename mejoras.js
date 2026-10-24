/*OVA_FUTBOL_MEJORAS v4 — noticias, lesionados, clima y cara a cara histórico (ESPN + Open-Meteo).
  Lo que lee de ESPN es contexto: nada de esto entra al modelo Poisson.
  v4: worldfootball.net no abre desde Safari (por eso salía «No se pudo cargar» y las noticias se quedaban
  en «Buscando…»), así que las noticias vienen de ESPN y todo tiene tiempo límite: si algo no responde,
  se dice y se sigue, nunca queda un mensaje de carga pegado. El cara a cara se completa con el calendario
  de ESPN (últimas 4 temporadas). El clima es el pronóstico a la hora del partido, no el de ahora.
  v3 (se mantiene): lesionados por sports.core.api.espn.com con resolución de $ref. */
(function(){

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function conTimeout(prom, ms){
  return Promise.race([prom, new Promise(function(res){ setTimeout(function(){ res(null); }, ms); })]);
}
function fetchJSON(url, ms){
  return conTimeout(fetch(url).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }), ms || 8000);
}

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

// ---------- encontrar el partido en ESPN (de ahí salen los ids de equipo y el estadio) ----------
var CACHE_EVENTO = {};
function buscarEventoESPN(slug, nombreLocal, nombreVisita, fechaEuropea){
  var ck = slug+'|'+nombreLocal+'|'+nombreVisita+'|'+fechaEuropea;
  if(CACHE_EVENTO[ck] !== undefined) return Promise.resolve(CACHE_EVENTO[ck]);
  var dias = ventanaFechas(ymdESPN(fechaEuropea));
  if(!dias.length) return Promise.resolve(null);
  return Promise.all(dias.map(function(d){
    return fetchJSON(ESPN_BASE+slug+'/scoreboard?dates='+d, 8000);
  })).then(function(resultados){
    var evento = null, algunaOk = false;
    resultados.forEach(function(j){
      if(!j) return;
      algunaOk = true;
      if(evento || !j.events) return;
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
          evento = {home:h, away:a, venue: comp.venue || null, ts: Date.parse(e.date || comp.date || '') || null};
        }
      });
    });
    // solo se guarda si ESPN respondió: un fallo de red no debe quedar como «no existe»
    if(algunaOk) CACHE_EVENTO[ck] = evento;
    return evento;
  });
}

// ---------- noticias: ESPN, filtradas por los dos equipos ----------
var CACHE_NEWS = {};
function noticiasLiga(slug){
  if(CACHE_NEWS[slug]) return CACHE_NEWS[slug];
  var pr = fetchJSON(ESPN_BASE+slug+'/news?limit=50', 8000).then(function(j){
    var arts = (j && (j.articles || j.items)) || null;
    if(!arts) delete CACHE_NEWS[slug];
    return arts;
  });
  CACHE_NEWS[slug] = pr;
  return pr;
}
function haceTiempo(iso){
  var t = Date.parse(iso);
  if(isNaN(t)) return '';
  var h = Math.round((Date.now()-t)/3600000);
  if(h<1) return 'hace minutos';
  if(h<24) return 'hace '+h+' h';
  var d = Math.round(h/24);
  if(d<30) return 'hace '+d+' '+(d===1?'día':'días');
  var m = Math.round(d/30);
  return 'hace '+m+' '+(m===1?'mes':'meses');
}
function deEquipo(a, ids, nombres){
  var cats = a.categories || [], nEq = 0, hit = false;
  cats.forEach(function(c){
    if(c && c.type==='team' && c.teamId!=null){
      nEq++;
      if(ids.indexOf(String(c.teamId))>-1) hit = true;
    }
  });
  // notas que etiquetan media liga (rankings, resúmenes) no son de estos equipos
  if(hit && nEq<=4) return true;
  var tit = String(a.headline||'').toLowerCase();
  return nombres.some(function(n){ return n && tit.indexOf(n)>-1; });
}
function itemNoticia(a){
  var href = a.links && a.links.web && a.links.web.href;
  var t = esc(a.headline||'');
  var link = (href && /^https:\/\//.test(href)) ? '<a href="'+esc(href)+'" target="_blank" rel="noopener">'+t+'</a>' : t;
  var cuando = haceTiempo(a.published);
  return '<div class="noticia">'+link+'<small>ESPN'+(cuando?' · '+cuando:'')+'</small></div>';
}
function pintarNoticias(el, arts, ids, nombres){
  if(!el) return;
  if(!arts){
    el.innerHTML = '<div class="fvac">No pude cargar las noticias ahora (ESPN no respondió). Prueba de nuevo en un rato.</div>';
    return;
  }
  var propias = arts.filter(function(a){ return a && a.headline && deEquipo(a, ids, nombres); }).slice(0,4);
  if(propias.length){
    el.innerHTML = propias.map(itemNoticia).join('');
    return;
  }
  var liga = arts.filter(function(a){ return a && a.headline; }).slice(0,3);
  if(!liga.length){ el.innerHTML = '<div class="fvac">ESPN no tiene noticias recientes de esta liga.</div>'; return; }
  el.innerHTML = '<div class="fvac">Sin noticias recientes de estos dos equipos. Lo último de la liga:</div>'+liga.map(itemNoticia).join('');
}

// ---------- lesionados: ESPN "core" API, con resolución de $ref ----------
// /injuries devuelve {items:[{$ref:...}]}; cada uno hay que pedirlo aparte para sacar el estado y el $ref del
// jugador, y el jugador hay que pedirlo otra vez para el nombre. Máximo 6 lesiones por equipo.
var CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
var CACHE_LESION = {};
function lesionadosDeEquipo(slug, teamId){
  if(!teamId) return Promise.resolve({lista:[], nota:'sin id de equipo', sinRespuesta:true});
  var ck = slug+'|'+teamId;
  if(CACHE_LESION[ck]) return Promise.resolve(CACHE_LESION[ck]);
  var url = CORE_BASE+slug+'/teams/'+teamId+'/injuries?lang=en&region=us';
  return fetchJSON(url, 8000).then(function(j){
    if(!j) return {lista:[], nota:'ESPN no respondió', sinRespuesta:true};
    var items = j.items || [];
    if(!items.length) return {lista:[], nota:'', sinRespuesta:false, guardar:true};
    var pendientes = items.slice(0,6).map(function(it){ return it.$ref; }).filter(Boolean);
    return Promise.all(pendientes.map(function(refUrl){
      return fetchJSON(refUrl, 8000).then(function(det){
        if(!det) return null;
        var estado = (det.status && (det.status.name||det.status)) || (det.type && det.type.description) || '';
        if(typeof estado !== 'string') estado = '';
        var refAtleta = det.athlete && det.athlete.$ref;
        if(!refAtleta) return null;
        return fetchJSON(refAtleta, 8000).then(function(atl){
          var nombre = atl && (atl.displayName || atl.fullName);
          if(!nombre) return null;
          return estado ? (nombre+' ('+estado+')') : nombre;
        });
      });
    })).then(function(nombres){
      var lista = nombres.filter(Boolean);
      return {lista:lista, nota:'', sinRespuesta:false, guardar:true};
    });
  }).then(function(out){ if(out.guardar) CACHE_LESION[ck] = out; return out; });
}
function htmlLesionados(p, lesL, lesV){
  var filas = [];
  [[p.local, lesL],[p.visita, lesV]].forEach(function(x){
    if(x[1].lista.length){
      filas.push('<div class="lcrow"><b>'+esc(x[0])+'</b> ('+x[1].lista.length+'): '+x[1].lista.map(esc).join(', ')+'</div>');
    }
  });
  if(filas.length){
    // el equipo que respondió sin bajas se dice expresamente, para que no parezca que faltó
    [[p.local, lesL],[p.visita, lesV]].forEach(function(x){
      if(!x[1].lista.length && !x[1].sinRespuesta) filas.push('<div class="lcrow"><b>'+esc(x[0])+'</b>: sin bajas reportadas por ESPN</div>');
    });
    return filas.join('');
  }
  if(lesL.sinRespuesta && lesV.sinRespuesta) return '<div class="fvac">No pude consultar las lesiones ahora (ESPN no respondió).</div>';
  return '<div class="fvac">ESPN no reporta bajas para estos dos equipos. Su cobertura de lesiones en fútbol es irregular: confirma las alineaciones antes del partido.</div>';
}

// ---------- clima: pronóstico a la hora del partido (Open-Meteo) ----------
var CACHE_GEO = {}, CACHE_CLIMA = {};
function geocodificarCiudad(ciudad){
  if(CACHE_GEO[ciudad] !== undefined) return Promise.resolve(CACHE_GEO[ciudad]);
  var url = 'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(ciudad)+'&count=1';
  return fetchJSON(url, 8000).then(function(j){
    if(!j) return null;   // sin respuesta: no se guarda
    var res = (j.results && j.results[0]) || null;
    var out = res ? {lat:res.latitude, lon:res.longitude} : null;
    CACHE_GEO[ciudad] = out;
    return out;
  });
}
function iconoClima(c){
  if(c==null) return '🌤️';
  if(c===0) return '☀️';
  if(c<=3) return '⛅';
  if(c===45||c===48) return '🌫️';
  if(c>=51 && c<=67) return '🌧️';
  if(c>=71 && c<=77) return '❄️';
  if(c>=80 && c<=82) return '🌧️';
  if(c>=95) return '⛈️';
  return '🌤️';
}
function climaDeCiudad(lat, lon, ts){
  var ck = lat+','+lon+'|'+(ts ? Math.round(ts/3600000) : 'ahora');
  if(CACHE_CLIMA[ck]) return Promise.resolve(CACHE_CLIMA[ck]);
  var url = 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+
    '&current=temperature_2m,wind_speed_10m,weather_code'+
    '&hourly=temperature_2m,wind_speed_10m,precipitation_probability,weather_code'+
    '&timezone=GMT&forecast_days=7&temperature_unit=celsius&wind_speed_unit=kmh';
  return fetchJSON(url, 8000).then(function(j){
    if(!j) return null;
    var out = null;
    if(ts && j.hourly && j.hourly.time){
      var key = new Date(Math.round(ts/3600000)*3600000).toISOString().slice(0,13)+':00';
      var i = j.hourly.time.indexOf(key);
      if(i>-1){
        out = {temp:j.hourly.temperature_2m[i], viento:j.hourly.wind_speed_10m[i],
          lluvia:(j.hourly.precipitation_probability ? j.hourly.precipitation_probability[i] : null),
          code:(j.hourly.weather_code ? j.hourly.weather_code[i] : null), alKickoff:true};
      }
    }
    if(!out && j.current){
      out = {temp:j.current.temperature_2m, viento:j.current.wind_speed_10m, lluvia:null, code:j.current.weather_code, alKickoff:false};
    }
    if(out) CACHE_CLIMA[ck] = out;
    return out;
  });
}

// ---------- cara a cara: calendario de ESPN, últimas 4 temporadas ----------
function scoreVal(s){
  if(s===undefined || s===null) return null;
  if(typeof s==='object') s = (s.value!==undefined ? s.value : s.displayValue);
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}
var CACHE_H2H = {};
function h2hESPN(slug, idL, idV){
  var ck = slug+'|'+idL+'|'+idV;
  if(CACHE_H2H[ck]) return CACHE_H2H[ck];
  var y = (typeof inicioTemporada==='function') ? inicioTemporada(0).getFullYear() : new Date().getFullYear();
  var anios = [y, y-1, y-2, y-3];
  var pr = Promise.all(anios.map(function(a){
    return fetchJSON(ESPN_BASE+slug+'/teams/'+idL+'/schedule?season='+a, 9000);
  })).then(function(rs){
    var out = [], vistos = {}, respondio = false;
    rs.forEach(function(j){
      if(!j) return;
      respondio = true;
      (j.events || []).forEach(function(e){
        var comp = e.competitions && e.competitions[0];
        if(!comp || !comp.competitors) return;
        var st = comp.status || e.status;
        if(!(st && st.type && st.type.completed)) return;
        var h=null, a=null;
        comp.competitors.forEach(function(c){ if(c.homeAway==='home') h=c; else if(c.homeAway==='away') a=c; });
        if(!h || !a || !h.team || !a.team) return;
        if(String(h.team.id)!==String(idV) && String(a.team.id)!==String(idV)) return;
        var gH = scoreVal(h.score), gA = scoreVal(a.score);
        if(gH===null || gA===null) return;
        if(vistos[e.id]) return;
        vistos[e.id] = true;
        var lg = e.league || null;
        out.push({id:e.id, ts:Date.parse(e.date), local:h.team.displayName||h.team.name, visita:a.team.displayName||a.team.name,
          golesLocal:gH, golesVisita:gA, comp:(lg && lg.slug && lg.slug!==slug) ? (lg.abbreviation||lg.name||'') : ''});
      });
    });
    return {partidos:out, respondio:respondio};
  });
  CACHE_H2H[ck] = pr;
  return pr;
}
function fusionarH2H(locales, espn){
  var out = locales.slice();
  espn.forEach(function(m){
    var dup = out.some(function(x){
      return Math.abs(tsPartido(x)-m.ts) < 2*86400000 && mismoEquipo(x.local, m.local) && mismoEquipo(x.visita, m.visita);
    });
    if(!dup) out.push(m);
  });
  out.sort(function(x,y){ return tsPartido(y)-tsPartido(x); });
  return out;
}

// ---------- armado de la pestaña Forma ----------
function seccion(box, s){ return box ? box.querySelector('[data-s="'+s+'"]') : null; }

function pintarMejoras(bodyEl, p){
  var elNews = bodyEl.querySelector('[id$="noticias"]');
  var elLC   = bodyEl.querySelector('[id$="lesclima"]');
  var elH2H  = bodyEl.querySelector('[id$="h2h"]');
  if(!elNews && !elLC) return;   // pestaña sin estos bloques: nada que llenar

  var slug = (typeof ESPN_SLUG !== 'undefined') ? ESPN_SLUG[LIGA_ACTUAL] : null;
  if(!slug){
    if(elNews) elNews.innerHTML = '<div class="fvac">Esta liga no tiene fuente de noticias.</div>';
    if(elLC) elLC.innerHTML = '<div class="fvac">Esta liga no tiene fuente ESPN configurada.</div>';
    return;
  }
  if(elLC) elLC.innerHTML = '<div data-s="ven"></div><div data-s="les"><div class="fvac">Buscando el partido en ESPN...</div></div><div data-s="cli"></div><div data-s="nota"></div>';

  buscarEventoESPN(slug, p.local, p.visita, p.fecha).then(function(ev){
    var ids = ev ? [String(ev.home.team.id), String(ev.away.team.id)] : [];
    var nombres = [p.local, p.visita];
    if(ev){
      [ev.home.team, ev.away.team].forEach(function(t){ nombres.push(t.displayName, t.shortDisplayName, t.name); });
    }
    nombres = nombres.filter(function(n){ return n && String(n).length>=4; }).map(function(n){ return String(n).toLowerCase(); });

    // noticias: con o sin el partido encontrado (sin ids se filtra por nombre)
    noticiasLiga(slug).then(function(arts){ pintarNoticias(elNews, arts, ids, nombres); })
      .catch(function(){ pintarNoticias(elNews, null, ids, nombres); });

    if(!ev){
      var s0 = seccion(elLC, 'les');
      if(s0) s0.innerHTML = '<div class="fvac">No encontré este partido en ESPN todavía (puede que aún no lo publiquen, o que el nombre no cruce). Sin lesionados ni clima por ahora.</div>';
      return;
    }

    // estadio
    var venue = ev.venue, ciudad = venue && venue.address && venue.address.city;
    var sVen = seccion(elLC, 'ven');
    if(sVen && venue && venue.fullName){
      sVen.innerHTML = '<div class="lcrow">🏟️ <b>'+esc(venue.fullName)+'</b>'+(ciudad?' · '+esc(ciudad):'')+'</div>';
    }

    // lesionados
    var sLes = seccion(elLC, 'les');
    if(sLes) sLes.innerHTML = '<div class="fvac">Buscando lesionados...</div>';
    Promise.all([
      lesionadosDeEquipo(slug, ids[0]),
      lesionadosDeEquipo(slug, ids[1])
    ]).then(function(res){
      if(sLes) sLes.innerHTML = htmlLesionados(p, res[0], res[1]);
    }).catch(function(){
      if(sLes) sLes.innerHTML = '<div class="fvac">No pude consultar las lesiones ahora.</div>';
    });

    // clima a la hora del partido
    var sCli = seccion(elLC, 'cli'), sNota = seccion(elLC, 'nota');
    if(!ciudad){
      if(sCli) sCli.innerHTML = '<div class="fvac">Clima: ESPN no trajo la ciudad del estadio.</div>';
    } else {
      geocodificarCiudad(ciudad).then(function(geo){
        if(!geo){ if(sCli) sCli.innerHTML = '<div class="fvac">Clima: no pude ubicar «'+esc(ciudad)+'».</div>'; return; }
        return climaDeCiudad(geo.lat, geo.lon, ev.ts).then(function(c){
          if(!c){ if(sCli) sCli.innerHTML = '<div class="fvac">Clima: Open-Meteo no respondió para '+esc(ciudad)+'.</div>'; return; }
          if(sCli){
            sCli.innerHTML = '<div class="lcrow">'+iconoClima(c.code)+' <b>'+Math.round(c.temp)+'°C</b> · viento <b>'+Math.round(c.viento)+' km/h</b>'+
              (c.lluvia!=null ? ' · lluvia <b>'+Math.round(c.lluvia)+'%</b>' : '')+
              ' <span style="color:var(--mut2)">('+(c.alKickoff ? 'a la hora del partido' : 'ahora mismo')+')</span></div>';
          }
          if(sNota) sNota.innerHTML = '<div class="fvac">Solo informativo: ni el clima ni las lesiones entran al cálculo del modelo.</div>';
        });
      }).catch(function(){
        if(sCli) sCli.innerHTML = '<div class="fvac">Clima: no disponible ahora.</div>';
      });
    }

    // cara a cara: se completa con las últimas 4 temporadas de ESPN
    if(elH2H && typeof pintarH2HLista==='function' && typeof h2hLocal==='function'){
      h2hESPN(slug, ids[0], ids[1]).then(function(r){
        if(!r || !r.respondio) return;   // ESPN no respondió: se queda lo que ya estaba
        var locales = h2hLocal(p.local, p.visita).partidos;
        var todos = fusionarH2H(locales, r.partidos);
        pintarH2HLista(elH2H, p.local, p.visita, todos,
          todos.length ? 'Últimas 4 temporadas (ESPN), con lo guardado en el teléfono. Incluye copas si se enfrentaron.' :
                         'No se han enfrentado en las últimas 4 temporadas.');
      }).catch(function(){});
    }
  }).catch(function(e){
    var s = elLC && seccion(elLC, 'les');
    if(s) s.innerHTML = '<div class="fvac">Error buscando el partido en ESPN: '+esc(e && e.message || e)+'</div>';
    if(elNews) pintarNoticias(elNews, null, [], []);
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
