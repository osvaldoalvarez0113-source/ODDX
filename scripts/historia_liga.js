'use strict';
/* ===================================================================
   OVA · HISTORIA DE LA LIGA (corre en GitHub Actions: .github/workflows/historia-liga.yml, los lunes y a mano).

   Para qué: la liga empezó a contar el 21-nov-2026 y el mapa de confianza necesita 30 juegos por zona antes de decir algo
   (semanas). Este robot le da MEMORIA: cuántas veces acertó el favorito en cada zona (franja de 5 puntos + local/visita/empate),
   con miles de juegos YA JUGADOS que el repo ya tenía guardados. Así la línea 🏆 del Veredicto dice algo desde hoy.

   Qué cuenta como «favorito» en cada deporte (lo más parecido a lo que muestra la app, que en NBA/NHL/NFL es el mercado con el
   modelo al 5%, y en fútbol el mercado):
     NBA     moneyline de cierre sin margen (DraftKings vía ESPN) · rama resultados-nba-6t (filas_nba.json)
     NHL/NFL moneyline de cierre sin margen (DraftKings/ESPN BET vía ESPN) · rama datos-nhl-nfl (se actualiza sola cada día)
     Fútbol  1X2 de cierre sin margen (Pinnacle; Bet365 o promedio si falta) · rama resultados-futbol-actual (5 grandes ligas)
     Tenis   el modelo de tenis de OVA (Elo, sin mercado) · rama datos-tenis (preds-tenis.json, se actualiza sola)
     MLB     moneyline de cierre de la rama cierres (scripts/cierres.js, desde 2023; se completa sola en varios días)
   Y se SIGUE ALIMENTANDO SOLA: el archivo de cierres (rama cierres, todos los días: NBA, NHL, NFL y MLB de la temporada en curso)
   y lo que la liga ya calificó (con el mercado guardado ANTES del juego). En NBA/NHL/NFL/MLB se junta por id de ESPN (nada se
   cuenta dos veces); en fútbol y tenis, lo de la liga posterior al último juego del archivo. Lo de la liga se guarda además en
   historia-liga-juegos.json, la memoria PERMANENTE (el registro de la liga borra lo de hace más de 400 días).

   No toca ningún número ni pick de la app: solo dice cuánto se acertó en juegos así.
   Uso: node scripts/historia_liga.js <carpeta con los archivos de datos> <carpeta de la rama liga>
   =================================================================== */
const fs = require('fs'), path = require('path');
const LG = require('./liga.js');                    // zonaDe y pickDe: la MISMA zona que usa la liga en vivo

const MIN_TEMP = 30;                                // una temporada cuenta en el rango «peor/mejor año» con 30+ juegos en la zona

function imp(a) { a = +a; if (!isFinite(a) || a === 0) return null; return a > 0 ? 100 / (a + 100) : -a / (-a + 100); }
/* probabilidad sin margen del local con dos moneylines americanos; null si el precio no tiene sentido */
function sinMargen(mlH, mlA) {
  const x = imp(mlH), y = imp(mlA); if (x === null || y === null) return null;
  const s = x + y; if (s < 0.98 || s > 1.15) return null;   // el mismo filtro de datos_nhl_nfl.js
  return x / s;
}
/* la franja sin el lado (para tenis, donde no hay local real, y para la tabla compacta) */
function bandaDe(p) { const lo = Math.min(Math.floor(p * 20 + 1e-9) * 5, 85); return lo >= 85 ? '85%+' : lo + '-' + (lo + 5) + '%'; }
const LADOS = { L: 'local', A: 'visita', D: 'empate' };

/* una fila = [ts, p del pick, lado L/A/D, acertó 0/1, temporada, id del juego en ESPN (si hay)] */
function fila(ts, probs, res, temp, id) {
  if (!probs || !res) return null;
  const pk = LG.pickDe(probs); if (!(pk.p > 0 && pk.p < 1)) return null;
  const f = [ts, pk.p, pk.lado, pk.lado === res ? 1 : 0, temp]; if (id) f.push(String(id));
  return f;
}
const tempOtoño = y => y + '-' + String((+y + 1) % 100).padStart(2, '0');   // NBA y NHL: la temporada arranca en otoño
const resUS = (hs, as) => (hs > as ? 'L' : (as > hs ? 'A' : null));       // empate en NFL = no cuenta

