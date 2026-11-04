'use strict';
// Baja de football-data.co.uk las 5 ligas y deja un JSON por partido para fut_dc_real.js.
// Uso: TEMPS=1819,1920,...,2627 node scripts/medicion/bajar_futbol.js partidos_actual.json
const fs = require('fs');
const LIGAS = ['E0', 'SP1', 'I1', 'D1', 'F1'];
const TEMPS = (process.env.TEMPS || '1819,1920,2021,2122,2223,2324,2425,2526,2627').split(',');
const nm = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const trio = (r, p) => { const x = nm(r[p + 'H']), y = nm(r[p + 'D']), z = nm(r[p + 'A']); return (x > 1 && y > 1 && z > 1) ? [x, y, z] : null; };
const par = (r, a, b) => { const x = nm(r[a]), y = nm(r[b]); return (x > 1 && y > 1) ? [x, y] : null; };
const devig = o => { const i = o.map(x => 1 / x), s = i.reduce((a, b) => a + b, 0); return i.map(x => x / s); };
const F1X2 = [['PSC', 'Pinnacle cierre'], ['AvgC', 'Promedio cierre'], ['B365C', 'Bet365 cierre'], ['PS', 'Pinnacle previo'], ['Avg', 'Promedio previo'], ['B365', 'Bet365 previo']];
const FOU = [['PC>2.5', 'PC<2.5', 'Pinnacle cierre'], ['AvgC>2.5', 'AvgC<2.5', 'Promedio cierre'], ['B365C>2.5', 'B365C<2.5', 'Bet365 cierre'], ['P>2.5', 'P<2.5', 'Pinnacle previo'], ['Avg>2.5', 'Avg<2.5', 'Promedio previo']];
function filas(txt) {
  const L = txt.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (L.length < 2) return [];
  const cab = L[0].split(',').map(s => s.trim());
  return L.slice(1).map(l => { const v = l.split(','), r = {}; cab.forEach((c, i) => { if (c) r[c] = (v[i] || '').trim(); }); return r; });
}
function fecha(s) { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (!m) return null; let y = +m[3]; if (y < 100) y += 2000; return Date.UTC(y, +m[2] - 1, +m[1]); }
(async () => {
  const out = [];
  for (const t of TEMPS) for (const lg of LIGAS) {
    const url = 'https://www.football-data.co.uk/mmz4281/' + t + '/' + lg + '.csv';
    const res = await fetch(url, { headers: { 'user-agent': 'OVA-medicion' } });
    if (!res.ok) { console.log(t, lg, 'HTTP', res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer()), R = filas(buf.toString('latin1'));
    let n = 0; const src = {}; let ultimo = 0;
    for (const r of R) {
      const d = fecha(r.Date), gh = nm(r.FTHG), ga = nm(r.FTAG);
      if (d === null || gh === null || ga === null || !r.HomeTeam || !r.AwayTeam) continue;
      const m = { t, lg, d, h: r.HomeTeam, a: r.AwayTeam, gh, ga, y: gh > ga ? 0 : (gh === ga ? 1 : 2) };
      for (const [p, nom] of F1X2) { const o = trio(r, p); if (o) { m.mk = devig(o); m.src = nom; break; } }
      for (const [a, b, nom] of FOU) { const o = par(r, a, b); if (o) { m.ou = devig(o)[0]; m.ouSrc = nom; break; } }
      m.ps = trio(r, 'PSC'); m.avg = trio(r, 'AvgC') || trio(r, 'Avg');
      m.ouPs = par(r, 'PC>2.5', 'PC<2.5'); m.ouAvg = par(r, 'AvgC>2.5', 'AvgC<2.5');
      out.push(m); n++; src[m.src || 'sin cuota'] = (src[m.src || 'sin cuota'] || 0) + 1; ultimo = Math.max(ultimo, d);
    }
    console.log(t, lg, n, 'partidos', JSON.stringify(src), 'último', ultimo ? new Date(ultimo).toISOString().slice(0, 10) : '-');
  }
  fs.writeFileSync(process.argv[2] || 'partidos_actual.json', JSON.stringify(out));
  console.log('total', out.length);
})().catch(e => { console.error(e); process.exit(1); });
