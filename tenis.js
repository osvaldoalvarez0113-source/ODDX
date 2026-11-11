/* ===================================================================
   OVA · APP DE TENIS (tenis.html)
   - Partidos: ESPN (ATP y WTA, individuales), ayer / hoy / mañana, con marcador en vivo.
   - Ratings: ratings-tenis.json (lo escribe GitHub cada día con scripts/tenis_datos.js): Elo general + superficie,
     parámetros medidos y la medición completa (aciertos por tramo, sets, games).
   - Modelo: modelo-tenis.js (window.OVATenis).
   - Registro automático: guarda lo que dijo el modelo ANTES de cada partido y lo resuelve solo.
   =================================================================== */
(function () {
  'use strict';
  const T = window.OVATenis;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const K = { reg: 'ova_tenis_registro_v1', sup: 'ova_tenis_sup_v1', tour: 'ova_tenis_tour_v1' };
  const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/tennis/';
  const pct = (p, d) => (p == null || !isFinite(p)) ? '—' : (100 * p).toFixed(d == null ? 0 : d) + '%';
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const ymdLocal = t => { const d = new Date(t); return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()); };
  const ymdUTC = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
  const amer = p => { if (!p || p <= 0 || p >= 1) return '—'; const v = p >= 0.5 ? Math.round(-(p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100); return (v > 0 ? '+' : '') + v; };
  const flagUrl = c => c ? 'https://a.espncdn.com/i/teamlogos/countries/500/' + c + '.png' : '';
  async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

  let R = null;              // ratings-tenis.json
  let KAL = [];              // precios de Kalshi (rama kalshi, robot scripts/kalshi.js)
  const KURL = 'https://raw.githubusercontent.com/osvaldoalvarez0113-source/ODDX/kalshi/kalshi-tenis.json';
  const apellido = s => { const p = T.normNombre(s).split(' '); return p[p.length - 1] || ''; };
  // Medido (docs/MEDICION-TENIS-BATERIA-2026-11.md, 7,506 partidos): el precio de Kalshi acierta más que el modelo
  // (69.1% contra 65.6%) y el peso del modelo encima del mercado sale 0. Como en las otras apps: si hay precio, manda el mercado
  // y el modelo solo pone un 5%. Tramos: cuánto ganó el favorito de Kalshi según su %.
  const LAM_M = 0.05;
  const MER_BANDAS = [[.5, .55, 920, .501], [.55, .6, 1262, .571], [.6, .65, 1197, .642], [.65, .7, 1033, .686], [.7, .75, 908, .709], [.75, .8, 742, .782], [.8, .85, 586, .84], [.85, .9, 421, .898], [.9, 1.01, 437, .961]];
  // Kalshi del partido: mismo día (±1) y los dos apellidos. Devuelve {cA, cB} en centavos de compra y el % sin margen para A
  function kalshiDe(m) {
    const a = apellido(m.a.nombre), b = apellido(m.b.nombre); if (!a || !b || a === b) return null;
    const d0 = Date.parse(new Date(m.ts).toISOString().slice(0, 10));
    const g = KAL.find(x => Math.abs(Date.parse(x.d) - d0) <= 864e5 && x.e.length === 2 && x.e.some(e => apellido(e.n) === a) && x.e.some(e => apellido(e.n) === b));
    if (!g) return null;
    const eA = g.e.find(e => apellido(e.n) === a), eB = g.e.find(e => apellido(e.n) === b);
    return { cA: eA.c, cB: eB.c, pA: Math.min(Math.max((eA.c + 100 - eB.c) / 200, 0.01), 0.99), vol: (eA.vol || 0) + (eB.vol || 0) };
  }
  let PART = [];             // partidos de ESPN (ayer a pasado mañana)
  let TODOS = [];            // todo el cuadro de los torneos (para saber qué jugó cada uno ayer)
  let DIA = null, TOUR = LS.get(K.tour) || 't';
  const DIAG = { errores: [], pedidos: 0 };
  const setEstado = (t, c) => { const e = $('estado'); e.textContent = t; e.className = 'estado' + (c ? ' ' + c : ''); };

  /* ---------- jugadores ---------- */
  function jugador(id, nombre, rk, tour) {
    const r = R && R.jug && R.jug[id];
    const P = R && R.params && R.params[tour];
    if (r) return { id, nombre: r[0] || nombre, pais: r[1], all: r[3], sup: { H: r[4], C: r[5], G: r[6] }, n: r[7], nS: { H: r[8], C: r[9], G: r[10] }, rk: rk || r[11], forma: r[13] || '', pico: r[14] || r[3], conocido: true };
    const e = (P && P.prior && P.prior.usar !== false) ? T.prior(rk, P.prior) : (rk ? T.prior(rk) : 1500);
    return { id, nombre, pais: '', all: e, sup: { H: e, C: e, G: e }, n: 0, nS: { H: 0, C: 0, G: 0 }, rk: rk || 0, forma: '', conocido: false };
  }

  /* ---------- partidos de ESPN ---------- */
  const cod = href => { const m = /countries\/500\/([a-z]+)\.png/i.exec(href || ''); return m ? m[1].toLowerCase() : ''; };
  function leer(j, mapa) {
    ((j && j.events) || []).forEach(e => {
      (e.groupings || []).forEach(g => {
        const slug = (g.grouping && g.grouping.slug) || '';
        const tour = slug === 'mens-singles' ? 'a' : (slug === 'womens-singles' ? 'w' : null);
        if (!tour) return;
        (g.competitions || []).forEach(c => {
          if (!c.competitors || c.competitors.length !== 2) return;
          const ts = Date.parse(c.date || c.startDate); if (!isFinite(ts)) return;
          const st = (c.status && c.status.type) || {};
          const cs = c.competitors.slice().sort((x, y) => (x.order || 0) - (y.order || 0));
          const P = cs.map(x => ({
            id: String(x.id), nombre: (x.athlete && (x.athlete.displayName || x.athlete.fullName)) || 'Por definir',
            corto: (x.athlete && x.athlete.shortName) || '', pais: cod(x.athlete && x.athlete.flag && x.athlete.flag.href),
            rk: (x.curatedRank && x.curatedRank.current) || 0, gano: x.winner === true,
            sets: (x.linescores || []).map(s => s.value)
          }));
          if (P.some(x => !x.id || /^(tbd|tba|bye|qualifier|por definir)$/i.test(String(x.nombre).trim()))) return;
          mapa[c.id] = {
            id: String(c.id), ts, tour, ev: { id: String(e.id), n: e.name || '', mj: !!e.major }, ronda: (c.round && c.round.displayName) || '',
            a: P[0], b: P[1], estado: st.state || 'pre', nombreEst: st.name || '', det: st.shortDetail || st.detail || '',
            hora: c.timeValid !== false
          };
        });
      });
    });
  }
  async function cargarPartidos() {
    const ahora = Date.now(), dias = [ahora - 864e5, ahora, ahora + 864e5].map(ymdUTC);
    const urls = [];
    ['atp', 'wta'].forEach(t => { urls.push(ESPN + t + '/scoreboard'); [...new Set(dias)].forEach(d => urls.push(ESPN + t + '/scoreboard?dates=' + d)); });
    const mapa = {};
    await Promise.all(urls.map(u => getJSON(u).then(j => { DIAG.pedidos++; leer(j, mapa); }).catch(e => DIAG.errores.push(u.replace(ESPN, '') + ': ' + e.message))));
    // solo partidos de ayer a pasado mañana (ESPN manda el cuadro entero del torneo)
    const lim0 = ahora - 36 * 3600e3, lim1 = ahora + 60 * 3600e3;
    TODOS = Object.values(mapa);
    return Object.values(mapa).filter(m => (m.ts >= lim0 && m.ts <= lim1) || m.estado === 'in').sort((x, y) => x.ts - y.ts);
  }

  /* ---------- análisis ---------- */
  const esQ = r => /qualif/i.test(r || '');
  function supDe(m) { const o = LS.get(K.sup) || {}; return o[m.ev.id] || T.superficie(m.ev.n, m.ts); }
  function analisis(m) {
    const sup = supDe(m);
    if (m._an && m._an.sup === sup) return m._an;
    const P = (R && R.params && R.params[m.tour]) || { w: 0.25, bo5: false };
    const A = jugador(m.a.id, m.a.nombre, m.a.rk, m.tour), B = jugador(m.b.id, m.b.nombre, m.b.rk, m.tour);
    const bestOf = (m.ev.mj && m.tour === 'a' && !esQ(m.ronda)) ? 5 : 3;
    const rA = T.rating(A, sup, P.w), rB = T.rating(B, sup, P.w), pElo = T.probElo(rA, rB);
    const p3 = T.ajustar(pElo, T.rasgos(A, B), P.aj);   // corrección medida: pocos partidos en la base y lejos de su mejor nivel
    let pMod = p3;
    if (bestOf === 5 && P.bo5 === true) { const d = T.ventaja(p3, 0.63, 0.63); pMod = T.pMatchRapido(0.63 + d, 0.63 - d, 5); }
    const k = kalshiDe(m), lg = x => Math.log(x / (1 - x)), cl = x => Math.min(Math.max(x, 0.01), 0.99);
    const pGana = k ? 1 / (1 + Math.exp(-((1 - LAM_M) * lg(cl(k.pA)) + LAM_M * lg(cl(pMod))))) : pMod;
    const an = { sup, bestOf, rA, rB, pElo, p3, pMod, pGana, A, B, k, conMercado: !!k };
    an.favA = pGana >= 0.5; an.pFav = Math.max(pGana, 1 - pGana);
    an.fav = an.favA ? A : B; an.rival = an.favA ? B : A;
    an.poco = Math.min(A.n, B.n) < 10;
    an.hist = k ? (b => b ? { de: b[0], a: b[1], n: b[2], gano: b[3], mer: true } : null)(MER_BANDAS.find(b => an.pFav >= b[0] && an.pFav < b[1])) : historico(m.tour, an.pFav, an.poco);
    an.modFav = an.favA ? pMod : 1 - pMod;
    an.t = T.deTabla(T.tablaDe(R && R.emp && R.emp[m.tour], sup, an.pFav, bestOf === 5));
    return (m._an = an);
  }
  // cuánto ganó de verdad el favorito en ese tramo de probabilidad (medición en ratings-tenis.json)
  function historico(tour, p, poco) {
    const M = R && R.medicion && R.medicion[tour]; if (!M) return null;
    const lista = (!poco && M.bandasConDatos) ? M.bandasConDatos : M.bandas;
    const b = (lista || []).find(x => p >= x.de && p < x.a + (x.a >= 1 ? 0.01 : 0));
    return b && b.n ? b : null;
  }
  // ¿jugó hace menos de 30 h un partido largo? (medido: el favorito cansado gana menos de lo que dice el modelo)
  function cansado(m, j) {
    let mejor = null;
    TODOS.forEach(x => { if (x.estado !== 'post' || x.id === m.id || !(x.ts < m.ts && m.ts - x.ts < 30 * 3600e3)) return; if (x.a.id !== j.id && x.b.id !== j.id) return; const g = x.a.sets.concat(x.b.sets).reduce((s, v) => s + (+v || 0), 0); if (!mejor || x.ts > mejor.ts) mejor = { ts: x.ts, g }; });
    return mejor && mejor.g >= 30 ? mejor : null;
  }
  function senal(an) {
    const g = an.hist ? an.hist.gano : an.pFav;
    if (an.poco && !an.conMercado) return { c: 'mid', t: 'Con cuidado: hay pocos partidos de ' + (Math.min(an.A.n, an.B.n) === an.A.n ? an.A.nombre : an.B.nombre) + ' en la base' };
    if (g >= 0.78) return { c: 'ok', t: 'Pick fuerte' };
    if (g >= 0.66) return { c: 'ok', t: 'Pick sólido' };
    if (g >= 0.58) return { c: 'mid', t: 'Ventaja ligera' };
    return { c: 'bad', t: 'Parejo: mejor no jugarlo' };
  }

  /* ---------- registro automático ---------- */
  const regGet = () => LS.get(K.reg) || [];
  const regSet = r => LS.set(K.reg, r.slice(-3000));
  function registrar(lista) {
    const reg = regGet(), ids = {}; reg.forEach(p => ids[p.id] = p); let cambio = false;
    lista.forEach(m => {
      if (m.estado === 'pre' && !ids[m.id] && m.ts - Date.now() < 30 * 3600e3) {
        const an = analisis(m);
        const p = { id: m.id, ts: m.ts, tour: m.tour, ev: m.ev.n, ronda: m.ronda, sup: an.sup, a: m.a.nombre, b: m.b.nombre, pick: an.fav.nombre, pickId: an.fav.id, p: +an.pFav.toFixed(4), mer: an.conMercado, poco: an.poco, guardado: Date.now(), res: null };
        reg.push(p); ids[m.id] = p; cambio = true;
      }
      const p = ids[m.id];
      if (p && !p.res && m.estado === 'post') {
        const g = m.a.gano ? m.a : (m.b.gano ? m.b : null);
        if (/WALKOVER|RETIRED|CANCEL/i.test(m.nombreEst) || !g) p.res = 'N';
        else p.res = g.id === p.pickId ? 'V' : 'D';
        p.marcador = m.a.sets.map((s, i) => s + '-' + (m.b.sets[i] == null ? '' : m.b.sets[i])).join(' ');
        cambio = true;
      }
    });
    if (cambio) regSet(reg);
  }
  async function verificarViejos() {
    const reg = regGet(), pend = reg.filter(p => !p.res && p.ts < Date.now() - 4 * 3600e3 && p.ts > Date.now() - 21 * 864e5);
    if (!pend.length) return;
    const dias = [...new Set(pend.map(p => ymdUTC(p.ts)))].slice(0, 8), mapa = {};
    await Promise.all([].concat(...dias.map(d => ['atp', 'wta'].map(t => getJSON(ESPN + t + '/scoreboard?dates=' + d).then(j => leer(j, mapa)).catch(() => { })))));
    registrar(Object.values(mapa));
  }

  /* ---------- pintar: selector de día y circuito ---------- */
  function diasDisp() { const s = {}; PART.forEach(m => s[ymdLocal(m.ts)] = 1); return Object.keys(s).sort(); }
  function nomDia(k) {
    const hoy = ymdLocal(Date.now()), man = ymdLocal(Date.now() + 864e5), ay = ymdLocal(Date.now() - 864e5);
    if (k === hoy) return 'Hoy'; if (k === man) return 'Mañana'; if (k === ay) return 'Ayer';
    const d = new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)); return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' });
  }
  function filtrados() { return PART.filter(m => ymdLocal(m.ts) === DIA && (TOUR === 't' || m.tour === TOUR)); }
  function pintarSelector() {
    const ds = diasDisp(); if (!DIA || ds.indexOf(DIA) < 0) DIA = ds.indexOf(ymdLocal(Date.now())) >= 0 ? ymdLocal(Date.now()) : (ds.find(d => d >= ymdLocal(Date.now())) || ds[ds.length - 1]);
    const t = [['t', 'Todos'], ['a', 'ATP'], ['w', 'WTA']];
    const html = ds.map(d => `<button class="diaBtn${d === DIA ? ' on' : ''}" data-d="${d}">${esc(nomDia(d))}</button>`).join('') + '<span class="sepTour"></span>' + t.map(([k, n]) => `<button class="diaBtn tourBtn${k === TOUR ? ' on' : ''}" data-t="${k}">${n}</button>`).join('');
    ['diaSel', 'diaSel2'].forEach(id => {
      const el = $(id); if (!el) return; el.innerHTML = html;
      el.onclick = e => { const b = e.target.closest('.diaBtn'); if (!b) return; if (b.dataset.d) DIA = b.dataset.d; if (b.dataset.t) { TOUR = b.dataset.t; LS.set(K.tour, TOUR); } pintarTodo(); };
    });
  }

  /* ---------- pintar: juegos ---------- */
  const horaTxt = m => m.hora ? new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Por definir';
  function marcadorTxt(m) { if (!m.a.sets.length) return ''; return m.a.sets.map((s, i) => s + '-' + (m.b.sets[i] == null ? '' : m.b.sets[i])).join(' '); }
  function chipHora(m) {
    if (m.estado === 'in') return `<div class="hora vivo">🔴 ${esc(marcadorTxt(m))}<br><small>${esc(m.det)}</small></div>`;
    if (m.estado === 'post') return `<div class="hora">${/WALKOVER/i.test(m.nombreEst) ? 'W.O.' : (/RETIRED/i.test(m.nombreEst) ? 'Retiro' : 'Final')}<br><small>${esc(marcadorTxt(m))}</small></div>`;
    return `<div class="hora">${esc(horaTxt(m))}</div>`;
  }
  function filaJug(j, p, fav, gano) {
    const img = j.pais ? `<img src="${flagUrl(j.pais)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="sinBand"></span>';
    return `<div class="eq${gano ? ' gano' : ''}">${img}<span class="n">${esc(j.nombre)}</span>${j.rk ? `<span class="tag">#${j.rk}</span>` : ''}<span class="pj${fav ? ' fav' : ''}">${pct(p)}</span></div>`;
  }
  function pintarJuegos() {
    const box = $('juegos'), L = filtrados();
    if (!L.length) { box.innerHTML = vacio('No hay partidos', 'Ese día no hay individuales ' + (TOUR === 'a' ? 'de la ATP' : TOUR === 'w' ? 'de la WTA' : 'ATP ni WTA') + ' en ESPN. Prueba otro día o el otro circuito.'); return; }
    const grupos = {}; L.forEach(m => { const k = m.ev.n + '|' + m.tour; (grupos[k] = grupos[k] || []).push(m); });
    box.innerHTML = Object.keys(grupos).map(k => {
      const ms = grupos[k], m0 = ms[0];
      return `<div class="diaHead">${m0.tour === 'a' ? 'ATP' : 'WTA'} · ${esc(m0.ev.n)} <span class="supTag s${supDe(m0)}">${T.SUP_TXT[supDe(m0)]}</span></div>` + ms.map(m => {
        const an = analisis(m);
        return `<div class="game" data-id="${m.id}"><div class="head"><div class="crestpair">${filaJug(m.a.nombre ? Object.assign({}, an.A, { nombre: m.a.nombre, pais: m.a.pais || an.A.pais }) : an.A, an.pGana, an.favA, m.a.gano)}${filaJug(Object.assign({}, an.B, { nombre: m.b.nombre, pais: m.b.pais || an.B.pais }), 1 - an.pGana, !an.favA, m.b.gano)}<div class="ronda">${esc(m.ronda)}${an.bestOf === 5 ? ' · a 5 sets' : ''}</div><span class="match" style="display:none"><small>${esc(m.ronda)}${an.bestOf === 5 ? ' · a 5 sets' : ''}</small></span></div>${chipHora(m)}<div class="chev">⌄</div></div><div class="body">${kpiOculto(an)}</div></div>`;
      }).join('');
    }).join('');
    // lo mismo que dejan las otras apps en cada tarjeta: los diseños de adentro (Boleto, Duelo, Bento…) leen esto
    box.querySelectorAll('.game').forEach(g => { const m = PART.find(x => x.id === g.dataset.id); if (!m || !m._an) return; g._calc = { pA: 100 * m._an.pGana, pH: 100 * (1 - m._an.pGana), nomA: m.a.corto || m.a.nombre, nomH: m.b.corto || m.b.nombre }; const ab = j => (apellido(j.nombre).slice(0, 3) || '?').toUpperCase(); g.setAttribute('data-ab-a', ab(m.a)); g.setAttribute('data-ab-h', ab(m.b)); });
    box.querySelectorAll('.game .head').forEach(h => h.onclick = () => {
      const g = h.parentNode, m = PART.find(x => x.id === g.dataset.id);
      g.classList.toggle('open'); if (g.classList.contains('open')) pintarCuerpo(g.querySelector('.body'), m, 'ver');
    });
  }
  // dato escondido para los diseños de adentro (Boleto, Duelo…): leen la «cuota justa» de un .kpi como en las otras apps
  const kpiOculto = an => `<div class="kpi" style="display:none !important"><div><b>${amer(an.pFav).replace('-', '−')}</b><small>Cuota justa</small></div></div>`;
  function vacio(t, d) { return `<div class="vacio"><div class="vico"><div class="anillo"></div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M4.5 6.5c3 2.5 3 8.5 0 11M19.5 6.5c-3 2.5-3 8.5 0 11"/></svg></div><b>${esc(t)}</b>${esc(d)}</div>`; }

  /* ---------- cuerpo: Veredicto · Mercados · Jugadores ---------- */
  function pintarCuerpo(bd, m, tab) {
    const an = analisis(m);
    const tabs = [['ver', 'Veredicto'], ['mer', 'Sets y games'], ['jug', 'Jugadores']];
    bd.innerHTML = `<div class="tabs">${tabs.map(([k, n]) => `<button class="tb${k === tab ? ' on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div class="pane on"></div>${kpiOculto(an)}`;
    bd.querySelector('.tabs').onclick = e => { const b = e.target.closest('.tb'); if (b) pintarCuerpo(bd, m, b.dataset.t); };
    const pane = bd.querySelector('.pane');
    if (tab === 'ver') pane.innerHTML = htmlVeredicto(m, an);
    if (tab === 'mer') pane.innerHTML = htmlMercados(m, an);
    if (tab === 'jug') pane.innerHTML = htmlJugadores(m, an);
    const sel = pane.querySelector('.supSel');
    if (sel) sel.onchange = () => { const o = LS.get(K.sup) || {}; o[m.ev.id] = sel.value; LS.set(K.sup, o); PART.forEach(x => { if (x.ev.id === m.ev.id) x._an = null; }); pintarJuegos(); const g = document.querySelector('#juegos .game[data-id="' + m.id + '"]'); if (g) { g.classList.add('open'); pintarCuerpo(g.querySelector('.body'), m, tab); } };
    const inp = pane.querySelector('.cuotaIn');
    if (inp) inp.oninput = () => {
      const out = pane.querySelector('.rvVal'), v = +inp.value, p = parseFloat(inp.dataset.p), fm = inp.dataset.m === '1';
      if (!v || isNaN(v)) { out.className = 'rvVal'; out.textContent = ''; return; }
      const am = Math.abs(v) < 100 ? (q => q >= 0.5 ? Math.round(-(q / (1 - q)) * 100) : Math.round(((1 - q) / q) * 100))(Math.abs(v) / 100) : v;   // 55 = 55¢
      const dec = am > 0 ? am / 100 + 1 : 100 / (-am) + 1, ev = p * dec - 1, imp = am > 0 ? 100 / (am + 100) : -am / (-am + 100), dif = (p - imp) * 100, jt = amer(p);
      if (ev > 0 && ev < 0.02) { out.className = 'rvVal'; out.innerHTML = `≈ <b>Valor mínimo:</b> paga un poco más que la cuota justa (${jt}), pero +${(ev * 100).toFixed(1)}% está dentro del margen de error del precio de referencia. No cuenta como pick; busca +2% o más.`; }
      else if (ev > 0) { out.className = 'rvVal ok'; out.innerHTML = `✓ <b>Hay valor:</b> te pagan más que la cuota justa (${jt}). Ganancia esperada: +${(ev * 100).toFixed(1)}% por cada $1 (${dif.toFixed(1)} pts de ventaja).` + (fm ? '' : ' Ojo: sale del modelo, que no le gana al mercado; desconfía.'); }
      else { out.className = 'rvVal no'; out.innerHTML = `✗ <b>No hay valor:</b> la cuota justa es ${jt} y esta paga menos. Pérdida esperada: ${(ev * 100).toFixed(1)}% por cada $1.`; }
    };
  }
  /* Veredicto con la misma forma que NBA, NHL y NFL (usdeporte.js): aro, barra, Pronóstico y pick, ¿Hay pick?,
     Modelo contra mercado y Qué tan confiable es. Más abajo, lo de tenis: sets y games medidos. */
  function ringSvg(pA, pH) {
    const g = 1.4, d = 'M 50 8 A 42 42 0 1 1 49.99 8';
    const seg = (p, cls, ini) => `<path class="sg ${cls}" d="${d}" pathLength="100" style="stroke-dasharray:${Math.max(0.1, p * 100 - g).toFixed(2)} 100;stroke-dashoffset:-${(ini * 100 + g / 2).toFixed(2)}"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="${d}" pathLength="100"/>${seg(pA, 'aw', 0)}${seg(pH, 'fv', pA)}</svg>`;
  }
  const corto = j => j.corto || j.nombre;
  function htmlVeredicto(m, an) {
    const fav = an.fav, riv = an.rival, k = an.k, pf = an.pFav, h = an.hist;
    const pB = 1 - an.pGana, pA = an.pGana;   // en el aro: A a la izquierda, B a la derecha
    const imgA = m.a.pais || an.A.pais, imgB = m.b.pais || an.B.pais;
    let o = `<div class="hero">
      <div class="side${an.favA ? ' fav' : ''}">${imgA ? `<img src="${flagUrl(imgA)}" alt="" onerror="this.style.display='none'">` : ''}<span class="ab">${esc(corto(m.a))}</span><span class="pc">${pct(pA, 1)}</span></div>
      <div class="mid"><div class="gz">${ringSvg(pA, pB)}<div class="cx"><b>${amer(pf)}</b><small>${esc(apellido(fav.nombre).replace(/^./, c => c.toUpperCase()))}</small></div></div></div>
      <div class="side${!an.favA ? ' fav' : ''}">${imgB ? `<img src="${flagUrl(imgB)}" alt="" onerror="this.style.display='none'">` : ''}<span class="ab">${esc(corto(m.b))}</span><span class="pc">${pct(pB, 1)}</span></div>
     </div>
     <div class="bar"><span class="a" style="flex-grow:${Math.max(pA, 0.08)}">${pct(pA, 1)}</span><span class="h" style="flex-grow:${Math.max(pB, 0.08)}">${pct(pB, 1)}</span></div>
     <div class="nota" style="margin:6px 0 0;text-align:center">${k ? 'Probabilidades del mercado (Kalshi, sin margen) + 5% del modelo' : 'Probabilidades del modelo (sin precio de mercado)'} · ${T.SUP_TXT[an.sup].toLowerCase()}${an.bestOf === 5 ? ' · a 5 sets' : ''}</div>`;
    // señal modelo contra mercado (mismas frases que las otras apps)
    const modF = an.modFav, gap = k ? Math.abs((an.favA ? an.pMod : 1 - an.pMod) - (an.favA ? k.pA : 1 - k.pA)) * 100 : null, favModIgual = modF >= 0.5;
    const pctNf = ` en ${esc(fav.nombre)} (modelo solo ${Math.round(modF * 100)}%, mercado ${Math.round(pf * 100)}%)`;
    const sig = !k ? '<span class="rvSig mid">! Sin precio del mercado para este partido: pronóstico solo del modelo</span>' :
      (gap <= 3 && favModIgual ? '<span class="rvSig ok">✓ Modelo y mercado coinciden</span>' :
        (gap <= 7 && favModIgual ? `<span class="rvSig mid">≈ Diferencia de ${gap.toFixed(0)} pts de probabilidad${pctNf} · confía más en el mercado</span>` :
          `<span class="rvSig bad">✗ Discrepan ${gap.toFixed(0)} pts de probabilidad${pctNf} · créele al mercado</span>`)) +
      (k && !favModIgual ? `<div class="rvP" style="margin-top:7px">Modelo solo: <b>${esc(riv.nombre)}</b> (${Math.round((1 - modF) * 100)}%). Mercado: <b>${esc(fav.nombre)}</b> (${Math.round(pf * 100)}%).</div>` : '');
    const acH = h ? `<div class="rvP rvAc" style="margin-top:9px">📊 <b>Cuántas veces acierta este %:</b> cuando ${h.mer ? 'Kalshi' : 'el modelo'} le dio ${Math.round(h.de * 100)}-${Math.round(Math.min(h.a, 1) * 100)}% al favorito, ganó <b>${Math.round(h.gano * h.n).toLocaleString('es')} de ${h.n.toLocaleString('es')}</b> partidos (${Math.round(h.gano * 100)}%).</div>` : '';
    const umbral = 0.6;
    o += `<div class="rv"><h4>Pronóstico y pick</h4><div class="rvMain"><div class="rvT">Pronóstico</div><div class="rvH">${pf >= umbral ? esc(fav.nombre) + ' gana · ' + Math.round(pf * 100) + '%' : 'Partido parejo'}</div>
     <div class="rvP">${pf >= umbral ? 'Es el favorito' + (k ? ' según el mercado (Kalshi, sin margen).' : ' según el modelo.') : 'Ninguno pasa del 60%. Lo más probable: ' + esc(fav.nombre) + ' ' + Math.round(pf * 100) + '%.'}${an.bestOf === 5 ? ' Grand Slam a 5 sets.' : ''}</div>${sig}${acH}
     <div class="rvP" style="margin-top:9px"><b>¿Hay pick?</b> Solo si te pagan más de <b>${amer(pf)}</b> por ${esc(fav.nombre)}${k ? '' : ' (cuota del modelo, menos confiable)'}. Escribe la que te dan:</div><div class="rvIn"><label>Cuota que te pagan por ${esc(fav.nombre)}</label><input type="number" inputmode="decimal" class="cuotaIn" placeholder="-150 ó 55¢" data-p="${pf}" data-m="${k ? 1 : 0}"><div class="rvVal"></div></div></div>`;
    // modelo contra mercado
    const row = (n, mo, mk) => `<div class="nm">${esc(n)} gana</div><div class="n md">${pct(mo, 1)}</div><div class="n mk">${mk === null ? '—' : pct(mk, 1)}</div><div class="n">${amer(mk === null ? mo : mk)}</div>`;
    o += `<h4>Modelo contra mercado</h4><div class="rvTab"><div class="th">Resultado</div><div class="th n">Modelo</div><div class="th n">Mercado</div><div class="th n">Cuota justa</div>${row(m.a.nombre, an.pMod, k ? k.pA : null)}${row(m.b.nombre, 1 - an.pMod, k ? 1 - k.pA : null)}</div>
     <div class="nota" style="margin-top:6px">Mercado = ${k ? `Kalshi (${esc(corto(m.a))} ${k.cA}¢ · ${esc(corto(m.b))} ${k.cB}¢)` : 'sin precio todavía'}.</div>`;
    // qué tan confiable es
    const L = (c, t) => `<div><i class="${c}">${c === 'ok' ? '✓' : (c === 'w' ? '!' : '✗')}</i><span>${t}</span></div>`;
    const li = [];
    li.push(k ? L('ok', 'Precio de Kalshi (se actualiza cada pocas horas).') : L('w', 'Sin precio del mercado para este partido.'));
    const cF = cansado(m, fav), cR = cansado(m, riv), Cm = R && R.medicion && R.medicion[m.tour] && R.medicion[m.tour].cansancio;
    if (cF) li.push(L('w', `<b>${esc(fav.nombre)} jugó hace poco un partido de ${cF.g} games.</b>${Cm && Cm.fav.n ? ` Medido: el favorito en esa situación ganó el ${pct(Cm.fav.gano, 1)} cuando el modelo decía ${pct(Cm.fav.dice, 1)} (${Cm.fav.n} partidos).` : ''}${k ? ' El precio ya lo puede incluir.' : ' El cálculo no lo descuenta.'}`));
    else li.push(L('ok', `${esc(fav.nombre)} no viene de un partido largo ayer.`));
    if (cR) li.push(L('ok', `${esc(riv.nombre)} jugó hace poco un partido de ${cR.g} games.`));
    if (an.poco) li.push(L('w', `${esc(an.A.n < an.B.n ? an.A.nombre : an.B.nombre)} tiene ${Math.min(an.A.n, an.B.n)} partidos en la base (ATP/WTA desde 2023): su rating sale casi todo del ranking.${k ? ' Aquí el mercado sabe mucho más que el modelo.' : ''}`));
    if (/qualif/i.test(m.ronda)) li.push(L('w', 'Clasificación: es donde el modelo más se equivoca (acierta 63% contra 70% del mercado).'));
    li.push(L('w', 'Retiros: ~3% de los partidos terminan por retiro; cada casa los paga distinto.'));
    o += `<h4>Qué tan confiable es</h4><div class="rvLs">${li.join('')}</div>`;
    // sets y games (lo propio del tenis)
    const t = an.t;
    if (t) {
      const lT = t.mediana + 0.5, Rv = esc(riv.nombre), F = esc(fav.nombre);
      const lado = (p, si, no) => p >= 0.5 ? [p, si] : [1 - p, no];
      const items = [lado(t.set1, F + ' gana el 1er set', Rv + ' gana el 1er set'), lado(t.sinSet, F + ' gana sin perder set', Rv + ' gana al menos un set'), lado(t.cubre(-3.5), F + ' −3.5 games', Rv + ' +3.5 games')];
      o += `<h4>Sets y games (medido)</h4><div class="rvLs">${items.map(([p, txt]) => L(p >= 0.6 ? 'ok' : 'w', txt + ': ' + pct(p))).join('')}${L('x', `Total: lo normal son ${t.mediana} games (más de ${lT}: ${pct(t.masDe(lT))}). Sin ventaja medida: solo referencia.`)}</div>`;
    }
    o += `</div>`;
    try { if (window.OVAForma) o += window.OVAForma.tenis(an.A.forma, an.B.forma, an.A.nombre, an.B.nombre, pA); } catch (e) {}
    o += `<details class="comoLee"><summary>Superficie</summary><div class="ajuste" style="margin-top:8px"><div><label>Si ESPN no la dice bien, cámbiala</label><select class="supSel">${['H', 'C', 'G'].map(x => `<option value="${x}"${x === an.sup ? ' selected' : ''}>${T.SUP_TXT[x]}</option>`).join('')}</select></div></div></details>`;
    o += `<details class="comoLee"><summary>¿Cómo se lee y qué tan confiable es?</summary><div class="nota"><b>Los dos porcentajes de arriba</b> son la probabilidad de que gane cada jugador. <b>Cuota justa</b> es lo que tendría que pagar la casa para que apostar ahí no gane ni pierda. <b>Qué tan confiable es:</b> en 7,506 partidos con precio de Kalshi el mercado acertó 69.1% contra 65.6% del modelo, por eso si hay precio manda el mercado (95%). <b>El modelo:</b> Elo general + ${R && R.params && R.params[m.tour] ? Math.round(R.params[m.tour].w * 100) : 25}% superficie con todos los partidos ATP/WTA desde 2023, corregido por dos cosas medidas (pocos partidos en la base y lejos de su mejor nivel). Sets y games salen de lo que pasó en miles de partidos con un favorito de ese mismo %.</div></details>`;
    return o;
  }
  function htmlMercados(m, an) {
    const t = an.t; if (!t) return '<div class="nota">Sin tabla medida para este partido.</div>';
    const F = esc(an.fav.nombre), Rv = esc(an.rival.nombre), cinco = an.bestOf === 5;
    const filaP = (txt, p) => `<div class="linea"><span>${txt}</span><b>${pct(p)} · ${amer(p)}</b></div>`;
    let o = `<h4 class="h4">Resultado en sets</h4><div class="lineas">${filaP(F + (cinco ? ' 3-0' : ' 2-0'), t.sinSet)}${filaP(F + (cinco ? ' 3-1 o 3-2' : ' 2-1'), t.conSet)}${filaP(Rv + (cinco ? ' 3-1 o 3-2' : ' 2-1'), t.pierdeCon)}${filaP(Rv + (cinco ? ' 3-0' : ' 2-0'), t.pierdeSin)}</div>`;
    o += `<h4 class="h4">Primer set</h4><div class="lineas">${filaP(F, t.set1)}${filaP(Rv, 1 - t.set1)}</div>`;
    o += `<h4 class="h4">Hándicap de games</h4><div class="lineas">${[-1.5, -2.5, -3.5, -4.5, -5.5, -6.5].map(L => filaP(F + ' ' + L, t.cubre(L))).join('')}${[2.5, 3.5, 4.5].map(L => filaP(Rv + ' +' + L, 1 - t.cubre(-L))).join('')}</div>`;
    const base = t.mediana, lineas = [-2, -1, 0, 1, 2].map(d => base + d + 0.5);
    o += `<h4 class="h4">Total de games (lo normal: ${t.mediana})</h4><div class="lineas">${lineas.map(L => { const p = t.masDe(L); return `<div class="linea"><span>Más de ${L} / Menos</span><b>${pct(p)} · ${pct(1 - p)}</b></div>`; }).join('')}</div>`;
    const Md = R && R.medicion && R.medicion[m.tour] || {}, h = Md.handicap && Md.handicap[an.sup], ss = Md.sinSet && Md.sinSet[an.sup], to = Md.totales && Md.totales[an.sup];
    const linea = (x, nom) => x && x.n ? `${nom} ${pct(x.acierto)} (si el % pasa de 58: ${pct(x.fuertes.acierto)})` : '';
    o += `<div class="nota">Salen de ${t.n.toLocaleString('es')} partidos ${m.tour === 'a' ? 'ATP' : 'WTA'} ${cinco ? 'de Grand Slam ' : ''}con un favorito de ${Math.round(an.pFav * 100)}% aprox. Acierto real en 2026 eligiendo el lado más probable: ${[linea(ss, 'sin perder set'), linea(h, '−3.5 games'), linea(to, 'total')].filter(Boolean).join(' · ') || 'sin datos'}. El total no le gana a apostar siempre lo más común: solo referencia.</div>`;
    return o;
  }
  function htmlJugadores(m, an) {
    const fila = (j, mj) => {
      const f = (j.forma || '').split('').map(x => `<span class="${x}">${x}</span>`).join('');
      return `<div class="observ"><b>${esc(mj.nombre)}</b>${j.rk ? ' · #' + j.rk : ''}<div class="kpi"><div><b>${Math.round(j.all)}</b><small>Elo general</small></div><div><b>${Math.round(j.sup[an.sup] == null ? j.all : j.sup[an.sup])}</b><small>Elo ${T.SUP_TXT[an.sup].toLowerCase()}</small></div><div><b>${j.n}</b><small>partidos (${j.nS[an.sup] || 0} en ${T.SUP_TXT[an.sup].toLowerCase()})</small></div><div><b>${Math.round(j.pico || j.all)}</b><small>su mejor Elo</small></div></div>${f ? `<div class="nota" style="margin:0 0 4px">Últimos ${j.forma.length} (más reciente a la derecha)</div><div class="forma">${f}</div>` : '<div class="nota">Sin partidos en la base: rating sacado del ranking.</div>'}</div>`;
    };
    return fila(an.A, m.a) + fila(an.B, m.b) + `<div class="nota">Elo: 1500 es un jugador promedio de la base; +100 puntos ≈ 64% de ganar. La forma es V (ganó) / D (perdió).</div>`;
  }

  /* ---------- Picks del día (Al gane) ---------- */
  function pintarPicks() {
    const box = $('picks'); let L = filtrados().filter(m => m.estado !== 'post'), aviso = '';
    if (!L.length) { const otro = diasDisp().find(d => d > DIA && PART.some(m => ymdLocal(m.ts) === d && m.estado === 'pre' && (TOUR === 't' || m.tour === TOUR))); if (otro) { L = PART.filter(m => ymdLocal(m.ts) === otro && m.estado !== 'post' && (TOUR === 't' || m.tour === TOUR)); aviso = '<div class="aviso">Ese día ya terminó: estos son los de ' + esc(nomDia(otro).toLowerCase()) + '.</div>'; } }
    if (!L.length) { box.innerHTML = vacio('Sin partidos por jugar', 'No quedan partidos ese día. Mira mañana o cambia de circuito.'); return; }
    const clave = an => (an.hist ? an.hist.gano : an.pFav) - (an.poco ? 0.15 : 0);
    const filas = L.map(m => ({ m, an: analisis(m) })).sort((x, y) => clave(y.an) - clave(x.an));
    box.innerHTML = aviso + filas.map(({ m, an }, i) => {
      const s = senal(an), h = an.hist;
      return `<div class="fila-rank" data-id="${m.id}"><span class="pos">${i + 1}</span>${an.fav.pais ? `<img src="${flagUrl(an.fav.pais)}" alt="" onerror="this.remove()">` : ''}<div class="nom">${esc(an.fav.nombre)}<small>vs ${esc(an.rival.nombre)} · ${m.tour === 'a' ? 'ATP' : 'WTA'} ${esc(m.ev.n)} · ${esc(horaTxt(m))}${m.estado === 'in' ? ' · 🔴 en vivo' : ''}</small><small class="sig ${s.c}">${esc(s.t)}${h ? ' · en la medición ganó ' + pct(h.gano) : ''}</small></div><span class="pct">${pct(an.pFav)}</span></div>`;
    }).join('') + `<div class="nota">Ordenado por lo que de verdad ganó el favorito en ese tramo. Con precio de Kalshi manda el mercado (acierta más que el modelo: 69% contra 66%); sin precio, el modelo. "Pocos partidos" = uno de los dos casi no juega ATP/WTA: su número es menos fiable.</div>`;
    box.querySelectorAll('.fila-rank').forEach(f => f.onclick = () => {
      irA('vJuegos'); const g = document.querySelector('#juegos .game[data-id="' + f.dataset.id + '"]');
      if (g) { g.classList.add('open'); pintarCuerpo(g.querySelector('.body'), PART.find(x => x.id === f.dataset.id), 'ver'); g.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    });
  }

  /* ---------- Registro ---------- */
  function pintarRegistro() {
    const reg = regGet().slice().sort((a, b) => b.ts - a.ts), box = $('registro');
    const hechos = reg.filter(p => p.res === 'V' || p.res === 'D');
    const v = hechos.filter(p => p.res === 'V').length;
    if (!reg.length) { box.innerHTML = vacio('Todavía no hay picks', 'Cada vez que abres la app se guarda solo lo que dijo el modelo antes de cada partido. Cuando terminen, aquí ves cuántos acertó.'); return; }
    const tramos = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 1.01]].map(([a, b]) => { const ps = hechos.filter(p => p.p >= a && p.p < b); const g = ps.filter(p => p.res === 'V').length; return { a, b, n: ps.length, g }; });
    let o = `<div class="kpi"><div><b>${hechos.length ? pct(v / hechos.length, 1) : '—'}</b><small>aciertos</small></div><div><b>${v}-${hechos.length - v}</b><small>ganados-perdidos</small></div><div><b>${reg.filter(p => !p.res).length}</b><small>por jugarse</small></div></div>`;
    o += `<table class="tabla-bt"><tr><th>Prob. del pick</th><th>Picks</th><th>Acertó</th><th>Esperado</th></tr>${tramos.map(t => `<tr><td>${Math.round(t.a * 100)}–${Math.min(100, Math.round(t.b * 100))}%</td><td>${t.n}</td><td>${t.n ? pct(t.g / t.n) : '—'}</td><td>${Math.round((t.a + Math.min(t.b, 1)) * 50)}%</td></tr>`).join('')}</table>`;
    o += reg.slice(0, 60).map(p => `<div class="linea"><span>${p.res === 'V' ? '✅' : p.res === 'D' ? '❌' : p.res === 'N' ? '⚪' : '⏳'} <b>${esc(p.pick)}</b> <small style="color:var(--mut2)">vs ${esc(p.pick === p.a ? p.b : p.a)} · ${esc(p.ev)} · ${new Date(p.ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })}${p.marcador ? ' · ' + esc(p.marcador) : ''}</small></span><b>${pct(p.p)}</b></div>`).join('');
    o += `<div class="nota">⚪ = W.O., retiro o cancelado: no cuenta. Se guarda solo (hasta 30 h antes) y no se cambia después, para que la cuenta sea honesta.</div>`;
    box.innerHTML = o;
  }

  /* ---------- Medición ---------- */
  function pintarMedicion() {
    const box = $('medicion');
    if (!R || !R.medicion) { box.innerHTML = vacio('Sin medición', 'Todavía no llegó ratings-tenis.json.'); return; }
    let o = `<div class="nota" style="margin-top:12px">Cada partido de 2024 a hoy se predijo usando <b>solo lo que había antes de jugarse</b> y se comparó con el resultado. Datos: ESPN, ATP y WTA (sin Challengers ni ITF). Actualizado ${new Date(R.gen).toLocaleDateString('es', { day: 'numeric', month: 'short' })} · ${R.partidos.toLocaleString('es')} partidos en la base.</div>`;
    ['a', 'w'].forEach(t => {
      const M = R.medicion[t]; if (!M) return;
      const P = R.params[t];
      o += `<h3>${t === 'a' ? 'ATP' : 'WTA'}</h3><div class="kpi"><div><b>${pct(M.global.acierto, 1)}</b><small>acierta el ganador (${M.global.n.toLocaleString('es')})</small></div><div><b>${pct(M.por2026.acierto, 1)}</b><small>solo 2026 (${M.por2026.n.toLocaleString('es')})</small></div><div><b>${pct(M.ranking.modelo, 1)}</b><small>vs ${pct(M.ranking.mejorRanking, 1)} «gana el de mejor ranking» (${M.ranking.n} con ranking)</small></div></div>`;
      o += `<table class="tabla-bt"><tr><th>El modelo dice</th><th>Partidos</th><th>Ganó el favorito</th></tr>${M.bandas.filter(b => b.n).map(b => `<tr><td>${Math.round(b.de * 100)}–${Math.round(b.a * 100)}%</td><td>${b.n.toLocaleString('es')}</td><td><b>${pct(b.gano, 1)}</b></td></tr>`).join('')}</table>`;
      const sp = M.superficie;
      o += `<div class="lineas">${['H', 'C', 'G'].filter(s => sp[s] && sp[s].n).map(s => `<div class="linea"><span>${T.SUP_TXT[s]}</span><b>${pct(sp[s].acierto, 1)} · ${sp[s].n.toLocaleString('es')}</b></div>`).join('')}<div class="linea"><span>Cuadro principal / clasificación</span><b>${pct(M.cuadro.acierto, 1)} / ${pct(M.clasificacion.acierto, 1)}</b></div><div class="linea"><span>Los dos con 10+ partidos / alguno con menos</span><b>${pct(M.conDatos.acierto, 1)} / ${pct(M.pocosDatos.acierto, 1)}</b></div><div class="linea"><span>Retiros (no cuentan)</span><b>${M.retiros.retirados} de ${M.retiros.total.toLocaleString('es')}</b></div></div>`;
      if (M.sets && M.sets.length) o += `<table class="tabla-bt"><tr><th>Favorito</th><th>2-0 dice / real</th><th>1er set dice / real</th></tr>${M.sets.filter(s => s.n).map(s => `<tr><td>${Math.round(s.de * 100)}–${Math.round(s.a * 100)}%</td><td>${pct(s.fav20.dice)} / <b>${pct(s.fav20.real)}</b></td><td>${pct(s.set1.dice)} / <b>${pct(s.set1.real)}</b></td></tr>`).join('')}</table>`;
      const fila3 = (x, nom) => x && x.n ? `<div class="linea"><span>${nom}</span><b>${pct(x.acierto, 1)} <small>vs ${pct(x.siempreLoComun, 1)}</small></b></div>` : '';
      o += `<div class="nota" style="margin-bottom:6px">Mercados en 2026 (dura): acierto del modelo <small>vs elegir siempre lo más común</small></div><div class="lineas">${fila3(M.sinSet && M.sinSet.H, 'Favorito gana sin perder set')}${fila3(M.handicap && M.handicap.H, 'Favorito −3.5 games')}${fila3(M.totales && M.totales.H, 'Total de games (línea ' + (M.totales && M.totales.H ? M.totales.H.linea : '') + ')')}</div>`;
      if (M.bo5) o += `<div class="nota">Grand Slam a 5 sets: ${M.bo5.n} partidos, acierto ${pct(M.bo5.acierto, 1)}. ${M.bo5.usar5 ? 'Convertir a 5 sets mejora la predicción: se usa.' : 'Convertir a 5 sets no mejoró: se usa la probabilidad a 3 sets.'}</div>`;
      o += `<div class="nota">Parámetros medidos: superficie ${Math.round(P.w * 100)}% · K ×${P.kM} · prior por ranking ${P.prior && P.prior.usar !== false ? 'sí' : 'no'}.</div>`;
    });
    box.innerHTML = o;
  }

  /* ---------- navegación ---------- */
  function irA(v) {
    document.querySelectorAll('.tabbar .tbar-btn').forEach(x => x.classList.toggle('on', x.dataset.v === v));
    document.querySelectorAll('main > .vista').forEach(x => x.classList.toggle('on', x.id === v));
    if (v === 'vAlgane') pintarPicks(); if (v === 'vReg') pintarRegistro(); if (v === 'vBt') pintarMedicion(); if (v === 'vRank') pintarRank();
  }
  function pintarTodo() { pintarSelector(); pintarJuegos(); if ($('vAlgane').classList.contains('on')) pintarPicks(); }
  document.querySelectorAll('.tabbar .tbar-btn').forEach(b => b.onclick = () => irA(b.dataset.v));

  /* ---------- Ratings de jugadores ---------- */
  let RTOUR = 'a', RSUP = '*';
  function pintarRank() {
    const box = $('rank'), sel = $('rankSel');
    if (!R || !R.jug) { box.innerHTML = vacio('Sin ratings', 'Todavía no llegó ratings-tenis.json.'); return; }
    const op = [['a', 'ATP'], ['w', 'WTA']], su = [['*', 'General'], ['H', 'Dura'], ['C', 'Arcilla'], ['G', 'Hierba']];
    sel.innerHTML = op.map(([k, n]) => `<button class="diaBtn tourBtn${k === RTOUR ? ' on' : ''}" data-t="${k}">${n}</button>`).join('') + '<span class="sepTour"></span>' + su.map(([k, n]) => `<button class="diaBtn${k === RSUP ? ' on' : ''}" data-s="${k}">${n}</button>`).join('');
    sel.onclick = e => { const b = e.target.closest('.diaBtn'); if (!b) return; if (b.dataset.t) RTOUR = b.dataset.t; if (b.dataset.s) RSUP = b.dataset.s; pintarRank(); };
    const col = { '*': 3, H: 4, C: 5, G: 6 }[RSUP], ncol = { '*': 7, H: 8, C: 9, G: 10 }[RSUP];
    const hoy = Date.now() / 864e5;
    const L = Object.entries(R.jug).filter(([, j]) => j[2] === RTOUR && j[7] >= 15 && j[ncol] >= (RSUP === '*' ? 15 : 5) && hoy - j[12] < 120).sort((x, y) => y[1][col] - x[1][col]).slice(0, 60);
    box.innerHTML = L.map(([id, j], i) => `<div class="fila-rank"><span class="pos">${i + 1}</span>${j[1] ? `<img src="${flagUrl(j[1])}" alt="" onerror="this.remove()">` : ''}<div class="nom">${esc(j[0])}<small>${j[11] ? '#' + j[11] + ' · ' : ''}${j[7]} partidos · forma ${esc((j[13] || '').slice(-5))}</small></div><span class="pct">${j[col]}</span></div>`).join('') + '<div class="nota">Jugadores con 15+ partidos y activos en los últimos 4 meses.</div>';
  }

  /* ---------- respaldo del registro (igual que en las otras apps) ---------- */
  $('btnResp').onclick = () => {
    const t = JSON.stringify({ app: 'ova-tenis', v: 1, fecha: new Date().toISOString(), registro: regGet() });
    $('respTxt').value = t;
    try { navigator.clipboard.writeText(t).then(() => $('respMsg').textContent = '✓ Copiado. Pégalo en Notas.', () => $('respMsg').textContent = 'Listo: copia el texto del cuadro.'); } catch (e) { $('respMsg').textContent = 'Listo: copia el texto del cuadro.'; }
  };
  $('btnRest').onclick = () => {
    try {
      const j = JSON.parse($('respTxt').value), lista = Array.isArray(j) ? j : j.registro;
      if (!Array.isArray(lista)) throw new Error('no es un respaldo de tenis');
      const reg = regGet(), ids = {}; reg.forEach(p => ids[p.id] = 1); let n = 0;
      lista.forEach(p => { if (p && p.id && !ids[p.id]) { reg.push(p); ids[p.id] = 1; n++; } });
      regSet(reg); $('respMsg').textContent = '✓ Restaurado: ' + n + ' picks nuevos.'; pintarRegistro();
    } catch (e) { $('respMsg').textContent = '✗ No se pudo: ' + e.message; }
  };
  $('btnDiag').onclick = () => {
    const el = $('diagOut'); if (el.style.display === 'block') { el.style.display = 'none'; return; }
    const L = ['Ratings: ' + (R ? (Object.keys(R.jug).length + ' jugadores, generado ' + R.gen) : 'NO cargó'), 'Partidos de ESPN: ' + PART.length + ' (pedidos ' + DIAG.pedidos + ')', 'Con rating: ' + PART.filter(m => R && R.jug[m.a.id] && R.jug[m.b.id]).length, 'Registro: ' + regGet().length, DIAG.errores.length ? 'Errores: ' + DIAG.errores.slice(0, 4).join(' | ') : 'Sin errores de descarga.'];
    el.textContent = L.join('\n'); el.style.display = 'block';
  };

  /* ---------- temas (los mismos de las otras apps; se comparten con ova_skin) ---------- */
  const SKINS = {
    noche: { n: 'Noche de estadio', d: 'Azul medianoche y ámbar', bg: '#070B12', acc: '#3B82F6', hot: '#FBBF24', v: {} },
    oro: { n: 'Oro negro', d: 'Negro cálido, dorado, serif', bg: '#0A0908', acc: '#C9A24A', hot: '#F0CE6B', v: { '--bg': '#0A0908', '--bg1': '#13110D', '--bg2': '#1B1812', '--bg3': '#25211A', '--line': '#2A241B', '--line2': '#43381F', '--txt': '#F7F2E7', '--mut': '#CBBFA5', '--mut2': '#A09472', '--acc': '#C9A24A', '--acc2': '#E6C874', '--accTx': '#1A1305', '--hot': '#F0CE6B', '--hotTx': '#1A1305', '--good': '#6FD39A', '--bad': '#F08A78', '--cond': "'Playfair Display',Georgia,serif", '--body': "'Inter',system-ui,sans-serif", '--r': '6px', '--r2': '12px' } },
    neon: { n: 'Neón', d: 'Cian y magenta sobre violeta', bg: '#0E0B1F', acc: '#19E3FF', hot: '#FF4FD0', v: { '--bg': '#07060F', '--bg1': '#0E0B1F', '--bg2': '#161231', '--bg3': '#1F1A44', '--line': '#241E4A', '--line2': '#3D3280', '--txt': '#F5F3FF', '--mut': '#BDB6EC', '--mut2': '#8E86C8', '--acc': '#19E3FF', '--acc2': '#6BF0FF', '--accTx': '#00141A', '--hot': '#FF4FD0', '--hotTx': '#1D0018', '--good': '#3DFFB4', '--bad': '#FF6B86', '--cond': "'Rajdhani','Arial Narrow',system-ui,sans-serif", '--body': "'Inter',system-ui,sans-serif" } },
    dia: { n: 'Día de juego', d: 'Claro, se lee con sol', bg: '#EAF0F7', acc: '#1D4ED8', hot: '#B45309', v: { '--bg': '#EAF0F7', '--bg1': '#FFFFFF', '--bg2': '#F0F4FA', '--bg3': '#E2E9F3', '--line': '#E0E7F1', '--line2': '#C3D0E1', '--txt': '#0E1A2C', '--mut': '#3F5068', '--mut2': '#56677F', '--acc': '#1D4ED8', '--acc2': '#3B6BF0', '--accTx': '#FFFFFF', '--hot': '#9A4406', '--hotTx': '#FFFFFF', '--good': '#0B7A52', '--bad': '#C0362C', '--cond': "'Barlow Condensed','Arial Narrow',system-ui,sans-serif", '--body': "'Inter',system-ui,sans-serif" } },
    campo: { n: 'Arcilla', d: 'Polvo de ladrillo y tiza', bg: '#1A0D07', acc: '#E07A45', hot: '#F2EA6B', v: { '--bg': '#140A05', '--bg1': '#1F110A', '--bg2': '#2A170D', '--bg3': '#371F12', '--line': '#3A2214', '--line2': '#5C3620', '--txt': '#FBF1EA', '--mut': '#D8B9A4', '--mut2': '#AE8D78', '--acc': '#E07A45', '--acc2': '#F29C6B', '--accTx': '#1A0B03', '--hot': '#F2EA6B', '--hotTx': '#1B1A02', '--good': '#5CE69F', '--bad': '#FF8577' } },
    cristal: { n: 'Cristal', d: 'Violeta translúcido, aurora', bg: '#0A0C1C', acc: '#8E96FF', hot: '#FFC27A', v: { '--bg': '#0A0C1C', '--bg1': '#141737', '--bg2': '#1B1F47', '--bg3': '#262B5E', '--line': '#2A2E63', '--line2': '#3F4584', '--txt': '#F6F7FF', '--mut': '#C3C8E8', '--mut2': '#98A0CC', '--acc': '#8E96FF', '--acc2': '#B7BCFF', '--accTx': '#0A0C1C', '--hot': '#FFC27A', '--hotTx': '#2A1600', '--good': '#5EEAD4', '--bad': '#FF95A8', '--cond': "'Manrope',system-ui,sans-serif", '--body': "'Manrope',system-ui,sans-serif" } }
  };
  const FONTS = { oro: 'family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700', neon: 'family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600;700', dia: 'family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700', cristal: 'family=Manrope:wght@400;500;600;700;800' };
  let SKIN_SET = [];
  function aplicarTema(id) {
    const s = SKINS[id] || SKINS.noche, st = document.documentElement.style;
    SKIN_SET.forEach(k => st.removeProperty(k)); SKIN_SET = Object.keys(s.v); SKIN_SET.forEach(k => st.setProperty(k, s.v[k]));
    if (FONTS[id] && !document.getElementById('f-' + id)) { const l = document.createElement('link'); l.id = 'f-' + id; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + FONTS[id] + '&display=swap'; document.head.appendChild(l); }
    try { localStorage.setItem('ova_skin', id); } catch (e) { }
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', s.bg);
    document.querySelectorAll('.ovaSk').forEach(b => b.setAttribute('aria-pressed', b.dataset.sk === id ? 'true' : 'false'));
  }
  (function montarTemas() {
    const box = $('skinBox'), g = document.createElement('div'); g.className = 'ovaSkins';
    g.innerHTML = Object.keys(SKINS).map(id => { const s = SKINS[id]; return `<button type="button" class="ovaSk" data-sk="${id}" aria-pressed="false"><span class="pv" style="background:${s.bg}"><i style="background:${s.acc}"></i><i style="background:${s.hot}"></i></span><span class="tx"><b>${s.n}</b><span>${s.d}</span></span></button>`; }).join('');
    g.onclick = e => { const b = e.target.closest('.ovaSk'); if (b) aplicarTema(b.dataset.sk); };
    box.appendChild(g);
    $('btnTema').onclick = () => $('ovaSheet').classList.add('on');
    $('ovaSheet').onclick = e => { if (e.target === $('ovaSheet')) $('ovaSheet').classList.remove('on'); };
    let cur = 'noche'; try { cur = localStorage.getItem('ova_skin') || 'noche'; } catch (e) { }
    aplicarTema(SKINS[cur] ? cur : 'noche');
  })();

  /* ---------- arranque y en vivo ---------- */
  async function iniciar() {
    try {
      setEstado('Cargando ratings y partidos…');
      const [r, p] = await Promise.all([getJSON('ratings-tenis.json?t=' + Math.floor(Date.now() / 600000)).catch(e => { DIAG.errores.push('ratings: ' + e.message); return null; }), cargarPartidos(), getJSON(KURL + '?t=' + Math.floor(Date.now() / 600000)).then(j => { KAL = (j && j.juegos) || []; }).catch(() => { KAL = []; })]);
      R = r; PART = p;
      if (!R) setEstado('⚠ No cargaron los ratings: se usa solo el ranking. Toca 🔍 Diagnóstico.', 'warn');
      pintarTodo(); registrar(PART);
      if (R) setEstado('✓ ' + PART.length + ' partidos · ratings del ' + new Date(R.gen).toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'ok');
      verificarViejos().catch(() => { });
    } catch (e) { setEstado('✗ No se pudo cargar: ' + e.message + '. Toca 🔍 Diagnóstico.', 'bad'); }
  }
  async function enVivo() {
    try {
      if (document.hidden || !PART.length) return;
      const cerca = PART.some(m => m.estado === 'in' || (m.estado === 'pre' && Math.abs(m.ts - Date.now()) < 3 * 3600e3));
      if (!cerca) return;
      const mapa = {};
      await Promise.all(['atp', 'wta'].map(t => getJSON(ESPN + t + '/scoreboard').then(j => leer(j, mapa)).catch(() => { })));
      let cambio = false;
      Object.values(mapa).forEach(n => { const m = PART.find(x => x.id === n.id); if (!m) return; if (m.estado !== n.estado || marcadorTxt(m) !== marcadorTxt(n) || m.det !== n.det) { Object.assign(m, { estado: n.estado, nombreEst: n.nombreEst, det: n.det, a: Object.assign(m.a, { sets: n.a.sets, gano: n.a.gano }), b: Object.assign(m.b, { sets: n.b.sets, gano: n.b.gano }) }); cambio = true; } });
      if (!cambio) return;
      registrar(PART);
      PART.forEach(m => { const g = document.querySelector('#juegos .game[data-id="' + m.id + '"]'); if (!g) return; const h = g.querySelector('.hora'); if (h) h.outerHTML = chipHora(m); });
    } catch (e) { }
  }
  setInterval(enVivo, 30000);
  iniciar();
  window.OVATenisApp = { analisis, registrar, regGet, _estado: () => ({ R, PART }) };
})();
