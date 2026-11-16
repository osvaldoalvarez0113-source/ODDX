'use strict';
/* OVA · HEMBRAS (no favoritos) en NHL: ¿hay alguna señal que separe la hembra viva de la muerta?
   Uso: node scripts/medicion/hembras.js [datos-nhl.json]
   Walk-forward igual que correr_nhl_nfl.js (parámetros del modelo elegidos solo con temporadas anteriores).
   Hembra = el equipo con menos de 50% en el moneyline de cierre sin margen. Reglas fijadas ANTES de correr (15-nov-2026):
   se da por buena una señal solo si rinde > 0 con z >= 2 en el total Y positivo en las dos mitades (A = 2022-2023, B = 2024-2026). */
const fs = require('fs'), path = require('path');
const L = require('../lib_medir.js'), M = require('../../modelo-nhl.js');
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '../../datos-nhl.json')));
// tiros a puerta del archivo diario: sin ellos el modelo corre «solo goles» y no es el de la app
const hs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../hist-nhl.json'))); const SH = {}; hs.g.forEach(r => { if (r.length > 10 && r[9] != null) SH[r[0]] = [r[9], r[10]]; });
Object.keys(d.temps).forEach(s => d.temps[s].juegos.forEach(g => { const t = SH[g.id]; if (t && g.sh === undefined) { g.sh = t[0]; g.sa = t[1]; } }));
const TEMPS = [2021, 2022, 2023, 2024, 2025, 2026], TEST = 2022, MINJ = 10;
const todos = [].concat(...TEMPS.map(s => d.temps[s] ? d.temps[s].juegos : [])).filter(g => g.done && !g.skip).sort((a, b) => a.ts - b.ts);
const hasta = sk => todos.filter(g => M.seasonOf(g.ts) <= sk);

// forma: últimos 10 de cada equipo antes del juego (de la misma temporada)
const hist = {}; const forma = {};
todos.forEach(g => {
  const sk = M.seasonOf(g.ts);
  const f = id => { const h = (hist[id] || []).filter(x => x.sk === sk).slice(-10); return h.length >= 8 ? h.reduce((a, x) => a + x.w, 0) / h.length : null; };
  forma[g.id] = { h: f(g.h), a: f(g.a) };
  (hist[g.h] = hist[g.h] || []).push({ sk, w: g.hs > g.as ? 1 : 0 }); (hist[g.a] = hist[g.a] || []).push({ sk, w: g.as > g.hs ? 1 : 0 });
});

const filas = [];
TEMPS.filter(s => s >= TEST).forEach(sk => {
  const ent = hasta(sk - 1); let P;
  if (ent.filter(g => M.seasonOf(g.ts) === sk - 1).length > 600) {
    const a = M.gridMargen(ent, sk - 1, null, Object.assign({}, M.PDEF, { Z: 1 })), b = M.gridTotal(ent, sk - 1, null, a.P);
    P = Object.assign({}, b.P, { Z: M.zRecomendado(M.evaluar(ent, b.P, sk - 1).sl) });
  } else P = Object.assign({}, M.PDEF);
  M.correr(hasta(sk), P, (g, x) => {
    if (M.seasonOf(g.ts) !== sk || g.ty !== 2 || x.cH < MINJ || x.cA < MINJ) return;
    const l = g.linea; if (!l || !l.ml || g.hs === g.as) return;
    const pkH = L.sinMargen(l.ml[0], l.ml[1])[0]; if (Math.abs(pkH - 0.5) < 1e-9) return;
    const Zc = P.Z === undefined ? 1 : P.Z, pmH = M.dist(x.b0 + Zc * x.rd, x.pt, P).pH;
    const dogH = pkH < 0.5, q = dogH ? pkH : 1 - pkH, pm = dogH ? pmH : 1 - pmH;
    const mar = dogH ? g.hs - g.as : g.as - g.hs;
    const fo = forma[g.id], fD = dogH ? fo.h : fo.a, fF = dogH ? fo.a : fo.h;
    let mov = null; if (l.mlOpen) { const o = L.sinMargen(l.mlOpen[0], l.mlOpen[1])[0]; mov = q - (dogH ? o : 1 - o); }
    let hc = null; if (l.sp != null && l.spOdds && Math.abs(l.sp) === 1.5) { const spDog = dogH ? l.sp : -l.sp; if (spDog === 1.5) hc = { odds: dogH ? l.spOdds[0] : l.spOdds[1], ok: mar + 1.5 > 0 }; }
    filas.push({ sk, mitad: sk <= 2023 ? 'A' : 'B', q, pm, gap: pm - q, win: mar > 0 ? 1 : 0, odds: dogH ? l.ml[0] : l.ml[1], oddsF: dogH ? l.ml[1] : l.ml[0], dogH, fD, fF, mov, hc,
      b2bF: dogH ? !!x.bA : !!x.bH, b2bD: dogH ? !!x.bH : !!x.bA });
  });
});

