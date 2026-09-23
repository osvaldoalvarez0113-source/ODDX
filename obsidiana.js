/* OVA · Obsidiana Dorada
   Un solo archivo: splash de entrada + tema Oro negro por defecto + toques
   de cristal en las tarjetas. No toca ningun calculo, ningun fetch, ninguna
   funcion existente. Si algo fallara, va todo envuelto en try/catch y la
   app sigue funcionando exactamente igual que sin este archivo. */
(function(){
"use strict";
try{

/* ---------- 1. estilos ---------- */
var css = ""
+ "#ovaObsSplash{position:fixed;inset:0;z-index:99999;background:var(--bg,#0A0908);"
+ "display:flex;flex-direction:column;align-items:center;justify-content:center;"
+ "transition:opacity .85s ease, visibility .85s ease;}"
+ "#ovaObsSplash.hide{opacity:0;visibility:hidden;pointer-events:none;}"
+ "#ovaObsSplash .ova-seam{width:132px;height:132px;position:relative;}"
+ "#ovaObsSplash .ova-seam svg{position:absolute;inset:0;width:100%;height:100%;}"
+ "#ovaObsSplash .ova-seam path{fill:none;stroke:var(--hot,#F0CE6B);stroke-width:1.5;"
+ "stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;}"
+ "#ovaObsSplash .ova-seam path{animation:ovaObsDraw 1.5s cubic-bezier(.65,0,.35,1) forwards;}"
+ "#ovaObsSplash .ova-seam path:nth-child(2){animation-delay:.4s;}"
+ "#ovaObsSplash .ova-seam path:nth-child(3){animation-delay:.8s;}"
+ "@keyframes ovaObsDraw{to{stroke-dashoffset:0;}}"
+ "#ovaObsSplash .ova-word{margin-top:24px;font-family:var(--cond,Georgia,serif);"
+ "font-size:14px;font-weight:600;letter-spacing:.55em;color:var(--mut,#CBBFA5);"
+ "opacity:0;animation:ovaObsWord .8s ease forwards 1.35s;}"
+ "@keyframes ovaObsWord{to{opacity:1;}}"
+ "@media (prefers-reduced-motion:reduce){"
+ "#ovaObsSplash .ova-seam path,#ovaObsSplash .ova-word{animation:none !important;"
+ "stroke-dashoffset:0;opacity:1;}}"
/* glass sobre el tema Oro negro, sin tocar colores de datos */
+ "html[data-skin=oro] .game,html[data-skin=oro] .ajustes,html[data-skin=oro] .pk,"
+ "html[data-skin=oro] .cuotasbox,html[data-skin=oro] .row.hcrow,"
+ "html[data-skin=oro] .fila-rank,html[data-skin=oro] .fila,"
+ "html[data-skin=oro] .ovaHero,html[data-skin=oro] .vacio{"
+ "background:rgba(27,24,18,.55) !important;"
+ "-webkit-backdrop-filter:blur(16px) saturate(140%);"
+ "backdrop-filter:blur(16px) saturate(140%);"
+ "border-color:rgba(201,162,74,.24) !important;}"
+ "html[data-skin=oro] .topbar,html[data-skin=oro] .navbar,html[data-skin=oro] header,"
+ "html[data-skin=oro] .tabbar{"
+ "-webkit-backdrop-filter:blur(18px) saturate(140%);"
+ "backdrop-filter:blur(18px) saturate(140%);}"
+ "html[data-skin=oro] body::before{background:"
+ "radial-gradient(55% 38% at 12% 0%,rgba(201,162,74,.11),transparent 60%),"
+ "radial-gradient(45% 32% at 100% 100%,rgba(201,162,74,.07),transparent 60%),"
+ "var(--x-fixed);}";
var st = document.createElement("style");
st.id = "ovaObsCss";
st.textContent = css;
document.head.appendChild(st);

/* ---------- 2. tema Oro negro por defecto la primera vez ---------- */
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
  /* el selector de temas de la app a veces se inicializa despues que este
     script corre; se reintenta un momento por si acaso, sin insistir para
     siempre */
  var intentos = 0;
  var reintentar = setInterval(function(){
    intentos++;
    if(document.documentElement.getAttribute("data-skin")==="oro" || intentos>20){
      clearInterval(reintentar);
      return;
    }
    aplicarOro();
  }, 100);
}

/* ---------- 3. splash, una vez por sesion de cada app ---------- */
function mostrarSplash(){
  try{
    var app = document.documentElement.getAttribute("data-app") || "x";
    var key = "ova_splash_" + app;
    if(sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key,"1");
    var d = document.createElement("div");
    d.id = "ovaObsSplash";
    d.innerHTML =
      '<div class="ova-seam">' +
        '<svg viewBox="0 0 100 100" aria-hidden="true">' +
          '<path d="M50 10 A40 40 0 0 1 90 50" pathLength="1"/>' +
          '<path d="M90 50 A40 40 0 0 1 50 90" pathLength="1"/>' +
          '<path d="M50 90 A40 40 0 0 1 10 50 A40 40 0 0 1 50 10" pathLength="1"/>' +
        "</svg>" +
      "</div>" +
      '<div class="ova-word">O &middot; V &middot; A</div>';
    if(document.body) document.body.insertBefore(d, document.body.firstChild);
    else document.addEventListener("DOMContentLoaded", function(){ document.body.insertBefore(d, document.body.firstChild); });
    setTimeout(function(){
      d.classList.add("hide");
      setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 950);
    }, 1600);
  }catch(e){}
}
if(document.body) mostrarSplash();
else document.addEventListener("DOMContentLoaded", mostrarSplash);

}catch(e){}
})();

