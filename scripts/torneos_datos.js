'use strict';
/* Datos para lo que NO es liga en la app de fútbol: selecciones (países) y copas nacionales (FA Cup, Copa del Rey...).
   Corre en GitHub Actions (torneos.yml). Uso: node scripts/torneos_datos.js
   Escribe:
     hist-selecciones.json  → partidos de selecciones de los últimos 4 años en TODOS los torneos que ESPN tenga
                               (amistosos, eliminatorias, Copa Asia, Copa Oro, AFCON...) + los próximos 21 días.
                               Antes el teléfono lo bajaba solo y, como ESPN ya no acepta rangos de fechas,
                               se quedaba con 1 año y 4 torneos (por eso UAE salía con 1 partido y sin Elo).
     fuerza-nacional.json   → fuerza de cada club por país (1.ª + 2.ª división + copas juntas), con el mismo
                               motor Dixon-Coles de la app (dcAjustar copiado de futbol.html).
     hist-nac-<pais>.json   → partidos de los últimos 14 meses de ese país (para forma, rachas y cara a cara).
   Mide (en aciertos y pérdida log, cada partido predicho solo con lo anterior) y lo guarda dentro de los JSON
   para que la app diga qué tan confiable es. Detalle en docs/MEDICION-TORNEOS-2026-11.md. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const RAIZ = path.join(__dirname, '..'), html = fs.readFileSync(path.join(RAIZ, 'futbol.html'), 'utf8');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; OVA-torneos/1.0)', accept: 'application/json' };
const DIA = 864e5;

/* ---------- selecciones: torneos candidatos (los que ESPN no tenga se saltan solos y salen en el log) ---------- */
const SEL_SLUGS = [
  ['fifa.friendly', 'amistoso'],
  ['uefa.nations', 'liga de naciones'], ['concacaf.nations.league', 'liga de naciones'],
  ['fifa.worldq.uefa', 'eliminatoria'], ['fifa.worldq.concacaf', 'eliminatoria'], ['fifa.worldq.conmebol', 'eliminatoria'],
  ['fifa.worldq.afc', 'eliminatoria'], ['fifa.worldq.caf', 'eliminatoria'], ['fifa.worldq.ofc', 'eliminatoria'],
  ['fifa.worldq.playoff', 'eliminatoria'],
  ['uefa.euroq', 'eliminatoria'], ['caf.nations_qual', 'eliminatoria'], ['afc.asian.cup_qual', 'eliminatoria'], ['afc.cupq', 'eliminatoria'],
  ['concacaf.gold_qual', 'eliminatoria'],
  ['fifa.world', 'mundial'],
  ['uefa.euro', 'torneo'], ['conmebol.america', 'torneo'], ['concacaf.gold', 'torneo'], ['caf.nations', 'torneo'],
  ['afc.asian.cup', 'torneo'], ['fifa.arab', 'torneo'], ['fifa.arabcup', 'torneo'], ['afc.gulf', 'torneo'], ['afc.gulf.cup', 'torneo'],
  ['concacaf.nations.league_qual', 'liga de naciones'], ['fifa.confederations', 'torneo'], ['caf.chan', 'torneo']
];
/* K del Elo y ventaja de local: iguales a selecciones.js (medido en docs/MEDICION-HUECOS-2026-11.md) */
const KT = { amistoso: 25, 'liga de naciones': 50, eliminatoria: 50, torneo: 62.5, mundial: 75 };
const HA = { eliminatoria: 60, 'liga de naciones': 60, amistoso: 40, torneo: 40, mundial: 40 };

