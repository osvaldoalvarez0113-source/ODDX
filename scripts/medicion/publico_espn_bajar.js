'use strict';
/* Baja el pronóstico previo de ESPN (BPI en NBA, FPI en NFL, «ESPN Analytics» en MLB) de cada juego, para compararlo con OVA y el mercado.
   Uso: node scripts/medicion/publico_espn_bajar.js nba filas_nba.json | nfl datos-nfl.json | mlb 2024,2025,2026   -> espn-pred-<dep>.json
   Solo guarda: id, probabilidad del local (0-1), fecha de última modificación y, en MLB, fecha y equipos (para unir con los datos de la app). */
const fs = require('fs'), L = require('../lib_medir.js');
const dep = process.argv[2], arg = process.argv[3];
const RUTA = { nba: 'basketball/leagues/nba', nfl: 'football/leagues/nfl', mlb: 'baseball/leagues/mlb' }[dep];
async function pred(id) {
  const j = await L.pedir('https://sports.core.api.espn.com/v2/sports/' + RUTA + '/events/' + id + '/competitions/' + id + '/predictor?lang=en&region=us');
  const gp = t => { const s = t && t.statistics && t.statistics.find(x => x.name === 'gameProjection'); return s && isFinite(s.value) ? s.value / 100 : null; };
  const h = gp(j.homeTeam), a = gp(j.awayTeam);
  return { h: h !== null ? h : (a !== null ? 1 - a : null), lm: j.lastModified || null };
}
(async function () {
  let lista = [];
  if (dep === 'nba') lista = JSON.parse(fs.readFileSync(arg)).map(r => ({ id: String(r.id) }));
  else if (dep === 'nfl') { const d = JSON.parse(fs.readFileSync(arg)); Object.keys(d.temps).filter(s => +s >= 2019).forEach(s => d.temps[s].juegos.forEach(g => { if (g.done && !g.skip && g.ty === 2) lista.push({ id: String(g.id) }); })); }
  else {
    const dias = []; arg.split(',').forEach(y => { for (let t = Date.UTC(+y, 2, 18); t <= Date.UTC(+y, 9, 2); t += 864e5) { const x = new Date(t); dias.push('' + x.getUTCFullYear() + String(x.getUTCMonth() + 1).padStart(2, '0') + String(x.getUTCDate()).padStart(2, '0')); } });
    const r = await L.pool(dias.map(ds => async () => { const j = await L.pedir('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=' + ds + '&limit=50'); return (j.events || []).filter(e => e.season && e.season.type === 2).map(e => { const c = e.competitions[0], H = c.competitors.find(x => x.homeAway === 'home'), A = c.competitors.find(x => x.homeAway === 'away'); return { id: String(e.id), f: ds, ts: e.date, hAb: H.team.abbreviation, aAb: A.team.abbreviation, hs: +H.score, as: +A.score, fin: !!(c.status && c.status.type && c.status.type.completed) }; }); }), 8);
    const v = {}; [].concat(...r.filter(Boolean)).forEach(e => { if (e.fin) v[e.id] = e; }); lista = Object.values(v);
  }
  console.log(dep, 'juegos a pedir:', lista.length);
  let ok = 0, mal = 0;
  await L.pool(lista.map(o => async () => { try { const p = await pred(o.id); o.h = p.h; o.lm = p.lm; if (p.h !== null) ok++; else mal++; } catch (e) { o.h = null; o.err = String(e.message).slice(0, 60); mal++; } }), 10, (h, t) => { if (h % 1000 === 0) console.log('  ' + h + '/' + t); });
  console.log('con pronóstico:', ok, 'sin:', mal);
  fs.writeFileSync('espn-pred-' + dep + '.json', JSON.stringify(lista));
})().catch(e => { console.error(e); process.exit(1); });
