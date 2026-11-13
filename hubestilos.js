/* OVA · presentaciones del inicio (hub)  v2
   7 diseños con ESTRUCTURA distinta:
     Oro negro (el clásico, intacto) · Carrusel 3D · Órbita · Paneles · Mazo · Tablero · Cartas (12-nov-2026)
   Cómo cambiar: mantén presionado el logo "O V A" unos 0.7 segundos.
   También por enlace:  hub.html?estilo=carrusel   (oro · carrusel · orbita · paneles · mazo · tablero · cartas)
   No toca las apps, ni sus enlaces, ni ningún cálculo. Si un diseño fallara, vuelve solo al clásico. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var KEY='ova_hub';
var reduce=false;try{reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){}

var DEP=[
 {k:'mlb',href:'index.html',n:'MLB',d:'Modelo completo — ganador, total, hándicap y más',e:'⚾',c:'#F0CE6B',c2:'#9a6b1c'},
 {k:'fut',href:'futbol.html',n:'Fútbol',d:'Top 5 ligas + Champions League',e:'⚽',c:'#3DDC84',c2:'#0f6b3a'},
 {k:'nba',href:'nba.html',n:'NBA',d:'Ratings en puntos, hándicap y total',e:'🏀',c:'#FF8A3D',c2:'#b4400a'},
 {k:'nhl',href:'nhl.html',n:'NHL',d:'Goles, tiempo extra y total',e:'🏒',c:'#5AC8FA',c2:'#0a5a8c'},
 {k:'nfl',href:'nfl.html',n:'NFL',d:'Números clave 3 y 7 y total',e:'🏈',c:'#C084FC',c2:'#5b21b6'},
 {k:'ten',href:'tenis.html',n:'Tenis',d:'ATP y WTA — ganador, sets y games',e:'🎾',c:'#D4F04A',c2:'#5a6b0a'}
];
var ESTILOS=[
 {id:'oro',n:'Oro negro',d:'El clásico',sw:'linear-gradient(135deg,#0A0908,#3b2d10 60%,#C9A24A)'},
 {id:'carrusel',n:'Carrusel 3D',d:'Desliza entre deportes',sw:'radial-gradient(circle at 50% 120%,#F0CE6B66,transparent 60%),linear-gradient(90deg,transparent 8%,#3DDC84 8% 24%,transparent 24% 28%,#F0CE6B 28% 72%,transparent 72% 76%,#FF8A3D 76% 92%,transparent 92%),#06070d'},
 {id:'orbita',n:'Órbita',d:'Planetas que giran',sw:'radial-gradient(circle at 50% 50%,#F0CE6B 0 9px,transparent 10px),radial-gradient(circle at 22% 62%,#3DDC84 0 7px,transparent 8px),radial-gradient(circle at 78% 62%,#FF8A3D 0 7px,transparent 8px),radial-gradient(circle at 50% 22%,#F0CE6B 0 6px,transparent 7px),radial-gradient(ellipse 36% 26% at 50% 50%,transparent 94%,#ffffff33 96%,transparent 98%),#05060f'},
 {id:'paneles',n:'Paneles',d:'Pantalla partida',sw:'linear-gradient(172deg,#F0CE6B 0 33%,#0a0a0a 33% 34%,#3DDC84 34% 66%,#0a0a0a 66% 67%,#FF8A3D 67%)'},
 {id:'mazo',n:'Mazo',d:'Cartas que se lanzan',sw:'linear-gradient(#FF8A3D,#FF8A3D) 50% 78%/58% 62% no-repeat,linear-gradient(#3DDC84,#3DDC84) 50% 62%/68% 62% no-repeat,linear-gradient(#F0CE6B,#F0CE6B) 50% 44%/78% 62% no-repeat,#0b0c12'},
 {id:'tablero',n:'Tablero',d:'Marcador de aeropuerto',sw:'repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 22%/86% 14% no-repeat,repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 50%/86% 14% no-repeat,repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 78%/86% 14% no-repeat,#16161a'},
 {id:'cartas',n:'Cartas',d:'Se reparten y brillan',sw:'linear-gradient(115deg,transparent 30%,rgba(255,255,255,.35) 46%,rgba(127,227,255,.3) 52%,rgba(255,143,208,.3) 58%,transparent 72%),linear-gradient(#b9831f,#ffe08a) 18% 50%/26% 64% no-repeat,linear-gradient(#b9831f,#ffe08a) 50% 50%/26% 64% no-repeat,linear-gradient(#b9831f,#ffe08a) 82% 50%/26% 64% no-repeat,radial-gradient(ellipse at 50% 0%,#3b1d52,#0d0714)'}
];
/* 9-nov-2026: tarjeta «Lo mejor de hoy» (todas.html) arriba de los deportes; solo en Oro negro (hub.html) y Paneles */
var TOP={k:'top',href:'todas.html',n:'Lo mejor',d:'Las 6 apps juntas: más probables y combinada',e:'🎯'};
var BY={};ESTILOS.forEach(function(e){BY[e.id]=e;});
/* 8-nov-2026: Osvaldo eligió quedarse solo con Oro negro y Paneles. Los demás ya no se ofrecen; quien tenía uno guardado vuelve a Oro negro. */
/* 12-nov-2026: se suma Cartas (holográficas, con el logo OVA dibujado), elegida por Osvaldo para el inicio. */
var VIS=['oro','paneles','cartas'];