/* ---------- copas nacionales: cada país junta 1.ª, 2.ª (y 3.ª-4.ª si ESPN las tiene) y sus copas ---------- */
const PAISES = {
  eng: { ligas: ['eng.1', 'eng.2', 'eng.3', 'eng.4'], copas: ['eng.fa', 'eng.league_cup'] },
  esp: { ligas: ['esp.1', 'esp.2'], copas: ['esp.copa_del_rey'] },
  ita: { ligas: ['ita.1', 'ita.2'], copas: ['ita.coppa_italia'] },
  ger: { ligas: ['ger.1', 'ger.2', 'ger.3'], copas: ['ger.dfb_pokal'] },
  fra: { ligas: ['fra.1', 'fra.2'], copas: ['fra.coupe_de_france'] }
};
/* mismo motor y ajustes que las 5 ligas en la app (DC_CFG de futbol.html) */
const CFG = (() => { const m = html.match(/var DC_CFG = \{xi:([\d.]+), Kp:([\d.]+), rho:(-?[\d.]+), promo:(\d), wt:([\d.]+), win:(\d+)/);
  if (!m) throw new Error('no encuentro DC_CFG en futbol.html');
  return { xi: +m[1], Kp: +m[2], rho: +m[3], promo: +m[4], wt: +m[5], win: +m[6] }; })();

/* ---------- motor copiado de futbol.html (así la app y la medición usan lo mismo) ---------- */
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
const lin = n => { const m = html.match(new RegExp('var ' + n + '\\s*=\\s*\\{[\\s\\S]*?\\};')); if (!m) throw new Error('no ' + n); return m[0] + '\n'; };
const ctx = { Math, Object, console, isFinite, parseFloat, String, JSON }; vm.createContext(ctx);
vm.runInContext('var localStorage={getItem:function(){return null;}};\n' + lin('TOKENS_FUERA') + lin('ALIAS_EQ') +
  cut('function sinAcentos', 'function parseFecha') + cut('var MAXG', 'var CLAVES_1X2') + 'var CLAVES_1X2 = ["pL","pD","pV"], CLAVES_GOLES = ["o15","o25","o35","btts"];\n' +
  cut('function mezclar(', 'function probsModelo') + cut('function dcAjustar(lista, hoyDia, cfg)', 'function eloMix()') + 'function tsPartido(p){return p.ts;}\n', ctx);
const claveEq = n => ctx.claveEq(n);

/* ---------- ESPN ---------- */
async function getJ(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.json(); if (r.status === 404 || r.status === 400) return { _st: r.status }; } catch (e) {}
    await new Promise(ok => setTimeout(ok, 700 * (i + 1)));
  }
  return null;
}
function eventos(j, sl) {
  const out = [];
  ((j && j.events) || []).forEach(e => { try {
    const c = e.competitions[0], st = (e.status && e.status.type) || {};
    let h = null, v = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else v = x; }); if (!h || !v) return;
    const gh = parseInt(h.score, 10), ga = parseInt(v.score, 10), ts = Date.parse(e.date); if (!isFinite(ts)) return;
    const neutral = !!c.neutralSite;
    out.push({ id: String(e.id), sl, d: ts, h: h.team.displayName, a: v.team.displayName, gh: isFinite(gh) ? gh : null, ga: isFinite(ga) ? ga : null,
      fin: st.completed === true, n: neutral ? 1 : 0, eh: h.team.logo || '', ea: v.team.logo || '' });
  } catch (x) {} });
  return out;
}
/* un año entero (ESPN acepta dates=YYYY); si viene lleno (tope 1000) se baja mes por mes */
async function bajarAnio(sl, y) {
  const j = await getJ(ESPN + sl + '/scoreboard?dates=' + y + '&limit=1000');
  if (!j || j._st) return { ok: false, ev: [] };
  let ev = eventos(j, sl);
  if (ev.length >= 990) {
    ev = [];
    for (let m = 1; m <= 12; m++) {
      const desde = new Date(Date.UTC(y, m - 1, 1)), dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d0 = 1; d0 <= dias; d0 += 1) {
        const dd = new Date(desde.getTime() + (d0 - 1) * DIA), s = dd.getUTCFullYear() + String(dd.getUTCMonth() + 1).padStart(2, '0') + String(dd.getUTCDate()).padStart(2, '0');
        const jj = await getJ(ESPN + sl + '/scoreboard?dates=' + s); if (jj && !jj._st) ev = ev.concat(eventos(jj, sl));
      }
    }
  }
  return { ok: true, ev };
}
async function proximos(sl, dias) {
  const out = []; const hoy = Date.now();
  for (let k = 0; k <= dias; k++) {
    const dd = new Date(hoy + k * DIA), s = dd.getUTCFullYear() + String(dd.getUTCMonth() + 1).padStart(2, '0') + String(dd.getUTCDate()).padStart(2, '0');
    const j = await getJ(ESPN + sl + '/scoreboard?dates=' + s); if (j && !j._st) eventos(j, sl).forEach(e => out.push(e));
  }
  return out;
}

