'use strict';
// Solo mide. Corre en GitHub Actions. Props de jugador de ESPN (línea de APERTURA, antes del juego) y lo que hizo el jugador (boxscore).
// Uso: node scripts/medicion/props_jugador.js nba|nhl|mlb|nfl   -> props_<dep>.json (una fila por prop con over y under de apertura)
const fs = require('fs');
const DEP = process.argv[2];
const CFG = {
  nba: { r: ['basketball', 'nba'], tramos: [['20241022', '20250413'], ['20251021', '20260412'], ['20261020', '']],
    tipos: { 'Total Points': ['points'], 'Total Rebounds': ['rebounds'], 'Total Assists': ['assists'], 'Total 3-Point Field Goals': ['threePointFieldGoalsMade'], 'Total Points, Rebounds, and Assists': ['points', 'rebounds', 'assists'], 'Total Points and Rebounds': ['points', 'rebounds'], 'Total Points and Assists': ['points', 'assists'] } },
  nhl: { r: ['hockey', 'nhl'], tramos: [['20241004', '20250417'], ['20251007', '20260416'], ['20261007', '']],
    tipos: { 'Total Shots on Goal': ['shotsTotal'], 'Total Points': ['goals', 'assists'], 'Total Goals': ['goals'], 'Total Assists': ['assists'], 'Total Saves': ['saves'] } },
  mlb: { r: ['baseball', 'mlb'], tramos: [['20250327', '20250928'], ['20260325', '20260927']],
    tipos: { 'Total Strikeouts': ['P:strikeouts'], 'Total Hits': ['B:hits'], 'Total Bases': ['B:TB'], 'Total Home Runs Hit': ['B:homeRuns'], 'Total Runs Scored': ['B:runs'], 'Total RBIs': ['B:RBIs'], 'Total Hits + Runs + RBIs': ['B:hits', 'B:runs', 'B:RBIs'], 'Total Outs Recorded': ['P:OUTS'], 'Earned Runs Allowed': ['P:earnedRuns'], 'Total Hits Allowed': ['P:hits'] } },
  nfl: { r: ['football', 'nfl'], tramos: [['20240905', '20250210'], ['20250904', '20260210'], ['20260909', '']],
    tipos: { 'Total Passing Yards': ['passing:passingYards'], 'Total Rushing Yards': ['rushing:rushingYards'], 'Total Receiving Yards': ['receiving:receivingYards'], 'Total Receptions': ['receiving:receptions'], 'Total Passing Touchdowns': ['passing:passingTouchdowns'], 'Total Rushing Attempts': ['rushing:rushingAttempts'], 'Total Passing Completions': ['passing:completions'], 'Total Passing Attempts': ['passing:passingAttempts'] } } }[DEP];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch (e) {} await sleep(700 * (i + 1)); } return null; }
