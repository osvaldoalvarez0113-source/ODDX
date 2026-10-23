'use strict';
// OVA · MLB: ¿el lineup REAL del dia (bateador por bateador) le agrega algo a la linea de cierre?
// Para cada juego de 2024-2026 con linea de cierre de DraftKings (via ESPN) se toman los 9 bateadores que de verdad
// abrieron el juego (boxscore de la MLB), se les calcula un nivel (wOBA proyectado de las 3 temporadas anteriores,
// regresado a la liga, y actualizado con lo que llevaba en la temporada ANTES de ese dia) y se prueba si la diferencia
// de nivel entre los dos lineups explica el resultado despues de descontar lo que ya dice la linea.
// Si el coeficiente c es ~0, el mercado ya sabia el lineup y no hay nada que ganar con eso.
const fs = require('fs');
const { pedir, pool, logit, sig, ll, ms, logistica, f, tabla, errores } = require('./lib.js');
const MLB = 'https://statsapi.mlb.com/api/v1';
const ESPN_SB = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?limit=300&dates=';
const espnOdds = id => 'https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/' + id + '/competitions/' + id + '/odds';
const SEASONS = (process.env.TEMPS_MLB || '2024,2025,2026').split(',').map(s => parseInt(s, 10));
const LG = 0.315; let KREG = 300, WP = 350;           // constantes fijadas ANTES de mirar resultados (no se ajustan); en la seccion de robustez se prueban otras
const SW = [4.65, 4.55, 4.45, 4.35, 4.25, 4.13, 4.0, 3.9, 3.8], SS = SW.reduce((a, b) => a + b, 0), SLOT = SW.map(x => x / SS);
const ALIAS = { AZ: 'ARI', OAK: 'ATH', CHW: 'CWS', WAS: 'WSH', TBR: 'TB', SDP: 'SD', SFG: 'SF', KCR: 'KC' };
const norm = c => { c = String(c || '').toUpperCase(); return ALIAS[c] || c; };
const sumaDias = (fch, n) => { const d = new Date(fch + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const log = t => console.log(t);
let out = '## MLB · ¿el lineup real del dia le agrega algo a la linea de cierre?\n\n';
const say = t => { out += t + '\n\n'; log(t); };

/* ---------- ESPN: lineas (mismo lector del backtest de mercado) ---------- */
function americano(v) { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return (isFinite(n) && Math.abs(n) >= 100) ? n : null; }
const impAm = a => a < 0 ? (-a) / ((-a) + 100) : 100 / (a + 100);
const decAm = a => a < 0 ? 1 + 100 / (-a) : 1 + a / 100;
function mlDe(lado) {
  if (!lado) return null;
  const c = lado.close && lado.close.moneyLine, k = lado.current && lado.current.moneyLine;
  let o = americano(c && c.american); if (o == null) o = americano(k && k.american); if (o == null) o = americano(lado.moneyLine);
  return o;
}
function parseOdds(j) {
  const items = (j && j.items) || []; let mejor = null;
  for (const it of items) {
    const h = mlDe(it.homeTeamOdds), a = mlDe(it.awayTeamOdds); if (h == null || a == null) continue;
    const nombre = (it.provider && it.provider.name) || '?', cand = { h, a, prov: nombre, dk: /draftkings/i.test(nombre) };
    if (!mejor || (cand.dk && !mejor.dk)) mejor = cand;
  }
  if (!mejor) return null;
  const s = impAm(mejor.h) + impAm(mejor.a); if (s < 1.0 || s > 1.15) return null;
  return mejor;
}
async function eventosDelDia(ymd) {
  const j = await pedir(ESPN_SB + ymd), res = [];
  ((j && j.events) || []).forEach(ev => {
    try {
      const c = ev.competitions[0]; let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else a = x; });
      res.push({ id: ev.id, ts: Date.parse(ev.date), h: norm(h.team.abbreviation), a: norm(a.team.abbreviation), sH: +h.score, sA: +a.score, done: !!(ev.status && ev.status.type && ev.status.type.completed) });
    } catch (e) { }
  });
  return res;
}

