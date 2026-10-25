'use strict';
/* ===================================================================
   OVA · MEDICION DE NHL Y NFL CONTRA EL MERCADO (corre en GitHub Actions; ESPN no se alcanza desde otro lado)
   Uso:  node scripts/correr_nhl_nfl.js nhl | nfl | ambos [--sintetico]
   Hace, para cada deporte, TODO lo medible con partidos reales y lineas de cierre:
     1 datos y parametros elegidos sin mirar el futuro   2 ganador: modelo contra mercado   3 mezcla modelo+mercado (lambda)
     4 apostar al modelo (ROI)   5 margen y regresion   6 handicap / linea de gol (ROI)   7 totales (RMSE, mezcla, ROI)
     8 sesgos del mercado sin modelo (favoritos, locales, rachas de descanso...)   9 especificos del deporte   10 calibracion
   Todo es "walk-forward": cada partido se predice con lo que se sabia antes de jugarse y los parametros se eligen en temporadas anteriores.
   =================================================================== */
const fs = require('fs');
const L = require('./lib_medir.js');
const D = require('./datos_nhl_nfl.js');

const ARGS = process.argv.slice(2);
const SINT = ARGS.includes('--sintetico');
const CFG = {
  nhl: { modelo: '../modelo-nhl.js', temporadas: [2021, 2022, 2023, 2024, 2025, 2026], testDesde: 2022, minJ: 10, nombre: 'NHL' },
  nfl: { modelo: '../modelo-nfl.js', temporadas: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], testDesde: 2019, minJ: 4, nombre: 'NFL' }
};
const sig = L.sig, logit = L.logit, clip = p => L.clip(p, 1e-4, 1 - 1e-4);
const out = [];
const log = s => { out.push(s); console.log(s); };

/* ------------------------------------------------------------------ apuestas: resumen con error estandar */
function apuestas(lista) {           // lista de {odds (americano), v (1 gana, -1 pierde, 0 push)}
  let g = 0, p = 0, u = 0; const pagos = [];
  lista.forEach(b => { if (b.v > 0) g++; else if (b.v < 0) p++; else u++; pagos.push(L.pago(b.odds, b.v)); });
  const s = L.ms(pagos);
  return { n: lista.length, g, p, u, roi: s.m, se: s.se, z: s.z };
}
const fa = a => a.n ? [String(a.n), a.g + '-' + a.p + (a.u ? '-' + a.u : ''), L.pc(a.g / Math.max(a.g + a.p, 1)), (a.roi >= 0 ? '+' : '') + (a.roi * 100).toFixed(1) + '% ± ' + (2 * a.se * 100).toFixed(1), L.f(a.z, 1)] : ['0', '—', '—', '—', '—'];

/* ------------------------------------------------------------------ resultados de un juego */
const gano = g => g.hs > g.as ? 1 : (g.hs < g.as ? -1 : 0);
function marg(dep, g) { return g.hs - g.as; }                                            // al estilo ESPN (el shootout ya suma +1 al ganador)
function totJ(dep, g) { return g.hs + g.as - (dep === 'nhl' && g.so ? 1 : 0); }          // el gol del shootout no cuenta para los totales
function resCubre(dep, g, linea) { const x = marg(dep, g) + linea; return x > 1e-9 ? 1 : (x < -1e-9 ? -1 : 0); }   // el local recibe 'linea'
function resOver(dep, g, linea) { const x = totJ(dep, g) - linea; return x > 1e-9 ? 1 : (x < -1e-9 ? -1 : 0); }

/* ------------------------------------------------------------------ adaptadores por deporte */
function adaptador(dep, M) {
  if (dep === 'nhl') return {
    pWin: (r) => r.D().pH,
    cubre: (r, Lh) => M.pCoverM(r.D(), Lh),
    over: (r, Lt) => M.pOver(r.D(), Lt),
    mktPm: (r) => { const l = r.g.linea; if (!l || !l.ml || !l.tot) return null; const pk = L.sinMargen(l.ml[0], l.ml[1])[0]; return M.pmDeProb(pk, l.tot, r.P); },
    ptModelo: (r) => M.mediaTotal(r.D()),
    unidad: 'goles'
  };
  return {
    pWin: (r) => M.pMLk(r.pm, r.sM, null),
    cubre: (r, Lh) => (r.K ? M.pCoverK(r.pm, r.sM, Lh, r.K) : M.pCoverK(r.pm, r.sM, Lh, null)),
    cubreN: (r, Lh) => M.pCoverK(r.pm, r.sM, Lh, null),
    over: (r, Lt) => { const c = M.pCover(r.pt, r.sT, Lt); return c; },
    mktPm: (r) => { const l = r.g.linea; return l && l.sp != null ? -l.sp : null; },
    ptModelo: (r) => r.pt,
    unidad: 'puntos'
  };
}

