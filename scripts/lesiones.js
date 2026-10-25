/* ===================================================================
   LESIONADOS NBA, NHL Y NFL (GitHub Actions, Node 20+)  ·  sin llave, ESPN publico
   Baja la lista de lesionados de ESPN (que pesa 1-9 MB) y la deja en un archivo chico por deporte (lesiones-<dep>.json):
     equipos: { "Boston Celtics": { id, l: [ {n, p, s, d, f, c, r} ] } }   n = jugador, p = posicion, s = estado (Out, Doubtful, Questionable, ...),
                                                                         d = lesion, f = cuando lo reporto ESPN, c = comentario corto, r = fecha de regreso
     juegan: [ {t, h, a} ]   los juegos de las proximas 36 h (para saber de quien importan los lesionados)
   La app lo lee desde la rama «datos» (no ensucia main). Si existe NTFY_TOPIC manda UN aviso por corrida con los Out / Doubtful
   NUEVOS de equipos que juegan hoy o manana (la primera vez solo anota, no avisa).
   Las funciones puras se exportan para las pruebas (pruebas.js).
   =================================================================== */
const fs = require('fs');
const ENV = process.env;
const NTFY = (ENV.NTFY_TOPIC || '').trim();
const BASE = ENV.ESPN_BASE || 'https://site.api.espn.com/apis/site/v2/sports/';
const PREV = ENV.PREV_BASE || 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/datos/';
const DEPS = { nba: 'basketball/nba', nhl: 'hockey/nhl', nfl: 'football/nfl' };
const GRAVE = { 'out': 1, 'injured reserve': 1, 'suspension': 2, 'doubtful': 2, 'questionable': 3, 'day-to-day': 3 };   // orden: 1 = fuera, 2 = dudoso fuerte, 3 = dudoso
const AVISA = /^(out|doubtful)$/i;

function iso(ms) { return new Date(ms).toISOString(); }
function diaStr(ms) { return iso(ms).slice(0, 10).replace(/-/g, ''); }
function recorta(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; }

/* una entrada de ESPN -> forma compacta (o null si esta activo / no sirve) */
function compactar(x) {
  if (!x || !x.athlete) return null;
  const s = String(x.status || (x.type && x.type.description) || '').trim();
  if (!s || /^active$/i.test(s)) return null;
  const d = x.details || {};
  const det = [d.type && d.type !== 'Not Specified' ? d.type : '', d.detail && d.detail !== 'Not Specified' ? d.detail : ''].filter(Boolean).join(' · ');
  const o = { n: x.athlete.displayName || x.athlete.fullName || '', p: (x.athlete.position && x.athlete.position.abbreviation) || '', s: s, d: recorta(det, 40), f: x.date || '', c: /^[a-z -]{1,16}$/i.test(String(x.shortComment || '').trim()) ? '' : recorta(x.shortComment, 120) };
  if (d.returnDate) o.r = d.returnDate;
  return o.n ? o : null;
}
/* lista de ESPN -> {equipo: {id, l:[...]}} ordenada: primero los que estan fuera, y dentro de cada grupo lo mas reciente */
function armar(j) {
  const eq = {};
  ((j && j.injuries) || []).forEach(t => {
    const nom = t.displayName || t.name; if (!nom) return;
    const l = (t.injuries || []).map(compactar).filter(Boolean);
    l.sort((a, b) => ((GRAVE[a.s.toLowerCase()] || 4) - (GRAVE[b.s.toLowerCase()] || 4)) || String(b.f).localeCompare(String(a.f)));
    eq[nom] = { id: String(t.id || ''), l: l };
  });
  return eq;
}
/* marcador de ESPN -> [{t,h,a}] de los juegos que aun no empiezan o van en curso */
function juegosDe(j) {
  const out = [];
  ((j && j.events) || []).forEach(e => {
    const c = e.competitions && e.competitions[0]; if (!c || !c.competitors) return;
    let h = null, a = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
    if (!h || !a || !h.team || !a.team) return;
    const st = (e.status && e.status.type) || {}; if (st.completed) return;
    out.push({ t: e.date, h: h.team.displayName, a: a.team.displayName });
  });
  return out;
}
/* lo nuevo: Out / Doubtful que no estaban en la lista anterior, de equipos que juegan */
function nuevos(prev, eq, juegan) {
  if (!prev || !prev.equipos) return [];
  const juega = new Set(); (juegan || []).forEach(g => { juega.add(g.h); juega.add(g.a); });
  const res = [];
  Object.keys(eq).forEach(nom => {
    if (!juega.has(nom)) return;
    const antes = {}; ((prev.equipos[nom] && prev.equipos[nom].l) || []).forEach(x => { antes[x.n] = x.s; });
    eq[nom].l.forEach(x => { if (AVISA.test(x.s) && antes[x.n] !== x.s) res.push({ eq: nom, n: x.n, p: x.p, s: x.s, d: x.d }); });
  });
  return res;
}
function mensaje(dep, lista) {
  const L = lista.slice(0, 10).map(x => '• ' + x.eq + ': ' + x.n + (x.p ? ' (' + x.p + ')' : '') + ' — ' + x.s + (x.d ? ' · ' + x.d : ''));
  if (lista.length > 10) L.push('… y ' + (lista.length - 10) + ' más');
  return { titulo: '🩹 ' + dep.toUpperCase() + ': lesionados nuevos (' + lista.length + ')', cuerpo: L.join('\n') };
}
module.exports = { compactar, armar, juegosDe, nuevos, mensaje, recorta };
if (require.main !== module) return;

