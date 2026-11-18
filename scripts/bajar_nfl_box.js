'use strict';
/* NFL: quién jugó y qué produjo en cada juego (boxscore de ESPN), temporadas 2019 en adelante.
   Guarda nfl-box.json.gz (rama datos-nfl-box): { v, generado, nombres: {id: nombre}, g: [{id, ts, sk, h, a, hs, as, p: [[equipo, jugador, intentosPase, yardasPase, tdPase, intercepciones, acarreos, yardasCarrera, tdCarrera, recepciones, yardasRecepcion, tdRecepcion]]}] }
   Reusa lo ya bajado y solo pide lo nuevo. Lo usan la medición del valor de cada jugador y el robot de valores de la app NFL. */
const fs = require('fs'), zlib = require('zlib');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/';
const ARCH = process.env.OVA_BOX_NFL || 'nfl-box.json.gz';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const num = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−‒–—―‐‑]/g, '-').replace(/[＋+\s,]/g, '')); return isFinite(n) ? n : null; };
const errores = [];
async function pedir(url) {
  for (let i = 0; i < 5; i++) {
    let r;
    try { r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (ova-datos)' } }); }
    catch (e) { if (i === 4) throw e; await dormir(800 * (i + 1)); continue; }
    if (r.status === 429 || r.status === 503) { await dormir(1500 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 100));
    return r.json();
  }
  throw new Error('429/503 repetido ' + url.slice(0, 100));
}
async function pool(tareas, n, cb) {
  let i = 0, h = 0; const out = new Array(tareas.length);
  async function w() { while (i < tareas.length) { const k = i++; try { out[k] = await tareas[k](); } catch (e) { errores.push(String(e.message).slice(0, 120)); out[k] = null; } h++; if (cb) cb(h, tareas.length); } }
  await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, w)); return out;
}
function parseSemana(j, sk) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    const st = (e.status && e.status.type) || {}, hs = parseInt(h && h.score, 10), as = parseInt(a && a.score, 10);
    if (!h || !a || st.completed !== true || !isFinite(hs) || !isFinite(as)) return;
    out.push({ id: String(e.id), ts: Date.parse(e.date), sk, h: String(h.team.id), a: String(a.team.id), hs, as, neutral: !!c.neutralSite });
  });
  return out;
}
function leerBox(j, nombres) {
  const eq = j && j.boxscore && j.boxscore.players; if (!eq) return null;
  const P = {};   // equipo|jugador -> fila
  eq.forEach(t => {
    const tid = String(t.team && t.team.id);
    (t.statistics || []).forEach(cat => {
      const nm = cat.name, L = cat.labels || [];
      (cat.athletes || []).forEach(at => {
        const id = String(at.athlete && at.athlete.id); if (!id || id === 'undefined') return;
        if (at.athlete.displayName) nombres[id] = at.athlete.displayName;
        const s = at.stats || [], k = tid + '|' + id, f = P[k] = P[k] || [tid, id, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const v = lab => { const i = L.indexOf(lab); return i >= 0 ? (num(s[i]) || 0) : 0; };
        if (nm === 'passing') { const ca = String(s[L.indexOf('C/ATT')] || '').split('/'); f[2] += num(ca[1]) || 0; f[3] += v('YDS'); f[4] += v('TD'); f[5] += v('INT'); }
        else if (nm === 'rushing') { f[6] += v('CAR'); f[7] += v('YDS'); f[8] += v('TD'); }
        else if (nm === 'receiving') { f[9] += v('REC'); f[10] += v('YDS'); f[11] += v('TD'); }
      });
    });
  });
  const p = Object.values(P); return p.length >= 6 ? p : null;
}
(async () => {
  let db = { v: 1, nombres: {}, g: [] };
  try { db = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARCH))); console.log('cache: ' + db.g.length + ' juegos'); } catch (e) { console.log('sin cache'); }
  const ya = new Set(db.g.map(g => g.id)), hoy = new Date(), skHoy = hoy.getUTCMonth() >= 7 ? hoy.getUTCFullYear() : hoy.getUTCFullYear() - 1;
  const desde = parseInt(process.env.DESDE_NFL || '2019', 10), tareas = [];
  for (let sk = desde; sk <= skHoy; sk++) {
    if (sk < skHoy && db.g.filter(g => g.sk === sk).length >= 260) continue;
    for (let w = 1; w <= 18; w++) tareas.push(async () => parseSemana(await pedir(ESPN + 'scoreboard?seasontype=2&week=' + w + '&dates=' + sk + '&limit=50'), sk));
  }
  const res = await pool(tareas, 8);
  const uni = new Map(); [].concat(...res.filter(Boolean)).filter(g => !ya.has(g.id)).forEach(g => uni.set(g.id, g));
  const lista = [...uni.values()];
  console.log('juegos nuevos: ' + lista.length);
  await pool(lista.map(g => async () => { g.p = leerBox(await pedir(ESPN + 'summary?event=' + g.id), db.nombres); }), 8, (h, t) => { if (h % 300 === 0) console.log('  ' + h + '/' + t); });
  lista.filter(g => g.p).forEach(g => db.g.push(g));
  db.g.sort((a, b) => a.ts - b.ts); db.generado = new Date().toISOString();
  fs.writeFileSync(ARCH, zlib.gzipSync(JSON.stringify(db)));
  const porT = {}; db.g.forEach(g => { porT[g.sk] = (porT[g.sk] || 0) + 1; });
  console.log('nfl-box: ' + db.g.length + ' juegos ' + JSON.stringify(porT) + ' · jugadores ' + Object.keys(db.nombres).length + ' · errores ' + errores.length + (errores.length ? ' (' + errores.slice(0, 3).join(' | ') + ')' : ''));
})().catch(e => { console.error(e); process.exit(1); });
