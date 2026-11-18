// NFL: ¿saber que falta el mariscal titular (o los mejores jugadores de ataque) le sube aciertos al modelo de la app?
const M = require('../../modelo-nfl.js'), zlib = require('zlib'), fs = require('fs');
const db = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2] || 'nfl-box.json.gz')));
const G = db.g.map(g => Object.assign({}, g)).sort((a, b) => a.ts - b.ts);
const KQ = +(process.env.KQ || 150), REP = +(process.env.REP || 4.8);
const QB = {}; let lgY = 0, lgA = 0;                       // jugador -> {att, any} (ANY/A acumulado, con arrastre)
const anya = p => p[3] + 20 * p[4] - 45 * p[5];
const qQB = id => { const s = QB[id], lg = lgA ? lgY / lgA : 6; if (!s) return REP; return (s.any + lg * KQ) / (s.att + KQ); };
const T = {};   // equipo -> {qbs: [ids de los últimos titulares], sk: {id: {g, ypg}}}
const rows = [];
function titularQB(p, tid) { const l = p.filter(x => x[0] === tid && x[2] >= 8).sort((a, b) => b[2] - a[2]); return l[0] || null; }
function skill(p, tid) { return p.filter(x => x[0] === tid).map(x => [x[1], x[7] + x[10] + 6 * (x[8] + x[11])]); }
M.correr(G, M.PDEF, function (g, x) {
  const sk = M.seasonOf(g.ts), feats = {};
  ['h', 'a'].forEach(l => {
    const tid = g[l], t = T[tid] = T[tid] || { qbs: [], ys: {}, n: 0, sk };
    if (t.sk !== sk) { t.ys = {}; t.n = 0; t.sk = sk; }
    const qbHoy = titularQB(g.p, tid), regular = t.qbs.slice(-3);
    // mariscal habitual = el que más abrió en los últimos 3
    const cnt = {}; regular.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
    const hab = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const faltaQB = hab && qbHoy && qbHoy[1] !== hab && cnt[hab] >= 2 ? Math.max(0, qQB(hab) - Math.min(qQB(qbHoy[1]), qQB(hab))) : 0;
    // ataque: los 3 de más yardas por juego esta temporada (4+ juegos) que hoy no aparecen
    const hoy = new Set(g.p.filter(p => p[0] === tid).map(p => p[1]));
    const top = Object.keys(t.ys).map(id => [id, t.ys[id].y / t.ys[id].g, t.ys[id].g, t.ys[id].ult]).filter(z => z[2] >= 4 && t.n - z[3] <= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const faltaAt = top.filter(z => !hoy.has(z[0])).reduce((s, z) => s + z[1], 0);
    feats[l] = { faltaQB, faltaAt, n: t.n };
  });
  if (x.cH >= 3 && x.cA >= 3 && x.mar !== 0 && feats.h.n >= 3 && feats.a.n >= 3) {
    const sg = M.sigmas(x.S).sM;
    rows.push({ sk, pm: x.pm, sM: sg, win: x.mar > 0, mar: x.mar, qh: feats.h.faltaQB, qa: feats.a.faltaQB, ah: feats.h.faltaAt, aa: feats.a.faltaAt });
  }
  // actualizar
  ['h', 'a'].forEach(l => {
    const tid = g[l], t = T[tid], q = titularQB(g.p, tid);
    if (q) t.qbs.push(q[1]); t.n++;
    skill(g.p, tid).forEach(([id, y]) => { const s = t.ys[id] = t.ys[id] || { g: 0, y: 0, ult: 0 }; s.g++; s.y += y; s.ult = t.n; });
    g.p.filter(p => p[0] === tid && p[2] > 0).forEach(p => { const s = QB[p[1]] = QB[p[1]] || { att: 0, any: 0 }; s.att += p[2]; s.any += anya(p); lgA += p[2]; lgY += anya(p); });
  });
});
console.log('juegos medibles', rows.length, 'con mariscal habitual fuera', rows.filter(r => r.qh || r.qa).length);
function ev(rs, c1, c2) { let ok = 0, ll = 0; rs.forEach(r => { const pm = r.pm + c1 * (r.qa - r.qh) + c2 * (r.aa - r.ah), p = M.pML(pm, r.sM); ok += (p >= 0.5) === r.win; ll += -Math.log(Math.max(r.win ? p : 1 - p, 1e-9)); }); return [ok, ll]; }
function fit(rs) { let b = [0, 0, Infinity]; for (let c1 = 0; c1 <= 8.01; c1 += 0.5) for (let c2 = 0; c2 <= (process.env.SOLOQB ? 0 : 0.1001); c2 += 0.01) { const l = ev(rs, c1, c2)[1]; if (l < b[2]) b = [c1, c2, l]; } return b; }
const S = [...new Set(rows.map(r => r.sk))].sort(), tot = { n: 0, o0: 0, o1: 0, l0: 0, l1: 0, qn: 0, q0: 0, q1: 0 };
S.slice(2).forEach(sk => {
  const tr = rows.filter(r => r.sk < sk), te = rows.filter(r => r.sk === sk), b = fit(tr), a0 = ev(te, 0, 0), a1 = ev(te, b[0], b[1]);
  const qb = te.filter(r => r.qh || r.qa), q0 = ev(qb, 0, 0), q1 = ev(qb, b[0], b[1]);
  console.log(sk, 'n', te.length, 'c_QB', b[0], 'c_ataque', b[1].toFixed(2), 'aciertos', a0[0], '->', a1[0], '(' + (100 * a0[0] / te.length).toFixed(1) + '% -> ' + (100 * a1[0] / te.length).toFixed(1) + '%)', 'pérdida', (a0[1] / te.length).toFixed(4), '->', (a1[1] / te.length).toFixed(4), '| juegos sin su mariscal:', qb.length, q0[0], '->', q1[0]);
  tot.n += te.length; tot.o0 += a0[0]; tot.o1 += a1[0]; tot.l0 += a0[1]; tot.l1 += a1[1]; tot.qn += qb.length; tot.q0 += q0[0]; tot.q1 += q1[0];
});
console.log('TOTAL', tot.n, 'aciertos', (100 * tot.o0 / tot.n).toFixed(2) + '% ->', (100 * tot.o1 / tot.n).toFixed(2) + '%', 'pérdida', (tot.l0 / tot.n).toFixed(4), '->', (tot.l1 / tot.n).toFixed(4), '| sin mariscal:', tot.qn, tot.q0, '->', tot.q1, '| ajuste con todo', fit(rows).slice(0, 2));
{ const D = []; S.slice(2).forEach(sk => { const tr = rows.filter(r => r.sk < sk), b = fit(tr); rows.filter(r => r.sk === sk).forEach(r => { const l = (c1, c2) => { const p = M.pML(r.pm + c1 * (r.qa - r.qh) + c2 * (r.aa - r.ah), r.sM); return -Math.log(Math.max(r.win ? p : 1 - p, 1e-9)); }; D.push(l(0, 0) - l(b[0], b[1])); }); });
  const m = D.reduce((a, b) => a + b, 0) / D.length, sd = Math.sqrt(D.reduce((a, b) => a + (b - m) ** 2, 0) / (D.length - 1)); console.log('z de la mejora en pérdida', (m / sd * Math.sqrt(D.length)).toFixed(2)); }