/* ---------- utilidades de medición ---------- */
const r4 = v => Math.round(v * 1e4) / 1e4;
function poisson(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
function goles(lamL, lamV) { /* Poisson simple: más de 1.5/2.5/3.5 y ambos anotan */
  let o15 = 0, o25 = 0, o35 = 0, bt = 0, s = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const p = poisson(lamL, i) * poisson(lamV, j); s += p; const t = i + j; if (t > 1.5) o15 += p; if (t > 2.5) o25 += p; if (t > 3.5) o35 += p; if (i && j) bt += p; }
  return { o15: o15 / s, o25: o25 / s, o35: o35 / s, btts: bt / s };
}
function acum() { return { n: 0, ok: 0, ll: 0, llb: 0, okb: 0 }; }
function sumar(a, p, real, pb) { /* p y pb: objetos {k: prob}; real: clave que pasó */
  const kM = Object.keys(p).reduce((x, y) => p[y] > p[x] ? y : x), kB = Object.keys(pb).reduce((x, y) => pb[y] > pb[x] ? y : x);
  a.n++; if (kM === real) a.ok++; if (kB === real) a.okb++;
  a.ll += -Math.log(Math.max(p[real], 1e-9)); a.llb += -Math.log(Math.max(pb[real], 1e-9));
}
const resumen = a => a.n ? { n: a.n, acierto: r4(a.ok / a.n), aciertoBase: r4(a.okb / a.n), perdida: r4(a.ll / a.n), perdidaBase: r4(a.llb / a.n) } : { n: 0 };

