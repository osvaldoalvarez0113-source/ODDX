'use strict';
// OVA · NBA: ¿la linea de cierre ya descuenta lo que pasa con los JUGADORES? (6 temporadas, mas posiciones y estrellas)
// Por juego se mide cuanto talento le falta a cada equipo (jugadores habituales del top 8 que esa noche no jugaron, segun el
// boxscore de ESPN), cuanto talento hay por posicion (G/F/C) y si faltan estrellas. Se prueba si eso explica el margen REAL
// despues de descontar el spread de cierre. Si c ~ 0, la linea ya lo sabia.
const fs = require('fs');
const { pedir, pool, ms, ols, f, tabla, ymd, num, errores } = require('./lib.js');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const CORE = id => 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/' + id + '/competitions/' + id + '/odds';
const SEASONS = (process.env.TEMPS_NBA || '2020,2021,2022,2023,2024,2025').split(',').map(s => parseInt(s, 10));
let out = '## NBA · jugadores (ausencias, posiciones y estrellas) contra la linea de cierre\n\n';
const say = t => { out += t + '\n\n'; console.log(t); };
const GRP = p => { p = String(p || '').toUpperCase(); if (['PG', 'SG', 'G'].includes(p)) return 'G'; if (['SF', 'PF', 'F'].includes(p)) return 'F'; if (p === 'C') return 'C'; return p[0] === 'G' ? 'G' : p[0] === 'F' ? 'F' : p[0] === 'C' ? 'C' : null; };

