'use strict';
// OVA: backtest de NBA y futbol contra el mercado (todo en un solo archivo).
// Uso:  node correr_deportes.js nba | futbol | ambos
const require_real = require;
const fs = require('fs');
const L = (function () {
const module = { exports: {} };
// Utilidades estadisticas compartidas por correr_nba.js y correr_futbol.js
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
// media y error estandar de una lista
L.ms = function (v) {
  const n = v.length; if (!n) return { n: 0, m: 0, se: 0, z: 0 };
  let s = 0; for (let i = 0; i < n; i++) s += v[i];
  const m = s / n; let q = 0; for (let i = 0; i < n; i++) q += (v[i] - m) * (v[i] - m);
  const se = n > 1 ? Math.sqrt(q / (n - 1) / n) : 0;
  return { n, m, se, z: se > 0 ? m / se : 0 };
};
// minimos cuadrados con k columnas (X ya incluye la constante si se quiere). Devuelve b y se.
L.ols = function (X, y) {
  const n = X.length, k = X[0].length;
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
L.pedir = async function (url, tipo) {
  const F = L.getFetch();
  for (let i = 0; i < 5; i++) {
    let r;
    try { r = await F(url, { headers: { 'accept': tipo === 'text' ? 'text/csv,*/*' : 'application/json', 'user-agent': 'Mozilla/5.0 (ova-backtest)' } }); }
    catch (e) { if (i === 4) throw e; await L.dormir(800 * (i + 1)); continue; }
    if (r.status === 429 || r.status === 503) { await L.dormir(1200 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 120));
    return tipo === 'text' ? r.text() : r.json();
  }
  throw new Error('HTTP 429/503 repetido ' + url.slice(0, 100));
};
// veredicto sobre una diferencia (modelo menos mercado en perdida; positivo = el modelo es peor)
L.veredicto = function (q) {
  if (q.n < 30) return 'muestra muy chica';
  if (q.z > 2) return 'MERCADO MEJOR (z=' + q.z.toFixed(1) + ')';
  if (q.z < -2) return 'MODELO MEJOR (z=' + (-q.z).toFixed(1) + ')';
  return 'no se distingue (z=' + q.z.toFixed(1) + ')';
};
module.exports = L;

return module.exports;
})();
const NBA = (function () {
const module = { exports: {} };
const require = n => require_real(n);
// Backtest del NBA de OVA contra el mercado (lineas de cierre de ESPN) + prueba de mejoras.
// Uso: node correr_nba.js            (evalua 2024 y 2025 = temporadas 2024-25 y 2025-26)
//      node correr_nba.js 2023,2024,2025
const fs = require('fs');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const CORE = id => 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/' + id + '/competitions/' + id + '/odds';
const pad2 = n => (n < 10 ? '0' : '') + n;
const ymdU = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
const num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return isFinite(n) ? n : null; };
const americano = v => { const n = num(v); return (n !== null && Math.abs(n) >= 100) ? n : null; };
const impAm = a => a < 0 ? (-a) / ((-a) + 100) : 100 / (a + 100);
const decAm = a => a < 0 ? 1 + 100 / (-a) : 1 + a / 100;
const seasonOf = ts => { const d = new Date(ts - 10 * 3600e3); return d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };
const dayKey = ts => Math.floor((ts - 10 * 3600e3) / 864e5);
const pML = (pm, s) => { const h = 1 - L.Phi((0.5 - pm) / s), a = L.Phi((-0.5 - pm) / s); return h / (h + a); };

/* ================= datos ================= */
const numE = v => { if (v && typeof v === 'object') v = v.value !== undefined ? v.value : v.displayValue; const n = parseInt(v, 10); return isFinite(n) ? n : null; };
function oddsScoreboard(c, abH) {
  const o = c.odds && c.odds[0]; if (!o) return null; const r = {};
  if (isFinite(+o.overUnder) && +o.overUnder > 0) r.total = +o.overUnder;
  let sp = null;
  if (typeof o.details === 'string') {
    const m = o.details.match(/^\s*([A-Za-z]{2,4})\s+([+-]?\d+(?:\.\d+)?)/);
    if (m) { const v = parseFloat(m[2]); sp = (m[1].toUpperCase() === String(abH || '').toUpperCase()) ? v : -v; }
    else if (/even|pk/i.test(o.details)) sp = 0;
  }
  if (sp === null && isFinite(+o.spread) && o.homeTeamOdds && o.homeTeamOdds.favorite !== undefined) { const v = Math.abs(+o.spread); sp = o.homeTeamOdds.favorite ? -v : v; }
  if (sp !== null) r.spread = sp;
  const mh = o.homeTeamOdds && o.homeTeamOdds.moneyLine, ma = o.awayTeamOdds && o.awayTeamOdds.moneyLine;
  if (isFinite(+mh) && +mh) r.mlH = +mh; if (isFinite(+ma) && +ma) r.mlA = +ma;
  return (r.total !== undefined || r.spread !== undefined || r.mlH !== undefined) ? r : null;
}
function parseEventos(j) {
  const out = [];
  ((j && j.events) || []).forEach(function (e) {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a || !h.team || !a.team) return;
    const st = (e.status && e.status.type) || (c.status && c.status.type) || {};
    const ts = Date.parse(e.date); if (!isFinite(ts)) return;
    const hs = numE(h.score), as = numE(a.score), ty = parseInt(e.season && e.season.type, 10) || 2;
    const allstar = /all.?star|rising stars|celebrity/i.test((e.name || '') + (e.shortName || '') + ((e.season && e.season.slug) || ''));
    out.push({ id: String(e.id), ts, h: String(h.team.id), a: String(a.team.id), hs, as, abH: h.team.abbreviation || '',
      done: st.completed === true && hs !== null && as !== null, ty, skip: allstar || ty === 1 || ty === 4, oddsSb: oddsScoreboard(c, h.team.abbreviation) });
  });
  return out;
}
async function bajarDia(d) { try { return parseEventos(await L.pedir(ESPN + 'scoreboard?dates=' + ymdU(d) + '&limit=300')); } catch (e) { DIAG.errores.push(ymdU(d) + ': ' + e.message); return []; } }
async function bajarTrozo(ini, fin) {
  try {
    const ev = parseEventos(await L.pedir(ESPN + 'scoreboard?dates=' + ymdU(ini) + '-' + ymdU(fin) + '&limit=1000'));
    const dias = Math.round((fin - ini) / 864e5) + 1;
    const dentro = ev.every(g => g.ts >= ini.getTime() - 2 * 864e5 && g.ts <= fin.getTime() + 3 * 864e5);
    if (dentro && (ev.length > 0 || dias <= 7)) { DIAG.rango++; return ev; }
  } catch (e) { DIAG.errores.push('rango ' + ymdU(ini) + ': ' + e.message); }
  DIAG.dia++;
  const ds = []; for (let d = new Date(ini); d <= fin; d = new Date(d.getTime() + 864e5)) ds.push(new Date(d));
  return [].concat(...await L.pool(ds.map(d => () => bajarDia(d)), 10));
}
async function temporada(sk) {
  const ini = new Date(Date.UTC(sk, 9, 1)), fin = new Date(Date.UTC(sk + 1, 5, 30));
  const tr = []; let y = ini.getUTCFullYear(), m = ini.getUTCMonth();
  while (new Date(Date.UTC(y, m, 1)) <= fin) {
    let a = new Date(Date.UTC(y, m, 1)), b = new Date(Date.UTC(y, m + 1, 0));
    if (a < ini) a = ini; if (b > fin) b = fin; tr.push([a, b]); m++; if (m > 11) { m = 0; y++; }
  }
  const res = await L.pool(tr.map(t => () => bajarTrozo(t[0], t[1])), 4);
  return [].concat(...res.filter(Boolean));
}
/* lineas de cierre del endpoint core de ESPN */
function lineaCore(j, abH) {
  const items = (j && j.items) || []; let mejor = null;
  items.forEach(function (it) {
    const prov = (it.provider && it.provider.name) || '?', hO = it.homeTeamOdds || {}, aO = it.awayTeamOdds || {};
    let sp = null;
    const cps = hO.close && hO.close.pointSpread; if (cps) sp = num(cps.american !== undefined ? cps.american : cps.alternateDisplayValue);
    if (sp !== null && Math.abs(sp) > 40) sp = null;            // eso es un precio (-110), no una linea
    if (sp === null && isFinite(+it.spread) && hO.favorite !== undefined) { const v = Math.abs(+it.spread); sp = hO.favorite ? -v : v; }
    if (sp === null && typeof it.details === 'string') {
      const m = it.details.match(/^\s*([A-Za-z]{2,4})\s+([+-]?\d+(?:\.\d+)?)/);
      if (m && abH) { const v = parseFloat(m[2]); sp = m[1].toUpperCase() === String(abH).toUpperCase() ? v : -v; }
    }
    let tot = null; const ct = it.close && it.close.total; if (ct) tot = num(ct.alternateDisplayValue !== undefined ? ct.alternateDisplayValue : ct.american);
    if (tot !== null && (tot < 150 || tot > 300)) tot = null;
    if (tot === null && isFinite(+it.overUnder) && +it.overUnder > 150 && +it.overUnder < 300) tot = +it.overUnder;
    const mlDe = lado => { if (!lado) return null; const c = lado.close && lado.close.moneyLine, k = lado.current && lado.current.moneyLine;
      let o = americano(c && c.american); if (o == null) o = americano(k && k.american); if (o == null) o = americano(lado.moneyLine); return o; };
    let mh = mlDe(hO), ma = mlDe(aO);
    if (mh !== null && ma !== null) { const s = impAm(mh) + impAm(ma); if (s < 1.0 || s > 1.15) { mh = null; ma = null; } } else { mh = null; ma = null; }
    const cand = { prov, spread: sp, total: tot, mlH: mh, mlA: ma, dk: /draftkings/i.test(prov) };
    const puntos = (sp !== null ? 2 : 0) + (tot !== null ? 1 : 0) + (mh !== null ? 1 : 0);
    cand.puntos = puntos;
    if (puntos > 0 && (!mejor || puntos > mejor.puntos || (puntos === mejor.puntos && cand.dk && !mejor.dk))) mejor = cand;
  });
  return mejor;
}

/* ================= modelo (el del app + extensiones para probar) ================= */
// cfg: kM,kT,carry,H,R (back-to-back), R3 (3 juegos en 4 noches), Rd (dias de descanso de diferencia), wF/aF (forma reciente), Z
const CFG0 = { kM: 0.06, kT: 0.05, carry: 0.65, H: 2.4, R: 1.5, R3: 0, Rd: 0, wF: 0, aF: 0.1, Z: 1 };
function rate(games, cfg, cb) {
  const S = { m: {}, t: {}, last: {}, hist: {}, res: {}, cnt: {}, lg: 225, season: null, sseM: 0, sseT: 0, nn: 0, n: 0 };
  for (let i = 0; i < games.length; i++) {
    const g = games[i], sk = seasonOf(g.ts);
    if (S.season !== null && sk !== S.season) { for (const k in S.m) S.m[k] *= cfg.carry; for (const k in S.t) S.t[k] *= cfg.carry; S.cnt = {}; S.res = {}; }
    S.season = sk;
    const dk = dayKey(g.ts), mh = S.m[g.h] || 0, ma = S.m[g.a] || 0, th = S.t[g.h] || 0, ta = S.t[g.a] || 0;
    const info = tid => {
      const l = S.last[tid], hh = S.hist[tid] || [];
      let n3 = 0; for (let q = 0; q < hh.length; q++) { const d = dk - hh[q]; if (d >= 1 && d <= 3) n3++; }
      return { b2b: l !== undefined && dk - l === 1, heavy: n3 >= 2, rd: l === undefined ? 3 : Math.min(dk - l, 4) };
    };
    const fh = info(g.h), fa = info(g.a);
    const fat = f => cfg.R * (f.b2b ? 1 : 0) + cfg.R3 * (f.heavy ? 1 : 0);
    const restAdj = fat(fa) - fat(fh) + cfg.Rd * (fh.rd - fa.rd);
    const form = cfg.wF ? cfg.wF * ((S.res[g.h] || 0) - (S.res[g.a] || 0)) : 0;
    const base = (mh - ma) * cfg.Z + cfg.H + restAdj, pm = base + form, pt = S.lg + th + ta;
    const mar = g.hs - g.as, tot = g.hs + g.as;
    if (cb) { const nn = S.nn; cb(g, { pm, pt, sM: nn > 100 ? Math.sqrt(S.sseM / nn) : 12.4, sT: nn > 100 ? Math.sqrt(S.sseT / nn) : 18.5, cH: S.cnt[g.h] || 0, cA: S.cnt[g.a] || 0 }); }
    const e = Math.max(-20, Math.min(20, mar - pm));
    S.m[g.h] = mh + cfg.kM * e; S.m[g.a] = ma - cfg.kM * e;
    const eT = Math.max(-30, Math.min(30, tot - pt));
    S.t[g.h] = th + cfg.kT * eT; S.t[g.a] = ta + cfg.kT * eT;
    S.lg += 0.01 * (tot - S.lg);
    if (cfg.wF) { const rr = mar - base; S.res[g.h] = (S.res[g.h] || 0) + cfg.aF * (rr - (S.res[g.h] || 0)); S.res[g.a] = (S.res[g.a] || 0) + cfg.aF * (-rr - (S.res[g.a] || 0)); }
    S.last[g.h] = dk; S.last[g.a] = dk;
    (S.hist[g.h] = S.hist[g.h] || []).push(dk); (S.hist[g.a] = S.hist[g.a] || []).push(dk);
    if (S.hist[g.h].length > 6) S.hist[g.h].shift(); if (S.hist[g.a].length > 6) S.hist[g.a].shift();
    S.cnt[g.h] = (S.cnt[g.h] || 0) + 1; S.cnt[g.a] = (S.cnt[g.a] || 0) + 1;
    S.n++;
    if (S.n > 400) { S.sseM += (mar - pm) * (mar - pm); S.sseT += (tot - pt) * (tot - pt); S.nn++; }
  }
}
function mseSeason(games, cfg, sk, que) {      // error cuadratico medio de margen (o total) en una temporada
  let s = 0, n = 0;
  rate(games, cfg, function (g, x) {
    if (seasonOf(g.ts) !== sk || x.cH < 5 || x.cA < 5) return;
    const e = que === 'tot' ? (g.hs + g.as) - x.pt : (g.hs - g.as) - x.pm; s += e * e; n++;
  });
  return n ? s / n : Infinity;
}
function ajustar(games, skTune, log) {
  let best = { cfg: Object.assign({}, CFG0), e: mseSeason(games, CFG0, skTune, 'mar') };
  const e0 = best.e;
  [0.03, 0.05, 0.08, 0.12].forEach(kM => [0.5, 0.65, 0.8].forEach(carry => [1.5, 2.4, 3.3].forEach(H => [0, 1.5, 3].forEach(R => {
    const c = Object.assign({}, CFG0, { kM, carry, H, R }), e = mseSeason(games, c, skTune, 'mar'); if (e < best.e) best = { cfg: c, e };
  }))));
  const v1 = Object.assign({}, best.cfg), e1 = best.e;
  [0, 1, 2].forEach(R3 => [0, 0.3, 0.6].forEach(Rd => {
    const c = Object.assign({}, best.cfg, { R3, Rd }), e = mseSeason(games, c, skTune, 'mar'); if (e < best.e) best = { cfg: c, e };
  }));
  const v2 = Object.assign({}, best.cfg), e2 = best.e;
  [0.15, 0.3, 0.5].forEach(wF => [0.05, 0.1, 0.2].forEach(aF => {
    const c = Object.assign({}, best.cfg, { wF, aF }), e = mseSeason(games, c, skTune, 'mar'); if (e < best.e) best = { cfg: c, e };
  }));
  const v3 = Object.assign({}, best.cfg), e3 = best.e;
  let bt = { kT: CFG0.kT, e: mseSeason(games, CFG0, skTune, 'tot') };
  [0.02, 0.035, 0.07, 0.1].forEach(kT => { const e = mseSeason(games, Object.assign({}, CFG0, { kT }), skTune, 'tot'); if (e < bt.e) bt = { kT, e }; });
  log('Ajuste (solo con la temporada ' + skTune + '-' + String(skTune + 1).slice(2) + ', sin mirar el mercado): error cuadr. de margen app ' + e0.toFixed(1) + ' -> tuneado ' + e1.toFixed(1) + ' -> +descanso ' + e2.toFixed(1) + ' -> +forma ' + e3.toFixed(1) + ' | totales kT ' + bt.kT);
  return { V1: v1, V2: v2, V3: v3, kT: bt.kT };
}

/* ================= evaluacion ================= */
function rmse(v) { return Math.sqrt(v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1)); }
function filaMargen(rows, key, lab) {
  const dm = [], em = [], ek = [];
  rows.forEach(r => { const e = r.mar - r.v[key].pm, k = r.mar + r.spread; dm.push(e * e - k * k); em.push(e * e); ek.push(k * k); });
  const q = L.ms(dm);
  return [lab, rows.length, L.f(rmse(em), 2), L.f(rmse(ek), 2), L.f(q.m, 1) + ' ± ' + L.f(2 * q.se, 1), L.f(q.z, 1), L.veredicto(q)];
}
function regMargen(rows, key) {
  const X = [], y = [];
  rows.forEach(r => { const mk = -r.spread; X.push([1, mk, r.v[key].pm - mk]); y.push(r.mar); });
  return L.ols(X, y);
}
function lambdaDe(rows, key, que) {            // peso optimo del modelo sobre el mercado (sin constante)
  let sxx = 0, sxy = 0;
  rows.forEach(r => { const mk = que === 'tot' ? r.total : -r.spread, x = (que === 'tot' ? r.v[key].pt : r.v[key].pm) - mk, y = (que === 'tot' ? r.tot : r.mar) - mk; sxx += x * x; sxy += x * y; });
  return sxx > 0 ? sxy / sxx : 0;
}
function crossLambda(rows, key, que) {
  const sks = [...new Set(rows.map(r => r.sk))].sort(), d = [], lam = {};
  sks.forEach(sk => {
    const tr = rows.filter(r => r.sk !== sk), te = rows.filter(r => r.sk === sk); if (tr.length < 100) return;
    const lm = Math.max(0, Math.min(1, lambdaDe(tr, key, que))); lam[sk] = lm;
    te.forEach(r => { const mk = que === 'tot' ? r.total : -r.spread, pr = que === 'tot' ? r.v[key].pt : r.v[key].pm, y = que === 'tot' ? r.tot : r.mar, b = mk + lm * (pr - mk); d.push((y - b) * (y - b) - (y - mk) * (y - mk)); });
  });
  return { q: L.ms(d), lam };
}
function ats(rows, key, que, t) {
  let w = 0, l = 0, p = 0; const rets = [];
  rows.forEach(r => {
    const mk = que === 'tot' ? r.total : -r.spread, pr = que === 'tot' ? r.v[key].pt : r.v[key].pm, y = que === 'tot' ? r.tot : r.mar, dif = pr - mk;
    if (Math.abs(dif) < t) return;
    if (y === mk) { p++; rets.push(0); return; }
    const gana = dif > 0 ? y > mk : y < mk; if (gana) { w++; rets.push(100 / 110); } else { l++; rets.push(-1); }
  });
  const q = L.ms(rets); return { n: w + l + p, w, l, p, roi: q.m, se: q.se };
}
function logLossML(rows, key) {
  const d = [], a = [], b = [];
  rows.forEach(r => {
    if (r.mlH == null) return; const iH = impAm(r.mlH), iA = impAm(r.mlA), pk = iH / (iH + iA), y = r.mar > 0 ? 1 : 0;
    const pm = L.clip(pML(r.v[key].pm, r.v[key].sM), 0.02, 0.98), lm = -Math.log(y ? pm : 1 - pm), lk = -Math.log(y ? pk : 1 - pk); d.push(lm - lk); a.push(lm); b.push(lk);
  });
  const q = L.ms(d); return { n: d.length, lm: L.ms(a).m, lk: L.ms(b).m, q };
}