/* ---------- 4. remates finales de lujo (solo con tema Oro negro activo) ---------- */
(function(){
try{
  var extra = document.createElement("style");
  extra.id = "ovaObsExtra";
  extra.textContent = ""
  + "html[data-skin=oro] .pick.big{box-shadow:0 0 26px -6px rgba(240,206,107,.4);}"
  + "html[data-skin=oro] .brand,html[data-skin=oro] header h1,html[data-skin=oro] h1{"
  + "background:linear-gradient(100deg,var(--acc2,#E6C874) 20%,var(--hot,#F0CE6B) 40%,var(--acc2,#E6C874) 60%);"
  + "background-size:200% auto;-webkit-background-clip:text;background-clip:text;"
  + "-webkit-text-fill-color:transparent;animation:ovaShine 5s linear infinite;}"
  + "@keyframes ovaShine{to{background-position:-200% center;}}"
  + "html[data-skin=oro] .ovaHero{box-shadow:0 0 34px -14px rgba(240,206,107,.35);}"
  + "html[data-skin=oro] .tb.on,html[data-skin=oro] .diaBtn.on,html[data-skin=oro] .navbar button.on,"
  + "html[data-skin=oro] .tbar-btn.on{filter:drop-shadow(0 3px 10px rgba(240,206,107,.4));}"
  + "@media (prefers-reduced-motion:reduce){html[data-skin=oro] .brand,html[data-skin=oro] header h1,"
  + "html[data-skin=oro] h1{animation:none;}}";
  document.head.appendChild(extra);
}catch(e){}
})();

