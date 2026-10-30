'use strict';
// Uso: node scripts/medicion/fut_real.js partidos_futbol.json   (rama resultados-futbol-6t)
// Corre el motor REAL de futbol.html (walkForward / probsModelo / conSemilla) sobre los partidos de 5 ligas y 6 temporadas.
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','futbol.html'),'utf8');
const cut=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i); if(i<0||j<0) throw new Error('no encuentro '+a); return html.slice(i,j);};
let src='var MAXG = 8;\n'+cut('function pmf(lambda)','var CLAVES_1X2')+'var CLAVES_1X2 = [\'pL\',\'pD\',\'pV\'], CLAVES_GOLES = [\'o15\',\'o25\',\'o35\',\'btts\'];\n'
 +cut('function mezclar(d, d0, w, claves)','// ---------- historial')+cut('function conSemilla(a, s, S, lp)','function cargarSemillaCache')
 +'var CERO = {pj:0, gf:0, gc:0, px:0, xf:0, xc:0};\n'+cut('function mezclaTiros(a, A, esc)','// Busqueda por etapas');
src=src.replace("var pr = {L:d.pL, D:d.pD, V:d.pV};","var pr = {L:d.pL, D:d.pD, V:d.pV}; if(opts.cb) opts.cb(m, idx, pr, d);");
const ctx={Math,Object,console}; vm.createContext(ctx); vm.runInContext(src,ctx);
const rows=JSON.parse(fs.readFileSync(process.argv[2]||'partidos_futbol.json'));
const norm=r=>r.filter(x=>x.F0&&x.F0[0]!==null);
const R=norm(rows);
const seasons=[...new Set(R.map(x=>x.t))].sort(), ligas=[...new Set(R.map(x=>x.lg))];
const ll=(p,y)=>-Math.log(Math.max(p[y],1e-9));
function semilla(ms){ const m={}; let gf=0,n=0; ms.forEach(p=>{gf+=p.gh+p.ga;n++; [[p.h,p.gh,p.ga],[p.a,p.ga,p.gh]].forEach(z=>{const e=m[z[0]]||(m[z[0]]={pj:0,gf:0,gc:0}); e.pj++; e.gf+=z[1]; e.gc+=z[2];});}); if(!n) return {}; const lp=Math.max(gf/(2*n),0.5),o={}; Object.keys(m).forEach(k=>{ if(m[k].pj>=10) o[k]={att:m[k].gf/m[k].pj/lp,def:m[k].gc/m[k].pj/lp}; }); return o; }
// corre un juego de parametros en todas las ligas/temporadas; devuelve lista de {t,lg,y,p:[L,D,V],mk,o25,ou,tot}
function correr(P, usarSemilla){
  const out=[];
  for(const lg of ligas) for(let si=0; si<seasons.length; si++){
    const t=seasons[si], ms=R.filter(x=>x.lg===lg&&x.t===t).sort((a,b)=>a.d-b.d);
    if(!ms.length) continue;
    const prevMs=si>0?R.filter(x=>x.lg===lg&&x.t===seasons[si-1]):[];
    const sem=(usarSemilla&&prevMs.length>100)?semilla(prevMs):null;
    const prep=ms.map(x=>({kL:x.h,kV:x.a,gl:x.gh,gv:x.ga,ts:x.d,xl:null,xv:null,_x:x}));
    ctx.prep=prep; ctx.P=P; ctx.sem=sem; ctx.out=out; ctx.t=t; ctx.lg=lg;
    vm.runInContext("walkForward(prep,P,0,{semilla:sem,cb:function(m,idx,pr,d){ out.push({t:t,lg:lg,y:m._x.y,p:[pr.L,pr.D,pr.V],mk:m._x.mk,o25:d.o25,ou:m._x.ou,tot:m.gl+m.gv,F0:m._x.F0}); }})",ctx);
  }
  return out;
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
function resumen(nom,o){
  const per=seasons.map(t=>{const r=o.filter(x=>x.t===t&&x.mk); return r.length?mean(r.map(x=>ll(x.p,x.y))):NaN;});
  const rk=o.filter(x=>x.mk); const m=mean(rk.map(x=>ll(x.p,x.y))), mk=mean(rk.map(x=>ll(x.mk,x.y)));
  console.log(nom.padEnd(34)+' n='+rk.length+' pérdida 1X2 '+m.toFixed(4)+' (mercado '+mk.toFixed(4)+', dif +'+(m-mk).toFixed(4)+')  por temp: '+per.map(v=>isNaN(v)?'—':v.toFixed(4)).join(' ')+'  | O/U2.5 '+mean(o.filter(x=>x.ou!=null).map(x=>-Math.log(Math.max(x.tot>2.5?x.o25:1-x.o25,1e-9)))).toFixed(4));
  return {m,mk};
}
module.exports={correr,resumen,seasons,ll,mean};
if(require.main===module){
  const DEF={K:6,h:1.13,rho:-0.08,w:1,S:0,Kt:16,wt:0.5,ct:1,A:1,At:1};
  const F1={K:4,h:1.13,rho:0,w:1,S:20,Kt:8,wt:0.8,ct:1.05,A:1,At:1};
  console.log('partidos',R.length,'| temporadas',seasons.join(' '));
  resumen('DEFECTO actual (S=0, sin semilla)',correr(DEF,false));
  resumen('DEFECTO + semilla (S=0)',correr(DEF,true));
  resumen('F1 reajustado (K4 rho0 S20 Kt8 wt.8)',correr(F1,true));
}
