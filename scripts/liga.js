'use strict';
/* ===================================================================
   OVA · LIGA DE MODELOS (corre en GitHub Actions cada 2 horas: .github/workflows/liga.yml). No gasta OddsPapi.

   La idea: en vez de una sola fórmula, varios «modelos» pronostican cada juego a la vez y se lleva la tabla de quién acierta.
   1) GUARDA, ANTES de que empiece cada juego, lo que dice cada competidor (se puede refrescar hasta el inicio, nunca después).
   2) CALIFICA solo con el resultado final de ESPN (3.5 h después del inicio; pospuesto/cancelado o 8 días sin dato = no cuenta).
   3) ASCIENDE: el titular de cada deporte es el que se muestra primero. Un suplente le quita el puesto solo si, en los juegos
      donde ESCOGEN DISTINTO, le gana claramente (20+ duelos y z ≥ 1.645, ~95%). Regla fijada el 20-nov-2026, antes de ver datos.
   4) MAPA DE CONFIANZA: con lo calificado del titular, cuánto acierta por zona (franja de 5 puntos del % y si el pick es
      local, visita o empate). Con menos de 30 juegos en la zona se dice que todavía no dice nada.

   Competidores (cada uno solo donde hay dato):
     ova          lo que muestra la app en NBA, NHL y NFL: el mercado manda y el modelo pesa 5% (LAM_M); sin mercado, el modelo.
     modelo       el modelo propio de OVA: NBA (el <script id="modelo"> de nba.html nutrido con el BPI de ESPN, 0.70, como la app),
                  NHL (modelo-nhl.js, con tiros a puerta), NFL (modelo-nfl.js nutrido con el FPI de ESPN, 0.80, como la app),
                  fútbol (el Dixon-Coles v4 de futbol.html: en las 5 ligas ajustado igual que el teléfono con 2 temporadas + la actual;
                  Champions con fuerza-copas.json; copas de cada país con fuerza-nacional.json, como torneos.js),
                  tenis (Elo general + superficie de ratings-tenis.json, como tenis.js).
     modelo-goles NHL sin tiros a puerta (Ws = 0): la variante de antes de agregar los tiros.
     modelo-solo  NBA y NFL sin el pronóstico de ESPN.
     mercado      moneyline de ESPN (DraftKings) sin margen; en fútbol el 1X2.
     espn         el pronóstico público de ESPN (BPI en NBA, FPI en NFL).
     polymarket   precio de Polymarket (rama «pred»), sin el margen.
     consenso     promedio (en logit) de los que haya: mercado, espn, polymarket y modelo. Necesita 2 o más.
     nfelo        NFL: el modelo público nfelo (github.com/greerreNFL/nfelo, output_data/prediction_tracker.csv, se actualiza solo).
     clubelo      fútbol: los pronósticos de ClubElo (api.clubelo.com/Fixtures: probabilidad de cada diferencia de goles → 1X2).
     tennisabstract tenis: el Elo por superficie de Tennis Abstract (Jeff Sackmann, informes semanales de la ATP y la WTA).

   Archivos (rama «liga»): liga-registro.json (todo lo guardado), liga.json (resumen que leen las apps) y liga-hist.json
   (archivo propio de resultados de NBA y de las 5 ligas para correr los modelos; se arma solo, por meses, y se completa en varias vueltas).
   Uso: node scripts/liga.js <carpeta con la rama liga> [<carpeta con la rama pred>]
   =================================================================== */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const AR = require('../autoregistro.js');           // lineaEspn, trio, norm: las mismas funciones que usa el teléfono

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const CORE = 'https://sports.core.api.espn.com/v2/sports/';
const H = 3600e3, D = 864e5;
const REGLAS = { ASCENSO_MIN: 20, ASCENSO_Z: 1.645, CONF_MIN: 30, HORAS_RES: 3.5, DIAS_MAX: 8, fijadas: '2026-11-20' };
const LAM_M = 0.05;                                 // peso del modelo cuando hay mercado (NHL y NFL, usdeporte.js / nba.html)
const W_FPI = 0.80;                                 // peso del FPI en la NFL (publico.js)
const W_BPI = 0.70;                                 // peso del BPI en la NBA (publico.js)

const FUT = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf',
  'eng.fa', 'ger.dfb_pokal', 'ita.coppa_italia', 'fra.coupe_de_france', 'esp.copa_del_rey'];
const DEPS = {
  nba: { nombre: 'NBA', rutas: ['basketball/nba'], core: 'basketball/leagues/nba', horiz: 36 * H, titular0: 'ova', pred: 'nba' },
  nhl: { nombre: 'NHL', rutas: ['hockey/nhl'], horiz: 36 * H, titular0: 'ova', pred: 'nhl' },
  nfl: { nombre: 'NFL', rutas: ['football/nfl'], core: 'football/leagues/nfl', horiz: 7 * D, titular0: 'ova', pred: 'nfl', sinFecha: true },
  mlb: { nombre: 'MLB', rutas: ['baseball/mlb'], horiz: 36 * H, titular0: 'mercado', pred: 'mlb' },
  futbol: { nombre: 'Fútbol', rutas: FUT.map(l => 'soccer/' + l), horiz: 36 * H, titular0: 'mercado', pred: 'futbol', empate: true },
  tenis: { nombre: 'Tenis', rutas: ['tennis/atp', 'tennis/wta'], horiz: 36 * H, titular0: 'modelo' },
};
const NOMBRES = {
  ova: 'OVA (lo que muestra la app)', modelo: 'Modelo OVA', 'modelo-goles': 'Modelo OVA sin tiros', 'modelo-solo': 'Modelo OVA sin ESPN',
  mercado: 'Mercado', espn: 'ESPN', polymarket: 'Polymarket', consenso: 'Consenso',
  nfelo: 'nfelo', clubelo: 'ClubElo', tennisabstract: 'Tennis Abstract',
};

