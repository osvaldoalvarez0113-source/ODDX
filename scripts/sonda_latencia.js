// Sonda de atraso: mide qué tan fresco llega cada fuente gratis durante partidos EN VIVO (fútbol, NBA, MLB).
// Guarda una muestra por consulta en muestras.jsonl (sin los datos completos) para compararlas después.
const fs=require('fs');
const DUR=(+process.env.DUR_MIN||200)*60e3, PASO=5000;
const ESPN='https://site.api.espn.com/apis/site/v2/sports/', CORE='https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
const LIGAS=['eng.1','esp.1','ger.1','ita.1','fra.1','uefa.champions','uefa.europa','uefa.europa.conf','usa.1','mex.1','bra.1','arg.1','ned.1','por.1','tur.1','eng.2','conmebol.libertadores','concacaf.champions','jpn.1','kor.1','aus.1'];
const ORIGEN='https://osvaldoalvarez0113-source.github.io';
const OUT='muestras.jsonl'; fs.writeFileSync(OUT,'');
const say=(...a)=>console.log(new Date().toISOString().slice(11,19),...a);
function rec(o){ o.t=Date.now(); fs.appendFileSync(OUT,JSON.stringify(o)+'\n'); }
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
async function get(url,origen){
 const t0=Date.now();
 try{
  const nba=/nba\.com/.test(url); const r=await fetch(url,{headers:Object.assign({'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1','Accept':'application/json, text/plain, */*'},nba?{Referer:'https://www.nba.com/',Origin:'https://www.nba.com'}:(origen?{Origin:ORIGEN}:{}))});
  const txt=await r.text(); let j=null; try{ j=JSON.parse(txt); }catch(e){}
  const h=r.headers;
  return {status:r.status,ms:Date.now()-t0,j,len:txt.length,hdr:{age:h.get('age'),cc:h.get('cache-control'),date:h.get('date'),lm:h.get('last-modified'),cors:h.get('access-control-allow-origin'),srv:h.get('x-cache')||h.get('x-served-by')||h.get('server')}};
 }catch(e){ return {status:0,ms:Date.now()-t0,err:String(e.message||e).slice(0,80),hdr:{}}; }
}
const espera=ms=>new Promise(r=>setTimeout(r,ms));

