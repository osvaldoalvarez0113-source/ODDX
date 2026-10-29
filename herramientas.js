/* herramientas.js · lógica y pantalla de herramientas.html
   Tres cosas, todas leyendo lo que ya está en este teléfono (localStorage) o lo que tú escribes aquí:
   1) Marcador: resultados reales de tus picks guardados en las cinco apps, con curva de unidades, CLV y ROI.
   2) Banca: lo que apuestas, con topes diario/semanal/mensual (banca.js).
   3) Casas: la misma cuota en varias casas, cuál paga más, el EV contra tu número y si hay arbitraje.
   No cambia ningún cálculo ni ningún pick de las apps. Las funciones puras se exportan para pruebas. */
(function(root){
'use strict';

/* ======================= números y cuotas ======================= */
function numero(x){
  var s=String(x==null?'':x).replace(/[−‒-―]/g,'-').replace(/[\s,$]/g,'');
  var n=parseFloat(s); return isFinite(n)?n:null;
}
/* Entiende americana (-175, +120), decimal (1.91) y centavos de Kalshi (64¢ o 64c). Devuelve decimal o null.
   Kalshi cobra comisión: el decimal que devuelve ya la descuenta (igual que scripts/valor.js: 1/(p+0.07*p*(1-p))). */
function aDecimal(txt){
  var s=String(txt==null?'':txt).trim(); if(s==='') return null;
  var cent=/(¢|c)$/i.test(s);
  var n=numero(s.replace(/(¢|c)$/i,'')); if(n==null||n===0) return null;
  if(cent){ if(!(n>0&&n<100)) return null; var p=n/100; return 1/(p+0.07*p*(1-p)); }
  if(Math.abs(n)>=100) return n>0?1+n/100:1+100/(-n);        /* americana */
  if(n>1&&n<100) return n;                                    /* decimal (1.91, 2.5, 12) */
  return null;
}
function aAmericana(d){
  if(!(d>1)) return '—';
  return d>=2?'+'+Math.round((d-1)*100):String(Math.round(-100/(d-1)));
}
function quitarMargen(d1,d2){ var a=1/d1,b=1/d2,s=a+b; return [a/s,b/s]; }

/* casas: [{n:'DraftKings', a:'-150', b:'+130'}, ...]  ·  p: tu probabilidad del lado A en % (opcional)
   Devuelve por casa el margen, el mejor precio de cada lado, el consenso del mercado sin margen, EV y arbitraje. */
function compararCasas(casas, pA, total){
  var filas=[], mejor=[null,null];
  (casas||[]).forEach(function(c,i){
    var da=aDecimal(c.a), db=aDecimal(c.b);
    var f={n:String(c.n||('Casa '+(i+1))), da:da, db:db, margen:null, fair:null};
    if(da&&db){ f.margen=1/da+1/db-1; f.fair=quitarMargen(da,db); }
    filas.push(f);
    if(da&&(!mejor[0]||da>mejor[0].d)) mejor[0]={d:da,n:f.n};
    if(db&&(!mejor[1]||db>mejor[1].d)) mejor[1]={d:db,n:f.n};
  });
  var par=filas.filter(function(f){ return f.fair; }), consenso=null;
  if(par.length){ var sa=0; par.forEach(function(f){ sa+=f.fair[0]; }); sa/=par.length; consenso=[sa,1-sa]; }
  var out={filas:filas, mejor:mejor, consenso:consenso, ev:null, evConsenso:null, arbitraje:null, mejoraVsPeor:null};
  var pa=(pA!=null&&pA>0&&pA<100)?pA/100:null;
  if(pa!=null){
    out.ev=[mejor[0]?pa*mejor[0].d-1:null, mejor[1]?(1-pa)*mejor[1].d-1:null];
  }
  if(consenso) out.evConsenso=[mejor[0]?consenso[0]*mejor[0].d-1:null, mejor[1]?consenso[1]*mejor[1].d-1:null];
  if(mejor[0]&&mejor[1]){
    var s=1/mejor[0].d+1/mejor[1].d;
    if(s<1){
      var T=(total>0)?total:100;
      out.arbitraje={ganancia:1/s-1, sA:T*(1/mejor[0].d)/s, sB:T*(1/mejor[1].d)/s, total:T};
    }
  }
  /* cuánto cambia el pago por jugar en la mejor casa en vez de en la peor (lado A y B) */
  out.mejoraVsPeor=[0,1].map(function(l){
    var ds=filas.map(function(f){ return l===0?f.da:f.db; }).filter(Boolean);
    if(ds.length<2) return null; var mx=Math.max.apply(null,ds), mn=Math.min.apply(null,ds);
    return mx/mn-1;
  });
  return out;
}

/* ======================= marcador ======================= */
function pad2(n){ return (n<10?'0':'')+n; }
function fechaDe(s){
  if(s==null) return null;
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if(m) return new Date(+m[1],+m[2]-1,+m[3],12,0,0).getTime();
  return null;
}
function tsDeId(id){ var m=/^[a-z]?(\d{12,13})/.exec(String(id==null?'':id)); return m?+m[1]:null; }
function decAm(a){ var d=aDecimal(a); return d?d-1:null; }              /* ganancia por unidad con cuota americana o decimal */
function impPctTxt(x){                                                  /* % implícito; centavos de Kalshi = % directo */
  var s=String(x==null?'':x).trim(); if(s==='') return null;
  var n=numero(s.replace(/(¢|c)$/i,'')); if(n==null||n===0) return null;
  if(Math.abs(n)<100) return (n>0&&n<100)?(n<1?n*100:n):null;
  return n>0?100/(n+100)*100:(-n)/(-n+100)*100;
}
function pagoMlb(p){
  if(p.plat==='kalshi'){
    var c=numero(String(p.am).replace(/(¢|c)$/i,'')); if(c==null) return null;
    if(c>=1&&c<100) c=c/100; if(!(c>0&&c<1)) return null;
    return {b:(1-c)/c, fee:0.07*(1-c)};
  }
  var b=decAm(p.am); return b==null?null:{b:b,fee:0};
}
function clvDe(a,b){ var x=impPctTxt(a), y=impPctTxt(b); return (x==null||y==null)?null:y-x; }

/* Convierte los tres registros a una sola lista: {app,t,res:'G'|'P'|'E'|null,u,clv,juego,sel,cuota} */
function normalizar(leerClave){
  var out=[];
  function J(k){ try{ var j=JSON.parse(leerClave(k)||'null'); return Array.isArray(j)?j:[]; }catch(e){ return []; } }
  J('ventaja_picks_v1').forEach(function(p){
    if(!p) return; var res=(p.res==='G'||p.res==='P'||p.res==='E')?p.res:null, u=null, pg=pagoMlb(p);
    if(res==='G') u=pg?pg.b-pg.fee:null; else if(res==='P') u=-(1+(pg?pg.fee:0)); else if(res==='E') u=-(pg?pg.fee:0);
    out.push({app:'mlb',t:fechaDe(p.f)||tsDeId(p.id)||0,res:res,u:u,clv:clvDe(p.am,p.cierre),juego:p.juego||'',sel:p.m||'',
      cuota:p.am!=null?(p.plat==='kalshi'?p.am+'¢':String(p.am)):'',mio:p.org==='mio'});
  });
  J('ova_futbol_registro_v1').forEach(function(p){
    if(!p) return; var res=p.estado==='ganado'?'G':(p.estado==='perdido'?'P':null), u=null;
    if(res==='G'){ u=decAm(p.cuota); } else if(res==='P') u=-1;
    out.push({app:'fut',t:fechaDe(p.fecha)||p.ts||tsDeId(p.id)||0,res:res,u:u,clv:clvDe(p.cuota,p.cierre),
      juego:(p.local||'')+' vs '+(p.visita||''),sel:p.seleccion||'',cuota:p.cuota!=null?String(p.cuota):'',mio:false});
  });
  ['nba','nhl','nfl'].forEach(function(ap){
  J('ova_'+ap+'_registro_v1').forEach(function(p){
    if(!p) return; var res=p.estado==='ganado'?'G':(p.estado==='perdido'?'P':(p.estado==='push'?'E':null)), u=null;
    if(res==='G'){ u=decAm(p.cuota); } else if(res==='P') u=-1; else if(res==='E') u=0;
    out.push({app:ap,t:p.ts||tsDeId(p.id)||0,res:res,u:u,clv:clvDe(p.cuota,p.cierre),
      juego:(p.aN||'')+' @ '+(p.hN||''),sel:p.seleccion||'',cuota:p.cuota!=null?String(p.cuota):'',mio:false});
  });
  });
  return out;
}
function resumir(items){
  var r={n:items.length,g:0,p:0,e:0,pend:0,u:0,jugados:0,clvN:0,clvSum:0,clvGana:0};
  items.forEach(function(x){
    if(!x.res){ r.pend++; return; }
    if(x.res==='G') r.g++; else if(x.res==='P') r.p++; else r.e++;
    if(x.u!=null){ r.u+=x.u; r.jugados++; }
  });
  items.forEach(function(x){ if(x.clv!=null){ r.clvN++; r.clvSum+=x.clv; if(x.clv>0) r.clvGana++; } });
  r.roi=r.jugados?r.u/r.jugados*100:null;
  r.clv=r.clvN?r.clvSum/r.clvN:null;
  r.clvGanaPct=r.clvN?r.clvGana/r.clvN*100:null;
  r.acierto=(r.g+r.p)?r.g/(r.g+r.p)*100:null;
  return r;
}
/* curva de unidades acumuladas, solo con picks resueltos y con pago conocido, en orden de fecha */
function curva(items){
  var a=items.filter(function(x){ return x.res&&x.u!=null; }).sort(function(p,q){ return p.t-q.t; });
  var acc=0, pts=[{i:0,t:a.length?a[0].t:0,y:0}];
  a.forEach(function(x,i){ acc+=x.u; pts.push({i:i+1,t:x.t,y:acc}); });
  var peor=0, pico=0; pts.forEach(function(p){ if(p.y>pico) pico=p.y; if(p.y-pico<peor) peor=p.y-pico; });
  return {pts:pts, final:acc, n:a.length, caidaMax:peor};
}
function ventana(items,dias,ahora){
  var lim=(ahora||Date.now())-dias*86400000, g=items.filter(function(x){ return x.res&&x.u!=null&&x.t>=lim; });
  var u=0; g.forEach(function(x){ u+=x.u; });
  return {n:g.length,u:u};
}
function racha(items){
  var a=items.filter(function(x){ return x.res==='G'||x.res==='P'; }).sort(function(p,q){ return q.t-p.t; });
  if(!a.length) return null; var r=a[0].res, n=0;
  for(var i=0;i<a.length&&a[i].res===r;i++) n++;
  return {res:r,n:n};
}


/* ---------- por semana y por mes: ganados, perdidos, unidades y si el periodo fue positivo ---------- */
var MES_C=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var MES_L=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function inicioPeriodo(ts,tipo){
  var d=new Date(ts); d.setHours(0,0,0,0);
  if(tipo==='mes') d.setDate(1); else d.setDate(d.getDate()-((d.getDay()+6)%7));     /* la semana empieza el lunes */
  return d;
}
function etiquetaPeriodo(ini,tipo){
  if(tipo==='mes') return MES_L[ini.getMonth()]+' '+ini.getFullYear();
  var f=new Date(ini.getTime()); f.setDate(f.getDate()+6);
  return ini.getDate()+' '+MES_C[ini.getMonth()]+' – '+f.getDate()+' '+MES_C[f.getMonth()];
}
/* items: [{t,res:'G'|'P'|'E'|null,u}] → [{ini,etiqueta,g,p,e,pend,u,jugados,roi,estado:'+'|'-'|'0'|'?'}], del más nuevo al más viejo.
   Un periodo es positivo si sus unidades suman más de 0 (sin contar los pendientes). Los picks sin fecha no entran. */
function porPeriodo(items,tipo){
  var m={};
  items.forEach(function(x){
    if(!x||!x.t) return;
    var ini=inicioPeriodo(x.t,tipo), k=ini.getTime();
    var o=m[k]||(m[k]={ini:ini,etiqueta:etiquetaPeriodo(ini,tipo),g:0,p:0,e:0,pend:0,u:0,jugados:0});
    if(!x.res){ o.pend++; return; }
    if(x.res==='G') o.g++; else if(x.res==='P') o.p++; else o.e++;
    if(x.u!=null){ o.u+=x.u; o.jugados++; }
  });
  return Object.keys(m).map(function(k){ return m[k]; }).sort(function(a,b){ return b.ini-a.ini; }).map(function(o){
    o.roi=o.jugados?o.u/o.jugados*100:null;
    o.estado=!o.jugados?'?':(Math.abs(o.u)<0.005?'0':(o.u>0?'+':'-'));
    return o;
  });
}
function bloquePeriodos(items,titulo,nota){
  var tipo='semana';
  var caja=el('div',{class:'caja'});
  function pintar(){
    limpiar(caja);
    var lista=porPeriodo(items,tipo);
    caja.appendChild(el('h3',{text:titulo}));
    caja.appendChild(el('div',{class:'pie2'},[
      el('button',{type:'button','aria-pressed':String(tipo==='semana'),text:(tipo==='semana'?'● ':'○ ')+'Por semana',onclick:function(){ tipo='semana'; pintar(); }}),
      el('button',{type:'button','aria-pressed':String(tipo==='mes'),text:(tipo==='mes'?'● ':'○ ')+'Por mes',onclick:function(){ tipo='mes'; pintar(); }})]));
    if(!lista.length){ caja.appendChild(el('p',{class:'nota',text:'Todavía no hay picks con fecha para agrupar.'})); return; }
    var act=lista[0], hoy=inicioPeriodo(Date.now(),tipo).getTime()===act.ini.getTime();
    if(hoy&&act.jugados) caja.appendChild(el('div',{class:'kpis dos'},[
      kpi(act.g+'-'+act.p+(act.e?'-'+act.e:''),(tipo==='mes'?'este mes':'esta semana')+' (G-P)'),
      kpi(signo(act.u,1)+' u',act.u>0?'va positivo':(act.u<0?'va negativo':'va en cero'),act.u>0?'g':(act.u<0?'p':''))]));
    var t=el('table',{class:'tab'},[el('tr',null,[(tipo==='mes'?'Mes':'Semana'),'G-P','Unid.','ROI',''].map(function(h){ return el('th',{text:h}); }))]);
    lista.slice(0,tipo==='mes'?12:16).forEach(function(o){
      var cls=o.estado==='+'?'mejor':'';
      t.appendChild(el('tr',null,[el('td',{text:o.etiqueta+(o.pend?' ('+o.pend+' pend.)':'')}),
        el('td',{class:'n',text:o.g+'-'+o.p+(o.e?'-'+o.e:'')}),
        el('td',{class:'n '+cls,text:o.jugados?signo(o.u,1):'—'}),
        el('td',{class:'n',text:o.roi==null?'—':signo(o.roi,0)+'%'}),
        el('td',{class:'n',text:o.estado==='+'?'✅':(o.estado==='-'?'❌':(o.estado==='0'?'➖':'⏳'))})]));
    });
    caja.appendChild(t);
    var pos=lista.filter(function(o){ return o.estado==='+'; }).length, neg=lista.filter(function(o){ return o.estado==='-'; }).length;
    caja.appendChild(el('p',{class:'nota',text:'✅ positivo (ganó unidades) · ❌ negativo · ⏳ sin resolver. De '+lista.length+(tipo==='mes'?' meses':' semanas')+' con picks: '+pos+' positivas y '+neg+' negativas.'+(nota?' '+nota:'')}));
  }
  pintar();
  return caja;
}

/* ======================= pantalla ======================= */
function el(tag,attrs,hijos){
  var d=root.document, e=d.createElement(tag);
  if(attrs) Object.keys(attrs).forEach(function(k){
    if(attrs[k]==null) return;
    if(k==='class') e.className=attrs[k]; else if(k==='text') e.textContent=attrs[k];
    else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),attrs[k]); else e.setAttribute(k,attrs[k]);
  });
  (hijos||[]).forEach(function(h){ if(h==null) return; e.appendChild(typeof h==='string'?d.createTextNode(h):h); });
  return e;
}
function limpiar(n){ n.textContent=''; }                 /* no removeChild uno por uno: si un campo con foco se quita, su blur re-entra y falla */
function signo(x,dec){ dec=dec==null?1:dec; var t=x.toFixed(dec); if(+t===0) return (0).toFixed(dec); return (x>0?'+':'')+t; }
function kpi(v,lab,cls){ return el('div',{class:'kpi '+(cls||'')},[el('b',{text:v}),el('span',{text:lab})]); }

