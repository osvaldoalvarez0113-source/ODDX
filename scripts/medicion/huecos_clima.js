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
const NFLC = { ARI: [33.5, -112.3], ATL: [33.8, -84.4], BAL: [39.3, -76.6], BUF: [42.8, -78.8], CAR: [35.2, -80.9], CHI: [41.9, -87.6], CIN: [39.1, -84.5], CLE: [41.5, -81.7], DAL: [32.7, -97.1], DEN: [39.7, -105], DET: [42.3, -83], GB: [44.5, -88], HOU: [29.7, -95.4], IND: [39.8, -86.2], JAX: [30.3, -81.6], KC: [39, -94.5], LV: [36.1, -115.2], OAK: [37.75, -122.2], LAC: [33.95, -118.3], LAR: [33.95, -118.3], MIA: [25.96, -80.2], MIN: [45, -93.3], NE: [42.1, -71.3], NO: [30, -90.1], NYG: [40.8, -74.1], NYJ: [40.8, -74.1], PHI: [39.9, -75.2], PIT: [40.4, -80], SF: [37.4, -122], SEA: [47.6, -122.3], TB: [27.98, -82.5], TEN: [36.2, -86.8], WSH: [38.9, -76.9] };
const NBAC = { ATL: [33.8, -84.4, 0, 300], BOS: [42.4, -71.1, 0, 5], BKN: [40.7, -74, 0, 10], CHA: [35.2, -80.8, 0, 230], CHI: [41.9, -87.7, 1, 180], CLE: [41.5, -81.7, 0, 180], DAL: [32.8, -96.8, 1, 130], DEN: [39.7, -105, 2, 1600], DET: [42.3, -83, 0, 180], GS: [37.8, -122.4, 3, 5], HOU: [29.75, -95.4, 1, 15], IND: [39.8, -86.2, 0, 220], LAC: [34, -118.3, 3, 70], LAL: [34, -118.3, 3, 70], MEM: [35.1, -90, 1, 80], MIA: [25.8, -80.2, 0, 3], MIL: [43, -87.9, 1, 190], MIN: [45, -93.3, 1, 250], NO: [30, -90.1, 1, 1], NY: [40.75, -74, 0, 10], OKC: [35.5, -97.5, 1, 370], ORL: [28.5, -81.4, 0, 30], PHI: [39.9, -75.2, 0, 10], PHX: [33.4, -112.1, 2, 330], POR: [45.5, -122.7, 3, 15], SAC: [38.6, -121.5, 3, 10], SA: [29.4, -98.4, 1, 200], TOR: [43.6, -79.4, 0, 80], UTAH: [40.8, -111.9, 2, 1300], WSH: [38.9, -77, 0, 20] };
const km = (a, b) => { const p = Math.PI / 180, d = Math.sin((b[0] - a[0]) * p / 2) ** 2 + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin((b[1] - a[1]) * p / 2) ** 2; return 12742 * Math.asin(Math.sqrt(d)); };
async function nba() {
  const F0 = JSON.parse(fs.readFileSync('filas_nba.json')), porId = new Map(F0.map(f => [String(f.id), f])), dias = [...new Set(F0.map(f => new Date(f.ts - 6 * 36e5).toISOString().slice(0, 10).replace(/-/g, '')))], eq = new Map();
  await pool(dias.flatMap(d => [d, String(+d + 1)]).filter((v, i, a) => a.indexOf(v) === i).map(d => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d}&limit=40`); ((s && s.events) || []).forEach(e => { try { const c = e.competitions[0]; eq.set(String(e.id), { h: c.competitors.find(x => x.homeAway === 'home').team.abbreviation, a: c.competitors.find(x => x.homeAway === 'away').team.abbreviation, neutral: !!c.neutralSite }); } catch (x) {} }); }), 4);
  const orden = F0.filter(f => eq.has(String(f.id))).sort((a, b) => a.ts - b.ts), last = {}, F = []; const corr = []; 
  orden.forEach(f => { const e = eq.get(String(f.id)), aqui = NBAC[e.h]; if (!aqui || !NBAC[e.a] || e.neutral) return; const pa = last[e.a], ph = last[e.h]; last[e.a] = { c: aqui, ts: f.ts }; last[e.h] = { c: aqui, ts: f.ts }; if (!pa || !ph || f.ts - pa.ts > 10 * 864e5 || f.ts - ph.ts > 10 * 864e5 || !isFinite(f.spread)) return; const kA = km(pa.c, aqui) / 1000, kH = km(ph.c, aqui) / 1000, rA = (f.ts - pa.ts) / 864e5; F.push({ s: f.sk, y: f.mar + f.spread, kA, dK: kA - kH, east: Math.max(pa.c[2] - aqui[2], 0) * 0 + Math.max(aqui[2] - pa.c[2], 0) * 0 + Math.max(pa.c[2] - aqui[2], 0), west: Math.max(aqui[2] - pa.c[2], 0), alt: aqui[3] >= 1000 ? 1 : 0, b2bK: rA <= 1.6 ? kA : 0, tot: f.tot - f.total }); });
  log(`\n## NBA: viaje y altura contra la línea (${F.length} juegos). Margen real − línea, en puntos.\n\n| Variable | c ± 2·se | z |\n|---|---|---|`);
  [['km visitante − km local (miles)', 'dK'], ['km del visitante (miles)', 'kA'], ['Husos hacia el este, visitante', 'east'], ['Husos hacia el oeste, visitante', 'west'], ['Visita a altura', 'alt'], ['km del visitante si jugó ayer', 'b2bK']].forEach(([n, k]) => { fila(n, regr(F.map(f => f.y), [F.map(f => f[k])])); });
  log('\n| Viaje por temporada, z de km visitante − local |\n|---|'); [...new Set(F.map(f => f.s))].forEach(s => { const g = F.filter(f => f.s === s), r = regr(g.map(f => f.y), [g.map(f => f.dK)]); log(`| ${s}: z ${(r.c[0] / r.se[0]).toFixed(1)} (${g.length}) |`); });
  const ap = F.filter(f => f.alt); log(`\n| Local en altura, a −110 | ${roi(ap.map(f => ({ v: f.y === 0 ? 0 : f.y > 0 ? 1 : -1 })))} |`);
}
const L = [], log = s => { L.push(s); console.log(s); };
const fila = (nom, r, i = 0) => log(`| ${nom} | ${r.c[i].toFixed(3)} ± ${(2 * r.se[i]).toFixed(3)} | ${(r.c[i] / r.se[i]).toFixed(1)} |`);
function roi(lista) { const u = lista.map(x => x.v > 0 ? 100 / 110 : x.v < 0 ? -1 : 0), m = prom(u), s = Math.sqrt(prom(u.map(v => (v - m) * (v - m))) / Math.max(u.length, 1)); return `${(100 * m).toFixed(1)}% ±${(200 * s).toFixed(1)} (${u.length})`; }
function vientoMlb(w) { const m = /(\d+)\s*mph,?\s*(.*)/i.exec(w || ''); if (!m) return null; const v = +m[1], d = m[2].toLowerCase(); return { v, sig: /out to/.test(d) ? 1 : /in from/.test(d) ? -1 : 0 }; }
async function mlb() {
  const filas = [];
  for (const anio of [2021, 2022, 2023, 2024, 2025, 2026]) {
    const j = await get(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&startDate=${anio}-03-15&endDate=${anio}-11-05&hydrate=weather,venue,team`); if (!j) { log('MLB sin calendario ' + anio); continue; }
    const dias = j.dates || []; const lin = new Map(), evs = [];
    await pool(dias.map(d => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${d.date.replace(/-/g, '')}&limit=40`); ((s && s.events) || []).forEach(e => { try { evs.push({ id: e.id, f: d.date, h: e.competitions[0].competitors.find(x => x.homeAway === 'home').team.displayName }); } catch (x) {} }); }), 4);
    await pool(evs.map(e => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${e.id}`, 2); const o = s && s.pickcenter && s.pickcenter[0]; if (o && isFinite(o.overUnder)) lin.set(e.f + '|' + e.h, o.overUnder); }), 6);
    log(`MLB ${anio}: eventos ESPN ${evs.length}, con línea ${lin.size}`);
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
  await pool(J.map(g => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${g.id}`); if (!s) return; const w = s.gameInfo && s.gameInfo.weather; const qb = {}; ((s.boxscore && s.boxscore.players) || []).forEach(p => { const st = (p.statistics || []).find(x => x.name === 'passing'); const a = st && st.athletes && st.athletes[0]; if (a && a.athlete) qb[String(p.team.id)] = { q: String(a.athlete.id), todos: (st.athletes || []).map(x => String(x.athlete && x.athlete.id)) }; }); res.set(g.id, { w: w || null, qb }); }), 4);
  const met = {}, climaDe = g => { if (g.neutral || g.indoor) return null; const m = met[g.abH + g.s]; if (!m) return null; const i = m.h.get(new Date(g.ts).toISOString().slice(0, 13) + ':00'); return i === undefined ? null : { temp: m.t[i], viento: m.v[i], mm: m.p[i] }; };
  const pedidos = new Set(); J.forEach(g => { if (!g.indoor && !g.neutral && NFLC[g.abH]) pedidos.add(g.abH + '|' + g.s); });
  await pool([...pedidos].map(k => async () => { const [ab, s] = k.split('|'), c = NFLC[ab], hoy = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10), fin = `${+s + 1}-02-20` > hoy ? hoy : `${+s + 1}-02-20`; const j = await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${c[0]}&longitude=${c[1]}&start_date=${s}-08-25&end_date=${fin}&hourly=temperature_2m,wind_speed_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=GMT`); if (j && j.hourly) { const h = new Map(); j.hourly.time.forEach((t, i) => h.set(t, i)); met[ab + s] = { h, t: j.hourly.temperature_2m, v: j.hourly.wind_speed_10m, p: j.hourly.precipitation }; } }), 2);
  log(`\nNFL: juegos con línea ${J.length}, con resumen ${res.size}, sedes-temporada con clima ${Object.keys(met).length} de ${pedidos.size}.`);
  const hist = {}, F = [];
  J.forEach(g => { const r = res.get(g.id); if (!r) return; const q = t => { const h = (hist[t] || []).filter(z => z.s === g.s).slice(-4); if (h.length < 3 || !r.qb[t]) return null; const c = {}; h.forEach(z => { c[z.q] = (c[z.q] || 0) + 1; }); const hab = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return r.qb[t].todos.includes(hab) ? 0 : 1; }; /* 1 solo si el habitual no lanzó ni un pase: una lesión a mitad de juego no cuenta, porque eso no se sabía antes */ const qh = q(g.h), qa = q(g.a), w = climaDe(g); F.push({ s: g.s, ind: !!g.indoor, neutral: !!g.neutral, mar: g.hs - g.as, sp: g.linea.sp, tot: g.hs + g.as, l: g.linea.tot, qh, qa, temp: w ? w.temp : null, viento: w ? w.viento : null, lluvia: w && w.mm > 0.3 ? 1 : 0 });
    [g.h, g.a].forEach(t => { if (r.qb[t]) (hist[t] = hist[t] || []).push({ s: g.s, q: r.qb[t].q }); }); });
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
(async () => { await nba().catch(e => log('NBA falló: ' + e.message)); await mlb().catch(e => log('MLB falló: ' + e.message)); await nfl().catch(e => log('NFL falló: ' + e.message)); fs.writeFileSync('resultado_huecos.txt', L.join('\n') + '\n'); })();
