/* ===================================================================
   LESIONADOS NBA, NHL Y NFL (GitHub Actions, Node 20+)  ·  sin llave, ESPN publico
   Baja la lista de lesionados de ESPN (que pesa 1-9 MB) y la deja en un archivo chico por deporte (lesiones-<dep>.json):
     equipos: { "Boston Celtics": { id, l: [ {n, p, s, d, f, c, r} ] } }   n = jugador, p = posicion, s = estado (Out, Doubtful, Questionable, ...),
                                                                         d = lesion, f = cuando lo reporto ESPN, c = comentario corto, r = fecha de regreso
     juegan: [ {t, h, a} ]   los juegos de las proximas 36 h (para saber de quien importan los lesionados)
   La app lo lee desde la rama «datos» (no ensucia main). Si existe NTFY_TOPIC manda un aviso por corrida con los cambios de portero (NHL) y otro con los Out / Doubtful
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
    const g = { t: e.date, h: h.team.displayName, a: a.team.displayName };
    const gk = x => { const p = (x.probables || []).find(q => /startinggoalie/i.test(q.name || '')); return p && p.athlete ? (p.athlete.displayName || p.athlete.fullName || null) : null; };   // solo hockey
    const gh = gk(h), ga = gk(a); if (gh) g.gh = gh; if (ga) g.ga = ga;
    out.push(g);
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

/* portero titular que cambió entre dos corridas (mismo juego, otro nombre). Se arrastra el cambio hasta que el juego empieza.
   prev / ahora = listas de juegos [{t,h,a,gh,ga,cambios?}] -> devuelve la lista nueva con .cambios [{eq,antes,ahora}] y los cambios recién detectados */
function cambiosPortero(prev, ahora) {
  const clave = g => g.h + '|' + g.a + '|' + String(g.t).slice(0, 10);
  const viejo = {}; (prev || []).forEach(g => { viejo[clave(g)] = g; });
  const nuevosC = [];
  ahora.forEach(g => {
    const v = viejo[clave(g)]; if (!v) return;
    const cs = [];
    [['gh', 'h'], ['ga', 'a']].forEach(([k, lado]) => {
      const antes = v[k], ya = g[k]; if (!antes || !ya) return;
      const heredado = (v.cambios || []).find(c => c.eq === g[lado]);
      if (antes !== ya) { const c = { eq: g[lado], antes: antes, ahora: ya }; cs.push(c); nuevosC.push(Object.assign({ juego: g.a + ' @ ' + g.h }, c)); }
      else if (heredado && heredado.ahora === ya) cs.push(heredado);
    });
    if (cs.length) g.cambios = cs;
  });
  return nuevosC;
}
function mensajePortero(lista) {
  return { titulo: '🥅 NHL: cambió el portero (' + lista.length + ')', cuerpo: lista.slice(0, 10).map(c => '• ' + c.juego + ': ' + c.eq + ' ' + c.antes + ' → ' + c.ahora).join('\n') };
}
/* LINEAS DE ANTES DEL JUEGO. ESPN quita las cuotas del marcador en cuanto el juego empieza, y la app se quedaba «sin precio del mercado»
   justo cuando mas la miras. El robot guarda la linea (cierre) de cada juego que aun no empieza y la conserva 3 dias.
   recortaOdds deja solo lo que lee parseOdds de las apps (cuotas, linea, total) para que el archivo sea chico. */
