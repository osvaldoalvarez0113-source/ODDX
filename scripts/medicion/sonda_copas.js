'use strict';
const B='https://site.api.espn.com/apis/site/v2/sports/soccer/';
const UA={accept:'application/json','user-agent':'Mozilla/5.0 (ova-experimento-jugadores)'};
const pausa=()=>new Promise(s=>setTimeout(s,600));
(async()=>{ for (const u of ['uefa.champions/scoreboard?dates=2024&limit=1000','uefa.champions/scoreboard?dates=2023&limit=1000','uefa.champions/scoreboard?dates=2018&limit=1000','fifa.friendly/scoreboard?dates=2024&limit=1000','uefa.nations/scoreboard?dates=2024&limit=1000','eng.fa/scoreboard?dates=2024&limit=1000','fifa.worldq.uefa/scoreboard?dates=2024&limit=1000','eng.1/scoreboard?dates=2024&limit=1000']) {
  const r=await fetch(B+u,{headers:UA}); const j=await r.json().catch(()=>({})); const ev=j.events||[]; const ds=ev.map(e=>e.date).sort(); console.log(r.status,u,ev.length,ds[0],ds[ds.length-1]); await pausa(); }
 for (const [sl,f] of [['uefa.champions','20241022'],['eng.1','20241026'],['uefa.champions',''],['eng.1',''],['fifa.friendly','20241015']]) {
  const j=await (await fetch(B+sl+'/scoreboard'+(f?'?dates='+f:''),{headers:UA})).json(); const e=(j.events||[])[0]; if(!e){console.log(sl,f,'sin eventos');continue;} const c=e.competitions[0];
  console.log('--',sl,f,e.id,e.status.type.name,'scoreboard odds:',JSON.stringify(c.odds||null).slice(0,700));
  const s=await (await fetch(B+sl+'/summary?event='+e.id,{headers:UA})).json(); console.log('   hasOdds',s.hasOdds,'pickcenter',(s.pickcenter||[]).length,JSON.stringify((s.pickcenter||[])[0]||null).slice(0,700)); console.log('   odds',(s.odds||[]).length,JSON.stringify((s.odds||[]).map(o=>({p:o.provider&&o.provider.name,h:o.homeTeamOdds&&o.homeTeamOdds.odds,d:o.drawOdds,a:o.awayTeamOdds&&o.awayTeamOdds.odds}))).slice(0,700)); await pausa(); }
})();
