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