/* ---------- utilidades puras ---------- */
const clamp = p => Math.min(Math.max(p, 1e-4), 1 - 1e-4);
const logit = p => Math.log(clamp(p) / (1 - clamp(p)));
const sig = z => 1 / (1 + Math.exp(-z));
const r3 = x => Math.round(x * 1000) / 1000;
const pad2 = n => (n < 10 ? '0' : '') + n;
function ymdUTC(ts) { const d = new Date(ts); return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()); }
function valido(p) { return typeof p === 'number' && isFinite(p) && p > 0.005 && p < 0.995; }
/* probabilidades como [L, A, D] (D = 0 fuera del fútbol); null si no suman 1 */
function arr(L, A, Dr) {
  if (!valido(L) || !valido(A)) return null;
  const d = (typeof Dr === 'number' && Dr > 0 && Dr < 1) ? Dr : 0, s = L + A + d;
  if (!(s > 0.96 && s < 1.04)) return null;
  return [r3(L / s), r3(A / s), r3(d / s)];
}
const deLocal = p => valido(p) ? arr(p, 1 - p) : null;
function pickDe(p) { const i = p[2] > p[0] && p[2] > p[1] ? 2 : (p[0] >= p[1] ? 0 : 1); return { i: i, lado: 'LAD'[i], p: p[i] }; }
const LADO = { L: 'local', A: 'visita', D: 'empate' };
function zonaDe(pk) {
  const lo = Math.min(Math.floor(pk.p * 20 + 1e-9) * 5, 85);
  return (lo >= 85 ? '85%+' : lo + '-' + (lo + 5) + '%') + ' · ' + LADO[pk.lado];
}
/* mismo equipo aunque se escriba distinto («Nets» ≈ «Brooklyn Nets», «Manchester City FC» ≈ «Manchester City») */
const PARAR = { fc: 1, cf: 1, afc: 1, sc: 1, de: 1, del: 1, la: 1, el: 1, the: 1, club: 1, ac: 1, as: 1, ud: 1, cd: 1 };
function tokens(n) {
  let t = String(n == null ? '' : n).toLowerCase();
  try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { }
  return t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !PARAR[w]);
}
function mismo(a, b) {
  const ta = tokens(a), tb = tokens(b); if (!ta.length || !tb.length) return false;
  const c = ta.length <= tb.length ? ta : tb, l = ta.length <= tb.length ? tb : ta;
  return c.every(w => l.indexOf(w) >= 0);
}
function consenso(ps) {
  const v = ps.filter(Boolean); if (v.length < 2) return null;
  const con = v[0][2] > 0;
  if (!con) return deLocal(sig(v.reduce((s, p) => s + logit(p[0]), 0) / v.length));
  const m = [0, 1, 2].map(i => v.reduce((s, p) => s + p[i], 0) / v.length);
  return arr(m[0], m[1], m[2]);
}

/* ---------- partidos de ESPN (equipos y tenis) ---------- */
function partidosDe(j, dep, ruta) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const comps = [];
    (e.competitions || []).forEach(c => comps.push({ c: c, tour: null }));
    (e.groupings || []).forEach(g => {
      const slug = (g.grouping && g.grouping.slug) || '';
      const tour = slug === 'mens-singles' ? 'a' : (slug === 'womens-singles' ? 'w' : null);
      if (tour) (g.competitions || []).forEach(c => comps.push({ c: c, tour: tour, ev: e }));
    });
    comps.forEach(({ c, tour }) => {
      const cs = c.competitors || []; if (cs.length !== 2) return;
      const st = (c.status && c.status.type) || (e.status && e.status.type) || {};
      const ts = Date.parse(c.date || c.startDate || e.date); if (!isFinite(ts)) return;
      let h, a;
      if (dep === 'tenis') { const o = cs.slice().sort((x, y) => (x.order || 0) - (y.order || 0)); h = o[0]; a = o[1]; }
      else { h = cs.find(x => x.homeAway === 'home'); a = cs.find(x => x.homeAway === 'away'); }
      if (!h || !a) return;
      const nom = x => (x.team && x.team.displayName) || (x.athlete && (x.athlete.displayName || x.athlete.fullName)) || '';
      const sc = x => { const v = x.score && typeof x.score === 'object' ? x.score.value : x.score; const n = parseFloat(v); return isFinite(n) ? n : null; };
      if (/^(tbd|tba|bye|qualifier|por definir)?$/i.test(nom(h).trim()) || /^(tbd|tba|bye|qualifier|por definir)?$/i.test(nom(a).trim())) return;
      out.push({
        ext: String(dep === 'tenis' ? c.id : e.id), ruta: ruta, ts: ts, estado: st.state || '', fin: st.completed === true,
        anulado: /POSTPONED|CANCELED|CANCELLED|ABANDONED|SUSPENDED|FORFEIT|WALKOVER|RETIRED/i.test(st.name || ''),
        local: nom(h), visita: nom(a), hAb: (h.team && h.team.abbreviation) || '', aAb: (a.team && a.team.abbreviation) || '', hId: String((h.team && h.team.id) || h.id || ''), aId: String((a.team && a.team.id) || a.id || ''),
        hRk: (h.curatedRank && h.curatedRank.current) || 0, aRk: (a.curatedRank && a.curatedRank.current) || 0,
        hs: sc(h), as: sc(a), hGano: h.winner === true, aGano: a.winner === true, tour: tour,
        neutral: c.neutralSite === true, evNombre: e.name || '', mj: !!e.major, ronda: (c.round && c.round.displayName) || '',
        mercado: dep === 'tenis' ? null : (function () { const k = AR.lineaEspn(c); return k ? arr(k.L, k.A, k.D) : null; })(),
      });
    });
  });
  return out;
}
/* resultado: 'L', 'A', 'D' (empate, solo fútbol), 'X' (no cuenta) o null (todavía no) */
function resultadoDe(p, dep) {
  if (!p) return null;
  if (p.anulado) return 'X';
  if (!p.fin) return null;
  if (dep === 'tenis') return p.hGano && !p.aGano ? 'L' : (p.aGano && !p.hGano ? 'A' : 'X');
  if (p.hs == null || p.as == null) return null;
  if (p.hs > p.as) return 'L';
  if (p.as > p.hs) return 'A';
  return dep === 'futbol' ? 'D' : 'X';
}

