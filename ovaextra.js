/* OVA · extras v1
   1) RESPALDO que sobrevive: copia automática de tus picks en IndexedDB (aparte de localStorage), con
      aviso para restaurar si Safari te borra el registro, y exportar/importar de un toque.
   2) HOY: resumen compartido para el hub (pendientes, récord, favoritos que cada app calculó).
   3) Registro del service worker (la app abre aunque no haya internet).
   No toca ningún cálculo de ninguna app. Todo va en try/catch: si algo falla, las apps siguen igual. */
(function(root){
"use strict";

var REG_KEYS={mlb:'ventaja_picks_v1', fut:'ova_futbol_registro_v1', nba:'ova_nba_registro_v1'};
var KEYS=['ventaja_picks_v1','ova_futbol_registro_v1','ova_futbol_combinada_v1','ova_futbol_params_v1',
  'ova_futbol_veredictos_v2','ova_nba_registro_v1','ova_nba_comb_v1','ova_nba_params_v1','ova_nba_ver_v1','ova_skin'];
/* estas son listas de objetos con id: se mezclan sin duplicar. Lo demas solo se pone si falta. */
var MERGE={ventaja_picks_v1:1,ova_futbol_registro_v1:1,ova_futbol_combinada_v1:1,ova_nba_registro_v1:1,ova_nba_comb_v1:1};

function jparse(s){ try{ return JSON.parse(s); }catch(e){ return null; } }
function pad2(n){ return (n<10?'0':'')+n; }
function hoyLocal(d){ d=d||new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }

/* ===================== 1. RESPALDO ===================== */
var STORE=null;
function idbStore(){
  if(!root.indexedDB) return null;
  var dbp=null;
  function open(){
    if(dbp) return dbp;
    dbp=new Promise(function(res,rej){
      var r=root.indexedDB.open('ova_respaldo',1);
      r.onupgradeneeded=function(){ r.result.createObjectStore('snap'); };
      r.onsuccess=function(){ res(r.result); };
      r.onerror=function(){ rej(r.error); };
    });
    return dbp;
  }
  return {
    get:function(k){ return open().then(function(db){ return new Promise(function(res,rej){
      var q=db.transaction('snap','readonly').objectStore('snap').get(k);
      q.onsuccess=function(){ res(q.result===undefined?null:q.result); }; q.onerror=function(){ rej(q.error); }; }); }); },
    put:function(k,v){ return open().then(function(db){ return new Promise(function(res,rej){
      var tx=db.transaction('snap','readwrite'); tx.objectStore('snap').put(v,k);
      tx.oncomplete=function(){ res(true); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
  };
}
function getStore(){ if(STORE===null){ try{ STORE=idbStore()||false; }catch(e){ STORE=false; } } return STORE||null; }

function tomar(ls){
  var d={};
  KEYS.forEach(function(k){ var v=ls.getItem(k); if(v!=null && v!=='') d[k]=v; });
  return d;
}
function contarPicks(datos){
  var n=0;
  Object.keys(REG_KEYS).forEach(function(a){
    var arr=jparse(datos[REG_KEYS[a]]); if(Array.isArray(arr)) n+=arr.length;
  });
  return n;
}

/* Copia en IndexedDB. Regla de oro: una copia con picks NUNCA se pisa con una vacia
   (eso es justo lo que pasa cuando Safari borra localStorage), salvo que tu lo hayas aceptado. */
function snapshot(ls){
  var st=getStore(); if(!st) return Promise.resolve({estado:'sin-almacen'});
  var d=tomar(ls), n=contarPicks(d), json=JSON.stringify(d);
  return Promise.all([st.get('ultimo'),st.get('ignorado')]).then(function(r){
    var prev=r[0], ign=r[1];
    if(prev && prev.json===json) return {estado:'igual',picks:n};
    if(prev && prev.picks>0 && n===0 && ign!==prev.t) return {estado:'protegido',picks:prev.picks};
    var p=Promise.resolve();
    if(prev && prev.picks>0 && prev.picks!==n) p=st.put('previo',prev);
    return p.then(function(){ return st.put('ultimo',{t:Date.now(),picks:n,json:json}); })
            .then(function(){ return {estado:'guardado',picks:n}; });
  }).catch(function(){ return {estado:'error'}; });
}
function necesitaRestaurar(ls){
  var st=getStore(); if(!st) return Promise.resolve(null);
  if(contarPicks(tomar(ls))>0) return Promise.resolve(null);
  return Promise.all([st.get('ultimo'),st.get('ignorado')]).then(function(r){
    var s=r[0];
    return (s && s.picks>0 && r[1]!==s.t) ? {t:s.t,picks:s.picks} : null;
  }).catch(function(){ return null; });
}
function estado(ls){
  var st=getStore(); if(!st) return Promise.resolve(null);
  return st.get('ultimo').then(function(s){ return s?{t:s.t,picks:s.picks}:null; }).catch(function(){ return null; });
}
function ignorar(){
  var st=getStore(); if(!st) return Promise.resolve();
  return st.get('ultimo').then(function(s){ return s?st.put('ignorado',s.t):null; }).catch(function(){});
}

/* aplica un objeto {clave: texto} sobre localStorage. Devuelve cuantos picks/filas nuevas entraron. */
function aplicar(datos, ls){
  var nuevos=0;
  Object.keys(datos||{}).forEach(function(k){
    if(KEYS.indexOf(k)<0) return;
    var raw=datos[k]; if(raw==null||raw==='') return;
    if(MERGE[k]){
      var cur=jparse(ls.getItem(k)); if(!Array.isArray(cur)) cur=[];
      var inc=jparse(raw); if(!Array.isArray(inc)) return;
      var ids={}, vistos={};
      cur.forEach(function(x){ if(x&&x.id) ids[x.id]=1; else vistos[JSON.stringify(x)]=1; });
      inc.forEach(function(x){
        if(!x) return;
        if(x.id){ if(!ids[x.id]){ cur.push(x); ids[x.id]=1; nuevos++; } }
        else { var s=JSON.stringify(x); if(!vistos[s]){ cur.push(x); vistos[s]=1; nuevos++; } }
      });
      ls.setItem(k,JSON.stringify(cur));
    }else if(ls.getItem(k)==null){
      ls.setItem(k,raw);
    }
  });
  return nuevos;
}
function restaurarSnapshot(ls){
  var st=getStore(); if(!st) return Promise.reject(new Error('sin almacen'));
  return st.get('ultimo').then(function(s){
    if(!s) throw new Error('no hay copia');
    return aplicar(jparse(s.json)||{},ls);
  });
}
function exportar(ls){
  return JSON.stringify({app:'ova-todo',v:1,fecha:new Date().toISOString(),datos:tomar(ls)});
}
/* acepta el formato nuevo y tambien los respaldos viejos de cada app */
function importar(texto, ls){
  var d=jparse(String(texto||'').trim());
  if(d===null) throw new Error('ese texto no es un respaldo');
  var datos=null;
  if(Array.isArray(d)){ datos={ventaja_picks_v1:JSON.stringify(d)}; }
  else if(d && d.app==='ova-todo' && d.datos){ datos=d.datos; }
  else if(d && d.app==='ova-nba'){
    datos={ova_nba_registro_v1:JSON.stringify(d.registro||[]),ova_nba_comb_v1:JSON.stringify(d.combinada||[])};
    if(d.params) datos.ova_nba_params_v1=JSON.stringify(d.params);
  }else if(d && d.app==='ova-futbol'){
    datos={ova_futbol_registro_v1:JSON.stringify(d.registro||[]),ova_futbol_combinada_v1:JSON.stringify(d.combinada||[])};
    if(d.params) datos.ova_futbol_params_v1=JSON.stringify(d.params);
  }
  if(!datos) throw new Error('formato no reconocido');
  return aplicar(datos,ls);
}
function compartir(ls){
  var txt=exportar(ls), name='ova-respaldo-'+hoyLocal()+'.json', nav=root.navigator||{};
  try{
    if(root.File && nav.canShare && nav.share){
      var f=new root.File([txt],name,{type:'application/json'});
      if(nav.canShare({files:[f]})){
        return nav.share({files:[f],title:'Respaldo OVA'}).then(
          function(){ return {via:'compartir',txt:txt}; },
          function(e){ if(e&&e.name==='AbortError') return {via:'cancelado',txt:txt}; return {via:'texto',txt:txt}; });
      }
    }
  }catch(e){}
  if(nav.clipboard && nav.clipboard.writeText){
    return nav.clipboard.writeText(txt).then(function(){ return {via:'portapapeles',txt:txt}; },function(){ return {via:'texto',txt:txt}; });
  }
  return Promise.resolve({via:'texto',txt:txt});
}

function banner(info){
  try{
    var doc=root.document; if(!doc||!doc.body||doc.getElementById('ovaRestBanner')) return;
    var f=new Date(info.t), cuando=pad2(f.getDate())+'/'+pad2(f.getMonth()+1)+' '+pad2(f.getHours())+':'+pad2(f.getMinutes());
    var d=doc.createElement('div'); d.id='ovaRestBanner';
    d.style.cssText='position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483000;'+
      'background:#2A1A19;color:#F1F5FB;border:1px solid #F87171;border-radius:14px;padding:12px 14px;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.6)';
    d.innerHTML='<b style="color:#F87171">Tus picks se borraron de este navegador.</b><br>Tengo una copia del '+cuando+' con '+info.picks+
      ' picks. <div style="margin-top:9px;display:flex;gap:8px"><button id="ovaRestSi" style="flex:1;padding:10px;border:0;border-radius:10px;background:#34D399;color:#04140C;font-weight:700;font-size:14px">Restaurar</button>'+
      '<button id="ovaRestNo" style="flex:1;padding:10px;border:1px solid #6D8299;border-radius:10px;background:transparent;color:#9DB2C8;font-size:14px">Ignorar</button></div>';
    doc.body.appendChild(d);
    doc.getElementById('ovaRestSi').onclick=function(){
      restaurarSnapshot(root.localStorage).then(function(n){ d.innerHTML='<b style="color:#34D399">Listo: '+n+' registros restaurados.</b> Recargando…'; setTimeout(function(){ root.location.reload(); },900); },
        function(){ d.innerHTML='No se pudo restaurar. Prueba desde el inicio → Respaldo.'; });
    };
    doc.getElementById('ovaRestNo').onclick=function(){ ignorar().then(function(){ if(d.parentNode) d.parentNode.removeChild(d); }); };
  }catch(e){}
}

var RESP={KEYS:KEYS,tomar:tomar,contarPicks:contarPicks,snapshot:snapshot,necesitaRestaurar:necesitaRestaurar,estado:estado,ignorar:ignorar,
  aplicar:aplicar,restaurarSnapshot:restaurarSnapshot,exportar:exportar,importar:importar,compartir:compartir,
  _setStore:function(s){ STORE=s; }};

/* ===================== 2. HOY ===================== */
function decB(a){ /* ganancia por 1 unidad con cuota americana */
  a=parseFloat(String(a==null?'':a).replace(/[\u2212\u2012-\u2015]/g,'-').replace(/[\s,]/g,''));
  if(!isFinite(a)||a===0) return null;
  return a>0?a/100:100/(-a);
}
function pagoMlb(p){
  if(p.plat==='kalshi'){
    var c=parseFloat(String(p.am)); if(!isFinite(c)) return null;
    if(c>=1&&c<100) c=c/100;
    if(!(c>0&&c<1)) return null;
    return {b:(1-c)/c,fee:0.07*(1-c)};
  }
  var b=decB(p.am); return b==null?null:{b:b,fee:0};
}
function nuevoRec(){ return {g:0,p:0,e:0,pend:0,u:0,n:0}; }
function publicar(app, items, extra){
  try{
    root.localStorage.setItem('ova_hoy_'+app,JSON.stringify({t:Date.now(),fecha:hoyLocal(),dia:(extra&&extra.dia)||null,items:(items||[]).slice(0,15)}));
  }catch(e){}
}
function resumen(ls, ahora){
  ahora=ahora||Date.now();
  var out={pend:[],rec:{mlb:nuevoRec(),fut:nuevoRec(),nba:nuevoRec()},apps:{},tops:[]};
  function cuenta(app,estadoRes,u){
    var r=out.rec[app]; r.n++;
    if(estadoRes==='G'){ r.g++; if(u!=null) r.u+=u; }
    else if(estadoRes==='P'){ r.p++; if(u!=null) r.u+=u; }
    else if(estadoRes==='E'){ r.e++; if(u!=null) r.u+=u; }
    else r.pend++;
  }
  (jparse(ls.getItem(REG_KEYS.mlb))||[]).forEach(function(p){
    if(!p) return;
    var pg=pagoMlb(p), u=null;
    if(p.res==='G') u=pg?pg.b-pg.fee:null; else if(p.res==='P') u=-(1+(pg?pg.fee:0)); else if(p.res==='E') u=-(pg?pg.fee:0);
    cuenta('mlb',p.res||null,u);
    if(!p.res) out.pend.push({app:'mlb',juego:p.juego||'',sel:p.m||'',cuota:p.am!=null?(p.plat==='kalshi'?p.am+'¢':String(p.am)):'',cuando:p.f||''});
  });
  (jparse(ls.getItem(REG_KEYS.fut))||[]).forEach(function(p){
    if(!p) return;
    var res=p.estado==='ganado'?'G':(p.estado==='perdido'?'P':null), u=null;
    if(res==='G'){ var b=decB(p.cuota); u=b==null?null:b; } else if(res==='P') u=-1;
    cuenta('fut',res,u);
    if(!res) out.pend.push({app:'fut',juego:(p.local||'')+' vs '+(p.visita||''),sel:p.seleccion||'',cuota:p.cuota!=null?String(p.cuota):'',cuando:p.fecha||''});
  });
  (jparse(ls.getItem(REG_KEYS.nba))||[]).forEach(function(p){
    if(!p) return;
    var res=p.estado==='ganado'?'G':(p.estado==='perdido'?'P':(p.estado==='push'?'E':null)), u=null;
    if(res==='G'){ var b=decB(p.cuota); u=b==null?null:b; } else if(res==='P') u=-1; else if(res==='E') u=0;
    cuenta('nba',res,u);
    if(!res){ var dt=p.ts?new Date(p.ts):null;
      out.pend.push({app:'nba',juego:(p.aN||'')+' @ '+(p.hN||''),sel:p.seleccion||'',cuota:p.cuota!=null?String(p.cuota):'',cuando:dt?hoyLocal(dt):''}); }
  });
  /* dos picks del mismo juego no son dos apuestas: comparten el mismo resultado de fondo */
  var cont={};
  out.pend.forEach(function(x){ var k=x.app+'|'+x.juego; cont[k]=(cont[k]||0)+1; });
  out.pend.forEach(function(x){ x.corr=cont[x.app+'|'+x.juego]>1; });
  out.pend.sort(function(a,b){ return a.cuando<b.cuando?-1:(a.cuando>b.cuando?1:0); });
  var hoy=hoyLocal(new Date(ahora)), pool=[];
  ['mlb','fut','nba'].forEach(function(app){
    var s=jparse(ls.getItem('ova_hoy_'+app));
    if(!s||!Array.isArray(s.items)) return;
    var edadH=(ahora-s.t)/3600000, vigente=(s.fecha===hoy && edadH<12);
    out.apps[app]={t:s.t,edadH:edadH,vigente:vigente,items:s.items};
    if(vigente) s.items.forEach(function(it){ pool.push({app:app,n:it.n,p:+it.p,sub:it.sub||''}); });
  });
  pool.sort(function(a,b){ return b.p-a.p; });
  out.tops=pool.slice(0,6);
  return out;
}
var HOY={publicar:publicar,resumen:resumen,hoyLocal:hoyLocal};

/* ===================== 3. arranque ===================== */
function init(){
  try{ if(root.navigator && root.navigator.storage && root.navigator.storage.persist) root.navigator.storage.persist(); }catch(e){}
  try{
    if(root.navigator && 'serviceWorker' in root.navigator && /^https?:$/.test(root.location.protocol))
      root.navigator.serviceWorker.register('sw.js').catch(function(){});
  }catch(e){}
  setTimeout(function(){
    try{
      necesitaRestaurar(root.localStorage).then(function(info){ if(info) banner(info); });
      snapshot(root.localStorage);
    }catch(e){}
  },2500);
  try{
    setInterval(function(){ try{ snapshot(root.localStorage); }catch(e){} },30000);
    root.document.addEventListener('visibilitychange',function(){ if(root.document.hidden){ try{ snapshot(root.localStorage); }catch(e){} } });
  }catch(e){}
}

root.OVARespaldo=RESP; root.OVAHoy=HOY;
if(typeof module!=='undefined' && module.exports){ module.exports={OVARespaldo:RESP,OVAHoy:HOY}; }
else if(root.document){
  if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',init); else init();
}
})(typeof window!=='undefined'?window:globalThis);
