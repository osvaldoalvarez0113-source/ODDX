const fs=require('fs'); const KEY=process.env.ODDSPAPI_KEY||''; const OP='https://api.oddspapi.io/v4';
const out=[]; const P=s=>{out.push(s);console.log(s);};
(async()=>{
  const u=new URLSearchParams({sportId:'10',apiKey:KEY});
  const r=await fetch(OP+'/participants?'+u); const t=await r.text();
  P('GET /participants sportId=10 -> '+r.status+' largo '+t.length); P(t.slice(0,600).replace(KEY,'***'));
  const u2=new URLSearchParams({participantId:'42',apiKey:KEY});
  const r2=await fetch(OP+'/participants?'+u2); const t2=await r2.text();
  P('GET /participants participantId=42 -> '+r2.status); P(t2.slice(0,300).replace(KEY,'***'));
  fs.writeFileSync('sonda.md',out.join('\n'));
})();
