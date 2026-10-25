'use strict';
// Utilidades estadisticas y de descarga compartidas por las mediciones de NHL y NFL (mismo estilo que correr_deportes.js)
const L = {};
L.sig = z => 1 / (1 + Math.exp(-z));
L.logit = p => Math.log(p / (1 - p));
L.clip = (p, a, b) => Math.min(b === undefined ? 1 - 1e-6 : b, Math.max(a === undefined ? 1e-6 : a, p));
L.Phi = function (x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 0.5 * (1 + s * (1 - poly * Math.exp(-x * x)));
};
// media, error estandar y z de una lista
L.ms = function (v) {
  const n = v.length; if (!n) return { n: 0, m: 0, se: 0, z: 0 };
  let s = 0; for (let i = 0; i < n; i++) s += v[i];
  const m = s / n; let q = 0; for (let i = 0; i < n; i++) q += (v[i] - m) * (v[i] - m);
  const se = n > 1 ? Math.sqrt(q / (n - 1) / n) : 0;
  return { n, m, se, z: se > 0 ? m / se : 0 };
};
// minimos cuadrados con k columnas
L.ols = function (X, y) {
  const n = X.length; if (!n) return null; const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(2 * k).fill(0));
  const xty = new Array(k).fill(0);
  for (let r = 0; r < n; r++) for (let i = 0; i < k; i++) { xty[i] += X[r][i] * y[r]; for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j]; }
  for (let i = 0; i < k; i++) A[i][k + i] = 1;
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * k; j++) A[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A[r][j] -= f * A[c][j]; }
  }
  const inv = A.map(r => r.slice(k));
  const b = inv.map(r => r.reduce((a, v, j) => a + v * xty[j], 0));
  let sse = 0; for (let r = 0; r < n; r++) { let p = 0; for (let i = 0; i < k; i++) p += b[i] * X[r][i]; sse += (y[r] - p) * (y[r] - p); }
  const s2 = sse / Math.max(n - k, 1);
  return { b, se: inv.map((r, i) => Math.sqrt(Math.max(s2 * r[i], 0))), n, rmse: Math.sqrt(sse / n) };
};
L.f = (x, d) => (x === null || x === undefined || !isFinite(x)) ? '—' : x.toFixed(d === undefined ? 3 : d);
L.pc = (x, d) => (x === null || x === undefined || !isFinite(x)) ? '—' : (x * 100).toFixed(d === undefined ? 1 : d) + '%';
L.tabla = function (cab, filas) {
  return '| ' + cab.join(' | ') + ' |\n|' + cab.map(() => '---').join('|') + '|\n' + filas.map(f => '| ' + f.join(' | ') + ' |').join('\n') + '\n';
};
L.dormir = ms => new Promise(r => setTimeout(r, ms));
L.pool = async function (tareas, n, cb) {
  const out = new Array(tareas.length); let i = 0, hechas = 0;
  async function w() { while (i < tareas.length) { const k = i++; try { out[k] = await tareas[k](); } catch (e) { out[k] = null; } hechas++; if (cb) cb(hechas, tareas.length); } }
  await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, w));
  return out;
};
L.getFetch = () => globalThis.__fetch || globalThis.fetch;
L.pedir = async function (url) {
  const F = L.getFetch();
  for (let i = 0; i < 5; i++) {
    let r;
    try { r = await F(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (ova-backtest)' } }); }
    catch (e) { if (i === 4) throw e; await L.dormir(800 * (i + 1)); continue; }
    if (r.status === 429 || r.status === 503) { await L.dormir(1200 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 120));
    return r.json();
  }
  throw new Error('HTTP 429/503 repetido ' + url.slice(0, 100));
};
// veredicto sobre una diferencia de perdida (modelo menos mercado; positivo = el modelo es peor)
L.veredicto = function (q) {
  if (q.n < 30) return 'muestra muy chica';
  if (q.z > 2) return 'MERCADO MEJOR (z=' + q.z.toFixed(1) + ')';
  if (q.z < -2) return 'MODELO MEJOR (z=' + (-q.z).toFixed(1) + ')';
  return 'no se distingue (z=' + q.z.toFixed(1) + ')';
};
// cuotas
L.num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return isFinite(n) ? n : null; };
L.americano = v => { const n = L.num(v); return (n !== null && Math.abs(n) >= 100) ? n : null; };
L.impAm = a => a < 0 ? (-a) / ((-a) + 100) : 100 / (a + 100);
L.decAm = a => a < 0 ? 1 + 100 / (-a) : 1 + a / 100;
// quitar el margen a dos precios americanos -> [p1,p2]
L.sinMargen = (a1, a2) => { const i1 = L.impAm(a1), i2 = L.impAm(a2), s = i1 + i2; return [i1 / s, i2 / s]; };
// ganancia de 1 unidad apostada a cuota americana a, segun resultado v (1 gana, -1 pierde, 0 push)
L.pago = (a, v) => v > 0 ? L.decAm(a) - 1 : (v < 0 ? -1 : 0);
module.exports = L;
