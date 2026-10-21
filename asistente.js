/* OVA · Escáner (antes «Mesa») — MLB, fútbol y NBA.
   Una barra dentro de la lista de juegos que abre el «Escáner de hoy». Hace tres cosas, en este orden de confianza:
   1) LEE todos los juegos de la pantalla, pestaña por pestaña (Veredicto, Cuotas, Números, Forma, Parque…),
      sin que tengas que abrirlos uno por uno.
   2) ORDENA los juegos con reglas fijas y sin internet (probabilidad del modelo + qué tan buenos son los datos).
      Esto funciona aunque no haya Worker ni red.
   3) CUOTA → VALOR: escribes la cuota que te pagan y calcula, con la probabilidad del modelo, si paga más que la justa.
   No cambia ningún cálculo de la app ni escribe en tus registros: solo lee. No promete ganadores. */
(function(root){
"use strict";
var doc=root.document;

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
function valorDe(pPct,cuota,pmPct){   /* ev = p·decimal − 1; si hay mercado, manda el mercado (acierta más que el modelo) */
 var d=aDecimal(cuota); if(d==null||!(pPct>0)) return null;
 var ev=pPct/100*d-1;
 if(pmPct>0){
  var evM=pmPct/100*d-1;
  /* paga más que el precio justo de Pinnacle = valor de verdad; si solo el modelo lo ve, es sospechoso */
  var km=evM>=0.02?'valor':(evM>=-0.005?'justo':'sin');
  return {ev:ev,evM:evM,k:km,dec:d,soloModelo:(ev>=0.05&&evM<0)};
 }
 /* sin mercado, un +EV chico casi siempre es ruido del modelo: se pide margen para decir «valor» */
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
/* ---------- mercado (el «servidor»: pinnacle-*.json que escriben los escáneres de GitHub) ---------- */
var PARAR={fc:1,cf:1,afc:1,sc:1,de:1,del:1,la:1,el:1,the:1,club:1,ac:1,as:1,ud:1,cd:1};
function tokens(n){
 var t=String(n==null?'':n).toLowerCase();
 try{ t=t.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
 return t.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){ return w&&!PARAR[w]; });
}
function mismoEq(a,b){       /* todos los nombres de uno dentro del otro: «Red Sox» ≈ «Boston Red Sox», pero «White Sox» ≠ «Red Sox» */
 var ta=tokens(a), tb=tokens(b); if(!ta.length||!tb.length) return false;
 var corto=ta.length<=tb.length?ta:tb, largo=ta.length<=tb.length?tb:ta;
 return corto.every(function(w){ return largo.indexOf(w)>=0; });
}
/* busca el juego en el archivo del servidor y devuelve las probabilidades SIN margen orientadas a (na, nh):
   {a,h,d} en 0-100. d solo en fútbol. Formatos: MLB fair:[a,b] · NBA ml:[a,b] · fútbol r:[a,empate,b]. */
function cruzarMercado(juegos,app,na,nh){
 if(!Array.isArray(juegos)) return null;
 for(var i=0;i<juegos.length;i++){
  var g=juegos[i]; if(!g||!g.n||g.n.length<2) continue;
  var dir=mismoEq(g.n[0],na)&&mismoEq(g.n[1],nh), inv=!dir&&mismoEq(g.n[0],nh)&&mismoEq(g.n[1],na);
  if(!dir&&!inv) continue;
  var v=app==='fut'?g.r:(app==='nba'?g.ml:g.fair);
  if(!Array.isArray(v)) continue;
  var p0,p1,d=null;
  if(app==='fut'){ if(v.length<3) continue; p0=+v[0]; d=+v[1]; p1=+v[2]; } else { if(v.length<2) continue; p0=+v[0]; p1=+v[1]; }
  if(!(p0>0&&p1>0)) continue;
  var o={a:(dir?p0:p1)*100,h:(dir?p1:p0)*100,d:d==null?null:d*100};
  return o;
 }
 return null;
}
/* compara el favorito del modelo con el del mercado. coinc: mismo favorito y ≤3 pts · cerca: ≤6 pts · choca: otro favorito o ≥6 pts */
function compararMercado(pa,ph,ma,mh){
 if(pa==null||ph==null||ma==null||mh==null) return null;
 var favMod=pa>ph?'a':'h', favMer=ma>mh?'a':'h';
 var pm=favMod==='a'?pa:ph, mm=favMod==='a'?ma:mh, dif=pm-mm;
 var k=(favMod!==favMer||Math.abs(dif)>=6)?'choca':(Math.abs(dif)<=3?'coinc':'cerca');
 return {k:k,dif:dif,mer:mm,favMer:favMer,favMod:favMod};
}
/* mezcla 50/50 modelo + mercado (medido en 6 171 juegos de MLB y 5 256 de fútbol: acierta más que el modelo solo y no pierde nada).
   Devuelve {pf, fav:'a'|'h'} con la probabilidad del favorito de la mezcla. */
function mezclar(pa,ph,ma,mh){
 if(pa==null||ph==null||ma==null||mh==null) return null;
 var xa=(pa+ma)/2, xh=(ph+mh)/2;
 return xa>xh?{pf:xa,fav:'a'}:{pf:xh,fav:'h'};
}
/* si modelo y mercado eligen favoritos distintos, no se juega (medido: el mercado tuvo la razón, el modelo ganó 26 % en fútbol y 47 % en MLB
   donde decía 40 % y 53 %). Si eligen el mismo y solo difieren en puntos, la mezcla ya lo absorbe: no se baja otra vez. */
function ajustarPorMercado(et,cmp){
 if(!cmp||!et||et.k==='vivo'||et.k==='sin') return et;
 var o={k:et.k,t:et.t,flojo:et.flojo,mk:cmp.k};
 if(cmp.favMod&&cmp.favMer&&cmp.favMod!==cmp.favMer){ o.k='evit'; o.t='Parejo · evitar'; }
 return o;
}
/* ---------- verificación OFICIAL (MLB StatsAPI): datos de formato fijo, sin IA, sin gasto ---------- */
function apellido(n){ var w=String(n||'').trim().split(/\s+/); return w.length>1?w.slice(1).join(' '):(w[0]||''); }
function oficialDe(sj,pit,tx,eq,ahora){
 if(!sj) return null;
 var st=(sj.status&&sj.status.detailedState)||'', ab=(sj.status&&sj.status.abstractGameState)||'';
 var L=sj.lineups||{}, la=L.awayPlayers||[], lh=L.homePlayers||[];
 var na=la.length||(sj._ord&&sj._ord.a)||0, nh=lh.length||(sj._ord&&sj._ord.h)||0;
 var o={estado:st,empezo:ab&&ab!=='Preview',malo:/postponed|cancel|suspended|delayed/i.test(st),
  lin:{a:na,h:nh,ok:na>=9&&nh>=9,nomA:la.map(function(x){ return apellido(x.fullName); }).filter(Boolean),nomH:lh.map(function(x){ return apellido(x.fullName); }).filter(Boolean)},
  camb:[],mov:[],clima:''};
 var t=Date.parse(sj.gameDate); o.min=isFinite(t)?Math.round((t-(ahora||Date.now()))/60000):null;
 var T=sj.teams||{};
 [['a','visita'],['h','local']].forEach(function(c){
  var of=T[c[0]=='a'?'away':'home'], pr=of&&of.probablePitcher, usado=pit&&pit[c[0]];
  if(!usado||!usado.id) return;
  if(!pr) o.camb.push({l:c[1],antes:usado.n,ahora:''});
  else if(+pr.id!==+usado.id) o.camb.push({l:c[1],antes:usado.n,ahora:pr.fullName});
 });
 if(Array.isArray(tx)&&eq){
  tx.forEach(function(x){
   if(!x||o.mov.length>=6) return;
   var ids=[x.toTeam&&x.toTeam.id,x.fromTeam&&x.fromTeam.id];
   if(ids.indexOf(+eq.a)<0&&ids.indexOf(+eq.h)<0&&ids.indexOf(eq.a)<0&&ids.indexOf(eq.h)<0) return;
   var d=compactar(x.description||'');
   if(/injur|\bIL\b|disabled|day-to-day|suspend|paternity|bereavement|restricted/i.test(d)) o.mov.push(recortar((x.date||'')+' '+d,150));
  });
 }
 var w=sj.weather||{};
 if(w.condition||w.temp||w.wind) o.clima=compactar([w.condition,w.temp?w.temp+'°F':'',w.wind?'viento '+w.wind:''].filter(Boolean).join(', '));
 return o;
}
function ajustarPorOficial(et,of){
 if(!of||!et) return et;
 if(of.malo&&!of.empezo) return {k:'sin',t:'Juego '+(/postponed/i.test(of.estado)?'pospuesto':(/delayed/i.test(of.estado)?'demorado':'suspendido')),of:true};
 if(et.k==='vivo'||et.k==='sin') return et;
 if(of.camb&&of.camb.length) return {k:'evit',t:'Cambió el abridor · evitar',flojo:et.flojo,mk:et.mk,of:true};
 return et;
}
function textoOficial(of,na,nh,edad){
 if(!of) return '';
 var l=[];
 l.push('estado '+(of.estado||'?')+(of.min!=null&&!of.empezo?' (empieza en '+(of.min>=60?Math.round(of.min/6)/10+' h':Math.max(0,of.min)+' min')+')':''));
 l.push(of.lin.ok?'lineups CONFIRMADOS ('+na+': '+of.lin.nomA.join(', ')+' | '+nh+': '+of.lin.nomH.join(', ')+')':'lineups pendientes (visita '+of.lin.a+'/9, local '+of.lin.h+'/9)');
 if(of.camb.length) l.push('CAMBIO DE ABRIDOR vs lo que uso mi modelo: '+of.camb.map(function(c){ return c.l+' '+c.antes+' -> '+(c.ahora||'por confirmar'); }).join('; '));
 else l.push('abridores iguales a los del modelo');
 if(of.clima) l.push('clima oficial: '+of.clima);
 if(of.mov.length) l.push('movimientos de lesionados/suspensiones (ult. 2 dias): '+of.mov.join(' ; '));
 return 'OFICIAL (MLB StatsAPI, '+(edad||'ahora')+'): '+l.join(' · ');
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
/* ---------- textos de la pantalla (puros, se prueban en node) ---------- */
function pl(n,s,p){ return n+' '+(n===1?s:p); }     /* 1 juego · 0 juegos · 2 juegos */
/* resumen de arriba: singular cuando es 1 y, si el mercado no cruzó ningún juego, «sin mercado» a secas (sin la edad de unas cuotas que no se usaron) */
function resumenEstado(o){
 var n=o.n, s=pl(n,'juego leído','juegos leídos')+' · '+pl(o.c,'candidato','candidatos')+' · '+pl(o.ev,'parejo','parejos')+'. ';
 if(o.app==='mlb') s+=o.tieneOf?('Verificado con MLB oficial: '+pl(o.ofn,'juego','juegos')+' · '+o.lp+' con lineup pendiente · '+o.cb+' con abridor cambiado. '):'No pude leer la API oficial de MLB. ';
 if(!o.tieneMer) s+='No pude leer el mercado del servidor: el orden usa solo el modelo.';
 else if(!o.cr) s+='Sin mercado para '+(n===1?'este juego':'estos juegos')+': el orden usa solo el modelo.';
 else{
  var meta=[]; if(o.edad) meta.push(o.edad); if(o.viejo) meta.push('cuotas viejas, verifica');
  s+='Mercado del servidor'+(meta.length?' ('+meta.join(' · ')+')':'')+': cruzó '+o.cr+' de '+n+' · '+o.co+(o.co===1?' coincide':' coinciden')+' con el modelo · '+o.ch+(o.ch===1?' choca':' chocan')+'.';
 }
 return s;
}
/* letra chica bajo el porcentaje: si no hay mercado el número es solo del modelo y la tarjeta lo dice */
function subPct(j){
 if(j.mix){
  /* si la mezcla escoge otro favorito que el modelo (el título lleva al del modelo), el % es de ese otro equipo: se rotula con su nombre */
  var fm=j.mix.fav==='a'?j.na:(j.mix.fav==='h'?j.nh:'');
  return (fm&&fm!==j.fav)?['modelo+mercado','de '+fm]:['modelo+mercado'];
 }
 var o=['solo modelo']; if(j.cu) o.push('justa '+j.cu);
 return o;
}
var API={pl:pl,resumenEstado:resumenEstado,subPct:subPct,compactar:compactar,recortar:recortar,aDecimal:aDecimal,americana:americana,valorDe:valorDe,etiqueta:etiqueta,oficialDe:oficialDe,ajustarPorOficial:ajustarPorOficial,textoOficial:textoOficial,tokens:tokens,mismoEq:mismoEq,cruzarMercado:cruzarMercado,compararMercado:compararMercado,mezclar:mezclar,ajustarPorMercado:ajustarPorMercado,
 resumenRegistro:resumenRegistro};
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
 '.msBarra{display:flex;align-items:center;gap:12px;margin:12px 0;padding:12px 14px;border-radius:14px;background:var(--bg2,#131c2a);color:var(--txt,#fff);border:1px solid var(--hot,#fbbf24);font:700 14px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:44px;box-sizing:border-box;user-select:none;-webkit-user-select:none}',
 '.msBarra b{color:var(--hot,#fbbf24);font-size:22px;line-height:1}',
 '.msBarra span{display:block;font-weight:500;font-size:12px;color:var(--mut,#9db2c8);margin-top:2px}',
 '.msSheet{display:none;position:fixed;inset:0;z-index:95;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg,#070b12);color:var(--txt,#fff);padding:0 14px calc(60px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,sans-serif}',
 '.msSheet.on{display:block;animation:msIn .22s cubic-bezier(.22,.7,.3,1)}',
 '@keyframes msIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}',
 '.msBar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -14px 8px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:var(--bg,#070b12);border-bottom:1px solid var(--line2,#2a3340)}',
 '.msBar h2{margin:0;flex:1;font-size:19px;font-weight:700}',
 '.msBar h2 small{display:block;font-size:11.5px;font-weight:500;color:var(--mut,#9aa);margin-top:2px}',
 '.msX,.msBtn,.msMini{display:inline-flex;align-items:center;justify-content:center;border-radius:99px;font:700 14px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:center}',
 '.msX{background:var(--bg2,#131c2a);color:var(--hot,#fbbf24);padding:9px 14px;min-height:40px}',
 '.msBtn{width:100%;box-sizing:border-box;background:var(--hot,#fbbf24);color:#101418;padding:14px;min-height:50px;margin:10px 0 6px;border-radius:14px}',
 '.msMini{background:var(--bg2,#131c2a);color:var(--txt,#fff);padding:8px 13px;min-height:36px;font-size:13px;border:1px solid var(--line2,#2a3340)}',
 '.msAviso{margin:10px 0;border-radius:12px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);font-size:12.5px;line-height:1.45;color:var(--mut,#9aa);overflow:hidden}',
 '.msAvH{display:block;padding:12px 13px;font-weight:800;font-size:13px;color:var(--txt,#fff);cursor:pointer;-webkit-tap-highlight-color:transparent}',
 '.msAvB{display:none;padding:0 13px 12px}',
 '.msAviso.on .msAvB{display:block}',
 '.msEst{margin:8px 0;font-size:13px;color:var(--mut,#9aa)}',
 '.msRow{margin:8px 0;border-radius:14px;background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3340);overflow:hidden}',
 '.msTop{display:flex;align-items:center;gap:10px;padding:11px 12px;cursor:pointer}',
 '.msN{flex:0 0 22px;font-weight:800;color:var(--mut,#9aa);font-size:14px;text-align:center}',
 '.msTx{flex:1;min-width:0}',
 '.msTx b{display:block;font-size:15.5px;line-height:1.2}',
 '.msTx span:not(.msChip){display:block;font-size:12px;color:var(--mut,#9aa);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.msPc{flex:0 0 auto;text-align:right;font-weight:800;font-size:17px}',
 '.msPc small{display:block;font-size:11px;font-weight:600;color:var(--mut,#9aa)}',
 '.msChip{display:inline-block;margin:5px 6px 0 0;padding:3px 9px;border-radius:99px;font-size:11.5px;font-weight:800;letter-spacing:.2px}',
 '.msChip.cand{background:#0f5132;color:#d1f5e0}.msChip.cuid{background:#6b4a00;color:#ffe9b0}.msChip.evit{background:#5a1a1a;color:#ffd5d5}',
 '.msChip.mcoinc{background:#0f5132;color:#d1f5e0;margin-left:0}.msChip.mcerca{background:#2a3340;color:#cfd8e3;margin-left:0}.msChip.mchoca{background:#5a1a1a;color:#ffd5d5;margin-left:0}.msChip.msin{background:transparent;color:var(--mut,#9aa);font-weight:600;padding-left:0;padding-right:0}',
 '.msChip.sin,.msChip.vivo{background:#2a3340;color:#cfd8e3}',
 '.msChip.valor{background:#0f5132;color:#d1f5e0}.msChip.justo{background:#2a3340;color:#cfd8e3}.msChip.sinv{background:#5a1a1a;color:#ffd5d5}',
 '.msDet{display:none;padding:0 12px 12px;border-top:1px solid var(--line2,#2a3340)}',
 '.msRow.open .msDet{display:block}',
 '.msCu{display:flex;align-items:center;gap:8px;margin:10px 0 6px;font-size:13px}',
 '.msCu label{flex:1;color:var(--mut,#9aa)}',
 '.msSheet input.msIn{width:120px;box-sizing:border-box;padding:9px 10px;border-radius:10px;border:1px solid var(--line2,#2a3340);background:var(--bg,#070b12);color:var(--txt,#fff);font-size:16px;margin:0}',
 '.msLeido{margin-top:8px;font-size:12px;line-height:1.45;color:var(--mut,#9aa);white-space:pre-wrap;word-break:break-word}',
 '.msLeido b{color:var(--txt,#fff)}',
 '.msErr{color:#ffb4b4}'
].join('\n');

var ST={of:null,mer:null,juegos:[],cuotas:{},cargando:false,leyo:0};
var AV_KEY='ova_mesa_av_v1', avPrimera=false;     /* «Cómo leerla» sale abierto solo la primera vez */
var sheet,lista,estado,fab;

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
  var ck=$('.clock',g)||$('.hora',g), htxt='';
  if(ck){ var cl=ck.cloneNode(true); $$('br',cl).forEach(function(b){ b.parentNode.replaceChild(doc.createTextNode(' · '),b); }); htxt=cl.textContent; }
  o={na:nm[0]||'?',nh:nm[1]||'?',hora:compactar(htxt),vs:'vs'};
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
 j.pk=g._pk; j.pit=g._pit; j.eq=g._eq?{a:g._eq.a&&g._eq.a.id,h:g._eq.h&&g._eq.h.id}:null;
 j.tabs=tabsDe(g);
 j.key=[APP,j.titulo,j.dia||fechaApp()].join('|');
 if(ST.of&&j.pk!=null&&ST.of.games[j.pk]){ j.of=oficialDe(ST.of.games[j.pk],j.pit,ST.of.tx,j.eq); }
 j.cuotaMia=ST.cuotas[j.key]||'';
 j.et=etiqueta(j.pf==null?null:j.pf,j.nivel,APP,j.vivo);
 if(j.pf!=null){
  if(ST.mer){
   j.mer=cruzarMercado(ST.mer.juegos,APP,o.na,o.nh);
   if(j.mer){ j.cmp=compararMercado(j.pa,j.ph,j.mer.a,j.mer.h); j.merEdad=ST.mer.edad; j.mix=mezclar(j.pa,j.ph,j.mer.a,j.mer.h);
    if(j.mix) j.et=etiqueta(j.mix.pf,j.nivel,APP,j.vivo);
    j.et=ajustarPorMercado(j.et,j.cmp); }
   else j.sinMer=true;
  }else j.sinMer=true;
 }
 if(j.of) j.et=ajustarPorOficial(j.et,j.of);
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
 if(j.pf!=null&&!j.vivo){
  if(j.cmp){
   var mc=j.cmp.k, mt=mc==='coinc'?'✔ Mercado de acuerdo · '+j.cmp.mer.toFixed(0)+'%':(mc==='cerca'?'≈ Mercado '+j.cmp.mer.toFixed(0)+'%':'⚠ Mercado '+j.cmp.mer.toFixed(0)+'% · chocan');
   if(j.cmp.favMod!==j.cmp.favMer&&j.mer) mt='⚠ Mercado prefiere a '+(j.cmp.favMer==='a'?j.na:j.nh)+' · '+Math.max(j.mer.a,j.mer.h).toFixed(0)+'%';
   tx.appendChild(mk('span','msChip m'+mc,mt));
  }else tx.appendChild(mk('span','msChip msin','sin dato del mercado'));
 }
 if(j.of&&!j.vivo){
  var of=j.of;
  if(of.camb.length) tx.appendChild(mk('span','msChip mchoca','⚠ Abridor cambió: '+of.camb.map(function(c){ return c.antes+' → '+(c.ahora||'por confirmar'); }).join(', ')));
  if(!of.empezo&&!of.malo) tx.appendChild(mk('span','msChip '+(of.lin.ok?'mcoinc':'mcerca'),of.lin.ok?'✔ Lineups confirmados':'⏳ Lineup pendiente'+(of.min!=null&&of.min<=90&&of.min>0?' · empieza en '+of.min+' min':'')));
  if(of.mov.length) tx.appendChild(mk('span','msChip mcerca','📋 '+of.mov.length+' mov. de lesionados'));
 }
 top.appendChild(tx);
 if(j.pf!=null){
  var pc=mk('div','msPc',(j.mix?j.mix.pf:j.pf).toFixed(0)+'%');
  subPct(j).forEach(function(t){ pc.appendChild(mk('small','',t)); });
  top.appendChild(pc);
 }
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
   var r=valorDe(j.pf,v,j.cmp?j.cmp.mer:null);
   if(!compactar(v)) return;
   if(!r){ res.appendChild(mk('div','msEst','No entendí esa cuota.')); return; }
   var ps=function(x){ return (x*100>=0?'+':'')+(x*100).toFixed(1)+'%'; };
   if(r.evM!=null){
    var ch=mk('span','msChip '+(r.k==='valor'?'valor':(r.k==='justo'?'justo':'sinv')),
     r.k==='valor'?'Valor real · paga más que el mercado ('+ps(r.evM)+')':(r.k==='justo'?'Casi justa vs mercado ('+ps(r.evM)+')':'Sin valor vs mercado ('+ps(r.evM)+')'));
    res.appendChild(ch);
    res.appendChild(mk('div','msEst','Contra el precio justo de Pinnacle ('+j.cmp.mer.toFixed(1)+'% → '+americana(j.cmp.mer/100)+'): '+ps(r.evM)+'. Con el modelo ('+j.pf.toFixed(1)+'%): '+ps(r.ev)+'.'+
     (r.soloModelo?' ⚠ Solo el modelo ve valor y el mercado no: casi siempre es error del modelo.':'')+(j.cmp.k==='choca'?' ⚠ Modelo y mercado chocan en este juego.':'')));
    return;
   }
   var pe=ps(r.ev);
   var ch2=mk('span','msChip '+(r.k==='valor'?'valor':(r.k==='justo'?'justo':'sinv')),
    r.k==='valor'?'Posible valor · EV '+pe:(r.k==='justo'?'Casi justa · EV '+pe:'Sin valor · EV '+pe));
   res.appendChild(ch2);
   res.appendChild(mk('div','msEst','Sin dato del mercado para este juego. Con '+j.pf.toFixed(1)+'% del modelo la cuota justa es '+americana(j.pf/100)+'. '+
    (r.k==='valor'?'Pide al menos +5%: por debajo casi siempre es ruido del modelo, y el mercado suele tener razón.':'Paga igual o menos que lo justo.')));
  }
  inp.addEventListener('input',calc); inp.addEventListener('click',function(e){ e.stopPropagation(); });
  cu.appendChild(inp); det.appendChild(cu); det.appendChild(res); calc();
 }
 if(j.of){ var ot=mk('div','msLeido'); ot.appendChild(mk('b','','Lo oficial (MLB):\n')); ot.appendChild(doc.createTextNode(textoOficial(j.of,j.na,j.nh,'ahora').replace(/^OFICIAL \(MLB StatsAPI, ahora\): /,'').split(' · ').join('\n'))); det.appendChild(ot); }
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
 var RK={cand:3,cuid:2,evit:1,sin:0,vivo:-1};
 function pun(j){ return j.pf==null?0:(j.mix?j.mix.pf:j.pf); }
 var js=ST.juegos.slice().sort(function(a,b){
  var d=(RK[b.et.k]||0)-(RK[a.et.k]||0); return d||(pun(b)-pun(a));
 });
 js.forEach(function(j,i){ lista.appendChild(nuevaFila(j,i+1)); });
 var c=js.filter(function(j){ return j.et.k==='cand'; }).length, ev=js.filter(function(j){ return j.et.k==='evit'; }).length;
 var cr=js.filter(function(j){ return j.mer; }).length, co=js.filter(function(j){ return j.cmp&&j.cmp.k==='coinc'; }).length, ch=js.filter(function(j){ return j.cmp&&j.cmp.k==='choca'; }).length;
 var ofn=js.filter(function(j){ return j.of; }).length, lp=js.filter(function(j){ return j.of&&!j.of.lin.ok&&!j.of.empezo; }).length, cb=js.filter(function(j){ return j.of&&j.of.camb.length; }).length;
 estado.textContent=resumenEstado({app:APP,n:js.length,c:c,ev:ev,cr:cr,co:co,ch:ch,ofn:ofn,lp:lp,cb:cb,tieneOf:!!ST.of,tieneMer:!!ST.mer,edad:ST.mer?ST.mer.edad:'',viejo:!!(ST.mer&&ST.mer.viejo)});
}
function diaMas(f,n){ try{ var t=new Date(f+'T12:00:00Z'); t.setUTCDate(t.getUTCDate()+n); return t.toISOString().slice(0,10); }catch(e){ return f; } }
function cargarOficial(){
 ST.of=null; if(APP!=='mlb') return Promise.resolve();
 var f=fechaApp(), base='https://statsapi.mlb.com/api/v1/';
 function J(u){ return root.fetch(u).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
 return Promise.all([
  J(base+'schedule?sportId=1&date='+f+'&hydrate=lineups,probablePitcher,team,weather'),
  J(base+'transactions?startDate='+diaMas(f,-1)+'&endDate='+f)
 ]).then(function(r){
  var sch=r[0], games={}, lista=[];
  if(!sch||!sch.dates) return;
  sch.dates.forEach(function(d){ (d.games||[]).forEach(function(g){ games[g.gamePk]=g; lista.push(g); }); });
  /* si el calendario no trae lineups, el boxscore los trae como orden al bate (solo juegos por empezar en las próximas 5 h) */
  var falta=lista.filter(function(g){
   var m=(Date.parse(g.gameDate)-Date.now())/60000;
   return !g.lineups&&g.status&&g.status.abstractGameState==='Preview'&&m<300;
  });
  return Promise.all(falta.map(function(g){
   return J(base+'game/'+g.gamePk+'/boxscore').then(function(b){
    var T=b&&b.teams; if(T&&T.away&&T.home) g._ord={a:(T.away.battingOrder||[]).length,h:(T.home.battingOrder||[]).length};
   });
  })).then(function(){
   ST.of={games:games,tx:(r[1]&&r[1].transactions)||[]};
  });
 }).catch(function(){});
}
var ARCH={mlb:'pinnacle-datos.json',fut:'pinnacle-futbol.json',nba:'pinnacle-nba.json'};
function cargarMercado(){
 ST.mer=null;
 try{
  return root.fetch(ARCH[APP]+'?v='+Date.now()).then(function(r){ return r.ok?r.json():null; }).then(function(j){
   if(j&&Array.isArray(j.juegos)){
    var m=j.generado?Math.max(0,Math.round((Date.now()-Date.parse(j.generado))/60000)):null;
    ST.mer={juegos:j.juegos,edad:m==null?'':(m<90?'hace '+m+' min':'hace '+Math.round(m/60)+' h'),viejo:m!=null&&m>=480};
   }
  }).catch(function(){});
 }catch(e){ return Promise.resolve(); }
}
function leer(){
 if(ST.cargando) return;
 ST.cargando=true;
 var gs=$$('.game');
 if(!gs.length){ estado.textContent='Primero carga los juegos (fecha / liga) y vuelve a abrir el Escáner.'; ST.cargando=false; return; }
 estado.textContent='Leyendo '+gs.length+' juegos…';
 try{ ST.cuotas=JSON.parse(ls('ova_mesa_cu_'+APP+'_'+fechaApp())||'{}')||{}; }catch(e){ ST.cuotas={}; }
 Promise.all([cargarMercado(),cargarOficial(),cargarTodo(function(h,t){ estado.textContent='Leyendo juego '+h+' de '+t+'…'; }).catch(function(){})]).then(function(){
  ST.juegos=$$('.game').map(leerJuego);
  ST.cargando=false; pintarLista();
 });
}

function abrir(){
 sheet.classList.add('on'); sheet.scrollTop=0; fab.style.display='none';
 if(avPrimera){ ls(AV_KEY,'1'); avPrimera=false; }     /* ya la vio: la próxima vez sale cerrada */
 leer();
}
function cerrar(){ sheet.classList.remove('on'); fab.style.display=''; }

/* La barra va dentro de la lista de juegos (arriba de las tarjetas), no flotando encima del texto. */
function colocar(){
 var lista=doc.getElementById('slate')||doc.getElementById('juegos');
 if(lista&&lista.parentNode){ lista.parentNode.insertBefore(fab,lista); return; }
 doc.body.appendChild(fab);
}
function armar(){
 if($('.msBarra')) return;
 APP=appActual();
 var s=mk('style'); s.id='msCss'; s.textContent=CSS; (doc.head||doc.documentElement).appendChild(s);
 fab=boton('msBarra','',abrir); fab.appendChild(mk('b','','🔍'));
 var tx=mk('div'); tx.appendChild(doc.createTextNode('Escáner del día')); tx.appendChild(mk('span','','Analiza todos los juegos: ordena, filtra y calcula el valor con tu cuota'));
 fab.appendChild(tx); fab.setAttribute('aria-label','Abrir el Escáner del día');
 colocar();
 sheet=mk('div','msSheet'); sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-label','Escáner de hoy');
 var bar=mk('div','msBar'); var h=mk('h2','','Escáner de hoy'); h.appendChild(mk('small','',({mlb:'MLB',fut:'Fútbol',nba:'NBA'})[APP]+' · lee todos los juegos y todas las pestañas'));
 bar.appendChild(h); bar.appendChild(boton('msX','✕ Cerrar',cerrar)); sheet.appendChild(bar);
 /* «Cómo leerla»: abierto la primera vez, después queda cerrado y se abre con un toque (en el iPhone ocupaba media pantalla) */
 avPrimera=ls(AV_KEY)!=='1';
 var av=mk('div','msAviso'+(avPrimera?' on':''));
 var avH=boton('msAvH','',function(){
  var on=av.classList.toggle('on'); avH.textContent=(on?'▾':'▸')+' Cómo leerla'; avH.setAttribute('aria-expanded',String(on));
 });
 avH.textContent=(avPrimera?'▾':'▸')+' Cómo leerla'; avH.setAttribute('aria-expanded',String(avPrimera));
 av.appendChild(avH);
 av.appendChild(mk('div','msAvB','Junta lo que la app calculó con el mercado'+(APP==='mlb'?' y los datos oficiales de MLB':'')+'. El porcentaje que ve es una mezcla mitad modelo, mitad mercado (en más de 11 000 juegos acertó más que el modelo solo). Si un juego no tiene mercado, el número es solo del modelo y lo dice debajo del porcentaje. Si el modelo y el mercado eligen favoritos distintos, no se juega. No crea ventaja por sí sola: úsala para descartar y confirmar, no como garantía.'));
 sheet.appendChild(av);
 estado=mk('div','msEst',''); sheet.appendChild(estado);
 sheet.appendChild(boton('msMini','↻ Volver a leer',function(){ leer(); }));
 lista=mk('div',''); sheet.appendChild(lista);
 var reg=resumenRegistro(APP,function(k){ return ls(k); });
 if(reg) sheet.appendChild(mk('div','msEst','Tu registro en esta app: '+reg+'.'));
 doc.body.appendChild(sheet);
}
function arrancar(){ try{ armar(); }catch(e){ if(root.console) root.console.error('asistente',e); } }
if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',arrancar); else arrancar();
})(typeof window!=='undefined'?window:globalThis);
