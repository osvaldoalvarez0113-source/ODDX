const fs=require('fs'); const out=[]; const P=s=>{out.push(String(s));console.log(s);};
const O='https://osvaldoalvarez0113-source.github.io';
async function g(u,show=1500){ try{ const r=await fetch(u,{headers:{Origin:O}}); const t=await r.text(); P('\n### '+u+'\nstatus '+r.status+' ACAO='+r.headers.get('access-control-allow-origin')+' largo '+t.length); if(show) P(t.slice(0,show)); try{return JSON.parse(t);}catch(e){return null;} }catch(e){ P('ERR '+u+' '+e.message); return null; } }
(async()=>{
  const sb=await g('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261111',0);
  const evs=(sb&&sb.events)||[]; P('eventos '+evs.length+' '+evs.map(e=>e.id+' '+e.shortName).join(' | '));
  const e=evs[0]; const id=e.id; const c=e.competitions[0];
  P('competidores '+JSON.stringify(c.competitors.map(x=>({id:x.team.id,ab:x.team.abbreviation,ha:x.homeAway}))));
  const base=`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${id}/competitions/${id}`;
  const od=await g(base+'/odds',800);
  const provs=((od&&od.items)||[]).map(i=>i.provider&&i.provider.id+':'+i.provider.name); P('provs '+provs.join(','));
  let items=[];
  for(const pv of ((od&&od.items)||[]).map(i=>i.provider&&i.provider.id)){ const r=await g(base+`/odds/${pv}/propBets?limit=1000`,2500); if(r&&r.items&&r.items.length){ items=r.items; P('prov con props '+pv+' items '+r.items.length+' pageCount '+r.pageCount); break; } }
  const tipos={}; items.forEach(it=>{ const t=it.type&&it.type.name; tipos[t]=(tipos[t]||0)+1; }); P('TIPOS '+JSON.stringify(tipos));
  P('MUESTRAS'); const vistos=new Set(); items.forEach(it=>{ const t=it.type&&it.type.name; if(vistos.has(t)) return; vistos.add(t); P(JSON.stringify(it).slice(0,1200)); });
  // un atleta: todas sus filas
  const a0=items[0]&&items[0].athlete&&items[0].athlete.$ref; const m=/athletes\/(\d+)/.exec(a0||''); const aid=m&&m[1];
  P('FILAS DEL ATLETA '+aid); items.filter(it=>(it.athlete&&it.athlete.$ref||'').includes('/athletes/'+aid+'?')||(it.athlete&&it.athlete.$ref||'').endsWith('/athletes/'+aid)).slice(0,40).forEach(it=>P(JSON.stringify({t:it.type&&it.type.name,cur:it.current,open:it.open&&it.open.target}).slice(0,500)));
  const tid=c.competitors[0].team.id;
  await g(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${tid}/roster`,1200);
  if(aid){
    await g(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${aid}/gamelog`,3000);
    await g(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${aid}/overview`,800);
    await g(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${aid}`,400);
    await g(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2027/types/2/athletes/${aid}/eventlog`,800);
  }
  const sum=await g(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`,0);
  P('summary keys '+Object.keys(sum||{}).join(',')); if(sum&&sum.leaders) P('leaders '+JSON.stringify(sum.leaders).slice(0,1500));
  // juego terminado ayer: estructura del boxscore
  const sb2=await g('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261110',0);
  const id2=sb2.events[0].id; const s2=await g(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id2}`,0);
  const bp=s2.boxscore.players[0]; P('BOX keys/labels '+JSON.stringify(bp.statistics[0].keys)+' '+JSON.stringify(bp.statistics[0].labels)); P('BOX fila '+JSON.stringify(bp.statistics[0].athletes[0]).slice(0,600));
  fs.writeFileSync('sonda_jug.md',out.join('\n'));
})().catch(e=>{P('FATAL '+e.stack);fs.writeFileSync('sonda_jug.md',out.join('\n'));});