/* ---------- modelos propios ---------- */
const unpack = r => ({ id: String(r[0]), ts: r[1], h: String(r[2]), a: String(r[3]), hs: r[4], as: r[5], ty: r[6], so: !!(r[7] & 1), ot: !!(r[7] & 2), neutral: !!(r[7] & 4), indoor: !!(r[7] & 8), sh: r[9] == null ? null : r[9], sa: r[10] == null ? null : r[10] });
function modelosUS(dep) {
  try {
    const M = require('../modelo-' + dep + '.js');
    const hist = JSON.parse(fs.readFileSync(path.join(RAIZ, 'hist-' + dep + '.json'), 'utf8'));
    const juegos = hist.g.map(unpack).filter(g => g.hs != null && g.as != null).sort((a, b) => a.ts - b.ts);
    const P = Object.assign({}, M.PDEF), S = M.correr(juegos, P);
    const ult = {}; juegos.forEach(g => { const k = M.dayKey(g.ts); ult[g.h] = k; ult[g.a] = k; });
    let S0 = null, P0 = null;
    if (dep === 'nhl') { P0 = Object.assign({}, M.PDEF, { Ws: 0 }); S0 = M.correr(juegos, P0); }
    return function (p) {
      if (!p.hId || !p.aId || !(S.m && (p.hId in S.m) && (p.aId in S.m))) return null;
      const g = { h: p.hId, a: p.aId, ts: p.ts, neutral: p.neutral, adjH: 0, adjA: 0 }, dk = M.dayKey(p.ts), o = {};
      if (dep === 'nhl') {
        o.modelo = M.predecir(S, P, g, { dH: ult[p.hId], dA: ult[p.aId] }).pH;
        o['modelo-goles'] = M.predecir(S0, P0, g, { dH: ult[p.hId], dA: ult[p.aId] }).pH;
      } else {
        const gH = ult[p.hId] === undefined ? undefined : dk - ult[p.hId], gA = ult[p.aId] === undefined ? undefined : dk - ult[p.aId];
        o['modelo-solo'] = M.predecir(S, P, g, { gH: gH, gA: gA }).pH;
      }
      return o;
    };
  } catch (e) { console.log(dep + ': modelo no disponible · ' + e.message); return null; }
}
function modeloTenis() {
  try {
    const T = require('../modelo-tenis.js'), R = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ratings-tenis.json'), 'utf8'));
    function jugador(id, nombre, rk, tour) {
      const r = R.jug && R.jug[id], P = R.params && R.params[tour];
      if (r) return { id, nombre: r[0] || nombre, all: r[3], sup: { H: r[4], C: r[5], G: r[6] }, n: r[7], nS: { H: r[8], C: r[9], G: r[10] }, rk: rk || r[11], forma: r[13] || '', pico: r[14] || r[3], conocido: true };
      const e = (P && P.prior && P.prior.usar !== false) ? T.prior(rk, P.prior) : (rk ? T.prior(rk) : 1500);
      return { id, nombre, all: e, sup: { H: e, C: e, G: e }, n: 0, nS: { H: 0, C: 0, G: 0 }, rk: rk || 0, forma: '', conocido: false };
    }
    return function (p) {
      const P = (R.params && R.params[p.tour]) || { w: 0.25 }, sup = T.superficie(p.evNombre, p.ts);
      const A = jugador(p.hId, p.local, p.hRk, p.tour), B = jugador(p.aId, p.visita, p.aRk, p.tour);
      let pm = T.ajustar(T.probElo(T.rating(A, sup, P.w), T.rating(B, sup, P.w)), T.rasgos(A, B), P.aj);
      if (p.mj && p.tour === 'a' && P.bo5 === true && !/qualif/i.test(p.ronda || '')) { const d = T.ventaja(pm, 0.63, 0.63); pm = T.pMatchRapido(0.63 + d, 0.63 - d, 5); }
      return { modelo: pm };
    };
  } catch (e) { console.log('tenis: modelo no disponible · ' + e.message); return null; }
}

/* ---------- archivo propio de resultados (NBA y las 5 ligas) ---------- */
const ARCHIVO = {
  'basketball/nba': ahora => { const d = new Date(ahora - 10 * H), y = d.getUTCFullYear(), s = d.getUTCMonth() >= 7 ? y : y - 1; return Date.UTC(s - 2, 9, 1); },
};
['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'].forEach(l => {
  ARCHIVO['soccer/' + l] = ahora => { const d = new Date(ahora); return Date.UTC(d.getUTCFullYear() - (d.getUTCMonth() < 6 ? 1 : 0) - 2, 7, 1); };   // 1 de agosto, 2 temporadas atrás (futbol.html)
});
function mesesDesde(ini, ahora) {
  const out = []; let d = new Date(ini);
  while (d.getTime() <= ahora) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth(), a = Date.UTC(y, m, 1), b = Date.UTC(y, m + 1, 0);
    out.push({ k: y + pad2(m + 1), a: ymdUTC(Math.max(a, ini)), b: ymdUTC(Math.min(b, ahora + D)), fin: b + D });
    d = new Date(Date.UTC(y, m + 1, 1));
  }
  return out;
}
/* juegos TERMINADOS de un scoreboard: [id, ts, idLocal, idVisita, nombreLocal, nombreVisita, gl, gv]; sin pretemporada ni All-Star */
function finalesDe(j) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors) return;
    const h = c.competitors.find(x => x.homeAway === 'home'), a = c.competitors.find(x => x.homeAway === 'away');
    if (!h || !a || !h.team || !a.team) return;
    const st = (e.status && e.status.type) || (c.status && c.status.type) || {};
    const ty = parseInt(e.season && e.season.type, 10) || 2;
    if (ty === 1 || /all.?star|rising stars|celebrity/i.test((e.name || '') + (e.shortName || ''))) return;
    const sc = x => { const v = x.score && typeof x.score === 'object' ? x.score.value : x.score; const n = parseFloat(v); return isFinite(n) ? n : null; };
    const hs = sc(h), as = sc(a), ts = Date.parse(e.date);
    if (st.completed !== true || hs === null || as === null || !isFinite(ts)) return;
    out.push([String(e.id), ts, String(h.team.id), String(a.team.id), h.team.displayName || '', a.team.displayName || '', hs, as]);
  });
  return out;
}

/* NBA: el mismo <script id="modelo"> de nba.html (así lo prueba pruebas.js) */
function modeloNBA(filas) {
  try {
    const nb = fs.readFileSync(path.join(RAIZ, 'nba.html'), 'utf8'), i0 = nb.indexOf('<script id="modelo">') + 20, mod = nb.slice(i0, nb.indexOf('</script>', i0)), N = {};
    new Function('N', 'module', mod + ';Object.assign(N,{PDEF,seasonOf,dayKey,correr,predecir});')(N, undefined);
    const games = (filas || []).map(r => ({ id: r[0], ts: r[1], h: r[2], a: r[3], hs: r[6], as: r[7] })).sort((x, y) => x.ts - y.ts);
    if (games.length < 300) { console.log('nba: archivo con pocos juegos todavía (' + games.length + '), el modelo espera'); return null; }
    const P = Object.assign({}, N.PDEF), S = N.correr(games, P), ult = {};
    games.forEach(g => { const k = N.dayKey(g.ts); ult[g.h] = k; ult[g.a] = k; });
    return function (p) {
      if (!(p.hId in S.m) || !(p.aId in S.m)) return null;
      return { 'modelo-solo': N.predecir(S, P, { h: p.hId, a: p.aId, ts: p.ts, neutral: p.neutral }, { dH: ult[p.hId], dA: ult[p.aId] }).pH };
    };
  } catch (e) { console.log('nba: modelo no disponible · ' + e.message); return null; }
}