function medir(rs) {
  const u = rs.map(r => L.pago(r.odds, r.win ? 1 : -1)), s = L.ms(u);
  const h = rs.filter(r => r.hc), uh = h.map(r => L.pago(r.hc.odds, r.hc.ok ? 1 : -1)), sh = L.ms(uh);
  return { n: rs.length, win: rs.reduce((a, r) => a + r.win, 0) / Math.max(rs.length, 1), esp: rs.reduce((a, r) => a + r.q, 0) / Math.max(rs.length, 1), roi: s.m, se: s.se, z: s.z,
    nh: h.length, hw: h.filter(r => r.hc.ok).length / Math.max(h.length, 1), hroi: sh.m, hse: sh.se, hz: sh.z };
}
const sg = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';
const out = []; const log = s => { out.push(s); console.log(s); };
function fila(nom, f) {
  const rs = filas.filter(f), t = medir(rs), a = medir(rs.filter(r => r.mitad === 'A')), b = medir(rs.filter(r => r.mitad === 'B'));
  const pasa = t.n >= 150 && t.roi > 0 && t.z >= 2 && a.roi > 0 && b.roi > 0, pasaH = t.nh >= 150 && t.hroi > 0 && t.hz >= 2 && a.hroi > 0 && b.hroi > 0;
  return [nom, String(t.n), L.pc(t.win), L.pc(t.esp), sg(t.roi) + ' ±' + (200 * t.se).toFixed(1), sg(a.roi) + ' / ' + sg(b.roi), pasa ? 'PASA' : 'no',
    L.pc(t.hw), sg(t.hroi) + ' ±' + (200 * t.hse).toFixed(1), sg(a.hroi) + ' / ' + sg(b.hroi), pasaH ? 'PASA' : 'no'];
}
const CAB = ['Regla', 'Juegos', 'Gana', 'Mercado decía', 'Rinde al gane', 'A / B', '¿Pasa?', '+1.5 pega', 'Rinde +1.5', 'A / B', '¿Pasa?'];
const corta = r => r.q >= 0.42, mejorForma = r => r.fD !== null && r.fF !== null && r.fD - r.fF >= 0.2;
log('# Hembras en NHL (' + filas.length + ' juegos de temporada regular con moneyline, 2022 a hoy)\n');
log('## Por precio\n' + L.tabla(CAB, [
  fila('Todas las hembras', r => true),
  fila('Corta: 45-50% (hasta +120)', r => r.q >= 0.45),
  fila('Media: 40-45% (+120 a +150)', r => r.q >= 0.40 && r.q < 0.45),
  fila('Larga: 33-40% (+150 a +200)', r => r.q >= 0.33 && r.q < 0.40),
  fila('Palo: menos de 33% (+200 o más)', r => r.q < 0.33)]));
log('## El modelo le ve más chance que el mercado\n' + L.tabla(CAB, [
  fila('Modelo +2 pts o más', r => r.gap >= 0.02),
  fila('Modelo +4 pts o más', r => r.gap >= 0.04),
  fila('Modelo +6 pts o más', r => r.gap >= 0.06),
  fila('Modelo la tiene en 50% o más', r => r.pm >= 0.5),
  fila('Modelo le ve MENOS (−2 pts)', r => r.gap <= -0.02)]));