async function pedir(url, intentos) {
  for (let i = 0; i < (intentos || 3); i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'ova-lesiones' } }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) { }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}
async function avisar(m) {
  if (!NTFY) return true;
  const titulo = m.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim() || 'Lesionados';   // los encabezados HTTP van en ASCII
  try { const r = await fetch('https://ntfy.sh/' + encodeURIComponent(NTFY), { method: 'POST', headers: { Title: titulo, Tags: 'adhesive_bandage' }, body: m.cuerpo }); return r.ok; } catch (e) { return false; }
}
(async () => {
  const solo = (ENV.SOLO || 'nba,nhl,nfl').split(',');
  const ahora = Date.now(); fs.mkdirSync('salida', { recursive: true }); let hubo = 0;
  for (const dep of Object.keys(DEPS)) {
    if (!solo.includes(dep)) continue;
    const j = await pedir(BASE + DEPS[dep] + '/injuries'); if (!j) { console.log(dep + ': ESPN no devolvio lesionados; se deja el archivo anterior'); continue; }
    const eq = armar(j);
    const juegan = []; for (const k of [0, 1, 2]) { const m = await pedir(BASE + DEPS[dep] + '/scoreboard?dates=' + diaStr(ahora + k * 864e5), 2); juegosDe(m).forEach(g => { if (Date.parse(g.t) <= ahora + 36 * 36e5) juegan.push(g); }); }
    const prev = await pedir(PREV + 'lesiones-' + dep + '.json', 2);
    const nu = nuevos(prev, eq, juegan);
    const n = Object.keys(eq).reduce((a, k) => a + eq[k].l.length, 0);
    fs.writeFileSync('salida/lesiones-' + dep + '.json', JSON.stringify({ v: 1, dep: dep, generado: iso(ahora), equipos: eq, juegan: juegan }));
    console.log(dep + ': ' + Object.keys(eq).length + ' equipos · ' + n + ' lesionados · ' + juegan.length + ' juegos proximos · ' + nu.length + ' nuevos Out/Doubtful' + (prev ? '' : ' (primera vez: no avisa)'));
    if (nu.length) { const ok = await avisar(mensaje(dep, nu)); console.log('  aviso ' + (NTFY ? (ok ? 'enviado' : 'FALLO') : 'omitido (sin NTFY_TOPIC)')); }
    hubo++;
  }
  if (!hubo) { console.log('Nada que guardar'); }
})();
