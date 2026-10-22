'use strict';
// Sonda 2: ¿hay moneyline (de cualquier tipo) en ESPN para temporadas viejas? ¿y fuentes externas de cierre para MLB/NBA?
const fs = require('fs');
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function pedir(url, modo) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { accept: '*/*', 'user-agent': 'Mozilla/5.0 (ova-sonda)' }, redirect: 'follow' });
      if (r.status === 429 || r.status === 503) { await dormir(1000 * (i + 1)); continue; }
      if (!r.ok) return { err: 'HTTP ' + r.status };
      if (modo === 'buf') { const b = Buffer.from(await r.arrayBuffer()); return { d: b }; }
      return { d: await r.json() };
    } catch (e) { await dormir(600 * (i + 1)); }
  }
  return { err: 'sin respuesta' };
}
const ymd = d => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
function amer(x) { if (x == null) return null; const v = parseFloat(String(x).replace('EVEN', '100')); return isFinite(v) && Math.abs(v) >= 100 ? v : null; }
function mlAny(o) {   // cualquier moneyline que se encuentre, y de que campo salio
  const campos = [];
  ['home', 'away'].forEach(s => {
    const t = o[s + 'TeamOdds']; if (!t) return;
    if (t.close && t.close.moneyLine && amer(t.close.moneyLine.american) !== null) campos.push(s + '.close');
    if (t.current && t.current.moneyLine && amer(t.current.moneyLine.american) !== null) campos.push(s + '.current');
    if (t.open && t.open.moneyLine && amer(t.open.moneyLine.american) !== null) campos.push(s + '.open');
    if (amer(t.moneyLine) !== null) campos.push(s + '.plano');
  });
  return campos;
}
async function sondeo(deporte, liga, temps, nDias) {
  const out = [];
  for (const [etq, ini, fin] of temps) {
    const dias = []; for (let t = Date.parse(ini); t <= Date.parse(fin); t += 864e5) dias.push(new Date(t));
    const paso = Math.max(1, Math.floor(dias.length / nDias)); let ev = 0, conML = 0, campos = {}, raw = null, provML = {};
    for (let i = 0; i < dias.length; i += paso) {
      const sb = await pedir('https://site.api.espn.com/apis/site/v2/sports/' + deporte + '/' + liga + '/scoreboard?dates=' + ymd(dias[i]) + '&limit=300');
      if (!sb.d || !sb.d.events) continue;
      for (const e of sb.d.events.slice(0, 3)) {
        if (!(e.status && e.status.type && e.status.type.completed)) continue;
        ev++;
        const od = await pedir('https://sports.core.api.espn.com/v2/sports/' + deporte + '/leagues/' + liga + '/events/' + e.id + '/competitions/' + e.id + '/odds');
        const items = od.d && od.d.items || []; let hay = false;
        items.forEach(o => { const c = mlAny(o); if (c.length) { hay = true; c.forEach(k => campos[k] = (campos[k] || 0) + 1); const p = (o.provider && o.provider.name) || '?'; provML[p] = (provML[p] || 0) + 1; } });
        if (!raw && items.length) raw = JSON.stringify(items[0]).slice(0, 900);
        if (hay) conML++;
      }
    }
    out.push(etq + ': eventos ' + ev + ' | con ML de cualquier tipo ' + conML + ' | campos ' + JSON.stringify(campos) + ' | prov con ML ' + JSON.stringify(provML) + '\n   RAW: ' + raw);
    console.log(out[out.length - 1]);
  }
  return out;
}
(async () => {
  let txt = '## Sonda 2\n\n### ESPN moneyline de cualquier tipo\n```\n';
  txt += (await sondeo('baseball', 'mlb', [['2021', '2021-04-05', '2021-09-30'], ['2022', '2022-04-10', '2022-10-01'], ['2023', '2023-04-01', '2023-09-30']], 12)).join('\n') + '\n';
  txt += (await sondeo('basketball', 'nba', [['2020-21', '2020-12-23', '2021-05-15'], ['2021-22', '2021-10-19', '2022-04-10']], 12)).join('\n') + '\n```\n\n### Fuentes externas\n```\n';
  const urls = [
    'https://www.aussportsbetting.com/historical_data/mlb.xlsx', 'https://www.aussportsbetting.com/historical_data/nba.xlsx',
    'https://www.sportsbookreviewsonline.com/scoresoddsarchives/mlb/mlb%20odds%202021.xlsx', 'https://www.sportsbookreviewsonline.com/scoresoddsarchives/nba/nba%20odds%202021-22.xlsx',
    'https://raw.githubusercontent.com/sportsdataverse/sportsdataverse-data/main/README.md',
    'https://www.football-data.co.uk/mmz4281/2122/SP1.csv', 'https://www.football-data.co.uk/mmz4281/2122/I1.csv', 'https://www.football-data.co.uk/mmz4281/2122/D1.csv', 'https://www.football-data.co.uk/mmz4281/2122/F1.csv'
  ];
  for (const u of urls) {
    const r = await pedir(u, 'buf');
    if (r.d) { const nom = u.split('/').pop().replace(/%20/g, '_'); fs.writeFileSync('muestra_' + nom, r.d.slice(0, 600000)); txt += 'OK  ' + u + ' bytes ' + r.d.length + '\n'; }
    else txt += 'NO  ' + u + ' ' + r.err + '\n';
  }
  txt += '```\n';
  fs.writeFileSync('resultado_sonda_6t.txt', txt); console.log(txt);
})();
