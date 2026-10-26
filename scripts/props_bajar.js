'use strict';
/* Descarga para la medición de PROPOSICIONES de juego (gol en el 1er tiempo, ambos anotan, carrera en el 1er inning, F5,
   1er periodo, 1a mitad…) en los 5 deportes. Corre en GitHub Actions (ESPN y football-data no se alcanzan desde el taller).
   Deja un archivo compacto por deporte en ./props-datos/<dep>.json.gz con el marcador POR PERIODO y la línea de cierre.
   Uso: node scripts/props_bajar.js [mlb|nba|nhl|nfl|fut|todos]   (reusa lo que ya esté en ./props-datos)            */
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const L = require('./lib_medir.js');
const D = require('./datos_nhl_nfl.js');

const DIR = process.env.PROPS_DIR || 'props-datos';
fs.mkdirSync(DIR, { recursive: true });
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/';
const CORE = 'https://sports.core.api.espn.com/v2/sports/';
const RUTA = { mlb: 'baseball/mlb', nba: 'basketball/nba', nhl: 'hockey/nhl', nfl: 'football/nfl' };
const LIGA = { mlb: 'baseball/leagues/mlb', nba: 'basketball/leagues/nba', nhl: 'hockey/leagues/nhl', nfl: 'football/leagues/nfl' };
const pad2 = n => (n < 10 ? '0' : '') + n;
const ymd = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
const DIAG = { errores: [] };

function leer(dep) { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, dep + '.json.gz'))).toString()); } catch (e) { return null; } }
function guardar(dep, obj) { fs.writeFileSync(path.join(DIR, dep + '.json.gz'), zlib.gzipSync(JSON.stringify(obj))); }