function dibujarCurva(c){
  var NS='http://www.w3.org/2000/svg', W=320, H=150, mx=14, my=16, d=root.document;
  var svg=d.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.setAttribute('class','curva'); svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Curva de unidades acumuladas');
  var ys=c.pts.map(function(p){ return p.y; }), lo=Math.min(0,Math.min.apply(null,ys)), hi=Math.max(0,Math.max.apply(null,ys));
  if(hi-lo<1){ hi+=.5; lo-=.5; }
  var N=Math.max(1,c.pts.length-1);
  function X(i){ return mx+(W-2*mx)*i/N; }
  function Y(v){ return my+(H-2*my)*(hi-v)/(hi-lo); }
  var z=d.createElementNS(NS,'line'); z.setAttribute('x1',mx); z.setAttribute('x2',W-mx); z.setAttribute('y1',Y(0)); z.setAttribute('y2',Y(0)); z.setAttribute('class','cero'); svg.appendChild(z);
  var pts=c.pts.map(function(p){ return X(p.i).toFixed(1)+','+Y(p.y).toFixed(1); }).join(' ');
  var area=d.createElementNS(NS,'polygon'); area.setAttribute('points',X(0).toFixed(1)+','+Y(0).toFixed(1)+' '+pts+' '+X(N).toFixed(1)+','+Y(0).toFixed(1));
  area.setAttribute('class','area '+(c.final>=0?'sube':'baja')); svg.appendChild(area);
  var pl=d.createElementNS(NS,'polyline'); pl.setAttribute('points',pts); pl.setAttribute('class','linea '+(c.final>=0?'sube':'baja')); svg.appendChild(pl);
  var u=c.pts[c.pts.length-1], dot=d.createElementNS(NS,'circle'); dot.setAttribute('cx',X(u.i)); dot.setAttribute('cy',Y(u.y)); dot.setAttribute('r',4); dot.setAttribute('class','punto '+(c.final>=0?'sube':'baja')); svg.appendChild(dot);
  return svg;
}
var APPS={mlb:'⚾ MLB',fut:'⚽ Fútbol',nba:'🏀 NBA',nhl:'🏒 NHL',nfl:'🏈 NFL'};

