'use strict';
/* Historia de precios: cada corrida del escáner AGREGA una línea (no pisa) en la rama «historia-precios».
   Uso: node scripts/historia_precios.js <carpeta de la rama> <archivo pinnacle-*.json> [más archivos...]
   Escribe <carpeta>/historia/<nombre>-<AAAA-MM>.jsonl, una línea por corrida: {"generado": ..., "juegos": [...]}.
   Si «generado» ya está guardado (el escáner conservó el archivo viejo), no repite la línea.
   Es la base para medir CLV contra Pinnacle, movimiento de línea y comprar temprano (auditoría 30-oct-2026, P1). */
const fs = require('fs'), path = require('path');

function agregar(dir, archivo) {
  let d; try { d = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (e) { return 'sin archivo'; }
  if (!d || !d.generado) return 'sin datos';
  const mes = String(d.generado).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return 'fecha rara';
  const base = path.basename(archivo, '.json');
  const destino = path.join(dir, 'historia', base + '-' + mes + '.jsonl');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  let previo = '';
  try { previo = fs.readFileSync(destino, 'utf8'); } catch (e) { }
  if (previo.indexOf('"generado":' + JSON.stringify(d.generado)) >= 0) return 'ya estaba (' + d.generado + ')';
  fs.appendFileSync(destino, JSON.stringify(d) + '\n');
  return 'agregado ' + d.generado + ' → ' + path.relative(dir, destino);
}

if (require.main === module) {
  const [dir, ...archivos] = process.argv.slice(2);
  if (!dir || !archivos.length) { console.log('uso: historia_precios.js <carpeta> <archivos...>'); process.exit(1); }
  archivos.forEach(a => console.log(path.basename(a) + ': ' + agregar(dir, a)));
}
module.exports = { agregar };
