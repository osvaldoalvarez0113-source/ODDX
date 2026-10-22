// Qué habría dicho la app (MLB, ganador) en cada juego de 2024-2026 y cuánto habría rendido.
// Corre el veredictoEV() REAL de index.html sobre cada juego, con la cuota de cierre de DraftKings (ESPN),
// y calcula ROI por titular y la banca de $1,000 con los stakes que imprime la app (día por día, ¼ Kelly).
// Datos: las ramas var-S2024, var-S2025 y var-S2026 del repo (las escribe scripts/correr_variantes.js).
//   for s in S2024 S2025 S2026; do git clone --depth 1 --branch var-$s https://github.com/osvaldoalvarez0113-source/ODDX datos/var-$s; done
// Uso:  node scripts/medicion/picks_app.js datos
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const DATOS = process.argv[2];
if (!DATOS) { console.log('Uso: node scripts/medicion/picks_app.js <carpeta con var-S2024, var-S2025, var-S2026>'); process.exit(1); }
const R = path.join(__dirname, '..', '..');
const ix = fs.readFileSync(path.join(R, 'index.html'), 'utf8'), E = require(path.join(R, 'ovaedge.js'));
const a = ix.indexOf('function devig(amA,amH)'), b = ix.indexOf('function contexto('), iI = ix.indexOf('function implied(v)');
const iF = ix.indexOf('\n}\n', iI) + 3, vI = ix.indexOf('function valor('), vF = ix.indexOf('function txtValor(');
const W = +((/var W_MODELO=([\d.]+);/.exec(ix) || [0, '0.24'])[1]);
const base = "var PLATA='book',EV_IMPOSIBLE=0.20,CORTE_GRIS=0.50,KFEE=0.07,W_MODELO=" + W + ";\nfunction banca(){return 1000;}\nfunction decimal(am){ return am>0 ? am/100 : 100/(-am); }\n"
  + ix.slice(iI, iF) + ix.slice(vI, vF) + ix.slice(a, b);
const c = { esc: s => String(s), KFEE: 0.07, OVAEdge: E }; vm.createContext(c); vm.runInContext(base, c);
const am = d => d >= 2 ? '+' + Math.round((d - 1) * 100) : '-' + Math.round(100 / (d - 1));
const filas = [];
for (const s of ['S2024', 'S2025', 'S2026']) {
  for (const g of JSON.parse(fs.readFileSync(path.join(DATOS, 'var-' + s, 'variantes_' + s + '.json'), 'utf8'))) {
    const p = g.v && g.v.P40; if (p == null) continue;
    c.pA = (1 - p) * 100; c.pH = p * 100; c.aA = am(g.dA); c.aH = am(g.dH);
    const h = vm.runInContext('veredictoEV(pA,pH,aA,aH,"V","L",1.3)', c);
    const t = (/<div class="q">([^<]*)<\/div>/.exec(h) || [])[1] || '?';
    const k = /¼ Kelly \$(\d+\.\d\d)/.exec(h);
    let lado;
    if (/ en [VL]$/.test(t)) lado = t.endsWith(' en L') ? 'H' : 'A';
    else { const evH = p * (g.dH - 1) - (1 - p), evA = (1 - p) * (g.dA - 1) - p; lado = evA >= evH ? 'A' : 'H'; }
    const gano = (lado === 'H' && g.y === 1) || (lado === 'A' && g.y === 0);
    filas.push({ s, f: g.f, tit: t.replace(/ en [VL]$/, ''), r: gano ? ((lado === 'H' ? g.dH : g.dA) - 1) : -1, fr: k ? +k[1] / 1000 : 0,
      esp: (lado === 'H' ? g.iH : g.iA) / (g.iH + g.iA) * (lado === 'H' ? g.dH : g.dA) - 1 });
  }
}
const est = v => { const n = v.length, m = v.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(v.reduce((x, y) => x + (y - m) * (y - m), 0) / (n - 1)); return { n, m, se: sd / Math.sqrt(n) }; };
console.log('Peso del modelo en la mezcla (W_MODELO): ' + W + ' | juegos: ' + filas.length + '\n');
console.log('titular'.padEnd(26) + 'juegos'.padStart(7) + 'ROI'.padStart(9) + '  ±error'.padStart(9) + 'esperado si el mercado sabe todo'.padStart(36));
for (const t of ['Valor fuerte', 'Valor moderado', 'Valor dudoso', 'Margen mínimo', 'Sin apuesta', 'Ese precio no puede ser']) {
  const v = filas.filter(x => x.tit === t); if (!v.length) continue; const e = est(v.map(x => x.r));
  console.log(t.padEnd(26) + String(e.n).padStart(7) + (e.m * 100).toFixed(1).padStart(8) + '%' + ('±' + (e.se * 100).toFixed(1) + '%').padStart(9) + ((v.reduce((x, y) => x + y.esp, 0) / v.length) * 100).toFixed(1).padStart(35) + '%');
}
const valor3 = filas.filter(x => /^Valor (fuerte|moderado|dudoso)/.test(x.tit)), e3 = est(valor3.map(x => x.r));
console.log('\nTodo lo que decía «valor» (fuerte+moderado+dudoso): n=' + e3.n + '  ROI ' + (e3.m * 100).toFixed(1) + '% ±' + (e3.se * 100).toFixed(1) + '%');
for (const s of ['S2024', 'S2025', 'S2026']) { const e = est(valor3.filter(x => x.s === s).map(x => x.r)); console.log('   ' + s + ': n=' + e.n + '  ROI ' + (e.m * 100).toFixed(1) + '% ±' + (e.se * 100).toFixed(1) + '%'); }
// banca de $1,000 con los stakes impresos por la app (se decide con la banca al inicio del día)
const porDia = {}; filas.filter(x => x.fr > 0).forEach(x => (porDia[x.f] = porDia[x.f] || []).push(x));
let bk = 1000, pico = bk, dd = 0, mn = bk, np = 0;
Object.keys(porDia).sort().forEach(f => { const b0 = bk; porDia[f].forEach(x => { bk += b0 * x.fr * x.r; np++; }); pico = Math.max(pico, bk); dd = Math.max(dd, (pico - bk) / pico); mn = Math.min(mn, bk); });
console.log('\nBanca de $1,000 con los stakes que imprime la app (' + np + ' picks): termina en $' + Math.round(bk) + ' | peor caída ' + (dd * 100).toFixed(0) + '% | mínimo $' + Math.round(mn));
console.log('(v67, con el ¼ Kelly sobre tu número crudo: $524, caída 64%, mínimo $413)');
