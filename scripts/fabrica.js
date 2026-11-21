'use strict';
/* ===================================================================
   OVA · FÁBRICA DE IDEAS + RECALIBRACIÓN (GitHub Actions, los domingos: .github/workflows/fabrica.yml)

   Prueba sola cientos de versiones de las constantes de cada modelo de OVA (NBA, NHL, NFL y el Dixon-Coles del fútbol) contra
   TODAS las temporadas del archivo, juego por juego y sin mirar el futuro (cada pronóstico usa solo lo de antes).
   Regla, fijada el 21-nov-2026 antes de correrla:
     · una versión pasa solo si baja la pérdida logarítmica en CADA temporada completa del archivo, y
     · en el total le gana a la de hoy con z ≥ máx(2, √(2·ln N)), donde N es cuántas versiones se probaron
       (si se prueban 200, se exige z ≥ 3.3: así no pasa una por pura suerte).
   La mejor que pase entra a la liga como suplente «Modelo OVA afinado»; la liga en vivo decide si sube.
   No toca la app ni las fórmulas de la app. Salida: fabrica.json en la rama «liga».
   Uso: node scripts/fabrica.js <carpeta con la rama liga>
   =================================================================== */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const L = require('./liga.js');

const unpack = r => ({ id: String(r[0]), ts: r[1], h: String(r[2]), a: String(r[3]), hs: r[4], as: r[5], ty: r[6], so: !!(r[7] & 1), ot: !!(r[7] & 2), neutral: !!(r[7] & 4), indoor: !!(r[7] & 8), sh: r[9] == null ? null : r[9], sa: r[10] == null ? null : r[10] });
const clamp = p => Math.min(Math.max(p, 1e-4), 1 - 1e-4);
function producto(grilla) {
  let out = [{}];
  Object.keys(grilla).forEach(k => { const n = []; out.forEach(o => grilla[k].forEach(v => n.push(Object.assign({}, o, { [k]: v })))); out = n; });
  return out;
}

/* pronósticos juego por juego (antes de cada juego) de un modelo de equipo con unos parámetros */
function cargarNBA() {
  const nb = fs.readFileSync(path.join(RAIZ, 'nba.html'), 'utf8'), i0 = nb.indexOf('<script id="modelo">') + 20, N = {};
  new Function('N', 'module', nb.slice(i0, nb.indexOf('</script>', i0)) + ';Object.assign(N,{PDEF,seasonOf,dayKey,correr,predecir});')(N, undefined);
  return N;
}
function serie(M, juegos, P, dep) {
  const out = [];
  M.correr(juegos, P, (g, x) => {
    const S = x.S, rest = dep === 'nfl' ? { gH: x.gH, gA: x.gA } : { dH: S.last ? S.last[g.h] : undefined, dA: S.last ? S.last[g.a] : undefined };
    const p = M.predecir(S, P, { h: g.h, a: g.a, ts: g.ts, neutral: g.neutral }, rest).pH;
    if (g.hs !== g.as) out.push({ temp: M.seasonOf(g.ts), p: clamp(p), y: g.hs > g.as ? 1 : 0 });
  });
  return out;
}
const perdidaBin = f => -Math.log(f.y ? f.p : 1 - f.p);

/* compara una serie contra la base, juego por juego */
function comparar(base, cand, perd, minTemp, salto) {
  const porT = {}, dif = [];
  for (let i = salto; i < base.length; i++) {
    const d = perd(cand[i]) - perd(base[i]); dif.push(d);
    const t = porT[base[i].temp] || (porT[base[i].temp] = { n: 0, d: 0, a0: 0, a1: 0 });
    t.n++; t.d += d;
    const ac = f => (f.p3 ? f.p3.indexOf(Math.max(...f.p3)) === f.y : ((f.p > 0.5) === (f.y === 1)));
    if (ac(base[i])) t.a0++; if (ac(cand[i])) t.a1++;
  }
  const n = dif.length, m = dif.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(dif.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)), z = -m / (sd / Math.sqrt(n));
  const temps = Object.keys(porT).filter(t => porT[t].n >= minTemp).map(t => ({ temp: +t, juegos: porT[t].n, mejora: +(-1000 * porT[t].d / porT[t].n).toFixed(2),
    aciertosHoy: +(100 * porT[t].a0 / porT[t].n).toFixed(2), aciertosNueva: +(100 * porT[t].a1 / porT[t].n).toFixed(2) }));
  return { z: +z.toFixed(2), mejoraMilesimas: +(-1000 * m).toFixed(2), enTodas: temps.length > 0 && temps.every(t => t.mejora > 0), temporadas: temps };
}

