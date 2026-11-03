'use strict';
/* ===================================================================
   OVA · PRECIOS DE KALSHI PARA NBA, NHL Y NFL (API pública de solo lectura, sin llave; no usa OddsPapi)
   Corre en GitHub Actions (kalshi.yml) y deja kalshi-<dep>.json en la rama «kalshi». Las apps lo muestran junto a la cuota justa.
   Cada juego: {d: fecha del ticker AAAA-MM-DD, e: [{s: sigla, n: nombre, c: compra en centavos, v: venta en centavos, vol}], upd}
   =================================================================== */
const fs = require('fs');
const API = 'https://api.elections.kalshi.com/trade-api/v2';
const SERIES = { nba: 'KXNBAGAME', nhl: 'KXNHLGAME', nfl: 'KXNFLGAME' };
const MES = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };

/* la API trae centavos (yes_ask) o dólares en texto (yes_ask_dollars), según la versión */
function centavos(m, k) {
  const d = parseFloat(m[k + '_dollars']); if (isFinite(d)) return Math.round(d * 100);
  const c = parseFloat(m[k]); return isFinite(c) ? Math.round(c) : null;
}
function fechaTicker(t) {
  const x = /-(\d{2})([A-Z]{3})(\d{2})/.exec(String(t || '')); if (!x || !MES[x[2]]) return null;
  return '20' + x[1] + '-' + MES[x[2]] + '-' + x[3];
}
function siglaTicker(t) { const p = String(t || '').split('-'); return p[p.length - 1] || ''; }
function parsear(eventos) {
  const out = [];
  (eventos || []).forEach(ev => {
    const d = fechaTicker(ev.event_ticker), ms = (ev.markets || []).filter(m => m && (m.status === 'active' || m.status === 'open'));
    if (!d || ms.length !== 2) return;
    const e = ms.map(m => { const c = centavos(m, 'yes_ask'), v = centavos(m, 'yes_bid'); return { s: siglaTicker(m.ticker), n: m.yes_sub_title || '', c: c, v: v, vol: Math.round(parseFloat(m.volume_fp !== undefined ? m.volume_fp : m.volume) || 0) }; });
    if (e.some(x => !x.s || !(x.c > 0 && x.c < 100))) return;
    out.push({ d: d, t: ev.event_ticker, e: e });
  });
  return out;
}
module.exports = { centavos, fechaTicker, siglaTicker, parsear, SERIES };
if (require.main !== module) return;

(async () => {
  fs.mkdirSync('salida-kalshi', { recursive: true });
  for (const dep of Object.keys(SERIES)) {
    let eventos = [], cursor = '', ok = false;
    for (let i = 0; i < 5; i++) {
      const u = API + '/events?series_ticker=' + SERIES[dep] + '&status=open&with_nested_markets=true&limit=200' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'ova-kalshi/1.0' } }).catch(e => ({ ok: false, status: String(e.message) }));
      if (!r.ok) { console.log(dep + ': HTTP ' + r.status); break; }
      const j = await r.json(); ok = true; eventos = eventos.concat(j.events || []); cursor = j.cursor || ''; if (!cursor) break;
    }
    const juegos = parsear(eventos);
    console.log(dep + ': eventos ' + eventos.length + ' · juegos usables ' + juegos.length);
    if (eventos[0]) console.log('  ejemplo crudo: ' + JSON.stringify(eventos[0]).slice(0, 900));
    console.log('  ' + juegos.slice(0, 16).map(g => g.d + ' ' + g.e.map(x => x.s + '/' + x.n + ' ' + x.c + '¢').join(' vs ')).join(' | '));
    if (ok) fs.writeFileSync('salida-kalshi/kalshi-' + dep + '.json', JSON.stringify({ v: 1, dep: dep, generado: new Date().toISOString(), juegos: juegos }));
  }
})();
