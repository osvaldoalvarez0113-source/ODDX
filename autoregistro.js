/* OVA · Registro automático (MLB, fútbol y NBA) — window.OVARegAuto
   Para medir de verdad si la app sirve hace falta una lista larga, sin huecos y sin trampa. Esta pieza la arma sola:
   1) GUARDA cada juego ANTES de que empiece (nunca después): lo que dijo el modelo y lo que decía el mercado
      (Pinnacle sin margen, el archivo pinnacle-*.json). Guarda TODOS los juegos, no solo los «candidatos», porque lo que
      más se necesita saber es cuándo el modelo y el mercado discrepan y quién tiene la razón.
   2) RESUELVE solo, con el resultado final de ESPN, unas 3 horas después de que empieza el juego.
   3) RESUME (pantalla Herramientas → 🤖 Auto): acierto, ROI a precio justo y con margen, quién gana cuando chocan, y Brier.
   No son tus picks: vive aparte (ova_auto_v1), no toca «Mis picks», ni tu CLV, ni tu banca, ni ningún cálculo de las apps.
   No usa cuotas inventadas: el ROI se calcula con el precio del mercado (sin margen, y con un margen realista del 3 %). */
(function(root){
"use strict";
var KEY='ova_auto_v1', TOPE=6000, HORIZONTE=48*3600e3;   /* solo se guardan juegos que empiezan en las próximas 48 h: es lo que cubre el archivo del mercado */
var MERC={mlb:'pinnacle-datos.json',fut:'pinnacle-futbol.json',nba:'pinnacle-nba.json'};
var ESPN='https://site.api.espn.com/apis/site/v2/sports/';
var DEPORTE={mlb:'baseball/mlb',nba:'basketball/nba'};
var MARGEN=0.03;                       /* margen realista de una casa en un ganador: el ROI «con margen» baja el pago así */
var HORAS_RES=3.5, DIAS_MAX=8;         /* se intenta resolver 3.5 h después del inicio; a los 8 días sin resultado se descarta */

/* ---------- funciones puras (se prueban en node) ---------- */
function norm(s){
 s=String(s==null?'':s).toLowerCase();
 try{ s=s.normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){}
 return s.replace(/[^a-z0-9]/g,'');
}
function pad2(n){ return (n<10?'0':'')+n; }
function fechaLocal(ts){ var d=new Date(ts); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function ymdUTC(ts){ var d=new Date(ts); return d.getUTCFullYear()+pad2(d.getUTCMonth()+1)+pad2(d.getUTCDate()); }
function r4(x){ return (typeof x==='number'&&isFinite(x))?Math.round(x*10000)/10000:null; }
function trio(p){
 if(!p) return null;
 var L=+p.L, A=+p.A, D=(p.D==null||p.D==='')?null:+p.D;
 if(!(L>0&&L<1&&A>0&&A<1)) return null;
 var suma=L+A+(D!=null&&D>0&&D<1?D:0);
 if(!(suma>0.96&&suma<1.04)) return null;                         /* un 1X2 o un ganador que no suma 100 % es un dato roto */
 return {L:r4(L),A:r4(A),D:(D!=null&&D>0&&D<1)?r4(D):null};
}
function idDe(app,ts,local,visita){ return [app,fechaLocal(ts),norm(local),norm(visita)].join('|'); }
function media(a){ return a.length?a.reduce(function(s,x){ return s+x; },0)/a.length:null; }
function desv(a){ if(a.length<2) return null; var m=media(a); return Math.sqrt(a.reduce(function(s,x){ return s+(x-m)*(x-m); },0)/(a.length-1)); }
function ee(a){ var s=desv(a); return s==null?null:s/Math.sqrt(a.length); }

/* mismo equipo aunque las fuentes lo escriban distinto («Red Sox» ≈ «Boston Red Sox»), con la función del Escáner si está cargada */
var PARAR={fc:1,cf:1,afc:1,sc:1,de:1,del:1,la:1,el:1,the:1,club:1,ac:1,as:1,ud:1,cd:1};
function tokens(n){
 var t=String(n==null?'':n).toLowerCase();
 try{ t=t.normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){}
 return t.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){ return w&&!PARAR[w]; });
}
function mismoEq(a,b){
 try{ if(root.OVAMesa&&root.OVAMesa.mismoEq) return root.OVAMesa.mismoEq(a,b); }catch(e){}
 var ta=tokens(a), tb=tokens(b); if(!ta.length||!tb.length) return false;
 var corto=ta.length<=tb.length?ta:tb, largo=ta.length<=tb.length?tb:ta;
 return corto.every(function(w){ return largo.indexOf(w)>=0; });
}

/* busca el juego en pinnacle-*.json y devuelve las probabilidades SIN margen orientadas a (local, visita) */
function cruzar(juegos,app,rec){
 if(!Array.isArray(juegos)) return null;
 for(var i=0;i<juegos.length;i++){
  var g=juegos[i]; if(!g||!g.n||g.n.length<2) continue;
  var v=app==='fut'?g.r:(app==='nba'?g.ml:g.fair); if(!Array.isArray(v)) continue;
  if(g.t){ var dt=Math.abs(Date.parse(g.t)-rec.ts); if(!(dt<5*3600e3)) continue; }   /* mismo equipo pero otro día de la serie: no vale */
  var dir=mismoEq(g.n[0],rec.local)&&mismoEq(g.n[1],rec.visita), inv=!dir&&mismoEq(g.n[0],rec.visita)&&mismoEq(g.n[1],rec.local);
  if(!dir&&!inv) continue;
  var p0,p1,d=null;
  if(app==='fut'){ if(v.length<3) continue; p0=+v[0]; d=+v[1]; p1=+v[2]; }
  else{ if(v.length<2) continue; p0=+v[0]; p1=+v[1]; }
  if(!(p0>0&&p1>0)) continue;
  return trio({L:dir?p0:p1,A:dir?p1:p0,D:d});
 }
 return null;
}

/* guarda juegos nuevos o refresca el número de los que ya estaban (solo si aún no empezaron). Devuelve el arreglo nuevo. */
function aplicarRegistro(arr,app,lista,ahora){
 var cambios=0, tocados=[];
 (lista||[]).forEach(function(g){
  if(!g||!g.local||!g.visita||!(g.ts>ahora)) return;                 /* SOLO antes de que empiece */
  if(g.ts>ahora+HORIZONTE) return;                                    /* y no con días de anticipación: esos aún no tienen precio de mercado */
  var m=trio(g.p); if(!m) return;
  var id=idDe(app,g.ts,g.local,g.visita), r=null, i;
  for(i=0;i<arr.length;i++){ if(arr[i]&&arr[i].id===id){ r=arr[i]; break; } }
  if(!r){
   r={id:id,app:app,liga:g.liga||'',fecha:fechaLocal(g.ts),ts:g.ts,local:g.local,visita:g.visita,ext:g.ext!=null?String(g.ext):'',slug:g.slug||'',m0:m,t0:ahora,res:null};
   arr.push(r);
  }
  if(r.res) return;                                                  /* ya resuelto: no se toca */
  r.m1=m; r.t1=ahora; r.ts=g.ts; if(g.liga) r.liga=g.liga; if(g.slug) r.slug=g.slug;
  cambios++; tocados.push(r);
 });
 /* limpia lo que se guardó con demasiada anticipación y nunca tuvo precio de mercado: se vuelve a guardar bien cuando se acerque */
 for(var j=arr.length-1;j>=0;j--){ var q=arr[j]; if(q&&!q.res&&!q.k1&&q.ts>ahora+HORIZONTE) arr.splice(j,1); }
 if(arr.length>TOPE) arr.splice(0,arr.length-TOPE);
 return {arr:arr,cambios:cambios,tocados:tocados};
}
function aplicarMercado(rec,k,generado,ahora){
 var t=trio(k); if(!t||!(rec.ts>ahora)) return false;                /* un precio tomado con el juego empezado ya no es «antes» */
 if(!rec.k0){ rec.k0=t; rec.kt0=generado||''; }
 rec.k1=t; rec.kt1=generado||''; rec.tk=ahora;
 return true;
}

/* ---------- resultado ---------- */
function eventosDe(sb){
 var out=[];
 ((sb&&sb.events)||[]).forEach(function(e){
  var c=e.competitions&&e.competitions[0]; if(!c||!c.competitors) return;
  var h=null,a=null; c.competitors.forEach(function(x){ if(x.homeAway==='home') h=x; else if(x.homeAway==='away') a=x; });
  if(!h||!a||!h.team||!a.team) return;
  var st=(e.status&&e.status.type)||(c.status&&c.status.type)||{};
  var hs=parseFloat(h.score), as=parseFloat(a.score), ts=Date.parse(e.date);
  out.push({ts:ts,h:h.team,a:a.team,hs:isFinite(hs)?hs:null,as:isFinite(as)?as:null,fin:st.completed===true,estado:st.state||'',desc:st.description||''});
 });
 return out;
}
function nombresEq(t){ return [t&&t.displayName,t&&t.shortDisplayName,t&&t.name,t&&t.location].filter(Boolean); }
function esEq(nombre,t){
 var n=norm(nombre); if(!n) return false;
 var c=nombresEq(t), i;
 for(i=0;i<c.length;i++){ if(norm(c[i])===n) return true; }
 for(i=0;i<c.length;i++){ if(mismoEq(nombre,c[i])) return true; }
 return false;
}
/* ganador del registro según un evento final de ESPN: 'L' local, 'A' visita, 'D' empate (solo fútbol) o null */
function ganadorDe(rec,ev){
 if(!ev||!ev.fin||ev.hs==null||ev.as==null) return null;
 if(ev.hs>ev.as) return 'L';
 if(ev.hs<ev.as) return 'A';
 return rec.app==='fut'?'D':null;
}
function buscarEvento(eventos,rec){
 var mejor=null, mejorDt=1e18;
 eventos.forEach(function(ev){
  if(!esEq(rec.local,ev.h)||!esEq(rec.visita,ev.a)) return;
  var dt=Math.abs((ev.ts||0)-rec.ts); if(dt>30*3600e3) return;       /* dobles carteleras: el de la hora más cercana */
  if(dt<mejorDt){ mejor=ev; mejorDt=dt; }
 });
 return mejor;
}

/* ---------- medición ---------- */
function fav2(p){ return p.L>=p.A?'L':'A'; }
function precio0(k){ return k>0?1/k:null; }                          /* decimal justo, sin margen: el techo, no se puede cobrar */
function precio3(k){ return k>0?(1/k)/(1+MARGEN):null; }            /* decimal con un margen realista */
function unidad(gana,dec){ return gana?dec-1:-1; }
function derivar(r){
 if(!r||!r.res||r.res==='X') return null;
 var m=r.m1||r.m0; if(!m) return null;
 var d={r:r,m:m,k:r.k1||r.k0||null,res:r.res};
 d.favMod=fav2(m);
 if(d.k){
  d.favMer=fav2(d.k);
  var dif=(m[d.favMod]-d.k[d.favMod])*100;
  d.dif=dif;
  d.cat=(d.favMod!==d.favMer||Math.abs(dif)>=6)?'choca':(Math.abs(dif)<=3?'coinc':'cerca');
  d.mix={L:(m.L+d.k.L)/2,A:(m.A+d.k.A)/2,D:(m.D!=null&&d.k.D!=null)?(m.D+d.k.D)/2:null};
  d.favMix=fav2(d.mix);
 }else d.cat='sin';
 return d;
}
function brier(p,res){
 var o=['L','A'], s=0; if(p.D!=null) o.push('D');
 o.forEach(function(x){ var y=(res===x)?1:0; s+=(p[x]-y)*(p[x]-y); });
 return s;
}
function ficha(us0,us3,gana,esp){
 var n=us3.length;
 return {n:n,w:gana,hit:n?gana/n*100:null,esp:esp.length?media(esp)*100:null,
  roi0:n?media(us0)*100:null,roi3:n?media(us3)*100:null,se3:n>1?ee(us3)*100:null};
}
function apostar(ds,lado){          /* 1 unidad al lado que diga lado(d), al precio del mercado de ese lado */
 var u0=[],u3=[],w=0,esp=[];
 ds.forEach(function(d){
  var s=lado(d), k=d.k&&d.k[s]; if(!(k>0)) return;
  var gana=d.res===s; if(gana) w++;
  u0.push(unidad(gana,precio0(k))); u3.push(unidad(gana,precio3(k))); esp.push(k);
 });
 return ficha(u0,u3,w,esp);
}
function resumir(items,app){
 var arr=(items||[]).filter(function(r){ return r&&(!app||r.app===app); });
 var ds=arr.map(derivar).filter(Boolean);
 var o={app:app||'todas',total:arr.length,pend:arr.filter(function(r){ return !r.res; }).length,res:ds.length,
  anul:arr.filter(function(r){ return r.res==='X'; }).length,conMer:ds.filter(function(d){ return d.k; }).length};
 var con=ds.filter(function(d){ return d.k; });
 var sin=ds.filter(function(d){ return !d.k; });
 o.sinMer={n:sin.length,w:sin.filter(function(d){ return d.res===d.favMod; }).length};
 o.sinMer.hit=o.sinMer.n?o.sinMer.w/o.sinMer.n*100:null;
 o.grupos=[['todos','Todos los que tienen mercado',con],['coinc','Modelo y mercado coinciden (≤3 pts)',con.filter(function(d){ return d.cat==='coinc'; })],
  ['cerca','Mismo favorito, 3 a 6 pts de distancia',con.filter(function(d){ return d.cat==='cerca'; })],
  ['choca','Chocan (otro favorito o 6+ pts)',con.filter(function(d){ return d.cat==='choca'; })]].map(function(g){
  var f=apostar(g[2],function(d){ return d.favMix; }); f.k=g[0]; f.nombre=g[1]; return f;
 });
 var ch=con.filter(function(d){ return d.cat==='choca'; });
 var difFav=ch.filter(function(d){ return d.favMod!==d.favMer; });
 o.choque={n:ch.length,
  distintoFav:difFav.length,
  gM:difFav.filter(function(d){ return d.res===d.favMod; }).length,           /* cuando eligen favoritos distintos: acertó el modelo */
  gK:difFav.filter(function(d){ return d.res===d.favMer; }).length,           /* … acertó el mercado */
  gN:difFav.filter(function(d){ return d.res!==d.favMod&&d.res!==d.favMer; }).length,
  modelo:apostar(ch,function(d){ return d.favMod; }),
  mercado:apostar(ch,function(d){ return d.favMer; })};
 var bm=[],bk=[],bx=[],dd=[];
 con.forEach(function(d){
  var a=brier(d.m,d.res), b=brier(d.k,d.res), c=brier(d.mix,d.res);
  bm.push(a); bk.push(b); bx.push(c); dd.push(a-b);
 });
 o.brier={n:con.length,mod:media(bm),mer:media(bk),mix:media(bx),dif:media(dd),se:ee(dd)};
 var cm=[]; con.forEach(function(d){ cm.push(d.res===d.favMod?1:0); });
 o.acierto={mod:con.length?media(cm)*100:null,
  mer:con.length?media(con.map(function(d){ return d.res===d.favMer?1:0; }))*100:null,
  mix:con.length?media(con.map(function(d){ return d.res===d.favMix?1:0; }))*100:null};
 return o;
}
/* los juegos resueltos con mercado, como si se hubiera apostado 1 unidad al favorito de la mezcla, al precio del mercado con margen del 3 %.
   Salida en el mismo formato que usa Herramientas para los picks: {app,t,res:'G'|'P',u}. Sirve para sumar por semana y por mes. */
function comoPicks(items,app){
 var out=[];
 (items||[]).forEach(function(r){
  if(app&&(!r||r.app!==app)) return;
  var d=derivar(r); if(!d||!d.k) return;
  var k=d.k[d.favMix], dec=precio3(k); if(!(dec>0)) return;
  var gana=d.res===d.favMix;
  out.push({app:r.app,t:r.ts,res:gana?'G':'P',u:unidad(gana,dec)});
 });
 return out;
}
/* una frase honesta por app: no concluye nada con poca muestra */
function veredicto(o){
 if(!o||!o.res) return 'Todavía no hay juegos resueltos. Abre la app cada día y se van juntando solos.';
 if(o.conMer<30) return 'Van '+o.conMer+' juegos con mercado resueltos: muy pronto para decir nada. Con menos de 30 el resultado es casi pura suerte.';
 var t=o.grupos[0], b=o.brier, z=(b.se&&b.se>0)?b.dif/b.se:0, txt=[];
 if(t.se3!=null){
  var roi=t.roi3;
  if(Math.abs(roi)<2*t.se3) txt.push('El ROI con margen ('+(roi>=0?'+':'')+roi.toFixed(1)+'% ± '+t.se3.toFixed(1)+') todavía no se separa de cero: no hay ni ganancia ni pérdida demostrada.');
  else txt.push(roi>0?'El ROI con margen es positivo y se separa de cero ('+roi.toFixed(1)+'% ± '+t.se3.toFixed(1)+'): vigílalo, pero 2 errores no son una prueba.':'El ROI con margen es negativo y se separa de cero ('+roi.toFixed(1)+'% ± '+t.se3.toFixed(1)+'): así, la app pierde.');
 }
 if(b.mod!=null&&b.mer!=null){
  if(Math.abs(z)<2) txt.push('Tu modelo y el mercado calibran casi igual (Brier '+b.mod.toFixed(3)+' contra '+b.mer.toFixed(3)+').');
  else txt.push(z<0?'El modelo calibra mejor que el mercado (Brier '+b.mod.toFixed(3)+' contra '+b.mer.toFixed(3)+').':'El mercado calibra mejor que el modelo (Brier '+b.mer.toFixed(3)+' contra '+b.mod.toFixed(3)+').');
 }
 return txt.join(' ');
}
function exportar(items){ return JSON.stringify({app:'ova-auto',v:1,fecha:new Date().toISOString(),n:(items||[]).length,items:items||[]}); }

var API={comoPicks:comoPicks,HORIZONTE:HORIZONTE,norm:norm,fechaLocal:fechaLocal,trio:trio,idDe:idDe,cruzar:cruzar,aplicarRegistro:aplicarRegistro,aplicarMercado:aplicarMercado,
 eventosDe:eventosDe,esEq:esEq,ganadorDe:ganadorDe,buscarEvento:buscarEvento,derivar:derivar,brier:brier,resumir:resumir,veredicto:veredicto,
 exportar:exportar,precio0:precio0,precio3:precio3,KEY:KEY,MARGEN:MARGEN};
root.OVARegAuto=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(!root.document||!root.localStorage) return;

/* ---------- lo que corre en el teléfono ---------- */
function leer(){ try{ var a=JSON.parse(root.localStorage.getItem(KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function escribir(a){ try{ root.localStorage.setItem(KEY,JSON.stringify(a)); return true; }catch(e){ return false; } }
var MERCADOS={};      /* un pedido por app cada 5 minutos */
function traerMercado(app){
 var m=MERCADOS[app];
 if(m&&Date.now()-m.t<5*60e3) return m.p;
 var p=Promise.resolve().then(function(){ return root.fetch(MERC[app]+'?v='+Date.now()); })
  .then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
 MERCADOS[app]={t:Date.now(),p:p};
 return p;
}
/* lo llama cada app con sus juegos del día: [{ts,local,visita,p:{L,A,D},liga,slug,ext}] (ts = inicio en ms, p = probabilidad 0-1) */
function registrar(app,lista){
 try{
  if(!MERC[app]) return Promise.resolve(0);
  var ahora=Date.now(), arr=leer(), n0=arr.length, ap=aplicarRegistro(arr,app,lista,ahora);
  if(!ap.tocados.length){ if(ap.arr.length!==n0) escribir(ap.arr); return Promise.resolve(0); }
  escribir(ap.arr);
  return traerMercado(app).then(function(j){
   if(!j||!Array.isArray(j.juegos)) return ap.tocados.length;
   var cur=leer(), n=0, t=Date.now();
   ap.tocados.forEach(function(x){
    var r=null, i; for(i=0;i<cur.length;i++){ if(cur[i]&&cur[i].id===x.id){ r=cur[i]; break; } }
    if(!r||r.res) return;
    var k=cruzar(j.juegos,app,r); if(k&&aplicarMercado(r,k,j.generado,t)) n++;
   });
   if(n) escribir(cur);
   return ap.tocados.length;
  }).catch(function(){ return ap.tocados.length; });
 }catch(e){ return Promise.resolve(0); }
}
function getJSON(u){ return root.fetch(u).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
var ULT=0, CORRIENDO=false;
function resolver(forzar){
 if(CORRIENDO) return Promise.resolve(0);
 if(!forzar&&Date.now()-ULT<20*60e3) return Promise.resolve(0);
 ULT=Date.now();
 var ahora=Date.now(), arr=leer();
 var pend=arr.filter(function(r){ return r&&!r.res&&r.ts<ahora-HORAS_RES*3600e3; });
 if(!pend.length) return Promise.resolve(0);
 CORRIENDO=true;
 var pedidos={}, lista=[];
 pend.forEach(function(r){
  var base=r.app==='fut'?(r.slug?ESPN+'soccer/'+r.slug:null):ESPN+DEPORTE[r.app];
  if(!base) return;
  [ymdUTC(r.ts-10*3600e3),ymdUTC(r.ts)].forEach(function(d){ var u=base+'/scoreboard?dates='+d+'&limit=300'; if(!pedidos[u]){ pedidos[u]=1; lista.push(u); } });
 });
 var cache={};
 return Promise.all(lista.map(function(u){ return getJSON(u).then(function(j){ cache[u]=eventosDe(j); }).catch(function(){ cache[u]=null; }); })).then(function(){
  var cur=leer(), n=0;
  cur.forEach(function(r){
   if(!r||r.res||r.ts>=Date.now()-HORAS_RES*3600e3) return;
   var base=r.app==='fut'?(r.slug?ESPN+'soccer/'+r.slug:null):ESPN+DEPORTE[r.app]; if(!base) return;
   var evs=[], ok=false;
   [ymdUTC(r.ts-10*3600e3),ymdUTC(r.ts)].forEach(function(d){ var c=cache[base+'/scoreboard?dates='+d+'&limit=300']; if(c){ ok=true; evs=evs.concat(c); } });
   var ev=buscarEvento(evs,r), g=ganadorDe(r,ev);
   if(g){ r.res=g; r.gl=ev.hs; r.gv=ev.as; r.tr=Date.now(); n++; }
   else if(ok&&Date.now()-r.ts>DIAS_MAX*864e5){ r.res='X'; r.tr=Date.now(); n++; }      /* pospuesto o sin dato en 8 días: no cuenta */
  });
  if(n) escribir(cur);
  CORRIENDO=false; return n;
 }).catch(function(){ CORRIENDO=false; return 0; });
}
API.leer=leer; API.registrar=registrar; API.resolver=resolver;
function arrancar(){ root.setTimeout(function(){ resolver(false); },6000); }
if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',arrancar); else arrancar();
})(typeof window!=='undefined'?window:globalThis);