function fabricaEquipo(dep, M, juegos, grilla, minTemp) {
  const P0 = Object.assign({}, M.PDEF), base = serie(M, juegos, P0, dep), salto = Math.floor(base.length * 0.15);
  const cands = producto(grilla).map(c => Object.assign({}, P0, c)).filter(c => Object.keys(grilla).some(k => c[k] !== P0[k]));
  const zCrit = Math.max(2, Math.sqrt(2 * Math.log(cands.length))), res = [];
  cands.forEach(P => {
    const s = serie(M, juegos, P, dep); if (s.length !== base.length) return;
    const c = comparar(base, s, perdidaBin, minTemp, salto);
    res.push(Object.assign({ cambios: Object.fromEntries(Object.keys(grilla).filter(k => P[k] !== P0[k]).map(k => [k, P[k]])) }, c));
  });
  res.sort((a, b) => b.z - a.z);
  const pasan = res.filter(r => r.enTodas && r.z >= zCrit);
  return { probadas: res.length, zExigido: +zCrit.toFixed(2), pasaron: pasan.length, mejor: pasan[0] || null, top5: res.slice(0, 5) };
}

/* fútbol: el Dixon-Coles de futbol.html, re-ajustado cada día de partidos con lo de antes */
function serieFutbol(F, arch, cfg) {
  const out = [];
  ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'].forEach(l => {
    const A = arch.rutas['soccer/' + l]; if (!A) return;
    const rows = Object.values(A.g).sort((a, b) => a[1] - b[1]); if (rows.length < 300) return;
    const lista = rows.map(r => ({ local: r[4], visita: r[5], golesLocal: r[6], golesVisita: r[7], ts: r[1] }));
    const D = 864e5, d0 = Math.floor(rows[0][1] / D) + 120;
    const dias = [...new Set(rows.map(r => Math.floor(r[1] / D)))].filter(d => d >= d0);
    dias.forEach(dia => {
      const fit = F.dcAjustar(lista, dia - 1, cfg); if (!fit) return;
      rows.filter(r => Math.floor(r[1] / D) === dia).forEach(r => {
        const pr = cfg.promo ? { att: 0.85, def: 1.15 } : { att: 1, def: 1 };
        const xl = F.buscarEnMapa(fit.eq, r[4]) || pr, xv = F.buscarEnMapa(fit.eq, r[5]) || pr;
        const d = F.distribucion(fit.c * xl.att * xv.def * fit.gam, fit.c * xv.att * xl.def, cfg.rho, false), t = new Date(r[1]);
        out.push({ id: r[0], temp: t.getUTCFullYear() - (t.getUTCMonth() < 6 ? 1 : 0), p3: [d.pL, d.pV, d.pD], y: r[6] > r[7] ? 0 : (r[6] < r[7] ? 1 : 2) });
      });
    });
  });
  return out;
}
function fabricaFutbol(arch) {
  const F = L.motorFutbol(), C0 = Object.assign({}, F.DC_CFG), base = serieFutbol(F, arch, C0);
  if (base.length < 1000) return { probadas: 0, nota: 'archivo de fútbol incompleto' };
  const grilla = { xi: [0.5, 1, 1.5, 2], Kp: [3, 5, 8], rho: [-0.1, -0.06, -0.02] };
  const cands = producto(grilla).map(c => Object.assign({}, C0, c)).filter(c => Object.keys(grilla).some(k => c[k] !== C0[k]));
  const zCrit = Math.max(2, Math.sqrt(2 * Math.log(cands.length))), res = [], perd = f => -Math.log(Math.max(1e-9, f.p3[f.y]));
  cands.forEach(cfg => {
    const s = serieFutbol(F, arch, cfg); if (s.length !== base.length) return;
    const c = comparar(base, s, perd, 300, 0);
    res.push(Object.assign({ cambios: Object.fromEntries(Object.keys(grilla).filter(k => cfg[k] !== C0[k]).map(k => [k, cfg[k]])) }, c));
  });
  res.sort((a, b) => b.z - a.z);
  const pasan = res.filter(r => r.enTodas && r.z >= zCrit);
  return { probadas: res.length, zExigido: +zCrit.toFixed(2), pasaron: pasan.length, mejor: pasan[0] || null, top5: res.slice(0, 5) };
}

