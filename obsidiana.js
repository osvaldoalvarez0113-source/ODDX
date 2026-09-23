/* OVA · Obsidiana — un solo archivo.
   1) tema por defecto + splash (con variante distinta segun el tema)
   2) cuatro temas extra para el selector 🎨: Platino IA, Esmeralda Real, Carbon Editorial, Zafiro
   3) tira de "Destacados" arriba de la lista de juegos, con forma distinta por diseno
   No toca ningun calculo, ningun fetch, ninguna funcion existente de tu app.
   Todo envuelto en try/catch: si algo fallara, tu app sigue igual que sin este archivo. */
(function(){
"use strict";

/* ================= 1. estilos base + splash ================= */
try{
  var baseCss = ""
  + "#ovaObsSplash{position:fixed;inset:0;z-index:99999;background:var(--bg,#0A0908);"
  + "display:flex;flex-direction:column;align-items:center;justify-content:center;"
  + "transition:opacity .85s ease, visibility .85s ease;}"
  + "#ovaObsSplash.hide{opacity:0;visibility:hidden;pointer-events:none;}"
  + "#ovaObsSplash .ova-word{margin-top:22px;font-size:13px;font-weight:600;letter-spacing:.5em;"
  + "color:var(--mut,#CBBFA5);opacity:0;animation:ovaObsWord .8s ease forwards 1.3s;}"
  + "@keyframes ovaObsWord{to{opacity:1;}}"
  + "@media (prefers-reduced-motion:reduce){#ovaObsSplash *{animation:none !important;opacity:1 !important;stroke-dashoffset:0 !important;}}"
  /* oro: costuras */
  + ".ova-seam{width:120px;height:120px;position:relative;}"
  + ".ova-seam svg{position:absolute;inset:0;width:100%;height:100%;}"
  + ".ova-seam path{fill:none;stroke:var(--hot,#F0CE6B);stroke-width:1.5;stroke-linecap:round;"
  + "stroke-dasharray:1;stroke-dashoffset:1;animation:ovaDraw 1.5s cubic-bezier(.65,0,.35,1) forwards;}"
  + ".ova-seam path:nth-child(2){animation-delay:.4s;} .ova-seam path:nth-child(3){animation-delay:.8s;}"
  + "@keyframes ovaDraw{to{stroke-dashoffset:0;}}"
  /* platino: radar */
  + ".ova-radar{width:110px;height:110px;position:relative;border-radius:50%;border:1px solid rgba(79,168,255,.3);}"
  + ".ova-radar::before,.ova-radar::after{content:'';position:absolute;border-radius:50%;border:1px solid rgba(79,168,255,.16);}"
  + ".ova-radar::before{inset:20px;} .ova-radar::after{inset:40px;}"
  + ".ova-sweep{position:absolute;inset:0;border-radius:50%;overflow:hidden;}"
  + ".ova-sweep i{position:absolute;inset:0;background:conic-gradient(from 0deg, rgba(124,255,224,.55), transparent 35%);"
  + "animation:ovaSpin 1.5s linear infinite;display:block;}"
  + "@keyframes ovaSpin{to{transform:rotate(360deg);}}"
  /* esmeralda: sello */
  + ".ova-seal{width:88px;height:88px;border-radius:50%;border:2px solid var(--acc,#D4AF37);"
  + "display:flex;align-items:center;justify-content:center;transform:scale(.5);opacity:0;"
  + "animation:ovaStamp .6s cubic-bezier(.2,1.4,.4,1) forwards .25s;}"
  + ".ova-seal span{font-family:Georgia,serif;font-size:24px;font-weight:700;color:var(--acc,#D4AF37);}"
  + "@keyframes ovaStamp{60%{transform:scale(1.08);opacity:1;}100%{transform:scale(1);opacity:1;}}"
  /* zafiro: cristal */
  + ".ova-frost{width:104px;height:104px;}"
  + ".ova-frost svg{width:100%;height:100%;}"
  + ".ova-frost path{fill:none;stroke:var(--hot,#C9D4EE);stroke-width:1;stroke-linecap:round;opacity:0;"
  + "animation:ovaCrystal 1.6s ease forwards;}"
  + ".ova-frost path:nth-child(1){animation-delay:0s;} .ova-frost path:nth-child(2){animation-delay:.15s;}"
  + ".ova-frost path:nth-child(3){animation-delay:.3s;} .ova-frost path:nth-child(4){animation-delay:.45s;}"
  + "@keyframes ovaCrystal{from{opacity:0;transform:scale(.4);}to{opacity:1;transform:scale(1);}}"
  /* glass generico sobre cualquier tema con blur activo */
  + "html[data-skin] .game,html[data-skin] .ajustes,html[data-skin] .pk,html[data-skin] .cuotasbox,"
  + "html[data-skin] .row.hcrow,html[data-skin] .fila-rank,html[data-skin] .fila,html[data-skin] .ovaHero{"
  + "-webkit-backdrop-filter:var(--x-blur,none);backdrop-filter:var(--x-blur,none);}"
  + "html[data-skin=oro] .game,html[data-skin=oro] .ajustes,html[data-skin=oro] .pk,html[data-skin=oro] .cuotasbox,"
  + "html[data-skin=oro] .row.hcrow,html[data-skin=oro] .fila-rank,html[data-skin=oro] .fila,html[data-skin=oro] .ovaHero{"
  + "background:rgba(27,24,18,.55) !important;-webkit-backdrop-filter:blur(16px) saturate(140%);"
  + "backdrop-filter:blur(16px) saturate(140%);border-color:rgba(201,162,74,.24) !important;}"
  + "html[data-skin=oro] body::before{background:"
  + "radial-gradient(55% 38% at 12% 0%,rgba(201,162,74,.11),transparent 60%),"
  + "radial-gradient(45% 32% at 100% 100%,rgba(201,162,74,.07),transparent 60%),var(--x-fixed);}"
  + "html[data-skin=oro] .pick.big{box-shadow:0 0 26px -6px rgba(240,206,107,.4);}";
  var st0 = document.createElement("style");
  st0.id = "ovaObsBase";
  st0.textContent = baseCss;
  document.head.appendChild(st0);
}catch(e){}

/* tema por defecto la primera vez */
try{
  if(!localStorage.getItem("ova_skin")){
    localStorage.setItem("ova_skin","oro");
    var aplicarOro = function(){
      if(window.OVASkins && OVASkins.apply){ OVASkins.apply("oro"); }
      else{
        document.documentElement.setAttribute("data-skin","oro");
        if(window.__ovaFont) window.__ovaFont("oro");
      }
    };
    aplicarOro();
    var intentos = 0;
    var reintentar = setInterval(function(){
      intentos++;
      if(document.documentElement.getAttribute("data-skin")==="oro" || intentos>20){ clearInterval(reintentar); return; }
      aplicarOro();
    }, 100);
  }
}catch(e){}

/* splash, variante segun el tema activo */
function ovaSplashHtml(skin){
  if(skin==="platino") return '<div class="ova-radar"><div class="ova-sweep"><i></i></div></div><div class="ova-word">INICIALIZANDO OVA</div>';
  if(skin==="esmeralda") return '<div class="ova-seal"><span>O</span></div><div class="ova-word">CASA DE VENTAJA</div>';
  if(skin==="zafiro") return '<div class="ova-frost"><svg viewBox="0 0 100 100">'
    +'<path d="M50 10 L50 90"/><path d="M10 50 L90 50"/><path d="M20 20 L80 80"/><path d="M80 20 L20 80"/>'
    +'</svg></div><div class="ova-word">O V A</div>';
  return '<div class="ova-seam"><svg viewBox="0 0 100 100" aria-hidden="true">'
    +'<path d="M50 10 A40 40 0 0 1 90 50" pathLength="1"/>'
    +'<path d="M90 50 A40 40 0 0 1 50 90" pathLength="1"/>'
    +'<path d="M50 90 A40 40 0 0 1 10 50 A40 40 0 0 1 50 10" pathLength="1"/>'
    +'</svg></div><div class="ova-word">O &middot; V &middot; A</div>';
}
function mostrarSplash(){
  try{
    var app = document.documentElement.getAttribute("data-app") || "x";
    var key = "ova_splash_" + app;
    if(sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key,"1");
    var skin = (function(){ try{ return localStorage.getItem("ova_skin")||"oro"; }catch(e){ return "oro"; } })();
    var d = document.createElement("div");
    d.id = "ovaObsSplash";
    d.innerHTML = ovaSplashHtml(skin);
    if(document.body) document.body.insertBefore(d, document.body.firstChild);
    setTimeout(function(){
      d.classList.add("hide");
      setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 950);
    }, 1650);
  }catch(e){}
}
if(document.body) mostrarSplash(); else document.addEventListener("DOMContentLoaded", mostrarSplash);


/* ================= 2. cuatro temas nuevos para 🎨 ================= */
try{
  var skinCss = ""
  /* Platino IA */
  + "html[data-skin=platino]{color-scheme:dark;"
  + "--bg:#08090C;--bg1:#101318;--bg2:#171B22;--bg3:#20252E;--line:#232830;--line2:#39414D;"
  + "--txt:#F1F4F8;--mut:#B7C1CE;--mut2:#8892A0;--acc:#4FA8FF;--acc2:#7CC4FF;--accTx:#03101F;"
  + "--hot:#7CFFE0;--hotTx:#02201A;--good:#5EEAD4;--bad:#FF8A80;--info:#4FA8FF;--ia:#7CFFE0;"
  + "--cond:'Space Grotesk',system-ui,sans-serif;--body:'Space Grotesk',system-ui,sans-serif;--mono:'Space Grotesk',system-ui,sans-serif;"
  + "--r:12px;--r2:18px;--x-topbg:rgba(8,9,12,.88);--x-navbg:rgba(8,9,12,.92);--x-fhead:#08090C;"
  + "--x-errbg:#2A1418;--x-errbd:#5C2A30;--x-errb:#FFB3BE;--x-okbg:#0B2A26;--x-oktx:#7CFFE0;"
  + "--x-flbg:#2A1E10;--x-fltx:#FFCB8A;--x-pvbg:#0B2A26;--x-pvbd:#1E6B5C;--x-teqon:#12222F;"
  + "--x-iabg:#0B222F;--x-iabd:#1E4E6B;--x-glow:rgba(79,168,255,.14);--x-headglow:rgba(124,255,224,.35);"
  + "--x-lead:linear-gradient(90deg,#2E8FE0,#7CFFE0);--x-leadglow:rgba(124,255,224,.5);"
  + "--x-shadow:0 0 0 1px rgba(79,168,255,.12),0 0 30px -10px rgba(124,255,224,.3),0 24px 48px -22px rgba(0,0,0,.95);"
  + "--x-tabtx:#03101F;--x-atx:#03101F;--x-goodbg:linear-gradient(135deg,rgba(94,234,212,.15),rgba(94,234,212,.03));"
  + "--x-goodbd:rgba(94,234,212,.4);--x-warnbg:rgba(124,255,224,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(79,168,255,.18),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:blur(14px) saturate(150%);--x-onhead:#7CFFE0;"
  + "--x-fixed:linear-gradient(rgba(79,168,255,.045) 1px,transparent 1px) 0 0/32px 32px,"
  + "linear-gradient(90deg,rgba(79,168,255,.045) 1px,transparent 1px) 0 0/32px 32px,"
  + "radial-gradient(70% 45% at 85% 0%,rgba(124,255,224,.10),transparent 60%);}"
  + "html[data-skin=platino] .game,html[data-skin=platino] .ajustes,html[data-skin=platino] .pk,"
  + "html[data-skin=platino] .cuotasbox,html[data-skin=platino] .row.hcrow,html[data-skin=platino] .fila-rank,"
  + "html[data-skin=platino] .fila,html[data-skin=platino] .ovaHero{background:rgba(16,19,24,.55) !important;"
  + "border-color:rgba(79,168,255,.22) !important;}"

  /* Esmeralda Real */
  + "html[data-skin=esmeralda]{color-scheme:dark;"
  + "--bg:#04120C;--bg1:#0A2118;--bg2:#113123;--bg3:#18402E;--line:#194330;--line2:#2C6B4A;"
  + "--txt:#F0F7F1;--mut:#B9D6C4;--mut2:#84A896;--acc:#D4AF37;--acc2:#E8CA6A;--accTx:#1C1300;"
  + "--hot:#F0CE6B;--hotTx:#1A1305;--good:#6FE3A0;--bad:#FF9B8A;--info:#D4AF37;--ia:#6FDDD3;"
  + "--cond:'Cormorant Garamond',Georgia,serif;--body:'Inter',system-ui,sans-serif;--mono:'Inter',system-ui,sans-serif;"
  + "--r:8px;--r2:16px;--x-topbg:rgba(4,18,12,.92);--x-navbg:rgba(4,18,12,.95);--x-fhead:#04120C;"
  + "--x-errbg:#2A1614;--x-errbd:#5A2B25;--x-errb:#F5B5A9;--x-okbg:#0F2F1D;--x-oktx:#8FF0BA;"
  + "--x-flbg:#2E1A14;--x-fltx:#FFB4A5;--x-pvbg:#0F2F1D;--x-pvbd:#2F7A4C;--x-teqon:#1D3324;"
  + "--x-iabg:#0B2C2A;--x-iabd:#1A6A63;--x-glow:rgba(212,175,55,.12);--x-headglow:rgba(212,175,55,.32);"
  + "--x-lead:linear-gradient(90deg,#B08A2E,#F0CE6B);--x-leadglow:rgba(240,206,107,.5);"
  + "--x-shadow:0 0 0 1px rgba(212,175,55,.10),0 26px 50px -24px rgba(0,0,0,.95);"
  + "--x-tabtx:#1C1300;--x-atx:#1C1300;--x-goodbg:linear-gradient(135deg,rgba(111,227,160,.16),rgba(111,227,160,.04));"
  + "--x-goodbd:rgba(111,227,160,.38);--x-warnbg:rgba(240,206,107,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(212,175,55,.16),transparent 62%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:none;--x-onhead:#F0CE6B;"
  + "--x-fixed:radial-gradient(90% 55% at 50% -12%,rgba(212,175,55,.10),transparent 62%);}"

  /* Carbon Editorial */
  + "html[data-skin=carbon]{color-scheme:dark;"
  + "--bg:#121212;--bg1:#191919;--bg2:#212121;--bg3:#2A2A2A;--line:#262626;--line2:#3D3D3D;"
  + "--txt:#EFECE6;--mut:#A8A39A;--mut2:#7A756C;--acc:#C9602F;--acc2:#E08248;--accTx:#160800;"
  + "--hot:#E0B24A;--hotTx:#1A1000;--good:#7FBF8A;--bad:#D96A5C;--info:#C9602F;--ia:#7FA8BF;"
  + "--cond:'Libre Caslon Text',Georgia,serif;--body:'Inter',system-ui,sans-serif;--mono:'Inter',system-ui,sans-serif;"
  + "--r:4px;--r2:8px;--x-topbg:rgba(18,18,18,.94);--x-navbg:rgba(18,18,18,.96);--x-fhead:#121212;"
  + "--x-errbg:#2A1B16;--x-errbd:#5C3627;--x-errb:#F0B79C;--x-okbg:#1C2A1E;--x-oktx:#9CDCA6;"
  + "--x-flbg:#2C1D17;--x-fltx:#F0AC93;--x-pvbg:#1C2A1E;--x-pvbd:#3D6B47;--x-teqon:#2A1D12;"
  + "--x-iabg:#16232A;--x-iabd:#2C4E5C;--x-glow:rgba(201,96,47,.10);--x-headglow:rgba(201,96,47,.26);"
  + "--x-lead:linear-gradient(90deg,#A3491E,#E08248);--x-leadglow:rgba(224,130,72,.4);"
  + "--x-shadow:0 1px 0 rgba(255,255,255,.03),0 20px 40px -20px rgba(0,0,0,.9);"
  + "--x-tabtx:#160800;--x-atx:#160800;--x-goodbg:linear-gradient(135deg,rgba(127,191,138,.14),rgba(127,191,138,.03));"
  + "--x-goodbd:rgba(127,191,138,.32);--x-warnbg:rgba(224,178,74,.08);"
  + "--x-herobg:linear-gradient(180deg,var(--bg2),var(--bg1));--x-stbg:var(--bg1);--x-cabbg:var(--bg2);"
  + "--x-blur:none;--x-onhead:#E0B24A;--x-fixed:none;}"

  /* Medianoche Zafiro */
  + "html[data-skin=zafiro]{color-scheme:dark;"
  + "--bg:#080B16;--bg1:#0E1322;--bg2:#141B2E;--bg3:#1C2540;--line:#1B2338;--line2:#2D3A5C;"
  + "--txt:#EEF1FA;--mut:#A9B4D0;--mut2:#7885A8;--acc:#5A7FE0;--acc2:#8BA6F0;--accTx:#020714;"
  + "--hot:#C9D4EE;--hotTx:#0A1020;--good:#6FE0C4;--bad:#F0868A;--info:#5A7FE0;--ia:#8BD4F0;"
  + "--cond:'Fraunces',Georgia,serif;--body:'Manrope',system-ui,sans-serif;--mono:'Manrope',system-ui,sans-serif;"
  + "--r:12px;--r2:20px;--x-topbg:rgba(8,11,22,.9);--x-navbg:rgba(8,11,22,.94);--x-fhead:#080B16;"
  + "--x-errbg:#2A1620;--x-errbd:#5C2A40;--x-errb:#F5AFC5;--x-okbg:#0F2A28;--x-oktx:#8FF0DB;"
  + "--x-flbg:#2A1B14;--x-fltx:#F0B48A;--x-pvbg:#0F2A28;--x-pvbd:#2F6B60;--x-teqon:#1A2340;"
  + "--x-iabg:#102436;--x-iabd:#255074;--x-glow:rgba(90,127,224,.14);--x-headglow:rgba(139,166,240,.34);"
  + "--x-lead:linear-gradient(90deg,#3E5CB8,#C9D4EE);--x-leadglow:rgba(201,212,238,.45);"
  + "--x-shadow:0 0 0 1px rgba(90,127,224,.10),0 26px 50px -24px rgba(0,0,0,.95);"
  + "--x-tabtx:#020714;--x-atx:#0A1020;--x-goodbg:linear-gradient(135deg,rgba(111,224,196,.15),rgba(111,224,196,.03));"
  + "--x-goodbd:rgba(111,224,196,.36);--x-warnbg:rgba(201,212,238,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(90,127,224,.18),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:blur(12px) saturate(140%);--x-onhead:#C9D4EE;"
  + "--x-fixed:radial-gradient(70% 45% at 12% 0%,rgba(90,127,224,.14),transparent 60%),"
  + "radial-gradient(55% 35% at 100% 100%,rgba(139,166,240,.08),transparent 60%);}"
  + "html[data-skin=zafiro] .game,html[data-skin=zafiro] .ajustes,html[data-skin=zafiro] .pk,"
  + "html[data-skin=zafiro] .cuotasbox,html[data-skin=zafiro] .row.hcrow,html[data-skin=zafiro] .fila-rank,"
  + "html[data-skin=zafiro] .fila,html[data-skin=zafiro] .ovaHero{background:rgba(14,19,34,.55) !important;"
  + "border-color:rgba(90,127,224,.22) !important;}";

  var st1 = document.createElement("style");
  st1.id = "ovaObsSkins";
  st1.textContent = skinCss;
  document.head.appendChild(st1);

  var FONTS = {
    platino:  "family=Space+Grotesk:wght@400;500;600;700",
    esmeralda:"family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700",
    carbon:   "family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700",
    zafiro:   "family=Fraunces:wght@500;600;700&family=Manrope:wght@400;500;600;700"
  };
  var origFont = window.__ovaFont;
  window.__ovaFont = function(id){
    try{
      if(FONTS[id] && !document.getElementById("ovaFont-"+id)){
        var l = document.createElement("link");
        l.id = "ovaFont-"+id; l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?"+FONTS[id]+"&display=swap";
        document.head.appendChild(l);
      }
    }catch(e){}
    if(origFont) origFont(id);
  };

  var NUEVOS = [
    {id:"platino",  n:"Platino IA",        d:"Gris platino, azul eléctrico, futurista",
     bg:"#08090C", card:"#171B22", acc:"#4FA8FF", hot:"#7CFFE0"},
    {id:"esmeralda",n:"Esmeralda Real",    d:"Verde profundo y dorado, mesa de lujo",
     bg:"#04120C", card:"#113123", acc:"#D4AF37", hot:"#F0CE6B"},
    {id:"carbon",   n:"Carbón Editorial",  d:"Grafito y cobre, editorial elegante",
     bg:"#121212", card:"#212121", acc:"#C9602F", hot:"#E0B24A"},
    {id:"zafiro",   n:"Medianoche Zafiro", d:"Azul zafiro y plata, frío y premium",
     bg:"#080B16", card:"#141B2E", acc:"#5A7FE0", hot:"#C9D4EE"}
  ];
  if(window.OVASkins && OVASkins.list){
    NUEVOS.forEach(function(s){
      if(!OVASkins.list.some(function(x){ return x.id===s.id; })) OVASkins.list.push(s);
    });
  }
  function pintarBotones(){
    document.querySelectorAll(".ovaSkins").forEach(function(g){
      NUEVOS.forEach(function(s){
        if(g.querySelector('[data-sk="'+s.id+'"]')) return;
        var b = document.createElement("button");
        b.type = "button"; b.className = "ovaSk";
        b.setAttribute("data-sk", s.id); b.setAttribute("aria-pressed","false");
        b.innerHTML = '<span class="pv" style="background:'+s.bg+'"><i style="background:'+s.acc+'"></i>'
          +'<i style="background:'+s.hot+'"></i><em style="background:'+s.card+';border:2px solid '+s.acc+'"></em></span>'
          +'<span class="tx"><b>'+s.n+'</b><span>'+s.d+'</span></span>';
        g.appendChild(b);
      });
    });
    if(window.OVASkins && OVASkins.marcar) OVASkins.marcar();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", pintarBotones);
  else pintarBotones();
  var intentos2 = 0;
  var reintentar2 = setInterval(function(){ intentos2++; pintarBotones(); if(intentos2>15) clearInterval(reintentar2); }, 400);
}catch(e){}


/* ================= 3. tira de "Destacados" con forma distinta por diseno ================= */
try{
  var destCss = ""
  + ".ova-destacados{margin:14px 16px 2px;position:relative;z-index:1;}"
  + ".ova-d-title{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut,#9AA);margin-bottom:8px;}"
  + ".ova-d-strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch;}"
  + ".ova-d-strip::-webkit-scrollbar{display:none;}"
  + ".ova-d-card{flex:0 0 auto;min-width:152px;padding:12px 14px;cursor:pointer;}"
  + ".ova-d-teams{font-size:12.5px;font-weight:600;margin-bottom:4px;color:var(--txt,#fff);}"
  + ".ova-d-time{font-size:10.5px;color:var(--mut,#9AA);}"
  /* default / oro */
  + ".ova-d-card{background:var(--bg2,#1B1812);border:1px solid var(--line2,#43381F);border-radius:14px;}"
  + "html[data-skin=oro] .ova-d-card{background:rgba(27,24,18,.55);border-color:rgba(201,162,74,.3);"
  + "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);}"
  + "html[data-skin=oro] .ova-d-title{font-family:var(--cond);}"
  /* platino: angular */
  + "html[data-skin=platino] .ova-d-card{background:rgba(79,168,255,.08);border:1px solid rgba(79,168,255,.3);"
  + "border-radius:0;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);}"
  + "html[data-skin=platino] .ova-d-title{font-family:var(--mono);letter-spacing:.15em;}"
  + "html[data-skin=platino] .ova-d-teams{font-family:var(--body);}"
  /* esmeralda: medallon */
  + "html[data-skin=esmeralda] .ova-d-card{background:var(--bg2,#113123);border:1px solid rgba(212,175,55,.3);"
  + "border-radius:2px;text-align:center;}"
  + "html[data-skin=esmeralda] .ova-d-teams{font-family:var(--cond);font-size:14px;}"
  + "html[data-skin=esmeralda] .ova-d-title{font-family:var(--cond);font-style:italic;}"
  /* zafiro: timeline chip */
  + "html[data-skin=zafiro] .ova-d-card{background:rgba(90,127,224,.08);border:1px solid rgba(90,127,224,.25);"
  + "border-radius:16px;border-left:3px solid var(--acc,#5A7FE0);}"
  + "html[data-skin=zafiro] .ova-d-teams{font-family:var(--cond);}";
  var st2 = document.createElement("style");
  st2.id = "ovaObsDestacados";
  st2.textContent = destCss;
  document.head.appendChild(st2);

  function equiposDe(g){
    var m = g.querySelector(".match");
    if(m){
      var clone = m.cloneNode(true);
      var sm = clone.querySelector("small"); if(sm) sm.remove();
      return clone.textContent.replace(/\s+/g," ").trim();
    }
    var eqs = g.querySelectorAll(".eq");
    if(eqs.length>=2){
      var a = eqs[0].querySelector("span"), h = eqs[1].querySelector("span");
      return (a?a.textContent.trim():"") + " @ " + (h?h.textContent.trim():"");
    }
    return "";
  }
  function horaDe(g){
    var c = g.querySelector(".clock") || g.querySelector(".hora");
    return c ? c.textContent.trim() : "";
  }
  function montarDestacados(){
    try{
      var cont = document.getElementById("slate") || document.getElementById("juegos");
      if(!cont) return;
      var kids = [];
      for(var i=0;i<cont.children.length;i++){ if(cont.children[i].classList.contains("game")) kids.push(cont.children[i]); }
      var old = document.getElementById("ovaDestacados");
      if(!kids.length){ if(old) old.remove(); return; }
      var top3 = kids.slice(0,3);
      var firma = top3.map(function(g){ return equiposDe(g); }).join("|");
      if(old && old.dataset.firma === firma) return;
      if(old) old.remove();
      var wrap = document.createElement("div");
      wrap.id = "ovaDestacados";
      wrap.className = "ova-destacados";
      wrap.dataset.firma = firma;
      var titulo = document.createElement("div");
      titulo.className = "ova-d-title";
      titulo.textContent = "Destacados de hoy";
      wrap.appendChild(titulo);
      var strip = document.createElement("div");
      strip.className = "ova-d-strip";
      top3.forEach(function(g){
        var card = document.createElement("div");
        card.className = "ova-d-card";
        card.innerHTML = '<div class="ova-d-teams">'+equiposDe(g)+'</div><div class="ova-d-time">'+horaDe(g)+'</div>';
        card.addEventListener("click", function(){
          try{
            g.scrollIntoView({behavior:"smooth", block:"center"});
            var head = g.querySelector(".head");
            if(head) setTimeout(function(){ head.click(); }, 320);
          }catch(e){}
        });
        strip.appendChild(card);
      });
      wrap.appendChild(strip);
      cont.parentNode.insertBefore(wrap, cont);
    }catch(e){}
  }
  function iniciarObservador(){
    var cont = document.getElementById("slate") || document.getElementById("juegos");
    if(!cont){ setTimeout(iniciarObservador, 500); return; }
    montarDestacados();
    if(window.MutationObserver){
      var pend = false;
      new MutationObserver(function(){
        if(pend) return; pend = true;
        setTimeout(function(){ pend = false; montarDestacados(); }, 250);
      }).observe(cont, {childList:true});
    }else{
      setInterval(montarDestacados, 1500);
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarObservador);
  else iniciarObservador();
}catch(e){}

})();
