'use strict';
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
function resumen(n, o) {
  const r = ll1(o), a = prom(r.map(x => LOG(x.p[x.y]))), b = prom(r.map(x => LOG(x.mk[x.y]))), ou = o.filter(x => x.ou != null);
  const dz = zDif(r.map(x => LOG(x.p[x.y]) - LOG(x.mk[x.y])));
  console.log(`${n.padEnd(34)} n=${r.length} 1X2 ${a.toFixed(4)} mercado ${b.toFixed(4)} dif ${dz.m.toFixed(4)} z${dz.z.toFixed(1)} | M/M ${prom(ou.map(lOU)).toFixed(4)} mercado ${prom(ou.map(lOUm)).toFixed(4)} (${ou.length})`);
  return { n: r.length, x12: a, mk: b, ou: prom(ou.map(lOU)), oum: prom(ou.map(lOUm)) };
}
const res = { temps, app: APP };
const TUNE = ['2122', '2223'], PRUEBA = temps.filter(t => t > '2223');
// 1) grid solo en las de ajuste
console.log('temporadas', temps.join(' '), '| config app', JSON.stringify(APP));
const gridXi = [0.3, 0.5, 0.8, 1.0, 1.2, 1.6, 2.2];
const memo = {};
for (const xi of gridXi) { const c = { ...APP, xi }; memo[xi] = correr(c, TUNE); resumen('ajuste xi=' + xi, memo[xi]); }
const mejorXi = gridXi.slice().sort((a, b) => prom(ll1(memo[a]).map(x => LOG(x.p[x.y]))) - prom(ll1(memo[b]).map(x => LOG(x.p[x.y]))))[0];
const gridWt = [0.3, 0.5, 0.7, 0.85, 1];
const memoW = {};
for (const wt of gridWt) { const c = { ...APP, wt }; memoW[wt] = correr(c, TUNE); const ou = memoW[wt].filter(x => x.ou != null); console.log('ajuste wt=' + wt + ' M/M ' + prom(ou.map(lOU)).toFixed(4)); }
const mejorWt = gridWt.slice().sort((a, b) => prom(memoW[a].filter(x => x.ou != null).map(lOU)) - prom(memoW[b].filter(x => x.ou != null).map(lOU)))[0];
console.log('elegidos en 2021-23: xi', mejorXi, 'wt', mejorWt);
// 2) prueba fuera de muestra
const ANT = { ...APP, xi: 1.6, wt: 0.5 };   // lo que tenía la app antes de esta medición (1 temporada de historial)
const oApp = correr(ANT, temps.slice(1));
const oNew = correr({ ...APP, xi: mejorXi, wt: mejorWt }, temps.slice(1));
const pr = o => o.filter(x => PRUEBA.includes(x.t));
res.todas = resumen('ANTERIOR (todas)', oApp);
res.pruebaApp = resumen('ANTERIOR (prueba)', pr(oApp));
res.pruebaNew = resumen('xi/wt nuevos (prueba)', pr(oNew));
for (const t of temps.slice(1)) { resumen('  app ' + t, oApp.filter(x => x.t === t)); resumen('  nuevo ' + t, oNew.filter(x => x.t === t)); }
const pa = pr(oApp), pn = pr(oNew);
const idx = o => { const m = new Map(); o.forEach(x => m.set(x.lg + x.t + x.j, x)); return m; }, mN = idx(pn);
const par = pa.filter(x => x.mk && mN.has(x.lg + x.t + x.j));
const d1 = zDif(par.map(x => LOG(mN.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y])));
const parO = pa.filter(x => x.ou != null && mN.has(x.lg + x.t + x.j)), d2 = zDif(parO.map(x => lOU(mN.get(x.lg + x.t + x.j)) - lOU(x)));
console.log('nuevo - app, prueba: 1X2', d1.m.toFixed(5), 'z', d1.z.toFixed(2), '| M/M', d2.m.toFixed(5), 'z', d2.z.toFixed(2));
for (const t of PRUEBA) { const q = par.filter(x => x.t === t), q2 = parO.filter(x => x.t === t); console.log('  ', t, '1X2', prom(q.map(x => LOG(mN.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y]))).toFixed(5), 'M/M', prom(q2.map(x => lOU(mN.get(x.lg + x.t + x.j)) - lOU(x))).toFixed(5)); }
// 2b) ¿Más historial? La app baja solo la temporada pasada; ¿dos temporadas ayudan?
if (temps.indexOf('2122') >= 2) {
  const gridH = [0.8, 1.0, 1.2, 1.6, 2.2], mH = {};
  for (const xi of gridH) { mH[xi] = correr({ ...APP, xi }, TUNE, 2); resumen('ajuste hist=2 xi=' + xi, mH[xi]); }
  const xiH = gridH.slice().sort((a, b) => prom(ll1(mH[a]).map(x => LOG(x.p[x.y]))) - prom(ll1(mH[b]).map(x => LOG(x.p[x.y]))))[0];
  console.log('elegida hist=2: xi', xiH);
  const oH = correr({ ...APP, xi: xiH, wt: mejorWt }, PRUEBA, 2); resumen('hist=2 (prueba)', oH);
  const mH2 = idx(oH), q = pa.filter(x => x.mk && mH2.has(x.lg + x.t + x.j)), dd = zDif(q.map(x => LOG(mH2.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y])));
  const qo = pa.filter(x => x.ou != null && mH2.has(x.lg + x.t + x.j)), dd2 = zDif(qo.map(x => lOU(mH2.get(x.lg + x.t + x.j)) - lOU(x)));
  console.log('hist2 - app, prueba: 1X2', dd.m.toFixed(5), 'z', dd.z.toFixed(2), '| M/M', dd2.m.toFixed(5), 'z', dd2.z.toFixed(2));
  for (const t of PRUEBA) { const z = q.filter(x => x.t === t); console.log('  ', t, prom(z.map(x => LOG(mH2.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y]))).toFixed(5)); }
  const dN = zDif(q.filter(x=>mN.has(x.lg + x.t + x.j)).map(x => LOG(mH2.get(x.lg + x.t + x.j).p[x.y]) - LOG(mN.get(x.lg + x.t + x.j).p[x.y]))); console.log('hist2 - xi nuevo con hist1:', dN.m.toFixed(5), 'z', dN.z.toFixed(2));
}
// 3) ¿Qué pasa cuando discrepan? tramos del aviso de la app (mx = mayor diferencia en puntos entre los 3 resultados)
function tramos(o, etq) {
  console.log('--- ' + etq + ' ---');
  const T = [[0, 4, 'hasta 4'], [4, 8, '4 a 8'], [8, 12, '8 a 12'], [12, 100, '12+']];
  for (const [a, b, n] of T) {
    const q = o.filter(x => x.mk).map(x => { const dif = x.p.map((v, i) => (v - x.mk[i]) * 100), mx = Math.max(...dif.map(Math.abs)), lado = dif.indexOf(Math.max(...dif)); return { ...x, mx, lado, dl: dif[lado] }; }).filter(x => x.mx > a && x.mx <= b || (a === 0 && x.mx === 0));
    const conPs = q.filter(x => x.ps), ret = conPs.map(x => x.y === x.lado ? x.ps[x.lado] - 1 : -1), s = Math.sqrt(prom(ret.map(v => (v - prom(ret)) ** 2)) / (ret.length || 1));
    console.log(`${n.padEnd(8)} n=${String(q.length).padStart(5)} (${(100 * q.length / o.filter(x => x.mk).length).toFixed(1)}%) | modelo ${prom(q.map(x => LOG(x.p[x.y]))).toFixed(4)} mercado ${prom(q.map(x => LOG(x.mk[x.y]))).toFixed(4)} | lado del modelo: dice ${(100 * prom(q.map(x => x.p[x.lado]))).toFixed(1)}% mercado ${(100 * prom(q.map(x => x.mk[x.lado]))).toFixed(1)}% pasó ${(100 * prom(q.map(x => +(x.y === x.lado)))).toFixed(1)}% | ROI Pinnacle ${(100 * prom(ret)).toFixed(1)}% ±${(200 * s).toFixed(1)} (${ret.length})`);
  }
  const roi = (min) => { const q = o.filter(x => x.mk && x.ps).map(x => { const dif = x.p.map((v, i) => (v - x.mk[i]) * 100), l = dif.indexOf(Math.max(...dif)); return { ...x, l, dl: dif[l] }; }).filter(x => x.dl >= min), ret = q.map(x => x.y === x.l ? x.ps[x.l] - 1 : -1), s = Math.sqrt(prom(ret.map(v => (v - prom(ret)) ** 2)) / (ret.length || 1)); return `≥${min}: ${(100 * prom(ret)).toFixed(1)}% ±${(200 * s).toFixed(1)} (${ret.length})`; };
  console.log('ROI apostando donde modelo > mercado:', [2, 4, 6, 8, 10].map(roi).join(' | '));
  const porT = [...new Set(o.map(x => x.t))].map(t => { const q = o.filter(x => x.t === t && x.mk && x.ps).map(x => { const dif = x.p.map((v, i) => (v - x.mk[i]) * 100), l = dif.indexOf(Math.max(...dif)); return { ...x, l, dl: dif[l] }; }).filter(x => x.dl >= 2), ret = q.map(x => x.y === x.l ? x.ps[x.l] - 1 : -1); return t + ':' + (100 * prom(ret)).toFixed(1) + '%(' + ret.length + ')'; });
  console.log('ROI ≥2 por temporada:', porT.join(' '));
  const porA = [...new Set(o.map(x => x.t))].map(t => { const q = o.filter(x => x.t === t && x.mk && x.avg).map(x => { const dif = x.p.map((v, i) => (v - x.mk[i]) * 100), l = dif.indexOf(Math.max(...dif)); return { ...x, l, dl: dif[l] }; }).filter(x => x.dl >= 2), ret = q.map(x => x.y === x.l ? x.avg[x.l] - 1 : -1); return t + ':' + (100 * prom(ret)).toFixed(1) + '%(' + ret.length + ')'; });
  console.log('ROI ≥2 a cuota promedio, por temporada:', porA.join(' '));
  const roiA = (min) => { const q = o.filter(x => x.mk && x.avg).map(x => { const dif = x.p.map((v, i) => (v - x.mk[i]) * 100), l = dif.indexOf(Math.max(...dif)); return { ...x, l, dl: dif[l] }; }).filter(x => x.dl >= min), ret = q.map(x => x.y === x.l ? x.avg[x.l] - 1 : -1), s = Math.sqrt(prom(ret.map(v => (v - prom(ret)) ** 2)) / (ret.length || 1)); return `≥${min}: ${(100 * prom(ret)).toFixed(1)}% ±${(200 * s).toFixed(1)} (${ret.length})`; };
  console.log('ROI a cuota promedio:', [2, 4, 6, 8, 10].map(roiA).join(' | '));
}
tramos(oApp, 'ANTERIOR, todas');
tramos(pr(oApp), 'ANTERIOR, prueba');
tramos(pr(oNew), 'nuevos, prueba');
// 4) Más/Menos: diferencia contra mercado
function tramosOU(o, etq) {
  console.log('--- M/M 2.5 ' + etq + ' ---');
  for (const [a, b] of [[0, 3], [3, 6], [6, 10], [10, 100]]) {
    const q = o.filter(x => x.ou != null && x.ouPs).map(x => { const d = (x.o25 - x.ou) * 100; return { ...x, d, m: Math.abs(d) }; }).filter(x => x.m > a && x.m <= b);
    const ret = q.map(x => { const over = x.d > 0, gana = over ? x.tot > 2.5 : x.tot < 2.5; return gana ? (over ? x.ouPs[0] : x.ouPs[1]) - 1 : -1; }), s = Math.sqrt(prom(ret.map(v => (v - prom(ret)) ** 2)) / (ret.length || 1));
    console.log(`${a}-${b} n=${q.length} ROI ${(100 * prom(ret)).toFixed(1)}% ±${(200 * s).toFixed(1)}`);
  }
}
tramosOU(oApp, 'APP'); tramosOU(pr(oNew), 'nuevos prueba');
// 4b) Configuración final: 2 temporadas de historial, xi 1.0, wt 0.5
const FINAL = { ...APP, xi: 1.0, wt: 0.5 }, oF = correr(FINAL, temps.slice(2), 2), pF = pr(oF);
console.log('=== FINAL (2 temporadas de historial, xi 1.0) ===');
res.todasFinal = resumen('FINAL (todas)', oF); res.pruebaFinal = resumen('FINAL (prueba)', pF);
for (const t of temps.slice(2)) { resumen('  final ' + t, oF.filter(x => x.t === t)); }
tramos(oF, 'FINAL, todas'); tramos(pF, 'FINAL, prueba'); tramosOU(oF, 'FINAL todas'); tramosOU(pF, 'FINAL prueba');
const gf = oF.filter(x => x.mk).map(x => Math.max(...x.p.map((v, i) => Math.abs(v - x.mk[i]) * 100))).sort((a, b) => a - b);
console.log('diferencia FINAL: mediana', gf[gf.length >> 1].toFixed(1), 'p90', gf[Math.floor(gf.length * .9)].toFixed(1), 'p99', gf[Math.floor(gf.length * .99)].toFixed(1));
// mezcla con el mercado (peso del modelo)
for (const w of [0, 0.05, 0.1, 0.2, 0.3]) { const q = pF.filter(x => x.mk), d = zDif(q.map(x => { const m = x.p.map((v, i) => Math.pow(x.mk[i], 1 - w) * Math.pow(v, w)), s = m[0] + m[1] + m[2]; return LOG(m[x.y] / s) - LOG(x.mk[x.y]); })); console.log('mezcla peso modelo', w, 'dif con mercado', d.m.toFixed(5), 'z', d.z.toFixed(1)); }
// Elo opcional sobre la configuración final
for (const e of [0.1, 0.2, 0.3]) { ctx.ELOV = e; const o = correr(FINAL, PRUEBA, 2); ctx.ELOV = 0; const m = idx(o), q = pF.filter(x => x.mk && m.has(x.lg + x.t + x.j)), d = zDif(q.map(x => LOG(m.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y]))); console.log('Elo', e, resumen('  con Elo', o).x12.toFixed(4), 'contra final', d.m.toFixed(5), 'z', d.z.toFixed(2)); }
// ¿3 temporadas de historial?
{ const gr = [0.6, 0.8, 1.0], mm = {}; for (const xi of gr) { mm[xi] = correr({ ...APP, xi }, ['2223'], 3); resumen('ajuste hist=3 xi=' + xi, mm[xi]); }
  const b = gr.slice().sort((a, c) => prom(ll1(mm[a]).map(x => LOG(x.p[x.y]))) - prom(ll1(mm[c]).map(x => LOG(x.p[x.y]))))[0];
  const o3 = correr({ ...APP, xi: b, wt: 0.5 }, PRUEBA, 3), m3 = idx(o3), q = pF.filter(x => x.mk && m3.has(x.lg + x.t + x.j)), d = zDif(q.map(x => LOG(m3.get(x.lg + x.t + x.j).p[x.y]) - LOG(x.p[x.y]))); resumen('hist=3 xi=' + b + ' (prueba)', o3); console.log('hist3 contra final', d.m.toFixed(5), 'z', d.z.toFixed(2)); }
