'use strict';
/* ===================================================================
   OVA · ¿Los mercados chicos de Kalshi se equivocan más? (Challenger, ITF, props, basket universitario)
   No necesita modelo: para cada mercado resuelto se toma el precio de la última vela de 1 hora ANTES de la hora
   de inicio (occurrence_datetime) y se mira qué habría pasado comprando SÍ (a su «ask») o NO (a 1 − «bid»), con la
   comisión de Kalshi. Si un mercado es eficiente, ningún tramo de precio gana de forma sostenida.
   Se compara contra mercados grandes (ATP, WTA, NBA) medidos igual. Salida: resultado_chicos.md
   =================================================================== */
const fs = require('fs');
const API = 'https://api.elections.kalshi.com/trade-api/v2';
const SERIES = [
  ['KXATPCHALLENGERMATCH', 'Tenis Challenger ATP', 'chico'], ['KXITFMATCH', 'Tenis ITF', 'chico'],
  ['KXNHLGOAL', 'NHL: anota gol (jugador)', 'chico'], ['KXNBAREB', 'NBA: rebotes (jugador)', 'chico'], ['KXNBAPTS', 'NBA: puntos (jugador)', 'chico'],
  ['KXNFLREC', 'NFL: recepciones (jugador)', 'chico'], ['KXNFLRSHYDS', 'NFL: yardas por tierra (jugador)', 'chico'],
  ['KXNCAAMBGAME', 'Basket universitario: ganador', 'chico'], ['KXNCAAMBSPREAD', 'Basket universitario: hándicap', 'chico'],
  ['KXATPMATCH', 'ATP (grande, para comparar)', 'grande'], ['KXWTAMATCH', 'WTA (grande, para comparar)', 'grande'], ['KXNBAGAME', 'NBA ganador (grande, para comparar)', 'grande']
];
const MAX = +(process.env.MAX_MERCADOS || 1500);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'ova-medicion' } }); if (r.status === 404) return null; if (r.status === 429) { await sleep(2500 * (i + 1)); continue; } if (r.ok) return await r.json(); } catch (e) { } await sleep(600 * (i + 1)); } return null; }
async function pool(t, k, ms) { let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < t.length) { const f = t[i++]; await f(); await sleep(ms); } })); }
const dol = (o, k) => { if (!o) return null; const d = parseFloat(o[k + '_dollars']); if (isFinite(d)) return d; const c = parseFloat(o[k]); return isFinite(c) ? (c > 1 ? c / 100 : c) : null; };
const pago = (P, gana) => { const fee = 0.07 * P * (1 - P); return (gana ? (1 - P - fee) : (-P - fee)) / (P + fee); };
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const est = a => { const m = prom(a), s = Math.sqrt(a.reduce((q, v) => q + (v - m) * (v - m), 0) / Math.max(a.length - 1, 1) / Math.max(a.length, 1)); return { m, s, n: a.length }; };
const roi = u => { const e = est(u); return u.length ? `${(100 * e.m).toFixed(1)}% ±${(200 * e.s).toFixed(1)}` : '—'; };
const L = [], log = s => { L.push(s); console.log(s); };
const TRAMOS = [[0.02, 0.1], [0.1, 0.25], [0.25, 0.45], [0.45, 0.55], [0.55, 0.75], [0.75, 0.9], [0.9, 0.98]];

