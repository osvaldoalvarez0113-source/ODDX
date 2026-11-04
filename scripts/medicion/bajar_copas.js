'use strict';
// Baja de ESPN los partidos y cuotas de copas europeas, copas nacionales y selecciones. Uso: node scripts/medicion/bajar_copas.js partidos_copas.json
const fs = require('fs');
const { pedir, pool, errores } = require('./jugadores/lib.js');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const CLUB = { 'uefa.champions': 'europa', 'uefa.europa': 'europa', 'uefa.europa.conf': 'europa', 'eng.fa': 'copa', 'ger.dfb_pokal': 'copa', 'ita.coppa_italia': 'copa', 'fra.coupe_de_france': 'copa', 'esp.copa_del_rey': 'copa' };
const SEL = { 'fifa.friendly': 'amistoso', 'uefa.nations': 'liga de naciones', 'concacaf.nations.league': 'liga de naciones', 'fifa.worldq.uefa': 'eliminatoria', 'fifa.worldq.concacaf': 'eliminatoria', 'fifa.worldq.conmebol': 'eliminatoria', 'fifa.worldq.afc': 'eliminatoria', 'fifa.worldq.caf': 'eliminatoria', 'uefa.euroq': 'eliminatoria', 'fifa.world': 'mundial', 'uefa.euro': 'torneo', 'conmebol.america': 'torneo', 'concacaf.gold': 'torneo', 'caf.nations': 'torneo', 'afc.asian.cup': 'torneo' };
const ANIOS = []; for (let y = 2018; y <= new Date().getUTCFullYear(); y++) ANIOS.push(y);   // ESPN ya no acepta rangos de fechas (HTTP 400); sí acepta el año entero
const am = v => { if (v == null) return null; const s = String(v).trim().toUpperCase(); if (s === 'EVEN' || s === 'EV') return 2; const n = parseFloat(s.replace(/[^0-9.+-]/g, '')); if (!isFinite(n) || Math.abs(n) < 100) return null; return n > 0 ? 1 + n / 100 : 1 + 100 / -n; };
// Cuota previa: «ESPN BET» o DraftKings en summary.odds. «Bet 365» y «Live Odds» quedan con el precio de después del partido (1/500, 450/1): no sirven.
function cuotas(lista) {
  for (const nom of ['DraftKings', 'ESPN BET']) {
    const o = (lista || []).find(q => q.provider && q.provider.name === nom); if (!o) continue;
    const c = [am(o.homeTeamOdds && o.homeTeamOdds.moneyLine), am(o.drawOdds && o.drawOdds.moneyLine), am(o.awayTeamOdds && o.awayTeamOdds.moneyLine)];
    if (c.every(Boolean)) return { prov: nom, c, ou: o.overUnder != null ? o.overUnder : null, over: am(o.overOdds), under: am(o.underOdds) };
  }
  return null;
}
(async () => {
  const todos = { ...CLUB, ...SEL, 'eng.1': 'control' }, ev = new Map();   // Premier: control para comparar estas cuotas con Pinnacle
  const tareas = []; Object.keys(todos).forEach(sl => ANIOS.forEach(a => tareas.push(async () => {
    const j = await pedir(ESPN + sl + '/scoreboard?dates=' + a + '&limit=1000');
    ((j && j.events) || []).forEach(e => { try {
      const c = e.competitions[0], st = (e.status && e.status.type) || {}; if (st.completed !== true) return;
      let h = null, v = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else v = x; }); if (!h || !v) return;
      const gh = parseInt(h.score, 10), ga = parseInt(v.score, 10); if (!isFinite(gh) || !isFinite(ga)) return;
      ev.set(sl + e.id, { id: String(e.id), sl, tipo: todos[sl], d: Date.parse(e.date), h: h.team.displayName, a: v.team.displayName, gh, ga, est: st.name, neutral: !!c.neutralSite, nota: (c.notes && c.notes[0] && c.notes[0].headline) || (e.season && e.season.slug) || '' });
    } catch (x) {} });
  })));
  await pool(tareas, 2, (h, t) => { if (h % 200 === 0) console.log('calendario ' + h + '/' + t); });
  const lista = [...ev.values()]; console.log('partidos', lista.length);
  let muestra = null;
  // cuotas: todo desde 2023; antes, 1 de cada 40 solo para ver si ESPN las guardaba
  const pedirCuota = lista.filter((x, i) => x.tipo === 'control' ? x.d >= Date.UTC(2023, 7, 1) : (x.d >= Date.UTC(2023, 0, 1) || i % 40 === 0)); console.log('cuotas a pedir', pedirCuota.length);
  await pool(pedirCuota.map(x => async () => { const j = await pedir(ESPN + x.sl + '/summary?event=' + x.id); if (!muestra && j && j.odds && j.odds.length) muestra = j.odds.map(o => ({ p: o.provider && o.provider.name, h: o.homeTeamOdds && o.homeTeamOdds.moneyLine, d: o.drawOdds && o.drawOdds.moneyLine, a: o.awayTeamOdds && o.awayTeamOdds.moneyLine })); const c = j && cuotas(j.odds); if (c) x.cu = c; }), 2, (h, t) => { if (h % 1000 === 0) console.log('cuotas ' + h + '/' + t); });
  console.log('muestra de cuotas:', JSON.stringify(muestra).slice(0, 600));
  const res = {}; lista.forEach(x => { const a = new Date(x.d).getUTCFullYear(), k = x.sl + ' ' + a; const r = res[k] || (res[k] = [0, 0, 0]); r[0]++; if (x.cu && x.cu.c) r[1]++;  });
  Object.keys(res).sort().forEach(k => console.log(k, 'partidos', res[k][0], 'con cuota', res[k][1]));
  console.log('errores', errores.length, errores.slice(0, 5));
  fs.writeFileSync(process.argv[2] || 'partidos_copas.json', JSON.stringify(lista));
})().catch(e => { console.error(e); process.exit(1); });
