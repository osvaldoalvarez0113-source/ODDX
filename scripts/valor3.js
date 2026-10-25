/* ===================================================================
   PRECIO JUSTO DE PINNACLE PARA NHL Y NFL (GitHub Actions, Node 20+)
   Quita el margen al precio de Pinnacle -> probabilidad "justa" del mercado: ganador, linea principal de handicap y de total.
   Salida: pinnacle-nhl.json, pinnacle-nfl.json (+ informe en resultado3.md).
   No necesita la lista de mercados de OddsPapi: cada mercado trae al final de su bookmakerMarketId el periodo y el tipo
   (".../0/moneyline", ".../0/spreads", ".../0/totals", ".../6/moneyline" = 60 minutos con empate), y cada resultado trae la linea
   ("-1.5/home", "6.0/over") y si es la linea principal (mainLine).
   =================================================================== */
const fs = require('fs'); const ENV = process.env; const KEY = ENV.ODDSPAPI_KEY || '';
const OP = 'https://api.oddspapi.io/v4';
const DEP = { nhl: { sport: 15, torneo: '234', horas: parseFloat(ENV.HORAS_NHL || '40') }, nfl: { sport: 14, torneo: '31', horas: parseFloat(ENV.HORAS_NFL || '150') } };
const MAX_MES = parseInt(ENV.MAX_MES || '60', 10);
const CDIR = '.cache', CF = CDIR + '/valor3.json';
const out = []; const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function dec(x) { x = +x; if (!isFinite(x)) return NaN; if (x >= 100) return 1 + x / 100; if (x <= -100) return 1 + 100 / (-x); return x; }
function noVig(ds) { const a = ds.map(d => 1 / d), s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); }
const r4 = v => +v.toFixed(4);
function precio(o) {
  const pl = (o && o.players) || {}; let x = pl['0'] || pl[Object.keys(pl)[0]]; if (Array.isArray(x)) x = x[0];
  if (!x || x.active === false) return null; const d = dec(x.price); return d > 1 ? d : null;
}
/* lee el bloque de Pinnacle de un partido de OddsPapi y devuelve lo que usa la app (o null si no trae ni ganador) */
function leerPinnacle(pin) {
  const mk = pin && pin.markets; if (!mk) return null;
  const res = { ml: null, r60: null, sp: null, tot: null };
  Object.keys(mk).forEach(id => {
    const m = mk[id]; if (!m || m.marketActive === false || !m.outcomes) return;
    const seg = String(m.bookmakerMarketId || '').split('/'); const tipo = seg[seg.length - 1], per = seg[seg.length - 2];
    if (per !== '0' && !(per === '6' && tipo === 'moneyline')) return;          // 0 = el juego (con tiempo extra); 6 = 60 minutos (solo hockey, ganador con empate)
    const por = {};
    Object.keys(m.outcomes).forEach(oid => {
      const o = m.outcomes[oid], pl = (o.players || {}); let x = pl['0'] || pl[Object.keys(pl)[0]]; if (Array.isArray(x)) x = x[0];
      if (!x) return; por[String(x.bookmakerOutcomeId)] = { d: precio(o), main: x.mainLine === true };
    });
    if (tipo === 'moneyline') {
      const h = por.home, a = por.away, d = por.draw;
      if (per === '0' && h && a && h.d && a.d) { const f = noVig([h.d, a.d]); res.ml = [r4(f[0]), r4(f[1])]; }
      else if (per === '6' && h && a && d && h.d && a.d && d.d) { const f = noVig([h.d, d.d, a.d]); res.r60 = [r4(f[0]), r4(f[1]), r4(f[2])]; }
    } else if (tipo === 'spreads' || tipo === 'totals') {
      const claves = Object.keys(por); const nums = {};
      claves.forEach(k => { const p = k.split('/'); if (p.length === 2 && isFinite(+p[0])) { (nums[p[0]] = nums[p[0]] || {})[p[1]] = por[k]; } });
      Object.keys(nums).forEach(l => {
        const n = nums[l], A = tipo === 'spreads' ? n.home : n.over, B = tipo === 'spreads' ? n.away : n.under;
        if (!A || !B || !A.d || !B.d || !(A.main && B.main)) return;       // solo la linea principal
        const f = noVig([A.d, B.d]);
        if (tipo === 'spreads') res.sp = { l: +l, p: [r4(f[0]), r4(f[1])] }; else res.tot = { l: +l, p: [r4(f[0]), r4(f[1])] };
      });
    }
  });
  return res.ml ? res : null;
}
module.exports = { leerPinnacle, noVig, dec };
if (require.main !== module) return;