function pantallaMarcador(cont,ls){
  limpiar(cont);
  var items=normalizar(function(k){ try{ return ls.getItem(k); }catch(e){ return null; } });
  if(!items.length){
    cont.appendChild(el('div',{class:'vacio'},[el('b',{text:'Todavía no hay picks guardados'}),
      el('p',{text:'Guarda picks desde MLB, fútbol, NBA, NHL o NFL (Mis picks) y márcalos Ganó o Perdió. Aquí vas a ver tu récord real, la curva de unidades y si le ganas a la línea de cierre.'})]));
    return;
  }
  var R=resumir(items), C=curva(items), w7=ventana(items,7), w30=ventana(items,30), rc=racha(items);
  cont.appendChild(el('div',{class:'kpis'},[
    kpi(R.jugados?signo(R.u,1):'—','unidades · '+R.jugados+' resueltos',R.u>0?'g':(R.u<0?'p':'')),
    kpi(R.roi==null?'—':signo(R.roi,1)+'%','ROI por pick',R.roi>0?'g':(R.roi<0?'p':'')),
    kpi(R.clv==null?'—':signo(R.clv,1),'CLV en puntos · '+R.clvN+' con cierre',R.clv>0?'g':(R.clv<0?'p':''))]));
  if(C.n>=2){
    var card=el('div',{class:'caja'},[el('h3',{text:'Curva de unidades'}),dibujarCurva(C),
      el('div',{class:'pie2'},[el('span',{text:'Caída más larga: '+C.caidaMax.toFixed(1)+' u'}),
        el('span',{text:rc?('Racha: '+rc.n+(rc.res==='G'?' ganados':' perdidos')+' seguidos'):''})])]);
    cont.appendChild(card);
  }
  cont.appendChild(el('div',{class:'kpis dos'},[
    kpi(w7.n?signo(w7.u,1)+' u':'—','últimos 7 días · '+w7.n+' picks',w7.u>0?'g':(w7.u<0?'p':'')),
    kpi(w30.n?signo(w30.u,1)+' u':'—','últimos 30 días · '+w30.n+' picks',w30.u>0?'g':(w30.u<0?'p':''))]));
  /* por app */
  var t=el('table',{class:'tab'},[el('tr',null,['App','Picks','Rec.','Unid.','ROI','CLV'].map(function(h){ return el('th',{text:h}); }))]);
  ['mlb','fut','nba','nhl','nfl'].forEach(function(a){
    var g=items.filter(function(x){ return x.app===a; }); if(!g.length) return;
    var r=resumir(g);
    t.appendChild(el('tr',null,[el('td',{text:APPS[a]}),el('td',{class:'n',text:String(r.n)}),
      el('td',{class:'n',text:r.g+'-'+r.p+(r.e?'-'+r.e:'')}),el('td',{class:'n',text:r.jugados?signo(r.u,1):'—'}),
      el('td',{class:'n',text:r.roi==null?'—':signo(r.roi,0)+'%'}),el('td',{class:'n',text:r.clv==null?'—':signo(r.clv,1)})]));
  });
  cont.appendChild(t);
  cont.appendChild(bloquePeriodos(items,'📅 Por semana y por mes','Cada pick vale 1 unidad.'));
  var mio=items.filter(function(x){ return x.mio; });
  if(mio.length){ var rm=resumir(mio); cont.appendChild(el('p',{class:'nota',text:'De MLB, '+mio.length+' picks los marcaste como tuyos 👁: '+(rm.jugados?signo(rm.u,1)+' unidades en '+rm.jugados+' resueltos.':'todavía sin resolver.')})); }
  /* lectura honesta */
  var msg;
  if(R.jugados<30) msg='Con '+R.jugados+' picks resueltos todavía no se puede decir nada firme: una racha de suerte o de mala suerte cabe fácil en esa muestra. Mira otra vez cuando pases de 30 o 40.';
  else if(R.clv!=null&&R.clvN>=25&&R.clv<=0) msg='Ojo: el cierre te está ganando (CLV '+signo(R.clv,1)+'). Aunque las unidades vayan bien, eso suele ser suerte y se corrige.';
  else if(R.clv!=null&&R.clvN>=25&&R.clv>0) msg='Buena señal: tus precios le ganan al cierre (CLV '+signo(R.clv,1)+'). Es lo que más pesa para creer que hay ventaja real.';
  else msg='Apunta la cuota de cierre de cada pick: sin ella no hay CLV y el resultado solo no alcanza para saber si el método sirve.';
  cont.appendChild(el('div',{class:'flag',text:msg}));
  cont.appendChild(el('p',{class:'nota',text:'Unidades: cada pick vale 1 unidad (sin importar el stake). Para dinero real usa la pestaña Banca.'}));
}