async function pool(t, k) { let i = 0, h = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < t.length) { const f = t[i++]; await f(); if (++h % 300 === 0) console.log('juegos ' + h + '/' + t.length); await sleep(50); } })); }
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const tipoBase = n => { const s = String(n || '').replace(/\s*\(incl\. overtime\)/i, ''); return s; };
const num = v => { if (v == null) return null; const s = String(v); if (s.includes('/') && !s.includes('-')) return null; const n = parseFloat(s.split('-')[0]); return isFinite(n) ? n : null; };
function stats(box) { // id → {clave: valor}, clave con prefijo del grupo (P:, B:, passing:, …) y sin prefijo
  const o = {};
  ((box && box.players) || []).forEach(t => (t.statistics || []).forEach(g => { const keys = g.keys || g.names || [], grp = g.name || g.type || ''; const pre = DEP === 'mlb' ? (/pitch/i.test(grp) ? 'P:' : 'B:') : (DEP === 'nfl' ? grp + ':' : '');
    (g.athletes || []).forEach(a => { if (!a.athlete || !a.stats || !a.stats.length || a.didNotPlay) return; const id = String(a.athlete.id), s = o[id] || (o[id] = {}); keys.forEach((k, i) => { let v = num(a.stats[i]); if (k === 'threePointFieldGoalsMade-threePointFieldGoalsAttempted') { s.threePointFieldGoalsMade = num(a.stats[i]); return; } if (v == null) return; s[pre + k] = v; if (!pre) s[k] = v; });
      if (DEP === 'mlb') { if (s['B:hits'] != null && s['B:TB'] == null) { const kk = keys; } if (/pitch/i.test(grp)) { const ip = a.stats[keys.indexOf('fullInnings.partInnings')] || a.stats[keys.indexOf('innings')]; if (ip != null) { const [w, f] = String(ip).split('.'); s['P:OUTS'] = (+w) * 3 + (+(f || 0)); } } }
    }); }));
  return o;
}
function totalBases(sum) { // MLB: bases totales desde el resumen (dobles, triples, jonrones vienen en "details")
  const o = {}; try { ((sum.boxscore && sum.boxscore.players) || []).forEach(t => (t.statistics || []).forEach(g => { if (/pitch/i.test(g.name || g.type || '')) return; (g.athletes || []).forEach(a => { const k = g.keys || [], h = num(a.stats[k.indexOf('hits')]), hr = num(a.stats[k.indexOf('homeRuns')]); if (h != null) o[String(a.athlete.id)] = { h, hr: hr || 0 }; }); })); } catch (e) {}
  return o;
}
(async () => {
  const [sp, lg] = CFG.r, filas = [], llaves = {}; let juegos = 0, conProps = 0;
  for (const [a, b] of CFG.tramos) {
    const fin = b ? new Date(b.slice(0, 4) + '-' + b.slice(4, 6) + '-' + b.slice(6)) : new Date(Date.now() - 864e5); const dias = [];
    for (let d = new Date(a.slice(0, 4) + '-' + a.slice(4, 6) + '-' + a.slice(6)); d <= fin; d = new Date(+d + 864e5)) dias.push(ymd(d));
    const ev = []; await pool(dias.map(d => async () => { const s = await get(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/scoreboard?dates=${d}&limit=40`); ((s && s.events) || []).forEach(e => { try { const st = e.status.type; if (!st.completed || (e.season && e.season.type !== 2 && e.season.type !== 3)) return; ev.push({ id: e.id, d, s: a.slice(0, 4) }); } catch (x) {} }); }), 6);
    console.log(`${DEP} ${a}: ${ev.length} juegos`); juegos += ev.length;
    await pool(ev.map(e => async () => {
      const base = `https://sports.core.api.espn.com/v2/sports/${sp}/leagues/${lg}/events/${e.id}/competitions/${e.id}`;
      const od = await get(base + '/odds'); const provs = ((od && od.items) || []).filter(i => i.provider && i.provider.id && !/live/i.test(String(i.provider.name || ''))).map(i => i.provider.id);
      let items = []; for (const p of [...new Set(provs)]) { let pg = 1, all = []; for (;;) { const r = await get(`${base}/odds/${p}/propBets?limit=1000&page=${pg}`, 3); if (!r || !r.items) break; all = all.concat(r.items); if (!r.pageCount || pg >= r.pageCount) break; pg++; } if (all.length) { items = all; break; } }
      if (!items.length) return; conProps++;
      const sum = await get(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/summary?event=${e.id}`, 3); if (!sum) return; const st = stats(sum.boxscore), tb = DEP === 'mlb' ? totalBases(sum) : null;
      const par = {};
      items.forEach(it => { const t = tipoBase(it.type && it.type.name); if (!CFG.tipos[t]) return; const m = /athletes\/(\d+)/.exec((it.athlete && it.athlete.$ref) || ''); if (!m) return; const op = it.open || {}; const tg = op.target && op.target.value; if (!isFinite(tg)) return; const k = m[1] + '|' + t + '|' + tg, p = par[k] || (par[k] = { id: m[1], t, l: tg }); if (op.over && op.over.decimal > 1) p.o = op.over.decimal; if (op.under && op.under.decimal > 1) p.u = op.under.decimal; });
      Object.values(par).forEach(p => { if (!p.o || !p.u) return; const s = st[p.id]; if (!s) return; let v = 0, ok = true;
        CFG.tipos[p.t].forEach(c => { let x = s[c]; if (c === 'B:TB' && x == null && tb && tb[p.id]) x = null; if (x == null) { ok = false; return; } v += x; }); if (!ok) { (llaves[p.t] = llaves[p.t] || Object.keys(s).slice(0, 40).join(',')); return; }
        filas.push({ s: e.s, d: e.d, t: p.t, l: p.l, o: +p.o.toFixed(3), u: +p.u.toFixed(3), v }); });
    }), 6);
    console.log(`${DEP} ${a}: con props ${conProps}, filas ${filas.length}`);
  }
  console.log('Llaves cuando faltó la estadística: ' + JSON.stringify(llaves).slice(0, 2000));
  fs.writeFileSync('props_' + DEP + '.json', JSON.stringify(filas)); console.log(`FIN ${DEP}: juegos ${juegos}, con props ${conProps}, filas ${filas.length}`);
})().catch(e => { console.error(e); process.exit(1); });