let cache = { uso: {} }; try { cache = Object.assign(cache, JSON.parse(fs.readFileSync(CF, 'utf8'))); } catch (e) { }
const mes = new Date().toISOString().slice(0, 7);
function guardar() { try { fs.mkdirSync(CDIR, { recursive: true }); fs.writeFileSync(CF, JSON.stringify(cache)); } catch (e) { } }
let ultimo = 0;
async function op(path, params, gasta) {
  if (gasta && (cache.uso[mes] || 0) >= MAX_MES) throw new Error('tope mensual (' + MAX_MES + ')');
  const esp = (/odds-by-tournaments/.test(path) ? 6000 : 1200) - (Date.now() - ultimo); if (esp > 0) await sleep(esp);
  ultimo = Date.now(); if (gasta) cache.uso[mes] = (cache.uso[mes] || 0) + 1;
  const u = new URLSearchParams(params || {}); u.set('apiKey', KEY);
  let r = await fetch(OP + path + '?' + u.toString());
  for (let i = 0; i < 3 && r.status === 429; i++) { const t = await r.text().catch(() => ''); const m = /wait ([0-9.]+) seconds/.exec(t); await sleep(Math.min(20, (m ? parseFloat(m[1]) : 3) + 2) * 1000); r = await fetch(OP + path + '?' + u.toString()); }
  if (!r.ok) { const t = (await r.text().catch(() => '')).slice(0, 200).replace(KEY, '***'); const e = new Error(path + ' HTTP ' + r.status + ' ' + t); e.status = r.status; throw e; }
  guardar(); return r.json();
}
function listaFix(j) { if (!j) return []; if (Array.isArray(j)) return j; if (j.fixtureId) return [j]; for (const k of ['fixtures', 'data', 'results', 'items']) if (Array.isArray(j[k])) return j[k]; return Object.values(j).filter(x => x && typeof x === 'object' && x.fixtureId); }
async function nombres(sportId) {
  cache.nom = cache.nom || {}; if (cache['nomOk' + sportId]) return;
  try {
    const j = await op('/participants', { sportId: String(sportId) }, false); let n = 0;
    if (Array.isArray(j)) j.forEach(x => { const id = x.participantId || x.id, nm = x.participantName || x.name; if (id != null && nm) { cache.nom[id] = nm; n++; } });
    else Object.keys(j || {}).forEach(id => { if (typeof j[id] === 'string') { cache.nom[id] = j[id]; n++; } });
    P('Nombres de equipos (deporte ' + sportId + '): ' + n); if (n > 20) cache['nomOk' + sportId] = true; guardar();
  } catch (e) { P('No pude traer nombres (deporte ' + sportId + '): ' + String(e.message).replace(KEY, '***').slice(0, 200)); }
}
const nm = (f, i) => f['participant' + i + 'Name'] || (cache.nom && cache.nom[f['participant' + i + 'Id']]) || ('Equipo ' + f['participant' + i + 'Id']);

(async () => {
  if (!KEY) { P('Falta ODDSPAPI_KEY'); process.exit(1); }
  const ahora = Date.now(); const solo = (ENV.SOLO || 'nhl,nfl').split(',');
  for (const dep of ['nhl', 'nfl']) {
    if (!solo.includes(dep)) { P(dep.toUpperCase() + ': omitido en esta corrida'); continue; }
    try {
      await nombres(DEP[dep].sport);
      const fx = listaFix(await op('/odds-by-tournaments', { tournamentIds: DEP[dep].torneo, bookmaker: 'pinnacle' }, true));
      P(dep.toUpperCase() + ': OddsPapi devolvio ' + fx.length + ' partidos');
      const juegos = []; const rz = { lejos: 0, empezado: 0, sinPin: 0, sinPrecio: 0 };
      fx.forEach(f => {
        const t = Date.parse(f.startTime); if (!isFinite(t) || t < ahora) { rz.empezado++; return; } if (t > ahora + DEP[dep].horas * 3600e3) { rz.lejos++; return; }
        const pin = f.bookmakerOdds && f.bookmakerOdds.pinnacle; if (!pin) { rz.sinPin++; return; }
        const r = leerPinnacle(pin); if (!r) { rz.sinPrecio++; return; }
        const fila = { t: new Date(t).toISOString(), n: [nm(f, 1), nm(f, 2)], ml: r.ml };      // n[0] = local, n[1] = visita
        if (r.r60) fila.r60 = r.r60; if (r.sp) fila.sp = r.sp; if (r.tot) fila.tot = r.tot;
        juegos.push(fila);
      });
      juegos.sort((p, q) => Date.parse(p.t) - Date.parse(q.t));
      P(dep.toUpperCase() + ' usable: ' + juegos.length + ' · descartados ' + JSON.stringify(rz));
      P('Muestra: ' + juegos.slice(0, 6).map(x => x.n.join(' (local) vs ') + ' ml ' + x.ml.join('/') + (x.sp ? ' sp ' + x.sp.l : '') + (x.tot ? ' tot ' + x.tot.l : '')).join(' | '));
      if (juegos.length) fs.writeFileSync('pinnacle-' + dep + '.json', JSON.stringify({ generado: new Date().toISOString(), ventanaH: DEP[dep].horas, juegos }));
      else P('Sin juegos: se deja el archivo anterior (si lo hay).');
    } catch (e) { P(dep.toUpperCase() + ' ERROR: ' + String(e.message).replace(KEY, '***')); }
  }
  P('Llamadas este mes (este escaner): ' + (cache.uso[mes] || 0) + ' de ' + MAX_MES);
  try { fs.writeFileSync('resultado3.md', out.join('\n')); } catch (e) { }
  guardar();
})();
