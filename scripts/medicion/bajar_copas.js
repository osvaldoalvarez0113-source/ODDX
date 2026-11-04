'use strict';
// Baja de ESPN los partidos y cuotas de copas europeas, copas nacionales y selecciones. Uso: node scripts/medicion/bajar_copas.js partidos_copas.json
const fs = require('fs');
const { pedir, pool, errores } = require('./jugadores/lib.js');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const CLUB = { 'uefa.champions': 'europa', 'uefa.europa': 'europa', 'uefa.europa.conf': 'europa', 'eng.fa': 'copa', 'ger.dfb_pokal': 'copa', 'ita.coppa_italia': 'copa', 'fra.coupe_de_france': 'copa', 'esp.copa_del_rey': 'copa' };
const SEL = { 'fifa.friendly': 'amistoso', 'uefa.nations': 'liga de naciones', 'concacaf.nations.league': 'liga de naciones', 'fifa.worldq.uefa': 'eliminatoria', 'fifa.worldq.concacaf': 'eliminatoria', 'fifa.worldq.conmebol': 'eliminatoria', 'fifa.worldq.afc': 'eliminatoria', 'fifa.worldq.caf': 'eliminatoria', 'uefa.euroq': 'eliminatoria', 'fifa.world': 'mundial', 'uefa.euro': 'torneo', 'conmebol.america': 'torneo', 'concacaf.gold': 'torneo', 'caf.nations': 'torneo', 'afc.asian.cup': 'torneo' };
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const meses = []; for (let y = 2018, m = 7; new Date(Date.UTC(y, m, 1)) < new Date(); m === 11 ? (y++, m = 0) : m++) meses.push([new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m + 1, 0))]);
const am = v => { if (v == null) return null; const s = String(v).trim().toUpperCase(); if (s === 'EVEN' || s === 'EV') return 2; const n = parseFloat(s.replace(/[^0-9.+-]/g, '')); if (!isFinite(n) || Math.abs(n) < 100) return null; return n > 0 ? 1 + n / 100 : 1 + 100 / -n; };
function cuotas(pc) {
  const r = { prov: pc.provider && pc.provider.name };
  const ml = pc.moneyline || {}, sac = (h, k) => am(h && h[k] && (h[k].odds != null ? h[k].odds : h[k].alternateDisplayValue));
  r.c = [am(pc.homeTeamOdds && pc.homeTeamOdds.moneyLine), am(pc.drawOdds && pc.drawOdds.moneyLine), am(pc.awayTeamOdds && pc.awayTeamOdds.moneyLine)];
  const cc = [sac(ml.home, 'close'), sac(ml.draw, 'close'), sac(ml.away, 'close')], oo = [sac(ml.home, 'open'), sac(ml.draw, 'open'), sac(ml.away, 'open')];
  if (cc.every(Boolean)) r.c = cc; if (oo.every(Boolean)) r.o = oo;
  if (!r.c.every(Boolean)) r.c = null;
  if (pc.overUnder != null) r.ou = pc.overUnder;
  return r;
}
(async () => {
  const todos = { ...CLUB, ...SEL }, ev = new Map();
  const tareas = []; Object.keys(todos).forEach(sl => meses.forEach(([a, b]) => tareas.push(async () => {
    const j = await pedir(ESPN + sl + '/scoreboard?dates=' + ymd(a) + '-' + ymd(b) + '&limit=1000');
    ((j && j.events) || []).forEach(e => { try {
      const c = e.competitions[0], st = (e.status && e.status.type) || {}; if (st.completed !== true) return;
      let h = null, v = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else v = x; }); if (!h || !v) return;
      const gh = parseInt(h.score, 10), ga = parseInt(v.score, 10); if (!isFinite(gh) || !isFinite(ga)) return;
      ev.set(sl + e.id, { id: String(e.id), sl, tipo: todos[sl], d: Date.parse(e.date), h: h.team.displayName, a: v.team.displayName, gh, ga, est: st.name, neutral: !!c.neutralSite, nota: (c.notes && c.notes[0] && c.notes[0].headline) || (e.season && e.season.slug) || '' });
    } catch (x) {} });
  })));
  await pool(tareas, 8, (h, t) => { if (h % 200 === 0) console.log('calendario ' + h + '/' + t); });
  const lista = [...ev.values()]; console.log('partidos', lista.length);
  let muestra = null;
  await pool(lista.map(x => async () => { const j = await pedir(ESPN + x.sl + '/summary?event=' + x.id); const pc = j && j.pickcenter && j.pickcenter[0]; if (pc) { if (!muestra) muestra = pc; x.cu = cuotas(pc); } }), 8, (h, t) => { if (h % 1000 === 0) console.log('cuotas ' + h + '/' + t); });
  console.log('muestra pickcenter:', JSON.stringify(muestra).slice(0, 1200));
  const res = {}; lista.forEach(x => { const a = new Date(x.d).getUTCFullYear(), k = x.sl + ' ' + a; const r = res[k] || (res[k] = [0, 0, 0]); r[0]++; if (x.cu && x.cu.c) r[1]++; if (x.cu && x.cu.o) r[2]++; });
  Object.keys(res).sort().forEach(k => console.log(k, 'partidos', res[k][0], 'con cierre', res[k][1], 'con apertura', res[k][2]));
  console.log('errores', errores.length, errores.slice(0, 5));
  fs.writeFileSync(process.argv[2] || 'partidos_copas.json', JSON.stringify(lista));
})().catch(e => { console.error(e); process.exit(1); });
