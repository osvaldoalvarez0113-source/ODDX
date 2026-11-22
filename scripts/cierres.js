'use strict';
/* ===================================================================
   OVA · ARCHIVO DE CIERRES (GitHub Actions: .github/workflows/cierres.yml, todos los días).

   Guarda, juego por juego, el marcador final y la LÍNEA DE CIERRE de ESPN (moneyline, hándicap y total; el proveedor más completo
   que no sea «en vivo», igual que datos_nhl_nfl.js) de NBA, NHL, NFL y MLB. Es la materia prima para:
     - la historia de la liga (scripts/historia_liga.js → 📊 «Cuántas veces acierta este %» al día en cada app),
     - y cualquier medición futura (aciertos por zona, totales, hándicap) sin volver a bajar nada.
   Qué baja:
     NBA, NHL y NFL  la temporada en curso (lo de antes ya está en resultados-nba-6t y datos-nhl-nfl);
     MLB             2023 a hoy (no había líneas de cierre guardadas de MLB; así en 2027 MLB arranca con historia).
   Cada vuelta baja solo lo nuevo y, como mucho, TOPE líneas por deporte (lo que falte sigue al día siguiente).
   Todo queda en la rama «cierres» (cierres-<deporte>.json). No toca la app.
   Uso: node scripts/cierres.js <carpeta de la rama cierres>
   =================================================================== */
const fs = require('fs'), path = require('path');
const D = require('./datos_nhl_nfl.js');            // parseEventos, lineaCore, bajarDia, bajarLineas, temporada (NFL por semana)
const L = require('./lib_medir.js');

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/', CORE = 'https://sports.core.api.espn.com/v2/sports/';
D.ESPN.nba = SITE + 'basketball/nba/'; D.CORE.nba = CORE + 'basketball/leagues/nba/';
D.ESPN.mlb = SITE + 'baseball/mlb/'; D.CORE.mlb = CORE + 'baseball/leagues/mlb/';
const DIA = 864e5;

/* temporada a la que pertenece una fecha y su ventana de días (UTC) */
const SPEC = {
  nba: { desde: 2026, tope: 1500, sk: t => { const d = new Date(t); return d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }, win: sk => [Date.UTC(sk, 9, 1), Date.UTC(sk + 1, 5, 30)] },
  nhl: { desde: 2026, tope: 1500, sk: t => { const d = new Date(t); return d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }, win: sk => [Date.UTC(sk, 9, 1), Date.UTC(sk + 1, 5, 30)] },
  nfl: { desde: 2026, tope: 800, sk: t => { const d = new Date(t); return d.getUTCMonth() >= 2 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }, win: sk => [Date.UTC(sk, 8, 1), Date.UTC(sk + 1, 1, 28)] },
  mlb: { desde: 2023, tope: 4000, sk: t => new Date(t).getUTCFullYear(), win: sk => [Date.UTC(sk, 2, 15), Date.UTC(sk, 10, 10)] }
};

/* días a pedir: desde 4 días antes del último juego terminado que ya se tenía (o el inicio de la ventana) hasta mañana */
function diasDe(spec, sk, previo, ahora) {
  const [ini0, fin] = spec.win(sk), hechos = ((previo && previo.juegos) || []).filter(g => g.done);
  const ini = hechos.length ? Math.max(ini0, Math.max(...hechos.map(g => g.ts)) - 4 * DIA) : ini0;
  const tope = Math.min(fin, ahora + DIA), out = [];
  for (let t = Date.UTC(new Date(ini).getUTCFullYear(), new Date(ini).getUTCMonth(), new Date(ini).getUTCDate()); t <= tope; t += DIA) out.push(new Date(t));
  return out;
}
/* juntar lo nuevo con lo que había, sin perder las líneas ya bajadas de juegos terminados */
function juntar(previo, nuevos) {
  const m = new Map(((previo && previo.juegos) || []).map(g => [g.id, g]));
  nuevos.forEach(g => { const v = m.get(g.id); if (v && v.linea !== undefined && g.done) g.linea = v.linea; m.set(g.id, g); });
  return [...m.values()].sort((a, b) => a.ts - b.ts);
}
/* juegos que todavía no tienen línea (terminados, de temporada regular o playoffs), los más nuevos primero */
function faltan(cache) {
  return [].concat(...Object.values(cache.temps || {}).map(t => t.juegos || [])).filter(g => g.done && !g.skip && g.linea === undefined).sort((a, b) => b.ts - a.ts);
}

async function deporte(dep, dir, ahora, DIAG) {
  const spec = SPEC[dep], ruta = path.join(dir, 'cierres-' + dep + '.json');
  let cache; try { cache = JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { cache = { v: 1, dep, temps: {} }; }
  const skHoy = spec.sk(ahora);
  for (let sk = spec.desde; sk <= skHoy; sk++) {
    const t = cache.temps[sk];
    if (t && t.completa) continue;
    let nuevos;
    if (dep === 'nfl') nuevos = await D.temporada('nfl', sk, DIAG);
    else nuevos = [].concat(...(await L.pool(diasDe(spec, sk, t, ahora).map(d => () => D.bajarDia(dep, d, DIAG)), 10)).filter(Boolean));
    const juegos = juntar(t, nuevos);
    cache.temps[sk] = { juegos, completa: spec.win(sk)[1] < ahora - 3 * DIA && juegos.length > 0 };
    console.log(dep + ' ' + sk + ': ' + juegos.length + ' juegos (' + juegos.filter(g => g.done).length + ' terminados)');
  }
  const lista = faltan(cache).slice(0, spec.tope);
  if (lista.length) { const r = await D.bajarLineas(dep, lista, DIAG, (h, n) => { if (h % 1000 === 0) console.log('  ' + dep + ' líneas ' + h + '/' + n); }); if (r.fallos) console.log('  ' + dep + ': ' + r.fallos + ' fallos al bajar líneas (se reintentan mañana)'); }
  cache.generado = new Date(ahora).toISOString();
  fs.writeFileSync(ruta, JSON.stringify(cache));
  const todos = [].concat(...Object.values(cache.temps).map(t => t.juegos)), term = todos.filter(g => g.done && !g.skip);
  console.log(dep + ': ' + term.length + ' terminados · con línea ' + term.filter(g => g.linea && g.linea.ml).length + ' · sin línea en ESPN ' + term.filter(g => g.linea === null).length + ' · por bajar ' + faltan(cache).length);
}

module.exports = { SPEC, diasDe, juntar, faltan };
if (require.main !== module) return;
(async () => {
  const dir = process.argv[2] || 'salida-cierres', ahora = Date.now(), DIAG = { errores: [] };
  fs.mkdirSync(dir, { recursive: true });
  for (const dep of ['nba', 'nhl', 'nfl', 'mlb']) {
    try { await deporte(dep, dir, ahora, DIAG); } catch (e) { console.log(dep + ': ERROR ' + e.message); }
  }
  console.log('errores de descarga: ' + DIAG.errores.length + (DIAG.errores.length ? ' · ' + DIAG.errores.slice(0, 5).join(' | ') : ''));
})();