/* ===================================================================== CSS */
var CSS=`
.brandbar,html h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html[data-hub]:not([data-hub="oro"]) .wrap,html[data-hub]:not([data-hub="oro"]) #splash,html[data-hub]:not([data-hub="oro"]) body::before{display:none!important}
#hubLay .hl-herr{position:fixed;z-index:9000;top:calc(env(safe-area-inset-top,0px) + 10px);right:12px;padding:7px 11px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.22);color:#fff;font:600 12px/1 -apple-system,system-ui,sans-serif;text-decoration:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);min-height:30px;display:flex;align-items:center}
html[data-hub]:not([data-hub="oro"]),html[data-hub]:not([data-hub="oro"]) body{overflow:hidden;height:100%;background:#06070d}
#hubLay{position:fixed;inset:0;z-index:5;overflow:hidden;color:#fff;font-family:Inter,-apple-system,system-ui,sans-serif;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:none}
#hubLay.L-carrusel{touch-action:pan-x}
#hubLay.L-paneles,#hubLay.L-tablero{touch-action:manipulation}
#hubLay a{color:inherit;text-decoration:none;-webkit-tap-highlight-color:transparent;-webkit-user-drag:none;-webkit-touch-callout:none}
#hubLay .hl-brand{position:absolute;top:calc(env(safe-area-inset-top,0px) + 6px);left:50%;transform:translateX(-50%);z-index:60;padding:14px 40px;font:700 14px Georgia,'Playfair Display',serif;letter-spacing:.55em;color:rgba(255,255,255,.78);text-shadow:0 2px 14px rgba(0,0,0,.7);white-space:nowrap;-webkit-touch-callout:none}
#hubLay .hl-brand span{color:#F0CE6B}
@keyframes hlDraw{to{stroke-dashoffset:0}}
@keyframes hlBob{0%,100%{translate:0 0}50%{translate:0 -9px}}
@keyframes hlPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes hlRingOut{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.3);opacity:0}}
@keyframes hlTw{from{opacity:.5}to{opacity:1}}
@keyframes hlLive{0%,100%{opacity:1}50%{opacity:.35}}
#hubLay .art{width:100%;height:100%;color:var(--c)}
#hubLay .art svg{width:100%;height:100%;overflow:visible}
#hubLay .art svg *{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:hlDraw 2s .35s ease forwards}
#hubLay .liv{display:inline-flex;align-items:center;gap:6px;font:800 11px Inter;letter-spacing:.08em;padding:5px 10px;border-radius:99px;border:1px solid var(--c);color:var(--c);background:rgba(0,0,0,.35)}
#hubLay .liv i{width:6px;height:6px;border-radius:50%;background:var(--c);animation:hlLive 1.4s ease-in-out infinite}
#hubLay .liv em{font-style:normal}
#hubLay .liv.off i{animation:none;opacity:.4}

/* ============================ CARRUSEL 3D ============================ */
html[data-hub="carrusel"] body{background:#06070d}
.L-carrusel .bgfx i{position:absolute;left:50%;top:44%;width:96vmax;height:96vmax;margin:-48vmax 0 0 -48vmax;border-radius:50%;background:radial-gradient(circle,var(--c),transparent 60%);opacity:0;transition:opacity .9s ease}
.L-carrusel.a0 .bg0,.L-carrusel.a1 .bg1,.L-carrusel.a2 .bg2,.L-carrusel.a3 .bg3,.L-carrusel.a4 .bg4,.L-carrusel.a5 .bg5{opacity:.5}
.L-carrusel .car{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 54px);bottom:calc(env(safe-area-inset-bottom,0px) + 70px);display:flex;align-items:center;gap:3vw;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 16vw;touch-action:pan-x;animation:hlSlideIn 1s cubic-bezier(.2,.8,.2,1) backwards}
.L-carrusel .car::-webkit-scrollbar{display:none}
.L-carrusel .slide{position:relative;flex:0 0 68vw;height:100%;max-height:640px;scroll-snap-align:center;display:flex;flex-direction:column;justify-content:flex-end;padding:24px 22px;border-radius:32px;overflow:hidden;background:linear-gradient(165deg,var(--c2),#0a0b12 72%);border:1px solid rgba(255,255,255,.2);box-shadow:0 34px 70px -24px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.25);transform:perspective(900px) rotateY(calc(var(--d,0)*-24deg)) scale(calc(1 - var(--ad,0)*.1));opacity:calc(1 - var(--ad,0)*.3);will-change:transform}
@keyframes hlSlideIn{from{translate:60vw 0;opacity:0}}
.L-carrusel .slide::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 60% at 50% 0%,rgba(255,255,255,.14),transparent 60%);pointer-events:none}
.L-carrusel .slide .art{position:absolute;top:7%;left:10%;right:10%;height:44%}
.L-carrusel .slide .emo{position:absolute;top:11%;right:11%;font-size:62px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.55));animation:hlBob 4s ease-in-out infinite}
.L-carrusel .slide .liv{position:absolute;top:18px;left:18px}
.L-carrusel .slide .nm{position:relative;z-index:2;font:800 clamp(42px,13vw,58px)/1 Georgia,'Playfair Display',serif;margin-bottom:8px}
.L-carrusel .slide p{position:relative;z-index:2;margin:0 0 18px;color:rgba(255,255,255,.78);font-size:13.5px;line-height:1.45;max-width:26ch}
.L-carrusel .slide .go{position:relative;z-index:2;align-self:flex-start;padding:12px 22px;border-radius:99px;background:var(--c);color:#14110a;font:800 13px Inter;letter-spacing:.1em}
.L-carrusel .dots{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 30px);display:flex;justify-content:center;gap:9px}
.L-carrusel .dots i{width:8px;height:8px;border-radius:5px;background:rgba(255,255,255,.3);transition:all .35s}
.L-carrusel .dots i.on{width:28px;background:#fff}

/* ============================ ORBITA ============================ */
html[data-hub="orbita"] body{background:#04050d}
.L-orbita{background:radial-gradient(90% 60% at 50% 48%,#0f1a3a 0%,#04050d 70%)}
.L-orbita .stars{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 8% 12%,#fff,transparent),radial-gradient(1px 1px at 18% 70%,#fff,transparent),radial-gradient(1.5px 1.5px at 30% 30%,#ffd,transparent),radial-gradient(1px 1px at 44% 86%,#fff,transparent),radial-gradient(1.5px 1.5px at 58% 9%,#fff,transparent),radial-gradient(1px 1px at 70% 62%,#ffd,transparent),radial-gradient(1.5px 1.5px at 84% 24%,#fff,transparent),radial-gradient(1px 1px at 92% 80%,#fff,transparent),radial-gradient(1px 1px at 12% 44%,#fff,transparent),radial-gradient(1.5px 1.5px at 76% 92%,#fff,transparent);animation:hlTw 3.2s ease-in-out infinite alternate}
.L-orbita .orb-ring{position:absolute;border-radius:50%;border:1px dashed rgba(255,255,255,.22);box-shadow:0 0 40px rgba(240,206,107,.07),inset 0 0 40px rgba(240,206,107,.05);transform:translate(-50%,-50%);pointer-events:none}
.L-orbita .core{position:absolute;left:50%;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;z-index:6;display:flex;align-items:center;justify-content:center;font:800 25px Georgia,serif;letter-spacing:.08em;color:#2a1a05;background:radial-gradient(circle at 34% 28%,#fff8da,#F0CE6B 36%,#a8761f 72%,#3a2508);box-shadow:0 0 60px 10px rgba(240,206,107,.45),0 0 150px 34px rgba(240,206,107,.2);animation:hlPulse 4.5s ease-in-out infinite}
.L-orbita .core::before,.L-orbita .core::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(240,206,107,.55);animation:hlRingOut 3.8s ease-out infinite}
.L-orbita .core::after{animation-delay:1.9s}
.L-orbita .pl{position:absolute;left:0;top:0;width:100px;margin:-48px 0 0 -50px;display:flex;flex-direction:column;align-items:center;will-change:transform}
.L-orbita .pl .ball{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:42px;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.75),var(--c) 36%,var(--c2) 82%);box-shadow:0 0 34px var(--c2),inset -9px -11px 20px rgba(0,0,0,.5)}
.L-orbita .pl b{margin-top:9px;font:700 13px Inter;letter-spacing:.12em;text-shadow:0 2px 12px #000}
.L-orbita .hl-title{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 7%);text-align:center;font:600 22px Georgia,serif;color:rgba(255,255,255,.88);z-index:4}
.L-orbita .hl-title small{display:block;margin-top:6px;font:400 12px Inter;color:rgba(255,255,255,.5);letter-spacing:.04em}

/* ============================ PANELES ============================ */
html[data-hub="paneles"] body{background:#000}
.L-paneles{--sk:3vh;--bg:clamp(32px,min(12.5vw,5.2vh),64px)}
.L-paneles .stack{position:absolute;left:0;right:0;top:calc(-1*var(--sk));bottom:calc(-1*var(--sk));display:flex;flex-direction:column}
.L-paneles .pn{position:relative;flex:1 1 0;display:block;overflow:hidden;clip-path:polygon(0 0,100% var(--sk),100% 100%,0 calc(100% - var(--sk)));-webkit-clip-path:polygon(0 0,100% var(--sk),100% 100%,0 calc(100% - var(--sk)));transition:filter .25s;animation:hlPnIn .9s cubic-bezier(.2,.9,.25,1) backwards}
.L-paneles .pn:first-child{flex-grow:1.35}
.L-paneles .pn+.pn{margin-top:calc(-1*var(--sk))}
.L-paneles .pn:nth-child(1){animation-delay:.05s;--from:-100vw}
.L-paneles .pn:nth-child(2){animation-delay:.2s;--from:100vw}
.L-paneles .pn:nth-child(3){animation-delay:.35s;--from:-100vw}
.L-paneles .pn:nth-child(4){animation-delay:.5s;--from:100vw}
.L-paneles .pn:nth-child(5){animation-delay:.65s;--from:-100vw}
.L-paneles .pn:nth-child(6){animation-delay:.8s;--from:100vw}
.L-paneles .pn:nth-child(7){animation-delay:.95s;--from:-100vw}
.L-paneles .pnTop{background:linear-gradient(115deg,#000,#1a1408 45%,#6b4a10 75%,#F0CE6B)}
.L-paneles .pnTop .pat{background:repeating-linear-gradient(45deg,rgba(240,206,107,.1) 0 2px,transparent 2px 22px)}
@keyframes hlPnIn{from{translate:var(--from) 0}}
.L-paneles .pn:active{filter:brightness(1.3)}
.L-paneles .pn .pat{position:absolute;inset:0;animation:hlSlide 6s linear infinite}
@keyframes hlSlide{to{background-position:84px 0}}
.L-paneles .pn0{background:linear-gradient(115deg,#2c1f06,#8a5f16 55%,#F0CE6B)}
.L-paneles .pn0 .pat{background:repeating-linear-gradient(135deg,rgba(0,0,0,.16) 0 18px,transparent 18px 42px)}
.L-paneles .pn1{background:linear-gradient(115deg,#04200f,#0f6b3a 55%,#3DDC84)}
.L-paneles .pn1 .pat{background:repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 42px,transparent 42px 84px)}
.L-paneles .pn2{background:linear-gradient(115deg,#2b0f02,#b4400a 55%,#FF8A3D)}
.L-paneles .pn3{background:linear-gradient(115deg,#04202b,#0a5a8c 55%,#5AC8FA)}
.L-paneles .pn3 .pat{background:repeating-linear-gradient(60deg,rgba(255,255,255,.1) 0 3px,transparent 3px 30px)}
.L-paneles .pn4{background:linear-gradient(115deg,#1d0a38,#5b21b6 55%,#C084FC)}
.L-paneles .pn4 .pat{background:repeating-linear-gradient(90deg,rgba(255,255,255,.1) 0 3px,transparent 3px 28px)}
.L-paneles .pn5{background:linear-gradient(115deg,#1c2104,#5a6b0a 55%,#D4F04A)}
.L-paneles .pn5 .pat{background:repeating-linear-gradient(0deg,rgba(255,255,255,.12) 0 2px,transparent 2px 34px),repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 2px,transparent 2px 60px)}
.L-paneles .pn2 .pat{background:radial-gradient(circle at 78% 50%,transparent 0 22px,rgba(0,0,0,.2) 23px 25px,transparent 26px 56px,rgba(0,0,0,.2) 57px 59px,transparent 60px)}
.L-paneles .pn .emo{position:absolute;right:-5vw;top:50%;margin-top:-11vw;font-size:22vw;line-height:1;transform:rotate(-12deg);filter:drop-shadow(0 14px 24px rgba(0,0,0,.45));animation:hlBob 5s ease-in-out infinite}
.L-paneles .pn .big{position:absolute;left:6vw;bottom:calc(var(--sk) + 40px);font:900 italic var(--bg)/.9 Inter,system-ui,sans-serif;letter-spacing:-.03em;text-transform:uppercase;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.92);transition:color .25s}
.L-paneles .pn:active .big{color:#fff}
.L-paneles .pn .sm{position:absolute;left:6.4vw;bottom:calc(var(--sk) + 10px);font:600 11.5px/1.25 Inter;color:rgba(255,255,255,.9);letter-spacing:.03em;max-width:58vw;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.L-paneles .pn .liv{position:absolute;left:6.4vw;bottom:calc(var(--sk) + 40px + var(--bg)*.9 + 4px);--c:#fff}
.L-paneles .pn:last-child .big,.L-paneles .pn:last-child .sm,.L-paneles .pn:last-child .liv{margin-bottom:calc(env(safe-area-inset-bottom,0px) + 4px)}
.L-paneles .hl-brand{text-shadow:0 2px 14px rgba(0,0,0,.9)}

/* ============================ MAZO ============================ */
html[data-hub="mazo"] body{background:#080910}
.L-mazo{background:radial-gradient(80% 50% at 50% 100%,#1a1530,transparent 70%),#080910}
.L-mazo .bgfx i{position:absolute;border-radius:50%;opacity:.35}
.L-mazo .bgfx .m1{width:80vmax;height:80vmax;left:-40vmax;top:-30vmax;background:radial-gradient(circle,#3b2f8a,transparent 62%);animation:hlFloat 18s ease-in-out infinite alternate}
.L-mazo .bgfx .m2{width:70vmax;height:70vmax;right:-35vmax;bottom:-25vmax;background:radial-gradient(circle,#0f6b6b,transparent 62%);animation:hlFloat 22s ease-in-out infinite alternate-reverse}
@keyframes hlFloat{to{transform:translate3d(14vw,10vh,0) scale(1.15)}}
.L-mazo .deck{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 62px);bottom:calc(env(safe-area-inset-bottom,0px) + 92px)}
.L-mazo .cd{position:absolute;left:50%;top:50%;width:78vw;max-width:360px;height:min(86%,520px);margin:calc(min(86%,520px)/-2 - 14px) 0 0 -39vw;display:flex;flex-direction:column;justify-content:flex-end;padding:24px 22px;border-radius:30px;overflow:hidden;background:linear-gradient(165deg,var(--c2),#0b0c14 75%);border:1px solid rgba(255,255,255,.22);box-shadow:0 30px 60px -20px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.28);will-change:transform;cursor:grab}
.L-mazo .cd::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 55% at 50% 0%,rgba(255,255,255,.16),transparent 60%);pointer-events:none}
.L-mazo .cd .art{position:absolute;top:7%;left:10%;right:10%;height:42%}
.L-mazo .cd .emo{position:absolute;top:10%;right:10%;font-size:60px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.55));animation:hlBob 4s ease-in-out infinite}
.L-mazo .cd .liv{position:absolute;top:18px;left:18px}
.L-mazo .cd .nm{position:relative;z-index:2;font:800 clamp(42px,13vw,56px)/1 Georgia,serif;margin-bottom:8px}
.L-mazo .cd p{position:relative;z-index:2;margin:0 0 16px;color:rgba(255,255,255,.78);font-size:13.5px;line-height:1.45;max-width:26ch}
.L-mazo .cd .go{position:relative;z-index:2;align-self:flex-start;padding:12px 22px;border-radius:99px;background:var(--c);color:#14110a;font:800 13px Inter;letter-spacing:.1em}
.L-mazo .hl-title{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 28px);text-align:center;font:500 13px Inter;color:rgba(255,255,255,.55);letter-spacing:.06em}
.L-mazo .dots{display:flex;justify-content:center;gap:8px;margin-bottom:12px}
.L-mazo .dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.28);transition:all .3s}
.L-mazo .dots i.on{background:#fff;width:22px;border-radius:4px}

/* ============================ TABLERO ============================ */
html[data-hub="tablero"] body{background:#0a0a0c}
.L-tablero{background:linear-gradient(180deg,#121216,#08080a);display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 62px) 14px calc(env(safe-area-inset-bottom,0px) + 18px);justify-content:center}
.L-tablero::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 3px);pointer-events:none}
.L-tablero .hdr{display:flex;justify-content:center;gap:2px;margin:0 0 12px}
.L-tablero .row{position:relative;display:block;margin:0 0 12px;padding:14px 8px 11px;border-radius:14px;background:linear-gradient(#1a1a20,#101014);border:1px solid #2c2c34;box-shadow:0 14px 26px -14px #000,inset 0 1px 0 rgba(255,255,255,.07);animation:hlRowIn .7s cubic-bezier(.2,.8,.2,1) backwards;transition:transform .15s,filter .15s}
.L-tablero .row:nth-of-type(1){animation-delay:.1s}.L-tablero .row:nth-of-type(2){animation-delay:.25s}.L-tablero .row:nth-of-type(3){animation-delay:.4s}
@keyframes hlRowIn{from{translate:0 -40px;opacity:0}}
.L-tablero .row:active{transform:translateY(2px);filter:brightness(1.25)}
.L-tablero .row::before,.L-tablero .row::after{content:"";position:absolute;top:8px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#888,#222);box-shadow:0 1px 0 #000}
.L-tablero .row::before{left:8px}.L-tablero .row::after{right:8px}
.L-tablero .fls{display:flex;justify-content:center;gap:4px}
.L-tablero .meta{display:flex;align-items:center;justify-content:space-between;margin:9px 8px 0;font:500 10.5px ui-monospace,Menlo,monospace;color:#a89a6c;letter-spacing:.07em;text-transform:uppercase}
.L-tablero .meta .liv{font-size:11px;padding:3px 8px}
.L-tablero .fl{--hh:27px;position:relative;width:37px;height:54px;perspective:260px;font:700 33px/54px ui-monospace,"SF Mono",Menlo,monospace;color:#FFC83D;text-align:center}
.L-tablero .hdr .fl{--hh:14px;width:18px;height:28px;font-size:17px;line-height:28px;color:#e9e1c4}
.L-tablero .clk .fl{--hh:16px;width:22px;height:32px;font-size:21px;line-height:32px;color:#e9e1c4}
.L-tablero .fl .h{position:absolute;left:0;right:0;overflow:hidden;background:linear-gradient(#26262c,#1b1b20);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.L-tablero .fl .t{top:0;height:50%;border-radius:5px 5px 0 0}
.L-tablero .fl .b{bottom:0;height:50%;border-radius:0 0 5px 5px;background:linear-gradient(#1b1b20,#222228)}
.L-tablero .fl .h>span{display:block;width:100%}
.L-tablero .fl .b>span{margin-top:calc(var(--hh)*-1)}
.L-tablero .fl .ft{top:0;height:50%;border-radius:5px 5px 0 0;transform-origin:50% 100%;z-index:3;transform:rotateX(0)}
.L-tablero .fl .fb{bottom:0;height:50%;border-radius:0 0 5px 5px;transform-origin:50% 0;z-index:3;transform:rotateX(90deg);background:linear-gradient(#1b1b20,#222228)}
.L-tablero .fl .fb>span{margin-top:calc(var(--hh)*-1)}
.L-tablero .fl::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:#050507;z-index:6}
.L-tablero .fl.go .ft{animation:hlFlipT .09s ease-in forwards}
.L-tablero .fl.go .fb{animation:hlFlipB .09s .09s ease-out forwards}
@keyframes hlFlipT{to{transform:rotateX(-90deg)}}
@keyframes hlFlipB{to{transform:rotateX(0)}}
.L-tablero .clk{display:flex;justify-content:center;gap:3px;margin-top:6px;align-items:center}
.L-tablero .clk .sep{color:#e9e1c4;font:700 20px ui-monospace,Menlo,monospace;padding:0 1px}

/* ---------- hoja para elegir ---------- */
#hubSheet{position:fixed;inset:0;z-index:100000;display:none;align-items:flex-end;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
#hubSheet.on{display:flex}
#hubSheet .sheetbox{width:100%;max-width:520px;margin:0 auto;max-height:88vh;overflow:auto;background:#13110d;color:#F7F2E7;border-top:1px solid rgba(201,162,74,.35);border-radius:22px 22px 0 0;padding:16px 14px calc(20px + env(safe-area-inset-bottom));font-family:-apple-system,system-ui,sans-serif;animation:hubUp .35s cubic-bezier(.22,.7,.3,1)}
@keyframes hubUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
#hubSheet h2{margin:2px 0 3px;font-size:18px;font-weight:700}
#hubSheet p{margin:0 0 12px;font-size:12px;color:#CBBFA5}
#hubSheet .tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#hubSheet .tile{display:flex;flex-direction:column;padding:0;text-align:left;background:transparent;color:inherit;border:2px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;cursor:pointer;font-family:inherit}
#hubSheet .tile.on{border-color:#F0CE6B;box-shadow:0 0 0 3px rgba(240,206,107,.16)}
#hubSheet .tile .sw{display:block;height:84px}
#hubSheet .tile .tx{display:block;padding:8px 10px 9px;background:rgba(255,255,255,.05)}
#hubSheet .tile b{display:block;font-size:13.5px}
#hubSheet .tile span span{display:block;font-size:11px;color:#CBBFA5;margin-top:1px}

/* ---------- CARTAS (12-nov-2026): cartas holográficas que se reparten ---------- */
html[data-hub="cartas"] body{background:#0d0714}
#hubLay.L-cartas{touch-action:manipulation;box-sizing:border-box;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 70px) 0 calc(env(safe-area-inset-bottom,0px) + 14px);background:radial-gradient(ellipse at 50% 0%,#3b1d52 0%,#1a0e26 60%,#0d0714 100%)}
.L-cartas .rays{position:absolute;left:50%;top:38%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;background:repeating-conic-gradient(rgba(255,214,107,.1) 0deg 6deg,transparent 6deg 18deg);animation:hlCSpin 60s linear infinite;-webkit-mask-image:radial-gradient(circle,#000 0,transparent 55%);mask-image:radial-gradient(circle,#000 0,transparent 55%);pointer-events:none}
.L-cartas .dust{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.L-cartas .hl-brand{padding:12px 30px;letter-spacing:0;transition:opacity .4s}
.L-cartas .hl-brand svg{display:block;height:34px;width:93px;filter:drop-shadow(0 0 10px rgba(255,214,107,.45))}
.L-cartas .lg .ln{stroke-dasharray:1;stroke-dashoffset:1}
.L-cartas .lg.done .ln{stroke-dashoffset:0}
.L-cartas .play .lg .ln{animation:hlCDraw .75s cubic-bezier(.5,0,.2,1) forwards;animation-delay:calc(.15s + var(--i)*.2s)}
.L-cartas .cbk{display:block;border-radius:16px;padding:3px;background:linear-gradient(135deg,#ffe08a,#b9831f 40%,#fff1c2 60%,#a8731a)}
.L-cartas .cbk>span{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:13px;background-color:#1c0f29;background-image:repeating-linear-gradient(45deg,rgba(255,214,107,.13) 0 2px,transparent 2px 12px),repeating-linear-gradient(-45deg,rgba(255,214,107,.13) 0 2px,transparent 2px 12px)}
.L-cartas .spl{position:absolute;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,#3b1d52 0%,#1a0e26 60%,#0d0714 100%);transition:opacity .6s}
.L-cartas .spl.out{opacity:0}
.L-cartas .spl .box{width:210px;height:290px;border-radius:18px;padding:4px;box-shadow:0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(255,214,107,.35);animation:hlCHov 2s ease-in-out infinite;transition:transform .7s cubic-bezier(.5,0,.2,1)}
.L-cartas .spl .box svg{width:150px}
.L-cartas .spl.out .box{animation-name:hlCNo;transform:scale(.25) rotate(25deg)}
.L-cartas .deck{position:relative;z-index:2;flex:0 1 auto;width:100%;height:100%;max-height:152vw;margin:auto 0;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:minmax(0,.7fr) minmax(0,1fr) minmax(0,1fr);gap:10px;padding:0 14px;box-sizing:border-box}
.L-cartas .tc{position:relative;opacity:0;min-height:0;perspective:700px;-webkit-perspective:700px}
.L-cartas .tc.wide{grid-column:1/-1}
.L-cartas.in .tc{animation:hlCDeal .75s cubic-bezier(.2,1,.3,1) both;animation-delay:calc(var(--i)*.1s)}
.L-cartas .tfl{display:block;position:relative;width:100%;height:100%;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transform:rotateY(180deg)}
.L-cartas.in .tfl{animation:hlCFup .75s cubic-bezier(.3,1.35,.5,1) both;animation-delay:calc(.55s + var(--i)*.1s)}
.L-cartas .tbk{position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.L-cartas .tbk svg{width:54%;max-width:90px}
.L-cartas .tci{display:block;position:relative;width:100%;height:100%;border-radius:16px;overflow:hidden;padding:3px;background:linear-gradient(135deg,#ffe08a,#b9831f 40%,#fff1c2 60%,#a8731a);box-shadow:0 14px 24px rgba(0,0,0,.5);transition:transform .25s;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.L-cartas .tci .cara{display:flex;flex-direction:column;justify-content:flex-end;position:relative;width:100%;height:100%;border-radius:13px;overflow:hidden;padding:10px;background:radial-gradient(circle at 50% 34%,var(--c) -30%,var(--c2) 55%,#150a1f 130%)}
.L-cartas .tci .cara::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.5) 1px,transparent 1.5px);background-size:14px 14px;opacity:.22}
.L-cartas .tci .bw{position:absolute;left:50%;top:42%;width:66%;max-width:120px;transform:translate(-50%,-50%)}
.L-cartas .tci .bw svg{display:block;width:100%;filter:drop-shadow(0 12px 16px rgba(0,0,0,.45));animation:hlCBob 3.6s ease-in-out infinite;animation-delay:calc(var(--i)*-.5s)}
.L-cartas .tc.wide .bw{left:auto;right:7%;top:50%;width:auto;height:74%;aspect-ratio:1/1;transform:translateY(-50%)}
.L-cartas .tci .liv{position:absolute;top:8px;left:8px;--c:#fff;font-size:9px;letter-spacing:.04em;padding:3px 7px;gap:4px;background:rgba(0,0,0,.5)}
.L-cartas .tci b{position:relative;font:800 14px/1.1 Unbounded,Inter,-apple-system,system-ui,sans-serif;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.7)}
.L-cartas .tc.wide b{font-size:21px;max-width:60%}
.L-cartas .tci::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 22%,rgba(255,240,150,.5) 38%,rgba(255,255,255,.6) 44%,rgba(120,225,255,.5) 50%,rgba(255,130,220,.5) 56%,rgba(150,255,180,.4) 62%,transparent 76%);background-size:260% 100%;background-position:var(--mx,120%) 0;mix-blend-mode:screen;pointer-events:none;animation:hlCSheen 4s ease-in-out infinite;animation-delay:calc(2s + var(--i,0)*.3s)}
.L-cartas.sale .tc:not(.ir){opacity:0!important;transition:opacity .35s}
.L-cartas.sale .hl-brand,.L-cartas.sale .hl-herr{opacity:0}
.L-cartas .tc.ir{z-index:50}
@keyframes hlCSpin{to{transform:rotate(360deg)}}
@keyframes hlCDraw{to{stroke-dashoffset:0}}
@keyframes hlCHov{50%{transform:translateY(-10px) rotate(2deg)}}
@keyframes hlCNo{to{opacity:1}}
@keyframes hlCDeal{from{opacity:1;transform:translate(var(--dx,0),var(--dy,60vh)) rotate(calc(var(--r)*1deg)) scale(.45)}to{opacity:1;transform:none}}
@keyframes hlCFup{from{transform:rotateY(180deg)}to{transform:rotateY(0deg)}}
@keyframes hlCBob{50%{transform:translateY(-7px) rotate(8deg)}}
@keyframes hlCSheen{0%,50%{background-position:130% 0}100%{background-position:-40% 0}}

@media (prefers-reduced-motion:reduce){#hubLay *,#hubLay *::before,#hubLay *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important}}
`;