const DIAG = { errores: [], rango: 0, dia: 0 };
async function main() {
  const arg = /^\d{4}(,\d{4})*$/.test(process.argv[2] || '') ? process.argv[2] : (process.env.TEMPS_NBA || '2024,2025');
  const evalSk = arg.split(',').map(s => parseInt(s, 10)).filter(isFinite);
  const skMin = 2021, skMax = Math.max(...evalSk), skTune = 2023;
  let out = '## NBA contra el mercado — temporadas evaluadas: ' + evalSk.map(s => s + '-' + String(s + 1).slice(2)).join(', ') + '\n\n';
  const log = t => { out += t + '\n\n'; console.log(t); };
  console.log('Bajando resultados...');
  const todos = []; for (let sk = skMin; sk <= skMax; sk++) { const g = await temporada(sk); console.log('  temporada ' + sk + ': ' + g.length + ' eventos'); todos.push(...g); }
  const mapa = new Map(); todos.forEach(g => { if (g.done && !g.skip && !mapa.has(g.id)) mapa.set(g.id, g); });
  const games = [...mapa.values()].sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  const porTemp = {}; games.forEach(g => { const s = seasonOf(g.ts); porTemp[s] = (porTemp[s] || 0) + 1; });
  log('### Datos\n```\njuegos finales por temporada: ' + JSON.stringify(porTemp) + '\n' + (DIAG.errores.length ? 'errores de descarga: ' + DIAG.errores.length + ' (primeros: ' + DIAG.errores.slice(0, 3).join(' | ') + ')\n' : '') + '```');
  if (games.length < 1500) { log('NO TERMINO: muy pocos juegos descargados (' + games.length + ').'); return finish(out, true); }

  // lineas
  const objetivo = games.filter(g => evalSk.includes(seasonOf(g.ts)));
  console.log('Bajando lineas de cierre de ' + objetivo.length + ' juegos...');
  let ejemplo = null, fallos = 0;
  await L.pool(objetivo.map(g => async () => {
    let j = null; try { j = await L.pedir(CORE(g.id)); } catch (e) { fallos++; }
    if (j && !ejemplo && j.items && j.items.length) ejemplo = JSON.stringify(j.items[0]).slice(0, 1800);
    const c = j ? lineaCore(j, g.abH) : null;
    g.linea = c || null;
    if (g.oddsSb) { g.linea = g.linea || { prov: 'scoreboard' }; ['spread', 'total', 'mlH', 'mlA'].forEach(k => { if (g.linea[k] == null && g.oddsSb[k] != null) g.linea[k] = g.oddsSb[k]; }); }
  }), 8, (h, t) => { if (h % 400 === 0) console.log('  lineas ' + h + '/' + t); });
  const provs = {}; objetivo.forEach(g => { const p = g.linea ? g.linea.prov : 'sin linea'; provs[p] = (provs[p] || 0) + 1; });
  const cov = { sp: 0, to: 0, ml: 0 }; objetivo.forEach(g => { if (g.linea) { if (g.linea.spread != null) cov.sp++; if (g.linea.total != null) cov.to++; if (g.linea.mlH != null) cov.ml++; } });
  log('### Conexion con las lineas\n```\njuegos a medir: ' + objetivo.length + ' | con spread ' + cov.sp + ' | con total ' + cov.to + ' | con moneyline ' + cov.ml + ' | pedidos fallidos ' + fallos + '\nproveedores: ' + JSON.stringify(provs) + '\nejemplo crudo del primer proveedor (para depurar si algo sale raro):\n' + (ejemplo || '(ninguno)') + '\n```');
  if (cov.sp < 200) { log('NO TERMINO: casi no hay lineas de spread (' + cov.sp + '). Pega esta salida para ajustar el lector de ESPN.'); return finish(out, true); }

  // modelos
  const cfgs = ajustar(games, skTune, log);
  const V = { V0: Object.assign({}, CFG0), V1: cfgs.V1, V2: cfgs.V2, V3: cfgs.V3 };
  const NOM = { V0: 'V0 app actual (v3.2)', V1: 'V1 reajustada', V2: 'V2 + descanso (3 en 4, dias)', V3: 'V3 + forma reciente' };
  const pred = {}; Object.keys(V).forEach(k => { pred[k] = new Map(); const cfg = Object.assign({}, V[k], { kT: k === 'V0' ? CFG0.kT : cfgs.kT }); rate(games, cfg, (g, x) => { if (x.cH >= 5 && x.cA >= 5) pred[k].set(g.id, x); }); });
  const rows = [];
  objetivo.forEach(g => {
    const l = g.linea; if (!l || l.spread == null) return;
    const r = { id: g.id, sk: seasonOf(g.ts), ty: g.ty, mar: g.hs - g.as, tot: g.hs + g.as, spread: l.spread, total: l.total, mlH: l.mlH, mlA: l.mlA, v: {} };
    let ok = true; Object.keys(V).forEach(k => { const x = pred[k].get(g.id); if (!x) ok = false; else r.v[k] = x; });
    if (ok) rows.push(r);
  });
  const sks = [...new Set(rows.map(r => r.sk))].sort();
  log('Juegos con linea y con modelo listo (>=5 juegos previos de cada equipo): ' + rows.length + ' (' + sks.map(s => s + ': ' + rows.filter(r => r.sk === s).length).join(', ') + ')');

  // 1) margen
  let t1 = []; Object.keys(V).forEach(k => t1.push(filaMargen(rows, k, NOM[k])));
  log('### 1) Margen (spread): modelo contra la linea de cierre\nError medio de cuadrados: "dif" = (error del modelo)² − (error del mercado)². Positivo = el mercado acierta mas.\n\n' + L.tabla(['Modelo', 'Juegos', 'RMSE modelo', 'RMSE mercado', 'dif ± 2·se', 'z', 'Veredicto'], t1));
  if (sks.length > 1) { let t = []; sks.forEach(s => { const rr = rows.filter(r => r.sk === s); t.push(filaMargen(rr, 'V3', s + '-' + String(s + 1).slice(2) + ' (V3)')); }); log(L.tabla(['Temporada', 'Juegos', 'RMSE modelo', 'RMSE mercado', 'dif ± 2·se', 'z', 'Veredicto'], t)); }
  // 2) regresion
  let t2 = []; Object.keys(V).forEach(k => { const g = regMargen(rows, k); if (g) t2.push([NOM[k], L.f(g.b[1], 3) + ' ± ' + L.f(2 * g.se[1], 3), L.f(g.b[2], 3) + ' ± ' + L.f(2 * g.se[2], 3), L.f(g.b[2] / (g.se[2] || 1), 1)]); });
  log('### 2) ¿Agrega algo el modelo que el mercado no sepa?\nmargen real = a + b·(margen del mercado) + c·(modelo − mercado). **c** es cuanto vale la opinion del modelo encima de la linea (0 = nada, 1 = todo, 0.2 = un poco).\n\n' + L.tabla(['Modelo', 'b (mercado)', 'c (modelo extra)', 'z de c'], t2));
  // 3) mezcla fuera de muestra
  let t3 = []; Object.keys(V).forEach(k => { const c = crossLambda(rows, k, 'mar'); t3.push([NOM[k], Object.keys(c.lam).map(s => s + ':' + L.f(c.lam[s], 2)).join(' '), L.f(c.q.m, 3) + ' ± ' + L.f(2 * c.q.se, 3), L.f(c.q.z, 1)]); });
  log('### 3) Mezcla mercado + modelo (se ajusta en una temporada y se prueba en la otra)\nPredictor = mercado + λ·(modelo − mercado). Cuadrados: negativo = la mezcla le gana a la linea sola.\n\n' + L.tabla(['Modelo', 'λ ajustado por temporada', 'dif vs mercado ± 2·se', 'z'], t3));
  // 4) ATS
  let t4 = []; [1, 2, 3, 4, 5].forEach(t => { const a = ats(rows, 'V3', 'mar', t), b = ats(rows, 'V0', 'mar', t); t4.push([t + '+ pts', a.n, a.w + '-' + a.l + '-' + a.p, L.pc(a.w / Math.max(a.w + a.l, 1)), L.pc(a.roi) + ' ± ' + L.pc(2 * a.se), b.n, L.pc(b.w / Math.max(b.w + b.l, 1)), L.pc(b.roi) + ' ± ' + L.pc(2 * b.se)]); });
  log('### 4) Apostar contra el spread cuando el modelo difiere de la linea (a -110; hay que ganar 52.4% para empatar)\n\n' + L.tabla(['Diferencia', 'V3 apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'V0 apuestas', 'V0 % gan.', 'V0 ROI'], t4));
  // 5) totales
  const rowsT = rows.filter(r => r.total != null);
  let t5 = []; Object.keys(V).forEach(k => {
    const dm = [], em = [], ek = []; rowsT.forEach(r => { const e = r.tot - r.v[k].pt, m = r.tot - r.total; dm.push(e * e - m * m); em.push(e * e); ek.push(m * m); });
    const q = L.ms(dm), c = crossLambda(rowsT, k, 'tot'); t5.push([NOM[k], rowsT.length, L.f(rmse(em), 2), L.f(rmse(ek), 2), L.f(q.z, 1), 'λ ' + Object.keys(c.lam).map(s => L.f(c.lam[s], 2)).join('/') + ' → z ' + L.f(c.q.z, 1)]);
  });
  log('### 5) Totales (Más/Menos) contra la linea de cierre\n\n' + L.tabla(['Modelo', 'Juegos', 'RMSE modelo', 'RMSE mercado', 'z (positivo = mercado mejor)', 'Mezcla fuera de muestra'], t5));
  let t6 = []; [2, 3, 4, 6].forEach(t => { const a = ats(rowsT, 'V0', 'tot', t); t6.push([t + '+ pts', a.n, a.w + '-' + a.l + '-' + a.p, L.pc(a.w / Math.max(a.w + a.l, 1)), L.pc(a.roi) + ' ± ' + L.pc(2 * a.se)]); });
  log(L.tabla(['Total: dif. modelo vs linea', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se'], t6));
  // 6) ganador (moneyline)
  let t7 = []; Object.keys(V).forEach(k => { const m = logLossML(rows, k); t7.push([NOM[k], m.n, L.f(m.lm, 4), L.f(m.lk, 4), L.f(m.q.m, 4), L.f(m.q.z, 1), L.veredicto(m.q)]); });
  log('### 6) Probabilidad de ganar (moneyline sin vig) — pérdida log\n\n' + L.tabla(['Modelo', 'Juegos', 'Pérdida modelo', 'Pérdida mercado', 'dif', 'z', 'Veredicto'], t7));
  // 7) conclusion
  const lamAll = Object.keys(V).map(k => [k, lambdaDe(rows, k, 'mar')]);
  const cV3 = crossLambda(rows, 'V3', 'mar'), cV0 = crossLambda(rows, 'V0', 'mar');
  const mejorK = (cV3.q.m < cV0.q.m) ? 'V3' : 'V0';
  log('### Resumen para decidir\n```\nParametros V1 (reajustados): ' + JSON.stringify(V.V1) + '\nParametros V3 (con descanso y forma): ' + JSON.stringify(V.V3) + '\nkT totales recomendado: ' + cfgs.kT + '\nλ del margen (peso del modelo sobre la linea) en toda la muestra: ' + lamAll.map(a => a[0] + '=' + a[1].toFixed(2)).join('  ') + '\nMezcla fuera de muestra, mejor modelo: ' + mejorK + ' (z ' + (mejorK === 'V3' ? cV3.q.z : cV0.q.z).toFixed(1) + ')\n```');
  fs.writeFileSync('resultado_nba.json', JSON.stringify({ V, kT: cfgs.kT, lam: lamAll, n: rows.length }, null, 1));
  return finish(out, false);
}
function finish(out, fallo) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
  if (require.main === module) process.exit(fallo ? 1 : 0);
  return fallo;
}
module.exports = { rate, CFG0, seasonOf, dayKey, lineaCore, main, lambdaDe, crossLambda, ats };
if (false) main().catch(e => { console.error(e); process.exit(1); });

return module.exports;
})();
const FUT = (function () {
const module = { exports: {} };
const require = n => require_real(n);
// Backtest del fútbol de OVA contra el mercado (cuotas de cierre de football-data.co.uk, Pinnacle cuando existe)
// Uso: node correr_futbol.js            (ligas: PL, La Liga, Serie A, Bundesliga, Ligue 1; temporadas 2021-22 a 2025-26)
const fs = require('fs');
const LIGAS = [['E0', 'Premier League'], ['SP1', 'La Liga'], ['I1', 'Serie A'], ['D1', 'Bundesliga'], ['F1', 'Ligue 1']];
const TEMPS = (process.env.TEMPS_FUTBOL || '2122,2223,2324,2425,2526').split(',');
const TUNE = '2223';                       // temporada donde se ajustan los parametros (sin mirar el mercado)
const urlCsv = (t, code) => 'https://www.football-data.co.uk/mmz4281/' + t + '/' + code + '.csv';
const MAXG = 8;

/* ================= datos ================= */
function csvFilas(txt) {
  txt = txt.replace(/^﻿/, '');
  const lines = txt.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const split = l => { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
  const cab = split(lines[0]).map(s => s.trim()), out = [];
  for (let i = 1; i < lines.length; i++) { const v = split(lines[i]); if (v.length < 5) continue; const r = {}; cab.forEach((c, k) => { if (c) r[c] = (v[k] || '').trim(); }); out.push(r); }
  return out;
}
function fechaCsv(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (!m) return null;
  let y = +m[3]; if (y < 100) y += y > 70 ? 1900 : 2000; return Date.UTC(y, +m[2] - 1, +m[1]);
}
const nm = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const trio = (r, a, b, c) => { const x = nm(r[a]), y = nm(r[b]), z = nm(r[c]); return (x > 1 && y > 1 && z > 1) ? [x, y, z] : null; };
const par = (r, a, b) => { const x = nm(r[a]), y = nm(r[b]); return (x > 1 && y > 1) ? [x, y] : null; };
const FUENTES_1X2 = [['PSC', 'Pinnacle cierre'], ['AvgC', 'Promedio cierre'], ['B365C', 'Bet365 cierre'], ['PS', 'Pinnacle previo'], ['Avg', 'Promedio previo'], ['B365', 'Bet365 previo']];
const FUENTES_OU = [['PC>2.5', 'PC<2.5', 'Pinnacle cierre'], ['AvgC>2.5', 'AvgC<2.5', 'Promedio cierre'], ['B365C>2.5', 'B365C<2.5', 'Bet365 cierre'], ['P>2.5', 'P<2.5', 'Pinnacle previo'], ['Avg>2.5', 'Avg<2.5', 'Promedio previo'], ['B365>2.5', 'B365<2.5', 'Bet365 previo']];
function devig(o) { const inv = o.map(x => 1 / x), s = inv.reduce((a, b) => a + b, 0); return inv.map(x => x / s); }
function leerPartidos(filas, t, lg) {
  const out = [];
  filas.forEach(r => {
    const d = fechaCsv(r.Date), gh = nm(r.FTHG), ga = nm(r.FTAG), h = r.HomeTeam, a = r.AwayTeam;
    if (d === null || gh === null || ga === null || !h || !a) return;
    const m = { t, lg, d, day: Math.floor(d / 864e5), h, a, gh, ga, y: gh > ga ? 0 : (gh === ga ? 1 : 2) };
    for (const [p, nombre] of FUENTES_1X2) { const o = trio(r, p + 'H', p + 'D', p + 'A'); if (o) { m.mk = devig(o); m.mkSrc = nombre; m.mkO = o; break; } }
    for (const [p1, p2, nombre] of FUENTES_OU) { const o = par(r, p1, p2); if (o) { m.ou = devig(o)[0]; m.ouSrc = nombre; m.ouO = o; break; } }
    m.ps = trio(r, 'PSCH', 'PSCD', 'PSCA') || trio(r, 'PSH', 'PSD', 'PSA');
    m.avg = trio(r, 'AvgCH', 'AvgCD', 'AvgCA') || trio(r, 'AvgH', 'AvgD', 'AvgA') || trio(r, 'B365CH', 'B365CD', 'B365CA');
    m.mx = trio(r, 'MaxCH', 'MaxCD', 'MaxCA') || trio(r, 'MaxH', 'MaxD', 'MaxA');
    m.ouPs = par(r, 'PC>2.5', 'PC<2.5') || par(r, 'P>2.5', 'P<2.5');
    m.ouAvg = par(r, 'AvgC>2.5', 'AvgC<2.5') || par(r, 'Avg>2.5', 'Avg<2.5') || par(r, 'B365C>2.5', 'B365C<2.5');
    out.push(m);
  });
  return out.sort((a, b) => a.d - b.d);
}

/* ================= distribucion de goles (igual que el app) ================= */
const PM = {};
function pmf(l) { const key = Math.round(l * 1000); if (PM[key]) return PM[key]; const a = [Math.exp(-l)]; for (let k = 1; k <= MAXG; k++) a.push(a[k - 1] * l / k); return (PM[key] = a); }
function tauDC(i, j, lL, lV, rho) { if (i === 0 && j === 0) return 1 - lL * lV * rho; if (i === 0 && j === 1) return 1 + lL * rho; if (i === 1 && j === 0) return 1 + lV * rho; if (i === 1 && j === 1) return 1 - rho; return 1; }
function dist(lL, lV, rho) {
  const pl = pmf(lL), pv = pmf(lV); let pH = 0, pD = 0, pA = 0, o25 = 0, bt = 0, s = 0;
  for (let i = 0; i <= MAXG; i++) for (let j = 0; j <= MAXG; j++) {
    let p = pl[i] * pv[j]; if (rho) { p *= tauDC(i, j, lL, lV, rho); if (p < 0) p = 0; }
    s += p; if (i > j) pH += p; else if (i === j) pD += p; else pA += p; if (i + j > 2.5) o25 += p; if (i >= 1 && j >= 1) bt += p;
  }
  return { p: [pH / s, pD / s, pA / s], o25: o25 / s, bt: bt / s };
}
function mezcla(a, b, w) { return w * a + (1 - w) * b; }

/* ================= modelo A: el del app (goles a favor/en contra de la temporada, encogidos) ================= */
const CFG_APP = { K: 6, h: 1.13, rho: -0.08, S: 0, Kt: 16, wt: 0.5, ct: 1 };
function porFecha(ms) { const g = []; let cur = null; ms.forEach(m => { if (!cur || cur.day !== m.day) { cur = { day: m.day, ms: [] }; g.push(cur); } cur.ms.push(m); }); return g; }
function lam(aL, aV, lp, K, h) {
  const gfL = (aL.gf + K * lp) / (aL.pj + K), gcL = (aL.gc + K * lp) / (aL.pj + K), gfV = (aV.gf + K * lp) / (aV.pj + K), gcV = (aV.gc + K * lp) / (aV.pj + K);
  return [gfL * gcV / lp * h, gfV * gcL / lp / h];
}
function modeloApp(ms, cfg, cb) {
  let season = null, T = {}, lpPrev = 1.35, seed = {};
  porFecha(ms).forEach(grp => {
    const first = grp.ms[0];
    if (first.t !== season) {
      if (season !== null) { // semilla = ratings de la temporada que acaba de terminar
        let gf = 0, pj = 0; Object.keys(T).forEach(k => { gf += T[k].gf; pj += T[k].pj; }); const lp = pj ? gf / pj : lpPrev; lpPrev = lp; seed = {};
        Object.keys(T).forEach(k => { if (T[k].pj >= 10) seed[k] = { att: (T[k].gf / T[k].pj) / lp, def: (T[k].gc / T[k].pj) / lp }; });
      }
      season = first.t; T = {};
    }
    let gf = 0, pj = 0; Object.keys(T).forEach(k => { gf += T[k].gf; pj += T[k].pj; }); const lp = pj > 0 ? gf / pj : lpPrev;
    grp.ms.forEach(m => {
      const get = (n) => { const a = T[n] || { pj: 0, gf: 0, gc: 0 }, s = seed[n]; return (s && cfg.S) ? { pj: a.pj + cfg.S, gf: a.gf + cfg.S * s.att * lp, gc: a.gc + cfg.S * s.def * lp } : a; };
      const aL = get(m.h), aV = get(m.a);
      const l1 = lam(aL, aV, lp, cfg.K, cfg.h), d = dist(l1[0], l1[1], cfg.rho);
      const l2 = lam(aL, aV, lp, cfg.Kt, cfg.h), g = dist(l2[0] * cfg.ct, l2[1] * cfg.ct, cfg.rho), g0 = dist(lp * cfg.ct * cfg.h, lp * cfg.ct / cfg.h, cfg.rho);
      cb(m, { p: d.p, o25: mezcla(g.o25, g0.o25, cfg.wt), bt: mezcla(g.bt, g0.bt, cfg.wt), lam: l1 });
    });
    grp.ms.forEach(m => { [[m.h, m.gh, m.ga], [m.a, m.ga, m.gh]].forEach(z => { const e = T[z[0]] || (T[z[0]] = { pj: 0, gf: 0, gc: 0 }); e.pj++; e.gf += z[1]; e.gc += z[2]; }); });
  });
}

/* ================= modelo B: Dixon-Coles con peso por antiguedad (ataque/defensa por equipo, ajustado por IPF) ================= */
const CFG_DC = { xi: 1.0, Kp: 5, rho: -0.08, promo: 0, win: 1100, wt: 1 };
function dcAjuste(tr, dayNow, cfg) {
  const idx = {}, names = []; tr.forEach(m => { [m.h, m.a].forEach(n => { if (idx[n] === undefined) { idx[n] = names.length; names.push(n); } }); });
  const n = names.length, att = new Float64Array(n).fill(1), def = new Float64Array(n).fill(1), cnt = new Float64Array(n);
  const H = new Int32Array(tr.length), A = new Int32Array(tr.length), W = new Float64Array(tr.length);
  tr.forEach((m, i) => { H[i] = idx[m.h]; A[i] = idx[m.a]; W[i] = Math.exp(-cfg.xi * (dayNow - m.day) / 365); cnt[H[i]] += 1; cnt[A[i]] += 1; });
  const a0 = new Float64Array(n).fill(1), d0 = new Float64Array(n).fill(1);
  if (cfg.promo) for (let i = 0; i < n; i++) if (cnt[i] < 8) { a0[i] = 0.85; d0[i] = 1.15; }
  let c = 1.35, gam = 1.25;
  for (let it = 0; it < 28; it++) {
    const nA = new Float64Array(n), dA = new Float64Array(n), nD = new Float64Array(n), dD = new Float64Array(n); let sgh = 0, egh = 0, sg = 0, eg = 0;
    for (let i = 0; i < tr.length; i++) {
      const m = tr[i], w = W[i], h = H[i], a = A[i];
      nA[h] += w * m.gh; dA[h] += w * c * def[a] * gam; nA[a] += w * m.ga; dA[a] += w * c * def[h];
      nD[a] += w * m.gh; dD[a] += w * c * att[h] * gam; nD[h] += w * m.ga; dD[h] += w * c * att[a];
      sgh += w * m.gh; egh += w * c * att[h] * def[a]; sg += w * (m.gh + m.ga); eg += w * (att[h] * def[a] * gam + att[a] * def[h]);
    }
    for (let i = 0; i < n; i++) { att[i] = (nA[i] + cfg.Kp * c * a0[i]) / (dA[i] + cfg.Kp * c); def[i] = (nD[i] + cfg.Kp * c * d0[i]) / (dD[i] + cfg.Kp * c); }
    let ma = 0, md = 0; for (let i = 0; i < n; i++) { ma += att[i]; md += def[i]; } ma /= n; md /= n; for (let i = 0; i < n; i++) { att[i] /= ma; def[i] /= md; }
    let e2 = 0; for (let i = 0; i < tr.length; i++) e2 += W[i] * att[H[i]] * def[A[i]];
    gam = sgh / Math.max(c * e2, 1e-9);
    let eg2 = 0; for (let i = 0; i < tr.length; i++) eg2 += W[i] * (att[H[i]] * def[A[i]] * gam + att[A[i]] * def[H[i]]);
    c = sg / Math.max(eg2, 1e-9);
  }
  let sw = 0, sh = 0, sa = 0; for (let i = 0; i < tr.length; i++) { sw += W[i]; sh += W[i] * tr[i].gh; sa += W[i] * tr[i].ga; }
  return { idx, att, def, c, gam, hAvg: sh / sw, aAvg: sa / sw, a0: 1, d0: 1, promoA: 0.85, promoD: 1.15 };
}
function modeloDC(ms, cfg, cb) {
  let lo = 0;
  porFecha(ms).forEach(grp => {
    const dayNow = grp.day; while (lo < ms.length && ms[lo].day < dayNow - cfg.win) lo++;
    let hi = lo; while (hi < ms.length && ms[hi].day < dayNow) hi++;
    const tr = ms.slice(lo, hi);
    if (tr.length < 60) return;
    const f = dcAjuste(tr, dayNow, cfg);
    const g0 = dist(f.hAvg, f.aAvg, cfg.rho);
    grp.ms.forEach(m => {
      const get = n => { const i = f.idx[n]; return i === undefined ? (cfg.promo ? { a: 0.85, d: 1.15 } : { a: 1, d: 1 }) : { a: f.att[i], d: f.def[i] }; };
      const x = get(m.h), y = get(m.a), lL = f.c * x.a * y.d * f.gam, lV = f.c * y.a * x.d;
      const d = dist(lL, lV, cfg.rho);
      cb(m, { p: d.p, o25: mezcla(d.o25, g0.o25, cfg.wt), bt: mezcla(d.bt, g0.bt, cfg.wt), lam: [lL, lV] });
    });
  });
}

/* ================= medidas ================= */
const llp = (p, y) => -Math.log(Math.max(p[y], 1e-9));
const rps = (p, y) => { const c1 = p[0] - (y === 0 ? 1 : 0), c2 = p[0] + p[1] - (y <= 1 ? 1 : 0); return (c1 * c1 + c2 * c2) / 2; };
const llb = (p, y) => -Math.log(Math.max(y ? p : 1 - p, 1e-9));
function calib(p, tau, dD) { const q = [Math.pow(p[0], tau), Math.pow(p[1], tau) * Math.exp(dD), Math.pow(p[2], tau)], s = q[0] + q[1] + q[2]; return [q[0] / s, q[1] / s, q[2] / s]; }
function pool(pm, pk, w) { const q = [Math.pow(pm[0], w) * Math.pow(pk[0], 1 - w), Math.pow(pm[1], w) * Math.pow(pk[1], 1 - w), Math.pow(pm[2], w) * Math.pow(pk[2], 1 - w)], s = q[0] + q[1] + q[2]; return [q[0] / s, q[1] / s, q[2] / s]; }
function poolB(pm, pk, w) { const z = w * L.logit(L.clip(pm, 1e-4, 1 - 1e-4)) + (1 - w) * L.logit(L.clip(pk, 1e-4, 1 - 1e-4)); return L.sig(z); }

/* corre un modelo en todas las ligas y guarda las predicciones en una tabla */
function correrTodo(porLiga, fn, cfg, key, store) {
  Object.keys(porLiga).forEach(lg => { fn(porLiga[lg], cfg, (m, x) => { (store.get(m) || store.set(m, {}).get(m))[key] = x; }); });
}
function perdidaTrain(store, key, que) {   // pérdida media en la temporada de ajuste
  let s = 0, n = 0; store.forEach((v, m) => { if (m.t !== TUNE || !v[key]) return; s += que === 'ou' ? llb(v[key].o25, m.gh + m.ga > 2.5 ? 1 : 0) : llp(v[key].p, m.y); n++; });
  return n ? s / n : Infinity;
}
function ajusteApp(porLiga, log) {
  const sub = {}; Object.keys(porLiga).forEach(lg => { sub[lg] = porLiga[lg].filter(m => m.t === '2122' || m.t === TUNE); });
  let best = { cfg: Object.assign({}, CFG_APP), l: null };
  const ev = c => { const st = new Map(); correrTodo(sub, modeloApp, c, 'x', st); return perdidaTrain(st, 'x', '1x2'); };
  const l0 = ev(CFG_APP); best.l = l0;
  [4, 6, 10, 16].forEach(K => [1.08, 1.13, 1.2, 1.3].forEach(h => [0, -0.08, -0.12].forEach(rho => [0, 10, 20].forEach(S => {
    const c = Object.assign({}, CFG_APP, { K, h, rho, S }), l = ev(c); if (l < best.l) best = { cfg: c, l };
  }))));
  const evO = c => { const st = new Map(); correrTodo(sub, modeloApp, c, 'x', st); return perdidaTrain(st, 'x', 'ou'); };
  let bo = { c: best.cfg, l: evO(best.cfg) }; const lo0 = bo.l;
  [8, 16, 30].forEach(Kt => [0.3, 0.5, 0.8, 1].forEach(wt => [0.95, 1, 1.05].forEach(ct => { const c = Object.assign({}, best.cfg, { Kt, wt, ct }), l = evO(c); if (l < bo.l) bo = { c, l }; })));
  log('Modelo del app, ajustado solo con 2022-23 (sin mirar el mercado): 1X2 ' + l0.toFixed(4) + ' -> ' + best.l.toFixed(4) + ' | Más/Menos 2.5 ' + lo0.toFixed(4) + ' -> ' + bo.l.toFixed(4));
  return bo.c;
}
function ajusteDC(porLiga, log) {
  const sub = {}; Object.keys(porLiga).forEach(lg => { sub[lg] = porLiga[lg].filter(m => m.t <= TUNE); });
  let best = { cfg: Object.assign({}, CFG_DC), l: null };
  const ev = c => { const st = new Map(); correrTodo(sub, modeloDC, c, 'x', st); return perdidaTrain(st, 'x', '1x2'); };
  best.l = ev(CFG_DC); const l0 = best.l;
  [0.3, 0.6, 1.0, 1.6].forEach(xi => [2, 5, 10].forEach(Kp => [0, -0.06, -0.12].forEach(rho => [0, 1].forEach(promo => {
    const c = Object.assign({}, CFG_DC, { xi, Kp, rho, promo }), l = ev(c); if (l < best.l) best = { cfg: c, l };
  }))));
  const evO = c => { const st = new Map(); correrTodo(sub, modeloDC, c, 'x', st); return perdidaTrain(st, 'x', 'ou'); };
  let bo = { c: best.cfg, l: evO(best.cfg) };
  [0.5, 0.75, 1].forEach(wt => { const c = Object.assign({}, best.cfg, { wt }), l = evO(c); if (l < bo.l) bo = { c, l }; });
  log('Dixon-Coles con peso por antigüedad, ajustado solo con 2022-23: 1X2 ' + l0.toFixed(4) + ' -> ' + best.l.toFixed(4) + ' | Más/Menos 2.5 ' + bo.l.toFixed(4));
  return bo.c;
}

/* ================= programa ================= */
async function main() {
  let out = '## Fútbol contra el mercado — ' + LIGAS.map(l => l[1]).join(', ') + '\n\n';
  const log = t => { out += t + '\n\n'; console.log(t); };
  const porLiga = {}; const diag = []; const fuentes = {};
  for (const [code, nombre] of LIGAS) {
    porLiga[code] = [];
    for (const t of TEMPS) {
      try {
        const txt = await L.pedir(urlCsv(t, code), 'text'), ms = leerPartidos(csvFilas(txt), t, code);
        ms.forEach(m => { const k = t + ' ' + (m.mkSrc || 'sin cuota'); fuentes[k] = (fuentes[k] || 0) + 1; });
        porLiga[code].push(...ms); diag.push(nombre + ' ' + t + ': ' + ms.length + ' partidos, con cuotas ' + ms.filter(m => m.mk).length + ', con Más/Menos ' + ms.filter(m => m.ou).length);
      } catch (e) { diag.push(nombre + ' ' + t + ': NO DISPONIBLE (' + e.message.slice(0, 80) + ')'); }
    }
    porLiga[code].sort((a, b) => a.d - b.d);
  }
  log('### Datos\n```\n' + diag.join('\n') + '\n\nFuente de la cuota usada como "mercado" (partidos):\n' + Object.keys(fuentes).sort().map(k => '  ' + k + ': ' + fuentes[k]).join('\n') + '\n```');
  const total = Object.values(porLiga).reduce((a, b) => a + b.length, 0);
  const testTemps = TEMPS.filter(t => t > TUNE);
  if (total < 1500 || !testTemps.length) { log('NO TERMINO: muy pocos partidos descargados (' + total + ').'); return fin(out, true); }

  const cApp = ajusteApp(porLiga, log), cDC = ajusteDC(porLiga, log);
  log('```\nParametros app reajustados: ' + JSON.stringify(cApp) + '\nParametros Dixon-Coles: ' + JSON.stringify(cDC) + '\n```');
  const store = new Map();
  correrTodo(porLiga, modeloApp, CFG_APP, 'F0', store); correrTodo(porLiga, modeloApp, cApp, 'F1', store); correrTodo(porLiga, modeloDC, cDC, 'F2', store);
  // calibracion (tau y empates) del Dixon-Coles con la temporada de ajuste
  let bc = { tau: 1, dD: 0, l: Infinity };
  [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15].forEach(tau => [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15].forEach(dD => {
    let s = 0, n = 0; store.forEach((v, m) => { if (m.t !== TUNE || !v.F2) return; s += llp(calib(v.F2.p, tau, dD), m.y); n++; }); const l = s / Math.max(n, 1); if (l < bc.l) bc = { tau, dD, l };
  }));
  store.forEach(v => { if (v.F2) v.F3 = { p: calib(v.F2.p, bc.tau, bc.dD), o25: v.F2.o25, bt: v.F2.bt, lam: v.F2.lam }; });
  log('Calibración del Dixon-Coles (solo 2022-23): potencia ' + bc.tau + ', empates ' + (bc.dD >= 0 ? '+' : '') + bc.dD);
  const NOM = { F0: 'F0 app actual', F1: 'F1 app reajustado', F2: 'F2 Dixon-Coles (antigüedad)', F3: 'F3 Dixon-Coles calibrado' };
  const KEYS = ['F0', 'F1', 'F2', 'F3'];
  const rows = []; store.forEach((v, m) => { if (testTemps.includes(m.t) && m.mk && KEYS.every(k => v[k])) rows.push({ m, v }); });
  const temps = [...new Set(rows.map(r => r.m.t))].sort();
  log('Partidos medidos (con cuota de mercado y modelo listo): ' + rows.length + ' (' + temps.map(t => t + ': ' + rows.filter(r => r.m.t === t).length).join(', ') + ')');
  if (rows.length < 300) { log('NO TERMINO: pocos partidos con cuotas (' + rows.length + ').'); return fin(out, true); }

  // base: frecuencias de 2022-23
  const fr = [0, 0, 0]; let nb = 0; store.forEach((v, m) => { if (m.t === TUNE) { fr[m.y]++; nb++; } }); const base = fr.map(x => x / nb);
  // 1) tabla principal
  const dRef = (key, f) => rows.map(r => f(r.v[key].p, r.m.y) - f(r.m.mk, r.m.y));
  let t1 = []; KEYS.forEach(k => { const d = L.ms(dRef(k, llp)), dr = L.ms(dRef(k, rps)); t1.push([NOM[k], L.f(L.ms(rows.map(r => llp(r.v[k].p, r.m.y))).m, 4), L.f(L.ms(rows.map(r => rps(r.v[k].p, r.m.y))).m, 4), L.f(d.m, 4) + ' ± ' + L.f(2 * d.se, 4), L.f(d.z, 1), L.veredicto(d)]); });
  const mkLL = L.ms(rows.map(r => llp(r.m.mk, r.m.y))).m, mkR = L.ms(rows.map(r => rps(r.m.mk, r.m.y))).m, bL = L.ms(rows.map(r => llp(base, r.m.y))).m;
  t1.push(['MERCADO (sin vig)', L.f(mkLL, 4), L.f(mkR, 4), '—', '—', '—']); t1.push(['Solo frecuencias de la liga', L.f(bL, 4), L.f(L.ms(rows.map(r => rps(base, r.m.y))).m, 4), '—', '—', '—']);
  log('### 1) Resultado 1X2 (local/empate/visita): modelo contra la cuota de cierre\nPérdida log y RPS: menor = mejor. "dif" = modelo − mercado (positivo = el mercado acierta más).\n\n' + L.tabla(['Modelo', 'Pérdida log', 'RPS', 'dif ± 2·se', 'z', 'Veredicto'], t1));
  // por temporada y por liga (F3)
  let t2 = []; temps.forEach(t => { const rr = rows.filter(r => r.m.t === t), d = L.ms(rr.map(r => llp(r.v.F3.p, r.m.y) - llp(r.m.mk, r.m.y))); t2.push(['Temporada ' + t, rr.length, L.f(d.m, 4), L.f(d.z, 1), L.veredicto(d)]); });
  LIGAS.forEach(l => { const rr = rows.filter(r => r.m.lg === l[0]); if (rr.length < 100) return; const d = L.ms(rr.map(r => llp(r.v.F3.p, r.m.y) - llp(r.m.mk, r.m.y))); t2.push([l[1], rr.length, L.f(d.m, 4), L.f(d.z, 1), L.veredicto(d)]); });
  const rPin = rows.filter(r => r.m.mkSrc === 'Pinnacle cierre'); if (rPin.length > 200) { const d = L.ms(rPin.map(r => llp(r.v.F3.p, r.m.y) - llp(r.m.mk, r.m.y))); t2.push(['Solo donde el mercado es Pinnacle cierre', rPin.length, L.f(d.m, 4), L.f(d.z, 1), L.veredicto(d)]); }
  log('F3 (Dixon-Coles calibrado) contra el mercado, por partes\n\n' + L.tabla(['Grupo', 'Partidos', 'dif pérdida', 'z', 'Veredicto'], t2));
  // 2) sesgos
  let t3 = []; KEYS.concat(['MK']).forEach(k => { const f = i => rows.reduce((a, r) => a + (k === 'MK' ? r.m.mk[i] : r.v[k].p[i]), 0) / rows.length; t3.push([k === 'MK' ? 'Mercado' : NOM[k], L.pc(f(0)), L.pc(f(1)), L.pc(f(2))]); });
  const real = [0, 1, 2].map(i => rows.filter(r => r.m.y === i).length / rows.length); t3.push(['REAL', L.pc(real[0]), L.pc(real[1]), L.pc(real[2])]);
  log('### 2) Promedio de lo que dice cada uno vs lo que pasó (sesgo)\n\n' + L.tabla(['', 'Local', 'Empate', 'Visita'], t3));
  // 3) mezcla fuera de muestra
  const W = []; for (let w = 0; w <= 1.0001; w += 0.05) W.push(Math.round(w * 100) / 100);
  let t4 = [], pool3 = {};
  ['F0', 'F3'].forEach(k => {
    const d = [], lams = [];
    temps.forEach(t => {
      const tr = rows.filter(r => r.m.t !== t), te = rows.filter(r => r.m.t === t); if (tr.length < 300) return;
      let bw = 0, bl = Infinity; W.forEach(w => { const l = tr.reduce((a, r) => a + llp(pool(r.v[k].p, r.m.mk, w), r.m.y), 0) / tr.length; if (l < bl) { bl = l; bw = w; } });
      lams.push(t + ':' + bw.toFixed(2)); te.forEach(r => d.push(llp(pool(r.v[k].p, r.m.mk, bw), r.m.y) - llp(r.m.mk, r.m.y)));
    });
    const q = L.ms(d); pool3[k] = q; t4.push([NOM[k], lams.join(' '), L.f(q.m, 5) + ' ± ' + L.f(2 * q.se, 5), L.f(q.z, 1)]);
  });
  log('### 3) Mezcla mercado + modelo (se ajusta en las otras temporadas, se prueba en una)\nProbabilidad = mercado^(1−w) · modelo^w, normalizada. w=0 es el mercado solo. Dif negativa = la mezcla le gana al mercado.\n\n' + L.tabla(['Modelo', 'peso w por temporada', 'dif vs mercado ± 2·se', 'z'], t4));
  // 4) ROI
  const roiTab = (key, etq) => {
    const f = [];
    [0.02, 0.04, 0.06, 0.08, 0.10].forEach(t => {
      const cols = [];
      [['ps', 'Pinnacle'], ['avg', 'Promedio'], ['mx', 'Mejor cuota']].forEach(([c, nom]) => {
        const rets = [];
        rows.forEach(r => { const o = r.m[c]; if (!o) return; let bi = -1, be = -9; [0, 1, 2].forEach(i => { const e = r.v[key].p[i] - r.m.mk[i]; if (e > be) { be = e; bi = i; } }); if (be < t) return; rets.push(r.m.y === bi ? o[bi] - 1 : -1); });
        const q = L.ms(rets); cols.push(q.n + ' ap. · ' + L.pc(q.m) + ' ± ' + L.pc(2 * q.se));
      });
      f.push(['≥ ' + Math.round(t * 100) + ' pts de ventaja'].concat(cols));
    });
    return '**' + etq + '**\n\n' + L.tabla(['Ventaja del modelo vs mercado', 'a cuota Pinnacle', 'a cuota promedio', 'a la mejor cuota (techo optimista)'], f);
  };
  log('### 4) Dinero: apostar 1 unidad al resultado donde el modelo ve más ventaja (con el vig real incluido)\n\n' + roiTab('F3', 'F3 Dixon-Coles calibrado') + '\n' + roiTab('F0', 'F0 app actual'));
  // 5) Más/Menos 2.5
  const rO = rows.filter(r => r.m.ou != null);
  if (rO.length > 300) {
    let t5 = []; KEYS.forEach(k => { const d = L.ms(rO.map(r => llb(r.v[k].o25, r.m.gh + r.m.ga > 2.5 ? 1 : 0) - llb(r.m.ou, r.m.gh + r.m.ga > 2.5 ? 1 : 0))); t5.push([NOM[k], L.f(L.ms(rO.map(r => llb(r.v[k].o25, r.m.gh + r.m.ga > 2.5 ? 1 : 0))).m, 4), L.f(d.m, 4) + ' ± ' + L.f(2 * d.se, 4), L.f(d.z, 1), L.veredicto(d)]); });
    const mO = L.ms(rO.map(r => llb(r.m.ou, r.m.gh + r.m.ga > 2.5 ? 1 : 0))).m, pO = rO.filter(r => r.m.gh + r.m.ga > 2.5).length / rO.length;
    t5.push(['MERCADO (sin vig)', L.f(mO, 4), '—', '—', '—']); t5.push(['Siempre la frecuencia (' + L.pc(pO) + ' over)', L.f(L.ms(rO.map(r => llb(pO, r.m.gh + r.m.ga > 2.5 ? 1 : 0))).m, 4), '—', '—', '—']);
    log('### 5) Más/Menos 2.5 goles: modelo contra la cuota de cierre (' + rO.length + ' partidos)\n\n' + L.tabla(['Modelo', 'Pérdida', 'dif vs mercado ± 2·se', 'z', 'Veredicto'], t5));
    const dP = [], lams = [];
    temps.forEach(t => { const tr = rO.filter(r => r.m.t !== t), te = rO.filter(r => r.m.t === t); if (tr.length < 300) return; let bw = 0, bl = Infinity;
      W.forEach(w => { const l = tr.reduce((a, r) => a + llb(poolB(r.v.F3.o25, r.m.ou, w), r.m.gh + r.m.ga > 2.5 ? 1 : 0), 0) / tr.length; if (l < bl) { bl = l; bw = w; } });
      lams.push(t + ':' + bw.toFixed(2)); te.forEach(r => dP.push(llb(poolB(r.v.F3.o25, r.m.ou, bw), r.m.gh + r.m.ga > 2.5 ? 1 : 0) - llb(r.m.ou, r.m.gh + r.m.ga > 2.5 ? 1 : 0))); });
    const qO = L.ms(dP); log('Mezcla Más/Menos (F3 + mercado) fuera de muestra: w ' + lams.join(' ') + ' | dif ' + L.f(qO.m, 5) + ' ± ' + L.f(2 * qO.se, 5) + ' (z ' + L.f(qO.z, 1) + ')');
    let t6 = []; [0.03, 0.05, 0.07].forEach(t => { const cols = [];
      [['ouPs', 'Pinnacle'], ['ouAvg', 'Promedio']].forEach(([c, nom]) => { const rets = []; rO.forEach(r => { const o = r.m[c]; if (!o) return; const e = r.v.F3.o25 - r.m.ou, over = r.m.gh + r.m.ga > 2.5; if (e >= t) rets.push(over ? o[0] - 1 : -1); else if (-e >= t) rets.push(over ? -1 : o[1] - 1); }); const q = L.ms(rets); cols.push(q.n + ' ap. · ' + L.pc(q.m) + ' ± ' + L.pc(2 * q.se)); });
      t6.push(['≥ ' + Math.round(t * 100) + ' pts'].concat(cols)); });
    log(L.tabla(['Ventaja del modelo (Más/Menos 2.5)', 'a cuota Pinnacle', 'a cuota promedio'], t6));
  }
  // 6) resumen
  const zF3 = L.ms(dRef('F3', llp)).z, zF0 = L.ms(dRef('F0', llp)).z;
  log('### Resumen para decidir\n```\nF0 (app actual) vs mercado: z ' + zF0.toFixed(1) + ' | F3 (Dixon-Coles calibrado) vs mercado: z ' + zF3.toFixed(1) + ' (positivo = el mercado gana)\nMezcla fuera de muestra F3+mercado: dif ' + L.f(pool3.F3.m, 5) + ' (z ' + L.f(pool3.F3.z, 1) + ')\nParametros recomendados para el app (Dixon-Coles): ' + JSON.stringify(cDC) + ' + calibración ' + JSON.stringify({ tau: bc.tau, dD: bc.dD }) + '\nParametros del modelo actual reajustados: ' + JSON.stringify(cApp) + '\n```');
  fs.writeFileSync('resultado_futbol.json', JSON.stringify({ cApp, cDC, calib: bc, n: rows.length }, null, 1));
  return fin(out, false);
}
function fin(out, fallo) { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n'); if (require.main === module) process.exit(fallo ? 1 : 0); return fallo; }
module.exports = { main, csvFilas, leerPartidos, modeloApp, modeloDC, dist, CFG_APP, CFG_DC, fechaCsv };
if (false) main().catch(e => { console.error(e); process.exit(1); });

return module.exports;
})();

(async function () {
  const que = String(process.argv[2] || process.env.DEPORTE || 'ambos').toLowerCase();
  let fallo = false;
  if (que === 'nba' || que === 'ambos') { try { if (await NBA.main()) fallo = true; } catch (e) { console.error('NBA fallo:', e); fallo = true; if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## NBA: ERROR\n' + String(e && e.stack || e) + '\n'); } }
  if (que === 'futbol' || que === 'ambos') { try { if (await FUT.main()) fallo = true; } catch (e) { console.error('Futbol fallo:', e); fallo = true; if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## Futbol: ERROR\n' + String(e && e.stack || e) + '\n'); } }
  process.exit(fallo ? 1 : 0);
})();
