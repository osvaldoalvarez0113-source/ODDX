/* Archivo propio de partidos terminados: guarda las jugadas (con su posición) que ESPN publica gratis, para fútbol y NBA.
   Corre en GitHub Actions cada pocas horas y deja un .json.gz por partido en la rama "historial-espn" (no toca main).
   Sirve para tus propias pruebas y para calibrar sin pagar a nadie. Es una copia personal de datos públicos de ESPN; no se publica en la app.
   Uso: ARCH_DIR=<carpeta> node scripts/archivar_espn.js [dias_atras] */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
const LIGAS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'mex.1', 'usa.1'];
const DIR = process.env.ARCH_DIR || 'archivo';
const DIAS = parseInt(process.argv[2] || process.env.DIAS_ATRAS || '3', 10);
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; OVA-archivo/1.0)', 'Accept': 'application/json' };

async function getJ(url, intentos) {
  for (let i = 0; i < (intentos || 3); i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch (e) { /* se reintenta */ }
    await new Promise(ok => setTimeout(ok, 800 * (i + 1)));
  }
  return null;
}
const ymd = d => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const refEq = r => { const m = /teams\/(\d+)/.exec(String(r || '')); return m ? m[1] : ''; };

function jugadaFut(p) {
  return {
    id: String(p.id), t: (p.type && p.type.text) || '', txt: p.text || p.shortText || '',
    per: p.period && p.period.number != null ? p.period.number : null,
    clk: (p.clock && p.clock.displayValue) || '', cs: p.clock && typeof p.clock.value === 'number' ? p.clock.value : null,
    wall: p.wallclock || null, eq: refEq(p.team && p.team.$ref),
    x: num(p.fieldPositionX), y: num(p.fieldPositionY), x2: num(p.fieldPosition2X), y2: num(p.fieldPosition2Y),
    dorsal: p.participants && p.participants[0] && p.participants[0].jersey != null ? String(p.participants[0].jersey) : '',
    gol: !!p.scoringPlay, tiro: !!p.shootingPlay
  };
}
function jugadaNba(p) {
  const c = p.coordinate || {};
  return {
    id: String(p.id != null ? p.id : p.sequenceNumber), t: (p.type && p.type.text) || '', txt: p.text || '',
    per: p.period && p.period.number != null ? p.period.number : null, clk: (p.clock && p.clock.displayValue) || '',
    wall: p.wallclock || null, eq: String((p.team && p.team.id) || ''), x: num(c.x), y: num(c.y),
    pts: p.scoreValue != null ? p.scoreValue : null, hs: p.homeScore, as: p.awayScore, gol: !!p.scoringPlay, tiro: !!p.shootingPlay
  };
}
function cabecera(ev, liga) {
  const c = (ev.competitions && ev.competitions[0]) || {}, eq = (c.competitors || []).map(t => ({
    id: String(t.team && t.team.id), nombre: t.team && t.team.displayName, local: t.homeAway === 'home', marcador: t.score
  }));
  return { id: String(ev.id), liga, fecha: ev.date, estado: ev.status && ev.status.type && ev.status.type.name, equipos: eq };
}
function guardar(ruta, obj) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, zlib.gzipSync(JSON.stringify(obj), { level: 9 }));
}
const terminado = ev => !!(ev.status && ev.status.type && ev.status.type.completed);

async function futbol(fechas) {
  let nuevos = 0;
  for (const slug of LIGAS) {
    for (const f of fechas) {
      const sb = await getJ(ESPN + 'soccer/' + slug + '/scoreboard?dates=' + f + '&limit=100');
      for (const ev of (sb && sb.events) || []) {
        if (!terminado(ev)) continue;
        const ruta = path.join(DIR, 'futbol', slug, ev.id + '.json.gz');
        if (fs.existsSync(ruta)) continue;
        const base = CORE + slug + '/events/' + ev.id + '/competitions/' + ev.id + '/plays';
        const primero = await getJ(base + '?limit=1'); const total = primero && primero.count || 0;
        if (!total) { console.log('sin jugadas', slug, ev.id); continue; }
        const jug = []; let ok = true;
        for (let pg = 1; pg <= Math.ceil(total / 100); pg++) {
          const r = await getJ(base + '?limit=100&page=' + pg);
          if (!r || !r.items) { ok = false; break; }
          r.items.forEach(p => jug.push(jugadaFut(p)));
        }
        if (!ok || jug.length < total * 0.98) { console.log('incompleto, se reintenta luego', slug, ev.id, jug.length, '/', total); continue; }
        guardar(ruta, { v: 1, cab: cabecera(ev, slug), jugadas: jug });
        nuevos++; console.log('fútbol guardado', slug, ev.id, jug.length);
      }
    }
  }
  return nuevos;
}
async function nba(fechas) {
  let nuevos = 0;
  for (const f of fechas) {
    const sb = await getJ(ESPN + 'basketball/nba/scoreboard?dates=' + f + '&limit=100');
    for (const ev of (sb && sb.events) || []) {
      if (!terminado(ev)) continue;
      const ruta = path.join(DIR, 'nba', ev.id + '.json.gz');
      if (fs.existsSync(ruta)) continue;
      const s = await getJ(ESPN + 'basketball/nba/summary?event=' + ev.id);
      const pl = s && s.plays;
      if (!pl || !pl.length) { console.log('NBA sin jugadas', ev.id); continue; }
      guardar(ruta, { v: 1, cab: cabecera(ev, 'nba'), jugadas: pl.map(jugadaNba) });
      nuevos++; console.log('NBA guardado', ev.id, pl.length);
    }
  }
  return nuevos;
}
(async () => {
  const fechas = []; for (let i = 0; i <= DIAS; i++) fechas.push(ymd(new Date(Date.now() - i * 864e5)));
  const a = await futbol(fechas), b = await nba(fechas);
  console.log('nuevos: fútbol', a, 'NBA', b);
})().catch(e => { console.error(e); process.exit(0); });   /* nunca rompe la corrida: lo que falte se intenta en la siguiente */
