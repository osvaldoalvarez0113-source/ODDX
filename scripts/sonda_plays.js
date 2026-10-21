// Sonda: ¿ESPN da los pases del partido con coordenadas (como la cancha en vivo de FotMob)? ¿Se puede leer desde el navegador? ¿Qué tan fresco llega?
const CORE='https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
const SITE='https://site.api.espn.com/apis/site/v2/sports/soccer/';
const LIGAS=['eng.1','esp.1','ger.1','ita.1','fra.1','uefa.champions','uefa.europa','usa.1','mex.1','bra.1','arg.1','ned.1','por.1','conmebol.libertadores','eng.2','tur.1','concacaf.champions'];
const ORIGEN='https://osvaldoalvarez0113-source.github.io';
const out=[]; const log=(...a)=>{ const s=a.join(' '); out.push(s); console.log(s); };
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
async function get(url,origen){
 const t0=Date.now();
 const r=await fetch(url,{headers:origen?{Origin:ORIGEN}:{}}); const ms=Date.now()-t0;
 const txt=await r.text(); let j=null; try{ j=JSON.parse(txt); }catch(e){}
 return {status:r.status,ms,j,cors:r.headers.get('access-control-allow-origin'),len:txt.length};
}
(async()=>{
 const ahora=Date.now(); log('Hora de la sonda (UTC):',new Date(ahora).toISOString());
 const eventos=[];
 for(const l of LIGAS){
  for(const d of [new Date(ahora),new Date(ahora-864e5)]){
   try{
    const r=await get(SITE+l+'/scoreboard?dates='+ymd(d));
    ((r.j&&r.j.events)||[]).forEach(e=>{ const st=(e.status&&e.status.type&&e.status.type.state)||'?'; eventos.push({liga:l,id:e.id,nombre:e.shortName||e.name,estado:st,fecha:e.date}); });
   }catch(e){ log('scoreboard falló',l,String(e.message).slice(0,60)); }
  }
 }
 const porEstado={}; eventos.forEach(e=>porEstado[e.estado]=(porEstado[e.estado]||0)+1);
 log('Juegos encontrados:',eventos.length,JSON.stringify(porEstado));
 const vivos=eventos.filter(e=>e.estado==='in'), post=eventos.filter(e=>e.estado==='post');
 log('EN VIVO ahora:',vivos.map(e=>e.liga+' '+e.nombre).join(' | ')||'ninguno');
 // elegir muestra: todos los vivos + 1 terminado por liga (máx 14)
 const muestra=[...vivos]; const vistas={}; post.forEach(e=>{ if(!vistas[e.liga]&&muestra.length<16){ vistas[e.liga]=1; muestra.push(e); } });
 let corsMostrado=false;
 for(const e of muestra){
  const base=CORE+e.liga+'/events/'+e.id+'/competitions/'+e.id+'/plays';
  try{
   const a=await get(base+'?limit=1',true);
   if(!corsMostrado){ log('CORS (core API) access-control-allow-origin =',a.cors); corsMostrado=true; }
   if(a.status!==200||!a.j){ log('[',e.liga,e.nombre,e.estado,'] plays HTTP',a.status); continue; }
   const total=a.j.count||0; const tam=100, ultima=Math.max(1,Math.ceil(total/tam));
   const b=await get(base+'?limit='+tam+'&page='+ultima,true);
   const items=(b.j&&b.j.items)||[];
   const conXY=items.filter(p=>typeof p.fieldPositionX==='number'), conFin=items.filter(p=>typeof p.fieldPosition2X==='number');
   const tipos={}; items.forEach(p=>{ const t=(p.type&&p.type.text)||'?'; tipos[t]=(tipos[t]||0)+1; });
   const ult=items[items.length-1]; const wc=ult&&ult.wallclock?Date.parse(ult.wallclock):null;
   const conJ=items.filter(p=>p.participants&&p.participants[0]&&p.participants[0].jersey).length;
   log('['+e.liga+'] '+e.nombre+' ('+e.estado+') total jugadas='+total+' · última página='+items.length+' · con coordenada='+conXY.length+' · con destino='+conFin.length+' · con dorsal='+conJ+' · '+a.ms+'/'+b.ms+' ms');
   log('   tipos:',JSON.stringify(tipos).slice(0,230));
   if(ult){ log('   última jugada:',(ult.text||'').slice(0,90),'| reloj',ult.clock&&ult.clock.displayValue,'| wallclock',ult.wallclock,'|',wc?('retraso vs ahora = '+Math.round((Date.now()-wc)/1000)+' s'):'sin wallclock'); }
   const ej=items.find(p=>typeof p.fieldPosition2X==='number'); if(ej) log('   ejemplo pase:',JSON.stringify({texto:ej.text,x:ej.fieldPositionX,y:ej.fieldPositionY,x2:ej.fieldPosition2X,y2:ej.fieldPosition2Y,dorsal:ej.participants&&ej.participants[0]&&ej.participants[0].jersey,wall:ej.wallclock,reloj:ej.clock&&ej.clock.displayValue}));
  }catch(err){ log('[',e.liga,e.nombre,'] error',String(err.message).slice(0,80)); }
 }
 // ¿el sitio (site API) devuelve CORS?
 try{ const s=await get(SITE+'eng.1/scoreboard',true); log('CORS (site API) access-control-allow-origin =',s.cors); }catch(e){}
 // orden y paginación: primera vs última página en un juego terminado
 if(post[0]){
  const e=post[0], base=CORE+e.liga+'/events/'+e.id+'/competitions/'+e.id+'/plays';
  const p1=await get(base+'?limit=3&page=1',true), pu=await get(base+'?limit=3&page=9999',true);
  log('Orden: página 1 ids =',((p1.j&&p1.j.items)||[]).map(p=>p.id+'@'+(p.wallclock||'')).join(' , '));
  log('Página 9999 → HTTP',pu.status,'items',((pu.j&&pu.j.items)||[]).length);
 }
 require('fs').writeFileSync('resultado_plays.txt',out.join('\n'));
})().catch(e=>{ console.log('ERROR',e); require('fs').writeFileSync('resultado_plays.txt',out.join('\n')+'\nERROR '+e); });