module.exports = { producto, comparar, fabricaEquipo, fabricaFutbol, serie };
if (require.main !== module) return;

const dir = process.argv[2] || 'salida-liga', t0 = Date.now(), salida = { v: 1, generado: new Date().toISOString(), regla: 'pasa si mejora en cada temporada completa y z ≥ máx(2, √(2·ln N))', deportes: {} };
const leer = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const arch = leer(path.join(dir, 'liga-hist.json')) || { rutas: {} };
try {
  const N = cargarNBA(), A = arch.rutas['basketball/nba'];
  const NBA_OK = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1 };
  const jn = A ? Object.values(A.g).filter(r => NBA_OK[r[2]] && NBA_OK[r[3]]).map(r => ({ id: r[0], ts: r[1], h: r[2], a: r[3], hs: r[6], as: r[7] })).sort((a, b) => a.ts - b.ts) : [];
  if (jn.length > 1000) salida.deportes.nba = fabricaEquipo('nba', N, jn, { kM: [0.04, 0.05, 0.06, 0.07, 0.08], carry: [0.5, 0.65, 0.8], H: [2, 2.4, 2.8], Z: [0.8, 0.9, 1] }, 300);
} catch (e) { salida.deportes.nba = { error: e.message }; }
['nhl', 'nfl'].forEach(dep => {
  try {
    const M = require('../modelo-' + dep + '.js'), h = JSON.parse(fs.readFileSync(path.join(RAIZ, 'hist-' + dep + '.json'), 'utf8'));
    const juegos = h.g.map(unpack).filter(g => g.hs != null && g.as != null).sort((a, b) => a.ts - b.ts);
    const grilla = dep === 'nhl' ? { kM: [0.006, 0.008, 0.01, 0.012], carry: [0.6, 0.7, 0.8], H: [0.15, 0.2, 0.25], Ws: [0.05, 0.1, 0.15] }
      : { kM: [0.06, 0.08, 0.1], carry: [0.5, 0.6, 0.7], H: [1.5, 2, 2.5], Z: [0.8, 0.9, 1] };
    salida.deportes[dep] = fabricaEquipo(dep, M, juegos, grilla, dep === 'nhl' ? 600 : 150);
  } catch (e) { salida.deportes[dep] = { error: e.message }; }
});
try { salida.deportes.futbol = fabricaFutbol(arch); } catch (e) { salida.deportes.futbol = { error: e.message }; }
salida.segundos = Math.round((Date.now() - t0) / 1000);
fs.writeFileSync(path.join(dir, 'fabrica.json'), JSON.stringify(salida));
Object.keys(salida.deportes).forEach(d => { const x = salida.deportes[d]; console.log(d + ': probadas ' + x.probadas + ' · pasaron ' + x.pasaron + ' · z exigido ' + x.zExigido + (x.mejor ? ' · mejor ' + JSON.stringify(x.mejor.cambios) + ' z ' + x.mejor.z : '') + (x.error ? ' · ERROR ' + x.error : '')); });
console.log('segundos: ' + salida.segundos);
