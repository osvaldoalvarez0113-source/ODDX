/* ===================================================================
   RESUMEN DE LA MAÑANA (GitHub Actions, Node 20+)  ·  idea de Osvaldo 25-nov-2026
   Un solo aviso por ntfy que junta lo que ya se midió que sirve, para los juegos de las próximas 20 h:
     ✅ Coinciden: el favorito del mercado (55%+) es el mismo que escoge el Modelo OVA y la ficha de TIGRE le da 💪 +1 o más,
        y no tiene una baja que pesa (robot de lesionados). Medido en TIGRE: la ficha 💪 +1 gana ~4 pts más que su cuota.
     👎 Evita: la ficha de TIGRE va en contra del favorito del mercado (puntaje negativo). Medido: esas señales ganan ~8 pts menos.
     📊 La racha engaña (NBA): el no favorito viene 2+ victorias mejor en los últimos 10 → el favorito es más seguro (forma.js).
     🚑 Bajas que pesan de las últimas 36 h.
   Lee: TIGRE (rama datos, hoy.json), la liga de ODDX (liga-registro.json), lesiones-*.json (rama datos) y cierres-nba.json.
   Solo lee: no toca la app ni los otros robots. Las funciones puras se exportan para las pruebas (pruebas.js).
   =================================================================== */
const ENV = process.env;
const NTFY = (ENV.NTFY_TOPIC || '').trim();
const RAW = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/';
const URL = {
  tigre: ENV.TIGRE_URL || RAW + 'TIGRE/datos/hoy.json',
  liga: ENV.LIGA_URL || RAW + 'ODDX/liga/liga-registro.json',
  les: dep => (ENV.DATOS_BASE || RAW + 'ODDX/datos/') + 'lesiones-' + dep + '.json',
  cierres: ENV.CIERRES_URL || RAW + 'ODDX/cierres/cierres-nba.json'
};
const HORAS = parseFloat(ENV.HORAS || '20'), FAV = 0.55;
const NOMDEP = { nba: 'NBA', nhl: 'NHL', nfl: 'NFL', ncaab: 'NCAA Básquet', ncaaf: 'NCAA Fútbol', ucl: 'Champions', uel: 'Europa League', eng: 'Premier', esp: 'LaLiga', ita: 'Serie A', ger: 'Bundesliga', fra: 'Ligue 1', mls: 'MLS', mex: 'Liga MX' };

