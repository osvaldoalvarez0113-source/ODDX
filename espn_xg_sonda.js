'use strict';
// Sonda 2: ¿dónde vive el xG en el resumen de ESPN (2026-27)? ¿Es del partido o promedio de temporada? ¿Está en todos los partidos?
const fs = require('fs');
const log = [];
function buscar(o, ruta, out) {
  if (o && typeof o === 'object') for (const k of Object.keys(o)) {
    const v = o[k], r = ruta + '.' + k;
    if (/xpected/i.test(k) || (typeof v === 'string' && /xpected/i.test(v))) out.push(r + ' = ' + JSON.stringify(v).slice(0, 160) + ' | hermano: ' + JSON.stringify(o).slice(0, 300));
    buscar(v, r, out);
  }
}
(async () => {
  for (const [lg, f] of [['eng.1', '20261121'], ['eng.1', '20260920'], ['eng.1', '20260822'], ['esp.1', '20261025']]) {
    const sb = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${f}`)).json();
    for (const ev of (sb.events || []).slice(0, 3)) {
      const j = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/summary?event=${ev.id}`)).json();
      const out = []; buscar(j, '', out);
      log.push(`== ${lg} ${f} ${ev.shortName} (${ev.status && ev.status.type && ev.status.type.detail}) marcador ${(ev.competitions[0].competitors || []).map(c => c.homeAway + ':' + c.score).join(' ')}`);
      out.slice(0, 8).forEach(x => log.push('   ' + x));
      if (!out.length) log.push('   (sin xG)');
    }
  }
  fs.writeFileSync('sonda_xg_espn.txt', log.join('\n') + '\n'); console.log(log.join('\n'));
})();