/* Fútbol: las funciones de futbol.html tal cual (claveEq, distribucion, dcAjustar…), sacadas del archivo y corridas aparte */
function sacar(src, nombre) {
  let i = src.search(new RegExp('\\n(function ' + nombre + '\\(|var ' + nombre + '\\s*=)'));
  if (i < 0) throw new Error('no encuentro ' + nombre + ' en futbol.html');
  i++;
  const llave = src.indexOf('{', i), pc = src.indexOf(';', i);
  if (pc >= 0 && (llave < 0 || pc < llave)) return src.slice(i, pc + 1);
  let n = 0, j = llave;
  for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') n++; else if (ch === '}') { n--; if (n === 0) break; } }
  return src.slice(i, j + 1) + ';';
}
function motorFutbol() {
  const html = fs.readFileSync(path.join(RAIZ, 'futbol.html'), 'utf8');
  const nombres = ['TOKENS_FUERA', 'ALIAS_EQ', 'sinAcentos', 'claveEq', 'mismaClave', 'buscarEnMapa', 'tsPartido', 'MAXG', 'pmf', 'tauDC', 'distribucion', 'DC_CFG', 'ELO_TH', 'dcAjustar', 'eloAjustar'];
  const src = 'function parseFecha(){ return null; }\n' + nombres.map(n => sacar(html, n)).join('\n');
  const ctx = { Math: Math, Object: Object, Array: Array, String: String, Number: Number, isFinite: isFinite, parseFloat: parseFloat, parseInt: parseInt, JSON: JSON };
  require('vm').createContext(ctx); require('vm').runInContext(src + '\n;this.API={claveEq:claveEq,buscarEnMapa:buscarEnMapa,distribucion:distribucion,dcAjustar:dcAjustar,DC_CFG:DC_CFG};', ctx);
  return ctx.API;
}
const COPA_PAIS = { 'soccer/eng.fa': 'eng', 'soccer/ger.dfb_pokal': 'ger', 'soccer/ita.coppa_italia': 'ita', 'soccer/fra.coupe_de_france': 'fra', 'soccer/esp.copa_del_rey': 'esp' };
function modeloFutbol(arch, ahora) {
  try {
    const F = motorFutbol(), fits = {}, hoy = Math.floor(ahora / D) + 1;
    ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'].forEach(l => {
      const A = arch.rutas['soccer/' + l]; if (!A || A.listo === false) return;
      const lista = Object.values(A.g).map(r => ({ local: r[4], visita: r[5], golesLocal: r[6], golesVisita: r[7], ts: r[1] }));
      if (lista.length < 300) return;                                   // el teléfono usa 2 temporadas + la actual
      const fit = F.dcAjustar(lista, hoy, F.DC_CFG); if (fit) fits['soccer/' + l] = Object.assign(fit, { tipo: 'liga' });
    });
    const fc = leerJSON(path.join(RAIZ, 'fuerza-copas.json'));
    if (fc && fc.eq) fits['soccer/uefa.champions'] = Object.assign({}, fc, { tipo: 'copa' });
    const fn = leerJSON(path.join(RAIZ, 'fuerza-nacional.json'));
    if (fn && fn.paises) Object.keys(COPA_PAIS).forEach(r => { const f = fn.paises[COPA_PAIS[r]]; if (f && f.eq) fits[r] = { eq: f.eq, c: f.c, gam: f.gam, tipo: 'copa' }; });
    console.log('futbol: modelo listo en ' + Object.keys(fits).map(k => k.replace('soccer/', '')).join(', '));
    const fn1 = function (p) {
      const f = fits[p.ruta]; if (!f) return null;
      const xl0 = F.buscarEnMapa(f.eq, p.local), xv0 = F.buscarEnMapa(f.eq, p.visita);
      if (f.tipo === 'copa' && (!xl0 || !xv0)) return null;              // como la app: sin los dos equipos no hay modelo de copa
      const pr = F.DC_CFG.promo ? { att: 0.85, def: 1.15 } : { att: 1, def: 1 }, xl = xl0 || pr, xv = xv0 || pr;
      const d = F.distribucion(f.c * xl.att * xv.def * f.gam, f.c * xv.att * xl.def, F.DC_CFG.rho, false);
      return { modelo: [d.pL, d.pV, d.pD] };
    };
    fn1.tiene = r => !!fits[r];
    return fn1;
  } catch (e) { console.log('futbol: modelo no disponible · ' + e.message); return null; }
}
function leerJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }

