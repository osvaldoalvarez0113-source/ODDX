'use strict';
// Sonda: ¿hasta qué temporada hacia atrás hay cuotas de cierre (moneyline) en ESPN para MLB y NBA, y en football-data para fútbol?
const fs = require('fs');
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function pedir(url, texto) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { accept: texto ? 'text/csv,*/*' : 'application/json', 'user-agent': 'Mozilla/5.0 (ova-sonda)' } });
      if (r.status === 429 || r.status === 503) { await dormir(1000 * (i + 1)); continue; }
      if (!r.ok) return { err: 'HTTP ' + r.status };
      return { d: texto ? await r.text() : await r.json() };
    } catch (e) { await dormir(600 * (i + 1)); }
  }
  return { err: 'sin respuesta' };
}
const ymd = d => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
const dm = (a, b) => { const o = []; for (let t = Date.parse(a); t <= Date.parse(b); t += 864e5) o.push(new Date(t)); return o; };
function ml(o) {
  const g = (side, k) => { const t = o[side + 'TeamOdds']; if (!t) return null; const c = t.close && t.close.moneyLine && (t.close.moneyLine.american); return k === 'close' ? c : (t.moneyLine != null ? t.moneyLine : null); };
  return { cH: g('home', 'close'), cA: g('away', 'close'), aH: g('home', 'act'), aA: g('away', 'act') };
}
async function sondeo(deporte, liga, temps, ventana, nDias) {
  const out = [];
  for (const [etq, ini, fin] of temps) {
    const dias = dm(ini, fin), paso = Math.max(1, Math.floor(dias.length / nDias)), muestra = [];
    for (let i = 0; i < dias.length; i += paso) muestra.push(dias[i]);
    let ev = 0, conOdds = 0, conClose = 0, prov = {}, ejemplo = null;
    for (const d of muestra) {
      const sb = await pedir('https://site.api.espn.com/apis/site/v2/sports/' + deporte + '/' + liga + '/scoreboard?dates=' + ymd(d) + '&limit=300');
      if (!sb.d || !sb.d.events) continue;
      for (const e of sb.d.events.slice(0, 4)) {
        if (!(e.status && e.status.type && e.status.type.completed)) continue;
        ev++;
        const od = await pedir('https://sports.core.api.espn.com/v2/sports/' + deporte + '/leagues/' + liga + '/events/' + e.id + '/competitions/' + e.id + '/odds');
        const items = od.d && od.d.items || [];
        if (items.length) conOdds++;
        let hay = false;
        items.forEach(o => { const p = (o.provider && o.provider.name) || '?'; prov[p] = (prov[p] || 0) + 1; const m = ml(o); if (m.cH != null && m.cA != null) { hay = true; if (!ejemplo) ejemplo = p + ' ' + m.cH + '/' + m.cA; } });
        if (hay) conClose++;
      }
    }
    out.push(etq + ': eventos muestreados ' + ev + ' | con alguna cuota ' + conOdds + ' | con moneyline de CIERRE ' + conClose + ' | proveedores ' + JSON.stringify(prov) + (ejemplo ? ' | ej ' + ejemplo : ''));
    console.log(out[out.length - 1]);
  }
  return out;
}
(async () => {
  let txt = '## Sonda de cuotas de cierre por temporada\n\n### MLB (ESPN)\n```\n';
  txt += (await sondeo('baseball', 'mlb', [['2019', '2019-04-05', '2019-09-25'], ['2021', '2021-04-05', '2021-09-30'], ['2022', '2022-04-10', '2022-10-01'], ['2023', '2023-04-01', '2023-09-30'], ['2024', '2024-04-01', '2024-09-28']], 0, 14)).join('\n') + '\n```\n\n### NBA (ESPN)\n```\n';
  txt += (await sondeo('basketball', 'nba', [['2018-19', '2018-10-18', '2019-04-10'], ['2020-21', '2020-12-23', '2021-05-15'], ['2021-22', '2021-10-19', '2022-04-10'], ['2022-23', '2022-10-19', '2023-04-09'], ['2023-24', '2023-10-24', '2024-04-14'], ['2024-25', '2024-10-23', '2025-04-13']], 0, 14)).join('\n') + '\n```\n\n### Fútbol (football-data.co.uk, Premier League)\n```\n';
  for (const t of ['1920', '2021', '2122', '2223', '2324', '2425', '2526']) {
    const r = await pedir('https://www.football-data.co.uk/mmz4281/' + t + '/E0.csv', true);
    if (!r.d) { txt += t + ': ' + r.err + '\n'; continue; }
    const lines = r.d.split(/\r?\n/).filter(Boolean), cab = lines[0].split(',');
    const cols = ['PSCH', 'AvgCH', 'B365CH', 'PSH', 'PC>2.5', 'MaxCH'].filter(c => cab.includes(c));
    const iPSC = cab.indexOf('PSCH'); const nPSC = lines.slice(1).filter(l => { const v = l.split(',')[iPSC]; return v && parseFloat(v) > 1; }).length;
    txt += t + ': ' + (lines.length - 1) + ' partidos | columnas con cierre: ' + cols.join(',') + ' | con Pinnacle cierre: ' + nPSC + '\n';
  }
  txt += '```\n';
  fs.writeFileSync('resultado_sonda_6t.txt', txt); console.log(txt);
})();
