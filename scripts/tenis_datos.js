/* ===================================================================
   OVA · TENIS: datos, ratings y medición (corre en GitHub Actions: .github/workflows/tenis.yml)
   1) Baja de ESPN todos los partidos de individuales ATP y WTA desde 2023 (cache en la rama datos-tenis,
      después solo lo nuevo) → partidos-tenis.json
   2) Recorre los partidos en orden y mide, prediciendo cada uno SOLO con lo de antes:
      peso de la superficie, prior por ranking, aciertos por tramo de probabilidad, sets, primer set y games.
   3) Escribe ratings-tenis.json (lo lee tenis.html): ratings al día, parámetros medidos y la medición.
   Uso: node scripts/tenis_datos.js            (baja + mide)
        node scripts/tenis_datos.js --sin-red  (solo mide con el cache)
   =================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const T = require('../modelo-tenis.js');

const RAIZ = path.join(__dirname, '..');
const CACHE = path.join(RAIZ, 'partidos-tenis.json');
const SALIDA = path.join(RAIZ, 'ratings-tenis.json');
const INICIO = '20230101';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/tennis/';
const SIN_RED = process.argv.includes('--sin-red');

const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const deYmd = s => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- 1. bajar ---------------- */
async function getJSON(url, intentos) {
  for (let i = 0; i < (intentos || 3); i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'ova-tenis/1.0' }, signal: AbortSignal.timeout(40000) });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch (e) { }
    await dormir(1500 * (i + 1));
  }
  return null;
}
const cod = href => { const m = /countries\/500\/([a-z]+)\.png/i.exec(href || ''); return m ? m[1].toLowerCase() : ''; };
function leerEventos(j, db) {
  let n = 0;
  ((j && j.events) || []).forEach(e => {
    const evId = String(e.id || '');
    (e.groupings || []).forEach(g => {
      const slug = (g.grouping && g.grouping.slug) || '';
      const tour = slug === 'mens-singles' ? 'a' : (slug === 'womens-singles' ? 'w' : null);
      if (!tour) return;
      db.ev[evId] = { n: e.name || '', mj: e.major ? 1 : 0, ts: Date.parse(e.date) || 0 };
      (g.competitions || []).forEach(c => {
        const st = (c.status && c.status.type && c.status.type.name) || '';
        const fin = st === 'STATUS_FINAL' ? 'F' : (st === 'STATUS_RETIRED' ? 'R' : (st === 'STATUS_WALKOVER' ? 'W' : null));
        if (!fin || !c.competitors || c.competitors.length !== 2) return;
        const w = c.competitors.find(x => x.winner === true), l = c.competitors.find(x => x.winner !== true);
        if (!w || !l || !w.athlete || !l.athlete) return;
        [w, l].forEach(x => { db.jug[x.id] = [x.athlete.displayName || x.athlete.fullName || '', cod(x.athlete.flag && x.athlete.flag.href)]; });
        const sets = [];
        (w.linescores || []).forEach((s, i) => { const o = (l.linescores || [])[i]; if (o && isFinite(s.value) && isFinite(o.value)) sets.push(s.value + '-' + o.value); });
        const rk = x => (x.curatedRank && x.curatedRank.current) || 0;
        const ts = Math.round((Date.parse(c.date || c.startDate) || db.ev[evId].ts) / 1000);
        db.m[c.id] = [String(c.id), ts, tour, evId, (c.round && c.round.displayName) || '', String(w.id), String(l.id), sets.join(' '), fin, rk(w), rk(l)];
        n++;
      });
    });
  });
  return n;
}
async function bajar() {
  let db = { v: 1, hasta: '', ev: {}, jug: {}, m: {} };
  if (fs.existsSync(CACHE)) {
    try { const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); db = { v: 1, hasta: c.hasta || '', ev: c.ev || {}, jug: c.jug || {}, m: {} }; (c.m || []).forEach(x => db.m[x[0]] = x); }
    catch (e) { console.log('cache dañado, empiezo de cero'); }
  }
  const antes = Object.keys(db.m).length;
  if (process.env.TENIS_LOCAL) {   // pruebas: lee marcadores de ESPN guardados en una carpeta
    fs.readdirSync(process.env.TENIS_LOCAL).filter(f => /\.json$/.test(f)).forEach(f => leerEventos(JSON.parse(fs.readFileSync(path.join(process.env.TENIS_LOCAL, f), 'utf8')), db));
    return db;
  }
  if (SIN_RED) return db;
  const hoy = new Date(); const fin = new Date(hoy.getTime() + 864e5);
  let d = db.hasta ? new Date(deYmd(db.hasta).getTime() - 21 * 864e5) : deYmd(INICIO);
  const fechas = [];
  for (; d <= fin; d = new Date(d.getTime() + 3 * 864e5)) fechas.push(ymd(d));
  console.log('Fechas a pedir:', fechas.length, 'x 2 circuitos (desde', fechas[0] + ')');
  const tareas = []; fechas.forEach(f => ['atp', 'wta'].forEach(t => tareas.push(ESPN + t + '/scoreboard?dates=' + f)));
  ['atp', 'wta'].forEach(t => tareas.push(ESPN + t + '/scoreboard'));
  let i = 0, fallos = 0;
  async function trabajador() {
    while (i < tareas.length) {
      const u = tareas[i++]; const j = await getJSON(u);
      if (!j) fallos++; else leerEventos(j, db);
      await dormir(120);
    }
  }
  await Promise.all([1, 2, 3, 4].map(trabajador));
  db.hasta = ymd(hoy);
  console.log('Partidos: antes', antes, '→ ahora', Object.keys(db.m).length, '· pedidos fallidos', fallos, 'de', tareas.length);
  fs.writeFileSync(CACHE, JSON.stringify({ v: 1, hasta: db.hasta, ev: db.ev, jug: db.jug, m: Object.values(db.m) }));
  return db;
}