// ---------- 0) cabeceras de caché de cada fuente (cuánto puede envejecer un dato aunque todo salga bien) ----------
async function cabeceras(){
 const hoy=new Date(), urls=[];
 urls.push(['espn-scoreboard-fut',ESPN+'soccer/uefa.champions/scoreboard']);
 urls.push(['espn-scoreboard-nba',ESPN+'basketball/nba/scoreboard']);
 urls.push(['nbacom-scoreboard','https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json']);
 try{ const s=await get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',true); const g=s.j&&s.j.scoreboard&&s.j.scoreboard.games&&s.j.scoreboard.games[0]; if(g){ urls.push(['nbacom-pbp','https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_'+g.gameId+'.json']); urls.push(['nbacom-box','https://cdn.nba.com/static/json/liveData/boxscore/boxscore_'+g.gameId+'.json']); } }catch(e){}
 let pk=null;
 for(const d of [0,1,2,3,4,5]){
  const dia=new Date(hoy-d*864e5).toISOString().slice(0,10);
  const s=await get('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+dia); const g=s.j&&s.j.dates&&s.j.dates[0]&&s.j.dates[0].games&&s.j.dates[0].games[0];
  if(g){ pk=g.gamePk; urls.push(['mlb-schedule','https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+dia]); break; }
 }
 if(pk){
  urls.push(['mlb-feed-live','https://statsapi.mlb.com/api/v1.1/game/'+pk+'/feed/live']);
  urls.push(['mlb-diffpatch','https://statsapi.mlb.com/api/v1.1/game/'+pk+'/feed/live/diffPatch?startTimecode=20200101_000000']);
  urls.push(['mlb-timestamps','https://statsapi.mlb.com/api/v1.1/game/'+pk+'/feed/live/timestamps']);
  urls.push(['savant-gf','https://baseballsavant.mlb.com/gf?game_pk='+pk]);
 }
 for(const [n,u] of urls){ const r=await get(u,true); rec({src:'cabeceras',n,u:u.slice(0,110),status:r.status,ms:r.ms,len:r.len,hdr:r.hdr}); say('cabeceras',n,r.status,JSON.stringify(r.hdr)); }
}

// ---------- 1) descubrir juegos en vivo ----------
async function vivosFut(){
 const out=[];
 for(const l of LIGAS){
  const evs=[]; for(const dd of [new Date(),new Date(Date.now()-864e5)]){ const r=await get(ESPN+'soccer/'+l+'/scoreboard?dates='+ymd(dd)); ((r.j&&r.j.events)||[]).forEach(e=>evs.push(e)); }
  const vistos={}; evs.forEach(e=>{ if(vistos[e.id]) return; vistos[e.id]=1; const st=e.status&&e.status.type&&e.status.type.state; if(st==='in'){ const c=(e.competitions&&e.competitions[0])||{}; out.push({dep:'fut',liga:l,id:e.id,nombre:e.shortName||e.name,sc:(c.competitors||[]).map(x=>x.score).join('-'),clk:e.status.displayClock}); } });
 }
 return out;
}
async function vivosNba(){
 const r=await get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json'); const e=await get(ESPN+'basketball/nba/scoreboard');
 const espn={}; ((e.j&&e.j.events)||[]).forEach(x=>{ const c=(x.competitions&&x.competitions[0])||{}; const ab=(c.competitors||[]).map(t=>t.team&&t.team.abbreviation).sort().join('-'); espn[ab]={id:x.id,st:x.status&&x.status.type&&x.status.type.state}; });
 const out=[];
 ((r.j&&r.j.scoreboard&&r.j.scoreboard.games)||[]).forEach(g=>{ if(g.gameStatus===2){ const ab=[g.homeTeam.teamTricode,g.awayTeam.teamTricode].sort().join('-'); out.push({dep:'nba',id:g.gameId,espn:espn[ab]&&espn[ab].id,nombre:g.awayTeam.teamTricode+'@'+g.homeTeam.teamTricode}); } });
 return out;
}
async function vivosMlb(){
 const r=await get('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+new Date().toISOString().slice(0,10)); const out=[];
 ((r.j&&r.j.dates||[]).forEach(d=>d.games.forEach(g=>{ if(g.status&&g.status.abstractGameState==='Live') out.push({dep:'mlb',id:g.gamePk,nombre:g.teams.away.team.name+'@'+g.teams.home.team.name}); })));
 return out;
}

// ---------- 2) una vuelta de muestras por juego ----------
const ult={};   // últimos conteos para saber cuándo pedir la última página
async function muestraFut(e){
 const base=CORE+e.liga+'/events/'+e.id+'/competitions/'+e.id+'/plays';
 const a=await get(base+'?limit=1',true); const total=a.j&&a.j.count||0; const k='core'+e.id;
 let extra={};
 if(total&&total!==ult[k]){
  ult[k]=total; const b=await get(base+'?limit=25&page='+Math.max(1,Math.ceil(total/25)),true); const it=(b.j&&b.j.items)||[]; const u=it[it.length-1];
  if(u) extra={lastId:u.id,lastWall:u.wallclock||null,lastClk:u.clock&&u.clock.displayValue,lastType:u.type&&u.type.text,lastXY:typeof u.fieldPositionX==='number',gol:!!u.scoringPlay,txt:(u.text||'').slice(0,60)};
 }
 rec({src:'core',dep:'fut',ev:e.id,nombre:e.nombre,count:total,status:a.status,ms:a.ms,hdr:a.hdr,nueva:!!extra.lastId,...extra});
 const s=await get(ESPN+'soccer/'+e.liga+'/summary?event='+e.id,true); const j=s.j||{}; const com=j.commentary||[], key=j.keyEvents||[];
 const lc=com[0]&&(com[0].sequence!=null)?com.reduce((m,c)=>Math.max(m,c.sequence||0),0):0; const comUlt=com.find(c=>(c.sequence||0)===lc)||{};
 const cc=((j.header&&j.header.competitions&&j.header.competitions[0])||{}).competitors||[];
 rec({src:'summary',dep:'fut',ev:e.id,status:s.status,ms:s.ms,len:s.len,hdr:s.hdr,com:com.length,key:key.length,lastSeq:lc,lastComClk:comUlt.time&&comUlt.time.displayValue,lastComTxt:(comUlt.text||'').slice(0,50),score:cc.map(c=>c.score).join('-'),clk:j.header&&j.header.competitions&&j.header.competitions[0]&&j.header.competitions[0].status&&j.header.competitions[0].status.displayClock});
 const c=await get('https://cdn.espn.com/core/soccer/playbyplay?xhr=1&gameId='+e.id,true); const g=(c.j&&c.j.gamepackageJSON)||{};
 rec({src:'cdn-pbp',dep:'fut',ev:e.id,status:c.status,ms:c.ms,len:c.len,hdr:c.hdr,plays:(g.plays||[]).length,com:(g.commentary||[]).length,key:(g.keyEvents||[]).length});
}
async function muestraNba(e){
 const p=await get('https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_'+e.id+'.json',true); const ac=(p.j&&p.j.game&&p.j.game.actions)||[]; const u=ac[ac.length-1]||{};
 rec({src:'nbacom-pbp',dep:'nba',ev:e.id,nombre:e.nombre,status:p.status,ms:p.ms,len:p.len,hdr:p.hdr,count:ac.length,lastNum:u.actionNumber,lastTA:u.timeActual||null,lastClk:u.clock,lastPer:u.period,lastType:u.actionType,txt:(u.description||'').slice(0,50),hs:u.scoreHome,as:u.scoreAway});
 if(e.espn){
  const s=await get(ESPN+'basketball/nba/summary?event='+e.espn,true); const pl=(s.j&&s.j.plays)||[]; const l=pl[pl.length-1]||{};
  rec({src:'espn-summary',dep:'nba',ev:e.id,espn:e.espn,nombre:e.nombre,status:s.status,ms:s.ms,len:s.len,hdr:s.hdr,count:pl.length,lastId:l.id,lastWall:l.wallclock||null,lastClk:l.clock&&l.clock.displayValue,lastPer:l.period&&l.period.number,txt:(l.text||'').slice(0,50),hs:l.homeScore,as:l.awayScore});
 }
}
async function muestraMlb(e){
 const f=await get('https://statsapi.mlb.com/api/v1.1/game/'+e.id+'/feed/live',true); const j=f.j||{}; const all=(j.liveData&&j.liveData.plays&&j.liveData.plays.allPlays)||[]; const cp=(j.liveData&&j.liveData.plays&&j.liveData.plays.currentPlay)||{}; const ev=(cp.playEvents||[]); const le=ev[ev.length-1]||{};
 rec({src:'mlb-feed',dep:'mlb',ev:e.id,nombre:e.nombre,status:f.status,ms:f.ms,len:f.len,hdr:f.hdr,tsMeta:j.metaData&&j.metaData.timeStamp,plays:all.length,evN:ev.length,lastEvEnd:le.endTime||null,lastEvStart:le.startTime||null,lastEvType:le.details&&le.details.description,atBat:cp.about&&cp.about.atBatIndex});
 const g=await get('https://baseballsavant.mlb.com/gf?game_pk='+e.id,true); const gj=g.j||{};
 rec({src:'savant-gf',dep:'mlb',ev:e.id,status:g.status,ms:g.ms,len:g.len,hdr:g.hdr,keys:Object.keys(gj).slice(0,8).join(','),last:(gj.exit_velocity&&gj.exit_velocity.length)||null});
}

(async()=>{
 const t0=Date.now(); say('Sonda de atraso iniciada, duración (min):',DUR/60000);
 await cabeceras();
 let vivos=[], proxima=0, lote=0;
 while(Date.now()-t0<DUR){
  const ini=Date.now();
  if(ini>=proxima){
   try{ vivos=[].concat(await vivosFut(),await vivosNba(),await vivosMlb()); }catch(e){ say('descubrir falló',e.message); }
   proxima=ini+60000; say('EN VIVO:',vivos.map(v=>v.dep+' '+v.nombre).join(' | ')||'ninguno');
   rec({src:'vivos',lista:vivos.map(v=>v.dep+':'+v.nombre+':'+v.id)});
  }
  await Promise.all(vivos.map(v=>(v.dep==='fut'?muestraFut(v):v.dep==='nba'?muestraNba(v):muestraMlb(v)).catch(e=>say('muestra falló',v.nombre,String(e.message).slice(0,60)))));
  const resto=PASO-(Date.now()-ini); if(resto>0) await espera(resto);
 }
 say('Sonda terminada.');
})();
