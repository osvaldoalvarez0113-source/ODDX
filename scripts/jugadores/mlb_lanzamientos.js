'use strict';
// OVA · MLB: ¿los LANZAMIENTOS (cuantos hay que hacerle a un equipo para que genere carreras o hits, paciencia al bate,
// cansancio del bullpen) le agregan algo a la linea de cierre de DraftKings?
// Para cada juego 2024-2026 con linea de cierre se calcula, con los ultimos 20 juegos de cada equipo ANTES de ese juego:
//   carreras y hits por cada 100 lanzamientos que recibe el equipo (ataque) y que le hacen al rival (pitcheo),
//   lanzamientos por turno al bate (paciencia / eficiencia) y lanzamientos del bullpen en los ultimos 3 dias (cansancio).
// Despues se prueba si eso explica el resultado (quien gana, total de carreras) DESPUES de descontar lo que ya dice la linea.
// Si c ~ 0, el mercado ya lo sabia. Todo usa solo juegos anteriores (sin mirar el futuro).
const fs = require('fs');
const { pedir, pool, logit, sig, ms, ols, logistica, f, tabla, errores } = require('./lib.js');
const MLB = 'https://statsapi.mlb.com/api/v1';
const ESPN_SB = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?limit=300&dates=';
const espnOdds = id => 'https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/' + id + '/competitions/' + id + '/odds';
const SEASONS = (process.env.TEMPS_MLB || '2024,2025,2026').split(',').map(s => parseInt(s, 10));
const VENT = 20, MINJ = 10;                 // ventana (juegos) y minimo de juegos previos; fijados antes de mirar resultados
const ALIAS = { AZ: 'ARI', OAK: 'ATH', CHW: 'CWS', WAS: 'WSH', TBR: 'TB', SDP: 'SD', SFG: 'SF', KCR: 'KC' };
const norm = c => { c = String(c || '').toUpperCase(); return ALIAS[c] || c; };
const sumaDias = (fch, n) => { const d = new Date(fch + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const log = t => console.log(t);
let out = '## MLB · lanzamientos (carreras/hits por lanzamiento, paciencia, bullpen) contra la linea de cierre\n\n';
const say = t => { out += t + '\n\n'; log(t); };
const nn = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };

/* ---------- ESPN: lineas ---------- */
function americano(v) { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return (isFinite(n) && Math.abs(n) >= 100) ? n : null; }
const impAm = a => a < 0 ? (-a) / ((-a) + 100) : 100 / (a + 100);
const decAm = a => a < 0 ? 1 + 100 / (-a) : 1 + a / 100;
function mlDe(lado) {
  if (!lado) return null;
  const c = lado.close && lado.close.moneyLine, k = lado.current && lado.current.moneyLine;
  let o = americano(c && c.american); if (o == null) o = americano(k && k.american); if (o == null) o = americano(lado.moneyLine);
  return o;
}
function totalDe(it) {
  let tot = null; const ct = it.close && it.close.total;
  if (ct) { const v = parseFloat(String(ct.alternateDisplayValue !== undefined ? ct.alternateDisplayValue : ct.american).replace(/[^0-9.]/g, '')); if (isFinite(v) && v > 4 && v < 16) tot = v; }
  if (tot === null && isFinite(+it.overUnder) && +it.overUnder > 4 && +it.overUnder < 16) tot = +it.overUnder;
  return tot;
}
function parseOdds(j) {
  const items = (j && j.items) || []; let mejor = null;
  for (const it of items) {
    const h = mlDe(it.homeTeamOdds), a = mlDe(it.awayTeamOdds); if (h == null || a == null) continue;
    const nombre = (it.provider && it.provider.name) || '?', cand = { h, a, prov: nombre, dk: /draftkings/i.test(nombre), tot: totalDe(it) };
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

/* ---------- boxscore: lanzamientos, hits, turnos al bate ---------- */
let MUESTRA = null;
function ladoBox(T) {
  const ts = (T && T.teamStats) || {}, b = ts.batting || {}, p = ts.pitching || {}, players = (T && T.players) || {};
  let pit = nn(p.pitchesThrown) || nn(p.numberOfPitches), sumP = 0, sp = 0;
  const pid = ((T && T.pitchers) || [])[0];
  Object.keys(players).forEach(k => {
    const pl = players[k], st = pl && pl.stats && pl.stats.pitching; if (!st) return;
    const v = nn(st.pitchesThrown) || nn(st.numberOfPitches); sumP += v;
    if (pid && pl.person && pl.person.id === pid) sp = v;
  });
  if (!pit) pit = sumP;
  const pa = nn(b.plateAppearances) || (nn(b.atBats) + nn(b.baseOnBalls) + nn(b.hitByPitch) + nn(b.sacFlies) + nn(b.sacBunts));
  if (!MUESTRA) MUESTRA = JSON.stringify({ pitching: Object.keys(p), batting: Object.keys(b), pitchers: (T && T.pitchers || []).slice(0, 3) }).slice(0, 1500);
  return { pit, sp, H: nn(b.hits), pa };
}

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
  const usados = {}; let sinPar = 0, marcadorMal = 0;
  juegos.forEach(g => {
    const cand = eventos.filter(e => e.h === g.hC && e.a === g.aC && !usados[e.id] && Math.abs(e.ts - g.ini) < 4 * 3600e3);
    if (!cand.length) { sinPar++; return; }
    cand.sort((a, b) => Math.abs(a.ts - g.ini) - Math.abs(b.ts - g.ini));
    const e = cand[0]; usados[e.id] = 1;
    if (e.done && (e.sH !== g.rH || e.sA !== g.rA)) { marcadorMal++; return; }
    g.ev = e;
  });
  log('  cruzados con ESPN: ' + juegos.filter(g => g.ev).length + ' (sin par ' + sinPar + ', marcador distinto ' + marcadorMal + ')');
  const conEv = juegos.filter(g => g.ev);
  const odds = await pool(conEv.map(g => () => pedir(espnOdds(g.ev.id))), 8, (h, t) => { if (h % 500 === 0) log('  lineas ' + h + '/' + t); });
  conEv.forEach((g, i) => { const o = odds[i] ? parseOdds(odds[i]) : null; if (o) g.o = o; });
  log('  con linea de cierre: ' + juegos.filter(g => g.o).length + ' (con total: ' + juegos.filter(g => g.o && g.o.tot).length + ')');
  // boxscore de TODOS los juegos (el historial de cada equipo necesita todos, tengan linea o no)
  const boxes = await pool(juegos.map(g => () => pedir(MLB + '/game/' + g.pk + '/boxscore')), 8, (h, t) => { if (h % 500 === 0) log('  boxscores ' + h + '/' + t); });
  let sinLanz = 0;
  juegos.forEach((g, i) => {
    const b = boxes[i]; if (!b || !b.teams) { g.bad = true; return; }
    const H = ladoBox(b.teams.home), A = ladoBox(b.teams.away);
    if (!(H.pit > 0) || !(A.pit > 0) || !(H.pa > 0) || !(A.pa > 0)) { g.bad = true; sinLanz++; return; }
    g.H = H; g.A = A; g.Y = Y;
  });
  log('  juegos sin datos de lanzamientos: ' + sinLanz + ' · otros sin boxscore: ' + juegos.filter(g => g.bad).length);
  return juegos;
}

/* ---------- estadistica por equipo antes de cada juego ---------- */
const rate = (num, den, lg, K) => (num + K * lg) / (den + K);
function construirFilas(todos) {
  const orden = todos.filter(g => !g.bad).sort((a, b) => a.ini - b.ini);
  const eq = {}, L = { R: 0, S: 0, H: 0, PA: 0, n: 0 }, filas = [];
  const rec = (g, lado) => {
    const mio = lado === 'h' ? g.H : g.A, otro = lado === 'h' ? g.A : g.H;
    return { ini: g.ini, S: otro.pit, T: mio.pit, R: lado === 'h' ? g.rH : g.rA, RA: lado === 'h' ? g.rA : g.rH, H: mio.H, HA: otro.H, PAo: mio.pa, PAd: otro.pa, BP: Math.max(mio.pit - mio.sp, 0) };
  };
  const feats = (k, g) => {
    const arr = (eq[g.Y + '|' + k] || []).filter(r => r.ini < g.ini);
    if (arr.length < MINJ) return null;
    const w = arr.slice(-VENT); let S = 0, T = 0, R = 0, RA = 0, H = 0, HA = 0, PAo = 0, PAd = 0;
    w.forEach(r => { S += r.S; T += r.T; R += r.R; RA += r.RA; H += r.H; HA += r.HA; PAo += r.PAo; PAd += r.PAd; });
    const lgR = L.R / (L.S / 100), lgH = L.H / (L.S / 100), lgP = L.S / L.PA, lgG = L.R / L.n;
    let bp3 = 0; arr.forEach(r => { if (g.ini - r.ini < 72 * 3600e3) bp3 += r.BP; });
    return {
      rppOff: rate(R, S / 100, lgR, 6), hppOff: rate(H, S / 100, lgH, 6), rppDef: rate(RA, T / 100, lgR, 6), hppDef: rate(HA, T / 100, lgH, 6),
      ppaOff: rate(S, PAo, lgP, 40), ppaDef: rate(T, PAd, lgP, 40), bp3, rd: (R - RA) / (w.length + 10), rg: (R + RA + 10 * lgG) / (w.length + 10)
    };
  };
  orden.forEach(g => {
    const kh = g.hC, ka = g.aC;
    if (g.o && L.n > 300) {
      const a = feats(kh, g), b = feats(ka, g);
      if (a && b) {
        const iH = impAm(g.o.h), iA = impAm(g.o.a);
        filas.push({
          s: g.Y, f: g.fecha, y: g.y, tot: g.rH + g.rA, line: g.o.tot, pK: iH / (iH + iA), iH, iA, dH: decAm(g.o.h), dA: decAm(g.o.a),
          dRppOff: a.rppOff - b.rppOff, dHppOff: a.hppOff - b.hppOff, dRppDef: a.rppDef - b.rppDef, dHppDef: a.hppDef - b.hppDef,
          dPpaOff: a.ppaOff - b.ppaOff, dPpaDef: a.ppaDef - b.ppaDef, dBp3: a.bp3 - b.bp3, dRd: a.rd - b.rd,
          sRppOff: a.rppOff + b.rppOff, sRppDef: a.rppDef + b.rppDef, sPpaOff: a.ppaOff + b.ppaOff, sPpaDef: a.ppaDef + b.ppaDef, sBp3: a.bp3 + b.bp3, sRg: (a.rg + b.rg) / 2
        });
      }
    }
    (eq[g.Y + '|' + kh] = eq[g.Y + '|' + kh] || []).push(rec(g, 'h')); (eq[g.Y + '|' + ka] = eq[g.Y + '|' + ka] || []).push(rec(g, 'a'));
    L.R += g.rH + g.rA; L.S += g.H.pit + g.A.pit; L.H += g.H.H + g.A.H; L.PA += g.H.pa + g.A.pa; L.n += 1;
  });
  return filas;
}

/* ---------- pruebas ---------- */
const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
function estandarizar(filas, cols) { const S = {}; cols.forEach(c => { S[c] = sd(filas.map(r => r[c])) || 1; }); filas.forEach(r => cols.forEach(c => { r['z_' + c] = r[c] / S[c]; })); return S; }
const cTxt = (g, i) => g ? f(g.b[i], 4) + ' ± ' + f(2 * g.se[i], 4) : '—', zTxt = (g, i) => g ? f(g.b[i] / (g.se[i] || 1), 1) : '—';
const ajusteML = (rr, cols, libre) => logistica(rr.map(r => (libre ? [1, logit(r.pK)] : [1]).concat(cols.map(c => r['z_' + c]))), rr.map(r => r.y), rr.map(r => libre ? 0 : logit(r.pK)));
function apuestasML(rr, g, cols, umbral) {
  const res = [];
  rr.forEach(r => {
    const z = logit(r.pK) + g.b[0] + cols.reduce((a, c, i) => a + g.b[1 + i] * r['z_' + c], 0), p = sig(z);
    const eH = p - r.iH, eA = (1 - p) - r.iA, lado = eH >= eA ? 'H' : 'A', e = Math.max(eH, eA) * 100;
    if (e < umbral) return;
    const gano = lado === 'H' ? r.y === 1 : r.y === 0, dec = lado === 'H' ? r.dH : r.dA;
    res.push(gano ? dec - 1 : -1);
  });
  return res;
}
const pctTxt = v => { const s = ms(v); return s.n + ' apuestas · ROI ' + f(s.m * 100, 1) + '% ± ' + f(2 * s.se * 100, 1); };

async function main() {
  let todos = []; const porY = {};
  for (const Y of SEASONS) { const t = await temporada(Y); porY[Y] = t.length; todos = todos.concat(t); }
  say('### Datos\n```\n' + SEASONS.map(Y => Y + ': juegos terminados ' + porY[Y]).join('\n') + '\njuegos con lanzamientos: ' + todos.filter(g => !g.bad).length + ' de ' + todos.length + ' · con linea: ' + todos.filter(g => !g.bad && g.o).length + '\nestructura del boxscore: ' + MUESTRA + '\nerrores de descarga: ' + errores.length + (errores.length ? ' (primeros: ' + errores.slice(0, 3).join(' | ') + ')' : '') + '\n```');
  const filas = construirFilas(todos);
  if (filas.length < 800) { say('NO TERMINO: muy pocos juegos medibles (' + filas.length + ').'); fs.writeFileSync('resultado_lanz.txt', out); return; }
  const TOT = ['dRppOff', 'dHppOff', 'dRppDef', 'dHppDef', 'dPpaOff', 'dPpaDef', 'dBp3', 'dRd'];
  const SUM = ['sRppOff', 'sRppDef', 'sPpaOff', 'sPpaDef', 'sBp3', 'sRg'];
  const S1 = estandarizar(filas, TOT), S2 = estandarizar(filas, SUM);
  say('Juegos medibles (ambos equipos con >= ' + MINJ + ' juegos previos, ventana ' + VENT + '): ' + filas.length + ' · con total de la linea: ' + filas.filter(r => r.line).length + '. Las variables se miden en desviaciones tipicas (c = efecto de subir 1 desviacion tipica, en logit para quien gana y en carreras para el total).');

  const nombre = { dRppOff: 'Carreras por 100 lanzamientos recibidos (ataque)', dHppOff: 'Hits por 100 lanzamientos recibidos (ataque)', dRppDef: 'Carreras permitidas por 100 lanzamientos (pitcheo; mas = peor)', dHppDef: 'Hits permitidos por 100 lanzamientos (pitcheo)', dPpaOff: 'Lanzamientos por turno que recibe el ataque (paciencia)', dPpaDef: 'Lanzamientos por turno del pitcheo (eficiencia)', dBp3: 'Lanzamientos del bullpen en los ultimos 3 dias (cansancio)', dRd: 'CONTROL: diferencia de carreras por juego (ultimos 20)' };
  // 0) sanidad: ¿predicen quien gana, sin mirar la linea?
  const g0 = logistica(filas.map(r => [1].concat(TOT.map(c => r['z_' + c]))), filas.map(r => r.y), filas.map(() => 0));
  say('### 0) Sanidad: ¿estas variables predicen quien gana por si solas (sin mirar la linea)?\n' + tabla(['Variable (local − visita)', 'c ± 2·se', 'z'], TOT.map((c, i) => [nombre[c], cTxt(g0, 1 + i), zTxt(g0, 1 + i)])));
  // 1) una por una encima de la linea
  const filaUna = TOT.map(c => { const g = ajusteML(filas, [c], false); return [nombre[c], cTxt(g, 1), zTxt(g, 1)]; });
  say('### 1) Encima de la linea de cierre (quien gana): logit p = logit(mercado) + a + c·variable. c = 0 → el mercado ya lo sabia.\n' + tabla(['Variable (local − visita), una a la vez', 'c ± 2·se', 'z'], filaUna) + 'Son 8 pruebas a la vez: con 8 pruebas, algo "significativo" (|z| ≥ 2) sale por azar cerca de 1 de cada 3 veces. Pide |z| ≥ 3 y que se repita por temporada.');
  const PIT = TOT.filter(c => c !== 'dRd');
  const gJ = ajusteML(filas, TOT, false);
  say('### 2) Todas juntas (con el control de carreras por juego)\n' + tabla(['Variable', 'c ± 2·se', 'z'], TOT.map((c, i) => [nombre[c], cTxt(gJ, 1 + i), zTxt(gJ, 1 + i)])));
  const filT = SEASONS.map(Y => { const rr = filas.filter(r => r.s === Y); if (rr.length < 300) return [String(Y), String(rr.length), '—', '—']; const g = ajusteML(rr, PIT, false); return [String(Y), String(rr.length), PIT.map((c, i) => f(g.b[1 + i], 3)).join(' / '), PIT.map((c, i) => zTxt(g, 1 + i)).join(' / ')]; });
  say('### 3) ¿Se repite por temporada? (las 7 variables de lanzamientos juntas, en este orden: ' + PIT.map(c => c.replace(/^d/, '')).join(', ') + ')\n' + tabla(['Temporada', 'Juegos', 'c (por variable)', 'z (por variable)'], filT));
  // 4) fuera de muestra
  const lineasOOS = [];
  [0, 2, 4].forEach(um => {
    let ap = [];
    SEASONS.forEach(Y => { const tr = filas.filter(r => r.s !== Y), te = filas.filter(r => r.s === Y); if (tr.length < 800 || te.length < 300) return; const g = ajusteML(tr, PIT, false); ap = ap.concat(apuestasML(te, g, PIT, um)); });
    lineasOOS.push(['ventaja ≥ ' + um + ' pts', pctTxt(ap)]);
  });
  let dll = [];
  SEASONS.forEach(Y => { const tr = filas.filter(r => r.s !== Y), te = filas.filter(r => r.s === Y); if (tr.length < 800 || te.length < 300) return; const g = ajusteML(tr, PIT, false); te.forEach(r => { const z = logit(r.pK) + g.b[0] + PIT.reduce((a, c, i) => a + g.b[1 + i] * r['z_' + c], 0), p = sig(z), pm = r.pK; const lp = r.y ? Math.log(p) : Math.log(1 - p), lm = r.y ? Math.log(pm) : Math.log(1 - pm); dll.push(lm - lp); }); });
  const sdll = ms(dll);
  say('### 4) Fuera de muestra: se ajusta en las otras temporadas y se apuesta en la que queda (moneyline a la cuota de cierre de DraftKings)\n' + tabla(['Regla', 'Resultado'], lineasOOS) + 'Pérdida (log loss) del modelo con lanzamientos menos la del mercado: ' + f(sdll.m * 1000, 2) + ' milésimas ± ' + f(2 * sdll.se * 1000, 2) + ' (negativo = mejora al mercado; positivo = peor).');

  // 5) totales
  const rt = filas.filter(r => r.line);
  if (rt.length > 800) {
    const X = (cols) => rt.map(r => [1, r.line].concat(cols.map(c => r['z_' + c]))), y = rt.map(r => r.tot);
    const nomS = { sRppOff: 'Carreras por 100 lanzamientos recibidos (los dos ataques)', sRppDef: 'Carreras permitidas por 100 lanzamientos (los dos pitcheos)', sPpaOff: 'Lanzamientos por turno recibidos (paciencia, los dos)', sPpaDef: 'Lanzamientos por turno del pitcheo (los dos)', sBp3: 'Lanzamientos del bullpen en 3 dias (los dos, cansancio)', sRg: 'CONTROL: carreras por juego recientes de los dos equipos' };
    const una = SUM.map(c => { const g = ols(X([c]), y); return [nomS[c], g ? f(g.b[2], 3) + ' ± ' + f(2 * g.se[2], 3) : '—', g ? f(g.b[2] / g.se[2], 1) : '—']; });
    say('### 5) Total de carreras: total real = a + b·(total de la linea) + c·variable. c = 0 → la linea ya lo sabia. (' + rt.length + ' juegos)\n' + tabla(['Variable (suma de los dos equipos), una a la vez', 'c ± 2·se (carreras por 1 desviacion tipica)', 'z'], una));
    const gAll = ols(X(SUM), y);
    say('### 5b) Todas juntas en el total\n' + tabla(['Variable', 'c ± 2·se', 'z'], SUM.map((c, i) => [nomS[c], gAll ? f(gAll.b[2 + i], 3) + ' ± ' + f(2 * gAll.se[2 + i], 3) : '—', gAll ? f(gAll.b[2 + i] / gAll.se[2 + i], 1) : '—'])));
    const SUMP = SUM.filter(c => c !== 'sRg');
    const fil5 = SEASONS.map(Y => { const sub = rt.filter(r => r.s === Y); if (sub.length < 300) return [String(Y), String(sub.length), '—']; const g = ols(sub.map(r => [1, r.line].concat(SUMP.map(c => r['z_' + c]))), sub.map(r => r.tot)); return [String(Y), String(sub.length), g ? SUMP.map((c, i) => f(g.b[2 + i], 2) + ' (z ' + f(g.b[2 + i] / g.se[2 + i], 1) + ')').join(' · ') : '—']; });
    say('### 5c) ¿Se repite por temporada en el total? (' + SUMP.map(c => c.replace(/^s/, '')).join(', ') + ')\n' + tabla(['Temporada', 'Juegos', 'c por variable'], fil5));
    const oos = [];
    [0.3, 0.5, 0.75].forEach(um => {
      const v = [];
      SEASONS.forEach(Y => {
        const tr = rt.filter(r => r.s !== Y), te = rt.filter(r => r.s === Y); if (tr.length < 800 || te.length < 300) return;
        const g = ols(tr.map(r => [1, r.line].concat(SUMP.map(c => r['z_' + c]))), tr.map(r => r.tot)); if (!g) return;
        te.forEach(r => { const pred = g.b[0] + g.b[1] * r.line + SUMP.reduce((a, c, i) => a + g.b[2 + i] * r['z_' + c], 0), d = pred - r.line; if (Math.abs(d) < um || r.tot === r.line) return; const over = d > 0, gano = over ? r.tot > r.line : r.tot < r.line; v.push(gano ? 100 / 110 : -1); });
      });
      oos.push(['diferencia esperada ≥ ' + um + ' carreras', pctTxt(v)]);
    });
    say('### 5d) Fuera de muestra en el total (Over si el modelo espera mas carreras que la linea, Under si menos; se asume pagar −110 porque ESPN no da el precio del total)\n' + tabla(['Regla', 'Resultado'], oos) + 'A −110 hay que ganar 52.4% para empatar.');
  } else say('Total de la linea: muy pocos juegos con total (' + rt.length + '), no se midio.');
  say('### Resumen\n```\nc de cada variable encima de la linea (quien gana): ver seccion 1; encima de la linea del total: seccion 5.\nSi todos los intervalos incluyen 0 y la apuesta fuera de muestra no da ROI positivo claro, la linea ya cobra los lanzamientos.\n```');
  fs.writeFileSync('resultado_lanz.txt', out);
  fs.writeFileSync('resultado_lanz.json', JSON.stringify({ n: filas.length, c_ml: Object.fromEntries(TOT.map((c, i) => [c, { b: gJ && gJ.b[1 + i], se: gJ && gJ.se[1 + i] }])) }, null, 1));
  fs.writeFileSync('filas_lanz.json', JSON.stringify(filas));
}
main().catch(e => { console.error(e); try { fs.writeFileSync('resultado_lanz.txt', out + '\nERROR: ' + (e && e.stack || e)); } catch (x) { } process.exit(1); });