/* ---------- 5. cuatro estilos nuevos para el selector 🎨 ---------- */
(function(){
try{
  if(window.__ovaObsSkinsAdded) return;
  window.__ovaObsSkinsAdded = true;

  var css = ""
  /* ===== Platino IA ===== */
  + "html[data-skin=platino]{color-scheme:dark;"
  + "--bg:#08090C;--bg1:#101318;--bg2:#171B22;--bg3:#20252E;"
  + "--line:#232830;--line2:#39414D;"
  + "--txt:#F1F4F8;--mut:#B7C1CE;--mut2:#8892A0;"
  + "--acc:#4FA8FF;--acc2:#7CC4FF;--accTx:#03101F;"
  + "--hot:#7CFFE0;--hotTx:#02201A;"
  + "--good:#5EEAD4;--bad:#FF8A80;--info:#4FA8FF;--ia:#7CFFE0;"
  + "--cond:'Space Grotesk',system-ui,sans-serif;--body:'Space Grotesk',system-ui,sans-serif;--mono:'Space Grotesk',system-ui,sans-serif;"
  + "--r:12px;--r2:18px;"
  + "--x-topbg:rgba(8,9,12,.88);--x-navbg:rgba(8,9,12,.92);--x-fhead:#08090C;"
  + "--x-errbg:#2A1418;--x-errbd:#5C2A30;--x-errb:#FFB3BE;"
  + "--x-okbg:#0B2A26;--x-oktx:#7CFFE0;--x-flbg:#2A1E10;--x-fltx:#FFCB8A;"
  + "--x-pvbg:#0B2A26;--x-pvbd:#1E6B5C;--x-teqon:#12222F;"
  + "--x-iabg:#0B222F;--x-iabd:#1E4E6B;"
  + "--x-glow:rgba(79,168,255,.14);--x-headglow:rgba(124,255,224,.35);"
  + "--x-lead:linear-gradient(90deg,#2E8FE0,#7CFFE0);--x-leadglow:rgba(124,255,224,.5);"
  + "--x-shadow:0 0 0 1px rgba(79,168,255,.12),0 0 30px -10px rgba(124,255,224,.3),0 24px 48px -22px rgba(0,0,0,.95);"
  + "--x-tabtx:#03101F;--x-atx:#03101F;"
  + "--x-goodbg:linear-gradient(135deg,rgba(94,234,212,.15),rgba(94,234,212,.03));--x-goodbd:rgba(94,234,212,.4);"
  + "--x-warnbg:rgba(124,255,224,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(79,168,255,.18),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:blur(14px) saturate(150%);--x-onhead:#7CFFE0;"
  + "--x-fixed:linear-gradient(rgba(79,168,255,.045) 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,rgba(79,168,255,.045) 1px,transparent 1px) 0 0/32px 32px,radial-gradient(70% 45% at 85% 0%,rgba(124,255,224,.10),transparent 60%);}"
  + "html[data-skin=platino] .game,html[data-skin=platino] .ajustes,html[data-skin=platino] .pk,"
  + "html[data-skin=platino] .cuotasbox,html[data-skin=platino] .row.hcrow,"
  + "html[data-skin=platino] .fila-rank,html[data-skin=platino] .fila,html[data-skin=platino] .ovaHero{"
  + "background:rgba(16,19,24,.55) !important;-webkit-backdrop-filter:blur(16px) saturate(150%);"
  + "backdrop-filter:blur(16px) saturate(150%);border-color:rgba(79,168,255,.22) !important;}"

  /* ===== Esmeralda Real ===== */
  + "html[data-skin=esmeralda]{color-scheme:dark;"
  + "--bg:#04120C;--bg1:#0A2118;--bg2:#113123;--bg3:#18402E;"
  + "--line:#194330;--line2:#2C6B4A;"
  + "--txt:#F0F7F1;--mut:#B9D6C4;--mut2:#84A896;"
  + "--acc:#D4AF37;--acc2:#E8CA6A;--accTx:#1C1300;"
  + "--hot:#F0CE6B;--hotTx:#1A1305;"
  + "--good:#6FE3A0;--bad:#FF9B8A;--info:#D4AF37;--ia:#6FDDD3;"
  + "--cond:'Cormorant Garamond',Georgia,serif;--body:'Inter',system-ui,sans-serif;--mono:'Inter',system-ui,sans-serif;"
  + "--r:8px;--r2:16px;"
  + "--x-topbg:rgba(4,18,12,.92);--x-navbg:rgba(4,18,12,.95);--x-fhead:#04120C;"
  + "--x-errbg:#2A1614;--x-errbd:#5A2B25;--x-errb:#F5B5A9;"
  + "--x-okbg:#0F2F1D;--x-oktx:#8FF0BA;--x-flbg:#2E1A14;--x-fltx:#FFB4A5;"
  + "--x-pvbg:#0F2F1D;--x-pvbd:#2F7A4C;--x-teqon:#1D3324;"
  + "--x-iabg:#0B2C2A;--x-iabd:#1A6A63;"
  + "--x-glow:rgba(212,175,55,.12);--x-headglow:rgba(212,175,55,.32);"
  + "--x-lead:linear-gradient(90deg,#B08A2E,#F0CE6B);--x-leadglow:rgba(240,206,107,.5);"
  + "--x-shadow:0 0 0 1px rgba(212,175,55,.10),0 26px 50px -24px rgba(0,0,0,.95);"
  + "--x-tabtx:#1C1300;--x-atx:#1C1300;"
  + "--x-goodbg:linear-gradient(135deg,rgba(111,227,160,.16),rgba(111,227,160,.04));--x-goodbd:rgba(111,227,160,.38);"
  + "--x-warnbg:rgba(240,206,107,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(212,175,55,.16),transparent 62%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:none;--x-onhead:#F0CE6B;"
  + "--x-fixed:radial-gradient(90% 55% at 50% -12%,rgba(212,175,55,.10),transparent 62%);}"

  /* ===== Carbón Editorial ===== */
  + "html[data-skin=carbon]{color-scheme:dark;"
  + "--bg:#121212;--bg1:#191919;--bg2:#212121;--bg3:#2A2A2A;"
  + "--line:#262626;--line2:#3D3D3D;"
  + "--txt:#EFECE6;--mut:#A8A39A;--mut2:#7A756C;"
  + "--acc:#C9602F;--acc2:#E08248;--accTx:#160800;"
  + "--hot:#E0B24A;--hotTx:#1A1000;"
  + "--good:#7FBF8A;--bad:#D96A5C;--info:#C9602F;--ia:#7FA8BF;"
  + "--cond:'Libre Caslon Text',Georgia,serif;--body:'Inter',system-ui,sans-serif;--mono:'Inter',system-ui,sans-serif;"
  + "--r:4px;--r2:8px;"
  + "--x-topbg:rgba(18,18,18,.94);--x-navbg:rgba(18,18,18,.96);--x-fhead:#121212;"
  + "--x-errbg:#2A1B16;--x-errbd:#5C3627;--x-errb:#F0B79C;"
  + "--x-okbg:#1C2A1E;--x-oktx:#9CDCA6;--x-flbg:#2C1D17;--x-fltx:#F0AC93;"
  + "--x-pvbg:#1C2A1E;--x-pvbd:#3D6B47;--x-teqon:#2A1D12;"
  + "--x-iabg:#16232A;--x-iabd:#2C4E5C;"
  + "--x-glow:rgba(201,96,47,.10);--x-headglow:rgba(201,96,47,.26);"
  + "--x-lead:linear-gradient(90deg,#A3491E,#E08248);--x-leadglow:rgba(224,130,72,.4);"
  + "--x-shadow:0 1px 0 rgba(255,255,255,.03),0 20px 40px -20px rgba(0,0,0,.9);"
  + "--x-tabtx:#160800;--x-atx:#160800;"
  + "--x-goodbg:linear-gradient(135deg,rgba(127,191,138,.14),rgba(127,191,138,.03));--x-goodbd:rgba(127,191,138,.32);"
  + "--x-warnbg:rgba(224,178,74,.08);"
  + "--x-herobg:linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:none;--x-onhead:#E0B24A;"
  + "--x-fixed:none;}"

  /* ===== Medianoche Zafiro ===== */
  + "html[data-skin=zafiro]{color-scheme:dark;"
  + "--bg:#080B16;--bg1:#0E1322;--bg2:#141B2E;--bg3:#1C2540;"
  + "--line:#1B2338;--line2:#2D3A5C;"
  + "--txt:#EEF1FA;--mut:#A9B4D0;--mut2:#7885A8;"
  + "--acc:#5A7FE0;--acc2:#8BA6F0;--accTx:#020714;"
  + "--hot:#C9D4EE;--hotTx:#0A1020;"
  + "--good:#6FE0C4;--bad:#F0868A;--info:#5A7FE0;--ia:#8BD4F0;"
  + "--cond:'Fraunces',Georgia,serif;--body:'Manrope',system-ui,sans-serif;--mono:'Manrope',system-ui,sans-serif;"
  + "--r:12px;--r2:20px;"
  + "--x-topbg:rgba(8,11,22,.9);--x-navbg:rgba(8,11,22,.94);--x-fhead:#080B16;"
  + "--x-errbg:#2A1620;--x-errbd:#5C2A40;--x-errb:#F5AFC5;"
  + "--x-okbg:#0F2A28;--x-oktx:#8FF0DB;--x-flbg:#2A1B14;--x-fltx:#F0B48A;"
  + "--x-pvbg:#0F2A28;--x-pvbd:#2F6B60;--x-teqon:#1A2340;"
  + "--x-iabg:#102436;--x-iabd:#255074;"
  + "--x-glow:rgba(90,127,224,.14);--x-headglow:rgba(139,166,240,.34);"
  + "--x-lead:linear-gradient(90deg,#3E5CB8,#C9D4EE);--x-leadglow:rgba(201,212,238,.45);"
  + "--x-shadow:0 0 0 1px rgba(90,127,224,.10),0 26px 50px -24px rgba(0,0,0,.95);"
  + "--x-tabtx:#020714;--x-atx:#0A1020;"
  + "--x-goodbg:linear-gradient(135deg,rgba(111,224,196,.15),rgba(111,224,196,.03));--x-goodbd:rgba(111,224,196,.36);"
  + "--x-warnbg:rgba(201,212,238,.08);"
  + "--x-herobg:radial-gradient(120% 90% at 50% 0%,rgba(90,127,224,.18),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg1));"
  + "--x-stbg:var(--bg1);--x-cabbg:var(--bg2);--x-blur:blur(12px) saturate(140%);--x-onhead:#C9D4EE;"
  + "--x-fixed:radial-gradient(70% 45% at 12% 0%,rgba(90,127,224,.14),transparent 60%),radial-gradient(55% 35% at 100% 100%,rgba(139,166,240,.08),transparent 60%);}"
  + "html[data-skin=zafiro] .game,html[data-skin=zafiro] .ajustes,html[data-skin=zafiro] .pk,"
  + "html[data-skin=zafiro] .cuotasbox,html[data-skin=zafiro] .row.hcrow,"
  + "html[data-skin=zafiro] .fila-rank,html[data-skin=zafiro] .fila,html[data-skin=zafiro] .ovaHero{"
  + "background:rgba(14,19,34,.55) !important;-webkit-backdrop-filter:blur(14px) saturate(140%);"
  + "backdrop-filter:blur(14px) saturate(140%);border-color:rgba(90,127,224,.22) !important;}";

  var st = document.createElement("style");
  st.id = "ovaObsNuevosSkins";
  st.textContent = css;
  document.head.appendChild(st);

  /* fuentes de cada estilo nuevo */
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

  /* registrar los 4 en la lista que usa el selector 🎨 */
  var NUEVOS = [
    {id:"platino",  n:"Platino IA",         d:"Gris platino, azul eléctrico, futurista",
     bg:"#08090C", card:"#171B22", acc:"#4FA8FF", hot:"#7CFFE0"},
    {id:"esmeralda",n:"Esmeralda Real",     d:"Verde profundo y dorado, mesa de lujo",
     bg:"#04120C", card:"#113123", acc:"#D4AF37", hot:"#F0CE6B"},
    {id:"carbon",   n:"Carbón Editorial",   d:"Grafito y cobre, editorial elegante",
     bg:"#121212", card:"#212121", acc:"#C9602F", hot:"#E0B24A"},
    {id:"zafiro",   n:"Medianoche Zafiro",  d:"Azul zafiro y plata, frío y premium",
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
        b.setAttribute("data-sk", s.id);
        b.setAttribute("aria-pressed","false");
        b.innerHTML =
          '<span class="pv" style="background:'+s.bg+'"><i style="background:'+s.acc+'"></i>'+
          '<i style="background:'+s.hot+'"></i>'+
          '<em style="background:'+s.card+';border:2px solid '+s.acc+'"></em></span>'+
          '<span class="tx"><b>'+s.n+'</b><span>'+s.d+'</span></span>';
        g.appendChild(b);
      });
    });
    if(window.OVASkins && OVASkins.marcar) OVASkins.marcar();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", pintarBotones);
  }else{
    pintarBotones();
  }
  /* la hoja de temas a veces se monta cuando el usuario toca 🎨 por primera vez;
     se vuelve a intentar pintar los botones nuevos varias veces por si acaso */
  var intentos2 = 0;
  var reintentar2 = setInterval(function(){
    intentos2++;
    pintarBotones();
    if(intentos2 > 15) clearInterval(reintentar2);
  }, 400);

}catch(e){}
})();