/* ---------- modelos públicos de afuera (gratis, sin clave) ---------- */
function csv(txt) {
  const ls = String(txt || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (ls.length < 2) return [];
  const H = ls[0].split(',').map(x => x.trim());
  return ls.slice(1).map(l => { const c = l.split(','), o = {}; H.forEach((h, i) => { o[h] = (c[i] || '').trim(); }); return o; });
}
/* nfelo usa abreviaturas viejas en algunos equipos */
const NFELO_ESPN = { OAK: 'LV', LA: 'LAR', STL: 'LAR', SD: 'LAC', WAS: 'WSH' };
function nfeloMapa(txt) {
  const m = {};
  csv(txt).forEach(r => {
    const h = NFELO_ESPN[r.home_team] || r.home_team, a = NFELO_ESPN[r.away_team] || r.away_team, p = parseFloat(r.nfelo_projected_home_win_probability);
    if (h && a && valido(p)) m[h + '|' + a] = p;
  });
  return m;
}
/* ClubElo: cada fila trae la probabilidad de cada diferencia de goles (GD<-5 … GD>5) */
function clubeloLista(txt) {
  const out = [];
  csv(txt).forEach(r => {
    let pH = 0, pD = 0, pA = 0, hay = false;
    Object.keys(r).forEach(k => {
      const m = /^GD\s*([<>=])\s*(-?\d+)$/.exec(k); if (!m) return;
      const v = parseFloat(r[k]); if (!isFinite(v)) return;
      const n = +m[2], gd = m[1] === '<' ? n - 1 : (m[1] === '>' ? n + 1 : n);
      hay = true; if (gd > 0) pH += v; else if (gd < 0) pA += v; else pD += v;
    });
    if (hay && r.Home && r.Away) out.push({ fecha: r.Date, pais: r.Country, local: r.Home, visita: r.Away, p: arr(pH, pA, pD) });
  });
  return out.filter(x => x.p);
}
/* Tennis Abstract: la tabla del informe; las columnas se buscan por nombre (la ATP y la WTA las ordenan distinto) */
function taElo(html) {
  const filas = String(html || '').split(/<tr[\s>]/i).slice(1).map(tr => tr.split(/<t[dh][^>]*>/i).slice(1).map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()));
  const i0 = filas.findIndex(f => f.indexOf('Player') >= 0 && f.indexOf('hElo') >= 0); if (i0 < 0) return {};
  const H = filas[i0], ix = n => H.indexOf(n), iP = ix('Player'), iE = ix('Elo'), iH = ix('hElo'), iC = ix('cElo'), iG = ix('gElo'), m = {};
  filas.slice(i0 + 1).forEach(f => {
    const nom = f[iP]; if (!nom) return;
    const e = { E: parseFloat(f[iE]), H: parseFloat(f[iH]), C: parseFloat(f[iC]), G: parseFloat(f[iG]) };
    if (isFinite(e.E)) m[tokens(nom).join(' ')] = e;
  });
  return m;
}
function taBuscar(m, nombre) {
  if (!m) return null;
  const t = tokens(nombre), k = t.join(' ');
  if (m[k]) return m[k];
  const ap = t[t.length - 1], ini = t[0] ? t[0][0] : '';             // «J. Sinner» o nombres con dos apellidos
  const cand = Object.keys(m).filter(x => { const y = x.split(' '); return y[y.length - 1] === ap && (!ini || y[0][0] === ini); });
  return cand.length === 1 ? m[cand[0]] : null;
}
function probTA(m, p, sup) {
  const A = taBuscar(m, p.local), B = taBuscar(m, p.visita); if (!A || !B) return null;
  const ea = isFinite(A[sup]) ? A[sup] : A.E, eb = isFinite(B[sup]) ? B[sup] : B.E;
  return 1 / (1 + Math.pow(10, (eb - ea) / 400));
}
/* emparejar nombres de ClubElo («Man City», «Forest», «Paris SG») con los de ESPN */
const CE_ALIAS = { parissg: 'parissaintgermain', bilbao: 'athleticclub', koeln: 'koln', sporting: 'sportingcp', psv: 'psveindhoven' };
let MOTOR_F = null;
function mismoClub(a, b) {
  try { MOTOR_F = MOTOR_F || motorFutbol(); } catch (e) { return mismo(a, b); }
  let x = MOTOR_F.claveEq(a), y = MOTOR_F.claveEq(b); x = CE_ALIAS[x] || x; y = CE_ALIAS[y] || y;
  if (!x || !y) return false; if (x === y) return true;
  const c = x.length <= y.length ? x : y, l = x.length <= y.length ? y : x;
  return c.length >= 5 && (l.indexOf(c) === 0 || l.slice(-c.length) === c);
}
function clubeloPara(lista, p) {
  if (!lista) return null;
  for (const g of lista) {
    const t = Date.parse(g.fecha + 'T12:00:00Z'); if (!isFinite(t) || Math.abs(t - p.ts) > 1.5 * D) continue;
    if (mismoClub(g.local, p.local) && mismoClub(g.visita, p.visita)) return g.p;
    if (mismoClub(g.local, p.visita) && mismoClub(g.visita, p.local)) return [g.p[1], g.p[0], g.p[2]];
  }
  return null;
}

/* ---------- competidores de un juego ---------- */
function prediccionPolymarket(lista, p) {
  if (!Array.isArray(lista)) return null;
  for (const g of lista) {
    if (!g || g.live || g.ended) continue;
    const t = Date.parse(g.ini); if (isFinite(t) && Math.abs(t - p.ts) > 5 * H) continue;
    const dir = mismo(g.h, p.local) && mismo(g.a, p.visita), inv = !dir && mismo(g.h, p.visita) && mismo(g.a, p.local);
    if (!dir && !inv) continue;
    const ph = +g.ph, pa = +g.pa, pd = g.pd != null ? +g.pd : null;
    return dir ? arr(ph, pa, pd) : arr(pa, ph, pd);
  }
  return null;
}
function competidores(dep, p, extra) {
  const o = {}, m = extra.modelo ? extra.modelo(p) : null;
  if (p.mercado && (dep !== 'futbol' || p.mercado[2] > 0)) o.mercado = p.mercado;
  if (extra.espn != null) o.espn = deLocal(extra.espn);
  const pol = prediccionPolymarket(extra.pred, p); if (pol && (dep !== 'futbol' || pol[2] > 0)) o.polymarket = pol;
  if (m) {
    if (dep === 'nhl') { o.modelo = deLocal(m.modelo); o['modelo-goles'] = deLocal(m['modelo-goles']); }
    if (dep === 'nfl') {
      o['modelo-solo'] = deLocal(m['modelo-solo']);
      o.modelo = extra.espn != null ? deLocal(sig((1 - W_FPI) * logit(m['modelo-solo']) + W_FPI * logit(extra.espn))) : o['modelo-solo'];
    }
    if (dep === 'nba') {
      o['modelo-solo'] = deLocal(m['modelo-solo']);
      o.modelo = extra.espn != null ? deLocal(sig((1 - W_BPI) * logit(m['modelo-solo']) + W_BPI * logit(extra.espn))) : o['modelo-solo'];
    }
    if (dep === 'futbol' && m.modelo) o.modelo = arr(m.modelo[0], m.modelo[1], m.modelo[2]);
    if (dep === 'tenis') o.modelo = deLocal(m.modelo);
  }
  if ((dep === 'nba' || dep === 'nhl' || dep === 'nfl') && o.modelo) {
    const mk = o.mercado || o.polymarket;
    o.ova = mk ? deLocal(sig(logit(mk[0]) + LAM_M * (logit(o.modelo[0]) - logit(mk[0])))) : o.modelo;
  }
  if (dep === 'nfl' && extra.nfelo) { const v = extra.nfelo[p.hAb + '|' + p.aAb]; if (valido(v)) o.nfelo = deLocal(v); }
  if (dep === 'futbol' && extra.clubelo) { const v = clubeloPara(extra.clubelo, p); if (v) o.clubelo = v; }
  if (dep === 'tenis' && extra.ta) { const v = probTA(extra.ta[p.tour === 'w' ? 'w' : 'a'], p, extra.sup ? extra.sup(p) : 'H'); if (valido(v)) o.tennisabstract = deLocal(v); }
  const c = consenso([o.mercado, o.espn, o.polymarket, o.modelo]); if (c) o.consenso = c;
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  return o;
}

