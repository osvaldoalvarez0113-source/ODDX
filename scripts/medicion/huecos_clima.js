'use strict';
// Solo mide. Corre en GitHub Actions (MLB y ESPN no se alcanzan desde otro lado). Uso: node scripts/medicion/huecos_clima.js
// MLB: ¿viento y temperatura oficiales mejoran el total de la línea? NFL: ¿clima y cambio de mariscal mejoran la línea?
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch (e) {} await sleep(600 * (i + 1)); } return null; }
async function pool(tareas, k) { let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < tareas.length) { const t = tareas[i++]; await t(); await sleep(60); } })); }
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function regr(y, xs) { // MCO con constante; devuelve c y error por variable
  const n = y.length, p = xs.length + 1, X = y.map((_, i) => [1, ...xs.map(c => c[i])]), A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  X.forEach((f, i) => { for (let a = 0; a < p; a++) { b[a] += f[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += f[a] * f[c]; } });
  const M = A.map((f, i) => [...f, ...A.map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < p; i++) { let m = i; for (let k = i + 1; k < p; k++) if (Math.abs(M[k][i]) > Math.abs(M[m][i])) m = k; [M[i], M[m]] = [M[m], M[i]]; const d = M[i][i]; for (let j = 0; j < 2 * p; j++) M[i][j] /= d; for (let k = 0; k < p; k++) if (k !== i) { const f = M[k][i]; for (let j = 0; j < 2 * p; j++) M[k][j] -= f * M[i][j]; } }
  const inv = M.map(f => f.slice(p)), c = inv.map(f => f.reduce((s, v, j) => s + v * b[j], 0)); let sse = 0; X.forEach((f, i) => { const e = y[i] - f.reduce((s, v, j) => s + v * c[j], 0); sse += e * e; });
  const s2 = sse / (n - p); return { c: c.slice(1), se: inv.slice(1).map((f, i) => Math.sqrt(s2 * f[i + 1])) };
}
const L = [], log = s => { L.push(s); console.log(s); };
const fila = (nom, r, i = 0) => log(`| ${nom} | ${r.c[i].toFixed(3)} ± ${(2 * r.se[i]).toFixed(3)} | ${(r.c[i] / r.se[i]).toFixed(1)} |`);
function roi(lista) { const u = lista.map(x => x.v > 0 ? 100 / 110 : x.v < 0 ? -1 : 0), m = prom(u), s = Math.sqrt(prom(u.map(v => (v - m) * (v - m))) / Math.max(u.length, 1)); return `${(100 * m).toFixed(1)}% ±${(200 * s).toFixed(1)} (${u.length})`; }
function vientoMlb(w) { const m = /(\d+)\s*mph,?\s*(.*)/i.exec(w || ''); if (!m) return null; const v = +m[1], d = m[2].toLowerCase(); return { v, sig: /out to/.test(d) ? 1 : /in from/.test(d) ? -1 : 0 }; }
async function mlb() {
  const filas = [];
  for (const anio of [2021, 2022, 2023, 2024, 2025, 2026]) {
    const j = await get(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&startDate=${anio}-03-15&endDate=${anio}-11-05&hydrate=weather,venue,team`); if (!j) { log('MLB sin calendario ' + anio); continue; }
    const dias = j.dates || []; const lin = new Map();
    await pool(dias.map(d => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${d.date.replace(/-/g, '')}&limit=40`); ((s && s.events) || []).forEach(e => { try { const c = e.competitions[0], o = c.odds && c.odds[0]; if (!o || !isFinite(o.overUnder)) return; const h = c.competitors.find(x => x.homeAway === 'home').team.displayName; lin.set(d.date + '|' + h + '|' + (e.date || '').slice(11, 13), o.overUnder); lin.set(d.date + '|' + h, o.overUnder); } catch (x) {} }); }), 4);
    dias.forEach(d => (d.games || []).forEach(g => { try {
      if (!g.status || g.status.codedGameState !== 'F' || g.doubleHeader !== 'N') return; const w = g.weather || {}, cond = String(w.condition || ''); const tl = lin.get(d.date + '|' + g.teams.home.team.name); if (!isFinite(tl)) return;
      const vi = vientoMlb(w.wind), techo = /dome|roof closed/i.test(cond) || /dome|roof/i.test(String(w.wind || '')); const t = parseFloat(w.temp);
      filas.push({ s: anio, tot: g.teams.home.score + g.teams.away.score, l: tl, out: vi && !techo ? vi.v * (vi.sig > 0 ? 1 : 0) : 0, inn: vi && !techo ? vi.v * (vi.sig < 0 ? 1 : 0) : 0, temp: isFinite(t) && !techo ? t - 70 : 0, techo, ok: !!vi, ven: g.venue && g.venue.name });
    } catch (x) {} }));
    log(`MLB ${anio}: juegos con línea y clima acumulados ${filas.length}`); await sleep(500);
  }
  fs.writeFileSync('filas_clima_mlb.json', JSON.stringify(filas));
  const q = filas.filter(f => f.ok && !f.techo), y = q.map(f => f.tot - f.l);
  log(`\n## MLB: total real − línea (${q.length} juegos abiertos). c en carreras por mph o por °F.\n\n| Variable | c ± 2·se | z |\n|---|---|---|`);
  const r = regr(y, [q.map(f => f.out), q.map(f => f.inn), q.map(f => f.temp)]); fila('Viento hacia afuera (mph)', r, 0); fila('Viento hacia adentro (mph)', r, 1); fila('Temperatura (°F sobre 70)', r, 2);
  log('\n| Temporada | Juegos | Viento afuera z | Viento adentro z | Temp z |\n|---|---|---|---|---|');
  [...new Set(q.map(f => f.s))].forEach(s => { const g = q.filter(f => f.s === s), rr = regr(g.map(f => f.tot - f.l), [g.map(f => f.out), g.map(f => f.inn), g.map(f => f.temp)]); log(`| ${s} | ${g.length} | ${(rr.c[0] / rr.se[0]).toFixed(1)} | ${(rr.c[1] / rr.se[1]).toFixed(1)} | ${(rr.c[2] / rr.se[2]).toFixed(1)} |`); });
  log('\nROI a −110, ajustando en las otras temporadas (dejando una afuera):\n\n| Regla | ROI |\n|---|---|');
  const ap = {}; [...new Set(q.map(f => f.s))].forEach(s => { const tr = q.filter(f => f.s !== s), rr = regr(tr.map(f => f.tot - f.l), [tr.map(f => f.out), tr.map(f => f.inn), tr.map(f => f.temp)]); const me = prom(tr.map(f => f.tot - f.l)); q.filter(f => f.s === s).forEach(f => { const e = rr.c[0] * f.out + rr.c[1] * f.inn + rr.c[2] * f.temp; for (const u of [0.25, 0.5, 0.75, 1]) { if (Math.abs(e) < u) continue; const d = f.tot - f.l; (ap[u] = ap[u] || []).push({ v: d === 0 ? 0 : (d > 0) === (e > 0) ? 1 : -1 }); } }); });
  Object.keys(ap).sort().forEach(u => log(`| Efecto esperado ≥${u} carreras | ${roi(ap[u])} |`));
  [['Viento afuera 10+ mph → Más', f => f.out >= 10, 1], ['Viento afuera 15+ mph → Más', f => f.out >= 15, 1], ['Viento adentro 10+ mph → Menos', f => f.inn >= 10, -1], ['Viento adentro 15+ mph → Menos', f => f.inn >= 15, -1]].forEach(([n, fn, lado]) => { log(`| ${n} | ${roi(q.filter(fn).map(f => { const d = f.tot - f.l; return { v: d === 0 ? 0 : Math.sign(d) === lado ? 1 : -1 }; }))} |`); });
}
async function nfl() {
  const d = JSON.parse(fs.readFileSync('datos-nfl.json')), J = []; Object.keys(d.temps).forEach(s => d.temps[s].juegos.forEach(g => { if (g.done && g.linea && g.linea.tot && g.linea.sp !== undefined && g.ty === 2) { g.s = +s; J.push(g); } }));
  J.sort((a, b) => a.ts - b.ts); const res = new Map();
  await pool(J.map(g => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${g.id}`); if (!s) return; const w = s.gameInfo && s.gameInfo.weather; const qb = {}; ((s.boxscore && s.boxscore.players) || []).forEach(p => { const st = (p.statistics || []).find(x => x.name === 'passing'); const a = st && st.athletes && st.athletes[0]; if (a && a.athlete) qb[String(p.team.id)] = String(a.athlete.id); }); res.set(g.id, { w: w || null, qb }); }), 4);
  log(`\nNFL: juegos con línea ${J.length}, con resumen ${res.size}, con clima ${[...res.values()].filter(x => x.w).length}. Muestra: ${JSON.stringify([...res.values()].find(x => x.w) || {}).slice(0, 300)}`);
  const hist = {}, F = [];
  J.forEach(g => { const r = res.get(g.id); if (!r) return; const q = t => { const h = (hist[t] || []).filter(z => z.s === g.s).slice(-4); if (h.length < 3 || !r.qb[t]) return null; const c = {}; h.forEach(z => { c[z.q] = (c[z.q] || 0) + 1; }); const hab = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return r.qb[t] !== hab ? 1 : 0; }; const qh = q(g.h), qa = q(g.a), w = r.w || {}; const temp = parseFloat(w.temperature), v = parseFloat(w.windSpeed !== undefined ? w.windSpeed : w.gust);
    const txt = String(w.displayValue || w.conditionId || ''); F.push({ s: g.s, ind: !!g.indoor, mar: g.hs - g.as, sp: g.linea.sp, tot: g.hs + g.as, l: g.linea.tot, qh, qa, temp: isFinite(temp) ? temp : null, viento: isFinite(v) ? v : null, lluvia: /rain|snow|shower|storm/i.test(txt) ? 1 : 0 });
    [g.h, g.a].forEach(t => { if (r.qb[t]) (hist[t] = hist[t] || []).push({ s: g.s, q: r.qb[t] }); }); });
  fs.writeFileSync('filas_clima_nfl.json', JSON.stringify(F));
  const qq = F.filter(f => f.qh !== null && f.qa !== null), y = qq.map(f => f.mar + f.sp);
  log(`\n## NFL: cambio de mariscal contra su habitual (${qq.length} juegos; casos local ${qq.filter(f => f.qh).length}, visita ${qq.filter(f => f.qa).length}). Margen real − línea.\n\n| Variable | c ± 2·se (puntos) | z |\n|---|---|---|`);
  fila('Mariscal distinto (local − visita)', regr(y, [qq.map(f => f.qh - f.qa)]));
  log('\n| Regla, a −110 | ROI |\n|---|---|'); log(`| Contra el equipo que cambia de mariscal | ${roi(qq.filter(f => f.qh !== f.qa).map(f => { const d = f.mar + f.sp, ladoH = f.qa > f.qh; return { v: d === 0 ? 0 : (d > 0) === ladoH ? 1 : -1 }; }))} |`);
  const q2 = F.filter(f => !f.ind && f.temp !== null && f.viento !== null), yt = q2.map(f => f.tot - f.l);
  log(`\n## NFL: clima abierto (${q2.length} juegos). Total real − línea.\n\n| Variable | c ± 2·se (puntos) | z |\n|---|---|---|`);
  if (q2.length > 100) { const r = regr(yt, [q2.map(f => f.viento), q2.map(f => f.temp - 60), q2.map(f => f.lluvia)]); fila('Viento (mph)', r, 0); fila('Temperatura (°F sobre 60)', r, 1); fila('Lluvia o nieve', r, 2); log('\n| Regla, a −110 | ROI |\n|---|---|'); [['Viento 15+ → Menos', f => f.viento >= 15, -1], ['Viento 20+ → Menos', f => f.viento >= 20, -1], ['Frío <32°F → Menos', f => f.temp < 32, -1]].forEach(([n, fn, lado]) => log(`| ${n} | ${roi(q2.filter(fn).map(f => { const dd = f.tot - f.l; return { v: dd === 0 ? 0 : Math.sign(dd) === lado ? 1 : -1 }; }))} |`)); }
  const ind = F.filter(f => f.ind); log(`\n| Techo cerrado → Más, a −110 | ${roi(ind.map(f => { const dd = f.tot - f.l; return { v: dd === 0 ? 0 : dd > 0 ? 1 : -1 }; }))} |`);
  log('\n| Techo cerrado por temporada | ROI del Más |\n|---|---|'); [...new Set(ind.map(f => f.s))].sort().forEach(s => log(`| ${s} | ${roi(ind.filter(f => f.s === s).map(f => { const dd = f.tot - f.l; return { v: dd === 0 ? 0 : dd > 0 ? 1 : -1 }; }))} |`));
}
(async () => { await mlb().catch(e => log('MLB falló: ' + e.message)); await nfl().catch(e => log('NFL falló: ' + e.message)); fs.writeFileSync('resultado_huecos.txt', L.join('\n') + '\n'); })();