/* ===================================================================== utilidades */
var ST={id:'oro',stop:null,timers:[]};
function leer(){ try{ var v=root.localStorage.getItem(KEY); return VIS.indexOf(v)>=0?v:'oro'; }catch(e){ return 'oro'; } }
function guardar(id){ try{ root.localStorage.setItem(KEY,id); }catch(e){} }
function inyectarCSS(){
  if(doc.getElementById('hubEstilosCss')) return;
  var s=doc.createElement('style'); s.id='hubEstilosCss'; s.textContent=CSS;
  (doc.head||html).appendChild(s);
}
function tm(f,ms){ var t=root.setTimeout(f,ms); ST.timers.push(t); return t; }
var ARTS={
 mlb:'<path d="M60 12 L108 60 L60 108 L12 60 Z"/><path d="M60 38 L82 60 L60 82 L38 60 Z"/><circle cx="60" cy="60" r="5"/><path d="M12 60 A48 48 0 0 1 60 12"/><path d="M60 12 A48 48 0 0 1 108 60"/><rect x="55" y="7" width="10" height="10" rx="1"/><rect x="103" y="55" width="10" height="10" rx="1"/><rect x="7" y="55" width="10" height="10" rx="1"/><path d="M60 103 l6 -6 v-6 h-12 v6 z"/>',
 fut:'<rect x="6" y="20" width="108" height="80" rx="4"/><path d="M60 20 V100"/><circle cx="60" cy="60" r="14"/><circle cx="60" cy="60" r="1.5"/><rect x="6" y="40" width="20" height="40"/><rect x="94" y="40" width="20" height="40"/><rect x="6" y="51" width="8" height="18"/><rect x="106" y="51" width="8" height="18"/><path d="M26 52 A10 10 0 0 1 26 68"/><path d="M94 52 A10 10 0 0 0 94 68"/>',
 nhl:'<rect x="6" y="20" width="108" height="80" rx="30"/><path d="M60 20 V100"/><circle cx="60" cy="60" r="12"/><path d="M30 20 V100M90 20 V100"/><rect x="2" y="52" width="8" height="16" rx="1"/><rect x="110" y="52" width="8" height="16" rx="1"/><circle cx="36" cy="40" r="4"/><circle cx="36" cy="80" r="4"/><circle cx="84" cy="40" r="4"/><circle cx="84" cy="80" r="4"/>',
 nfl:'<rect x="6" y="24" width="108" height="72" rx="3"/><path d="M26 24 V96M46 24 V96M66 24 V96M86 24 V96M106 24 V96"/><path d="M60 6 V24M50 6 H70 M50 6 V16 M70 6 V16"/><ellipse cx="60" cy="60" rx="14" ry="8"/><path d="M56 60 H64M58 57 V63M62 57 V63"/>',
 ten:'<rect x="10" y="6" width="100" height="108" rx="2"/><path d="M22 6 V114M98 6 V114M10 60 H110M22 32 H98M22 88 H98M60 32 V88"/>',
 nba:'<rect x="8" y="12" width="104" height="96" rx="4"/><rect x="40" y="12" width="40" height="44"/><circle cx="60" cy="56" r="16"/><path d="M20 12 V34 A40 40 0 0 0 100 34 V12"/><circle cx="60" cy="22" r="4"/><path d="M52 12 H68"/>'
};
function livTxt(k){
  try{
    var H=root.OVAHoy; if(!H||!root.localStorage) return null;
    var r=H.resumen(root.localStorage), ap=r.apps&&r.apps[k], pend=0;
    (r.pend||[]).forEach(function(x){ if(x.app===k) pend++; });
    if(ap&&ap.vigente&&ap.items&&ap.items.length){
      var p=+ap.items[0].p; if(p>0&&p<=1) p*=100;
      if(isFinite(p)&&p>0) return {t:'Top '+Math.round(p)+'% hoy',on:true};
      return {t:'Al gane listo',on:true};
    }
    if(pend) return {t:pend+(pend===1?' pendiente':' pendientes'),on:true};
    return {t:'Abrir',on:false};
  }catch(e){ return null; }
}
function livHtml(k,st){ return '<span class="liv off" data-k="'+k+'"'+(st?' style="'+st+'"':'')+'><i></i><em>Abrir</em></span>'; }
function actualizarLiv(raiz){
  [].forEach.call((raiz||doc).querySelectorAll('.liv[data-k]'),function(e){
    var v=livTxt(e.getAttribute('data-k')); if(!v) return;
    var em=e.querySelector('em'); if(em) em.textContent=v.t;
    e.classList.toggle('off',!v.on);
  });
}
try{ root.addEventListener('load',function(){ actualizarLiv(); }); }catch(e){}
function art(k){ return '<div class="art"><svg viewBox="0 0 120 120" aria-hidden="true">'+ARTS[k].replace(/<(path|rect|circle) /g,'<$1 pathLength="1" ')+'</svg></div>'; }
function brand(){ return '<div class="hl-brand">OVA <span>·</span></div>'; }
function pad(s,n){ s=String(s); while(s.length<n) s+=' '; return s; }