/* ---------- registrar y calificar (puras: se prueban sin internet) ---------- */
function registrar(reg, dep, partidos, extraDe, ahora) {
  let n = 0;
  partidos.forEach(p => {
    if (!(p.ts > ahora) || p.ts > ahora + DEPS[dep].horiz || (p.estado && p.estado !== 'pre')) return;   // SOLO antes de empezar
    const id = dep + '|' + p.ext;
    let it = reg.items[id];
    if (it && it.res) return;
    const comp = competidores(dep, p, extraDe(p));
    if (!Object.keys(comp).length) return;
    if (!it) it = reg.items[id] = { id: id, dep: dep, ruta: p.ruta, ext: p.ext, ts: p.ts, local: p.local, visita: p.visita, p: {}, t: {} };
    it.ts = p.ts; it.local = p.local; it.visita = p.visita;
    Object.keys(comp).forEach(k => { it.p[k] = comp[k]; it.t[k] = ahora; });
    n++;
  });
  return n;
}
function pendientes(reg, ahora) {
  return Object.values(reg.items).filter(it => !it.res && it.ts < ahora - REGLAS.HORAS_RES * H);
}
function calificar(reg, porRuta, ahora) {
  let n = 0;
  pendientes(reg, ahora).forEach(it => {
    const lista = porRuta[it.ruta]; if (!lista) return;
    const p = lista.find(x => x.ext === it.ext);
    let r = resultadoDe(p, it.dep);
    if (r === null && ahora - it.ts > REGLAS.DIAS_MAX * D) r = 'X';
    if (r === null) return;
    it.res = r; it.tr = ahora; if (p && p.hs != null) { it.gl = p.hs; it.gv = p.as; }
    n++;
  });
  return n;
}

/* ---------- tabla, ascensos y mapa ---------- */
function resumen(reg, estado, ahora) {
  const out = {}, items = Object.values(reg.items);
  Object.keys(DEPS).forEach(dep => {
    const its = items.filter(i => i.dep === dep);
    if (!its.length) return;
    const yaCambio = (estado.cambios || []).some(c => c.dep === dep);
    const tit = (yaCambio && estado.titular && estado.titular[dep]) || DEPS[dep].titular0;   // hasta el primer ascenso manda el de arranque
    const mods = {};
    its.forEach(it => Object.keys(it.p).forEach(k => {
      const M = mods[k] || (mods[k] = { nombre: NOMBRES[k] || k, jugados: 0, aciertos: 0, brier: 0, pend: 0 });
      if (!it.res) { M.pend++; return; }
      if (it.res === 'X') return;
      const p = it.p[k], pk = pickDe(p), real = [0, 0, 0]; real['LAD'.indexOf(it.res)] = 1;
      M.jugados++; if (pk.lado === it.res) M.aciertos++;
      M.brier += (p[0] - real[0]) ** 2 + (p[1] - real[1]) ** 2 + (p[2] - real[2]) ** 2;
    }));
    Object.values(mods).forEach(M => { M.pct = M.jugados ? +(100 * M.aciertos / M.jugados).toFixed(1) : null; M.brier = M.jugados ? +(M.brier / M.jugados).toFixed(4) : null; });
    out[dep] = { nombre: DEPS[dep].nombre, titular: mods[tit] ? tit : (mods[DEPS[dep].titular0] ? DEPS[dep].titular0 : Object.keys(mods)[0]), modelos: mods };
  });
  return out;
}
function duelos(reg, dep, tit) {
  const d = {};
  Object.values(reg.items).forEach(it => {
    if (it.dep !== dep || !it.res || it.res === 'X' || !it.p[tit]) return;
    const pt = pickDe(it.p[tit]).lado;
    Object.keys(it.p).forEach(k => {
      if (k === tit) return;
      const ps = pickDe(it.p[k]).lado; if (ps === pt) return;
      const x = d[k] || (d[k] = { gana: 0, pierde: 0 });
      if (ps === it.res) x.gana++; else if (pt === it.res) x.pierde++;
    });
  });
  Object.keys(d).forEach(k => { const x = d[k], n = x.gana + x.pierde; x.n = n; x.z = n ? +((x.gana - n / 2) / Math.sqrt(n / 4)).toFixed(2) : 0; });
  return d;
}
function ascensos(reg, tabla, estado, ahora) {
  const hechos = [];
  estado.titular = estado.titular || {}; estado.cambios = estado.cambios || [];
  Object.keys(tabla).forEach(dep => {
    const tit = tabla[dep].titular, du = duelos(reg, dep, tit);
    let mejor = null;
    Object.keys(du).forEach(k => { const x = du[k]; if (x.n >= REGLAS.ASCENSO_MIN && x.z >= REGLAS.ASCENSO_Z && (!mejor || x.z > du[mejor].z)) mejor = k; });
    if (mejor) {
      const x = du[mejor];
      estado.cambios.unshift({ fecha: new Date(ahora).toISOString(), dep: dep, sale: tit, entra: mejor,
        detalle: 'Cuando escogieron distinto, ' + (NOMBRES[mejor] || mejor) + ' acertó ' + x.gana + ' y ' + (NOMBRES[tit] || tit) + ' ' + x.pierde + ' (z ' + x.z + ')' });
      estado.cambios = estado.cambios.slice(0, 50);
      tabla[dep].titular = mejor; hechos.push(estado.cambios[0]);
    }
    estado.titular[dep] = tabla[dep].titular;
    tabla[dep].duelos = duelos(reg, dep, tabla[dep].titular);
  });
  return hechos;
}
function mapa(reg, tabla) {
  Object.keys(tabla).forEach(dep => {
    const tit = tabla[dep].titular, z = {};
    Object.values(reg.items).forEach(it => {
      if (it.dep !== dep || !it.res || it.res === 'X' || !it.p[tit]) return;
      const pk = pickDe(it.p[tit]), k = zonaDe(pk), c = z[k] || (z[k] = { juegos: 0, aciertos: 0, dice: 0 });
      c.juegos++; if (pk.lado === it.res) c.aciertos++; c.dice += pk.p;
    });
    Object.values(z).forEach(c => { c.pct = +(100 * c.aciertos / c.juegos).toFixed(1); c.dice = +(100 * c.dice / c.juegos).toFixed(1); c.suficiente = c.juegos >= REGLAS.CONF_MIN; });
    tabla[dep].confianza = z;
  });
}
function proximos(reg, tabla, ahora) {
  return Object.values(reg.items).filter(it => !it.res && it.ts > ahora && it.ts < ahora + 7 * D && tabla[it.dep]).sort((a, b) => a.ts - b.ts).map(it => {
    const T = tabla[it.dep], tit = it.p[T.titular] ? T.titular : (it.p.consenso ? 'consenso' : Object.keys(it.p)[0]);
    const pk = pickDe(it.p[tit]), zona = zonaDe(pk), c = tit === T.titular ? ((T.confianza || {})[zona] || null) : null;
    const ps = {}; Object.keys(it.p).forEach(k => { ps[k] = it.p[k]; });
    return { dep: it.dep, ext: it.ext, ts: it.ts, local: it.local, visita: it.visita, tit: tit, pick: pk.lado, p: r3(pk.p), zona: zona,
      zn: c ? c.juegos : 0, zw: c ? c.aciertos : 0, ps: ps };
  });
}