/* ======================= SELECCIONES ======================= */
function eloSel(lista, medir) { /* igual que construirElo de selecciones.js; mide cada partido con lo anterior */
  const R = {}, ord = lista.slice().sort((a, b) => a.d - b.d), m1 = acum(), tramos = {};
  let emp = 0; ord.forEach(m => { if (m.gh === m.ga) emp++; });
  const d0 = ord.length ? Math.max(0.15, Math.min(0.32, emp / ord.length)) : 0.25, fr = { L: 1, D: 1, V: 1 }; let nfr = 3;
  ord.forEach(m => {
    const kh = claveEq(m.h), ka = claveEq(m.a);
    const a = R[kh] || (R[kh] = { r: 1500, n: 0 }), b = R[ka] || (R[ka] = { r: 1500, n: 0 });
    const dr = a.r - b.r + (HA[m.t] || 0), E = 1 / (1 + Math.pow(10, -dr / 400));
    const real = m.gh > m.ga ? 'L' : (m.gh < m.ga ? 'V' : 'D');
    if (m.d >= medir && a.n >= 5 && b.n >= 5) {
      const pD = Math.max(0.05, Math.min(0.34, d0 * 1.2 * (1 - Math.pow(2 * E - 1, 2))));
      let pW = Math.max(E - pD / 2, 0.01), pL = Math.max(1 - E - pD / 2, 0.01); const s = pW + pD + pL;
      const p = { L: pW / s, D: pD / s, V: pL / s };
      sumar(m1, p, real, { L: fr.L / nfr, D: fr.D / nfr, V: fr.V / nfr });
      const fav = Math.max(p.L, p.V), kF = p.L >= p.V ? 'L' : 'V', t = fav >= 0.7 ? '70+' : fav >= 0.6 ? '60-70' : fav >= 0.5 ? '50-60' : '<50';
      const tt = tramos[t] || (tramos[t] = { n: 0, gano: 0, pr: 0 }); tt.n++; tt.pr += fav; if (real === kF) tt.gano++;
    }
    const S = m.gh > m.ga ? 1 : (m.gh === m.ga ? 0.5 : 0), diff = Math.abs(m.gh - m.ga), G = diff <= 1 ? 1 : (diff === 2 ? 1.5 : (11 + diff) / 8);
    const delta = (KT[m.t] || 30) * G * (S - E); a.r += delta; b.r -= delta; a.n++; b.n++; fr[real]++; nfr++;
  });
  const tr = {}; Object.keys(tramos).forEach(k => { const t = tramos[k]; tr[k] = { n: t.n, favoritoGano: r4(t.gano / t.n), decia: r4(t.pr / t.n) }; });
  return { x12: resumen(m1), tramos: tr };
}
/* goles de selecciones: promedio de goles a favor de uno y en contra del otro en sus últimos 10, encogido hacia la media (K=4) */
const SEL_GOL = { N: 10, K: 4 };
function lamSel(prevL, prevV, media) {
  const r = (xs, f) => { let s = 0; xs.forEach(x => s += f(x)); return { s, n: xs.length }; };
  const gfL = r(prevL, x => x.f), gcV = r(prevV, x => x.c), gfV = r(prevV, x => x.f), gcL = r(prevL, x => x.c);
  const K = SEL_GOL.K;
  const lL = ((gfL.s + K * media) / (gfL.n + K) + (gcV.s + K * media) / (gcV.n + K)) / 2;
  const lV = ((gfV.s + K * media) / (gfV.n + K) + (gcL.s + K * media) / (gcL.n + K)) / 2;
  return [lL, lV];
}
function medirGolesSel(lista, medir) {
  const ord = lista.slice().sort((a, b) => a.d - b.d), porEq = {}, mo = acum(), mb = acum(); let gs = 0, ng = 0, fo = { s: 1, n: 2 }, fb = { s: 1, n: 2 };
  ord.forEach(m => {
    const kh = claveEq(m.h), ka = claveEq(m.a), ph = (porEq[kh] || []).slice(-SEL_GOL.N), pa = (porEq[ka] || []).slice(-SEL_GOL.N);
    if (m.d >= medir && ph.length >= 5 && pa.length >= 5 && ng > 100) {
      const [lL, lV] = lamSel(ph, pa, gs / ng / 2), g = goles(lL, lV), t = m.gh + m.ga;
      sumar(mo, { si: g.o25, no: 1 - g.o25 }, t > 2.5 ? 'si' : 'no', { si: fo.s / fo.n, no: 1 - fo.s / fo.n });
      sumar(mb, { si: g.btts, no: 1 - g.btts }, (m.gh && m.ga) ? 'si' : 'no', { si: fb.s / fb.n, no: 1 - fb.s / fb.n });
    }
    (porEq[kh] = porEq[kh] || []).push({ f: m.gh, c: m.ga }); (porEq[ka] = porEq[ka] || []).push({ f: m.ga, c: m.gh });
    gs += m.gh + m.ga; ng++; fo.n++; if (m.gh + m.ga > 2.5) fo.s++; fb.n++; if (m.gh && m.ga) fb.s++;
  });
  return { o25: resumen(mo), btts: resumen(mb), media: r4(gs / Math.max(ng, 1) / 2) };
}

