'use strict';
/* NBA: quién jugó y cuánto en cada juego (boxscore de ESPN), temporadas 2021-22 en adelante.
   Guarda nba-box.json.gz (rama datos-nba-box): { v, generado, nombres: {idJugador: nombre}, g: [{id, ts, sk, h, a, hs, as, p: [[equipo, jugador, min, pts, reb, ast, masmenos, titular]]}] }
   Reusa lo ya bajado y solo pide lo nuevo. Lo usan la medición del valor de cada jugador y el robot de valores de la app. */
const fs = require('fs'), zlib = require('zlib');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const ARCH = process.env.OVA_BOX_NBA || 'nba-box.json.gz';
const pad2 = n => (n < 10 ? '0' : '') + n, ymd = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
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
function temporadaDe(ts) { const d = new Date(ts); return d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }
function parseDia(j) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a) return;
    const st = (e.status && e.status.type) || {}, ty = parseInt(e.season && e.season.type, 10) || 2, hs = parseInt(h.score, 10), as = parseInt(a.score, 10);
    if (st.completed !== true || !isFinite(hs) || !isFinite(as) || ty === 1 || ty === 4) return;
    if (/all.?star|rising stars|celebrity/i.test((e.name || '') + (e.shortName || ''))) return;
    const ts = Date.parse(e.date);
    out.push({ id: String(e.id), ts, sk: temporadaDe(ts), h: String(h.team.id), a: String(a.team.id), hs, as });
  });
  return out;
}
function leerBox(j, nombres) {
  const eq = j && j.boxscore && j.boxscore.players; if (!eq) return null;
  const p = [];
  eq.forEach(t => {
    const tid = String(t.team && t.team.id);
    (t.statistics || []).forEach(b => {
      const L = b.labels || [], iM = L.indexOf('MIN'), iP = L.indexOf('PTS'), iR = L.indexOf('REB'), iA = L.indexOf('AST'), iPM = L.indexOf('+/-');
      (b.athletes || []).forEach(at => {
        const s = at.stats || [], min = num(s[iM]);
        if (at.didNotPlay || !s.length || !(min > 0)) return;
        const id = String(at.athlete && at.athlete.id); if (!id || id === 'undefined') return;
        if (at.athlete.displayName) nombres[id] = at.athlete.displayName;
        p.push([tid, id, min, num(s[iP]) || 0, num(s[iR]) || 0, num(s[iA]) || 0, iPM >= 0 ? (num(s[iPM]) || 0) : 0, at.starter ? 1 : 0]);
      });
    });
  });
  return p.length >= 10 ? p : null;
}
(async () => {
  let db = { v: 1, nombres: {}, g: [] };
  try { db = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARCH))); console.log('cache: ' + db.g.length + ' juegos'); } catch (e) { console.log('sin cache'); }
  const ya = new Set(db.g.map(g => g.id)), hoy = new Date(), skHoy = temporadaDe(hoy.getTime());
  const desde = parseInt(process.env.DESDE_NBA || '2021', 10), dias = [];
  for (let sk = desde; sk <= skHoy; sk++) {
    const ultimo = db.g.filter(g => g.sk === sk).reduce((m, g) => Math.max(m, g.ts), 0);
    const ini = ultimo ? new Date(ultimo - 2 * 864e5) : new Date(Date.UTC(sk, 9, 1)), fin = new Date(Math.min(Date.UTC(sk + 1, 5, 30), hoy.getTime()));
    if (ultimo && sk < skHoy && db.g.filter(g => g.sk === sk).length > 1200) continue;   // temporada vieja ya completa
    for (let d = new Date(ini); d <= fin; d = new Date(d.getTime() + 864e5)) dias.push(new Date(d));
  }
  console.log('días por revisar: ' + dias.length);
  const res = await pool(dias.map(d => async () => parseDia(await pedir(ESPN + 'scoreboard?dates=' + ymd(d) + '&limit=300'))), 10);
  const nuevos = [].concat(...res.filter(Boolean)).filter(g => !ya.has(g.id));
  const uni = new Map(); nuevos.forEach(g => uni.set(g.id, g));
  const lista = [...uni.values()];
  console.log('juegos nuevos: ' + lista.length);
  await pool(lista.map(g => async () => { const j = await pedir(ESPN + 'summary?event=' + g.id); g.p = leerBox(j, db.nombres); }), 8, (h, t) => { if (h % 500 === 0) console.log('  ' + h + '/' + t); });
  lista.filter(g => g.p).forEach(g => db.g.push(g));
  db.g.sort((a, b) => a.ts - b.ts); db.generado = new Date().toISOString();
  fs.writeFileSync(ARCH, zlib.gzipSync(JSON.stringify(db)));
  const porT = {}; db.g.forEach(g => { porT[g.sk] = (porT[g.sk] || 0) + 1; });
  console.log('nba-box: ' + db.g.length + ' juegos ' + JSON.stringify(porT) + ' · jugadores ' + Object.keys(db.nombres).length + ' · errores ' + errores.length + (errores.length ? ' (' + errores.slice(0, 3).join(' | ') + ')' : ''));
})().catch(e => { console.error(e); process.exit(1); });