/* ===================================================================== CARRUSEL 3D */
function htmlCarrusel(){
  var bg='',s='';
  DEP.forEach(function(d,i){
    bg+='<i class="bg'+i+'" style="--c:'+d.c+'"></i>';
    s+='<a class="slide" href="'+d.href+'" style="--c:'+d.c+';--c2:'+d.c2+'">'+art(d.k)+'<span class="emo">'+d.e+'</span>'+livHtml(d.k)+'<b class="nm">'+d.n+'</b><p>'+d.d+'</p><span class="go">ENTRAR ›</span></a>';
  });
  return '<div class="bgfx">'+bg+'</div>'+brand()+'<div class="car">'+s+'</div><div class="dots">'+puntos()+'</div>';
}
function puntos(){ var o=''; DEP.forEach(function(d,i){ o+=i?'<i></i>':'<i class="on"></i>'; }); return o; }
function initCarrusel(lay){
  var car=lay.querySelector('.car'), slides=[].slice.call(lay.querySelectorAll('.slide')), dots=[].slice.call(lay.querySelectorAll('.dots i'));
  var pend=false, act=-1, tocado=false;
  function upd(){
    pend=false;
    var cw=car.clientWidth||root.innerWidth||360, st=(slides[0].offsetWidth||250)+cw*0.03, best=0, bd=9;
    slides.forEach(function(s,i){
      var c=s.offsetLeft-car.scrollLeft+s.offsetWidth/2, d=(c-cw/2)/st;
      d=Math.max(-1.6,Math.min(1.6,d));
      s.style.setProperty('--d',d.toFixed(3)); s.style.setProperty('--ad',Math.abs(d).toFixed(3));
      if(Math.abs(d)<bd){ bd=Math.abs(d); best=i; }
    });
    if(best!==act){ act=best; lay.classList.remove('a0','a1','a2','a3','a4','a5'); lay.classList.add('a'+best); dots.forEach(function(x,i){ x.classList.toggle('on',i===best); }); }
  }
  function sch(){ if(!pend){ pend=true; root.requestAnimationFrame(upd); } }
  car.addEventListener('scroll',sch,{passive:true}); root.addEventListener('resize',sch);
  car.addEventListener('pointerdown',function(){ tocado=true; });
  upd(); tm(upd,60); tm(upd,400);
  return function(){ root.removeEventListener('resize',sch); };
}