function deNBA(filas) {
  const out = [];
  (filas || []).forEach(r => {
    if (!r || r.mar == null || !r.mar) return;
    const p = sinMargen(r.mlH, r.mlA); if (p === null) return;
    const f = fila(r.ts, [p, 1 - p, 0], r.mar > 0 ? 'L' : 'A', tempOtoño(r.sk), r.id);
    if (f) out.push(f);
  });
  return out;
}
/* datos-nhl.json / datos-nfl.json y cierres-<dep>.json (scripts/cierres.js): {temps: {año: {juegos: [...]}}} con linea.ml = [local, visita] de cierre */
function deUS(datos, dep) {
  const out = [];
  Object.keys((datos && datos.temps) || {}).forEach(y => {
    if (dep === 'nfl' && String(y) === '2019') return;   // NFL 2019: ESPN guardó líneas EN VIVO (docs/MEDICION-HCAP-TOTAL-2026-11.md)
    ((datos.temps[y] && datos.temps[y].juegos) || []).forEach(g => {
      if (!g || !g.done || g.skip || g.neutral || !g.linea || !g.linea.ml) return;
      const p = sinMargen(g.linea.ml[0], g.linea.ml[1]); if (p === null) return;
      const res = resUS(+g.hs, +g.as); if (!res) return;
      const temp = dep === 'nhl' || dep === 'nba' ? tempOtoño(y) : String(y);   // la llave es el año en que arranca
      const f = fila(g.ts, [p, 1 - p, 0], res, temp, g.id); if (f) out.push(f);
    });
  });
  return out;
}
/* partidos_actual.json: {d, t:'2425', mk:[L,E,V] sin margen, gh, ga} */
function deFutbol(lista) {
  const out = [];
  (lista || []).forEach(r => {
    if (!r || !Array.isArray(r.mk) || r.mk.length !== 3 || r.gh == null || r.ga == null) return;
    const s = r.mk[0] + r.mk[1] + r.mk[2]; if (!(s > 0.97 && s < 1.03)) return;
    const res = r.gh > r.ga ? 'L' : (r.ga > r.gh ? 'A' : 'D'), t = String(r.t || '');
    const f = fila(r.d, [r.mk[0] / s, r.mk[2] / s, r.mk[1] / s], res, t.length === 4 ? '20' + t.slice(0, 2) + '-' + t.slice(2) : t);
    if (f) out.push(f);
  });
  return out;
}
/* preds-tenis.json: pW = lo que daba el modelo al que GANÓ (ts en segundos); sin local de verdad: se guarda como «local» y solo se usa la franja */
function deTenis(lista) {
  const out = [];
  (lista || []).forEach(r => {
    if (!r || r.fin !== 'F' || !(r.pW > 0 && r.pW < 1) || r.pW === 0.5) return;
    const p = Math.max(r.pW, 1 - r.pW), ts = r.ts < 1e11 ? r.ts * 1000 : r.ts;
    out.push([ts, p, 'L', r.pW > 0.5 ? 1 : 0, String(new Date(ts).getUTCFullYear())]);
  });
  return out;
}
/* lo que la liga ya calificó, con lo que dijo el competidor `quien` ANTES del juego; solo después de `desde` (para no contar dos veces) */
function deRegistro(items, dep, quien, desde) {
  const out = [];
  Object.values(items || {}).forEach(it => {
    if (!it || it.dep !== dep || !it.res || it.res === 'X' || !(it.ts > desde)) return;
    const p = it.p && it.p[quien]; if (!p) return;
    const d = new Date(it.ts), y = d.getUTCFullYear(), m = d.getUTCMonth();
    const temp = dep === 'tenis' || dep === 'nfl' || dep === 'mlb' ? String(m < 2 && dep === 'nfl' ? y - 1 : y) : (m >= 7 ? tempOtoño(y) : tempOtoño(y - 1));
    const f = fila(it.ts, p, it.res, temp, it.ext); if (f) out.push(dep === 'tenis' ? [f[0], f[1], 'L', f[3], f[4], f[5]] : f);
  });
  return out;
}

