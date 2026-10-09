/* OVA · diseño común (MLB v52 / fútbol v13 / NBA v3.5).
   Un solo script que iguala la navegación de las tres apps y limpia lo técnico:
     · Barra de abajo igual en las tres:  Juegos · Al gane · Combo · Mis picks · Ajustes
     · Lo técnico (Backtest, Ratings, Diagnóstico, herramientas pesadas) vive en Ajustes → Avanzado
     · El respaldo de picks vive en Ajustes
     · La versión se ve siempre en Ajustes (en el tema Cristal la etiqueta del título está oculta)
     · Letra mínima de 12 px
     · MLB abre ya con los juegos de hoy cargados, con la fila de fecha compacta y los juegos sin abridores al final («Por confirmar»)
     · Mismos iconos y mismo botón de Inicio en las tres apps; en MLB, Ajustes abre con lo que usas (banca, modo de pago) y la Apariencia va después
     · Barra de probabilidad en cada juego ya calculado (solo se ve en el diseño Pro)
   No cambia ningún cálculo. Todo va en try/catch: si falta una pieza, la app se queda como estaba.
   Los botones originales NO se borran: se ocultan y se activan por código, así que sus eventos siguen funcionando. */
(function(root){
'use strict';
var d=root.document;
if(!d || root.__ovaDiseno) return;
root.__ovaDiseno=1;

function $(s,r){ return (r||d).querySelector(s); }
function $$(s,r){ return Array.prototype.slice.call((r||d).querySelectorAll(s)); }
function el(tag,cls,html){ var e=d.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

var CSS=[
 /* letra mínima 12 px y un gris más legible para las notas */
 '.nota,.kpi small,.kpi span,.marcadores small,.h2h div small,.cuotasbox label,.ajuste label,.fila-rank .nom small,.tabla-bt th,',
 '.cabp .nm span,td small,.tarj span,.fila .pct em,.ovaSk .tx span,.ovaCombo .cmpg span,.hero .mid small,.ovaMini small,.ovaHero .cx small{font-size:12px!important}',
 '.nota{color:var(--mut)!important}',
 '.ver,.medido,.row.hcrow .cab,.bug .ft{font-size:11px!important}',
 '#diagOut,textarea.resp{font-size:12px!important}',
 /* etiquetas de la barra de abajo */
 '.tabbar .lb,.navbar button span{font-size:11px!important}',
 /* botones del encabezado */
 '#btnDiag.dsDiag{margin:0!important;padding:6px 10px!important;font-size:15px!important;line-height:1;opacity:.85;flex:0 0 auto}',
 '.estado.warn,.estado.bad{cursor:pointer}',
  /* fila de fecha compacta (MLB): el botón ya no es el protagonista porque carga solo */
 '.cargafila{margin:10px 0 2px!important}',
 '.cargafila input[type=date]{padding:8px 10px!important;font-size:14px!important;min-height:0!important}',
 '.cargafila #cargar{padding:8px 12px!important;font-size:13px!important;font-weight:700!important;min-height:0!important;box-shadow:none!important;background:var(--bg2)!important;color:var(--txt)!important;border:1px solid var(--line2)!important;text-transform:none!important;letter-spacing:0!important;transform:none!important;border-radius:var(--r,10px)!important}',
 /* mismos iconos de la barra en Clásico (en los otros diseños ya los pone interior.js) */
 '.navbar svg.ic2,.tabbar svg.ic2{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
 /* botón de Inicio igual en las tres apps: círculo con ‹ a la izquierda (Cristal y Broadcast traen el suyo) */
 'html:not([data-ui="cristal"]):not([data-ui="broadcast"]) .topbar .ovaHome{order:-1;width:34px;height:34px;padding:0 0 3px;font-size:0!important;min-height:0;line-height:1}',
 'html:not([data-ui="cristal"]):not([data-ui="broadcast"]) .topbar .ovaHome::before{content:"‹";font-size:24px;line-height:1;color:inherit}',
 /* juegos sin abridores confirmados: una línea corta y apagada, al final de la lista */
 '.game.dsPC .head{padding-top:9px!important;padding-bottom:9px!important}',
 '.game.dsPC{opacity:.78}',
 '.dsSepConf{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:16px 4px 4px}',
 /* barra de probabilidad en la lista (solo diseño Pro) */
 '.dsProb{display:none}',
 /* pantalla de Ajustes (fútbol y NBA) */
 '.dsCard{background:var(--bg1);border:1px solid var(--line2);border-radius:var(--r2,16px);padding:14px 14px 12px;margin:14px 0}',
 '.dsCard b{display:block;font-size:16px;color:var(--txt)}',
 '.dsCard span{display:block;font-size:12px;color:var(--mut);margin-top:3px;line-height:1.45}',
 '.dsAv{background:var(--bg1);border:1px solid var(--line2);border-radius:var(--r2,16px);margin:14px 0;overflow:hidden}',
 '.dsAv>summary{list-style:none;cursor:pointer;padding:13px 14px;font-weight:700;font-size:14px;color:var(--txt);display:flex;align-items:center;justify-content:space-between}',
 '.dsAv>summary::-webkit-details-marker{display:none}',
 '.dsAv>summary::after{content:"›";font-size:20px;color:var(--mut);transition:transform .2s}',
 '.dsAv[open]>summary::after{transform:rotate(90deg)}',
 '.dsAv .dsLista{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px}',
 '.dsAv .dsAviso{font-size:12px;color:var(--mut);line-height:1.45;margin:0 2px 2px}',
 '.dsItem{width:100%;text-align:left;background:var(--bg2);color:var(--txt);border:1px solid var(--line2);border-radius:var(--r,10px);padding:12px 12px;font-size:13.5px;line-height:1.35;cursor:pointer;font-family:inherit}',
 '.dsItem small{display:block;font-size:12px;color:var(--mut);margin-top:2px;font-weight:400}',
 '.dsItem.dsDiagItem{display:block}',
 '.dsBack{display:inline-block;background:transparent;border:0;color:var(--hot);font-size:14px;font-weight:700;padding:12px 2px 2px;cursor:pointer;font-family:inherit}',
 '.dsPesado{border:1px dashed var(--line2);border-radius:var(--r,10px);margin:12px 0;padding:0 10px}',
 '.dsPesado>summary{cursor:pointer;padding:10px 2px;font-size:13px;color:var(--mut);font-weight:700}',
 '.dsPesado .btnAncho{margin-bottom:8px}',
 /* selector Mismo partido / Varios partidos */
 '.dsSeg{display:flex;gap:6px;margin:14px 0 6px;background:var(--bg1);border:1px solid var(--line2);border-radius:99px;padding:4px}',
 '.dsSeg button{flex:1;border:0;background:transparent;color:var(--mut);font-weight:700;font-size:13px;padding:8px 6px;border-radius:99px;cursor:pointer;font-family:inherit}',
 '.dsSeg button.on{background:var(--acc);color:var(--accTx,#fff)}',
 /* tarjeta de versión en Ajustes de MLB */
 '#pane-ajustes .dsCard{margin-top:6px}'
].join('\n');

function css(){
 if($('#dsCss')) return;
 var s=el('style'); s.id='dsCss'; s.textContent=CSS;
 (d.head||d.documentElement).appendChild(s);
}

function versionApp(){
 var v='';
 try{ if(typeof VERSION!=='undefined') v=String(VERSION); }catch(e){}
 if(!v){ var e=$('.ver'); if(e) v=(e.textContent||'').trim(); }
 return v;
}
function nombreApp(a){ return a==='mlb'?'OVA MLB':(a==='fut'?'OVA Fútbol':'OVA NBA'); }
function fuentesApp(a){
 return a==='mlb'?'Datos: MLB StatsAPI y Open-Meteo. Modelo propio de OVA (diferencial de abridores, bullpen y ofensiva).'
  :a==='fut'?'Datos: ESPN y worldfootball.net. Modelo Poisson con corrección Dixon-Coles.'
  :'Datos: ESPN (3 temporadas). Modelo de rating de margen con aproximación normal.';
}
function tarjetaVersion(a){
 var c=el('div','dsCard','<b></b><span></span>');
 c.setAttribute('data-ds','version');
 c.querySelector('span').textContent=fuentesApp(a);
 function pon(){ c.querySelector('b').textContent=nombreApp(a)+' '+versionApp(); }
 pon(); c._pon=pon;
 return c;
}

/* ---------- fútbol y NBA ---------- */
function mostrar(vista,boton){
 $$('.tabbar .tbar-btn').forEach(function(b){ b.classList.toggle('on',b===boton); });
 $$('main > .vista').forEach(function(v){ v.classList.toggle('on',v===vista); });
 root.scrollTo(0,0);
}
function moverRango(ini,fin,dest){
 if(!ini||!fin||!dest) return;
 var n=ini, lista=[];
 while(n){ lista.push(n); if(n===fin) break; n=n.nextElementSibling; }
 if(lista[lista.length-1]!==fin) return;
 lista.forEach(function(x){ dest.appendChild(x); });
}
function ponerLabel(btn,txt,ic){
 if(!btn) return;
 var l=btn.querySelector('.lb'); if(l) l.textContent=txt;
 if(ic){ var i=btn.querySelector('.ic'); if(i) i.textContent=ic; }
}

function pesadas(botones,titulo){
 /* envuelve los botones pesados en un desplegable cerrado */
 var b0=botones[0]; if(!b0||!b0.parentNode) return;
 var det=el('details','dsPesado','<summary></summary>');
 det.querySelector('summary').textContent=titulo;
 b0.parentNode.insertBefore(det,b0);
 botones.forEach(function(b){ if(b) det.appendChild(b); });
}

function armarAjustes(a,cfg){
 /* cfg: {prefijo, claveBtn(b), vistaDeBoton(b), tabBtn(clave), ocultos:[{clave,titulo,detalle,vista}], respaldo:{ini,fin}, diagBtn, diagOut} */
 var main=$('main'), barra=$('.tabbar');
 if(!main||!barra||$('#dsAjustes')) return null;
 var v=el('div','vista'); v.id='dsAjustes';
 var tarj=tarjetaVersion(a); v.appendChild(tarj);
 var rb=cfg.respaldoRango();
 if(rb) moverRango(rb[0],rb[1],v);
 var det=el('details','dsAv','<summary>Avanzado</summary>');
 var lista=el('div','dsLista');
 lista.appendChild(el('p','dsAviso','Herramientas para medir el modelo y revisar los datos. No hacen falta para el día a día.'));
 det.appendChild(lista); v.appendChild(det);
 main.appendChild(v);
 var btn=el('button','tbar-btn','<span class="ic">⚙️</span><span class="lb">Ajustes</span>');
 btn.setAttribute(cfg.attr,'dsAjustes');
 btn.type='button';
 barra.appendChild(btn);
 btn.addEventListener('click',function(){ tarj._pon(); mostrar(v,btn); });
 cfg.ocultos.forEach(function(o){
  var ob=cfg.tabBtn(o.clave), ov=$(o.vista);
  if(!ob||!ov) return;
  ob.style.display='none';
  var it=el('button','dsItem','<span></span><small></small>'); it.type='button';
  it.querySelector('span').textContent=o.titulo; it.querySelector('small').textContent=o.detalle;
  it.addEventListener('click',function(){ ob.click(); btn.classList.add('on'); ob.classList.remove('on'); root.scrollTo(0,0); });
  lista.appendChild(it);
  var back=el('button','dsBack','‹ Ajustes'); back.type='button';
  back.addEventListener('click',function(){ btn.click(); });
  ov.insertBefore(back,ov.firstChild);
 });
 /* diagnóstico: el botón vive en el encabezado como 🔍; aquí hay un acceso de texto */
 var dg=$('#btnDiag');
 if(dg){
  var di=el('button','dsItem dsDiagItem','<span>🔍 Diagnóstico</span><small>Por qué una liga sale vacía o qué fuente falló</small>'); di.type='button';
  di.addEventListener('click',function(){
   var out=$('#diagOut');
   if(out && out.style.display!=='block') dg.click();
   root.scrollTo(0,0);
  });
  lista.appendChild(di);
 }
 return {vista:v,boton:btn};
}

function diagEnEncabezado(){
 var dg=$('#btnDiag'), top=$('header .top');
 if(!dg||!top||dg.classList.contains('dsDiag')) return;
 dg.classList.add('dsDiag'); dg.textContent='🔍'; dg.setAttribute('aria-label','Diagnóstico'); dg.removeAttribute('style');
 dg.style.cssText='';
 var tema=$('#btnTema');
 if(tema && tema.parentNode===top) top.insertBefore(dg,tema); else top.appendChild(dg);
 var est=$('#estado');
 if(est && !est.__dsTap){
  est.__dsTap=1;
  est.addEventListener('click',function(){
   if(!/\b(warn|bad)\b/.test(est.className)) return;
   var out=$('#diagOut');
   if(out && out.style.display!=='block') dg.click();
  });
 }
}

function ordenar(barra,orden,clave){
 var mapa={};
 $$('.tbar-btn',barra).forEach(function(b){ mapa[clave(b)]=b; });
 orden.forEach(function(k){ if(mapa[k]) barra.appendChild(mapa[k]); });
}

function unificarNBA(){
 var barra=$('.tabbar'); if(!barra||!$('[data-v="vComb"]',barra)||$('#dsAjustes')) return true;
 var porV=function(k){ return $('[data-v="'+k+'"]',barra); };
 diagEnEncabezado();
 ponerLabel(porV('vReg'),'Mis picks');
 ponerLabel(porV('vComb'),'Combo','🧩');
 var aj=armarAjustes('nba',{
  attr:'data-v',
  tabBtn:porV,
  respaldoRango:function(){
   var h=$$('#vReg h3').filter(function(x){ return /respaldo/i.test(x.textContent); })[0];
   return h && $('#respMsg')?[h,$('#respMsg')]:null;
  },
  ocultos:[
   {clave:'vRank',vista:'#vRank',titulo:'📊 Ratings de equipos',detalle:'Cuántos puntos vale cada equipo; es lo que usa el modelo.'},
   {clave:'vBt',vista:'#vBt',titulo:'📈 Backtest del modelo',detalle:'Mide qué tan bien habría acertado en temporadas pasadas.'}
  ]
 });
 if(!aj) return false;
 var bt=$('#btnCal'); if(bt) pesadas([bt],'Herramientas pesadas');
 ordenar(barra,['vJuegos','vAlgane','vComb','vReg','dsAjustes'],function(b){ return b.getAttribute('data-v'); });
 return true;
}

function fusionarComboFut(barra){
 var cBtn=$('[data-vista="combo"]',barra), pBtn=$('[data-vista="combinada"]',barra), vC=$('#vistaCombo'), vP=$('#vistaCombinada');
 if(!cBtn||!pBtn||!vC||!vP) return false;
 if($('.dsSeg',vC)) return true;
 function seg(activo){
  var s=el('div','dsSeg','<button type="button" data-t="uno">Mismo partido</button><button type="button" data-t="varios">Varios partidos</button>');
  $$('button',s).forEach(function(b){
   b.classList.toggle('on',b.getAttribute('data-t')===activo);
   b.addEventListener('click',function(){
    if(b.getAttribute('data-t')===activo) return;
    (b.getAttribute('data-t')==='uno'?cBtn:pBtn).click();
    cBtn.classList.add('on'); pBtn.classList.remove('on');
    root.scrollTo(0,0);
   });
  });
  return s;
 }
 vC.insertBefore(seg('uno'),vC.firstChild);
 vP.insertBefore(seg('varios'),vP.firstChild);
 pBtn.style.display='none';
 return true;
}

function unificarFut(sinCombo){
 var barra=$('.tabbar'); if(!barra||$('#dsAjustes')) return true;
 if(!fusionarComboFut(barra) && !sinCombo) return false;       /* el Combo se inyecta un poco más tarde */
 var porK=function(k){ return $('[data-vista="'+k+'"]',barra); };
 diagEnEncabezado();
 ponerLabel(porK('registro'),'Mis picks');
 ponerLabel(porK('combo'),'Combo','🧩');
 var aj=armarAjustes('fut',{
  attr:'data-vista',
  tabBtn:porK,
  respaldoRango:function(){
   var h=$$('#vistaRegistro h3').filter(function(x){ return /respaldo/i.test(x.textContent); })[0];
   return h && $('#respaldoMsg')?[h,$('#respaldoMsg')]:null;
  },
  ocultos:[
   {clave:'backtest',vista:'#vistaBacktest',titulo:'📈 Backtest del modelo',detalle:'Mide qué tan bien habría acertado en partidos ya jugados.'}
  ]
 });
 if(!aj) return false;
 var t=$('#btnTiros'), c=$('#btnCalibrar'); if(t&&c) pesadas([t,c],'Herramientas pesadas (descargas y calibración)');
 ordenar(barra,['juegos','algane','combo','registro','dsAjustes'],function(b){ return b.getAttribute('data-vista'); });
 return true;
}

/* ---------- MLB ---------- */
function unificarMLB(){
 var pa=$('#pane-ajustes'); if(!pa) return false;
 if(!$('[data-ds="version"]',pa)){
  var t=tarjetaVersion('mlb');
  pa.insertBefore(t,pa.firstChild);
  var nav=$('.navbar');
  if(nav) nav.addEventListener('click',function(){ setTimeout(t._pon,0); });
  setTimeout(t._pon,1200); setTimeout(t._pon,3500);
 }
 ajustesMLB();
 vigilarJuegos();
 return true;
}
function autoMLB(){
 var b=$('#cargar'), s=$('#slate'), f=$('#fecha');
 if(!b||!s||!f||!f.value||s.children.length||autoMLB.hecho) return;
 autoMLB.hecho=1;
 b.click();
}

/* ---------- todas las apps: botón de Inicio y iconos iguales ---------- */
function iconosIguales(){
 var I=root.OVAInterior; if(!I||!I._icons||!I._clave) return;
 $$('.navbar button, .tabbar .tbar-btn').forEach(function(b){
  if($('svg.ic2',b)) return;
  var lab=$('.lb',b)||$('span:not(.ic)',b), k=I._clave(lab?lab.textContent:''), host=$('svg',b)||$('.ic',b);
  if(!k||!host||!I._icons[k]) return;
  var svg=d.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('class','ic2'); svg.innerHTML=I._icons[k];
  host.parentNode.replaceChild(svg,host);
 });
}

/* ---------- MLB: juegos sin abridores al final, y barra de probabilidad ---------- */
function sinAbridores(g){
 var m=$('.match small',g); var t=(m?m.textContent:'').toLowerCase();
 return t.indexOf('por confirmar')>=0;
}
function ordenarJuegos(){
 var s=$('#slate'); if(!s) return;
 var jg=$$('.game',s); if(!jg.length) return;
 var ok=jg.filter(function(g){ return !sinAbridores(g); }), pc=jg.filter(sinAbridores);
 jg.forEach(function(g){ g.classList.toggle('dsPC',pc.indexOf(g)>=0); });
 var sep=$('.dsSepConf',s);
 if(!pc.length||!ok.length){ if(sep) sep.style.display='none'; }
 var orden=ok.concat(pc), igual=true;
 for(var i=0;i<jg.length;i++){ if(jg[i]!==orden[i]){ igual=false; break; } }
 if(!igual){ orden.forEach(function(g){ s.appendChild(g); }); }
 if(pc.length&&ok.length){
  if(!sep){ sep=el('div','dsSepConf'); }
  sep.style.display=''; sep.textContent='Por confirmar ('+pc.length+') · sin abridores todavía';
  if(sep.nextElementSibling!==pc[0]||sep.parentNode!==s) s.insertBefore(sep,pc[0]);
 }
}
function barrasProb(){
 $$('#slate .game').forEach(function(g){
  var c=g._calc; if(!c||c.pA==null||c.pH==null) return;
  var head=$('.head',g); if(!head) return;
  var b=$('.dsProb',g);
  if(b && b.__c===c) return;
  if(!b){ b=el('div','dsProb'); head.appendChild(b); }
  b.__c=c;
  var a=(g._eq&&g._eq.a&&g._eq.a.ab)||'A', h=(g._eq&&g._eq.h&&g._eq.h.ab)||'H';
  var pa=+c.pA, ph=+c.pH;
  b.innerHTML='<span class="bb"><i class="ba" style="flex:'+pa.toFixed(2)+'"></i><i class="bh" style="flex:'+ph.toFixed(2)+'"></i></span>'+
   '<span class="bl"><b></b><b></b></span>';
  var ls=b.querySelectorAll('.bl b');
  ls[0].textContent=a+' '+pa.toFixed(0)+'%'; ls[1].textContent=ph.toFixed(0)+'% '+h;
  b.classList.toggle('fa',pa>ph); b.classList.toggle('fh',ph>=pa);
 });
}
function vigilarJuegos(){
 var s=$('#slate'); if(!s||s.__dsObs||!root.MutationObserver) return;
 s.__dsObs=1;
 var pend=false;
 new root.MutationObserver(function(){
  if(pend) return; pend=true;
  setTimeout(function(){ pend=false; try{ ordenarJuegos(); barrasProb(); }catch(e){} },120);
 }).observe(s,{childList:true,subtree:true});
 ordenarJuegos(); barrasProb();
}
function ajustesMLB(){
 /* lo que usas (banca, modo de pago, multiplicador) primero; la Apariencia, que tocas una vez, después */
 var pa=$('#pane-ajustes'); if(!pa) return;
 var ap=$('.ovaApar',pa), aj=$('details.ajustes',pa);
 if(ap&&aj&&aj.parentNode===pa&&!ap.__dsMov){
  ap.__dsMov=1;
  var ref=aj.nextSibling;
  pa.insertBefore(ap,ref);
 }
}

/* ---------- arranque ---------- */
function que(){
 if($('#cargar') && ($('.navbar')||$('#pane-ajustes'))) return 'mlb';
 if($('.tabbar [data-vista]')) return 'fut';
 if($('.tabbar [data-v]')) return 'nba';
 return '';
}
function arrancar(){
 css();
 var a=que(), intentos=0;
 function paso(){
  var ok=true;
  try{
   if(a==='nba') ok=unificarNBA();
   else if(a==='fut') ok=unificarFut(intentos>=30);
   else if(a==='mlb') ok=unificarMLB();
  }catch(e){ ok=true; if(root.console) console.error('ova diseño',e); }
  if(!ok && ++intentos<40) setTimeout(paso,150);
 }
 paso();
 [0,300,900,2000,4500].forEach(function(ms){ setTimeout(function(){ try{ iconosIguales(); if(a==='mlb'){ ajustesMLB(); vigilarJuegos(); } }catch(e){} },ms); });
 if(a==='mlb') setTimeout(function(){ try{ autoMLB(); }catch(e){} },350);
}
if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',function(){ setTimeout(arrancar,0); });
else setTimeout(arrancar,0);
})(typeof window!=='undefined'?window:this);
