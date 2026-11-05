'use strict';
// Solo mide. Corre en GitHub Actions. NBA: ¿regresos de estrellas, traspasos y continuidad del plantel le añaden algo al modelo y a la línea?
// Uso: node scripts/medicion/cambios_jugadores.js filas_nba.json. Cada variable usa solo juegos anteriores; quién jugó hoy se toma del boxscore (es casi lo que se sabe al empezar).
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch (e) {} await sleep(600 * (i + 1)); } return null; }
async function pool(t, k) { let i = 0, h = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < t.length) { const f = t[i++]; await f(); h++; if (h % 1000 === 0) console.log('box ' + h); await sleep(40); } })); }
function regr(y, xs) { const n = y.length, p = xs.length + 1, X = y.map((_, i) => [1, ...xs.map(c => c[i])]), A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0); X.forEach((f, i) => { for (let a = 0; a < p; a++) { b[a] += f[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += f[a] * f[c]; } }); const M = A.map((f, i) => [...f, ...A.map((_, j) => (i === j ? 1 : 0))]); for (let i = 0; i < p; i++) { let m = i; for (let k = i + 1; k < p; k++) if (Math.abs(M[k][i]) > Math.abs(M[m][i])) m = k; [M[i], M[m]] = [M[m], M[i]]; const d = M[i][i]; for (let j = 0; j < 2 * p; j++) M[i][j] /= d; for (let k = 0; k < p; k++) if (k !== i) { const f = M[k][i]; for (let j = 0; j < 2 * p; j++) M[k][j] -= f * M[i][j]; } } const inv = M.map(f => f.slice(p)), c = inv.map(f => f.reduce((s, v, j) => s + v * b[j], 0)); let sse = 0; X.forEach((f, i) => { const e = y[i] - f.reduce((s, v, j) => s + v * c[j], 0); sse += e * e; }); const s2 = sse / (n - p); return { c: c.slice(1), se: inv.slice(1).map((f, i) => Math.sqrt(s2 * f[i + 1])), rmse: Math.sqrt(sse / n) }; }
const L = [], log = s => { L.push(s); console.log(s); };
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const roi = l => { const u = l.map(x => x > 0 ? 100 / 110 : x < 0 ? -1 : 0), m = prom(u), s = Math.sqrt(prom(u.map(v => (v - m) * (v - m))) / Math.max(u.length, 1)); return `${(100 * m).toFixed(1)}% ±${(200 * s).toFixed(1)} (${u.length})`; };
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
(async () => {
  const F0 = JSON.parse(fs.readFileSync(process.argv[2])).filter(f => f.V0 && f.V0.pm != null && isFinite(f.spread)).sort((a, b) => a.ts - b.ts), box = new Map();
  await pool(F0.map(f => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${f.id}`, 3); if (!s || !s.boxscore || !s.boxscore.players || !s.header) return; try { const c = s.header.competitions[0], hId = String(c.competitors.find(x => x.homeAway === 'home').team.id), o = {}; s.boxscore.players.forEach(p => { const tid = String(p.team.id), st = p.statistics && p.statistics[0]; if (!st) return; const k = st.keys || st.names || [], iM = k.findIndex(x => /^minutes$|^MIN$/i.test(x)), iP = k.findIndex(x => /^points$|^PTS$/i.test(x)), iR = k.findIndex(x => /^rebounds$|^REB$/i.test(x)), iA = k.findIndex(x => /^assists$|^AST$/i.test(x)); o[tid] = (st.athletes || []).filter(a => a.athlete && a.stats && a.stats.length && !a.didNotPlay).map(a => { const m = num(a.stats[iM]); return { id: String(a.athlete.id), m, pr: num(a.stats[iP]) + .7 * num(a.stats[iR]) + .7 * num(a.stats[iA]) }; }).filter(a => a.m > 0); }); const ids = Object.keys(o); if (ids.length !== 2) return; box.set(String(f.id), { h: hId, a: ids.find(x => x !== hId), o }); } catch (e) {} }), 5);
  log(`Juegos ${F0.length}, con boxscore ${box.size}`);
  const J = {}, D = {}; // J[jugador]={m,pr,g,eq,ult,tSeason,desdeEq}; D[equipo]={g:[...ids por juego], sk}
  const talento = j => j.g ? (j.pr / j.g) : 0, top = (eq, n) => Object.entries(J).filter(([, v]) => v.eq === eq && v.g >= 5).sort((a, b) => b[1].m / b[1].g * 1 - a[1].m / a[1].g).slice(0, n).map(x => x[0]);
  const F = [];
  for (const f of F0) { const b = box.get(String(f.id)); if (!b) continue;
    const vs = t => { const d = D[t] || (D[t] = { n: 0, sk: f.sk, g: [] }); if (d.sk !== f.sk) { d.sk = f.sk; d.n = 0; d.g = []; } const hoy = b.o[t], ids = new Set(hoy.map(x => x.id));
      // estrellas: las 2 de mayor producción del equipo, solo con lo anterior
      const pl = Object.entries(J).filter(([, v]) => v.eq === t && v.g >= 8).sort((x, y) => talento(y[1]) - talento(x[1])); const st = pl.slice(0, 2);
      let regreso = 0, regresoProd = 0; st.forEach(([id, v]) => { if (ids.has(id) && v.falta >= 3) { regreso++; regresoProd += talento(v); } });
      // llegados por traspaso: jugaban en otro equipo esta temporada hace poco y su producción previa
      let nuevo = 0, nuevoN = 0, ido = 0; hoy.forEach(x => { const v = J[x.id]; if (v && v.eq && v.eq !== t && v.g >= 10 && v.sk === f.sk) { nuevo += talento(v); nuevoN++; } }); hoy.forEach(x => { const v = J[x.id]; if (v && v.eqAnt === t && v.cambioJ <= 8) nuevo += 0; });
      Object.values(J).forEach(v => { if (v.eqAnt === t && v.sk === f.sk && v.jEqNuevo <= 10 && v.gAnt >= 10) ido += v.prAnt / v.gAnt; });
      let reciente = 0; hoy.forEach(x => { const v = J[x.id]; if (v && v.eq === t && v.sk === f.sk && v.eqAnt && v.jEqNuevo <= 10 && v.gAnt >= 10) reciente += v.prAnt / v.gAnt; });
      // continuidad: % de los minutos de hoy de jugadores que ya estaban en el equipo la temporada pasada
      let mT = 0, mC = 0; hoy.forEach(x => { const v = J[x.id]; mT += x.m; if (v && (v.eqT && v.eqT[f.sk - 1] === t)) mC += x.m; });
      // producción presente de hoy con promedio anterior de cada jugador (rating por jugadores)
      let pres = 0; hoy.forEach(x => { const v = J[x.id]; if (v && v.g >= 5) pres += talento(v) * x.m / 240 * 5; });
      return { regreso, regresoProd, nuevoN, nuevo, reciente, ido, cont: mT ? mC / mT : 0, pres, n: d.n };
    };
    const a = vs(b.h), c = vs(b.a);
    if (a.n >= 8 && c.n >= 8) F.push({ s: f.sk, cub: f.mar + f.spread, er: f.mar - f.V0.pm, mar: f.mar, sp: f.spread, pm: f.V0.pm, tot: f.tot - f.total, dReg: a.regreso - c.regreso, dRegP: a.regresoProd - c.regresoProd, dNuevo: (a.nuevo + a.reciente) - (c.nuevo + c.reciente), dIdo: a.ido - c.ido, dCont: a.cont - c.cont, dPres: a.pres - c.pres, n: Math.min(a.n, c.n), aReg: a.regreso, cReg: c.regreso, aR: a.nuevo + a.reciente, cR: c.nuevo + c.reciente });
    if (a.n < 8 || c.n < 8) { if (a.n <= 12 && c.n <= 12) F.push({ inicio: 1, s: f.sk, cub: f.mar + f.spread, er: f.mar - f.V0.pm, dCont: a.cont - c.cont }); }
    for (const t of [b.h, b.a]) { const hoy = new Set(b.o[t].map(x => x.id)); Object.entries(J).forEach(([id, v]) => { if (v.eq === t) { v.falta = hoy.has(id) ? 0 : (v.falta || 0) + 1; if (v.eqAnt) v.jEqNuevo = (v.jEqNuevo || 0) + (hoy.has(id) ? 1 : 0); } if (v.eqAnt === t) v.cambioJ = (v.cambioJ || 0) + 1; }); b.o[t].forEach(x => { const v = J[x.id] || (J[x.id] = { m: 0, pr: 0, g: 0, eq: t, sk: f.sk, falta: 0, eqT: {} }); if (v.sk !== f.sk) { v.sk = f.sk; v.eqAnt = null; v.m *= .5; v.pr *= .5; v.g *= .5; } if (v.eq !== t) { if (v.g >= 1) { v.eqAnt = v.eq; v.gAnt = v.g; v.prAnt = v.pr; v.jEqNuevo = 0; v.cambioJ = 0; } v.eq = t; v.falta = 0; } v.m += x.m; v.pr += x.pr; v.g++; v.eqT[f.sk] = t; }); D[t].n++; }
  }
  const G = F.filter(x => !x.inicio); log(`Juegos medibles ${G.length}`);
  const mide = (nom, k, q = G) => { const x = q.map(r => r[k]), r1 = regr(q.map(r => r.cub), [x]), r2 = regr(q.map(r => r.er), [x]); log(`| ${nom} | ${r1.c[0].toFixed(3)} ± ${(2 * r1.se[0]).toFixed(3)} | ${(r1.c[0] / r1.se[0]).toFixed(1)} | ${r2.c[0].toFixed(3)} | ${(r2.c[0] / r2.se[0]).toFixed(1)} |`); };
  log('\n## Encima de la línea y encima del modelo (puntos de margen, local − visita)\n\n| Variable | Sobre la línea, c ± 2·se | z | Sobre el modelo, c | z |\n|---|---|---|---|---|');
  mide('Regresos de estrella (ausente 3+ juegos)', 'dReg'); mide('Producción que regresa', 'dRegP'); mide('Producción llegada por traspaso (10 juegos)', 'dNuevo'); mide('Producción que se fue por traspaso (10 juegos)', 'dIdo'); mide('Continuidad del plantel (% minutos)', 'dCont'); mide('Producción de los que juegan hoy', 'dPres');
  log('\n| Inicio de temporada, continuidad |  |  |  |  |\n|---|---|---|---|---|'); mide('Continuidad, primeros 12 juegos', 'dCont', F.filter(x => x.inicio));
  log('\n## Por temporada (z sobre la línea)\n\n| Temporada | Juegos | Regreso | Traspaso llegada | Traspaso ida | Presentes |\n|---|---|---|---|---|---|'); [...new Set(G.map(x => x.s))].forEach(s => { const q = G.filter(x => x.s === s), z = k => { const r = regr(q.map(a => a.cub), [q.map(a => a[k])]); return (r.c[0] / r.se[0]).toFixed(1); }; log(`| ${s} | ${q.length} | ${z('dReg')} | ${z('dNuevo')} | ${z('dIdo')} | ${z('dPres')} |`); });
  log('\n## ¿Cuánto mejora el modelo? Margen real con el modelo solo y sumando presentes y regresos (RMSE fuera de muestra: ajuste en temporadas anteriores)\n');
  const ss = [...new Set(G.map(x => x.s))].sort(); const e0 = [], e1 = [], eL = []; ss.slice(1).forEach(s => { const tr = G.filter(x => x.s < s), te = G.filter(x => x.s === s), r0 = regr(tr.map(x => x.mar), [tr.map(x => x.pm)]), r1 = regr(tr.map(x => x.mar), [tr.map(x => x.pm), tr.map(x => x.dPres), tr.map(x => x.dReg), tr.map(x => x.dNuevo)]); te.forEach(x => { e0.push((x.mar - r0.c[0] * x.pm) ** 2); const pm = r1.c[0] * x.pm + r1.c[1] * x.dPres + r1.c[2] * x.dReg + r1.c[3] * x.dNuevo; e1.push((x.mar - pm) ** 2); eL.push((x.mar + x.sp) ** 2); }); });
  log(`RMSE modelo ${Math.sqrt(prom(e0)).toFixed(2)} · modelo + jugadores ${Math.sqrt(prom(e1)).toFixed(2)} · línea ${Math.sqrt(prom(eL)).toFixed(2)}`);
  log('\n| Regla, a −110, contra la línea | ROI |\n|---|---|');
  const reg = (nom, fn) => { const z = G.map(fn).filter(x => x !== null); log(`| ${nom} | ${roi(z)} |`); };
  const lado = (r, l) => r.cub === 0 ? 0 : (r.cub > 0) === l ? 1 : -1;
  reg('Al equipo con estrella que regresa', r => r.aReg > r.cReg ? lado(r, true) : r.cReg > r.aReg ? lado(r, false) : null);
  reg('Al equipo con traspaso reciente (15+ de producción)', r => r.aR >= 15 && r.cR < 5 ? lado(r, true) : r.cR >= 15 && r.aR < 5 ? lado(r, false) : null);
  reg('Contra el equipo con traspaso reciente (15+)', r => r.aR >= 15 && r.cR < 5 ? lado(r, false) : r.cR >= 15 && r.aR < 5 ? lado(r, true) : null);
  log('\n## Continuidad por temporada y ROI dejando una temporada afuera\n\n| Temporada | Juegos | c | z |\n|---|---|---|---|'); ss.forEach(t => { const q = G.filter(x => x.s === t); if (q.every(x => x.dCont === 0)) { log(`| ${t} | ${q.length} | sin temporada anterior | |`); return; } const r = regr(q.map(a => a.cub), [q.map(a => a.dCont)]); log(`| ${t} | ${q.length} | ${r.c[0].toFixed(2)} | ${(r.c[0] / r.se[0]).toFixed(1)} |`); });
  for (const u of [.1, .2, .3, .4]) reg('Al equipo con ' + Math.round(u * 100) + '+ pts más de continuidad', r => r.s > ss[0] && Math.abs(r.dCont) >= u ? lado(r, r.dCont > 0) : null);
  const cQ = G.filter(x => x.s > ss[0]); log(`Continuidad: media ${prom(cQ.map(x => x.dCont)).toFixed(3)} desviación ${Math.sqrt(prom(cQ.map(x => x.dCont * x.dCont))).toFixed(3)}`);
  [[8, 30], [30, 50], [50, 90]].forEach(([a, b]) => { const q = cQ.filter(x => x.n >= a && x.n < b); if (q.length > 100) { const r = regr(q.map(x => x.cub), [q.map(x => x.dCont)]); log(`Juegos ${a}-${b} de temporada: c ${r.c[0].toFixed(2)} z ${(r.c[0] / r.se[0]).toFixed(1)} (${q.length})`); } });
  fs.writeFileSync('filas_cambios.json', JSON.stringify(G.map(x => ({ s: x.s, c: x.cub, n: x.n, dC: +x.dCont.toFixed(3), dP: +x.dPres.toFixed(2), er: x.er }))));
  fs.writeFileSync('resultado_cambios.txt', L.join('\n') + '\n');
})().catch(e => { console.error(e); fs.writeFileSync('resultado_cambios.txt', L.join('\n') + '\nFALLÓ ' + e.stack); });