/* ===================================================================== ORBITA */
function htmlOrbita(){
  var p='';
  DEP.forEach(function(d){ p+='<a class="pl" href="'+d.href+'" style="--c:'+d.c+';--c2:'+d.c2+'"><span class="ball">'+d.e+'</span><b>'+d.n.toUpperCase()+'</b></a>'; });
  return '<div class="stars"></div><div class="orb-ring"></div><div class="core">OVA</div>'+p+brand()+'<div class="hl-title">¿Qué deporte hoy?<small>Gira y toca uno</small></div>';
}
function initOrbita(lay){
  var pls=[].slice.call(lay.querySelectorAll('.pl')), ring=lay.querySelector('.orb-ring'), core=lay.querySelector('.core');
  var W=0,H=0,cx=0,cy=0,Rx=0,Ry=0, th=-Math.PI/2, base=reduce?0:0.0045, vel=reduce?0:0.05, grow=reduce?1:0, drag=null, moved=false, raf=0, vivo=true;
  function medir(){
    W=lay.clientWidth||360; H=lay.clientHeight||640; cx=W/2; cy=H*0.45; Rx=Math.min(W*0.385,190); Ry=Rx*0.64;
    ring.style.left=cx+'px'; ring.style.top=cy+'px'; ring.style.width=(Rx*2)+'px'; ring.style.height=(Ry*2)+'px'; core.style.top=cy+'px';
  }
  function pos(){
    pls.forEach(function(p,i){
      var a=th+i*Math.PI*2/pls.length, x=cx+Rx*grow*Math.cos(a), y=cy+Ry*grow*Math.sin(a), dep=(Math.sin(a)+1)/2, s=0.68+0.62*dep;
      p.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) scale('+s.toFixed(3)+')';
      p.style.opacity=(0.5+0.5*dep).toFixed(2); p.style.zIndex=dep>0.5?9:3;
    });
  }
  function tick(){
    if(!vivo) return;
    if(!drag){ th+=vel; vel+=(base-vel)*0.02; }
    grow+=(1-grow)*0.055; pos();
    raf=root.requestAnimationFrame(tick);
  }
  function down(e){ drag={x:e.clientX,th0:th}; moved=false; }
  function move(e){ if(!drag) return; var dx=e.clientX-drag.x; if(Math.abs(dx)>8) moved=true; var nt=drag.th0+dx/(Rx*0.9); vel=nt-th; th=nt; }
  function up(){ if(drag){ drag=null; if(Math.abs(vel)>0.06) vel=vel>0?0.06:-0.06; } }
  function clk(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } }
  lay.addEventListener('pointerdown',down); lay.addEventListener('pointermove',move); lay.addEventListener('pointerup',up); lay.addEventListener('pointercancel',up);
  lay.addEventListener('click',clk,true); root.addEventListener('resize',medir);
  medir(); pos();
  if(!reduce) raf=root.requestAnimationFrame(tick);
  return function(){ vivo=false; try{ root.cancelAnimationFrame(raf); }catch(e){} root.removeEventListener('resize',medir); };
}