module.exports = { DEPS, REGLAS, NOMBRES, arr, pickDe, zonaDe, mismo, consenso, partidosDe, resultadoDe, competidores, registrar, calificar,
  pendientes, resumen, duelos, ascensos, mapa, proximos, prediccionPolymarket, modelosUS, modeloTenis, ymdUTC,
  ARCHIVO, mesesDesde, finalesDe, modeloNBA, motorFutbol, modeloFutbol, nfeloMapa, clubeloLista, clubeloPara, taElo, taBuscar, probTA, mismoClub };
if (require.main !== module) return;

/* ---------- corrida ---------- */
const dir = process.argv[2] || 'salida-liga', dirPred = process.argv[3] || null;
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
fs.mkdirSync(dir, { recursive: true });
async function getJSON(u) {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'ova-liga/1.0' } }); if (r.ok) return await r.json(); if (r.status === 404) return null; }
    catch (e) { }
    await new Promise(res => setTimeout(res, 800));
  }
  return null;
}
async function predictorESPN(core, ext) {
  const j = await getJSON(CORE + core + '/events/' + ext + '/competitions/' + ext + '/predictor?lang=en&region=us');
  const gp = t => { const st = t && t.statistics; if (!st) return null; for (const s of st) if (s && s.name === 'gameProjection' && isFinite(s.value)) return +s.value / 100; return null; };
  if (!j) return null;
  const h = gp(j.homeTeam), a = gp(j.awayTeam), p = h !== null ? h : (a !== null ? 1 - a : null);
  return valido(p) ? p : null;
}
(async () => {
  const ahora = Date.now();
  const reg = leer(path.join(dir, 'liga-registro.json'), { v: 1, items: {} });
  const previo = leer(path.join(dir, 'liga.json'), {});
  const estado = { titular: previo.titular || {}, cambios: previo.cambios || [] };
  const log = [];
  const porRuta = {}, pedidas = {};
  async function traer(ruta, dia) {
    const u = ESPN + ruta + '/scoreboard?limit=500' + (dia ? '&dates=' + dia : '');
    if (pedidas[u]) return; pedidas[u] = 1;
    const j = await getJSON(u); if (!j) return;
    const dep = Object.keys(DEPS).find(d => DEPS[d].rutas.indexOf(ruta) >= 0);
    const ps = partidosDe(j, dep, ruta), cur = porRuta[ruta] || (porRuta[ruta] = []);
    ps.forEach(p => { const i = cur.findIndex(x => x.ext === p.ext); if (i >= 0) cur[i] = p; else cur.push(p); });
  }
  // 1) lo que viene (hoy, mañana) y lo pendiente de calificar
  const dias = [ymdUTC(ahora - 10 * H), ymdUTC(ahora), ymdUTC(ahora + D)];
  for (const dep of Object.keys(DEPS)) {
    for (const ruta of DEPS[dep].rutas) {
      const ds = new Set(dias);
      pendientes(reg, ahora).filter(it => it.ruta === ruta).forEach(it => { ds.add(ymdUTC(it.ts - 10 * H)); ds.add(ymdUTC(it.ts)); });
      if (DEPS[dep].sinFecha) await traer(ruta, null);
      await Promise.all([...ds].slice(0, 12).map(d => traer(ruta, d)));
    }
  }
  // 2) archivo propio de resultados (NBA y 5 ligas): por meses, con tope de pedidos por vuelta; lo que falte sigue en la próxima
  const arch = leer(path.join(dir, 'liga-hist.json'), { v: 1, rutas: {} });
  let pedidos = 0; const TOPE_PED = 1600;
  for (const ruta of Object.keys(ARCHIVO)) {
    const A = arch.rutas[ruta] || (arch.rutas[ruta] = { meses: {}, g: {} });
    for (const m of mesesDesde(ARCHIVO[ruta](ahora), ahora)) {
      if (A.meses[m.k] || pedidos >= TOPE_PED) continue;
      pedidos++;
      const j = await getJSON(ESPN + ruta + '/scoreboard?dates=' + m.a + '-' + m.b + '&limit=1000');
      let filas = j ? finalesDe(j) : null;
      const ini = Date.parse(m.a.slice(0, 4) + '-' + m.a.slice(4, 6) + '-' + m.a.slice(6) + 'T00:00:00Z');
      const respeta = filas && (filas.length === 0 ? ((j.events || []).length === 0) : filas.every(r => r[1] >= ini - 2 * D && r[1] <= m.fin + 2 * D));
      if (!respeta) {                                    // ESPN no respetó el rango: día por día
        filas = []; let ok = true; const dias = [];
        for (let t = ini; t < m.fin && t <= ahora + D; t += D) dias.push(t);
        if (pedidos + dias.length > TOPE_PED) { ok = false; dias.length = Math.max(0, TOPE_PED - pedidos); }
        for (let i = 0; i < dias.length; i += 12) {     // de 12 en 12 para no tardar
          const js = await Promise.all(dias.slice(i, i + 12).map(t => getJSON(ESPN + ruta + '/scoreboard?dates=' + ymdUTC(t) + '&limit=300')));
          pedidos += js.length;
          js.forEach(jd => { if (!jd) ok = false; else filas = filas.concat(finalesDe(jd)); });
        }
        if (!ok) { filas.forEach(r => { A.g[r[0]] = r; }); continue; }
      }
      filas.forEach(r => { A.g[r[0]] = r; });
      if (m.fin < ahora - 3 * D) A.meses[m.k] = 1;      // mes cerrado: no se vuelve a pedir
      else (A.vistoHoy || (A.vistoHoy = {}))[m.k] = Math.floor(ahora / D);
    }
    Object.keys(A.g).forEach(k => { if (ahora - A.g[k][1] > 1200 * D) delete A.g[k]; });
    // listo = todos los meses cerrados están y el mes en curso se bajó en esta vuelta; si no, el modelo de ese archivo no se usa
    const ms = mesesDesde(ARCHIVO[ruta](ahora), ahora);
    A.listo = ms.every(m => A.meses[m.k] || m.fin >= ahora - 3 * D) && ms.filter(m => m.fin >= ahora - 3 * D).every(m => A.vistoHoy && A.vistoHoy[m.k] === Math.floor(ahora / D));
  }
  log.push('archivo: ' + Object.keys(arch.rutas).map(r => r.split('/')[1] + ' ' + Object.keys(arch.rutas[r].g).length).join(' · ') + ' · pedidos ' + pedidos);
  // 3) modelos propios y datos extra
  const mod = { nhl: modelosUS('nhl'), nfl: modelosUS('nfl'), tenis: modeloTenis(),
    nba: (arch.rutas['basketball/nba'] || {}).listo ? modeloNBA(Object.values(arch.rutas['basketball/nba'].g)) : null, futbol: modeloFutbol(arch, ahora) };
  if (!mod.nba) log.push('nba: el archivo todavía se está armando: el modelo propio entra cuando esté completo');
  // un modelo que esta vuelta no está (archivo a medias, error) no deja números viejos en juegos que no han empezado
  Object.values(reg.items).forEach(it => {
    if (it.res || !(it.ts > ahora)) return;
    const sinMod = !mod[it.dep] || (it.dep === 'futbol' && !mod.futbol.tiene(it.ruta));
    if (sinMod) ['modelo', 'modelo-solo', 'modelo-goles', 'ova'].forEach(k => { delete it.p[k]; delete it.t[k]; });
  });
  // modelos públicos de afuera
  async function getTexto(u) {
    for (let i = 0; i < 2; i++) {
      try { const r = await fetch(u, { headers: { 'user-agent': 'ova-liga/1.0' } }); if (r.ok) return await r.text(); } catch (e) { }
      await new Promise(res => setTimeout(res, 800));
    }
    return null;
  }
  const [txNf, txCe, txTa, txTw] = await Promise.all([
    getTexto('https://raw.githubusercontent.com/greerreNFL/nfelo/main/output_data/prediction_tracker.csv'),
    getTexto('http://api.clubelo.com/Fixtures').then(t => t && /GD/.test(t) ? t : getTexto('https://api.clubelo.com/Fixtures').then(u => u || t)),
    getTexto('https://tennisabstract.com/reports/atp_elo_ratings.html'),
    getTexto('https://tennisabstract.com/reports/wta_elo_ratings.html')]);
  const ext = { nfelo: txNf ? nfeloMapa(txNf) : null, clubelo: txCe ? clubeloLista(txCe) : null, ta: { a: txTa ? taElo(txTa) : null, w: txTw ? taElo(txTw) : null } };
  if (!ext.clubelo || !ext.clubelo.length) log.push('ClubElo respondió: ' + (txCe == null ? 'nada' : JSON.stringify(String(txCe).slice(0, 300))));
  let supT = null; try { const T = require('../modelo-tenis.js'); supT = p => T.superficie(p.evNombre, p.ts); } catch (e) { }
  log.push('afuera: nfelo ' + (ext.nfelo ? Object.keys(ext.nfelo).length + ' juegos' : 'NO') + ' · ClubElo ' + (ext.clubelo ? ext.clubelo.length + ' partidos' : 'NO') +
    ' · Tennis Abstract ' + (ext.ta.a ? Object.keys(ext.ta.a).length : 'NO') + '/' + (ext.ta.w ? Object.keys(ext.ta.w).length : 'NO') + ' jugadores');
  const pred = {};
  Object.keys(DEPS).forEach(dep => {
    const k = DEPS[dep].pred; if (!k) return;
    const j = dirPred ? leer(path.join(dirPred, 'pred-' + k + '.json'), null) : null;
    pred[dep] = j && Array.isArray(j.juegos) ? j.juegos : null;
  });
  for (const dep of Object.keys(DEPS)) {
    const ps = [].concat(...DEPS[dep].rutas.map(r => porRuta[r] || []));
    const espn = {};
    if (DEPS[dep].core) {
      const cola = ps.filter(p => p.ts > ahora && p.ts < ahora + DEPS[dep].horiz && p.estado === 'pre').slice(0, 40);
      await Promise.all(cola.map(p => predictorESPN(DEPS[dep].core, p.ext).then(v => { if (v !== null) espn[p.ext] = v; })));
    }
    const n = registrar(reg, dep, ps, p => ({ modelo: mod[dep] || null, espn: espn[p.ext] != null ? espn[p.ext] : null, pred: pred[dep],
      nfelo: ext.nfelo, clubelo: ext.clubelo, ta: ext.ta, sup: supT }), ahora);
    const nExt = ps.filter(p => { const it = reg.items[dep + '|' + p.ext]; return it && (it.p.nfelo || it.p.clubelo || it.p.tennisabstract); }).length;
    if (dep === 'nfl' || dep === 'futbol' || dep === 'tenis') log.push(dep + ': con modelo de afuera ' + nExt);
    log.push(dep + ': ' + ps.length + ' partidos vistos · ' + n + ' guardados/refrescados antes de empezar · ESPN ' + Object.keys(espn).length);
  }
  // 4) calificar, tabla, ascensos, mapa
  const nCal = calificar(reg, porRuta, ahora);
  const tabla = resumen(reg, estado, ahora);
  const hechos = ascensos(reg, tabla, estado, ahora);
  mapa(reg, tabla);
  const salida = { v: 1, generado: new Date(ahora).toISOString(), reglas: REGLAS, nombres: NOMBRES, titular: estado.titular, cambios: estado.cambios,
    deportes: tabla, proximos: proximos(reg, tabla, ahora),
    totales: { guardados: Object.keys(reg.items).length, calificados: Object.values(reg.items).filter(i => i.res && i.res !== 'X').length, anulados: Object.values(reg.items).filter(i => i.res === 'X').length } };
  // el registro no crece sin fin: lo calificado de hace más de 400 días se va (el resumen ya lo contó en su momento)
  Object.keys(reg.items).forEach(k => { const it = reg.items[k]; if (it.res && ahora - it.ts > 400 * D) delete reg.items[k]; });
  fs.writeFileSync(path.join(dir, 'liga-registro.json'), JSON.stringify(reg));
  fs.writeFileSync(path.join(dir, 'liga-hist.json'), JSON.stringify(arch));
  fs.writeFileSync(path.join(dir, 'liga.json'), JSON.stringify(salida));
  log.push('calificados ahora: ' + nCal + ' · ascensos: ' + hechos.length + ' · total guardados: ' + salida.totales.guardados);
  hechos.forEach(h => log.push('ASCENSO ' + h.dep + ': ' + h.detalle));
  fs.writeFileSync(path.join(dir, 'log.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