/* ----- banca ----- */
function pantallaBanca(cont){
  var B=root.OVABanca; limpiar(cont); if(!B){ cont.appendChild(el('div',{class:'flag',text:'No cargó banca.js.'})); return; }
  var o=B.leer(), T=B.totales(o), E=B.estados(o);
  function guardar(){ B.escribir(o); pantallaBanca(cont); }
  var a=B.aviso(o);
  if(a) cont.appendChild(el('div',{class:'flag '+(a.nivel==='pasado'?'rojo':'ambar'),text:'💰 '+a.texto}));
  var act=B.bancaActual(o);
  cont.appendChild(el('div',{class:'kpis'},[
    kpi('$'+T.dia.toFixed(0),'apostado hoy ('+T.nDia+')',E.dia==='pasado'?'p':(E.dia==='cerca'?'a':'')),
    kpi('$'+T.sem.toFixed(0),'esta semana',E.sem==='pasado'?'p':(E.sem==='cerca'?'a':'')),
    kpi('$'+T.mes.toFixed(0),'este mes',E.mes==='pasado'?'p':(E.mes==='cerca'?'a':''))]));
  if(act!=null) cont.appendChild(el('div',{class:'kpis dos'},[kpi('$'+act.toFixed(0),'banca actual',act>=o.inicial?'g':'p'),
    kpi((T.netoMes>=0?'+':'−')+'$'+Math.abs(T.netoMes).toFixed(0),'resultado del mes',T.netoMes>0?'g':(T.netoMes<0?'p':''))]));
  /* anotar apuesta */
  var inM=el('input',{type:'text',inputmode:'decimal',placeholder:'Monto $',autocomplete:'off',id:'bMonto'});
  var inN=el('input',{type:'text',placeholder:'Nota (opcional)',autocomplete:'off',maxlength:'60',id:'bNota'});
  var msg=el('div',{class:'msg'});
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'Anotar una apuesta'}),
    el('p',{class:'nota',text:'Anota lo que de verdad pones, cada vez que apuestas. Es lo único que hace que el tope funcione.'}),
    el('div',{class:'fila'},[inM,inN]),
    el('button',{class:'btn',id:'bAnotar',text:'Anotar',onclick:function(){
      var m=B.num(inM.value); if(!(m>0)){ msg.textContent='Escribe el monto, por ejemplo 25.'; return; }
      var previo=B.aviso(o);
      B.agregar(o,m,inN.value); B.escribir(o); pantallaBanca(cont);
      var nuevo=B.aviso(B.leer());
      if(nuevo&&nuevo.nivel==='pasado'&&!(previo&&previo.nivel==='pasado')){ var f=cont.querySelector('.flag'); if(f) f.scrollIntoView(); }
    }}),msg]));
  /* topes */
  var tI={};
  var fila=el('div',{class:'fila tres'});
  [['dia','Tope diario $'],['sem','Tope semanal $'],['mes','Tope mensual $']].forEach(function(k){
    var i=el('input',{type:'text',inputmode:'decimal',placeholder:k[1],autocomplete:'off','aria-label':k[1],value:o.topes[k[0]]!=null?String(o.topes[k[0]]):''}); tI[k[0]]=i; fila.appendChild(i);
  });
  var inI=el('input',{type:'text',inputmode:'decimal',placeholder:'Banca inicial $',autocomplete:'off','aria-label':'Banca inicial',value:o.inicial!=null?String(o.inicial):''});
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'Tus topes'}),
    el('p',{class:'nota',text:'Pon el máximo que aceptas apostar. A partir del 80% sale un aviso arriba en las cinco apps, y al llegar al tope se pone en rojo. Déjalo vacío si no quieres tope.'}),
    fila,el('div',{class:'fila'},[inI]),
    el('button',{class:'btn ghost',text:'Guardar topes',onclick:function(){
      o.topes={dia:B.num(tI.dia.value),sem:B.num(tI.sem.value),mes:B.num(tI.mes.value)}; o.inicial=B.num(inI.value); guardar();
    }})]));
  /* lista */
  var movs=o.movs.slice().sort(function(p,q){ return q.t-p.t; }).slice(0,25);
  if(movs.length){
    var lis=el('div',{class:'lista'});
    movs.forEach(function(m){
      var d=new Date(m.t), cuando=pad2(d.getMonth()+1)+'/'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes());
      var inR=el('input',{type:'text',inputmode:'decimal',placeholder:'±$ result.',autocomplete:'off','aria-label':'Resultado en dólares',value:m.neto!=null?String(m.neto):'',
        onchange:function(){ B.resultado(o,m.id,this.value); guardar(); }});
      lis.appendChild(el('div',{class:'mov'},[el('div',{class:'t'},[el('b',{text:'$'+m.monto.toFixed(0)}),el('span',{text:' · '+cuando+(m.nota?' · '+m.nota:'')})]),
        el('div',{class:'acc'},[inR,el('button',{class:'ghost chico',text:'Borrar',onclick:function(){ B.borrar(o,m.id); guardar(); }})])]));
    });
    cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'Últimas apuestas'}),el('p',{class:'nota',text:'Cuando se resuelva, escribe cuánto ganaste (+40) o perdiste (−25). Así la banca actual y el resultado del mes salen reales.'}),lis]));
  }
}

/* ----- casas ----- */
var CASAS=['DraftKings','FanDuel','BetMGM','Caesars','Bovada','Kalshi'];
function pantallaCasas(cont){
  limpiar(cont);
  var estado={nA:'Visita',nH:'Local',p:'',tot:'100'};
  var filas=CASAS.map(function(n){ return {n:n,a:'',b:''}; });
  var res=el('div',{class:'res'});
  function pintar(){
    limpiar(res);
    var llenas=filas.filter(function(f){ return aDecimal(f.a)||aDecimal(f.b); });
    if(!llenas.length){ res.appendChild(el('p',{class:'nota',text:'Escribe las cuotas de las casas que tengas abiertas. Mínimo dos casas con los dos lados para que la comparación diga algo.'})); return; }
    var C=compararCasas(filas.filter(function(f){ return f.a||f.b; }),numero(estado.p),numero(estado.tot));
    var L=[estado.nA||'Visita',estado.nH||'Local'];
    if(C.arbitraje){
      var A=C.arbitraje;
      res.appendChild(el('div',{class:'flag verde',text:'🎯 Arbitraje: apostando '+L[0]+' en '+C.mejor[0].n+' ('+aAmericana(C.mejor[0].d)+') y '+L[1]+' en '+C.mejor[1].n+' ('+aAmericana(C.mejor[1].d)+') '+
        'ganas '+(A.ganancia*100).toFixed(2)+'% sin importar quién gane. Con $'+A.total.toFixed(0)+': $'+A.sA.toFixed(2)+' y $'+A.sB.toFixed(2)+'. Confirma que las dos cuotas sigan vigentes: se mueven en segundos, y ten en cuenta los límites y la comisión de cada casa.'}));
    }
    var t=el('table',{class:'tab'},[el('tr',null,['Casa',L[0],L[1],'Margen'].map(function(h){ return el('th',{text:h}); }))]);
    C.filas.forEach(function(f){
      var mA=C.mejor[0]&&f.da===C.mejor[0].d, mB=C.mejor[1]&&f.db===C.mejor[1].d;
      t.appendChild(el('tr',null,[el('td',{text:f.n}),
        el('td',{class:'n'+(mA?' mejor':''),text:f.da?aAmericana(f.da):'—'}),
        el('td',{class:'n'+(mB?' mejor':''),text:f.db?aAmericana(f.db):'—'}),
        el('td',{class:'n',text:f.margen!=null?(f.margen*100).toFixed(1)+'%':'—'})]));
    });
    res.appendChild(t);
    var lineas=[];
    [0,1].forEach(function(l){ if(C.mejor[l]) lineas.push('Mejor precio '+L[l]+': '+aAmericana(C.mejor[l].d)+' en '+C.mejor[l].n+(C.mejoraVsPeor[l]!=null?' (paga '+(C.mejoraVsPeor[l]*100).toFixed(1)+'% más que la peor casa)':'')+'.'); });
    lineas.forEach(function(x){ res.appendChild(el('p',{class:'nota',text:x})); });
    if(C.consenso){
      res.appendChild(el('p',{class:'nota',text:'Lo que dice el mercado sin margen (promedio de las casas): '+L[0]+' '+(C.consenso[0]*100).toFixed(1)+'% · '+L[1]+' '+(C.consenso[1]*100).toFixed(1)+'%. '+
        'Pagando el mejor precio: EV '+(C.evConsenso[0]==null?'—':signo(C.evConsenso[0]*100,1)+'%')+' en '+L[0]+', '+(C.evConsenso[1]==null?'—':signo(C.evConsenso[1]*100,1)+'%')+' en '+L[1]+' (si el mercado tiene razón).'}));
    }
    if(C.ev){
      var ok=[0,1].filter(function(l){ return C.ev[l]!=null&&C.ev[l]>0; });
      res.appendChild(el('div',{class:'flag '+(ok.length?'verde':''),text:ok.length
        ? 'Con tu número ('+numero(estado.p)+'% para '+L[0]+'), '+ok.map(function(l){ return L[l]+' en '+C.mejor[l].n+' tiene EV '+signo(C.ev[l]*100,1)+'%'; }).join(' y ')+'. Recuerda que tu número solo vale si le ganó antes al cierre.'
        : 'Con tu número ('+numero(estado.p)+'% para '+L[0]+'), ni siquiera el mejor precio de cada lado tiene EV positivo ('+(C.ev[0]==null?'—':signo(C.ev[0]*100,1)+'%')+' / '+(C.ev[1]==null?'—':signo(C.ev[1]*100,1)+'%')+'). Mejor no apostar este.'}));
    }
    var hay=filas.filter(function(f){ return aDecimal(f.a)&&aDecimal(f.b); }).length;
    if(hay<2) res.appendChild(el('p',{class:'nota',text:'Con una sola casa completa no se puede comparar; pon los dos lados en al menos dos.'}));
  }
  function inp(ph,val,fn,extra){ var i=el('input',{type:'text',inputmode:'text',placeholder:ph,autocomplete:'off','aria-label':ph,value:val||''}); i.addEventListener('input',function(){ fn(i.value); pintar(); }); if(extra) i.setAttribute('maxlength',extra); return i; }
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'¿Cuál casa paga más?'}),
    el('p',{class:'nota',text:'Escribe las cuotas del mismo juego en cada casa. Acepta americanas (-150, +130), decimales (1.91) y centavos de Kalshi (64¢, con su comisión ya incluida).'}),
    el('div',{class:'fila'},[inp('Visita (equipo A)','',function(v){ estado.nA=v; },24),inp('Local (equipo B)','',function(v){ estado.nH=v; },24)])]));
  var tabla=el('div',{class:'caja'},[el('div',{class:'cab'},[el('span',{text:'Casa'}),el('span',{text:'Visita'}),el('span',{text:'Local'})])]);
  filas.forEach(function(f){
    tabla.appendChild(el('div',{class:'casa'},[el('b',{text:f.n}),inp('-150',f.a,function(v){ f.a=v; }),inp('+130',f.b,function(v){ f.b=v; })]));
  });
  cont.appendChild(tabla);
  function campo(rot,i){ return el('label',{class:'campo'},[el('span',{text:rot}),i]); }
  cont.appendChild(el('div',{class:'caja'},[el('div',{class:'fila'},[
    campo('Tu prob. de la visita % (opcional)',inp('ej. 58','',function(v){ estado.p=v; })),
    campo('Total $ para repartir si hay arbitraje',inp('100','100',function(v){ estado.tot=v; }))])]));
  cont.appendChild(res); pintar();
}

