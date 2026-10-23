'use strict';
// OVA · Fútbol: ¿los TITULARES que faltan (o que cambian) le agregan algo a la linea de cierre de Pinnacle?
// Se cruzan los partidos de 5 ligas (2020-21 a 2025-26, con cuota de cierre de Pinnacle) con la alineacion real de ESPN.
// Para cada equipo se arma el "once habitual" con los 15 partidos anteriores de la misma temporada (quien arranca mas) y se mide
// cuantos de esos habituales NO arrancaron hoy, que parte de los goles+asistencias recientes del equipo se ausenta, y si cambio el portero.
// Despues se prueba si eso explica el resultado ENCIMA de lo que ya decia el mercado. Si c ~ 0, la linea ya lo sabia.
const fs = require('fs');
const { pedir, pool, ms, ols, f, tabla, ymd, errores } = require('./lib.js');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const LIGAS = { E0: 'eng.1', SP1: 'esp.1', I1: 'ita.1', D1: 'ger.1', F1: 'fra.1' };
const VENT = 15, MINPREV = 8;
let out = '## Fútbol · titulares ausentes contra la linea de cierre de Pinnacle\n\n';
const say = t => { out += t + '\n\n'; console.log(t); };

/* ---------- nombres: football-data vs ESPN ---------- */
const ALIAS = { 'man city': 'manchester city', 'man united': 'manchester united', "nott'm forest": 'nottingham forest', 'wolves': 'wolverhampton wanderers', 'ath madrid': 'atletico madrid', 'ath bilbao': 'athletic club',
  'sociedad': 'real sociedad', 'celta': 'celta vigo', 'vallecano': 'rayo vallecano', 'espanol': 'espanyol', 'inter': 'internazionale', 'milan': 'ac milan', 'ein frankfurt': 'eintracht frankfurt', "m'gladbach": 'borussia monchengladbach',
  'fc koln': 'koln cologne', 'paris sg': 'paris saint germain', 'st etienne': 'saint etienne', 'west brom': 'west bromwich albion', 'leeds': 'leeds united', 'newcastle': 'newcastle united', 'tottenham': 'tottenham hotspur', 'leicester': 'leicester city',
  'norwich': 'norwich city', 'luton': 'luton town', 'ipswich': 'ipswich town', 'west ham': 'west ham united', 'verona': 'hellas verona', 'bayern munich': 'bayern munchen', 'hertha': 'hertha berlin', 'hamburg': 'hamburger sv', 'stuttgart': 'vfb stuttgart',
  'dortmund': 'borussia dortmund', 'leverkusen': 'bayer leverkusen', 'brighton': 'brighton hove albion', 'betis': 'real betis', 'bournemouth': 'afc bournemouth', 'sheffield united': 'sheffield united', 'greuther furth': 'greuther furth', 'brest': 'stade brestois',
  'reims': 'stade de reims', 'rennes': 'stade rennais', 'strasbourg': 'racing strasbourg', 'lyon': 'olympique lyonnais', 'marseille': 'olympique marseille', 'nimes': 'nimes olympique', 'clermont': 'clermont foot', 'ajaccio': 'ajaccio', 'paris fc': 'paris fc' };
const limpia = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(fc|cf|afc|ac|as|ss|sc|us|club|de|1)\b/g, ' ').replace(/\s+/g, ' ').trim();
function similitud(fd, espn) {
  const a = limpia(ALIAS[String(fd).toLowerCase()] || fd).split(' ').filter(t => t.length >= 3), b = limpia(espn).split(' ').filter(t => t.length >= 3);
  if (!a.length || !b.length) return 0;
  let hit = 0; a.forEach(x => { if (b.some(y => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))))) hit++; });
  return hit / a.length;
}