/* ===================================================================== PANELES */
function htmlPaneles(){
  var s='';
  [TOP].concat(DEP).forEach(function(d,i){
    s+='<a class="pn '+(d.k==='top'?'pnTop':'pn'+(i-1))+'" href="'+d.href+'"><div class="pat"></div><span class="emo">'+d.e+'</span>'+(d.k==='top'?'':livHtml(d.k))+'<b class="big">'+d.n+'</b><span class="sm">'+d.d+'</span></a>';
  });
  return '<div class="stack">'+s+'</div>'+brand();
}

/* ===================================================================== MAZO */
function htmlMazo(){
  var s='';
  DEP.forEach(function(d){
    s+='<a class="cd" href="'+d.href+'" style="--c:'+d.c+';--c2:'+d.c2+'">'+art(d.k)+'<span class="emo">'+d.e+'</span>'+livHtml(d.k)+'<b class="nm">'+d.n+'</b><p>'+d.d+'</p><span class="go">ENTRAR ›</span></a>';
  });
  return '<div class="bgfx"><i class="m1"></i><i class="m2"></i></div>'+brand()+'<div class="deck">'+s+'</div><div class="hl-title"><div class="dots">'+puntos()+'</div>Lanza la carta para ver la siguiente</div>';
}
function initMazo(lay){
  var cards=[].slice.call(lay.querySelectorAll('.cd')), dots=[].slice.call(lay.querySelectorAll('.dots i')), ord=DEP.map(function(d,i){ return i; }), drag=null, moved=false, W=root.innerWidth||360, H=root.innerHeight||640;
  function colocar(anim,delays){
    ord.forEach(function(ci,k){
      var el=cards[ci];
      el.style.transition=anim?'transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s':'none';
      el.style.transitionDelay=delays?((ord.length-1-k)*0.1)+'s':'0s';
      el.style.zIndex=10-k; el.style.opacity=(1-k*0.16).toFixed(2);
      el.style.transform='translate3d(0,'+(k*30)+'px,0) scale('+(1-k*0.065).toFixed(3)+') rotate('+(k===0?0:(k%2?2.4:-2.4))+'deg)';
      el.style.pointerEvents=k===0?'auto':'none';
    });
    dots.forEach(function(x,i){ x.classList.toggle('on',i===ord[0]); });
  }
  function down(e){ var t=e.target&&e.target.closest?e.target.closest('.cd'):null; if(!t||t!==cards[ord[0]]) return; drag={x:e.clientX,y:e.clientY,el:t}; moved=false; t.style.transition='none'; t.style.transitionDelay='0s'; }
  function move(e){
    if(!drag) return; var dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(Math.hypot(dx,dy)>8) moved=true;
    drag.el.style.transform='translate3d('+dx+'px,'+(dy*0.6)+'px,0) rotate('+(dx/16).toFixed(2)+'deg)';
    var p=Math.min(1,Math.hypot(dx,dy)/150), n=cards[ord[1]];
    n.style.transition='none'; n.style.transform='translate3d(0,'+(30-30*p)+'px,0) scale('+(0.935+0.065*p).toFixed(3)+') rotate('+((1-p)*2.4)+'deg)'; n.style.opacity=(0.84+0.16*p).toFixed(2);
  }
  function up(e){
    if(!drag) return; var el=drag.el, dx=e.clientX-drag.x, dy=e.clientY-drag.y, dist=Math.hypot(dx,dy); drag=null;
    if(dist>110){
      var nx=dx/dist, ny=dy/dist;
      el.style.transition='transform .34s ease-in,opacity .34s ease-in';
      el.style.transform='translate3d('+(nx*W*1.3)+'px,'+(ny*H*0.9)+'px,0) rotate('+(dx/5)+'deg)'; el.style.opacity='0';
      tm(function(){ ord.push(ord.shift()); el.style.transition='none'; colocar(true,false); },340);
    } else { colocar(true,false); }
  }
  function clk(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } }
  lay.addEventListener('pointerdown',down); lay.addEventListener('pointermove',move); lay.addEventListener('pointerup',up); lay.addEventListener('pointercancel',up); lay.addEventListener('click',clk,true);
  if(reduce){ colocar(false,false); }
  else{
    cards.forEach(function(el){ el.style.transition='none'; el.style.transform='translate3d(0,'+(H*1.1)+'px,0) rotate(8deg)'; el.style.opacity='0'; });
    root.requestAnimationFrame(function(){ root.requestAnimationFrame(function(){ colocar(true,true); tm(function(){ cards.forEach(function(c){ c.style.transitionDelay='0s'; }); },1100); }); });
  }
  return function(){};
}

/* ===================================================================== TABLERO (marcador con letras que giran) */
var CH='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function celda(ch){ return '<span class="fl" data-c="'+ch+'"><span class="h t"><span>'+ch+'</span></span><span class="h b"><span>'+ch+'</span></span><span class="h ft"><span>'+ch+'</span></span><span class="h fb"><span>'+ch+'</span></span></span>'; }
function fila(txt){ var o=''; for(var i=0;i<txt.length;i++) o+=celda(txt.charAt(i)===' '?'\u00a0':txt.charAt(i)); return o; }
function htmlTablero(){
  var rows='';
  DEP.forEach(function(d){
    rows+='<a class="row" href="'+d.href+'" style="--c:'+d.c+'"><div class="fls" data-t="'+pad(d.n.toUpperCase(),8)+'">'+fila('        ')+'</div><div class="meta"><span>'+d.d.replace(/ — /,' · ')+'</span>'+livHtml(d.k,'--c:#ff5b4d')+'</div></a>';
  });
  return brand()+'<div class="hdr" data-t="¿QUÉ DEPORTE HOY?">'+fila(pad('',17))+'</div>'+rows+'<div class="clk" data-t="--:--">'+fila('--')+'<span class="sep">:</span>'+fila('--')+'</div>';
}
function hhmm(){ var d=new Date(); function p(n){ return (n<10?'0':'')+n; } return p(d.getHours())+p(d.getMinutes()); }
function initTablero(lay){
  function poner(c,ch){ var hs=c.querySelectorAll('.h>span'); for(var i=0;i<hs.length;i++) hs[i].textContent=ch; c.setAttribute('data-c',ch); }
  function flip(c,ch){
    var old=c.getAttribute('data-c'); if(old===ch) return;
    var s=c.querySelectorAll('.h>span');   /* orden: t, b, ft, fb */
    c._k=(c._k||0)+1; var k=c._k;           /* si llega otro giro antes de terminar, el viejo no pisa al nuevo */
    c.setAttribute('data-c',ch);
    s[0].textContent=ch; s[2].textContent=old; s[3].textContent=ch;
    c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
    tm(function(){ if(c._k!==k) return; s[1].textContent=ch; s[2].textContent=ch; c.classList.remove('go'); },200);
  }
  function girar(c,destino,paso,delay){
    if(reduce){ poner(c,destino); return; }
    var n=3+paso, i=0;
    function sig(){
      i++;
      if(i>n){ flip(c,destino); return; }
      flip(c,CH.charAt(Math.floor(Math.random()*CH.length))); tm(sig,150);
    }
    tm(sig,delay);
  }
  function escribir(cont,txt,base,paso){
    var cs=cont.querySelectorAll('.fl');
    for(var i=0;i<cs.length;i++){ var ch=txt.charAt(i)||' '; if(ch===' ') ch='\u00a0'; girar(cs[i],ch,(paso||1)*(i%4),base+i*70); }
  }
  var fl=[].slice.call(lay.querySelectorAll('.fls'));
  escribir(lay.querySelector('.hdr'),lay.querySelector('.hdr').getAttribute('data-t'),200,0);
  fl.forEach(function(f,i){ escribir(f,f.getAttribute('data-t'),500+i*300,1); });
  var clk=lay.querySelector('.clk'), cl=clk?clk.querySelectorAll('.fl'):[];
  function reloj(){ var h=hhmm(); for(var i=0;i<4&&i<cl.length;i++){ if(reduce) poner(cl[i],h.charAt(i)); else flip(cl[i],h.charAt(i)); } }
  tm(reloj,2600); var iv=root.setInterval(reloj,30000); ST.timers.push(iv);
  return function(){ root.clearInterval(iv); };
}

