'use strict';
// Calibración del favorito en las 5 ligas: ¿estirar el 1X2 (q ∝ p^a) sube aciertos o baja la pérdida? Se elige a en 2019-20 a 2022-23 y se prueba de 2023-24 en adelante.
// Uso: node scripts/medicion/fut_calibrar.js partidos_actual.json (rama resultados-futbol-actual). Resultado en docs/NUTRIR-MODELO-2026-11.md.
// Uso: node scripts/medicion/fut_dc_real.js partidos_futbol.json [extra.json]
// Corre el motor REAL de futbol.html (dcAjustar + calcularDC, copiados del archivo en cada corrida) igual que la app:
// cada día se ajusta con la temporada pasada + lo jugado de esta, y se predice solo con lo anterior.
// Ajustes (xi, wt) se eligen en 2021-22 y 2022-23; 2023-24 en adelante se usa solo para probar.
// Solo mide: no toca la app.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'futbol.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
const lineaVar = n => { const m = html.match(new RegExp('^\\s*(var ' + n + '\\s*=.*)$', 'm')); if (!m) throw new Error('no encuentro var ' + n); return m[1] + '\n'; };
function bloqueVar(n) { const i = html.search(new RegExp('var ' + n + '\\s*=')); const j = html.indexOf(';', html.indexOf('}', i)); return html.slice(i, j + 1) + '\n'; }
const src = 'var ELOV=0;var localStorage={getItem:function(k){return k===\'ova_futbol_elo_mix\'?String(ELOV):null;}};var MAXG=8;\n'
  + cut('function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n"
  + cut('function mezclar(d, d0, w, claves)', '// Todas las probabilidades del modelo')
  + cut('function buscarEnMapa(mapa, nombre)', 'var buscarSemilla')
  + bloqueVar('DC_CFG') + 'var DC_APP=JSON.parse(JSON.stringify(DC_CFG));\n'
  + cut('function dcAjustar(lista, hoyDia, cfg)', 'function calcular(eL, eV, P)')
  + 'function claveEq(n){return String(n);} function mismaClave(x,y){return x===y;} function tsPartido(p){return p.ts;}\n';
const ctx = { Math, Object, JSON, parseFloat, isFinite, console }; vm.createContext(ctx); vm.runInContext(src, ctx);
vm.runInContext('var DCFIT=null;', ctx);
const filas = []; process.argv.slice(2).forEach(f => JSON.parse(fs.readFileSync(f)).forEach(x => filas.push(x)));
const temps = [...new Set(filas.map(x => x.t))].sort(), ligas = [...new Set(filas.map(x => x.lg))];
const APP = JSON.parse(JSON.stringify(ctx.DC_APP));
const LOG = (p, y) => -Math.log(Math.max(p, 1e-9));
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function correr(cfg, soloTemps, hist) {
  hist = hist || 1; const out = []; vm.runInContext('DC_CFG=' + JSON.stringify(cfg), ctx);
  for (const lg of ligas) for (let si = 1; si < temps.length; si++) {
    const t = temps[si]; if (soloTemps && !soloTemps.includes(t)) continue;
    const prev = temps.slice(Math.max(0, si - hist), si);
    const ant = filas.filter(x => x.lg === lg && prev.includes(x.t)), act = filas.filter(x => x.lg === lg && x.t === t).sort((a, b) => a.d - b.d);
    const conv = x => ({ local: x.h, visita: x.a, golesLocal: x.gh, golesVisita: x.ga, ts: x.d });
    const base = ant.map(conv); let i = 0;
    while (i < act.length) {
      const d = act[i].d; let j = i; while (j < act.length && act[j].d === d) j++;
      ctx.lista = base.concat(act.slice(0, i).map(conv)); ctx.hoy = Math.floor(d / 864e5);
      const fit = vm.runInContext('dcAjustar(lista,hoy,DC_CFG)', ctx);
      if (fit) { fit.liga = lg; ctx.f = fit; vm.runInContext('DCFIT=f', ctx);
        for (let k = i; k < j; k++) { const x = act[k]; ctx.a = { nombre: x.h }; ctx.b = { nombre: x.a };
          const r = vm.runInContext('calcularDC(a,b)', ctx);
          out.push({ t, lg, y: x.y, p: [r.pL, r.pD, r.pV], o25: r.overLin[2.5], tot: x.gh + x.ga, mk: x.mk, ou: x.ou, ps: x.ps, ouPs: x.ouPs, src: x.src, avg: x.avg, hN: ant.some(q => q.h === x.h), aN: ant.some(q => q.h === x.a), j: k }); } }
      i = j;
    }
  }
  return out;
}
const ll1 = o => o.filter(x => x.mk), lOU = r => r.ou != null ? (r.tot > 2.5 ? LOG(r.o25) : LOG(1 - r.o25)) : null, lOUm = r => r.tot > 2.5 ? LOG(r.ou) : LOG(1 - r.ou);
function zDif(a) { const m = prom(a), s = Math.sqrt(prom(a.map(v => (v - m) ** 2)) / a.length); return { m, z: m / s, se: s }; }
// ---- calibración: q ∝ p^a ----
const est=(p,a)=>{const q=p.map(v=>Math.pow(v,a)),s=q[0]+q[1]+q[2];return q.map(v=>v/s);};
function ev(o,a){let ll=0,ok=0,llm=0,nm=0;const tr={};o.forEach(x=>{const q=est(x.p,a);ll+=LOG(q[x.y]);const k=q.indexOf(Math.max(...q));if(k===x.y)ok++;
 const fav=Math.max(q[0],q[2]),kF=q[0]>=q[2]?0:2,t=fav>=0.75?'75+':fav>=0.65?'65-75':fav>=0.55?'55-65':fav>=0.45?'45-55':'<45';const b=tr[t]||(tr[t]={n:0,g:0,p:0});b.n++;b.p+=fav;if(x.y===kF)b.g++;});
 const T={};Object.keys(tr).sort().forEach(k=>{const b=tr[k];T[k]=`dice ${(b.p/b.n*100).toFixed(1)} ganó ${(b.g/b.n*100).toFixed(1)} (${b.n})`;});
 return {n:o.length,ll:ll/o.length,acierto:ok/o.length,T};}
console.time('correr');
const o=correr(APP,null,2); console.timeEnd('correr');
const TUNE=['1920','2021','2122','2223'], train=o.filter(x=>TUNE.includes(x.t)), test=o.filter(x=>x.t>'2223');
let best=1,bl=1e9;for(let a=0.8;a<=2.01;a+=0.02){const e=ev(train,a);if(e.ll<bl){bl=e.ll;best=Math.round(a*100)/100;}}
console.log('a elegido',best,'en',train.length);
const A=ev(test,1),B=ev(test,best);console.log('PRUEBA antes',JSON.stringify(A));console.log('PRUEBA estirado',JSON.stringify(B));
const d=test.map(x=>LOG(est(x.p,best)[x.y])-LOG(x.p[x.y]));console.log('dif',JSON.stringify(zDif(d)));
for(const t of [...new Set(test.map(x=>x.t))]){const s=test.filter(x=>x.t===t);console.log(t,ev(s,1).ll.toFixed(4),ev(s,best).ll.toFixed(4),s.length);}
// por liga
for(const lg of ligas){const s=test.filter(x=>x.lg===lg);console.log(lg,ev(s,1).ll.toFixed(4),ev(s,best).ll.toFixed(4),s.length);}
// mercado para referencia
const mk=test.filter(x=>x.mk);console.log('mercado',(prom(mk.map(x=>LOG(x.mk[x.y])))).toFixed(4),mk.length);