/* ---------- ESPN: calendario y alineaciones ---------- */
const CAL = {};          // liga|fecha -> eventos
async function eventosDe(lg, fch) {
  const k = lg + '|' + fch; if (CAL[k]) return CAL[k];
  CAL[k] = (async () => {
    const j = await pedir(ESPN + lg + '/scoreboard?dates=' + fch + '&limit=100'), res = [];
    ((j && j.events) || []).forEach(e => {
      try {
        const c = e.competitions[0]; let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else a = x; });
        const st = (e.status && e.status.type) || {}; if (st.completed !== true) return;
        res.push({ id: String(e.id), ts: Date.parse(e.date), h: h.team.displayName, a: a.team.displayName, hs: parseInt(h.score, 10), as: parseInt(a.score, 10), lg });
      } catch (err) { }
    });
    return res;
  })();
  return CAL[k];
}
const st = (stats, nombres) => { for (const n of nombres) { const x = (stats || []).find(s => s && (s.name === n || s.abbreviation === n)); if (x && x.value != null && isFinite(+x.value)) return +x.value; } return null; };
let MUESTRA = null;
function leerAlineacion(j) {
  const R = j && j.rosters; if (!Array.isArray(R) || R.length < 2) return null;
  const res = {};
  R.forEach(r => {
    const lado = r.homeAway; if (lado !== 'home' && lado !== 'away') return;
    const lista = (r.roster || []).map(p => {
      const at = p.athlete || {}, stats = p.stats || [];
      const g = st(stats, ['totalGoals', 'goals']), a = st(stats, ['goalAssists', 'assists']);
      return { id: String(at.id), starter: p.starter === true, subIn: !!p.subbedIn, pos: (p.position && p.position.abbreviation) || null, ga: (g || 0) + (a || 0), hasGA: g != null || a != null };
    }).filter(p => p.id && p.id !== 'undefined');
    res[lado] = lista;
  });
  if (!res.home || !res.away) return null;
  if (!MUESTRA) MUESTRA = JSON.stringify({ claves: Object.keys(j), roster0: (R[0].roster || []).slice(0, 2) }).slice(0, 2500);
  return res;
}

