/* OVA · Mesa (asistente) — MLB, fútbol y NBA.
   Un botón flotante que abre «Mesa de hoy». Hace cuatro cosas, en este orden de confianza:
   1) LEE todos los juegos de la pantalla, pestaña por pestaña (Veredicto, Cuotas, Números, Forma, Parque…),
      sin que tengas que abrirlos uno por uno.
   2) ORDENA los juegos con reglas fijas y sin internet (probabilidad del modelo + qué tan buenos son los datos).
      Esto funciona aunque no haya Worker ni red.
   3) CUOTA → VALOR: escribes la cuota que te pagan y calcula, con la probabilidad del modelo, si paga más que la justa.
   4) IA con internet (opcional): le manda TODO lo que leyó (≤ 12,000 caracteres, el tope del Worker) y le pide lineups,
      lesiones, noticias y una señal por juego. Usa el mismo Worker de la 🦈 IA: no hay nada que re-publicar en Cloudflare.
   No cambia ningún cálculo de la app ni escribe en tus registros: solo lee. No promete ganadores. */
(function(root){
"use strict";
var doc=root.document;
var MAX_PROMPT=11500;      /* el Worker rechaza más de 12,000: aquí se deja margen */
var WORKER_DEF='https://ova-ia.osvaldoalvarez0113.workers.dev';

/* ---------- funciones puras (se prueban en node) ---------- */
function compactar(t){ return String(t==null?'':t).replace(/[​-‏﻿]/g,'').replace(/\s+/g,' ').trim(); }
function recortar(t,n){
 t=compactar(t); if(t.length<=n) return t;
 if(n<=1) return '';
 var c=t.slice(0,n-1), i=c.lastIndexOf(' ');
 if(i>n*0.6) c=c.slice(0,i);
 return c+'…';
}
/* cuota → decimal. Acepta -140, +120, 1.85 y 55¢ (precio tipo Kalshi). */
function aDecimal(s){
 s=compactar(s).replace(/−/g,'-').replace(',','.'); if(!s) return null;
 var c=s.match(/^(\d{1,2}(?:\.\d+)?)\s*[¢c]$/i);
 if(c){ var v=+c[1]; return (v>0&&v<100)?100/v:null; }
 if(/^[+-]?\d{3,4}$/.test(s)||/^[+-]\d{2,4}$/.test(s)){
  var a=+s; if(a>=100) return 1+a/100; if(a<=-100) return 1+100/(-a); return null;
 }
 if(/^\d+(\.\d+)?$/.test(s)){ var d=+s; return (d>1.01&&d<30)?d:null; }
 return null;
}
function americana(p){      /* probabilidad (0-1) → cuota justa en formato americano */
 if(!(p>0&&p<1)) return '';
 var a=p>=0.5?-(p/(1-p))*100:((1-p)/p)*100;
 a=Math.round(a); return (a>0?'+':'')+a;
}
function valorDe(pPct,cuota){   /* ev = p·decimal − 1 */
 var d=aDecimal(cuota); if(d==null||!(pPct>0)) return null;
 var ev=pPct/100*d-1;
 /* un +EV chico casi siempre es ruido del modelo: se pide margen para decir «valor» */
 var k=ev>=0.05?'valor':(ev>=0?'justo':'sin');
 return {ev:ev,k:k,dec:d};
}
function etiqueta(p,nivel,app,vivo){
 if(vivo) return {k:'vivo',t:'En vivo'};
 if(p==null) return {k:'sin',t:'Sin números'};
 var fuerte=app==='fut'?52:62, ligero=app==='fut'?45:55;
 var k=p>=fuerte?'cand':(p>=ligero?'cuid':'evit');
 if(nivel==='baja') k=(k==='cand')?'cuid':'evit';     /* datos flojos: baja un nivel */
 return {k:k,t:k==='cand'?'Candidato':(k==='cuid'?'Cuidado':'Parejo · evitar'),flojo:nivel==='baja'};
}
var ORDEN_TAB={ver:0,v:0,cuo:1,c:1,num:2,n:2,for:3,f:3,x:4};
var PESO_TAB=[0.30,0.25,0.25,0.12,0.08];
function bloqueJuego(i,j,B){
 var o=[], t=j.titulo+(j.hora?' | '+j.hora:'')+(j.dia?' | '+j.dia:'');
 o.push('### '+i+'. '+t);
 var m=[];
 if(j.pa!=null) m.push('Modelo: '+j.na+' '+(+j.pa).toFixed(1)+'% / '+j.nh+' '+(+j.ph).toFixed(1)+'%');
 if(j.emp) m.push('empate '+j.emp);
 if(j.tot) m.push('total '+j.tot);
 if(j.cu) m.push('cuota justa del favorito '+j.cu);
 if(j.sello) m.push('sello de la app: '+j.sello);
 if(j.conf) m.push('datos '+j.conf);
 if(m.length) o.push(m.join(' · '));
 if(j.cuotaMia&&j.fav){
  var v=valorDe(j.pf,j.cuotaMia);
  o.push('Cuota que pago yo por '+j.fav+': '+j.cuotaMia+(v?' (con el modelo da EV '+(v.ev*100>=0?'+':'')+(v.ev*100).toFixed(1)+'%)':''));
 }
 var usado=o.join('\n').length, libre=Math.max(120,B-usado-20);
 var tabs=(j.tabs||[]).slice().sort(function(a,b){ return (ORDEN_TAB[a.id]==null?9:ORDEN_TAB[a.id])-(ORDEN_TAB[b.id]==null?9:ORDEN_TAB[b.id]); });
 tabs.forEach(function(tb,ix){
  var cap=Math.floor(libre*(PESO_TAB[ix]!=null?PESO_TAB[ix]:0.08));
  if(cap<60||!tb.txt) return;
  o.push('['+tb.nombre+'] '+recortar(tb.txt,cap));
 });
 return o.join('\n');
}
var DEPORTE={mlb:'MLB (beisbol)',fut:'futbol',nba:'NBA'};
var MODELO_NO_VE={mlb:'ERA, carreras por juego y ERA de bullpen; NO ve lineups ni noticias',
 fut:'goles a favor y en contra, local/visita y forma; NO ve alineaciones, lesiones ni noticias',
 nba:'ratings de equipo y back-to-back; NO ve lesiones ni descansos de estrellas'};
function construirPrompt(o){
 /* o: {app,fecha,juegos:[...],registro,pregunta,previa} → texto ≤ MAX_PROMPT */
 var dep=DEPORTE[o.app]||o.app;
 var head='Eres un analista de apuestas de '+dep+', directo y esceptico. Fecha: '+o.fecha+'. '+
  'Abajo va, juego por juego, TODO lo que muestra mi app leido de cada pestana (mi modelo usa '+(MODELO_NO_VE[o.app]||'estadisticas')+'). '+
  'Los porcentajes son de mi modelo, no del mercado. Una cuota solo tiene valor si paga MAS que la cuota justa.\n';
 var reglas='Reglas: no inventes nada; si no encuentras un dato escribe "no encontre". Pon fuente y hora aproximada de cada dato importante. '+
  'Usa SOLO informacion de esa fecha y de esa temporada; descarta articulos de otros anos aunque el enfrentamiento sea igual. '+
  'Ignora rumores sin fuente. Separa lo que ENCONTRASTE de lo que SUPONES. Nunca digas que algo es seguro. '+
  'Mi modelo pierde contra el mercado cuando se aleja mucho de el: si tu hallazgo y mi modelo chocan, dilo y pesa cuanto.\n';
 var tarea, reg=o.registro?('\nMi registro con esta app: '+o.registro+'\n'):'\n';
 if(o.pregunta){
  tarea='\nPREGUNTA MIA: '+recortar(o.pregunta,400)+'\n'+
   (o.previa?'\nTU RESPUESTA ANTERIOR (resumida):\n'+recortar(o.previa,2200)+'\n':'')+
   '\nResponde directo en espanol, maximo 200 palabras, buscando en internet lo que haga falta.\n'+reglas;
 }else{
  tarea='\nTAREA: busca en internet lineups o alineaciones confirmadas, lesiones y bajas de ultima hora, cambios de abridor o de titulares, '+
   'uso reciente del bullpen o descanso, que se juega cada equipo, y clima donde importe. Responde en espanol, maximo 60 palabras por juego, '+
   'con EXACTAMENTE este formato por juego:\n'+
   'JUEGO n: Equipo A vs Equipo B\nSENAL: JUEGA | CUIDADO | EVITAR\nPROBABLE: lo mas probable segun modelo + lo que encontraste (una linea)\n'+
   'VALOR: SI | NO | NO SE  (solo SI o NO si arriba te di la cuota que pago; sin cuota es NO SE)\nPOR QUE: maximo 2 lineas, con fuente\n'+
   'Al final: RESUMEN con JUEGA: (lista), EVITAR: (lista) y una linea de lo que no se puede saber. '+
   'JUEGA solo si el modelo da ventaja clara, nada de lo que encontraste la contradice y la informacion clave esta confirmada; en duda, CUIDADO.\n'+reglas;
 }
 var fijo=head.length+reg.length+tarea.length+60;
 var js=o.juegos||[], n=Math.max(1,js.length);
 var B=Math.max(300,Math.floor((MAX_PROMPT-fijo)/n)-8);
 var cuerpo=js.map(function(j,i){ return bloqueJuego(i+1,j,B); }).join('\n\n');
 var p=head+'\nDATOS DE LA APP:\n'+cuerpo+'\n'+reg+tarea;
 if(p.length>MAX_PROMPT){            /* último recurso: recorta los datos, nunca la tarea */
  var sobra=p.length-MAX_PROMPT;
  cuerpo=cuerpo.slice(0,Math.max(0,cuerpo.length-sobra-1))+'…';
  p=head+'\nDATOS DE LA APP:\n'+cuerpo+'\n'+reg+tarea;
 }
 return p;
}
function resumenRegistro(app,leer){
 try{
  var k={mlb:'ventaja_picks_v1',fut:'ova_futbol_registro_v1',nba:'ova_nba_registro_v1'}[app];
  var arr=JSON.parse(leer(k)||'null'); if(!Array.isArray(arr)) return '';
  var g=0,p=0;
  arr.forEach(function(x){
   if(!x) return;
   if(app==='mlb'){ if(x.res==='G') g++; else if(x.res==='P') p++; }
   else { if(x.estado==='ganado') g++; else if(x.estado==='perdido') p++; }
  });
  var t=g+p; if(!t) return '';
  return g+'-'+p+' ('+Math.round(g/t*100)+'% de '+t+' resueltos'+(t<30?', muestra chica: no concluye nada':'')+')';
 }catch(e){ return ''; }
}
var API={compactar:compactar,recortar:recortar,aDecimal:aDecimal,americana:americana,valorDe:valorDe,etiqueta:etiqueta,
 construirPrompt:construirPrompt,bloqueJuego:bloqueJuego,resumenRegistro:resumenRegistro,MAX_PROMPT:MAX_PROMPT};
root.OVAMesa=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(!doc) return;

/* ---------- pantalla ---------- */
function $(s,r){ return (r||doc).querySelector(s); }
function $$(s,r){ return [].slice.call((r||doc).querySelectorAll(s)); }
function mk(tag,cls,txt){ var e=doc.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function boton(cls,txt,fn){
 var b=mk('div',cls,txt); b.setAttribute('role','button'); b.tabIndex=0;
 b.addEventListener('click',function(e){ e.stopPropagation(); fn(e); });
 b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(e); } });
 return b;
}
function appActual(){
 var a=doc.documentElement.getAttribute('data-app')||'';
 if(a==='mlb'||a==='fut'||a==='nba') return a;
 var p=(root.location&&root.location.pathname)||'';
 return /futbol/.test(p)?'fut':(/nba/.test(p)?'nba':'mlb');
}
var APP=null;
function hoyISO(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function fechaApp(){ var f=$('#fecha'); return (f&&f.value)||hoyISO(); }
function ls(k,v){
 try{ if(v===undefined) return root.localStorage.getItem(k); root.localStorage.setItem(k,v); }catch(e){}
 return null;
}

var CSS=[
 '.msFab{position:fixed;right:12px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:center;gap:7px;padding:11px 15px;border-radius:99px;background:var(--bg2,#131c2a);color:var(--txt,#fff);border:1px solid var(--hot,#fbbf24);font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.45);cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:44px}',
 '.msFab b{color:var(--hot,#fbbf24);font-size:16px;line-height:1}',
 '.msSheet{display:none;position:fixed;inset:0;z-index:95;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg,#070b12);color:var(--txt,#fff);padding:0 14px calc(60px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,sans-serif}',
 '.msSheet.on{display:block;animation:msIn .22s cubic-bezier(.22,.7,.3,1)}',
 '@keyframes msIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}',
 '.msBar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -14px 8px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:var(--bg,#070b12);border-bottom:1px solid var(--line2,#2a3340)}',
 '.msBar h2{margin:0;flex:1;font-size:19px;font-weight:700}',
 '.msBar h2 small{display:block;font-size:11.5px;font-weight:500;color:var(--mut,#9aa);margin-top:2px}',
 '.msX,.msBtn,.msMini{display:inline-flex;align-items:center;justify-content:center;border-radius:99px;font:700 14px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:center}',
 '.msX{background:var(--bg2,#131c2a);color:var(--hot,#fbbf24);padding:9px 14px;min-height:40px}',
 '.msBtn{width:100%;box-sizing:border-box;background:var(--hot,#fbbf24);color:#101418;padding:14px;min-height:50px;margin:10px 0 6px;border-radius:14px}',
 '.msBtn.off{opacity:.5;pointer-events:none}',
 '.msBtn.sec{background:var(--bg2,#131c2a);color:var(--txt,#fff);border:1px solid var(--line2,#2a3340)}',
 '.msMini{background:var(--bg2,#131c2a);color:var(--txt,#fff);padding:8px 13px;min-height:36px;font-size:13px;border:1px solid var(--line2,#2a3340)}',
 '.msAviso{margin:10px 0;padding:11px 13px;border-radius:12px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);font-size:12.5px;line-height:1.45;color:var(--mut,#9aa)}',
 '.msAviso b{color:var(--txt,#fff)}',
 '.msEst{margin:8px 0;font-size:13px;color:var(--mut,#9aa)}',
 '.msRow{margin:8px 0;border-radius:14px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);overflow:hidden}',
 '.msTop{display:flex;align-items:center;gap:10px;padding:11px 12px;cursor:pointer}',
 '.msN{flex:0 0 22px;font-weight:800;color:var(--mut,#9aa);font-size:14px;text-align:center}',
 '.msTx{flex:1;min-width:0}',
 '.msTx b{display:block;font-size:15.5px;line-height:1.2}',
 '.msTx span:not(.msChip){display:block;font-size:12px;color:var(--mut,#9aa);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.msPc{flex:0 0 auto;text-align:right;font-weight:800;font-size:17px}',
 '.msPc small{display:block;font-size:11px;font-weight:600;color:var(--mut,#9aa)}',
 '.msChip{display:inline-block;margin-top:5px;padding:3px 9px;border-radius:99px;font-size:11.5px;font-weight:800;letter-spacing:.2px}',
 '.msChip.cand{background:#0f5132;color:#d1f5e0}.msChip.cuid{background:#6b4a00;color:#ffe9b0}.msChip.evit{background:#5a1a1a;color:#ffd5d5}',
 '.msChip.sin,.msChip.vivo{background:#2a3340;color:#cfd8e3}',
 '.msChip.valor{background:#0f5132;color:#d1f5e0}.msChip.justo{background:#2a3340;color:#cfd8e3}.msChip.sinv{background:#5a1a1a;color:#ffd5d5}',
 '.msSel{flex:0 0 26px;height:26px;border-radius:8px;border:2px solid var(--line2,#2a3340);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#101418;cursor:pointer}',
 '.msSel.on{background:var(--hot,#fbbf24);border-color:var(--hot,#fbbf24)}',
 '.msDet{display:none;padding:0 12px 12px;border-top:1px solid var(--line2,#2a3340)}',
 '.msRow.open .msDet{display:block}',
 '.msCu{display:flex;align-items:center;gap:8px;margin:10px 0 6px;font-size:13px}',
 '.msCu label{flex:1;color:var(--mut,#9aa)}',
 '.msSheet input.msIn{width:120px;box-sizing:border-box;padding:9px 10px;border-radius:10px;border:1px solid var(--line2,#2a3340);background:var(--bg,#070b12);color:var(--txt,#fff);font-size:16px;margin:0}',
 '.msSheet input.msQ{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--line2,#2a3340);background:var(--bg1,#0d1420);color:var(--txt,#fff);font-size:16px;margin:8px 0 0}',
 '.msLeido{margin-top:8px;font-size:12px;line-height:1.45;color:var(--mut,#9aa);white-space:pre-wrap;word-break:break-word}',
 '.msLeido b{color:var(--txt,#fff)}',
 '.msH{margin:18px 0 6px;font-size:15px;font-weight:800}',
 '.msIA{margin:10px 0;padding:12px 13px;border-radius:14px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);font-size:14px;line-height:1.5}',
 '.msIA .msQp{font-weight:800;color:var(--hot,#fbbf24);margin-bottom:6px}',
 '.msIA .msJ{margin:12px 0 2px;font-weight:800;font-size:15px}',
 '.msIA p{margin:4px 0}',
 '.msIA .msSen{display:inline-block;margin:3px 0;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:800}',
 '.msIA .msSen.j{background:#0f5132;color:#d1f5e0}.msIA .msSen.c{background:#6b4a00;color:#ffe9b0}.msIA .msSen.e{background:#5a1a1a;color:#ffd5d5}',
 '.msIA small{display:block;color:var(--mut,#9aa);margin-top:8px;font-size:11.5px}',
 '.msErr{color:#ffb4b4}'
].join('\n');

var ST={juegos:[],sel:{},cuotas:{},cargando:false,previa:'',leyo:0};
var sheet,lista,estado,btnIA,iaCaja,inpQ,fab,infoCtx;

function diaDe(g){
 var e=g.previousElementSibling, n=0;
 while(e&&n<80){ if(e.classList&&e.classList.contains('diaHead')) return compactar(e.textContent); e=e.previousElementSibling; n++; }
 return '';
}
function tabsDe(g){
 var body=$('.body',g); if(!body) return [];
 var panes=$$('section.tab, .pane',body), tbs=$$('.tb',body), out=[];
 panes.forEach(function(p,i){
  var c=p.cloneNode(true);
  $$('svg,script,style,button,select,option,.nota,.leyenda,.iabox',c).forEach(function(n){
   /* se quitan las notas largas de explicación; las cortas y los avisos se quedan */
   if(n.classList&&n.classList.contains('nota')&&compactar(n.textContent).length<=120) return;
   if(n.parentNode) n.parentNode.removeChild(n);
  });
  var vals=[];
  $$('input',p).forEach(function(x){
   if(!x.value) return;
   var lab=x.parentNode&&x.parentNode.querySelector('label');
   vals.push((lab?compactar(lab.textContent)+' ':'')+compactar(x.value));
  });
  var txt=compactar(c.textContent)+(vals.length?' [escrito en la app: '+vals.join('; ')+']':'');
  if(!txt||/^Cargando/i.test(txt)) return;
  var id=p.getAttribute('data-t')||p.getAttribute('data-p')||'';
  if(!id&&p.id){ var m=p.id.match(/(ver|cuo|num|for)$/); if(m) id=m[1]; }
  var nombre=(tbs[i]&&compactar(tbs[i].textContent))||id||('Pestana '+(i+1));
  out.push({id:id,nombre:nombre,txt:txt});
 });
 if(!out.length&&body){
  var t=compactar(body.textContent);
  if(t&&!/^Cargando/i.test(t)) out.push({id:'ver',nombre:'Datos',txt:t});
 }
 return out;
}
function leerJuego(g,i){
 var o=null; try{ o=root.OVALeerJuego?root.OVALeerJuego(g):null; }catch(e){}
 var j={g:g,idx:i};
 if(!o){
  var nm=$$('.head .eq span:not(.tag):not(.esc)',g).map(function(x){ return compactar(x.textContent); }).filter(Boolean);
  o={na:nm[0]||'?',nh:nm[1]||'?',hora:compactar(($('.clock',g)||$('.hora',g)||{}).textContent),vs:'vs'};
 }
 j.na=o.na; j.nh=o.nh; j.hora=o.hora||''; j.vivo=!!o.vivo; j.vs=o.vs||'vs';
 var c=g._calc, pa=o.pa, ph=o.ph;
 if(c&&c.pA!=null&&c.pH!=null){ pa=+c.pA; ph=+c.pH; }
 if(pa!=null&&ph!=null){
  j.pa=pa; j.ph=ph;
  var fa=pa>ph;
  j.fav=fa?o.na:o.nh; j.pf=fa?pa:ph; j.rival=fa?o.nh:o.na;
  j.contra=(j.vs==='@')?(fa?'@ ':'vs ')+j.rival+(fa?'':' (en casa)'):'vs '+j.rival;
 }
 j.emp=o.emp||''; j.tot=o.tot||''; j.cu=o.cu||''; j.sello=o.sello||''; j.conf=o.conf||''; j.nivel=o.nivel||'';
 j.titulo=o.na+' '+j.vs+' '+o.nh; j.dia=diaDe(g);
 j.tabs=tabsDe(g);
 j.key=[APP,j.titulo,j.dia||fechaApp()].join('|');
 j.cuotaMia=ST.cuotas[j.key]||'';
 j.et=etiqueta(j.pf==null?null:j.pf,j.nivel,APP,j.vivo);
 return j;
}

/* abre cada juego en silencio para que pinte sus pestañas, y deja la pantalla como estaba */
function cargarTodo(prog){
 var gs=$$('.game');
 if(!gs.length) return Promise.resolve();
 if(APP==='mlb'){
  var hechos=0;
  return Promise.all(gs.map(function(g){
   var p; try{ p=g._cargar?g._cargar():null; }catch(e){ p=null; }
   return Promise.resolve(p).catch(function(){}).then(function(){ hechos++; prog(hechos,gs.length); });
  })).then(function(){ return new Promise(function(r){ root.setTimeout(r,250); }); });
 }
 var abierto=gs.filter(function(g){ return g.classList.contains('open'); })[0];
 var i=0;
 return new Promise(function(res){
  (function paso(){
   if(i>=gs.length){ root.setTimeout(function(){
     gs.forEach(function(g){ g.classList.remove('open'); });
     if(abierto) abierto.classList.add('open');
     res();
   },700); return; }
   var g=gs[i++], head=$('.head',g), body=$('.body',g);
   prog(i,gs.length);
   try{
    if(head&&body&&!body.children.length&&!body.textContent.trim()){
     if(g.classList.contains('open')) g.classList.remove('open');
     head.click();
    }
   }catch(e){}
   root.setTimeout(paso,30);
  })();
 });
}

function nuevaFila(j,pos){
 var row=mk('div','msRow');
 var top=mk('div','msTop');
 top.appendChild(mk('div','msN',String(pos)));
 var tx=mk('div','msTx');
 if(j.pf!=null){
  tx.appendChild(mk('b','',j.fav));
  tx.appendChild(mk('span','',j.contra+(j.hora?' · '+j.hora:'')+(j.dia&&APP!=='mlb'?' · '+j.dia:'')));
 }else{
  tx.appendChild(mk('b','',j.titulo));
  tx.appendChild(mk('span','',(j.hora||'')+' · sin números todavía'));
 }
 var chip=mk('span','msChip '+j.et.k,j.et.t+(j.et.flojo?' · datos flojos':''));
 tx.appendChild(chip);
 top.appendChild(tx);
 if(j.pf!=null){
  var pc=mk('div','msPc',j.pf.toFixed(0)+'%'); pc.appendChild(mk('small','',j.cu?'justa '+j.cu:'modelo'));
  top.appendChild(pc);
 }
 var puede=j.pf!=null&&!j.vivo;
 var sel=mk('div','msSel'+(ST.sel[j.key]&&puede?' on':''),ST.sel[j.key]&&puede?'✓':'');
 sel.setAttribute('role','checkbox'); sel.setAttribute('aria-checked',String(!!ST.sel[j.key]));
 if(puede){
  sel.addEventListener('click',function(e){
   e.stopPropagation(); ST.sel[j.key]=!ST.sel[j.key];
   sel.classList.toggle('on',!!ST.sel[j.key]); sel.textContent=ST.sel[j.key]?'✓':''; sel.setAttribute('aria-checked',String(!!ST.sel[j.key])); actualizarBtn();
  });
 }else sel.style.opacity='.3';
 top.appendChild(sel);
 top.addEventListener('click',function(){ row.classList.toggle('open'); });
 row.appendChild(top);
 var det=mk('div','msDet');
 if(j.pf!=null&&!j.vivo){
  var cu=mk('div','msCu'); cu.appendChild(mk('label','','Cuota que pagan por '+j.fav+' (−140, +120, 1.85 o 55¢)'));
  var inp=mk('input','msIn'); inp.type='text'; inp.setAttribute('inputmode','text'); inp.placeholder='ej. -140'; inp.value=j.cuotaMia||'';
  var res=mk('div','');
  function calc(){
   var v=inp.value; ST.cuotas[j.key]=v; j.cuotaMia=v;
   ls('ova_mesa_cu_'+APP+'_'+fechaApp(),JSON.stringify(ST.cuotas));
   while(res.firstChild) res.removeChild(res.firstChild);
   var r=valorDe(j.pf,v);
   if(!compactar(v)) return;
   if(!r){ res.appendChild(mk('div','msEst','No entendí esa cuota.')); return; }
   var pe=(r.ev*100>=0?'+':'')+(r.ev*100).toFixed(1)+'%';
   var ch=mk('span','msChip '+(r.k==='valor'?'valor':(r.k==='justo'?'justo':'sinv')),
    r.k==='valor'?'Posible valor · EV '+pe:(r.k==='justo'?'Casi justa · EV '+pe:'Sin valor · EV '+pe));
   res.appendChild(ch);
   res.appendChild(mk('div','msEst','Con '+j.pf.toFixed(1)+'% del modelo la cuota justa es '+americana(j.pf/100)+'. '+
    (r.k==='valor'?'Pide al menos +5%: por debajo casi siempre es ruido del modelo, y el mercado suele tener razón.':'Paga igual o menos que lo justo.')));
  }
  inp.addEventListener('input',calc); inp.addEventListener('click',function(e){ e.stopPropagation(); });
  cu.appendChild(inp); det.appendChild(cu); det.appendChild(res); calc();
 }
 var lt=mk('div','msLeido');
 var resumen=j.tabs.map(function(t){ return t.nombre+': '+recortar(t.txt,400); }).join('\n\n');
 lt.appendChild(mk('b','','Esto leí de este juego:\n'));
 lt.appendChild(doc.createTextNode(resumen||'(todavía no hay pestañas pintadas)'));
 det.appendChild(lt);
 row.appendChild(det);
 return row;
}

function pintarLista(){
 while(lista.firstChild) lista.removeChild(lista.firstChild);
 var js=ST.juegos.slice().sort(function(a,b){
  var ra=a.vivo?-2:(a.pf==null?-1:a.pf), rb=b.vivo?-2:(b.pf==null?-1:b.pf); return rb-ra;
 });
 js.forEach(function(j,i){ lista.appendChild(nuevaFila(j,i+1)); });
 var c=js.filter(function(j){ return j.et.k==='cand'; }).length, ev=js.filter(function(j){ return j.et.k==='evit'; }).length;
 estado.textContent=js.length+' juegos leídos · '+c+' candidatos · '+ev+' parejos. Ordenados por probabilidad del modelo, sin mirar cuotas.';
 actualizarBtn();
}
function elegidos(){
 return ST.juegos.filter(function(j){ return ST.sel[j.key]&&j.pf!=null&&!j.vivo; })
  .sort(function(a,b){ return b.pf-a.pf; });
}
function actualizarBtn(){
 var n=elegidos().length;
 btnIA.textContent=n?'🦈 Preguntar a la IA con internet ('+n+' juego'+(n===1?'':'s')+')':'Marca al menos un juego con ✓';
 btnIA.classList.toggle('off',!n||ST.cargando);
 var ult=ls('ova_mesa_ia_'+APP);
 if(ult&&!iaCaja.firstChild) try{
  var u=JSON.parse(ult);
  if(u&&u.fecha===fechaApp()&&u.txt){ pintarRespuesta('Última respuesta guardada ('+haceTxt(u.t)+')',u.txt,true); ST.previa=u.txt; }
 }catch(e){}
}
function haceTxt(t){
 var m=Math.max(0,Math.round((Date.now()-(+t||0))/60000));
 return m<2?'hace un momento':(m<90?'hace '+m+' min':'hace '+Math.round(m/60)+' h');
}

function leer(){
 if(ST.cargando) return;
 ST.cargando=true; actualizarBtn();
 var gs=$$('.game');
 if(!gs.length){ estado.textContent='Primero carga los juegos (fecha / liga) y vuelve a abrir la Mesa.'; ST.cargando=false; return; }
 estado.textContent='Leyendo '+gs.length+' juegos…';
 try{ ST.cuotas=JSON.parse(ls('ova_mesa_cu_'+APP+'_'+fechaApp())||'{}')||{}; }catch(e){ ST.cuotas={}; }
 cargarTodo(function(h,t){ estado.textContent='Leyendo juego '+h+' de '+t+'…'; }).catch(function(){}).then(function(){
  ST.juegos=$$('.game').map(leerJuego);
  /* por defecto: los 8 mejores con números y sin empezar */
  var viejos=ST.sel, nuevo={}; var top=ST.juegos.filter(function(j){ return j.pf!=null&&!j.vivo; })
   .sort(function(a,b){ return b.pf-a.pf; }).slice(0,8);
  top.forEach(function(j){ nuevo[j.key]=true; });
  ST.juegos.forEach(function(j){ if(viejos[j.key]===false) nuevo[j.key]=false; });
  ST.sel=nuevo; ST.cargando=false; pintarLista();
 });
}

/* ---------- IA ---------- */
function llamar(prompt){
 var url=root.WORKER_URL||WORKER_DEF;
 return root.fetch(url,{
  method:'POST',
  headers:{'content-type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({max_tokens:4000,messages:[{role:'user',content:prompt}],tools:[{type:'web_search_20250305',name:'web_search',max_uses:10}]})
 }).then(function(r){
  if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP '+r.status+' -- '+t.slice(0,180)); });
  return r.json();
 }).then(function(d){
  if(d.error) throw new Error(d.error.message||'Error de la API');
  var t=(d.content||[]).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; }).join('\n\n');
  return t||'Sin respuesta de texto.';
 });
}
function conNegritas(p,txt){
 String(txt).split('**').forEach(function(s,i){
  if(!s) return;
  if(i%2){ var b=mk('b','',s); p.appendChild(b); } else p.appendChild(doc.createTextNode(s));
 });
}
function pintarRespuesta(titulo,txt,esGuardada){
 var caja=mk('div','msIA');
 caja.appendChild(mk('div','msQp',titulo));
 String(txt).split(/\n+/).forEach(function(l){
  l=l.replace(/^[#>\s]+/,'').trim(); if(!l) return;
  var m;
  if((m=l.match(/^\**\s*JUEGO\s*\d+\s*[:.-]\s*(.*)$/i))){ caja.appendChild(mk('div','msJ',m[0].replace(/\*/g,''))); return; }
  if((m=l.match(/^\**\s*SE[ÑN]AL\s*:?\**\s*\**\s*(JUEGA|CUIDADO|EVITAR|MANTENER)\b(.*)$/i))){
   var w=m[1].toUpperCase(), k=(w==='JUEGA'||w==='MANTENER')?'j':(w==='CUIDADO'?'c':'e');
   caja.appendChild(mk('span','msSen '+k,'SEÑAL: '+w)); if(compactar(m[2]).replace(/[*:.\s-]/g,'')){ var p0=mk('p',''); conNegritas(p0,m[2].replace(/^[\s:.-]+/,'')); caja.appendChild(p0); }
   return;
  }
  var p=mk('p',''); conNegritas(p,l); caja.appendChild(p);
 });
 if(!esGuardada) caja.appendChild(mk('small','','Lo escribió la IA con búsqueda web: revisa las fuentes que cita antes de jugar. No es una garantía.'));
 iaCaja.insertBefore(caja,iaCaja.firstChild);
 return caja;
}
function aviso(txt,err){ var d=mk('div','msIA'+(err?' msErr':''),txt); iaCaja.insertBefore(d,iaCaja.firstChild); return d; }

function preguntar(pregunta){
 var sel=elegidos().slice(0,8);
 if(!sel.length){ aviso('Marca al menos un juego con ✓.',true); return; }
 /* se relee el texto de cada pestaña por si cambió (cuotas escritas, carga tardía) */
 sel.forEach(function(j){ j.tabs=tabsDe(j.g); j.cuotaMia=ST.cuotas[j.key]||''; });
 var prompt=construirPrompt({app:APP,fecha:fechaApp(),juegos:sel,registro:resumenRegistro(APP,function(k){ return ls(k); }),
  pregunta:pregunta||'',previa:pregunta?ST.previa:''});
 infoCtx.textContent='Contexto enviado: '+prompt.length.toLocaleString('es')+' de 12,000 caracteres · '+sel.length+' juegos';
 ST.cargando=true; actualizarBtn();
 var esp=aviso(pregunta?'Pensando tu pregunta…':'Buscando lineups, lesiones y noticias de '+sel.length+' juegos… puede tardar un minuto.');
 llamar(prompt).then(function(txt){
  if(esp.parentNode) esp.parentNode.removeChild(esp);
  pintarRespuesta(pregunta?'Tú: '+recortar(pregunta,160):'🦈 Mesa · análisis con internet',txt,false);
  if(!pregunta){ ST.previa=txt; ls('ova_mesa_ia_'+APP,JSON.stringify({fecha:fechaApp(),t:Date.now(),txt:txt})); }
  else ST.previa=ST.previa+'\n\nPREGUNTA: '+recortar(pregunta,200)+'\nRESPUESTA: '+recortar(txt,900);
 }).catch(function(e){
  if(esp.parentNode) esp.parentNode.removeChild(esp);
  aviso('No se pudo consultar la IA: '+(e&&e.message?e.message:e)+'. La lista de arriba sigue valiendo: no depende de internet.',true);
 }).then(function(){ ST.cargando=false; actualizarBtn(); });
}

function abrir(){
 sheet.classList.add('on'); sheet.scrollTop=0; fab.style.display='none';
 leer();
}
function cerrar(){ sheet.classList.remove('on'); fab.style.display=''; }

function armar(){
 if($('.msFab')) return;
 APP=appActual();
 var s=mk('style'); s.id='msCss'; s.textContent=CSS; (doc.head||doc.documentElement).appendChild(s);
 fab=boton('msFab','',abrir); fab.appendChild(mk('b','','◎')); fab.appendChild(doc.createTextNode('Mesa'));
 fab.setAttribute('aria-label','Abrir la Mesa de hoy');
 doc.body.appendChild(fab);
 sheet=mk('div','msSheet'); sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-label','Mesa de hoy');
 var bar=mk('div','msBar'); var h=mk('h2','','Mesa de hoy'); h.appendChild(mk('small','',({mlb:'MLB',fut:'Fútbol',nba:'NBA'})[APP]+' · lee todos los juegos y todas las pestañas'));
 bar.appendChild(h); bar.appendChild(boton('msX','✕ Cerrar',cerrar)); sheet.appendChild(bar);
 var av=mk('div','msAviso');
 av.appendChild(mk('b','','Qué es y qué no es. '));
 av.appendChild(doc.createTextNode('Junta en un lugar lo que la app ya calculó y, si quieres, le suma noticias de internet. Ahorra tiempo y detecta cuando algo contradice al modelo. '+
  'No crea ventaja por sí sola: el mercado suele estar bien y, medido con tus datos, el modelo no le gana. Úsala para descartar y para confirmar, no como garantía.'));
 sheet.appendChild(av);
 estado=mk('div','msEst',''); sheet.appendChild(estado);
 sheet.appendChild(boton('msMini','↻ Volver a leer',function(){ leer(); }));
 lista=mk('div',''); sheet.appendChild(lista);
 var reg=resumenRegistro(APP,function(k){ return ls(k); });
 if(reg) sheet.appendChild(mk('div','msEst','Tu registro en esta app: '+reg+'.'));
 sheet.appendChild(mk('div','msH','IA con internet'));
 btnIA=boton('msBtn','Marca al menos un juego con ✓',function(){ if(!btnIA.classList.contains('off')) preguntar(''); });
 sheet.appendChild(btnIA);
 infoCtx=mk('div','msEst',''); sheet.appendChild(infoCtx);
 inpQ=mk('input','msQ'); inpQ.type='text'; inpQ.placeholder='Pregúntale algo, ej: ¿por qué evitas el 3?';
 inpQ.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); var q=compactar(inpQ.value); if(q&&!ST.cargando){ inpQ.value=''; preguntar(q); } } });
 sheet.appendChild(inpQ);
 sheet.appendChild(boton('msBtn sec','Preguntar',function(){ var q=compactar(inpQ.value); if(q&&!ST.cargando){ inpQ.value=''; preguntar(q); } }));
 iaCaja=mk('div',''); sheet.appendChild(iaCaja);
 doc.body.appendChild(sheet);
}
function arrancar(){ try{ armar(); }catch(e){ if(root.console) root.console.error('asistente',e); } }
if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',arrancar); else arrancar();
})(typeof window!=='undefined'?window:globalThis);
