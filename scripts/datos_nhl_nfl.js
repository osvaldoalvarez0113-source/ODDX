'use strict';
/* Descarga y lectura de partidos de la NHL y la NFL desde ESPN (marcadores + lineas de cierre).
   Funciona en GitHub Actions (ESPN no se alcanza desde el taller). Guarda un cache en JSON para no repetir descargas. */
const fs = require('fs');
const L = require('./lib_medir.js');

const ESPN = { nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/', nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/' };
const CORE = { nhl: 'https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/', nfl: 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/' };
const pad2 = n => (n < 10 ? '0' : '') + n;
const ymdU = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
const numE = v => { if (v && typeof v === 'object') v = v.value !== undefined ? v.value : v.displayValue; const n = parseInt(v, 10); return isFinite(n) ? n : null; };

/* ---------- marcadores ---------- */
function parseEventos(j, dep) {
  const out = [];
  ((j && j.events) || []).forEach(function (e) {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a || !h.team || !a.team) return;
    const st = (e.status && e.status.type) || (c.status && c.status.type) || {};
    const ts = Date.parse(e.date); if (!isFinite(ts)) return;
    const hs = numE(h.score), as = numE(a.score), ty = parseInt(e.season && e.season.type, 10) || 2;
    const nombre = (e.name || '') + ' ' + (e.shortName || '') + ' ' + ((e.season && e.season.slug) || '');
    const raro = /all.?star|pro bowl|skills|4 nations|face-?off|exhibition|rising/i.test(nombre);
    const det = String(st.shortDetail || st.detail || '');
    const g = { id: String(e.id), ts, h: String(h.team.id), a: String(a.team.id), hs, as, abH: h.team.abbreviation || '', abA: a.team.abbreviation || '',
      nh: h.team.displayName || '', na: a.team.displayName || '', done: st.completed === true && hs !== null && as !== null, ty,
      skip: raro || ty === 1 || ty === 4 || ty === 5, neutral: c.neutralSite === true, detail: det };
    if (dep === 'nhl') { g.so = /\bSO\b/.test(det); g.ot = /OT/.test(det) && !g.so; }
    if (dep === 'nfl') {
      g.wk = e.week && e.week.number != null ? +e.week.number : null;
      g.indoor = !!(c.venue && c.venue.indoor);
      g.ot = /OT/.test(det);
      const cf = c.conferenceCompetition; if (cf !== undefined) g.conf = !!cf;
    }
    out.push(g);
  });
  return out;
}

/* ---------- lineas de cierre (endpoint core de ESPN) ---------- */
// Devuelve el proveedor mas completo que no sea "en vivo". Las lineas del local: spread (negativo = local favorito).
function lineaCore(j) {
  const items = (j && j.items) || []; let mejor = null;
  items.forEach(function (it) {
    const prov = (it.provider && it.provider.name) || '?';
    if (/live/i.test(prov)) return;
    const hO = it.homeTeamOdds || {}, aO = it.awayTeamOdds || {};
    const am = (lado, ...rutas) => { for (const r of rutas) { let v = lado; for (const k of r.split('.')) v = v && v[k]; const n = L.americano(v); if (n !== null) return n; } return null; };
    const mlH = am(hO, 'close.moneyLine.american', 'current.moneyLine.american', 'moneyLine'), mlA = am(aO, 'close.moneyLine.american', 'current.moneyLine.american', 'moneyLine');
    const oH = am(hO, 'open.moneyLine.american'), oA = am(aO, 'open.moneyLine.american');
    let sp = null;
    const ps = hO.close && hO.close.pointSpread; if (ps) sp = L.num(ps.american !== undefined ? ps.american : ps.alternateDisplayValue);
    if (sp !== null && Math.abs(sp) > 45) sp = null;
    if (sp === null && isFinite(+it.spread) && it.spread !== null) sp = +it.spread;
    const spH = am(hO, 'close.spread.american', 'current.spread.american'), spA = am(aO, 'close.spread.american', 'current.spread.american');
    let tot = isFinite(+it.overUnder) && +it.overUnder > 0 ? +it.overUnder : null;
    const ov = L.americano(it.overOdds), un = L.americano(it.underOdds);
    const c = { prov, ml: null, mlOpen: null, sp, spOdds: (spH !== null && spA !== null) ? [spH, spA] : (L.americano(hO.spreadOdds) !== null && L.americano(aO.spreadOdds) !== null ? [L.americano(hO.spreadOdds), L.americano(aO.spreadOdds)] : null),
      tot, ou: (ov !== null && un !== null) ? [ov, un] : null };
    if (mlH !== null && mlA !== null) { const s = L.impAm(mlH) + L.impAm(mlA); if (s >= 1.0 && s <= 1.15) c.ml = [mlH, mlA]; }
    if (oH !== null && oA !== null) { const s = L.impAm(oH) + L.impAm(oA); if (s >= 1.0 && s <= 1.15) c.mlOpen = [oH, oA]; }
    c.puntos = (c.ml ? 2 : 0) + (sp !== null ? 2 : 0) + (tot !== null ? 1 : 0) + (c.spOdds ? 0.5 : 0) + (c.ou ? 0.5 : 0);
    if (c.puntos > 0 && (!mejor || c.puntos > mejor.puntos || (c.puntos === mejor.puntos && /espn bet|draftkings/i.test(prov) && !/espn bet|draftkings/i.test(mejor.prov)))) mejor = c;
  });
  return mejor;
}

