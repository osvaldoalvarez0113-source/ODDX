/* ===================================================================
   OVA · NÚCLEO DE LAS APPS NHL Y NFL (nhl.html y nfl.html cargan este mismo archivo; cada una trae su propio modelo)
   - Partidos: archivo diario hist-<dep>.json (lo escribe GitHub) + los últimos días directo de ESPN (cuando falla, copia guardada o ESPN).
   - Mercado: líneas de ESPN (DraftKings) en el propio marcador + precio justo de Pinnacle (pinnacle-<dep>.json) cuando existe.
   - Medido con 4–7 temporadas contra el cierre del mercado (docs/MEDICION-NHL-NFL-2026-10.md): el mercado manda y el modelo pesa poco.
   =================================================================== */
(function () {
  'use strict';
  const API = {};
  if (typeof window !== 'undefined') window.OVAUS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  /* ---------- cuotas (puras) ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => (n < 10 ? '0' : '') + n;
  function impProb(a) { a = +a; if (!a) return null; return a > 0 ? 100 / (a + 100) : -a / (-a + 100); }
  function cuotaJusta(p) { if (!p || p <= 0 || p >= 1) return null; return p >= 0.5 ? Math.round(-(p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100); }
  function amTxt(p) { const v = cuotaJusta(p); return v === null ? '—' : (v > 0 ? '+' : '') + v; }
  function decAm(a) { a = +a; if (!a) return null; return a > 0 ? a / 100 + 1 : 100 / (-a) + 1; }
  function normCuota(v) { if (v === '' || v == null) return null; const n = +v; if (isNaN(n) || n === 0) return null; if (Math.abs(n) < 100) return cuotaJusta(Math.abs(n) / 100); return n; }
  const logitP = p => Math.log(p / (1 - p)), sigP = z => 1 / (1 + Math.exp(-z));
  const clampP = p => Math.min(Math.max(p, 1e-4), 1 - 1e-4);
  Object.assign(API, { esc, impProb, cuotaJusta, amTxt, decAm, normCuota, logitP, sigP });

  /* ---------- líneas de ESPN en el marcador (formato nuevo de ESPN; si falta, formato viejo) ---------- */
  const amNum = v => { if (v == null) return null; const n = parseFloat(String(v).replace(/[−–—]/g, '-').replace(/[^0-9.+-]/g, '')); return isFinite(n) ? n : null; };
  const amOdd = v => { const n = amNum(v); return (n !== null && Math.abs(n) >= 100) ? n : null; };
  const blq = x => x && (x.close || x.current || x.open);
  function parseOdds(c) {
    const o = c && c.odds && c.odds[0]; if (!o) return null;
    const r = {};
    if (o.moneyline) { const h = amOdd(blq(o.moneyline.home) && blq(o.moneyline.home).odds), a = amOdd(blq(o.moneyline.away) && blq(o.moneyline.away).odds); if (h && a) { r.mlH = h; r.mlA = a; } }
    if (o.pointSpread) {
      const h = blq(o.pointSpread.home), a = blq(o.pointSpread.away), ln = amNum(h && h.line);
      if (ln !== null && Math.abs(ln) <= 45) { r.spread = ln; const oh = amOdd(h && h.odds), oa = amOdd(a && a.odds); if (oh && oa) { r.spH = oh; r.spA = oa; } }
    }
    if (o.total) {
      const ov = blq(o.total.over), un = blq(o.total.under);
      const ln = amNum(String((ov && ov.line) || (un && un.line) || '').replace(/[ouOU]/g, ''));
      if (ln !== null && ln > 0) { r.total = ln; const a1 = amOdd(ov && ov.odds), a2 = amOdd(un && un.odds); if (a1 && a2) { r.toO = a1; r.toU = a2; } }
    }
    // formato viejo (sirve si ESPN cambia): total, handicap del local con la bandera de favorito
    if (r.total === undefined && isFinite(+o.overUnder) && +o.overUnder > 0) r.total = +o.overUnder;
    if (r.spread === undefined && isFinite(+o.spread) && o.spread !== null && Math.abs(+o.spread) <= 45) {
      const v = +o.spread, fh = o.homeTeamOdds && o.homeTeamOdds.favorite;
      r.spread = (fh === true) ? -Math.abs(v) : ((fh === false) ? Math.abs(v) : v);
    }
    if (r.mlH === undefined) { const mh = o.homeTeamOdds && o.homeTeamOdds.moneyLine, ma = o.awayTeamOdds && o.awayTeamOdds.moneyLine; if (amOdd(mh) && amOdd(ma)) { r.mlH = amOdd(mh); r.mlA = amOdd(ma); } }
    return (r.total !== undefined || r.spread !== undefined || r.mlH !== undefined) ? r : null;
  }
  const numE = v => { if (v && typeof v === 'object') v = v.value !== undefined ? v.value : v.displayValue; const n = parseInt(v, 10); return isFinite(n) ? n : null; };
  const RARO = /all.?star|pro bowl|skills|4 nations|face-?off|exhibition|rising|celebrity/i;
  // devuelve la lista de juegos de un marcador de ESPN; si se pasa 'teams', se llena con nombre, abreviatura y escudo
  function parseEventos(j, dep, teams) {
    const out = [];
    ((j && j.events) || []).forEach(function (e) {
      const c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return;
      let h = null, a = null; c.competitors.forEach(function (x) { if (x.homeAway === 'home') h = x; else if (x.homeAway === 'away') a = x; });
      if (!h || !a || !h.team || !a.team) return;
      const st = (e.status && e.status.type) || (c.status && c.status.type) || {};
      const ts = Date.parse(e.date); if (!isFinite(ts)) return;
      const hs = numE(h.score), as = numE(a.score), ty = parseInt(e.season && e.season.type, 10) || 2;
      const raro = RARO.test((e.name || '') + ' ' + (e.shortName || '') + ' ' + ((e.season && e.season.slug) || ''));
      const det = String(st.shortDetail || st.detail || '');
      if (teams) [h, a].forEach(function (x) { teams[x.team.id] = { n: x.team.displayName || x.team.name, ab: x.team.abbreviation || '', logo: x.team.logo || '' }; });
      const g = { id: String(e.id), ts: ts, h: String(h.team.id), a: String(a.team.id), hs: hs, as: as,
        done: st.completed === true && hs !== null && as !== null, live: st.state === 'in', detail: det,
        ty: ty, skip: raro || ty === 1 || ty >= 4, pre: ty === 1, neutral: c.neutralSite === true, odds: parseOdds(c), wk: e.week && e.week.number != null ? +e.week.number : null };
      g.so = dep === 'nhl' && /\bSO\b/.test(det); g.ot = /OT/.test(det) && !g.so;
      g.indoor = !!(c.venue && c.venue.indoor);
      if (dep === 'nhl') {
        const gk = x => { const p = (x.probables || []).find(q => /goalie/i.test(q.name || '')); return p && p.athlete ? (p.athlete.displayName || p.athlete.fullName) : null; };
        g.gkH = gk(h); g.gkA = gk(a);
      }
      out.push(g);
    });
    return out;
  }
  // fila del archivo [id,ts,local,visita,golesL,golesV,tipo,banderas,semana] -> juego
  function unpack(r) { return { id: String(r[0]), ts: r[1], h: String(r[2]), a: String(r[3]), hs: r[4], as: r[5], ty: r[6], done: true, so: !!(r[7] & 1), ot: !!(r[7] & 2), neutral: !!(r[7] & 4), indoor: !!(r[7] & 8), wk: r[8] || null }; }
  // resultado de un pick guardado: 'ganado' | 'perdido' | 'push'
  function resolverPick(dep, p, g) {
    const mar = g.hs - g.as, tot = g.hs + g.as - (dep === 'nhl' && g.so ? 1 : 0); let v;
    if (p.mercado === 'ML') v = mar === 0 ? 0 : (p.side === 'H' ? (mar > 0 ? 1 : -1) : (mar < 0 ? 1 : -1));
    else if (p.mercado === 'SPR') { const x = mar + p.linea; v = p.side === 'H' ? (x > 1e-9 ? 1 : (x < -1e-9 ? -1 : 0)) : (x < -1e-9 ? 1 : (x > 1e-9 ? -1 : 0)); }
    else { const x = tot - p.linea; v = p.side === 'O' ? (x > 1e-9 ? 1 : (x < -1e-9 ? -1 : 0)) : (x < -1e-9 ? 1 : (x > 1e-9 ? -1 : 0)); }
    return v > 0 ? 'ganado' : (v < 0 ? 'perdido' : 'push');
  }
  // misma persona en Pinnacle y en ESPN: ultima palabra del nombre ("Kings", "49ers", "Leafs")
  function nick(n) { const w = String(n || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); return w[w.length - 1] || ''; }
  // busca en el JSON de Pinnacle el juego (por equipos y hora); devuelve {fila, flip} o null
  function buscarPin(pin, nomH, nomA, ts) {
    if (!pin || !pin.juegos) return null; const kh = nick(nomH), ka = nick(nomA); let hit = null;
    pin.juegos.forEach(x => { if (hit || Math.abs(Date.parse(x.t) - ts) > 20 * 3600e3) return; const a = nick(x.n[0]), b = nick(x.n[1]); if (a === kh && b === ka) hit = { fila: x, flip: false }; else if (a === ka && b === kh) hit = { fila: x, flip: true }; });
    return hit;
  }
  Object.assign(API, { parseOdds, parseEventos, unpack, resolverPick, nick, buscarPin, amNum, amOdd });

  /* =====================================================================
     A partir de aquí todo necesita la pantalla (no corre en las pruebas)
     ===================================================================== */
  if (typeof document === 'undefined' || !document.getElementById || !document.getElementById('estado')) return;

  const DEP = document.documentElement.getAttribute('data-app');
  const M = DEP === 'nfl' ? window.OVA_NFL : window.OVA_NHL;
  const SP = {
    nfl: { nombre: 'NFL', emo: '🏈', u: 'puntos', uc: 'pts', espn: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/', minPas: 200, minCal: 200, minAct: 60, dec: 1,
      etq: ['menos de 60%', '60–70%', '70–80%', '80% o más'], stepTot: 2, jugadas: 'partidos', LAM_M: 0.05, LAM_T: 0.05, ESC_SIG: 0.96, tipLinea: '-3.5', tipTot: '44.5', tipMed: 'puntos', diasMax: 9 },
    nhl: { nombre: 'NHL', emo: '🏒', u: 'goles', uc: 'goles', espn: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/', minPas: 800, minCal: 800, minAct: 150, dec: 2,
      etq: ['menos de 55%', '55–62%', '62–70%', '70% o más'], stepTot: 0.5, jugadas: 'partidos', LAM_M: 0.05, LAM_T: 0.5, ESC_SIG: 1, tipLinea: '-1.5', tipTot: '6.5', tipMed: 'goles', diasMax: 9 }
  }[DEP];
  const K = { params: 'ova_' + DEP + '_params_v1', ver: 'ova_' + DEP + '_ver_v1', reg: 'ova_' + DEP + '_registro_v1', hist: 'ova_' + DEP + '_hist_v2' };
  const { PDEF, seasonOf, dayKey, correr, predecir, evaluar, dif, verdTxt, gridMargen, gridTotal, pendiente, zRecomendado } = M;
  const LAM_M = SP.LAM_M, LAM_T = SP.LAM_T, ESC_SIG = SP.ESC_SIG;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const $ = id => document.getElementById(id);
  const ymd = d => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const parOk = p => p && ['kM', 'kT', 'carry', 'H'].every(k => isFinite(p[k]));
  let PARAMS = (function () { const p = LS.get(K.params); if (parOk(p)) return Object.assign({}, PDEF, p, { calibrado: true }); return Object.assign({}, PDEF, { calibrado: false }); })();
  let TEAMS = {}, GAMES = [], PEND = [], ESTADO = null, DIA = null, INJ = null, KW = null;
  const DIAG = { errores: [], fuente: '', gen: '', topUp: 0 };

  const pct1 = x => (x * 100).toFixed(1) + '%';
  const fmtL = x => x === 0 ? 'PK' : (x > 0 ? '+' + x : '' + x);
  const fx = (x, d) => (x >= 0 ? '+' : '') + x.toFixed(d === undefined ? SP.dec : d);
  function setEstado(t, c) { const e = $('estado'); e.className = 'estado' + (c ? ' ' + c : ''); e.textContent = t; }

  /* ---------- ESPN ---------- */
  async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  async function pool(tareas, n) {
    const out = new Array(tareas.length); let i = 0;
    async function w() { while (i < tareas.length) { const k = i++; try { out[k] = await tareas[k](); } catch (e) { out[k] = []; } } }
    await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, w));
    return out;
  }
  const evs = j => parseEventos(j, DEP, TEAMS);
  const logoDe = ab => SP.logo + String(ab || '').toLowerCase() + '.png';
  // fecha de ESPN (calendario del este de EE. UU.): se corre 10 h para que los juegos de la noche cuenten en su día
  function ymdUTC(ts) { const d = new Date(ts - 10 * 3600e3); return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()); }
  async function bajarDia(ds) {
    try { return evs(await getJSON(SP.espn + 'scoreboard?dates=' + ds + '&limit=300')); }
    catch (e) { DIAG.errores.push(ds + ': ' + e.message); return []; }
  }
  /* 1) archivo diario que escribe GitHub (rápido, chico)  2) los últimos días directo de ESPN  3) si no hay archivo: ESPN completo (lento) */
  async function cargarPartidos(prog) {
    const mapa = new Map(); let h = null;
    try { h = await getJSON('hist-' + DEP + '.json?v=' + Math.floor(Date.now() / 3.6e6)); DIAG.fuente = 'archivo del día'; LS.set(K.hist, h); }
    catch (e) { h = LS.get(K.hist); DIAG.fuente = h ? 'copia guardada en el teléfono' : 'ESPN directo'; if (!h) DIAG.errores.push('archivo: ' + e.message); }
    if (h && h.g) {
      DIAG.gen = h.generado || '';
      Object.keys(h.teams || {}).forEach(id => { const t = h.teams[id]; TEAMS[id] = { n: t[0], ab: t[1], logo: logoDe(t[1]) }; });
      h.g.forEach(r => { const g = unpack(r); mapa.set(g.id, g); });
    }
    const hoy = Date.now(); let ult = 0; mapa.forEach(g => { if (g.ts > ult) ult = g.ts; });
    let desde = ult ? ult - 3 * 864e5 : null;
    if (!desde) {   // sin archivo: dos temporadas completas directo de ESPN
      prog('Sin archivo guardado: bajando de ESPN (solo la primera vez)…');
      const cur = seasonOf(hoy); const sks = [cur - 1, cur];
      if (DEP === 'nfl') {
        const tareas = []; sks.forEach(sk => { for (let w = 1; w <= 18; w++) tareas.push([sk, 2, w]); for (let w = 1; w <= 5; w++) tareas.push([sk, 3, w]); });
        const res = await pool(tareas.map(([sk, t, w]) => () => getJSON(SP.espn + 'scoreboard?dates=' + sk + '&seasontype=' + t + '&week=' + w + '&limit=100').then(evs)), 6);
        [].concat(...res).forEach(g => { if (g.done && !g.skip) mapa.set(g.id, g); });
      } else {
        desde = Date.UTC(cur - 1, 9, 1);
      }
      if (DEP === 'nfl') desde = hoy - 20 * 864e5;
    }
    if (desde) {
      if (hoy - desde > 400 * 864e5) desde = hoy - 400 * 864e5;
      const dias = []; for (let t = desde; t <= hoy; t += 864e5) dias.push(ymdUTC(t));
      const uni = [...new Set(dias)]; DIAG.topUp = uni.length; let hechos = 0;
      const res = await pool(uni.map(ds => async () => { const r = await bajarDia(ds); hechos++; if (uni.length > 15) prog('ESPN: ' + hechos + ' de ' + uni.length + ' días…'); return r; }), 6);
      [].concat(...res).forEach(g => { if (g.done && !g.skip) mapa.set(g.id, g); });
    }
    return [...mapa.values()].filter(g => g.done && !g.skip && g.ty !== 1).sort((a, b) => a.ts - b.ts);
  }
  /* ESPN quita las cuotas del marcador cuando el juego empieza. Se rellenan con la linea de antes del juego:
     1) la que este telefono vio cuando el juego aun no empezaba (localStorage)  2) la que guarda el robot (rama datos, odds-<dep>.json). */
  async function rellenarOdds() {
    try {
      const K = 'ova_odds_' + DEP, ahora = Date.now(); let mem = LS.get(K) || {}; let cambio = false;
      Object.keys(mem).forEach(id => { if (!mem[id] || !(mem[id].t > ahora - 3 * 864e5)) { delete mem[id]; cambio = true; } });
      PEND.forEach(g => { if (g.odds && !g.live && g.ts > ahora) { mem[g.id] = { t: g.ts, o: g.odds }; cambio = true; } });
      let snap = null;
      const faltan = PEND.filter(g => !g.odds && !mem[g.id]);
      if (faltan.length) {
        try { snap = await getJSON('https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/datos/odds-' + DEP + '.json?v=' + Math.floor(ahora / 36e5)); } catch (e) { snap = null; }
      }
      PEND.forEach(g => {
        if (g.odds) return;
        let o = mem[g.id] && mem[g.id].o;
        if (!o && snap && snap.juegos && snap.juegos[g.id]) o = parseOdds({ odds: [snap.juegos[g.id].o] });
        if (o) { g.odds = o; g.oddsViejo = true; }
      });
      if (cambio) LS.set(K, mem);
    } catch (e) { }
  }
  /* ---------- mercado de predicción (Polymarket): precio gratis y EN VIVO ---------- */
  const vivoJ = g => !!g.live || (g.ts < Date.now() && !g.done);
  let PRED = null;
  async function rellenarPred() {
    try {
      if (!window.OVAPred) return;
      PRED = await window.OVAPred.cargar(DEP);
      aplicarPred();
    } catch (e) { }
  }
  function aplicarPred() {
    if (!PRED || !window.OVAPred) return;
    PEND.forEach(g => { const h = T(g.h), a = T(g.a); const p = window.OVAPred.buscar(PRED, h.n, a.n, g.ts); g.pred = p && !(p.edad !== null && p.edad > (vivoJ(g) ? 40 : 240) * 60000) ? p : null; });
  }
  async function cargarProximos() {
    const hoy = new Date(), dias = [];
    for (let k = 0; k <= SP.diasMax; k++) dias.push(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k));
    const arr = await pool(dias.map(d => () => bajarDia(ymd(d))), 5);
    const vistos = new Set(); PEND = [];
    [].concat(...arr).forEach(g => { if (vistos.has(g.id) || g.done || (g.skip && !g.pre)) return; vistos.add(g.id); PEND.push(g); });
    PEND.sort((a, b) => a.ts - b.ts);
    await rellenarOdds();
    await rellenarPred();
  }
  // lesionados: archivo grande (hockey ~1.4 MB, NFL ~9 MB). Solo se baja cuando lo pides.
  function lesiones() {
    if (INJ) return INJ;
    INJ = getJSON(SP.espn + 'injuries').then(j => {
      const m = {};
      (j.injuries || []).forEach(t => {
        const l = (t.injuries || []).map(x => ({ n: x.athlete && (x.athlete.displayName || x.athlete.fullName), s: x.status || (x.type && x.type.description) || '' })).filter(x => x.n);
        m[String(t.id)] = l; m[(t.displayName || '').toLowerCase()] = l;
      });
      return m;
    }).catch(e => { INJ = null; throw e; });
    return INJ;
  }

  /* ---------- estado del modelo ---------- */
  function recalc() {
    ESTADO = correr(GAMES, PARAMS);
    if (DEP === 'nfl') { try { const k = M.pesosClave(GAMES, PARAMS); KW = k.ok ? k.W : null; } catch (e) { KW = null; } }
  }
  function ultimoDia(id, ts) {
    let d = ESTADO.last[id];
    PEND.forEach(g => { if (g.ts < ts && (g.h === id || g.a === id)) { const k = dayKey(g.ts); if (d === undefined || k > d) d = k; } });
    return d;
  }
  function diasDesde(id, ts) { const d = ultimoDia(id, ts); return d === undefined ? null : dayKey(ts) - d; }
  const T = id => TEAMS[id] || { n: '?', ab: '?', logo: '' };

  /* ---------- mercado de Pinnacle (sin margen) ---------- */
  let PIN = null;
  try { fetch('pinnacle-' + DEP + '.json?v=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => { if (j && j.juegos) PIN = j; }).catch(() => { }); } catch (e) { }
  function pinDe(g) {
    const hit = buscarPin(PIN, T(g.h).n, T(g.a).n, g.ts); if (!hit) return null;
    const x = hit.fila, f = hit.flip; const o = { ml: x.ml ? (f ? [x.ml[1], x.ml[0]] : x.ml) : null };
    if (x.r60) o.r60 = f ? [x.r60[2], x.r60[1], x.r60[0]] : x.r60;
    if (x.sp) o.sp = { l: f ? -x.sp.l : x.sp.l, p: f ? [x.sp.p[1], x.sp.p[0]] : x.sp.p };
    if (x.tot) o.tot = { l: x.tot.l, p: x.tot.p };
    return o;
  }
  const pinPH = g => { const o = pinDe(g); return o && o.ml ? o.ml[0] : null; };
  // probabilidad de que gane el local según el mercado, sin margen: Pinnacle si hay precio; si no, el moneyline de ESPN
  function mkPk(g) {
    // en vivo el precio de antes del juego (Pinnacle / ESPN) ya no vale: manda el del mercado de predicción
    if (vivoJ(g) && g.pred && !g.pred.fin) return { p: g.pred.pH, src: 'pred', live: true };
    const p = pinPH(g); if (p !== null) return { p: p, src: 'pin' };
    const o = g.odds; if (o && o.mlH && o.mlA) { const a = impProb(o.mlH), b = impProb(o.mlA); return { p: a / (a + b), src: 'espn' }; }
    if (g.pred) return { p: g.pred.pH, src: 'pred' };
    return null;
  }
  function pmDeProbN(p, s) { let lo = -40, hi = 40; for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (M.pML(mid, s) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; }

  /* Peso del modelo cuando hay mercado: el backtest (docs/MEDICION-NHL-NFL-2026-10.md) mostró que la línea acierta más que el modelo en ganador y margen. */
  function prediccion(g) {
    const gH = diasDesde(g.h, g.ts), gA = diasDesde(g.a, g.ts);
    const base = { h: g.h, a: g.a, ts: g.ts, neutral: g.neutral, adjH: 0, adjA: 0 };
    const o = g.odds, adj = (g.adjH || 0) - (g.adjA || 0), mk = mkPk(g);
    let pr;
    if (DEP === 'nfl') {
      pr = predecir(ESTADO, PARAMS, base, { gH: gH, gA: gA });
      pr.pmMod = pr.pm; pr.ptMod = pr.pt; pr.pHMod = pr.pH; pr.conLinea = false; pr.conML = false; pr.gH = gH; pr.gA = gA;
      const sM0 = pr.sM, pm0 = pr.pm;
      if (o && o.spread !== undefined && isFinite(o.spread)) { pr.pm = -o.spread + LAM_M * (pm0 + o.spread); pr.sM = sM0 * ESC_SIG; pr.conLinea = true; }
      else if (mk) { const pmM = pmDeProbN(mk.p, sM0); pr.pm = pmM + LAM_M * (pm0 - pmM); pr.sM = sM0 * ESC_SIG; pr.conLinea = true; }
      const tot = o && o.total !== undefined && isFinite(o.total) ? o.total : (PIN && pinDe(g) && pinDe(g).tot ? pinDe(g).tot.l : null);
      if (tot !== null) { pr.pt = tot + LAM_T * (pr.pt - tot); pr.sT = pr.sT * ESC_SIG; }
      let zb = logitP(clampP(M.pML(pr.pm, pr.sM))); const pmB = pr.pm;
      if (mk) { zb = logitP(mk.p) + LAM_M * (logitP(clampP(pr.pHMod)) - logitP(mk.p)); pr.conML = true; }
      pr.pm = pmB + adj;
      const dz = adj ? (logitP(clampP(M.pML(pr.pm, pr.sM))) - logitP(clampP(M.pML(pmB, pr.sM)))) : 0;
      pr.pH = sigP(zb + dz);
      pr.cover = Lh => M.pCoverK(pr.pm, pr.sM, Lh, KW);
      pr.over = Lt => M.pCover(pr.pt, pr.sT, Lt);
    } else {
      pr = predecir(ESTADO, PARAMS, base, { dH: ultimoDia(g.h, g.ts), dA: ultimoDia(g.a, g.ts) });
      pr.pmMod = pr.pm; pr.ptMod = pr.pt; pr.pHMod = pr.pH; pr.conLinea = false; pr.conML = false; pr.gH = gH; pr.gA = gA;
      let pm = pr.pm, pt = pr.pt; const pm0 = pm;
      const tot = o && o.total !== undefined && isFinite(o.total) ? o.total : (PIN && pinDe(g) && pinDe(g).tot ? pinDe(g).tot.l : null);
      if (tot !== null) { pt = tot + LAM_T * (pt - tot); }
      if (mk) { const pmM = M.pmDeProb(mk.p, pt, PARAMS); pm = pmM + LAM_M * (pm0 - pmM); pr.conML = true; pr.conLinea = true; }
      pm += adj;
      pr.pm = pm; pr.pt = pt; pr.D = M.dist(pm, pt, PARAMS); pr.pH = pr.D.pH;
      pr.cover = Lh => M.pCoverM(pr.D, Lh); pr.over = Lt => M.pOver(pr.D, Lt);
    }
    pr.mk = mk;
    if (mk && mk.live) { pr.pH = mk.p; pr.conML = true; }       // en vivo: el modelo no sabe del marcador, manda el precio
    return pr;
  }

  /* ---------- fechas ---------- */
  function localDay(ts) { const d = new Date(ts); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function etiquetaDia(ts) {
    const d = new Date(ts), h = new Date();
    const a = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime(), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const df = Math.round((b - a) / 864e5);
    if (df === 0) return 'Hoy'; if (df === 1) return 'Mañana'; if (df === -1) return 'Ayer';
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()];
  }
  const horaTxt = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function hace(ts) { const n = Math.floor((Date.now() - ts) / 864e5); return n <= 0 ? 'hoy' : (n < 45 ? 'hace ' + n + ' d' : new Date(ts).getDate() + '/' + (new Date(ts).getMonth() + 1)); }

  /* ---------- lista de juegos ---------- */
  function pintarSelector() {
    const cont = $('diaSel'), dias = [];
    PEND.forEach(g => { const k = localDay(g.ts); if (dias.indexOf(k) < 0) dias.push(k); });
    if (!dias.length) { cont.innerHTML = ''; DIA = 'TODOS'; return; }
    if (DIA === null || (DIA !== 'TODOS' && dias.indexOf(DIA) < 0)) DIA = dias[0];
    const btns = dias.map(k => ({ v: k, l: etiquetaDia(PEND.find(g => localDay(g.ts) === k).ts) })); btns.push({ v: 'TODOS', l: 'Todos' });
    cont.innerHTML = btns.map(b => `<button class="diaBtn${b.v === DIA ? ' on' : ''}" data-v="${b.v}">${esc(b.l)}</button>`).join('');
    cont.querySelectorAll('.diaBtn').forEach(b => b.onclick = () => { DIA = b.dataset.v === 'TODOS' ? 'TODOS' : +b.dataset.v; pintarSelector(); pintarJuegos(); });
  }
  const ICO_BALON = DEP === 'nhl' ? '<ellipse cx="12" cy="13" rx="8" ry="3.4"/><path d="M4 13v3.2c0 1.9 3.6 3.4 8 3.4s8-1.5 8-3.4V13"/><path d="M4 13V9.8C4 7.9 7.6 6.4 12 6.4s8 1.5 8 3.4V13"/>' : '<ellipse cx="12" cy="12" rx="9" ry="5.6" transform="rotate(-35 12 12)"/><path d="M8.2 15.8l7.6-7.6M10.4 13.6l1.2 1.2M12.2 11.8l1.2 1.2M8.6 9.6l5.8 5.8"/>';
  function vacioHtml(tit, txt) { return `<div class="vacio"><div class="vico"><span class="anillo"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICO_BALON}</svg></div><b>${tit}</b>${txt}</div>`; }
  function listaActual() { return DIA === 'TODOS' || DIA === null ? PEND : PEND.filter(g => localDay(g.ts) === DIA); }
  function probFav(g, pr) { const pk = pr.mk ? pr.mk.p : null; return pk !== null ? pk : pr.pH; }
  function pintarAlGane() {
    const cont = $('algane'), lista = listaActual();
    if (!lista.length || !ESTADO) { cont.innerHTML = vacioHtml('Sin ranking todavía', 'Aparece en cuanto haya juegos en el día elegido.'); return; }
    const filas = lista.map(g => {
      const pr = prediccion(g), pS = probFav(g, pr), favH = pS >= 0.5, f = T(favH ? g.h : g.a), r = T(favH ? g.a : g.h);
      return { f: f, r: r, loc: favH, p: Math.max(pS, 1 - pS), m: Math.abs(pr.pm), ts: g.ts, pre: g.pre, mk: !!pr.mk };
    }).sort((a, b) => b.p - a.p);
    try { if (window.OVARegAuto) { OVARegAuto.registrar(DEP, PEND.map(g => { const pr = prediccion(g); return { ts: g.ts, local: T(g.h).n, visita: T(g.a).n, p: { L: pr.pH, A: 1 - pr.pH }, k: (function () { const m = mkPk(g); return (m && !m.live && (m.src === 'pin' || m.src === 'espn')) ? { L: m.p, A: 1 - m.p, src: m.src } : null; })(), liga: SP.nombre + (g.pre ? ' pretemporada' : ''), ext: g.id }; })); } } catch (e) { }
    try { if (window.OVAHoy) window.OVAHoy.publicar(DEP, filas.slice(0, 10).map(x => ({ n: x.f.n + (x.loc ? ' vs ' : ' @ ') + x.r.n, p: x.p * 100, sub: etiquetaDia(x.ts) + ' · ' + horaTxt(x.ts) + (x.pre ? ' · pretemporada' : '') }))); } catch (e) { }
    cont.innerHTML = filas.map((x, i) => `<div class="fila-rank"><div class="pos">${i + 1}</div><img src="${esc(x.f.logo)}" alt="" onerror="this.style.display='none'"><div class="nom">${esc(x.f.n)} ${x.loc ? 'vs' : '@'} ${esc(x.r.n)}<small>${esc(etiquetaDia(x.ts))} · ${horaTxt(x.ts)} · margen esperado ${x.m.toFixed(SP.dec)}${x.mk ? ' · precio del mercado' : ''}${x.pre ? ' · pretemporada' : ''}</small></div><div class="pct">${pct1(x.p)}</div></div>`).join('');
  }
  function pintarJuegos() {
    pintarAlGane();
    const cont = $('juegos'), lista = listaActual();
    if (!lista.length) {
      cont.innerHTML = vacioHtml('Sin partidos todavía', DEP === 'nfl' ? 'No hay juegos en los próximos 10 días (la temporada regular va de septiembre a enero). Ajustes → Avanzado → Ratings muestra los equipos con lo que se sabe de la temporada.' : 'No hay juegos en los próximos 10 días (la temporada regular va de octubre a abril). Ajustes → Avanzado → Ratings muestra los equipos con lo que se sabe de la temporada.');
      return;
    }
    let html = '', prev = null;
    lista.forEach((g, i) => {
      const k = localDay(g.ts);
      if (k !== prev) { html += `<div class="diaHead">${esc(etiquetaDia(g.ts))}${DEP === 'nfl' && g.wk ? ' · semana ' + g.wk : ''}</div>`; prev = k; }
      const H = T(g.h), A = T(g.a);
      const hora = g.live ? `<div class="hora" style="color:var(--bad)">🔴 ${g.as}–${g.hs}<br><small style="font-size:9px">${esc(g.detail)}</small></div>` : `<div class="hora">${horaTxt(g.ts)}</div>`;
      html += `<div class="game" data-i="${i}" data-id="${g.id}" data-h="${g.h}" data-a="${g.a}" data-ab-a="${esc(A.ab)}" data-ab-h="${esc(H.ab)}"><div class="head"><div class="crestpair">
        <div class="eq"><img src="${esc(A.logo)}" alt="" onerror="this.style.display='none'"><span class="n">${esc(A.n)}</span></div>
        <div class="eq"><img src="${esc(H.logo)}" alt="" onerror="this.style.display='none'"><span class="n">${esc(H.n)}</span><span class="tag">${g.neutral ? 'NEUTRAL' : 'LOCAL'}</span></div>
        </div>${hora}<div class="chev">▾</div></div><div class="body"></div></div>`;
    });
    cont.innerHTML = html;
    cont.querySelectorAll('.game').forEach(el => {
      el.querySelector('.head').onclick = () => {
        const ab = el.classList.contains('open');
        cont.querySelectorAll('.game.open').forEach(x => x.classList.remove('open'));
        if (ab) return;
        el.classList.add('open');
        const body = el.querySelector('.body');
        if (!body.dataset.p) { pintarCuerpo(body, lista[+el.dataset.i]); body.dataset.p = '1'; }
      };
    });
  }
  function ringSvg(pA, pH) {
    const g = 1.4, d = 'M 50 8 A 42 42 0 1 1 49.99 8';
    const seg = (p, cls, ini) => `<path class="sg ${cls}" d="${d}" pathLength="100" style="stroke-dasharray:${Math.max(0.1, p * 100 - g).toFixed(2)} 100;stroke-dashoffset:-${(ini * 100 + g / 2).toFixed(2)}"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="${d}" pathLength="100"/>${seg(pA, 'aw', 0)}${seg(pH, 'fv', pA)}</svg>`;
  }
  function confTxt(k) {
    const v = LS.get(K.ver);
    const nom = { win: 'Ganador', mar: DEP === 'nfl' ? 'Margen/hándicap' : 'Línea de gol', tot: 'Total' }[k];
    if (!v || !v[k]) return `<div class="nota" style="margin:0 0 8px">${nom}: <b>sin medir</b>. Ve a Backtest → Medir temporada pasada.</div>`;
    const t = verdTxt(v[k], v[k].minD);
    const ex = t.t === '✓ le gana' ? 'le gana al promedio de la liga con diferencia clara (eso NO es ganarle a la línea del mercado).' : (t.t === '≈ igual' ? 'no se distingue de predecir el promedio; usa el "valor" solo de referencia.' : 'salió peor que el promedio de la liga; ignora el "valor".');
    return `<div class="nota" style="margin:0 0 8px">${nom} en el backtest: <b style="color:${t.c}">${t.t}</b> — ${ex}</div>`;
  }
  function confiable(k) { const v = LS.get(K.ver); return v && v[k] ? verdTxt(v[k], v[k].minD).t === '✓ le gana' : null; }

  function pinTxt() { if (!PIN) return ''; const min = Math.max(0, Math.round((Date.now() - Date.parse(PIN.generado)) / 60000)); return min < 90 ? min + ' min' : Math.round(min / 60) + ' h'; }
  function pinNba(g, pr) {
    const pin = pinDe(g); if (!pin || !pin.ml) return '';
    const H = T(g.h), A = T(g.a), pH = pin.ml[0], pA = 1 - pH, mod = pr.pHMod;
    const fila = (t, p, m) => `<div class="linea"><span>${esc(t)}</span><b>${pct1(p)} · ${amTxt(p)} <span style="color:var(--mut2);font-weight:500;font-size:11.5px">modelo ${pct1(m)} (${(m - p) * 100 >= 0 ? '+' : ''}${((m - p) * 100).toFixed(1)})</span></b></div>`;
    let ex = '';
    if (DEP === 'nhl' && pin.r60) ex = `<div class="linea"><span>A los 60 minutos (sin tiempo extra)</span><b>${esc(H.ab)} ${pct1(pin.r60[0])} · empate ${pct1(pin.r60[1])} · ${esc(A.ab)} ${pct1(pin.r60[2])}</b></div>`;
    return `<h3>Lo que dice Pinnacle</h3><div class="lineas">${fila(A.n + ' gana', pA, 1 - mod)}${fila(H.n + ' gana', pH, mod)}${ex}</div>
     <div class="nota">Probabilidad de Pinnacle ya sin su margen y la cuota justa que le corresponde (actualizado hace ${pinTxt()}). Una cuota solo tiene valor si paga <b>más</b> que esa cuota justa. El mercado es la mejor estimación; el modelo queda de referencia.</div>`;
  }

  function descansoTxt(g, pr, H, A) {
    if (DEP === 'nhl') {
      const li = [];
      li.push(pr.bH || pr.bA ? ['ok', 'Back-to-back: ' + [pr.bA ? A.n : '', pr.bH ? H.n : ''].filter(Boolean).map(esc).join(' y ') + ' jugó ayer (ya descontado).'] : ['ok', 'Sin back-to-back.']);
      if (g.gkA || g.gkH) li.push(['ok', 'Porteros probables · ' + esc(A.ab) + ': ' + esc(g.gkA || 'sin confirmar') + ' · ' + esc(H.ab) + ': ' + esc(g.gkH || 'sin confirmar') + '. El mercado ya lo sabe; el modelo no.']);
      else li.push(['w', 'Porteros sin confirmar todavía (el portero abridor mueve mucho la línea en hockey).']);
      return li;
    }
    const li = [];
    const d = (Tm, gap, r) => gap === null ? '' : (r < 0 ? esc(Tm.ab) + ' juega con ' + gap + ' días de descanso (semana corta, descontado).' : (r > 0 ? esc(Tm.ab) + ' viene de semana libre (' + gap + ' días, ventaja incluida).' : ''));
    const a = d(A, pr.gA, pr.rA), h = d(H, pr.gH, pr.rH);
    if (a || h) li.push(['ok', [a, h].filter(Boolean).join(' ')]); else li.push(['ok', 'Descanso normal para los dos.']);
    if (g.neutral) li.push(['w', 'Cancha neutral: el modelo no le da ventaja de local a nadie.']);
    if (g.indoor) li.push(['ok', 'Techo cerrado: el viento y el frío no pesan.']);
    return li;
  }
  function resumenN(g, pr, H, A) {
    const favH = pr.pH >= 0.5, mk = pr.mk, hit = mk ? mk.p : null;
    const pH = (hit !== null) ? hit : pr.pH, favM = pH >= 0.5, pf = Math.max(pH, 1 - pH), nf = favM ? H.n : A.n;
    const gap = (hit !== null) ? Math.abs(pr.pHMod - hit) * 100 : null, pmNf = favM ? pr.pHMod : 1 - pr.pHMod, pctNf = ' en ' + esc(nf) + ' (modelo solo ' + Math.round(pmNf * 100) + '%, mercado ' + Math.round(pf * 100) + '%)';
    const favMod = pr.pHMod >= 0.5;
    const sig = mk && mk.live ? '<span class="rvSig mid">● En vivo: el precio ya incluye el marcador, por eso no se compara con el modelo de antes del juego</span>' : hit === null ? '<span class="rvSig mid">! Sin precio del mercado para este juego: pronóstico solo del modelo</span>' :
      (gap <= 3 && favMod === favM ? '<span class="rvSig ok">✓ Modelo y mercado coinciden</span>' :
        (gap <= 7 && favMod === favM ? `<span class="rvSig mid">≈ Diferencia de ${gap.toFixed(0)} pts de probabilidad${pctNf} · confía más en el mercado</span>` :
          `<span class="rvSig bad">✗ Discrepan ${gap.toFixed(0)} pts de probabilidad${pctNf} · créele al mercado</span>`)) +
      (favMod !== favM ? `<div class="rvP" style="margin-top:7px">Modelo solo: <b>${esc(favMod ? H.n : A.n)}</b> (${Math.round((favMod ? pr.pHMod : 1 - pr.pHMod) * 100)}%). Mercado: <b>${esc(nf)}</b> (${Math.round(pf * 100)}%).</div>` : '');
    const umbral = DEP === 'nhl' ? 0.55 : 0.6;
    let acH = ''; try { if (window.OVAAciertos && !(mk && mk.live)) acH = window.OVAAciertos.html(DEP, pf, favM, hit !== null); } catch (e) { }   /* cuántas veces acierta este % (aciertos.js) */
    const fuente = mk ? (mk.src === 'pin' ? 'Pinnacle, sin margen' : (mk.src === 'pred' ? 'mercado de predicción (Polymarket)' + (mk.live ? ', en vivo' : '') : 'ESPN (DraftKings), sin margen')) : '';
    const main = `<div class="rvMain"><div class="rvT">Pronóstico</div><div class="rvH">${pf >= umbral ? esc(nf) + ' gana · ' + Math.round(pf * 100) + '%' : 'Juego parejo'}</div>
     <div class="rvP">${pf >= umbral ? 'Es el favorito' + (hit !== null ? ' según el mercado (' + fuente + ').' : ' según el modelo.') : 'Ninguno pasa del ' + Math.round(umbral * 100) + '%. Lo más probable: ' + esc(nf) + ' ' + Math.round(pf * 100) + '%.'}${DEP === 'nhl' ? ' Incluye tiempo extra y shootout.' : ''}</div>${sig}${acH}
     <div class="rvP" style="margin-top:9px"><b>¿Hay pick?</b> Solo si te pagan más de <b>${amTxt(pf)}</b> por ${esc(nf)}${hit !== null ? '' : ' (cuota del modelo, menos confiable)'}. Escribe la que te dan:</div><div class="rvIn"><label>Cuota que te pagan por ${esc(nf)}</label><input type="number" inputmode="decimal" data-vl="o" placeholder="-150 ó 55¢" data-p="${pf}" data-m="${hit !== null ? 1 : 0}"><div class="rvVal" data-vl="r"></div></div></div>`;
    const row = (n, m, k) => `<div class="nm">${esc(n)} gana</div><div class="n md">${pct1(m)}</div><div class="n mk">${k === null ? '—' : pct1(k)}</div><div class="n">${amTxt(k === null ? m : k)}</div>`;
    const tab = `<div class="rvTab"><div class="th">Resultado</div><div class="th n">Modelo</div><div class="th n">Mercado</div><div class="th n">Cuota justa</div>${row(A.n, 1 - pr.pHMod, hit === null ? null : 1 - hit)}${row(H.n, pr.pHMod, hit)}</div>
     <div class="nota" style="margin-top:6px">Mercado = ${mk ? fuente : 'sin precio todavía'}.</div>`;
    const L = (c, t) => `<div><i class="${c}">${c === 'ok' ? '✓' : (c === 'w' ? '!' : '✗')}</i><span>${t}</span></div>`;
    const li = [];
    if (mk && mk.live) li.push(L('ok', `Precio EN VIVO del mercado de predicción (Polymarket): ${esc(A.ab)} ${pct1(1 - mk.p)} · ${esc(H.ab)} ${pct1(mk.p)}. Se actualiza cada pocos minutos.${window.OVAPred && window.OVAPred.fino(g.pred) ? ' Ojo: hay poco dinero en este mercado.' : ''}`));
    else if (mk && mk.src === 'pin') li.push(L('ok', `Precio de Pinnacle de hace ${pinTxt()}.`));
    else if (mk && mk.src === 'pred') li.push(L('ok', 'Precio del mercado de predicción (Polymarket): no hay Pinnacle ni línea de ESPN para este juego.' + (window.OVAPred && window.OVAPred.fino(g.pred) ? ' Ojo: hay poco dinero en este mercado.' : '')));
    else if (mk) li.push(L('ok', g.oddsViejo ? 'Precio de ESPN (DraftKings) de antes de que empezara el juego (ESPN lo quita en vivo); Pinnacle todavía no lo trae.' : 'Precio de ESPN (DraftKings) tomado del marcador; Pinnacle todavía no lo trae.'));
    else li.push(L('w', 'Sin precio del mercado para este juego.'));
    if (mk && !mk.live && mk.src !== 'pred' && g.pred) { const d = Math.abs(g.pred.pH - mk.p) * 100; li.push(L(d <= 3 ? 'ok' : 'w', `Mercado de predicción (Polymarket): ${esc(H.ab)} ${pct1(g.pred.pH)}${d <= 3 ? ', coincide con el precio principal.' : ' (' + d.toFixed(0) + ' pts de diferencia con el precio principal; el principal suele tener razón).'}`)); }
    descansoTxt(g, pr, H, A).forEach(x => li.push(L(x[0], x[1])));
    if (g.pre) li.push(L('w', 'Pretemporada: los equipos rotan jugadores; toma estos números con mucha cautela.'));
    li.push(`<div data-inj><i class="w">!</i><span>Lesionados: toca «Cargar lesionados» abajo (archivo grande).</span></div>`);
    return `<div class="rv"><h4>Pronóstico y pick</h4>${main}<h4>Modelo contra mercado</h4>${tab}<h4>Qué tan confiable es</h4><div class="rvLs">${li.join('')}</div></div>`;
  }

  function pintarCuerpo(body, g) {
    const pr = prediccion(g), H = T(g.h), A = T(g.a);
    const pS = pr.mk ? pr.mk.p : pr.pH;
    const favH = pS >= 0.5, pmAbs = Math.abs(pr.pm), dd = SP.dec;
    const ver = `
     <div class="hero">
      <div class="side${favH ? '' : ' fav'}"><img src="${esc(A.logo)}" alt="" onerror="this.style.display='none'"><span class="ab">${esc(A.ab)}</span><span class="pc">${pct1(1 - pS)}</span></div>
      <div class="mid"><div class="gz">${ringSvg(1 - pS, pS)}<div class="cx"><b>${esc(pr.pH >= 0.5 ? H.ab : A.ab)} −${pmAbs.toFixed(dd)}</b><small>total ${pr.pt.toFixed(1)}</small></div></div></div>
      <div class="side${favH ? ' fav' : ''}"><img src="${esc(H.logo)}" alt="" onerror="this.style.display='none'"><span class="ab">${esc(H.ab)}</span><span class="pc">${pct1(pS)}</span></div>
     </div>
     <div class="bar"><span class="a" style="flex-grow:${Math.max(1 - pS, 0.08)}">${pct1(1 - pS)}</span><span class="h" style="flex-grow:${Math.max(pS, 0.08)}">${pct1(pS)}</span></div>
     <div class="nota" style="margin:6px 0 0;text-align:center">${pr.mk ? 'Probabilidades del mercado' + (pr.mk.src === 'pin' ? ' (Pinnacle)' : (pr.mk.src === 'pred' ? (pr.mk.live ? ' (Polymarket, en vivo)' : ' (Polymarket)') : ' (ESPN)')) : 'Probabilidades del modelo (sin precio de mercado)'}${DEP === 'nhl' ? ' · incluye tiempo extra' : ''}</div>
     ${resumenN(g, pr, H, A)}
     ${(g.odds || pinDe(g)) ? mercadoHtml(g, pr, H, A) : ''}
     ${pinNba(g, pr)}
     ${g.pre ? '<div class="aviso">🧪 Pretemporada: los equipos rotan jugadores y no cuentan para los ratings; toma estos números con mucha cautela.</div>' : ''}
     <details class="comoLee"><summary>Ajuste manual por lesiones (opcional)</summary>
     <div class="nota" style="margin-top:8px">Si hay línea del mercado, <b>ya trae las lesiones incluidas</b> (${Math.round((1 - LAM_M) * 100)}% del número final): normalmente no hace falta tocar nada. Úsalo solo si falta una estrella y no hay línea, o si la noticia es de última hora.</div>
     <div class="ajuste"><div><label>${esc(A.ab)} (${SP.uc}, ej. ${DEP === 'nhl' ? '−0.3' : '−4'})</label><input type="number" step="${DEP === 'nhl' ? '0.1' : '0.5'}" data-k="adjA" value="${g.adjA || 0}"></div><div><label>${esc(H.ab)} (${SP.uc}, ej. ${DEP === 'nhl' ? '−0.3' : '−4'})</label><input type="number" step="${DEP === 'nhl' ? '0.1' : '0.5'}" data-k="adjH" value="${g.adjH || 0}"></div></div>
     <button class="btnAncho sec" data-a="adj" style="margin-top:0">Aplicar ajuste</button>
     <div class="nota">Resta ${SP.u} al equipo al que le falta el jugador (ejemplo: ${DEP === 'nhl' ? '−0.3 si falta el portero titular' : '−4 si falta el mariscal titular'}).</div></details>
     <details class="comoLee"><summary>¿Cómo se lee y qué tan confiable es?</summary><div class="nota">
      <b>Los dos porcentajes de arriba</b> son la probabilidad de que gane cada equipo${DEP === 'nhl' ? ' (con tiempo extra y shootout)' : ''}. <b>Margen esperado</b> es por cuántos ${SP.u} se espera que gane el favorito. <b>${DEP === 'nfl' ? 'Hándicap justo' : 'Línea de gol justa'}</b> y <b>Total justo</b> son las líneas que pondría el modelo: si la casa pone otra muy distinta, desconfía del modelo, no de la casa. <b>Cuota justa</b> es lo que tendría que pagar la casa para que apostar ahí no gane ni pierda a la larga: si paga más, hay valor; si paga menos, no.<br><br>
      <b>Qué tan confiable es:</b> ${DEP === 'nfl' ? 'en 1,449 juegos de 7 temporadas (2019–2025) la línea de cierre acertó mucho más que el modelo (pérdida 0.598 contra 0.642); la NFL es el deporte donde el mercado sabe más (mariscal titular, lesionados, clima).' : 'en 4,577 juegos de 4 temporadas (2022–2025) la línea de cierre acertó más que el modelo en ganador y margen; solo en el total de goles el modelo aportó algo (pesa ' + Math.round(LAM_T * 100) + '%).'} Por eso la app se apoya en la línea cuando existe. Es una referencia, no una ventaja.<br><br>
      <b>Detalles técnicos:</b> ${DEP === 'nfl' ? 'Ratings en puntos con arrastre entre temporadas' : 'Ratings en goles con arrastre entre temporadas y goles Poisson (con tiempo extra decidido casi a moneda)'} (parámetros ${PARAMS.calibrado ? 'calibrados con datos reales' : 'de arranque, sin calibrar: Backtest → Calibrar'}). ${DEP === 'nfl' ? 'Ventaja de local ' + PARAMS.H + ' pts; semana corta −' + PARAMS.Rs + ' pts; bye +' + PARAMS.Bb + ' pts. Desviación típica del margen ' + pr.sM.toFixed(1) + ' pts, del total ' + pr.sT.toFixed(1) + '.' : 'Ventaja de local ' + PARAMS.H + ' goles; back-to-back ' + PARAMS.R + '.'} ${pr.conLinea ? 'Base: la línea del mercado (el modelo pesa ' + Math.round(LAM_M * 100) + '% en el ganador' + (LAM_T !== LAM_M ? ' y ' + Math.round(LAM_T * 100) + '% en el total' : '') + '); tus ajustes de lesiones se suman encima.' : 'Sin línea todavía: aquí es el modelo solo (referencia; cuando salga la línea, ella manda).'}</div></details>`;

    g._rank = {};
    const o = g.odds || {}, pin = pinDe(g) || {};
    const lineaSp = o.spread !== undefined ? o.spread : (pin.sp ? pin.sp.l : '');
    const lineaTo = o.total !== undefined ? o.total : (pin.tot ? pin.tot.l : '');
    const cuo = `
     <div class="rankbox" data-k="rank"></div>
     <h3>Moneyline</h3>${confTxt('win')}
     <div class="cuotasbox"><div class="fila">
       <div><label>Cuota ${esc(A.ab)}</label><input type="number" data-k="mlA" value="${o.mlA || ''}" placeholder="+150"></div>
       <div><label>Cuota ${esc(H.ab)}</label><input type="number" data-k="mlH" value="${o.mlH || ''}" placeholder="-180"></div></div>
       <button class="btnAncho" data-a="ml">Calcular valor</button><div class="veredictoCuota" data-o="ml"></div></div>
     <h3>${DEP === 'nfl' ? 'Hándicap (spread)' : 'Línea de gol'}</h3>${confTxt('mar')}
     <div class="cuotasbox"><div class="fila"><div><label>Línea del local ${esc(H.ab)} (ej. ${SP.tipLinea})</label><input type="number" step="0.5" data-k="spL" value="${lineaSp}" placeholder="${SP.tipLinea}"></div></div>
       <div class="fila"><div><label>Cuota ${esc(A.ab)}</label><input type="number" data-k="spA" value="${o.spA || ''}" placeholder="-110"></div><div><label>Cuota ${esc(H.ab)}</label><input type="number" data-k="spH" value="${o.spH || ''}" placeholder="-110"></div></div>
       <button class="btnAncho" data-a="sp">Calcular valor</button><div class="veredictoCuota" data-o="sp"></div></div>
     <h3>Total de ${SP.tipMed}</h3>${confTxt('tot')}
     <div class="cuotasbox"><div class="fila"><div><label>Línea del total (ej. ${SP.tipTot})</label><input type="number" step="0.5" data-k="toL" value="${lineaTo}" placeholder="${SP.tipTot}"></div></div>
       <div class="fila"><div><label>Cuota Más</label><input type="number" data-k="toO" value="${o.toO || ''}" placeholder="-110"></div><div><label>Cuota Menos</label><input type="number" data-k="toU" value="${o.toU || ''}" placeholder="-110"></div></div>
       <button class="btnAncho" data-a="to">Calcular valor</button><div class="veredictoCuota" data-o="to"></div></div>`;

    // ---- números ----
    let esc1 = '', esc2 = '', num = '';
    if (DEP === 'nfl') {
      const base = Math.floor(-pr.pm) + 0.5;
      for (let d = -4; d <= 4; d++) { const Lh = base + d; const c = pr.cover(Lh); esc1 += `<div class="linea"><span>${esc(H.ab)} ${fmtL(Lh)}</span><b>${pct1(c.w)} · ${amTxt(c.w)}</b></div>`; }
      const bt = Math.floor(pr.pt) + 0.5;
      for (let d = -3; d <= 3; d++) { const Lt = bt + d * 2; const c = pr.over(Lt); esc2 += `<div class="linea"><span>Más de ${Lt}</span><b>${pct1(c.w)} · ${amTxt(c.w)}</b></div>`; }
      const rg = (mu, a, b) => pct1(M.pRango(mu, pr.sM, a, b));
      const dm = M.distMargen(pr.pm, pr.sM, KW), ex = k => pct1(dm[k + 45] + dm[-k + 45]);
      num = `
       <h3>Margen de victoria</h3>
       <div class="marcadores">
        <div><b>${rg(-pr.pm, 14, 99)}</b><small>${esc(A.ab)} por 14+</small></div><div><b>${rg(-pr.pm, 7, 13)}</b><small>${esc(A.ab)} por 7–13</small></div><div><b>${rg(-pr.pm, 1, 6)}</b><small>${esc(A.ab)} por 1–6</small></div>
        <div><b>${rg(pr.pm, 1, 6)}</b><small>${esc(H.ab)} por 1–6</small></div><div><b>${rg(pr.pm, 7, 13)}</b><small>${esc(H.ab)} por 7–13</small></div><div><b>${rg(pr.pm, 14, 99)}</b><small>${esc(H.ab)} por 14+</small></div>
       </div>
       <h3>Números clave (margen exacto)</h3>
       <div class="marcadores"><div><b>${ex(3)}</b><small>por 3 pts</small></div><div><b>${ex(7)}</b><small>por 7 pts</small></div><div><b>${ex(6)}</b><small>por 6 pts</small></div><div><b>${ex(10)}</b><small>por 10 pts</small></div><div><b>${ex(14)}</b><small>por 14 pts</small></div><div><b>${ex(1)}</b><small>por 1 pt</small></div></div>
       <div class="nota">En la NFL los marcadores se amontonan en 3 y 7 (los márgenes de 3 y 7 pasan casi 3 y 2 veces más de lo que una curva normal diría; medido en 2,734 juegos). Por eso 3 y 7 son los números clave del hándicap: cruzar el 3 cambia más la probabilidad que cruzar el 4.${KW ? '' : ' (Todavía no hay datos suficientes para corregir; se usa la curva normal.)'}</div>
       <h3>Escalera de hándicap (${esc(H.ab)} cubre)</h3><div class="lineas">${esc1}</div>
       <h3>Escalera de totales</h3><div class="lineas">${esc2}</div>
       <div class="nota">Cada línea: probabilidad de que el local cubra / de que el total pase, y su cuota justa. Con línea entera hay "push" (devuelven la apuesta) y aquí no se cuenta como acierto.</div>`;
    } else {
      const D = pr.D, pk = k => { let s = 0; for (let m = -M.NMAX; m <= M.NMAX; m++) { if (k >= 3 ? m >= 3 : m === k) s += D.M[m + M.NMAX]; } return s; };
      const pkA = k => { let s = 0; for (let m = -M.NMAX; m <= M.NMAX; m++) { if (k >= 3 ? m <= -3 : m === -k) s += D.M[m + M.NMAX]; } return s; };
      for (let Lh = -2.5; Lh <= 2.5; Lh += 1) { const c = pr.cover(Lh); esc1 += `<div class="linea"><span>${esc(H.ab)} ${fmtL(Lh)}</span><b>${pct1(c.w)} · ${amTxt(c.w)}</b></div>`; }
      for (let Lt = 4.5; Lt <= 7.5; Lt += 0.5) { const c = pr.over(Lt); esc2 += `<div class="linea"><span>Más de ${Lt}</span><b>${pct1(c.w)}${c.p > 0.001 ? ' <span style="color:var(--mut2);font-weight:500;font-size:11.5px">(devuelven ' + pct1(c.p) + ')</span>' : ''} · ${amTxt(c.p > 0.001 ? c.w / (1 - c.p) : c.w)}</b></div>`; }
      num = `
       <h3>Resultado a los 60 minutos</h3>
       <div class="marcadores"><div><b>${pct1(D.regA)}</b><small>${esc(A.ab)} gana</small></div><div><b>${pct1(D.regE)}</b><small>empate → tiempo extra</small></div><div><b>${pct1(D.regH)}</b><small>${esc(H.ab)} gana</small></div></div>
       <div class="nota">Con empate a los 60 minutos hay tiempo extra y, si sigue igual, shootout: se decide casi a moneda (el mejor equipo apenas se lleva un poco más de la mitad). En 6,747 juegos medidos, 22% llegó a tiempo extra y en el 67% de esos hubo gol en OT.</div>
       <h3>Margen de victoria</h3>
       <div class="marcadores">
        <div><b>${pct1(pkA(3))}</b><small>${esc(A.ab)} por 3+</small></div><div><b>${pct1(pkA(2))}</b><small>${esc(A.ab)} por 2</small></div><div><b>${pct1(pkA(1))}</b><small>${esc(A.ab)} por 1</small></div>
        <div><b>${pct1(pk(1))}</b><small>${esc(H.ab)} por 1</small></div><div><b>${pct1(pk(2))}</b><small>${esc(H.ab)} por 2</small></div><div><b>${pct1(pk(3))}</b><small>${esc(H.ab)} por 3+</small></div>
       </div>
       <div class="nota">Margen final como lo cuenta ESPN: un juego que se decide en tiempo extra o shootout termina por 1 gol.</div>
       <h3>Escalera de la línea de gol (${esc(H.ab)} cubre)</h3><div class="lineas">${esc1}</div>
       <h3>Escalera de totales</h3><div class="lineas">${esc2}</div>
       <div class="nota">Cada línea: probabilidad de que el local cubra / de que el total pase, y su cuota justa. El gol del shootout no cuenta para los totales. Con línea entera (5 ó 6) hay "push" y se muestra aparte.</div>`;
    }
    const forPane = `<h3>Forma reciente</h3>${formaHtml(g.a, A)}${formaHtml(g.h, H)}
    <h3>Cara a cara</h3>${caraHtml(g.a, g.h, A, H)}
     <h3>Lesionados (ESPN)</h3><div data-k="les" class="nota">Archivo grande (${DEP === 'nfl' ? 'unos 9 MB' : 'más de 1 MB'}): solo se baja cuando tú lo pides.</div><button class="btnAncho sec" data-a="les" style="margin-top:6px">Cargar lesionados</button>
     <div class="nota">Rating del modelo: ${esc(A.ab)} ${(pr.ma >= 0 ? '+' : '') + pr.ma.toFixed(SP.dec + 1)} · ${esc(H.ab)} ${(pr.mh >= 0 ? '+' : '') + pr.mh.toFixed(SP.dec + 1)} (con arrastre de temporada si aplica).</div>`;

    body.innerHTML = `<div class="tabs"><button class="tb on" data-t="ver">Veredicto</button><button class="tb" data-t="cuo">Cuotas</button><button class="tb" data-t="num">Números</button><button class="tb" data-t="for">Forma</button></div>
     <div class="pane on" data-p="ver">${ver}</div><div class="pane" data-p="cuo">${cuo}</div><div class="pane" data-p="num">${num}</div><div class="pane" data-p="for">${forPane}</div>`;

    body.querySelectorAll('.tb').forEach(b => b.onclick = e => {
      e.stopPropagation();
      body.querySelectorAll('.tb').forEach(x => x.classList.remove('on')); b.classList.add('on');
      body.querySelectorAll('.pane').forEach(x => x.classList.remove('on'));
      body.querySelector('.pane[data-p="' + b.dataset.t + '"]').classList.add('on');
    });
    (() => {
      const vi = body.querySelector('input[data-vl="o"]'), vr = body.querySelector('[data-vl="r"]'); if (!vi || !vr) return;
      vi.addEventListener('input', () => {
        const odd = normCuota(vi.value), p = parseFloat(vi.dataset.p), fm = vi.dataset.m === '1';
        if (odd === null) { vr.textContent = ''; vr.className = 'rvVal'; return; }
        const dec = decAm(odd), ev = p * dec - 1, dif2 = (p - impProb(odd)) * 100, jt = amTxt(p);
        if (ev > 0) { vr.className = 'rvVal ok'; vr.innerHTML = `✓ <b>Hay valor:</b> te pagan más que la cuota justa (${jt}). Ganancia esperada: +${(ev * 100).toFixed(1)}% por cada $1 (${dif2.toFixed(1)} pts de ventaja).` + (fm ? '' : ' Ojo: sale del modelo, que no le gana al mercado; desconfía.'); }
        else { vr.className = 'rvVal no'; vr.innerHTML = `✗ <b>No hay valor:</b> la cuota justa es ${jt} y esta paga menos. Pérdida esperada: ${(ev * 100).toFixed(1)}% por cada $1.`; }
      });
    })();
    const q = k => body.querySelector('[data-k="' + k + '"]');
    body.querySelector('[data-a="adj"]').onclick = () => { g.adjA = parseFloat(q('adjA').value) || 0; g.adjH = parseFloat(q('adjH').value) || 0; pintarCuerpo(body, g); };
    body.querySelector('[data-a="ml"]').onclick = () => {
      const oA = normCuota(q('mlA').value), oH = normCuota(q('mlH').value);
      const pM = pr.mk ? pr.mk.p : null, pW = (pM !== null ? pM : pr.pH);   /* mismo número que Veredicto: el mercado sin margen si hay precio */
      valorHtml(g, 'ML', 'win', [{ sel: A.ab + ' gana', side: 'A', odd: oA, prob: 1 - pW }, { sel: H.ab + ' gana', side: 'H', odd: oH, prob: pW }], body.querySelector('[data-o="ml"]'));
    };
    body.querySelector('[data-a="sp"]').onclick = () => {
      const Lh = parseFloat(q('spL').value); if (!isFinite(Lh)) { body.querySelector('[data-o="sp"]').textContent = 'Mete la línea del local (ej. ' + SP.tipLinea + ').'; return; }
      const c = pr.cover(Lh), pHc = c.w / (1 - c.p);
      valorHtml(g, 'SPR', 'mar', [{ sel: A.ab + ' ' + fmtL(-Lh), side: 'A', odd: normCuota(q('spA').value), prob: 1 - pHc, linea: Lh }, { sel: H.ab + ' ' + fmtL(Lh), side: 'H', odd: normCuota(q('spH').value), prob: pHc, linea: Lh }], body.querySelector('[data-o="sp"]'));
    };
    body.querySelector('[data-a="to"]').onclick = () => {
      const Lt = parseFloat(q('toL').value); if (!isFinite(Lt)) { body.querySelector('[data-o="to"]').textContent = 'Mete la línea del total (ej. ' + SP.tipTot + ').'; return; }
      const c = pr.over(Lt), po = c.w / (1 - c.p);
      valorHtml(g, 'TOT', 'tot', [{ sel: 'Más de ' + Lt, side: 'O', odd: normCuota(q('toO').value), prob: po, linea: Lt }, { sel: 'Menos de ' + Lt, side: 'U', odd: normCuota(q('toU').value), prob: 1 - po, linea: Lt }], body.querySelector('[data-o="to"]'));
    };
    body.querySelector('[data-a="les"]').onclick = function () {
      const btn = this, el = q('les'); btn.disabled = true; btn.textContent = 'Bajando…'; el.textContent = 'Bajando la lista de ESPN…';
      lesiones().then(m => {
        const w = body.querySelector('[data-inj]');
        const key = id => { const t = T(id); return (m[id] || m[(t.n || '').toLowerCase()] || []).filter(x => /out|doubt|ir\b|injured reserve/i.test(x.s)); };
        const kA = key(g.a), kH = key(g.h), f = (Tm, k) => esc(Tm.ab) + ': ' + (k.length ? k.slice(0, 4).map(x => esc(x.n)).join(', ') + (k.length > 4 ? ' y ' + (k.length - 4) + ' más' : '') : 'ninguno');
        const hay = kA.length || kH.length;
        if (w) w.innerHTML = '<i class="' + (hay ? 'w' : 'ok') + '">' + (hay ? '!' : '✓') + '</i><span>Baja/duda (ESPN) · ' + f(A, kA) + ' · ' + f(H, kH) + '.' + (hay ? ' El mercado ya lo descuenta; el modelo solo no.' : '') + '</span>';
        const ff = id => { const t = T(id); return m[id] || m[(t.n || '').toLowerCase()] || []; };
        const fila = id => { const l = ff(id).filter(x => /out|doubt|quest|day|ir\b|injured/i.test(x.s) || !x.s).slice(0, 8); return `<div class="observ"><b>${esc(T(id).n)}</b>: ${l.length ? l.map(x => esc(x.n) + (x.s ? ' (' + esc(x.s) + ')' : '')).join(', ') : 'sin lesionados listados'}</div>`; };
        el.className = ''; el.innerHTML = fila(g.a) + fila(g.h) + '<div class="nota" style="margin-top:4px">Solo informativo: no entra al modelo. Usa el ajuste manual de Veredicto si falta una estrella.</div>';
        btn.style.display = 'none';
      }).catch(() => { el.textContent = 'ESPN no devolvió la lista de lesionados ahora mismo.'; btn.disabled = false; btn.textContent = 'Reintentar'; });
    };
  }
  function mercadoHtml(g, pr, H, A) {
    const o = g.odds || {}, pin = pinDe(g) || {};
    const lineaS = o.spread !== undefined && isFinite(o.spread) ? o.spread : (pin.sp ? pin.sp.l : undefined);
    const lineaT = o.total !== undefined && isFinite(o.total) ? o.total : (pin.tot ? pin.tot.l : undefined);
    const hayS = DEP === 'nfl' && lineaS !== undefined, hayT = lineaT !== undefined, hayP = DEP === 'nhl' && pr.mk;
    if (!hayS && !hayT && !hayP) return '';
    const quien = m => Math.abs(m) < 0.05 ? 'Parejo' : (m >= 0 ? H.ab : A.ab) + ' por ' + Math.abs(m).toFixed(SP.dec);
    const sig = d => (d >= 0 ? '+' : '') + d.toFixed(SP.dec);
    let filas = '', av = [], dm = 0, dt = 0, mer = 0, pmM = 0;
    if (hayS) { mer = -lineaS; dm = pr.pmMod - mer; filas += `<tr><td>Quién gana</td><td class="n">${quien(mer)}</td><td class="n">${quien(pr.pmMod)}</td><td class="n usa">${quien(pr.pm)}</td></tr>`; }
    if (hayP) { pmM = M.pmDeProb(pr.mk.p, pr.pt, PARAMS); dm = pr.pmMod - pmM; filas += `<tr><td>Quién gana (margen implícito)</td><td class="n">${quien(pmM)}</td><td class="n">${quien(pr.pmMod)}</td><td class="n usa">${quien(pr.pm)}</td></tr>`; }
    if (hayT) { dt = pr.ptMod - lineaT; filas += `<tr><td>Total de ${SP.u}</td><td class="n">${lineaT.toFixed(1)}</td><td class="n">${pr.ptMod.toFixed(1)}</td><td class="n usa">${pr.pt.toFixed(1)}</td></tr>`; }
    const tolM = DEP === 'nfl' ? 3 : 0.35, tolT = DEP === 'nfl' ? 4 : 0.5;
    const okM = (!hayS && !hayP) || Math.abs(dm) < tolM, okT = !hayT || Math.abs(dt) < tolT;
    if (hayS || hayP) av.push(okM ? 'En quién gana coinciden (dif. ' + sig(dm) + ' ' + SP.uc + ').' : 'En quién gana, el mercado dice <strong>' + quien(hayS ? mer : pmM) + '</strong> y el modelo solo dice <strong>' + quien(pr.pmMod) + '</strong>: <strong>' + Math.abs(dm).toFixed(SP.dec) + ' ' + SP.uc + '</strong> de diferencia en el margen del partido (no es porcentaje). Tómalo como aviso de que el modelo anda dudoso, no como ventaja.');
    if (hayT) av.push(okT ? 'En el total también (dif. ' + sig(dt) + ' ' + SP.uc + ').' : 'En el total el mercado dice <strong>' + lineaT.toFixed(1) + '</strong> y el modelo solo <strong>' + pr.ptMod.toFixed(1) + '</strong> (<strong>' + Math.abs(dt).toFixed(SP.dec) + ' ' + SP.uc + '</strong>): ' + (DEP === 'nhl' ? 'en hockey el modelo sí aportó algo en totales (por eso pesa más ahí), pero una diferencia grande suele ser portero o ritmo que él no ve.' : 'al inicio de temporada el modelo usa ratings viejos, así que <strong>no apuestes Over/Under por eso</strong>.'));
    const tit = okM && okT ? '🟢 El modelo y el mercado coinciden' : (okM ? '🟡 Coinciden en quién gana, no en el total' : '🟡 El modelo y el mercado no coinciden');
    return `<div class="rv"><h4>Línea del mercado</h4>
    <div class="pick${okM && okT ? '' : ' no'}"><b>${tit}</b>${av.join(' ')}</div>
    <table class="tabla-bt"><tr><th></th><th>Mercado</th><th>Modelo solo</th><th>La app usa</th></tr>${filas}</table>
    <div class="nota">«La app usa» es ${Math.round((1 - LAM_M) * 100)}% mercado y ${Math.round(LAM_M * 100)}% modelo en quién gana${LAM_T !== LAM_M ? ' y ' + Math.round((1 - LAM_T) * 100) + '% mercado / ' + Math.round(LAM_T * 100) + '% modelo en el total' : ''}: ${DEP === 'nfl' ? 'en 1,452 juegos medidos (7 temporadas) la línea acertó más que el modelo.' : 'en 4,577 juegos medidos (4 temporadas) la línea acertó más que el modelo en el ganador.'}</div></div>`;
  }
  function caraHtml(a, h, A, H) {
    const js = GAMES.filter(x => (x.h === a && x.a === h) || (x.h === h && x.a === a)).sort((p, q) => q.ts - p.ts).slice(0, 8);
    if (!js.length) return '<div class="nota">No se han enfrentado en los partidos cargados.</div>';
    let wa = 0, wh = 0, dh = 0, filas = '';
    js.forEach(x => {
      const sh = x.h === h ? x.hs : x.as, sa = x.h === h ? x.as : x.hs; if (sh > sa) wh++; else if (sa > sh) wa++; dh += sh - sa;
      const suf = (DEP === 'nhl' && (x.so || x.ot)) ? (x.so ? ' (SO)' : ' (OT)') : '';
      filas += `<div class="linea"><span>${esc(T(x.a).ab || T(x.a).n)} @ ${esc(T(x.h).ab || T(x.h).n)}<br><small style="color:var(--mut2)">${hace(x.ts)}</small></span><b>${x.as}–${x.hs}${suf}</b></div>`;
    });
    const m = dh / js.length;
    return `<div class="lineas">${filas}</div><div class="nota" style="margin-top:6px">Últimos ${js.length}: ${esc(H.ab)} ${wh} · ${esc(A.ab)} ${wa} · margen promedio ${esc(H.ab)} ${(m >= 0 ? '+' : '') + m.toFixed(SP.dec)} ${SP.uc}. Solo informativo: con tan pocos juegos no predice y no entra al modelo.</div>`;
  }
  function formaHtml(id, Tm) {
    const js = GAMES.filter(x => x.h === id || x.a === id).sort((a, b) => b.ts - a.ts).slice(0, DEP === 'nfl' ? 6 : 10);
    const h = `<div class="observ"><b>${esc(Tm.n)}</b></div>`;
    if (!js.length) return h + '<div class="nota">Sin partidos medidos de este equipo.</div>';
    let w = 0, l = 0, e = 0, df = 0, filas = '';
    js.forEach((x, i) => {
      const loc = x.h === id, f = loc ? x.hs : x.as, c = loc ? x.as : x.hs, r = loc ? x.a : x.h, res = f > c ? 'V' : (f < c ? 'D' : 'E');
      if (res === 'V') w++; else if (res === 'D') l++; else e++; df += f - c;
      const suf = (DEP === 'nhl' && (x.so || x.ot)) ? (x.so ? ' (SO)' : ' (OT)') : '';
      if (i < 5) filas += `<div class="linea"><span><span class="forma" style="margin-right:8px;vertical-align:middle"><span class="${res === 'E' ? 'V' : res}" style="${res === 'E' ? 'background:var(--mut2)' : ''}">${res}</span></span>${loc ? 'vs' : '@'} ${esc(T(r).n)}<br><small style="color:var(--mut2)">${hace(x.ts)}</small></span><b>${f}–${c}${suf}</b></div>`;
    });
    return h + `<div class="lineas">${filas}</div><div class="nota" style="margin-top:6px">Últimos ${js.length}: ${w}-${l}${e ? '-' + e : ''} · margen promedio ${(df / js.length >= 0 ? '+' : '') + (df / js.length).toFixed(SP.dec)} ${SP.uc}.</div>`;
  }
  function valorHtml(g, mercado, clave, filas, out) {
    const con = filas.filter(f => f.odd !== null && impProb(f.odd) !== null);
    if (!con.length) { out.textContent = 'Mete al menos una cuota.'; return; }
    const completo = con.length === filas.length;
    const suma = con.reduce((a, f) => a + impProb(f.odd), 0), conf = confiable(clave);
    let html = '';
    g._rank = g._rank || {}; g._rank[mercado] = [];
    con.forEach((f, i) => {
      const imp = impProb(f.odd), ref = completo ? imp / suma : imp, diff = (f.prob - ref) * 100, val = diff >= 3;
      g._rank[mercado].push({ mercado: mercado, sel: f.sel, side: f.side, linea: f.linea, odd: f.odd, prob: f.prob, imp: imp, ref: ref, diff: diff, ev: f.prob / imp - 1, conf: conf });
      const etq = val ? `<span class="${conf === false ? 'no' : 'si'}">valor +${diff.toFixed(1)}${conf === false ? ' (no confiable)' : ''}</span>` : `<span class="no">sin valor ${diff.toFixed(1)}</span>`;
      html += `<div class="filaCuota"><span class="txt">${esc(f.sel)}: modelo ${pct1(f.prob)} vs ${completo ? 'mercado sin margen ' : 'cuota '}${pct1(ref)} — ${etq}</span><button class="btnChico" data-g="${i}">💾</button></div>`;
    });
    html += completo ? `<div class="nota" style="margin-top:6px">Margen de la casa ≈ ${((suma - 1) * 100).toFixed(1)}%; la comparación ya lo descuenta.</div>` : (filas.length > 1 ? '<div class="nota" style="margin-top:6px">Mete las dos cuotas para descontar el margen de la casa (si no, el "valor" sale inflado).</div>' : '');
    out.innerHTML = html;
    out.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const f = con[+b.dataset.g]; guardarPick({ hId: g.h, aId: g.a, hN: T(g.h).n, aN: T(g.a).n, ts: g.ts, mercado: mercado, side: f.side, linea: f.linea, seleccion: f.sel, cuota: f.odd, prob: f.prob }); b.textContent = '✓'; b.disabled = true; });
    const cuerpo = out.closest('.body'); if (cuerpo) pintarRankJuego(cuerpo, g);
  }
  function pintarRankJuego(body, g) {
    const box = body.querySelector('[data-k="rank"]'); if (!box) return;
    const lista = [].concat(...Object.values(g._rank || {}));
    if (!lista.length) { box.innerHTML = ''; return; }
    const pasa = f => f.diff >= 3 && f.conf !== false;
    lista.sort((a, b) => (pasa(b) - pasa(a)) || (b.diff - a.diff));
    const buenos = lista.filter(pasa), medal = ['🥇', '🥈', '🥉'];
    const fa = a => (a > 0 ? '+' : '') + a;
    let h = '<h3>Ranking del juego</h3>';
    if (!buenos.length) h += `<div class="pick no"><b>Nada que jugar aquí</b>De ${lista.length} proposiciones con cuota, ninguna llega a 3 puntos de ventaja con un mercado confiable. La más cercana es ${esc(lista[0].sel)} con ${(lista[0].diff >= 0 ? '+' : '') + lista[0].diff.toFixed(1)} puntos.</div>`;
    lista.forEach((f, i) => {
      const ok = pasa(f), n = ok ? buenos.indexOf(f) : -1;
      const etq = ok ? 'valor' : (f.conf === false && f.diff >= 3 ? 'no confiable' : 'sin valor');
      h += `<div class="pick${ok ? '' : ' no'}"><div class="filaCuota"><div class="txt"><b>${ok ? (medal[n] || (n + 1) + '.') : '·'} ${esc(f.sel)} ${fa(Math.round(+f.odd))}</b>${etq} · modelo ${pct1(f.prob)} contra ${pct1(f.ref)} del mercado · ${(f.diff >= 0 ? '+' : '') + f.diff.toFixed(1)} puntos · EV ${(f.ev >= 0 ? '+' : '') + (f.ev * 100).toFixed(1)}% por dólar</div><button class="btnChico" data-rg="${i}">💾</button></div></div>`;
    });
    h += '<div class="nota">Ordenado por puntos de ventaja, no por EV: el EV por dólar sale más grande con cuotas largas aunque la ventaja sea la misma. La línea del mercado acertó más que el modelo en las pruebas, así que toma estos puntos como pista y no como garantía.</div>';
    box.innerHTML = h;
    box.querySelectorAll('[data-rg]').forEach(b => b.onclick = e => { e.stopPropagation(); const f = lista[+b.dataset.rg]; guardarPick({ hId: g.h, aId: g.a, hN: T(g.h).n, aN: T(g.a).n, ts: g.ts, mercado: f.mercado, side: f.side, linea: f.linea, seleccion: f.sel, cuota: f.odd, prob: f.prob }); b.textContent = '✓'; b.disabled = true; });
  }

  /* ---------- ratings ---------- */
  function pintarRank() {
    const cont = $('rank'); if (!ESTADO) { cont.innerHTML = ''; return; }
    const cur = seasonOf(Date.now()), esc2 = (ESTADO.season !== null && cur > ESTADO.season) ? PARAMS.carry : 1, hoyK = dayKey(Date.now());
    const ids = Object.keys(ESTADO.m).filter(id => ESTADO.last[id] !== undefined && hoyK - ESTADO.last[id] < 400).sort((a, b) => ESTADO.m[b] - ESTADO.m[a]);
    cont.innerHTML = (esc2 < 1 ? `<div class="aviso" style="margin-top:12px">Temporada nueva sin partidos aún: los ratings son los del cierre de la pasada, encogidos ${Math.round((1 - esc2) * 100)}% hacia el promedio por los cambios de plantel.</div>` : '') +
      ids.map((id, i) => { const t = T(id), r = ESTADO.m[id] * esc2, tt = (ESTADO.t[id] || 0) * esc2;
        return `<div class="fila-rank"><div class="pos">${i + 1}</div><img src="${esc(t.logo)}" alt="" onerror="this.style.display='none'"><div class="nom">${esc(t.n)}<small>Total: ${(tt >= 0 ? '+' : '') + tt.toFixed(SP.dec)} ${SP.uc} por juego</small></div><div class="pct">${(r >= 0 ? '+' : '') + r.toFixed(SP.dec + 1)}</div></div>`; }).join('');
  }

  /* ---------- backtest ---------- */
  function renderBt(tit, r, sk, guardar) {
    if (!r.n) return `<div class="estado bad">${tit}: no hay partidos medibles.</div>`;
    const n = r.n, dW = dif(r.qW, n), dM = dif(r.qM, n), dT = dif(r.qT, n);
    const mD = DEP === 'nfl' ? 0.1 : 0.01;
    const vW = verdTxt(dW, 0.003), vM = verdTxt(dM, mD), vT = verdTxt(dT, mD), sP = pendiente(r.sl);
    if (guardar && n >= SP.minPas * 0.9) LS.set(K.ver, { win: Object.assign({}, dW, { minD: 0.003 }), mar: Object.assign({}, dM, { minD: mD }), tot: Object.assign({}, dT, { minD: mD }) });
    let h = `<h3>${tit} — ${n} partidos medidos</h3>
     <div class="kpi"><div><b>${(r.ok / n * 100).toFixed(1)}%</b><small>Acierto ganador</small></div><div><b>${(r.aeM / n).toFixed(2)}</b><small>Error margen (${SP.uc})</small></div><div><b>${(r.aeT / n).toFixed(2)}</b><small>Error total (${SP.uc})</small></div></div>
     <table class="tabla-bt"><tr><th>Mercado</th><th>Modelo</th><th>Sin modelo</th><th>Veredicto</th></tr>
     <tr><td>Ganador (pérdida)</td><td>${(r.ll / n).toFixed(3)}</td><td>${(r.llb / n).toFixed(3)}</td><td style="color:${vW.c}">${vW.t}</td></tr>
     <tr><td>Margen (error ${SP.uc})</td><td>${(r.aeM / n).toFixed(2)}</td><td>${(r.aeMb / n).toFixed(2)}</td><td style="color:${vM.c}">${vM.t}</td></tr>
     <tr><td>Total (error ${SP.uc})</td><td>${(r.aeT / n).toFixed(2)}</td><td>${(r.aeTb / n).toFixed(2)}</td><td style="color:${vT.c}">${vT.t}</td></tr>
     <tr><td>Pendiente del margen (1.00 = ideal)</td><td>${sP.b.toFixed(2)} ±${(2 * sP.se).toFixed(2)}</td><td>1.00</td><td style="color:${sP.z > 2 ? 'var(--bad)' : (sP.z < -2 ? 'var(--bad)' : 'var(--good)')}">${sP.z > 2 ? 'exagera' : (sP.z < -2 ? 'se queda corto' : '≈ bien')}</td></tr></table>
     <div class="nota" style="margin-top:0">Un ✓ o ✗ solo sale si la diferencia es clara (más de 2 errores estándar); si no, ≈ igual. "Sin modelo" es el promedio de la liga, no la línea del mercado. La pendiente dice si los márgenes grandes del modelo se cumplen: si sale por debajo de 1 y marca "exagera", los favoritos fuertes ganan menos de lo que dice el rating — "Calibrar" lo corrige solo con el factor Z.</div>`;
    const malos = []; if (vM.t !== '✓ le gana') malos.push('el margen'); if (vT.t !== '✓ le gana') malos.push('el total');
    h += `<div class="veredicto-bt">${vW.t === '✓ le gana' ? 'En el <b>ganador</b> el modelo sí le gana a la referencia.' : 'En el <b>ganador</b> el modelo no le gana claramente a la referencia.'}${malos.length ? ' En ' + malos.join(' y ') + ' <b>no hay ventaja clara</b> sobre el promedio de la liga.' : ''} Eso es lo mínimo que se le pide: todavía no dice nada sobre la línea del mercado.</div>`;
    h += '<h3>¿Cuando dice 70%, gana 70%?</h3><table class="tabla-bt"><tr><th>Favorito con</th><th>Partidos</th><th>Dijo</th><th>Ganó</th></tr>' +
      r.bins.map((b, i) => `<tr><td>${SP.etq[i]}</td><td>${b.n}</td><td>${b.n ? (b.pred / b.n * 100).toFixed(1) + '%' : '—'}</td><td>${b.n ? (b.won / b.n * 100).toFixed(1) + '%' : '—'}</td></tr>`).join('') + '</table><div class="nota" style="margin-top:0">Si "Dijo" queda muy por encima de "Ganó", el modelo infla la confianza. Rangos con menos de ~30 partidos no dicen mucho.</div>';
    return h;
  }
  const tl = sk => sk + '-' + String(sk + 1).slice(2);
  function btPasada() {
    const out = $('btOut'), sk = seasonOf(Date.now()) - 1;
    if (GAMES.filter(g => seasonOf(g.ts) === sk).length < SP.minPas) { out.innerHTML = '<div class="estado bad">No hay suficientes partidos de la temporada pasada cargados. Toca 🔍 Diagnóstico.</div>'; return; }
    out.innerHTML = renderBt('Temporada ' + tl(sk), evaluar(GAMES, PARAMS, sk), sk, true);
  }
  function btActual() {
    const out = $('btOut'), sk = seasonOf(Date.now());
    const n = GAMES.filter(g => seasonOf(g.ts) === sk).length;
    if (n < SP.minAct) { out.innerHTML = `<div class="estado bad">Esta temporada lleva ${n} partidos medidos: muy pocos. Usa "Medir temporada pasada".</div>`; return; }
    out.innerHTML = renderBt('Temporada ' + tl(sk) + ' (en curso)', evaluar(GAMES, PARAMS, sk), sk, false);
  }
  function calibrar() {
    const out = $('btOut'), sk = seasonOf(Date.now()) - 1;
    const eva = GAMES.filter(g => seasonOf(g.ts) === sk).sort((a, b) => a.ts - b.ts);
    if (eva.length < SP.minCal) { out.innerHTML = '<div class="estado bad">Hacen falta las temporadas pasadas cargadas para calibrar.</div>'; return; }
    const mid = eva[Math.floor(eva.length / 2)].ts, f1 = g => g.ts < mid, f2 = g => g.ts >= mid;
    const paso = (txt, fn) => new Promise(res => { out.innerHTML = '<div class="estado">' + txt + '</div>'; setTimeout(() => res(fn()), 40); });
    (async () => {
      const base1 = Object.assign({}, PARAMS, { Z: 1 });
      const A = await paso('Calibrando margen (1 de 5)…', () => gridMargen(GAMES, sk, null, base1));
      const B = await paso('Calibrando total (2 de 5)…', () => gridTotal(GAMES, sk, null, A.P));
      const mej = Object.assign({}, B.P, { Z: zRecomendado(evaluar(GAMES, B.P, sk).sl) });
      const H1 = await paso('Chequeo honesto 3 de 5…', () => { const a = gridMargen(GAMES, sk, f1, base1), P1 = gridTotal(GAMES, sk, f1, a.P).P; return Object.assign({}, P1, { Z: zRecomendado(evaluar(GAMES, P1, sk, { filtro: f1 }).sl) }); });
      const H2 = await paso('Chequeo honesto 4 de 5…', () => { const a = gridMargen(GAMES, sk, f2, base1), P2 = gridTotal(GAMES, sk, f2, a.P).P; return Object.assign({}, P2, { Z: zRecomendado(evaluar(GAMES, P2, sk, { filtro: f2 }).sl) }); });
      const fin = await paso('Midiendo (5 de 5)…', () => {
        const sum = (a, b) => ({ n: a.n + b.n, aeM: a.aeM + b.aeM, aeMb: a.aeMb + b.aeMb, aeT: a.aeT + b.aeT, aeTb: a.aeTb + b.aeTb, ll: a.ll + b.ll, llb: a.llb + b.llb });
        const act = sum(evaluar(GAMES, PARAMS, sk, { filtro: f2 }), evaluar(GAMES, PARAMS, sk, { filtro: f1 }));
        const cru = sum(evaluar(GAMES, H1, sk, { filtro: f2 }), evaluar(GAMES, H2, sk, { filtro: f1 }));
        return { act: act, cru: cru };
      });
      const tx = P => DEP === 'nfl' ? `kM ${P.kM} · arrastre ${P.carry} · local +${P.H} · semana corta −${P.Rs} · bye +${P.Bb} · kTotal ${P.kT} · confianza Z ${(P.Z === undefined ? 1 : P.Z).toFixed(2)}` : `kM ${P.kM} · arrastre ${P.carry} · local +${P.H} · B2B ${P.R} · kTotal ${P.kT} · confianza Z ${(P.Z === undefined ? 1 : P.Z).toFixed(2)}`;
      const f = (r, k) => (r[k] / r.n).toFixed(2);
      out.innerHTML = `<h3>Calibración (temporada ${tl(sk)}, ${fin.act.n} partidos)</h3>
       <div class="observ"><b>Actual:</b> ${tx(PARAMS)}</div><div class="observ"><b>Calibrado:</b> ${tx(mej)}</div>
       <h3>Chequeo honesto cruzado</h3>
       <table class="tabla-bt"><tr><th>Error (${SP.uc})</th><th>Actual</th><th>Calibrado</th><th>Sin modelo</th></tr>
       <tr><td>Ganador (pérdida)</td><td>${(fin.act.ll / fin.act.n).toFixed(3)}</td><td>${(fin.cru.ll / fin.cru.n).toFixed(3)}</td><td>${(fin.act.llb / fin.act.n).toFixed(3)}</td></tr>
       <tr><td>Margen</td><td>${f(fin.act, 'aeM')}</td><td>${f(fin.cru, 'aeM')}</td><td>${f(fin.act, 'aeMb')}</td></tr>
       <tr><td>Total</td><td>${f(fin.act, 'aeT')}</td><td>${f(fin.cru, 'aeT')}</td><td>${f(fin.act, 'aeTb')}</td></tr></table>
       <div class="nota" style="margin-top:0">Cada mitad de la temporada se mide con parámetros calibrados en la OTRA mitad, así que ningún partido se midió con parámetros que lo hayan visto. Más bajo = mejor.</div>
       <button id="btnUsar" class="btnAncho">Usar los parámetros calibrados</button><button id="btnReset" class="btnAncho sec">Volver a valores de arranque</button>`;
      const keys = DEP === 'nfl' ? ['kM', 'kT', 'carry', 'H', 'Rs', 'Bb', 'Z'] : ['kM', 'kT', 'carry', 'H', 'R', 'Z'];
      $('btnUsar').onclick = function () { const o = {}; keys.forEach(k => o[k] = mej[k]); LS.set(K.params, o); PARAMS = Object.assign({}, PDEF, mej, { calibrado: true }); recalc(); pintarRank(); out.insertAdjacentHTML('beforeend', '<div class="estado ok">Guardado. Los partidos que abras desde ahora usan estos parámetros. Vuelve a tocar "Medir temporada pasada" para refrescar los veredictos.</div>'); this.disabled = true; };
      $('btnReset').onclick = function () { try { localStorage.removeItem(K.params); } catch (e) { } PARAMS = Object.assign({}, PDEF, { calibrado: false }); recalc(); pintarRank(); out.insertAdjacentHTML('beforeend', '<div class="estado ok">Parámetros de arranque restablecidos.</div>'); this.disabled = true; };
    })().catch(e => { out.innerHTML = '<div class="estado bad">No pude calibrar: ' + esc(e.message) + '</div>'; });
  }

  /* ---------- registro ---------- */
  const regGet = () => LS.get(K.reg) || [];
  const regSet = a => LS.set(K.reg, a);
  function guardarPick(p) { const a = regGet(); p.id = Date.now() + '_' + Math.random().toString(36).slice(2); p.estado = 'pendiente'; a.push(p); regSet(a); }
  let VERIF = false;
  async function verificarRegistro() {
    if (VERIF) return; VERIF = true;
    try {
      const a = regGet(), pend = a.filter(p => p.estado === 'pendiente' && p.ts < Date.now() - 3.5 * 3600e3);
      if (pend.length) {
        const dias = new Set(); pend.forEach(p => { dias.add(ymdUTC(p.ts)); dias.add(ymdUTC(p.ts + 864e5)); });
        const res = await pool([...dias].map(k => () => bajarDia(k)), 4);
        const fin = [].concat(...res).filter(g => g.done);
        let cambios = false;
        pend.forEach(p => { const g = fin.find(x => x.h === p.hId && x.a === p.aId && Math.abs(x.ts - p.ts) < 36 * 3600e3); if (g) { p.estado = resolverPick(DEP, p, g); cambios = true; } });
        if (cambios) regSet(a);
      }
    } catch (e) { }
    VERIF = false; pintarRegistro();
  }
  function pintarRegistro() {
    const cont = $('registro'), arr = regGet().slice().reverse();
    if (!arr.length) { cont.innerHTML = '<div class="estado">Todavía no has guardado ningún pick. Guárdalos con el botón 💾 desde la pestaña Cuotas de cada partido. (La app también guarda sola cada juego con su pronóstico: míralo en Herramientas → 🤖 Auto.)</div>'; return; }
    let g = 0, pe = 0, pu = 0, pn = 0, net = 0;
    arr.forEach(p => { if (p.estado === 'ganado') { g++; const d = decAm(p.cuota); if (d) net += d - 1; } else if (p.estado === 'perdido') { pe++; net -= 1; } else if (p.estado === 'push') pu++; else pn++; });
    cont.innerHTML = `<div class="kpi"><div><b>${g}-${pe}${pu ? '-' + pu : ''}</b><small>Récord (G-P${pu ? '-push' : ''})</small></div><div><b>${pn}</b><small>Pendientes</small></div><div><b>${net >= 0 ? '+' : ''}${net.toFixed(2)}u</b><small>Neto (1u plano)</small></div></div>
     <div class="lineas" style="margin-top:10px">${arr.map(p => { const c = p.estado === 'ganado' ? 'var(--good)' : (p.estado === 'perdido' ? 'var(--bad)' : 'var(--mut)'); return `<div class="linea"><span>${esc(p.aN)} @ ${esc(p.hN)} — ${esc(p.seleccion)} (${p.cuota})</span><b style="color:${c}">${p.estado}</b></div>${typeof OVACLV !== 'undefined' ? OVACLV.fila(p) : ''}`; }).join('')}</div>
     ${typeof OVACLV !== 'undefined' ? OVACLV.resumenHtml(regGet()) : ''}
     <div class="nota">Récord y ganancia neta a stake plano de 1 unidad por pick. Con líneas enteras puede haber "push" (se devuelve, cuenta 0).${DEP === 'nhl' ? ' En hockey el moneyline incluye tiempo extra y shootout; el gol del shootout no cuenta para los totales.' : ''}</div>`;
    if (typeof OVACLV !== 'undefined') OVACLV.ligar(cont, regGet, regSet, pintarRegistro);
  }

  /* ---------- diagnóstico ---------- */
  function armarDiag() {
    const L = []; L.push('App ' + SP.nombre + ' v1.0 · ' + new Date().toLocaleString());
    L.push('Parámetros: ' + JSON.stringify(PARAMS));
    L.push('Partidos: ' + GAMES.length + ' · equipos: ' + Object.keys(TEAMS).length + ' · fuente: ' + DIAG.fuente + (DIAG.gen ? ' (archivo de ' + DIAG.gen.slice(0, 16).replace('T', ' ') + ' UTC)' : '') + ' · días completados directo de ESPN: ' + DIAG.topUp);
    if (ESTADO) L.push('Partidos en el modelo ' + ESTADO.n + ' · promedio de la liga ' + ESTADO.lg.toFixed(2) + ' ' + SP.uc + ' por juego');
    L.push('Próximos: ' + PEND.length + ' juegos (' + PEND.filter(g => g.odds).length + ' con líneas de ESPN'+(PEND.filter(g => g.oddsViejo).length?', '+PEND.filter(g => g.oddsViejo).length+' de antes del juego':'')+') · Pinnacle: ' + (PIN ? PIN.juegos.length + ' juegos (hace ' + pinTxt() + ')' : 'sin archivo'));
    if (DEP === 'nfl') L.push('Números clave: ' + (KW ? 'medidos con ' + GAMES.length + ' juegos' : 'sin datos suficientes'));
    L.push(DIAG.errores.length ? DIAG.errores.length + ' errores, ej: ' + DIAG.errores.slice(0, 3).join(' | ') : 'Sin errores de descarga.');
    return L.join('\n');
  }

  /* ---------- temas ---------- */
  const FONTS = { oro: 'family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700', neon: 'family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600;700', dia: 'family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700', campo: 'family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700', cristal: 'family=Manrope:wght@400;500;600;700;800' };
  const SKINS = {
    noche: { n: 'Noche de estadio', d: 'Azul medianoche y ámbar', bg: '#070B12', acc: '#3B82F6', hot: '#FBBF24', v: {} },
    oro: { n: 'Oro negro', d: 'Negro cálido, dorado, serif', bg: '#0A0908', acc: '#C9A24A', hot: '#F0CE6B', v: { '--bg': '#0A0908', '--bg1': '#13110D', '--bg2': '#1B1812', '--bg3': '#25211A', '--line': '#2A241B', '--line2': '#43381F', '--txt': '#F7F2E7', '--mut': '#CBBFA5', '--mut2': '#A09472', '--acc': '#C9A24A', '--acc2': '#E6C874', '--accTx': '#1A1305', '--hot': '#F0CE6B', '--hotTx': '#1A1305', '--good': '#6FD39A', '--bad': '#F08A78', '--cond': "'Playfair Display',Georgia,serif", '--body': "'Inter',system-ui,sans-serif", '--r': '6px', '--r2': '12px' } },
    neon: { n: 'Neón', d: 'Cian y magenta sobre violeta', bg: '#0E0B1F', acc: '#19E3FF', hot: '#FF4FD0', v: { '--bg': '#07060F', '--bg1': '#0E0B1F', '--bg2': '#161231', '--bg3': '#1F1A44', '--line': '#241E4A', '--line2': '#3D3280', '--txt': '#F5F3FF', '--mut': '#BDB6EC', '--mut2': '#8E86C8', '--acc': '#19E3FF', '--acc2': '#6BF0FF', '--accTx': '#00141A', '--hot': '#FF4FD0', '--hotTx': '#1D0018', '--good': '#3DFFB4', '--bad': '#FF6B86', '--cond': "'Rajdhani','Arial Narrow',system-ui,sans-serif", '--body': "'Inter',system-ui,sans-serif" } },
    dia: { n: 'Día de juego', d: 'Claro, se lee con sol', bg: '#EAF0F7', acc: '#1D4ED8', hot: '#B45309', v: { '--bg': '#EAF0F7', '--bg1': '#FFFFFF', '--bg2': '#F0F4FA', '--bg3': '#E2E9F3', '--line': '#E0E7F1', '--line2': '#C3D0E1', '--txt': '#0E1A2C', '--mut': '#3F5068', '--mut2': '#56677F', '--acc': '#1D4ED8', '--acc2': '#3B6BF0', '--accTx': '#FFFFFF', '--hot': '#9A4406', '--hotTx': '#FFFFFF', '--good': '#0B7A52', '--bad': '#C0362C', '--cond': "'Barlow Condensed','Arial Narrow',system-ui,sans-serif", '--body': "'Inter',system-ui,sans-serif" } },
    campo: { n: 'Campo', d: 'Verde césped y tiza', bg: '#05130A', acc: '#3DDC84', hot: '#F2EA6B', v: { '--bg': '#05130A', '--bg1': '#0A2013', '--bg2': '#10301D', '--bg3': '#174127', '--line': '#154029', '--line2': '#2D6A45', '--txt': '#F0F8F1', '--mut': '#B2D0B9', '--mut2': '#86AA8F', '--acc': '#3DDC84', '--acc2': '#7BF0AB', '--accTx': '#03150A', '--hot': '#F2EA6B', '--hotTx': '#1B1A02', '--good': '#5CE69F', '--bad': '#FF8577', '--cond': "'Barlow Condensed','Arial Narrow',system-ui,sans-serif", '--body': "'Barlow',system-ui,sans-serif" } },
    cristal: { n: 'Cristal', d: 'Violeta translúcido, aurora', bg: '#0A0C1C', acc: '#8E96FF', hot: '#FFC27A', v: { '--bg': '#0A0C1C', '--bg1': '#141737', '--bg2': '#1B1F47', '--bg3': '#262B5E', '--line': '#2A2E63', '--line2': '#3F4584', '--txt': '#F6F7FF', '--mut': '#C3C8E8', '--mut2': '#98A0CC', '--acc': '#8E96FF', '--acc2': '#B7BCFF', '--accTx': '#0A0C1C', '--hot': '#FFC27A', '--hotTx': '#2A1600', '--good': '#5EEAD4', '--bad': '#FF95A8', '--cond': "'Manrope',system-ui,sans-serif", '--body': "'Manrope',system-ui,sans-serif" } }
  };
  let SKIN_SET = [];
  function aplicarTema(id) {
    const s = SKINS[id] || SKINS.noche, st = document.documentElement.style;
    SKIN_SET.forEach(k => st.removeProperty(k)); SKIN_SET = Object.keys(s.v);
    SKIN_SET.forEach(k => st.setProperty(k, s.v[k]));
    if (FONTS[id] && !document.getElementById('f-' + id)) { const l = document.createElement('link'); l.id = 'f-' + id; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + FONTS[id] + '&display=swap'; document.head.appendChild(l); }
    try { localStorage.setItem('ova_skin', id); } catch (e) { }
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', s.bg);
    document.querySelectorAll('.ovaSk').forEach(b => b.setAttribute('aria-pressed', b.dataset.sk === id ? 'true' : 'false'));
  }
  function montarTemas() {
    const box = $('skinBox'), g = document.createElement('div'); g.className = 'ovaSkins';
    g.innerHTML = Object.keys(SKINS).map(id => { const s = SKINS[id]; return `<button type="button" class="ovaSk" data-sk="${id}" aria-pressed="false"><span class="pv" style="background:${s.bg}"><i style="background:${s.acc}"></i><i style="background:${s.hot}"></i></span><span class="tx"><b>${s.n}</b><span>${s.d}</span></span></button>`; }).join('');
    g.onclick = e => { const b = e.target.closest('.ovaSk'); if (b) aplicarTema(b.dataset.sk); };
    box.appendChild(g);
    $('btnTema').onclick = () => $('ovaSheet').classList.add('on');
    $('ovaSheet').onclick = e => { if (e.target === $('ovaSheet')) $('ovaSheet').classList.remove('on'); };
    let cur = 'noche'; try { cur = localStorage.getItem('ova_skin') || 'noche'; } catch (e) { }
    aplicarTema(SKINS[cur] ? cur : 'noche');
  }

  /* ---------- arranque ---------- */
  async function iniciar() {
    try {
      setEstado('Cargando los partidos de ' + SP.nombre + '…');
      GAMES = await cargarPartidos(t => setEstado(t));
      if (GAMES.length < (DEP === 'nfl' ? 150 : 500)) throw new Error('muy pocos partidos (' + GAMES.length + ')');
      recalc();
      setEstado('Buscando los próximos partidos…');
      await cargarProximos();
      pintarSelector(); pintarJuegos(); pintarRank();
      verificarRegistro();
      setEstado('✓ ' + SP.nombre + ' · ' + PEND.length + ' próximos juegos · actualizado ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.', 'ok');
    } catch (e) { setEstado('✗ No se pudo cargar ' + SP.nombre + ': ' + e.message + '. Toca 🔍 Diagnóstico.', 'bad'); }
  }
  document.querySelectorAll('.tabbar .tbar-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tabbar .tbar-btn').forEach(x => x.classList.remove('on')); b.classList.add('on');
    document.querySelectorAll('main > .vista').forEach(v => v.classList.remove('on')); $(b.dataset.v).classList.add('on');
    if (b.dataset.v === 'vReg') { pintarRegistro(); verificarRegistro(); }
    if (b.dataset.v === 'vRank') pintarRank();
    if (b.dataset.v === 'vAlgane') pintarAlGane();
  });
  $('btnBtPas').onclick = btPasada; $('btnBtAct').onclick = btActual; $('btnCal').onclick = calibrar; $('btnVerif').onclick = verificarRegistro;
  $('btnDiag').onclick = () => { const el = $('diagOut'); if (el.style.display === 'block') el.style.display = 'none'; else { el.textContent = armarDiag(); el.style.display = 'block'; } };
  $('btnResp').onclick = () => {
    const txt = JSON.stringify({ app: 'ova-' + DEP, v: 1, fecha: new Date().toISOString(), registro: regGet(), params: PARAMS.calibrado ? Object.fromEntries(['kM', 'kT', 'carry', 'H', 'R', 'Rs', 'Bb', 'Z'].filter(k => PARAMS[k] !== undefined).map(k => [k, PARAMS[k]])) : null });
    $('respTxt').value = txt; $('respMsg').textContent = 'Respaldo generado (' + regGet().length + ' picks). Si no se copió solo, mantén presionado el texto, "Seleccionar todo" y "Copiar".';
    try { navigator.clipboard.writeText(txt).then(() => { $('respMsg').textContent = 'Respaldo copiado (' + regGet().length + ' picks). Pégalo en Notas.'; }, () => { }); } catch (e) { }
  };
  $('btnRest').onclick = () => {
    const m = $('respMsg');
    try {
      const d = JSON.parse($('respTxt').value); if (!d || d.app !== 'ova-' + DEP) throw new Error('ese texto no es un respaldo de esta app');
      const reg = regGet(), ids = {}; reg.forEach(p => ids[p.id] = 1); let n = 0;
      (d.registro || []).forEach(p => { if (p && p.id && !ids[p.id]) { reg.push(p); ids[p.id] = 1; n++; } }); regSet(reg);
      if (d.params && isFinite(d.params.kM)) { LS.set(K.params, d.params); PARAMS = Object.assign({}, PDEF, d.params, { calibrado: true }); if (GAMES.length) recalc(); }
      m.textContent = 'Restaurado: ' + n + ' picks nuevos (los que ya estaban no se duplican).'; pintarRegistro();
    } catch (e) { m.textContent = 'No se pudo restaurar: ' + e.message; }
  };
  montarTemas();
  iniciar();

  /* ===== EN VIVO: marcador de los juegos del día cada 20 s (solo si hay juegos cerca de ahora) ===== */
  (function () {
    async function actualizar() {
      try {
        if (document.hidden || !PEND.length) return;
        const ahora = Date.now(), cerca = PEND.filter(g => g.live || Math.abs(g.ts - ahora) < 8 * 3600e3);
        if (!cerca.length) return;
        const dias = new Set([ymdUTC(Date.now())]); cerca.forEach(g => dias.add(ymdUTC(g.ts)));
        const res = await Promise.all([...dias].map(d => getJSON(SP.espn + 'scoreboard?dates=' + d + '&limit=300').then(j => parseEventos(j, DEP, null)).catch(() => [])));
        await rellenarPred();                           // precio en vivo del mercado de predicción (se vuelve a bajar cada 2 min)
        [].concat(...res).forEach(e => {
          const g = PEND.find(x => x.id === e.id); if (g) { g.live = e.live; g.hs = e.hs; g.as = e.as; g.detail = e.detail; g.done = e.done; }
          if (g && g.live && g.pred) {                  // si el Veredicto de este juego está abierto, sin cuota escrita, se repinta con el precio nuevo
            const bd = document.querySelector('#juegos .game[data-id="' + e.id + '"] .body'), tb = bd && bd.querySelector('.tb.on');
            if (bd && bd.dataset.p && tb && tb.dataset.t === 'ver' && ![...bd.querySelectorAll('input')].some(i => i.value || i === document.activeElement)) { try { pintarCuerpo(bd, g); } catch (x) { } }
          }
          const el = document.querySelector('#juegos .game[data-id="' + e.id + '"]'); if (!el) return;
          const b = el.querySelector('.hora'); if (!b) return;
          if (e.live) { b.style.color = 'var(--bad)'; b.innerHTML = '🔴 ' + e.as + '–' + e.hs + '<br><small style="font-size:9px">' + esc(e.detail) + '</small>'; }
          else if (e.done) { b.style.color = ''; b.innerHTML = 'Final ' + e.as + '–' + e.hs + (e.so ? ' (SO)' : (e.ot ? ' (OT)' : '')); }
        });
      } catch (e) { }
    }
    setInterval(actualizar, 20000); setTimeout(actualizar, 4000);
  })();

  /* ===== ÍCONOS en los títulos de sección ===== */
  (function () {
    try {
      const IC = {
        marcador: '<rect x="2" y="4.6" width="20" height="14.8" rx="2.4" fill="#22303E"/><rect x="2" y="4.6" width="20" height="14.8" rx="2.4" fill="none" stroke="#3A4D5F" stroke-width="1"/><path d="M5.4 8.4h4v3h-4zM5.4 12.6h4v3h-4z" fill="#F0B849"/><path d="M14.6 8.4h4v3h-4zM14.6 12.6h4v3h-4z" fill="#4F8FD6"/>',
        balanza: '<path d="M11.1 3.4h1.8v16.8h-1.8z" fill="#93A8BA"/><path d="M6.4 20.2h11.2v1.7H6.4zM3.4 7.7h17.2v1.7H3.4z" fill="#93A8BA"/><circle cx="12" cy="4.2" r="1.5" fill="#C7D3DE"/><path d="M3.6 9.6 1.3 14.5a3 3 0 0 0 5.6 0z" fill="#F0B849"/><path d="M20.4 9.6l2.3 4.9a3 3 0 0 1-5.6 0z" fill="#4F8FD6"/>',
        llama: '<path d="M12 2.2c3.1 4.5 5.3 6.6 5.3 10.1A5.3 5.3 0 0 1 12 17.6a5.3 5.3 0 0 1-5.3-5.3c0-2.1 1-3.5 2.3-4.5.2 1.3 1.1 2.6 2.2 2.6 0-3.4-1.1-5.6.8-8.2z" fill="#E8763C"/><path d="M12 9.8c1.4 2 2.3 3 2.3 4.4A2.3 2.3 0 0 1 12 16.5a2.3 2.3 0 0 1-2.3-2.3c0-1.1.6-2 1.3-2.6.1.6.5 1.2 1 1.2 0-1.5-.5-2.5 0-3z" fill="#F5CE6B"/>',
        libreta: '<path d="M5.4 3.6h11.4a2.2 2.2 0 0 1 2.2 2.2v14.6H7.6a2.2 2.2 0 0 1-2.2-2.2z" fill="#E9E3D6"/><path d="M5.4 16.6h13.6v3.8H7.6a2.2 2.2 0 0 1-2.2-2.2z" fill="#C9C0AD"/><path d="M8.4 7.4h7.6M8.4 10.4h7.6M8.4 13.4h5" stroke="#8A8271" stroke-width="1.3" stroke-linecap="round"/>',
        engrane: '<circle cx="12" cy="12" r="8.4" fill="#3A4D5F"/><path d="M12 2.4l1.5 2.2h-3zM12 21.6l-1.5-2.2h3zM2.4 12l2.2-1.5v3zM21.6 12l-2.2 1.5v-3zM5.2 5.2l2.6.5-2.1 2.1zM18.8 18.8l-2.6-.5 2.1-2.1zM18.8 5.2l-.5 2.6-2.1-2.1zM5.2 18.8l.5-2.6 2.1 2.1z" fill="#3A4D5F"/><circle cx="12" cy="12" r="3.4" fill="#0A1119"/>'
      };
      const MAPA = [[/forma reciente/i, 'llama'], [/margen de victoria|resultado a los 60|n[uú]meros clave/i, 'marcador'], [/escalera/i, 'balanza'], [/moneyline|h[aá]ndicap|l[ií]nea de gol|total de|l[ií]nea del mercado/i, 'balanza'], [/lesionados/i, 'libreta'], [/ajuste manual/i, 'engrane']];
      function procesar() {
        document.querySelectorAll('h3:not([data-ova])').forEach(h => {
          const t = (h.textContent || '').trim();
          for (const m of MAPA) {
            if (m[0].test(t)) {
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.style.flex = '0 0 auto';
              svg.innerHTML = IC[m[1]]; h.insertBefore(svg, h.firstChild); break;
            }
          }
          h.setAttribute('data-ova', '1');
        });
      }
      let pend = false;
      if (window.MutationObserver) new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; procesar(); }); }).observe(document.body, { childList: true, subtree: true });
      procesar();
    } catch (e) { }
  })();
})();