/* ===================================================================== armado */

/* ===================================================================== CARTAS (12-nov-2026) */
var ctN=0;
function ctLogo(done){
  var g='hlCg'+(ctN++);
  return '<svg class="lg'+(done?' done':'')+'" viewBox="0 0 300 110" role="img" aria-label="OVA"><defs><linearGradient id="'+g+'" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="110"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#fff1c2"/><stop offset="1" stop-color="#d99a2b"/></linearGradient></defs><g fill="none" stroke="url(#'+g+')" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"><circle class="ln" pathLength="1" style="--i:0" cx="55" cy="55" r="40" transform="rotate(-90 55 55)"/><path class="ln" pathLength="1" style="--i:1" d="M112 16l38 78 38-78"/><path class="ln" pathLength="1" style="--i:2" d="M206 94l39-78 39 78"/><path class="ln" pathLength="1" style="--i:3" d="M228 68h34"/></g></svg>';
}
function ctBall(k){
  var g='hlCs'+(ctN++);
  var defs='<defs><radialGradient id="'+g+'" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>';
  var ov='<circle cx="50" cy="50" r="46" fill="url(#'+g+')"/>',b;
  if(k==='mlb')b='<circle cx="50" cy="50" r="46" fill="#f5f1e6"/><path d="M22 14c16 18 16 54 0 72M78 14c-16 18-16 54 0 72" fill="none" stroke="#d2302c" stroke-width="3" stroke-dasharray="2.5 3.5"/>'+ov;
  else if(k==='fut')b='<circle cx="50" cy="50" r="46" fill="#f4f4f4"/><polygon points="50,33 66,45 60,64 40,64 34,45" fill="#1b1b1b"/><path d="M50 33V14M66 45l18-7M60 64l11 16M40 64L29 80M34 45l-18-7M36 8l14 6 14-6M88 30l-4 8 8 14M78 84l-7-4-16 6M22 84l7-4 16 6M12 30l4 8-8 14" fill="none" stroke="#1b1b1b" stroke-width="3"/>'+ov;
  else if(k==='nba')b='<circle cx="50" cy="50" r="46" fill="#e8762c"/><path d="M4 50h92M50 4v92M18 16c18 18 18 50 0 68M82 16c-18 18-18 50 0 68" fill="none" stroke="#2a1608" stroke-width="2.6"/>'+ov;
  else if(k==='nhl')b='<path d="M6 42v20c0 11 20 20 44 20s44-9 44-20V42z" fill="#15181c"/><ellipse cx="50" cy="42" rx="44" ry="20" fill="#3a404a"/><ellipse cx="50" cy="42" rx="30" ry="12" fill="none" stroke="#6b7482" stroke-width="2"/><path d="M6 52c0 11 20 20 44 20s44-9 44-20" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>';
  else if(k==='nfl')b='<g transform="rotate(-30 50 50)"><ellipse cx="50" cy="50" rx="46" ry="28" fill="#8a4b24"/><path d="M34 50h32M40 44v12M46 44v12M54 44v12M60 44v12" stroke="#fff" stroke-width="3"/><path d="M14 40c2 6 2 14 0 20M86 40c-2 6-2 14 0 20" stroke="#fff" stroke-width="3" fill="none"/><ellipse cx="50" cy="50" rx="46" ry="28" fill="url(#'+g+')"/></g>';
  else if(k==='ten')b='<circle cx="50" cy="50" r="46" fill="#d7f04a"/><path d="M8 34c24 0 44 22 44 58M48 6c0 24 22 44 46 44" fill="none" stroke="#fff" stroke-width="3.5"/>'+ov;
  else b='<circle cx="50" cy="50" r="46" fill="#f6c343"/><circle cx="50" cy="50" r="31" fill="#fff"/><circle cx="50" cy="50" r="17" fill="#d2302c"/><circle cx="50" cy="50" r="5" fill="#fff"/>'+ov;
  return '<svg viewBox="0 0 100 100" aria-hidden="true">'+defs+b+'</svg>';
}
function htmlCartas(){
  var s='';
  [TOP].concat(DEP).forEach(function(d,i){
    var top=d.k==='top';
    s+='<div class="tc'+(top?' wide':'')+'" style="--i:'+i+';--r:'+((i%2?1:-1)*(25+i*12))+'"><span class="tfl"><a class="tci" href="'+d.href+'" style="--i:'+i+';--c:'+(top?'#F0CE6B':d.c)+';--c2:'+(top?'#6b4a10':d.c2)+'"><span class="cara"><span class="bw">'+ctBall(d.k)+'</span>'+(top?'':livHtml(d.k))+'<b>'+(top?'Lo mejor de hoy':d.n)+'</b></span></a><span class="tbk cbk"><span>'+ctLogo(1)+'</span></span></span></div>';
  });
  return '<div class="rays"></div><canvas class="dust"></canvas><div class="hl-brand">'+ctLogo(1)+'</div><div class="deck">'+s+'</div><div class="spl"><div class="box cbk"><span>'+ctLogo(0)+'</span></div></div>';
}
function initCartas(lay){
  /* letra del nombre de las cartas (si no carga, queda Inter) */
  try{ if(!doc.getElementById('hlCFont')){ var lk=doc.createElement('link'); lk.id='hlCFont'; lk.rel='stylesheet'; lk.href='https://fonts.googleapis.com/css2?family=Unbounded:wght@800&display=swap'; (doc.head||html).appendChild(lk); } }catch(e){}
  var spl=lay.querySelector('.spl'), deck=lay.querySelector('.deck'), cv=lay.querySelector('.dust');
  var vivo=true, raf=0, saliendo=false, P=[], W=0, H=0;
  /* la entrada con el logo sale solo la primera vez de cada día */
  var hoy='', visto=false;
  try{ hoy=new Date().toDateString(); visto=root.localStorage.getItem('ova_hub_cartas_dia')===hoy; root.localStorage.setItem('ova_hub_cartas_dia',hoy); }catch(e){}
  function medir(){
    try{
      var R=lay.getBoundingClientRect(), cx=R.left+R.width/2, cy=R.top+R.height/2;
      [].forEach.call(deck.children,function(el){ var r=el.getBoundingClientRect(); el.style.setProperty('--dx',(cx-r.left-r.width/2)+'px'); el.style.setProperty('--dy',(cy-r.top-r.height/2)+'px'); });
    }catch(e){}
  }
  function quitarSpl(){ if(spl&&spl.parentNode) spl.parentNode.removeChild(spl); spl=null; }
  medir();
  if(visto||reduce){ quitarSpl(); tm(function(){ lay.classList.add('in'); },60); }
  else{
    spl.classList.add('play');
    tm(function(){ if(spl) spl.classList.add('out'); lay.classList.add('in'); },1600);
    tm(quitarSpl,2300);
  }
  /* polvo dorado */
  function polvo(){
    try{
      var c=cv.getContext('2d'); W=cv.width=cv.clientWidth; H=cv.height=cv.clientHeight; P=[];
      for(var i=0;i<42;i++) P.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.5,v:Math.random()*.4+.12,a:Math.random()*.5+.2});
      root.cancelAnimationFrame(raf);
      (function f(){
        if(!vivo) return;
        if(!doc.hidden){
          c.clearRect(0,0,W,H);
          P.forEach(function(p){ p.y-=p.v; p.x+=Math.sin(p.y/36)*.3; if(p.y<-6){ p.y=H+6; p.x=Math.random()*W; } c.globalAlpha=p.a; c.fillStyle='#ffd66b'; c.beginPath(); c.arc(p.x,p.y,p.r,0,6.3); c.fill(); });
        }
        raf=root.requestAnimationFrame(f);
      })();
    }catch(e){}
  }
  if(!reduce) polvo();
  /* brillo e inclinación siguiendo el dedo */
  function carta(e){ var t=e.target; return t&&t.closest?t.closest('.tci'):null; }
  function mov(e){ var a=carta(e); if(!a||saliendo||reduce) return; var r=a.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height; a.style.transform='rotateY('+((x-.5)*26)+'deg) rotateX('+((.5-y)*26)+'deg) scale(1.05)'; a.style.setProperty('--mx',(130-x*170)+'%'); }
  function suelta(){ [].forEach.call(lay.querySelectorAll('.tci'),function(a){ a.style.transform=''; a.style.removeProperty('--mx'); }); }
  /* al tocar: la carta vuela al centro dando una vuelta y abre la app */
  function clk(e){
    var a=carta(e); if(!a||reduce) return;
    if(saliendo){ e.preventDefault(); return; }
    var tc=a.closest('.tc'), tf=a.closest('.tfl'); if(!tc||!tf) return;
    e.preventDefault(); saliendo=true; suelta();
    var r=tc.getBoundingClientRect(), R=lay.getBoundingClientRect();
    var k=Math.min(R.width*.82/r.width, R.height*.58/r.height);
    tc.style.animation='none'; tc.style.opacity='1'; tf.style.animation='none'; tf.style.transform='rotateY(0deg)';
    tc.classList.add('ir'); lay.classList.add('sale'); void tc.offsetWidth;
    tc.style.transition='transform .62s cubic-bezier(.3,.8,.2,1)'; tf.style.transition='transform .62s cubic-bezier(.3,.8,.2,1)';
    tc.style.transform='translate('+(R.left+R.width/2-r.left-r.width/2)+'px,'+(R.top+R.height/2-r.top-r.height/2)+'px) scale('+k+')';
    tf.style.transform='rotateY(360deg)';
    var href=a.getAttribute('href');
    tm(function(){ try{ root.location.href=href; }catch(x){} },600);
  }
  /* si vuelves con «atrás», las cartas regresan a su sitio */
  function volver(){
    saliendo=false; lay.classList.remove('sale');
    [].forEach.call(deck.children,function(tc){ tc.classList.remove('ir'); tc.style.transition=''; tc.style.transform=''; tc.style.animation='none'; tc.style.opacity='1'; var tf=tc.querySelector('.tfl'); if(tf){ tf.style.transition=''; tf.style.animation='none'; tf.style.transform='rotateY(0deg)'; } });
  }
  function ps(e){ if(e&&e.persisted) volver(); }
  function rz(){ if(!reduce) polvo(); }
  lay.addEventListener('pointermove',mov); lay.addEventListener('pointerup',suelta); lay.addEventListener('pointercancel',suelta); lay.addEventListener('pointerleave',suelta);
  lay.addEventListener('click',clk);
  try{ root.addEventListener('pageshow',ps); root.addEventListener('resize',rz); }catch(e){}
  return function(){ vivo=false; try{ root.cancelAnimationFrame(raf); root.removeEventListener('pageshow',ps); root.removeEventListener('resize',rz); }catch(e){} };
}

