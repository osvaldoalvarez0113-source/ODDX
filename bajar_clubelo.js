'use strict';
// Baja de ClubElo (api.clubelo.com, API pública y gratis) el historial de Elo de los clubes de las 5 ligas grandes.
// 1) Fotos del 1-ago de 2018 a 2026 → nombres de clubes de ENG, ESP, GER, ITA, FRA.  2) Historial de cada club.
const fs = require('fs');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const csv = t => t.trim().split('\n').slice(1).map(l => l.split(','));
(async () => {
  const clubes = new Set(), log = [];
  for (let y = 2018; y <= 2026; y++) {
    const t = await (await fetch(`http://api.clubelo.com/${y}-08-01`)).text();
    csv(t).forEach(r => { if (['ENG', 'ESP', 'GER', 'ITA', 'FRA'].includes(r[2]) && r[3] === '1') clubes.add(r[1] + '|' + r[2]); });
    log.push(`${y}-08-01: ${clubes.size} clubes acumulados`); await dormir(800);
  }
  // también los que subieron a mitad (nivel 2 el 1-ago pero en primera después): fotos del 1-ene
  for (let y = 2019; y <= 2026; y++) {
    const t = await (await fetch(`http://api.clubelo.com/${y}-01-15`)).text();
    csv(t).forEach(r => { if (['ENG', 'ESP', 'GER', 'ITA', 'FRA'].includes(r[2]) && r[3] === '1') clubes.add(r[1] + '|' + r[2]); });
    await dormir(800);
  }
  const out = {};
  for (const c of clubes) {
    const [nom, pais] = c.split('|');
    try {
      const t = await (await fetch(`http://api.clubelo.com/${encodeURIComponent(nom.replace(/ /g, ''))}`)).text();
      out[nom] = { pais, h: csv(t).filter(r => r[6] >= '2017-01-01').map(r => [r[6], r[7], +(+r[4]).toFixed(1)]) };
    } catch (e) { log.push(`${nom}: ${e.message}`); }
    await dormir(700);
  }
  log.push(`clubes con historial: ${Object.keys(out).length}`);
  fs.writeFileSync('clubelo.json', JSON.stringify(out)); fs.writeFileSync('bajar_clubelo.txt', log.join('\n') + '\n'); console.log(log.join('\n'));
})();
