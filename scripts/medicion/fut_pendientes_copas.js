'use strict';
// Uso: node scripts/medicion/fut_pendientes_copas.js partidos_copas.json
// Mide con las fórmulas reales de la app: Champions/Europa/Conference (probsModelo de futbol.html) y selecciones (Elo de selecciones.js).
// Las copas nacionales no tienen pronóstico en la app; ahí solo se mide el mercado.
const fs = require('fs'), vm = require('vm'), path = require('path');
const RAIZ = path.join(__dirname, '..', '..'), html = fs.readFileSync(path.join(RAIZ, 'futbol.html'), 'utf8'), sel = fs.readFileSync(path.join(RAIZ, 'selecciones.js'), 'utf8');
const cut = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return t.slice(i, j); };
const lin = (t, n) => { const m = t.match(new RegExp('var ' + n + '\\s*=\\s*\\{[^;]*\\};')); if (!m) throw new Error('no ' + n); return m[0] + '\n'; };
const src = 'var MAXG=8;\n' + cut(html, 'function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n" + cut(html, 'function mezclar(d, d0, w, claves)', '// ---------- historial') + cut(html, 'function conSemilla(a, s, S, lp)', 'function cargarSemillaCache') + lin(html, 'PARAMS_DEFECTO') + cut(sel, 'function probsDe(dr, d0)', 'function construirElo') + lin(sel, 'KT') + lin(sel, 'HA');
const ctx = { Math, Object, console, isFinite }; vm.createContext(ctx); vm.runInContext(src, ctx);
const X = JSON.parse(fs.readFileSync(process.argv[2]));
const aTemp = {}; X.forEach(x => { const k = x.tipo + ' ' + (x.cu ? x.cu.prov : 'sin cuota'); aTemp[k] = (aTemp[k] || 0) + 1; }); console.log('partidos por tipo y fuente de cuota', JSON.stringify(aTemp));
const P0 = ctx.PARAMS_DEFECTO, devig = o => { const i = o.map(v => 1 / v), s = i.reduce((a, b) => a + b, 0); return i.map(v => v / s); }, LOG = p => -Math.log(Math.max(p, 1e-9)), prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), est = a => { const m = prom(a), s = Math.sqrt(prom(a.map(v => (v - m) ** 2)) / (a.length || 1)); return { m, s, z: s ? m / s : 0, n: a.length }; };
const pc = e => (100 * e.m).toFixed(1) + '% ±' + (200 * e.s).toFixed(1) + ' (' + e.n + ')';
const res90 = x => /AET|PEN|EXTRA|SHOOT/i.test(x.est || '') ? 1 : (x.gh > x.ga ? 0 : x.gh === x.ga ? 1 : 2);
const temporada = d => { const f = new Date(d); return f.getUTCMonth() >= 6 ? f.getUTCFullYear() : f.getUTCFullYear() - 1; };
function informe(nom, q) {
  q = q.filter(r => r.p);
  const m = q.filter(r => r.mk), fr = est(q.map(r => LOG(r.p[r.y]) - LOG(r.base[r.y])));
  const acierto = prom(q.map(r => r.p.indexOf(Math.max(...r.p)) === r.y ? 1 : 0));
  console.log(`\n--- ${nom}: n=${q.length} | modelo ${prom(q.map(r => LOG(r.p[r.y]))).toFixed(4)} frecuencia ${prom(q.map(r => LOG(r.base[r.y]))).toFixed(4)} dif ${(1000 * fr.m).toFixed(1)} mil. z ${fr.z.toFixed(1)} | acierta ${(100 * acierto).toFixed(1)}%`);
  if (m.length < 30) { console.log('    sin cuotas suficientes: ' + m.length); return; }
  const d = est(m.map(r => LOG(r.p[r.y]) - LOG(r.mk[r.y]))), gap = m.map(r => Math.max(...r.p.map((v, i) => Math.abs(v - r.mk[i]) * 100))).sort((a, b) => a - b);
  console.log(`    con cuota n=${m.length} | modelo ${prom(m.map(r => LOG(r.p[r.y]))).toFixed(4)} mercado ${prom(m.map(r => LOG(r.mk[r.y]))).toFixed(4)} dif ${(1000 * d.m).toFixed(1)} mil. z ${d.z.toFixed(1)} | diferencia mediana ${gap[gap.length >> 1].toFixed(1)} pts, p90 ${gap[Math.floor(gap.length * .9)].toFixed(1)} | margen mediano ${(100 * prom(m.map(r => r.o.reduce((a, v) => a + 1 / v, 0) - 1))).toFixed(1)}%`);
  for (const min of [2, 5, 8, 12]) { const z = m.map(r => { const dd = r.p.map((v, i) => (v - r.mk[i]) * 100), l = dd.indexOf(Math.max(...dd)); return { r, l, dl: dd[l] }; }).filter(z => z.dl >= min), ret = z.map(a => a.r.y === a.l ? a.r.o[a.l] - 1 : -1); console.log(`    modelo ≥${min} pts sobre el mercado: ROI ${pc(est(ret))} | dice ${(100 * prom(z.map(a => a.r.p[a.l]))).toFixed(1)}% mercado ${(100 * prom(z.map(a => a.r.mk[a.l]))).toFixed(1)}% pasó ${(100 * prom(z.map(a => a.r.y === a.l ? 1 : 0))).toFixed(1)}%`); }
  for (const w of [0.1, 0.3]) { const e = est(m.map(r => { const c = r.p.map((v, i) => Math.pow(r.mk[i], 1 - w) * Math.pow(v, w)), s = c[0] + c[1] + c[2]; return LOG(c[r.y] / s) - LOG(r.mk[r.y]); })); console.log(`    mezcla ${w * 100}% modelo: dif con mercado ${(1000 * e.m).toFixed(2)} mil. z ${e.z.toFixed(1)}`); }
}
function mercado(nom, q) { const m = q.filter(r => r.mk); if (m.length < 30) { console.log(`\n--- ${nom}: solo ${m.length} con cuota de ${q.length}`); return; } const fav = m.map(r => { const l = r.mk.indexOf(Math.max(...r.mk)); return r.y === l ? r.o[l] - 1 : -1; }), per = m.map(r => { const l = r.mk[0] <= r.mk[2] ? 0 : 2; return r.y === l ? r.o[l] - 1 : -1; }); console.log(`\n--- ${nom}: n=${q.length} con cuota ${m.length} | mercado ${prom(m.map(r => LOG(r.mk[r.y]))).toFixed(4)} | favorito ROI ${pc(est(fav))} | perro ROI ${pc(est(per))}`); }
const conMk = (x, r) => { const c = x.cu && x.cu.c; if (c && c.every(v => v > 1)) { r.o = c; r.mk = devig(c); r.prov = x.cu.prov; } return r; };
const COMP = {};
// --- Champions, Europa, Conference: fórmula de la app sobre lo acumulado de la temporada en esa competición
for (const [conS, etq] of [[false, 'sin historial (lo normal en el teléfono)'], [true, 'con la temporada pasada de esa copa (si ya abriste Backtest)']]) {
  const salida = {};
  for (const sl of ['uefa.champions', 'uefa.europa', 'uefa.europa.conf']) {
    const ms = X.filter(x => x.sl === sl).sort((a, b) => a.d - b.d), porT = {}; ms.forEach(x => { (porT[temporada(x.d)] = porT[temporada(x.d)] || []).push(x); });
    const frc = [1, 1, 1]; let nf = 3; const out = salida[sl] = [];
    for (const t of Object.keys(porT).sort()) {
      const tab = {}, cero = () => ({ pj: 0, gf: 0, gc: 0 });
      let sem = {}; if (conS && porT[t - 1]) { const m = {}; let g = 0, n = 0; porT[t - 1].forEach(p => { g += p.gh + p.ga; n++; [[p.h, p.gh, p.ga], [p.a, p.ga, p.gh]].forEach(z => { const e = m[z[0]] || (m[z[0]] = cero()); e.pj++; e.gf += z[1]; e.gc += z[2]; }); }); const lp0 = Math.max(g / (2 * n), .5); Object.keys(m).forEach(k => { if (m[k].pj >= 6) sem[k] = { att: m[k].gf / m[k].pj / lp0, def: m[k].gc / m[k].pj / lp0 }; }); }
      for (const x of porT[t]) {
        const a = tab[x.h] || cero(), b = tab[x.a] || cero(), tot = Object.values(tab).reduce((q, e) => [q[0] + e.gf, q[1] + e.pj], [0, 0]), lp = tot[1] > 0 ? Math.max(tot[0] / tot[1], .5) : 1.35;
        ctx.eL = sem[x.h] && conS ? ctx.conSemilla(a, sem[x.h], P0.S, lp) : a; ctx.eV = sem[x.a] && conS ? ctx.conSemilla(b, sem[x.a], P0.S, lp) : b; ctx.lp = lp;
        const d = vm.runInContext('probsModelo(eL,eV,lp,PARAMS_DEFECTO,false)', ctx), y = res90(x);
        out.push(conMk(x, { t, y, p: a.pj >= 2 && b.pj >= 2 ? [d.pL, d.pD, d.pV] : null, base: frc.map(v => v / nf), minPj: Math.min(a.pj, b.pj), btts: d.btts, o25: d.o25, x }));
        frc[y]++; nf++;
        [[x.h, x.gh, x.ga], [x.a, x.ga, x.gh]].forEach(z => { const e = tab[z[0]] || (tab[z[0]] = cero()); e.pj++; e.gf += z[1]; e.gc += z[2]; });
      }
    }
    informe(sl + ' · ' + etq, out);
    if (!conS) COMP[sl] = out; else { const mm = new Map(COMP[sl].map(r => [r.x.id, r])), q = out.filter(r => r.p && mm.get(r.x.id) && mm.get(r.x.id).p), dz = est(q.map(r => LOG(r.p[r.y]) - LOG(mm.get(r.x.id).p[r.y]))), porT = {}; q.forEach(r => { (porT[r.t] = porT[r.t] || []).push(LOG(r.p[r.y]) - LOG(mm.get(r.x.id).p[r.y])); }); console.log(`    con historial − sin historial: ${(1000 * dz.m).toFixed(1)} mil. z ${dz.z.toFixed(1)} | por temporada ${Object.keys(porT).sort().map(t => t + ':' + (1000 * prom(porT[t])).toFixed(0)).join(' ')}`); }
    if (!conS) informe(sl + ' · ' + etq + ' · ambos con 4+ partidos', out.filter(r => r.minPj >= 4));
  }
  if (!conS) { const tt = [].concat(...Object.values(salida)); informe('TODAS las copas europeas · ' + etq, tt); const prov = {}; tt.forEach(r => { if (r.prov) prov[r.prov] = (prov[r.prov] || 0) + 1; }); console.log('    casas', JSON.stringify(prov)); const y = {}; tt.filter(r => r.mk).forEach(r => { y[r.t] = (y[r.t] || 0) + 1; }); console.log('    con cuota por temporada', JSON.stringify(y)); }
}
// --- Copas nacionales: la app no pronostica; solo el mercado
{ const q = X.filter(x => x.tipo === 'copa').map(x => conMk(x, { y: res90(x), x })); mercado('Copas nacionales (la app no da pronóstico)', q); }
// --- Control: la misma cuota de ESPN en la Premier; debe parecerse a Pinnacle
{ const q = X.filter(x => x.tipo === 'control').map(x => conMk(x, { y: res90(x), x })); mercado('Control Premier con cuotas de ESPN (Pinnacle 2023-26 da ≈0.96 de pérdida)', q); const m = q.filter(r => r.mk); console.log('    margen', (100 * prom(m.map(r => r.o.reduce((a, v) => a + 1 / v, 0) - 1))).toFixed(1) + '%'); [[0, .3], [.3, .5], [.5, .7], [.7, 1]].forEach(([a, b]) => { const z = [].concat(...m.map(r => r.mk.map((v, i) => ({ v, ok: r.y === i ? 1 : 0 })))).filter(c => c.v >= a && c.v < b); console.log(`    calibración ${a * 100}-${b * 100}%: n=${z.length} dice ${(100 * prom(z.map(c => c.v))).toFixed(1)} pasó ${(100 * prom(z.map(c => c.ok))).toFixed(1)}`); }); }
// --- Selecciones: Elo real de selecciones.js
{
  const ms = X.filter(x => !['europa', 'copa', 'control'].includes(x.tipo)).sort((a, b) => a.d - b.d);
  const emp = ms.filter(m => m.gh === m.ga).length, d0 = Math.max(.15, Math.min(.32, emp / ms.length)); console.log('\nSelecciones: partidos', ms.length, 'd0', d0.toFixed(3));
  const R = {}, frc = [1, 1, 1]; let nf = 3; const out = [];
  for (const m of ms) {
    const a = R[m.h] || (R[m.h] = { r: 1500, n: 0 }), b = R[m.a] || (R[m.a] = { r: 1500, n: 0 }), ha = ctx.HA[m.tipo] || 0, dr = a.r - b.r + ha, E = 1 / (1 + Math.pow(10, -dr / 400));
    const pr = ctx.probsDe(dr, d0), y = res90(m);
    out.push(conMk(m, { y, p: a.n >= 5 && b.n >= 5 ? [pr.L, pr.D, pr.V] : null, base: frc.map(v => v / nf), tipo: m.tipo, sl: m.sl, x: m }));
    const yReal = m.gh > m.ga ? 0 : m.gh === m.ga ? 1 : 2, S = yReal === 0 ? 1 : yReal === 1 ? .5 : 0, dif = Math.abs(m.gh - m.ga), G = dif <= 1 ? 1 : dif === 2 ? 1.5 : (11 + dif) / 8, de = (ctx.KT[m.tipo] || 30) * G * (S - E);
    a.r += de; b.r -= de; a.n++; b.n++; frc[y]++; nf++;
  }
  informe('Selecciones, todas', out);
  ['amistoso', 'liga de naciones', 'eliminatoria', 'torneo', 'mundial'].forEach(t => informe('Selecciones · ' + t, out.filter(r => r.tipo === t)));
  const cal = [[0, .35], [.35, .5], [.5, .65], [.65, .8], [.8, 1]]; console.log('Calibración Elo (resultado más probable):'); cal.forEach(([a, b]) => { const q = out.filter(r => r.p).map(r => { const l = r.p.indexOf(Math.max(...r.p)); return { pm: r.p[l], ok: r.y === l ? 1 : 0 }; }).filter(z => z.pm >= a && z.pm < b); console.log(`  ${a * 100}-${b * 100}%: n=${q.length} dice ${(100 * prom(q.map(z => z.pm))).toFixed(1)}% pasó ${(100 * prom(q.map(z => z.ok))).toFixed(1)}%`); });
}