function recortaOdds(o) {
  if (!o || typeof o !== 'object') return null;
  const r = {};
  ['details', 'overUnder', 'spread'].forEach(k => { if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; });
  ['homeTeamOdds', 'awayTeamOdds'].forEach(k => { if (o[k]) { const x = {}; if (o[k].favorite !== undefined) x.favorite = o[k].favorite; if (o[k].moneyLine !== undefined) x.moneyLine = o[k].moneyLine; r[k] = x; } });
  ['moneyline', 'pointSpread', 'total'].forEach(k => {
    if (!o[k]) return; const m = {};
    ['home', 'away', 'over', 'under'].forEach(lado => {
      const v = o[k][lado]; if (!v) return; const q = {};
      ['close', 'current', 'open'].forEach(f => { if (v[f]) { const z = {}; if (v[f].odds !== undefined) z.odds = v[f].odds; if (v[f].line !== undefined) z.line = v[f].line; q[f] = z; } });
      if (Object.keys(q).length) m[lado] = q;
    });
    if (Object.keys(m).length) r[k] = m;
  });
  return Object.keys(r).length ? r : null;
}
/* marcador de ESPN -> { idDelJuego: {t, o} } solo de los juegos que NO han empezado y traen cuotas */
function snapOdds(j) {
  const out = {};
  ((j && j.events) || []).forEach(e => {
    const st = e.status && e.status.type; if (!st || st.state !== 'pre') return;
    const c = e.competitions && e.competitions[0]; const o = c && c.odds && c.odds[0] && recortaOdds(c.odds[0]);
    if (o && e.id != null) out[String(e.id)] = { t: e.date, o: o };
  });
  return out;
}
/* lo guardado antes + lo nuevo; se queda con lo de los ultimos 3 dias (un juego que ya empezo conserva su linea hasta que termina el dia siguiente) */
function unirOdds(prev, nuevo, ahora) {
  const res = {};
  Object.keys((prev && prev.juegos) || {}).forEach(id => { const v = prev.juegos[id]; if (v && Date.parse(v.t) > ahora - 3 * 864e5) res[id] = v; });
  Object.keys(nuevo || {}).forEach(id => { res[id] = nuevo[id]; });
  return res;
}
module.exports = { compactar, armar, juegosDe, nuevos, mensaje, recorta, cambiosPortero, mensajePortero, recortaOdds, snapOdds, unirOdds };
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
    const juegan = []; let lineas = {};
    for (const k of [0, 1, 2, 3, 4, 5, 6]) {
      const m = await pedir(BASE + DEPS[dep] + '/scoreboard?dates=' + diaStr(ahora + k * 864e5), 2);
      if (k <= 2) juegosDe(m).forEach(g => { if (Date.parse(g.t) <= ahora + 36 * 36e5) juegan.push(g); });
      Object.assign(lineas, snapOdds(m));
    }
    const prevOdds = await pedir(PREV + 'odds-' + dep + '.json', 2);
    const odds = unirOdds(prevOdds, lineas, ahora);
    fs.writeFileSync('salida/odds-' + dep + '.json', JSON.stringify({ v: 1, dep: dep, generado: iso(ahora), juegos: odds }));
    console.log(dep + ': ' + Object.keys(lineas).length + ' lineas nuevas · ' + Object.keys(odds).length + ' guardadas');
    const prev = await pedir(PREV + 'lesiones-' + dep + '.json', 2);
    const nu = nuevos(prev, eq, juegan);
    const cp = dep === 'nhl' ? cambiosPortero(prev && prev.juegan, juegan) : [];
    const n = Object.keys(eq).reduce((a, k) => a + eq[k].l.length, 0);
    fs.writeFileSync('salida/lesiones-' + dep + '.json', JSON.stringify({ v: 1, dep: dep, generado: iso(ahora), equipos: eq, juegan: juegan }));
    console.log(dep + ': ' + Object.keys(eq).length + ' equipos · ' + n + ' lesionados · ' + juegan.length + ' juegos proximos · ' + nu.length + ' nuevos Out/Doubtful' + (prev ? '' : ' (primera vez: no avisa)'));
    if (cp.length) { const ok = await avisar(mensajePortero(cp)); console.log('  ' + cp.length + ' cambios de portero · aviso ' + (NTFY ? (ok ? 'enviado' : 'FALLO') : 'omitido (sin NTFY_TOPIC)')); }
    if (nu.length) { const ok = await avisar(mensaje(dep, nu)); console.log('  aviso ' + (NTFY ? (ok ? 'enviado' : 'FALLO') : 'omitido (sin NTFY_TOPIC)')); }
    hubo++;
  }
  if (!hubo) { console.log('Nada que guardar'); }
})();
