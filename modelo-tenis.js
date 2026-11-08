/* ===================================================================
   OVA · MODELO DE TENIS (lo usan tenis.html en el teléfono y scripts/tenis_datos.js en GitHub)
   1) Quién gana: Elo general + Elo de la superficie (dura, arcilla, hierba), mezclados.
      Peso de la superficie y prior por ranking: medidos en scripts/tenis_datos.js (ratings-tenis.json → params).
   2) Sets y games: cadena de Markov punto a punto. Se busca la ventaja por punto que da
      exactamente la probabilidad del Elo a 3 sets; con esa misma ventaja salen el 2-0 / 2-1,
      el primer set, el total de games y el hándicap de games (y los Grand Slam masculinos a 5 sets).
   Sin dependencias. Funciona igual en el navegador (window.OVATenis) y en Node (require).
   =================================================================== */
(function () {
  'use strict';
  const API = {};
  if (typeof window !== 'undefined') window.OVATenis = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  /* ---------- nombres ---------- */
  function normNombre(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ---------- superficie del torneo (ESPN no la trae) ---------- */
  const ARCILLA = /roland|french open|monte.?carlo|madrid|internazionali|italian open|\brome\b|roma|barcelona|godo|hamburg|gstaad|umag|croatia open|kitzb|nordea|bastad|b[aå]stad|buenos aires|argentina open|rio open|\brio\b|chile|santiago|estoril|bmw open|munich|m[uü]nchen|geneva|gen[eè]ve|lyon|marrakech|hassan|houston|clay court|bucharest|tiriac|charleston|credit one|porsche|rabat|lalla|strasbourg|parma|palermo|prague|praha|lausanne|warsaw|bogota|bogot[aá]|iasi|cluj|budapest|bad gastein|portoroz|hamburg|cagliari|sardegna|serbia open|belgrade|banja luka|srpska|aix|bordeaux|rouen|catalonia|oeiras|saint.?malo|bastad|mexican clay|copa colsanitas|san luis/i;
  const HIERBA = /wimbledon|queen|cinch|halle|terra wortmann|hertogenbosch|libema|boss open|eastbourne|rothesay|mallorca|birmingham|nottingham|berlin|bad homburg|newport|hall of fame|ilkley|surbiton|manchester|grass/i;
  // dura por defecto; abril-mayo sin nombre conocido = arcilla (casi todo lo que se juega en esas fechas)
  function superficie(nombre, ts) {
    const n = String(nombre || '');
    if (HIERBA.test(n)) return 'G';
    if (/stuttgart/i.test(n)) { const m = new Date(ts || Date.now()).getUTCMonth(); return m >= 5 ? 'G' : 'C'; }
    if (ARCILLA.test(n)) return 'C';
    if (/united cup|davis|billie jean|hopman|atp finals|wta finals|next gen/i.test(n)) return 'H';
    const m = new Date(ts || Date.now()).getUTCMonth();
    if (m === 3 || m === 4) return 'C';
    return 'H';
  }
  const SUP_TXT = { H: 'Dura', C: 'Arcilla', G: 'Hierba' };

  /* ---------- Elo ---------- */
  const probElo = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));
  const kElo = (n, mult) => (mult || 1) * 250 / Math.pow(n + 5, 0.4);
  // rating mezclado: (1-w)·general + w·superficie
  const mezcla = (all, sup, w) => (1 - w) * all + w * (sup == null ? all : sup);
  // prior por ranking: elo = a - b·ln(rank)
  function prior(rank, pr) { pr = pr || { a: 2150, b: 95, base: 1500 }; const r = +rank; if (!r || r < 1) return pr.base; return Math.max(pr.base - 100, Math.min(2300, pr.a - pr.b * Math.log(r))); }

  /* ---------- Markov ---------- */
  // game al saque: p = prob de ganar un punto con su saque
  function pGame(p) {
    const q = 1 - p;
    return Math.pow(p, 4) * (1 + 4 * q + 10 * q * q) + 20 * Math.pow(p, 3) * Math.pow(q, 3) * (p * p) / (1 - 2 * p * q);
  }
  // tiebreak a 7: pa = A gana punto con su saque, pb = B gana punto con su saque, A saca primero
  function pTB(pa, pb) {
    const memo = {};
    const f = (a, b) => {
      if (a >= 7 && a - b >= 2) return 1; if (b >= 7 && b - a >= 2) return 0;
      if (a === 6 && b === 6 || (a >= 6 && a === b)) { const x = pa * (1 - pb), y = (1 - pa) * pb; return x / (x + y); }
      const k = a + b, key = a * 32 + b; if (memo[key] !== undefined) return memo[key];
      const sirveA = k === 0 || Math.floor((k - 1) / 2) % 2 === 1;
      const w = sirveA ? pa : 1 - pb;
      return (memo[key] = w * f(a + 1, b) + (1 - w) * f(a, b + 1));
    };
    return f(0, 0);
  }
  // set: devuelve la lista de marcadores finales {a,b,p} (a = games de A). st = 0 si saca A primero, 1 si B
  function setDist(pa, pb, st) {
    const hA = pGame(pa), hB = pGame(pb), tbA = st === 0 ? pTB(pa, pb) : 1 - pTB(pb, pa);
    const out = []; let cur = { '0,0': 1 };
    for (let g = 0; g < 13; g++) {
      const nx = {};
      for (const k in cur) {
        const pr = cur[k]; const [a, b] = k.split(',').map(Number);
        if (a === 6 && b === 6) { out.push({ a: 7, b: 6, p: pr * tbA }); out.push({ a: 6, b: 7, p: pr * (1 - tbA) }); continue; }
        const sirveA = ((a + b) % 2 === 0) === (st === 0);
        const w = sirveA ? hA : 1 - hB;
        [[a + 1, b, w], [a, b + 1, 1 - w]].forEach(([x, y, q]) => {
          if (!q) return;
          const fin = (x >= 6 && x - y >= 2) || (y >= 6 && y - x >= 2) || x === 7 || y === 7;
          if (fin) out.push({ a: x, b: y, p: pr * q }); else nx[x + ',' + y] = (nx[x + ',' + y] || 0) + pr * q;
        });
      }
      cur = nx; if (!Object.keys(cur).length) break;
    }
    return out;
  }
  // partido completo: probabilidad, sets, primer set, total de games y diferencia de games
  function partido(pa, pb, bestOf) {
    const need = bestOf === 5 ? 3 : 2;
    const sd = [setDist(pa, pb, 0), setDist(pa, pb, 1)];
    const res = { pA: 0, sets: {}, set1A: 0, total: {}, dif: {} };
    [0, 1].forEach(st0 => {
      let est = [{ sa: 0, sb: 0, st: st0, ga: 0, gb: 0, p: 0.5 }];
      let primero = true;
      while (est.length) {
        const nuevos = {};
        est.forEach(e => {
          sd[e.st].forEach(o => {
            const p = e.p * o.p, gA = o.a > o.b;
            if (primero && gA) res.set1A += p;
            const sa = e.sa + (gA ? 1 : 0), sb = e.sb + (gA ? 0 : 1), ga = e.ga + o.a, gb = e.gb + o.b;
            if (sa === need || sb === need) {
              if (sa === need) res.pA += p;
              const ks = sa + '-' + sb; res.sets[ks] = (res.sets[ks] || 0) + p;
              res.total[ga + gb] = (res.total[ga + gb] || 0) + p;
              res.dif[ga - gb] = (res.dif[ga - gb] || 0) + p;
              return;
            }
            const st = (o.a + o.b) % 2 === 0 ? e.st : 1 - e.st;
            const k = sa + ',' + sb + ',' + st + ',' + ga + ',' + gb;
            if (nuevos[k]) nuevos[k].p += p; else nuevos[k] = { sa, sb, st, ga, gb, p };
          });
        });
        est = Object.values(nuevos); primero = false;
      }
    });
    return res;
  }
  // solo la probabilidad de ganar (rápido, para calibrar): A gana el set según quién saca primero y la paridad
  function pMatchRapido(pa, pb, bestOf) {
    const need = bestOf === 5 ? 3 : 2;
    const tab = [0, 1].map(st => { const d = setDist(pa, pb, st), r = { wP: 0, wI: 0, lP: 0, lI: 0 }; d.forEach(o => { const par = (o.a + o.b) % 2 === 0; if (o.a > o.b) r[par ? 'wP' : 'wI'] += o.p; else r[par ? 'lP' : 'lI'] += o.p; }); return r; });
    let tot = 0;
    [0, 1].forEach(st0 => {
      let est = { [`0,0,${st0}`]: 0.5 };
      for (let s = 0; s < 2 * need - 1; s++) {
        const nx = {};
        for (const k in est) {
          const [sa, sb, st] = k.split(',').map(Number), p = est[k], t = tab[st];
          [[1, 0, t.wP, st], [1, 0, t.wI, 1 - st], [0, 1, t.lP, st], [0, 1, t.lI, 1 - st]].forEach(([da, db, q, nst]) => {
            const a = sa + da, b = sb + db, pp = p * q; if (!pp) return;
            if (a === need) { tot += pp; return; } if (b === need) return;
            const kk = a + ',' + b + ',' + nst; nx[kk] = (nx[kk] || 0) + pp;
          });
        }
        est = nx;
      }
    });
    return tot;
  }
  // ventaja por punto (d) tal que A gana a 3 sets con probabilidad pObj. Saque base de cada uno: sA, sB
  function ventaja(pObj, sA, sB) {
    pObj = Math.min(Math.max(pObj, 0.005), 0.995);
    let lo = -0.3, hi = 0.3;
    for (let i = 0; i < 32; i++) {
      const m = (lo + hi) / 2, p = pMatchRapido(cl(sA + m), cl(sB - m), 3);
      if (p < pObj) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  const cl = p => Math.min(Math.max(p, 0.3), 0.92);

  /* ---------- análisis de un partido ---------- */
  // jA/jB: {all, sup:{H,C,G}, n, nS:{...}} ; o: {sup, bestOf, w, base:{H,C,G}, pr}
  function rating(j, sup, w) { return mezcla(j.all, j.sup && j.sup[sup] != null ? j.sup[sup] : null, w); }
  function analizar(jA, jB, o) {
    const sup = o.sup || 'H', w = o.w == null ? 0.5 : o.w, bestOf = o.bestOf === 5 ? 5 : 3;
    const rA = rating(jA, sup, w), rB = rating(jB, sup, w);
    const p3 = probElo(rA, rB);
    const s = (o.base && o.base[sup]) || 0.63;
    const d = ventaja(p3, s, s);
    const m = partido(cl(s + d), cl(s - d), bestOf);
    const totales = Object.keys(m.total).map(Number).sort((a, b) => a - b);
    let media = 0; totales.forEach(t => media += t * m.total[t]);
    const masDe = L => { let x = 0; totales.forEach(t => { if (t > L) x += m.total[t]; }); return x; };
    const hcp = L => { let x = 0; for (const k in m.dif) if (+k + L > 0) x += m.dif[k]; return x; };   // A con hándicap L (ej. -3.5)
    let mediana = 0, acc = 0; for (const t of totales) { acc += m.total[t]; if (acc >= 0.5) { mediana = t; break; } }
    return { rA, rB, p3, pA: m.pA, sets: m.sets, set1A: m.set1A, total: m.total, dif: m.dif, media, mediana, masDe, hcp, d, sup, bestOf, saque: s };
  }

  /* ---------- sets y games medidos (tablas de ratings-tenis.json → emp) ----------
     Cada tabla dice qué pasó de verdad en los partidos donde el favorito tenía esa probabilidad:
     s = [gana sin perder set, gana perdiendo set, pierde ganando set, pierde sin ganar set], s1 = ganó el 1er set,
     tot = total de games, dif = games del favorito menos los del rival. Todo visto desde el FAVORITO. */
  function tablaDe(emp, sup, pFav, bo5) {
    if (!emp) return null;
    const dentro = t => pFav >= t.de && pFav < t.a + (t.a >= 1 ? 0.01 : 0);
    if (bo5) return (emp.bo5 || []).find(dentro) || null;
    const L = emp.bo3 && emp.bo3[sup] && emp.bo3[sup].find(dentro);
    if (L && L.n >= 60) return L;
    return (emp.bo3 && emp.bo3['*'] || []).find(dentro) || null;
  }
  function deTabla(t) {
    if (!t || !t.n) return null;
    const n = t.n, ks = Object.keys(t.tot).map(Number).sort((a, b) => a - b);
    let media = 0, acc = 0, mediana = 0; ks.forEach(k => media += k * t.tot[k] / n);
    for (const k of ks) { acc += t.tot[k]; if (acc >= n / 2) { mediana = k; break; } }
    return {
      n, sinSet: t.s[0] / n, conSet: t.s[1] / n, pierdeCon: t.s[2] / n, pierdeSin: t.s[3] / n, set1: t.s1 / n, media, mediana,
      masDe: L => { let x = 0; for (const k in t.tot) if (+k > L) x += t.tot[k]; return x / n; },
      cubre: L => { let x = 0; for (const k in t.dif) if (+k + L > 0) x += t.dif[k]; return x / n; }   // favorito con hándicap L (ej. -3.5)
    };
  }

  Object.assign(API, { tablaDe, deTabla, normNombre, superficie, SUP_TXT, probElo, kElo, mezcla, prior, pGame, pTB, setDist, partido, pMatchRapido, ventaja, analizar, rating });
})();
