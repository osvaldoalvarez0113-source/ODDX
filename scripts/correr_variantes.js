// Mide variantes del ERA del abridor contra el mercado (cierre de ESPN/DraftKings): PRIOR_ERA y el historial de 3 años (Marcel).
// Reusa backtests/backtestmercado.html tal cual y le agrega, por juego, la probabilidad de cada variante.
// Uso: node scripts/correr_variantes.js S2025   -> escribe variantes_S2025.json
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const EXTRA = `
/* ===== Features crudas por juego para la fórmula propia (medición nov-2026). Todo con datos de ANTES del juego. ===== */
var HX={};
function histX(id){
  if(!HX[id]) HX[id]=gj(MLB+'/people/'+id+'/stats?stats=yearByYear&group=pitching&gameType=R').then(function(d){
    var sp=(d.stats&&d.stats[0]&&d.stats[0].splits)||[], h={};
    sp.forEach(function(s){ var yr=+s.season, st=s.stat||{}; var o=h[yr]||(h[yr]={o:0,er:0,k:0,bb:0,hr:0,bf:0,gs:0});
      o.o+=outs(st.inningsPitched); o.er+=(+st.earnedRuns||0); o.k+=(+st.strikeOuts||0); o.bb+=(+st.baseOnBalls||0)+(+st.hitByPitch||0); o.hr+=(+st.homeRuns||0); o.bf+=(+st.battersFaced||0); o.gs+=(+st.gamesStarted||0); });
    return h;
  }).catch(function(){ return null; });
  return HX[id];
}
function hist3(h,y){
  var P=[5,4,3], o=0,er=0,k=0,bb=0,hr=0,bf=0,w=0;
  if(h) for(var i=0;i<3;i++){ var x=h[y-1-i]; if(!x||!(x.o>0)) continue; o+=P[i]*x.o; er+=P[i]*x.er; k+=P[i]*x.k; bb+=P[i]*x.bb; hr+=P[i]*x.hr; bf+=P[i]*x.bf; w+=P[i]; }
  return {ip:o/3/(w||1), era:o>0?er*27/o:null, kp:bf>0?k/bf:null, bbp:bf>0?bb/bf:null, hr9:o>0?hr*27/o:null};
}
function pitX(arr,fecha){
  var o=0,er=0,k=0,bb=0,hr=0,n=0,last=null;
  for(var i=0;i<arr.length;i++){ var x=arr[i]; if(x.d>=fecha) break; o+=x.o; er+=x.er; k+=x.k; bb+=x.bb+x.hbp; hr+=x.hr; n++; last=x.d; }
  var ip=o/3, bfe=o+k*0+bb+ (ip>0?ip*0.95:0);   /* bateadores aprox: outs + boletos + hits (~0.95 por inning) */
  var rest=last?Math.round((Date.parse(fecha)-Date.parse(last))/864e5):null;
  return {ip:ip, n:n, ipg:n>0?ip/n:null, k9:ip>0?k*9/ip:null, bb9:ip>0?bb*9/ip:null, hr9:ip>0?hr*9/ip:null, kbb:bfe>0?(k-bb)/bfe:null, rest:rest};
}
function teamX(arr,fecha){
  var g=0,r=0,ra=0,w=0,l10=[],last=null,g7=0, ini7=sumaDias(fecha,-7);
  for(var i=0;i<arr.length;i++){ var x=arr[i]; if(x.d>=fecha) break; g++; r+=x.runs; ra+=x.ra; var win=x.runs>x.ra?1:0; w+=win; l10.push(win); if(l10.length>10) l10.shift(); last=x.d; if(x.d>=ini7) g7++; }
  var py=(r>0&&ra>0)?Math.pow(r,1.83)/(Math.pow(r,1.83)+Math.pow(ra,1.83)):0.5;
  return {g:g, rg:g?r/g:null, rag:g?ra/g:null, wp:g?w/g:null, py:py, l10:l10.length?l10.reduce(function(a,b){return a+b;},0)/l10.length:null,
    rest:last?Math.round((Date.parse(fecha)-Date.parse(last))/864e5):null, g7:g7};
}
async function VARS(c,g,yr,L,pH,pA,rgH,rgA,sH,sA){
  var y=+yr;
  var lp=await Promise.all([logPitcher(c.pH,yr),logPitcher(c.pA,yr)]), hh=await Promise.all([histX(c.pH),histX(c.pA)]);
  var xH=pitX(lp[0],g.fecha), xA=pitX(lp[1],g.fecha), h3H=hist3(hh[0],y), h3A=hist3(hh[1],y);
  var tH=teamX(CAL[g.hId]||[],g.fecha), tA=teamX(CAL[g.aId]||[],g.fecha);
  var P40=chanceLocal({eraH:eraUsado(pH,L),eraA:eraUsado(pA,L),rgH:rgH,rgA:rgA,bpH:sH.era,bpA:sA.era});
  return {P40:P40, L:L,
    eH:eraUsado(pH,L), eA:eraUsado(pA,L), rgH:rgH, rgA:rgA, bpH:sH.era, bpA:sA.era,
    sH:{ip:pH.ip,era:pH.era,fip:pH.fip,era5:pH.era5,ip5:pH.ip5,x:xH,h3:h3H}, sA:{ip:pA.ip,era:pA.era,fip:pA.fip,era5:pA.era5,ip5:pA.ip5,x:xA,h3:h3A},
    tH:tH, tA:tA};
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