/* ----- avisos ----- */
function pantallaAvisos(cont){
  limpiar(cont);
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'Avisos al teléfono'}),
    el('p',{class:'nota',text:'Un robot en GitHub revisa MLB cada 30 minutos en horas de juego y te manda un aviso por ntfy (el mismo tema privado del escáner) cuando:'}),
    el('ul',{class:'lis'},[el('li',{text:'⚾ Cambia el abridor probable de un juego (el pick que armaste con el otro ya no vale).'}),
      el('li',{text:'📋 Sale la alineación oficial (para confirmar que juegan las estrellas).'}),
      el('li',{text:'🌬️ Hay viento fuerte, lluvia o frío que mueve el total.'}),
      el('li',{text:'📈 La cuota de Pinnacle se mueve 3 puntos o más entre dos revisiones del escáner (que corre 3 veces al día): alguien con información está apostando.'})]),
    el('p',{class:'nota',text:'Cada aviso se manda una sola vez. Si no te llegan, revisa en GitHub → Actions que el robot «Avisos MLB» esté corriendo y que el secreto NTFY_TOPIC exista.'})]));
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'🩹 Lesionados dentro de NBA, NHL y NFL'}),
    el('p',{class:'nota',text:'Un robot en GitHub baja la lista de lesionados de ESPN cada 3 horas y la deja en un archivo chico. En el Escáner de cada app, cada juego muestra quién está fuera y quién es dudoso de los dos equipos, y la barra «Escáner del día» te dice cuántos son nuevos sin abrirla.'}),
    el('ul',{class:'lis'},[el('li',{text:'🆕 = no estaba la última vez que abriste el Escáner. La primera vez solo guarda la lista de hoy como base.'}),
      el('li',{text:'Los jugadores que no juegan por decisión técnica no cuentan como lesionados.'}),
      el('li',{text:'Si el secreto NTFY_TOPIC existe, el robot además te manda UN aviso al teléfono por corrida con los Out y Doubtful nuevos de equipos que juegan hoy o mañana.'}),
      el('li',{text:'La línea del mercado ya trae las lesiones conocidas: el aviso sirve para saber qué cambió, no para sumarle al número.'})])]));
  cont.appendChild(el('div',{class:'caja'},[el('h3',{text:'Dentro de la app MLB'}),
    el('p',{class:'nota',text:'Cuando abres la lista de juegos y un abridor es distinto al que vio la app la última vez, la tarjeta de ese juego marca ⚠️ «Cambió el abridor» con los dos nombres.'})]));
}

/* ----- registro automático (autoregistro.js): mide si la app sirve con TODOS los juegos, sin que tengas que guardar nada -----
   Vista fácil: un deporte a la vez, por semana / mes / todo, marcador modelo contra mercado y la lista de juegos
   con quién eligió cada uno y quién ganó. Lo técnico (grupos, Brier, ROI con margen) queda plegado al final. */