(async () => {
  log('# ¿Los mercados chicos de Kalshi se equivocan más?\n');
  log(`Precio: la última vela de 1 hora antes de la hora de inicio que pone Kalshi. Hasta ${MAX} mercados resueltos por serie (los más recientes). ROI por $1 con la comisión 0.07 × P × (1 − P). ± = 2 errores estándar.\n`);
  const resumen = [];
  for (const [serie, nom, tipo] of SERIES) {
    const ms = [];
    for (const b of ['/events', '/historical/events']) {
      let cur = '';
      for (let i = 0; i < 60 && ms.length < MAX; i++) {
        const j = await get(`${API}${b}?series_ticker=${serie}&status=settled&with_nested_markets=true&limit=200${cur ? '&cursor=' + encodeURIComponent(cur) : ''}`);
        if (!j || !j.events || !j.events.length) break;
        j.events.forEach(e => (e.markets || []).forEach(m => { if ((m.result === 'yes' || m.result === 'no') && m.occurrence_datetime && ms.length < MAX) ms.push({ t: m.ticker, r: m.result === 'yes', ini: Date.parse(m.occurrence_datetime) / 1000, ab: Date.parse(m.open_time) / 1000, hist: b !== '/events', vol: +(m.volume_fp || m.volume || 0) }); }));
        cur = j.cursor; if (!cur) break; await sleep(120);
      }
      if (ms.length >= MAX) break;
    }
    const filas = [];
    await pool(ms.map(m => async () => {
      if (!(m.ini > m.ab)) return;
      const r = await get(`${API}${m.hist ? '/historical/markets/' + m.t : '/series/' + serie + '/markets/' + m.t}/candlesticks?start_ts=${Math.max(m.ab, m.ini - 12 * 3600)}&end_ts=${m.ini}&period_interval=60`, 3);
      const cs = ((r && r.candlesticks) || []).filter(c => c.end_period_ts <= m.ini);
      const u = cs[cs.length - 1]; if (!u) return;
      const ask = dol(u.yes_ask, 'close'), bid = dol(u.yes_bid, 'close');
      if (!(ask > 0.01 && ask < 0.99 && bid > 0.01 && bid <= ask)) return;
      filas.push({ ...m, ask, bid, mid: (ask + bid) / 2 });
    }), 6, 30);
    filas.sort((a, b) => a.ini - b.ini);
    log(`\n## ${nom} (${serie})\n`);
    if (filas.length < 100) { log(`Solo ${filas.length} mercados con precio antes de empezar: muy pocos para medir.`); resumen.push({ nom, tipo, n: filas.length }); continue; }
    const mitad = filas[filas.length >> 1].ini;
    const desde = new Date(filas[0].ini * 1000).toISOString().slice(0, 10), hasta = new Date(filas[filas.length - 1].ini * 1000).toISOString().slice(0, 10);
    const sprd = [...filas.map(f => f.ask - f.bid)].sort((a, b) => a - b)[filas.length >> 1];
    log(`${filas.length} mercados con precio, del ${desde} al ${hasta}. Diferencia compra-venta (mediana): ${(100 * sprd).toFixed(1)}¢.\n`);
    log('| Precio | Mercados | Dice | Pasó | Comprar SÍ | Comprar NO | SÍ 1ª mitad / 2ª mitad |\n|---|---|---|---|---|---|---|');
    let mejor = null;
    TRAMOS.forEach(([a, b]) => {
      const z = filas.filter(f => f.mid >= a && f.mid < b); if (z.length < 30) return;
      const si = z.map(f => pago(f.ask, f.r)), no = z.map(f => pago(1 - f.bid, !f.r));
      const s1 = z.filter(f => f.ini < mitad).map(f => pago(f.ask, f.r)), s2 = z.filter(f => f.ini >= mitad).map(f => pago(f.ask, f.r));
      log(`| ${Math.round(a * 100)}-${Math.round(b * 100)}¢ | ${z.length} | ${(100 * prom(z.map(f => f.mid))).toFixed(1)}% | ${(100 * prom(z.map(f => f.r ? 1 : 0))).toFixed(1)}% | ${roi(si)} | ${roi(no)} | ${roi(s1)} / ${roi(s2)} |`);
      [['SÍ', si, s1, s2], ['NO', no, z.filter(f => f.ini < mitad).map(f => pago(1 - f.bid, !f.r)), z.filter(f => f.ini >= mitad).map(f => pago(1 - f.bid, !f.r))]].forEach(([lado, u, u1, u2]) => {
        const e = est(u), e1 = est(u1), e2 = est(u2);
        const z2 = e.s ? e.m / e.s : 0;
        if (!mejor || z2 > mejor.z) mejor = { lado, tramo: `${Math.round(a * 100)}-${Math.round(b * 100)}¢`, roi: e.m, z: z2, n: u.length, ambas: e1.m > 0 && e2.m > 0 };
      });
    });
    const todo = filas.map(f => pago(f.ask, f.r));
    log(`\nComprar SÍ en todo: ${roi(todo)}. Lo mejor de esta serie: comprar ${mejor.lado} a ${mejor.tramo}, ROI ${(100 * mejor.roi).toFixed(1)}% (z ${mejor.z.toFixed(1)}, ${mejor.n} mercados, ${mejor.ambas ? 'positivo en las dos mitades' : 'no se repite en las dos mitades'}).`);
    resumen.push({ nom, tipo, n: filas.length, sprd, mejor, todo: est(todo).m });
  }
  log('\n## Resumen\n\n| Mercado | Tipo | Mercados | Compra-venta | Mejor tramo | ROI | z | ¿Se repite? |\n|---|---|---|---|---|---|---|---|');
  resumen.forEach(r => log(r.mejor ? `| ${r.nom} | ${r.tipo} | ${r.n} | ${(100 * r.sprd).toFixed(1)}¢ | ${r.mejor.lado} ${r.mejor.tramo} | ${(100 * r.mejor.roi).toFixed(1)}% | ${r.mejor.z.toFixed(1)} | ${r.mejor.ambas ? 'sí' : 'no'} |` : `| ${r.nom} | ${r.tipo} | ${r.n} | — | — | — | — | — |`));
  log('\nCon 12 series × 7 tramos × 2 lados (168 pruebas), algo sale bien por azar. Solo cuenta un tramo con z ≥ 3.3 (Holm) que además gane en las dos mitades.');
  fs.writeFileSync('resultado_chicos.md', L.join('\n') + '\n');
})().catch(e => { console.error(e); L.push('FALLÓ ' + e.message); fs.writeFileSync('resultado_chicos.md', L.join('\n') + '\n'); });
