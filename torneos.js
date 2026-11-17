/* OVA Fútbol · Torneos (lo que no es liga) — v1. Se carga DESPUÉS de selecciones.js.
   Antes, fuera de las ligas casi no salía nada: las copas nacionales solo traían la forma DENTRO de la copa (1-2 partidos)
   y las selecciones un Elo con 1 año y 4 torneos. Ahora:
   1) Copas nacionales (FA Cup, DFB-Pokal, Coppa Italia, Coupe de France, Copa del Rey): el mismo motor Dixon-Coles de las ligas,
      ajustado con 1.ª + 2.ª división + copas de ese país (fuerza-nacional.json, lo arma torneos.yml). Pestañas Veredicto,
      Goles, Forma y Cara a cara; forma y rachas con TODAS las competencias (hist-nac-<país>.json). Al gane y registro automático.
   2) Herramientas comunes (pestañas, Observaciones/rachas, bloque de goles, casa/visita) que también usa selecciones.js.
   3) Observaciones (rachas) también en el Veredicto de las ligas.
   La medición (aciertos y pérdida, cada partido con lo anterior) sale de los mismos JSON: docs/MEDICION-TORNEOS-2026-11.md. */
(function(){
 try{
  function esc(s){ return String(s==null?'':s).replace(/[<>&"]/g,function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); }
  function pct(x){ return (x*100).toFixed(1)+'%'; }
  function pct0(x){ return (x*100).toFixed(0)+'%'; }
  function am(p){ var v = cuotaJustaAmericana(p); return v===null ? '—' : (v>0?'+':'')+v; }
  function fechaC(ts){ var d = new Date(ts); return d.getDate()+'/'+(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2); }
  function cuando(ts){ var n = Math.floor((Date.now()-ts)/86400000); return n<=0 ? 'hoy' : (n<45 ? 'hace '+n+' d' : fechaC(ts)); }

  var st = document.createElement('style');
  st.textContent =
   '.ovt-obs{display:flex;align-items:center;gap:10px;margin:7px 0}'+
   '.ovt-obs img,.ovt-obs i{width:28px;height:28px;border-radius:50%;object-fit:cover;flex:none;background:var(--bg2)}'+
   '.ovt-obs span{flex:1;background:var(--bg2);border-left:3px solid var(--line2);border-radius:12px;padding:9px 11px;font-size:13.5px;line-height:1.35}'+
   '.ovt-obs span.b{border-left-color:var(--good)}.ovt-obs span.m{border-left-color:var(--bad)}'+
   '.ovt-cv{display:flex;gap:8px;margin:6px 0}.ovt-cv>div{flex:1;background:var(--bg2);border-radius:12px;padding:8px 10px;font-size:12.5px;color:var(--mut)}'+
   '.ovt-cv b{display:block;color:var(--txt);font-size:13.5px;margin-bottom:2px}';
  document.head.appendChild(st);

  /* ================= pestañas (mismo aspecto que las ligas) ================= */
  var NTAB = 0;
  function tabsHtml(tabs){
   var id = 'ovt'+(++NTAB)+Math.random().toString(36).slice(2,6);
   return '<div class="ovt-wrap" id="'+id+'"><div class="tabs ovt-tabs">'+
    tabs.map(function(t,i){ return '<button class="tb'+(i?'':' on')+'" data-i="'+i+'">'+esc(t.t)+'</button>'; }).join('')+'</div>'+
    tabs.map(function(t,i){ return '<div class="pane ovt-pane'+(i?'':' on')+'" data-i="'+i+'">'+t.html+'</div>'; }).join('')+'</div>';
  }
  document.addEventListener('click', function(e){
   var b = e.target && e.target.closest && e.target.closest('.ovt-tabs .tb'); if(!b) return;
   e.stopPropagation();
   var w = b.closest('.ovt-wrap'); if(!w) return;
   w.querySelectorAll('.ovt-tabs .tb').forEach(function(x){ x.classList.toggle('on', x===b); });
   w.querySelectorAll('.ovt-pane').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-i')===b.getAttribute('data-i')); });
  }, true);

  /* ================= Observaciones (rachas) =================
     js: partidos del equipo, más reciente primero, {f: goles a favor, c: en contra} */
  function rachas(js){
   var out = [];
   if(!js || js.length < 3) return out;
   function seguidos(cond){ var n = 0; for(var i=0;i<js.length;i++){ if(cond(js[i])) n++; else break; } return n; }
   var gana = seguidos(function(m){ return m.f>m.c; }), inv = seguidos(function(m){ return m.f>=m.c; });
   var pierde = seguidos(function(m){ return m.f<m.c; }), sinG = seguidos(function(m){ return m.f<=m.c; });
   var marca = seguidos(function(m){ return m.f>0; }), sinMarcar = seguidos(function(m){ return m.f===0; });
   var cero = seguidos(function(m){ return m.c===0; }), sinCero = seguidos(function(m){ return m.c>0; });
   if(gana >= 3) out.push({t:'ha ganado sus últimos '+gana+' partidos.', p:gana+2, c:'b'});
   else if(inv >= 4) out.push({t:'no ha perdido en '+inv+' partidos.', p:inv, c:'b'});
   if(pierde >= 3) out.push({t:'ha perdido sus últimos '+pierde+' partidos.', p:pierde+2, c:'m'});
   else if(sinG >= 4) out.push({t:'no ha ganado en '+sinG+' partidos.', p:sinG, c:'m'});
   if(sinMarcar >= 2) out.push({t:'no ha marcado en sus últimos '+sinMarcar+' partidos.', p:sinMarcar+2, c:'m'});
   else if(marca >= 5) out.push({t:'ha marcado en '+marca+' partidos seguidos.', p:marca-1, c:'b'});
   if(cero >= 2) out.push({t:'lleva '+cero+' partidos seguidos con la portería a cero.', p:cero+2, c:'b'});
   else if(sinCero >= 5) out.push({t:'no ha mantenido la portería a cero en '+sinCero+' partidos.', p:sinCero-1, c:'m'});
   var u = js.slice(0,10);
   if(u.length >= 6){
    var ov = u.filter(function(m){ return m.f+m.c>2.5; }).length, bt = u.filter(function(m){ return m.f>0 && m.c>0; }).length;
    if(ov/u.length >= 0.7) out.push({t:'más de 2.5 goles en '+ov+' de sus últimos '+u.length+'.', p:ov-3});
    else if(ov/u.length <= 0.3) out.push({t:'menos de 2.5 goles en '+(u.length-ov)+' de sus últimos '+u.length+'.', p:(u.length-ov)-3});
    if(bt/u.length >= 0.7) out.push({t:'ambos anotaron en '+bt+' de sus últimos '+u.length+'.', p:bt-3});
    else if(bt/u.length <= 0.25) out.push({t:'en '+(u.length-bt)+' de sus últimos '+u.length+' al menos un equipo se quedó en cero.', p:(u.length-bt)-4});
   }
   return out.sort(function(a,b){ return b.p-a.p; }).slice(0,3);
  }
  /* equipos: [{nombre, escudo, js}] */
  function observacionesHtml(equipos){
   var h = '';
   equipos.forEach(function(e){
    rachas(e.js).forEach(function(r){
     h += '<div class="ovt-obs">'+(e.escudo ? '<img src="'+esc(e.escudo)+'" alt="">' : '<i></i>')+
      '<span class="'+(r.c||'')+'"><b>'+esc(e.nombre)+'</b> '+esc(r.t)+'</span></div>';
    });
   });
   return h || '<div class="nota">Ninguna racha llamativa (3+ seguidos) en los últimos partidos de los dos.</div>';
  }

  /* ================= bloque de goles ================= */
  function golesBloque(lamL, lamV, nL, nV, rho, nota, pre){
   var d = distribucion(lamL, lamV, rho||0, true);
   var g = pre || {o15:d.o15, o25:d.o25, o35:d.o35, btts:d.btts};
   function fila(t, p){ return '<div class="linea"><span>'+t+'</span><b>'+pct(p)+' · '+am(p)+'</b></div>'; }
   var marc = (d.marcadores||[]).slice(0,5).map(function(m){ return '<div class="linea"><span>'+m.i+'–'+m.j+'</span><b>'+pct(m.p)+'</b></div>'; }).join('');
   return '<div class="egol"><span>Goles esperados '+esc(nL)+'</span><b>'+lamL.toFixed(2)+'</b></div>'+
    '<div class="egol"><span>Goles esperados '+esc(nV)+'</span><b>'+lamV.toFixed(2)+'</b></div>'+
    '<h3>Más/Menos</h3><div class="lineas">'+
     fila('Más de 1.5', g.o15)+fila('Menos de 1.5', 1-g.o15)+fila('Más de 2.5', g.o25)+fila('Menos de 2.5', 1-g.o25)+fila('Más de 3.5', g.o35)+fila('Menos de 3.5', 1-g.o35)+'</div>'+
    '<h3>Ambos anotan</h3><div class="lineas">'+fila('Sí', g.btts)+fila('No', 1-g.btts)+'</div>'+
    '<h3>Marcadores más probables</h3><div class="lineas">'+marc+'</div>'+
    (nota ? '<div class="nota" style="margin-top:6px">'+nota+'</div>' : '');
  }
  /* récord en casa y de visita (últimos 10 de cada condición) */
  function cvTxt(js, casa){
   var u = js.filter(function(m){ return m.casa===casa; }).slice(0,10);
   if(!u.length) return 'sin partidos';
   var v=0,e=0,d=0,gf=0,gc=0; u.forEach(function(m){ if(m.f>m.c) v++; else if(m.f<m.c) d++; else e++; gf+=m.f; gc+=m.c; });
   return v+'V '+e+'E '+d+'D · '+gf+':'+gc+' ('+u.length+')';
  }
  function casaVisitaHtml(nL, jsL, nV, jsV){
   return '<h3>En casa y de visita</h3><div class="ovt-cv"><div><b>'+esc(nL)+' en casa</b>'+cvTxt(jsL, true)+'</div><div><b>'+esc(nV)+' de visita</b>'+cvTxt(jsV, false)+'</div></div>'+
    '<div class="nota">Últimos 10 de cada condición (en torneos con sede neutral cuenta como local el que ESPN pone primero).</div>';
  }

  window.OVATorneos = {tabsHtml:tabsHtml, rachas:rachas, observacionesHtml:observacionesHtml, golesBloque:golesBloque, casaVisitaHtml:casaVisitaHtml};

  /* ================= COPAS NACIONALES ================= */
  var PAIS = {facup:'eng', dfbpokal:'ger', copaitalia:'ita', coupefrance:'fra', copadelrey:'esp'};
  var COMP = {'eng.1':'Premier League','eng.2':'Championship','eng.3':'League One','eng.4':'League Two','eng.fa':'FA Cup','eng.league_cup':'Copa de la Liga',
   'esp.1':'La Liga','esp.2':'Segunda','esp.copa_del_rey':'Copa del Rey','ita.1':'Serie A','ita.2':'Serie B','ita.coppa_italia':'Coppa Italia',
   'ger.1':'Bundesliga','ger.2':'2. Bundesliga','ger.3':'3. Liga','ger.dfb_pokal':'DFB-Pokal','fra.1':'Ligue 1','fra.2':'Ligue 2','fra.coupe_de_france':'Coupe de France'};
  var FN = null, FN_PROM = null, HN = {}, HN_PROM = {};
  function fuerza(){
   if(FN_PROM) return FN_PROM;
   FN_PROM = fetch('fuerza-nacional.json?v='+Math.floor(Date.now()/36e5)).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(j){ if(!j || !j.paises) throw new Error('archivo vacío'); FN = j; return j; }).catch(function(e){ FN_PROM = null; throw e; });
   return FN_PROM;
  }
  function histPais(pais){
   if(HN_PROM[pais]) return HN_PROM[pais];
   HN_PROM[pais] = fetch('hist-nac-'+pais+'.json?v='+Math.floor(Date.now()/36e5)).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(j){
     var p = (j.p||[]).map(function(r){ return {id:r[0], sl:r[1], l:r[2], v:r[3], gl:r[4], gv:r[5], ts:r[6], kl:claveEq(r[2]), kv:claveEq(r[3])}; });
     HN[pais] = p; return p;
    }).catch(function(e){ HN_PROM[pais] = null; throw e; });
   return HN_PROM[pais];
  }
  function esCopaNac(){ return !!PAIS[LIGA_ACTUAL]; }
  /* partidos de un club en todas las competencias del país (más reciente primero) */
  function partidosClub(lista, nombre){
   var k = claveEq(nombre), out = [];
   lista.forEach(function(m){
    var L = m.kl===k || mismaClave(m.kl, k), V = !L && (m.kv===k || mismaClave(m.kv, k));
    if(L || V) out.push({f:L?m.gl:m.gv, c:L?m.gv:m.gl, ts:m.ts, casa:L, rival:L?m.v:m.l, sl:m.sl});
   });
   return out.sort(function(a,b){ return b.ts-a.ts; });
  }
  function formaClub(nombre, js){
   var h = '<div class="observ"><b>'+esc(nombre)+'</b></div>';
   if(!js.length) return h+'<div class="nota">Sin partidos de este equipo en las ligas y copas que cubre ESPN para este país (suele ser un equipo de división baja).</div>';
   var u = js.slice(0,6), v=0,e=0,d=0,gf=0,gc=0;
   var filas = u.map(function(m){
    var r = m.f>m.c?'V':(m.f<m.c?'D':'E'); if(r==='V') v++; else if(r==='D') d++; else e++; gf+=m.f; gc+=m.c;
    return '<div class="linea"><span><span class="forma" style="display:inline-flex;margin:0 8px 0 0;vertical-align:middle"><span class="'+r+'">'+r+'</span></span>'+
     (m.casa?'':'@ ')+esc(m.rival)+'<br><small style="color:var(--mut2)">'+esc(COMP[m.sl]||m.sl)+' · '+cuando(m.ts)+'</small></span><b>'+m.f+'–'+m.c+'</b></div>';
   }).join('');
   return h+'<div class="lineas">'+filas+'</div><div class="nota" style="margin-top:6px">Últimos '+u.length+' (todas las competencias): '+v+'V '+e+'E '+d+'D · goles '+gf+' a favor, '+gc+' en contra.</div>';
  }
  function h2hClub(lista, nL, nV){
   var kL = claveEq(nL), kV = claveEq(nV);
   function es(k, x){ return k===x || mismaClave(k, x); }
   var js = lista.filter(function(m){ return (es(m.kl,kL) && es(m.kv,kV)) || (es(m.kl,kV) && es(m.kv,kL)); }).sort(function(a,b){ return b.ts-a.ts; });
   if(!js.length) return '<div class="nota">No se han enfrentado en los últimos 14 meses (ligas y copas de este país).</div>';
   var a=0,b=0,e=0;
   var filas = js.slice(0,6).map(function(m){
    var Ls = es(m.kl,kL), gA = Ls?m.gl:m.gv, gB = Ls?m.gv:m.gl; if(gA>gB) a++; else if(gA<gB) b++; else e++;
    return '<div class="linea"><span>'+esc(m.l)+' – '+esc(m.v)+'<br><small style="color:var(--mut2)">'+esc(COMP[m.sl]||m.sl)+' · '+fechaC(m.ts)+'</small></span><b>'+m.gl+'–'+m.gv+'</b></div>';
   }).join('');
   return '<div class="h2h"><div><b>'+a+'</b><small>'+esc(nL)+'</small></div><div><b>'+e+'</b><small>Empates</small></div><div><b>'+b+'</b><small>'+esc(nV)+'</small></div></div>'+
    '<div class="lineas">'+filas+'</div><div class="nota" style="margin-top:6px">'+js.length+' '+(js.length===1?'partido':'partidos')+' en los últimos 14 meses (ligas y copas).</div>';
  }
  /* probabilidades con el motor de las ligas (calcularDC) y la fuerza del país */
  function probsCopa(pais, nL, nV){
   if(!FN || !FN.paises[pais]) return null;
   var f = FN.paises[pais], eL = buscarEnMapa(f.eq, nL), eV = buscarEnMapa(f.eq, nV);
   if(!eL || !eV || eL.n < 8 || eV.n < 8) return {falta: (!eL || eL.n<8) ? nL : nV};
   var antes = DCFIT;
   try{
    DCFIT = {eq:f.eq, c:f.c, gam:f.gam, hAvg:f.hAvg, aAvg:f.aAvg, wt:(FN.cfg && FN.cfg.wt)};
    var r = calcularDC({nombre:nL}, {nombre:nV});
    r.nL = eL.n; r.nV = eV.n;
    /* calibración: el modelo se quedaba corto con el favorito en copa (decía 64%, ganaba 80%). Se estira solo si pasó la prueba
       fuera de muestra en scripts/torneos_datos.js (cal.aplicado). Solo toca el 1X2; los goles quedan igual. */
    var cal = FN.cal;
    if(cal && cal.aplicado && cal.a > 0){
     var qL = Math.pow(r.pL, cal.a), qD = Math.pow(r.pD, cal.a), qV = Math.pow(r.pV, cal.a), sq = qL+qD+qV;
     r.pL0 = r.pL; r.pD0 = r.pD; r.pV0 = r.pV; r.pL = qL/sq; r.pD = qD/sq; r.pV = qV/sq; r.cal = cal.a;
    }
    return r;
   } finally { DCFIT = antes; }
  }
  function medTxt(pais){
   var m = FN && FN.med && (FN.med[pais] && FN.med[pais].x12 && FN.med[pais].x12.n >= 60 ? FN.med[pais] : FN.med.total), x = m && m.x12;
   if(!x || !x.n) return 'Todavía sin medir.';
   var cual = (FN.med[pais] && FN.med[pais] === m) ? 'en esta copa' : 'en las 5 copas juntas';
   var t = 'Medido '+cual+' (2 temporadas, '+x.n+' partidos con los dos equipos conocidos, cada uno con lo anterior): el favorito acertó '+pct0(x.acierto)+' del 1X2, contra '+pct0(x.aciertoBase)+' de ir siempre con lo más común'+
    (x.perdida < x.perdidaBase-0.005 ? ', y le gana a la frecuencia.' : ', pero en pérdida no le gana a la frecuencia: úsalo como referencia.');
   var tr = m.tramos && m.tramos['60-70'], tr7 = m.tramos && m.tramos['70+'];
   if(tr7 && tr7.n >= 20) t += ' Cuando dice 70%+, ganó el favorito '+pct0(tr7.favoritoGano)+' ('+tr7.n+').';
   else if(tr && tr.n >= 20) t += ' Cuando dice 60-70%, ganó el favorito '+pct0(tr.favoritoGano)+' ('+tr.n+').';
   var c = FN.cal;
   if(c && c.aplicado) t += ' Calibrado: los % de copa se estiran (exponente '+c.a+', elegido con 2024-25 y probado en '+c.prueba+' partidos después): pérdida '+c.antes.perdida+' → '+c.despues.perdida+'.';
   return t+' El marcador de ESPN en copas incluye la prórroga.';
  }
  function veredictoCopa(p, r){
   var mejor = Math.max(r.pL, r.pV), fav = r.pL>=r.pV ? p.local : p.visita;
   return '<div class="bar">'+
     '<span class="h" style="flex-grow:'+Math.max(r.pL,0.06)+'">'+pct(r.pL)+'</span>'+
     '<span class="d" style="flex-grow:'+Math.max(r.pD,0.06)+'">'+pct(r.pD)+'</span>'+
     '<span class="a" style="flex-grow:'+Math.max(r.pV,0.06)+'">'+pct(r.pV)+'</span></div>'+
    (mejor >= 0.5 ? '<div class="pick"><b>Favorito: '+esc(fav)+'</b>'+pct(mejor)+' en 90 minutos según el modelo.</div>' :
                    '<div class="pick no"><b>Parejo</b>Ninguno llega al 50% en 90 minutos.</div>')+
    '<div class="lineas">'+
     '<div class="linea"><span>'+esc(p.local)+' gana</span><b>'+pct(r.pL)+' · '+am(r.pL)+'</b></div>'+
     '<div class="linea"><span>Empate</span><b>'+pct(r.pD)+' · '+am(r.pD)+'</b></div>'+
     '<div class="linea"><span>'+esc(p.visita)+' gana</span><b>'+pct(r.pV)+' · '+am(r.pV)+'</b></div>'+
     '<div class="linea"><span>Pasa de ronda (aprox.)</span><b>'+esc(fav)+' '+pct(Math.max(r.pL,r.pV)+r.pD/2)+'</b></div></div>';
  }
  function cuerpoCopa(bodyEl, p){
   var pais = PAIS[LIGA_ACTUAL];
   bodyEl.innerHTML = '<div class="nota">Cargando la fuerza de los equipos de '+esc(LIGAS[LIGA_ACTUAL].nombre)+'…</div>';
   Promise.all([fuerza(), histPais(pais)]).then(function(res){
    var lista = res[1], jsL = partidosClub(lista, p.local), jsV = partidosClub(lista, p.visita), r = probsCopa(pais, p.local, p.visita);
    var obs = observacionesHtml([{nombre:p.local, escudo:p.escudoLocal, js:jsL}, {nombre:p.visita, escudo:p.escudoVisita, js:jsV}]);
    var ver, gol;
    if(r && !r.falta){
     ver = veredictoCopa(p, r) + '<h3>Observaciones</h3>'+obs+
      '<details class="comoLee"><summary>¿Cómo se calcula y qué tan confiable es?</summary><div class="nota">'+
       '<b>Cómo se calcula:</b> el mismo modelo de goles de las ligas, pero ajustado con la 1.ª y 2.ª división y las copas de este país juntas (así se compara un equipo de Primera con uno de Segunda). '+
       'Los porcentajes son a 90 minutos; «pasa de ronda» reparte el empate mitad y mitad (prórroga y penales). No sabe de rotaciones, que en copa son muchas.<br><br><b>Qué tan confiable es:</b> '+medTxt(pais)+'</div></details>';
     gol = golesBloque(r.lamL, r.lamV, p.local, p.visita, (FN.cfg && FN.cfg.rho) || 0, 'Con el mismo motor de las ligas (Más/Menos y Ambos anotan encogidos hacia el promedio del país). '+
      (function(){ var m = FN.med && FN.med.total; if(!m || !m.o25 || !m.o25.n) return ''; return 'Medido en '+m.o25.n+' partidos de copa: Más de 2.5 acertó '+pct0(m.o25.acierto)+' (lo más común: '+pct0(m.o25.aciertoBase)+'), Ambos anotan '+pct0(m.btts.acierto)+' ('+pct0(m.btts.aciertoBase)+').'; })(),
      {o15:r.overLin[1.5], o25:r.overLin[2.5], o35:r.overLin[3.5], btts:r.pBtts});
    } else {
     var falta = r && r.falta ? r.falta : null;
     ver = '<div class="aviso">'+(falta ? '⚠️ '+esc(falta)+' no tiene suficientes partidos en las ligas que cubre ESPN (suele ser de 3.ª división o más abajo), así que no hay porcentajes. Lo normal en ese cruce es que el de más categoría sea favorito claro.' :
       '⚠️ No pude cargar la fuerza de los equipos (fuerza-nacional.json).')+'</div><h3>Observaciones</h3>'+obs;
     gol = '<div class="nota">Sin porcentajes de goles: falta la fuerza de uno de los dos equipos.</div>';
    }
    bodyEl.innerHTML = tabsHtml([
     {t:'Veredicto', html:ver},
     {t:'Goles', html:gol},
     {t:'Forma', html:formaClub(p.local, jsL)+formaClub(p.visita, jsV)+casaVisitaHtml(p.local, jsL, p.visita, jsV)},
     {t:'Cara a cara', html:h2hClub(lista, p.local, p.visita)}
    ]);
   }).catch(function(e){
    bodyEl.innerHTML = '<div class="estado bad">No pude cargar los datos de la copa ('+esc(e.message)+'). Queda la vista básica:</div><div></div>';
    try{ _copaBase(bodyEl.lastChild, p); }catch(x){}
   });
  }
  function alGaneCopa(partidos){
   var cont = document.getElementById('algane'); if(!cont) return;
   var pais = PAIS[LIGA_ACTUAL], liga = LIGAS[LIGA_ACTUAL];
   cont.innerHTML = '<div class="estado">Calculando…</div>';
   fuerza().then(function(){
    if(PAIS[LIGA_ACTUAL] !== pais) return;
    var filas = [], reg = [], sin = 0;
    (partidos||[]).forEach(function(p){
     var r = probsCopa(pais, p.local, p.visita); if(!r || r.falta){ sin++; return; }
     var esL = r.pL >= r.pV;
     filas.push({nombre:esL?p.local:p.visita, rival:esL?p.visita:p.local, escudo:esL?p.escudoLocal:p.escudoVisita, pct:Math.max(r.pL,r.pV), cuando:etiquetaFecha(p.fecha)+(p.horaLocal?' · '+p.horaLocal:'')});
     try{ var hd = (!p.ts && p.hora) ? horaLocalDispositivo(p.fecha, p.hora) : null, ts = p.ts || (hd ? hd.getTime() : tsPartido(p));
      if(ts) reg.push({ts:ts, local:p.local, visita:p.visita, p:{L:r.pL, D:r.pD, A:r.pV}, liga:liga.nombre, slug:ESPN_SLUG[LIGA_ACTUAL]||'', ext:p.id}); }catch(e){}
    });
    try{ if(window.OVARegAuto && reg.length) OVARegAuto.registrar('fut', reg); }catch(e){}
    filas.sort(function(a,b){ return b.pct-a.pct; });
    cont.innerHTML = (filas.length ? filas.map(function(f,i){
      return '<div class="fila-rank"><div class="pos">'+(i+1)+'</div><img src="'+esc(f.escudo)+'" alt="">'+
       '<div class="nom">'+esc(f.nombre)+' vs '+esc(f.rival)+'<small>'+esc(f.cuando)+'</small></div><div class="pct">'+(f.pct*100).toFixed(1)+'%<em>90 min</em></div></div>';
     }).join('') : '<div class="estado">Ningún partido de este día tiene a los dos equipos con datos.</div>')+
     '<div class="estado" style="margin-top:10px">Probabilidad de ganar en 90 minutos con el modelo de las ligas (1.ª, 2.ª y copas del país juntas).'+(sin ? ' '+sin+' partido(s) sin datos de uno de los equipos (división baja).' : '')+'</div>';
   }).catch(function(e){ cont.innerHTML = '<div class="estado bad">No pude cargar fuerza-nacional.json: '+esc(e.message)+'</div>'; });
  }

  /* enganches */
  var _copaBase = pintarGameBodyCopa;   /* ya trae el de selecciones.js adentro */
  pintarGameBodyCopa = function(bodyEl, p){
   if(esCopaNac()) return cuerpoCopa(bodyEl, p);
   return _copaBase(bodyEl, p);
  };
  var _aplicar = aplicarSelectorDias;
  aplicarSelectorDias = function(){
   var r = _aplicar.apply(this, arguments);
   try{
    if(LIGA_ES_COPA){
     if(window.OVASel && OVASel.esSel()) OVASel.alGane(PARTIDOS);
     else if(esCopaNac()) alGaneCopa(PARTIDOS);
    }
   }catch(e){}
   return r;
  };
  if(typeof cargarLiga === 'function'){
   var _cargar = cargarLiga;
   cargarLiga = function(clave){
    if(PAIS[clave]){ fuerza().catch(function(){}); histPais(PAIS[clave]).catch(function(){}); }
    return _cargar.apply(this, arguments);
   };
  }

  /* el aviso de arriba decía «copa sin modelo» y «Forma y Cara a cara quedan vacíos»: ya no es así en selecciones ni en copas nacionales */
  if(typeof pintarEstado === 'function'){
   var _estado = pintarEstado;
   pintarEstado = function(){
    var r = _estado.apply(this, arguments);
    try{
     var sel = window.OVASel && OVASel.esSel(), nac = esCopaNac();
     if(sel || nac){
      var e = document.getElementById('estado'), t = e.textContent;
      t = t.replace(' · copa sin modelo', sel ? ' · Elo de selecciones (4 años, todos los torneos)' : ' · modelo de las ligas con 1.ª, 2.ª y copas del país')
           .replace(/\s*⚠️ No se leyó ningún resultado terminado:[^.]*\.[^.]*\.?/, '');
      e.textContent = t; if(t.indexOf('⚠️')<0 && t.indexOf('✗')<0) e.className = 'estado ok';
     }
    }catch(x){}
    return r;
   };
  }

  /* ================= ligas: Observaciones en el Veredicto ================= */
  if(typeof pintarGameBody === 'function'){
   var _pgb = pintarGameBody;
   pintarGameBody = function(bodyEl, p, eL, eV){
    var r = _pgb.apply(this, arguments);
    try{
     var term = (TERMINADOS||[]).slice();
     var de = function(n){ return term.filter(function(m){ return mismoEquipo(m.local, n) || mismoEquipo(m.visita, n); })
      .map(function(m){ var L = mismoEquipo(m.local, n); return {f:L?m.golesLocal:m.golesVisita, c:L?m.golesVisita:m.golesLocal, ts:tsPartido(m)||0, casa:L}; })
      .filter(function(m){ return m.f!=null && m.c!=null; }).sort(function(a,b){ return b.ts-a.ts; }); };
     var ver = bodyEl.querySelector('.pane');
     var antesDe = ver && ver.querySelector('details.comoLee');
     if(ver && term.length) (antesDe || ver).insertAdjacentHTML(antesDe ? 'beforebegin' : 'beforeend', '<h3>Observaciones</h3>'+observacionesHtml([{nombre:p.local, escudo:p.escudoLocal, js:de(p.local)}, {nombre:p.visita, escudo:p.escudoVisita, js:de(p.visita)}])+
      '<div class="nota">Rachas en esta competencia.</div>');
    }catch(e){}
    return r;
   };
  }
 }catch(e){ if(window.console) console.error('torneos.js', e); }
})();