async function selecciones() {
  const ahora = Date.now(), y = new Date(ahora).getUTCFullYear(), anios = [y - 4, y - 3, y - 2, y - 1, y];
  const ruta = path.join(RAIZ, 'hist-selecciones.json'), mapa = new Map(), log = { ok: {}, sinRespuesta: [] }, prox = [];
  let previo = null; try { previo = JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) {}
  if (previo && previo.p) previo.p.forEach(r => mapa.set(r[0], { id: r[0], h: r[1], a: r[2], gh: r[3], ga: r[4], d: r[5], t: r[6], sl: r[7] || '' }));
  const completo = !previo || !previo.p || previo.p.length < 1000 || process.env.TORNEOS_COMPLETO === '1';
  for (const [sl, t] of SEL_SLUGS) {
    let total = 0, alguno = false;
    for (const yy of (completo ? anios : [y - 1, y])) {
      const r = await bajarAnio(sl, yy); if (!r.ok) continue; alguno = true;
      r.ev.forEach(e => { if (e.fin && e.gh !== null && e.ga !== null) { mapa.set(e.id, { id: e.id, h: e.h, a: e.a, gh: e.gh, ga: e.ga, d: e.d, t, sl }); total++; } });
    }
    if (!alguno) { log.sinRespuesta.push(sl); continue; }
    log.ok[sl] = total;
  }
  /* próximos 21 días de los torneos que respondieron (para la opción «Todas las selecciones») */
  for (const sl of Object.keys(log.ok)) {
    const t = (SEL_SLUGS.find(s => s[0] === sl) || [])[1] || 'amistoso';
    (await proximos(sl, 21)).forEach(e => { if (!e.fin && e.d >= ahora - 3 * 3600e3) prox.push({ id: e.id, sl, t, d: e.d, h: e.h, a: e.a, eh: e.eh, ea: e.ea, n: e.n }); });
  }
  const corte = ahora - (4 * 366 + 10) * DIA;
  const lista = [...mapa.values()].filter(m => m.d >= corte && m.d <= ahora).sort((a, b) => a.d - b.d);
  if (lista.length < 500) throw new Error('selecciones: muy pocos partidos (' + lista.length + '); no se escribe nada');
  const medir = ahora - 2 * 365 * DIA;
  const med = { elo: eloSel(lista, medir), goles: medirGolesSel(lista, medir), desde: new Date(medir).toISOString().slice(0, 10) };
  const vistos = new Set(), proxU = prox.filter(p => !vistos.has(p.id) && vistos.add(p.id)).sort((a, b) => a.d - b.d);
  const out = { generado: new Date(ahora).toISOString(), anios: 4, slugs: log.ok, sinRespuesta: log.sinRespuesta, med,
    p: lista.map(m => [m.id, m.h, m.a, m.gh, m.ga, m.d, m.t, m.sl]), prox: proxU };
  fs.writeFileSync(ruta, JSON.stringify(out) + '\n');
  console.log('SELECCIONES partidos', lista.length, '| próximos', proxU.length, '| torneos', JSON.stringify(log.ok), '| sin respuesta', log.sinRespuesta.join(', '));
  console.log('SELECCIONES medición', JSON.stringify(med));
  return med;
}

