'use strict';
/* ===================================================================
   OVA · LIGA: avisos al teléfono, vigilante de los robots y detective de fallos (los usa scripts/liga.js en cada vuelta).

   1) AVISOS (ntfy, mismo tema privado NTFY_TOPIC que ya usan los avisos de MLB, lesionados y Pinnacle). UNA vez cada cosa:
      · pick fuerte: el titular escoge un lado en una zona donde la liga YA demostró que acierta (30+ juegos y 65%+), y el juego
        empieza en menos de 3 horas;
      · cambio de titular en un deporte;
      · una idea medida entra o sale de la liga;
      · el vigilante encontró un robot o una fuente caída (una vez al día por problema).
      Sin NTFY_TOPIC no se manda nada (nunca a un tema público).
   2) VIGILANTE: revisa que los archivos de los otros robots estén al día (Pinnacle, Polymarket, Kalshi, lesionados, archivos
      de NHL/NFL, fuerza de copas) y que ESPN y los modelos de afuera respondan. Lo deja en liga.json → salud.
   3) DETECTIVE: con los juegos ya calificados, busca grupos donde el titular acierta CLARAMENTE menos de lo que decía
      (por deporte, liga, equipo favorito, local/visita, franja, día y hora). Solo reporta grupos con 15+ juegos y z ≤ −2.5
      (con tantos grupos alguno sale por pura suerte: es una pista para la fábrica, no una verdad).
      Lo deja en liga.json → detective (lo muestra Herramientas → 🏆 Liga).
   =================================================================== */
const D = 864e5, H = 3600e3;
const RAW = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/';