var DIAS_C=['dom','lun','mar','mié','jue','vie','sáb'];
function autoFav(p){ return p?(p.L>=p.A?'L':'A'):null; }
/* un juego guardado → lo que hace falta para pintarlo: a quién eligió el modelo, el mercado, quién ganó y la unidad apostada */
function autoFila(r,A){
  var m=r.m1||r.m0||null, k=r.k1||r.k0||null, o={r:r,t:r.ts,fin:!!(r.res&&r.res!=='X'),anul:r.res==='X'};
  o.fm=autoFav(m); o.fk=autoFav(k); o.pm=m&&o.fm?m[o.fm]:null; o.pk=k&&o.fk?k[o.fk]:null;
  if(o.fin){
    o.okM=o.fm?r.res===o.fm:null; o.okK=o.fk?r.res===o.fk:null;
    var d=A&&A.derivar?A.derivar(r):null;
    if(d&&d.k&&d.favMix){ var dec=A.precio3(d.k[d.favMix]); if(dec>0) o.u=(r.res===d.favMix)?dec-1:-1; }
  }
  return o;
}
function autoStats(fs){
  var s={n:0,pend:0,mN:0,mW:0,kN:0,kW:0,u:0,uN:0,choque:0,chM:0,chK:0};
  fs.forEach(function(f){
    if(f.anul) return;
    if(!f.fin){ s.pend++; return; }
    s.n++;
    if(f.okM!=null){ s.mN++; if(f.okM) s.mW++; }
    if(f.okK!=null){ s.kN++; if(f.okK) s.kW++; }
    if(f.u!=null){ s.u+=f.u; s.uN++; }
    if(f.fm&&f.fk&&f.fm!==f.fk){ s.choque++; if(f.okM) s.chM++; if(f.okK) s.chK++; }
  });
  return s;
}
function pct0(w,n){ return n?Math.round(w/n*100)+'%':'—'; }
function pantallaAuto(cont,ls){
  limpiar(cont);
  var A=root.OVARegAuto;
  if(!A){ cont.appendChild(el('div',{class:'flag rojo',text:'No cargó el módulo del registro automático (autoregistro.js).'})); return; }
  var items=[]; try{ items=JSON.parse(ls.getItem('ova_auto_v1')||'[]')||[]; }catch(e){ items=[]; }
  var V={dep:null,tipo:'semana',off:0}; try{ var g0=JSON.parse(ls.getItem('ova_auto_vista')||'null'); if(g0&&typeof g0==='object'){ V.dep=g0.dep||null; if(/^(semana|mes|todo)$/.test(g0.tipo)) V.tipo=g0.tipo; } }catch(e){}
  function guardarV(){ try{ ls.setItem('ova_auto_vista',JSON.stringify({dep:V.dep,tipo:V.tipo})); }catch(e){} }
  function repintar(){ pantallaAuto(cont,ls); }

  cont.appendChild(el('div',{class:'caja'},[
    el('h3',{text:'🤖 ¿La app acierta?'}),
    el('p',{class:'nota',text:'Cada juego se guarda solo antes de empezar. Aquí ves a quién eligió tu modelo, a quién el mercado (Pinnacle; si se acaban las llamadas, la línea de ESPN sin margen) y quién ganó de verdad. No son tus picks: no tocan Mis picks, tu CLV ni tu banca.'}),
    el('div',{class:'pie2'},[el('button',{type:'button',text:'↻ Buscar resultados nuevos',onclick:function(){ A.resolver(true).then(repintar,repintar); }})])]));
  if(!items.length){
    cont.appendChild(el('div',{class:'vacio'},[el('b',{text:'Todavía no hay juegos guardados'}),
      el('p',{text:'Abre MLB, Fútbol, NBA, NHL o NFL con juegos por jugar y se guardan solos.'})]));
    return;
  }
  var cuenta={}; items.forEach(function(r){ if(r&&r.app) cuenta[r.app]=(cuenta[r.app]||0)+1; });
  var orden=['mlb','fut','nba','nhl','nfl'];
  if(!V.dep||!cuenta[V.dep]){ V.dep=orden.filter(function(a){ return cuenta[a]; }).sort(function(x,y){ return cuenta[y]-cuenta[x]; })[0]; }

  /* deporte */
  var chD=el('div',{class:'chips',role:'tablist'});
  orden.forEach(function(a){
    chD.appendChild(el('button',{type:'button',class:a===V.dep?'on':'',disabled:cuenta[a]?null:'disabled','aria-pressed':String(a===V.dep),
      text:APPS[a]+' · '+(cuenta[a]||0),onclick:function(){ V.dep=a; V.off=0; guardarV(); pintar(); }}));
  });
  [].forEach.call(chD.querySelectorAll('button[disabled=null]'),function(b){ b.removeAttribute('disabled'); });
  cont.appendChild(chD);
  var cuerpo=el('div',{class:'autoC'}); cont.appendChild(cuerpo);

  function pintar(){
    [].forEach.call(chD.children,function(b,i){ var on=orden[i]===V.dep; b.className=on?'on':''; b.setAttribute('aria-pressed',String(on)); });
    limpiar(cuerpo);
    var todas=items.filter(function(r){ return r&&r.app===V.dep; }).map(function(r){ return autoFila(r,A); }).sort(function(x,y){ return y.t-x.t; });
    /* periodo elegido */
    var ini=null, fin=null, etq='Todo lo guardado';
    if(V.tipo!=='todo'){
      ini=inicioPeriodo(Date.now(),V.tipo);
      for(var i=0;i<V.off;i++){ if(V.tipo==='mes') ini.setMonth(ini.getMonth()-1); else ini.setDate(ini.getDate()-7); }
      fin=new Date(ini.getTime()); if(V.tipo==='mes') fin.setMonth(fin.getMonth()+1); else fin.setDate(fin.getDate()+7);
      etq=(V.off===0?(V.tipo==='mes'?'Este mes · ':'Esta semana · '):(V.off===1?(V.tipo==='mes'?'Mes pasado · ':'Semana pasada · '):''))+etiquetaPeriodo(ini,V.tipo);
    }
    var fs=todas.filter(function(f){ return !ini||(f.t>=ini.getTime()&&f.t<fin.getTime()); });
    var hayAntes=ini&&todas.some(function(f){ return f.t<ini.getTime(); });

    var chT=el('div',{class:'chips'});
    [['semana','Semana'],['mes','Mes'],['todo','Todo']].forEach(function(x){
      chT.appendChild(el('button',{type:'button',class:V.tipo===x[0]?'on':'','aria-pressed':String(V.tipo===x[0]),text:x[1],onclick:function(){ V.tipo=x[0]; V.off=0; guardarV(); pintar(); }}));
    });
    cuerpo.appendChild(chT);
    if(V.tipo!=='todo') cuerpo.appendChild(el('div',{class:'navP'},[
      el('button',{type:'button','aria-label':'Anterior',text:'‹',disabled:hayAntes?null:'disabled',onclick:function(){ V.off++; pintar(); }}),
      el('b',{text:etq}),
      el('button',{type:'button','aria-label':'Siguiente',text:'›',disabled:V.off>0?null:'disabled',onclick:function(){ V.off=Math.max(0,V.off-1); pintar(); }})]));
    [].forEach.call(cuerpo.querySelectorAll('button[disabled="null"]'),function(b){ b.removeAttribute('disabled'); });

    var s=autoStats(fs);
    /* marcador */
    var caja=el('div',{class:'caja'});
    caja.appendChild(el('div',{class:'duelo'},[
      el('div',{class:'lado'+(s.mN&&s.kN&&s.mW/s.mN>s.kW/s.kN?' gana':'')},[el('span',{text:'🧠 Tu modelo'}),el('b',{text:pct0(s.mW,s.mN)}),el('small',{text:s.mN?'acertó '+s.mW+' de '+s.mN:'sin juegos terminados'})]),
      el('div',{class:'lado'+(s.mN&&s.kN&&s.kW/s.kN>s.mW/s.mN?' gana':'')},[el('span',{text:'📈 Mercado'}),el('b',{text:pct0(s.kW,s.kN)}),el('small',{text:s.kN?'acertó '+s.kW+' de '+s.kN:'sin precio todavía'})])]));
    var lin=[];
    if(s.uN) lin.push(el('div',{class:'linA'},[el('span',{text:'💵 Si apostabas 1 unidad a lo que dice la app'}),el('b',{class:s.u>0.005?'g':(s.u<-0.005?'p':''),text:signo(s.u,1)+' u'})]));
    if(s.choque) lin.push(el('div',{class:'linA'},[el('span',{text:'⚔️ No coincidieron ('+s.choque+')'}),el('b',{text:'modelo '+s.chM+' · mercado '+s.chK})]));
    lin.push(el('div',{class:'linA'},[el('span',{text:'⏳ Por jugarse o sin resultado'}),el('b',{text:String(s.pend)})]));
    lin.forEach(function(x){ caja.appendChild(x); });
    if(s.n&&s.n<30) caja.appendChild(el('p',{class:'nota',text:'Con '+s.n+' juego'+(s.n===1?'':'s')+' terminado'+(s.n===1?'':'s')+' esto todavía es casi pura suerte. Mira el «Todo» cuando pase de 100.'}));
    cuerpo.appendChild(caja);

    /* resumen de todas las semanas o meses */
    if(V.tipo!=='todo'){
      var per={}; todas.forEach(function(f){ var k=inicioPeriodo(f.t,V.tipo).getTime(); (per[k]=per[k]||[]).push(f); });
      var ks=Object.keys(per).map(Number).sort(function(a,b){ return b-a; });
      if(ks.length>1||(ks.length===1&&V.off>0)){
        var t=el('table',{class:'tab'},[el('tr',null,[V.tipo==='mes'?'Mes':'Semana','Modelo','Mercado','Unid.'].map(function(h){ return el('th',{text:h}); }))]);
        var base=inicioPeriodo(Date.now(),V.tipo).getTime();
        ks.forEach(function(k){
          var st=autoStats(per[k]), d=new Date(k), off=0, x=new Date(base);
          while(x.getTime()>k&&off<120){ if(V.tipo==='mes') x.setMonth(x.getMonth()-1); else x.setDate(x.getDate()-7); off++; }
          var tr=el('tr',{class:off===V.off?'sel':'',style:'cursor:pointer',onclick:function(){ V.off=off; pintar(); }},[
            el('td',{text:etiquetaPeriodo(d,V.tipo)}),
            el('td',{class:'n',text:st.mN?st.mW+'-'+(st.mN-st.mW):'—'}),
            el('td',{class:'n',text:st.kN?st.kW+'-'+(st.kN-st.kW):'—'}),
            el('td',{class:'n '+(st.u>0.005?'g':(st.u<-0.005?'p':'')),text:st.uN?signo(st.u,1):'—'})]);
          t.appendChild(tr);
        });
        cuerpo.appendChild(el('div',{class:'caja'},[el('h3',{text:V.tipo==='mes'?'📅 Mes por mes':'📅 Semana por semana'}),t,
          el('p',{class:'nota',text:'Ganados-perdidos de cada uno. Toca una fila para ver sus juegos.'})]));
      }
    }

    /* lista de juegos por día */
    var lista=el('div',{class:'caja'},[el('h3',{text:'🗓️ Juegos ('+fs.length+')'})]);
    if(!fs.length) lista.appendChild(el('p',{class:'nota',text:V.tipo==='todo'?'No hay juegos guardados de este deporte.':'No hay juegos guardados en este periodo. Usa ‹ para ir hacia atrás.'}));
    var diaAnt=null;
    fs.forEach(function(f){
      var r=f.r, d=new Date(f.t), dia=DIAS_C[d.getDay()]+' '+d.getDate()+' '+MES_C[d.getMonth()];
      if(dia!==diaAnt){ lista.appendChild(el('div',{class:'diaA',text:dia})); diaAnt=dia; }
      var gl=r.res==='L', gv=r.res==='A', tieneM=r.gl!=null&&r.gv!=null;
      var eq=function(nom,sc,gano){ return el('div',{class:'eqA'+(gano?' gano':'')},[el('span',{text:nom}),el('b',{text:tieneM?String(sc):''})]); };
      var est=f.anul?'Anulado':(f.fin?(r.res==='D'?'Empate':'Final'):('⏳ '+d.toLocaleTimeString('es-US',{hour:'numeric',minute:'2-digit',hour12:true})));
      var pick=function(lab,fav,p,ok){
        if(!fav) return el('span',{class:'pkA'},[lab+': sin precio']);
        var nom=fav==='L'?r.local:r.visita;
        return el('span',{class:'pkA'+(ok===true?' si':(ok===false?' no':''))},[(ok===true?'✅ ':(ok===false?'❌ ':''))+lab+': '+nom+(p!=null?' '+Math.round(p*100)+'%':'')]);
      };
      lista.appendChild(el('div',{class:'jA'},[
        el('div',{class:'jAtop'},[el('div',{class:'eqs'},[eq(r.local,r.gl,gl),eq(r.visita,r.gv,gv)]),el('small',{class:'estA',text:est})]),
        el('div',{class:'pksA'},[pick('🧠 Modelo',f.fm,f.pm,f.okM),pick('📈 Mercado',f.fk,f.pk,f.okK)]),
        (V.dep==='fut'&&r.liga)?el('small',{class:'ligA',text:r.liga}):null]));
    });
    cuerpo.appendChild(lista);

    /* lo técnico, plegado */
    var o=A.resumir(items,V.dep), av=el('div',null,[el('div',{class:'flag '+(o.conMer<30?'ambar':'')},[A.veredicto(o)])]);
    var gr=o.grupos.filter(function(g){ return g.n>0; });
    if(gr.length){
      var tg=el('table',{class:'tab'},[el('tr',null,['Grupo','Juegos','Acierto (mercado)','ROI techo','ROI real'].map(function(h){ return el('th',{text:h}); }))]);
      gr.forEach(function(g){ tg.appendChild(el('tr',null,[el('td',{text:g.nombre}),el('td',{class:'n',text:String(g.n)}),
        el('td',{class:'n',text:g.hit.toFixed(0)+'% ('+(g.esp==null?'—':g.esp.toFixed(0)+'%')+')'}),el('td',{class:'n',text:signo(g.roi0,1)+'%'}),
        el('td',{class:'n',text:signo(g.roi3,1)+'%'+(g.se3!=null?' ±'+g.se3.toFixed(1):'')})])); });
      av.appendChild(tg);
      av.appendChild(el('p',{class:'nota',text:'Se apuesta 1 unidad al favorito de la mezcla 50/50 modelo + mercado, al precio del mercado. «ROI techo» es sin margen de casa; «ROI real» descuenta un 3%. Entre paréntesis, cuánto acertaba el mercado en promedio: si el acierto no pasa de ahí, no hay ventaja.'}));
    }
    var b=o.brier;
    if(b.n>=5&&b.mod!=null) av.appendChild(el('p',{class:'nota',text:'Calibración (Brier, más bajo es mejor) en '+b.n+' juegos: modelo '+b.mod.toFixed(3)+' · mercado '+b.mer.toFixed(3)+' · mezcla '+b.mix.toFixed(3)+'.'}));
    if(o.sinMer.n) av.appendChild(el('p',{class:'nota',text:o.sinMer.n+' juegos resueltos sin precio de mercado: el favorito del modelo acertó '+o.sinMer.hit.toFixed(0)+'%.'}));
    av.appendChild(el('div',{class:'pie2'},[el('button',{type:'button',text:'📋 Copiar datos',onclick:function(){
      var txt=A.exportar(items), nav=root.navigator||{};
      function mostrar(){ var ta=el('textarea',{rows:'6',readonly:'readonly'}); ta.value=txt; av.appendChild(ta); try{ ta.focus(); ta.select(); }catch(e){} }
      if(nav.clipboard&&nav.clipboard.writeText) nav.clipboard.writeText(txt).then(function(){ av.appendChild(el('p',{class:'nota',text:'Copiado ('+items.length+' juegos). Pégalo en Notas o en el chat.'})); },mostrar); else mostrar();
    }})]));
    cuerpo.appendChild(el('details',{class:'caja avA'},[el('summary',{text:'🔬 Datos avanzados (todo el historial)'}),av]));
  }
  pintar();
}

