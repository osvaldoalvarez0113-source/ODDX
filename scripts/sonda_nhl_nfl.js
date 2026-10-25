/* SONDA 2 NHL + NFL: guarda muestras CRUDAS (ESPN y OddsPapi/Pinnacle) para construir y probar las apps con datos reales.
   No cambia la app. Escribe la carpeta muestras-nhl-nfl/ (se sube a la rama "sonda-nhl-nfl"). */
const fs=require('fs'); const KEY=process.env.ODDSPAPI_KEY||''; const OP='https://api.oddspapi.io/v4';
const D='muestras-nhl-nfl'; fs.mkdirSync(D,{recursive:true});
const out=[]; const P=(...a)=>{ const s=a.join(' '); out.push(s); console.log(s); };
const clean=s=>String(s).split(KEY||'\u0000').join('***');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>(n<10?'0':'')+n; const ymd=d=>d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate());
async function get(url){ try{ const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}}); const t=await r.text(); return {s:r.status,t}; }catch(e){ return {s:0,t:String(e.message)}; } }
function guardar(nombre,t){ fs.writeFileSync(D+'/'+nombre,t); P('  guardado '+nombre+' ('+t.length+' bytes)'); }
(async()=>{
  const B='https://site.api.espn.com/apis/site/v2/sports/', C='https://sports.core.api.espn.com/v2/sports/';
  const hoy=new Date(); const dia=k=>new Date(Date.UTC(hoy.getUTCFullYear(),hoy.getUTCMonth(),hoy.getUTCDate()+k));
  const DEP=[['nhl','hockey/nhl','hockey/leagues/nhl','20251025'],['nfl','football/nfl','football/leagues/nfl','20251026']];
  for(const [n,ruta,core,fpas] of DEP){
    P('\n== '+n.toUpperCase());
    /* proximos: hoy y los 8 dias siguientes (para ver lineas del scoreboard) */
    let r=await get(B+ruta+'/scoreboard?dates='+ymd(dia(0))); P('scoreboard hoy '+r.s); if(r.s===200) guardar(n+'-scoreboard-hoy.json',r.t);
    r=await get(B+ruta+'/scoreboard'); P('scoreboard sin fecha '+r.s); if(r.s===200) guardar(n+'-scoreboard-actual.json',r.t);
    /* juego pasado: scoreboard + summary + core odds */
    r=await get(B+ruta+'/scoreboard?dates='+fpas); let ev=null;
    if(r.s===200){ guardar(n+'-scoreboard-pasado.json',r.t); try{ const j=JSON.parse(r.t); ev=(j.events||[]).find(e=>e.status&&e.status.type&&e.status.type.completed); }catch(e){} }
    if(ev){
      P('juego pasado '+ev.id+' '+ev.name);
      r=await get(C+core+'/events/'+ev.id+'/competitions/'+ev.id+'/odds'); P('core odds '+r.s); guardar(n+'-core-odds.json',r.t);
      r=await get(B+ruta+'/summary?event='+ev.id); P('summary '+r.s);
      if(r.s===200){ try{ const j=JSON.parse(r.t); delete j.plays; delete j.winprobability; guardar(n+'-summary.json',JSON.stringify(j)); }catch(e){} }
    }
    /* variantes de rango de fechas (el NHL dio 400) */
    const a=Date.UTC(2025,9,20), b=Date.UTC(2025,9,26);
    const V=[['rango-simple','?dates=20251020-20251026'],['rango-limit300','?dates=20251020-20251026&limit=300'],['rango-limit1000','?dates=20251020-20251026&limit=1000'],['rango-mes','?dates=20251001-20251031'],['rango-mes-limit','?dates=20251001-20251031&limit=1000'],['por-temporada','?season=2026&seasontype=2&limit=1000'],['semana','?seasontype=2&week=8&dates=2025']];
    for(const [nom,q] of V){ const rr=await get(B+ruta+'/scoreboard'+q); let c='';
      if(rr.s===200){ try{ c=' eventos='+(JSON.parse(rr.t).events||[]).length; }catch(e){} } P('  variante '+nom+' -> '+rr.s+c+(rr.s!==200?' '+clean(rr.t).slice(0,80):'')); }
    r=await get(B+ruta+'/teams'); if(r.s===200) guardar(n+'-teams.json',r.t);
    r=await get(B+ruta+'/injuries'); P('injuries '+r.s); if(r.s===200) guardar(n+'-injuries.json',r.t);
    r=await get(B.replace('/site/v2','/v2').replace('site.api','site.web.api')+ruta+'/standings'); P('standings(alt) '+r.s);
    r=await get('https://site.api.espn.com/apis/v2/sports/'+ruta+'/standings'); P('standings(v2) '+r.s); if(r.s===200) guardar(n+'-standings.json',r.t);
  }
  /* OddsPapi: una llamada por liga (NHL 234, NFL 31) para ver mercados y precios reales de Pinnacle */
  if(!KEY){ P('Sin ODDSPAPI_KEY'); }
  else{
    for(const [n,tid] of [['nhl',234],['nfl',31]]){
      await sleep(7000);
      const u=new URLSearchParams({tournamentIds:String(tid),bookmaker:'pinnacle',apiKey:KEY});
      const r=await get(OP+'/odds-by-tournaments?'+u); P('\nOddsPapi '+n+' -> '+r.s+' '+r.t.length+' bytes');
      if(r.s===200) guardar(n+'-oddspapi.json',clean(r.t)); else P(clean(r.t).slice(0,300));
    }
    await sleep(2000);
    for(const sid of [14,15]){ const u=new URLSearchParams({sportId:String(sid),apiKey:KEY}); const r=await get(OP+'/participants?'+u); P('participants '+sid+' -> '+r.s+' '+r.t.length); if(r.s===200){ guardar('participantes-'+sid+'.json',clean(r.t)); } await sleep(1500); }
    const r=await get(OP+'/markets?'+new URLSearchParams({apiKey:KEY})); P('markets -> '+r.s);
    if(r.s===200){ try{ const j=JSON.parse(r.t); const a=Array.isArray(j)?j:Object.values(j); guardar('mercados-14-15.json',JSON.stringify(a.filter(x=>x.sportId===14||x.sportId===15).map(x=>({marketId:x.marketId,marketName:x.marketName,marketType:x.marketType,period:x.period,handicap:x.handicap,marketLength:x.marketLength,playerProp:x.playerProp,outcomes:x.outcomes})))); }catch(e){ P('markets parse '+e.message); } }
  }
  fs.writeFileSync(D+'/informe.md',out.join('\n'));
})();
