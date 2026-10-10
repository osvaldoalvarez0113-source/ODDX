/* Sonda unica: ve que ligas y mercados tiene OddsPapi para futbol y basquet (pocas llamadas). */
const fs=require('fs'); const KEY=process.env.ODDSPAPI_KEY||''; const OP='https://api.oddspapi.io/v4';
const out=[]; const P=s=>{out.push(s);console.log(s);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function g(path,params){
  const u=new URLSearchParams(params||{}); u.set('apiKey',KEY);
  await sleep(1200);
  const r=await fetch(OP+path+'?'+u.toString()); const t=await r.text();
  P('GET '+path+' '+JSON.stringify(params||{})+' -> '+r.status);
  try{ return JSON.parse(t); }catch(e){ P('  '+t.slice(0,200).replace(KEY,'***')); return null; }
}
(async()=>{
  const sp=await g('/sports'); if(Array.isArray(sp)) P('deportes: '+sp.map(s=>(s.sportId||s.id)+'='+(s.sportName||s.name)).join(', '));
  for(const sid of ['10','11']){
    const t=await g('/tournaments',{sportId:sid});
    if(Array.isArray(t)){
      const buenos=t.filter(x=>/^(nba|premier league|laliga|la liga|serie a|bundesliga|ligue 1|champions league|uefa champions league|mls|major league soccer)$/i.test(String(x.tournamentName||x.name||'').trim()));
      P('sportId '+sid+': '+t.length+' torneos. Candidatos: '+JSON.stringify(buenos.map(x=>({id:x.tournamentId||x.id,n:x.tournamentName||x.name,c:x.categoryName||x.categorySlug}))));
    }
  }
  const m=await g('/markets'); if(m){ const a=Array.isArray(m)?m:Object.values(m); P('mercados: '+a.length); P(JSON.stringify(a.filter(x=>/1x2|moneyline|full time|match winner|winner|home|totals?|over/i.test(JSON.stringify(x))).slice(0,40)).slice(0,3500)); }
  fs.writeFileSync('sonda.md',out.join('\n'));
})();
