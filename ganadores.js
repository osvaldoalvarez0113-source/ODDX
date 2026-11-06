/* OVA · Pestaña Al gane (window.OVAGanadores) — MLB, fútbol, NBA, NHL y NFL
   Reemplaza el ranking viejo: ese se sigue pintando oculto porque registra los juegos en Auto y publica el resumen del hub.
   Ordena los juegos por qué tan probable es que gane el favorito, con el % del mercado: es lo que mejor separa ganadores
   (medido en docs/MEDICION-PICKS-GANADORES-2026-11.md). Lee el registro automático (ova_auto_v1), que ya guarda cada juego
   antes de empezar con el modelo solo y el precio del mercado. No calcula apuestas ni toca ningún pick. */
(function(root){
"use strict";
var KEY='ova_auto_v1', MARGEN=0.03;
var REG={mlb:'ventaja_picks_v1',fut:'ova_futbol_registro_v1',nba:'ova_nba_registro_v1',nhl:'ova_nhl_registro_v1',nfl:'ova_nfl_registro_v1'};
/* separación modelo-mercado que solo pasa en 1 de cada 10 juegos, medida por deporte */
var ALERTA={mlb:11,fut:12,nba:16,nhl:9,nfl:15};
var NOMBRE={mlb:'MLB',fut:'Fútbol',nba:'NBA',nhl:'NHL',nfl:'NFL'};
/* Props de juego más usadas: cuántas veces pasó de verdad (docs/PROPS-2026-10.md, ~44,300 juegos con línea de cierre). Ninguna le gana a la línea. */
var PROPS={
 mlb:[['Ambos equipos anotan en el juego',.869],['El favorito va ganando tras 5 innings (sin empates)',.581],['Nadie anota en el 1er inning (NRFI)',.506],['Sí hay carrera en el 1er inning (YRFI)',.494],['El local anota en el 1er inning',.312],['La visita anota en el 1er inning',.267],['Empate tras 5 innings',.155]],
 fut:[['Gol en el 1er tiempo',.717],['Ambos anotan: sí',.545],['Ambos anotan: no',.455],['El favorito gana el 1er tiempo',.406],['Empate al descanso',.400],['Más de 1.5 goles en el 1er tiempo',.356]],
 nba:[['El favorito gana la 1a mitad (sin empates)',.626],['El favorito gana el 1er cuarto (sin empates)',.592],['El local gana la 1a mitad',.523],['El local gana el 1er cuarto',.506]],
 nhl:[['Ambos anotan (60 min)',.901],['Hay gol en el 1er periodo',.832],['El favorito gana el 1er periodo (sin empates)',.579],['Más de 1.5 goles en el 1er periodo',.539],['El favorito gana en los 60 minutos',.488],['Empate a los 60 minutos',.223]],
 nfl:[['Hay puntos en el 1er cuarto',.912],['Ambos anotan en la 1a mitad',.875],['El favorito gana la 1a mitad (sin empates)',.629],['Empate al medio tiempo',.072]]};

function favDe(p){ return p.L>=p.A?'L':'A'; }
/* cuántas victorias hacen falta para pagar una derrota a precio justo */
function borra(p){ return p/(1-p); }
function americana(p){ if(!(p>0&&p<1)) return ''; return p>=0.5?'−'+Math.round(p/(1-p)*100):'+'+Math.round((1-p)/p*100); }
function diaDe(ts){ var d=new Date(ts); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function tramo(p){ return p>=0.7?'alto':(p>=0.6?'medio':'bajo'); }

/* los juegos por empezar de una app → filas ordenadas por día y, dentro del día, de más a menos probable */
function lista(items,app,ahora,aciertos){
 var out=[];
 (items||[]).forEach(function(r){
  if(!r||r.app!==app||r.res||!(r.ts>ahora)) return;
  var k=r.k1||r.k0||null, m=r.m1||r.m0||null;
  if((app==='nba'||app==='nhl'||app==='nfl')&&!r.cr) m=null;   /* registro viejo: era casi todo mercado, no el modelo */
  var base=k||m; if(!base) return;
  var f=favDe(base), p=base[f], local=f==='L', dif=(k&&m)?(m[f]-k[f])*100:null;
  var o={id:r.id,ts:r.ts,dia:r.fecha||diaDe(r.ts),fav:local?r.local:r.visita,rival:local?r.visita:r.local,local:local,p:p,conMercado:!!k,fuente:r.ksrc||'',
   empate:base.D!=null?base.D:null,modelo:m?m[f]:null,dif:dif,alerta:dif!==null&&Math.abs(dif)>=(ALERTA[app]||12),borra:borra(p),justa:americana(p),centavos:Math.round(p*100),tramo:tramo(p),liga:r.liga||''};
  var ac=aciertos?aciertos.fila(app,p,local,!!k):null;
  if(ac) o.hist={w:ac.w,n:ac.n,pct:ac.pct};
  out.push(o);
 });
 out.sort(function(a,b){ if(a.dia!==b.dia) return a.dia<b.dia?-1:1; if(a.conMercado!==b.conMercado) return a.conMercado?-1:1; return b.p-a.p; });
 var visto={}; out.forEach(function(o){ if(o.conMercado&&!visto[o.dia]){ visto[o.dia]=1; o.top=true; } });
 return out;
}
/* cómo le fue a la lista: el más seguro de cada día, 1 unidad con el margen de una casa */
function marcadorLista(items,app,mes){
 var porDia={};
 (items||[]).forEach(function(r){
  if(!r||r.app!==app||!r.res||r.res==='X') return;
  var k=r.k1||r.k0; if(!k||!r.fecha||r.fecha.slice(0,7)!==mes) return;
  var f=favDe(k); if(!porDia[r.fecha]||k[f]>porDia[r.fecha].p) porDia[r.fecha]={p:k[f],gana:r.res===f};
 });
 var o={g:0,p:0,u:0};
 Object.keys(porDia).forEach(function(d){ var x=porDia[d], dec=(1/x.p)/(1+MARGEN); if(x.gana){ o.g++; o.u+=dec-1; } else { o.p++; o.u-=1; } });
 return o;
}
function ganancia(p,app){
 var c=parseFloat(String(app==='mlb'?p.am:p.cuota).replace(/[−–—]/g,'-').replace(/[^0-9.+-]/g,'')); if(!isFinite(c)||c===0) return null;
 if(app==='mlb'&&p.plat==='kalshi') return c>0&&c<100?(100-c)/c:null;
 if(Math.abs(c)>=100) return c>0?c/100:100/-c;
 return c>1?c-1:null;
}
/* tus picks guardados en esta app, este mes */
function marcadorMio(picks,app,mes){
 var o={g:0,p:0,u:0,sinCuota:0};
 (picks||[]).forEach(function(x){
  if(!x) return;
  var fecha=x.f||x.fecha||(x.ts?diaDe(x.ts):''); if(String(fecha).slice(0,7)!==mes) return;
  var res=app==='mlb'?x.res:(x.estado==='ganado'?'G':(x.estado==='perdido'?'P':null));
  if(res==='G'){ o.g++; var u=ganancia(x,app); if(u===null) o.sinCuota++; else o.u+=u; }
  else if(res==='P'){ o.p++; o.u-=1; }
 });
 return o;
}
function esperados(filas){ var s=0; filas.forEach(function(x){ s+=x.p; }); return s; }
var API={PROPS:PROPS,lista:lista,marcadorLista:marcadorLista,marcadorMio:marcadorMio,borra:borra,americana:americana,esperados:esperados,ALERTA:ALERTA};
root.OVAGanadores=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
var doc=root.document; if(!doc) return;

/* ---------- pantalla ---------- */
function mk(t,c,x){ var e=doc.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function boton(c,x,fn){ var b=mk('div',c,x); b.setAttribute('role','button'); b.tabIndex=0; b.addEventListener('click',function(e){ e.stopPropagation(); fn(); }); b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); } }); return b; }
function json(k){ try{ var j=JSON.parse(root.localStorage.getItem(k)||'[]'); return Array.isArray(j)?j:[]; }catch(e){ return []; } }
function appActual(){ var a=doc.documentElement.getAttribute('data-app')||''; if(NOMBRE[a]) return a; var p=(root.location&&root.location.pathname)||''; return /futbol/.test(p)?'fut':(/nba/.test(p)?'nba':(/nhl/.test(p)?'nhl':(/nfl/.test(p)?'nfl':'mlb'))); }
function etiquetaDia(d,ahora){ var h=diaDe(ahora), m=diaDe(ahora+864e5); if(d===h) return 'Hoy'; if(d===m) return 'Mañana'; try{ var s=new Date(d+'T12:00:00').toLocaleDateString('es-US',{weekday:'long',day:'numeric',month:'short'}); return s.charAt(0).toUpperCase()+s.slice(1); }catch(e){ return d; } }
function hora(ts){ try{ return new Date(ts).toLocaleTimeString('es-US',{hour:'numeric',minute:'2-digit',hour12:true}); }catch(e){ return ''; } }
function sg(u){ return (u>=0?'+':'−')+Math.abs(u).toFixed(1)+' u'; }
var CSS=['#gane_zona,#algane,#vAlgane>.nota,#algane_btn,#pane-gane>.controls{display:none!important}',
 '.gnPanel{margin:12px 0 0;color:var(--txt,#fff);padding-bottom:18px;font-family:system-ui,-apple-system,sans-serif}',
 '.gnTit{margin:0 2px 10px;font-size:13px;line-height:1.4;color:var(--mut,#9aa)}',
 '.gnMarc{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}.gnMarc div{background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);border-radius:12px;padding:10px 12px;font-size:11.5px;color:var(--mut,#9aa);min-width:0}',
 '.gnMarc b{display:block;color:var(--txt,#fff);font-size:18px;margin:3px 0 1px}',
 '.gnDia{margin:16px 0 6px;font-size:13px;font-weight:800;color:var(--mut,#9aa);display:flex;justify-content:space-between;gap:10px}.gnDia span{font-weight:600}',
 '.gnFila{margin:8px 0;padding:12px;border-radius:14px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340)}',
 '.gnFila.gnEstrella{border-color:var(--hot,#fbbf24)}',
 '.gnTop{display:flex;align-items:center;gap:10px}.gnPct{flex:0 0 auto;font-size:25px;font-weight:800;line-height:1}.gnPct.alto{color:var(--good,#34d399)}.gnPct.medio{color:var(--hot,#fbbf24)}.gnPct.bajo{color:var(--mut,#9aa)}',
 '.gnEq{flex:1;min-width:0}.gnEq b{display:block;font-size:15.5px;line-height:1.2}.gnEq span{display:block;font-size:12px;color:var(--mut,#9aa);margin-top:2px}',
 '.gnDet{margin-top:8px;font-size:12.5px;line-height:1.45;color:var(--mut,#9aa)}.gnDet b{color:var(--txt,#fff);font-weight:700}',
 '.gnAl{margin-top:8px;padding:8px 10px;border-radius:10px;font-size:12.5px;line-height:1.4;background:rgba(251,191,36,.12);color:var(--txt,#fff)}',
 '.gnNota{margin:14px 0;font-size:12.5px;line-height:1.5;color:var(--mut,#9aa)}.gnNota b{color:var(--txt,#fff)}',
 '.gnProps{margin:14px 0;border:1px solid var(--line2,#2a3340);border-radius:14px;background:var(--bg1,#0d1420);padding:10px 12px}.gnProps summary{font-weight:700;font-size:14.5px;cursor:pointer}.gnPr{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line2,#2a3340);font-size:13px}.gnPr b{white-space:nowrap}',
 '.gnMini{display:inline-block;border-radius:99px;background:var(--bg2,#131c2a);color:var(--txt,#fff);padding:8px 13px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--line2,#2a3340)}'].join('');
