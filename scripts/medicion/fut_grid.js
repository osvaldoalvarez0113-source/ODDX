// Uso: node scripts/medicion/fut_grid.js partidos_futbol.json  (ajusta K, S, h, rho, Kt, wt, ct con 2021-22 y 2022-23 y prueba en 2023-24 a 2025-26, con el motor real de futbol.html)
const {correr,resumen,seasons,ll,mean}=require('./fut_real.js');
const base={K:6,h:1.13,rho:-0.08,w:1,S:0,Kt:16,wt:0.5,ct:1,A:1,At:1};
const TUNE=['2122','2223'], TEST=['2324','2425','2526'];
const l1=(o,ts)=>mean(o.filter(x=>ts.includes(x.t)).map(x=>ll(x.p,x.y)));
const lo=(o,ts)=>mean(o.filter(x=>ts.includes(x.t)).map(x=>-Math.log(Math.max(x.tot>2.5?x.o25:1-x.o25,1e-9))));
let best={P:base,l:Infinity};
// etapa A: K y S
for(const K of [3,4,6,8,10]) for(const S of [0,10,20,30,40]){ const P=Object.assign({},base,{K,S}); const l=l1(correr(P,true),TUNE); if(l<best.l) best={P,l}; }
console.log('etapa A',JSON.stringify(best.P),best.l.toFixed(4));
// etapa B: h y rho
for(const h of [1.05,1.09,1.13,1.17]) for(const rho of [0,-0.04,-0.08,-0.12]){ const P=Object.assign({},best.P,{h,rho}); const l=l1(correr(P,true),TUNE); if(l<best.l) best={P,l}; }
console.log('etapa B',JSON.stringify(best.P),best.l.toFixed(4));
// etapa C: Mas/Menos (Kt, wt, ct)
let bo={P:best.P,l:lo(correr(best.P,true),TUNE)};
for(const Kt of [6,10,16,24]) for(const wt of [0.4,0.6,0.8,1]) for(const ct of [0.97,1,1.03,1.06]){ const P=Object.assign({},best.P,{Kt,wt,ct}); const l=lo(correr(P,true),TUNE); if(l<bo.l) bo={P,l}; }
console.log('etapa C',JSON.stringify(bo.P),bo.l.toFixed(4));
const FIN=bo.P;
const sets=[['DEFECTO actual',base,false],['REAJUSTADO (tuneado 2021-22 y 2022-23)',FIN,true]];
for(const [n,P,s] of sets){ const o=correr(P,s); console.log(n.padEnd(40),'TEST 2023-24..2025-26 (fuera de muestra): 1X2',l1(o,TEST).toFixed(4),' O/U',lo(o,TEST).toFixed(4),'| TUNE 1X2',l1(o,TUNE).toFixed(4)); resumen('   '+n,o); }
// F1 con semilla pero S=0? sensibilidad: sin semilla disponible
const o2=correr(FIN,false); console.log('REAJUSTADO pero SIN semilla (si no cargó el historial):',l1(o2,TEST).toFixed(4),'(defecto en TEST',l1(correr(base,false),TEST).toFixed(4)+')');
