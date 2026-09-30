/* OVA MLB v47/v48/v49 · historial de 3 años del abridor (estilo Marcel).
   Va como archivo aparte y se engancha a la app sin tocar su codigo: envuelve
   temporada(), eraUsado() y detalle(), igual que hacen obsidiana.js y railway.js.
   APAGADO por defecto. Solo cambia el calculo si lo enciendes en Ajustes.

   Que se midio (backtestmarcel.html, 2024-2026, ~11,800 salidas, ajustar con dos
   temporadas y medir en la tercera): mejora de 0.31% a 0.44% del error en cada una
   y 0.38% junta. Efecto chico: ~0.8 puntos de probabilidad de ese lado. Por eso
   entra como opcion y no como valor por defecto.

   Modelo:  ERA_pronosticado = a + b1 * ERA_del_año_jalado + b2 * Historial
     ERA_del_año_jalado = (ER*9 + 40*liga) / (IP + 40)
     Historial          = (sum peso*9*ER + 60*liga) / (sum peso*IP + 60), pesos 5-4-3
                          sobre los 3 años previos; solo con 40+ innings en esos años.
   Reemplaza SOLO el componente de temporada del ERA del abridor (el 70% de la
   mezcla); el 30% de las ultimas 5 salidas queda igual. */
(function(){
try{
  var HA=0.8505, HB1=0.4410, HB2=0.3724;
  var H_PRIOR=40, H_PAD=60, H_PESOS=[5,4,3], H_MIN_IP=40;
  var HIST='off';
  var HC={};

  function ligaAct(){ return (typeof LIGA_ERA!=='undefined'&&LIGA_ERA!=null)?LIGA_ERA:4.10; }

  /* yearByYear: todas las temporadas del pitcher en una sola llamada */
  function histAbridor(id,year){
    var k=id+'-'+year;
    if(HC[k]) return Promise.resolve(HC[k]);
    return j(API+'/people/'+id+'/stats?stats=yearByYear&group=pitching&gameType=R').then(function(d){
      var sp=(d.stats&&d.stats[0]&&d.stats[0].splits)||[], h={};
      sp.forEach(function(s){
        var yr=+s.season;
        if(!(yr>=year-3&&yr<year)) return;
        var st=s.stat||{};
        var o=h[yr]||(h[yr]={ip:0,er:0});
        o.ip+=ipToNum(st.inningsPitched);
        o.er+=+(st.earnedRuns||0);
      });
      HC[k]=h; return h;
    }).catch(function(){ return null; });
  }

  function pHistDe(h,year){
    if(!h) return null;
    var num=0,den=0,ipTot=0;
    for(var i=0;i<3;i++){
      var o=h[year-1-i];
      if(!o||!(o.ip>0)) continue;
      num+=H_PESOS[i]*9*o.er; den+=H_PESOS[i]*o.ip; ipTot+=o.ip;
    }
    if(ipTot<H_MIN_IP) return null;
    return (num+H_PAD*ligaAct())/(den+H_PAD);
  }
  function eAppDe(se){
    if(!se) return null;
    var L=ligaAct();
    var er9;
    if(se.era!=null&&isFinite(se.era)) er9=se.era*se.ip;
    else if(!(se.ip>0)) er9=0;
    else return null;
    return (er9+H_PRIOR*L)/(se.ip+H_PRIOR);
  }
  function eraHistSeason(se,pH){
    if(pH==null) return null;
    var e=eAppDe(se);
    if(e==null) return null;
    return HA+HB1*e+HB2*pH;
  }

  /* 1. cada abridor llega con su historial pegado */
  var _temporada=temporada;
  temporada=function(id,year){
    return _temporada(id,year).then(function(se){
      if(!se||se.hist!==undefined) return se;
      return histAbridor(id,year).then(function(h){ se.hist=h; se.hy=year; return se; });
    });
  };

  /* 2. el ERA usado: si esta encendido, cambia solo el componente de temporada */
  var _eraUsado=eraUsado;
  eraUsado=function(se,l5){
    var base=_eraUsado(se,l5);
    if(HIST!=='on'||!se||!se.hist) return base;
    if(MODO!=='mix'&&MODO!=='season') return base;
    var sH=eraHistSeason(se,pHistDe(se.hist,se.hy));
    if(sH==null) return base;
    if(MODO==='season') return sH;
    var Lg=ligaAct(), anc=null;
    if(se.fip!=null&&isFinite(se.fip)&&se.ip>0) anc=(se.fip*se.ip+Lg*30)/(se.ip+30);
    var l=reg(l5.era,l5.ip,PRIOR_ERA*0.625,anc);
    return (l!=null)? sH*0.70+l*0.30 : sH;
  };

  /* 3. pestaña Numeros: filas del historial y aviso cuando se separa del ERA del año */
  var RE_FILA=/<tr class="usa"><td>ERA usado \([^)]*\)<\/td><td class="n">[^<]*<\/td><td class="n">[^<]*<\/td><\/tr>/;
  function agregar(out,x){
    var sea=x.sea, seh=x.seh;
    if(!sea||!seh||!x.year) return out;
    var pA=pHistDe(sea.hist,x.year), pH=pHistDe(seh.hist,x.year);
    var sA=eraHistSeason(sea,pA), sH=eraHistSeason(seh,pH);
    var m=out.match(RE_FILA);
    if(!m) return out;
    var idx=out.indexOf(m[0])+m[0].length;
    var filas='<tr><td>Historial de 3 años (ERA)</td><td class="n">'+num(pA)+'</td><td class="n">'+num(pH)+'</td></tr>'+
      '<tr><td>ERA con historial'+(HIST==='on'?' (en uso)':' (solo informativo)')+'</td><td class="n">'+num(sA)+'</td><td class="n">'+num(sH)+'</td></tr>';
    out=out.slice(0,idx)+filas+out.slice(idx);
    var fin=out.indexOf('</table>',idx);
    if(fin<0) return out;
    fin+=8;
    var av='';
    [[x.pa,sea,sA],[x.ph,seh,sH]].forEach(function(t){
      var nombre=t[0]?t[0].fullName:'Abridor', e=eAppDe(t[1]), s=t[2];
      if(s==null||e==null||Math.abs(s-e)<0.5) return;
      av+='<div class="flag"><b>'+esc(nombre)+'</b>: con su historial de 3 años el ERA pronosticado es '+num(s)+
        ', contra '+num(e)+' si se mira solo este año. '+
        (HIST==='on'?'El cálculo ya usa el primero.':'El cálculo sigue usando el segundo; el historial está apagado en Ajustes.')+'</div>';
    });
    if(HIST==='on'&&(sA!=null||sH!=null))
      av+='<div class="leyenda">Con el historial encendido, el ERA de temporada de los abridores que tienen historial se jaló hacia su propio historial de 3 años y no solo hacia el promedio de la liga. Cualquier aviso de arriba que hable de «jalado hacia la liga» debe leerse con eso en mente. El 30% de las últimas 5 salidas no cambia.</div>';
    return out.slice(0,fin)+av+out.slice(fin);
  }
  var _detalle=detalle;
  detalle=function(x){
    var out=_detalle(x);
    try{ out=agregar(out,x); }catch(e){}
    try{ ctxDe(x); }catch(e){}
    return out;
  };

  /* 4. selector en Ajustes, apagado por defecto, y version */
  function montar(){
    try{
      var m=document.getElementById('modo');
      var box=m&&m.closest?m.closest('.modo'):null;
      if(box&&!document.getElementById('hist')){
        var d=document.createElement('div');
        d.className='modo';
        d.innerHTML='<label for="hist">Historial del abridor (3 años)</label>'+
          '<select id="hist">'+
          '<option value="off" selected>Apagado &mdash; como estaba</option>'+
          '<option value="on">Encendido &mdash; jala al abridor hacia su historial</option>'+
          '</select>';
        box.parentNode.insertBefore(d,box.nextSibling);
        document.getElementById('hist').addEventListener('change',function(){
          HIST=this.value;
          if(typeof repintarTodo==='function') repintarTodo();
        });
      }
    }catch(e){}
    try{
      [].slice.call(document.querySelectorAll('.ver')).forEach(function(e){ e.textContent='v49'; });
      var f=document.querySelector('footer details');
      if(f&&!f.querySelector('.ovaNota47')){
        var n=document.createElement('div');
        n.className='flag ovaNota47';
        n.innerHTML='<b>v47 · historial del abridor (opcional).</b> En Ajustes puedes encender «Historial del abridor (3 años)». Jala el ERA de temporada de cada abridor hacia su propio historial de las últimas tres temporadas (pesos 5-4-3, estilo Marcel) y no solo hacia el promedio de la liga. Se midió con 2024, 2025 y 2026, ajustando con dos y midiendo en la tercera: mejora del error de 0.31%, 0.41% y 0.44%, y 0.38% juntas. El efecto es chico, alrededor de 0.8 puntos de probabilidad de ese lado, y no se ha probado contra el mercado. Por eso viene <b>apagado</b>. Constantes: 40 innings de liga para el ERA del año, 60 para acolchar el historial, solo abridores con 40 o más innings en esos años. Dos diferencias con la prueba: allá el ERA de control fue el de temporada sin la mezcla de las últimas 5 (aquí solo se reemplaza el 70% de temporada) y allá el promedio de liga fue el del año previo (aquí el del año en curso). Aunque esté apagado, la pestaña Números muestra el historial y el ERA pronosticado al lado, sin tocar ningún porcentaje.';
        f.appendChild(n);
      }
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',montar); else montar();

  /* 5. IA: analisis completo en una sola respuesta (v48).
     Antes: 150 palabras, 5 busquedas. Ahora: 10 busquedas, mas espacio, secciones
     fijas, y una SENAL final que se puede anotar junto al pick y medir despues.
     El Worker puede tener sus propios topes: si los tiene, mandan ellos. */
  function iaSinAcentos(t){ return t; }
  llamarIA=function(prompt){
    return fetch(WORKER_URL,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        max_tokens:4000,
        messages:[{role:'user',content:prompt}],
        tools:[{type:'web_search_20250305',name:'web_search',max_uses:10}]
      })
    }).then(function(r){
      if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP '+r.status+' -- '+t.slice(0,180)); });
      return r.json();
    }).then(function(d){
      if(d.error) throw new Error(d.error.message||'Error de la API');
      var partes=(d.content||[]).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; });
      var t=partes.join('\n\n');
      return t||'Sin respuesta de texto.';
    });
  };
  var REGLAS='Reglas: no inventes nada. Si no encuentras un dato, escribe "no encontre" en vez de rellenar. '+
    'Pon la fuente y la hora aproximada de cada dato importante. Ignora rumores de redes o comentarios sin fuente. '+
    'Separa lo que ENCONTRASTE con fuente de lo que estas SUPONIENDO. No repitas lo que mi modelo ya dice. '+
    'Usa SOLO informacion de la temporada actual: descarta cualquier articulo de otros años aunque el enfrentamiento sea igual, y si una fuente no tiene fecha clara, no la uses.';
  var CIERRE='Termina con una sola linea: "SENAL: MANTENER", "SENAL: CUIDADO" o "SENAL: EVITAR", seguida de la razon principal en una frase.';
  promptJuego=function(juego,fecha,buenos,mlPick){
    var l=(buenos||[]).slice(0,5).map(function(m){
      return '- '+m.m+': mi modelo dice '+m.p.toFixed(1)+'%, ventaja '+m.v.ventaja.toFixed(1)+
        ' puntos, EV '+(m.v.ev*100).toFixed(1)+'%';
    }).join('\n');
    var ml=mlPick?('\nGanador segun el modelo, sin filtrar por valor: '+mlPick.m+' '+mlPick.p.toFixed(1)+'%.'):'';
    return 'Eres un analista de apuestas de MLB, directo y esceptico. Juego: '+juego+' el '+fecha+'. '+
      'Mi modelo matematico usa ERA, carreras por juego y ERA de bullpen, y NO ve lineups ni noticias. '+
      'Da este ranking de valor para el juego:\n'+(l||'(sin cuotas todavia)')+ml+'\n\n'+
      'Investiga en internet TODO lo que afecte este juego y responde en espanol, corto y con datos concretos, en estas secciones:\n'+
      '1) Lineups y lesiones: lineup confirmado de cada equipo, titulares que faltan, lesionados importantes, cambios de abridor.\n'+
      '2) Abridores: forma de sus ultimas salidas, historial contra este rival y en este parque, y cualquier cosa rara (velocidad, dias de descanso).\n'+
      '3) Bullpen: quienes lanzaron ayer y anteayer y quien esta disponible hoy.\n'+
      '4) Contexto: que se juega cada equipo (posicion en la tabla, si ya clasifico o esta eliminado, si es probable que descanse titulares), y clima y viento si el parque es abierto.\n'+
      '5) Contra el modelo: por cada hallazgo, di si apoya o contradice al modelo y cuanto pesa (poco, medio o mucho).\n'+
      REGLAS+' Maximo unas 350 palabras.\n'+CIERRE;
  };
  promptDia=function(lista){
    var l=(lista||[]).slice(0,8).map(function(m,i){
      return (i+1)+'. '+m.juego+' -- modelo: '+m.gana+' '+m.p.toFixed(1)+'% (ventaja '+m.vc.toFixed(2)+' carreras)';
    }).join('\n');
    return 'Eres un analista de apuestas de MLB, directo y esceptico. Este es el ranking de mi modelo matematico '+
      '(ERA, carreras por juego, ERA de bullpen; NO ve lineups ni noticias) para HOY, ordenado por probabilidad pura, sin mirar cuotas:\n'+l+'\n\n'+
      'Investiga en internet TODO lo que afecte estos juegos: lineups confirmados, lesiones o bajas de ultima hora, cambios de abridor, '+
      'uso reciente del bullpen, que se juega cada equipo (posicion en la tabla, descanso de titulares) y clima donde importe. '+
      'Responde en espanol. Por cada juego de la lista, en una o dos lineas: lo que encontraste y si apoya o contradice al modelo. '+
      'Al final: cuales 3 o 4 tienen mas chance real considerando lo que encontraste, y en cuales la informacion contradice al modelo.\n'+
      REGLAS+' Maximo unas 450 palabras.\n'+
      'Cierra cada juego con "SENAL: MANTENER", "SENAL: CUIDADO" o "SENAL: EVITAR".';
  };

  /* 6. identificacion exacta del juego para la IA (v49).
     Causa de un error real: CHC @ SD del 30-sep-2026 (Wild Card, juego 2) se
     confundio con la serie del año anterior, mismos equipos, misma ronda y misma
     fecha. Ahora el prompt lleva temporada, serie, numero de juego, parque, hora
     y abridores, y le prohibe usar datos de otros años. */
  var CTX={}, GJ={};
  if(typeof fila==='function'){
    var _fila=fila;
    fila=function(g,year){
      try{ if(g&&g.gamePk) GJ[g.gamePk]=g; }catch(e){}
      return _fila(g,year);
    };
  }
  function ctxDe(x){
    var g=GJ[x.gamePk];
    if(!g||!x.a||!x.h) return;
    var ab=function(t){ return t.abbreviation||t.name; };
    var fecha=ymd(x.fecha), key=ab(x.a.team)+' @ '+ab(x.h.team)+'|'+fecha, p=[];
    p.push('temporada '+x.year+', fecha del juego '+fecha);
    p.push(x.a.team.name+' (visita) @ '+x.h.team.name+' (local)');
    if(x.venue) p.push('parque: '+x.venue);
    if(g.seriesDescription){
      p.push(g.seriesDescription+(g.gamesInSeries&&g.seriesGameNumber?', juego '+g.seriesGameNumber+' de '+g.gamesInSeries:''));
    }
    if(g.gameDate) p.push('primer lanzamiento (UTC): '+g.gameDate);
    if(x.pa&&x.ph) p.push('abridores probables: '+x.pa.fullName+' ('+ab(x.a.team)+') contra '+x.ph.fullName+' ('+ab(x.h.team)+')');
    var ra=g.teams&&g.teams.away&&g.teams.away.leagueRecord, rh=g.teams&&g.teams.home&&g.teams.home.leagueRecord;
    if(ra&&rh&&ra.wins!=null&&rh.wins!=null) p.push('records antes del juego: '+ab(x.a.team)+' '+ra.wins+'-'+ra.losses+', '+ab(x.h.team)+' '+rh.wins+'-'+rh.losses);
    CTX[key]=p.join('; ');
  }
  var AVISO_ANIO='Estos mismos equipos pueden haberse enfrentado antes: en la misma ronda, en otra fecha o en otra temporada. '+
    'Usa SOLO informacion de la temporada indicada y de este juego exacto; descarta cualquier articulo de años anteriores. '+
    'Si una fuente habla de un resultado de este juego, comprueba que el juego ya haya empezado segun la hora indicada; si todavia no empezo, dilo. '+
    'Al citar un resultado, di el marcador y la fecha.';
  var _pj=promptJuego;
  promptJuego=function(juego,fecha,buenos,mlPick){
    var c=CTX[juego+'|'+fecha];
    var ident=c?('IDENTIFICACION EXACTA DEL JUEGO: '+c+'. '):('El juego es del '+fecha+' (usa solo informacion de esa temporada). ');
    return ident+AVISO_ANIO+'\n\n'+_pj(juego,fecha,buenos,mlPick);
  };
  var _pd=promptDia;
  promptDia=function(lista){
    var fe=''; try{ fe=(document.getElementById('fecha')||{}).value||''; }catch(e){}
    var lines=[];
    (lista||[]).slice(0,8).forEach(function(m){ var c=CTX[m.juego+'|'+fe]; if(c) lines.push('- '+m.juego+': '+c); });
    return (lines.length?'IDENTIFICACION EXACTA DE CADA JUEGO:\n'+lines.join('\n')+'\n':'La fecha de estos juegos es '+fe+'. ')+
      AVISO_ANIO+'\n\n'+_pd(lista);
  };

  window.OVAHist={pHistDe:pHistDe,eraHistSeason:eraHistSeason,eAppDe:eAppDe,set:function(v){HIST=v;},get:function(){return HIST;}};
}catch(e){ if(window.console) console.error('historial.js',e); }
})();
