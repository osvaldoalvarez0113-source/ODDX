const R='/home/claude/oddx/';
globalThis.OVAForma=require(R+'forma.js'); const MEM=require(R+'memoria.js');
for (const dep of ['nhl','nfl']) {
  const M=require(R+'modelo-'+dep+'.js'), h=require(R+'hist-'+dep+'.json');
  const G=h.g.map(r=>({id:r[0],ts:r[1],h:r[2],a:r[3],hs:r[4],as:r[5],so:!!(r[7]&1),neutral:!!(r[7]&4),sh:r[9],sa:r[10]})).sort((a,b)=>a.ts-b.ts);
  const rows=[];
  M.correr(G,M.PDEF,function(g,x){
    if(x.cH<5||x.cA<5) return;
    const pH = dep==='nhl' ? M.dist(x.pm,x.pt,M.PDEF).pH : M.pML ? M.pML(x.pm, M.sigmas? M.sigmas(x.S).sM : 13.5) : null;
    if(!(pH>0)) return;
    rows.push({g,pH,won:g.hs>g.as?1:(g.hs<g.as?0:null)});
  });
  // memory per game (slow but ok): compute calc for each game ts
  const grp={cuesta:[0,0,0],cumple:[0,0,0],sorpresa:[0,0,0],nunca:[0,0,0]};
  let i=0;
  for(const r of rows){ if(r.won===null) continue; i++; if(i%1) continue;
    const mem=MEM.calc(G,r.g.ts,dep), favH=r.pH>=0.5, f=mem[favH?r.g.h:r.g.a], d=mem[favH?r.g.a:r.g.h], p=favH?r.pH:1-r.pH, y=favH?r.won:1-r.won;
    const add=k=>{grp[k][0]++;grp[k][1]+=p;grp[k][2]+=y;};
    if(f&&f.fav.n>=5){ const pf=f.fav.w/f.fav.n; if(pf<=0.5) add('cuesta'); else if(pf>=0.75) add('cumple'); }
    if(d&&d.dog.n>=5){ const pd=d.dog.w/d.dog.n; if(pd>=0.45) add('sorpresa'); else if(pd<=0.15&&d.dog.n>=6) add('nunca'); }
  }
  console.log(dep, rows.length); for(const k in grp){const [n,s,y]=grp[k]; if(n) console.log(' ',k,'n',n,'modelo dice %.1f'.replace('%.1f',(100*s/n).toFixed(1)),'gano',(100*y/n).toFixed(1), 'z',((y-s)/Math.sqrt(s*(1-s/n))).toFixed(1));}
}
