/* OVA MLB v47 · historial de 3 años del abridor (estilo Marcel).
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
      [].slice.call(document.querySelectorAll('.ver')).forEach(function(e){ e.textContent='v47'; });
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

  window.OVAHist={pHistDe:pHistDe,eraHistSeason:eraHistSeason,eAppDe:eAppDe,set:function(v){HIST=v;},get:function(){return HIST;}};
}catch(e){ if(window.console) console.error('historial.js',e); }
})();
