'use strict';
// Prueba si ESPN trae props de jugador (hoy y de juegos pasados). Solo lee.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function j(u) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-sonda' } }); const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {} return { s: r.status, x, t: t.slice(0, 300) }; } catch (e) { return { s: 'err ' + e.message }; } }
const D = { nba: ['basketball', 'nba'], nhl: ['hockey', 'nhl'], nfl: ['football', 'nfl'], mlb: ['baseball', 'mlb'] };
(async () => {
  for (const [k, [sp, lg]] of Object.entries(D)) {
    for (const dia of [null, '20251115', '20250601', '20241115']) {
      const sb = await j(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/scoreboard${dia ? '?dates=' + dia : ''}`);
      const ev = sb.x && sb.x.events && sb.x.events[0]; if (!ev) { console.log(k, dia, 'sin eventos', sb.s); continue; }
      const base = `https://sports.core.api.espn.com/v2/sports/${sp}/leagues/${lg}/events/${ev.id}/competitions/${ev.id}`;
      const od = await j(base + '/odds');
      const items = (od.x && od.x.items) || [];
      const provs = items.map(i => (i.provider && (i.provider.id + ':' + i.provider.name)) || '?');
      let pb = null;
      for (const it of items.slice(0, 4)) { const pid = it.provider && it.provider.id; if (!pid) continue; const r = await j(base + '/odds/' + pid + '/propBets?limit=1000'); if (r.x && r.x.count) { pb = { pid, count: r.x.count, ej: JSON.stringify(r.x.items && r.x.items[0]).slice(0, 500) }; break; } else pb = { pid, s: r.s, t: (r.t || '').slice(0, 120) }; await sleep(200); }
      console.log(`${k} ${dia || 'hoy'} evento ${ev.id} ${ev.name} | odds ${od.s} proveedores ${provs.join(',')} | props ${JSON.stringify(pb)}`);
      await sleep(300);
    }
  }
})();
