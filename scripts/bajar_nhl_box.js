/* Baja de la API oficial de la NHL (api-web.nhle.com) los datos por juego que el modelo de OVA no tiene:
   tiros a puerta, portero titular (tiros recibidos, atajadas) y power play. Temporadas 2022-23 a la actual.
   Lo corre el workflow «Datos NHL por juego»; guarda nhl-box.json en la rama datos-nhl-box. No toca la app. */
'use strict';
const fs = require('fs');
const OUT = process.env.OVA_OUT || 'nhl-box.json';
const TEMPS = [2022, 2023, 2024, 2025, 2026];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'ova-medicion' } });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch (e) { }
    await sleep(800 * (i + 1));
  }
  return null;
}
function portero(lista) {
  const g = (lista || []).filter(x => x && x.starter)[0] || (lista || [])[0];
  if (!g) return null;
  const sa = g.shotsAgainst != null ? g.shotsAgainst : (g.saveShotsAgainst ? +String(g.saveShotsAgainst).split('/')[1] : null);
  const sv = g.saves != null ? g.saves : (g.saveShotsAgainst ? +String(g.saveShotsAgainst).split('/')[0] : null);
  return { id: g.playerId, n: g.name && (g.name.default || g.name), sa: sa, sv: sv, ga: g.goalsAgainst, toi: g.toi, todos: (lista || []).length };
}
function pp(rr, lado) {
  const st = rr && rr.teamGameStats;
  const f = (st || []).filter(x => x.category === 'powerPlay')[0];
  if (!f) return null;
  const v = String(lado === 'h' ? f.homeValue : f.awayValue).split('/');
  return v.length === 2 ? [+v[0], +v[1]] : null;
}
async function juego(id) {
  const b = await get('https://api-web.nhle.com/v1/gamecenter/' + id + '/boxscore');
  if (!b || !b.homeTeam) return null;
  if (!/^(OFF|FINAL)$/.test(b.gameState || '')) return { id: id, fin: false };
  const rr = await get('https://api-web.nhle.com/v1/gamecenter/' + id + '/right-rail');
  const pg = b.playerByGameStats || {};
  return {
    id: id, fin: true, d: b.gameDate, ts: Date.parse(b.startTimeUTC), pt: b.gameOutcome && b.gameOutcome.lastPeriodType,
    h: b.homeTeam.abbrev, a: b.awayTeam.abbrev, hs: b.homeTeam.score, as: b.awayTeam.score, hsog: b.homeTeam.sog, asog: b.awayTeam.sog,
    gH: portero(pg.homeTeam && pg.homeTeam.goalies), gA: portero(pg.awayTeam && pg.awayTeam.goalies),
    ppH: pp(rr, 'h'), ppA: pp(rr, 'a')
  };
}
(async function () {
  let viejo = {}; try { (JSON.parse(fs.readFileSync(OUT, 'utf8')).g || []).forEach(g => { if (g.fin) viejo[g.id] = g; }); } catch (e) { }
  const ids = [], maxFin = {};
  Object.keys(viejo).forEach(id => { const t = Math.floor(id / 1e6), n = id % 10000; if (!(maxFin[t] >= n)) maxFin[t] = n; });
  /* temporada en curso: solo un poco más allá del último juego terminado (así no pregunta por los ~1,000 que faltan cada día) */
  TEMPS.forEach(t => { const tope = maxFin[t] ? Math.min(1312, maxFin[t] + 120) : 1312; for (let n = 1; n <= tope; n++) ids.push(t * 1e6 + 20000 + n); });
  const out = []; let i = 0, nuevos = 0, vacios = 0;
  async function obrero() {
    while (i < ids.length) {
      const id = ids[i++];
      if (viejo[id]) { out.push(viejo[id]); continue; }
      const g = await juego(id); if (g && g.fin) { out.push(g); nuevos++; } else vacios++;
      if ((nuevos + vacios) % 250 === 0) console.log('van', nuevos, 'nuevos,', vacios, 'sin jugar o sin dato');
    }
  }
  await Promise.all([1, 2, 3, 4, 5, 6].map(obrero));
  out.sort((a, b) => a.ts - b.ts);
  fs.writeFileSync(OUT, JSON.stringify({ generado: new Date().toISOString(), g: out }));
  console.log('listo:', out.length, 'juegos (', nuevos, 'nuevos )');
  if (out.length < 1000) process.exit(1);
})();