log('## Cómo vienen (últimos 10) y descanso\n' + L.tabla(CAB, [
  fila('Hembra viene mejor (2+ victorias más en 10)', mejorForma),
  fila('Hembra viene peor (2+ menos)', r => r.fD !== null && r.fF !== null && r.fF - r.fD >= 0.2),
  fila('Hembra en casa', r => r.dogH),
  fila('Hembra de visita', r => !r.dogH),
  fila('Favorito jugó ayer y la hembra no', r => r.b2bF && !r.b2bD),
  fila('Hembra jugó ayer y el favorito no', r => r.b2bD && !r.b2bF)]));
log('## Movimiento del precio (apertura → cierre)\n' + L.tabla(CAB, [
  fila('El dinero entró a la hembra (+2 pts)', r => r.mov !== null && r.mov >= 0.02),
  fila('El dinero entró al favorito (−2 pts)', r => r.mov !== null && r.mov <= -0.02),
  fila('Sin movimiento', r => r.mov !== null && Math.abs(r.mov) < 0.02)]));
log('## «Hembra viva» (combinaciones)\n' + L.tabla(CAB, [
  fila('Corta (42%+) y modelo +2', r => corta(r) && r.gap >= 0.02),
  fila('Corta y viene mejor', r => corta(r) && mejorForma(r)),
  fila('Corta, modelo +2 y viene mejor', r => corta(r) && r.gap >= 0.02 && mejorForma(r)),
  fila('Corta, en casa y modelo +2', r => corta(r) && r.dogH && r.gap >= 0.02),
  fila('Modelo +2 y dinero entró a la hembra', r => r.gap >= 0.02 && r.mov !== null && r.mov >= 0.02)]));
// al revés: el FAVORITO en esos mismos juegos (hipótesis nacida de esta misma corrida: hay que confirmarla con juegos nuevos)
function filaF(nom, f) {
  const rs = filas.filter(f), m = x => { const s = L.ms(x.map(r => L.pago(r.oddsF, r.win ? -1 : 1))); return s; };
  const t = m(rs), a = m(rs.filter(r => r.mitad === 'A')), b = m(rs.filter(r => r.mitad === 'B'));
  const porT = [2022, 2023, 2024, 2025, 2026].map(k => { const x = rs.filter(r => r.sk === k); return x.length ? sg(m(x).m) + ' (' + x.length + ')' : '—'; }).join(' · ');
  return [nom, String(rs.length), L.pc(1 - rs.reduce((q, r) => q + r.win, 0) / rs.length), L.pc(1 - rs.reduce((q, r) => q + r.q, 0) / rs.length), sg(t.m) + ' ±' + (200 * t.se).toFixed(1), L.f(t.z, 1), sg(a.m) + ' / ' + sg(b.m), porT];
}
log('## Al revés: jugar el MACHO cuando el modelo se enamora de la hembra\n' + L.tabla(['Regla', 'Juegos', 'Macho gana', 'Mercado decía', 'Rinde', 'z', 'A / B', 'Por temporada'], [
  filaF('Todos los machos', r => true),
  filaF('Modelo le da +2 a la hembra', r => r.gap >= 0.02),
  filaF('Modelo le da +4 a la hembra', r => r.gap >= 0.04),
  filaF('Modelo le da +6 a la hembra', r => r.gap >= 0.06),
  filaF('Modelo de acuerdo con el mercado (±2)', r => Math.abs(r.gap) < 0.02),
  filaF('Modelo le da −2 a la hembra', r => r.gap <= -0.02),
  filaF('Hembra jugó ayer y el macho no', r => r.b2bD && !r.b2bF)]));
// ¿el modelo ordena las hembras? regresión: gana = a + b·mercado + c·(modelo − mercado)
const reg = L.ols(filas.map(r => [1, r.q, r.gap]), filas.map(r => r.win));
log('Regresión: gana = a + b·(mercado) + c·(modelo − mercado): b = ' + L.f(reg.b[1], 2) + ' ± ' + L.f(2 * reg.se[1], 2) + ' · c = ' + L.f(reg.b[2], 2) + ' ± ' + L.f(2 * reg.se[2], 2) + ' (c = 0: el modelo no agrega nada al precio de la hembra).');
if (process.argv[3]) fs.writeFileSync(process.argv[3], out.join('\n') + '\n');