/* ---------------- 2. recorrer y medir ---------------- */
const esQ = r => /qualif/i.test(r);
function bo5De(m, ev) {   // a 5 sets: lo dicen los sets jugados (el ganador hizo 3)
  const sets = m[7] ? m[7].split(' ') : []; let g = 0;
  sets.forEach(s => { const [a, b] = s.split('-').map(Number); if (a > b) g++; });
  if (g >= 3) return true;
  return !!(ev && ev.mj && m[2] === 'a' && !esQ(m[4]) && g >= 3);
}
function games(m) { let a = 0, b = 0; (m[7] ? m[7].split(' ') : []).forEach(s => { const [x, y] = s.split('-').map(Number); if (isFinite(x) && isFinite(y)) { a += Math.min(x, 7); b += Math.min(y, 7); } }); return [a, b]; }
// ESPN a veces pone el tiebreak dentro del set (ej. 7-6 sale 7-6); con Math.min(…,7) basta

function recorrer(lista, db, op) {
  const w = op.w, pr = op.prior, kM = op.kM || 1, desde = op.desde || '20240101';
  const R = {};   // id → {all, n, sup:{H,C,G}, nS:{H,C,G}, rk, last, forma:[]}
  const preds = [];
  const ini = (id, rk) => { if (R[id]) return R[id]; const e = pr ? T.prior(rk, pr) : 1500; return (R[id] = { all: e, n: 0, sup: { H: e, C: e, G: e }, nS: { H: 0, C: 0, G: 0 }, rk: rk || 0, last: 0, forma: [] }); };
  const desdeTs = deYmd(desde).getTime() / 1000;
  lista.forEach(m => {
    const ev = db.ev[m[3]] || {}, sup = T.superficie(ev.n, m[1] * 1000);
    const W = ini(m[5], m[9]), L = ini(m[6], m[10]);
    if (m[9]) W.rk = m[9]; if (m[10]) L.rk = m[10];
    if (m[8] === 'W') return;
    const rW = T.mezcla(W.all, W.sup[sup], w), rL = T.mezcla(L.all, L.sup[sup], w);
    const pW = T.probElo(rW, rL);
    if (m[1] >= desdeTs && op.guardar) {
      preds.push({ ts: m[1], tour: m[2], sup, q: esQ(m[4]), fin: m[8], pW, nW: W.n, nL: L.n, rkW: m[9], rkL: m[10], bo5: bo5De(m, ev), mj: !!ev.mj, g: games(m), sets: m[7], wId: m[5], lId: m[6] });
    }
    // actualizar
    const kW = T.kElo(W.n, kM), kL = T.kElo(L.n, kM);
    const pA = T.probElo(W.all, L.all);
    W.all += kW * (1 - pA); L.all -= kL * (1 - pA);
    const pS = T.probElo(W.sup[sup], L.sup[sup]);
    const ksW = T.kElo(W.nS[sup], kM), ksL = T.kElo(L.nS[sup], kM);
    W.sup[sup] += ksW * (1 - pS); L.sup[sup] -= ksL * (1 - pS);
    W.n++; L.n++; W.nS[sup]++; L.nS[sup]++;
    W.last = L.last = m[1];
    W.forma.push('V'); L.forma.push('D'); if (W.forma.length > 10) W.forma.shift(); if (L.forma.length > 10) L.forma.shift();
  });
  return { R, preds };
}
const ll = (p, y) => -(y ? Math.log(Math.max(p, 1e-6)) : Math.log(Math.max(1 - p, 1e-6)));
function resumen(preds, filtro) {
  const ps = preds.filter(p => p.fin === 'F' && (!filtro || filtro(p)));
  let ac = 0, lo = 0, br = 0;
  ps.forEach(p => { const pf = Math.max(p.pW, 1 - p.pW); if (p.pW > 0.5) ac++; else if (p.pW === 0.5) ac += 0.5; lo += ll(p.pW, 1); br += (1 - p.pW) * (1 - p.pW); });
  const n = ps.length || 1;
  return { n: ps.length, acierto: +(ac / n).toFixed(4), logloss: +(lo / n).toFixed(4), brier: +(br / n).toFixed(4) };
}
const BANDAS = [[0.5, 0.55], [0.55, 0.6], [0.6, 0.65], [0.65, 0.7], [0.7, 0.75], [0.75, 0.8], [0.8, 0.85], [0.85, 0.9], [0.9, 1.01]];
function porBanda(preds, filtro) {
  return BANDAS.map(([a, b]) => {
    const ps = preds.filter(p => p.fin === 'F' && (!filtro || filtro(p))).filter(p => { const f = Math.max(p.pW, 1 - p.pW); return f >= a && f < b; });
    let ac = 0, pm = 0; ps.forEach(p => { if (p.pW >= 0.5) ac++; pm += Math.max(p.pW, 1 - p.pW); });
    return { de: a, a: Math.min(b, 1), n: ps.length, dice: ps.length ? +(pm / ps.length).toFixed(3) : null, gano: ps.length ? +(ac / ps.length).toFixed(3) : null };
  });
}
function regresion(xs, ys) { const n = xs.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { b, a: (sy - b * sx) / n }; }


