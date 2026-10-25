/* SONDA NHL + NFL: mira como vienen los datos reales de ESPN y de OddsPapi/Pinnacle para hockey y futbol americano.
   No cambia nada de la app: solo escribe un informe (sonda-nhl-nfl.md) para disenar los modelos con datos reales. */
const fs=require('fs'); const KEY=process.env.ODDSPAPI_KEY||''; const OP='https://api.oddspapi.io/v4';
const out=[]; const P=(...a)=>{ const s=a.join(' '); out.push(s); console.log(s); };
const lim=(s,n)=>String(s).replace(KEY,'***').slice(0,n);
function claves(o,pre,prof,sal){ if(prof<0||o==null||typeof o!=='object') return; 
  if(Array.isArray(o)){ sal.push(pre+'[] x'+o.length); if(o[0]!=null) claves(o[0],pre+'[0]',prof-1,sal); return; }
  Object.keys(o).forEach(k=>{ const v=o[k]; if(v!==null&&typeof v==='object') { sal.push(pre+'.'+k+(Array.isArray(v)?'[]':'{}')); claves(v,pre+'.'+k,prof-1,sal);} else sal.push(pre+'.'+k+'='+lim(JSON.stringify(v),50)); }); }
async function get(url){ try{ const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}}); const t=await r.text(); return {s:r.status,t}; }catch(e){ return {s:0,t:String(e.message)}; } }
async function espn(nombre,url,detalle){
  const r=await get(url); P('\n### ESPN '+nombre+' -> HTTP '+r.s+' · '+r.t.length+' bytes\n'+url);
  if(r.s!==200){ P(lim(r.t,200)); return null; }
  let j; try{ j=JSON.parse(r.t); }catch(e){ P('no es JSON'); return null; }
  if(detalle){ const s=[]; claves(j,'',detalle,s); P(s.slice(0,260).join('\n')); }
  return j;
}
(async()=>{
  const B='https://site.api.espn.com/apis/site/v2/sports/';
  for(const [dep,ruta,fechas] of [['NHL','hockey/nhl',['20251025','20260110']],['NFL','football/nfl',['20251026','20260104']]]){
    for(const f of fechas){
      const j=await espn(dep+' scoreboard '+f,B+ruta+'/scoreboard?dates='+f,0);
      if(j&&j.events&&j.events[0]){ const e=j.events[0]; P('eventos: '+j.events.length+' · season: '+JSON.stringify(j.season||e.season)+' · week: '+JSON.stringify(e.week||j.week||null));
        const s=[]; claves(e,'',5,s); P(s.slice(0,330).join('\n')); }
    }
    /* rango de fechas (temporada completa en una llamada) */
    const rng=dep==='NHL'?'20251001-20251031':'20250904-20250930';
    const j=await espn(dep+' rango '+rng,B+ruta+'/scoreboard?dates='+rng+'&limit=1000',0);
    if(j&&j.events){ P('eventos en rango: '+j.events.length); const est={}; j.events.forEach(e=>{ const n=e.status&&e.status.type&&e.status.type.name; est[n]=(est[n]||0)+1; }); P('estados: '+JSON.stringify(est)); }
    /* temporada: calendario */
    await espn(dep+' calendario',B+ruta+'/scoreboard',2);
    await espn(dep+' equipos',B+ruta+'/teams',2);
    await espn(dep+' standings',B.replace('/v2/sports','/v2/sports')+ruta+'/standings',2);
  }
  /* una partida terminada con detalle (NHL: tiros, shootout; NFL: yardas, turnovers) */
  for(const [dep,ruta,f] of [['NHL','hockey/nhl','20251025'],['NFL','football/nfl','20251026']]){
    const r=await get(B+ruta+'/scoreboard?dates='+f); if(r.s!==200) continue; let j; try{j=JSON.parse(r.t);}catch(e){continue;}
    const e=(j.events||[]).find(x=>x.status&&x.status.type&&x.status.type.completed); if(!e) { P(dep+': sin juego terminado ese dia'); continue; }
    P('\n### '+dep+' juego '+e.id+' '+e.name);
    const s=await espn(dep+' summary',B+ruta+'/summary?event='+e.id,3);
    if(s&&s.pickcenter) P('pickcenter: '+lim(JSON.stringify(s.pickcenter),900));
    if(s&&s.odds) P('odds: '+lim(JSON.stringify(s.odds),900));
    if(s&&s.header) P('header.competitions[0].status: '+lim(JSON.stringify(s.header.competitions&&s.header.competitions[0].status),400));
    if(s&&s.boxscore&&s.boxscore.teams){ P('boxscore equipo0 stats: '+lim(JSON.stringify((s.boxscore.teams[0].statistics||[]).map(x=>x.name+'='+x.displayValue)),900)); }
  }
  /* OddsPapi */
  if(!KEY){ P('\nSin ODDSPAPI_KEY'); }
  else{
    const op=async(p,q)=>{ const u=new URLSearchParams(Object.assign({apiKey:KEY},q||{})); const r=await fetch(OP+p+'?'+u); const t=await r.text(); return {s:r.status,t}; };
    let r=await op('/sports'); P('\n### OddsPapi /sports -> '+r.s); try{ const j=JSON.parse(r.t); const a=Array.isArray(j)?j:Object.values(j); P(a.map(x=>(x.sportId||x.id)+'='+(x.sportName||x.name||x.slug)).join(' | ')); }catch(e){ P(lim(r.t,500)); }
    let sp={}; try{ const j=JSON.parse(r.t); (Array.isArray(j)?j:Object.values(j)).forEach(x=>{ sp[x.sportId||x.id]=(x.sportName||x.name||x.slug||'')+''; }); }catch(e){}
    const ids=Object.keys(sp).filter(k=>/hockey|american|football|nfl|nhl/i.test(sp[k]));
    P('deportes candidatos: '+ids.map(k=>k+'='+sp[k]).join(' | '));
    for(const id of ids){
      await new Promise(z=>setTimeout(z,1500));
      r=await op('/tournaments',{sportId:id}); P('\n### /tournaments sportId='+id+' ('+sp[id]+') -> '+r.s);
      try{ const j=JSON.parse(r.t); const a=Array.isArray(j)?j:Object.values(j);
        const f=a.filter(x=>/nhl|nfl|national hockey|national football|usa|united states|north america/i.test(JSON.stringify(x)));
        P('total '+a.length+' · USA/NHL/NFL: '+f.slice(0,25).map(x=>(x.tournamentId||x.id)+'='+(x.tournamentName||x.name)+(x.categoryName?' ['+x.categoryName+']':'')).join(' | ')); 
        if(!f.length) P(a.slice(0,15).map(x=>JSON.stringify(x)).join('\n')); }catch(e){ P(lim(r.t,400)); }
    }
    await new Promise(z=>setTimeout(z,1500));
    r=await op('/markets'); P('\n### /markets -> '+r.s);
    try{ const j=JSON.parse(r.t); const a=Array.isArray(j)?j:Object.values(j);
      for(const id of ids){
        const m=a.filter(x=>String(x.sportId)===String(id)&&!x.playerProp);
        P('mercados deporte '+id+': '+m.length);
        m.filter(x=>x.marketLength<=3&&/fulltime|full_time|incl|match|regular|game/i.test(String(x.period||'')+' '+x.marketName)).slice(0,40).forEach(x=>P('  '+x.marketId+' | '+x.marketName+' | '+x.marketType+' | '+x.period+' | h='+x.handicap+' | '+(x.outcomes||[]).map(o=>o.outcomeId+'='+o.outcomeName).join(',')));
      } }catch(e){ P(lim(r.t,400)); }
  }
  fs.writeFileSync('sonda-nhl-nfl.md',out.join('\n'));
})();
