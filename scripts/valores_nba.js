'use strict';
/* Valor de cada jugador de la NBA para la app (valores-nba.json), desde nba-box.json.gz (rama datos-nba-box).
   Por equipo: sus 8 jugadores de más minutos esta temporada (5+ juegos, 16+ min por juego, que hayan jugado en los últimos 12 del equipo),
   con su producción por juego (PTS + 0.7·REB + 0.7·AST). La app resta C puntos de margen por cada punto de producción que falta
   esa noche (medido: docs/MEDICION-VALOR-JUGADOR-NBA-2026-11.md). */
const fs = require('fs'), zlib = require('zlib');
const C = 0.057;   // puntos de margen por punto de producción que falta (ajustado con 2021-22 a 2025-26)
const db = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2] || 'nba-box.json.gz')));
const sk = Math.max(...db.g.map(g => g.sk));
const juegos = db.g.filter(g => g.sk === sk);
const eq = {};   // team -> {n, pl: id -> {g, min, prod, ult}}
juegos.forEach(g => [g.h, g.a].forEach(tid => {
  const T = eq[tid] = eq[tid] || { n: 0, pl: {} }; T.n++;
  g.p.filter(p => p[0] === tid).forEach(p => { const q = T.pl[p[1]] = T.pl[p[1]] || { g: 0, min: 0, prod: 0, ult: 0 }; q.g++; q.min += p[2]; q.prod += p[3] + 0.7 * p[4] + 0.7 * p[5]; q.ult = T.n; });
}));
const out = { v: 1, generado: new Date().toISOString(), temporada: sk, c: C, eq: {} };
Object.keys(eq).forEach(tid => {
  const T = eq[tid];
  out.eq[tid] = Object.keys(T.pl).map(id => ({ id, ...T.pl[id] })).filter(p => p.g >= 5 && p.min / p.g >= 16 && T.n - p.ult <= 12)
    .sort((x, y) => y.min / y.g - x.min / x.g).slice(0, 8)
    .map(p => [p.id, db.nombres[p.id] || '', Math.round(p.prod / p.g * 10) / 10, Math.round(p.min / p.g)]);
});
fs.writeFileSync('valores-nba.json', JSON.stringify(out));
console.log('valores-nba.json: temporada ' + sk + ', ' + juegos.length + ' juegos, ' + Object.keys(out.eq).length + ' equipos');