/* juntar: por zona (franja + lado) y por franja sola; con el peor y el mejor año (temporadas con 30+ juegos en esa zona) */
function resumir(filas, conLado) {
  const zonas = {}, bandas = {};
  const meter = (M, k, f) => {
    const c = M[k] || (M[k] = { n: 0, w: 0, s: 0, t: {} });
    c.n++; c.w += f[3]; c.s += f[1];
    const t = c.t[f[4]] || (c.t[f[4]] = [0, 0]); t[0]++; t[1] += f[3];
  };
  filas.forEach(f => {
    if (conLado) meter(zonas, LG.zonaDe({ p: f[1], lado: f[2] }), f);
    meter(bandas, bandaDe(f[1]), f);
  });
  const cerrar = M => {
    const o = {};
    Object.keys(M).sort().forEach(k => {
      const c = M[k], ys = Object.values(c.t).filter(t => t[0] >= MIN_TEMP).map(t => 100 * t[1] / t[0]);
      o[k] = [c.n, c.w, +(100 * c.s / c.n).toFixed(1)].concat(ys.length >= 2 ? [Math.round(Math.min(...ys)), Math.round(Math.max(...ys))] : []);
    });
    return o;
  };
  return { zonas: conLado ? cerrar(zonas) : {}, bandas: cerrar(bandas) };
}
const FUENTE = {
  nba: 'el favorito del mercado al cierre', nhl: 'el favorito del mercado al cierre', nfl: 'el favorito del mercado al cierre',
  mlb: 'el favorito del mercado al cierre',
  futbol: 'el favorito del mercado al cierre (Pinnacle)', tenis: 'el favorito del modelo de tenis de OVA'
};
const US = { nba: 1, nhl: 1, nfl: 1, mlb: 1 };
/* MEMORIA PERMANENTE de la liga: liga-registro.json borra lo calificado de hace más de 400 días; aquí se guarda para siempre
   (historia-liga-juegos.json en la rama liga): {'dep|id': fila}. Solo lo que dijo el competidor ANTES del juego. */
function memoria(prev, items) {
  const M = Object.assign({}, prev || {}), QUIEN = { nba: 'mercado', nhl: 'mercado', nfl: 'mercado', mlb: 'mercado', futbol: 'mercado', tenis: 'modelo' };
  Object.keys(QUIEN).forEach(dep => deRegistro(items, dep, QUIEN[dep], 0).forEach(f => { M[dep + '|' + f[5]] = f; }));
  return M;
}
/* juntar fuentes sin contar dos veces: en NBA/NHL/NFL/MLB por id de ESPN (manda la primera fuente: el archivo de cierre);
   en fútbol y tenis (otras fuentes, otros ids) solo lo de la liga posterior al último juego del archivo */
function juntarFuentes(dep, listas) {
  if (US[dep]) {
    const m = new Map(), sinId = [];
    listas.forEach(l => l.forEach(f => { if (!f[5]) sinId.push(f); else if (!m.has(f[5])) m.set(f[5], f); }));
    return [...m.values()].concat(sinId);
  }
  const base = listas[0] || [], ult = base.reduce((x, f) => Math.max(x, f[0]), 0);
  return base.concat(...listas.slice(1).map(l => l.filter(f => f[0] > ult + 6 * 3600e3)));
}
function armarDeporte(dep, filas) {
  if (!filas.length) return null;
  filas.sort((a, b) => a[0] - b[0]);
  const temps = [...new Set(filas.map(f => f[4]))];
  const r = resumir(filas, dep !== 'tenis');
  const w = filas.reduce((t, f) => t + f[3], 0);
  return { fuente: FUENTE[dep], desde: new Date(filas[0][0]).toISOString().slice(0, 10), hasta: new Date(filas[filas.length - 1][0]).toISOString().slice(0, 10),
    temporadas: temps.length, n: filas.length, w: w, pct: +(100 * w / filas.length).toFixed(1), zonas: r.zonas, bandas: r.bandas };
}
/* fuentes: {nba:[filas_nba], nhl:datos, nfl:datos, futbol:[partidos], tenis:[preds], cierres:{nba,nhl,nfl,mlb}}; items: liga-registro.json → items;
   prevMem: historia-liga-juegos.json. Devuelve la historia y la memoria permanente actualizada. */
