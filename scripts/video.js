/* OVA · video de picks (APAGADO: solo corre cuando Osvaldo lo pide, con el botón del workflow «Video de picks»).
   Lee liga.json de la rama «liga», escoge los picks más fuertes de las próximas 24 horas y el récord del titular de cada
   deporte, llena video/plantilla.html y la graba cuadro por cuadro con Chrome + ffmpeg (1080x1920, 30 fps, vertical).
   Uso: node scripts/video.js <carpeta-con-liga.json> <salida.mp4>
   Mismo estilo que haría Remotion, sin depender de él. No toca la app ni el modelo. */
'use strict';
const fs = require('fs'), path = require('path');
const H = 36e5, TZ = 'America/Chicago';
const DEP = { nba: 'NBA', nhl: 'NHL', nfl: 'NFL', futbol: 'FÚTBOL', tenis: 'TENIS', mlb: 'MLB' };
const PALETA = [['#0B3D91', '#fff'], ['#B3132B', '#fff'], ['#00704A', '#fff'], ['#5A2D82', '#fff'], ['#E87722', '#111'], ['#00838F', '#fff'],
  ['#1D1D1F', '#E6C35C'], ['#7A1F3D', '#FFD166'], ['#2E7D32', '#FFEB3B'], ['#C62828', '#FFC107']];
const MIN_REC = 10, MIN_P = 0.6, MAX_PICKS = 4, MAX_POR_DEP = 2;   // máximo 2 picks del mismo deporte, para que haya variedad

function abrev(n) {
  const w = String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return (w.length >= 3 && w[w.length - 1].length <= 4 ? w.map(x => x[0]).join('').slice(0, 3) : w[w.length - 1].slice(0, 3)).toUpperCase();
}
function corta(n) { const w = String(n || '').trim().split(/\s+/); return w.length > 1 && w.join(' ').length > 12 ? w[w.length - 1] : w.join(' '); }
function colores(n) { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETA[h % PALETA.length]; }
function equipo(n, otro) {
  let c = colores(n);
  if (otro && c[0] === otro[2]) c = PALETA[(PALETA.findIndex(x => x[0] === c[0]) + 3) % PALETA.length];   // que los dos no salgan del mismo color
  return [abrev(n), corta(n), c[0], c[1]];
}
function hora(ts, ahora) {
  const f = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  const h = new Date(ts).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  return (f(ts) === f(ahora) ? 'HOY ' : 'MAÑANA ') + h;
}
function fecha(ahora) {
  const s = new Date(ahora).toLocaleDateString('es-ES', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/* lo que sale en el video: picks fuertes (60%+) de las próximas 24 h, del titular de la liga, sin empates, máximo 2 por deporte */
function armar(lg, ahora) {
  const picks = (lg.proximos || []).filter(x => x.ts > ahora && x.ts < ahora + 24 * H && x.p >= MIN_P && (x.pick === 'L' || x.pick === 'A'))
    .sort((a, b) => b.p - a.p).filter((x, i, l) => l.slice(0, i).filter(y => y.dep === x.dep).length < MAX_POR_DEP).slice(0, MAX_PICKS)
    .map(x => { const h = equipo(x.local); return { liga: (DEP[x.dep] || x.dep.toUpperCase()) + ' · ' + hora(x.ts, ahora), a: equipo(x.visita, h), h, lado: x.pick === 'L' ? 'h' : 'a', p: Math.round(100 * x.p) }; });
  const rec = [];
  Object.keys(DEP).forEach(k => {
    const d = (lg.deportes || {})[k]; if (!d || !d.modelos) return;
    const m = d.modelos[d.titular]; if (!m || !(m.jugados >= MIN_REC)) return;
    rec.push([k === 'futbol' ? 'Fútbol' : k === 'tenis' ? 'Tenis' : DEP[k], m.aciertos + ' de ' + m.jugados, Math.round(m.pct)]);
  });
  return { picks, rec, fecha: fecha(ahora) };
}
function escenas(datos) {
  const s = [['intro', 0, 2.6]];
  datos.picks.forEach((p, i) => s.push(['pick', i, 2.8]));
  if (datos.rec.length) s.push(['rec', 0, 3.6]);
  s.push(['out', 0, 2.4]);
  return s;
}

async function grabar(datos, salida) {
  const pup = require(process.env.PUPPETEER || 'puppeteer-core'), { spawn } = require('child_process');
  const FPS = 30, dir = fs.mkdtempSync('/tmp/ova-video-');
  const html = fs.readFileSync(path.join(__dirname, '..', 'video', 'plantilla.html'), 'utf8').replace('/*DATOS*/', 'window.DATA=' + JSON.stringify(datos) + ';');
  fs.writeFileSync(path.join(dir, 'v.html'), html);
  const b = await pup.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1080, height: 1920 });
  await pg.goto('file://' + path.join(dir, 'v.html')); await pg.evaluateHandle('document.fonts.ready');
  const lista = [], sc = escenas(datos);
  for (let s = 0; s < sc.length; s++) {
    const [nom, i, dur] = sc[s], tmp = path.join(dir, 's' + s + '.tmp.mp4'), out = path.join(dir, 's' + s + '.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '' + FPS, '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '' + FPS, tmp]);
    for (let f = 0; f < Math.round(dur * FPS); f++) {
      await pg.evaluate((a, b2, c, d) => render(a, b2, c, d), nom, i, f / FPS, dur);
      const buf = await pg.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r)); if (code !== 0) throw new Error('ffmpeg falló en la escena ' + s);
    fs.renameSync(tmp, out); lista.push("file '" + out + "'");
  }
  await b.close();
  fs.writeFileSync(path.join(dir, 'lista.txt'), lista.join('\n'));
  await new Promise((res, rej) => require('child_process').execFile('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'lista.txt'), '-c', 'copy', salida], e => e ? rej(e) : res()));
}

module.exports = { armar, escenas, abrev, corta, hora, fecha, equipo };

if (require.main === module) (async () => {
  const dir = process.argv[2] || '.', salida = process.argv[3] || 'ova-hoy.mp4';
  const lg = JSON.parse(fs.readFileSync(path.join(dir, 'liga.json'), 'utf8'));
  const datos = armar(lg, Date.now());
  console.log('picks:', datos.picks.length, '· récord:', datos.rec.map(r => r[0] + ' ' + r[1]).join(', ') || 'ninguno con ' + MIN_REC + '+ juegos');
  if (!datos.picks.length) { console.log('No hay picks de 60%+ en las próximas 24 horas: no se hace video.'); return; }
  await grabar(datos, salida);
  console.log('video listo:', salida);
})().catch(e => { console.error(e); process.exit(1); });