// 5) Equipos sin historial en la liga (ascendidos), por liga, y primeros partidos
const sub = (o, f, n) => { const q = o.filter(x => x.mk && f(x)); console.log(n.padEnd(32) + ' n=' + q.length + ' modelo ' + prom(q.map(x => LOG(x.p[x.y]))).toFixed(4) + ' mercado ' + prom(q.map(x => LOG(x.mk[x.y]))).toFixed(4) + ' dif medio ' + prom(q.map(x => Math.max(...x.p.map((v, i) => Math.abs(v - x.mk[i]) * 100)))).toFixed(1) + ' pts'); };
ligas.forEach(l => sub(oApp, x => x.lg === l, 'liga ' + l));
sub(oApp, x => !x.hN || !x.aN, 'con ascendido');
sub(oApp, x => x.hN && x.aN, 'sin ascendido');
// gap medio y percentiles
const gaps = oApp.filter(x => x.mk).map(x => Math.max(...x.p.map((v, i) => Math.abs(v - x.mk[i]) * 100))).sort((a, b) => a - b);
console.log('diferencia típica: mediana', gaps[gaps.length >> 1].toFixed(1), 'p90', gaps[Math.floor(gaps.length * .9)].toFixed(1), 'p99', gaps[Math.floor(gaps.length * .99)].toFixed(1));
fs.writeFileSync(process.env.SALIDA_JSON || '/dev/null', JSON.stringify({ res, mejorXi, mejorWt }));
