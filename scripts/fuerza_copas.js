'use strict';
// Fuerza de los equipos en copas europeas para la Champions de la app. Uso: node scripts/fuerza_copas.js
// Junta Champions, Europa y Conference (cruzan la fuerza entre ligas) y corre dcAjustar, copiado de futbol.html.
// Escribe hist-copas.json (partidos) y fuerza-copas.json (lo que lee el teléfono). Medido en docs/MEDICION-FUTBOL-COPAS-2026-11.md.
const fs = require('fs'), vm = require('vm'), path = require('path');
const RAIZ = path.join(__dirname, '..'), html = fs.readFileSync(path.join(RAIZ, 'futbol.html'), 'utf8');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', SLUGS = ['uefa.champions', 'uefa.europa', 'uefa.europa.conf'];
const CFG = { xi: 0.25, Kp: 2, rho: -0.06, promo: 1, wt: 0.25, win: 1100 };
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
const lin = n => { const m = html.match(new RegExp('var ' + n + '\\s*=\\s*\\{[\\s\\S]*?\\};')); if (!m) throw new Error('no ' + n); return m[0] + '\n'; };
function ajustar(partidos, hoy) {
  const ctx = { Math, Object, console, isFinite, parseFloat, String, JSON }; vm.createContext(ctx);
  vm.runInContext('var localStorage={getItem:function(){return null;}};\n' + lin('TOKENS_FUERA') + lin('ALIAS_EQ') + cut('function sinAcentos', 'function mismaClave') + cut('function dcAjustar(lista, hoyDia, cfg)', 'function eloMix()') + 'function tsPartido(p){return p.ts;}\n', ctx);
  ctx.lista = partidos.map(m => ({ local: m.h, visita: m.a, golesLocal: m.gh, golesVisita: m.ga, ts: m.d })); ctx.hoy = hoy; ctx.cfg = CFG;
  return vm.runInContext('dcAjustar(lista,hoy,cfg)', ctx);
}
const r4 = v => Math.round(v * 1e4) / 1e4;
function salida(f, ahora) {
  const eq = {}; Object.keys(f.eq).sort().forEach(k => { const e = f.eq[k]; eq[k] = { att: r4(e.att), def: r4(e.def), n: e.n }; });
  return { generado: new Date(ahora).toISOString(), n: f.n, wt: CFG.wt, xi: CFG.xi, Kp: CFG.Kp, win: CFG.win, c: r4(f.c), gam: r4(f.gam), hAvg: r4(f.hAvg), aAvg: r4(f.aAvg), eq };
}
async function bajar(sl, anio) {
  const r = await fetch(ESPN + sl + '/scoreboard?dates=' + anio + '&limit=1000', { headers: { 'user-agent': 'ova-copas' } }); if (!r.ok) throw new Error(sl + ' HTTP ' + r.status);
  const j = await r.json(), out = [];
  (j.events || []).forEach(e => { try {
    const c = e.competitions[0], st = (e.status && e.status.type) || {}; if (st.completed !== true) return;
    let h = null, v = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else v = x; }); if (!h || !v) return;
    const gh = parseInt(h.score, 10), ga = parseInt(v.score, 10); if (!isFinite(gh) || !isFinite(ga)) return;
    out.push({ id: String(e.id), sl, d: Date.parse(e.date), h: h.team.displayName, a: v.team.displayName, gh, ga });
  } catch (x) {} });
  return out;
}
async function principal() {
  const ahora = Date.now(), rutaH = path.join(RAIZ, 'hist-copas.json'), mapa = new Map();
  JSON.parse(fs.readFileSync(rutaH, 'utf8')).forEach(m => mapa.set(m.sl + m.id, m));
  const anio = new Date(ahora).getUTCFullYear(); let nuevos = 0, fallos = 0;
  for (const sl of SLUGS) for (const y of [anio - 1, anio]) {
    try { for (const m of await bajar(sl, y)) { const k = sl + m.id; if (!mapa.has(k)) nuevos++; mapa.set(k, m); } } catch (e) { fallos++; console.log('no bajó', sl, y, e.message); }
  }
  const hoy = Math.floor(ahora / 864e5) + 1, lista = [...mapa.values()].filter(m => m.d >= (hoy - CFG.win - 30) * 864e5).sort((a, b) => a.d - b.d);
  const f = ajustar(lista, hoy);
  if (!f || Object.keys(f.eq).length < 50) throw new Error('ajuste con muy pocos equipos; no se escribe nada');
  fs.writeFileSync(rutaH, '[' + lista.map(m => JSON.stringify(m)).join(',\n') + ']\n');
  fs.writeFileSync(path.join(RAIZ, 'fuerza-copas.json'), JSON.stringify(salida(f, ahora)) + '\n');
  console.log(`partidos ${lista.length}, nuevos ${nuevos}, fallos ${fallos}, equipos ${Object.keys(f.eq).length}`);
}
module.exports = { ajustar, salida, CFG };
if (require.main === module) principal().catch(e => { console.error(e); process.exit(1); });