/* ---------- ESPN: marcador por periodo + línea que venga en el scoreboard ---------- */
function numV(x) { if (x == null) return null; if (typeof x === 'object') x = x.value !== undefined ? x.value : x.displayValue; const n = parseFloat(x); return isFinite(n) ? n : null; }
function oddsScoreboard(c) {
  const o = c.odds && c.odds[0]; if (!o) return null;
  const am = v => L.americano(v);
  let tot = numV(o.overUnder); if (!(tot > 0)) tot = null;
  let sp = numV(o.spread); if (sp !== null && Math.abs(sp) > 45) sp = null;
  let mlH = null, mlA = null;
  const ml = o.moneyline || {};
  const pick = (lado) => { const s = ml[lado] || {}; return am((s.close && s.close.odds) || (s.open && s.open.odds) || s.odds); };
  mlH = pick('home'); mlA = pick('away');
  if (mlH === null && o.homeTeamOdds) mlH = am(o.homeTeamOdds.moneyLine);
  if (mlA === null && o.awayTeamOdds) mlA = am(o.awayTeamOdds.moneyLine);
  const r = { prov: (o.provider && o.provider.name) || '?', tot, sp, ml: null };
  if (mlH !== null && mlA !== null) { const s = L.impAm(mlH) + L.impAm(mlA); if (s >= 1.0 && s <= 1.15) r.ml = [mlH, mlA]; }
  return (r.tot !== null || r.ml || r.sp !== null) ? r : null;
}
function parse(j, dep) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a || !h.team || !a.team) return;
    const st = (e.status && e.status.type) || {};
    if (st.completed !== true) return;
    const ty = parseInt(e.season && e.season.type, 10) || 2;
    if (ty !== 2 && ty !== 3) return;                                       /* solo temporada regular y playoffs */
    const nombre = (e.name || '') + ' ' + ((e.season && e.season.slug) || '');
    if (/all.?star|pro bowl|rising|skills|exhibition/i.test(nombre)) return;
    const ls = x => (x.linescores || []).map(q => numV(q)).map(v => v === null ? null : v);
    const lh = ls(h), la = ls(a);
    if (!lh.length || lh.length !== la.length || lh.some(v => v === null) || la.some(v => v === null)) return;
    const det = String(st.shortDetail || st.detail || '');
    out.push({ id: String(e.id), ts: Date.parse(e.date), ty, h: String(h.team.id), a: String(a.team.id), nh: h.team.displayName || '', na: a.team.displayName || '',
      hs: numV(h.score), as: numV(a.score), lh, la, det, neutral: c.neutralSite === true, ln: oddsScoreboard(c) });
  });
  return out;
}
async function dia(dep, d) {
  try { return parse(await L.pedir(SITE + RUTA[dep] + '/scoreboard?dates=' + ymd(d) + '&limit=300'), dep); }
  catch (e) { DIAG.errores.push(dep + ' ' + ymd(d) + ': ' + e.message); return []; }
}
function dias(ini, fin) { const out = []; for (let d = new Date(ini); d <= fin; d = new Date(d.getTime() + 864e5)) out.push(new Date(d)); return out; }
/* temporadas: año de inicio → ventana de fechas */
function ventana(dep, sk) {
  if (dep === 'mlb') return [new Date(Date.UTC(sk, 2, 15)), new Date(Date.UTC(sk, 10, 8))];
  if (dep === 'nba' || dep === 'nhl') return [new Date(Date.UTC(sk, 9, 1)), new Date(Date.UTC(sk + 1, 5, 30))];
  return null;
}
async function espnTemporada(dep, sk) {
  let js;
  if (dep === 'nfl') {
    const t = []; for (let w = 1; w <= 18; w++) t.push([2, w]); for (let w = 1; w <= 5; w++) t.push([3, w]);
    js = await L.pool(t.map(([ty, w]) => async () => {
      try { return parse(await L.pedir(SITE + RUTA.nfl + '/scoreboard?dates=' + sk + '&seasontype=' + ty + '&week=' + w + '&limit=100'), 'nfl'); }
      catch (e) { DIAG.errores.push('nfl ' + sk + ' ' + ty + '/' + w + ': ' + e.message); return []; }
    }), 6);
  } else {
    const [i, f] = ventana(dep, sk); const fin = new Date(Math.min(f.getTime(), Date.now() - 864e5));
    js = await L.pool(dias(i, fin).map(d => () => dia(dep, d)), 10);
  }
  const m = new Map(); [].concat(...js.filter(Boolean)).forEach(g => m.set(g.id, g));
  return [...m.values()].sort((x, y) => x.ts - y.ts);
}
/* línea de cierre del endpoint core (la que usa la medición de NHL/NFL), solo para los juegos sin total o sin ganador */
async function completarLineas(dep, juegos, cache) {
  const falta = juegos.filter(g => !(g.ln && g.ln.tot !== null && g.ln.ml));
  let pedidos = 0;
  await L.pool(falta.map(g => async () => {
    if (cache && cache.has(g.id)) { const c = cache.get(g.id); if (c) g.ln = { prov: c.prov, tot: c.tot, sp: c.sp, ml: c.ml }; return; }
    try { pedidos++; const c = D.lineaCore(await L.pedir(CORE + LIGA[dep] + '/events/' + g.id + '/competitions/' + g.id + '/odds')); if (c) g.ln = { prov: c.prov, tot: c.tot, sp: c.sp, ml: c.ml }; }
    catch (e) { /* sin línea: el juego cuenta solo para frecuencias */ }
  }), 8, (h, t) => { if (h % 500 === 0) console.log('  líneas ' + dep + ' ' + h + '/' + t); });
  return pedidos;
}
function cacheNhlNfl(dep) {
  const m = new Map();
  try { const c = JSON.parse(fs.readFileSync('datos-' + dep + '.json', 'utf8')); Object.values(c.temps || {}).forEach(t => (t.juegos || []).forEach(g => { if (g.linea !== undefined) m.set(String(g.id), g.linea); })); } catch (e) { }
  return m;
}
async function espn(dep, temporadas) {
  const prev = leer(dep) || { dep, temps: {} };
  const cache = (dep === 'nhl' || dep === 'nfl') ? cacheNhlNfl(dep) : null;
  for (const sk of temporadas) {
    const ya = prev.temps[sk];
    const enCurso = sk >= temporadas[temporadas.length - 1];
    if (ya && ya.completa && !enCurso) { console.log(dep + ' ' + sk + ': ya estaba (' + ya.g.length + ')'); continue; }
    const t0 = Date.now();
    const js = await espnTemporada(dep, sk);
    const ped = await completarLineas(dep, js, cache);
    prev.temps[sk] = { completa: !enCurso, g: js };
    const conL = js.filter(g => g.ln && g.ln.tot !== null).length;
    console.log(dep + ' ' + sk + ': ' + js.length + ' juegos, ' + conL + ' con total (' + ped + ' pedidos al core) en ' + Math.round((Date.now() - t0) / 1000) + ' s');
    guardar(dep, prev);
  }
}