/* ---------- tablas empíricas de sets y games por probabilidad del favorito ---------- */
const BANDAS_E = [[0.5, 0.55], [0.55, 0.6], [0.6, 0.65], [0.65, 0.7], [0.7, 0.75], [0.75, 0.8], [0.8, 0.85], [0.85, 0.9], [0.9, 1.01]];
const BANDAS_5 = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.01]];
const favEsW = p => p.pW >= 0.5;
function setsFav(p) { let f = 0, r = 0; p.sets.split(' ').forEach(x => { const [a, b] = x.split('-').map(Number); const gW = a > b; if (gW === favEsW(p)) f++; else r++; }); return [f, r]; }
const favGanaSinSet = p => { const [f, r] = setsFav(p); return f > r && r === 0; };
const favSet1 = p => { const [a, b] = p.sets.split(' ')[0].split('-').map(Number); return (a > b) === favEsW(p); };
const favDif = p => favEsW(p) ? p.g[0] - p.g[1] : p.g[1] - p.g[0];
function tablas(ps, bandas) {
  // s: [fav gana sin perder set, fav gana perdiendo set(s), fav pierde ganando set(s), fav pierde sin ganar set]
  return bandas.map(([x, y]) => {
    const L = ps.filter(p => Math.max(p.pW, 1 - p.pW) >= x && Math.max(p.pW, 1 - p.pW) < y);
    const t = { de: x, a: Math.min(y, 1), n: L.length, s: [0, 0, 0, 0], s1: 0, tot: {}, dif: {} };
    L.forEach(p => {
      const [f, r] = setsFav(p); t.s[f > r ? (r === 0 ? 0 : 1) : (f === 0 ? 3 : 2)]++;
      if (favSet1(p)) t.s1++;
      const tg = p.g[0] + p.g[1], d = favDif(p); t.tot[tg] = (t.tot[tg] || 0) + 1; t.dif[d] = (t.dif[d] || 0) + 1;
    });
    return t;
  });
}
function buscar(tab, sup, pW) {
  const f = Math.max(pW, 1 - pW), L = tab[sup] && tab[sup].find(t => f >= t.de && f < t.a + (t.a >= 1 ? 0.01 : 0));
  if (L && L.n >= 60) return L;
  return (tab['*'] || []).find(t => f >= t.de && f < t.a + (t.a >= 1 ? 0.01 : 0)) || null;
}
const masDe = (t, L) => { let x = 0; for (const k in t.tot) if (+k > L) x += t.tot[k]; return x / t.n; };
const cubre = (t, L) => { let x = 0; for (const k in t.dif) if (+k + L > 0) x += t.dif[k]; return x / t.n; };
// prueba: el modelo elige el lado con más de 50%; se compara con elegir siempre el lado más común
function probar(ps, prob, si, ladoComunSi) {
  let n = 0, ac = 0, nF = 0, acF = 0, base = 0;
  ps.forEach(p => {
    const q = prob(p); if (q == null) return; const y = si(p);
    n++; if ((q >= 0.5) === y) ac++; if (y === ladoComunSi) base++;
    if (Math.abs(q - 0.5) >= 0.08) { nF++; if ((q >= 0.5) === y) acF++; }
  });
  return { n, acierto: n ? +(ac / n).toFixed(3) : null, siempreLoComun: n ? +(base / n).toFixed(3) : null, fuertes: { n: nF, acierto: nF ? +(acF / nF).toFixed(3) : null } };
}