/* ======================= COPAS NACIONALES ======================= */
function lamDC(f, nL, nV) {
  const pr = CFG.promo ? { att: 0.85, def: 1.15 } : { att: 1, def: 1 };
  const a = f.eq[claveEq(nL)] || pr, b = f.eq[claveEq(nV)] || pr;
  return [f.c * a.att * b.def * f.gam, f.c * b.att * a.def];
}
function probsDC(f, nL, nV) { /* igual que calcularDC de futbol.html (sin la mezcla opcional con Elo) */
  const [lL, lV] = lamDC(f, nL, nV);
  const d = ctx.distribucion(lL, lV, CFG.rho, false), g0 = ctx.distribucion(f.hAvg, f.aAvg, CFG.rho, false);
  const g = ctx.mezclar(d, g0, CFG.wt, ['o15', 'o25', 'o35', 'btts']);
  return { pL: d.pL, pD: d.pD, pV: d.pV, o25: g.o25, btts: g.btts };
}
function medirPais(lista, copasSl, medir) {
  /* cada semana con partidos de copa se ajusta el motor SOLO con lo jugado antes de esa semana */
  const copa = lista.filter(m => copasSl.includes(m.sl) && m.d >= medir).sort((a, b) => a.d - b.d);
  const semanas = new Map(); copa.forEach(m => { const w = Math.floor(m.d / (7 * DIA)); (semanas.get(w) || semanas.set(w, []).get(w)).push(m); });
  const x12 = acum(), x12c = acum(), ou = acum(), bt = acum(), tramos = {};
  const fr = { L: 1, D: 1, V: 1 }; let nfr = 3, fo = { s: 1, n: 2 }, fb = { s: 1, n: 2 };
  /* frecuencias de arranque: copas de antes del periodo medido */
  lista.filter(m => copasSl.includes(m.sl) && m.d < medir).forEach(m => { fr[m.gh > m.ga ? 'L' : m.gh < m.ga ? 'V' : 'D']++; nfr++; fo.n++; if (m.gh + m.ga > 2.5) fo.s++; fb.n++; if (m.gh && m.ga) fb.s++; });
  for (const [w, ms] of semanas) {
    const ini = w * 7 * DIA, hoyDia = Math.floor(ini / DIA);
    const prev = lista.filter(m => m.d < ini).map(m => ({ local: m.h, visita: m.a, golesLocal: m.gh, golesVisita: m.ga, ts: m.d }));
    let f = null; try { f = ctx.dcAjustar(prev, hoyDia, CFG); } catch (e) { f = null; }
    if (!f) continue;
    ms.forEach(m => {
      const real = m.gh > m.ga ? 'L' : (m.gh < m.ga ? 'V' : 'D'), p = probsDC(f, m.h, m.a);
      const eh = f.eq[claveEq(m.h)], ea = f.eq[claveEq(m.a)], conocidos = eh && ea && eh.n >= 8 && ea.n >= 8;
      const pb = { L: fr.L / nfr, D: fr.D / nfr, V: fr.V / nfr };
      if (conocidos) {
        sumar(x12, { L: p.pL, D: p.pD, V: p.pV }, real, pb);
        sumar(ou, { si: p.o25, no: 1 - p.o25 }, m.gh + m.ga > 2.5 ? 'si' : 'no', { si: fo.s / fo.n, no: 1 - fo.s / fo.n });
        sumar(bt, { si: p.btts, no: 1 - p.btts }, (m.gh && m.ga) ? 'si' : 'no', { si: fb.s / fb.n, no: 1 - fb.s / fb.n });
        const fav = Math.max(p.pL, p.pV), kF = p.pL >= p.pV ? 'L' : 'V', t = fav >= 0.7 ? '70+' : fav >= 0.6 ? '60-70' : fav >= 0.5 ? '50-60' : '<50';
        const tt = tramos[t] || (tramos[t] = { n: 0, gano: 0, pr: 0 }); tt.n++; tt.pr += fav; if (real === kF) tt.gano++;
      } else x12c.n++;
      fr[real]++; nfr++; fo.n++; if (m.gh + m.ga > 2.5) fo.s++; fb.n++; if (m.gh && m.ga) fb.s++;
    });
  }
  const tr = {}; Object.keys(tramos).forEach(k => { const t = tramos[k]; tr[k] = { n: t.n, favoritoGano: r4(t.gano / t.n), decia: r4(t.pr / t.n) }; });
  return { x12: resumen(x12), o25: resumen(ou), btts: resumen(bt), sinDatos: x12c.n, tramos: tr };
}
function juntarMed(meds) {
  const t = {}; ['x12', 'o25', 'btts'].forEach(k => {
    let n = 0, ok = 0, okb = 0, ll = 0, llb = 0;
    meds.forEach(m => { const r = m[k]; if (!r || !r.n) return; n += r.n; ok += r.acierto * r.n; okb += r.aciertoBase * r.n; ll += r.perdida * r.n; llb += r.perdidaBase * r.n; });
    t[k] = n ? { n, acierto: r4(ok / n), aciertoBase: r4(okb / n), perdida: r4(ll / n), perdidaBase: r4(llb / n) } : { n: 0 };
  });
  const tramos = {}; meds.forEach(m => Object.keys(m.tramos || {}).forEach(k => { const a = tramos[k] || (tramos[k] = { n: 0, g: 0, p: 0 }), b = m.tramos[k]; a.n += b.n; a.g += b.favoritoGano * b.n; a.p += b.decia * b.n; }));
  t.tramos = {}; Object.keys(tramos).forEach(k => { const a = tramos[k]; t.tramos[k] = { n: a.n, favoritoGano: r4(a.g / a.n), decia: r4(a.p / a.n) }; });
  t.sinDatos = meds.reduce((s, m) => s + (m.sinDatos || 0), 0);
  return t;
}

