'use strict';
/* Experimento: ¿se cumple el precio de Kalshi en «BTC 15 min»? (rama experimento-btc15m, corre en GitHub Actions)
   Baja los mercados KXBTC15M ya resueltos y sus velas de 1 minuto (bid/ask/último del «Sube»). Solo lectura, API pública.
   Guarda btc15m_datos.json; el análisis se hace aparte. */
const fs = require('fs');
const BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const MAX = +(process.env.MAX_MERCADOS || 4000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, intento = 0) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (r.status === 429 && intento < 6) { await sleep(1500 * (intento + 1)); return get(url, intento + 1); }
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.json();
}
const num = x => { const v = parseFloat(x); return isFinite(v) ? v : null; };
(async () => {
  const mercados = []; let cursor = '';
  while (mercados.length < MAX) {
    const j = await get(BASE + '/markets?series_ticker=KXBTC15M&status=settled&limit=1000' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    (j.markets || []).forEach(m => mercados.push(m));
    console.log('mercados', mercados.length);
    cursor = j.cursor; if (!cursor || !(j.markets || []).length) break;
    await sleep(300);
  }
  const lista = mercados.filter(m => m.result === 'yes' || m.result === 'no').slice(0, MAX);
  console.log('resueltos', lista.length, 'ejemplo', JSON.stringify(lista[0]).slice(0, 400));
  const out = []; let hechos = 0, err = 0;
  const trabajo = lista.slice();
  async function obrero() {
    while (trabajo.length) {
      const m = trabajo.shift();
      const a = Math.floor(Date.parse(m.open_time) / 1000), b = Math.floor(Date.parse(m.close_time) / 1000);
      try {
        const j = await get(BASE + '/series/KXBTC15M/markets/' + m.ticker + '/candlesticks?start_ts=' + a + '&end_ts=' + b + '&period_interval=1');
        const v = (j.candlesticks || []).map(c => [c.end_period_ts, num(c.yes_bid && c.yes_bid.close_dollars), num(c.yes_ask && c.yes_ask.close_dollars),
          num(c.price && c.price.close_dollars), num(c.volume_fp)]);
        out.push({ t: m.ticker, a, b, res: m.result === 'yes' ? 1 : 0, k: num(m.floor_strike), x: num(m.expiration_value), vol: num(m.volume_fp), v });
      } catch (e) { err++; if (err < 5) console.log('error', e.message); }
      hechos++; if (hechos % 200 === 0) console.log('velas', hechos, '/', lista.length);
      await sleep(120);
    }
  }
  await Promise.all([obrero(), obrero(), obrero(), obrero()]);
  out.sort((p, q) => p.a - q.a);
  fs.writeFileSync('btc15m_datos.json', JSON.stringify({ generado: new Date().toISOString(), n: out.length, errores: err, mercados: out }));
  console.log('listo', out.length, 'errores', err);
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
