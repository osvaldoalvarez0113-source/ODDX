// NHL: ¿saber qué portero abre (y qué tan bueno es) le sube aciertos al modelo de la app?
const M = require('../../modelo-nhl.js'), H = require('../../hist-nhl.json'), BOX = JSON.parse(require('fs').readFileSync(process.argv[2] || 'nhl-box.json', 'utf8')).g;
const ESP = { LA: 'LAK', NJ: 'NJD', SJ: 'SJS', TB: 'TBL', UTAH: 'UTA' };
const ab = id => { const a = (H.teams[id] || [])[1] || ''; return ESP[a] || a; };
const idx = {}; BOX.forEach(b => { if (b.gH && b.gA) (idx[b.h + '|' + b.a] = idx[b.h + '|' + b.a] || []).push(b); });
const games = H.g.map(r => ({ id: r[0], ts: r[1], h: r[2], a: r[3], hs: r[4], as: r[5], so: !!(r[7] & 1), neutral: !!(r[7] & 4), sh: r[9], sa: r[10] })).sort((a, b) => a.ts - b.ts);
// calidad de portero: atajadas de más contra el promedio de la liga, por tiro, jalado a 0 con K tiros
const K = +(process.env.KTIROS || 1500), GQ = {}; let lgSA = 0, lgGA = 0;
const q = id => { const g = GQ[id]; if (!g) return 0; const lg = lgSA ? lgGA / lgSA : 0.1; return (lg * g.sa - g.ga) / (g.sa + K); };   // goles evitados por tiro
const TEAMG = {};   // equipo -> últimas aperturas [calidad]
const rows = [];
M.correr(games, M.PDEF, function (g, x) {
  const b = (idx[ab(g.h) + '|' + ab(g.a)] || []).find(b => Math.abs(b.ts - g.ts) < 12 * 3600e3);
  if (b && x.cH >= 8 && x.cA >= 8 && lgSA > 20000) {
    const tH = TEAMG[g.h] || [], tA = TEAMG[g.a] || [];
    if (tH.length >= 5 && tA.length >= 5) {
      const usual = l => l.slice(-10).reduce((s, v) => s + v, 0) / Math.min(l.length, 10);
      const dH = (q(b.gH.id) - usual(tH)) * 30, dA = (q(b.gA.id) - usual(tA)) * 30;   // goles por juego (~30 tiros)
      rows.push({ sk: M.seasonOf(g.ts), pm: x.pm, pt: x.pt, mar: g.so ? 0 : g.hs - g.as, homeWin: g.hs > g.as, dH, dA, D: M.dist });
    }
  }
  if (b) {
    [[b.gH, g.h], [b.gA, g.a]].forEach(([gk, tid]) => { (TEAMG[tid] = TEAMG[tid] || []).push(q(gk.id)); });
    [b.gH, b.gA].forEach(gk => { const s = GQ[gk.id] = GQ[gk.id] || { sa: 0, ga: 0 }; s.sa += gk.sa || 0; s.ga += gk.ga || 0; lgSA += gk.sa || 0; lgGA += gk.ga || 0; });
  }
});
console.log('juegos medibles', rows.length);
function ev(rs, c) { let ok = 0, ll = 0; rs.forEach(r => { const pH = M.dist(r.pm + c * (r.dH - r.dA), r.pt, M.PDEF).pH; ok += (pH >= 0.5) === r.homeWin; ll += -Math.log(Math.max(r.homeWin ? pH : 1 - pH, 1e-9)); }); return [ok, ll]; }
function mejorC(rs) { let best = [0, Infinity]; for (let c = 0; c <= 2.0001; c += 0.1) { const l = ev(rs, c)[1]; if (l < best[1]) best = [c, l]; } return best[0]; }
const S = [...new Set(rows.map(r => r.sk))].sort(); let T = { n: 0, o0: 0, o1: 0, l0: 0, l1: 0 };
S.slice(1).forEach(sk => {
  const tr = rows.filter(r => r.sk < sk), te = rows.filter(r => r.sk === sk), c = mejorC(tr), a = ev(te, 0), b = ev(te, c);
  const big = te.filter(r => Math.abs(r.dH - r.dA) >= 0.4), ba = ev(big, 0), bb = ev(big, c);
  console.log(sk, 'n', te.length, 'c', c.toFixed(1), 'aciertos', a[0], '->', b[0], '(' + (100 * a[0] / te.length).toFixed(1) + '% -> ' + (100 * b[0] / te.length).toFixed(1) + '%)', 'pérdida', (a[1] / te.length).toFixed(4), '->', (b[1] / te.length).toFixed(4), '| portero muy distinto:', big.length, ba[0], '->', bb[0]);
  T.n += te.length; T.o0 += a[0]; T.o1 += b[0]; T.l0 += a[1]; T.l1 += b[1];
});
console.log('TOTAL', T.n, 'aciertos', (100 * T.o0 / T.n).toFixed(2) + '% ->', (100 * T.o1 / T.n).toFixed(2) + '%', 'pérdida', (T.l0 / T.n).toFixed(4), '->', (T.l1 / T.n).toFixed(4), 'c con todo', mejorC(rows).toFixed(1));