/* ---------- avisos ---------- */
function avisosPendientes(liga, previo, enviados, ahora) {
  const out = [], min = (liga.reglas && liga.reglas.CONF_MIN) || 30, nom = k => (liga.nombres && liga.nombres[k]) || k;
  const dn = k => (liga.deportes && liga.deportes[k] && liga.deportes[k].nombre) || k;
  (liga.proximos || []).forEach(x => {
    const k = 'pick|' + x.dep + '|' + x.ext; if (enviados[k]) return;
    if (!(x.ts > ahora && x.ts - ahora <= 3 * H) || x.zn < min) return;
    const pct = 100 * x.zw / x.zn; if (pct < 65) return;
    const quien = x.pick === 'L' ? x.local : (x.pick === 'A' ? x.visita : 'Empate');
    const hora = new Date(x.ts).toLocaleTimeString('es', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
    out.push({ k: k, titulo: '🏆 ' + dn(x.dep) + ' · pick fuerte', prioridad: 'high',
      texto: quien + ' ' + Math.round(x.p * 100) + '% (' + x.local + ' vs ' + x.visita + ', ' + hora + ')\n' +
        'Titular: ' + nom(x.tit) + '. En juegos así (' + x.zona + ') viene acertando ' + Math.round(pct) + '% (' + x.zw + ' de ' + x.zn + ').' });
  });
  (liga.cambios || []).forEach(c => {
    const k = 'cambio|' + c.fecha + '|' + c.dep; if (enviados[k]) return;
    if (ahora - Date.parse(c.fecha) > 2 * D) return;
    out.push({ k: k, titulo: '🏆 ' + dn(c.dep) + ': nuevo titular', texto: 'Sale ' + nom(c.sale) + ', entra ' + nom(c.entra) + '.\n' + c.detalle });
  });
  const IDEA = { nba_viajes: 'NBA · viajes y altura', futbol_descanso: 'Fútbol · cansancio', nfl_epa: 'NFL · EPA por jugada' };
  Object.keys(liga.mediciones || {}).forEach(id => {
    const ahoraE = !!liga.mediciones[id].entra, antes = previo && previo.mediciones && previo.mediciones[id] ? !!previo.mediciones[id].entra : null;
    if (antes === null || antes === ahoraE) return;
    const k = 'idea|' + id + '|' + ahoraE + '|' + new Date(ahora).toISOString().slice(0, 10); if (enviados[k]) return;
    out.push({ k: k, titulo: '🧪 ' + (IDEA[id] || id), texto: ahoraE ? 'Pasó la medición y entra a la liga como suplente.' : 'Dejó de pasar la medición: sale de la liga.' });
  });
  ((liga.salud && liga.salud.problemas) || []).forEach(p => {
    const k = 'salud|' + p.id + '|' + new Date(ahora).toISOString().slice(0, 10); if (enviados[k]) return;
    out.push({ k: k, titulo: '⚠️ Robot OVA', texto: p.txt });
  });
  return out;
}
async function enviar(avisos, tema) {
  const ok = [];
  for (const a of avisos) {
    try {
      const r = await fetch('https://ntfy.sh/' + encodeURIComponent(tema), { method: 'POST',
        headers: { Title: a.titulo, Priority: a.prioridad || 'default', Tags: 'trophy', 'Content-Type': 'text/plain; charset=utf-8' }, body: a.texto });
      if (r.ok) ok.push(a.k);
    } catch (e) { }
  }
  return ok;
}

/* ---------- vigilante ---------- */
/* [id, nombre, url, horas máximas, meses en que aplica (null = siempre)] */
const VIGILAR = [
  ['pin-fut', 'Pinnacle fútbol', 'main/pinnacle-futbol.json', 36, null],
  ['pin-nba', 'Pinnacle NBA', 'main/pinnacle-nba.json', 36, [10, 11, 12, 1, 2, 3, 4, 5, 6]],
  ['pin-nhl', 'Pinnacle NHL', 'main/pinnacle-nhl.json', 48, [10, 11, 12, 1, 2, 3, 4, 5, 6]],
  ['pin-nfl', 'Pinnacle NFL', 'main/pinnacle-nfl.json', 8 * 24, [9, 10, 11, 12, 1, 2]],
  ['pin-mlb', 'Pinnacle MLB', 'main/pinnacle-datos.json', 36, [4, 5, 6, 7, 8, 9]],
  // GitHub atrasa mucho los relojes frecuentes (21-nov-2026: «cada 10 min» corría cada 6-8 h); aquí solo se avisa si de verdad se murió
  ['pred-nba', 'Polymarket', 'pred/pred-nba.json', 12, [10, 11, 12, 1, 2, 3, 4, 5, 6]],
  ['kal-nba', 'Kalshi', 'kalshi/kalshi-nba.json', 12, [10, 11, 12, 1, 2, 3, 4, 5, 6]],
  ['liga', 'Liga de modelos', 'liga/liga.json', 12, null],
  ['les-nba', 'Lesionados', 'datos/lesiones-nba.json', 9, null],
  ['hist-nhl', 'Archivo NHL', 'main/hist-nhl.json', 40, [10, 11, 12, 1, 2, 3, 4, 5, 6]],
  ['hist-nfl', 'Archivo NFL', 'main/hist-nfl.json', 8 * 24, [9, 10, 11, 12, 1, 2]],
  ['copas', 'Fuerza de copas', 'main/fuerza-copas.json', 40, null],
];
async function vigilar(ahora, extraProblemas) {
  const mes = new Date(ahora).getUTCMonth() + 1, filas = [], problemas = [];
  await Promise.all(VIGILAR.map(async ([id, nombre, url, horas, meses]) => {
    if (meses && meses.indexOf(mes) < 0) { filas.push({ id, nombre, estado: 'fuera de temporada' }); return; }
    let g = null;
    try { const r = await fetch(RAW + url + '?t=' + ahora); if (r.ok) { const j = await r.json(); g = Date.parse(j.generado || j.actualizado); } } catch (e) { }
    if (!isFinite(g)) { filas.push({ id, nombre, estado: 'no responde' }); problemas.push({ id, txt: nombre + ': el archivo no responde (' + url + ').' }); return; }
    const hrs = (ahora - g) / H;
    filas.push({ id, nombre, estado: hrs <= horas ? 'al día' : 'viejo', horas: +hrs.toFixed(1) });
    if (hrs > horas) problemas.push({ id, txt: nombre + ': lleva ' + Math.round(hrs) + ' h sin actualizarse (lo normal es menos de ' + horas + ' h).' });
  }));
  (extraProblemas || []).forEach(p => problemas.push(p));
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { revisado: new Date(ahora).toISOString(), filas, problemas };
}

/* ---------- detective ---------- */
function detective(items, tabla) {
  const grupos = {}, add = (k, it, pk) => {
    const g = grupos[k] || (grupos[k] = { juegos: 0, aciertos: 0, dice: 0 });
    g.juegos++; if (pk.lado === it.res) g.aciertos++; g.dice += pk.p;
  };
  const pick = p => { const i = p[2] > p[0] && p[2] > p[1] ? 2 : (p[0] >= p[1] ? 0 : 1); return { lado: 'LAD'[i], p: p[i] }; };
  items.forEach(it => {
    if (!it.res || it.res === 'X' || !tabla[it.dep]) return;
    const tit = tabla[it.dep].titular, p = it.p[tit]; if (!p) return;
    const pk = pick(p), fav = pk.lado === 'L' ? it.local : (pk.lado === 'A' ? it.visita : null), riv = pk.lado === 'L' ? it.visita : it.local;
    const d = new Date(it.ts), dia = d.toLocaleDateString('es', { timeZone: 'America/Chicago', weekday: 'long' });
    const hr = +d.toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false });
    const fr = pk.p >= 0.7 ? '70%+' : (pk.p >= 0.6 ? '60-70%' : 'menos de 60%');
    const base = it.dep + ' · ';
    add(base + 'favorito ' + (pk.lado === 'L' ? 'local' : pk.lado === 'A' ? 'visita' : 'empate'), it, pk);
    add(base + 'favorito ' + fr, it, pk);
    add(base + 'los ' + dia, it, pk);
    add(base + (hr < 15 ? 'de día' : hr < 19 ? 'de tarde' : 'de noche'), it, pk);
    if (it.ruta && it.dep === 'futbol') add(base + it.ruta.replace('soccer/', ''), it, pk);
    if (fav) add(base + 'cuando ' + fav + ' es favorito', it, pk);
    if (riv) add(base + 'contra ' + riv + ' (de no favorito)', it, pk);
  });
  const out = [];
  Object.keys(grupos).forEach(k => {
    const g = grupos[k]; if (g.juegos < 15) return;
    const esp = g.dice, v = esp - (g.dice * g.dice) / g.juegos;         // varianza aproximada de aciertos si el % fuera justo
    const z = (g.aciertos - esp) / Math.sqrt(Math.max(v, 1e-6));
    if (z <= -2.5) out.push({ grupo: k, juegos: g.juegos, aciertos: g.aciertos, real: +(100 * g.aciertos / g.juegos).toFixed(1), decia: +(100 * g.dice / g.juegos).toFixed(1), z: +z.toFixed(2) });
  });
  return out.sort((a, b) => a.z - b.z).slice(0, 20);
}

module.exports = { avisosPendientes, enviar, vigilar, detective, VIGILAR };