async function main() {
  const datos = JSON.parse(fs.readFileSync(process.env.DATOS_FUTBOL || 'datos_futbol.json', 'utf8')).filter(x => x.ps && x.mk && LIGAS[x.lg]);
  say('Partidos con cuota de cierre de Pinnacle: ' + datos.length);
  // 1) calendario ESPN por liga y fecha
  const claves = [...new Set(datos.map(x => LIGAS[x.lg] + '|' + ymd(new Date(x.d))))];
  console.log('calendarios a bajar: ' + claves.length);
  await pool(claves.map(k => () => { const [lg, fch] = k.split('|'); return eventosDe(lg, fch); }), 8, (h, t) => { if (h % 500 === 0) console.log('  calendario ' + h + '/' + t); });
  // 2) cruzar por fecha + marcador + nombre
  const buscar = async (x, desp) => {
    const lg = LIGAS[x.lg], d = new Date(x.d + desp * 864e5), ev = await eventosDe(lg, ymd(d)).catch(() => []);
    return ev.filter(e => e.hs === x.gh && e.as === x.ga && Math.abs(e.ts - x.d) < 40 * 3600e3);
  };
  let sinPar = 0, ambiguo = 0; const cruz = []; const usados = new Set();
  for (const x of datos) {
    let c = await buscar(x, 0); if (!c.length) c = (await buscar(x, 1)).concat(await buscar(x, -1));
    c = c.filter(e => !usados.has(e.id));
    if (!c.length) { sinPar++; continue; }
    const pun = c.map(e => ({ e, s: similitud(x.h, e.h) + similitud(x.a, e.a) })).sort((p, q) => q.s - p.s);
    if (c.length > 1 && pun[0].s < 0.5) { ambiguo++; continue; }
    if (c.length === 1 && pun[0].s < 0.25) { ambiguo++; continue; }       // un solo candidato pero los nombres no se parecen en nada
    usados.add(pun[0].e.id); cruz.push({ x, ev: pun[0].e });
  }
  say('Cruzados con ESPN: ' + cruz.length + ' de ' + datos.length + ' (sin par ' + sinPar + ', ambiguos/nombres distintos ' + ambiguo + ')');
  // 3) alineaciones
  console.log('Bajando alineaciones de ' + cruz.length + ' partidos...');
  const sums = await pool(cruz.map(c => async () => leerAlineacion(await pedir(ESPN + c.ev.lg + '/summary?event=' + c.ev.id))), 8, (h, t) => { if (h % 500 === 0) console.log('  alineaciones ' + h + '/' + t); });
  const P = []; let sinAl = 0, sinOnce = 0, conGA = 0;
  cruz.forEach((c, i) => {
    const al = sums[i]; sums[i] = null; if (!al) { sinAl++; return; }
    const ok = ['home', 'away'].every(l => al[l].filter(p => p.starter).length === 11); if (!ok) { sinOnce++; return; }
    if (['home', 'away'].some(l => al[l].some(p => p.hasGA))) conGA++;
    P.push({ x: c.x, ev: c.ev, al });
  });
  say('### Datos\n```\ncon alineacion completa (11 titulares por lado): ' + P.length + ' · sin alineacion ' + sinAl + ' · sin 11 titulares ' + sinOnce + ' · con datos de goles/asistencias ' + conGA + '\nerrores de descarga: ' + errores.length + (errores.length ? ' (primeros: ' + errores.slice(0, 3).join(' | ') + ')' : '') + '\nmuestra de la estructura de ESPN: ' + (MUESTRA || 'ninguna') + '\n```');
  if (P.length < 800) { say('NO TERMINO: muy pocas alineaciones leidas (hay que revisar la estructura de ESPN que se muestra arriba).'); fs.writeFileSync('resultado_futbol.txt', out); return; }
  // 4) historial por equipo y temporada
  P.sort((a, b) => a.x.d - b.x.d);
  const H = {};   // temporada|equipo -> [{starters:Set, ga:Map}]
  const rows = [];
  P.forEach(p => {
    const feat = {};
    ['home', 'away'].forEach(l => {
      const nombre = l === 'home' ? p.ev.h : p.ev.a, key = p.x.t + '|' + p.x.lg + '|' + nombre, hist = H[key] || (H[key] = []);
      const hoy = new Set(p.al[l].filter(q => q.starter).map(q => q.id));
      if (hist.length >= MINPREV) {
        const w = hist.slice(-VENT), starts = new Map(), ga = new Map(); let totGA = 0;
        w.forEach(m => { m.starters.forEach(id => starts.set(id, (starts.get(id) || 0) + 1)); m.ga.forEach((v, id) => { ga.set(id, (ga.get(id) || 0) + v); totGA += v; }); });
        const habit = [...starts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 11).map(([id]) => id);
        const faltan = habit.filter(id => !hoy.has(id));
        const gaFalta = faltan.reduce((a, id) => a + (ga.get(id) || 0), 0);
        const gk0 = w.map(m => m.gk).filter(Boolean), gkUsual = gk0.length ? [...gk0.reduce((mm, g) => mm.set(g, (mm.get(g) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
        const gkHoy = (p.al[l].find(q => q.starter && String(q.pos).toUpperCase() === 'G') || {}).id;
        feat[l] = { n: faltan.length, share: totGA > 0 ? gaFalta / totGA : 0, gk: gkUsual && gkHoy && gkUsual !== gkHoy ? 1 : 0, cambios: [...hoy].filter(id => !(w[w.length - 1].starters.has(id))).length };
      }
      hist.push({ starters: hoy, ga: new Map(p.al[l].filter(q => q.hasGA && q.ga > 0).map(q => [q.id, q.ga])), gk: (p.al[l].find(q => q.starter && String(q.pos).toUpperCase() === 'G') || {}).id });
    });
    if (feat.home && feat.away) {
      const x = p.x, mk = x.mk, ph = x.y === 0 ? 3 : x.y === 1 ? 1 : 0, eh = 3 * mk[0] + mk[1];
      rows.push({ t: x.t, lg: x.lg, y: x.y, ph, res: ph - eh, mkH: mk[0], mkA: mk[2], oH: x.ps[0], oA: x.ps[2], dN: feat.home.n - feat.away.n, dS: (feat.home.share - feat.away.share) * 100, dGK: feat.home.gk - feat.away.gk, dCamb: feat.home.cambios - feat.away.cambios, nH: feat.home.n, nA: feat.away.n });
    }
  });
  say('Partidos medibles (ambos equipos con >=' + MINPREV + ' partidos previos en la temporada): ' + rows.length + '. Titulares habituales ausentes por equipo: media ' + f(rows.reduce((a, r) => a + r.nH + r.nA, 0) / (2 * rows.length), 2) + ' de 11.');
  const reg = (cols, rr) => { rr = rr || rows; return ols(rr.map(r => [1].concat(cols.map(c => r[c]))), rr.map(r => r.res)); };
  const L = (g, i) => g ? f(g.b[i], 3) + ' ± ' + f(2 * g.se[i], 3) : '—', Z = (g, i) => g ? f(g.b[i] / (g.se[i] || 1), 1) : '—';
  // A) crudo: ¿importan?
  const rawN = ols(rows.map(r => [1, r.dN]), rows.map(r => r.ph));
  say('### 0) Sanidad: ¿importan los titulares ausentes por si solos? (puntos del local = a + c·(ausentes local − visita), SIN mirar la linea)\nc = ' + L(rawN, 1) + ' puntos por titular habitual que falta (negativo = perjudica al que le faltan).');
  // B) encima de la linea
  const gN = reg(['dN']), gS = reg(['dS']), gK = reg(['dGK']), gC = reg(['dCamb']);
  say('### 1) Encima de la linea de cierre: puntos reales del local − puntos que esperaba el mercado = a + c·(variable)\nc = 0 → el mercado ya lo sabia.\n\n' + tabla(['Variable (local − visita)', 'c ± 2·se', 'z'], [
    ['Titulares habituales ausentes (cantidad)', L(gN, 1), Z(gN, 1)], ['% de goles+asistencias recientes que se ausenta (por cada punto %)', L(gS, 1), Z(gS, 1)], ['Cambio de portero (0/1)', L(gK, 1), Z(gK, 1)], ['Cambios respecto al partido anterior (cantidad)', L(gC, 1), Z(gC, 1)]]));
  const temps = [...new Set(rows.map(r => r.t))].sort();
  say('### 2) ¿Se repite por temporada? (titulares habituales ausentes)\n' + tabla(['Temporada', 'Partidos', 'c ± 2·se', 'z'], temps.map(t => { const rr = rows.filter(r => r.t === t), g = rr.length > 150 ? reg(['dN'], rr) : null; return [t, rr.length, L(g, 1), Z(g, 1)]; })));
  const ligs = [...new Set(rows.map(r => r.lg))];
  say('### 3) Por liga (titulares habituales ausentes)\n' + tabla(['Liga', 'Partidos', 'c ± 2·se', 'z'], ligs.map(l => { const rr = rows.filter(r => r.lg === l), g = rr.length > 150 ? reg(['dN'], rr) : null; return [l, rr.length, L(g, 1), Z(g, 1)]; })));
  // C) apostar por el equipo mas completo
  const ap = k => { const rets = []; rows.forEach(r => { if (Math.abs(r.dN) < k) return; const home = r.dN < 0; const gana = home ? r.y === 0 : r.y === 2; rets.push(gana ? (home ? r.oH : r.oA) - 1 : -1); }); const q = ms(rets); return [k + '+', q.n, f(100 * rets.filter(x => x > 0).length / Math.max(q.n, 1), 1) + '%', f(100 * q.m, 1) + '% ± ' + f(200 * q.se, 1) + '%']; };
  say('### 4) Apostar por el equipo con el once mas completo (a la cuota de cierre de Pinnacle)\n' + tabla(['Diferencia de titulares ausentes', 'Apuestas', '% ganadas', 'ROI ± 2·se'], [1, 2, 3].map(ap)));
  say('### Resumen\n```\nc (titulares habituales ausentes, encima de la linea) = ' + L(gN, 1) + ' puntos por titular (z ' + Z(gN, 1) + ')\nSi el intervalo incluye 0, el mercado ya descuenta las alineaciones y no hay ventaja en usarlas.\n```');
  fs.writeFileSync('resultado_futbol.txt', out);
  fs.writeFileSync('resultado_futbol.json', JSON.stringify({ n: rows.length, c: gN && gN.b[1], se: gN && gN.se[1] }));
}
main().catch(e => { console.error(e); fs.writeFileSync('resultado_futbol.txt', out + '\nERROR: ' + (e && e.stack || e)); process.exit(1); });
