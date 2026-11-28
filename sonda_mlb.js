'use strict';
// Sonda: estructura de ESPN para MLB (odds del marcador, propBets, gamelog, boxscore) en juegos de 2026 ya jugados.
const fs = require('fs'), log = [];
const get = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'ova' } }); return r.ok ? await r.json() : { _st: r.status }; } catch (e) { return { _err: e.message }; } };
const P = (...a) => log.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
(async () => {
  for (const d of ['20260920', '20260601']) {
    const sb = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${d}`);
    const ev = (sb.events || [])[0]; if (!ev) { P('sin eventos', d, sb); continue; }
    const c = ev.competitions[0];
    P('== EVENTO', d, ev.id, ev.name, ev.date, c.competitors.map(x => [x.homeAway, x.team.id, x.team.displayName, x.team.shortDisplayName, x.team.abbreviation, x.score]));
    P('odds marcador:', JSON.stringify((c.odds || [])[0] || null).slice(0, 1500));
    const base = `https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/${ev.id}/competitions/${ev.id}`;
    const od = await get(base + '/odds'); P('proveedores odds:', ((od.items || []).map(i => i.provider && [i.provider.id, i.provider.name])));
    for (const prov of ['100', '58', '1002']) {
      const pb = await get(base + `/odds/${prov}/propBets?limit=1000&page=1`);
      if (!pb.items) { P('propBets', prov, 'nada', pb._st || pb._err || ''); continue; }
      const tipos = {}; pb.items.forEach(i => { const t = i.type && i.type.name; tipos[t] = (tipos[t] || 0) + 1; });
      P('propBets', prov, 'items', pb.items.length, 'pageCount', pb.pageCount, 'tipos', tipos);
      P('ejemplo item:', JSON.stringify(pb.items[0]).slice(0, 900));
      const kItem = pb.items.find(i => /Strikeouts/.test(i.type && i.type.name)), hItem = pb.items.find(i => /^Total Hits$/.test(i.type && i.type.name));
      for (const [nom, it] of [['pitcher', kItem], ['bateador', hItem]]) {
        if (!it) continue; const m = /athletes\/(\d+)/.exec(it.athlete.$ref); if (!m) continue;
        const gl = await get(`https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/${m[1]}/gamelog`);
        P('gamelog', nom, m[1], 'names', gl.names, 'labels', gl.labels, 'seasonTypes', (gl.seasonTypes || []).map(s => [s.displayName, (s.categories || []).map(c => [c.type, c.displayName, (c.events || []).length])]).slice(0, 3));
        const e0 = (((gl.seasonTypes || [])[0] || {}).categories || []).find(c => c.events && c.events.length); if (e0) P('ejemplo gamelog evento:', JSON.stringify(e0.events[0]).slice(0, 400));
      }
      break;
    }
    const sum = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${ev.id}`);
    ((sum.boxscore && sum.boxscore.players) || []).slice(0, 1).forEach(t => (t.statistics || []).forEach(g => P('box grupo', g.name, g.type, 'keys', g.keys, 'labels', g.labels, 'ej', (g.athletes || [])[0] && { id: g.athletes[0].athlete.id, s: g.athletes[0].stats, pos: g.athletes[0].position && g.athletes[0].position.abbreviation, starter: g.athletes[0].starter })));
    const r = await get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${c.competitors[0].team.id}/roster`);
    P('roster', Object.keys(r), JSON.stringify((r.athletes || [])[0]).slice(0, 500));
  }
  fs.writeFileSync('sonda_mlb.txt', log.join('\n') + '\n'); console.log(log.join('\n'));
})();
