'use strict';
/* ===================================================================
   OVA · PRUEBA HACIA ADELANTE DE TOTALES EN NHL Y NFL (corre en GitHub Actions; no gasta llamadas de OddsPapi)
   NFL (mismas condiciones, fijadas el 3-nov-2026; sin modelo y sin mínimo de juegos): A Más con techo cerrado, B Menos al aire libre, C control Más siempre.
   NHL:
   Reglas fijadas el 3-nov-2026, antes de ver ningún juego de la prueba. NO se cambian: si se quiere otra regla, es otra prueba.
     A (la que se prueba)  Menos si el modelo espera 0.5 goles o más por debajo de la línea
     B                     Menos si el modelo espera 0.25 goles o más por debajo de la línea
     C (control)           Menos siempre en total de 6 o más
     D (control)           Más siempre en total de 6.5 (lo medido dice que pierde)
   Cuenta solo juegos de temporada regular que empiezan desde INICIO, con 10 o más juegos de cada equipo.
   Modelo: PDEF de modelo-nhl.js, con lo que se sabía antes de cada juego. Precio: línea de ESPN (DraftKings) guardada antes del juego.
   Veredicto de la regla A, fijado antes: con 200+ apuestas, confirmada si ROI > 0 y z >= 2; descartada si ROI <= -10% o z <= -2.
   =================================================================== */
const fs = require('fs'), path = require('path');
const INICIO = Date.parse('2026-11-03T00:00:00Z'), MIN_J = 10, MIN_N = 200;
const REGLAS = {
  A: { nombre: 'Menos si el modelo espera 0.5+ goles menos', lado: 'U', pasa: (pt, l) => pt <= l - 0.5 },
  B: { nombre: 'Menos si el modelo espera 0.25+ goles menos', lado: 'U', pasa: (pt, l) => pt <= l - 0.25 },
  C: { nombre: 'Control: Menos siempre en total de 6 o más', lado: 'U', pasa: (pt, l) => l >= 6 },
  D: { nombre: 'Control: Más siempre en total de 6.5', lado: 'O', pasa: (pt, l) => l === 6.5 }
};
const REGLAS_NFL = {
  A: { nombre: 'Más con techo cerrado', lado: 'O', pasa: (pt, l, g) => !!g.indoor },
  B: { nombre: 'Menos al aire libre', lado: 'U', pasa: (pt, l, g) => !g.indoor },
  C: { nombre: 'Control: Más siempre', lado: 'O', pasa: () => true }
};
const num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−–—]/g, '-').replace(/[^0-9.+-]/g, '')); return isFinite(n) ? n : null; };
const am = v => { const n = num(v); return (n !== null && Math.abs(n) >= 100) ? n : null; };
/* línea de total y sus precios desde lo que guarda el robot de cuotas (odds-nhl.json) */
function lineaDe(o) {
  const t = o && o.total; if (!t) return null;
  const b = x => x && (x.close || x.current || x.open), ov = b(t.over), un = b(t.under);
  const l = num(String((ov && ov.line) || (un && un.line) || '').replace(/[ouOU]/g, '')), po = am(ov && ov.odds), pu = am(un && un.odds);
  return (l !== null && l > 0 && po !== null && pu !== null) ? { l: l, o: po, u: pu } : null;
}
/* v = 1 gana, -1 pierde, 0 devuelve. Las casas cuentan el shootout como 1 gol más, y el marcador de ESPN ya lo trae. */
function resultado(lado, total, l) { const d = total - l; if (Math.abs(d) < 1e-9) return 0; return (lado === 'O' ? d > 0 : d < 0) ? 1 : -1; }
function pago(cuota, v) { if (v === 0) return 0; if (v < 0) return -1; return cuota > 0 ? cuota / 100 : 100 / -cuota; }
function resumen(lista) {
  const n = lista.length; let g = 0, p = 0, e = 0, s = 0, q = 0;
  lista.forEach(x => { if (x.v > 0) g++; else if (x.v < 0) p++; else e++; s += x.u; q += x.u * x.u; });
  const m = n ? s / n : 0, se = n > 1 ? Math.sqrt(Math.max(q / n - m * m, 0) * n / (n - 1) / n) : 0;
  return { n: n, g: g, p: p, e: e, u: +s.toFixed(2), roi: +(m * 100).toFixed(1), err: +(2 * se * 100).toFixed(1), z: se > 0 ? +(m / se).toFixed(2) : 0 };
}
function veredicto(r) {
  if (r.n < MIN_N) return { c: 'espera', t: 'Faltan ' + (MIN_N - r.n) + ' apuestas para decidir' };
  if (r.roi > 0 && r.z >= 2) return { c: 'confirmada', t: 'Confirmada: gana con juegos nuevos' };
  if (r.roi <= -10 || r.z <= -2) return { c: 'descartada', t: 'Descartada: no aguantó con juegos nuevos' };
  return { c: 'dudosa', t: 'Sin decidir: todavía no se distingue de cero' };
}
/* corre el modelo por todos los juegos en orden; por cada juego con línea, anota sus apuestas */
function filaDe(g, pt, li, reglas) {
  const f = { id: g.id, ts: g.ts, l: li.l, pt: pt == null ? null : +pt.toFixed(3), total: g.hs + g.as, r: {} };
  Object.keys(reglas).forEach(k => {
    const R = reglas[k]; if (!R.pasa(pt, li.l, g)) return;
    const c = R.lado === 'O' ? li.o : li.u, v = resultado(R.lado, f.total, li.l);
    f.r[k] = { c: c, v: v, u: +pago(c, v).toFixed(4) };
  });
  return f;
}
function evaluarNfl(juegos, lineas, desde) {
  return juegos.filter(g => lineas[g.id] && g.ts >= desde && g.ty === 2).map(g => filaDe(g, null, lineas[g.id], REGLAS_NFL));
}
function evaluar(M, juegos, lineas, desde) {
  const P = Object.assign({}, M.PDEF), filas = [];
  M.correr(juegos, P, function (g, x) {
    const li = lineas[g.id];
    if (!li || g.ts < desde || g.ty !== 2 || x.cH < MIN_J || x.cA < MIN_J) return;
    filas.push(filaDe(g, x.pt, li, REGLAS));
  });
  return filas;
}
function informe(filas, reglas) {
  reglas = reglas || REGLAS;
  const o = {}; Object.keys(reglas).forEach(k => { const l = filas.filter(f => f.r[k]).map(f => f.r[k]); o[k] = Object.assign({ nombre: reglas[k].nombre }, resumen(l)); });
  o.A.veredicto = veredicto(o.A);
  return o;
}
const unpack = r => ({ id: String(r[0]), ts: r[1], h: String(r[2]), a: String(r[3]), hs: r[4], as: r[5], ty: r[6], so: !!(r[7] & 1), ot: !!(r[7] & 2), neutral: !!(r[7] & 4), indoor: !!(r[7] & 8), sh: r[9] == null ? null : r[9], sa: r[10] == null ? null : r[10] });
module.exports = { REGLAS, REGLAS_NFL, INICIO, lineaDe, resultado, pago, resumen, veredicto, evaluar, evaluarNfl, informe, unpack };
if (require.main !== module) return;

