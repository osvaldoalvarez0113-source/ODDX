'use strict';
async function j(u) { const r = await fetch(u, { headers: { 'user-agent': 'ova-sonda' } }); return r.json(); }
(async () => {
  const base = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/401810083/competitions/401810083/odds/58/propBets?limit=1000';
  const x = await j(base); console.log('count', x.count, 'pageCount', x.pageCount, 'items', x.items.length);
  const tipos = {}; x.items.forEach(i => { const k = i.type && i.type.name; tipos[k] = (tipos[k] || 0) + 1; }); console.log(JSON.stringify(tipos));
  const pts = x.items.filter(i => i.type && i.type.name === 'Total Points'); console.log(JSON.stringify(pts.slice(0, 4), null, 0).slice(0, 3000));
  const k = (await j('https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/events/401802634/competitions/401802634/odds/58/propBets?limit=1000')); const t2 = {}; k.items.forEach(i => { const n = i.type && i.type.name; t2[n] = (t2[n] || 0) + 1; }); console.log('NHL', k.count, JSON.stringify(t2));
  const m = (await j('https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/401695789/competitions/401695789/odds/58/propBets?limit=1000')); const t3 = {}; m.items.forEach(i => { const n = i.type && i.type.name; t3[n] = (t3[n] || 0) + 1; }); console.log('MLB', m.count, JSON.stringify(t3));
  console.log(JSON.stringify(m.items.filter(i => i.type.name === 'Total Strikeouts').slice(0, 2)).slice(0, 1500));
})();
