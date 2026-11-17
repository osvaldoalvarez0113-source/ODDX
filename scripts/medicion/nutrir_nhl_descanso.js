'use strict';
/* OVA · NHL: ¿un ajuste de descanso (back-to-back) más grande hace acertar más al modelo? Noviembre 2026.
   Uso: node scripts/medicion/nutrir_nhl_descanso.js [datos-nhl.json]
   El patrón «visitante en back-to-back» sale +3.8 pts sobre el modelo, que ya trae R = 0.25 goles. Aquí se prueba R de 0 a 0.8
   walk-forward. Resultado (docs/NUTRIR-MODELO-2026-11.md): R = 0.25 ya es lo que más acierta (59.03%); subirlo no suma aciertos. */
const fs=require('fs'),path=require('path'),M=require('../../modelo-nhl.js');
const d=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'../../datos-nhl.json')));
const hs=JSON.parse(fs.readFileSync(path.join(__dirname,'../../hist-nhl.json')));const SH={};hs.g.forEach(r=>{if(r.length>10&&r[9]!=null)SH[r[0]]=[r[9],r[10]];});
Object.keys(d.temps).forEach(s=>d.temps[s].juegos.forEach(g=>{const t=SH[g.id];if(t&&g.sh===undefined){g.sh=t[0];g.sa=t[1];}}));
const TEMPS=[2021,2022,2023,2024,2025,2026];
const todos=[].concat(...TEMPS.map(s=>d.temps[s].juegos)).filter(g=>g.done&&!g.skip).sort((a,b)=>a.ts-b.ts);
const hasta=sk=>todos.filter(g=>M.seasonOf(g.ts)<=sk);
const PB={};
TEMPS.filter(s=>s>=2022).forEach(sk=>{const ent=hasta(sk-1);const a=M.gridMargen(ent,sk-1,null,Object.assign({},M.PDEF,{Z:1})),b=M.gridTotal(ent,sk-1,null,a.P);PB[sk]=Object.assign({},b.P,{Z:M.zRecomendado(M.evaluar(ent,b.P,sk-1).sl)});});
console.log('R elegidos por el grid:',TEMPS.filter(s=>s>=2022).map(s=>s+':'+PB[s].R).join(' '));
const Rs=[0,0.15,0.25,0.35,0.45,0.55,0.65,0.8];
const res={};
Rs.forEach(R=>{res[R]={};TEMPS.filter(s=>s>=2022).forEach(sk=>{const P=Object.assign({},PB[sk],{R:R});const r={n:0,ok:0,ll:0,nb:0,okb:0,llb:0,rows:[]};
 M.correr(hasta(sk),P,(g,x)=>{if(M.seasonOf(g.ts)!==sk||g.ty!==2||x.cH<10||x.cA<10||g.hs===g.as)return;const pm=x.b0+P.Z*x.rd,pH=M.dist(pm,x.pt,P).pH,w=g.hs>g.as;const l=-Math.log(Math.max(w?pH:1-pH,1e-9));r.n++;r.ll+=l;if((pH>=.5)===w)r.ok++;r.rows.push([l,(pH>=.5)===w?1:0,x.bH!==x.bA?1:0]);if(x.bH!==x.bA){r.nb++;r.llb+=l;if((pH>=.5)===w)r.okb++;}});
 res[R][sk]=r;});});
console.log('R     | juegos | acierto | perdida | b2b juegos | acierto b2b | perdida b2b');
Rs.forEach(R=>{let n=0,ok=0,ll=0,nb=0,okb=0,llb=0;Object.values(res[R]).forEach(r=>{n+=r.n;ok+=r.ok;ll+=r.ll;nb+=r.nb;okb+=r.okb;llb+=r.llb;});console.log(R.toFixed(2),'|',n,'|',(100*ok/n).toFixed(2)+'%','|',(ll/n).toFixed(4),'|',nb,'|',(100*okb/nb).toFixed(2)+'%','|',(llb/nb).toFixed(4));});
// por temporada: mejor R y elegido dejando esa temporada fuera
const sks=TEMPS.filter(s=>s>=2022);
console.log('por temporada (perdida):');sks.forEach(sk=>console.log(sk,Rs.map(R=>R+':'+(res[R][sk].ll/res[R][sk].n).toFixed(4)).join('  ')));
let dif=[];sks.forEach(sk=>{let best=null;Rs.forEach(R=>{let v=0;sks.filter(s=>s!==sk).forEach(s=>v+=res[R][s].ll);if(!best||v<best.v)best={R,v};});const a=res[best.R][sk].rows,b=res[0.25][sk].rows;a.forEach((x,i)=>dif.push([x[0]-b[i][0],x[1]-b[i][1]]));console.log('fuera',sk,'R elegido',best.R);});
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const m=mean(dif.map(x=>x[0])),sd=Math.sqrt(mean(dif.map(x=>(x[0]-m)**2))/dif.length);
console.log('mejora de perdida fuera de muestra vs R=0.25:',(1000*m).toFixed(2),'milesimas, z',(m/sd).toFixed(2),'| aciertos de mas:',dif.reduce((s,x)=>s+x[1],0),'en',dif.length);