/* ------------------------------------------------------------------ datos sinteticos (solo para probar el programa sin internet) */
function sintetico(dep) {
  let seed = dep === 'nhl' ? 7 : 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const gau = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const pois = l => { const Lp = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > Lp); return k - 1; };
  const c = { dep, temps: {} }; const tr = {}; for (let i = 1; i <= 32; i++) tr[i] = gau() * (dep === 'nhl' ? 0.3 : 5);
  CFG[dep].temporadas.forEach((sk, si) => {
    for (let i = 1; i <= 32; i++) tr[i] = tr[i] * 0.7 + gau() * (dep === 'nhl' ? 0.2 : 3.5);
    const juegos = []; let t = Date.UTC(sk, dep === 'nhl' ? 9 : 8, 12, 0);
    const nd = dep === 'nhl' ? 160 : 18;
    for (let d = 0; d < nd; d++) {
      const ids = [...Array(32)].map((_, i) => i + 1).sort(() => rnd() - 0.5);
      const npar = dep === 'nhl' ? 5 + Math.floor(rnd() * 5) : 16;
      for (let k = 0; k < npar; k++) {
        const a = ids[2 * k], b = ids[2 * k + 1], when = t + (dep === 'nhl' ? d * 864e5 : d * 7 * 864e5) + k * 36e5;
        const g = { id: dep + sk + '_' + juegos.length, ts: when, h: String(a), a: String(b), abH: 'H' + a, abA: 'A' + b, nh: 'Equipo ' + a, na: 'Equipo ' + b, done: true, ty: 2, skip: false, neutral: false, detail: 'Final' };
        let pm, pt, linea = {};
        if (dep === 'nhl') {
          pm = tr[a] - tr[b] + 0.14; pt = 6.1 + gau() * 0.15; const lh = (pt + pm) / 2, la = (pt - pm) / 2; g.hs = pois(lh); g.as = pois(la); g.so = false; g.ot = false;
          if (g.hs === g.as) { const hw = rnd() < 1 / (1 + Math.exp(-0.25 * pm)); if (rnd() > 0.55) g.so = true; else g.ot = true; if (hw) g.hs++; else g.as++; }
          const mm = pm + gau() * 0.1; const pk = 1 / (1 + Math.exp(-(mm * 0.62)));
          const am = p => p >= 0.5 ? -Math.round(100 * p / (1 - p)) : Math.round(100 * (1 - p) / p);
          const vig = 0.025; const ph = Math.min(0.97, pk * (1 + vig)), pa = Math.min(0.97, (1 - pk) * (1 + vig));
          linea = { prov: 'sint', ml: [am(ph), am(pa)], mlOpen: [am(ph), am(pa)], sp: pm >= 0 ? -1.5 : 1.5, spOdds: [-110, -110], tot: Math.round(pt * 2) / 2 + (rnd() < 0.5 ? 0 : 0.5), ou: [-110, -110] };
        } else {
          pm = tr[a] - tr[b] + 1.8; pt = 44.5 + gau() * 2; const mar = Math.round(pm + gau() * 13.2), tot = Math.round(pt + gau() * 13.5);
          g.hs = Math.max(0, Math.round((tot + mar) / 2)); g.as = Math.max(0, g.hs - mar); g.wk = d + 1; g.indoor = rnd() < 0.3; g.ot = false;
          const mm = pm + gau() * 1.5, spr = Math.round(mm * 2) / 2; const pk = L.Phi(mm / 13.2);
          const am = p => p >= 0.5 ? -Math.round(100 * p / (1 - p)) : Math.round(100 * (1 - p) / p);
          linea = { prov: 'sint', ml: [am(Math.min(0.97, pk * 1.025)), am(Math.min(0.97, (1 - pk) * 1.025))], mlOpen: null, sp: -spr, spOdds: [-110, -110], tot: Math.round((pt + gau()) * 2) / 2, ou: [-110, -110] };
        }
        g.linea = linea; juegos.push(g);
      }
    }
    c.temps[sk] = { juegos, completa: true };
  });
  return c;
}