function main() {
  return bajar().then(db => {
    const lista = Object.values(db.m).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    console.log('Partidos en total:', lista.length, '· ATP', lista.filter(m => m[2] === 'a').length, '· WTA', lista.filter(m => m[2] === 'w').length);
    const porTour = { a: lista.filter(m => m[2] === 'a'), w: lista.filter(m => m[2] === 'w') };
    const out = { gen: new Date().toISOString(), hasta: db.hasta, partidos: lista.length, params: {}, medicion: {}, jug: {} };
    ['a', 'w'].forEach(tour => {
      const L = porTour[tour]; if (!L.length) return;
      const nomTour = tour === 'a' ? 'ATP' : 'WTA';
      // prior por ranking: elo de jugadores con 30+ partidos contra ln(ranking)
      const r0 = recorrer(L, db, { w: 0.5, prior: null });
      const xs = [], ys = [];
      Object.values(r0.R).forEach(j => { if (j.n >= 30 && j.rk > 0 && j.rk < 1000) { xs.push(Math.log(j.rk)); ys.push(j.all); } });
      const rg = xs.length > 30 ? regresion(xs, ys) : { a: 2150, b: -95 };
      const pr = { a: +rg.a.toFixed(1), b: +(-rg.b).toFixed(1), base: 1500 };
      // variantes: peso de superficie × prior sí/no × K
      const variantes = [];
      [0, 0.25, 0.5, 0.75, 1].forEach(w => [null, pr].forEach(p => [0.8, 1, 1.25].forEach(kM => {
        const r = recorrer(L, db, { w, prior: p, kM, guardar: true });
        const ent = resumen(r.preds, x => x.ts < Date.UTC(2026, 0, 1) / 1000);
        const test = resumen(r.preds, x => x.ts >= Date.UTC(2026, 0, 1) / 1000);
        variantes.push({ w, prior: !!p, kM, ent, test });
      })));
      variantes.sort((a, b) => a.ent.logloss - b.ent.logloss);
      const mejor = variantes[0];
      console.log(nomTour, 'mejor variante:', JSON.stringify(mejor));
      const fin = recorrer(L, db, { w: mejor.w, prior: mejor.prior ? pr : null, kM: mejor.kM, guardar: true });
      const P = fin.preds;
      // sets y games: tablas de lo que pasó de verdad según la probabilidad del favorito (no Markov: el Markov
      // daba menos 2-0 de los reales y su total de games acertaba menos que una moneda)
      const C26 = Date.UTC(2026, 0, 1) / 1000;
      const terminados = P.filter(p => p.fin === 'F' && p.sets);
      const tEnt = terminados.filter(p => p.ts < C26), tTest = terminados.filter(p => p.ts >= C26);
      const emp = { bo3: {}, bo5: null };
      ['H', 'C', 'G', '*'].forEach(sup => { emp.bo3[sup] = tablas(terminados.filter(p => !p.bo5 && (sup === '*' || p.sup === sup)), BANDAS_E); });
      if (tour === 'a') emp.bo5 = tablas(terminados.filter(p => p.bo5), BANDAS_5);
      // prueba honesta: tablas con 2024-2025, se juzgan en 2026
      const empEnt = {}; ['H', 'C', 'G', '*'].forEach(sup => { empEnt[sup] = tablas(tEnt.filter(p => !p.bo5 && (sup === '*' || p.sup === sup)), BANDAS_E); });
      const totales = {}, hcp = {}, sets20 = {};
      ['H', 'C', 'G'].forEach(sup => {
        const ent = tEnt.filter(p => !p.bo5 && p.sup === sup), ps = tTest.filter(p => !p.bo5 && p.sup === sup);
        if (ent.length < 200 || !ps.length) return;
        const reales = ent.map(p => p.g[0] + p.g[1]).sort((x, y) => x - y), linea = reales[Math.floor(reales.length / 2)] + 0.5;
        const freqMas = ent.filter(p => p.g[0] + p.g[1] > linea).length / ent.length;
        totales[sup] = probar(ps, p => { const t = buscar(empEnt, sup, p.pW); return t ? masDe(t, linea) : null; }, p => p.g[0] + p.g[1] > linea, freqMas >= 0.5);
        totales[sup].linea = linea; totales[sup].mediaReal = +(reales.reduce((x, y) => x + y, 0) / reales.length).toFixed(2);
        hcp[sup] = probar(ps, p => { const t = buscar(empEnt, sup, p.pW); return t ? cubre(t, -3.5) : null; }, p => favDif(p) > 3.5, false);
        sets20[sup] = probar(ps, p => { const t = buscar(empEnt, sup, p.pW); return t ? t.s[0] / t.n : null; }, p => favGanaSinSet(p), false);
      });
      const bS = BANDAS_E.map(([x, y]) => {
        const ps = tTest.filter(p => !p.bo5 && Math.max(p.pW, 1 - p.pW) >= x && Math.max(p.pW, 1 - p.pW) < y);
        const t = buscar(empEnt, '*', (x + y) / 2);
        return { de: x, a: Math.min(y, 1), n: ps.length, fav20: { dice: t ? +(t.s[0] / t.n).toFixed(3) : null, real: ps.length ? +(ps.filter(favGanaSinSet).length / ps.length).toFixed(3) : null }, set1: { dice: t ? +(t.s1 / t.n).toFixed(3) : null, real: ps.length ? +(ps.filter(favSet1).length / ps.length).toFixed(3) : null } };
      });
      const base = null;
      // a 5 sets (Grand Slam masculino): ¿convertir la probabilidad a 5 sets mejora?
      let bo5 = null;
      if (tour === 'a') {
        const ps = P.filter(p => p.fin === 'F' && p.bo5);
        const BB = { H: 0.63, C: 0.62, G: 0.65 };
        let l3 = 0, l5 = 0, a3 = 0;
        ps.forEach(p => { const b = BB[p.sup] || 0.63, d = T.ventaja(p.pW, b, b), p5 = T.pMatchRapido(Math.min(b + d, .92), Math.max(b - d, .3), 5); l3 += ll(p.pW, 1); l5 += ll(p5, 1); if (p.pW > 0.5) a3++; });
        bo5 = ps.length ? { n: ps.length, logloss3: +(l3 / ps.length).toFixed(4), logloss5: +(l5 / ps.length).toFixed(4), acierto: +(a3 / ps.length).toFixed(3), usar5: l5 < l3 } : null;
      }
      // línea base: gana el de mejor ranking
      const conRk = P.filter(p => p.fin === 'F' && p.rkW > 0 && p.rkL > 0 && p.rkW !== p.rkL);
      const rkAc = conRk.filter(p => p.rkW < p.rkL).length / (conRk.length || 1);
      const modAc = conRk.filter(p => p.pW > 0.5).length / (conRk.length || 1);
      const anios = {}; P.forEach(p => { const y = new Date(p.ts * 1000).getUTCFullYear(); (anios[y] = anios[y] || []).push(p); });
      out.params[tour] = { w: mejor.w, kM: mejor.kM, prior: mejor.prior ? pr : { a: pr.a, b: pr.b, base: 1500, usar: false }, bo5: bo5 ? bo5.usar5 : true };
      out.emp = out.emp || {}; out.emp[tour] = emp;
      if (out.params[tour].prior.usar === undefined) out.params[tour].prior.usar = true;
      out.medicion[tour] = {
        partidos: L.length,
        variantes: variantes.map(v => ({ w: v.w, prior: v.prior, kM: v.kM, ent: v.ent, test: v.test })),
        mejor: { w: mejor.w, prior: mejor.prior, kM: mejor.kM },
        global: resumen(P), por2026: resumen(P, p => p.ts >= Date.UTC(2026, 0, 1) / 1000),
        anios: Object.fromEntries(Object.entries(anios).map(([y, ps]) => [y, resumen(ps)])),
        superficie: Object.fromEntries(['H', 'C', 'G'].map(s => [s, resumen(P, p => p.sup === s)])),
        cuadro: resumen(P, p => !p.q), clasificacion: resumen(P, p => p.q),
        pocosDatos: resumen(P, p => Math.min(p.nW, p.nL) < 10), conDatos: resumen(P, p => Math.min(p.nW, p.nL) >= 10),
        bandas: porBanda(P), bandas2026: porBanda(P, p => p.ts >= Date.UTC(2026, 0, 1) / 1000), bandasConDatos: porBanda(P, p => Math.min(p.nW, p.nL) >= 10),
        ranking: { n: conRk.length, mejorRanking: +rkAc.toFixed(4), modelo: +modAc.toFixed(4) },
        retiros: { retirados: P.filter(p => p.fin === 'R').length, total: P.length },
        totales, handicap: hcp, sinSet: sets20, sets: bS, bo5
      };
      // jugadores (activos desde 2025)
      const corte = Date.UTC(2025, 0, 1) / 1000;
      Object.entries(fin.R).forEach(([id, j]) => {
        if (j.last < corte || j.n < 1) return;
        const info = db.jug[id] || ['', ''];
        const r = x => Math.round(x);
        out.jug[id] = [info[0], info[1], tour, r(j.all), r(j.sup.H), r(j.sup.C), r(j.sup.G), j.n, j.nS.H, j.nS.C, j.nS.G, j.rk || 0, Math.round(j.last / 86400), j.forma.join('')];
      });
    });
    out.campos = ['nombre', 'pais', 'circuito', 'eloGeneral', 'eloDura', 'eloArcilla', 'eloHierba', 'partidos', 'pDura', 'pArcilla', 'pHierba', 'ranking', 'ultimoDia', 'forma'];
    fs.writeFileSync(SALIDA, JSON.stringify(out));
    console.log('ratings-tenis.json:', (fs.statSync(SALIDA).size / 1024).toFixed(0), 'KB ·', Object.keys(out.jug).length, 'jugadores');
    console.log(JSON.stringify({ params: out.params, medicion: Object.fromEntries(Object.entries(out.medicion).map(([k, v]) => [k, Object.assign({}, v, { variantes: undefined })])) }, null, 1));
  });
}
main().catch(e => { console.error(e); process.exit(1); });
