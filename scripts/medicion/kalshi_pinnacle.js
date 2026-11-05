'use strict';
// Solo mide. Corre en GitHub Actions. ¿Kalshi vende más barato que el precio justo de las casas?
// Toma mercados ya resueltos de Kalshi, su precio de COMPRA antes del juego, y lo compara con la línea de ESPN sin margen y con Pinnacle si hay historia.
const fs = require('fs');
const API = 'https://api.elections.kalshi.com/trade-api/v2', ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const DEP = { nba: ['KXNBAGAME', 'basketball/nba', { NOP: 'NO', GSW: 'GS', NYK: 'NY', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', PHO: 'PHX' }], nhl: ['KXNHLGAME', 'hockey/nhl', { LAK: 'LA', NJD: 'NJ', SJS: 'SJ', TBL: 'TB', WAS: 'WSH', UTA: 'UTAH', MTL: 'MON', VGK: 'VGK' }], nfl: ['KXNFLGAME', 'football/nfl', { JAC: 'JAX', WAS: 'WSH', LA: 'LAR' }], mlb: ['KXMLBGAME', 'baseball/mlb', { ARI: 'ARI', AZ: 'ARI', CHW: 'CHW', CWS: 'CHW', WAS: 'WSH', KCR: 'KC', SDP: 'SD', SFG: 'SF', TBR: 'TB', OAK: 'ATH', AS: 'ATH' }] };
const MES = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u, n = 4) { for (let i = 0; i < n; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'ova-medicion', accept: 'application/json' } }); if (r.status === 404) return null; if (r.status === 429) { await sleep(3000 * (i + 1)); continue; } if (r.ok) return await r.json(); } catch (e) {} await sleep(700 * (i + 1)); } return null; }
async function pool(t, k, ms = 80) { let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < t.length) { const f = t[i++]; await f(); await sleep(ms); } })); }
const L = [], log = s => { L.push(s); console.log(s); };
const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), est = a => { const m = prom(a), s = Math.sqrt(a.reduce((q, v) => q + (v - m) * (v - m), 0) / Math.max(a.length - 1, 1) / Math.max(a.length, 1)); return { m, s, n: a.length }; };
const med = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
const imp = x => x > 0 ? 100 / (x + 100) : -x / (-x + 100), am = v => { const n = parseFloat(String(v).replace(/[^0-9.+-]/g, '')); return isFinite(n) && Math.abs(n) >= 100 ? n : null; };
const roiTxt = u => { const e = est(u); return u.length ? `${(100 * e.m).toFixed(1)}% ±${(200 * e.s).toFixed(1)} (${u.length})` : 'sin apuestas'; };
const dol = (o, k) => { if (!o) return null; const d = parseFloat(o[k + '_dollars']); if (isFinite(d)) return d; const c = parseFloat(o[k]); return isFinite(c) ? (c > 1 ? c / 100 : c) : null; };
// ganancia por $1 apostado, con la comisión de Kalshi al comprar: 0.07 × P × (1−P) por contrato
const pago = (P, gana) => { const fee = 0.07 * P * (1 - P); return (gana ? (1 - P - fee) : (-P - fee)) / (P + fee); };
async function eventos(serie) { const out = []; for (const base of ['/events', '/historical/events']) { let cur = ''; for (let i = 0; i < 80; i++) { const j = await get(`${API}${base}?series_ticker=${serie}&status=settled&with_nested_markets=true&limit=200${cur ? '&cursor=' + cur : ''}`); if (!j || !j.events) break; out.push(...j.events); cur = j.cursor; if (!cur || !j.events.length) break; await sleep(150); } } const m = new Map(); out.forEach(e => m.set(e.event_ticker, e)); return [...m.values()]; }
function pinnacle() { const out = {}; const dir = 'hist-precios'; if (!fs.existsSync(dir)) return out; fs.readdirSync(dir).forEach(f => { const m = /pinnacle-(nba|nhl|nfl|datos)-/.exec(f); if (!m) return; const dep = m[1] === 'datos' ? 'mlb' : m[1]; fs.readFileSync(dir + '/' + f, 'utf8').split('\n').forEach(l => { if (!l.trim()) return; try { const j = JSON.parse(l), g0 = Date.parse(j.generado || j.t || ''); ((j.juegos || (j.d && j.d.juegos)) || []).forEach(g => { const v = dep === 'mlb' ? g.fair : g.ml; if (!Array.isArray(v) || !g.t) return; (out[dep] = out[dep] || []).push({ t: Date.parse(g.t), g0, n: g.n, v }); }); } catch (e) {} }); }); return out; }
(async () => {
  const PIN = pinnacle(), TODO = []; log('Pinnacle en historia: ' + Object.keys(PIN).map(k => k + ' ' + PIN[k].length).join(', '));
  for (const [dep, [serie, espn, al]] of Object.entries(DEP)) {
    const ev = await eventos(serie), norm = s => al[s] || s, porDia = {}, F = []; log(`\n${dep}: eventos resueltos ${ev.length}`); if (!ev.length) continue;
    const juegos = ev.map(e => { const x = /-(\d{2})([A-Z]{3})(\d{2})/.exec(e.event_ticker); const d = x && MES[x[2]] ? `20${x[1]}${MES[x[2]]}${x[3]}` : null; const ms = (e.markets || []).filter(m => m.result === 'yes' || m.result === 'no'); return d ? { d, ms, t: e.event_ticker } : null; }).filter(Boolean);
    const faltan = juegos.filter(j => j.ms.length !== 2); log(`${dep}: sin mercados en la lista ${faltan.length}; se piden uno por uno`); let hist = 0;
    await pool(faltan.map(j => async () => { for (const base of ['/markets', '/historical/markets']) { const r = await get(`${API}${base}?event_ticker=${j.t}&limit=10`, 3); const ms = ((r && r.markets) || []).filter(m => m.result === 'yes' || m.result === 'no'); if (ms.length === 2) { j.ms = ms; j.hist = base !== '/markets'; if (j.hist) hist++; return; } } }), 4, 60);
    log(`${dep}: viejos en historial ${hist}`); const buenos = juegos.filter(j => j.ms.length === 2);
    const dias = [...new Set(buenos.map(j => j.d))]; await pool(dias.map(d => async () => { const j = await get(`${ESPN}${espn}/scoreboard?dates=${d}&limit=40`); porDia[d] = (j && j.events) || []; }), 4);
    await pool(buenos.map(j => async () => { const eE = porDia[j.d].find(e => { try { const ab = e.competitions[0].competitors.map(c => c.team.abbreviation); return j.ms.every(m => ab.includes(norm(String(m.ticker).split('-').pop()))); } catch (x) { return false; } }); if (!eE) { F.push({ sin: 1 }); return; }
      const c = eE.competitions[0], h = c.competitors.find(x => x.homeAway === 'home').team.abbreviation, ini = Date.parse(eE.date), mH = j.ms.find(m => norm(String(m.ticker).split('-').pop()) === h), mA = j.ms.find(m => m !== mH); if (!mH || !mA || !(ini < Date.now())) return;
      const vela = async m => { const r = await get(`${API}${j.hist ? '/historical/markets/' + m.ticker : '/series/' + serie + '/markets/' + m.ticker}/candlesticks?start_ts=${Math.floor(ini / 1000) - 6 * 3600}&end_ts=${Math.floor(ini / 1000) - 300}&period_interval=60`, 3); const cs = (r && r.candlesticks) || []; const u = cs[cs.length - 1]; if (!u) return null; const ask = dol(u.yes_ask, 'close'), bid = dol(u.yes_bid, 'close'); return ask > 0 && ask < 1 ? { ask, bid, vol: parseFloat(u.volume_fp !== undefined ? u.volume_fp : u.volume) || 0 } : null; };
      const vH = await vela(mH), vA = await vela(mA); if (!vH || !vA) { F.push({ sinVela: 1 }); return; }
      const s = await get(`${ESPN}${espn}/summary?event=${eE.id}`, 2), o = s && s.pickcenter && s.pickcenter[0]; let kH = null; if (o) { const a = am(o.homeTeamOdds && o.homeTeamOdds.moneyLine), b = am(o.awayTeamOdds && o.awayTeamOdds.moneyLine); if (a && b) { const i = imp(a), z = imp(b); kH = i / (i + z); } }
      let pH = null; (PIN[dep] || []).forEach(g => { if (Math.abs(g.t - ini) < 3 * 36e5 && g.g0 < ini && g.n) { const nm = c.competitors.find(x => x.homeAway === 'home').team; const dir = String(g.n[0]).includes(nm.name || '~') || String(g.n[0]) === nm.displayName, inv = String(g.n[1]).includes(nm.name || '~') || String(g.n[1]) === nm.displayName; if (dir || inv) { const q = (dir ? g.v[0] : g.v[1]); pH = q > 1 ? q / 100 : q; } } });
      F.push({ dep, d: j.d, h: j.hist ? 1 : 0, yH: mH.result === 'yes' ? 1 : 0, aH: vH.ask, aA: vA.ask, bH: vH.bid, bA: vA.bid, kH, pH });
    }), 3, 120);
    F.filter(x => x.dep).length; const q = F.filter(x => x.dep); log(`${dep}: mercados completos ${buenos.length}, cruzados ${q.length}, sin ESPN ${F.filter(x => x.sin).length}, sin precio ${F.filter(x => x.sinVela).length}, con línea ESPN ${q.filter(x => x.kH).length}, con Pinnacle ${q.filter(x => x.pH).length}`); TODO.push(...q);
  }
  fs.writeFileSync('filas_kalshi.json', JSON.stringify(TODO));
  const LO = x => -Math.log(Math.max(x, 1e-9));
  for (const dep of ['todos', 'nba', 'nhl', 'nfl', 'mlb']) {
    const q = TODO.filter(x => dep === 'todos' || x.dep === dep); if (q.length < 20) continue;
    log(`\n## ${dep} (${q.length} juegos)`);
    const mid = x => { const a = (x.aH + 1 - x.aA) / 2; return a; };
    const dif = q.map(x => (x.aH + x.aA - 1) * 100); log(`Diferencial al comprar los dos lados (mediana): ${med(dif).toFixed(1)} centavos`);
    log(`Error Kalshi ${prom(q.map(x => LO(x.yH ? mid(x) : 1 - mid(x)))).toFixed(4)}`);
    const c = q.filter(x => x.kH); if (c.length > 20) { log(`Con línea ESPN (${c.length}): Kalshi ${prom(c.map(x => LO(x.yH ? mid(x) : 1 - mid(x)))).toFixed(4)} línea ${prom(c.map(x => LO(x.yH ? x.kH : 1 - x.kH))).toFixed(4)} | distancia mediana ${med(c.map(x => Math.abs(mid(x) - x.kH) * 100)).toFixed(1)} pts`); }
    log('Por temporada del favorito (compra 60+ centavos) y del perro (menos de 40): ' + [...new Set(q.map(x => x.d.slice(0, 4)))].sort().map(y => { const zz = q.filter(x => x.d.slice(0, 4) === y).flatMap(x => [{ a: x.aH, g: x.yH === 1 }, { a: x.aA, g: x.yH === 0 }]); return y + ' fav ' + roiTxt(zz.filter(l => l.a >= .6).map(l => pago(l.a, l.g))) + ' perro ' + roiTxt(zz.filter(l => l.a < .4).map(l => pago(l.a, l.g))); }).join(' · '));
    log('| Regla, al precio de compra y con comisión | ROI |\n|---|---|');
    const lados = q.flatMap(x => [{ a: x.aH, g: x.yH === 1, fair: x.kH, pin: x.pH }, { a: x.aA, g: x.yH === 0, fair: x.kH == null ? null : 1 - x.kH, pin: x.pH == null ? null : 1 - x.pH }]);
    log(`| Todo (referencia) | ${roiTxt(lados.map(l => pago(l.a, l.g)))} |`);
    [[.01, .25], [.25, .4], [.4, .5], [.5, .6], [.6, .75], [.75, .99]].forEach(([a, b]) => { const z = lados.filter(l => l.a >= a && l.a < b); log(`| Compra entre ${Math.round(a * 100)} y ${Math.round(b * 100)} centavos: ganó ${(100 * prom(z.map(l => l.g ? 1 : 0))).toFixed(1)}% | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); });
    for (const u of [0, .01, .02, .03, .05]) { const z = lados.filter(l => l.fair != null && l.fair - l.a >= u); log(`| Kalshi ${u * 100}+ centavos más barato que la línea ESPN sin margen | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); }
    for (const u of [0, .01, .02, .03]) { const z = lados.filter(l => l.pin != null && l.pin - l.a >= u); if (z.length) log(`| Kalshi ${u * 100}+ centavos más barato que Pinnacle sin margen | ${roiTxt(z.map(l => pago(l.a, l.g)))} |`); }
  }
  fs.writeFileSync('resultado_kalshi.txt', L.join('\n') + '\n');
})().catch(e => { console.error(e); fs.writeFileSync('resultado_kalshi.txt', L.join('\n') + '\nFALLÓ ' + e.message); });