/* ---------- bateadores: wOBA por temporada y por juego ---------- */
const HIT_Y = {}, HIT_G = {};
function comp(st) {
  const ab = +st.atBats || 0, h = +st.hits || 0, d2 = +st.doubles || 0, d3 = +st.triples || 0, hr = +st.homeRuns || 0, bb = +st.baseOnBalls || 0, ibb = +st.intentionalWalks || 0, hbp = +st.hitByPitch || 0, sf = +st.sacFlies || 0;
  const s1 = h - d2 - d3 - hr, ubb = bb - ibb;
  return { num: 0.69 * ubb + 0.72 * hbp + 0.89 * s1 + 1.27 * d2 + 1.62 * d3 + 2.10 * hr, den: ab + ubb + sf + hbp };
}
async function cargarAnual(id) {
  if (HIT_Y[id]) return;
  const j = await pedir(MLB + '/people/' + id + '/stats?stats=yearByYear&group=hitting&gameType=R');
  const sp = (j.stats && j.stats[0] && j.stats[0].splits) || [], H = {};
  sp.forEach(s => { const y = +s.season, c = comp(s.stat || {}); if (!H[y] || c.den > H[y].den) H[y] = c; });   // si fue cambiado: el total es el de mas PA
  HIT_Y[id] = H;
}
async function cargarLog(id, Y) {
  const k = id + '_' + Y; if (HIT_G[k]) return;
  const j = await pedir(MLB + '/people/' + id + '/stats?stats=gameLog&group=hitting&season=' + Y + '&gameType=R');
  const sp = (j.stats && j.stats[0] && j.stats[0].splits) || [];
  HIT_G[k] = sp.map(s => { const c = comp(s.stat || {}); return { d: s.date, num: c.num, den: c.den }; }).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
function proyeccion(id, Y) {
  const H = HIT_Y[id] || {}, W = [5, 4, 3]; let n = 0, d = 0;
  for (let i = 0; i < 3; i++) { const s = H[Y - 1 - i]; if (s) { n += W[i] * s.num; d += W[i] * s.den; } }
  return { proj: (n + KREG * (d === 0 ? LG - 0.012 : LG)) / (d + KREG), hist: d };
}
function ratingEn(id, Y, fecha) {
  const P = proyeccion(id, Y), G = HIT_G[id + '_' + Y] || [], ini = sumaDias(fecha, -14);
  let cn = 0, cd = 0, n14 = 0, d14 = 0;
  for (const x of G) { if (x.d >= fecha) break; cn += x.num; cd += x.den; if (x.d >= ini) { n14 += x.num; d14 += x.den; } }
  const rat = (cn + WP * P.proj) / (cd + WP), dev = d14 > 0 ? d14 / (d14 + 100) * (n14 / d14 - rat) : 0;
  return { proj: P.proj, rat, dev, hist: P.hist, cd };
}
const GRUPO = p => { p = String(p || '').toUpperCase(); if (p === 'C') return 'C'; if (['1B', '2B', '3B', 'SS'].includes(p)) return 'IF'; if (['LF', 'CF', 'RF', 'OF'].includes(p)) return 'OF'; if (p === 'DH' || p === 'PH') return 'DH'; return null; };

/* ---------- temporada: juegos, lineas, boxscores ---------- */
async function temporada(Y) {
  const hoy = new Date().toISOString().slice(0, 10), ayer = sumaDias(hoy, -1);
  let fin = Y + '-10-06'; if (fin > ayer) fin = ayer;
  const tm = await pedir(MLB + '/teams?sportId=1'), abr = {}; (tm.teams || []).forEach(x => abr[x.id] = norm(x.abbreviation));
  const sch = await pedir(MLB + '/schedule?sportId=1&startDate=' + Y + '-03-01&endDate=' + fin + '&gameType=R'), juegos = [];
  (sch.dates || []).forEach(d => (d.games || []).forEach(g => {
    if (!g.status || g.status.abstractGameState !== 'Final') return;
    const h = g.teams.home, a = g.teams.away; if (h.score == null || a.score == null || h.score === a.score) return;
    juegos.push({ pk: g.gamePk, fecha: g.officialDate || d.date, ini: Date.parse(g.gameDate), hC: abr[h.team.id] || '?', aC: abr[a.team.id] || '?', rH: h.score, rA: a.score, y: h.score > a.score ? 1 : 0 });
  }));
  log('temporada ' + Y + ': ' + juegos.length + ' juegos terminados en la MLB');
  const fechas = [...new Set(juegos.map(g => g.fecha))].sort();
  const porDia = await pool(fechas.map(fch => () => eventosDelDia(fch.replace(/-/g, ''))), 6, (h, t) => { if (h % 60 === 0) log('  calendario ESPN ' + h + '/' + t); });
  const eventos = []; porDia.forEach(x => (x || []).forEach(e => eventos.push(e)));
  const usados = {}, cruz = []; let sinPar = 0, marcadorMal = 0;
  juegos.forEach(g => {
    const cand = eventos.filter(e => e.h === g.hC && e.a === g.aC && !usados[e.id] && Math.abs(e.ts - g.ini) < 4 * 3600e3);
    if (!cand.length) { sinPar++; return; }
    cand.sort((a, b) => Math.abs(a.ts - g.ini) - Math.abs(b.ts - g.ini));
    const e = cand[0]; usados[e.id] = 1;
    if (e.done && (e.sH !== g.rH || e.sA !== g.rA)) { marcadorMal++; return; }
    cruz.push({ g, ev: e });
  });
  log('  cruzados con ESPN: ' + cruz.length + ' (sin par ' + sinPar + ', marcador distinto ' + marcadorMal + ')');
  const odds = await pool(cruz.map(c => () => pedir(espnOdds(c.ev.id))), 8, (h, t) => { if (h % 500 === 0) log('  lineas ' + h + '/' + t); });
  const conLinea = []; cruz.forEach((c, i) => { const o = odds[i] ? parseOdds(odds[i]) : null; if (o) { c.o = o; conLinea.push(c); } });
  log('  con linea de cierre: ' + conLinea.length);
  const boxes = await pool(conLinea.map(c => () => pedir(MLB + '/game/' + c.g.pk + '/boxscore')), 8, (h, t) => { if (h % 500 === 0) log('  boxscores ' + h + '/' + t); });
  const res = [];
  conLinea.forEach((c, i) => {
    const b = boxes[i]; if (!b || !b.teams) return;
    const lin = {};
    for (const lado of ['home', 'away']) {
      const T = b.teams[lado], orden = (T && T.battingOrder) || [];
      if (orden.length < 9) return;
      lin[lado] = orden.slice(0, 9).map(id => { const p = (T.players && T.players['ID' + id]) || {}; const pos = (p.allPositions && p.allPositions[0] && p.allPositions[0].abbreviation) || (p.position && p.position.abbreviation) || null; return { id, pos }; });
    }
    res.push({ Y, g: c.g, o: c.o, lin });
  });
  log('  con lineup completo de los dos equipos: ' + res.length);
  return { Y, juegos: juegos.length, cruz: cruz.length, conLinea: conLinea.length, lista: res };
}

async function main() {
  const todos = []; const resumen = [];
  for (const Y of SEASONS) { const t = await temporada(Y); resumen.push(t); todos.push(...t.lista); }
  say('### Datos\n```\n' + resumen.map(t => t.Y + ': juegos ' + t.juegos + ' · cruzados ESPN ' + t.cruz + ' · con linea ' + t.conLinea + ' · con lineup completo ' + t.lista.length).join('\n') + '\nerrores de descarga: ' + errores.length + (errores.length ? ' (primeros: ' + errores.slice(0, 3).join(' | ') + ')' : '') + '\n```');
  if (todos.length < 800) { say('NO TERMINO: muy pocos juegos con linea y lineup.'); fs.writeFileSync('resultado_mlb.txt', out); return; }
  // jugadores unicos y sus datos
  const ids = new Set(); todos.forEach(r => ['home', 'away'].forEach(l => r.lin[l].forEach(p => ids.add(p.id))));
  log('bateadores distintos: ' + ids.size);
  await pool([...ids].map(id => () => cargarAnual(id)), 8, (h, t) => { if (h % 300 === 0) log('  historial anual ' + h + '/' + t); });
  const pares = []; todos.forEach(r => { ['home', 'away'].forEach(l => r.lin[l].forEach(p => pares.push(p.id + '_' + r.Y))); });
  const unicos = [...new Set(pares)];
  await pool(unicos.map(k => () => { const [id, Y] = k.split('_'); return cargarLog(id, +Y); }), 8, (h, t) => { if (h % 500 === 0) log('  juego a juego ' + h + '/' + t); });
  const conHist = [...ids].filter(id => HIT_Y[id] && Object.keys(HIT_Y[id]).length).length;
  say('Bateadores distintos: ' + ids.size + ' · con algun historial anual: ' + conHist + ' · errores de descarga acumulados: ' + errores.length);
  // lineup del juego anterior del mismo equipo (para el placebo)
  const porEq = {};
  todos.slice().sort((a, b) => a.g.ini - b.g.ini).forEach(r => ['home', 'away'].forEach(l => {
    const k = r.Y + '|' + (l === 'home' ? r.g.hC : r.g.aC), arr = porEq[k] || (porEq[k] = []);
    r.prev = r.prev || {}; r.prev[l] = arr.length ? arr[arr.length - 1] : null; arr.push(r.lin[l]);
  }));
  // filas
  const construir = (K, W, placebo) => {
    KREG = K; WP = W; const res = [];
    todos.forEach(r => {
      const side = lado => {
        const lineup = placebo ? r.prev[lado] : r.lin[lado]; if (!lineup) return null;
        const o = { proj: 0, rat: 0, dev: 0, g: { C: 0, IF: 0, OF: 0, DH: 0 }, sinHist: 0 };
        lineup.forEach((p, i) => {
          const q = ratingEn(p.id, r.Y, r.g.fecha); o.proj += SLOT[i] * (q.proj - LG); o.rat += SLOT[i] * (q.rat - LG); o.dev += SLOT[i] * q.dev;
          const gr = GRUPO(p.pos); if (gr) o.g[gr] += SLOT[i] * (q.rat - LG); if (q.hist === 0) o.sinHist++;
        });
        return o;
      };
      const H = side('home'), A = side('away'); if (!H || !A) return;
      const iH = impAm(r.o.h), iA = impAm(r.o.a);
      res.push({ s: r.Y, f: r.g.fecha, y: r.g.y, pK: iH / (iH + iA), iH, iA, dH: decAm(r.o.h), dA: decAm(r.o.a),
        xProj: (H.proj - A.proj) * 1000, xRat: (H.rat - A.rat) * 1000, xDev: (H.dev - A.dev) * 1000,
        gC: (H.g.C - A.g.C) * 1000, gIF: (H.g.IF - A.g.IF) * 1000, gOF: (H.g.OF - A.g.OF) * 1000, gDH: (H.g.DH - A.g.DH) * 1000, sh: H.sinHist + A.sinHist });
    });
    KREG = 300; WP = 350; return res;
  };
  const rows = construir(300, 350, false);
  const sd = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
  say('Juegos medidos: ' + rows.length + '. Diferencia de nivel entre lineups (puntos de wOBA, local − visita): desviacion tipica ' + f(sd(rows.map(r => r.xRat)), 1) + ' (proyeccion sola ' + f(sd(rows.map(r => r.xProj)), 1) + '). Jugadores sin historial por juego: ' + f(rows.reduce((a, r) => a + r.sh, 0) / rows.length, 2) + ' de 18.');
  const ys = rows.map(r => r.y);
  const fit = (cols, rr) => { rr = rr || rows; const X = rr.map(r => [1].concat(cols.map(c => r[c] / 10))); return logistica(X, rr.map(r => r.y), rr.map(r => logit(r.pK))); };
  const lin = (nom, g, i) => g ? [nom, f(g.b[i], 4) + ' ± ' + f(2 * g.se[i], 4), f(g.b[i] / (g.se[i] || 1), 1)] : [nom, '—', '—'];
  // 0) sanidad: el lineup importa por si solo
  const g0 = logistica(rows.map(r => [1, r.xRat / 10]), ys, rows.map(() => 0));
  say('### 0) Sanidad: ¿el nivel del lineup predice quien gana, SIN mirar la linea?\n' + tabla(['Variable (por cada 10 puntos de wOBA de diferencia)', 'Coeficiente (logit) ± 2·se', 'z'], [lin('xRat (lineup, con forma de la temporada)', g0, 1)]) + 'Si sale positivo y grande, el lineup importa. Lo que sigue pregunta si importa ENCIMA de lo que la linea ya sabe.');
  // 1) c encima de la linea
  const gR = fit(['xRat']), gP = fit(['xProj']), gD = fit(['xDev']), gPD = fit(['xProj', 'xDev']);
  say('### 1) Encima de la linea de cierre: logit(p) = a + logit(mercado) + c·(diferencia de nivel / 10)\n**c = 0** quiere decir que la linea ya sabia el lineup. c > 0 = el lineup mejor rinde MAS de lo que dice la linea.\n\n' +
    tabla(['Variable', 'c ± 2·se', 'z'], [lin('Lineup (proyeccion + temporada hasta ayer)', gR, 1), lin('Solo proyeccion de 3 años', gP, 1), lin('Forma de 14 dias (desviacion vs su nivel)', gD, 1), lin('Proyeccion + forma (proyeccion)', gPD, 1), lin('Proyeccion + forma (forma)', gPD, 2)]));
  // 2) por temporada
  say('### 2) ¿Se repite en cada temporada? (c del lineup)\n' + tabla(['Temporada', 'Juegos', 'c ± 2·se', 'z'], SEASONS.map(s => { const rr = rows.filter(r => r.s === s), g = rr.length > 100 ? fit(['xRat'], rr) : null; return [s, rr.length, g ? f(g.b[1], 4) + ' ± ' + f(2 * g.se[1], 4) : '—', g ? f(g.b[1] / (g.se[1] || 1), 1) : '—']; })));
  // 3) por posicion
  const gG = fit(['gC', 'gIF', 'gOF', 'gDH']);
  say('### 3) Cara a cara por posicion (diferencia de nivel de los que juegan en cada grupo)\n' + tabla(['Posicion', 'c ± 2·se', 'z'], [lin('Receptor (C)', gG, 1), lin('Cuadro (1B 2B 3B SS)', gG, 2), lin('Jardin (LF CF RF)', gG, 3), lin('Bateador designado (DH)', gG, 4)]) + 'Cuatro pruebas a la vez: uno de ellos puede salir "significativo" por azar. Solo cuenta si se repite en todas las temporadas.');
  // 4) por tramos
  const cortes = [[-1e9, -30], [-30, -15], [-15, -5], [-5, 5], [5, 15], [15, 30], [30, 1e9]];
  say('### 4) Por tamaño de la ventaja del lineup (local − visita, puntos de wOBA)\n' + tabla(['Diferencia', 'Juegos', 'Local gana (real)', 'Mercado decia', 'Real − mercado', 'z'], cortes.map(([lo, hi]) => {
    const rr = rows.filter(r => r.xRat >= lo && r.xRat < hi), d = rr.map(r => r.y - r.pK), q = ms(d);
    return [(lo < -1e8 ? '< ' + hi : hi > 1e8 ? '≥ ' + lo : lo + ' a ' + hi), rr.length, f(100 * rr.reduce((a, r) => a + r.y, 0) / Math.max(rr.length, 1), 1) + '%', f(100 * rr.reduce((a, r) => a + r.pK, 0) / Math.max(rr.length, 1), 1) + '%', f(100 * q.m, 1) + ' ± ' + f(200 * q.se, 1) + ' pts', f(q.z, 1)];
  })));
  // 5) fuera de muestra: ajustar en las otras temporadas, medir en la que queda
  const dif = [], apuestas = { 0: [], 2: [], 4: [] };
  SEASONS.forEach(s => {
    const tr = rows.filter(r => r.s !== s), te = rows.filter(r => r.s === s); if (tr.length < 500 || te.length < 100) return;
    const g = fit(['xRat'], tr); if (!g) return;
    te.forEach(r => {
      const p = sig(logit(r.pK) + g.b[0] + g.b[1] * r.xRat / 10); dif.push(ll(r.pK, r.y) - ll(p, r.y));
      const eH = p * r.dH - 1, eA = (1 - p) * r.dA - 1, lado = eH >= eA ? 'H' : 'A', edge = lado === 'H' ? (p - r.iH) * 100 : ((1 - p) - r.iA) * 100;
      const gano = lado === 'H' ? r.y === 1 : r.y === 0, ret = gano ? (lado === 'H' ? r.dH : r.dA) - 1 : -1;
      [0, 2, 4].forEach(t => { if (edge >= t) apuestas[t].push(ret); });
    });
  });
  const q = ms(dif);
  say('### 5) Fuera de muestra: se ajusta en las otras temporadas y se mide en la que queda\nMejora de la perdida log contra la linea sola: **' + f(q.m, 5) + '** por juego (z ' + f(q.z, 2) + '). Positivo = el lineup le gana a la linea; cerca de 0 o negativo = no.\n\n' +
    tabla(['Apostar si la ventaja del modelo con lineup es', 'Apuestas', 'ROI ± 2·se (cuota de cierre con vig)'], [0, 2, 4].map(t => { const v = ms(apuestas[t]); return ['≥ ' + t + ' puntos', v.n, f(100 * v.m, 1) + '% ± ' + f(200 * v.se, 1) + '%']; })));
  // ---- 6) Robustez: ¿el resultado depende de como se armo el nivel de cada bateador, o de un sesgo del metodo? ----
  const fitFull = (rr, col) => logistica(rr.map(r => [1, logit(r.pK), r[col] / 10]), rr.map(r => r.y), rr.map(() => 0));
  const fitOff = (rr, col) => logistica(rr.map(r => [1, r[col] / 10]), rr.map(r => r.y), rr.map(r => logit(r.pK)));
  const filaRob = (nom, rr) => { const a = fitOff(rr, 'xRat'), b = fitFull(rr, 'xRat'); return [nom, rr.length, a ? f(a.b[1], 4) + ' ± ' + f(2 * a.se[1], 4) : '—', b ? f(b.b[1], 3) + ' ± ' + f(2 * b.se[1], 3) : '—', b ? f(b.b[2], 4) + ' ± ' + f(2 * b.se[2], 4) : '—']; };
  const cfgs = [[300, 350, 'Base (regresion 300 PA, peso previo 350)'], [1000, 350, 'Regresion fuerte (1000 PA)'], [3000, 350, 'Regresion muy fuerte (3000 PA)'], [300, 1000, 'Mas peso a la proyeccion en la temporada (1000)']];
  const filasRob = cfgs.map(([K, W, nom]) => filaRob(nom, K === 300 && W === 350 ? rows : construir(K, W, false)));
  const rowsPl = construir(300, 350, true);
  filasRob.push(filaRob('PLACEBO: lineup del juego ANTERIOR del mismo equipo', rowsPl));
  say('### 6) Robustez del resultado\n"offset fijo" = el mercado entra con peso 1 (lo de arriba). "b libre" = se deja que el mercado tenga su propio peso b (si b<1 el mercado se pasa de confiado y eso puede fabricar un c negativo falso).\nEl PLACEBO usa el lineup que ese equipo puso en su juego anterior: si c sigue igual de negativo, el efecto NO viene del lineup de hoy sino del tipo de equipo.\n\n' +
    tabla(['Version', 'Juegos', 'c (offset fijo) ± 2·se', 'b (peso del mercado) ± 2·se', 'c (b libre) ± 2·se'], filasRob));
  const medianaF = rows.map(r => r.f).sort()[Math.floor(rows.length / 2)];
  const mitades = []; SEASONS.forEach(s => { const rr = rows.filter(r => r.s === s), fs2 = rr.map(r => r.f).sort(), med = fs2[Math.floor(fs2.length / 2)]; mitades.push([s + ' primera mitad', rr.filter(r => r.f < med)], [s + ' segunda mitad', rr.filter(r => r.f >= med)]); });
  say('### 6b) c (b libre) por mitad de temporada\n' + tabla(['Periodo', 'Juegos', 'c (b libre) ± 2·se', 'z'], mitades.map(([nom, rr]) => { const g = rr.length > 200 ? fitFull(rr, 'xRat') : null; return [nom, rr.length, g ? f(g.b[2], 4) + ' ± ' + f(2 * g.se[2], 4) : '—', g ? f(g.b[2] / (g.se[2] || 1), 1) : '—']; })));
  const dif2 = [], ap3 = { 0: [], 2: [], 4: [] };
  SEASONS.forEach(s => { const tr = rows.filter(r => r.s !== s), te = rows.filter(r => r.s === s); if (tr.length < 500 || te.length < 100) return;
    const g = fitFull(tr, 'xRat'); if (!g) return;
    te.forEach(r => { const p = sig(g.b[0] + g.b[1] * logit(r.pK) + g.b[2] * r.xRat / 10); dif2.push(ll(r.pK, r.y) - ll(p, r.y));
      const eH = p * r.dH - 1, eA = (1 - p) * r.dA - 1, lado = eH >= eA ? 'H' : 'A', edge = lado === 'H' ? (p - r.iH) * 100 : ((1 - p) - r.iA) * 100;
      const gano = lado === 'H' ? r.y === 1 : r.y === 0, ret = gano ? (lado === 'H' ? r.dH : r.dA) - 1 : -1; [0, 2, 4].forEach(t => { if (edge >= t) ap3[t].push(ret); }); }); });
  const q2 = ms(dif2);
  say('### 6c) Fuera de muestra con b libre (a, b y c ajustados en las otras temporadas)\nMejora de la perdida log: **' + f(q2.m, 5) + '** por juego (z ' + f(q2.z, 2) + ').\n\n' + tabla(['Apostar si la ventaja es', 'Apuestas', 'ROI ± 2·se'], [0, 2, 4].map(t => { const v = ms(ap3[t]); return ['≥ ' + t + ' puntos', v.n, f(100 * v.m, 1) + '% ± ' + f(200 * v.se, 1) + '%']; })));
  const cc = gR ? f(gR.b[1], 4) + ' ± ' + f(2 * gR.se[1], 4) : '—';
  say('### Resumen\n```\nc del lineup encima de la linea = ' + cc + ' (por cada 10 puntos de wOBA de diferencia)\nmejora fuera de muestra = ' + f(q.m, 5) + ' por juego (z ' + f(q.z, 2) + ')\nSi el intervalo de c incluye 0 y z < 2, la linea de cierre ya descuenta el lineup.\n```');
  fs.writeFileSync('resultado_mlb.txt', out);
  fs.writeFileSync('resultado_mlb.json', JSON.stringify({ n: rows.length, c: gR && gR.b[1], se: gR && gR.se[1], mejora: q.m, z: q.z }));
  fs.writeFileSync('filas_mlb.json', JSON.stringify(rows));
}
main().catch(e => { console.error(e); fs.writeFileSync('resultado_mlb.txt', out + '\nERROR: ' + (e && e.stack || e)); process.exit(1); });
