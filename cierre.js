/* cierre.js — cuota de cierre automatica para el CLV (MLB, futbol y NBA).
   Cuando un pick tiene el juego ya terminado y NO tiene «Cierre», busca en ESPN la linea de cierre del moneyline
   (ganador; en futbol el 1X2), le quita el margen de la casa y la escribe en el mismo formato que el pick
   (centavos de Kalshi o americana). NUNCA pisa un cierre que escribiste tu ni inventa nada: si ESPN no trae
   cierre, el pick se queda sin CLV y el panel dice cuantos faltan. Solo toca picks de ganador (ML / 1X2). */
(function(root){
'use strict';
var DIAS_BUSQUEDA=[0,-1,1];
var ESPN='https://site.api.espn.com/apis/site/v2/sports/', CORE='https://sports.core.api.espn.com/v2/sports/';
var SLUG_FUT={pl:'eng.1',laliga:'esp.1',seriea:'ita.1',bundesliga:'ger.1',ligue1:'fra.1',cl:'uefa.champions',europa:'uefa.europa',conference:'uefa.europa.conf',ligamx:'mex.1',mls:'usa.1'};

/* ---------- funciones puras (se prueban en node) ---------- */
function norm(s){
  s=String(s==null?'':s).replace(/&amp;/g,'&').toLowerCase();
  try{ s=s.normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){}
  return s.replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function nick(n){ var w=norm(n).split(' '), l=w[w.length-1]||''; if((l==='sox'||l==='jays')&&w.length>1) return w[w.length-2]+' '+l; return l; }
function num(v){
  if(v==null) return null;
  var n=parseFloat(String(v).replace(/[−‒-―‐‑]/g,'-').replace(/[＋+\s,]/g,''));
  return isFinite(n)?n:null;
}
function americano(v){ var n=num(v); return (n!==null&&Math.abs(n)>=100)?n:null; }
function impAm(a){ return a<0?(-a)/((-a)+100):100/(a+100); }
function aAmericano(p){
  if(!(p>0&&p<1)) return null;
  var v=p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p);
  return (v>0?'+':'')+v;
}
function aCentavos(p){ if(!(p>0&&p<1)) return null; var c=Math.round(p*100); return String(Math.min(99,Math.max(1,c))); }
/* formato del cierre = formato del precio del pick: centavos si el pick es de Kalshi (|valor| < 100), americana si no */
function formato(p,ref,esKalshi){
  var kal=(esKalshi!==undefined)?esKalshi:(function(){ var n=num(ref); return n!==null&&Math.abs(n)<100; })();
  return kal?aCentavos(p):aAmericano(p);
}
/* probabilidad sin margen: ml = {h,a,d?} en cuotas americanas -> {h,a,d?} que suman 1 */
function sinMargen(ml){
  var ih=impAm(ml.h), ia=impAm(ml.a), id=(ml.d!=null)?impAm(ml.d):0, s=ih+ia+id;
  if(!(s>1.0&&s<1.20)) return null;                 // suma imposible: dato roto o precio en vivo
  var o={h:ih/s,a:ia/s}; if(ml.d!=null) o.d=id/s;
  if(o.h<0.04||o.h>0.96||o.a<0.04||o.a>0.96) return null;   // un cierre real casi nunca pasa de 96%: eso es un precio en vivo
  return o;
}
/* lee el endpoint core de ESPN. Solo el CIERRE (close); jamas el precio actual ni el de en vivo. */
function leerCierreML(j){
  var items=(j&&j.items)||[], mejor=null;
  items.forEach(function(it){
    var prov=(it.provider&&it.provider.name)||'?', hO=it.homeTeamOdds||{}, aO=it.awayTeamOdds||{}, dO=it.drawOdds||it.drawTeamOdds||{};
    var cierre=function(lado){ var c=lado&&lado.close&&lado.close.moneyLine; return c?americano(c.american!==undefined?c.american:c.alternateDisplayValue):null; };
    var h=cierre(hO), a=cierre(aO), d=cierre(dO);
    if(h===null||a===null) return;
    var ml={h:h,a:a}; if(d!==null) ml.d=d;
    var nv=sinMargen(ml); if(!nv) return;
    var c={prov:prov,nv:nv,tresVias:d!==null,dk:/draftkings/i.test(prov)};
    if(!mejor||(c.dk&&!mejor.dk)) mejor=c;
  });
  return mejor;
}
function mismoNombre(app,t,extra){
  var a=norm(app); if(!a) return false;
  var cs=[t&&t.displayName,t&&t.shortDisplayName,t&&t.name,t&&t.location,t&&t.abbreviation];
  for(var i=0;i<cs.length;i++){ var c=norm(cs[i]); if(c&&(c===a)) return true; }
  var nk=nick(app); if(nk&&nk.length>=3&&nick(t&&t.displayName)===nk) return true;
  if(a.length>=4) for(var k=0;k<cs.length;k++){ var c2=norm(cs[k]); if(c2.length>=4&&(c2.indexOf(a)>=0||a.indexOf(c2)>=0)) return true; }
  if(typeof extra==='function'){ for(var m=0;m<2;m++){ try{ if(extra(app,cs[m])) return true; }catch(e){} } }
  return false;
}
/* busca el evento del scoreboard de ESPN: {id,estado,hora,local,visita} o null / {doble:true} */
function buscarEvento(sb,nomA,nomH,extra){
  var out=[];
  ((sb&&sb.events)||[]).forEach(function(e){
    var c=e.competitions&&e.competitions[0]; if(!c||!c.competitors) return;
    var h=null,a=null; c.competitors.forEach(function(x){ if(x.homeAway==='home') h=x; else if(x.homeAway==='away') a=x; });
    if(!h||!a) return;
    if(mismoNombre(nomA,a.team,extra)&&mismoNombre(nomH,h.team,extra)){
      var st=(e.status&&e.status.type)||(c.status&&c.status.type)||{};
      out.push({id:String(e.id),estado:st.state||'',hora:Date.parse(e.date)||0,local:h.team,visita:a.team});
    }
  });
  if(!out.length) return null;
  if(out.length>1) return {doble:true};
  return out[0];
}
/* descripcion normalizada de un pick de ganador, o null si no es de ganador / no se entiende */
function infoPick(app,p,extra){
  if(!p) return null;
  var ref,esK;
  if(app==='mlb'){
    var pr=String(p.juego||'').split(' @ '); if(pr.length!==2) return null;
    var mm=String(p.m||'').match(/^(.+) gana$/); if(!mm) return null;
    var f=String(p.f||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!f) return null;
    var lado=mismoNombre(mm[1],{displayName:pr[0]})?'a':(mismoNombre(mm[1],{displayName:pr[1]})?'h':null); if(!lado) return null;
    return {liga:'baseball/mlb',fecha:new Date(+f[1],+f[2]-1,+f[3],12).getTime(),away:pr[0],home:pr[1],lado:lado,ref:p.am,kalshi:(p.plat==='kalshi')};
  }
  if(app==='nba'||app==='nhl'||app==='nfl'){
    if(p.mercado!=='ML'||(p.side!=='H'&&p.side!=='A')||!p.ts||!p.aN||!p.hN) return null;
    return {liga:{nba:'basketball/nba',nhl:'hockey/nhl',nfl:'football/nfl'}[app],fecha:+p.ts,away:p.aN,home:p.hN,lado:p.side==='H'?'h':'a',ref:p.cuota,exacta:true};
  }
  if(app==='fut'){
    if(p.mercado!=='1X2'||!p.local||!p.visita||!SLUG_FUT[p.liga]) return null;
    var m=String(p.fecha||'').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/); if(!m) return null;
    var y=+m[3]; if(y<100) y+=2000;
    var lado3=(norm(p.seleccion)==='empate')?'d':(mismoNombre(p.seleccion,{displayName:p.local},extra)?'h':(mismoNombre(p.seleccion,{displayName:p.visita},extra)?'a':null));
    if(!lado3) return null;
    return {liga:'soccer/'+SLUG_FUT[p.liga],fecha:new Date(y,+m[2]-1,+m[1],12).getTime(),away:p.visita,home:p.local,lado:lado3,ref:p.cuota,tres:true};
  }
  return null;
}
function ymd(ts,zona){
  try{ var s=new Date(ts).toLocaleDateString('en-CA',zona?{timeZone:zona}:undefined); return s.replace(/-/g,''); }catch(e){ return ''; }
}
function fechasEspn(info){
  var t0=info.fecha;
  return DIAS_BUSQUEDA.map(function(d){ return ymd(t0+d*864e5,info.exacta?'America/New_York':undefined); }).filter(function(x,i,a){ return x&&a.indexOf(x)===i; });
}

/* ---------- red ---------- */
var CACHE={sb:{},core:{}}, CORRIENDO=false, ULT=0, ESTADO={vacio:true};
function getJSON(url){
  var ctl=(typeof AbortController!=='undefined')?new AbortController():null, to=ctl?setTimeout(function(){ ctl.abort(); },9000):null;
  return root.fetch(url,{signal:ctl?ctl.signal:undefined}).then(function(r){ if(to) clearTimeout(to); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); },function(e){ if(to) clearTimeout(to); throw e; });
}
function scoreboard(liga,fecha){
  var k=liga+'|'+fecha; if(CACHE.sb[k]) return CACHE.sb[k];
  return (CACHE.sb[k]=getJSON(ESPN+liga.replace('/','/')+'/scoreboard?dates='+fecha+'&limit=300').catch(function(e){ delete CACHE.sb[k]; throw e; }));
}
function cierreDe(liga,id){
  var k=liga+'|'+id; if(CACHE.core[k]) return CACHE.core[k];
  var par=liga.split('/'), url=CORE+par[0]+'/leagues/'+par[1]+'/events/'+id+'/competitions/'+id+'/odds';
  return (CACHE.core[k]=getJSON(url).then(leerCierreML).catch(function(e){ delete CACHE.core[k]; throw e; }));
}
function eventoDe(info,extra){
  var fs=fechasEspn(info), i=0;
  function sig(){
    if(i>=fs.length) return Promise.resolve(null);
    var f=fs[i++];
    return scoreboard(info.liga,f).then(function(sb){ var e=buscarEvento(sb,info.away,info.home,extra); return e||sig(); },function(){ return sig(); });
  }
  return sig();
}

