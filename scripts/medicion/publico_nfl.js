'use strict';
/* OVA · NFL: el modelo de la app contra nfelo (modelo público, github.com/greerreNFL/nfelo) y contra el mercado.
   Uso: node scripts/medicion/publico_nfl.js nfelo_games.csv [datos-nfl.json] [salida.md]
   - OVA: modelo-nfl.js walk-forward (constantes elegidas solo con temporadas anteriores), igual que correr_nhl_nfl.js.
   - nfelo puro: su diferencia de rating ANTES de mirar la línea (nfelo_dif_base) -> 1/(1+10^(-dif/400)).
   - nfelo final: nfelo_home_probability_close (ya mezclado con la línea de cierre: no es independiente del mercado).
   Regla fijada antes de correr (15-nov-2026): nfelo «le aporta» a OVA si la mezcla OVA+nfelo (peso ajustado con las otras temporadas)
   le gana a OVA solo con z <= -2; y «le aporta al precio» solo si su peso sobre el mercado tiene z >= 2.6. */
const fs = require('fs'), path = require('path');
const L = require('../lib_medir.js'), M = require('../../modelo-nfl.js');
const CSV = process.argv[2], DAT = process.argv[3] || path.join(__dirname, '../../datos-nfl.json'), OUT = process.argv[4];
const out = []; const log = s => { out.push(s); console.log(s); };
const fin = c => { if (OUT) fs.writeFileSync(OUT, out.join('\n') + '\n'); process.exit(c); };
const AB = { WSH: 'WAS', LAR: 'LA', OAK: 'LV', SD: 'LAC', STL: 'LA' }, ab = x => AB[x] || x;
const clip = p => L.clip(p, 1e-4, 1 - 1e-4), lg = L.logit, sig = L.sig;

// ---- nfelo
const lin = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean), cab = lin[0].split(','), ix = k => cab.indexOf(k);
const nec = ['game_id', 'nfelo_dif_base', 'nfelo_home_probability_close'];
if (nec.some(k => ix(k) < 0)) { log('FALTAN COLUMNAS en nfelo: ' + nec.filter(k => ix(k) < 0).join(', ') + '\n' + cab.join(', ')); fin(1); }
const NF = {};
lin.slice(1).forEach(l => { const c = l.split(','), id = c[ix('game_id')].split('_'); if (id.length !== 4 || +id[1] > 18) return;
  const base = parseFloat(c[ix('nfelo_dif_base')]), cl = parseFloat(c[ix('nfelo_home_probability_close')]);
  NF[id[0] + '|' + ab(id[3]) + '|' + ab(id[2])] = { base: isFinite(base) ? 1 / (1 + Math.pow(10, -base / 400)) : null, fin: isFinite(cl) ? cl : null }; });
log('nfelo: ' + Object.keys(NF).length + ' juegos de temporada regular.');

