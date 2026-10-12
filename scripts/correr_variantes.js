// Mide variantes del ERA del abridor contra el mercado (cierre de ESPN/DraftKings): PRIOR_ERA y el historial de 3 años (Marcel).
// Reusa backtests/backtestmercado.html tal cual y le agrega, por juego, la probabilidad de cada variante.
// Uso: node scripts/correr_variantes.js S2025   -> escribe variantes_S2025.json
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const EXTRA = `
var HIST_C={};
function histDe(id){
  if(!HIST_C[id]) HIST_C[id]=gj(MLB+'/people/'+id+'/stats?stats=yearByYear&group=pitching&gameType=R').then(function(d){
    var sp=(d.stats&&d.stats[0]&&d.stats[0].splits)||[], h={};
    sp.forEach(function(s){ var yr=+s.season, st=s.stat||{}; var o=h[yr]||(h[yr]={o:0,er:0}); o.o+=outs(st.inningsPitched); o.er+=(+st.earnedRuns||0); });
    return h;
  }).catch(function(){ return null; });
  return HIST_C[id];
}
function pHist(h,y,L){
  if(!h) return null;
  var P=[5,4,3], num=0, den=0, ipt=0;
  for(var i=0;i<3;i++){ var o=h[y-1-i]; if(!o||!(o.o>0)) continue; var ip=o.o/3; num+=P[i]*9*o.er; den+=P[i]*ip; ipt+=ip; }
  if(ipt<40) return null;
  return (num+60*L)/(den+60);
}
function eraMarcel(p,L,h,y){
  var base=eraUsado(p,L), ph=pHist(h,y,L);
  if(ph==null||!(p.ip>0)) return base;
  var e=(p.era*p.ip+40*L)/(p.ip+40);
  var s=0.8505+0.4410*e+0.3724*ph;
  var anc=(p.fip!=null&&p.ip>0)?(p.fip*p.ip+L*30)/(p.ip+30):L;
  var l=reg(p.era5,p.ip5,PRIOR_ERA*0.625,anc);
  return l!=null? s*0.70+l*0.30 : s;
}
async function VARS(c,g,yr,L,pH,pA,rgH,rgA,sH,sA){
  var y=+yr, out={}, hH=await histDe(c.pH), hA=await histDe(c.pA), save=PRIOR_ERA;
  [20,30,40,60,80,120].forEach(function(k){
    PRIOR_ERA=k;
    out['P'+k]=chanceLocal({eraH:eraUsado(pH,L),eraA:eraUsado(pA,L),rgH:rgH,rgA:rgA,bpH:sH.era,bpA:sA.era});
  });
  PRIOR_ERA=save;
  out.MARCEL=chanceLocal({eraH:eraMarcel(pH,L,hH,y),eraA:eraMarcel(pA,L,hA,y),rgH:rgH,rgA:rgA,bpH:sH.era,bpA:sA.era});
  out.tieneHist=(pHist(hH,y,L)!=null?1:0)+(pHist(hA,y,L)!=null?1:0);
  return out;
}
`;

async function main() {
  const dias = String(process.argv[2] || 'S2025').toUpperCase();
  const html = fs.readFileSync(path.join(__dirname, '..', 'backtests', 'backtestmercado.html'), 'utf8');
  let src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const a = 'filas.push({pM:pM,', b = 'pintar(evaluar(filas),info);';
  if (!src.includes(a) || !src.includes(b)) throw new Error('el backtest cambió: no encuentro dónde enganchar');
  src = src.replace(a, 'filas.push({V:await VARS(c,g,yr,L,pH,pA,rgH,rgA,sH,sA),f:g.fecha,pM:pM,')
           .replace(b, 'ULTIMAS_FILAS=filas; ' + b) + EXTRA;
  const els = {};
  const E = id => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {}, disabled: false, value: dias });
  const doFetch = u => (globalThis.__fetch || globalThis.fetch)(u, { headers: { accept: 'application/json', 'user-agent': 'ova-backtest/1.0' } });
  const ctx = { console, Math, Date, JSON, Promise, Object, Array, String, Number, isFinite, parseInt, Intl, setTimeout, encodeURIComponent, URL,
    fetch: doFetch, document: { getElementById: E, createElement: () => ({}), body: { appendChild() {}, removeChild() {} } }, navigator: {} };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.medir=medir;', ctx);
  await ctx.medir(dias);
  const filas = ctx.ULTIMAS_FILAS || [];
  fs.writeFileSync('variantes_' + dias + '.json', JSON.stringify(filas.map(r => ({ f: r.f, y: r.y, pK: r.pK, iH: r.iH, iA: r.iA, dH: r.dH, dA: r.dA, v: r.V }))));
  console.log('OK ' + dias + ': ' + filas.length + ' juegos');
}
main().catch(e => { console.error(e); process.exit(1); });