var BUILD={
 carrusel:{html:htmlCarrusel,init:initCarrusel},
 orbita:{html:htmlOrbita,init:initOrbita},
 paneles:{html:htmlPaneles,init:null},
 mazo:{html:htmlMazo,init:initMazo},
 tablero:{html:htmlTablero,init:initTablero},
 cartas:{html:htmlCartas,init:initCartas}
};
function construir(id){
  var b=BUILD[id]; if(!b) return;
  var lay=doc.createElement('div'); lay.id='hubLay'; lay.className='L-'+id;
  lay.innerHTML=b.html(); doc.body.appendChild(lay);
  var hr=doc.createElement('a'); hr.className='hl-herr'; hr.href='herramientas.html'; hr.setAttribute('aria-label','Herramientas'); hr.textContent='\uD83D\uDCCA Herramientas'; lay.appendChild(hr);
  try{ actualizarLiv(lay); }catch(e){}
  if(b.init) ST.stop=b.init(lay);
  [].forEach.call(lay.querySelectorAll('.hl-brand'),pulsacion);
}
function parar(){
  if(ST.stop){ try{ ST.stop(); }catch(e){} } ST.stop=null;
  ST.timers.forEach(function(t){ root.clearTimeout(t); root.clearInterval(t); }); ST.timers=[];
  var l=doc.getElementById('hubLay'); if(l&&l.parentNode) l.parentNode.removeChild(l);
}
function aplicar(id,opts){
  opts=opts||{};
  if(!BY[id]) id='oro';
  var antes=ST.id; ST.id=id;
  inyectarCSS();
  if(opts.guardar!==false) guardar(id);
  if(opts.inicial){
    if(id==='oro') html.removeAttribute('data-hub'); else html.setAttribute('data-hub',id);
    return id;
  }
  try{ if(root.history&&root.history.replaceState&&/[?&]estilo=/.test(String(root.location.search||''))) root.history.replaceState(null,'',root.location.pathname+(root.location.hash||'')); }catch(e){}   /* tu elección manda sobre el enlace */
  parar();
  if(id==='oro'){
    html.removeAttribute('data-hub');
    if(antes!=='oro'&&opts.recargar!==false){ try{ root.location.reload(); }catch(e){} }   /* el clásico trae su propia animación al cargar */
    return id;
  }
  html.setAttribute('data-hub',id);
  try{ construir(id); }
  catch(e){   /* red de seguridad: si un diseño falla, vuelves al clásico y no se queda la pantalla vacía */
    try{ if(root.console) root.console.error('hubestilos',e); }catch(x){}
    parar(); html.removeAttribute('data-hub'); ST.id='oro'; guardar('oro'); return 'oro';
  }
  return id;
}

/* ===================================================================== hoja + pulsación larga */
function abrirHoja(){
  var h=doc.getElementById('hubSheet');
  if(!h){
    h=doc.createElement('div'); h.id='hubSheet';
    var t='';
    ESTILOS.filter(function(e){ return VIS.indexOf(e.id)>=0; }).forEach(function(e){ t+='<button type="button" class="tile" data-id="'+e.id+'"><span class="sw" style="background:'+e.sw+'"></span><span class="tx"><b>'+e.n+'</b><span>'+e.d+'</span></span></button>'; });
    h.innerHTML='<div class="sheetbox"><h2>Presentación del inicio</h2><p>Toca una para verla ahora. Se queda guardada.</p><div class="tiles">'+t+'</div></div>';
    h.addEventListener('click',function(ev){
      var el=ev.target, tile=null;
      while(el&&el!==h){ if(el.getAttribute&&el.getAttribute('data-id')){ tile=el; break; } el=el.parentNode; }
      if(tile){ cerrarHoja(); aplicar(tile.getAttribute('data-id'),{}); return; }
      if(ev.target===h) cerrarHoja();
    });
    doc.body.appendChild(h);
  }
  [].forEach.call(h.querySelectorAll('.tile'),function(b){ if(b.classList) b.classList.toggle('on',b.getAttribute('data-id')===ST.id); });
  h.classList.add('on');
}
function cerrarHoja(){ var h=doc.getElementById('hubSheet'); if(h) h.classList.remove('on'); }
function pulsacion(el){
  if(!el||el.__hub) return; el.__hub=1;
  var t=null,x0=0,y0=0;
  function ini(e){ x0=e.clientX; y0=e.clientY; if(t) root.clearTimeout(t); t=root.setTimeout(function(){ t=null; abrirHoja(); },650); }
  function can(){ if(t){ root.clearTimeout(t); t=null; } }
  function mov(e){ if(t&&(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12)) can(); }
  el.addEventListener('pointerdown',ini); el.addEventListener('pointermove',mov); el.addEventListener('pointerup',can); el.addEventListener('pointercancel',can); el.addEventListener('pointerleave',can);
  el.addEventListener('contextmenu',function(e){ if(e.preventDefault) e.preventDefault(); });
}
function params(){
  try{ var m=String(root.location.search||'').match(/[?&]estilo=([^&]+)/); if(!m) return null; var v=decodeURIComponent(m[1]); var n=parseInt(v,10); if(n>=1&&n<=ESTILOS.length) v=ESTILOS[n-1].id; return BY[v]?v:null; }catch(e){ return null; }
}

/* ===================================================================== arranque */
function arrancar(){
  var url=params(), id=url||leer(), estreno=false;
  /* 12-nov-2026: Cartas se estrena sola UNA vez (Osvaldo la eligió para el inicio); después manda lo que él escoja con la pulsación larga */
  try{ if(!url&&root.localStorage.getItem('ova_hub_cartas_v1')!=='1'){ root.localStorage.setItem('ova_hub_cartas_v1','1'); id='cartas'; estreno=true; } }catch(e){}
  aplicar(id,{inicial:true,guardar:!!url||estreno});   /* en <head>: solo marca el diseño (así no se ve el clásico un instante antes) */
  function listo(){
    try{
      [].forEach.call(doc.querySelectorAll('.brandbar,h1'),pulsacion);
      if(id!=='oro'){
        try{ construir(id); }
        catch(e){ try{ if(root.console) root.console.error('hubestilos',e); }catch(x){} parar(); html.removeAttribute('data-hub'); ST.id='oro'; guardar('oro'); }
      }
    }catch(e){ try{ if(root.console) root.console.error('hubestilos',e); }catch(x){} }
  }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={TOP:TOP,VIS:VIS,ESTILOS:ESTILOS,DEP:DEP,css:CSS,_html:{carrusel:htmlCarrusel,orbita:htmlOrbita,paneles:htmlPaneles,mazo:htmlMazo,tablero:htmlTablero,cartas:htmlCartas},aplicar:aplicar,abrirHoja:abrirHoja,cerrarHoja:cerrarHoja,actual:function(){ return ST.id; },leer:leer,_arrancar:arrancar};
root.OVAHub=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