/* ----- Salud: qué tan frescos están los datos y qué lleva guardado cada app ----- */
function edadTxt(ms){ var m=Math.max(0,Math.round(ms/6e4)); if(m<60) return 'hace '+Math.max(1,m)+' min'; var h=Math.round(m/60); if(h<48) return 'hace '+h+' h'; return 'hace '+Math.round(h/24)+' días'; }
var SALUD_DATOS=[['⚾ MLB','pinnacle-datos.json',30],['⚽ Fútbol','pinnacle-futbol.json',30],['🏀 NBA','pinnacle-nba.json',30],['🏒 NHL','pinnacle-nhl.json',36],['🏈 NFL','pinnacle-nfl.json',120]];
function pedirJson(url){
  if(!root.fetch) return Promise.resolve(null);
  return root.fetch(url+(url.indexOf('?')<0?'?t='+Date.now():''),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
}
function pantallaSalud(cont,ls){
  limpiar(cont);
  var ahora=Date.now();
  /* 1. Precios de Pinnacle */
  var cajaP=el('div',{class:'caja'},[el('h3',{text:'Precios de Pinnacle (mercado)'}),
    el('p',{class:'nota',text:'Los baja un escáner de GitHub varias veces al día. Verde = al día · ámbar = viejo (la app avisa «cuotas viejas»). Si un deporte no tiene archivo, la app usa las líneas de ESPN.'})]);
  var listaP=el('div',{},[el('p',{class:'nota',text:'Leyendo…'})]); cajaP.appendChild(listaP); cont.appendChild(cajaP);
  Promise.all(SALUD_DATOS.map(function(d){ return pedirJson(d[1]); })).then(function(rs){
    limpiar(listaP);
    SALUD_DATOS.forEach(function(d,i){
      var j=rs[i], g=j&&j.generado?Date.parse(j.generado):NaN, n=j&&j.juegos?j.juegos.length:0, txt, cls;
      if(!j||!isFinite(g)){ txt='sin archivo todavía'; cls='ambar'; }
      else{ var ed=ahora-g; cls=ed<=d[2]*36e5?'verde':'ambar'; txt=edadTxt(ed)+' · '+n+(n===1?' juego':' juegos'); }
      listaP.appendChild(el('div',{class:'flag '+cls,style:'margin:6px 0'},[el('b',{text:d[0]+': '}),txt]));
    });
  });
  /* 1b. Lesionados (rama «datos», los baja un robot de GitHub cada 3 horas) */
  var cajaL=el('div',{class:'caja'},[el('h3',{text:'Lesionados (NBA, NHL y NFL)'}),
    el('p',{class:'nota',text:'Los baja un robot de GitHub desde ESPN cada 3 horas. El Escáner de cada app los muestra por juego y marca 🆕 lo que cambió desde la última vez que lo abriste.'})]);
  var listaL=el('div',{},[el('p',{class:'nota',text:'Leyendo…'})]); cajaL.appendChild(listaL); cont.appendChild(cajaL);
  var DEPL=[['🏀 NBA','nba'],['🏒 NHL','nhl'],['🏈 NFL','nfl']];
  Promise.all(DEPL.map(function(d){ return pedirJson('https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/datos/lesiones-'+d[1]+'.json'); })).then(function(rs){
    limpiar(listaL);
    DEPL.forEach(function(d,i){
      var j=rs[i], g=j&&j.generado?Date.parse(j.generado):NaN, ok=j&&isFinite(g)&&(ahora-g)<=9*36e5;
      var n=j&&j.equipos?Object.keys(j.equipos).reduce(function(a,k){ return a+((j.equipos[k].l||[]).length); },0):0;
      listaL.appendChild(el('div',{class:'flag '+(ok?'verde':'ambar'),style:'margin:6px 0'},[el('b',{text:d[0]+': '}),
        j&&isFinite(g)?edadTxt(ahora-g)+' · '+n+' reportados · '+((j.juegan||[]).length)+' juegos próximos':'sin archivo todavía']));
    });
  });
  /* 2. Archivo de partidos (NHL y NFL) */
  var cajaA=el('div',{class:'caja'},[el('h3',{text:'Archivo de partidos (NHL y NFL)'}),
    el('p',{class:'nota',text:'Lo actualiza GitHub cada día; de ahí salen las calificaciones de los equipos.'})]);
  var listaA=el('div',{},[el('p',{class:'nota',text:'Leyendo…'})]); cajaA.appendChild(listaA); cont.appendChild(cajaA);
  Promise.all([pedirJson('hist-nhl.json'),pedirJson('hist-nfl.json')]).then(function(rs){
    limpiar(listaA);
    [['🏒 NHL',rs[0]],['🏈 NFL',rs[1]]].forEach(function(x){
      var j=x[1], g=j&&j.generado?Date.parse(j.generado):NaN, ok=j&&isFinite(g)&&(ahora-g)<=48*36e5;
      listaA.appendChild(el('div',{class:'flag '+(ok?'verde':'ambar'),style:'margin:6px 0'},[el('b',{text:x[0]+': '}),
        j&&isFinite(g)?edadTxt(ahora-g)+' · '+(j.g?j.g.length:0)+' partidos · '+(j.teams?Object.keys(j.teams).length:0)+' equipos':'no se pudo leer']));
    });
  });
  /* 3. Lo que lleva guardado cada app */
  var A=root.OVARegAuto, items=[]; try{ items=JSON.parse(ls.getItem('ova_auto_v1')||'[]')||[]; }catch(e){ items=[]; }
  var cajaG=el('div',{class:'caja'},[el('h3',{text:'Registro automático por app'})]);
  var t=el('table',{class:'tab'},[el('tr',null,['App','Guardados','Con resultado','Pendientes','Último'].map(function(h){ return el('th',{text:h}); }))]);
  Object.keys(APPS).forEach(function(a){
    var mios=items.filter(function(r){ return r&&r.app===a; }), res=mios.filter(function(r){ return r.res!=null&&r.res!==''; }).length;
    var ult=mios.reduce(function(m,r){ return Math.max(m,+r.ts||0); },0);
    t.appendChild(el('tr',null,[el('td',{text:APPS[a]}),el('td',{class:'n',text:String(mios.length)}),el('td',{class:'n',text:String(res)}),el('td',{class:'n',text:String(mios.length-res)}),el('td',{class:'n',text:ult?edadTxt(ahora-ult):'—'})]));
  });
  cajaG.appendChild(t); cont.appendChild(cajaG);
  /* 4. Respaldo */
  var cajaR=el('div',{class:'caja'},[el('h3',{text:'Respaldo de tus picks'})]);
  var linea=el('div',{class:'flag',style:'margin:6px 0'},['Leyendo…']); cajaR.appendChild(linea); cont.appendChild(cajaR);
  var R=root.OVARespaldo;
  if(R&&R.estado) R.estado(ls).then(function(e){
    if(e){ linea.textContent=''; linea.className='flag verde'; linea.appendChild(root.document.createTextNode('Copia interna '+edadTxt(ahora-e.t)+' · '+e.picks+' picks. Se guarda sola; si Safari borra los datos, la app te ofrece restaurarla.')); }
    else{ linea.className='flag ambar'; linea.textContent='Todavía no hay copia interna (se crea sola cuando guardas tu primer pick).'; }
  },function(){ linea.textContent='No se pudo leer la copia interna.'; });
  else linea.textContent='El módulo de respaldo no cargó.';
  /* 5. Forzar actualización */
  var cajaU=el('div',{class:'caja'},[el('h3',{text:'¿La app se ve vieja?'}),
    el('p',{class:'nota',text:'La app se actualiza sola cada vez que abres con internet. Si algo se ve desactualizado, este botón borra la copia guardada en el teléfono y vuelve a bajar todo. No toca tus picks, tu banca ni tus ajustes.'}),
    el('div',{class:'pie2'},[el('button',{type:'button',text:'🔄 Forzar actualización',onclick:function(){
      var tareas=[];
      try{ if(root.caches&&root.caches.keys) tareas.push(root.caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return root.caches.delete(k); })); })); }catch(e){}
      try{ if(root.navigator&&root.navigator.serviceWorker&&root.navigator.serviceWorker.getRegistrations) tareas.push(root.navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.unregister(); })); })); }catch(e){}
      Promise.all(tareas).catch(function(){}).then(function(){ root.location.reload(); });
    }})])]);
  cont.appendChild(cajaU);
}

