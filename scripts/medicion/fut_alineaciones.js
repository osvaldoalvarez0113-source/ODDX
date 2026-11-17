'use strict';
/* ¿Saber la alineación titular le sube aciertos al modelo de fútbol? (solo mide, no toca la app)
   Uso: node scripts/medicion/fut_alineaciones.js [cache.json]
   1) Baja de ESPN los partidos de las 5 ligas (2022 a hoy) y la alineación titular de cada partido desde 2024-07
      (summary?event=). Lo ya bajado se guarda en el cache y no se vuelve a pedir.
   2) Corre el motor real de la app (dcAjustar + calcularDC copiados de futbol.html), cada día solo con lo anterior.
   3) «Faltan titulares»: de los 11 que más arrancaron en los últimos 10 partidos del equipo, cuántos NO salen hoy
      (pesado por cuántos de esos 10 arrancó cada uno). Ajuste: λ_propio × e^(−α·faltan_propio) × e^(β·faltan_rival).
      α y β se eligen en 2024-25; la prueba es 2025-26 y 2026-27. Se cuenta en aciertos y en pérdida. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'futbol.html'), 'utf8');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', UA = { 'user-agent': 'Mozilla/5.0 (compatible; OVA-medir/1.0)', accept: 'application/json' };
const LIGAS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'], DIA = 864e5;
const CACHE = process.argv[2] || 'alineaciones_cache.json';

const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return html.slice(i, j); };
function bloqueVar(n) { const i = html.search(new RegExp('var ' + n + '\\s*=')); const j = html.indexOf(';', html.indexOf('}', i)); return html.slice(i, j + 1) + '\n'; }
const lin = n => { const m = html.match(new RegExp('var ' + n + '\\s*=\\s*\\{[\\s\\S]*?\\};')); return m[0] + '\n'; };
const ctx = { Math, Object, JSON, parseFloat, isFinite, console, String }; vm.createContext(ctx);
vm.runInContext('var localStorage={getItem:function(){return null;}};var MAXG=8;\n' + lin('TOKENS_FUERA') + lin('ALIAS_EQ') + cut('function sinAcentos', 'function parseFecha')
  + cut('function pmf(lambda)', 'var CLAVES_1X2') + "var CLAVES_1X2=['pL','pD','pV'],CLAVES_GOLES=['o15','o25','o35','btts'];\n"
  + cut('function mezclar(d, d0, w, claves)', '// Todas las probabilidades del modelo') + cut('function buscarEnMapa(mapa, nombre)', 'var buscarSemilla')
  + bloqueVar('DC_CFG') + cut('function dcAjustar(lista, hoyDia, cfg)', 'function calcular(eL, eV, P)') + 'function tsPartido(p){return p.ts;}\nvar DCFIT=null;\n', ctx);

async function getJ(url) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.json(); if (r.status === 404 || r.status === 400) return null; } catch (e) {}
    await new Promise(ok => setTimeout(ok, 800 * (i + 1)));
  }
  return null;
}
async function pool(items, n, fn) { let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }; await Promise.all(Array.from({ length: n }, run)); }
const temporada = d => { const x = new Date(d); return x.getUTCMonth() >= 6 ? x.getUTCFullYear() : x.getUTCFullYear() - 1; };

async function bajar() {
  let cache = { p: {} }; try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) {}
  const y = new Date().getUTCFullYear(); let nuevos = 0;
  for (const sl of LIGAS) for (let yy = y - 4; yy <= y; yy++) {
    const j = await getJ(ESPN + sl + '/scoreboard?dates=' + yy + '&limit=1000'); if (!j) { console.log('no bajó', sl, yy); continue; }
    (j.events || []).forEach(e => { try {
      const c = e.competitions[0]; if (!(e.status && e.status.type && e.status.type.completed)) return;
      let h = null, v = null; c.competitors.forEach(x => { if (x.homeAway === 'home') h = x; else v = x; });
      const k = String(e.id); if (cache.p[k]) return;
      cache.p[k] = { id: k, sl, d: Date.parse(e.date), h: h.team.displayName, a: v.team.displayName, hid: String(h.team.id), aid: String(v.team.id), gh: parseInt(h.score, 10), ga: parseInt(v.score, 10) }; nuevos++;
    } catch (x) {} });
  }
  const pend = Object.values(cache.p).filter(m => m.d >= Date.UTC(2024, 6, 1) && !m.xi);
  console.log('partidos', Object.keys(cache.p).length, 'nuevos', nuevos, 'alineaciones por bajar', pend.length);
  let hechos = 0, sinXi = 0, muestra = false;
  await pool(pend, 8, async m => {
    const j = await getJ(ESPN + m.sl + '/summary?event=' + m.id);
    const xi = {};
    ((j && j.rosters) || []).forEach(r => {
      const tid = String((r.team && r.team.id) || ''), ids = (r.roster || []).filter(p => p.starter).map(p => String((p.athlete && p.athlete.id) || p.id || ''));
      if (ids.length >= 10) xi[tid === m.hid ? 'h' : (tid === m.aid ? 'a' : (r.homeAway === 'home' ? 'h' : 'a'))] = ids;
    });
    if (!muestra && j) { muestra = true; console.log('muestra rosters:', JSON.stringify((j.rosters || []).map(r => ({ ha: r.homeAway, t: r.team && r.team.id, n: (r.roster || []).length, tit: (r.roster || []).filter(p => p.starter).length })))); }
    if (xi.h && xi.a) m.xi = [xi.h, xi.a]; else { m.xi = 0; sinXi++; }
    if (++hechos % 500 === 0) { console.log('alineaciones', hechos, '/', pend.length); fs.writeFileSync(CACHE, JSON.stringify(cache)); }
  });
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  console.log('alineaciones bajadas', hechos, 'sin alineación', sinXi);
  return cache;
}

const LOG = p => -Math.log(Math.max(p, 1e-9));
function medir(cache) {
  const todos = Object.values(cache.p).filter(m => isFinite(m.gh) && isFinite(m.ga)).sort((a, b) => a.d - b.d);
  const cfg = ctx.DC_CFG, out = [];
  /* «faltan titulares» de cada equipo antes de cada partido (con los 10 partidos anteriores con alineación) */
  const hist = {};
  todos.forEach(m => {
    m.f = [null, null];
    if (m.xi) [0, 1].forEach(s => {
      const tid = s ? m.aid : m.hid, prev = (hist[tid] || []).slice(-10);
      if (prev.length >= 5) {
        const cnt = {}; prev.forEach(xi => xi.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
        const reg = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 11), hoy = new Set(m.xi[s]);
        let w = 0, n = 0; reg.forEach(id => { if (!hoy.has(id)) { w += cnt[id] / prev.length; n++; } });
        /* c: titulares fijos (arrancaron 8+ de los últimos 10) que hoy no salen */
        let c = 0; if (prev.length >= 8) Object.keys(cnt).forEach(id => { if (cnt[id] >= Math.ceil(prev.length * 0.8) && !hoy.has(id)) c++; });
        m.f[s] = { w, n, c };
      }
    });
    if (m.xi) { (hist[m.hid] = hist[m.hid] || []).push(m.xi[0]); (hist[m.aid] = hist[m.aid] || []).push(m.xi[1]); }
  });
  /* motor de la app, cada día con lo anterior (temporada actual + las 2 anteriores, como el teléfono) */
  for (const sl of LIGAS) {
    const L = todos.filter(m => m.sl === sl), conv = m => ({ local: m.h, visita: m.a, golesLocal: m.gh, golesVisita: m.ga, ts: m.d });
    const objetivo = L.filter(m => m.d >= Date.UTC(2024, 6, 1) && m.f[0] && m.f[1]);
    let i = 0;
    while (i < objetivo.length) {
      const dia = Math.floor(objetivo[i].d / DIA); let j = i; while (j < objetivo.length && Math.floor(objetivo[j].d / DIA) === dia) j++;
      const t = temporada(objetivo[i].d), prev = L.filter(m => Math.floor(m.d / DIA) < dia && temporada(m.d) >= t - 2).map(conv);
      ctx.lista = prev; ctx.hoy = dia; ctx.cfg = cfg;
      const f = vm.runInContext('dcAjustar(lista,hoy,cfg)', ctx);
      if (f) { ctx.f = f; vm.runInContext('DCFIT=f', ctx);
        for (let k = i; k < j; k++) { const m = objetivo[k]; ctx.a = { nombre: m.h }; ctx.b = { nombre: m.a };
          const r = vm.runInContext('calcularDC(a,b)', ctx);
          out.push({ sl, t: temporada(m.d), y: m.gh > m.ga ? 0 : (m.gh === m.ga ? 1 : 2), lamL: r.lamL, lamV: r.lamV, p: [r.pL, r.pD, r.pV], fL: m.f[0], fV: m.f[1], tot: m.gh + m.ga }); } }
      i = j;
    }
  }
  const rho = cfg.rho;
  function pred(x, al, be, campo) {
    if (!al && !be) return x.p;
    const fL = x.fL[campo], fV = x.fV[campo];
    const d = ctx.distribucion(x.lamL * Math.exp(-al * fL + be * fV), x.lamV * Math.exp(-al * fV + be * fL), rho, false);
    return [d.pL, d.pD, d.pV];
  }
  const ev = (o, al, be, campo) => { let ll = 0, ok = 0; o.forEach(x => { const p = pred(x, al, be, campo); ll += LOG(p[x.y]); if (p.indexOf(Math.max(...p)) === x.y) ok++; }); return { n: o.length, ll: ll / o.length, acierto: ok / o.length, ok }; };
  const train = out.filter(x => x.t === 2024), test = out.filter(x => x.t >= 2025);
  console.log('predichos', out.length, '| entreno 2024-25', train.length, '| prueba 2025-26+', test.length);
  const fw = o => { const v = o.map(x => x.fL.w).concat(o.map(x => x.fV.w)).sort((a, b) => a - b); return 'mediana ' + v[Math.floor(v.length / 2)].toFixed(2) + ' p90 ' + v[Math.floor(v.length * 0.9)].toFixed(2); };
  console.log('faltan titulares (pesado):', fw(out));
  const res = {};
  for (const campo of ['w', 'n', 'c']) {
    let best = [0, 0], bl = ev(train, 0, 0, campo).ll;
    for (let al = 0; al <= 0.3001; al += 0.01) for (let be = 0; be <= 0.3001; be += 0.01) { const e = ev(train, al, be, campo); if (e.ll < bl - 1e-9) { bl = e.ll; best = [Math.round(al * 100) / 100, Math.round(be * 100) / 100]; } }
    const A = ev(test, 0, 0, campo), B = ev(test, best[0], best[1], campo);
    const dif = test.map(x => LOG(pred(x, best[0], best[1], campo)[x.y]) - LOG(x.p[x.y])), md = dif.reduce((s, v) => s + v, 0) / dif.length;
    const se = Math.sqrt(dif.reduce((s, v) => s + (v - md) ** 2, 0) / dif.length / dif.length);
    const porT = {}; [2025, 2026].forEach(t => { const s = test.filter(x => x.t === t); if (s.length) porT[t] = { n: s.length, antes: +ev(s, 0, 0, campo).ll.toFixed(4), despues: +ev(s, best[0], best[1], campo).ll.toFixed(4), aciertosAntes: ev(s, 0, 0, campo).ok, aciertosDespues: ev(s, best[0], best[1], campo).ok }; });
    /* donde más pesa: partidos con 2+ titulares fijos fuera en algún equipo */
    const rot = test.filter(x => x.fL.c >= 2 || x.fV.c >= 2), Ar = ev(rot, 0, 0, campo), Br = ev(rot, best[0], best[1], campo);
    res[campo] = { alfa: best[0], beta: best[1], prueba: { n: test.length, antes: +A.ll.toFixed(5), despues: +B.ll.toFixed(5), z: +(md / se).toFixed(2), aciertosAntes: A.ok, aciertosDespues: B.ok, acierto: [+(A.acierto * 100).toFixed(2), +(B.acierto * 100).toFixed(2)] },
      porTemporada: porT, conRotacion: { n: rot.length, antes: +Ar.ll.toFixed(4), despues: +Br.ll.toFixed(4), aciertosAntes: Ar.ok, aciertosDespues: Br.ok } };
    console.log('RESULTADO', campo, JSON.stringify(res[campo]));
  }
  fs.writeFileSync('resultado_alineaciones.json', JSON.stringify(res, null, 1));
}

(async () => { const c = await bajar(); medir(c); })().catch(e => { console.error(e); process.exit(1); });
