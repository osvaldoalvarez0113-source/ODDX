'use strict';
// ¿El xG REAL (Understat) en los ratings hace acertar más al modelo de fútbol? (27-nov-2026, pedido de Osvaldo)
// Uso: node scripts/medicion/xg_futbol.js partidos_actual.json team_match.csv
//   partidos_actual.json: rama resultados-futbol-actual (marcador + cierre de Pinnacle sin margen, 2018-19 en adelante).
//   team_match.csv: dataset público ganendraditya/understat-data en Hugging Face (xG de Understat por equipo y partido,
//   reconstruido de copias del Wayback Machine; Premier, La Liga y Serie A, 2014-15 a 2024-25).
// Corre el motor REAL de futbol.html (dcAjustar + calcularDC, v22: 2 temporadas de historial, xi 1.0) igual que fut_dc_real.js.
// Lo único que cambia: los «goles» con que se ajustan ataque y defensa son A·goles + (1−A)·xG. A = 1 es la app de hoy.
// REGLA FIJADA ANTES DE CORRER: A en {1, 0.75, 0.5, 0.25, 0}. Se elige A en un bloque (2020-21 y 2021-22) y se prueba en el otro
// (2022-23 a 2024-25), y al revés. Pasa si la pérdida 1X2 baja contra A = 1 con t >= 2 en las DOS direcciones y no pierde aciertos.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'futbol.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
function bloqueVar(n) { const i = html.search(new RegExp('var ' + n + '\\s*=')); const j = html.indexOf(';', html.indexOf('}', i)); return html.slice(i, j + 1) + '\n'; }
const src = 'var ELOV=0;var localStorage={getItem:function(k){return null;}};var MAXG=8;\n'
  + cut('function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n"
  + cut('function mezclar(d, d0, w, claves)', '// Todas las probabilidades del modelo')
  + cut('function buscarEnMapa(mapa, nombre)', 'var buscarSemilla')
  + bloqueVar('DC_CFG') + 'var DC_APP=JSON.parse(JSON.stringify(DC_CFG));\n'
  + cut('function dcAjustar(lista, hoyDia, cfg)', 'function calcular(eL, eV, P)')
  + 'function claveEq(n){return String(n);} function mismaClave(x,y){return x===y;} function tsPartido(p){return p.ts;}\n';
const ctx = { Math, Object, JSON, parseFloat, isFinite, console }; vm.createContext(ctx); vm.runInContext(src, ctx); vm.runInContext('var DCFIT=null;', ctx);
const APP = JSON.parse(JSON.stringify(ctx.DC_APP));

// ---- unir xG ----
const MAPA = { 'Ath Bilbao': 'Athletic Club', 'Ath Madrid': 'Atletico Madrid', Betis: 'Real Betis', Celta: 'Celta Vigo', Espanol: 'Espanyol', Huesca: 'SD Huesca',
  'La Coruna': 'Deportivo La Coruna', 'Man City': 'Manchester City', 'Man United': 'Manchester United', Milan: 'AC Milan', Newcastle: 'Newcastle United',
  "Nott'm Forest": 'Nottingham Forest', Sociedad: 'Real Sociedad', Spal: 'SPAL 2013', Valladolid: 'Real Valladolid', Vallecano: 'Rayo Vallecano',
  'West Brom': 'West Bromwich Albion', Wolves: 'Wolverhampton Wanderers' };
const LG = { EPL: 'E0', La_liga: 'SP1', Serie_A: 'I1' };
const lineas = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n'), cab = lineas[0].split(',');
const XG = new Map();
lineas.slice(1).forEach(l => { const c = l.split(','), r = {}; cab.forEach((k, i) => r[k] = c[i]); if (r.home_away !== 'h') return;
  const lg = LG[r.league]; if (!lg) return; XG.set(lg + '|' + r.date + '|' + r.team, [+r.xG, +r.xGA]); });
const dia = (ms, k) => new Date(ms + k * 864e5).toISOString().slice(0, 10);
const todas = JSON.parse(fs.readFileSync(process.argv[2]));
const filas = todas.filter(x => ['E0', 'SP1', 'I1'].includes(x.lg) && x.t >= '1819' && x.t <= '2425');
let sin = 0;
filas.forEach(x => { const h = MAPA[x.h] || (x.h === 'Parma' ? null : x.h); let v = null;
  for (const k of [0, 1, -1]) { for (const nom of (x.h === 'Parma' ? ['Parma', 'Parma Calcio 1913'] : [h])) { v = XG.get(x.lg + '|' + dia(x.d, k) + '|' + nom); if (v) break; } if (v) break; }
  if (v) { x.xh = v[0]; x.xa = v[1]; } else sin++; });
console.log(`partidos ${filas.length}, sin xG ${sin}`);
const temps = [...new Set(filas.map(x => x.t))].sort(), ligas = [...new Set(filas.map(x => x.lg))];
const LOG = p => -Math.log(Math.max(p, 1e-9)), prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function correr(cfg, A, soloTemps, hist) {
  const out = []; vm.runInContext('DC_CFG=' + JSON.stringify(cfg), ctx);
  const conv = x => { const u = x.xh != null && A < 1; return { local: x.h, visita: x.a, golesLocal: u ? A * x.gh + (1 - A) * x.xh : x.gh, golesVisita: u ? A * x.ga + (1 - A) * x.xa : x.ga, ts: x.d }; };
  for (const lg of ligas) for (let si = 1; si < temps.length; si++) {
    const t = temps[si]; if (!soloTemps.includes(t)) continue;
    const prev = temps.slice(Math.max(0, si - hist), si);
    const ant = filas.filter(x => x.lg === lg && prev.includes(x.t)), act = filas.filter(x => x.lg === lg && x.t === t).sort((a, b) => a.d - b.d);
    const base = ant.map(conv); let i = 0;
    while (i < act.length) {
      const d = act[i].d; let j = i; while (j < act.length && act[j].d === d) j++;
      ctx.lista = base.concat(act.slice(0, i).map(conv)); ctx.hoy = Math.floor(d / 864e5);
      const fit = vm.runInContext('dcAjustar(lista,hoy,DC_CFG)', ctx);
      if (fit) { fit.liga = lg; ctx.f = fit; vm.runInContext('DCFIT=f', ctx);
        for (let k = i; k < j; k++) { const x = act[k]; ctx.a = { nombre: x.h }; ctx.b = { nombre: x.a };
          const r = vm.runInContext('calcularDC(a,b)', ctx);
          out.push({ key: lg + t + k, t, lg, y: x.y, p: [r.pL, r.pD, r.pV], o25: r.overLin[2.5], tot: x.gh + x.ga, mk: x.mk }); } }
      i = j;
    }
  }
  return out;
}
const CFG = { ...APP, xi: 1.0, wt: 0.5 }, HIST = 2;
const GRID = [1, 0.75, 0.5, 0.25, 0];
const PRED = temps.slice(2);     // con 2 temporadas de historial: 2020-21 a 2024-25
const X = PRED.filter(t => t <= '2122'), Y = PRED.filter(t => t >= '2223');
console.log('temporadas con xG', temps.join(' '), '| se predicen', PRED.join(' '), '| bloques', X.join(','), '↔', Y.join(','), '| config', JSON.stringify(CFG));
const O = {}; GRID.forEach(A => { O[A] = correr(CFG, A, PRED, HIST); });
const okk = x => x.p.indexOf(Math.max(...x.p)) === x.y;
const res = (o, ts) => { const q = o.filter(x => ts.includes(x.t)); return { n: q.length, ll: prom(q.map(x => LOG(x.p[x.y]))), ac: q.filter(okk).length, mk: prom(q.filter(x => x.mk).map(x => LOG(x.mk[x.y]))),
  ou: prom(q.map(x => x.tot > 2.5 ? LOG(x.o25) : LOG(1 - x.o25))) }; };
console.log('\n| A (peso de los goles) | Bloque 2020-22: pérdida 1X2 · aciertos | Bloque 2022-25: pérdida 1X2 · aciertos | Más/Menos 2.5 (todo) |\n|---|---|---|---|');
GRID.forEach(A => { const a = res(O[A], X), b = res(O[A], Y), c = res(O[A], PRED);
  console.log(`| ${A}${A === 1 ? ' (app hoy)' : A === 0 ? ' (solo xG)' : ''} | ${a.ll.toFixed(4)} · ${a.ac}/${a.n} (${(100 * a.ac / a.n).toFixed(1)}%) | ${b.ll.toFixed(4)} · ${b.ac}/${b.n} (${(100 * b.ac / b.n).toFixed(1)}%) | ${c.ou.toFixed(4)} |`); });
const mX = res(O[1], X).mk, mY = res(O[1], Y).mk;
console.log(`\nMercado (Pinnacle cierre) en los mismos partidos: 2020-22 ${mX.toFixed(4)} · 2022-25 ${mY.toFixed(4)}`);
function prueba(elige, mide) {
  const A = GRID.slice().sort((a, b) => res(O[a], elige).ll - res(O[b], elige).ll)[0];
  const m1 = new Map(O[1].map(x => [x.key, x])), q = O[A].filter(x => mide.includes(x.t) && m1.has(x.key));
  const d = q.map(x => LOG(m1.get(x.key).p[x.y]) - LOG(x.p[x.y])), m = prom(d), sd = Math.sqrt(prom(d.map(v => (v - m) ** 2)) / d.length);
  const ac0 = q.filter(x => okk(m1.get(x.key))).length, ac1 = q.filter(okk).length;
  return { A, n: q.length, mej: 1000 * m, t: sd ? m / sd : 0, ac0, ac1 };
}
const p1 = prueba(X, Y), p2 = prueba(Y, X);
const linea = (p, e, m) => `Elige en ${e}: A = ${p.A} → prueba en ${m}: mejora ${p.mej.toFixed(2)} milésimas (t ${p.t.toFixed(2)}), aciertos ${p.ac0} → ${p.ac1} de ${p.n}`;
console.log('\n' + linea(p1, '2020-22', '2022-25') + '\n' + linea(p2, '2022-25', '2020-22'));
const pasa = p1.A !== 1 && p2.A !== 1 && p1.t >= 2 && p2.t >= 2 && p1.ac1 + p2.ac1 >= p1.ac0 + p2.ac0;
console.log('\n**' + (pasa ? 'PASA' : 'No pasa') + '**');
// por temporada (A = 0.5 contra A = 1), para ver estabilidad
const m1 = new Map(O[1].map(x => [x.key, x]));
console.log('\nPor temporada, A = 0.5 contra A = 1 (milésimas, + = mejor): ' + PRED.map(t => { const q = O[0.5].filter(x => x.t === t); return t + ' ' + (1000 * prom(q.map(x => LOG(m1.get(x.key).p[x.y]) - LOG(x.p[x.y])))).toFixed(2); }).join(' · '));
console.log('Por liga, A = 0.5 contra A = 1: ' + ligas.map(l => { const q = O[0.5].filter(x => x.lg === l); return l + ' ' + (1000 * prom(q.map(x => LOG(m1.get(x.key).p[x.y]) - LOG(x.p[x.y])))).toFixed(2); }).join(' · '));

// ---- CONFIRMACIÓN en temporadas que nadie miró (fijada DESPUÉS de ver lo de arriba y ANTES de correrla) ----
// La regla de arriba no pasó por poco (una dirección t 3.5, la otra t 1.0 con solo 2,280 partidos). Para no acomodar nada,
// se fija A = 0.5 (lo que eligió el primer bloque) y se prueba en 2016-17 a 2019-20, que no se usaron para predecir arriba
// (2018-19 y 2019-20 solo fueron historial). No hace falta cuota: se mide contra el resultado.
// Pasa si mejora con t >= 2 y no pierde aciertos.
{
  const F2 = []; lineas.slice(1).forEach(l => { const c = l.split(','), r = {}; cab.forEach((k, i) => r[k] = c[i]); if (r.home_away !== 'h') return;
    const lg = LG[r.league]; if (!lg) return; const gh = +r.goals_for, ga = +r.goals_against;
    F2.push({ lg, t: String(+r.season_start_year % 100).padStart(2, '0') + String((+r.season_start_year + 1) % 100).padStart(2, '0'), d: Date.parse(r.date + 'T15:00:00Z'), h: r.team, a: null, gh, ga, xh: +r.xG, xa: +r.xGA, y: gh > ga ? 0 : gh === ga ? 1 : 2, _opp: r }); });
  // el rival: la fila «a» del mismo partido
  const vis = new Map(); lineas.slice(1).forEach(l => { const c = l.split(','), r = {}; cab.forEach((k, i) => r[k] = c[i]); if (r.home_away === 'a') vis.set(r.league + '|' + r.date + '|' + r.goals_against + '|' + r.goals_for + '|' + (+r.xGA).toFixed(4), r.team); });
  F2.forEach(x => { const r = x._opp; x.a = vis.get(r.league + '|' + r.date + '|' + r.goals_for + '|' + r.goals_against + '|' + (+r.xG).toFixed(4)); delete x._opp; });
  const ok2 = F2.filter(x => x.a);
  console.log(`\n### Confirmación (temporadas nuevas)\npartidos del dataset ${F2.length}, con rival encontrado ${ok2.length}`);
  filas.length = 0; ok2.forEach(x => filas.push(x));
  temps.length = 0; [...new Set(filas.map(x => x.t))].sort().forEach(t => temps.push(t));
  ligas.length = 0; [...new Set(filas.map(x => x.lg))].forEach(l => ligas.push(l));
  const NUEVAS = ['1617', '1718', '1819', '1920'];
  const b = correr(CFG, 1, NUEVAS, HIST), c = correr(CFG, 0.5, NUEVAS, HIST), mb = new Map(b.map(x => [x.key, x])), q = c.filter(x => mb.has(x.key));
  const d = q.map(x => LOG(mb.get(x.key).p[x.y]) - LOG(x.p[x.y])), m = prom(d), sd = Math.sqrt(prom(d.map(v => (v - m) ** 2)) / d.length);
  const a0 = q.filter(x => okk(mb.get(x.key))).length, a1 = q.filter(okk).length;
  console.log(`A = 0.5 contra A = 1 en ${NUEVAS.join(', ')}: ${q.length} partidos, pérdida ${prom(q.map(x => LOG(mb.get(x.key).p[x.y]))).toFixed(4)} → ${prom(q.map(x => LOG(x.p[x.y]))).toFixed(4)}, mejora ${(1000 * m).toFixed(2)} milésimas (t ${(m / sd).toFixed(2)}), aciertos ${a0} → ${a1} (${(100 * a0 / q.length).toFixed(1)}% → ${(100 * a1 / q.length).toFixed(1)}%)`);
  console.log('Por temporada: ' + NUEVAS.map(t => { const z = q.filter(x => x.t === t); return t + ' ' + (1000 * prom(z.map(x => LOG(mb.get(x.key).p[x.y]) - LOG(x.p[x.y])))).toFixed(2) + ' (' + z.length + ')'; }).join(' · '));
  console.log('Por liga: ' + ligas.map(l => { const z = q.filter(x => x.lg === l); return l + ' ' + (1000 * prom(z.map(x => LOG(mb.get(x.key).p[x.y]) - LOG(x.p[x.y])))).toFixed(2); }).join(' · '));
  console.log('\n**Confirmación: ' + (m / sd >= 2 && a1 >= a0 ? 'PASA' : 'no pasa') + '**');
}
