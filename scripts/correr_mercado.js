// Corre backtestmercado.html en la nube (GitHub Actions) para evitar el bloqueo de Kalshi en Safari.
// Uso: node correr_mercado.js 45
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

async function main() {
  const arg = String(process.argv[2] || process.env.DIAS || '45').trim();
  const dias = /^s20\d\d$/i.test(arg) ? arg.toUpperCase() : (parseInt(arg, 10) || 45);
  const html = fs.readFileSync(path.join(__dirname, '..', 'backtests', 'backtestmercado.html'), 'utf8');
  const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const els = {};
  const E = id => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {}, disabled: false, value: String(dias) });
  const doFetch = u => (globalThis.__fetch || globalThis.fetch)(u, { headers: { 'accept': 'application/json', 'user-agent': 'ova-backtest/1.0' } });
  const ctx = { console, Math, Date, JSON, Promise, Object, Array, String, Number, isFinite, parseInt, Intl, setTimeout, encodeURIComponent, URL,
    fetch: doFetch, document: { getElementById: E, createElement: () => ({}), body: { appendChild() {}, removeChild() {} } }, navigator: {} };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.medir=medir;this.probar=probar;', ctx);
  const strip = h => h.replace(/<\/tr>/g, '\n').replace(/<\/th>|<\/td>/g, ' | ').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  let out = '## Backtest OVA contra el mercado (' + dias + (/^S20/.test(String(dias)) ? '' : ' dias') + ')\n\n### Conexion\n```\n';
  await ctx.probar();
  out += els.o1.textContent + '```\n\n### Resultado\n';
  let fallo = false;
  try {
    await ctx.medir(dias);
    out += '```\n' + ctx.ULTIMO_TEXTO + '```\n\n' + strip(els.res.innerHTML) + '\n';
  } catch (e) {
    fallo = true;
    out += 'NO TERMINO: ' + (e && e.message ? e.message : e) + '\n' + strip(els.res.innerHTML) + '\n';
  }
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
  process.exit(fallo ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
