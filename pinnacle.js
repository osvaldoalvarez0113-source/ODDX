/* mercado.js
   Muestra dentro de OVA lo que dice el mercado (Pinnacle, sin margen) y el precio maximo
   que conviene pagar en Kalshi. Los datos vienen de pinnacle-datos.json, que escribe el escaner
   "Valor vs Pinnacle". Este archivo SOLO LEE: no cambia ningun calculo ni ningun pick de OVA.
   Si pinnacle-datos.json no existe o falla, no pasa nada y la app queda igual. */
(function(){
  'use strict';
  var DATA=null, VER=0, TIMER=null, ULT=0;

  function norm(s){
    s=String(s==null?'':s).toLowerCase();
    try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
    return s.replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  }
  function nick(n){
    var w=norm(n).split(' '), l=w[w.length-1]||'';
    if((l==='sox'||l==='jays')&&w.length>1) return w[w.length-2]+' '+l;
    return l;
  }
  function tiene(texto,n){ var k=nick(n); return !!k && (' '+texto+' ').indexOf(' '+k+' ')>=0; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function pct(x){ return (x*100).toFixed(1)+'%'; }

  function fechaApp(){ try{ var e=document.getElementById('fecha'); return (e&&e.value)||''; }catch(e){ return ''; } }
  function diaET(iso){ try{ return new Date(iso).toLocaleDateString('en-CA',{timeZone:'America/New_York'}); }catch(e){ return ''; } }
  function diaMenos(d){ try{ var t=new Date(d+'T12:00:00Z'); t.setUTCDate(t.getUTCDate()-1); return t.toISOString().slice(0,10); }catch(e){ return ''; } }

  function edadMin(){ return DATA&&DATA.generado ? Math.max(0,Math.round((Date.now()-Date.parse(DATA.generado))/60000)) : null; }
  function edadTxt(){
    var m=edadMin(); if(m==null) return '';
    if(m<90) return 'hace '+m+' min';
    return 'hace '+Math.round(m/60)+' h';
  }

  /* busca el juego del mercado que corresponde al texto (los dos equipos tienen que aparecer) */
  function buscar(texto){
    if(!DATA||!DATA.juegos) return null;
    var t=norm(texto), f=fechaApp(), exacto=null, vecino=null, cualquiera=null;
    DATA.juegos.forEach(function(g){
      if(!g||!g.n||!tiene(t,g.n[0])||!tiene(t,g.n[1])) return;
      var d=diaET(g.t);
      if(!f){ if(!cualquiera) cualquiera=g; return; }
      if(d===f){ if(!exacto) exacto=g; }
      else if(diaMenos(d)===f){ if(!vecino) vecino=g; }
    });
    return exacto||vecino||cualquiera;
  }

  function lado(g,textoGanador){
    var t=norm(textoGanador);
    if(tiene(t,g.n[0])&&!tiene(t,g.n[1])) return 0;
    if(tiene(t,g.n[1])&&!tiene(t,g.n[0])) return 1;
    return -1;
  }

  function kalshiTxt(g,i,conAhora){
    var s='Kalshi: compra hasta '+g.tope[i]+'\u00a2';
    var k=g.casas&&g.casas.kalshi;
    if(conAhora&&k&&k.d&&k.d[i]>1){
      var c=Math.round(100/k.d[i]);
      s+=' \u00b7 ahora '+c+'\u00a2';
      if(c<=g.tope[i]) s+=' \u2705 hay ventaja';
    }
    return s;
  }

  /* tarjeta de cada juego (lista de juegos) */
  function aplicarJuego(el){
    var m=el.querySelector('.match'); if(!m) return;
    if(el.getAttribute('data-mk')===String(VER)) return;
    var viejo=m.querySelectorAll('.mkt'); for(var q=0;q<viejo.length;q++) viejo[q].parentNode.removeChild(viejo[q]);
    el.setAttribute('data-mk',String(VER));
    var base=m.cloneNode(true); /* texto sin nuestra marca */
    var g=buscar(base.textContent); if(!g||!g.fair||!g.tope) return;
    var i=g.fair[0]>=g.fair[1]?0:1;
    var s=document.createElement('small'); s.className='mkt';
    s.style.cssText='display:block;margin-top:3px;font-size:11.5px;opacity:.95';
    s.innerHTML='\ud83d\udcca Mercado: <b>'+esc(g.n[i])+' '+pct(g.fair[i])+'</b> \u00b7 '+esc(kalshiTxt(g,i,true))+
                ' <span style="opacity:.7">('+edadTxt()+')</span>';
    m.appendChild(s);
  }

  /* fila del ranking "Al gane" */
  function aplicarFila(f){
    if(f.getAttribute('data-mk')===String(VER)) return;
    f.setAttribute('data-mk',String(VER));
    var t=f.querySelector('.txt'); if(!t) return;
    var viejo=t.querySelectorAll('.mkt'); for(var q=0;q<viejo.length;q++) viejo[q].parentNode.removeChild(viejo[q]);
    var b=t.querySelector('b'), sp=t.querySelector('span');
    var g=buscar(t.textContent); if(!g||!g.fair||!g.tope) return;
    var i=lado(g,b?b.textContent:''); if(i<0) return;
    var mkt=g.fair[i]*100, pc=f.querySelector('.pct'), ova=pc?parseFloat(pc.textContent):NaN;
    var linea='\ud83d\udcca Mercado '+pct(g.fair[i])+' \u00b7 '+kalshiTxt(g,i,true);
    var aviso='';
    if(isFinite(ova)){
      var dif=ova-mkt;
      if(Math.abs(dif)>=7) aviso=' \u00b7 <span style="color:#F59E0B">\u26a0 OVA '+(dif>0?'+':'')+dif.toFixed(0)+' pts vs mercado: gu\u00edate por el mercado</span>';
    }
    var s=document.createElement('span'); s.className='mkt';
    s.style.cssText='display:block;margin-top:2px;font-size:11.5px;color:var(--mut)';
    s.innerHTML=esc(linea)+aviso;
    t.appendChild(s);
  }

  function nota(){
    var caja=document.getElementById('algane'); if(!caja) return;
    var hay=caja.querySelector('.fila .mkt'); var ya=caja.querySelector('.mktnota');
    if(!hay){ if(ya) ya.parentNode.removeChild(ya); return; }
    if(ya&&ya.getAttribute('data-mk')===String(VER)) return;
    if(ya) ya.parentNode.removeChild(ya);
    var d=document.createElement('div'); d.className='leyenda mktnota'; d.setAttribute('data-mk',String(VER));
    d.innerHTML='<b>\ud83d\udcca Mercado</b> = probabilidad de Pinnacle sin margen, que es el precio m\u00e1s afilado que hay. '+
      'En la prueba de 761 juegos, cuando OVA y Pinnacle no coincid\u00edan, acert\u00f3 m\u00e1s Pinnacle; por eso un \u26a0 '+
      'significa que conviene fiarse del mercado. <b>Kalshi: compra hasta X\u00a2</b> es el precio m\u00e1ximo para '+
      'quedar con 3% de ventaja despu\u00e9s de la comisi\u00f3n. Datos del mercado '+edadTxt()+'.';
    caja.appendChild(d);
  }

  function pasar(){
    if(!DATA) return;
    try{
      var j=document.querySelectorAll('.game'); for(var a=0;a<j.length;a++) aplicarJuego(j[a]);
      var f=document.querySelectorAll('#algane .fila'); for(var b=0;b<f.length;b++) aplicarFila(f[b]);
      nota();
    }catch(e){}
  }
  function agendar(){ if(TIMER) return; TIMER=setTimeout(function(){ TIMER=null; pasar(); },200); }

  function urls(){
    var u=['pinnacle-datos.json?t='+Date.now()];
    try{
      var h=location.hostname, m=/^([^.]+)\.github\.io$/i.exec(h), r=location.pathname.split('/')[1];
      if(m&&r) u.push('https://raw.githubusercontent.com/'+m[1]+'/'+r+'/main/pinnacle-datos.json?t='+Date.now());
    }catch(e){}
    return u;
  }
  function pedir(lista,k){
    if(k>=lista.length) return Promise.resolve(null);
    return fetch(lista[k],{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('http'); return r.json(); })
      .catch(function(){ return pedir(lista,k+1); });
  }
  function cargar(){
    return pedir(urls(),0).then(function(j){
      if(!j||!j.juegos||!j.generado) return;
      var viejo=Date.now()-Date.parse(j.generado);
      if(!(viejo<36*3600e3)) return;   /* datos de hace mas de 36 h: no se muestran */
      DATA=j; ULT=Date.now(); VER++; pasar();
    }).catch(function(){});
  }

  function iniciar(){
    cargar();
    try{ new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true}); }catch(e){}
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden&&(!DATA||Date.now()-ULT>10*60000)) cargar();
    });
    window.OVAMercado={datos:function(){ return DATA; },recargar:cargar};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
