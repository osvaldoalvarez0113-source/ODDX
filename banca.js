/* banca.js · control de banca de OVA (MLB, fútbol y NBA comparten este registro).
   Guarda lo que APUESTAS (no lo que la app sugiere) y avisa cuando te acercas o pasas el tope que tú mismo pusiste.
   No cambia ningún cálculo ni ningún pick: solo lee y escribe la clave 'ova_banca_v1' de este teléfono.
   Lo carga herramientas.html (pantalla completa) y las demás páginas (solo el aviso de arriba). */
(function(root){
'use strict';
var KEY='ova_banca_v1';
var AVISO_CERCA=0.8;                       /* a partir del 80% del tope sale el aviso ámbar */

function pad2(n){ return (n<10?'0':'')+n; }
function ymd(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function num(x){ var n=parseFloat(String(x==null?'':x).replace(/[\s,$]/g,'').replace(',','.')); return isFinite(n)?n:null; }

/* ---------- datos ---------- */
function vacio(){ return {inicial:null, topes:{dia:null,sem:null,mes:null}, movs:[]}; }
function leer(ls){
  var o=vacio();
  try{
    var j=JSON.parse((ls||root.localStorage).getItem(KEY)||'null');
    if(j&&typeof j==='object'){
      o.inicial=num(j.inicial);
      var t=j.topes||{}; o.topes={dia:num(t.dia),sem:num(t.sem),mes:num(t.mes)};
      if(Array.isArray(j.movs)) o.movs=j.movs.filter(function(m){ return m&&isFinite(+m.t)&&num(m.monto)>0; })
        .map(function(m){ return {id:String(m.id||m.t),t:+m.t,monto:num(m.monto),nota:String(m.nota||'').slice(0,60),neto:(m.neto==null||m.neto==='')?null:num(m.neto)}; });
    }
  }catch(e){}
  return o;
}
function escribir(o,ls){
  try{ (ls||root.localStorage).setItem(KEY,JSON.stringify(o)); return true; }catch(e){ return false; }
}
function agregar(o,monto,nota,t){
  var m=num(monto); if(!(m>0)) return null;
  var mov={id:'b'+(t||Date.now())+Math.floor(Math.random()*1000),t:t||Date.now(),monto:m,nota:String(nota||'').slice(0,60),neto:null};
  o.movs.push(mov); return mov;
}
function borrar(o,id){ o.movs=o.movs.filter(function(m){ return m.id!==id; }); }
function resultado(o,id,neto){ o.movs.forEach(function(m){ if(m.id===id) m.neto=(neto==null||neto==='')?null:num(neto); }); }

/* ---------- periodos (hora local del teléfono; la semana empieza el lunes) ---------- */
function inicios(ahora){
  var d=new Date(ahora||Date.now());
  var dia=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var dow=(dia.getDay()+6)%7;                        /* lunes = 0 */
  var sem=new Date(dia.getFullYear(),dia.getMonth(),dia.getDate()-dow);
  var mes=new Date(d.getFullYear(),d.getMonth(),1);
  return {dia:dia.getTime(),sem:sem.getTime(),mes:mes.getTime()};
}
function totales(o,ahora){
  var I=inicios(ahora), r={dia:0,sem:0,mes:0,netoMes:0,netoTodo:0,nDia:0};
  o.movs.forEach(function(m){
    if(m.t>=I.dia){ r.dia+=m.monto; r.nDia++; }
    if(m.t>=I.sem) r.sem+=m.monto;
    if(m.t>=I.mes){ r.mes+=m.monto; if(m.neto!=null) r.netoMes+=m.neto; }
    if(m.neto!=null) r.netoTodo+=m.neto;
  });
  return r;
}
/* 'sin' = no pusiste tope; 'ok'; 'cerca' = 80% o más; 'pasado' = ya llegaste o te pasaste */
function estado(total,tope){
  if(!(tope>0)) return 'sin';
  if(total>=tope) return 'pasado';
  if(total>=tope*AVISO_CERCA) return 'cerca';
  return 'ok';
}
function estados(o,ahora){
  var t=totales(o,ahora);
  return {dia:estado(t.dia,o.topes.dia), sem:estado(t.sem,o.topes.sem), mes:estado(t.mes,o.topes.mes), tot:t};
}
/* el peor estado de los tres, con el texto que se le muestra a la persona */
function aviso(o,ahora){
  var e=estados(o,ahora), nom={dia:'de hoy',sem:'de la semana',mes:'del mes'}, orden={pasado:2,cerca:1,ok:0,sin:0};
  var peor=null;
  ['dia','sem','mes'].forEach(function(k){
    if(orden[e[k]]>0 && (!peor||orden[e[k]]>orden[peor.nivel])) peor={k:k,nivel:e[k]};
  });
  if(!peor) return null;
  var k=peor.k, tope=o.topes[k], tot=e.tot[k];
  return {nivel:peor.nivel, periodo:k,
    texto: peor.nivel==='pasado'
      ? 'Llegaste al tope '+nom[k]+': llevas $'+tot.toFixed(0)+' de $'+tope.toFixed(0)+'. Ya no apuestes más por hoy.'
      : 'Vas en $'+tot.toFixed(0)+' de tu tope '+nom[k]+' ($'+tope.toFixed(0)+'). Te queda $'+Math.max(0,tope-tot).toFixed(0)+'.'};
}
function bancaActual(o){
  if(o.inicial==null) return null;
  return o.inicial+totales(o).netoTodo;
}

/* ---------- aviso de arriba en las demás páginas ---------- */
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function pintarAviso(){
  try{
    var d=root.document; if(!d||!d.body) return;
    var viejo=d.getElementById('ovaBancaAviso'); if(viejo) viejo.parentNode.removeChild(viejo);
    if(/herramientas\.html/.test(root.location.pathname||'')) return;       /* ahí ya se ve todo */
    var a=aviso(leer()); if(!a) return;
    var clave='ova_banca_cerrado_'+a.nivel+'_'+a.periodo+'_'+ymd(new Date());
    try{ if(root.sessionStorage.getItem(clave)) return; }catch(e){}
    var b=d.createElement('div'); b.id='ovaBancaAviso'; b.setAttribute('role','status');
    var rojo=a.nivel==='pasado';
    b.style.cssText='position:relative;z-index:50;margin:0;padding:9px 40px 9px 14px;font:600 13px/1.35 -apple-system,system-ui,sans-serif;'+
      'color:'+(rojo?'#FFE4E0':'#FFF1CF')+';background:'+(rojo?'#7A1D14':'#6B4A06')+';border-bottom:1px solid '+(rojo?'#C2362A':'#C99422');
    var t=d.createElement('span'); t.textContent='💰 '+a.texto+' '; b.appendChild(t);
    var l=d.createElement('a'); l.href='herramientas.html#banca'; l.textContent='Ver banca'; l.style.cssText='color:inherit;text-decoration:underline'; b.appendChild(l);
    var x=d.createElement('button'); x.type='button'; x.textContent='×'; x.setAttribute('aria-label','Cerrar aviso');
    x.style.cssText='position:absolute;right:6px;top:3px;background:none;border:0;color:inherit;font-size:22px;line-height:1;padding:4px 10px;cursor:pointer';
    x.addEventListener('click',function(){ try{ root.sessionStorage.setItem(clave,'1'); }catch(e){} if(b.parentNode) b.parentNode.removeChild(b); });
    b.appendChild(x);
    d.body.insertBefore(b,d.body.firstChild);
  }catch(e){}
}
function init(){ pintarAviso(); try{ root.addEventListener('storage',function(e){ if(e.key===KEY) pintarAviso(); }); }catch(e){} }

var API={KEY:KEY,leer:leer,escribir:escribir,agregar:agregar,borrar:borrar,resultado:resultado,inicios:inicios,totales:totales,
  estado:estado,estados:estados,aviso:aviso,bancaActual:bancaActual,pintarAviso:pintarAviso,num:num,ymd:ymd,esc:esc,AVISO_CERCA:AVISO_CERCA};
root.OVABanca=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
else if(root.document){
  if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',init); else init();
}
})(typeof window!=='undefined'?window:globalThis);