async function copasNacionales() {
  const ahora = Date.now(), y = new Date(ahora).getUTCFullYear(), salida = { generado: new Date(ahora).toISOString(), cfg: CFG, paises: {}, med: {} }, meds = [];
  for (const pais of Object.keys(PAISES)) {
    const conf = PAISES[pais], todos = conf.ligas.concat(conf.copas), ruta = path.join(RAIZ, 'hist-nac-' + pais + '.json');
    const mapa = new Map(), ok = {}, sin = [];
    for (const sl of todos) {
      let n = 0, alguno = false;
      for (const yy of [y - 3, y - 2, y - 1, y]) {
        const r = await bajarAnio(sl, yy); if (!r.ok) continue; alguno = true;
        r.ev.forEach(e => { if (e.fin && e.gh !== null && e.ga !== null) { mapa.set(sl + e.id, { id: e.id, sl, d: e.d, h: e.h, a: e.a, gh: e.gh, ga: e.ga }); n++; } });
      }
      if (alguno) ok[sl] = n; else sin.push(sl);
    }
    const lista = [...mapa.values()].filter(m => m.d <= ahora && m.d >= ahora - (CFG.win + 400) * DIA).sort((a, b) => a.d - b.d);
    const hoyDia = Math.floor(ahora / DIA) + 1;
    const f = ctx.dcAjustar(lista.map(m => ({ local: m.h, visita: m.a, golesLocal: m.gh, golesVisita: m.ga, ts: m.d })), hoyDia, CFG);
    if (!f || Object.keys(f.eq).length < 30) { console.log('COPAS', pais, 'sin ajuste (', lista.length, 'partidos)'); continue; }
    const eq = {}; Object.keys(f.eq).sort().forEach(k => { const e = f.eq[k]; eq[k] = { att: r4(e.att), def: r4(e.def), n: e.n }; });
    salida.paises[pais] = { c: r4(f.c), gam: r4(f.gam), hAvg: r4(f.hAvg), aAvg: r4(f.aAvg), n: f.n, ligas: ok, sinRespuesta: sin, eq };
    /* partidos de los últimos 14 meses (forma, rachas, cara a cara en todas las competencias) */
    const reciente = lista.filter(m => m.d >= ahora - 425 * DIA);
    fs.writeFileSync(ruta, JSON.stringify({ generado: salida.generado, p: reciente.map(m => [m.id, m.sl, m.h, m.a, m.gh, m.ga, m.d]) }) + '\n');
    const medir = Date.UTC(y - 2, 6, 1); /* dos temporadas y lo que va */
    const m = medirPais(lista, conf.copas, medir); m.pais = pais; meds.push(m); salida.med[pais] = m;
    console.log('COPAS', pais, '| partidos', lista.length, '| equipos', Object.keys(eq).length, '| ligas', JSON.stringify(ok), '| sin respuesta', sin.join(', '));
    console.log('COPAS medición', pais, JSON.stringify(m));
  }
  if (!Object.keys(salida.paises).length) throw new Error('copas: ningún país se pudo ajustar');
  salida.med.total = juntarMed(meds);
  fs.writeFileSync(path.join(RAIZ, 'fuerza-nacional.json'), JSON.stringify(salida) + '\n');
  console.log('COPAS medición total', JSON.stringify(salida.med.total));
  return salida.med;
}

async function principal() {
  const solo = process.argv[2] || '';
  if (!solo || solo === 'sel') await selecciones();
  if (!solo || solo === 'copas') await copasNacionales();
}
module.exports = { eloSel, medirGolesSel, lamSel, medirPais, probsDC, goles, CFG, SEL_GOL };
if (require.main === module) principal().catch(e => { console.error(e); process.exit(1); });