/* ---------- fútbol: football-data.co.uk (medio tiempo, final y Pinnacle de cierre) ---------- */
const LIGAS = { E0: 'Premier League', SP1: 'La Liga', I1: 'Serie A', D1: 'Bundesliga', F1: 'Ligue 1' };
function csv(txt) {
  const lin = txt.replace(/\r/g, '').split('\n').filter(Boolean); if (!lin.length) return [];
  const cab = lin[0].replace(/^﻿/, '').split(',');
  return lin.slice(1).map(l => { const v = l.split(','); const o = {}; cab.forEach((k, i) => o[k] = v[i]); return o; });
}
const n = v => { const x = parseFloat(v); return isFinite(x) && x > 1 ? x : null; };
const g = v => { const x = parseInt(v, 10); return isFinite(x) ? x : null; };
async function futbol() {
  const out = { dep: 'fut', p: [] };
  const temps = ['1920', '2021', '2122', '2223', '2324', '2425', '2526'];
  for (const t of temps) for (const lg of Object.keys(LIGAS)) {
    try {
      const F = L.getFetch(); const r = await F('https://www.football-data.co.uk/mmz4281/' + t + '/' + lg + '.csv', { headers: { 'user-agent': 'Mozilla/5.0 (ova-backtest)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const filas = csv(await r.text()); let k = 0;
      filas.forEach(f => {
        const fh = g(f.FTHG), fa = g(f.FTAG), hh = g(f.HTHG), ha = g(f.HTAG); if ([fh, fa, hh, ha].some(x => x === null) || !f.HomeTeam) return;
        const x12 = [n(f.PSCH) || n(f.PSH), n(f.PSCD) || n(f.PSD), n(f.PSCA) || n(f.PSA)];
        const ou = [n(f['PC>2.5']) || n(f['P>2.5']) || n(f['AvgC>2.5']), n(f['PC<2.5']) || n(f['P<2.5']) || n(f['AvgC<2.5'])];
        const [dd, mm, yy] = String(f.Date || '').split('/'); const y = yy && yy.length === 2 ? 2000 + +yy : +yy;
        out.p.push([lg, t, Date.UTC(y, +mm - 1, +dd), f.HomeTeam, f.AwayTeam, fh, fa, hh, ha, x12.every(Boolean) ? x12 : null, ou.every(Boolean) ? ou : null]);
        k++;
      });
      console.log('fut ' + LIGAS[lg] + ' ' + t + ': ' + k + ' partidos');
    } catch (e) { DIAG.errores.push('fut ' + lg + ' ' + t + ': ' + e.message); }
  }
  guardar('fut', out);
}

(async function main() {
  const q = process.argv[2] || 'todos', t0 = Date.now();
  const hoy = new Date(); const y = hoy.getUTCFullYear(), mes = hoy.getUTCMonth();
  const rango = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  if (q === 'fut' || q === 'todos') await futbol();
  if (q === 'mlb' || q === 'todos') await espn('mlb', rango(2021, y));
  if (q === 'nba' || q === 'todos') await espn('nba', rango(2020, mes >= 9 ? y : y - 1));
  if (q === 'nhl' || q === 'todos') await espn('nhl', rango(2021, mes >= 9 ? y : y - 1));
  if (q === 'nfl' || q === 'todos') await espn('nfl', rango(2019, mes >= 8 ? y : y - 1));
  console.log('Errores: ' + DIAG.errores.length); DIAG.errores.slice(0, 30).forEach(e => console.log('  ' + e));
  console.log('Listo en ' + Math.round((Date.now() - t0) / 60000) + ' min');
})();
