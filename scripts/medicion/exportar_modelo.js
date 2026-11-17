'use strict';
/* OVA · Lo que dijo EL MODELO (sin mirar el mercado) en cada juego de NHL o NFL, para medir patrones contra el modelo.
   Uso: node scripts/medicion/exportar_modelo.js nhl|nfl datos-<dep>.json salida.json
   Walk-forward igual que correr_nhl_nfl.js y hembras.js: los parámetros de cada temporada se eligen solo con las anteriores.
   Salida: { id: { pH, sp (P de que el local cubra su línea), ov (P de Más de la línea de total), pm, pt } } */
const fs = require('fs'), path = require('path');
const dep = process.argv[2], M = require('../../modelo-' + dep + '.js');
const d = JSON.parse(fs.readFileSync(process.argv[3] || path.join(__dirname, '../../datos-' + dep + '.json')));
if (dep === 'nhl') {   // tiros a puerta: sin ellos el modelo corre «solo goles» y no es el de la app
  const hs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../hist-nhl.json'))); const SH = {};
  hs.g.forEach(r => { if (r.length > 10 && r[9] != null) SH[r[0]] = [r[9], r[10]]; });
  Object.keys(d.temps).forEach(s => d.temps[s].juegos.forEach(g => { const t = SH[g.id]; if (t && g.sh === undefined) { g.sh = t[0]; g.sa = t[1]; } }));
}
const TEMPS = Object.keys(d.temps).map(Number).sort(), TEST = dep === 'nhl' ? 2022 : 2019, MINJ = dep === 'nhl' ? 10 : 3, MINENT = dep === 'nhl' ? 600 : 150;
const todos = [].concat(...TEMPS.map(s => d.temps[s].juegos)).filter(g => g.done && !g.skip).sort((a, b) => a.ts - b.ts);
const hasta = sk => todos.filter(g => M.seasonOf(g.ts) <= sk);
const out = {};
TEMPS.filter(s => s >= TEST).forEach(sk => {
  const ent = hasta(sk - 1); let P;
  if (ent.filter(g => M.seasonOf(g.ts) === sk - 1).length > MINENT) {
    const a = M.gridMargen(ent, sk - 1, null, Object.assign({}, M.PDEF, { Z: 1 })), b = M.gridTotal(ent, sk - 1, null, a.P);
    P = Object.assign({}, b.P, { Z: M.zRecomendado(M.evaluar(ent, b.P, sk - 1).sl) });
  } else P = Object.assign({}, M.PDEF);
  M.correr(hasta(sk), P, (g, x) => {
    if (M.seasonOf(g.ts) !== sk || g.ty !== 2 || x.cH < MINJ || x.cA < MINJ) return;
    const Zc = P.Z === undefined ? 1 : P.Z, pm = x.b0 + Zc * x.rd, l = g.linea || {}, o = { pm: pm, pt: x.pt };
    if (dep === 'nhl') {
      const D = M.dist(pm, x.pt, P); o.pH = D.pH;
      if (l.sp != null) { const c = M.pCoverM(D, l.sp); o.sp = c.w / Math.max(1 - c.p, 1e-9); }
      if (l.tot != null) { const c = M.pOver(D, l.tot); o.ov = c.w / Math.max(1 - c.p, 1e-9); }
    } else {
      const sg = M.sigmas(x.S); o.pH = M.pML(pm, sg.sM);
      if (l.sp != null) { const c = M.pCover(pm, sg.sM, -l.sp); o.sp = c.w / Math.max(1 - c.p, 1e-9); }
      if (l.tot != null) { const c = M.pCover(x.pt, sg.sT, l.tot); o.ov = c.w / Math.max(1 - c.p, 1e-9); }
    }
    out[g.id] = o;
  });
});
fs.writeFileSync(process.argv[4] || ('modelo-' + dep + '-filas.json'), JSON.stringify(out));
console.log(dep, 'juegos con pronóstico del modelo:', Object.keys(out).length);
