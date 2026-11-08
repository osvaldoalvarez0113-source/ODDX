'use strict';
/* ===================================================================
   OVA · TENIS: la misma batería de pruebas que MLB, fútbol, NBA, NHL y NFL. Solo mide. Corre en GitHub Actions
   (workflow «Medir tenis», rama resultados-tenis). Entrada: preds-tenis.json (rama datos-tenis), que trae cada
   partido de 2024 a hoy predicho SOLO con lo que había antes, más lo que sabía cada jugador antes de jugar.
   1) Huecos del modelo: descanso, jugó ayer, partido largo antes, cara a cara, forma, inactividad, caída del pico, superficie.
   2) Fórmula calibrada: logit(p) = a + b·logit(modelo), elegida con 2024-2025 y probada en 2026.
   3) Mercado (Kalshi, KXATPMATCH / KXWTAMATCH): pérdida log modelo vs mercado, λ, apostar donde discrepan,
      picks ganadores (favoritos 60%+, ⭐ del día, filtros con el modelo), tramos de precio, patrones.
   Salida: resultado_tenis.md + filas_tenis_kalshi.json
   =================================================================== */
const fs = require('fs');
const API = 'https://api.elections.kalshi.com/trade-api/v2';
const SERIES = { a: 'KXATPMATCH', w: 'KXWTAMATCH' };
const MES = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
const C26 = Date.UTC(2026, 0, 1) / 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion', accept: 'application/json' } }); if (r.status === 404) return null; if (r.status === 429) { await sleep(3000 * (i + 1)); continue; } if (r.ok) return await r.json(); } catch (e) { } await sleep(700 * (i + 1)); } return null; }
async function pool(t, k, ms = 80) { let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < t.length) { const f = t[i++]; await f(); await sleep(ms); } })); }
const L = [], log = s => { L.push(s); console.log(s); };
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const est = a => { const m = prom(a), s = Math.sqrt(a.reduce((q, v) => q + (v - m) * (v - m), 0) / Math.max(a.length - 1, 1) / Math.max(a.length, 1)); return { m, s, n: a.length }; };
const pctTxt = x => (100 * x).toFixed(1) + '%';
const roiTxt = u => { const e = est(u); return u.length ? `${(100 * e.m).toFixed(1)}% ±${(200 * e.s).toFixed(1)} (${u.length})` : 'sin apuestas'; };
const dol = (o, k) => { if (!o) return null; const d = parseFloat(o[k + '_dollars']); if (isFinite(d)) return d; const c = parseFloat(o[k]); return isFinite(c) ? (c > 1 ? c / 100 : c) : null; };
const pago = (P, gana) => { const fee = 0.07 * P * (1 - P); return (gana ? (1 - P - fee) : (-P - fee)) / (P + fee); };   // por $1, con comisión de Kalshi
const lg = p => Math.log(p / (1 - p)), sg = x => 1 / (1 + Math.exp(-x));
const LO = (p, y) => -Math.log(Math.max(y ? p : 1 - p, 1e-9));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const apellido = s => { const p = norm(s).split(' '); return p[p.length - 1] || ''; };
// diferencia pareada de pérdida log (×1000) con su error: positivo = el segundo es mejor
function compara(filas, pa, pb) { const d = filas.map(f => LO(pa(f), f.y) - LO(pb(f), f.y)); const e = est(d); return { mejora: 1000 * e.m, z: e.s ? e.m / e.s : 0, n: d.length }; }

