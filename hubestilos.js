/* OVA · presentaciones del inicio (hub)  v2
   6 diseños con ESTRUCTURA distinta:
     Oro negro (el clásico, intacto) · Carrusel 3D · Órbita · Paneles · Mazo · Tablero
   Cómo cambiar: mantén presionado el logo "O V A" unos 0.7 segundos.
   También por enlace:  hub.html?estilo=carrusel   (oro · carrusel · orbita · paneles · mazo · tablero)
   No toca las apps, ni sus enlaces, ni ningún cálculo. Si un diseño fallara, vuelve solo al clásico. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var KEY='ova_hub';
var reduce=false;try{reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){}

var DEP=[
 {k:'mlb',href:'index.html',n:'MLB',d:'Modelo completo — ganador, total, hándicap y más',e:'⚾',c:'#F0CE6B',c2:'#9a6b1c'},
 {k:'fut',href:'futbol.html',n:'Fútbol',d:'Top 5 ligas + Champions League',e:'⚽',c:'#3DDC84',c2:'#0f6b3a'},
 {k:'nba',href:'nba.html',n:'NBA',d:'Ratings en puntos, hándicap y total',e:'🏀',c:'#FF8A3D',c2:'#b4400a'}
];
var ESTILOS=[
 {id:'oro',n:'Oro negro',d:'El clásico',sw:'linear-gradient(135deg,#0A0908,#3b2d10 60%,#C9A24A)'},
 {id:'carrusel',n:'Carrusel 3D',d:'Desliza entre deportes',sw:'radial-gradient(circle at 50% 120%,#F0CE6B66,transparent 60%),linear-gradient(90deg,transparent 8%,#3DDC84 8% 24%,transparent 24% 28%,#F0CE6B 28% 72%,transparent 72% 76%,#FF8A3D 76% 92%,transparent 92%),#06070d'},
 {id:'orbita',n:'Órbita',d:'Planetas que giran',sw:'radial-gradient(circle at 50% 50%,#F0CE6B 0 9px,transparent 10px),radial-gradient(circle at 22% 62%,#3DDC84 0 7px,transparent 8px),radial-gradient(circle at 78% 62%,#FF8A3D 0 7px,transparent 8px),radial-gradient(circle at 50% 22%,#F0CE6B 0 6px,transparent 7px),radial-gradient(ellipse 36% 26% at 50% 50%,transparent 94%,#ffffff33 96%,transparent 98%),#05060f'},
 {id:'paneles',n:'Paneles',d:'Pantalla partida',sw:'linear-gradient(172deg,#F0CE6B 0 33%,#0a0a0a 33% 34%,#3DDC84 34% 66%,#0a0a0a 66% 67%,#FF8A3D 67%)'},
 {id:'mazo',n:'Mazo',d:'Cartas que se lanzan',sw:'linear-gradient(#FF8A3D,#FF8A3D) 50% 78%/58% 62% no-repeat,linear-gradient(#3DDC84,#3DDC84) 50% 62%/68% 62% no-repeat,linear-gradient(#F0CE6B,#F0CE6B) 50% 44%/78% 62% no-repeat,#0b0c12'},
 {id:'tablero',n:'Tablero',d:'Marcador de aeropuerto',sw:'repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 22%/86% 14% no-repeat,repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 50%/86% 14% no-repeat,repeating-linear-gradient(90deg,#FFC83D 0 9px,#0c0c0f 9px 11px) 50% 78%/86% 14% no-repeat,#16161a'}
];
var BY={};ESTILOS.forEach(function(e){BY[e.id]=e;});

/* ===================================================================== CSS */
var CSS=`
.brandbar,html h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html[data-hub]:not([data-hub="oro"]) .wrap,html[data-hub]:not([data-hub="oro"]) #splash,html[data-hub]:not([data-hub="oro"]) body::before{display:none!important}
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
#hubLay .liv{display:inline-flex;align-items:center;gap:6px;font:800 10px Inter;letter-spacing:.12em;padding:5px 10px;border-radius:99px;border:1px solid var(--c);color:var(--c);background:rgba(0,0,0,.35)}
#hubLay .liv i{width:6px;height:6px;border-radius:50%;background:var(--c);animation:hlLive 1.4s ease-in-out infinite}

/* ============================ CARRUSEL 3D ============================ */
html[data-hub="carrusel"] body{background:#06070d}
.L-carrusel .bgfx i{position:absolute;left:50%;top:44%;width:96vmax;height:96vmax;margin:-48vmax 0 0 -48vmax;border-radius:50%;background:radial-gradient(circle,var(--c),transparent 60%);opacity:0;transition:opacity .9s ease}
.L-carrusel.a0 .bg0,.L-carrusel.a1 .bg1,.L-carrusel.a2 .bg2{opacity:.5}
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
.L-paneles .stack{position:absolute;left:0;right:0;top:-3vh;bottom:-3vh;display:flex;flex-direction:column}
.L-paneles .pn{position:relative;flex:1 1 0;display:block;overflow:hidden;clip-path:polygon(0 0,100% 6vh,100% 100%,0 calc(100% - 6vh));-webkit-clip-path:polygon(0 0,100% 6vh,100% 100%,0 calc(100% - 6vh));transition:filter .25s;animation:hlPnIn .9s cubic-bezier(.2,.9,.25,1) backwards}
.L-paneles .pn+.pn{margin-top:-6vh}
.L-paneles .pn:nth-child(1){animation-delay:.05s;--from:-100vw}
.L-paneles .pn:nth-child(2){animation-delay:.2s;--from:100vw}
.L-paneles .pn:nth-child(3){animation-delay:.35s;--from:-100vw}
@keyframes hlPnIn{from{translate:var(--from) 0}}
.L-paneles .pn:active{filter:brightness(1.3)}
.L-paneles .pn .pat{position:absolute;inset:0;animation:hlSlide 6s linear infinite}
@keyframes hlSlide{to{background-position:84px 0}}
.L-paneles .pn0{background:linear-gradient(115deg,#2c1f06,#8a5f16 55%,#F0CE6B)}
.L-paneles .pn0 .pat{background:repeating-linear-gradient(135deg,rgba(0,0,0,.16) 0 18px,transparent 18px 42px)}
.L-paneles .pn1{background:linear-gradient(115deg,#04200f,#0f6b3a 55%,#3DDC84)}
.L-paneles .pn1 .pat{background:repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 42px,transparent 42px 84px)}
.L-paneles .pn2{background:linear-gradient(115deg,#2b0f02,#b4400a 55%,#FF8A3D)}
.L-paneles .pn2 .pat{background:radial-gradient(circle at 78% 50%,transparent 0 22px,rgba(0,0,0,.2) 23px 25px,transparent 26px 56px,rgba(0,0,0,.2) 57px 59px,transparent 60px)}
.L-paneles .pn .emo{position:absolute;right:-5vw;top:50%;margin-top:-11vw;font-size:22vw;line-height:1;transform:rotate(-12deg);filter:drop-shadow(0 14px 24px rgba(0,0,0,.45));animation:hlBob 5s ease-in-out infinite}
.L-paneles .pn .big{position:absolute;left:6vw;bottom:26%;font:900 italic clamp(52px,18.5vw,88px)/.9 Inter,system-ui,sans-serif;letter-spacing:-.03em;text-transform:uppercase;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.92);transition:color .25s}
.L-paneles .pn:active .big{color:#fff}
.L-paneles .pn .sm{position:absolute;left:6.4vw;bottom:calc(26% - 26px);font:600 12px Inter;color:rgba(255,255,255,.88);letter-spacing:.04em;max-width:60vw;text-shadow:0 1px 8px rgba(0,0,0,.5)}
.L-paneles .pn .liv{position:absolute;left:6.4vw;bottom:calc(26% + clamp(48px,17vw,80px) + 12px);--c:#fff}
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
.L-tablero .meta .liv{font-size:9px;padding:3px 8px}
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

@media (prefers-reduced-motion:reduce){#hubLay *,#hubLay *::before,#hubLay *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important}}
`;

