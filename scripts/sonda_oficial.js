/* Sonda de fuentes oficiales (solo lee): enseña la forma real de las respuestas de MLB StatsAPI
   para escribir la verificación de la Mesa sin adivinar campos. */
const fs=require('fs');
const out=[]; const log=(...a)=>{ const t=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(t); out.push(t); };
async function g(u){ const r=await fetch(u,{headers:{'user-agent':'ova-sonda'}}); const t=await r.text(); let j=null; try{ j=JSON.parse(t); }catch(e){} return {s:r.status,j:j,t:t}; }
function dia(d){ const x=new Date(Date.now()+d*864e5); return x.toISOString().slice(0,10); }
(async()=>{
 for(const d of [0,1,-1]){
  const f=dia(d);
  const u='https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+f+'&hydrate=lineups,probablePitcher,team,venue,weather,officials';
  const r=await g(u); log('== schedule',f,'HTTP',r.s);
  const juegos=[]; ((r.j&&r.j.dates)||[]).forEach(x=>(x.games||[]).forEach(y=>juegos.push(y)));
  log('juegos',juegos.length);
  if(juegos.length){
   const j=juegos[0];
   log('claves del juego:',Object.keys(j).join(','));
   log('status:',j.status);
   log('teams.away keys:',Object.keys(j.teams.away).join(','));
   log('probablePitcher away:',j.teams.away.probablePitcher);
   log('lineups:',j.lineups?Object.keys(j.lineups).join(','):'NO HAY lineups');
   if(j.lineups){ for(const k of Object.keys(j.lineups)){ const a=j.lineups[k]; log(k,'n=',a&&a.length,a&&a[0]); } }
   log('weather:',j.weather);
   log('resumen todos:',juegos.map(y=>({pk:y.gamePk,a:y.teams.away.team.name,h:y.teams.home.team.name,st:y.status.detailedState,la:y.lineups&&y.lineups.awayPlayers?y.lineups.awayPlayers.length:0,lh:y.lineups&&y.lineups.homePlayers?y.lineups.homePlayers.length:0,pa:y.teams.away.probablePitcher&&y.teams.away.probablePitcher.fullName,ph:y.teams.home.probablePitcher&&y.teams.home.probablePitcher.fullName})));
   const tid=j.teams.home.team.id;
   const ro=await g('https://statsapi.mlb.com/api/v1/teams/'+tid+'/roster?rosterType=fullRoster&hydrate=person');
   log('== roster full HTTP',ro.s,'n=',ro.j&&ro.j.roster&&ro.j.roster.length,ro.j&&ro.j.roster&&ro.j.roster[0]);
   const tr=await g('https://statsapi.mlb.com/api/v1/transactions?teamId='+tid+'&startDate='+dia(-3)+'&endDate='+dia(0));
   log('== transactions HTTP',tr.s,'n=',tr.j&&tr.j.transactions&&tr.j.transactions.length,(tr.j&&tr.j.transactions||[]).slice(0,4).map(x=>({d:x.date,t:x.typeDesc,p:x.person&&x.person.fullName,tx:(x.description||'').slice(0,140)})));
   const bx=await g('https://statsapi.mlb.com/api/v1/game/'+j.gamePk+'/boxscore');
   log('== boxscore HTTP',bx.s,'keys',bx.j&&Object.keys(bx.j).join(','),'battingOrder away:',bx.j&&bx.j.teams&&bx.j.teams.away&&bx.j.teams.away.battingOrder);
   break;
  }
 }
 const e=await g('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries'); log('== espn nba injuries HTTP',e.s,e.j&&Object.keys(e.j).join(','),e.j&&e.j.injuries&&e.j.injuries[0]&&JSON.stringify(e.j.injuries[0]).slice(0,500));
 const h=await g('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard'); log('== espn soccer HTTP',h.s,h.j&&h.j.events&&h.j.events.length);
 fs.writeFileSync('resultado_oficial.txt',out.join('\n'));
})().catch(e=>{ log('ERROR',String(e)); fs.writeFileSync('resultado_oficial.txt',out.join('\n')); });