/* regresión logística chica (Newton) — x: lista de vectores sin la constante */
function logit(X, y, l2 = 1e-6) {
  const k = X[0].length + 1; let b = new Array(k).fill(0);
  for (let it = 0; it < 30; it++) {
    const g = new Array(k).fill(0), H = Array.from({ length: k }, () => new Array(k).fill(0));
    X.forEach((x, i) => { const v = [1, ...x], p = sg(v.reduce((s, xi, j) => s + xi * b[j], 0)), w = p * (1 - p); for (let a = 0; a < k; a++) { g[a] += (y[i] - p) * v[a]; for (let c = 0; c < k; c++) H[a][c] += w * v[a] * v[c]; } });
    for (let a = 0; a < k; a++) { H[a][a] += l2; g[a] -= l2 * b[a]; }
    const d = resolver(H, g); b = b.map((x, j) => x + d[j]); if (Math.max(...d.map(Math.abs)) < 1e-8) break;
  }
  return b;
}
function resolver(A, v) { const n = v.length, M = A.map((r, i) => [...r, v[i]]); for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]]; for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; } } return M.map((r, i) => r[n] / r[i]); }

(async () => {
  const P = JSON.parse(fs.readFileSync(process.argv[2] || 'preds-tenis.json', 'utf8')).filter(p => p.fin === 'F' && p.fW);
  log('# Tenis: la misma batería de pruebas que las otras apps\n');
  log(`Partidos terminados con predicción: ${P.length} (ATP ${P.filter(p => p.tour === 'a').length}, WTA ${P.filter(p => p.tour === 'w').length}), del ${new Date(P[0].ts * 1000).toISOString().slice(0, 10)} al ${new Date(P[P.length - 1].ts * 1000).toISOString().slice(0, 10)}. Retiros y W.O. fuera.`);

  // filas vistas desde el FAVORITO del modelo (y = 1 si ganó el favorito)
  const F = P.map(p => {
    const favW = p.pW >= 0.5, fv = favW ? p.fW : p.fL, rv = favW ? p.fL : p.fW;
    return { p, y: favW ? 1 : 0, pm: Math.max(p.pW, 1 - p.pW), fv, rv, h: favW ? p.h2h : [p.h2h[1], p.h2h[0]], pAll: favW ? p.pAll : 1 - p.pAll, pSup: favW ? p.pSup : 1 - p.pSup, ent: p.ts < C26 };
  });

  /* ---------- 1) huecos del modelo ---------- */
  log('\n## 1) Lo que el modelo no lee (huecos)\n\nCada factor se agrega a la predicción del modelo con una logística elegida en 2024-2025 y se prueba en 2026. Mejora = cuánto baja la pérdida log ×1000 (positivo = ayuda). Con 9 pruebas hace falta z > 2.8 (Holm) para creerle.\n');
  const cap = (x, a, b) => Math.max(a, Math.min(b, x));
  const FACT = [
    ['Días de descanso (tope 30)', f => [cap(f.fv.dias == null ? 30 : f.fv.dias, 0, 30) - cap(f.rv.dias == null ? 30 : f.rv.dias, 0, 30)]],
    ['Jugó ayer (o hace menos de 30 h)', f => [(f.fv.dias != null && f.fv.dias < 1.25 ? 1 : 0) - (f.rv.dias != null && f.rv.dias < 1.25 ? 1 : 0)]],
    ['Games del partido anterior si fue hace ≤2 días (cansancio)', f => [((f.fv.dias != null && f.fv.dias <= 2) ? (f.fv.gPrev || 0) : 0) - ((f.rv.dias != null && f.rv.dias <= 2) ? (f.rv.gPrev || 0) : 0)]],
    ['Cara a cara previo', f => [(f.h[0] - f.h[1]) / (f.h[0] + f.h[1] + 2)]],
    ['Forma: % ganado en sus últimos 10', f => [(f.fv.n10 ? f.fv.v10 / f.fv.n10 : 0.5) - (f.rv.n10 ? f.rv.v10 / f.rv.n10 : 0.5)]],
    ['Vuelve tras 45+ días sin jugar', f => [(f.fv.dias != null && f.fv.dias > 45 ? 1 : 0) - (f.rv.dias != null && f.rv.dias > 45 ? 1 : 0)]],
    ['Caída desde su mejor Elo (lesión, bajón)', f => [((f.fv.pico - f.fv.all) - (f.rv.pico - f.rv.all)) / 100]],
    ['Más peso a la superficie (Elo de superficie vs general)', f => [lg(cap(f.pSup, .01, .99)) - lg(cap(f.pAll, .01, .99))]],
    ['Pocos partidos en la base (los dos)', f => [Math.log(1 + (f.fv.n10 || 0)) - Math.log(1 + (f.rv.n10 || 0))]]
  ];
  log('| Factor | Partidos 2026 | Mejora ×1000 | z | Coeficiente | Veredicto |\n|---|---|---|---|---|---|');
  const ent = F.filter(f => f.ent), test = F.filter(f => !f.ent);
  const base = logit(ent.map(f => [lg(f.pm)]), ent.map(f => f.y));
  const pBase = f => sg(base[0] + base[1] * lg(f.pm));
  const huecos = [];
  FACT.forEach(([nom, fx]) => {
    const b = logit(ent.map(f => [lg(f.pm), ...fx(f)]), ent.map(f => f.y));
    const pN = f => sg(b[0] + b[1] * lg(f.pm) + fx(f).reduce((s, x, j) => s + x * b[j + 2], 0));
    const c = compara(test, pBase, pN);
    huecos.push({ nom, ...c, coef: b.slice(2) });
    log(`| ${nom} | ${c.n} | ${c.mejora >= 0 ? '+' : ''}${c.mejora.toFixed(2)} | ${c.z.toFixed(1)} | ${b.slice(2).map(x => x.toFixed(3)).join(', ')} | ${c.z > 2.8 ? '**ayuda**' : (c.z < -2 ? 'empeora' : 'no se distingue')} |`);
  });
  { const b = logit(ent.map(f => [lg(f.pm), ...FACT.flatMap(([, fx]) => fx(f))]), ent.map(f => f.y));
    const pN = f => sg(b[0] + b[1] * lg(f.pm) + FACT.flatMap(([, fx]) => fx(f)).reduce((s, x, j) => s + x * b[j + 2], 0));
    const c = compara(test, pBase, pN); log(`| Todo junto | ${c.n} | ${c.mejora >= 0 ? '+' : ''}${c.mejora.toFixed(2)} | ${c.z.toFixed(1)} | — | ${c.z > 2.8 ? '**ayuda**' : (c.z < -2 ? 'empeora' : 'no se distingue')} |`); }
  // efecto bruto del cansancio, por si sirve para avisar en la app
  { const z = F.filter(f => f.fv.dias != null && f.fv.dias <= 1.25 && (f.fv.gPrev || 0) >= 30); log(`\nFavorito que jugó ayer un partido de 30+ games: ${z.length} partidos, dijo ${pctTxt(prom(z.map(f => f.pm)))}, ganó ${pctTxt(prom(z.map(f => f.y)))}.`);
    const z2 = F.filter(f => f.rv.dias != null && f.rv.dias <= 1.25 && (f.rv.gPrev || 0) >= 30); log(`Rival que jugó ayer un partido de 30+ games: ${z2.length} partidos, el favorito dijo ${pctTxt(prom(z2.map(f => f.pm)))}, ganó ${pctTxt(prom(z2.map(f => f.y)))}.`); }

  /* ---------- 2) fórmula calibrada ---------- */
  log('\n## 2) Fórmula calibrada: logit(p) = a + b·logit(modelo)\n');
  ['a', 'w'].forEach(t => {
    const e = ent.filter(f => f.p.tour === t), s = test.filter(f => f.p.tour === t);
    const b = logit(e.map(f => [lg(f.pm)]), e.map(f => f.y)), pN = f => sg(b[0] + b[1] * lg(f.pm));
    const c = compara(s, f => f.pm, pN);
    log(`- ${t === 'a' ? 'ATP' : 'WTA'}: a = ${b[0].toFixed(3)}, b = ${b[1].toFixed(3)} (1 = el modelo ya está bien inclinado). En 2026: mejora ${c.mejora.toFixed(2)} ×1000, z ${c.z.toFixed(1)} (${c.n} partidos).`);
  });

  /* ---------- 3) mercado: Kalshi ---------- */
  log('\n## 3) Contra el mercado (Kalshi)\n');
  const idx = {};   // fecha → preds de ese día y el de al lado
  P.forEach(p => { const d = new Date(p.ts * 1000).toISOString().slice(0, 10); (idx[d] = idx[d] || []).push(p); });
  const filas = [];
  for (const [t, serie] of Object.entries(SERIES)) {
    const ev = [];
    for (const b of ['/events', '/historical/events']) { let cur = ''; for (let i = 0; i < 150; i++) { const j = await get(`${API}${b}?series_ticker=${serie}&status=settled&with_nested_markets=true&limit=200${cur ? '&cursor=' + cur : ''}`); if (!j || !j.events) break; ev.push(...j.events); cur = j.cursor; if (!cur || !j.events.length) break; await sleep(150); } }
    const uniq = new Map(); ev.forEach(e => uniq.set(e.event_ticker, e));
    // 1º cruzar con ESPN por fecha y apellidos (título «A vs B»); solo a esos se les pide precio
    const lista = [];
    [...uniq.values()].forEach(e => {
      const x = /-(\d{2})([A-Z]{3})(\d{2})/.exec(e.event_ticker); const d = x && MES[x[2]] ? `20${x[1]}-${MES[x[2]]}-${x[3]}` : null; if (!d) return;
      const tt = String(e.title || e.sub_title || '').replace(/\(.*\)/, '').split(/\s+vs\.?\s+/i); if (tt.length !== 2) return;
      const ap = tt.map(apellido); if (!ap[0] || !ap[1] || ap[0] === ap[1]) return;
      const cand = []; [-1, 0, 1].forEach(dd => { const k = new Date(Date.parse(d) + dd * 864e5).toISOString().slice(0, 10); (idx[k] || []).forEach(p => { if (p.tour === t) cand.push(p); }); });
      const p = cand.find(p => { const z = [apellido(p.a), apellido(p.b)]; return ap.every(q => z.includes(q)); });
      if (p) lista.push({ e, d, p, ms: (e.markets || []).filter(m => m.result === 'yes' || m.result === 'no') });
    });
    log(`${t === 'a' ? 'ATP' : 'WTA'} (${serie}): eventos resueltos ${uniq.size}, cruzados con ESPN ${lista.length}`);
    let sinCruce = 0, sinVela = 0, hechos = 0;
    await pool(lista.map(x => async () => {
      if (x.ms.length !== 2) { for (const b of ['/markets', '/historical/markets']) { const r = await get(`${API}${b}?event_ticker=${x.e.event_ticker}&limit=10`, 3); const ms = ((r && r.markets) || []).filter(m => m.result === 'yes' || m.result === 'no'); if (ms.length === 2) { x.ms = ms; x.hist = b !== '/markets'; break; } } }
      if (x.ms.length !== 2) { sinCruce++; return; }
      const p = x.p, mW = x.ms.find(m => apellido(m.yes_sub_title || m.title) === apellido(p.a));
      if (!mW || mW.result !== 'yes') { sinCruce++; return; }   // Kalshi paga al que avanza: si no coincide con ESPN, fuera
      const ini = p.ts;
      // una sola vela: la del ganador. Comprar al ganador = su «ask»; comprar al otro ≈ 1 − «bid» del ganador
      const r = await get(`${API}${x.hist ? '/historical/markets/' + mW.ticker : '/series/' + serie + '/markets/' + mW.ticker}/candlesticks?start_ts=${ini - 8 * 3600}&end_ts=${ini - 300}&period_interval=60`, 3);
      const cs = (r && r.candlesticks) || [], u = cs[cs.length - 1];
      const ask = u ? dol(u.yes_ask, 'close') : null, bid = u ? dol(u.yes_bid, 'close') : null;
      if (!(ask > 0 && ask < 1 && bid > 0 && bid < 1 && ask >= bid)) { sinVela++; return; }
      filas.push({ id: p.id, ts: p.ts, tour: t, sup: p.sup, q: p.q, mj: p.mj, pW: p.pW, aW: ask, aL: 1 - bid, bW: bid, bL: 1 - ask, poco: Math.min(p.nW, p.nL) < 10, dW: p.fW.dias, dL: p.fL.dias, gW: p.fW.gPrev, gL: p.fL.gPrev, ev: p.ev, ronda: p.ronda });
      if (++hechos % 500 === 0) { console.log('  ' + t + ' con precio: ' + hechos); fs.writeFileSync('filas_tenis_kalshi.json', JSON.stringify(filas)); }
    }), 6, 40);
    log(`  cruzados con ESPN y con precio antes de empezar: ${filas.filter(f => f.tour === t).length} · sin cruce ${sinCruce} · sin precio ${sinVela}`);
  }
  fs.writeFileSync('filas_tenis_kalshi.json', JSON.stringify(filas));
  if (filas.length < 100) { log('\nMuy pocos partidos con precio de Kalshi para medir contra el mercado.'); fin(); return; }
  // precio del mercado sin margen: punto medio entre comprar a uno y vender al otro
  filas.forEach(f => { const m = (f.aW + (1 - f.aL)) / 2; f.mW = Math.min(Math.max(m, 0.01), 0.99); });
  filas.sort((a, b) => a.ts - b.ts);
  const mitad = filas[Math.floor(filas.length / 2)].ts;
  log(`\nPrecio: la última vela de 1 hora antes de la hora de ESPN. Comprar los dos lados cuesta de más (mediana) ${(100 * [...filas.map(f => f.aW + f.aL - 1)].sort((a, b) => a - b)[filas.length >> 1]).toFixed(1)} centavos. ROI con comisión 0.07 × P × (1 − P).`);

  // 3a) quién acierta más
  log('\n### Quién predice mejor\n\n| | Partidos | Pérdida log modelo | Pérdida log mercado | Acierto modelo | Acierto mercado | Diferencia ×1000 (z) |\n|---|---|---|---|---|---|---|');
  [['Todos', () => true], ['ATP', f => f.tour === 'a'], ['WTA', f => f.tour === 'w'], ['Dura', f => f.sup === 'H'], ['Arcilla', f => f.sup === 'C'], ['Hierba', f => f.sup === 'G'], ['Clasificación', f => f.q], ['Grand Slam', f => f.mj], ['Alguno con pocos partidos', f => f.poco]].forEach(([n, fl]) => {
    const z = filas.filter(fl).map(f => ({ y: 1, a: f.pW, b: f.mW })); if (z.length < 30) return;
    const c = compara(z, f => f.a, f => f.b);
    log(`| ${n} | ${z.length} | ${prom(z.map(f => LO(f.a, 1))).toFixed(4)} | ${prom(z.map(f => LO(f.b, 1))).toFixed(4)} | ${pctTxt(prom(z.map(f => f.a > .5 ? 1 : f.a === .5 ? .5 : 0)))} | ${pctTxt(prom(z.map(f => f.b > .5 ? 1 : f.b === .5 ? .5 : 0)))} | ${c.mejora >= 0 ? 'mercado +' : 'modelo +'}${Math.abs(c.mejora).toFixed(1)} (${Math.abs(c.z).toFixed(1)}) |`);
  });
  // λ: peso del modelo encima del mercado, elegido en la primera mitad y probado en la segunda
  { const e = filas.filter(f => f.ts < mitad), s = filas.filter(f => f.ts >= mitad);
    let mejor = 0, mejorL = 1e9; for (let l = 0; l <= 1.0001; l += 0.05) { const v = prom(e.map(f => LO(sg((1 - l) * lg(f.mW) + l * lg(Math.min(Math.max(f.pW, .01), .99))), 1))); if (v < mejorL) { mejorL = v; mejor = +l.toFixed(2); } }
    const c = compara(s.map(f => ({ y: 1, f })), x => x.f.mW, x => sg((1 - mejor) * lg(x.f.mW) + mejor * lg(Math.min(Math.max(x.f.pW, .01), .99))));
    log(`\nλ (peso del modelo sobre el mercado) elegido en la primera mitad: **${mejor.toFixed(2)}**. En la segunda mitad la mezcla cambia la pérdida log en ${(-c.mejora).toFixed(2)} ×1000 contra el mercado solo (z ${(-c.z).toFixed(1)}; negativo = mejora).`);
  }

  // lados para apostar: cada partido da dos lados (ganador y perdedor) con su precio de compra
  const lados = filas.flatMap(f => [
    { f, g: true, a: f.aW, mod: f.pW, mer: f.mW, fav: f.mW >= 0.5 }, { f, g: false, a: f.aL, mod: 1 - f.pW, mer: 1 - f.mW, fav: f.mW < 0.5 }]);
  // 3b) apostar donde el modelo discrepa
  log('\n### Apostar donde el modelo ve más que el precio de compra\n\n| Regla | Ganó | ROI |\n|---|---|---|');
  log(`| Todo (referencia) | ${pctTxt(prom(lados.map(l => l.g ? 1 : 0)))} | ${roiTxt(lados.map(l => pago(l.a, l.g)))} |`);
  [0, 0.03, 0.05, 0.08, 0.12].forEach(u => { const z = lados.filter(l => l.mod - l.a >= u); log(`| Modelo ${Math.round(u * 100)}+ pts encima de la compra | ${pctTxt(prom(z.map(l => l.g ? 1 : 0)))} | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); });
  [['solo 2026', l => l.f.ts >= C26], ['solo favoritos del mercado', l => l.fav], ['solo perros del mercado', l => !l.fav]].forEach(([n, fl]) => { const z = lados.filter(l => fl(l) && l.mod - l.a >= 0.05); log(`| Modelo 5+ pts encima, ${n} | ${pctTxt(prom(z.map(l => l.g ? 1 : 0)))} | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); });

  // 3c) picks ganadores
  log('\n### Picks ganadores (lo que pidió Osvaldo: acertar)\n\n| Filtro | Partidos | Mercado dice | Ganó | ROI a precio de compra |\n|---|---|---|---|---|');
  const favs = lados.filter(l => l.fav);
  const fila = (n, z) => log(`| ${n} | ${z.length} | ${pctTxt(prom(z.map(l => l.mer)))} | ${pctTxt(prom(z.map(l => l.g ? 1 : 0)))} | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`);
  fila('Favorito del mercado (todos)', favs);
  [[.6, .7], [.7, .8], [.8, .9], [.9, 1]].forEach(([a, b]) => fila(`Favorito ${a * 100}-${b * 100}%`, favs.filter(l => l.mer >= a && l.mer < b)));
  const f60 = favs.filter(l => l.mer >= 0.6);
  fila('Favorito 60%+', f60);
  fila('60%+ y el modelo de acuerdo', f60.filter(l => l.mod >= 0.5));
  fila('60%+ y el modelo le da más', f60.filter(l => l.mod > l.mer));
  fila('60%+ y el modelo en contra', f60.filter(l => l.mod < 0.5));
  fila('Perro que el modelo da ganador', lados.filter(l => !l.fav && l.mod > 0.5));
  // ⭐ el más seguro de cada día (por circuito)
  const dia = {}; favs.forEach(l => { const k = l.f.tour + new Date(l.f.ts * 1000 - 6 * 3600e3).toISOString().slice(0, 10); if (!dia[k] || l.mer > dia[k].mer) dia[k] = l; });
  fila('⭐ El más seguro de cada día (ATP y WTA aparte)', Object.values(dia));
  const diaM = {}; favs.forEach(l => { const k = l.f.tour + new Date(l.f.ts * 1000 - 6 * 3600e3).toISOString().slice(0, 10); if (!diaM[k] || l.mod > diaM[k].mod) diaM[k] = l; });
  fila('⭐ El más seguro de cada día según el MODELO', Object.values(diaM));
  fila('Favorito del modelo 75%+', lados.filter(l => l.mod >= 0.75));

  // 3d) tramos de precio
  log('\n### Por precio de compra\n\n| Compra | Ganó | ROI |\n|---|---|---|');
  [[.05, .2], [.2, .35], [.35, .5], [.5, .6], [.6, .7], [.7, .8], [.8, .9], [.9, .99]].forEach(([a, b]) => { const z = lados.filter(l => l.a >= a && l.a < b); if (z.length) log(`| ${Math.round(a * 100)}-${Math.round(b * 100)}¢ | ${pctTxt(prom(z.map(l => l.g ? 1 : 0)))} | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); });

  // 3e) patrones (favorito del mercado en cada situación)
  log('\n### Patrones (favorito del mercado)\n\n| Situación | Partidos | Mercado dice | Ganó | ROI |\n|---|---|---|---|---|');
  const pat = [
    ['ATP', l => l.f.tour === 'a'], ['WTA', l => l.f.tour === 'w'], ['Dura', l => l.f.sup === 'H'], ['Arcilla', l => l.f.sup === 'C'], ['Hierba', l => l.f.sup === 'G'],
    ['Clasificación', l => l.f.q], ['Grand Slam', l => l.f.mj], ['Final / semifinal', l => /final/i.test(l.f.ronda)],
    ['El favorito jugó ayer', l => (l.g ? l.f.dW : l.f.dL) != null && (l.g ? l.f.dW : l.f.dL) < 1.25],
    ['El favorito jugó ayer 30+ games', l => (l.g ? l.f.dW : l.f.dL) < 1.25 && (l.g ? l.f.gW : l.f.gL) >= 30],
    ['El favorito viene de 30+ días sin jugar', l => (l.g ? l.f.dW : l.f.dL) > 30],
    ['El rival viene de 30+ días sin jugar', l => (l.g ? l.f.dL : l.f.dW) > 30],
    ['Alguno con pocos partidos en la base', l => l.f.poco]
  ];
  pat.forEach(([n, fl]) => { const z = favs.filter(fl); if (z.length >= 30) fila2(n, z); });
  function fila2(n, z) { log(`| ${n} | ${z.length} | ${pctTxt(prom(z.map(l => l.mer)))} | ${pctTxt(prom(z.map(l => l.g ? 1 : 0)))} | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); }
  log('\nCon muchas filas, alguna sale bien por azar: solo cuenta si ROI/margen ≥ 2 y se repite por año.');
  // por año: lo principal
  const anios = [...new Set(lados.map(l => new Date(l.f.ts * 1000).getUTCFullYear()))].sort();
  log('\nPor año: ' + anios.map(y => `${y}: favorito 60%+ ${roiTxt(f60.filter(l => new Date(l.f.ts * 1000).getUTCFullYear() === y).map(l => pago(l.a, l.g)))}, modelo 5+ pts ${roiTxt(lados.filter(l => new Date(l.f.ts * 1000).getUTCFullYear() === y && l.mod - l.a >= 0.05).map(l => pago(l.a, l.g)))}`).join(' · '));
  fin();
  function fin() { fs.writeFileSync('resultado_tenis.md', L.join('\n') + '\n'); }
})().catch(e => { console.error(e); L.push('\nFALLÓ ' + e.message); fs.writeFileSync('resultado_tenis.md', L.join('\n') + '\n'); });
