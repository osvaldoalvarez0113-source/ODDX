'use strict';
/* Archivo de partidos de la MLB para la app (hist-mlb.json): marcadores de la temporada actual y la anterior,
   con los ids de equipo de la API oficial de la MLB (los mismos que usa index.html).
   Lo usan «Cómo vienen jugando», la memoria por equipo y las Observaciones del Veredicto de MLB.
   Formato igual que hist-nhl.json: { v, dep, generado, teams: {id: [nombre, abreviatura]}, g: [[gamePk, ts, local, visita, carrerasL, carrerasV]] } */
const fs = require('fs');
const API = 'https://statsapi.mlb.com/api/v1';
async function getJSON(url, n) {
  for (let i = 0; i < (n || 4); i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': 'ova-archivo' } }); if (r.ok) return await r.json(); console.log('HTTP ' + r.status + ' ' + url); }
    catch (e) { console.log('error ' + e.message); }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}
/* temporada de una fecha: antes de marzo cuenta la del año pasado */
function temporada(d) { return d.getUTCMonth() >= 1 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }
async function bajar(year) {
  const j = await getJSON(API + '/schedule?sportId=1&season=' + year + '&gameType=R&hydrate=team');
  if (!j || !j.dates) throw new Error('la MLB no devolvió la temporada ' + year);
  const out = [], teams = {};
  j.dates.forEach(d => (d.games || []).forEach(g => {
    const a = g.teams && g.teams.away, h = g.teams && g.teams.home;
    if (!a || !h || !a.team || !h.team) return;
    teams[h.team.id] = [h.team.name || '', h.team.abbreviation || ''];
    teams[a.team.id] = [a.team.name || '', a.team.abbreviation || ''];
    const fin = g.status && (g.status.abstractGameState === 'Final' || g.status.codedGameState === 'F');
    if (!fin || !isFinite(h.score) || !isFinite(a.score)) return;
    if (g.status && /postponed|cancel|suspend/i.test(g.status.detailedState || '')) return;
    out.push([g.gamePk, Date.parse(g.gameDate), h.team.id, a.team.id, h.score, a.score]);
  }));
  return { g: out, teams };
}
(async () => {
  const hoy = new Date(), y = temporada(hoy), todo = { g: [], teams: {} };
  for (const yr of [y - 1, y]) {
    const r = await bajar(yr);
    console.log('temporada ' + yr + ': ' + r.g.length + ' juegos terminados');
    todo.g.push(...r.g); Object.assign(todo.teams, r.teams);
  }
  const vistos = new Set(); todo.g = todo.g.filter(x => !vistos.has(x[0]) && vistos.add(x[0])).sort((a, b) => a[1] - b[1]);
  if (todo.g.length < 500) throw new Error('muy pocos juegos (' + todo.g.length + '): no se guarda');
  const c = { v: 1, dep: 'mlb', generado: new Date().toISOString(), teams: todo.teams, g: todo.g };
  fs.writeFileSync('hist-mlb.json', JSON.stringify(c));
  console.log('hist-mlb.json: ' + c.g.length + ' juegos, ' + Object.keys(c.teams).length + ' equipos, ' + (JSON.stringify(c).length / 1024).toFixed(0) + ' KB');
})().catch(e => { console.error(e.message); process.exit(1); });