function hora(ts) { try { return new Date(ts).toLocaleTimeString('es-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
function dia(ts) { try { return new Date(ts).toLocaleDateString('es-US', { timeZone: 'America/Chicago', weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
function pct(x) { return Math.round(x * 100) + '%'; }

/* favorito del mercado en un juego de TIGRE: p = [local, visita] o [local, empate, visita] */
function favorito(j) {
  const p = j && j.m && j.m.ml && j.m.ml.p; if (!p || p.length < 2) return null;
  const pH = p[0], pA = p.length === 3 ? p[2] : p[1];
  if (!(pH > 0) || !(pA > 0)) return null;
  return pH >= pA ? { lado: 0, p: pH, eq: j.h, rival: j.a } : { lado: 1, p: pA, eq: j.a, rival: j.h };
}
/* el Modelo OVA (liga-registro: p.modelo = [local, visita, empate]) ¿escoge el mismo lado? */
function ladoModelo(it) {
  const m = it && it.p && (it.p.modelo || it.p['modelo-solo']); if (!m) return null;
  return { lado: m[0] >= m[1] ? 0 : 1, p: Math.max(m[0], m[1]) };
}
/* ficha de TIGRE del ganador: el lado que nombra y su puntaje */
function ladoFicha(j) {
  const f = j && j.ficha && j.ficha.ml; if (!f || f.puntaje == null) return null;
  const n = String(f.quien || '');
  const lado = n === (j.h && j.h.n) ? 0 : (n === (j.a && j.a.n) ? 1 : null);
  return lado === null ? null : { lado: lado, puntaje: f.puntaje };
}
/* últimos 10 de la temporada en curso por abreviatura, con el archivo de cierres de ESPN (temps -> juegos) */
function ultimos10(cierres, antesDe) {
  const T = (cierres && cierres.temps) || {}, sk = Object.keys(T).sort().pop(); if (!sk) return {};
  const G = (T[sk].juegos || []).filter(g => g.done && !g.skip && g.ty !== 1 && g.ts < antesDe && g.hs !== g.as).sort((a, b) => a.ts - b.ts);
  const h = {};
  G.forEach(g => { [[g.abH, g.hs > g.as], [g.abA, g.as > g.hs]].forEach(([ab, w]) => { (h[ab] = h[ab] || []).push(w ? 1 : 0); }); });
  const out = {}; Object.keys(h).forEach(ab => { const u = h[ab].slice(-10); if (u.length === 10) out[ab] = u.reduce((a, b) => a + b, 0); });
  return out;
}
function nombreLargo(it, lado, j) { return it ? (lado === 0 ? it.local : it.visita) : ((lado === 0 ? j.h : j.a) || {}).n || ''; }
function tieneBaja(bajas, nombre) {
  if (!nombre) return null;
  return (bajas || []).find(b => b.pesa && (b.eq === nombre || b.eq.endsWith(' ' + nombre) || nombre.endsWith(' ' + b.eq))) || null;
}

function armar(tigre, registro, bajas, u10, ahora) {
  const reg = {}; Object.keys((registro && registro.items) || {}).forEach(k => { const it = registro.items[k]; if (it && it.ext) reg[String(it.ext)] = it; });
  const juegos = ((tigre && tigre.juegos) || []).filter(j => j.st === 'pre' && j.ts > ahora && j.ts <= ahora + HORAS * 36e5 && j.dep !== 'tenis');
  const coinciden = [], evita = [], racha = [];
  juegos.forEach(j => {
    const f = favorito(j); if (!f || f.p < FAV) return;
    const it = reg[String(j.id)], mo = ladoModelo(it), fi = ladoFicha(j);
    const nomFav = nombreLargo(it, f.lado, j), baja = tieneBaja(bajas, nomFav);
    const base = { dep: j.dep, ts: j.ts, fav: f.eq.n, rival: f.rival.n, p: f.p, local: f.lado === 0, otroDia: dia(j.ts) !== dia(ahora) };
    if (fi && fi.lado !== f.lado && fi.puntaje >= 1) evita.push(Object.assign({ contra: fi.puntaje }, base));
    else if (fi && fi.lado === f.lado && fi.puntaje >= 1 && mo && mo.lado === f.lado && !baja) coinciden.push(Object.assign({ mod: mo.p, ficha: fi.puntaje }, base));
    if (j.dep === 'nba' && u10) {
      const uf = u10[f.eq.ab], ur = u10[f.rival.ab];
      if (uf != null && ur != null && ur - uf >= 2) racha.push(Object.assign({ uf: uf, ur: ur }, base));
    }
  });
  const orden = (a, b) => b.p - a.p;
  return { coinciden: coinciden.sort(orden), evita: evita.sort(orden), racha: racha.sort(orden), bajas: (bajas || []).filter(b => b.pesa), juegos: juegos.length };
}
function linea(x) { return (NOMDEP[x.dep] || x.dep.toUpperCase()) + ' ' + (x.otroDia ? dia(x.ts) + ' ' : '') + hora(x.ts) + ' · ' + x.fav + ' ' + pct(x.p) + (x.local ? ' vs ' : ' @ ') + x.rival; }
function mensaje(r, ahora) {
  const L = [];
  if (r.coinciden.length) { L.push('✅ COINCIDEN (mercado + Modelo OVA + ficha TIGRE, sin bajas):'); r.coinciden.slice(0, 8).forEach(x => L.push('• ' + linea(x) + ' · modelo ' + pct(x.mod) + ' · ficha 💪 +' + x.ficha)); }
  else L.push('✅ Hoy ningún favorito tiene todo a favor. Mejor no forzar.');
  if (r.racha.length) { L.push(''); L.push('📊 LA RACHA ENGAÑA (NBA, el favorito es más seguro):'); r.racha.slice(0, 5).forEach(x => L.push('• ' + linea(x) + ' · últimos 10: ' + x.uf + '-' + (10 - x.uf) + ' contra ' + x.ur + '-' + (10 - x.ur))); }
  if (r.evita.length) { L.push(''); L.push('👎 EVITA (la ficha de TIGRE va contra el favorito):'); r.evita.slice(0, 5).forEach(x => L.push('• ' + linea(x) + ' · ficha en contra ' + x.contra)); }
  if (r.bajas.length) { L.push(''); L.push('🚑 BAJAS QUE PESAN (36 h):'); r.bajas.slice(0, 6).forEach(b => L.push('• ' + b.eq + ': ' + b.n + ' ' + b.s + (b.linea && b.linea.ahora != null ? ' · línea ' + b.linea.abre + '% → ' + b.linea.ahora + '%' : ''))); }
  L.push(''); L.push(r.juegos + ' juegos revisados. Medido: ficha 💪 +1 gana ~4 pts más que su cuota; la 👎 ~8 menos. Nada es seguro.');
  let cuerpo = L.join('\n'); if (Buffer.byteLength(cuerpo) > 3900) cuerpo = cuerpo.slice(0, 3800) + '\n…';
  return { titulo: 'Resumen OVA + TIGRE · ' + dia(ahora), cuerpo: cuerpo };
}
module.exports = { favorito, ladoModelo, ladoFicha, ultimos10, tieneBaja, armar, mensaje };
if (require.main !== module) return;

async function pedir(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'ova-resumen' } }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) { }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}
(async () => {
  const ahora = Date.now();
  const [tigre, registro, cierres] = await Promise.all([pedir(URL.tigre), pedir(URL.liga), pedir(URL.cierres)]);
  let bajas = [];
  for (const dep of ['nba', 'nhl', 'nfl']) { const l = await pedir(URL.les(dep)); if (l && l.bajas) bajas = bajas.concat(l.bajas.filter(b => Date.parse(b.v) > ahora - 36 * 36e5)); }
  console.log('TIGRE: ' + (tigre ? (tigre.juegos || []).length + ' juegos (' + tigre.generado + ')' : 'NO LLEGÓ') + ' · liga: ' + (registro ? Object.keys(registro.items || {}).length + ' juegos' : 'NO LLEGÓ') + ' · cierres NBA: ' + (cierres ? 'sí' : 'no') + ' · bajas: ' + bajas.length);
  if (!tigre) { console.log('Sin TIGRE no hay resumen.'); process.exitCode = 1; return; }
  const r = armar(tigre, registro, bajas, ultimos10(cierres, ahora), ahora), m = mensaje(r, ahora);
  console.log('\n' + m.titulo + '\n' + m.cuerpo);
  if (!NTFY) { console.log('\n(sin NTFY_TOPIC: no se envía)'); return; }
  const titulo = m.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').trim();
  try { const res = await fetch('https://ntfy.sh/' + encodeURIComponent(NTFY), { method: 'POST', headers: { Title: titulo, Tags: 'sunrise' }, body: m.cuerpo }); console.log('aviso ' + (res.ok ? 'enviado' : 'FALLO ' + res.status)); }
  catch (e) { console.log('aviso FALLO ' + e.message); process.exitCode = 1; }
})();
