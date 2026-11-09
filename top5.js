/* OVA · «🌐 Las 5 apps» dentro de Al gane — window.OVATop5
   Junta los juegos que todavía no empiezan en MLB, fútbol, NBA, NHL y NFL (próximas 24 h) y los ordena por % del mercado.
   No hace falta abrir cada app: lee el precio justo de Pinnacle (pinnacle-*.json del repo), lo que ya guardó el registro
   automático (ova_auto_v1) y, si falta, la línea de ESPN del día. Prioridad del precio: Pinnacle > registro > ESPN.
   Arriba arma la combinada de 2 con los dos juegos más fuertes: probabilidad real (p1 × p2), pago justo y cuenta regresiva.
   Cuando una pata empieza, sale de la lista y la combinada se vuelve a armar sola con lo que queda.
   Solo lee: no guarda picks ni toca ningún cálculo. */
(function(root){
"use strict";
var APPS=['mlb','fut','nba','nhl','nfl'];
var EMO={mlb:'⚾',fut:'⚽',nba:'🏀',nhl:'🏒',nfl:'🏈'};
var NOM={mlb:'MLB',fut:'Fútbol',nba:'NBA',nhl:'NHL',nfl:'NFL'};
var LINK={mlb:'index.html',fut:'futbol.html',nba:'nba.html',nhl:'nhl.html',nfl:'nfl.html'};
var PIN={mlb:'pinnacle-datos.json',fut:'pinnacle-futbol.json',nba:'pinnacle-nba.json',nhl:'pinnacle-nhl.json',nfl:'pinnacle-nfl.json'};
var ESPN='https://site.api.espn.com/apis/site/v2/sports/';
var DEP={mlb:'baseball/mlb',nba:'basketball/nba',nhl:'hockey/nhl',nfl:'football/nfl'};
var LIGAS=['eng.1','esp.1','ita.1','ger.1','fra.1','uefa.champions','uefa.europa','uefa.europa.conf','usa.1','mex.1'];
/* mismo corte que «Solo fuertes» (ganadores.js) y mismo aviso de choque con el modelo */
var FUERTE={mlb:.65,fut:.65,nba:.75,nhl:.65,nfl:.75};
var ALERTA={mlb:11,fut:12,nba:16,nhl:9,nfl:15};
var VENTANA=24*3600e3, MIN_ANTES=5*60e3;   /* juegos de las próximas 24 h; a 5 min del inicio ya no entra en la combinada */

/* ---------- funciones puras (se prueban en node) ---------- */
function norm(s){ s=String(s==null?'':s).toLowerCase(); try{ s=s.normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){} return s.replace(/[^a-z0-9 ]/g,'').trim(); }
function ultima(s){ var t=norm(s).split(' ').filter(Boolean); return t.length?t[t.length-1]:''; }
function mismoEq(a,b){
 var x=norm(a).replace(/ /g,''), y=norm(b).replace(/ /g,''); if(!x||!y) return false;
 if(x===y||(x.length>=4&&y.indexOf(x)>=0)||(y.length>=4&&x.indexOf(y)>=0)) return true;
 var u=ultima(a); return u.length>=4&&u===ultima(b);
}
function mismoJuego(a,b){ return a.app===b.app&&Math.abs(a.ts-b.ts)<=3*3600e3&&mismoEq(a.local,b.local)&&mismoEq(a.visita,b.visita); }
function sano(k){
 if(!k) return null; var L=+k.L, A=+k.A, D=k.D==null?null:+k.D;
 if(!(L>0&&L<1&&A>0&&A<1)) return null; var s=L+A+(D>0?D:0); if(!(s>.96&&s<1.04)) return null;
 return {L:L,A:A,D:D>0?D:null};
}
/* pinnacle-*.json → [{app,ts,local,visita,k,fuente}] ; en los archivos el primer nombre es el local */
function dePinnacle(app,j){
 var out=[]; ((j&&j.juegos)||[]).forEach(function(g){
  var n=g&&g.n, p=g&&(g.fair||g.ml), ts=Date.parse(g&&g.t); if(!n||n.length<2||!isFinite(ts)) return;
  if(app==='fut'){ var r=g.r; var kf=r&&r.length===3?sano({L:r[0],D:r[1],A:r[2]}):null; if(kf) out.push({app:app,ts:ts,local:n[0],visita:n[1],k:kf,fuente:'Pinnacle',liga:g.liga||''}); return; }
  if(!p) return;
  var k=sano({L:p[0],A:p[1]});
  if(k) out.push({app:app,ts:ts,local:n[0],visita:n[1],k:k,fuente:'Pinnacle',liga:g.liga||''});
 });
 return out;
}
/* registro automático: trae también lo que dijo tu modelo */
function deRegistro(items,ahora){
 var out=[]; (items||[]).forEach(function(r){
  if(!r||APPS.indexOf(r.app)<0||r.res||!(r.ts>ahora)) return;
  var k=sano(r.k1||r.k0), m=sano(r.m1||r.m0); if((r.app==='nba'||r.app==='nhl'||r.app==='nfl')&&!r.cr) m=null;
  if(!k&&!m) return;
  out.push({app:r.app,ts:r.ts,local:r.local,visita:r.visita,k:k,m:m,fuente:k?(r.ksrc==='pin'?'Pinnacle':'mercado'):'',liga:r.liga||''});
 });
 return out;
}
/* scoreboard de ESPN → líneas sin margen, solo juegos que no han empezado */
function amNum(v){ if(v==null) return null; var n=parseFloat(String(v).replace(/[−–—]/g,'-').replace(/[^0-9.+-]/g,'')); return (isFinite(n)&&Math.abs(n)>=100)?n:null; }
function impl(am){ return am>0?100/(am+100):(-am)/(-am+100); }
function blq(x){ return x&&(x.close||x.current||x.open); }
function deEspn(app,sb){
 var out=[], liga=(sb&&sb.leagues&&sb.leagues[0]&&(sb.leagues[0].abbreviation||sb.leagues[0].name))||'';
 ((sb&&sb.events)||[]).forEach(function(e){
  var c=e.competitions&&e.competitions[0]; if(!c||!c.competitors) return;
  var st=(e.status&&e.status.type)||{}; if(st.state&&st.state!=='pre') return;
  var h=null,a=null; c.competitors.forEach(function(x){ if(x.homeAway==='home') h=x; else if(x.homeAway==='away') a=x; });
  var o=c.odds&&c.odds[0]; if(!h||!a||!h.team||!a.team||!o) return;
  var ph=null,pa=null,pd=null;
  if(o.moneyline){ ph=amNum(blq(o.moneyline.home)&&blq(o.moneyline.home).odds); pa=amNum(blq(o.moneyline.away)&&blq(o.moneyline.away).odds); pd=amNum(blq(o.moneyline.draw)&&blq(o.moneyline.draw).odds); }
  if(ph==null||pa==null){ ph=amNum(o.homeTeamOdds&&o.homeTeamOdds.moneyLine); pa=amNum(o.awayTeamOdds&&o.awayTeamOdds.moneyLine); pd=amNum(o.drawOdds&&o.drawOdds.moneyLine); }
  if(ph==null||pa==null) return; if(app==='fut'&&pd==null) return; if(app!=='fut') pd=null;
  var L=impl(ph), A=impl(pa), D=pd!=null?impl(pd):0, s=L+A+D; if(!(s>.98&&s<1.3)) return;
  var k=sano({L:L/s,A:A/s,D:pd!=null?D/s:null}); if(!k) return;
  out.push({app:app,ts:Date.parse(e.date),local:h.team.displayName||h.team.name,visita:a.team.displayName||a.team.name,k:k,fuente:'ESPN',liga:app==='fut'?liga:''});
 });
 return out;
}
/* une las tres fuentes: el precio de la de más prioridad, el modelo del registro */
function unir(pin,reg,espn,ahora){
 var out=[];
 function meter(g,prio){
  if(!(g.ts>ahora)||g.ts-ahora>VENTANA) return;
  for(var i=0;i<out.length;i++){ var o=out[i]; if(mismoJuego(o,g)){
   if(g.k&&(!o.k||prio<o.prio)){ o.k=g.k; o.fuente=g.fuente; o.prio=prio; }
   if(g.m&&!o.m) o.m=g.m; if(g.liga&&!o.liga) o.liga=g.liga; return; } }
  out.push({app:g.app,ts:g.ts,local:g.local,visita:g.visita,k:g.k||null,m:g.m||null,fuente:g.fuente,liga:g.liga||'',prio:g.k?prio:9});
 }
 (pin||[]).forEach(function(g){ meter(g,1); }); (reg||[]).forEach(function(g){ meter(g,2); }); (espn||[]).forEach(function(g){ meter(g,3); });
 return out.map(fila).filter(Boolean).sort(function(a,b){ if(a.conMercado!==b.conMercado) return a.conMercado?-1:1; return b.p-a.p||a.ts-b.ts; });
}
function fila(g){
 var base=g.k||g.m; if(!base) return null;
 var f=base.L>=base.A?'L':'A', p=base[f], dif=(g.k&&g.m)?(g.m[f]-g.k[f])*100:null;
 var x={app:g.app,ts:g.ts,fav:f==='L'?g.local:g.visita,rival:f==='L'?g.visita:g.local,local:f==='L',p:p,empate:base.D||null,conMercado:!!g.k,fuente:g.fuente,liga:g.liga,
  modelo:g.m?g.m[f]:null,dif:dif,alerta:dif!==null&&Math.abs(dif)>=(ALERTA[g.app]||12)};
 x.fuerte=x.conMercado&&!x.alerta&&p>=(FUERTE[g.app]||.7);
 return x;
}
/* combinada de n patas: los n más fuertes que falten más de 5 min para empezar; si no hay n fuertes, completa con los de mayor % y lo avisa */
function combinada(filas,n,ahora){
 var ok=(filas||[]).filter(function(x){ return x.conMercado&&!x.alerta&&x.ts-ahora>MIN_ANTES; });
 var f=ok.filter(function(x){ return x.fuerte; }), resto=ok.filter(function(x){ return !x.fuerte; });
 var patas=[];
 function choca(x){ return patas.some(function(y){ return y.app===x.app&&(mismoEq(y.fav,x.fav)||mismoEq(y.fav,x.rival)||mismoEq(y.rival,x.fav)||mismoEq(y.rival,x.rival)); }); }
 f.concat(resto).forEach(function(x){ if(patas.length<n&&!choca(x)) patas.push(x); });   /* primero los fuertes; nunca dos patas con el mismo equipo */
 if(patas.length<n) return null;
 var p=patas.reduce(function(s,x){ return s*x.p; },1);
 return {patas:patas,p:p,dec:1/p,am:americana(p),todasFuertes:patas.every(function(x){ return x.fuerte; }),primera:Math.min.apply(null,patas.map(function(x){ return x.ts; }))};
}
function americana(p){ if(!(p>0&&p<1)) return ''; return p>=.5?'−'+Math.round(p/(1-p)*100):'+'+Math.round((1-p)/p*100); }
function cuenta(ms){
 if(!(ms>0)) return 'ya empezó';
 var m=Math.floor(ms/60e3), h=Math.floor(m/60); m=m%60;
 return h?('empieza en '+h+' h '+(m<10?'0':'')+m+' min'):('empieza en '+m+' min');
}
function ymd(ts){ var d=new Date(ts); return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2); }

var API={APPS:APPS,FUERTE:FUERTE,norm:norm,mismoEq:mismoEq,mismoJuego:mismoJuego,dePinnacle:dePinnacle,deRegistro:deRegistro,deEspn:deEspn,unir:unir,fila:fila,combinada:combinada,americana:americana,cuenta:cuenta};
root.OVATop5=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(!root.document||!root.fetch) return;

/* ---------- pantalla ---------- */
var doc=root.document, CACHE=null, CACHE_T=0, RELOJ=null, CAJA=null;
function mk(t,c,x){ var e=doc.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function hora(ts){ try{ return new Date(ts).toLocaleTimeString('es-US',{hour:'numeric',minute:'2-digit',hour12:true}); }catch(e){ return ''; } }
function json(k){ try{ var a=JSON.parse(root.localStorage.getItem(k)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function traer(u){ return root.fetch(u).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
function cargar(){
 if(CACHE&&Date.now()-CACHE_T<10*60e3) return Promise.resolve(CACHE);
 var hoy=Date.now(), dias=[ymd(hoy),ymd(hoy+864e5)], pin=[], esp=[], tareas=[];
 APPS.forEach(function(a){ tareas.push(traer(PIN[a]+'?v='+Math.floor(hoy/6e5)).then(function(j){ pin=pin.concat(dePinnacle(a,j)); })); });
 Object.keys(DEP).forEach(function(a){ dias.forEach(function(d){ tareas.push(traer(ESPN+DEP[a]+'/scoreboard?dates='+d).then(function(j){ esp=esp.concat(deEspn(a,j)); })); }); });
 LIGAS.forEach(function(l){ tareas.push(traer(ESPN+'soccer/'+l+'/scoreboard?dates='+dias[0]+'-'+dias[1]).then(function(j){ esp=esp.concat(deEspn('fut',j)); })); });
 return Promise.all(tareas).then(function(){ CACHE={pin:pin,esp:esp}; CACHE_T=Date.now(); return CACHE; });
}
function css(){
 if(doc.getElementById('t5css')) return; var s=mk('style'); s.id='t5css';
 s.textContent=['.t5Combo{margin:6px 0 14px;padding:12px;border-radius:14px;border:1px solid var(--hot,#fbbf24);background:var(--bg1,#0d1420)}',
 '.t5Combo h4{margin:0 0 6px;font-size:15px;color:var(--txt,#fff)}.t5Pata{display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid var(--line2,#2a3340);font-size:13.5px;color:var(--txt,#fff)}',
 '.t5Pata:first-of-type{border-top:0}.t5Pata b{min-width:44px}.t5Pata small,.t5Cue{color:var(--mut,#9aa);font-size:12px}.t5Big{display:flex;gap:10px;margin:8px 0}',
 '.t5Big div{flex:1;border-radius:10px;background:rgba(255,255,255,.05);padding:8px;text-align:center;font-size:11.5px;color:var(--mut,#9aa)}.t5Big b{display:block;font-size:19px;color:var(--txt,#fff)}',
 '.t5Txt{font-size:12.5px;line-height:1.45;color:var(--mut,#9aa)}.t5Txt b{color:var(--txt,#fff)}',
 '.t5Fila{display:flex;gap:10px;align-items:center;padding:10px 12px;margin:0 0 8px;border-radius:12px;border:1px solid var(--line2,#2a3340);background:var(--bg1,#0d1420);text-decoration:none;color:var(--txt,#fff)}',
 '.t5Fila.fu{border-color:var(--hot,#fbbf24)}.t5Pct{font-size:20px;font-weight:800;min-width:56px}.t5Fila .t5Inf{flex:1;min-width:0;font-size:13.5px;line-height:1.35}.t5Fila .t5Inf small{display:block;color:var(--mut,#9aa);font-size:12px}'].join('');
 doc.head.appendChild(s);
}
function color(p){ return p>=.7?'#34d399':(p>=.6?'#fbbf24':'#9aa'); }
function cajaCombo(c,titulo){
 var b=mk('div','t5Combo'); b.appendChild(mk('h4','',titulo));
 c.patas.forEach(function(x){
  var r=mk('div','t5Pata'), pc=mk('b','',Math.round(x.p*100)+'%'); pc.style.color=color(x.p); r.appendChild(pc);
  var i=mk('div',''); i.appendChild(doc.createTextNode(EMO[x.app]+' '+x.fav+' ')); i.appendChild(mk('small','','vs '+x.rival+' · '+hora(x.ts)+' · '));
  var cu=mk('small','t5Cue',cuenta(x.ts-Date.now())); cu.setAttribute('data-ts',String(x.ts)); i.appendChild(cu); r.appendChild(i); b.appendChild(r);
 });
 var g=mk('div','t5Big'), a=mk('div','','Pegan las '+c.patas.length); a.insertBefore(mk('b','',Math.round(c.p*100)+'%'),a.firstChild);
 var d=mk('div','','Pago justo'); d.insertBefore(mk('b','',c.am+' · '+c.dec.toFixed(2)),d.firstChild); g.appendChild(a); g.appendChild(d); b.appendChild(g);
 var t=mk('div','t5Txt');
 t.appendChild(doc.createTextNode('Si tu casa paga menos de '+c.am+' por esta combinada, te está cobrando el margen dos veces. '));
 t.appendChild(mk('b','','Pierde '+Math.round((1-c.p)*10)+' de cada 10'));
 t.appendChild(doc.createTextNode(c.todasFuertes?'.':'. Ojo: hoy no hay suficientes juegos fuertes, una pata es de las normales.'));
 b.appendChild(t); return b;
}
function render(caja,data){
 while(caja.firstChild) caja.removeChild(caja.firstChild);
 var ahora=Date.now(), filas=unir(data.pin,deRegistro(json('ova_auto_v1'),ahora),data.esp,ahora);
 var con=filas.filter(function(x){ return x.conMercado; }), fu=con.filter(function(x){ return x.fuerte; });
 var porApp={}; con.forEach(function(x){ porApp[x.app]=(porApp[x.app]||0)+1; });
 caja.appendChild(mk('div','gnTit','Próximas 24 horas · '+con.length+' juegos con precio · '+fu.length+' fuertes'+(con.length?' ('+APPS.filter(function(a){ return porApp[a]; }).map(function(a){ return EMO[a]+' '+porApp[a]; }).join(' · ')+')':'')));
 if(!con.length){ caja.appendChild(mk('div','gnNota','No encontré juegos con precio en las próximas 24 horas. Prueba otra vez más tarde o abre cada app para que se guarden.')); return; }
 var c2=combinada(filas,2,ahora);
 if(c2) caja.appendChild(cajaCombo(c2,'🎯 Combinada del día (2 patas)'));
 var c3=combinada(filas,3,ahora);
 if(c3) caja.appendChild(mk('div','gnTit','Con una tercera pata ('+c3.patas[2].fav+') pegaría solo '+Math.round(c3.p*100)+'%, pago justo '+c3.am+'. Con 2 es más seguro.'));
 caja.appendChild(mk('div','gnDia','Los más probables de las 5 apps'));
 con.slice(0,15).forEach(function(x){
  var a=mk('a','t5Fila'+(x.fuerte?' fu':'')); a.href=LINK[x.app];
  var pc=mk('div','t5Pct',Math.round(x.p*100)+'%'); pc.style.color=color(x.p); a.appendChild(pc);
  var i=mk('div','t5Inf'); i.appendChild(doc.createTextNode((x.fuerte?'💪 ':'')+EMO[x.app]+' '+x.fav));
  var s=mk('small','','vs '+x.rival+' · '+hora(x.ts)+(x.empate?' · empate '+Math.round(x.empate*100)+'%':'')+' · '+x.fuente);
  i.appendChild(s); if(x.alerta) i.appendChild(mk('small','','⚠️ Tu modelo no está de acuerdo ('+Math.round(x.modelo*100)+'%)'));
  a.appendChild(i); caja.appendChild(a);
 });
 if(con.length>15) caja.appendChild(mk('div','gnTit','Y '+(con.length-15)+' juegos más, con menos probabilidad.'));
 caja.appendChild(mk('div','gnNota','💪 = fuerte: el mercado le da 65% o más (75% en NBA y NFL) y tu modelo no choca. Toca un juego para ir a su app. La combinada se arma sola otra vez cuando una pata empieza; si ya la metiste, no te guíes por la nueva.'));
}
function pintar(caja){
 css(); CAJA=caja;
 while(caja.firstChild) caja.removeChild(caja.firstChild);
 caja.appendChild(mk('div','gnNota','Buscando los juegos de las 5 ligas…'));
 cargar().then(function(d){ if(CAJA===caja) render(caja,d); });
 if(RELOJ) root.clearInterval(RELOJ);
 RELOJ=root.setInterval(function(){
  if(!CAJA||!CAJA.isConnected||CAJA.offsetParent===null){ root.clearInterval(RELOJ); RELOJ=null; return; }
  var vencio=false;
  Array.prototype.forEach.call(CAJA.querySelectorAll('.t5Cue[data-ts]'),function(e){ var ms=+e.getAttribute('data-ts')-Date.now(); e.textContent=cuenta(ms); if(ms<=MIN_ANTES) vencio=true; });
  if(vencio||Date.now()-CACHE_T>10*60e3) cargar().then(function(d){ if(CAJA) render(CAJA,d); });
 },30e3);
}
API.pintar=pintar;
})(typeof window!=='undefined'?window:this);
