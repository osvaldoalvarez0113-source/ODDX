'use strict';
/* MOVIMIENTO DE LA LÍNEA (apertura → cierre) en aciertos: NHL, NFL, MLB y NBA.
   Datos: datos-nhl.json / datos-nfl.json (rama datos-nhl-nfl) y cierres-<dep>.json (rama cierres). Moneyline de ESPN sin margen.
   Preguntas: 1) ¿quién escoge mejor al ganador, la apertura o el cierre?  2) Con el mismo % de cierre, ¿el favorito al que la línea
   se le movió a favor gana más (o menos) de lo que dice ese %?  Se mide por temporada para ver si se repite.
   Uso: node scripts/medicion/movimiento.js <carpeta con los json> */
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '.';
const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100);
const nv = (h, a) => { const x = imp(h), y = imp(a), s = x + y; return s > 0.98 && s < 1.15 ? x / s : null; };
const leer = f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } };
const temp = (dep, ts) => { const d = new Date(ts), y = d.getUTCFullYear(), m = d.getUTCMonth(); return dep === 'mlb' ? String(y) : (dep === 'nfl' ? String(m < 2 ? y - 1 : y) : (m >= 7 ? y : y - 1) + ''); };
function juegos(dep) {
  const m = new Map();
  [dep === 'nhl' || dep === 'nfl' ? leer('datos-' + dep + '.json') : null, leer('cierres-' + dep + '.json')].forEach(J => {
    if (!J) return;
    Object.values(J.temps || {}).forEach(t => (t.juegos || []).forEach(g => {
      if (!g.done || g.skip || g.neutral || !g.linea || !g.linea.ml || !g.linea.mlOpen || g.hs === g.as) return;
      const pc = nv(g.linea.ml[0], g.linea.ml[1]), po = nv(g.linea.mlOpen[0], g.linea.mlOpen[1]); if (pc === null || po === null) return;
      if (!m.has(g.id)) m.set(g.id, { ts: g.ts, pc, po, gana: g.hs > g.as ? 1 : 0, t: temp(dep, g.ts) });
    }));
  });
  return [...m.values()];
}
const ll = (p, y) => -Math.log(y ? p : 1 - p);
function resumen(G) {
  let aO = 0, aC = 0, lO = 0, lC = 0, flip = 0, flipC = 0;
  G.forEach(g => {
    const fo = g.po >= 0.5 ? 1 : 0, fc = g.pc >= 0.5 ? 1 : 0;
    if (fo === g.gana) aO++; if (fc === g.gana) aC++;
    lO += ll(g.po, g.gana); lC += ll(g.pc, g.gana);
    if (fo !== fc) { flip++; if (fc === g.gana) flipC++; }
  });
  return { n: G.length, aO: 100 * aO / G.length, aC: 100 * aC / G.length, lO: lO / G.length, lC: lC / G.length, flip, flipC };
}
/* con el % de cierre del favorito: real − decía, según cuánto se movió la línea hacia ese favorito */
const CUBOS = [['en contra 3+ pts', -99, -3], ['quieta (±3)', -3, 3], ['a favor 3+ pts', 3, 99]];
function porMovimiento(G) {
  const o = {};
  CUBOS.forEach(([k, lo, hi]) => {
    const S = G.map(g => { const fh = g.pc >= 0.5, p = fh ? g.pc : 1 - g.pc, mv = 100 * (fh ? g.pc - g.po : g.po - g.pc), y = fh ? g.gana : 1 - g.gana; return { p, mv, y }; })
      .filter(x => x.mv >= lo && x.mv < hi);
    if (!S.length) return;
    const n = S.length, real = S.reduce((t, x) => t + x.y, 0) / n, dice = S.reduce((t, x) => t + x.p, 0) / n;
    const se = Math.sqrt(S.reduce((t, x) => t + x.p * (1 - x.p), 0)) / n;
    o[k] = { n, real: 100 * real, dice: 100 * dice, dif: 100 * (real - dice), z: (real - dice) / se };
  });
  return o;
}
const f1 = x => x.toFixed(1), out = [];
const P = s => { out.push(s); console.log(s); };
P('# Movimiento de la línea: apertura → cierre (medido ' + new Date().toISOString().slice(0, 10) + ')\n');
P('Moneyline de ESPN sin margen. «Mover a favor» = el % del favorito de cierre subió desde la apertura.\n');
const TODO = {};
for (const dep of ['nhl', 'nfl', 'mlb', 'nba']) {
  const G = juegos(dep); if (G.length < 100) { P('## ' + dep.toUpperCase() + ': solo ' + G.length + ' juegos con apertura y cierre, no alcanza.\n'); continue; }
  const R = resumen(G), temps = [...new Set(G.map(g => g.t))].sort();
  P('## ' + dep.toUpperCase() + ' · ' + G.length + ' juegos (' + temps[0] + '–' + temps[temps.length - 1] + ')\n');
  P('| | Apertura | Cierre |\n|---|---|---|');
  P('| Escoge al ganador | ' + f1(R.aO) + '% | ' + f1(R.aC) + '% |');
  P('| Pérdida log (más bajo = mejor) | ' + R.lO.toFixed(4) + ' | ' + R.lC.toFixed(4) + ' |');
  P('\nCambió el favorito entre apertura y cierre en ' + R.flip + ' juegos: el de cierre ganó ' + R.flipC + ' (' + f1(100 * R.flipC / Math.max(R.flip, 1)) + '%).\n');
  P('Con el mismo % de cierre, según el movimiento (real − decía; z = qué tan lejos de la suerte):\n');
  P('| Movimiento | Juegos | Real | Decía | Real − decía | z |\n|---|---|---|---|---|---|');
  const M = porMovimiento(G); Object.keys(M).forEach(k => { const x = M[k]; P('| ' + k + ' | ' + x.n + ' | ' + f1(x.real) + '% | ' + f1(x.dice) + '% | ' + (x.dif >= 0 ? '+' : '') + f1(x.dif) + ' | ' + x.z.toFixed(2) + ' |'); });
  P('\nPor temporada (real − decía):\n');
  P('| Temporada | Juegos | ' + CUBOS.map(c => c[0]).join(' | ') + ' |\n|---|---|' + CUBOS.map(() => '---').join('|') + '|');
  temps.forEach(t => { const Gt = G.filter(g => g.t === t); if (Gt.length < 100) return; const Mt = porMovimiento(Gt); P('| ' + t + ' | ' + Gt.length + ' | ' + CUBOS.map(c => Mt[c[0]] ? (Mt[c[0]].dif >= 0 ? '+' : '') + f1(Mt[c[0]].dif) + ' (' + Mt[c[0]].n + ')' : '—').join(' | ') + ' |'); });
  P('');
  TODO[dep] = { R, M };
}
fs.writeFileSync(path.join(process.env.OUT || '.', 'movimiento.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(process.env.OUT || '.', 'movimiento.json'), JSON.stringify(TODO));