/* uso: node scripts/adelante.js [carpeta con adelante-<dep>.json y odds-<dep>.json] */
const dir = process.argv[2] || 'salida-adelante', raiz = path.join(__dirname, '..');
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
fs.mkdirSync(dir, { recursive: true });
['nhl', 'nfl'].forEach(dep => {
const previo = leer(path.join(dir, 'adelante-' + dep + '.json'), { lineas: {} }), lineas = previo.lineas || {};
const snap = leer(path.join(dir, 'odds-' + dep + '.json'), { juegos: {} });
let nuevas = 0;
Object.keys(snap.juegos || {}).forEach(id => { const v = snap.juegos[id], t = Date.parse(v.t), li = lineaDe(v.o); if (li && t >= INICIO) { lineas[id] = Object.assign({ t: t }, li); nuevas++; } });
const hist = JSON.parse(fs.readFileSync(path.join(raiz, 'hist-' + dep + '.json'), 'utf8'));
const juegos = hist.g.map(unpack).sort((a, b) => a.ts - b.ts);
const filas = dep === 'nhl' ? evaluar(require('../modelo-nhl.js'), juegos, lineas, INICIO) : evaluarNfl(juegos, lineas, INICIO);
const salida = { v: 1, dep: dep, inicio: new Date(INICIO).toISOString(), generado: new Date().toISOString(), archivo: hist.generado, reglas: informe(filas, dep === 'nhl' ? REGLAS : REGLAS_NFL), lineas: lineas, juegos: filas };
fs.writeFileSync(path.join(dir, 'adelante-' + dep + '.json'), JSON.stringify(salida));
console.log(dep + ' · líneas guardadas: ' + Object.keys(lineas).length + ' (' + nuevas + ' vistas ahora) · juegos terminados en la prueba: ' + filas.length);
console.log(JSON.stringify(salida.reglas));
});