/* ----- arranque ----- */
var TABS=[['marcador','📊 Marcador'],['banca','💰 Banca'],['casas','🏦 Casas'],['auto','🤖 Auto'],['avisos','🔔 Avisos'],['salud','🩺 Salud']];
function arrancar(){
  var d=root.document, cont=d.getElementById('vista'), nav=d.getElementById('tabs'); if(!cont||!nav) return;
  var ls; try{ ls=root.localStorage; }catch(e){ ls={getItem:function(){ return null; }}; }
  function ir(k){
    if(!TABS.some(function(t){ return t[0]===k; })) k='marcador';
    Array.prototype.forEach.call(nav.children,function(b){ b.classList.toggle('on',b.getAttribute('data-k')===k); b.setAttribute('aria-selected',b.getAttribute('data-k')===k?'true':'false'); });
    if(k==='marcador') pantallaMarcador(cont,ls); else if(k==='banca') pantallaBanca(cont); else if(k==='casas') pantallaCasas(cont); else if(k==='auto') pantallaAuto(cont,ls); else if(k==='salud') pantallaSalud(cont,ls); else pantallaAvisos(cont);
    try{ if(root.history&&root.history.replaceState) root.history.replaceState(null,'','#'+k); }catch(e){}
  }
  TABS.forEach(function(t){ nav.appendChild(el('button',{type:'button',role:'tab','data-k':t[0],text:t[1],onclick:function(){ ir(t[0]); }})); });
  ir((root.location.hash||'').replace('#','')||'marcador');
}

var API={aDecimal:aDecimal,aAmericana:aAmericana,quitarMargen:quitarMargen,compararCasas:compararCasas,normalizar:normalizar,resumir:resumir,
  curva:curva,ventana:ventana,porPeriodo:porPeriodo,racha:racha,clvDe:clvDe,impPctTxt:impPctTxt,pagoMlb:pagoMlb,numero:numero,arrancar:arrancar,TABS:TABS};
root.OVAHerr=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
else if(root.document){ if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',arrancar); else arrancar(); }
})(typeof window!=='undefined'?window:globalThis);
