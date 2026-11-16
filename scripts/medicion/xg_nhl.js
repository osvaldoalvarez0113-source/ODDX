'use strict';
/* OVA · NHL: ¿la CALIDAD del tiro (goles esperados, xG, de MoneyPuck.com) le sirve más al modelo que CONTAR tiros?
   Uso: node scripts/medicion/xg_nhl.js all_teams.csv [datos-nhl.json] [salida.md]
   all_teams.csv = https://moneypuck.com/moneypuck/playerData/careers/gameByGame/all_teams.csv (gratis para uso NO comercial, con crédito a MoneyPuck.com).
   El modelo es modelo-nhl.js tal cual: su «rating de tiros» (kS, Ws, Hs) se alimenta con una medida distinta en cada variante.
   Todas las variantes usan los datos de MoneyPuck (también los tiros), eligen sus constantes SOLO con temporadas anteriores y se miden en la siguiente.
   Regla fijada antes de correr (15-nov-2026): una variante entra al modelo solo si le gana a «tiros a puerta» con z <= -2 en la pérdida por juego,
   y mejora en al menos 3 de las 4 temporadas completas de prueba. */
const fs = require('fs'), path = require('path'), readline = require('readline');
const L = require('../lib_medir.js'), M = require('../../modelo-nhl.js');
const CSV = process.argv[2], DAT = process.argv[3] || path.join(__dirname, '../../datos-nhl.json'), OUT = process.argv[4];
const out = []; const log = s => { out.push(s); console.log(s); };
const fin = c => { if (OUT) fs.writeFileSync(OUT, out.join('\n') + '\n'); process.exit(c); };
// abreviaturas: MoneyPuck y ESPN a una sola
const AB = { 'T.B': 'TBL', TB: 'TBL', 'N.J': 'NJD', NJ: 'NJD', 'S.J': 'SJS', SJ: 'SJS', 'L.A': 'LAK', LA: 'LAK', WAS: 'WSH', MON: 'MTL', UTAH: 'UTA', ARI: 'ARI', VEG: 'VGK' };
const ab = x => AB[x] || x;
const MED = {   // variante -> columnas [a favor, en contra] y escala para que quede en «tiros» (el modelo recorta el error a ±25)
  tiros: { f: 'shotsOnGoalFor', c: 'shotsOnGoalAgainst', k: 1, t: 'Tiros a puerta (lo de hoy)' },
  intentos: { f: 'shotAttemptsFor', c: 'shotAttemptsAgainst', k: 0.5, t: 'Intentos de tiro (dominio de zona)' },
  xg: { f: 'xGoalsFor', c: 'xGoalsAgainst', k: 10, t: 'Goles esperados (xG)' },
  xgAj: { f: 'flurryScoreVenueAdjustedxGoalsFor', c: 'flurryScoreVenueAdjustedxGoalsAgainst', k: 10, t: 'xG ajustado por marcador y pista' },
  peligro: { f: 'highDangerxGoalsFor', c: 'highDangerxGoalsAgainst', k: 20, t: 'xG de tiros de alto peligro' }
};

async function leer() {
  const rl = readline.createInterface({ input: fs.createReadStream(CSV), crlfDelay: Infinity });
  let cab = null, ix = null; const J = {}; let n = 0;
  for await (const lin of rl) {
    const c = lin.split(',');
    if (!cab) { cab = c.map(x => x.trim().replace(/^"|"$/g, '')); ix = k => cab.indexOf(k);
      const nec = ['season', 'gameId', 'playerTeam', 'opposingTeam', 'home_or_away', 'gameDate', 'situation'];
      const faltan = nec.filter(k => ix(k) < 0);
      Object.keys(MED).forEach(v => { if (ix(MED[v].f) < 0 || ix(MED[v].c) < 0) { log('Sin columnas para «' + v + '» (' + MED[v].f + '): se salta.'); delete MED[v]; } });
      if (faltan.length || !MED.tiros) { log('FALTAN COLUMNAS: ' + faltan.join(', ') + '\nCabecera del archivo:\n' + cab.join(', ')); fin(1); }
      continue; }
    if (c[ix('situation')] !== 'all' || c[ix('home_or_away')] !== 'HOME') continue;
    const o = { h: ab(c[ix('playerTeam')]), a: ab(c[ix('opposingTeam')]), d: String(c[ix('gameDate')]), m: {} };
    Object.keys(MED).forEach(v => { o.m[v] = [parseFloat(c[ix(MED[v].f)]) * MED[v].k, parseFloat(c[ix(MED[v].c)]) * MED[v].k]; });
    (J[o.h + '|' + o.a] = J[o.h + '|' + o.a] || []).push(o); n++;
  }
  log('MoneyPuck: ' + n + ' juegos (fila del local, todas las situaciones).');
  return J;
}

