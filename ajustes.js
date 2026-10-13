/* OVA · Ajustes organizado (MLB)
   En vez de una lista larga hacia abajo, Ajustes es un menú de botones. Cada botón abre su propia ventana
   (con «‹ Ajustes» para volver): Apariencia (diseño de adentro + tema de color), Modelo y apuestas,
   Cálculo a mano y Cómo funciona. NO borra ni recrea nada: mueve los bloques que ya existen (con sus
   botones, casillas y funciones) a su ventana, así que ningún cálculo ni ajuste cambia.
   Fútbol y NBA ya tienen Ajustes corto; ahí Apariencia es la hoja 🎨 (con pestañas Diseño / Tema). */
(function(root){
"use strict";
var doc=root.document;
if(!doc) return;
function $(s,r){ return (r||doc).querySelector(s); }
function $$(s,r){ return [].slice.call((r||doc).querySelectorAll(s)); }
function mk(tag,cls,txt){ var e=doc.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }

var CSS=[
 '.ajMenu{display:flex;flex-direction:column;gap:10px;margin:14px 0 8px}',
 '.ajRow{display:flex;box-sizing:border-box;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 14px;border-radius:var(--r2,18px);border:1px solid var(--line2,#2a3340);background:var(--bg1,#0d1420);color:var(--txt,#fff);font-family:inherit;cursor:pointer;min-height:64px;-webkit-tap-highlight-color:transparent}',
 '.ajRow:active{transform:scale(.985)}',
 '.ajRow .ic{flex:0 0 42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--bg3,#1b2535)}',
 '.ajRow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
 '.ajRow .tx b{font-size:16px;font-weight:700;line-height:1.15}',
 '.ajRow .tx span{font-size:12.5px;font-weight:400;color:var(--mut,#9aa);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.ajRow .go{flex:0 0 auto;font-size:22px;color:var(--mut,#9aa)}',
 '.ajWin{display:none;position:fixed;inset:0;z-index:90;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg,#070b12);color:var(--txt,#fff);padding:0 14px calc(40px + env(safe-area-inset-bottom,0px))}',
 '.ajWin.on{display:block;animation:ajIn .22s cubic-bezier(.22,.7,.3,1)}',
 '@keyframes ajIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}',
 '.ajBar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -14px 8px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:var(--bg,#070b12);border-bottom:1px solid var(--line2,#2a3340)}',
 '.ajBack{display:inline-flex;align-items:center;border:0;background:var(--bg2,#131c2a);border-radius:99px;padding:9px 14px;font:700 14px system-ui,-apple-system,sans-serif;color:var(--hot,#fbbf24);cursor:pointer;min-height:40px;-webkit-tap-highlight-color:transparent}',
 '.ajBar h2{margin:0;font-size:19px;font-weight:700;font-family:var(--cond,inherit)}',
 '.ajWin>.manual{margin-top:8px;border-top:0;padding-top:4px}',
 '.ajWin .ovaApar{padding-top:6px}',
 '.ajWin .ovaApar>h2,.ajWin .ovaApar>p{display:none}',
 '.ajWin>details.ajustes{margin-top:6px}',
 '.ajWin>footer{margin-top:10px}'
].join('\n');
function css(){
 if($('#ajCss')) return;
 var s=mk('style'); s.id='ajCss'; s.textContent=CSS; (doc.head||doc.documentElement).appendChild(s);
}

function nombreDiseno(){
 var I=root.OVAInterior; if(!I||!I.actual||!I.UIS) return '';
 var id=I.actual(), n='';
 I.UIS.forEach(function(u){ if(u.id===id) n=u.n; });
 return n;
}
function nombreTema(){
 var S=root.OVASkins; if(!S||!S.get||!S.list) return '';
 var id=S.get(), n='';
 S.list.forEach(function(x){ if(x.id===id) n=x.n; });
 return n;
}

function armar(pa){
 if($('.ajMenu',pa)) return true;
 var ap=$('.ovaApar',pa), aj=$('details.ajustes',pa), man=$('.manual',pa), foot=$('footer',pa);
 if(!ap||!aj||!man) return false;                   /* todavía no están todos: se reintenta */
 var hero=$('header.hero',pa);
 css();
 var menu=mk('div','ajMenu'), ventanas=[];
 function ventana(clave,icono,titulo,sub,bloques,subFn){
  var w=mk('div','ajWin'); w.setAttribute('data-aj',clave);
  var bar=mk('div','ajBar'), back=mk('div','ajBack','‹ Ajustes'); back.setAttribute('role','button'); back.tabIndex=0;
  bar.appendChild(back); bar.appendChild(mk('h2','',icono+' '+titulo)); w.appendChild(bar);
  bloques.forEach(function(b){ if(b) w.appendChild(b); });
  var row=mk('div','ajRow'); row.setAttribute('role','button'); row.tabIndex=0;
  row.innerHTML='<span class="ic"></span><span class="tx"><b></b><span></span></span><span class="go">›</span>';
  row.querySelector('.ic').textContent=icono; row.querySelector('b').textContent=titulo;
  var sp=row.querySelector('.tx span'); sp.textContent=sub;
  function pon(){ if(subFn){ var t=subFn(); if(t) sp.textContent=t; } }
  function abrir(){ cerrar(); pon(); w.classList.add('on'); w.scrollTop=0; if(root.OVASkins&&root.OVASkins.marcar) try{ root.OVASkins.marcar(); }catch(e){} }
  row.addEventListener('click',abrir);
  function tecla(f){ return function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); f(); } }; }
  row.addEventListener('keydown',tecla(abrir));
  back.addEventListener('click',function(){ w.classList.remove('on'); pon(); root.scrollTo(0,0); });
  w.addEventListener('click',function(){ root.setTimeout(pon,0); });
  menu.appendChild(row); pa.appendChild(w); ventanas.push(w); pon();
  return w;
 }
 function cerrar(){ ventanas.forEach(function(w){ w.classList.remove('on'); }); }
 ventana('apariencia','🎨','Apariencia','Diseño de adentro y tema de color',[ap],function(){
  var d=nombreDiseno(), t=nombreTema();
  return (d?'Diseño: '+d:'')+(d&&t?' · ':'')+(t?'Tema: '+t:'');
 });
 ventana('modelo','⚙️','Modelo y apuestas','Dónde apuestas, banca, multiplicadores y ERA del abridor',[aj]);
 ventana('manual','✏️','Cálculo a mano','Si la API falla, mete tus seis números',[man]);
 ventana('nota','📖','Cómo funciona','Datos, fuentes y nota técnica',[hero,foot]);
 /* el menú va justo debajo de la tarjeta de versión (o arriba si todavía no existe) */
 var tarj=$('.dsCard',pa);
 pa.insertBefore(menu,tarj?tarj.nextSibling:pa.firstChild);
 /* al cambiar de pestaña de abajo, las ventanas se cierran */
 $$('.navbar button').forEach(function(b){ b.addEventListener('click',cerrar); });
 var det=$('details',foot||doc); if(det&&foot){ /* la nota técnica ya viene abierta dentro de su ventana */ try{ det.open=true; }catch(e){} }
 return true;
}

function arrancar(){
 var pa=$('#pane-ajustes'); if(!pa) return;
 function intento(){ try{ armar(pa); }catch(e){ if(root.console) root.console.error('ajustes',e); } }
 function listo(){ [0,300,800,1800,3500,6000].forEach(function(ms){ root.setTimeout(intento,ms); }); }
 if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={css:CSS,armar:armar};
root.OVAAjustes=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else { try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