function armar(fuentes, items, ahora, prevMem) {
  const C = fuentes.cierres || {};
  const base = {
    nba: deNBA(fuentes.nba), nhl: deUS(fuentes.nhl, 'nhl'), nfl: deUS(fuentes.nfl, 'nfl'), mlb: [],
    futbol: deFutbol(fuentes.futbol), tenis: deTenis(fuentes.tenis)
  };
  const mem = memoria(prevMem, items), vivos = {}, out = { v: 1, generado: new Date(ahora || Date.now()).toISOString(), minTemp: MIN_TEMP, deportes: {} };
  Object.keys(base).forEach(dep => {
    const ci = US[dep] ? deUS(C[dep], dep) : [];
    const liga = Object.keys(mem).filter(k => k.indexOf(dep + '|') === 0).map(k => mem[k]);
    const filas = juntarFuentes(dep, [base[dep], ci, liga]);
    vivos[dep] = filas.filter(f => liga.indexOf(f) >= 0).length;
    const x = armarDeporte(dep, filas);
    if (x) { x.deLaLiga = vivos[dep]; x.deCierres = ci.length; out.deportes[dep] = x; }
  });
  out.memoria = Object.keys(mem).length;
  return { H: out, mem };
}
/* para la liga y la app: la historia de una zona; en tenis (o si la zona no tiene lado en la historia) se usa la franja */
function deZona(H, dep, zona) {
  const h = H && H.deportes && H.deportes[dep]; if (!h || !zona) return null;
  const z = h.zonas && h.zonas[zona]; if (z) return z;
  return (h.bandas && h.bandas[String(zona).split(' · ')[0]]) || null;
}

module.exports = { sinMargen, bandaDe, fila, deNBA, deUS, deFutbol, deTenis, deRegistro, memoria, juntarFuentes, resumir, armar, deZona, LADOS };
if (require.main !== module) return;

const src = process.argv[2] || 'datos-historia', dir = process.argv[3] || 'salida-liga';
const leer = f => { try { return JSON.parse(fs.readFileSync(path.join(src, f), 'utf8')); } catch (e) { console.log('no se pudo leer ' + f + ': ' + e.message); return null; } };
let items = {}, prevMem = {};
try { items = JSON.parse(fs.readFileSync(path.join(dir, 'liga-registro.json'), 'utf8')).items || {}; } catch (e) { console.log('sin liga-registro.json'); }
try { prevMem = JSON.parse(fs.readFileSync(path.join(dir, 'historia-liga-juegos.json'), 'utf8')).juegos || {}; } catch (e) { console.log('sin memoria permanente todavía (se crea ahora)'); }
const R = armar({ nba: leer('filas_nba.json'), nhl: leer('datos-nhl.json'), nfl: leer('datos-nfl.json'), futbol: leer('partidos_actual.json'), tenis: leer('preds-tenis.json'),
  cierres: { nba: leer('cierres-nba.json'), nhl: leer('cierres-nhl.json'), nfl: leer('cierres-nfl.json'), mlb: leer('cierres-mlb.json') } }, items, Date.now(), prevMem);
const H = R.H;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'historia.json'), JSON.stringify(H));
fs.writeFileSync(path.join(dir, 'historia-liga-juegos.json'), JSON.stringify({ v: 1, generado: H.generado, juegos: R.mem }));
console.log('memoria permanente de la liga: ' + H.memoria + ' juegos');
Object.keys(H.deportes).forEach(dep => {
  const x = H.deportes[dep];
  console.log(dep + ': ' + x.n + ' juegos (' + x.desde + ' a ' + x.hasta + ', ' + x.temporadas + ' temporadas, ' + x.deCierres + ' del archivo de cierres, ' + x.deLaLiga + ' de la liga) · el favorito acertó ' + x.pct + '%');
  Object.keys(x.bandas).forEach(b => { const c = x.bandas[b]; if (c[0] >= 30) console.log('   ' + b.padEnd(8) + String(c[0]).padStart(6) + ' juegos · real ' + (100 * c[1] / c[0]).toFixed(1) + '% · decía ' + c[2] + '%' + (c.length > 3 ? ' · años ' + c[3] + '–' + c[4] + '%' : '')); });
});