(async function () {
  const J = await leer();
  const d = JSON.parse(fs.readFileSync(DAT));
  const TEMPS = Object.keys(d.temps).map(Number).sort();
  const todos = [].concat(...TEMPS.map(s => d.temps[s].juegos)).filter(g => g.done && !g.skip).sort((a, b) => a.ts - b.ts);
  let unidos = 0; const sinPar = {};
  todos.forEach(g => {
    const k = ab(g.abH) + '|' + ab(g.abA), c = J[k] || [];
    const f = new Date(g.ts - 8 * 3600e3), ymd = x => x.getUTCFullYear() * 10000 + (x.getUTCMonth() + 1) * 100 + x.getUTCDate();
    const cand = [ymd(f), ymd(new Date(f - 864e5)), ymd(new Date(+f + 864e5))].map(String);
    const m = c.find(o => o.d === cand[0]) || c.find(o => o.d === cand[1] || o.d === cand[2]);
    if (m) { g.mp = m.m; unidos++; } else if (g.ty === 2) sinPar[k] = (sinPar[k] || 0) + 1;
  });
  log('Unidos con datos-nhl.json: ' + unidos + ' de ' + todos.length + ' juegos.');
  if (unidos < todos.length * 0.9) { const t = Object.keys(sinPar).sort((a, b) => sinPar[b] - sinPar[a]).slice(0, 15); log('OJO, muchos sin unir. Los que más faltan: ' + t.map(k => k + ' ' + sinPar[k]).join(' · ')); }
  if (unidos < 2000) { log('NO HAY SUFICIENTES JUEGOS UNIDOS.'); fin(1); }

  const hasta = sk => todos.filter(g => M.seasonOf(g.ts) <= sk);
  const poner = v => todos.forEach(g => { if (v && g.mp && isFinite(g.mp[v][0]) && isFinite(g.mp[v][1])) { g.sh = g.mp[v][0]; g.sa = g.mp[v][1]; } else { g.sh = null; g.sa = null; } });
  function porJuego(P, sk) {
    const o = {};
    M.correr(hasta(sk), P, (g, x) => {
      if (M.seasonOf(g.ts) !== sk || g.ty !== 2 || x.cH < 10 || x.cA < 10 || g.hs === g.as) return;
      const pH = L.clip(M.dist(x.b0 + (P.Z === undefined ? 1 : P.Z) * x.rd, x.pt, P).pH, 1e-4, 1 - 1e-4), w = g.hs > g.as;
      const q = g.linea && g.linea.ml ? L.sinMargen(g.linea.ml[0], g.linea.ml[1])[0] : null;
      o[g.id] = { ll: -Math.log(w ? pH : 1 - pH), p: pH, q, w: w ? 1 : 0 };
    });
    return o;
  }
  const REJ = []; [0.004, 0.008, 0.015].forEach(kM => [0.03, 0.06, 0.09].forEach(kS => [0.04, 0.07, 0.1, 0.14].forEach(Ws => REJ.push({ kM, kS, Ws }))));
  const PRUEBA = TEMPS.filter(s => s >= TEMPS[0] + 2);          // hacen falta 2 temporadas antes para elegir constantes
  const R = {};                                                   // R[variante][temporada] = { id: {ll,p,q,w} }
  const elegidos = {};
  const VARS = ['goles'].concat(Object.keys(MED));
  for (const v of VARS) {
    poner(v === 'goles' ? null : v); R[v] = {}; elegidos[v] = {};
    const rej = v === 'goles' ? [0.008, 0.015, 0.025].map(kM => ({ kM, Ws: 0, kS: 0 })) : REJ;
    const cache = rej.map(() => ({}));
    const suma = (i, sk) => { if (!cache[i][sk]) { const o = porJuego(Object.assign({}, M.PDEF, rej[i]), sk); let s = 0, n = 0; for (const k in o) { s += o[k].ll; n++; } cache[i][sk] = [s, n, o]; } return cache[i][sk]; };
    for (const sk of PRUEBA) {
      let b = null; rej.forEach((p, i) => { let s = 0, n = 0; TEMPS.filter(e => e < sk && e > TEMPS[0]).forEach(e => { const c = suma(i, e); s += c[0]; n += c[1]; }); if (n && (!b || s / n < b.v)) b = { i, v: s / n }; });
      elegidos[v][sk] = rej[b.i]; R[v][sk] = suma(b.i, sk)[2];
    }
    console.log('listo', v);
  }
  const nom = v => v === 'goles' ? 'Solo goles (sin tiros)' : MED[v].t;
  log('\n# NHL · calidad del tiro (xG de MoneyPuck) contra contar tiros\n');
  log('Datos: MoneyPuck.com (uso no comercial). Temporadas de prueba: ' + PRUEBA.join(', ') + '. Pérdida logarítmica del ganador: más baja = mejor.\n');
  const cab = ['Variante'].concat(PRUEBA.map(String)).concat(['Total', 'Contra «tiros» (milésimas ± 2·se)', 'z', 'Mejora en', '¿Entra?']);
  const filas = VARS.map(v => {
    const porT = PRUEBA.map(sk => { const o = R[v][sk]; const ks = Object.keys(o); return ks.length ? ks.reduce((a, k) => a + o[k].ll, 0) / ks.length : NaN; });
    let s = 0, n = 0; const dif = []; let mej = 0, comp = 0;
    PRUEBA.forEach(sk => { const o = R[v][sk], b = R.tiros[sk]; let ds = 0, dn = 0; for (const k in o) { s += o[k].ll; n++; if (b[k]) { dif.push(o[k].ll - b[k].ll); ds += o[k].ll - b[k].ll; dn++; } } if (dn > 600) { comp++; if (ds < 0) mej++; } });
    const m = L.ms(dif), entra = v !== 'tiros' && v !== 'goles' && m.z <= -2 && mej >= Math.min(3, comp);
    return [nom(v)].concat(porT.map(x => L.f(x, 4))).concat([L.f(s / n, 4), v === 'tiros' ? '—' : (m.m >= 0 ? '+' : '') + (m.m * 1000).toFixed(2) + ' ± ' + (2000 * m.se).toFixed(2), v === 'tiros' ? '—' : L.f(m.z, 1), v === 'tiros' ? '—' : mej + ' de ' + comp, v === 'tiros' ? 'base' : (entra ? 'SÍ' : 'no')]);
  });
  { const porT = PRUEBA.map(sk => { const o = R.tiros[sk]; const ks = Object.keys(o).filter(k => o[k].q !== null); return ks.length ? ks.reduce((a, k) => a - Math.log(o[k].w ? o[k].q : 1 - o[k].q), 0) / ks.length : NaN; });
    filas.push(['**Mercado (cierre sin margen)**'].concat(porT.map(x => L.f(x, 4))).concat(['', '', '', '', ''])); }
  log(L.tabla(cab, filas));
  log('Juegos por temporada de prueba: ' + PRUEBA.map(sk => sk + ': ' + Object.keys(R.tiros[sk]).length).join(' · ') + '. Las temporadas con menos de 600 juegos no cuentan para «Mejora en».');
  // ¿le agrega algo al precio? gana = a + b·mercado + c·(modelo − mercado), en logit
  log('\n## ¿Le agrega algo al precio de cierre?\n' + L.tabla(['Variante', 'Juegos con línea', 'Peso del modelo sobre el mercado (c ± 2·se)', 'Veredicto'], VARS.map(v => {
    const X = [], y = []; PRUEBA.forEach(sk => { const o = R[v][sk]; for (const k in o) if (o[k].q !== null) { X.push([1, o[k].q, o[k].p - o[k].q]); y.push(o[k].w); } });
    const r = L.ols(X, y); if (!r) return [nom(v), String(X.length), '—', '—'];
    const z = r.b[2] / r.se[2]; return [nom(v), String(X.length), L.f(r.b[2], 2) + ' ± ' + L.f(2 * r.se[2], 2), z >= 2.6 ? 'AGREGA (z ' + L.f(z, 1) + ')' : 'no se distingue de cero (z ' + L.f(z, 1) + ')'];
  })));
  log('Constantes elegidas con las temporadas anteriores:\n' + VARS.map(v => '- ' + nom(v) + ': ' + PRUEBA.map(sk => sk + ' ' + JSON.stringify(elegidos[v][sk])).join(' · ')).join('\n'));
  fin(0);
})().catch(e => { log('ERROR: ' + (e && e.stack || e)); fin(1); });