/* ===================================================================== utilidades */
var ST={id:'oro',stop:null,timers:[]};
function leer(){ try{ var v=root.localStorage.getItem(KEY); return BY[v]?v:'oro'; }catch(e){ return 'oro'; } }
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
 nba:'<rect x="8" y="12" width="104" height="96" rx="4"/><rect x="40" y="12" width="40" height="44"/><circle cx="60" cy="56" r="16"/><path d="M20 12 V34 A40 40 0 0 0 100 34 V12"/><circle cx="60" cy="22" r="4"/><path d="M52 12 H68"/>'
};
function art(k){ return '<div class="art"><svg viewBox="0 0 120 120" aria-hidden="true">'+ARTS[k].replace(/<(path|rect|circle) /g,'<$1 pathLength="1" ')+'</svg></div>'; }
function brand(){ return '<div class="hl-brand">OVA <span>·</span></div>'; }
function pad(s,n){ s=String(s); while(s.length<n) s+=' '; return s; }

/* ===================================================================== CARRUSEL 3D */
function htmlCarrusel(){
  var bg='',s='';
  DEP.forEach(function(d,i){
    bg+='<i class="bg'+i+'" style="--c:'+d.c+'"></i>';
    s+='<a class="slide" href="'+d.href+'" style="--c:'+d.c+';--c2:'+d.c2+'">'+art(d.k)+'<span class="emo">'+d.e+'</span><span class="liv"><i></i>LIVE</span><b class="nm">'+d.n+'</b><p>'+d.d+'</p><span class="go">ENTRAR ›</span></a>';
  });
  return '<div class="bgfx">'+bg+'</div>'+brand()+'<div class="car">'+s+'</div><div class="dots"><i class="on"></i><i></i><i></i></div>';
}
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
    if(best!==act){ act=best; lay.classList.remove('a0','a1','a2'); lay.classList.add('a'+best); dots.forEach(function(x,i){ x.classList.toggle('on',i===best); }); }
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
      var a=th+i*Math.PI*2/3, x=cx+Rx*grow*Math.cos(a), y=cy+Ry*grow*Math.sin(a), dep=(Math.sin(a)+1)/2, s=0.68+0.62*dep;
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
  DEP.forEach(function(d,i){
    s+='<a class="pn pn'+i+'" href="'+d.href+'"><div class="pat"></div><span class="emo">'+d.e+'</span><span class="liv"><i></i>LIVE</span><b class="big">'+d.n+'</b><span class="sm">'+d.d+'</span></a>';
  });
  return '<div class="stack">'+s+'</div>'+brand();
}

