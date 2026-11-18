globalThis.OVAForma=require('../../forma.js'); const MEM=require('../../memoria.js');
const d=JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(process.argv[2]||'mlb.json.gz')));
const G=[]; for(const sk of Object.keys(d.temps)) for(const x of d.temps[sk].g){ if(x.hs==null) continue; G.push({ts:x.ts,h:x.h,a:x.a,hs:x.hs,as:x.as,ml:x.ln&&x.ln.ml}); }
G.sort((a,b)=>a.ts-b.ts);
const imp=a=>a<0?-a/(-a+100):100/(a+100);
const grp={cuesta:[0,0,0],cumple:[0,0,0],sorpresa:[0,0,0],nunca:[0,0,0]}; let i=0;
for(const g of G){ if(!g.ml||g.hs===g.as) continue; if((i++)%3) continue;   // 1 de cada 3 para que sea rápido
  const a=imp(g.ml[1]),h=imp(g.ml[0]); const pH=h/(a+h), favH=pH>=0.5, p=favH?pH:1-pH, y=(g.hs>g.as)===favH?1:0;
  const m=MEM.calc(G,g.ts,'mlb'), f=m[favH?g.h:g.a], r=m[favH?g.a:g.h], add=k=>{grp[k][0]++;grp[k][1]+=p;grp[k][2]+=y;};
  if(f&&f.fav.n>=10){const pf=f.fav.w/f.fav.n; if(pf<=0.45) add('cuesta'); else if(pf>=0.70) add('cumple');}
  if(r&&r.dog.n>=10){const pd=r.dog.w/r.dog.n; if(pd>=0.5) add('sorpresa'); else if(pd<=0.15) add('nunca');}
}
for(const k in grp){const [n,s,y]=grp[k]; if(n) console.log(k,'n',n,'mercado dice',(100*s/n).toFixed(1),'gano',(100*y/n).toFixed(1),'z',((y-s)/Math.sqrt(s*(1-s/n))).toFixed(1));}
