/* OVA Fútbol · Selecciones (países) — v2.
   Se carga DESPUÉS de mejoras.js. Todo sale de ESPN (no toca worldfootball).
   Agrega al selector: UEFA Nations League, Concacaf Nations League y Amistosos.
   Sin modelo Poisson. En su lugar:
     1) Rating Elo de cada selección (con probabilidad de ganar/empatar/perder),
     2) Forma: últimos 6 partidos con rival, marcador, tipo de partido y Elo del rival,
     3) Cara a cara de los últimos 4 años,
     4) Tipo de partido (amistoso / Liga de Naciones / eliminatoria / torneo / Mundial);
        los amistosos pesan menos en el Elo (K 20 contra 40-60).
   El historial se baja una sola vez y queda guardado en el teléfono (después solo baja lo nuevo). */
(function(){
 try{
  var SEL = {
   uefanl:     {nombre:'UEFA Nations League',      slugs:['uefa.nations']},
   concacafnl: {nombre:'Concacaf Nations League',  slugs:['concacaf.nations.league']},
   amistosos:  {nombre:'Amistosos de selecciones', slugs:['fifa.friendly']}
  };
  var TIPO_LIGA = {uefanl:'liga de naciones', concacafnl:'liga de naciones', amistosos:'amistoso'};
  var DIAS_ATRAS = 1, DIAS_ADELANTE = 21;

  // Competencias de selecciones para armar el historial (el código de ESPN es mi mejor intento en varias:
  // las que no respondan se saltan solas y salen en 🔍 Diagnóstico).
  var SLUGS_H = [
   ['fifa.friendly','amistoso'],
   ['uefa.nations','liga de naciones'],
   ['concacaf.nations.league','liga de naciones'],
   ['fifa.worldq.uefa','eliminatoria'],
   ['fifa.worldq.concacaf','eliminatoria'],
   ['fifa.worldq.conmebol','eliminatoria'],
   ['fifa.worldq.afc','eliminatoria'],
   ['fifa.worldq.caf','eliminatoria'],
   ['uefa.euroq','eliminatoria'],
   ['fifa.world','mundial'],
   ['uefa.euro','torneo'],
   ['conmebol.america','torneo'],
   ['concacaf.gold','torneo'],
   ['caf.nations','torneo'],
   ['afc.asian.cup','torneo']
  ];
  // K del Elo por tipo de partido (los amistosos pesan la mitad que un partido oficial)
  var KT = {amistoso:20, 'liga de naciones':40, eliminatoria:40, torneo:50, mundial:60};
  // ventaja de local (en puntos Elo): solo donde el local es de verdad local; amistosos y torneos casi siempre son neutrales
  var HA = {eliminatoria:100, 'liga de naciones':100};
  var TIPO_TXT = {amistoso:'amistoso', 'liga de naciones':'Liga de Naciones', eliminatoria:'eliminatoria', torneo:'torneo', mundial:'Mundial'};
  var CK = 'ova_sel_hist_v1';

  // registrar en las tablas globales que ya usa la app
  Object.keys(SEL).forEach(function(k){
   LIGAS[k] = {nombre:SEL[k].nombre, esCopa:true, esSeleccion:true, urlPartidos:''};
   ESPN_SLUG[k] = SEL[k].slugs[0];
  });

  // opciones en el selector
  var sel = document.getElementById('ligaSel');
  if(sel && !sel.querySelector('optgroup[data-sel]')){
   var og = document.createElement('optgroup');
   og.label = 'Selecciones (países, sin modelo)';
   og.setAttribute('data-sel','1');
   og.innerHTML =
    '<option value="uefanl">🇪🇺 UEFA Nations League</option>'+
    '<option value="concacafnl">🌎 Concacaf Nations League</option>'+
    '<option value="amistosos">🌍 Amistosos de selecciones</option>';
   sel.appendChild(og);
  }

  function esSel(){ return !!(LIGAS[LIGA_ACTUAL] && LIGAS[LIGA_ACTUAL].esSeleccion); }
  function escS(s){ return String(s==null?'':s).replace(/[<>&"]/g,function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); }

  // ================= ESPN: partidos de los próximos días (con bandera) =================
  function parseDia(json){
   var out = [];
   ((json && json.events) || []).forEach(function(e){
    var comp = e.competitions && e.competitions[0];
    if(!comp || !comp.competitors || comp.competitors.length < 2) return;
    var h = null, a = null;
    comp.competitors.forEach(function(c){ if(c.homeAway==='home') h = c; else if(c.homeAway==='away') a = c; });
    if(!h || !a){ h = comp.competitors[0]; a = comp.competitors[1]; }
    if(!h.team || !a.team) return;
    var st = (e.status && e.status.type) || (comp.status && comp.status.type) || {};
    var ts = Date.parse(e.date); if(!isFinite(ts)) return;
    var gl = numESPN(h.score), gv = numESPN(a.score);
    var terminado = st.completed === true && gl !== null && gv !== null;
    var enVivo = st.state === 'in';
    var d = new Date(ts);
    out.push({
     id: e.id,
     local: h.team.displayName || h.team.name, visita: a.team.displayName || a.team.name,
     escudoLocal: h.team.logo || '', escudoVisita: a.team.logo || '',
     hrefLocal: null, hrefVisita: null,
     ts: ts, fecha: fechaPunto(d), hora: '',
     horaLocal: d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
     terminado: terminado, enVivo: enVivo && !terminado,
     marcadorVivo: (enVivo && !terminado && gl !== null && gv !== null) ? {l:gl, v:gv} : null,
     golesLocal: terminado ? gl : null, golesVisita: terminado ? gv : null
    });
   });
   return out;
  }
  function bajarSlug(slug, dias, errores){
   var out = [], i = 0, activos = 0;
   return new Promise(function(resolve){
    function sig(){
     while(activos < 8 && i < dias.length){
      (function(dia){
       activos++;
       fetch(ESPN_BASE + slug + '/scoreboard?dates=' + ymd(dia))
        .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function(j){ out = out.concat(parseDia(j)); })
        .catch(function(e){ errores.push(ymd(dia) + ': ' + e.message); })
        .then(function(){ activos--; sig(); });
      })(dias[i++]);
     }
     if(i >= dias.length && activos === 0) resolve(out);
    }
    sig();
   });
  }

  // ================= historial de selecciones (para Elo, forma y cara a cara) =================
  var HIST = [], HIST_PROM = null, HIST_ANIOS = 4, HIST_DIAG = null;
  var ELO = {mapa:{}, d0:0.25, bt:{n:0}, total:0};

  function prog(txt){
   var e = document.getElementById('estado');
   if(e && esSel()){ e.className = 'estado'; e.textContent = txt; }
  }
  function pool(tareas, n){
   return new Promise(function(res){
    var out = new Array(tareas.length), i = 0, act = 0, hechos = 0;
    if(!tareas.length) return res(out);
    function sig(){
     while(act < n && i < tareas.length){
      (function(k){
       act++;
       tareas[k]().then(function(r){ out[k] = r; }, function(){ out[k] = []; }).then(function(){
        act--; hechos++;
        if(hechos === tareas.length) res(out); else sig();
       });
      })(i++);
     }
    }
    sig();
   });
  }
  function bajarRango(slug, desde, hasta, errores){
   var trozos = trozosMensuales(desde, hasta);
   return pool(trozos.map(function(t){
    return function(){
     return espnJSON(ESPN_BASE+slug+'/scoreboard?dates='+ymd(t[0])+'-'+ymd(t[1])+'&limit=1000').then(parseESPN).catch(function(e){
      errores.push(slug+' '+ymd(t[0]).slice(0,6)+': '+e.message); return [];
     });
    };
   }), 8).then(function(arrs){ return [].concat.apply([], arrs); });
  }

  function iniciarHistorial(){
   if(HIST_PROM) return HIST_PROM;
   var hoy = new Date(), errores = [];
   var cache = leerJSON(CK);
   HIST_PROM = descubrirModoESPN('eng.1').then(function(sonda){
    var modo = sonda.modo;
    var full = !(cache && cache.p && cache.p.length);
    var anios = full ? (modo==='rango' ? 4 : 1) : (cache.anios || 4);
    var desde;
    if(full){ desde = new Date(hoy.getFullYear()-anios, hoy.getMonth(), hoy.getDate()); }
    else { desde = new Date(cache.hasta); desde.setDate(desde.getDate()-6); }
    var lista = full ? SLUGS_H.slice(0, modo==='rango' ? SLUGS_H.length : 4)
                     : SLUGS_H.filter(function(s){ return (cache.ok||[]).indexOf(s[0]) > -1; });
    var nuevos = {}, ok = [], skip = [], i = 0;
    if(full) prog('Bajando historial de selecciones (solo la primera vez, puede tardar)…');
    function siguiente(){
     if(i >= lista.length) return Promise.resolve();
     var s = lista[i++], slug = s[0], tipo = s[1];
     prog('Historial de selecciones: '+i+' de '+lista.length+' ('+slug+')…');
     var prueba = full ? espnJSON(ESPN_BASE+slug+'/scoreboard?dates='+ymd(hoy)) : Promise.resolve(null);
     return prueba.then(function(){
      ok.push(slug);
      var pedido = modo==='rango' ? bajarRango(slug, desde, hoy, errores) : bajarPorDias(slug, desde, hoy, errores);
      return pedido.then(function(evs){
       evs.forEach(function(e){
        if(e.terminado && e.id && e.ts) nuevos[e.id] = {id:e.id, l:e.local, v:e.visita, gl:e.golesLocal, gv:e.golesVisita, ts:e.ts, t:tipo};
       });
      });
     }, function(e){ skip.push(slug+' ('+e.message+')'); }).then(siguiente);
    }
    return siguiente().then(function(){
     if(full && !ok.length) throw new Error('ESPN no respondió para ninguna competencia de selecciones');
     var mapa = {};
     if(cache && cache.p) cache.p.forEach(function(r){ mapa[r[0]] = {id:r[0], l:r[1], v:r[2], gl:r[3], gv:r[4], ts:r[5], t:r[6]}; });
     Object.keys(nuevos).forEach(function(k){ mapa[k] = nuevos[k]; });
     var corte = Date.now() - (anios*366+10)*86400000;
     var lst = Object.keys(mapa).map(function(k){ return mapa[k]; }).filter(function(m){ return m.ts >= corte; });
     lst.forEach(function(m){ m.kl = claveEq(m.l); m.kv = claveEq(m.v); });
     HIST = lst; HIST_ANIOS = anios;
     var okGuardar = full ? ok : (cache.ok || []);
     if(lst.length > 100){
      try{
       localStorage.setItem(CK, JSON.stringify({hasta:hoy.toISOString(), anios:anios, ok:okGuardar,
        p:lst.map(function(m){ return [m.id, m.l, m.v, m.gl, m.gv, m.ts, m.t]; })}));
      }catch(e){}
     }
     construirElo();
     HIST_DIAG = {modo:modo, full:full, anios:anios, total:lst.length, nuevos:Object.keys(nuevos).length,
                  ok:okGuardar, skip:skip, errores:errores, equipos:Object.keys(ELO.mapa).length};
     if(esSel()){ try{ if(PARTIDOS) pintarEstado(LIGAS[LIGA_ACTUAL]); }catch(e){} }
    });
   }).catch(function(e){ HIST_PROM = null; throw e; });
   return HIST_PROM;
  }

  // ================= Elo =================
  function probsDe(dr, d0){
   var E = 1/(1+Math.pow(10, -dr/400));
   var pD = Math.max(0.05, Math.min(0.34, d0*1.2*(1-Math.pow(2*E-1, 2))));
   var pW = Math.max(E-pD/2, 0.01), pL = Math.max(1-E-pD/2, 0.01);
   var s = pW+pD+pL;
   return {L:pW/s, D:pD/s, V:pL/s};
  }
  function construirElo(){
   var lista = HIST.slice().sort(function(a,b){ return a.ts-b.ts; });
   var emp = 0; lista.forEach(function(m){ if(m.gl===m.gv) emp++; });
   var d0 = lista.length ? Math.max(0.15, Math.min(0.32, emp/lista.length)) : 0.25;
   var hoy = Date.now(), desdeBt = hoy - 365*86400000;
   var mapa = {}, bt = {n:0, ok:0, ll:0, llb:0}, fr = {L:1, D:1, V:1}, nfr = 3;
   lista.forEach(function(m){
    var a = mapa[m.kl] || (mapa[m.kl] = {nombre:m.l, r:1500, n:0, ult:0});
    var b = mapa[m.kv] || (mapa[m.kv] = {nombre:m.v, r:1500, n:0, ult:0});
    var ha = HA[m.t] || 0;
    var dr = a.r - b.r + ha, E = 1/(1+Math.pow(10, -dr/400));
    var real = m.gl>m.gv ? 'L' : (m.gl<m.gv ? 'V' : 'D');
    if(m.ts >= desdeBt && a.n >= 5 && b.n >= 5){
     var pr = probsDe(dr, d0);
     var pred = (pr.L>=pr.D && pr.L>=pr.V) ? 'L' : (pr.V>=pr.D ? 'V' : 'D');
     bt.n++; if(pred===real) bt.ok++;
     bt.ll += -Math.log(Math.max(pr[real], 1e-9));
     bt.llb += -Math.log(fr[real]/nfr);
    }
    var S = m.gl>m.gv ? 1 : (m.gl===m.gv ? 0.5 : 0);
    var diff = Math.abs(m.gl-m.gv);
    var G = diff<=1 ? 1 : (diff===2 ? 1.5 : (11+diff)/8);
    var delta = (KT[m.t] || 30) * G * (S-E);
    a.r += delta; b.r -= delta; a.n++; b.n++; a.ult = m.ts; b.ult = m.ts; a.nombre = m.l; b.nombre = m.v;
    fr[real]++; nfr++;
   });
   var rank = Object.keys(mapa).filter(function(k){ return mapa[k].n >= 8 && mapa[k].ult >= hoy-730*86400000; })
    .sort(function(x,y){ return mapa[y].r - mapa[x].r; });
   rank.forEach(function(k,i){ mapa[k].rank = i+1; });
   ELO = {mapa:mapa, d0:d0, bt:bt, total:rank.length};
  }

  // ================= pintar un partido de selecciones =================
  function fechaCorta(ts){ var d = new Date(ts); return d.getDate()+'/'+(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2); }
  function cuando(ts){ var n = Math.floor((Date.now()-ts)/86400000); return n<=0 ? 'hoy' : (n<45 ? 'hace '+n+' d' : fechaCorta(ts)); }
  function pct1(x){ return (x*100).toFixed(1)+'%'; }
  function am(p){ var v = cuotaJustaAmericana(p); return v===null ? '—' : (v>0?'+':'')+v; }

  function formaHtml(nombre){
   var k = claveEq(nombre);
   var js = HIST.filter(function(m){ return m.kl===k || m.kv===k; }).sort(function(a,b){ return b.ts-a.ts; }).slice(0,6);
   var h = '<div class="observ"><b>'+escS(nombre)+'</b></div>';
   if(!js.length) return h+'<div class="nota">Sin partidos de esta selección en el historial.</div>';
   var v=0, e=0, d=0, gf=0, gc=0, filas = '';
   js.forEach(function(m){
    var local = m.kl===k;
    var f = local ? m.gl : m.gv, c = local ? m.gv : m.gl;
    var rival = local ? m.v : m.l, kr = local ? m.kv : m.kl;
    var res = f>c ? 'V' : (f<c ? 'D' : 'E');
    if(res==='V') v++; else if(res==='D') d++; else e++;
    gf += f; gc += c;
    var er = ELO.mapa[kr];
    filas += '<div class="linea"><span><span class="forma" style="display:inline-flex;margin:0 8px 0 0;vertical-align:middle"><span class="'+res+'">'+res+'</span></span>'+
     escS(rival)+'<br><small style="color:var(--mut2)">'+(TIPO_TXT[m.t]||m.t)+' · '+cuando(m.ts)+(er ? ' · rival Elo '+Math.round(er.r) : '')+'</small></span>'+
     '<b>'+f+'–'+c+'</b></div>';
   });
   return h+'<div class="lineas">'+filas+'</div>'+
    '<div class="nota" style="margin-top:6px">Últimos '+js.length+': '+v+'V '+e+'E '+d+'D · goles '+gf+' a favor, '+gc+' en contra.</div>';
  }

  function h2hHtml(p){
   var kL = claveEq(p.local), kV = claveEq(p.visita);
   var js = HIST.filter(function(m){ return (m.kl===kL && m.kv===kV) || (m.kl===kV && m.kv===kL); })
    .sort(function(a,b){ return b.ts-a.ts; });
   if(!js.length) return '<div class="nota">No se han enfrentado en los últimos '+HIST_ANIOS+' '+(HIST_ANIOS===1?'año':'años')+' (en las competencias que cubre el historial).</div>';
   var vL=0, vV=0, e=0, filas = [];
   js.forEach(function(m){
    var localEsL = m.kl===kL;
    var gA = localEsL ? m.gl : m.gv, gB = localEsL ? m.gv : m.gl;
    if(gA>gB) vL++; else if(gA<gB) vV++; else e++;
    filas.push('<div class="linea"><span>'+escS(m.l)+' – '+escS(m.v)+'<br><small style="color:var(--mut2)">'+(TIPO_TXT[m.t]||m.t)+' · '+fechaCorta(m.ts)+'</small></span><b>'+m.gl+'–'+m.gv+'</b></div>');
   });
   return '<div class="h2h"><div><b>'+vL+'</b><small>'+escS(p.local)+'</small></div><div><b>'+e+'</b><small>Empates</small></div><div><b>'+vV+'</b><small>'+escS(p.visita)+'</small></div></div>'+
    '<div class="lineas">'+filas.slice(0,6).join('')+'</div>'+
    '<div class="nota" style="margin-top:6px">'+js.length+' '+(js.length===1?'partido':'partidos')+' en los últimos '+HIST_ANIOS+' '+(HIST_ANIOS===1?'año':'años')+'. Los amistosos cuentan igual aquí, pero no pesan igual en el Elo.</div>';
  }

  function eloHtml(p){
   var kL = claveEq(p.local), kV = claveEq(p.visita);
   var tipoComp = TIPO_LIGA[LIGA_ACTUAL] || 'amistoso';
   var ha = HA[tipoComp] || 0;
   var eL = ELO.mapa[kL], eV = ELO.mapa[kV];
   if(!eL || !eV || eL.n < 5 || eV.n < 5){
    var falta = (!eL || eL.n<5) ? p.local : p.visita;
    return '<div class="nota">No hay muestra suficiente de '+escS(falta)+' en el historial (menos de 5 partidos) para calcular un Elo confiable.</div>';
   }
   var dr = eL.r - eV.r + ha, pr = probsDe(dr, ELO.d0);
   var mejor = Math.max(pr.L, pr.V);
   var h = '<div class="egol"><span>'+escS(p.local)+'</span><b>Elo '+Math.round(eL.r)+(eL.rank?' · #'+eL.rank+' de '+ELO.total:'')+' · '+eL.n+' part.</b></div>'+
    '<div class="egol"><span>'+escS(p.visita)+'</span><b>Elo '+Math.round(eV.r)+(eV.rank?' · #'+eV.rank+' de '+ELO.total:'')+' · '+eV.n+' part.</b></div>'+
    '<div class="bar">'+
     '<span class="h" style="flex-grow:'+Math.max(pr.L,0.06)+'">'+pct1(pr.L)+'</span>'+
     '<span class="d" style="flex-grow:'+Math.max(pr.D,0.06)+'">'+pct1(pr.D)+'</span>'+
     '<span class="a" style="flex-grow:'+Math.max(pr.V,0.06)+'">'+pct1(pr.V)+'</span></div>';
   if(mejor >= 0.5){
    var fav = pr.L>=pr.V ? p.local : p.visita;
    h += '<div class="pick"><b>Favorito: '+escS(fav)+'</b>'+pct1(mejor)+' según el Elo.</div>';
   } else {
    h += '<div class="pick no"><b>Muy parejo</b>Ninguno llega al 50% según el Elo.</div>';
   }
   h += '<div class="lineas">'+
    '<div class="linea"><span>'+escS(p.local)+' gana</span><b>'+pct1(pr.L)+' · '+am(pr.L)+'</b></div>'+
    '<div class="linea"><span>Empate</span><b>'+pct1(pr.D)+' · '+am(pr.D)+'</b></div>'+
    '<div class="linea"><span>'+escS(p.visita)+' gana</span><b>'+pct1(pr.V)+' · '+am(pr.V)+'</b></div></div>';
   var b = ELO.bt, nota;
   if(b.n >= 40){
    var llm = b.ll/b.n, llb = b.llb/b.n;
    var vered = llm < llb-0.01 ? 'le gana a la frecuencia' : (llm > llb+0.01 ? 'salió peor que la frecuencia' : 'no se distingue de la frecuencia');
    nota = 'Chequeo: en '+b.n+' partidos del último año (ambos con 5+ partidos previos) el Elo acertó '+(b.ok/b.n*100).toFixed(0)+'% del 1X2; pérdida '+llm.toFixed(3)+' contra '+llb.toFixed(3)+' sin modelo → '+vered+'.';
   } else {
    nota = 'Todavía no hay suficientes partidos para chequear qué tan bien acierta este Elo.';
   }
   h += '<div class="nota" style="margin-top:6px">'+nota+' '+(ha ? 'Incluye ventaja de local (+'+ha+') por ser '+TIPO_TXT[tipoComp]+'.' : 'Sin ventaja de local (amistosos y torneos suelen ser en cancha neutral).')+
    ' No sabe de lesiones, alineaciones ni de lo que se juega cada equipo: úsalo como referencia, no como pick.</div>';
   return h;
  }

  function htmlSel(p){
   return '<h3>Rating Elo</h3>'+eloHtml(p)+
    '<h3>Forma reciente</h3>'+formaHtml(p.local)+formaHtml(p.visita)+
    '<h3>Cara a cara (últimos '+HIST_ANIOS+' '+(HIST_ANIOS===1?'año':'años')+')</h3>'+h2hHtml(p);
  }

  // ================= carga de una competencia de selecciones =================
  var _cargarLiga = cargarLiga;
  cargarLiga = function(clave){
   if(!SEL[clave]) return _cargarLiga(clave);
   var mio = ++CARGA_ID;
   LIGA_ACTUAL = clave;
   CACHE_PERFIL = {}; DIAG = {}; MUESTRAS = {pend:[], term:[]};
   LIGA_ES_COPA = true;
   var liga = LIGAS[clave];
   var estado = document.getElementById('estado');
   estado.className = 'estado';
   estado.textContent = 'Bajando ' + liga.nombre + ' de ESPN...';
   document.getElementById('juegos').innerHTML = '';
   document.getElementById('algane').innerHTML = '';
   document.getElementById('backtestOut').innerHTML = '';
   document.getElementById('diagOut').style.display = 'none';
   EQUIPOS = []; TERMINADOS = []; FUENTE_TERM = 'ESPN';

   var dias = [], hoy = new Date();
   for(var k = -DIAS_ATRAS; k <= DIAS_ADELANTE; k++){
    dias.push(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k));
   }
   var errores = [];
   bajarSlug(SEL[clave].slugs[0], dias, errores).then(function(todos){
    if(mio !== CARGA_ID) return;
    var vistos = {}, unicos = [];
    todos.forEach(function(p){ if(p.id && vistos[p.id]) return; if(p.id) vistos[p.id] = true; unicos.push(p); });
    var term = unicos.filter(function(p){ return p.terminado; });
    var inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    var pend = unicos.filter(function(p){ return !p.terminado && p.ts >= inicioHoy; })
                     .sort(function(a, b){ return a.ts - b.ts; });
    DIAG.espn = {modo:'día por día', nota:'selecciones (' + SEL[clave].slugs[0] + ')', leidos:unicos.length,
                 terminados:term.length, errores:errores, enCache:0, desde:ymd(dias[0])};
    if(!unicos.length && errores.length){
     estado.textContent = '✗ ESPN no respondió para ' + liga.nombre + ' (' + errores[0] + '). Toca 🔍 Diagnóstico.';
     estado.className = 'estado bad';
     return;
    }
    TERMINADOS = term;
    PENDIENTES_TODOS = pend;
    DIA_SELECCIONADO = null;
    pintarSelectorDias();
    aplicarSelectorDias();
    document.getElementById('algane').innerHTML =
     '<div class="estado">"Al gane" no aplica a selecciones: aquí no hay modelo de goles, solo Elo dentro de cada partido.</div>';
    pintarEstado(liga);
    if(!unicos.length){
     estado.textContent = 'ESPN respondió pero no trae partidos de ' + liga.nombre + ' en estas fechas (o el código del torneo no es ese). Toca 🔍 Diagnóstico.';
     estado.className = 'estado warn';
    }
    // el historial arranca en segundo plano para que el Elo esté listo al abrir un partido
    iniciarHistorial().catch(function(){});
   }).catch(function(e){
    if(mio !== CARGA_ID) return;
    estado.textContent = '✗ No se pudo cargar ' + liga.nombre + ': ' + e.message;
    estado.className = 'estado bad';
   });
  };

  // cuerpo de cada partido: Elo + forma + cara a cara
  var _copa = pintarGameBodyCopa;
  pintarGameBodyCopa = function(bodyEl, p){
   if(!esSel()) return _copa(bodyEl, p);
   var id = 's' + Math.random().toString(36).slice(2);
   bodyEl.innerHTML =
    '<div class="aviso">🌍 Selecciones: pocos partidos y alineaciones que cambian mucho, así que aquí no se corre el modelo Poisson. En su lugar: Elo, forma y cara a cara de los últimos '+HIST_ANIOS+' años.</div>'+
    '<div id="'+id+'" class="nota">Cargando historial de selecciones (la primera vez tarda; después queda guardado)...</div>';
   var box = document.getElementById(id);
   iniciarHistorial().then(function(){
    box.className = '';
    box.innerHTML = htmlSel(p);
   }).catch(function(e){
    box.className = 'estado bad';
    box.textContent = 'No pude bajar el historial: ' + e.message + '. Toca 🔍 Diagnóstico.';
   });
  };

  // diagnóstico: agrega lo del historial
  var _armarDiag = armarDiag;
  armarDiag = function(){
   var t = _armarDiag();
   if(HIST_DIAG){
    t += '\nHistorial selecciones (Elo): '+HIST_DIAG.total+' partidos, '+HIST_DIAG.equipos+' equipos, '+HIST_DIAG.anios+' año(s), modo '+HIST_DIAG.modo+
     (HIST_DIAG.full ? ' (descarga completa)' : ' (actualización: '+HIST_DIAG.nuevos+' nuevos)')+
     '\n  competencias que respondieron: '+(HIST_DIAG.ok.join(', ')||'ninguna')+
     (HIST_DIAG.skip.length ? '\n  sin respuesta: '+HIST_DIAG.skip.join(' | ') : '')+
     (HIST_DIAG.errores.length ? '\n  '+HIST_DIAG.errores.length+' errores, ej: '+HIST_DIAG.errores.slice(0,2).join(' | ') : '');
   }
   return t;
  };
 }catch(e){ if(window.console) console.error('selecciones.js', e); }
})();
