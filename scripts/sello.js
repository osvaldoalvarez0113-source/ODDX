/* Sello de actualización de NHL, NFL y tenis.
   Uso:  node scripts/sello.js        (desde la carpeta del repo; lo corre solo el workflow «Sello» en cada subida)
   Por cada app junta su página y todos los .js locales que carga, y saca una huella. Si la huella cambió, pone la fecha de hoy.
   Escribe sello.js (window.OVA_SELLO). La app muestra «act. 11 nov» en vez de un número de versión a mano, y si el sello que
   tiene cargado no es el del servidor avisa que hay versión nueva (ovaextra.js). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DIR = path.join(__dirname, '..'), OUT = path.join(DIR, 'sello.js');
const APPS = { nhl: 'nhl.html', nfl: 'nfl.html', tenis: 'tenis.html' };
function archivos(pag) {
  const h = fs.readFileSync(path.join(DIR, pag), 'utf8'), l = [pag];
  for (const m of h.matchAll(/<script[^>]+src="([^"]+)"/g)) { const s = m[1].split('?')[0]; if (!/^https?:/.test(s) && s !== 'sello.js' && fs.existsSync(path.join(DIR, s)) && l.indexOf(s) < 0) l.push(s); }
  return l;
}
function huella(pag) { const c = crypto.createHash('sha1'); archivos(pag).forEach(f => { c.update(f + '\n'); c.update(fs.readFileSync(path.join(DIR, f))); }); return c.digest('hex').slice(0, 10); }
function leer(txt) { try { const m = /OVA_SELLO=\n(.+)\n/.exec(txt); return m ? JSON.parse(m[1]) : null; } catch (e) { return null; } }
function hoy() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function calcular(prev, fecha) {
  const o = {};
  Object.keys(APPS).forEach(a => { const h = huella(APPS[a]), p = prev && prev[a]; o[a] = { f: p && p.h === h && p.f ? p.f : fecha, h: h }; });
  return o;
}
function texto(o) { return '/* generado por scripts/sello.js: no editar a mano */\n(function(r){r.OVA_SELLO=\n' + JSON.stringify(o) + '\n;})(typeof window!==\'undefined\'?window:globalThis);\n'; }
module.exports = { APPS, archivos, huella, leer, calcular, texto };
if (require.main === module) {
  const prev = fs.existsSync(OUT) ? leer(fs.readFileSync(OUT, 'utf8')) : null, o = calcular(prev, hoy()), t = texto(o);
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== t) { fs.writeFileSync(OUT, t); console.log('sello actualizado', JSON.stringify(o)); }
  else console.log('sello sin cambios');
}
