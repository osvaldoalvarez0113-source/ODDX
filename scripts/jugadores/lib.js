'use strict';
// Piezas comunes de las pruebas de jugadores (MLB, NBA, fútbol): bajar datos, estadística y formato.
const dormir = ms => new Promise(r => setTimeout(r, ms));
const errores = [];
async function pedir(url, opts) {
  opts = opts || {};
  for (let i = 0; i < 5; i++) {
    let r;
    try { r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (ova-experimento-jugadores)' } }); }
    catch (e) { if (i === 4) throw e; await dormir(800 * (i + 1)); continue; }
    if (r.status === 429 || r.status === 503 || r.status === 502) { await dormir(1200 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 120));
    return opts.texto ? r.text() : r.json();
  }
  throw new Error('429/503 repetido ' + url.slice(0, 100));
}
async function pool(tareas, n, cb) {
  const out = new Array(tareas.length); let i = 0, h = 0;
  async function w() {
    while (i < tareas.length) {
      const k = i++;
      try { out[k] = await tareas[k](); } catch (e) { if (errores.length < 400) errores.push(String(e.message).slice(0, 140)); out[k] = null; }
      h++; if (cb) cb(h, tareas.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, w));
  return out;
}
const sig = z => 1 / (1 + Math.exp(-z));
const logit = p => { p = Math.min(Math.max(p, 1e-6), 1 - 1e-6); return Math.log(p / (1 - p)); };
const ll = (p, y) => { p = Math.min(Math.max(p, 1e-6), 1 - 1e-6); return -(y ? Math.log(p) : Math.log(1 - p)); };
const ms = v => { const n = v.length; if (!n) return { n: 0, m: 0, se: 0, z: 0 }; const m = v.reduce((a, b) => a + b, 0) / n; let q = 0; v.forEach(x => q += (x - m) * (x - m)); const se = n > 1 ? Math.sqrt(q / (n - 1) / n) : 0; return { n, m, se, z: se ? m / se : 0 }; };
function invertir(A) {                       // Gauss-Jordan; devuelve null si es singular
  const k = A.length, M = A.map((r, i) => r.concat(Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))));
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; for (let j = 0; j < 2 * k; j++) M[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map(r => r.slice(k));
}
function ols(X, y) {
  const n = X.length, k = X[0].length, A = Array.from({ length: k }, () => new Array(k).fill(0)), xty = new Array(k).fill(0);
  for (let r = 0; r < n; r++) for (let i = 0; i < k; i++) { xty[i] += X[r][i] * y[r]; for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j]; }
  const inv = invertir(A); if (!inv) return null;
  const b = inv.map(r => r.reduce((a, v, j) => a + v * xty[j], 0));
  let sse = 0; for (let r = 0; r < n; r++) { let p = 0; for (let i = 0; i < k; i++) p += b[i] * X[r][i]; sse += (y[r] - p) ** 2; }
  const s2 = sse / Math.max(n - k, 1);
  return { b, se: inv.map((r, i) => Math.sqrt(Math.max(s2 * r[i], 0))), n };
}
// Regresión logística con "offset" (el mercado entra fijo, coeficiente 1): logit p = off + X·b
function logistica(X, y, off) {
  const n = X.length, k = X[0].length; let b = new Array(k).fill(0), H = null;
  for (let it = 0; it < 60; it++) {
    const g = new Array(k).fill(0); H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let r = 0; r < n; r++) {
      let z = off[r]; for (let i = 0; i < k; i++) z += b[i] * X[r][i];
      const p = sig(z), w = p * (1 - p);
      for (let i = 0; i < k; i++) { g[i] += (y[r] - p) * X[r][i]; for (let j = 0; j < k; j++) H[i][j] += w * X[r][i] * X[r][j]; }
    }
    for (let i = 0; i < k; i++) H[i][i] += 1e-9;
    const inv = invertir(H); if (!inv) return null;
    let mx = 0; const d = inv.map(r => r.reduce((a, v, j) => a + v * g[j], 0));
    for (let i = 0; i < k; i++) { b[i] += d[i]; mx = Math.max(mx, Math.abs(d[i])); }
    if (mx < 1e-9) break;
  }
  const inv = invertir(H);
  return { b, se: inv ? inv.map((r, i) => Math.sqrt(Math.max(r[i], 0))) : b.map(() => NaN), n };
}
const f = (x, d) => (x == null || !isFinite(x)) ? '—' : x.toFixed(d === undefined ? 2 : d);
const tabla = (cab, filas) => '| ' + cab.join(' | ') + ' |\n|' + cab.map(() => '---').join('|') + '|\n' + filas.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n';
const pad2 = n => (n < 10 ? '0' : '') + n;
const ymd = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
const num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return isFinite(n) ? n : null; };
module.exports = { dormir, errores, pedir, pool, sig, logit, ll, ms, invertir, ols, logistica, f, tabla, pad2, ymd, num };