var cuerpo,APP;
function fila(x,i){
 var f=mk('div','gnFila'+(x.top?' gnEstrella':'')), t=mk('div','gnTop'), pc=mk('div','gnPct '+x.tramo,Math.round(x.p*100)+'%'), e=mk('div','gnEq');
 e.appendChild(mk('b','',(x.top?'⭐ ':'')+x.fav));
 e.appendChild(mk('span','',(x.local?'vs ':'@ ')+x.rival+' · '+hora(x.ts)+(x.empate!=null?' · empate '+Math.round(x.empate*100)+'%':'')));
 t.appendChild(pc); t.appendChild(e); f.appendChild(t);
 var d=mk('div','gnDet');
 if(x.hist){ d.appendChild(doc.createTextNode('Este tramo ganó ')); d.appendChild(mk('b','',x.hist.w.toLocaleString('en-US')+' de '+x.hist.n.toLocaleString('en-US'))); d.appendChild(doc.createTextNode(' ('+Math.round(x.hist.pct*100)+'%). ')); }
 d.appendChild(doc.createTextNode('Una derrota borra ')); d.appendChild(mk('b','',x.borra.toFixed(1)+' victorias')); d.appendChild(doc.createTextNode('. Precio justo: ')); d.appendChild(mk('b','',x.justa+' · '+x.centavos+'¢')); d.appendChild(doc.createTextNode(', sin comisión.'));
 f.appendChild(d);
 if(x.alerta) f.appendChild(mk('div','gnAl','⚠️ Tu modelo le da '+Math.round(x.modelo*100)+'%, '+Math.abs(x.dif).toFixed(0)+' puntos '+(x.dif<0?'menos':'más')+'. Revisa bajas y alineaciones antes de jugar.'));
 if(!x.conMercado) f.appendChild(mk('div','gnAl','Sin precio del mercado todavía: este % es solo de tu modelo.'));
 return f;
}
function pintar(){
 var ahora=Date.now(), items=json(KEY), mes=diaDe(ahora).slice(0,7), filas=lista(items,APP,ahora,root.OVAAciertos);
 while(cuerpo.firstChild) cuerpo.removeChild(cuerpo.firstChild);
 var mio=marcadorMio(json(REG[APP]),APP,mes), li=marcadorLista(items,APP,mes), mc=mk('div','gnMarc');
 var a=mk('div','','Tus picks este mes'); a.appendChild(mk('b','',mio.g+'–'+mio.p)); a.appendChild(doc.createTextNode((mio.g+mio.p)?sg(mio.u)+(mio.sinCuota?' · '+mio.sinCuota+' sin cuota':''):'Sin picks resueltos'));
 var b=mk('div','','El ⭐ de cada día este mes'); b.appendChild(mk('b','',li.g+'–'+li.p)); b.appendChild(doc.createTextNode((li.g+li.p)?sg(li.u)+' con margen de casa':'Sin juegos resueltos'));
 mc.appendChild(a); mc.appendChild(b); cuerpo.appendChild(mc);
 if(!filas.length) cuerpo.appendChild(mk('div','gnNota','No hay juegos por empezar guardados. Abre Juegos para que se guarden y vuelve aquí.'+(APP==='fut'?' En fútbol solo salen las ligas que hayas abierto.':'')));
 var dias={}; filas.forEach(function(x){ (dias[x.dia]=dias[x.dia]||[]).push(x); });
 Object.keys(dias).sort().forEach(function(d){
  var v=dias[d], con=v.filter(function(x){ return x.conMercado; }), cab=mk('div','gnDia',etiquetaDia(d,ahora));
  if(con.length) cab.appendChild(mk('span','','se esperan '+esperados(con).toFixed(1)+' ganadores de '+con.length));
  cuerpo.appendChild(cab); v.forEach(function(x,i){ cuerpo.appendChild(fila(x,i)); });
 });
 var n=mk('div','gnNota'); n.appendChild(mk('b','','Cómo se lee. ')); n.appendChild(doc.createTextNode('El orden sale del % del mercado, que es lo que mejor separa ganadores. Que tu modelo esté de acuerdo casi no sube los aciertos. Acertar mucho no es lo mismo que ganar dinero: a cuota de cierre, los favoritos de 60% o más rindieron entre −2.8% y −4.4% en MLB, NBA, NHL y NFL, y +0.5% (±2.4) en fútbol con cuota de Pinnacle. Mira tu marcador del mes, no solo los aciertos.'));
 cuerpo.appendChild(n);
 var pr=PROPS[APP]; if(pr){
  var dp=mk('details','gnProps'); dp.appendChild(mk('summary','','🎯 Props de juego: cuántas veces pasan'));
  dp.appendChild(mk('div','gnTit','Cuota justa = lo mínimo que te tienen que pagar. Si tu casa paga menos, pagas de más. Ninguna le ganó a la línea en las pruebas. Props de jugador (478 mil líneas de apertura): el lado más probable pasa casi lo que dice su precio y rinde entre −4% y −8%; el Más pierde más que el Menos.'));
  pr.slice().sort(function(a,b){ return b[1]-a[1]; }).forEach(function(x){ var f=mk('div','gnPr'); f.appendChild(mk('span','',x[0])); f.appendChild(mk('b','',Math.round(x[1]*1000)/10+'% · '+americana(x[1]))); dp.appendChild(f); });
  cuerpo.appendChild(dp);
 }
 cuerpo.appendChild(boton('gnMini','↻ Actualizar',alEntrar));
}
function contenedor(){ return doc.getElementById('vistaAlgane')||doc.getElementById('vAlgane')||doc.getElementById('pane-gane'); }
function visible(){ return !!(panel&&panel.offsetParent!==null); }
/* MLB calcula cada juego al pedirlo: sin esto no hay nada guardado en Auto. Una sola vez por fecha y cantidad de juegos. */
var hechoMlb='';
function calcularMlb(){
 if(APP!=='mlb') return;
 var gs=doc.querySelectorAll('.game'), b=doc.getElementById('algane_btn'); if(!gs.length||!b||b.disabled) return;
 var f=doc.getElementById('fecha'), k=(f&&f.value||'')+'|'+gs.length; if(k===hechoMlb) return;
 var faltan=[].some.call(gs,function(g){ return !g._calc; }); hechoMlb=k; if(!faltan) return;
 b.click(); estado.textContent='Calculando los juegos de MLB… esto tarda un minuto.';
 var n=0, t=root.setInterval(function(){ n++; if(!b.disabled||n>120){ root.clearInterval(t); estado.textContent=''; pintar(); root.setTimeout(pintar,2500); } },1000);
}
function alEntrar(){ calcularMlb(); pintar(); root.setTimeout(function(){ if(visible()) pintar(); },1800); root.setTimeout(function(){ if(visible()) pintar(); },6000); }
var panel, estado;
function armar(){
 if(doc.querySelector('.gnPanel')) return true;
 var c=contenedor(); if(!c) return false;
 APP=appActual();
 var st=mk('style'); st.textContent=CSS; (doc.head||doc.documentElement).appendChild(st);
 panel=mk('div','gnPanel'); panel.setAttribute('aria-label','Picks al gane');
 panel.appendChild(mk('div','gnTit','Los juegos más probables, de mayor a menor.'));
 estado=mk('div','gnTit'); panel.appendChild(estado);
 cuerpo=mk('div'); panel.appendChild(cuerpo); c.insertBefore(panel,c.firstChild);
 doc.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-v="vAlgane"],[data-vista="algane"],.navbar [data-p="gane"]'); if(b) root.setTimeout(alEntrar,0); });
 root.addEventListener('ova-auto-cambio',function(){ if(visible()) pintar(); });
 pintar(); return true;
}
function arrancar(){ var n=0; (function intento(){ try{ if(armar()) return; }catch(e){ if(root.console) root.console.error('ganadores',e); return; } if(++n<40) root.setTimeout(intento,500); })(); }
if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',arrancar); else arrancar();
})(typeof window!=='undefined'?window:globalThis);