// ---- OVA walk-forward
const d = JSON.parse(fs.readFileSync(DAT)), TEMPS = Object.keys(d.temps).map(Number).sort((a, b) => a - b);
const todos = [].concat(...TEMPS.map(s => d.temps[s].juegos)).filter(g => g.done && !g.skip).sort((a, b) => a.ts - b.ts);
const hasta = sk => todos.filter(g => M.seasonOf(g.ts) <= sk);
const F = [];
TEMPS.filter(s => s >= 2019).forEach(sk => {
  const ent = hasta(sk - 1); let P;
  if (ent.filter(g => M.seasonOf(g.ts) === sk - 1).length > 150) { const a = M.gridMargen(ent, sk - 1, null, Object.assign({}, M.PDEF, { Z: 1 })), b = M.gridTotal(ent, sk - 1, null, a.P); P = Object.assign({}, b.P, { Z: M.zRecomendado(M.evaluar(ent, b.P, sk - 1).sl) }); }
  else P = Object.assign({}, M.PDEF);
  M.correr(hasta(sk), P, (g, x) => {
    if (M.seasonOf(g.ts) !== sk || g.ty !== 2 || x.cH < 4 || x.cA < 4 || g.hs === g.as) return;
    const n = NF[sk + '|' + ab(g.abH) + '|' + ab(g.abA)]; if (!n || n.base === null) return;
    const q = g.linea && g.linea.ml ? L.sinMargen(g.linea.ml[0], g.linea.ml[1])[0] : null; if (q === null) return;
    const Zc = P.Z === undefined ? 1 : P.Z, pO = M.pMLk(x.b0 + Zc * x.rd, M.sigmas(x.S).sM, null);
    F.push({ sk, w: g.hs > g.as ? 1 : 0, o: clip(pO), n: clip(n.base), nf: n.fin === null ? null : clip(n.fin), q: clip(q) });
  });
});
log('Juegos comunes (OVA + nfelo + moneyline de cierre, desde la semana 5 de cada temporada): ' + F.length + '.');
if (F.length < 500) { log('NO HAY SUFICIENTES JUEGOS COMUNES (revisar abreviaturas).'); fin(1); }
const ll = (p, w) => -Math.log(w ? p : 1 - p);
const SKS = [...new Set(F.map(r => r.sk))];
// mezcla en logit: a + (1-l)*logit(A) + l*logit(B), l ajustado con las otras temporadas
function mezcla(fa, fb) {
  const perd = (rows, l) => rows.reduce((s, r) => s + ll(clip(sig((1 - l) * lg(fa(r)) + l * lg(fb(r)))), r.w), 0);
  const mejor = rows => { let b = null; for (let l = 0; l <= 1.0001; l += 0.05) { const v = perd(rows, l); if (!b || v < b.v) b = { l, v }; } return b.l; };
  const dif = []; const ls = [];
  SKS.forEach(s => { const ent = F.filter(r => r.sk !== s), te = F.filter(r => r.sk === s); const l = mejor(ent); ls.push(l);
    te.forEach(r => dif.push(ll(clip(sig((1 - l) * lg(fa(r)) + l * lg(fb(r)))), r.w) - ll(fa(r), r.w))); });
  return { l: mejor(F), m: L.ms(dif), ls };
}
const tot = f => { const v = F.filter(r => f(r) !== null); return v.reduce((s, r) => s + ll(f(r), r.w), 0) / v.length; };
const ac = f => { const v = F.filter(r => f(r) !== null); return v.filter(r => (f(r) >= 0.5) === (r.w === 1)).length / v.length; };
const porT = f => SKS.map(s => { const v = F.filter(r => r.sk === s && f(r) !== null); return v.length ? L.f(v.reduce((a, r) => a + ll(f(r), r.w), 0) / v.length, 4) : '—'; });
log('\n# NFL · el modelo de OVA contra nfelo y contra el mercado\n');
log('Pérdida logarítmica del ganador (más baja = mejor). nfelo: datos públicos de github.com/greerreNFL/nfelo.\n');
const V = [['OVA (modelo de la app)', r => r.o], ['nfelo puro (sin mirar la línea)', r => r.n], ['nfelo final (ya mezclado con la línea)', r => r.nf], ['**Mercado (cierre sin margen)**', r => r.q]];
log(L.tabla(['Modelo'].concat(SKS.map(String)).concat(['Total', 'Aciertos']), V.map(v => [v[0]].concat(porT(v[1])).concat([L.f(tot(v[1]), 4), L.pc(ac(v[1]))]))));
const dOn = L.ms(F.map(r => ll(r.n, r.w) - ll(r.o, r.w)));
log('nfelo puro − OVA: ' + (dOn.m * 1000).toFixed(1) + ' milésimas ± ' + (2000 * dOn.se).toFixed(1) + ' (z ' + L.f(dOn.z, 1) + '; negativo = nfelo acierta más).');
const m1 = mezcla(r => r.o, r => r.n), m2 = mezcla(r => r.q, r => r.n), m3 = mezcla(r => r.q, r => r.o);
log('\n## ¿Qué aporta cada uno?\n' + L.tabla(['Mezcla (probada en la temporada que quedó afuera)', 'Peso del segundo', 'Mejora sobre el primero (milésimas ± 2·se)', 'z', 'Veredicto'], [
  ['OVA + nfelo puro', L.f(m1.l, 2), (m1.m.m * 1000).toFixed(1) + ' ± ' + (2000 * m1.m.se).toFixed(1), L.f(m1.m.z, 1), m1.m.z <= -2 ? 'nfelo LE APORTA a OVA' : 'no se distingue'],
  ['Mercado + nfelo puro', L.f(m2.l, 2), (m2.m.m * 1000).toFixed(1) + ' ± ' + (2000 * m2.m.se).toFixed(1), L.f(m2.m.z, 1), m2.m.z <= -2.6 ? 'nfelo le aporta al precio' : 'no le aporta al precio'],
  ['Mercado + OVA', L.f(m3.l, 2), (m3.m.m * 1000).toFixed(1) + ' ± ' + (2000 * m3.m.se).toFixed(1), L.f(m3.m.z, 1), m3.m.z <= -2.6 ? 'OVA le aporta al precio' : 'no le aporta al precio']]));
// qué trae nfelo que OVA no: correlación de la diferencia (nfelo − OVA) con el resultado, y con el ajuste de mariscal
const r3 = L.ols(F.map(r => [1, lg(r.o), lg(r.n) - lg(r.o)]), F.map(r => r.w));
log('Regresión: gana = a + b·OVA + c·(nfelo − OVA), en logit: c = ' + L.f(r3.b[2], 3) + ' ± ' + L.f(2 * r3.se[2], 3) + ' (c > 0 con z ≥ 2: nfelo sabe algo que OVA no).');
fin(0);