function parseDia(j) {
  const res = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a) return;
    const st = (e.status && e.status.type) || {}, ty = parseInt(e.season && e.season.type, 10) || 2;
    const hs = parseInt(h.score, 10), as = parseInt(a.score, 10);
    if (!(st.completed === true) || !isFinite(hs) || !isFinite(as) || ty === 1 || ty === 4) return;
    if (/all.?star|rising stars|celebrity/i.test((e.name || '') + (e.shortName || ''))) return;
    res.push({ id: String(e.id), ts: Date.parse(e.date), h: String(h.team.id), a: String(a.team.id), abH: h.team.abbreviation || '', hs, as, ty });
  });
  return res;
}
async function temporada(sk) {
  const dias = []; for (let d = new Date(Date.UTC(sk, 9, 15)); d <= new Date(Date.UTC(sk + 1, 5, 25)); d = new Date(d.getTime() + 864e5)) dias.push(new Date(d));
  const res = await pool(dias.map(d => async () => parseDia(await pedir(ESPN + 'scoreboard?dates=' + ymd(d) + '&limit=300'))), 10);
  return [].concat(...res.filter(Boolean));
}
function lineaCore(j, abH) {
  let mejor = null;
  ((j && j.items) || []).forEach(it => {
    const hO = it.homeTeamOdds || {}; let sp = null;
    const cps = hO.close && hO.close.pointSpread; if (cps) sp = num(cps.american !== undefined ? cps.american : cps.alternateDisplayValue);
    if (sp !== null && Math.abs(sp) > 40) sp = null;
    if (sp === null && isFinite(+it.spread) && hO.favorite !== undefined) { const v = Math.abs(+it.spread); sp = hO.favorite ? -v : v; }
    if (sp === null && typeof it.details === 'string') { const m = it.details.match(/^\s*([A-Za-z]{2,4})\s+([+-]?\d+(?:\.\d+)?)/); if (m && abH) { const v = parseFloat(m[2]); sp = m[1].toUpperCase() === String(abH).toUpperCase() ? v : -v; } }
    let tot = null; const ct = it.close && it.close.total; if (ct) tot = num(ct.alternateDisplayValue !== undefined ? ct.alternateDisplayValue : ct.american);
    if (tot !== null && (tot < 150 || tot > 300)) tot = null;
    if (tot === null && isFinite(+it.overUnder) && +it.overUnder > 150 && +it.overUnder < 300) tot = +it.overUnder;
    const dk = /draftkings/i.test((it.provider && it.provider.name) || ''), pts = (sp !== null ? 2 : 0) + (tot !== null ? 1 : 0);
    if (pts > 0 && (!mejor || pts > mejor.pts || (pts === mejor.pts && dk && !mejor.dk))) mejor = { spread: sp, total: tot, pts, dk };
  });
  return mejor;
}
function leerBox(j) {
  const res = {}; const eq = j && j.boxscore && j.boxscore.players; if (!eq) return null;
  eq.forEach(t => {
    const tid = String(t.team && t.team.id), lista = [];
    (t.statistics || []).forEach(bloque => {
      const lab = bloque.labels || [], iM = lab.indexOf('MIN'), iP = lab.indexOf('PTS'), iR = lab.indexOf('REB'), iA = lab.indexOf('AST');
      (bloque.athletes || []).forEach(at => {
        const st = at.stats || [], jugo = !at.didNotPlay && st.length > 0 && num(st[iM]) > 0;
        lista.push({ id: String(at.athlete && at.athlete.id), pos: (at.athlete && at.athlete.position && at.athlete.position.abbreviation) || null,
          min: jugo ? num(st[iM]) : 0, prod: jugo ? (num(st[iP]) || 0) + 0.7 * (num(st[iR]) || 0) + 0.7 * (num(st[iA]) || 0) : 0, jugo });
      });
    });
    res[tid] = lista;
  });
  return Object.keys(res).length >= 2 ? res : null;
}
function faltantes(games) {
  const S = {};
  games.forEach(g => {
    const sk = g.sk; S[sk] = S[sk] || {};
    ['h', 'a'].forEach(lado => {
      const tid = g[lado], T = S[sk][tid] = S[sk][tid] || { pl: {}, n: 0 }, caja = g.box[tid];
      const vet = Object.keys(T.pl).map(id => ({ id, ...T.pl[id], mpg: T.pl[id].min / T.pl[id].g, ppg: T.pl[id].prod / T.pl[id].g }))
        .filter(p => p.g >= 5 && p.mpg >= 16 && T.n - p.ult <= 12).sort((x, y) => y.mpg - x.mpg).slice(0, 8);
      const jugaron = new Set((caja || []).filter(p => p.jugo).map(p => p.id));
      const ok = T.n >= 10;
      g['miss_' + lado] = ok ? vet.filter(p => !jugaron.has(p.id)).reduce((a, p) => a + p.ppg, 0) : null;
      g['have_' + lado] = ok ? vet.reduce((a, p) => a + p.ppg, 0) : null;
      const pres = { G: 0, F: 0, C: 0 }; vet.forEach(p => { if (jugaron.has(p.id)) { const gr = GRP(p.pos); if (gr) pres[gr] += p.ppg; } });
      g['pres_' + lado] = ok ? pres : null;
      const top2 = vet.slice().sort((x, y) => y.ppg - x.ppg).slice(0, 2);
      g['star_' + lado] = ok ? top2.filter(p => !jugaron.has(p.id)).length : null;
      (caja || []).forEach(p => { if (!p.jugo) return; const q = T.pl[p.id] = T.pl[p.id] || { g: 0, min: 0, prod: 0, ult: 0, pos: p.pos }; q.g++; q.min += p.min; q.prod += p.prod; q.ult = T.n + 1; if (!q.pos) q.pos = p.pos; });
      T.n++;
    });
  });
}
const regTxt = (g, i) => g ? f(g.b[i], 3) + ' ± ' + f(2 * g.se[i], 3) : '—';
const zTxt = (g, i) => g ? f(g.b[i] / (g.se[i] || 1), 1) : '—';
async function main() {
  const todos = []; for (const sk of SEASONS) { const g = await temporada(sk); g.forEach(x => x.sk = sk); console.log('temporada ' + sk + ': ' + g.length + ' juegos'); todos.push(...g); }
  const uni = new Map(); todos.forEach(g => { if (!uni.has(g.id)) uni.set(g.id, g); });
  const games = [...uni.values()].sort((a, b) => a.ts - b.ts);
  console.log('Bajando boxscores y lineas de ' + games.length + ' juegos...');
  await pool(games.map(g => async () => {
    const [bx, ln] = await Promise.all([pedir(ESPN + 'summary?event=' + g.id).catch(e => { errores.push('box ' + g.id + ' ' + e.message.slice(0, 60)); return null; }), pedir(CORE(g.id)).catch(() => null)]);
    g.box = bx ? leerBox(bx) : null; g.linea = ln ? lineaCore(ln, g.abH) : null;
  }), 8, (h, t) => { if (h % 500 === 0) console.log('  ' + h + '/' + t); });
  const conBox = games.filter(g => g.box), conLinea = games.filter(g => g.box && g.linea && g.linea.spread != null);
  say('### Datos\n```\njuegos: ' + games.length + ' · con boxscore: ' + conBox.length + ' · con boxscore y spread: ' + conLinea.length + '\nerrores de descarga: ' + errores.length + (errores.length ? ' (primeros: ' + errores.slice(0, 3).join(' | ') + ')' : '') + '\nejemplo de jugadores leidos: ' + JSON.stringify(conBox[0] && conBox[0].box[conBox[0].h] ? conBox[0].box[conBox[0].h].slice(0, 3) : null) + '\n```');
  if (conLinea.length < 800) { say('NO TERMINO: muy pocos juegos con boxscore y linea.'); fs.writeFileSync('resultado_nba.txt', out); return; }
  faltantes(conBox.filter(g => g.box[g.h] && g.box[g.a]));
  const rows = conLinea.filter(g => g.miss_h != null && g.miss_a != null && g.have_h > 0 && g.have_a > 0 && g.pres_h && g.pres_a).map(g => ({
    sk: g.sk, mar: g.hs - g.as, mk: -g.linea.spread, mh: g.miss_h, ma: g.miss_a, hh: g.have_h, ha: g.have_a, tot: g.hs + g.as, total: g.linea.total,
    dG: g.pres_h.G - g.pres_a.G, dF: g.pres_h.F - g.pres_a.F, dC: g.pres_h.C - g.pres_a.C, ds: g.star_h - g.star_a }));
  say('Juegos medibles (ambos equipos con >=10 juegos previos en la temporada): ' + rows.length + '. Talento = produccion por juego (PTS + 0.7·REB + 0.7·AST) de los habituales del top 8 por minutos.');
  const y = rows.map(r => r.mar);
  const g1 = ols(rows.map(r => [1, r.mk, r.mh - r.ma]), y);
  say('### 1) Ausencias encima del spread: margen real = a + b·(linea) + c·(talento que falta, local − visita)\nc = 0 → la linea ya lo sabe.\n\n' + tabla(['Muestra', 'Juegos', 'b (linea)', 'c ± 2·se', 'z de c'], [['Todas las temporadas', rows.length, regTxt(g1, 1), regTxt(g1, 2), zTxt(g1, 2)]].concat(
    [...new Set(rows.map(r => r.sk))].sort().map(s => { const rr = rows.filter(r => r.sk === s), g = rr.length > 150 ? ols(rr.map(r => [1, r.mk, r.mh - r.ma]), rr.map(r => r.mar)) : null; return [s + '-' + String(s + 1).slice(2), rr.length, regTxt(g, 1), regTxt(g, 2), zTxt(g, 2)]; }))));
  const g2 = ols(rows.map(r => [1, r.mk, r.dG, r.dF, r.dC]), y);
  say('### 2) Cara a cara por posicion: talento presente de los habituales en cada grupo (local − visita), encima del spread\n' + tabla(['Posicion', 'c ± 2·se', 'z'], [['Guardias (PG SG G)', regTxt(g2, 2), zTxt(g2, 2)], ['Aleros (SF PF F)', regTxt(g2, 3), zTxt(g2, 3)], ['Pivots (C)', regTxt(g2, 4), zTxt(g2, 4)]]) + 'Tres pruebas a la vez: si una sale "significativa" hay que ver que se repita por temporada.');
  const g3 = ols(rows.map(r => [1, r.mk, r.ds]), y);
  say('### 3) Estrellas: cuantos de los 2 mejores del equipo no juegan (local − visita), encima del spread\n' + tabla(['Variable', 'c ± 2·se (puntos de margen por estrella)', 'z'], [['Estrellas ausentes (local − visita)', regTxt(g3, 2), zTxt(g3, 2)]]));
  const rt = rows.filter(r => r.total != null), g4 = ols(rt.map(r => [1, r.total, r.mh + r.ma]), rt.map(r => r.tot));
  say('### 4) Total de puntos: total real = a + b·(total de la linea) + c·(talento que falta, los dos equipos juntos)\n' + tabla(['Variable', 'c ± 2·se', 'z'], [['Talento ausente total', regTxt(g4, 2), zTxt(g4, 2)]]) + 'Juegos con total: ' + rt.length);
  const g0 = ols(rows.map(r => [1, r.mh - r.ma]), y);
  say('### 5) Efecto crudo (sin mirar la linea): margen real = a + c·(talento que falta)\nc = ' + regTxt(g0, 1) + ' puntos de margen por cada punto de produccion que falta. Prueba que las ausencias importan; las secciones de arriba dicen si la linea ya las cobra.');
  const ap = t => { let w = 0, l = 0; const rets = []; rows.forEach(r => { const d = r.mh - r.ma; if (Math.abs(d) < t) return; if (r.mar === r.mk) return; const apHome = !(d > 0); const gana = apHome ? r.mar > r.mk : r.mar < r.mk; if (gana) { w++; rets.push(100 / 110); } else { l++; rets.push(-1); } }); const q = ms(rets); return [t + '+', w + l, w + '-' + l, f(100 * w / Math.max(w + l, 1), 1) + '%', f(100 * q.m, 1) + '% ± ' + f(200 * q.se, 1) + '%']; };
  say('### 6) Apostar por el equipo SANO contra el spread (a −110; hay que ganar 52.4%)\n' + tabla(['Diferencia de talento', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se'], [8, 12, 16, 20].map(ap)));
  say('### Resumen\n```\nc (ausencias encima de la linea) = ' + regTxt(g1, 2) + '  (z ' + zTxt(g1, 2) + ')\nSi el intervalo incluye 0, la linea de cierre ya descuenta los jugadores y no hay ventaja en usarlos.\n```');
  fs.writeFileSync('resultado_nba.txt', out);
  fs.writeFileSync('resultado_nba.json', JSON.stringify({ n: rows.length, c: g1 && g1.b[2], se: g1 && g1.se[2] }));
}
main().catch(e => { console.error(e); fs.writeFileSync('resultado_nba.txt', out + '\nERROR: ' + (e && e.stack || e)); process.exit(1); });
