'use strict';
// Uso: node scripts/medicion/fut_copas_fuerza.js partidos_copas.json [partidos_ligas.json]
// Solo mide. Compara el modelo básico de copas de la app contra:
//   - sembrar con la temporada pasada de esa copa (regla real de 10 partidos, y 6 como se probó antes)
//   - dcAjustar (motor real de futbol.html) con TODAS las copas europeas juntas, que cruza la fuerza entre ligas
//   - lo mismo sumando las 5 grandes ligas, si se pasa partidos_ligas.json
// Ajustes elegidos en 2020-21 a 2022-23 (sin mirar cuotas); la prueba es 2023-24 en adelante.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'futbol.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
const lin = n => { const m = html.match(new RegExp('var ' + n + '\\s*=\\s*\\{[^;]*\\};')); if (!m) throw new Error('no ' + n); return m[0] + '\n'; };
const src = 'var MAXG=8;var localStorage={getItem:function(){return null;}};\n' + cut('function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n"
  + cut('function mezclar(d, d0, w, claves)', '// Todas las probabilidades del modelo') + cut('function lambdas(', 'function probsModelo') + cut('function probsModelo(', '// ---------- historial')
  + 'function conSemilla(a, s, S, lp){ if(!s||!S) return a; return {pj:a.pj+S, gf:a.gf+S*s.att*lp, gc:a.gc+S*s.def*lp}; }\n' + lin('PARAMS_DEFECTO')
  + cut('function dcAjustar(lista, hoyDia, cfg)', 'function eloMix()')
  + 'function claveEq(n){return String(n);} function tsPartido(p){return p.ts;}\n';
const ctx = { Math, Object, console, isFinite, parseFloat, JSON }; vm.createContext(ctx); vm.runInContext(src, ctx);
const P0 = vm.runInContext('PARAMS_DEFECTO', ctx);
const X = JSON.parse(fs.readFileSync(process.argv[2])).filter(x => x.tipo === 'europa').sort((a, b) => a.d - b.d);
const temporada = d => { const f = new Date(d); return f.getUTCMonth() >= 6 ? f.getUTCFullYear() : f.getUTCFullYear() - 1; };
const res90 = x => /AET|PEN|EXTRA|SHOOT/i.test(x.est || '') ? 1 : (x.gh > x.ga ? 0 : x.gh === x.ga ? 1 : 2);
const devig = o => { const i = o.map(v => 1 / v), s = i.reduce((a, b) => a + b, 0); return i.map(v => v / s); };
const LOG = p => -Math.log(Math.max(p, 1e-9)), prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const est = a => { const m = prom(a), s = Math.sqrt(a.reduce((q, v) => q + (v - m) * (v - m), 0) / Math.max(a.length - 1, 1) / Math.max(a.length, 1)); return { m, s, z: m / (s || 1e-9), n: a.length }; };
X.forEach(x => { x.t = temporada(x.d); x.y = res90(x); const c = x.cu && x.cu.c; if (c && c.every(v => v > 1)) { x.mk = devig(c); x.o = c; } });
// ---- fórmula básica de la app, con o sin semilla de la temporada pasada de esa copa
function basico(minSem) {
  const out = new Map();
  for (const sl of ['uefa.champions', 'uefa.europa', 'uefa.europa.conf']) {
    const ms = X.filter(x => x.sl === sl), porT = {}; ms.forEach(x => (porT[x.t] = porT[x.t] || []).push(x));
    for (const t of Object.keys(porT).sort()) {
      const tab = {}, cero = () => ({ pj: 0, gf: 0, gc: 0 }); let sem = {};
      if (minSem && porT[t - 1]) { const m = {}; let g = 0, n = 0; porT[t - 1].forEach(p => { g += p.gh + p.ga; n++; [[p.h, p.gh, p.ga], [p.a, p.ga, p.gh]].forEach(z => { const e = m[z[0]] || (m[z[0]] = cero()); e.pj++; e.gf += z[1]; e.gc += z[2]; }); }); const l = Math.max(g / (2 * n), .5); Object.keys(m).forEach(k => { if (m[k].pj >= minSem) sem[k] = { att: m[k].gf / m[k].pj / l, def: m[k].gc / m[k].pj / l }; }); }
      for (const x of porT[t]) {
        const a = tab[x.h] || cero(), b = tab[x.a] || cero(); let gf = 0, pj = 0; Object.values(tab).forEach(e => { gf += e.gf; pj += e.pj; }); const lp = pj > 0 ? Math.max(gf / pj, .5) : 1.35;
        ctx.eL = ctx.conSemilla(a, sem[x.h], P0.S, lp); ctx.eV = ctx.conSemilla(b, sem[x.a], P0.S, lp); ctx.lp = lp;
        const d = vm.runInContext('probsModelo(eL,eV,lp,PARAMS_DEFECTO,false)', ctx);
        out.set(x.id, { p: [d.pL, d.pD, d.pV], minPj: Math.min(a.pj, b.pj), o25: d.o25, btts: d.btts });
        [[x.h, x.gh, x.ga], [x.a, x.ga, x.gh]].forEach(z => { const e = tab[z[0]] || (tab[z[0]] = cero()); e.pj++; e.gf += z[1]; e.gc += z[2]; });
      }
    }
  }
  return out;
}
// ---- Dixon-Coles real con todas las copas (y ligas, si vienen); se reajusta por día con partidos
const conv = x => ({ local: x.h, visita: x.a, golesLocal: x.gh, golesVisita: x.ga, ts: x.d });
function dcCopas(cfg, extra, tDesde) {
  const out = new Map(), hist = X.map(conv).concat(extra || []).sort((a, b) => a.ts - b.ts), obj = X.filter(x => x.t >= tDesde), dias = [...new Set(obj.map(x => Math.floor(x.d / 864e5)))];
  ctx.cfg = cfg;
  for (const dia of dias) {
    const antes = hist.filter(m => Math.floor(m.ts / 864e5) < dia && Math.floor(m.ts / 864e5) >= dia - cfg.win);
    ctx.lista = antes; ctx.hoy = dia; const f = vm.runInContext('dcAjustar(lista,hoy,cfg)', ctx); if (!f) continue;
    obj.filter(x => Math.floor(x.d / 864e5) === dia).forEach(x => {
      const pr = cfg.promo ? { att: .85, def: 1.15 } : { att: 1, def: 1 }, xl = f.eq[x.h] || pr, xv = f.eq[x.a] || pr, gam = x.neutral ? Math.sqrt(1) : f.gam;
      ctx.ll = f.c * xl.att * xv.def * gam; ctx.lv = f.c * xv.att * xl.def; ctx.rho = cfg.rho;
      const d = vm.runInContext('distribucion(ll,lv,rho,false)', ctx); ctx.ha = f.hAvg; ctx.aa = f.aAvg; const g0 = vm.runInContext('distribucion(ha,aa,rho,false)', ctx);
      out.set(x.id, { p: [d.pL, d.pD, d.pV], nL: (f.eq[x.h] || {}).n || 0, nV: (f.eq[x.a] || {}).n || 0, o25: d.o25, o25g: g0.o25, btts: d.btts, bttsg: g0.btts });
    });
  }
  return out;
}
const perdida = (M, f) => { const q = X.filter(x => f(x) && M.has(x.id)); return { v: prom(q.map(x => LOG(M.get(x.id).p[x.y]))), n: q.length }; };
function informe(nom, M, Base) {
  for (const [et, f] of [['Champions', x => x.sl === 'uefa.champions'], ['Todas', () => true]]) {
    const q = X.filter(x => x.t >= 2023 && x.mk && f(x) && M.has(x.id) && Base.has(x.id));
    const a = prom(q.map(x => LOG(M.get(x.id).p[x.y]))), mk = prom(q.map(x => LOG(x.mk[x.y]))), b = prom(q.map(x => LOG(Base.get(x.id).p[x.y])));
    const dB = est(q.map(x => LOG(M.get(x.id).p[x.y]) - LOG(Base.get(x.id).p[x.y]))), dM = est(q.map(x => LOG(M.get(x.id).p[x.y]) - LOG(x.mk[x.y])));
    const gap = q.map(x => Math.max(...M.get(x.id).p.map((v, i) => Math.abs(v - x.mk[i]) * 100))).sort((u, v) => u - v);
    const ap = q.map(x => { const dd = M.get(x.id).p.map((v, i) => (v - x.mk[i]) * 100), l = dd.indexOf(Math.max(...dd)); return { x, l, dl: dd[l] }; }).filter(z => z.dl >= 2), roi = est(ap.map(z => z.l === z.x.y ? z.x.o[z.l] - 1 : -1));
    const blq = q.filter(x => x.t === 2026); const b26 = blq.length ? prom(blq.map(x => LOG(M.get(x.id).p[x.y]))) : 0;
    console.log(`${nom} · ${et} n=${q.length}: modelo ${a.toFixed(4)} básico ${b.toFixed(4)} mercado ${mk.toFixed(4)} | contra básico ${(1000 * dB.m).toFixed(1)} mil. z ${dB.z.toFixed(1)} | contra mercado ${(1000 * dM.m).toFixed(1)} z ${dM.z.toFixed(1)} | dif mediana ${gap[gap.length >> 1].toFixed(1)} pts | ROI ≥2 pts ${(100 * roi.m).toFixed(1)}% ±${(200 * roi.s).toFixed(1)} (${roi.n}) | 2026-27 ${b26.toFixed(4)}`);
  }
}
function calib(nom, M) {
  const q = X.filter(x => x.t >= 2023 && M.has(x.id)), bins = [[0, .35], [.35, .45], [.45, .55], [.55, .65], [.65, .75], [.75, 1]];
  console.log('Calibración del favorito · ' + nom); bins.forEach(([a, b]) => { const z = q.map(x => { const p = M.get(x.id).p, m = Math.max(...p); return { m, ok: p.indexOf(m) === x.y }; }).filter(r => r.m >= a && r.m < b); if (z.length) console.log(`  ${(a * 100).toFixed(0)}-${(b * 100).toFixed(0)}%: n=${z.length} dice ${(100 * prom(z.map(r => r.m))).toFixed(1)} pasó ${(100 * prom(z.map(r => r.ok ? 1 : 0))).toFixed(1)}`); });
}
module.exports = { X, basico, dcCopas, perdida, informe, calib, conv, est, prom, LOG };
if (require.main === module) {
  const B = basico(0);
  console.log('Partidos de copa', X.length);
  informe('Semilla de copa, regla 10', basico(10), B); informe('Semilla de copa, regla 6', basico(6), B);
  const ents = f => X.filter(x => x.t >= 2020 && x.t <= 2022 && f(x));
  const LIG = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])) : null;
  const cand = []; for (const xi of [0.25, 0.5, 1, 1.6]) for (const Kp of [1, 2, 3, 5]) for (const win of [1100, 1800]) cand.push({ xi, Kp, rho: -0.06, promo: 1, wt: .5, win });
  let mejor = null;
  for (const c of cand) { const M = dcCopas(c, null, 2020), q = ents(x => M.has(x.id)), v = prom(q.map(x => LOG(M.get(x.id).p[x.y]))); console.log('ajuste', JSON.stringify(c), v.toFixed(4), q.length); if (!mejor || v < mejor.v) mejor = { v, c }; }
  console.log('Mejor ajuste en 2020-22:', JSON.stringify(mejor));
  const MC = dcCopas(mejor.c, null, 2020); informe('DC todas las copas', MC, B); calib('DC copas', MC); calib('Básico', B);
  // por competición y por temporada
  for (const [nom, sl] of [['Champions', 'uefa.champions'], ['Europa', 'uefa.europa'], ['Conference', 'uefa.europa.conf']]) for (const t of [2023, 2024, 2025, 2026, 'todas']) {
    const q = X.filter(x => x.sl === sl && x.mk && x.t >= 2023 && (t === 'todas' || x.t === t) && MC.has(x.id) && B.has(x.id)); if (!q.length) continue; const dB = est(q.map(x => LOG(MC.get(x.id).p[x.y]) - LOG(B.get(x.id).p[x.y])));
    console.log(`${nom} ${t} n=${q.length}: DC ${prom(q.map(x => LOG(MC.get(x.id).p[x.y]))).toFixed(4)} básico ${prom(q.map(x => LOG(B.get(x.id).p[x.y]))).toFixed(4)} mercado ${prom(q.map(x => LOG(x.mk[x.y]))).toFixed(4)} | contra básico ${(1000 * dB.m).toFixed(1)} z ${dB.z.toFixed(1)}`);
  }
  // pocos partidos en la ventana: dónde se equivoca más
  for (const [a, b] of [[0, 8], [8, 20], [20, 999]]) { const q = X.filter(x => x.t >= 2023 && x.mk && MC.has(x.id) && Math.min(MC.get(x.id).nL, MC.get(x.id).nV) >= a && Math.min(MC.get(x.id).nL, MC.get(x.id).nV) < b); console.log(`equipo con menos partidos ${a}-${b}: n=${q.length} DC ${prom(q.map(x => LOG(MC.get(x.id).p[x.y]))).toFixed(4)} mercado ${prom(q.map(x => LOG(x.mk[x.y]))).toFixed(4)}`); }
  // goles: elegir el peso wt en 2020-22, probar en 2023+; la línea 2.5 con cuota, y Ambos anotan contra frecuencia
  const lb = (p, v) => LOG(v ? p : 1 - p), cl = p => Math.min(Math.max(p, 1e-6), 1 - 1e-6), over = x => x.gh + x.ga > 2.5 ? 1 : 0, ba = x => x.gh > 0 && x.ga > 0 ? 1 : 0;
  const tr = X.filter(x => x.t >= 2020 && x.t <= 2022 && MC.has(x.id)), te = X.filter(x => x.t >= 2023 && MC.has(x.id) && B.has(x.id));
  const fm = (q, kd, kg, w, y) => prom(q.map(x => { const r = MC.get(x.id); return lb(cl(w * r[kd] + (1 - w) * r[kg]), y(x)); }));
  for (const w of [0, .1, .25, .4, .5, .75, 1]) console.log(`goles wt=${w}: Más/Menos 2.5 ajuste ${fm(tr, 'o25', 'o25g', w, over).toFixed(4)} prueba ${fm(te, 'o25', 'o25g', w, over).toFixed(4)} | Ambos anotan ajuste ${fm(tr, 'btts', 'bttsg', w, ba).toFixed(4)} prueba ${fm(te, 'btts', 'bttsg', w, ba).toFixed(4)}`);
  console.log(`básico: Más/Menos prueba ${prom(te.map(x => lb(cl(B.get(x.id).o25), over(x)))).toFixed(4)} Ambos anotan prueba ${prom(te.map(x => lb(cl(B.get(x.id).btts), ba(x)))).toFixed(4)}`);
  const conOu = te.filter(x => x.cu && x.cu.ou === 2.5 && x.cu.over > 1 && x.cu.under > 1); console.log(`línea 2.5 con cuota n=${conOu.length}: mercado ${prom(conOu.map(x => { const a = 1 / x.cu.over, b = 1 / x.cu.under; return lb(a / (a + b), over(x)); })).toFixed(4)} básico ${prom(conOu.map(x => lb(cl(B.get(x.id).o25), over(x)))).toFixed(4)} DC wt 0.25 ${fm(conOu, 'o25', 'o25g', .25, over).toFixed(4)}`);
  fs.writeFileSync('resultado_copas_fuerza.json', JSON.stringify(mejor));
}
