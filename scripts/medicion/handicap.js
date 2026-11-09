// Mide hándicap (puck line / spread) en NHL y NFL con precios reales de ESPN BET guardados en datos-<dep>.json
const fs=require('fs');
const imp=x=>x>0?100/(x+100):-x/(-x+100), dec=x=>x>0?1+x/100:1+100/-x;
const dep=process.argv[2], d=JSON.parse(fs.readFileSync(process.argv[3]));
const T=dep==='nhl'?[[50,55],[55,60],[60,65],[65,70],[70,100]]:[[50,60],[60,70],[70,80],[80,100]];
const R={};
function add(k,ok,o,s){ const r=R[k]=R[k]||{n:0,w:0,u:0,u2:0,pk:0,h:{}}; if(ok===null){return;} const u=ok?o-1:-1; r.n++; r.w+=ok?1:0; r.u+=u; r.u2+=u*u; const hh=r.h[s]=r.h[s]||{n:0,w:0,u:0}; hh.n++; hh.w+=ok?1:0; hh.u+=u; }
let total=0;
Object.keys(d.temps).forEach(s=>d.temps[s].juegos.forEach(g=>{
  if(!g.done||g.skip||g.ty!==2||!g.linea||!g.linea.ml||g.linea.sp==null||!g.linea.spOdds) return;
  const l=g.linea, i=imp(l.ml[0]), j=imp(l.ml[1]); if(!(i>0&&j>0)) return; const pH=i/(i+j); const favH=pH>=.5, p=favH?pH:1-pH;
  const t=T.find(t=>p*100>=t[0]&&p*100<t[1]); if(!t) return; const tr=t[0]+'-'+t[1];
  const mar=g.hs-g.as; total++;
  // lado del favorito en el hándicap: el sp es del local
  const spFav=favH?l.sp:-l.sp, oFav=favH?l.spOdds[0]:l.spOdds[1], oDog=favH?l.spOdds[1]:l.spOdds[0];
  const marFav=favH?mar:-mar, cub=marFav+spFav; const okF=cub===0?null:cub>0;
  const half=+s>=2024?'B':'A';
  add(tr+'|ML fav',marFav>0, dec(favH?l.ml[0]:l.ml[1]), half);
  add(tr+'|HC fav '+spFav,okF,dec(oFav),half);
  add(tr+'|HC dog '+(-spFav),okF===null?null:!okF,dec(oDog),half);
}));
console.log(dep,'juegos',total);
Object.keys(R).sort().forEach(k=>{const r=R[k]; if(r.n<60) return; const m=r.u/r.n, e=Math.sqrt(r.u2/r.n-m*m)/Math.sqrt(r.n);
 const h=Object.keys(r.h).sort().map(x=>x+':'+(100*r.h[x].w/r.h[x].n).toFixed(0)+'% '+(100*r.h[x].u/r.h[x].n>=0?'+':'')+(100*r.h[x].u/r.h[x].n).toFixed(1)+'%('+r.h[x].n+')').join(' ');
 console.log(k.padEnd(22),String(r.n).padStart(5),'pega',(100*r.w/r.n).toFixed(1)+'%','rinde',(m>=0?'+':'')+(100*m).toFixed(1)+'% ±'+(200*e).toFixed(1),'|',h)});