/* ---------- integracion con las apps ---------- */
var CLAVES={mlb:'ventaja_picks_v1',nba:'ova_nba_registro_v1',fut:'ova_futbol_registro_v1',nhl:'ova_nhl_registro_v1',nfl:'ova_nfl_registro_v1'};
function appActual(){ var p=(root.location&&root.location.pathname||'').toLowerCase(); return /nba/.test(p)?'nba':(/nhl/.test(p)?'nhl':(/nfl/.test(p)?'nfl':(/futbol/.test(p)?'fut':'mlb'))); }
function leer(app){ try{ var t=root.localStorage.getItem(CLAVES[app]); var a=t?JSON.parse(t):[]; return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function escribir(app,a){ try{ root.localStorage.setItem(CLAVES[app],JSON.stringify(a)); return true; }catch(e){ return false; } }
function nombreExtra(){ return (typeof root.mismoEquipo==='function')?function(a,b){ return root.mismoEquipo(a,b); }:null; }

function procesar(app){
  var extra=app==='fut'?nombreExtra():null;
  var todos=leer(app), cand=[];
  var est={rellenados:0,espera:0,sinDato:0,noEncontrado:0,yaTienen:0,total:0};
  todos.forEach(function(p){
    var info=infoPick(app,p,extra); if(!info) return;
    est.total++;
    if(p.cierre!=null&&String(p.cierre).trim()!==''){ est.yaTienen++; return; }
    cand.push({p:p,info:info});
  });
  var cambios=[], cadena=Promise.resolve();
  cand.forEach(function(c){
    cadena=cadena.then(function(){
      return eventoDe(c.info,extra).then(function(ev){
        if(!ev||ev.doble){ est.noEncontrado++; return; }
        if(ev.estado!=='post'){ est.espera++; return; }
        return cierreDe(c.info.liga,ev.id).then(function(cl){
          if(!cl){ est.sinDato++; return; }
          if(c.info.lado==='d'&&cl.nv.d==null){ est.sinDato++; return; }
          var pr=cl.nv[c.info.lado], txt=formato(pr,c.info.ref,c.info.kalshi);
          if(!txt){ est.sinDato++; return; }
          cambios.push([c.p.id,{cierre:txt,cierreAuto:true,cierreFuente:'ESPN · '+cl.prov+' (sin margen)'}]); est.rellenados++;
        },function(){ est.sinDato++; });
      },function(){ est.sinDato++; });
    });
  });
  return cadena.then(function(){
    if(cambios.length){
      var a=leer(app);
      a.forEach(function(x){ for(var i=0;i<cambios.length;i++) if(String(x.id)===String(cambios[i][0])&&(x.cierre==null||String(x.cierre).trim()==='')) for(var k in cambios[i][1]) x[k]=cambios[i][1][k]; });
      escribir(app,a);
    }
    return est;
  });
}
function notaTxt(est){
  if(!est||!est.total) return '';
  var t='Cierre automático (ESPN, sin margen): ';
  var partes=[];
  if(est.rellenados) partes.push(est.rellenados+' relleno'+(est.rellenados===1?'':'s')+' ahora');
  if(est.yaTienen) partes.push(est.yaTienen+' con cierre');
  if(est.espera) partes.push(est.espera+' esperan a que termine el juego');
  if(est.sinDato) partes.push(est.sinDato+' sin dato en ESPN (puedes escribirlo tú)');
  if(est.noEncontrado) partes.push(est.noEncontrado+' no encontrado'+(est.noEncontrado===1?'':'s')+' (doble jornada o nombre distinto)');
  if(!partes.length) return '';
  return t+partes.join(' · ')+'. Solo picks de ganador (ML / 1X2); el resto, escribe el cierre a mano.';
}
function correr(silencioso){
  if(CORRIENDO) return Promise.resolve(null);
  var app=appActual(); CORRIENDO=true; ULT=Date.now();
  return procesar(app).then(function(est){
    ESTADO=est;
    if(est.rellenados&&typeof root.pintarRegistro==='function'){ try{ root.pintarRegistro(); }catch(e){} }
    pintarNota();
    return est;
  }).catch(function(){ return null; }).then(function(r){ CORRIENDO=false; return r; });
}
function pintarNota(){
  var doc=root.document; if(!doc) return;
  var t=notaTxt(ESTADO), el=doc.getElementById('ovaCierreNota');
  if(!t){ if(el&&el.parentNode) el.parentNode.removeChild(el); return; }
  if(!el){
    var ancla=doc.querySelector('.ova-cie,input.cie'); if(!ancla) return;
    var cont=ancla.closest?ancla.closest('.registro,#vReg,#pane-picks,.pane,section,div[id]'):null; if(!cont) return;
    el=doc.createElement('div'); el.id='ovaCierreNota'; el.className='nota'; el.style.cssText='margin:8px 0';
    cont.insertBefore(el,cont.firstChild);
  }
  el.textContent=t;
}
function nota(){ return notaTxt(ESTADO); }
function armar(){
  if(!root.document||root.__ovaCierre) return; root.__ovaCierre=true;
  var pendiente=null;
  function pronto(ms){ if(pendiente) return; pendiente=setTimeout(function(){ pendiente=null; if(root.document.visibilityState==='hidden') return; if(Date.now()-ULT<45000){ pintarNota(); return; } correr(true).then(pintarNota); },ms); }
  root.addEventListener('load',function(){ pronto(4000); });
  root.document.addEventListener('click',function(){ pronto(1500); },true);
  root.document.addEventListener('visibilitychange',function(){ if(root.document.visibilityState==='visible') pronto(2500); });
  setInterval(function(){ pronto(500); },180000);
}

var API={norm:norm,num:num,americano:americano,impAm:impAm,aAmericano:aAmericano,aCentavos:aCentavos,formato:formato,sinMargen:sinMargen,leerCierreML:leerCierreML,buscarEvento:buscarEvento,infoPick:infoPick,fechasEspn:fechasEspn,notaTxt:notaTxt,procesar:procesar,correr:correr,nota:nota,CLAVES:CLAVES,appActual:appActual};
root.OVACierre=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(root.document) armar();
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
