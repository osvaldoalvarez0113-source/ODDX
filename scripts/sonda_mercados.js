/* Guarda la lista COMPLETA de mercados de OddsPapi para futbol americano (14) y hockey (15), para leer lineas de handicap y totales de Pinnacle. */
const fs=require('fs'); const KEY=process.env.ODDSPAPI_KEY||''; const OP='https://api.oddspapi.io/v4';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync('muestras-mercados',{recursive:true});
  for(let i=0;i<6;i++){
    const r=await fetch(OP+'/markets?'+new URLSearchParams({apiKey:KEY})); const t=await r.text();
    console.log('intento',i,r.status,t.length);
    if(r.status===200){ const j=JSON.parse(t); const a=Array.isArray(j)?j:Object.values(j);
      const f=a.filter(x=>x.sportId===14||x.sportId===15).map(x=>({marketId:x.marketId,marketName:x.marketName,marketType:x.marketType,period:x.period,handicap:x.handicap,marketLength:x.marketLength,playerProp:x.playerProp,outcomes:(x.outcomes||[]).map(o=>({outcomeId:o.outcomeId,outcomeName:o.outcomeName}))}));
      fs.writeFileSync('muestras-mercados/mercados-14-15.json',JSON.stringify(f)); console.log('guardados',f.length); return; }
    await sleep(20000*(i+1));
  }
})();
