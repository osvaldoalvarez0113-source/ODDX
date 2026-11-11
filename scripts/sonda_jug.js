const fs=require('fs'); fs.mkdirSync('sj',{recursive:true});
const W=(n,o)=>fs.writeFileSync('sj/'+n,JSON.stringify(o));
async function j(u){ const r=await fetch(u); return r.ok?r.json():{status:r.status}; }
(async()=>{
  const sb=await j('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261111'); W('scoreboard.json',sb);
  for(const e of sb.events.slice(0,3)){ const id=e.id, base=`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${id}/competitions/${id}`;
    let all=[]; for(let pg=1;pg<5;pg++){ const r=await j(base+`/odds/100/propBets?limit=1000&page=${pg}`); if(!r.items) break; all=all.concat(r.items); if(pg>=r.pageCount) break; }
    W('props_'+id+'.json',all.map(it=>({a:(/athletes\/(\d+)/.exec(it.athlete&&it.athlete.$ref||'')||[])[1],t:it.type&&it.type.name,am:it.odds&&it.odds.american&&it.odds.american.value,tot:it.odds&&it.odds.total&&it.odds.total.value,cur:it.current&&it.current.target&&it.current.target.value,disp:it.current&&it.current.target&&it.current.target.displayValue,upd:it.lastUpdated})));
    const s=await j(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`); W('sum_'+id+'.json',{leaders:s.leaders,injuries:s.injuries,header:s.header&&s.header.competitions&&s.header.competitions[0].competitors.map(c=>({id:c.id,ab:c.team.abbreviation,ha:c.homeAway}))});
    for(const c of e.competitions[0].competitors){ const r=await j(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${c.team.id}/roster`); W('roster_'+c.team.id+'.json',(r.athletes||[]).map(a=>({id:a.id,n:a.displayName,s:a.shortName,pos:a.position&&a.position.abbreviation,inj:(a.injuries||[]).map(x=>x.status)}))); }
  }
  const gl=await j('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/6583/gamelog'); const ev=gl.events; delete gl.events; gl.eventsSample=Object.fromEntries(Object.entries(ev||{}).slice(0,2)); gl.eventsCount=Object.keys(ev||{}).length; W('gamelog.json',gl);
})().catch(e=>{console.error(e);process.exit(1);});
