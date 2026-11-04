'use strict';
// Uso: DUMP=partidos_v22.json node scripts/medicion/fut_pendientes_ligas.js partidos_actual.json
// Motor real de futbol.html (dcAjustar + calcularDC) con la configuración de la app, igual que en el teléfono: 2 temporadas de historial.
// Mide lo que faltaba en las 5 ligas: (A) Ambos anotan, (B) cuota previa en vez de cierre (lo más parecido a tomar la cuota temprano).
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'futbol.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
const bloqueVar = n => { const i = html.search(new RegExp('var ' + n + '\\s*=')); return html.slice(i, html.indexOf(';', html.indexOf('}', i)) + 1) + '\n'; };
const src = 'var localStorage={getItem:function(){return null;}};var MAXG=8;\n' + cut('function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n"
  + cut('function mezclar(d, d0, w, claves)', '// Todas las probabilidades del modelo') + cut('function buscarEnMapa(mapa, nombre)', 'var buscarSemilla') + bloqueVar('DC_CFG')
  + cut('function dcAjustar(lista, hoyDia, cfg)', 'function calcular(eL, eV, P)') + 'var DCFIT=null;function claveEq(n){return String(n);} function mismaClave(x,y){return x===y;} function tsPartido(p){return p.ts;}\n';
const ctx = { Math, Object, JSON, parseFloat, isFinite, console }; vm.createContext(ctx); vm.runInContext(src, ctx);
const filas = JSON.parse(fs.readFileSync(process.argv[2])), temps = [...new Set(filas.map(x => x.t))].sort(), ligas = [...new Set(filas.map(x => x.lg))];
const CFG = JSON.parse(JSON.stringify(ctx.DC_CFG));
const LOG = p => -Math.log(Math.max(p, 1e-9)), prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), est = a => { const m = prom(a), s = Math.sqrt(prom(a.map(v => (v - m) ** 2)) / (a.length || 1)); return { m, s, z: s ? m / s : 0, n: a.length }; };
const pc = (e, d) => (100 * e.m).toFixed(d || 1) + '% ±' + (200 * e.s).toFixed(d || 1) + ' (' + e.n + ')', devig = o => { const i = o.map(v => 1 / v), s = i.reduce((a, b) => a + b, 0); return i.map(v => v / s); };
const PRUEBA = temps.filter(t => t > '2223'), DESDE = temps.indexOf('2021');
function correr(cfg) {
  const out = []; vm.runInContext('DC_CFG=' + JSON.stringify(cfg), ctx);
  for (const lg of ligas) for (let si = DESDE; si < temps.length; si++) {
    const t = temps[si], prev = temps.slice(si - 2, si), ant = filas.filter(x => x.lg === lg && prev.includes(x.t)), act = filas.filter(x => x.lg === lg && x.t === t).sort((a, b) => a.d - b.d);
    const conv = x => ({ local: x.h, visita: x.a, golesLocal: x.gh, golesVisita: x.ga, ts: x.d }), base = ant.map(conv); let i = 0;
    while (i < act.length) {
      const d = act[i].d; let j = i; while (j < act.length && act[j].d === d) j++;
      ctx.lista = base.concat(act.slice(0, i).map(conv)); ctx.hoy = Math.floor(d / 864e5);
      const fit = vm.runInContext('dcAjustar(lista,hoy,DC_CFG)', ctx);
      if (fit) { fit.liga = lg; ctx.f = fit; vm.runInContext('DCFIT=f', ctx);
        for (let k = i; k < j; k++) { const x = act[k]; ctx.a = { nombre: x.h }; ctx.b = { nombre: x.a }; const r = vm.runInContext('calcularDC(a,b)', ctx); out.push({ x, p: [r.pL, r.pD, r.pV], o25: r.overLin[2.5], btts: r.pBtts }); } }
      i = j;
    }
  }
  return out;
}
console.log('config app', JSON.stringify({ xi: CFG.xi, wt: CFG.wt, rho: CFG.rho, Kp: CFG.Kp }), '| temporadas', temps.join(' '));
const O = correr(CFG);
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(O.map(r => ({ ...r.x, F22: r.p }))));
// Probabilidad de Ambos anotan implícita en la cuota: se buscan los goles esperados que reproducen 1X2 y Más/Menos de cierre
const DIST = (l, v) => { ctx.l = l; ctx.v = v; return vm.runInContext('distribucion(l,v,-0.06,false)', ctx); };
function implicita(mk, ou) {
  const err = (l, v) => { const d = DIST(l, v); return (d.pL - mk[0]) ** 2 + (d.pV - mk[2]) ** 2 + (d.o25 - ou) ** 2; };
  let l = 1.45, v = 1.15, paso = 0.32, e = err(l, v);
  while (paso > 0.004) { let mejor = false; for (const [a, b] of [[paso, 0], [-paso, 0], [0, paso], [0, -paso], [paso, paso], [-paso, -paso], [paso, -paso], [-paso, paso]]) { const L = l + a, V = v + b; if (L < 0.05 || V < 0.05) continue; const q = err(L, V); if (q < e) { e = q; l = L; v = V; mejor = true; break; } } if (!mejor) paso /= 2; }
  return DIST(l, v).btts;
}
// frecuencia de la liga: lo acumulado hasta el día anterior (temporadas anteriores + esta)
const frec = {}; ligas.forEach(lg => { const ms = filas.filter(x => x.lg === lg).sort((a, b) => a.d - b.d); let s = 0, n = 0, i = 0; while (i < ms.length) { const d = ms[i].d; let j = i; while (j < ms.length && ms[j].d === d) j++; for (let k = i; k < j; k++) frec[lg + ms[k].h + ms[k].a + ms[k].d] = n > 50 ? s / n : 0.52; for (let k = i; k < j; k++) { s += ms[k].gh > 0 && ms[k].ga > 0 ? 1 : 0; n++; } i = j; } });
const R = O.filter(r => r.x.mk && r.x.ou != null).map(r => { const y = r.x.gh > 0 && r.x.ga > 0 ? 1 : 0, ll = p => y ? LOG(p) : LOG(1 - p); const im = implicita(r.x.mk, r.x.ou), fr = frec[r.x.lg + r.x.h + r.x.a + r.x.d]; return { ...r, y, im, fr, lM: ll(r.btts), lI: ll(im), lF: ll(fr) }; });
console.log('\n=== A) AMBOS ANOTAN (pérdida log, menos es mejor) · no hay cuota real histórica: «implícita» sale de 1X2 y Más/Menos de cierre ===');
for (const [n, q] of [['Todas', R], ['Prueba 2023-24+', R.filter(r => PRUEBA.includes(r.x.t))]]) {
  const a = est(q.map(r => r.lM - r.lF)), b = est(q.map(r => r.lM - r.lI));
  console.log(`${n} n=${q.length} | modelo ${prom(q.map(r => r.lM)).toFixed(4)} frecuencia liga ${prom(q.map(r => r.lF)).toFixed(4)} implícita ${prom(q.map(r => r.lI)).toFixed(4)} | modelo−frecuencia ${(1000 * a.m).toFixed(2)} mil. z ${a.z.toFixed(1)} | modelo−implícita ${(1000 * b.m).toFixed(2)} mil. z ${b.z.toFixed(1)} | pasó ${(100 * prom(q.map(r => r.y))).toFixed(1)}%`);
}
for (const t of temps.slice(DESDE)) { const q = R.filter(r => r.x.t === t), a = est(q.map(r => r.lM - r.lF)); console.log(`  ${t} n=${q.length} modelo ${prom(q.map(r => r.lM)).toFixed(4)} frec ${prom(q.map(r => r.lF)).toFixed(4)} implícita ${prom(q.map(r => r.lI)).toFixed(4)} modelo−frec z ${a.z.toFixed(1)}`); }
console.log('Calibración del modelo:'); for (const [a, b] of [[0, .45], [.45, .5], [.5, .55], [.55, .6], [.6, 1]]) { const q = R.filter(r => r.btts >= a && r.btts < b); console.log(`  ${(a * 100).toFixed(0)}-${(b * 100).toFixed(0)}%: n=${q.length} dice ${(100 * prom(q.map(r => r.btts))).toFixed(1)}% implícita ${(100 * prom(q.map(r => r.im))).toFixed(1)}% pasó ${(100 * prom(q.map(r => r.y))).toFixed(1)}%`); }
console.log('Cuando el modelo se separa de la implícita (sin cuota real no hay ROI):'); for (const [a, b] of [[0, 2], [2, 4], [4, 6], [6, 100]]) { const q = R.map(r => ({ ...r, d: (r.btts - r.im) * 100 })).filter(r => Math.abs(r.d) >= a && Math.abs(r.d) < b); const lado = q.map(r => r.d > 0 ? { m: r.btts, i: r.im, y: r.y } : { m: 1 - r.btts, i: 1 - r.im, y: 1 - r.y }); console.log(`  ${a}-${b} pts: n=${q.length} modelo dice ${(100 * prom(lado.map(z => z.m))).toFixed(1)}% implícita ${(100 * prom(lado.map(z => z.i))).toFixed(1)}% pasó ${(100 * prom(lado.map(z => z.y))).toFixed(1)}%`); }
for (const wt of [0, 0.25, 0.5, 0.75, 1]) { const c = { ...CFG, wt }, o = correr(c).filter(r => r.x.mk && PRUEBA.includes(r.x.t)), q = o.map(r => { const y = r.x.gh > 0 && r.x.ga > 0; return y ? LOG(r.btts) : LOG(1 - r.btts); }); console.log(`  wt ${wt}: pérdida prueba ${prom(q).toFixed(4)}`); }
// B) cuota previa
console.log('\n=== B) CUOTA PREVIA DE PINNACLE (football-data la toma 1-3 días antes; no es la apertura real) ===');
const P = O.filter(r => r.x.pe && r.x.ps).map(r => { const e = devig(r.x.pe), c = devig(r.x.ps), d = r.p.map((v, i) => (v - e[i]) * 100), l = d.indexOf(Math.max(...d)); return { ...r, e, c, d, l, dl: d[l], t: r.x.t, y: r.x.y }; });
const conteo = {}; O.forEach(r => { const t = r.x.t; conteo[t] = conteo[t] || [0, 0, 0]; conteo[t][0]++; if (r.x.pe) conteo[t][1]++; if (r.x.pe && r.x.ps) conteo[t][2]++; }); console.log('partidos, con previa, con previa y cierre:', JSON.stringify(conteo));
{ const lM = est(P.map(r => LOG(r.p[r.y]) - LOG(r.e[r.y]))), lC = est(P.map(r => LOG(r.c[r.y]) - LOG(r.e[r.y]))); console.log(`pérdida: modelo ${prom(P.map(r => LOG(r.p[r.y]))).toFixed(4)} previa ${prom(P.map(r => LOG(r.e[r.y]))).toFixed(4)} cierre ${prom(P.map(r => LOG(r.c[r.y]))).toFixed(4)} | modelo−previa z ${lM.z.toFixed(1)} | cierre−previa ${(1000 * lC.m).toFixed(2)} mil. z ${lC.z.toFixed(1)}`); }
const apuestas = (q, sel) => q.map(r => { const l = sel(r); return { r, l, ret: r.y === l ? r.x.pe[l] - 1 : -1, clv: r.x.pe[l] * r.c[l] - 1, mov: (r.c[l] - r.e[l]) * 100 }; });
for (const min of [0, 2, 4, 6, 8, 10]) { const q = apuestas(P.filter(r => r.dl >= min), r => r.l); console.log(`modelo ≥${min} pts sobre la previa: ROI ${pc(est(q.map(z => z.ret)))} | CLV ${pc(est(q.map(z => z.clv)), 2)} | la línea se movió ${prom(q.map(z => z.mov)).toFixed(2)} pts hacia ese lado`); }
{ const q = apuestas(P, r => [0, 1, 2][Math.floor(r.x.d / 864e5 + r.x.gh * 7 + r.x.ga * 13) % 3]); console.log(`control, un resultado cualquiera: ROI ${pc(est(q.map(z => z.ret)))} | CLV ${pc(est(q.map(z => z.clv)), 2)}`); }
for (const t of [...new Set(P.map(r => r.t))]) { const q = apuestas(P.filter(r => r.t === t && r.dl >= 2), r => r.l); console.log(`  ${t} ≥2: ROI ${pc(est(q.map(z => z.ret)))} | CLV ${pc(est(q.map(z => z.clv)), 2)}`); }
// ¿la opinión del modelo anticipa el movimiento? pendiente de (cierre − previa) contra (modelo − previa)
{ const xs = [], ys = []; P.forEach(r => [0, 2].forEach(i => { xs.push(r.p[i] - r.e[i]); ys.push(r.c[i] - r.e[i]); })); const mx = prom(xs), my = prom(ys), b = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0), res = ys.map((y, i) => y - my - b * (xs[i] - mx)), se = Math.sqrt(prom(res.map(v => v * v)) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)); console.log(`el cierre se mueve ${(b * 100).toFixed(2)}% (±${(200 * se).toFixed(2)}, error aproximado) de la distancia entre modelo y previa`); }
// Más/Menos con cuota previa
{ const q = O.filter(r => r.x.oue && r.x.ou != null).map(r => { const e = devig(r.x.oue)[0], d = (r.o25 - e) * 100; return { ...r, e, d }; }); for (const min of [0, 3, 6, 10]) { const z = q.filter(r => Math.abs(r.d) >= min), ret = z.map(r => { const over = r.d > 0, gana = over ? r.x.gh + r.x.ga > 2.5 : r.x.gh + r.x.ga < 2.5; return gana ? (over ? r.x.oue[0] : r.x.oue[1]) - 1 : -1; }); console.log(`M/M 2.5 a cuota previa, modelo ≥${min} pts: ROI ${pc(est(ret))}`); } }
