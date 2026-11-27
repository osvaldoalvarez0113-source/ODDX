'use strict';
// Sonda: ¿desde qué temporada trae ESPN goles esperados (xG) por partido en las 5 ligas? Mira un partido por liga y temporada.
const fs = require('fs');
const LIGAS = ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'];
const FECHAS = ['20191109', '20201107', '20211106', '20221105', '20231104', '20241109', '20251108', '20261121'];
const log = [];
(async () => {
  for (const lg of LIGAS) for (const f of FECHAS) {
    try {
      const sb = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${f}`)).json();
      const ev = (sb.events || [])[0]; if (!ev) { log.push(`${lg} ${f}: sin partidos`); continue; }
      const sm = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/summary?event=${ev.id}`)).text();
      const j = JSON.parse(sm);
      const st = ((j.boxscore && j.boxscore.teams) || []).map(t => (t.statistics || []).filter(s => /xpect|xG/i.test(s.name + ' ' + (s.label || ''))).map(s => `${s.name}=${s.displayValue}`).join(','));
      const otros = (sm.match(/"[a-zA-Z]*[Ee]xpected[a-zA-Z]*"/g) || []).slice(0, 5);
      log.push(`${lg} ${f} ${ev.shortName}: boxscore [${st.join(' | ')}] otras llaves ${otros.join(' ')}`);
    } catch (e) { log.push(`${lg} ${f}: error ${e.message}`); }
  }
  fs.writeFileSync('sonda_xg_espn.txt', log.join('\n') + '\n'); console.log(log.join('\n'));
})();
