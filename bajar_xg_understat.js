'use strict';
// Baja el xG por partido de Understat (5 ligas, temporadas 2018-19 en adelante) y lo deja en xg-futbol.json.
// Primero prueba la API (getLeagueData, con X-Requested-With); si no, lee el datesData del HTML viejo.
const fs = require('fs');
const LIGAS = { EPL: 'E0', La_liga: 'SP1', Bundesliga: 'D1', Serie_A: 'I1', Ligue_1: 'F1' };
const ANOS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const UA = 'Mozilla/5.0 (ova-medicion, uso personal no comercial)';
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function api(liga, ano) {
  const r = await fetch(`https://understat.com/getLeagueData/${liga}/${ano}`, { headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Referer: `https://understat.com/league/${liga}/${ano}` } });
  if (!r.ok) throw new Error('api ' + r.status);
  const j = await r.json(); if (!j.dates) throw new Error('api sin dates'); return j.dates;
}
async function html(liga, ano) {
  const r = await fetch(`https://understat.com/league/${liga}/${ano}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('html ' + r.status);
  const t = await r.text(); const m = t.match(/datesData\s*=\s*JSON\.parse\('([^']+)'\)/);
  if (!m) throw new Error('html sin datesData');
  return JSON.parse(m[1].replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
}
(async () => {
  const out = []; const log = [];
  for (const [liga, lg] of Object.entries(LIGAS)) for (const ano of ANOS) {
    let d = null, via = '';
    for (const [nom, f] of [['api', api], ['html', html]]) { try { d = await f(liga, ano); via = nom; break; } catch (e) { log.push(`${liga} ${ano} ${nom}: ${e.message}`); } }
    if (!d) continue;
    let n = 0;
    for (const g of d) {
      if (!g.isResult) continue;
      out.push({ lg, t: String(ano % 100).padStart(2, '0') + String((ano + 1) % 100).padStart(2, '0'), fecha: g.datetime, h: g.h.title, a: g.a.title, gh: +g.goals.h, ga: +g.goals.a, xh: +g.xG.h, xa: +g.xG.a });
      n++;
    }
    log.push(`${liga} ${ano}: ${n} partidos (${via})`);
    await dormir(1500);
  }
  fs.writeFileSync('xg-futbol.json', JSON.stringify(out));
  fs.writeFileSync('bajar_xg.txt', log.join('\n') + `\nTotal: ${out.length}\n`);
  console.log(log.join('\n'), '\nTotal', out.length);
})();