/* ---------- ventanas de temporada ---------- */
// NHL: del 1-oct al 30-jun; NFL: del 1-sep al 28-feb (los juegos de enero y febrero son de la temporada que empezo el ano anterior)
function ventana(dep, sk) {
  return dep === 'nhl' ? [new Date(Date.UTC(sk, 9, 1)), new Date(Date.UTC(sk + 1, 5, 30))] : [new Date(Date.UTC(sk, 8, 1)), new Date(Date.UTC(sk + 1, 1, 28))];
}
async function bajarDia(dep, d, DIAG) {
  try { return parseEventos(await L.pedir(ESPN[dep] + 'scoreboard?dates=' + ymdU(d) + '&limit=300'), dep); }
  catch (e) { DIAG.errores.push(ymdU(d) + ': ' + e.message); return []; }
}
async function temporada(dep, sk, DIAG) {
  if (dep === 'nfl') {
    // por semana (los rangos de fechas dan 400 en la NFL y la NHL)
    const tareas = [];
    for (let w = 1; w <= 18; w++) tareas.push([2, w]);
    for (let w = 1; w <= 5; w++) tareas.push([3, w]);
    const res = await L.pool(tareas.map(([t, w]) => async () => {
      try { return parseEventos(await L.pedir(ESPN.nfl + 'scoreboard?dates=' + sk + '&seasontype=' + t + '&week=' + w + '&limit=100'), 'nfl'); }
      catch (e) { DIAG.errores.push('nfl ' + sk + ' t' + t + ' s' + w + ': ' + e.message); return []; }
    }), 6);
    const m = new Map(); [].concat(...res.filter(Boolean)).forEach(g => m.set(g.id, g));
    return [...m.values()];
  }
  const [ini, fin] = ventana(dep, sk); const dias = [];
  for (let d = new Date(ini); d <= fin; d = new Date(d.getTime() + 864e5)) dias.push(new Date(d));
  const res = await L.pool(dias.map(d => () => bajarDia(dep, d, DIAG)), 10);
  const m = new Map(); [].concat(...res.filter(Boolean)).forEach(g => m.set(g.id, g));
  return [...m.values()];
}
async function bajarLineas(dep, juegos, DIAG, cb) {
  let fallos = 0, ejemplo = null;
  await L.pool(juegos.map(g => async () => {
    if (g.linea !== undefined) return;
    try {
      const j = await L.pedir(CORE[dep] + 'events/' + g.id + '/competitions/' + g.id + '/odds');
      if (!ejemplo && j && j.items && j.items.length) ejemplo = JSON.stringify(j.items[0]).slice(0, 1500);
      g.linea = lineaCore(j);
    } catch (e) { fallos++; g.linea = null; if (/HTTP 404/.test(e.message)) g.linea = null; else g.linea = undefined; }
  }), 8, cb);
  return { fallos, ejemplo };
}

/* ---------- cache ---------- */
function cargarCache(dep, ruta) { try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { return { dep, temps: {} }; } }
function guardarCache(ruta, c) { fs.writeFileSync(ruta, JSON.stringify(c)); }

module.exports = { ESPN, CORE, parseEventos, lineaCore, ventana, temporada, bajarLineas, bajarDia, cargarCache, guardarCache, ymdU };