/* ===================================================================== MAZO */
function htmlMazo(){
  var s='';
  DEP.forEach(function(d){
    s+='<a class="cd" href="'+d.href+'" style="--c:'+d.c+';--c2:'+d.c2+'">'+art(d.k)+'<span class="emo">'+d.e+'</span><span class="liv"><i></i>LIVE</span><b class="nm">'+d.n+'</b><p>'+d.d+'</p><span class="go">ENTRAR ›</span></a>';
  });
  return '<div class="bgfx"><i class="m1"></i><i class="m2"></i></div>'+brand()+'<div class="deck">'+s+'</div><div class="hl-title"><div class="dots"><i class="on"></i><i></i><i></i></div>Lanza la carta para ver la siguiente</div>';
}
function initMazo(lay){
  var cards=[].slice.call(lay.querySelectorAll('.cd')), dots=[].slice.call(lay.querySelectorAll('.dots i')), ord=[0,1,2], drag=null, moved=false, W=root.innerWidth||360, H=root.innerHeight||640;
  function colocar(anim,delays){
    ord.forEach(function(ci,k){
      var el=cards[ci];
      el.style.transition=anim?'transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s':'none';
      el.style.transitionDelay=delays?((2-k)*0.1)+'s':'0s';
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
    rows+='<a class="row" href="'+d.href+'" style="--c:'+d.c+'"><div class="fls" data-t="'+pad(d.n.toUpperCase(),8)+'">'+fila('        ')+'</div><div class="meta"><span>'+d.d.replace(/ — /,' · ')+'</span><span class="liv" style="--c:#ff5b4d"><i></i>LIVE</span></div></a>';
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
var BUILD={
 carrusel:{html:htmlCarrusel,init:initCarrusel},
 orbita:{html:htmlOrbita,init:initOrbita},
 paneles:{html:htmlPaneles,init:null},
 mazo:{html:htmlMazo,init:initMazo},
 tablero:{html:htmlTablero,init:initTablero}
};
function construir(id){
  var b=BUILD[id]; if(!b) return;
  var lay=doc.createElement('div'); lay.id='hubLay'; lay.className='L-'+id;
  lay.innerHTML=b.html(); doc.body.appendChild(lay);
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
    ESTILOS.forEach(function(e){ t+='<button type="button" class="tile" data-id="'+e.id+'"><span class="sw" style="background:'+e.sw+'"></span><span class="tx"><b>'+e.n+'</b><span>'+e.d+'</span></span></button>'; });
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
  var url=params(), id=url||leer();
  aplicar(id,{inicial:true,guardar:!!url});   /* en <head>: solo marca el diseño (así no se ve el clásico un instante antes) */
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

var API={ESTILOS:ESTILOS,DEP:DEP,css:CSS,_html:{carrusel:htmlCarrusel,orbita:htmlOrbita,paneles:htmlPaneles,mazo:htmlMazo,tablero:htmlTablero},aplicar:aplicar,abrirHoja:abrirHoja,cerrarHoja:cerrarHoja,actual:function(){ return ST.id; },leer:leer,_arrancar:arrancar};
root.OVAHub=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
