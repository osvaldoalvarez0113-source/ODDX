/*OVA_SERVIDOR_RAILWAY_PARCHE*/
/* Servidor Railway: compara (y opcionalmente aplica) el calculo del servidor sobre el Veredicto de cada juego de MLB.
   Este archivo es la UNICA copia del parche (antes habia otra pegada dentro de index.html y las dos peleaban por la misma caja).

   APLICAR_ARRIBA = true   -> el Veredicto muestra los numeros del servidor (como estaba).
   APLICAR_ARRIBA = false  -> el Veredicto queda con el calculo propio de OVA y el servidor solo sale en la caja de comparacion.

   OJO: el ranking de valor, «Guardar», «Al gane» y el combo SIEMPRE usan el calculo propio de OVA (index.html), nunca el del servidor.
   Si los dos numeros difieren, lo que ves arriba y lo que se guarda en Mis picks no son el mismo. Por eso la caja avisa la diferencia. */
(function(){
try{
  var APLICAR_ARRIBA = true;
  var AVISO_DIF = 1.5;   /* puntos de probabilidad a partir de los cuales se resalta la diferencia */
  var SERVIDOR = 'https://worker-production-be04.up.railway.app';
  var cacheServidor = null, cacheFecha = null;

  function fetchServidor(fechaISO){
    if(cacheServidor && cacheFecha===fechaISO) return Promise.resolve(cacheServidor);
    return fetch(SERVIDOR+'/api/analisis-hoy?fecha='+fechaISO, {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(d){
        cacheServidor = d; cacheFecha = fechaISO;
        return d;
      });
  }

  function americana(p){
    if(p==null||p<=0||p>=100) return '—';
    if(p>=50) return '-'+Math.round(p/(100-p)*100);
    return '+'+Math.round((100-p)/p*100);
  }

  function pickHtmlSrv(vc, pctGana, ganaName, idGana, cuotaJusta){
    var esco = (typeof escudo === 'function') ? escudo(idGana, 24) : '';
    var cg = (typeof CORTE_GRIS   !== 'undefined') ? CORTE_GRIS   : 0.50;
    var cs = (typeof CORTE_SOLIDO !== 'undefined') ? CORTE_SOLIDO : 1.20;
    var cf = (typeof CORTE_FUERTE !== 'undefined') ? CORTE_FUERTE : 1.70;
    if(vc < cg){
      return '<div class="pick no"><div class="q">Sin pick al ganador</div><div class="r">Ventaja de solo '+vc.toFixed(2)+' carreras (servidor), por debajo del corte de '+cg.toFixed(2)+'. Muy parejos.</div></div>';
    }
    if(vc >= cf){
      return '<div class="pick big"><div class="q">'+esco+'Juégale a '+ganaName+'</div><div class="r">Gran oportunidad (servidor) · '+pctGana.toFixed(1)+'% · cuota justa '+cuotaJusta+' · ventaja de '+vc.toFixed(2)+' carreras.</div></div>';
    }
    if(vc >= cs){
      return '<div class="pick"><div class="q">'+esco+'Juégale a '+ganaName+'</div><div class="r">Ventaja sólida (servidor) · '+pctGana.toFixed(1)+'% · cuota justa '+cuotaJusta+' · ventaja de '+vc.toFixed(2)+' carreras.</div></div>';
    }
    return '<div class="pick no"><div class="q">Zona gris</div><div class="r">'+ganaName+' sale arriba con '+pctGana.toFixed(1)+'% y '+vc.toFixed(2)+' carreras de ventaja (servidor), que no llega a '+cs.toFixed(2)+'. Sin pick.</div></div>';
  }

  function actualizarConServidor(el, j){
    var c = el._calc, d = el._d;
    if(!c || !d || !j || !j.home || !j.away) return;
    var body = el.querySelector('.body');
    if(!body) return;

    var chH = j.home.chance, chA = j.away.chance;
    if(chH == null || chA == null) return;
    var favHome  = chH >= chA;
    var pctGana  = favHome ? chH : chA;
    var ganaName = favHome ? c.nomH : c.nomA;
    var idGana   = favHome ? (d.h.team && d.h.team.id) : (d.a.team && d.a.team.id);
    var vc       = Math.abs(j.delta != null ? j.delta : 0);
    var cuotaJusta = (typeof american === 'function') ? american(pctGana) : americana(pctGana);

    var tabV = body.querySelector('.tab[data-t="v"]');
    if(!tabV) return;

    var hero = tabV.querySelector('.ovaHero');
    if(hero){
      var sides = hero.querySelectorAll('.side');
      if(sides.length === 2){
        var pcA = sides[0].querySelector('.pc');
        var pcH = sides[1].querySelector('.pc');
        if(pcA) pcA.textContent = chA.toFixed(1) + '%';
        if(pcH) pcH.textContent = chH.toFixed(1) + '%';
        sides[0].classList.toggle('fav', !favHome);
        sides[1].classList.toggle('fav', favHome);
      }
      var cxb = hero.querySelector('.cx b');
      if(cxb) cxb.textContent = cuotaJusta;
      var cap = hero.querySelector('.cap');
      if(cap){
        var cg2 = (typeof CORTE_GRIS !== 'undefined') ? CORTE_GRIS : 0.50;
        cap.innerHTML = (vc < cg2)
          ? 'Muy parejo (servidor): ventaja de solo <b>' + vc.toFixed(2) + '</b> carreras'
          : '<b>' + ganaName + '</b> favorito (servidor) · ventaja de <b>' + vc.toFixed(2) + '</b> carreras';
      }
    }

    var kpi = tabV.querySelector('.kpi');
    if(kpi){
      var divs = kpi.querySelectorAll('div');
      if(divs[0]){
        var b0 = divs[0].querySelector('b'), s0 = divs[0].querySelector('span');
        if(b0) b0.textContent = pctGana.toFixed(1) + '%';
        if(s0) s0.textContent = ganaName + ' gana';
      }
      if(divs[1]){
        var b1 = divs[1].querySelector('b');
        if(b1) b1.textContent = cuotaJusta;
      }
      if(divs[2] && j.total && j.total.esperado != null){
        var b2 = divs[2].querySelector('b');
        if(b2) b2.textContent = j.total.esperado.toFixed(1);
      }
    }

    var pickHtml = pickHtmlSrv(vc, pctGana, ganaName, idGana, cuotaJusta);
    body.querySelectorAll('.pickbox').forEach(function(pb){ pb.innerHTML = pickHtml; });
  }

  /* Linea con el numero propio de OVA y la diferencia contra el servidor. */
  function notaPropia(c, j){
    if(!c || c.pH == null || c.pA == null || !j || !j.home || j.home.chance == null) return '';
    var d = Math.abs(c.pH - j.home.chance);
    var col = d >= AVISO_DIF ? '#FBBF24' : '#9DB2C8';
    return '<br><span style="color:'+col+'">OVA propio: '+c.nomA+' <b>'+c.pA.toFixed(1)+'%</b> · '+c.nomH+' <b>'+c.pH.toFixed(1)+'%</b>'+
      ' (difiere '+d.toFixed(1)+' pts del servidor). «Guardar», «Al gane» y el combo usan el número propio de OVA.</span>';
  }

  /* Una línea: lo que dice el servidor y si coincide con OVA. Al tocar se despliega el detalle. */
  function chipHtml(c, j, h, a){
    var partes = '☁️ <b style="color:#F1F5FB">Servidor</b> · '+(a?a.nombre:'Visita')+' '+(a?a.chance:'—')+'% · '+(h?h.nombre:'Local')+' '+(h?h.chance:'—')+'%';
    var cola = '';
    if(c && c.pH != null && h && h.chance != null){
      var d = Math.abs(c.pH - h.chance);
      cola = d >= AVISO_DIF ? ' · <span style="color:#FBBF24">⚠ OVA propio difiere '+d.toFixed(1)+' pts</span>' : ' · <span style="color:#34D399">✓ coincide con OVA</span>';
    }
    return '<div class="srv-chip" role="button" tabindex="0" style="cursor:pointer;display:flex;gap:8px;align-items:center;justify-content:space-between"><span>'+partes+cola+'</span><span class="srv-fl" style="color:#9DB2C8">▾</span></div>';
  }
  function ligarChip(caja){
    var chip = caja.querySelector('.srv-chip'), det = caja.querySelector('.srv-det');
    if(!chip || !det) return;
    function alt(){ det.hidden = !det.hidden; var f = caja.querySelector('.srv-fl'); if(f) f.textContent = det.hidden ? '▾' : '▴'; }
    chip.addEventListener('click', alt);
    chip.addEventListener('keydown', function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); alt(); } });
  }

  function pintarComparacion(el){
    var body = el.querySelector('.body');
    if(!body) return;
    var tabV = body.querySelector('.tab[data-t="v"]');
    if(!tabV) return;

    /* ya pintada y terminada, o pintandose ahora: no repetir (el observador dispara varias veces al abrir un juego) */
    var existente = tabV.querySelector('.srv-compara');
    if(existente && existente.dataset.listo === '1') return;
    if(el.__srvBusy) return;
    el.__srvBusy = true;
    if(existente) existente.remove();

    var fe = document.getElementById('fecha');
    var fechaISO = (fe && fe.value) || (new Date()).toISOString().slice(0,10);

    var caja = document.createElement('div');
    caja.className = 'srv-compara';
    caja.style.cssText = 'background:#131D2C;border:1px solid #2A3E56;border-left:3px solid #22D3EE;border-radius:10px;padding:9px 12px;margin:10px 0;font-size:12.5px;color:#9DB2C8;line-height:1.5';
    caja.innerHTML = '<b style="color:#F1F5FB">☁️ Servidor Railway</b><br>Buscando...';
    tabV.insertBefore(caja, tabV.firstChild);

    fetchServidor(fechaISO).then(function(d){
      var juegos = (d && d.juegos) || [];
      var pk = el._pk;
      var j = null;
      for(var i=0;i<juegos.length;i++){ if(String(juegos[i].gamePk)===String(pk)){ j=juegos[i]; break; } }
      if(!j){
        caja.innerHTML = '<b style="color:#F1F5FB">☁️ Servidor Railway</b><br>Este juego todavía no está calculado ahí (puede que falte lineup confirmado o que el reloj no haya pasado por él todavía). Se muestran los números propios de OVA.';
        caja.dataset.listo = '1';
        return;
      }
      if(APLICAR_ARRIBA) actualizarConServidor(el, j);
      var h = j.home, a = j.away;
      var t = j.total || {};
      var pon = j.ponches || {};
      var txt = '<b style="color:#F1F5FB">☁️ Servidor Railway</b> <span style="color:#9DB2C8">'+
        (APLICAR_ARRIBA ? '(ya aplicado arriba en el Veredicto)' : '(solo comparación: el Veredicto usa el cálculo propio de OVA)')+'</span><br>';
      txt += (h?h.nombre:'Local')+': <b style="color:#F1F5FB">'+(h?h.chance:'—')+'%</b> ('+americana(h?h.chance:null)+') · ';
      txt += (a?a.nombre:'Visita')+': <b style="color:#F1F5FB">'+(a?a.chance:'—')+'%</b> ('+americana(a?a.chance:null)+')<br>';
      if(t.esperado!=null) txt += 'Total esperado: <b style="color:#F1F5FB">'+t.esperado+'</b> · ';
      if(t.carreras_esperadas) txt += 'carreras: '+t.carreras_esperadas.away+' / '+t.carreras_esperadas.home+'<br>';
      if(pon.away!=null || pon.home!=null) txt += 'Ponches esperados: '+(pon.away!=null?pon.away:'—')+' / '+(pon.home!=null?pon.home:'—');
      txt += notaPropia(el._calc, j);
      caja.innerHTML = chipHtml(el._calc, j, h, a) + '<div class="srv-det" hidden style="margin-top:8px;border-top:1px solid #2A3E56;padding-top:8px">' + txt + '</div>';
      ligarChip(caja);
      caja.dataset.listo = '1';
    }).catch(function(e){
      caja.innerHTML = '<b style="color:#F1F5FB">☁️ Servidor Railway</b><br><span style="color:#F87171">No se pudo conectar (' + e.message + '). Revisa tu internet o si el servidor está caido. Se muestran los números propios de OVA.</span>';
    }).then(function(){ el.__srvBusy = false; });
  }

  function esperarYPintar(el){
    if(typeof el._cargar !== 'function') return;
    el._cargar().then(function(){
      setTimeout(function(){ pintarComparacion(el); }, 50);
    });
  }

  if(window.MutationObserver){
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='attributes' && m.attributeName==='class'){
          var el = m.target;
          if(el.classList && el.classList.contains('game') && el.classList.contains('open')){
            esperarYPintar(el);
          }
        }
      });
    }).observe(document.body, {attributes:true, subtree:true, attributeFilter:['class']});
  }
}catch(e){ console.error('parche servidor railway:', e); }
})();