/* ------------------------------------------------------------------ principal por deporte */
async function medir(dep) {
  const cfg = CFG[dep], M = require(cfg.modelo), A = adaptador(dep, M);
  const DIAG = { errores: [] };
  const ruta = (process.env.OVA_CACHE_DIR || '.') + '/datos-' + dep + '.json';
  let cache = SINT ? sintetico(dep) : D.cargarCache(dep, ruta);
  const hoy = Date.now(), skHoy = M.seasonOf(hoy);
  if (!SINT) {
    for (const sk of cfg.temporadas) {
      const t = cache.temps[sk];
      const pasada = sk < skHoy;
      if (t && t.completa && pasada && t.juegos.length > (dep === 'nhl' ? 900 : 200)) continue;
      console.log('Bajando ' + cfg.nombre + ' temporada ' + sk + '...');
      const nuevos = await D.temporada(dep, sk, DIAG);
      const viejo = new Map(((t && t.juegos) || []).map(g => [g.id, g]));
      nuevos.forEach(g => { const v = viejo.get(g.id); if (v && v.linea !== undefined && g.done) g.linea = v.linea; });
      cache.temps[sk] = { juegos: nuevos, completa: pasada && nuevos.length > (dep === 'nhl' ? 900 : 200) };
      console.log('  ' + nuevos.length + ' juegos');
      D.guardarCache(ruta, cache);
    }
    // lineas de cierre: solo en las temporadas de prueba
    for (const sk of cfg.temporadas.filter(s => s >= cfg.testDesde)) {
      const lista = cache.temps[sk].juegos.filter(g => g.done && !g.skip && g.linea === undefined);
      if (!lista.length) continue;
      console.log('Bajando lineas ' + cfg.nombre + ' ' + sk + ': ' + lista.length + ' juegos...');
      const r = await D.bajarLineas(dep, lista, DIAG, (h, t) => { if (h % 500 === 0) console.log('  lineas ' + h + '/' + t); });
      if (r.ejemplo && !cache.ejemplo) cache.ejemplo = r.ejemplo;
      D.guardarCache(ruta, cache);
    }
  }
  const todos = [].concat(...cfg.temporadas.map(sk => (cache.temps[sk] ? cache.temps[sk].juegos : []))).filter(g => g.done && !g.skip).sort((a, b) => a.ts - b.ts);
  const reg = todos.filter(g => g.ty === 2);
  log('\n# ' + cfg.nombre + ' · medición contra el mercado\n');
  log('Generado: ' + new Date().toISOString() + (SINT ? ' · **DATOS SINTÉTICOS (solo prueba del programa)**' : ''));
  if (DIAG.errores.length) log('Errores de descarga (' + DIAG.errores.length + '): ' + DIAG.errores.slice(0, 5).join(' | '));
  if (cache.ejemplo) log('\nEjemplo crudo de una línea (para depurar el lector):\n```\n' + cache.ejemplo + '\n```');

  /* ============ 0) datos ============ */
  const porT = {}; reg.forEach(g => { const s = M.seasonOf(g.ts); (porT[s] = porT[s] || []).push(g); });
  const conL = g => g.linea && (g.linea.ml || g.linea.sp != null || g.linea.tot != null);
  const filas0 = cfg.temporadas.filter(s => porT[s]).map(s => { const a = porT[s]; const cm = a.filter(g => g.linea && g.linea.ml).length, cs = a.filter(g => g.linea && g.linea.sp != null).length, ct = a.filter(g => g.linea && g.linea.tot != null).length;
    return [String(s), String(a.length), String(cm), String(cs), String(ct)]; });
  log('## 0) Datos\n' + L.tabla(['Temporada', 'Juegos (regular)', 'Con moneyline', 'Con línea de handicap', 'Con total'], filas0));
  log('Playoffs en el archivo (se usan para ratings, no para las pruebas): ' + todos.filter(g => g.ty === 3).length + '.');

  /* ============ 1) parámetros sin mirar el futuro + filas de prueba ============ */
  const hasta = sk => todos.filter(g => M.seasonOf(g.ts) <= sk);
  const Pelegidos = {}, filas = [];
  const tests = cfg.temporadas.filter(s => s >= cfg.testDesde && porT[s] && porT[s].length > (dep === 'nhl' ? 300 : 60));
  console.log('Eligiendo parametros (walk-forward)...');
  for (const sk of tests) {
    const ent = hasta(sk - 1);
    let P;
    if (ent.filter(g => M.seasonOf(g.ts) === sk - 1).length > (dep === 'nhl' ? 600 : 150)) {
      const a = M.gridMargen(ent, sk - 1, null, Object.assign({}, M.PDEF, { Z: 1 })), b = M.gridTotal(ent, sk - 1, null, a.P);
      P = Object.assign({}, b.P, { Z: M.zRecomendado(M.evaluar(ent, b.P, sk - 1).sl) });
    } else P = Object.assign({}, M.PDEF);
    Pelegidos[sk] = P;
    const juegos = hasta(sk); let K = null;
    if (dep === 'nfl') { const pk = M.pesosClave(hasta(sk - 1), P); K = pk.ok ? pk.W : null; }
    M.correr(juegos, P, function (g, x) {
      if (M.seasonOf(g.ts) !== sk || g.ty !== 2 || x.cH < cfg.minJ || x.cA < cfg.minJ) return;
      const Zc = P.Z === undefined ? 1 : P.Z, pm = x.b0 + Zc * x.rd;
      const r = { g, sk, pm, pt: x.pt, P, K, bH: !!x.bH, bA: !!x.bA };
      if (dep === 'nfl') { const sg = M.sigmas(x.S); r.sM = sg.sM; r.sT = sg.sT; }
      let dd = null; r.D = () => dd || (dd = M.dist(pm, x.pt, P));
      filas.push(r);
    });
  }
  log('\n## 1) Parámetros elegidos usando SOLO temporadas anteriores\n' + L.tabla(['Temporada de prueba', 'Parámetros'], tests.map(s => [String(s), JSON.stringify(Pelegidos[s])])));
  log('Juegos de prueba (temporadas ' + tests.join(', ') + '): ' + filas.length + '.');
  if (filas.length < 200) { log('NO HAY SUFICIENTES JUEGOS DE PRUEBA.'); return { dep, ok: false }; }

  const gMl = filas.filter(r => r.g.linea && r.g.linea.ml && gano(r.g) !== 0);
  const pk = r => L.sinMargen(r.g.linea.ml[0], r.g.linea.ml[1])[0];
  const win = r => gano(r.g) > 0 ? 1 : 0;
  const resumen = { dep, cfg: cfg.nombre, params: Pelegidos, juegosPrueba: filas.length, conML: gMl.length };

  /* ============ 2) ganador: modelo contra mercado ============ */
  {
    const ll = (p, w) => -Math.log(clip(w ? p : 1 - p)), br = (p, w) => (p - w) * (p - w);
    const dM = [], dB = [], dO = []; let sM = 0, sK = 0, bM = 0, bK = 0, sO = 0, nO = 0;
    gMl.forEach(r => { const w = win(r), pm = clip(A.pWin(r)), pkk = clip(pk(r));
      const lm = ll(pm, w), lk = ll(pkk, w); sM += lm; sK += lk; bM += br(pm, w); bK += br(pkk, w); dM.push(lm - lk); dB.push(br(pm, w) - br(pkk, w));
      if (r.g.linea.mlOpen) { const po = clip(L.sinMargen(r.g.linea.mlOpen[0], r.g.linea.mlOpen[1])[0]); sO += ll(po, w); nO++; dO.push(ll(po, w) - lk); } });
    const n = gMl.length;
    log('\n## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)\nPérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.\n' + L.tabla(['', 'Juegos', 'Modelo', 'Mercado', 'dif ± 2·se', 'Veredicto'], [
      ['Log-loss', String(n), L.f(sM / n, 4), L.f(sK / n, 4), L.f(L.ms(dM).m, 4) + ' ± ' + L.f(2 * L.ms(dM).se, 4), L.veredicto(L.ms(dM))],
      ['Brier', String(n), L.f(bM / n, 4), L.f(bK / n, 4), L.f(L.ms(dB).m, 4) + ' ± ' + L.f(2 * L.ms(dB).se, 4), L.veredicto(L.ms(dB))]]));
    if (nO > 200) log('Apertura contra cierre: log-loss de la línea de APERTURA ' + L.f(sO / nO, 4) + ' contra ' + L.f(L.ms(dO).m + sK / n, 4) + ' del cierre (dif apertura−cierre ' + L.f(L.ms(dO).m, 4) + ' ± ' + L.f(2 * L.ms(dO).se, 4) + '; positivo = el cierre es mejor, el mercado aprende durante el día).');
    resumen.logloss = { modelo: sM / n, mercado: sK / n, dif: L.ms(dM) };
    const aciertoM = gMl.filter(r => (A.pWin(r) >= 0.5) === (win(r) === 1)).length / n, aciertoK = gMl.filter(r => (pk(r) >= 0.5) === (win(r) === 1)).length / n;
    log('Acierto del favorito: modelo ' + L.pc(aciertoM) + ' · mercado ' + L.pc(aciertoK) + '. Local gana: ' + L.pc(gMl.filter(r => win(r)).length / n) + ' (el mercado le daba ' + L.pc(gMl.reduce((a, r) => a + pk(r), 0) / n) + ').');
  }

  /* ============ 3) mezcla ============ */
  let lamML = null;
  {
    const sks = [...new Set(gMl.map(r => r.sk))];
    const perdida = (rows, lam) => rows.reduce((a, r) => { const z = logit(clip(pk(r))) + lam * (logit(clip(A.pWin(r))) - logit(clip(pk(r)))); return a - Math.log(clip(win(r) ? sig(z) : 1 - sig(z))); }, 0);
    const mejorLam = rows => { let b = null; for (let l = 0; l <= 1.0001; l += 0.05) { const v = perdida(rows, l); if (!b || v < b.v) b = { l, v }; } return b.l; };
    const difs = []; const filasT = [];
    sks.forEach(s => { const ent = gMl.filter(r => r.sk !== s), test = gMl.filter(r => r.sk === s); if (ent.length < 200 || test.length < 100) return;
      const l = mejorLam(ent); filasT.push([String(s), L.f(l, 2), String(test.length)]);
      test.forEach(r => { const z = logit(clip(pk(r))) + l * (logit(clip(A.pWin(r))) - logit(clip(pk(r)))); difs.push(-Math.log(clip(win(r) ? sig(z) : 1 - sig(z))) + Math.log(clip(win(r) ? pk(r) : 1 - pk(r)))); }); });
    lamML = mejorLam(gMl);
    const s = L.ms(difs);
    log('\n## 3) Mezcla mercado + modelo (en el espacio logit): predictor = mercado + λ·(modelo − mercado)\nλ se ajusta con las demás temporadas y se prueba en la que quedó afuera.\n' + L.tabla(['Temporada probada', 'λ ajustado con las otras', 'Juegos'], filasT));
    log('λ con todos los juegos: **' + L.f(lamML, 2) + '**. Mezcla fuera de muestra contra el mercado solo: dif ' + L.f(s.m, 5) + ' ± ' + L.f(2 * s.se, 5) + ' (negativo = la mezcla mejora) · ' + L.veredicto({ n: s.n, z: s.z }) + '.');
    resumen.lamML = lamML; resumen.mezclaML = s;
  }
  const blendP = (r, lam) => sig(logit(clip(pk(r))) + lam * (logit(clip(A.pWin(r))) - logit(clip(pk(r)))));

  /* ============ 4) apostar al modelo (moneyline) ============ */
  {
    const fila = (nom, pf, e) => {
      const bets = [], fair = [];
      gMl.forEach(r => { const p = pf(r), q = pk(r), l = r.g.linea;
        if (p - q >= e) { const v = win(r) ? 1 : -1; bets.push({ odds: l.ml[0], v }); fair.push({ odds: q >= 0.5 ? -100 * q / (1 - q) : 100 * (1 - q) / q, v }); }
        else if ((1 - p) - (1 - q) >= e) { const v = win(r) ? -1 : 1; bets.push({ odds: l.ml[1], v }); fair.push({ odds: (1 - q) >= 0.5 ? -100 * (1 - q) / q : 100 * q / (1 - q), v }); } });
      const a = apuestas(bets), f = apuestas(fair); return [nom, (e * 100).toFixed(0) + ' pts'].concat(fa(a)).concat([(f.roi >= 0 ? '+' : '') + (f.roi * 100).toFixed(1) + '%']);
    };
    const rows = []; [0.02, 0.03, 0.05, 0.08].forEach(e => { rows.push(fila('Modelo puro', r => A.pWin(r), e)); }); [0.02, 0.03].forEach(e => { rows.push(fila('Mezcla λ=' + L.f(lamML, 2), r => blendP(r, lamML), e)); });
    log('\n## 4) Apostar al ganador cuando el modelo discrepa del mercado (1 unidad por juego, al precio real de la casa)\n"A precio justo" = la misma apuesta si pagaran el precio sin margen (aísla cuánto cuesta el margen de la casa).\n' + L.tabla(['Predictor', 'Diferencia mínima', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se', 'z', 'ROI a precio justo'], rows));
    log('Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.');
  }

  /* ============ 5) margen ============ */
  {
    const gm = filas.filter(r => { const m = A.mktPm(r); return m !== null && isFinite(m); });
    if (gm.length > 200) {
      const y = gm.map(r => marg(dep, r.g)), mk = gm.map(r => A.mktPm(r)), md = gm.map(r => r.pm);
      const rm = Math.sqrt(y.reduce((a, v, i) => a + (v - md[i]) ** 2, 0) / y.length), rk = Math.sqrt(y.reduce((a, v, i) => a + (v - mk[i]) ** 2, 0) / y.length);
      const dif = y.map((v, i) => (v - md[i]) ** 2 - (v - mk[i]) ** 2), sd = L.ms(dif);
      const X = gm.map((r, i) => [1, mk[i], md[i] - mk[i]]), reg = L.ols(X, y);
      log('\n## 5) Margen esperado: modelo contra ' + (dep === 'nfl' ? 'la línea de handicap de cierre' : 'el margen implícito en el moneyline y el total') + ' (' + gm.length + ' juegos)\nRMSE en ' + A.unidad + ': modelo ' + L.f(rm, 3) + ' · mercado ' + L.f(rk, 3) + ' · dif de cuadrados ' + L.f(sd.m, 3) + ' ± ' + L.f(2 * sd.se, 3) + ' → ' + L.veredicto(sd));
      if (reg) { log('Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = ' + L.f(reg.b[1], 3) + ' ± ' + L.f(2 * reg.se[1], 3) + ' · **c = ' + L.f(reg.b[2], 3) + ' ± ' + L.f(2 * reg.se[2], 3) + '** (0 = el modelo no agrega nada a la línea; 1 = vale todo).'); resumen.margenReg = { b: reg.b, se: reg.se, n: reg.n }; }
      resumen.margen = { rmseModelo: rm, rmseMercado: rk, escSig: rk / rm };
    }
  }

  /* ============ 6) handicap / linea de gol ============ */
  {
    const gs = filas.filter(r => r.g.linea && r.g.linea.sp != null);
    const conPrecio = r => r.g.linea.spOdds || [-110, -110];
    const rows = [];
    const evalEdge = (nom, cf, e) => {
      const bets = [];
      gs.forEach(r => { const l = r.g.linea, c = cf(r, l.sp); if (!c) return; const wv = c.w / Math.max(1 - c.p, 1e-9), po = conPrecio(r), q = L.sinMargen(po[0], po[1])[0];
        if (wv - q >= e) bets.push({ odds: po[0], v: resCubre(dep, r.g, l.sp) }); else if ((1 - wv) - (1 - q) >= e) bets.push({ odds: po[1], v: -resCubre(dep, r.g, l.sp) }); });
      const a = apuestas(bets); rows.push([nom, (e * 100).toFixed(0) + ' pts'].concat(fa(a)));
    };
    [0.03, 0.05, 0.08].forEach(e => evalEdge(dep === 'nfl' ? 'Normal' : 'Poisson', (r, Lh) => A.cubre(r, Lh), e));
    if (dep === 'nfl') [0.03, 0.05, 0.08].forEach(e => evalEdge('Con números clave', (r, Lh) => r.K ? M.pCoverK(r.pm, r.sM, Lh, r.K) : null, e));
    log('\n## 6) ' + (dep === 'nfl' ? 'Handicap (spread)' : 'Línea de gol (±1.5)') + ': apostar cuando la probabilidad del modelo de cubrir difiere de la del precio\n' + L.tabla(['Modelo', 'Diferencia mínima', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rows));
    if (dep === 'nfl') {
      const rr = []; [1, 1.5, 2, 3, 4].forEach(d => {
        const bets = []; gs.forEach(r => { const l = r.g.linea, e = r.pm + l.sp, po = conPrecio(r); if (e >= d) bets.push({ odds: po[0], v: resCubre(dep, r.g, l.sp) }); else if (e <= -d) bets.push({ odds: po[1], v: -resCubre(dep, r.g, l.sp) }); });
        rr.push([d + ' pts'].concat(fa(apuestas(bets)))); });
      log('Por puntos de diferencia entre el modelo y la línea (modelo − línea):\n' + L.tabla(['Diferencia', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rr));
    }
    const neutro = gs.length ? gs.map(r => resCubre(dep, r.g, r.g.linea.sp)).filter(v => v !== 0) : [];
    log('Referencia: el local cubre ' + L.pc(neutro.filter(v => v > 0).length / Math.max(neutro.length, 1)) + ' de las veces (sin push).');
  }

  /* ============ 7) totales ============ */
  let totalInfo = null;
  {
    const gt = filas.filter(r => r.g.linea && r.g.linea.tot != null);
    if (gt.length > 200) {
      const y = gt.map(r => totJ(dep, r.g)), mk = gt.map(r => r.g.linea.tot), md = gt.map(r => A.ptModelo(r));
      const rm = Math.sqrt(y.reduce((a, v, i) => a + (v - md[i]) ** 2, 0) / y.length), rk = Math.sqrt(y.reduce((a, v, i) => a + (v - mk[i]) ** 2, 0) / y.length);
      const sd = L.ms(y.map((v, i) => (v - md[i]) ** 2 - (v - mk[i]) ** 2));
      const reg = L.ols(gt.map((r, i) => [1, mk[i], md[i] - mk[i]]), y);
      log('\n## 7) Totales (' + gt.length + ' juegos)\nRMSE: modelo ' + L.f(rm, 3) + ' · línea ' + L.f(rk, 3) + ' · dif de cuadrados ' + L.f(sd.m, 3) + ' ± ' + L.f(2 * sd.se, 3) + ' → ' + L.veredicto(sd));
      if (reg) log('Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = ' + L.f(reg.b[1], 3) + ' · **c = ' + L.f(reg.b[2], 3) + ' ± ' + L.f(2 * reg.se[2], 3) + '**');
      // mezcla: la mejor λ en cuadrados (leave-one-season-out)
      const sks = [...new Set(gt.map(r => r.sk))]; const difs = [];
      const lamT = rows => { let b = null; for (let l = 0; l <= 1.0001; l += 0.05) { const v = rows.reduce((a, r) => a + (totJ(dep, r.g) - (r.g.linea.tot + l * (A.ptModelo(r) - r.g.linea.tot))) ** 2, 0); if (!b || v < b.v) b = { l, v }; } return b.l; };
      sks.forEach(s => { const ent = gt.filter(r => r.sk !== s), test = gt.filter(r => r.sk === s); if (ent.length < 200 || !test.length) return; const l = lamT(ent);
        test.forEach(r => difs.push((totJ(dep, r.g) - (r.g.linea.tot + l * (A.ptModelo(r) - r.g.linea.tot))) ** 2 - (totJ(dep, r.g) - r.g.linea.tot) ** 2)); });
      const lt = lamT(gt), sdb = L.ms(difs);
      log('λ del total (peso del modelo sobre la línea): **' + L.f(lt, 2) + '**; mezcla fuera de muestra contra la línea sola: ' + L.f(sdb.m, 4) + ' ± ' + L.f(2 * sdb.se, 4) + ' (negativo = mejora).');
      totalInfo = { rmseModelo: rm, rmseMercado: rk, lam: lt, mezcla: sdb, reg: reg && { b: reg.b, se: reg.se } }; resumen.total = totalInfo;
      const rr = []; [0.03, 0.05, 0.08].forEach(e => { const bets = []; gt.forEach(r => { const l = r.g.linea, o = l.ou || [-110, -110], q = L.sinMargen(o[0], o[1])[0], c = A.over(r, l.tot), wv = c.w / Math.max(1 - c.p, 1e-9), v = resOver(dep, r.g, l.tot);
        if (wv - q >= e) bets.push({ odds: o[0], v }); else if ((1 - wv) - (1 - q) >= e) bets.push({ odds: o[1], v: -v }); }); rr.push([(e * 100).toFixed(0) + ' pts'].concat(fa(apuestas(bets)))); });
      log('Apostar Más/Menos cuando el modelo difiere del precio:\n' + L.tabla(['Diferencia mínima', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rr));
      const rd = []; const umb = dep === 'nhl' ? [0.25, 0.5, 0.75] : [1.5, 3, 4.5];
      umb.forEach(d => { const bo = [], bu = []; gt.forEach(r => { const l = r.g.linea, o = l.ou || [-110, -110], e = A.ptModelo(r) - l.tot, v = resOver(dep, r.g, l.tot); if (e >= d) bo.push({ odds: o[0], v }); if (e <= -d) bu.push({ odds: o[1], v: -v }); });
        rd.push(['Más si modelo ≥ línea + ' + d].concat(fa(apuestas(bo)))); rd.push(['Menos si modelo ≤ línea − ' + d].concat(fa(apuestas(bu)))); });
      log('Por ' + A.unidad + ' de diferencia:\n' + L.tabla(['Regla', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rd));
    }
  }

  /* ============ 8) sesgos del mercado (sin modelo) ============ */
  {
    log('\n## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)');
    const cubos = [[0, 0.35, 'Muy perro (<35%)'], [0.35, 0.45, 'Perro (35–45%)'], [0.45, 0.55, 'Parejo (45–55%)'], [0.55, 0.65, 'Favorito (55–65%)'], [0.65, 0.8, 'Favorito fuerte (65–80%)'], [0.8, 1.01, 'Gran favorito (>80%)']];
    const rows = cubos.map(([a, b, nom]) => { const bets = []; gMl.forEach(r => { const q = pk(r), l = r.g.linea;
      if (q >= a && q < b) bets.push({ odds: l.ml[0], v: win(r) ? 1 : -1 }); if ((1 - q) >= a && (1 - q) < b) bets.push({ odds: l.ml[1], v: win(r) ? -1 : 1 }); });
      const ap = apuestas(bets); const imp = bets.length ? bets.reduce((s, x) => s + L.impAm(x.odds), 0) / bets.length : 0; return [nom, L.pc(imp)].concat(fa(ap)); });
    log('**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)\n' + L.tabla(['Tramo', 'Prob. de la casa (con margen)', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se', 'z'], rows));
    const lados = [['Todos los locales', r => true], ['Locales favoritos', r => pk(r) >= 0.5], ['Locales perros', r => pk(r) < 0.5]];
    const r2 = []; lados.forEach(([nom, f]) => { const bl = [], bv = []; gMl.filter(f).forEach(r => { bl.push({ odds: r.g.linea.ml[0], v: win(r) ? 1 : -1 }); bv.push({ odds: r.g.linea.ml[1], v: win(r) ? -1 : 1 }); }); r2.push([nom + ' · apostar al local'].concat(fa(apuestas(bl)))); r2.push([nom + ' · apostar al visitante'].concat(fa(apuestas(bv)))); });
    log('**Local contra visitante**\n' + L.tabla(['Grupo', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se', 'z'], r2));
    const gs = filas.filter(r => r.g.linea && r.g.linea.sp != null);
    if (gs.length) {
      const bk = dep === 'nfl' ? [[0, 3.1, 'Línea 0–3'], [3.1, 6.1, 'Línea 3.5–6'], [6.1, 10.1, 'Línea 6.5–10'], [10.1, 99, 'Línea 10.5+']] : [[0, 99, 'Todas']];
      const rs = []; bk.forEach(([a, b, nom]) => {
        const fav = [], per = [], hf = [], hd = [];
        gs.forEach(r => { const l = r.g.linea, s = Math.abs(l.sp); if (s < a || s >= b || l.sp === 0) return; const o = l.spOdds || [-110, -110], v = resCubre(dep, r.g, l.sp), favLocal = l.sp < 0;
          fav.push({ odds: favLocal ? o[0] : o[1], v: favLocal ? v : -v }); per.push({ odds: favLocal ? o[1] : o[0], v: favLocal ? -v : v });
          if (favLocal) hf.push({ odds: o[0], v }); else hd.push({ odds: o[0], v }); });
        rs.push([nom + ' · favorito'].concat(fa(apuestas(fav)))); rs.push([nom + ' · perro'].concat(fa(apuestas(per)))); rs.push([nom + ' · local favorito'].concat(fa(apuestas(hf)))); rs.push([nom + ' · local perro'].concat(fa(apuestas(hd))));
      });
      log('**' + (dep === 'nfl' ? 'Handicap' : 'Línea de gol') + ' por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)\n' + L.tabla(['Grupo', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rs));
    }
    const gt = filas.filter(r => r.g.linea && r.g.linea.tot != null);
    if (gt.length) {
      const lineas = [...new Set(gt.map(r => r.g.linea.tot))].sort((a, b) => a - b).filter(v => gt.filter(r => r.g.linea.tot === v).length >= 60);
      const rt = []; lineas.forEach(v => { const o = [], u = []; gt.filter(r => r.g.linea.tot === v).forEach(r => { const od = r.g.linea.ou || [-110, -110], x = resOver(dep, r.g, v); o.push({ odds: od[0], v: x }); u.push({ odds: od[1], v: -x }); });
        rt.push(['Total ' + v + ' · Más'].concat(fa(apuestas(o)))); rt.push(['Total ' + v + ' · Menos'].concat(fa(apuestas(u)))); });
      log('**Totales por línea** (' + lineas.length + ' líneas con 60+ juegos)\n' + L.tabla(['Grupo', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], rt));
      const porT2 = [...new Set(gt.map(r => r.sk))].sort().map(s => { const a = gt.filter(r => r.sk === s), o = []; a.forEach(r => o.push({ odds: (r.g.linea.ou || [-110, -110])[0], v: resOver(dep, r.g, r.g.linea.tot) })); return [String(s), 'Más'].concat(fa(apuestas(o))); });
      log('**Más, por temporada** (¿el mercado de totales se corrige con los años?)\n' + L.tabla(['Temporada', 'Lado', 'Apuestas', 'G-P-Push', '% ganadas', 'ROI ± 2·se', 'z'], porT2));
    }
  }

  /* ============ 9) específicos del deporte ============ */
  {
    log('\n## 9) Lo propio de ' + (dep === 'nhl' ? 'hockey' : 'fútbol americano'));
    const T = reg.filter(g => g.done);
    if (dep === 'nhl') {
      const n = T.length, ot = T.filter(g => g.ot).length, so = T.filter(g => g.so).length;
      log('Juegos de temporada regular: ' + n + '. Llegan a tiempo extra: **' + L.pc((ot + so) / n) + '** (se deciden en OT ' + L.pc(ot / Math.max(ot + so, 1)) + ' · en shootout ' + L.pc(so / Math.max(ot + so, 1)) + '). El modelo supone ' + L.pc(M.OTG, 0) + ' de goles en OT entre los empates a 60 min.');
      const loc = T.filter(g => g.hs > g.as).length / n; log('Local gana (incluye OT/SO): ' + L.pc(loc) + ' · en 60 min: ' + L.pc(T.filter(g => !g.ot && !g.so && g.hs > g.as).length / n) + ' · quien gana en OT/SO es el local el ' + L.pc(T.filter(g => (g.ot || g.so) && g.hs > g.as).length / Math.max(ot + so, 1)) + ' de las veces.');
      const tots = T.map(g => totJ(dep, g)), mt = tots.reduce((a, b) => a + b, 0) / n, vt = tots.reduce((a, b) => a + (b - mt) ** 2, 0) / n;
      log('Goles por juego: media ' + L.f(mt, 3) + ' · varianza ' + L.f(vt, 3) + ' (Poisson puro daría varianza ≈ media; razón ' + L.f(vt / mt, 3) + ').');
      // back-to-back: ¿el mercado ya lo descuenta?
      const gb = filas.filter(r => A.mktPm(r) !== null);
      const res = gb.map(r => ({ y: marg(dep, r.g) - A.mktPm(r), x: (r.bA ? 1 : 0) - (r.bH ? 1 : 0), r })).filter(o => o.x !== 0);
      if (res.length > 100) { const rg = L.ols(res.map(o => [1, o.x]), res.map(o => o.y)); if (rg) log('**Back-to-back**: ' + res.length + ' juegos en los que solo uno jugó ayer. Margen real − margen del mercado, por cada back-to-back del visitante (positivo = el local rinde más de lo que el mercado dice): ' + L.f(rg.b[1], 3) + ' ± ' + L.f(2 * rg.se[1], 3) + ' goles (el modelo usa R=' + M.PDEF.R + '). Cero = el mercado ya lo tiene en el precio.'); }
      const rb = []; [['Visitante en back-to-back (local descansado)', r => r.bA && !r.bH, true], ['Local en back-to-back (visitante descansado)', r => r.bH && !r.bA, false]].forEach(([nom, f, apLocal]) => { const b = []; gMl.filter(f).forEach(r => b.push(apLocal ? { odds: r.g.linea.ml[0], v: win(r) ? 1 : -1 } : { odds: r.g.linea.ml[1], v: win(r) ? -1 : 1 })); rb.push([nom + ' · apostar al descansado'].concat(fa(apuestas(b)))); });
      log(L.tabla(['Regla', 'Apuestas', 'G-P', '% ganadas', 'ROI ± 2·se', 'z'], rb));
      // calibracion del total contra la linea mas comun
      const gt = filas.filter(r => r.g.linea && r.g.linea.tot === 6);
      if (gt.length > 100) { const pr = gt.reduce((a, r) => a + A.over(r, 6).w, 0) / gt.length, ac = gt.filter(r => resOver(dep, r.g, 6) > 0).length / gt.length, pu = gt.filter(r => resOver(dep, r.g, 6) === 0).length / gt.length;
        log('Línea de 6 (con push): el modelo daba Más ' + L.pc(pr) + ' · real ' + L.pc(ac) + ' · push real ' + L.pc(pu) + ' (modelo ' + L.pc(gt.reduce((a, r) => a + A.over(r, 6).p, 0) / gt.length) + ').'); }
    } else {
      const n = T.length, emp = T.filter(g => g.hs === g.as).length, ot = T.filter(g => g.ot).length;
      log('Juegos de temporada regular: ' + n + '. Empates: ' + emp + ' (' + L.pc(emp / n, 2) + '). Tiempo extra: ' + L.pc(ot / n) + '. Local gana: ' + L.pc(T.filter(g => g.hs > g.as).length / n) + '.');
      const mar = T.map(g => g.hs - g.as), mm = mar.reduce((a, b) => a + b, 0) / n, sdm = Math.sqrt(mar.reduce((a, b) => a + (b - mm) ** 2, 0) / n), tt = T.map(g => g.hs + g.as), mt = tt.reduce((a, b) => a + b, 0) / n, sdt = Math.sqrt(tt.reduce((a, b) => a + (b - mt) ** 2, 0) / n);
      log('Margen medio (local − visitante) ' + L.f(mm, 2) + ' · desviación ' + L.f(sdm, 2) + '. Total medio ' + L.f(mt, 2) + ' · desviación ' + L.f(sdt, 2) + '.');
      const km = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21]; const cnt = {}; T.forEach(g => { const k = Math.abs(g.hs - g.as); cnt[k] = (cnt[k] || 0) + 1; });
      log('**Números clave**: frecuencia real de cada margen exacto contra lo que daría una curva normal con la misma desviación\n' + L.tabla(['Margen', 'Real', 'Normal', 'Real / Normal'], km.map(k => { const real = (cnt[k] || 0) / n, nor = (k === 0 ? (L.Phi(0.5 / sdm) - L.Phi(-0.5 / sdm)) : 2 * (L.Phi((k + 0.5 - mm) / sdm) - L.Phi((k - 0.5 - mm) / sdm)) / 2 * 1); return [String(k), L.pc(real, 2), L.pc(k === 0 ? nor : (L.Phi((k + 0.5 - mm) / sdm) - L.Phi((k - 0.5 - mm) / sdm)) + (L.Phi((-k + 0.5 - mm) / sdm) - L.Phi((-k - 0.5 - mm) / sdm)), 2), L.f(real / Math.max(k === 0 ? nor : (L.Phi((k + 0.5 - mm) / sdm) - L.Phi((k - 0.5 - mm) / sdm)) + (L.Phi((-k + 0.5 - mm) / sdm) - L.Phi((-k - 0.5 - mm) / sdm)), 1e-9), 2)]; })));
      const kw = filas.length ? M.pesosClave(hasta(Math.max(...tests)), Pelegidos[Math.max(...tests)]) : null; if (kw && kw.ok) { resumen.pesosClave = kw.W.map(v => +v.toFixed(3)); log('Pesos clave medidos con todo el historial (para |margen| = 0..45): ' + kw.W.slice(0, 22).map(v => v.toFixed(2)).join(' ')); }
      const gs = filas.filter(r => r.g.linea && r.g.linea.sp != null);
      const pushes = {}; gs.forEach(r => { const s = Math.abs(r.g.linea.sp); if (Number.isInteger(s)) { const o = (pushes[s] = pushes[s] || { n: 0, p: 0, pm: 0, pk: 0 }); o.n++; if (resCubre(dep, r.g, r.g.linea.sp) === 0) o.p++; const mu = -r.g.linea.sp; o.pm += M.pCover(mu, 13.3, -r.g.linea.sp).p; o.pk += (r.K ? M.pCoverK(mu, 13.3, r.g.linea.sp, r.K).p : 0); } });
      log('**Push en líneas enteras** (lo que pasa cuando el margen cae justo en la línea)\n' + L.tabla(['Línea', 'Juegos', 'Push real', 'Push que daría la normal', 'Push con números clave'], Object.keys(pushes).map(Number).filter(s => pushes[s].n >= 25).sort((a, b) => a - b).map(s => [String(s), String(pushes[s].n), L.pc(pushes[s].p / pushes[s].n), L.pc(pushes[s].pm / pushes[s].n), L.pc(pushes[s].pk / pushes[s].n)])));
      // descanso
      const rs = []; const rel = filas.filter(r => A.mktPm(r) !== null);
      [['Local en semana corta (≤5 días)', r => r.rH < 0 && r.rA === 0], ['Visitante en semana corta', r => r.rA < 0 && r.rH === 0], ['Local viene de bye', r => r.rH > 0 && r.rA <= 0], ['Visitante viene de bye', r => r.rA > 0 && r.rH <= 0]].forEach(([nom, f]) => {
        const b = rel.filter(f); if (b.length < 30) return; const v = b.map(r => marg(dep, r.g) - A.mktPm(r)); const s = L.ms(v); rs.push([nom, String(b.length), L.f(s.m, 2) + ' ± ' + L.f(2 * s.se, 2)]); });
      log('**Descanso**: margen real − margen de la línea (positivo = el local rinde más de lo que la línea dice)\n' + (rs.length ? L.tabla(['Situación', 'Juegos', 'Margen real − línea'], rs) : '(muestra pequeña)\n'));
      const rr = []; [['Techo cerrado', r => r.g.indoor], ['Al aire libre', r => !r.g.indoor], ['Semanas 1–4', r => r.g.wk <= 4], ['Semanas 5–12', r => r.g.wk >= 5 && r.g.wk <= 12], ['Semanas 13–18', r => r.g.wk >= 13], ['Juego de noche (jueves/domingo/lunes, 8pm ET o después)', r => { const h = new Date(r.g.ts).getUTCHours(); return h >= 0 && h <= 3; }]].forEach(([nom, f]) => {
        const b = filas.filter(r => r.g.linea && r.g.linea.tot != null && f(r)); if (b.length < 40) return; const v = b.map(r => totJ(dep, r.g) - r.g.linea.tot), s = L.ms(v);
        const bo = b.map(r => ({ odds: (r.g.linea.ou || [-110, -110])[0], v: resOver(dep, r.g, r.g.linea.tot) })); const a = apuestas(bo);
        rr.push([nom, String(b.length), L.f(s.m, 2) + ' ± ' + L.f(2 * s.se, 2), (a.roi >= 0 ? '+' : '') + (a.roi * 100).toFixed(1) + '% ± ' + (2 * a.se * 100).toFixed(1)]); });
      log('**Totales por situación**: total real − línea, y ROI de apostar siempre Más\n' + L.tabla(['Situación', 'Juegos', 'Total real − línea', 'ROI de Más ± 2·se'], rr));
    }
  }

  /* ============ 10) calibración ============ */
  {
    const bins = [[0, 0.3], [0.3, 0.4], [0.4, 0.5], [0.5, 0.6], [0.6, 0.7], [0.7, 1.01]];
    const rows = bins.map(([a, b]) => { const m = gMl.filter(r => A.pWin(r) >= a && A.pWin(r) < b), k = gMl.filter(r => pk(r) >= a && pk(r) < b);
      return [a.toFixed(2) + '–' + Math.min(b, 1).toFixed(2), String(m.length), L.pc(m.length ? m.reduce((s, r) => s + A.pWin(r), 0) / m.length : null), L.pc(m.length ? m.filter(win).length / m.length : null), String(k.length), L.pc(k.length ? k.reduce((s, r) => s + pk(r), 0) / k.length : null), L.pc(k.length ? k.filter(win).length / k.length : null)]; });
    log('\n## 10) Calibración de la probabilidad de que gane el local\n' + L.tabla(['Tramo', 'Modelo: juegos', 'Dijo', 'Ganó', 'Mercado: juegos', 'Dijo', 'Ganó'], rows));
  }

  /* ============ 11) resumen ============ */
  const ultimo = tests[tests.length - 1];
  const rec = { LAM_ML: +(lamML === null ? 0.05 : Math.max(0.05, Math.min(0.5, lamML))).toFixed(2), LAM_TOT: totalInfo ? +Math.max(0.05, Math.min(0.5, totalInfo.lam)).toFixed(2) : 0.05, ESC_SIG: resumen.margen ? +Math.min(1, resumen.margen.escSig).toFixed(3) : 1, params: Pelegidos[ultimo] };
  resumen.recomendado = rec;
  log('\n## 11) Resumen para decidir\n```\nParámetros de la última temporada de prueba (' + ultimo + '): ' + JSON.stringify(rec.params) + '\nλ ganador (peso del modelo sobre el mercado): medido ' + L.f(lamML, 2) + ' → recomendado en la app ' + rec.LAM_ML + '\nλ total: ' + (totalInfo ? L.f(totalInfo.lam, 2) : '—') + ' → ' + rec.LAM_TOT + '\nEl mercado se equivoca ' + (resumen.margen ? L.f(1 - resumen.margen.escSig, 3) : '—') + ' (relativo) menos que el modelo en el margen → ESC_SIG ' + rec.ESC_SIG + '\n```');
  return resumen;
}

(async () => {
  const quien = ARGS.includes('nhl') ? ['nhl'] : (ARGS.includes('nfl') ? ['nfl'] : ['nhl', 'nfl']);
  const todo = {};
  for (const d of quien) {
    out.length = 0;
    try { todo[d] = await medir(d); } catch (e) { log('ERROR en ' + d + ': ' + (e.stack || e.message)); process.exitCode = 1; }
    fs.writeFileSync((process.env.OVA_OUT_DIR || '.') + '/resultado_' + d + '.md', out.join('\n'));
  }
  fs.writeFileSync((process.env.OVA_OUT_DIR || '.') + '/resultado_nhl_nfl.json', JSON.stringify(todo));
})();
