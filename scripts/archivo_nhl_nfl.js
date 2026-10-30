'use strict';
/* Archivo diario de partidos de la NHL y la NFL para las apps (hist-nhl.json, hist-nfl.json).
   Asi el celular no tiene que bajar cientos de MB de ESPN dia por dia: baja un archivo chico y solo completa los ultimos dias. */
const D = require('./datos_nhl_nfl.js');
const fs = require('fs');
/* NHL: agrega los tiros a puerta (columnas 10 y 11) desde nhl-box.json (API oficial de la NHL, scripts/bajar_nhl_box.js) */
const ESP = { LA: 'LAK', NJ: 'NJD', SJ: 'SJS', TB: 'TBL', UTAH: 'UTA' };
function tiros(c, todos) {
  let box = []; try { box = JSON.parse(fs.readFileSync(process.env.OVA_BOX || 'nhl-box.json', 'utf8')).g || []; } catch (e) { console.log('nhl: sin nhl-box.json, el archivo sale sin tiros'); return; }
  const idx = {}; box.forEach(b => { (idx[b.h + '|' + b.a] = idx[b.h + '|' + b.a] || []).push(b); });
  const porId = {}; todos.forEach(x => { porId[x.id] = x; });
  let con = 0;
  c.g.forEach(r => {
    const x = porId[r[0]]; if (!x) return;
    const b = (idx[(ESP[x.abH] || x.abH) + '|' + (ESP[x.abA] || x.abA)] || []).find(b => Math.abs(b.ts - x.ts) < 12 * 3600e3);
    if (b && isFinite(b.hsog) && isFinite(b.asog)) { r[9] = b.hsog; r[10] = b.asog; con++; }
  });
  console.log('nhl: ' + con + ' de ' + c.g.length + ' juegos con tiros a puerta');
}
const SK = { nhl: { desde: 2022, hasta: 2026, minimo: 900 }, nfl: { desde: 2022, hasta: 2026, minimo: 200 } };
(async () => {
  const DIAG = { errores: [] };
  for (const dep of ['nhl', 'nfl']) {
    const ruta = (process.env.OVA_CACHE_DIR || '.') + '/datos-' + dep + '.json';
    const cache = D.cargarCache(dep, ruta);
    const ahora = Date.now();
    const skHoy = require(dep === 'nhl' ? '../modelo-nhl.js' : '../modelo-nfl.js').seasonOf(ahora);
    for (let sk = SK[dep].desde; sk <= Math.min(SK[dep].hasta, skHoy); sk++) {
      const t = cache.temps[sk];
      if (t && t.completa && sk < skHoy && t.juegos.length > SK[dep].minimo) continue;
      console.log(dep + ' ' + sk + ': actualizando...');
      const nuevos = await D.actualizar(dep, sk, t, DIAG);
      cache.temps[sk] = { juegos: nuevos, completa: sk < skHoy && nuevos.length > SK[dep].minimo };
      D.guardarCache(ruta, cache);
    }
    // la app usa las ultimas 3 temporadas completas + la actual
    const skMin = Date.UTC(Math.max(SK[dep].desde, skHoy - 3), dep === 'nhl' ? 8 : 6, 1);
    const todos = [].concat(...Object.values(cache.temps).map(t => t.juegos));
    const c = D.compacto(dep, todos, skMin);
    if (dep === 'nhl') tiros(c, todos);
    fs.writeFileSync('hist-' + dep + '.json', JSON.stringify(c));
    console.log(dep + ': ' + c.g.length + ' juegos en el archivo (' + JSON.stringify(c).length + ' bytes), equipos ' + Object.keys(c.teams).length + '. Errores de descarga: ' + DIAG.errores.length);
  }
})();
