/* OVA · diseño interior v1  (MLB, fútbol y NBA)
   Cambia la FORMA de las pantallas de adentro (tarjetas de partido, pestañas, barra de abajo, iconos,
   números y animaciones). Es aparte del tema de color: se combinan.
   Diseños:  Clásico (como estaba) · Cristal · Broadcast · Pro · Boleto · Boleto noche · Prensa · Radar
   Cómo cambiar: mantén presionado el logo "OVA" de arriba unos 0.7 segundos.
   No toca ningún cálculo, ningún dato ni ningún botón de las apps. Solo CSS, iconos y un selector. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var KEY='ova_interior';
var UIS=[
 {id:'clasico',n:'Clásico',d:'Como lo tenías',sw:'linear-gradient(135deg,#0b121c,#1b2838)'},
 {id:'cristal',n:'Cristal',d:'Vidrio, dock flotante y versus',sw:'radial-gradient(circle at 25% 30%,#3b82f6aa,transparent 55%),radial-gradient(circle at 80% 70%,#a855f7aa,transparent 55%),#0a0f1d'},
 {id:'broadcast',n:'Broadcast',d:'Gráficos de TV deportiva',sw:'linear-gradient(115deg,#0a0f1d 0 60%,#FBBF24 60% 64%,#0a0f1d 64%)'},
 {id:'pro',n:'Pro',d:'Datos primero: barras de probabilidad y números tabulares',sw:'linear-gradient(90deg,#3b82f6 0 46%,#0b121c 46% 48%,#fbbf24 48%)'},
 {id:'boleto',n:'Boleto',d:'Cada juego es un ticket: números grandes, sello de veredicto y cuota justa',sw:'linear-gradient(135deg,#0b0d12 0 34%,#F6F7F9 34% 80%,#FFD84A 80%)'},
 {id:'boletonoche',n:'Boleto noche',d:'El mismo ticket en oscuro, con acento coral',sw:'linear-gradient(135deg,#05070C 0 34%,#161C2A 34% 80%,#FF6B4A 80%)'},
 {id:'prensa',n:'Prensa',d:'Página de deportes de periódico: papel crema, tinta y letra serif. Se lee con sol',sw:'linear-gradient(135deg,#F3EEE1 0 52%,#17140E 52% 60%,#A61E16 60%)'},
 {id:'radar',n:'Radar',d:'Negro puro con cian y lima, marcos con esquinas y números en mono',sw:'radial-gradient(circle at 50% 130%,#22E4FFAA,transparent 62%),linear-gradient(#000,#000)'}
];
var BY={};UIS.forEach(function(u){BY[u.id]=u;});

var CSS=`
.topbar .brand,header h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
@keyframes uiRise{from{opacity:0;transform:translateY(26px) scale(.97)}}
@keyframes uiPop{from{opacity:0;transform:scale(.9)}}
@keyframes uiSlide{from{opacity:0;transform:translateX(-28px)}}
@keyframes uiGlow{0%,100%{box-shadow:0 0 0 0 var(--acc)}50%{box-shadow:0 0 22px -2px var(--acc)}}
@keyframes uiShine{0%,70%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
@keyframes uiFade{from{opacity:0;transform:translateY(8px)}}
html[data-ui] .navbar svg.ic2,html[data-ui] .tabbar svg.ic2{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

/* =========================================================== CRISTAL =========================================================== */
html[data-ui="cristal"] body{background-attachment:fixed;background-image:radial-gradient(120% 55% at 10% -8%,rgba(80,120,255,.2),transparent 55%),radial-gradient(90% 45% at 100% 18%,rgba(170,90,255,.15),transparent 55%),radial-gradient(80% 40% at 50% 110%,rgba(34,211,238,.1),transparent 60%)}
html[data-ui="cristal"] body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 104px)!important}
/* barra de arriba */
html[data-ui="cristal"] .topbar,html[data-ui="cristal"] header{background:transparent!important;border-bottom:0!important;-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%)}
html[data-ui="cristal"] .topbar .inner{padding:10px 16px 8px}
html[data-ui="cristal"] .brand{font:800 27px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;letter-spacing:.16em;background:linear-gradient(90deg,#fff 30%,var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
html[data-ui="cristal"] header h1{font:800 24px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif!important;letter-spacing:.1em!important;color:#fff;text-shadow:0 0 22px var(--acc)}
html[data-ui="cristal"] .brand svg{color:var(--acc2);filter:drop-shadow(0 0 8px var(--acc))}
html[data-ui="cristal"] .ver{display:none}
html[data-ui="cristal"] .ovaHome{width:40px!important;height:40px!important;min-height:0;padding:0!important;border-radius:50%;font-size:0!important;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
html[data-ui="cristal"] .ovaHome::before{content:"‹";font-size:28px;line-height:1;color:var(--txt);padding-bottom:4px}
/* dock flotante */
html[data-ui="cristal"] .navbar,html[data-ui="cristal"] .tabbar{left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;border-radius:30px!important;padding:7px!important;gap:3px;border:1px solid rgba(255,255,255,.18)!important;background:rgba(14,19,34,.6)!important;-webkit-backdrop-filter:blur(28px) saturate(190%)!important;backdrop-filter:blur(28px) saturate(190%)!important;box-shadow:0 22px 44px -14px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.2)!important}
html[data-ui="cristal"] .navbar button,html[data-ui="cristal"] .tabbar .tbar-btn{border-radius:22px!important;padding:9px 2px 7px!important;color:var(--mut)!important;transition:background .3s,color .3s,transform .2s}
html[data-ui="cristal"] .navbar button span,html[data-ui="cristal"] .tabbar .lb{font-size:11px!important;font-weight:700}
html[data-ui="cristal"] .navbar button.on,html[data-ui="cristal"] .tabbar .tbar-btn.on{background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.07))!important;color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.26),0 0 26px -6px var(--acc)}
html[data-ui="cristal"] .navbar button.on svg,html[data-ui="cristal"] .tabbar .tbar-btn.on svg{filter:drop-shadow(0 0 7px var(--acc2))}
html[data-ui="cristal"] .navbar button:active,html[data-ui="cristal"] .tabbar .tbar-btn:active{transform:scale(.92)}
/* fecha y cargar */
html[data-ui="cristal"] .cargafila input[type=date]{border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16)}
html[data-ui="cristal"] .cargafila button,html[data-ui="cristal"] #cargar{border-radius:18px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--accTx);box-shadow:0 12px 26px -10px var(--acc)}
html[data-ui="cristal"] .diaBtn{border-radius:99px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
html[data-ui="cristal"] .diaBtn.on{background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--accTx);border-color:transparent}
/* tarjeta de partido */
html[data-ui="cristal"] .game{border-radius:30px;border:1px solid rgba(255,255,255,.15);background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.025));-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 26px 52px -26px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.18);margin:16px 0;overflow:hidden;animation:uiRise .7s cubic-bezier(.2,.8,.2,1) backwards}
html[data-ui="cristal"] .game:nth-child(2){animation-delay:.06s}html[data-ui="cristal"] .game:nth-child(3){animation-delay:.12s}html[data-ui="cristal"] .game:nth-child(4){animation-delay:.18s}html[data-ui="cristal"] .game:nth-child(n+5){animation-delay:.22s}
html[data-ui="cristal"] .game::before{content:"";position:absolute;inset:0 0 auto 0;height:90px;pointer-events:none;background:radial-gradient(60% 100% at 25% 0%,var(--ta,transparent),transparent),radial-gradient(60% 100% at 75% 0%,var(--th,transparent),transparent);opacity:.3}
html[data-ui="cristal"] .game.open{border-color:rgba(255,255,255,.32)}
html[data-ui="cristal"] .game .head{position:relative;display:block;padding:50px 18px 18px}
html[data-ui="cristal"] .game .hrow{display:block}
html[data-ui="cristal"] .game .hrow>div:not(.match){position:absolute;top:14px;right:14px;z-index:3;text-align:right}
html[data-ui="cristal"] .game .match{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;justify-items:center;text-align:center;gap:6px 8px;font:700 15px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif}
html[data-ui="cristal"] .game .match .eq{flex-direction:column;gap:9px;align-items:center}
html[data-ui="cristal"] .game .match .esc,html[data-ui="cristal"] .game .match .esc img{width:58px!important;height:58px!important}
html[data-ui="cristal"] .game .match .esc img{filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))}
html[data-ui="cristal"] .game .match .vs{align-self:center;margin-top:-14px;font-size:14px;font-weight:600;opacity:.55}
html[data-ui="cristal"] .game .match small{grid-column:1/-1;margin-top:10px;padding:8px 14px;border-radius:99px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font:500 12px/1.3 system-ui;color:var(--mut)}
html[data-ui="cristal"] .game .clock{border-radius:99px;padding:6px 12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:var(--txt);font-weight:700}
html[data-ui="cristal"] .game .clock.vivo{background:#e5384a;border-color:#e5384a;color:#fff;box-shadow:0 0 22px -2px #e5384a}
html[data-ui="cristal"] .game .chev{display:none}
html[data-ui="cristal"] .game .bug .caja{border-radius:20px;background:rgba(0,0,0,.4);border-color:rgba(255,255,255,.18)}
/* futbol / nba: cabecera de partido */
html[data-ui="cristal"] .game .head .crestpair{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;width:100%}
html[data-ui="cristal"] .game .head .crestpair .eq{flex-direction:column;gap:9px;text-align:center;font:700 15px/1.2 ui-rounded,system-ui}
html[data-ui="cristal"] .game .head .crestpair .eq img{width:58px;height:58px;border-radius:14px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}
html[data-ui="cristal"] .game .head .crestpair .eq span.n,html[data-ui="cristal"] .game .head .crestpair .eq>span{white-space:normal;text-align:center}
html[data-ui="cristal"] .game .head .hora{position:absolute;top:14px;right:14px;border-radius:99px;padding:6px 12px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22);color:var(--txt);font-weight:700}
html[data-ui="cristal"] .game .head:has(.crestpair){display:block}
/* pestañas */
html[data-ui="cristal"] .tabs{background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:4px!important;margin:0 14px 14px!important;gap:3px!important}
html[data-ui="cristal"] .tb{border-radius:16px!important;background:transparent!important;color:var(--mut)!important;transition:background .3s,color .3s,box-shadow .3s}
html[data-ui="cristal"] .tb.on{background:linear-gradient(135deg,var(--acc),var(--acc2))!important;color:var(--accTx)!important;box-shadow:0 10px 22px -10px var(--acc);animation:uiPop .35s ease}
html[data-ui="cristal"] .tab,html[data-ui="cristal"] .pane.on{animation:uiFade .4s ease}
html[data-ui="cristal"] .game.open .head{position:relative!important;top:auto!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}
html[data-ui="cristal"] .game{--headh:0px!important}
html[data-ui="cristal"] .game.open .tabs{position:sticky;top:calc(var(--barra,60px) + 6px)!important;z-index:12;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
html[data-ui="cristal"] .game .body{padding-left:14px;padding-right:14px}
/* tarjetas internas */
html[data-ui="cristal"] .ovaHero{border-radius:26px;background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03))!important;border:1px solid rgba(255,255,255,.16);padding:18px 10px 14px}
html[data-ui="cristal"] .ovaHero .pc{font-size:clamp(28px,8.4vw,36px)}
html[data-ui="cristal"] .ovaHero .sg{stroke-width:11;stroke-linecap:round}
html[data-ui="cristal"] .ovaHero .sg.fv{filter:drop-shadow(0 0 7px var(--hot))}
html[data-ui="cristal"] .kpi div,html[data-ui="cristal"] .tarj div,html[data-ui="cristal"] .cmpg div{background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.11);border-radius:22px;animation:uiPop .5s cubic-bezier(.2,.8,.2,1) backwards}
html[data-ui="cristal"] .kpi div:nth-child(2){animation-delay:.07s}html[data-ui="cristal"] .kpi div:nth-child(3){animation-delay:.14s}
html[data-ui="cristal"] .kpi b{font-size:30px;letter-spacing:-.02em;background:linear-gradient(180deg,#fff,var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
html[data-ui="cristal"] .pick{border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14);border-left-width:4px;box-shadow:0 14px 30px -18px rgba(0,0,0,.8)}
html[data-ui="cristal"] .cal,html[data-ui="cristal"] .row,html[data-ui="cristal"] .cuotasbox,html[data-ui="cristal"] .observ,html[data-ui="cristal"] .calc,html[data-ui="cristal"] .pk,html[data-ui="cristal"] .linea,html[data-ui="cristal"] .marcadores div,html[data-ui="cristal"] .leyenda,html[data-ui="cristal"] .receta{border-radius:20px!important;background:rgba(255,255,255,.055)!important;border-color:rgba(255,255,255,.1)}
html[data-ui="cristal"] .bar{height:44px;border-radius:99px;border-color:rgba(255,255,255,.14)}
html[data-ui="cristal"] .bar span{animation:uiBar .9s cubic-bezier(.2,.8,.2,1) backwards}
@keyframes uiBar{from{flex-grow:.01}}
html[data-ui="cristal"] h3{border-bottom-color:rgba(255,255,255,.12)}
html[data-ui="cristal"] input[type=text],html[data-ui="cristal"] input[type=number],html[data-ui="cristal"] select{border-radius:16px;background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16)}
html[data-ui="cristal"] button.ghost{border-radius:16px;background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16)}
html[data-ui] .fila{opacity:1;transform:none}
html[data-ui] .fila.gris{opacity:.5}
html[data-ui="cristal"] .fila,html[data-ui="cristal"] .fila-rank{border-radius:22px;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.055)!important;margin:9px 0;padding:12px 14px;animation:uiRise .5s cubic-bezier(.2,.8,.2,1) backwards}
html[data-ui="cristal"] .fila .pct,html[data-ui="cristal"] .fila-rank .pct{font-size:19px}
html[data-ui="cristal"] .vacio{border-radius:30px;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14)}
html[data-ui="cristal"] .ajustes{border-radius:26px;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.12)}

/* =========================================================== BROADCAST =========================================================== */
html[data-ui="broadcast"] body{background-image:repeating-linear-gradient(115deg,rgba(255,255,255,.028) 0 2px,transparent 2px 16px),radial-gradient(120% 50% at 50% -10%,rgba(255,255,255,.07),transparent 60%);background-attachment:fixed}
html[data-ui="broadcast"] body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 82px)!important}
html[data-ui="broadcast"] .topbar,html[data-ui="broadcast"] header{background:var(--bg1)!important;border-bottom:4px solid var(--acc)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:0 10px 30px -12px rgba(0,0,0,.8)}
html[data-ui="broadcast"] .brand,html[data-ui="broadcast"] header h1{font:900 italic 30px/1 "Avenir Next Condensed","Barlow Condensed","Arial Narrow",Inter,system-ui,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:var(--txt);transform:skewX(-8deg)}
html[data-ui="broadcast"] .brand svg{color:var(--hot)}
html[data-ui="broadcast"] .ver{border-radius:0;transform:skewX(-12deg);background:var(--hot);color:var(--hotTx);border:0;font-weight:800}
html[data-ui="broadcast"] .ovaHome{border-radius:0;clip-path:polygon(0 0,100% 0,100% 68%,72% 100%,0 100%);background:var(--acc);color:var(--accTx);border:0;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:8px 16px 10px}
/* barra de abajo plana con muesca */
html[data-ui="broadcast"] .navbar,html[data-ui="broadcast"] .tabbar{background:var(--bg1)!important;border-top:4px solid var(--acc)!important;border-radius:0!important;box-shadow:0 -14px 30px -14px rgba(0,0,0,.8)}
html[data-ui="broadcast"] .navbar button,html[data-ui="broadcast"] .tabbar .tbar-btn{position:relative;border-radius:0!important;color:var(--mut)!important;text-transform:uppercase;letter-spacing:.05em}
html[data-ui="broadcast"] .navbar button span,html[data-ui="broadcast"] .tabbar .lb{font-size:11px!important;font-weight:800}
html[data-ui="broadcast"] .navbar button.on,html[data-ui="broadcast"] .tabbar .tbar-btn.on{color:var(--txt)!important;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent)!important}
html[data-ui="broadcast"] .navbar button.on::before,html[data-ui="broadcast"] .tabbar .tbar-btn.on::before{content:"";position:absolute;top:-4px;left:14%;right:14%;height:4px;background:var(--hot);box-shadow:0 0 18px 2px var(--hot)}
html[data-ui="broadcast"] .navbar button.on svg,html[data-ui="broadcast"] .tabbar .tbar-btn.on svg{color:var(--hot);filter:drop-shadow(0 0 6px var(--hot))}
html[data-ui="broadcast"] .cargafila input[type=date]{border-radius:0;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}
html[data-ui="broadcast"] .cargafila button,html[data-ui="broadcast"] #cargar{border-radius:0;transform:skewX(-10deg);background:var(--hot);color:var(--hotTx);font-weight:900;text-transform:uppercase;letter-spacing:.04em}
html[data-ui="broadcast"] .diaBtn{border-radius:0;transform:skewX(-12deg);background:var(--bg2);border:0;font-weight:800;text-transform:uppercase}
html[data-ui="broadcast"] .diaBtn.on{background:var(--hot);color:var(--hotTx)}
/* tarjeta de partido: marcador de TV */
html[data-ui="broadcast"] .game{border:0;border-radius:0;margin:14px 0;background:linear-gradient(120deg,var(--bg2),var(--bg1) 70%);clip-path:polygon(0 0,calc(100% - 26px) 0,100% 26px,100% 100%,26px 100%,0 calc(100% - 26px));box-shadow:none;border-left:7px solid var(--ta,var(--acc));animation:uiSlide .55s cubic-bezier(.2,.8,.2,1) backwards;position:relative}
html[data-ui="broadcast"] .game:nth-child(2){animation-delay:.06s}html[data-ui="broadcast"] .game:nth-child(3){animation-delay:.12s}html[data-ui="broadcast"] .game:nth-child(n+4){animation-delay:.18s}
html[data-ui="broadcast"] .game.open{border-left-color:var(--hot)}
html[data-ui="broadcast"] .game::after{content:"";position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.07),transparent);animation:uiShine 6s ease-in-out infinite;pointer-events:none}
html[data-ui="broadcast"] .game .head{padding:16px 16px 16px 14px}
html[data-ui="broadcast"] .game .match{display:flex;flex-direction:column;gap:7px;font:900 italic 21px/1.05 "Avenir Next Condensed","Barlow Condensed","Arial Narrow",Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.01em}
html[data-ui="broadcast"] .game .match .eq{display:flex;flex-direction:row;gap:11px;align-items:center}
html[data-ui="broadcast"] .game .match .esc,html[data-ui="broadcast"] .game .match .esc img{width:36px!important;height:36px!important}
html[data-ui="broadcast"] .game .match .vs{display:none}
html[data-ui="broadcast"] .game .match small{display:block;margin-top:8px;padding:7px 10px;background:rgba(0,0,0,.4);border-left:3px solid var(--hot);font:700 11px/1.3 Inter,system-ui,sans-serif;letter-spacing:.07em;color:var(--mut);text-transform:uppercase}
html[data-ui="broadcast"] .game .clock{border:0;border-radius:0;background:var(--hot);color:var(--hotTx);font:900 13px Inter,system-ui;transform:skewX(-12deg);padding:6px 11px}
html[data-ui="broadcast"] .game .clock.vivo{background:#e5384a;color:#fff}
html[data-ui="broadcast"] .game .chev{margin-top:8px}
html[data-ui="broadcast"] .game .head .crestpair .eq{font:900 italic 20px/1.05 "Avenir Next Condensed","Barlow Condensed","Arial Narrow",Inter,system-ui,sans-serif;text-transform:uppercase}
html[data-ui="broadcast"] .game .head .crestpair .eq img{width:34px;height:34px}
html[data-ui="broadcast"] .game .head .hora{border:0;border-radius:0;background:var(--hot);color:var(--hotTx);font-weight:900;transform:skewX(-12deg)}
html[data-ui="broadcast"] .tabs{background:var(--bg1)!important;gap:4px!important;padding:2px 2px 10px!important;border-bottom:3px solid var(--line2)}
html[data-ui="broadcast"] .tb{border-radius:0!important;transform:skewX(-14deg);background:var(--bg2)!important;color:var(--mut)!important;font-weight:900!important;text-transform:uppercase;letter-spacing:.04em;padding:9px 15px!important}
html[data-ui="broadcast"] .tb.on{background:var(--hot)!important;color:var(--hotTx)!important;box-shadow:0 8px 0 -4px var(--hot)}
html[data-ui="broadcast"] .tab,html[data-ui="broadcast"] .pane.on{animation:uiFade .35s ease}
html[data-ui="broadcast"] .ovaHero{border-radius:0;border:0;border-top:5px solid var(--hot);background:linear-gradient(180deg,var(--bg2),var(--bg1))!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
html[data-ui="broadcast"] .ovaHero .pc,html[data-ui="broadcast"] .kpi b{font-family:"Avenir Next Condensed","Barlow Condensed","Arial Narrow",Inter,system-ui,sans-serif;font-style:italic;font-weight:900}
html[data-ui="broadcast"] .ovaHero .pc{font-size:clamp(24px,7.2vw,32px);letter-spacing:-.02em}
html[data-ui="broadcast"] .ovaHero .row3{grid-template-columns:1fr 112px 1fr}
html[data-ui="broadcast"] .ovaHero .gz{width:112px}
html[data-ui="broadcast"] .ovaHero .ab{font-weight:900;letter-spacing:.12em}
html[data-ui="broadcast"] .kpi div,html[data-ui="broadcast"] .tarj div,html[data-ui="broadcast"] .cmpg div{border-radius:0!important;background:var(--bg1)!important;border-top:5px solid var(--hot);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%);animation:uiSlide .45s cubic-bezier(.2,.8,.2,1) backwards}
html[data-ui="broadcast"] .kpi div:nth-child(2){animation-delay:.07s}html[data-ui="broadcast"] .kpi div:nth-child(3){animation-delay:.14s}
html[data-ui="broadcast"] .kpi b{font-size:34px}
html[data-ui="broadcast"] .kpi span,html[data-ui="broadcast"] .kpi small{text-transform:uppercase;letter-spacing:.07em;font-weight:700}
html[data-ui="broadcast"] .pick{border-radius:0;border-left-width:7px;background:var(--bg1);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
html[data-ui="broadcast"] .cal,html[data-ui="broadcast"] .row,html[data-ui="broadcast"] .cuotasbox,html[data-ui="broadcast"] .observ,html[data-ui="broadcast"] .calc,html[data-ui="broadcast"] .pk,html[data-ui="broadcast"] .linea,html[data-ui="broadcast"] .marcadores div,html[data-ui="broadcast"] .leyenda,html[data-ui="broadcast"] .receta{border-radius:0!important;border-left:4px solid var(--line2)}
html[data-ui="broadcast"] .bar{height:40px;border-radius:0;transform:skewX(-10deg);border-color:var(--line2)}
html[data-ui="broadcast"] .bar span{animation:uiBar .9s cubic-bezier(.2,.8,.2,1) backwards;font-style:italic;font-weight:900}
html[data-ui="broadcast"] h3{text-transform:uppercase;letter-spacing:.07em;font-weight:900;border-bottom:3px solid var(--hot);width:fit-content;padding-right:14px}
html[data-ui="broadcast"] input[type=text],html[data-ui="broadcast"] input[type=number],html[data-ui="broadcast"] select{border-radius:0}
html[data-ui="broadcast"] button.ghost{border-radius:0;font-weight:800;text-transform:uppercase}
html[data-ui="broadcast"] .fila,html[data-ui="broadcast"] .fila-rank{border-radius:0;border:0!important;border-left:6px solid var(--hot)!important;background:var(--bg1)!important;margin:8px 0;padding:11px 12px;animation:uiSlide .45s cubic-bezier(.2,.8,.2,1) backwards}
html[data-ui="broadcast"] .fila .pct,html[data-ui="broadcast"] .fila-rank .pct{font:900 italic 22px "Avenir Next Condensed","Barlow Condensed",Inter,system-ui}
html[data-ui="broadcast"] .vacio{border-radius:0;border:0;border-top:5px solid var(--hot)}
html[data-ui="broadcast"] .ajustes{border-radius:0;border-left:5px solid var(--hot)}

/* =========================================================== PRO (datos primero) =========================================================== */
html[data-ui="pro"] body{font-variant-numeric:tabular-nums;background-image:none;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 84px)!important}
html[data-ui="pro"] .topbar,html[data-ui="pro"] header{background:var(--bg)!important;border-bottom:1px solid var(--line2)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}
html[data-ui="pro"] .brand,html[data-ui="pro"] header h1{font:800 19px/1 ui-monospace,"SF Mono",Menlo,monospace!important;letter-spacing:.16em;text-transform:uppercase}
html[data-ui="pro"] .ver{border-radius:4px;border:1px solid var(--line2);background:var(--bg1);color:var(--mut);font:600 11px ui-monospace,Menlo,monospace;padding:2px 6px}
html[data-ui="pro"] .navbar,html[data-ui="pro"] .tabbar{background:var(--bg)!important;border-top:1px solid var(--line2)!important;border-radius:0!important;box-shadow:none!important}
html[data-ui="pro"] .navbar button,html[data-ui="pro"] .tabbar .tbar-btn{position:relative;border-radius:0!important;color:var(--mut)!important;background:transparent!important}
html[data-ui="pro"] .navbar button span,html[data-ui="pro"] .tabbar .lb{font-size:11px!important;font-weight:700;letter-spacing:.02em}
html[data-ui="pro"] .navbar button.on,html[data-ui="pro"] .tabbar .tbar-btn.on{color:var(--txt)!important}
html[data-ui="pro"] .navbar button.on::before,html[data-ui="pro"] .tabbar .tbar-btn.on::before{content:"";position:absolute;top:-1px;left:22%;right:22%;height:2px;background:var(--hot);border-radius:0 0 2px 2px}
html[data-ui="pro"] .navbar button.on svg,html[data-ui="pro"] .tabbar .tbar-btn.on svg{color:var(--hot)}
html[data-ui="pro"] .diaBtn{border-radius:8px;background:var(--bg1);border:1px solid var(--line2);font-weight:700}
html[data-ui="pro"] .diaBtn.on{background:var(--hot);color:var(--hotTx);border-color:var(--hot)}
html[data-ui="pro"] .cargafila input[type=date]{border-radius:8px}
html[data-ui="pro"] .game{border-radius:12px;border:1px solid var(--line2);background:var(--bg1);margin:10px 0;position:relative;overflow:hidden;box-shadow:none}
html[data-ui="pro"] .game::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--ta,var(--acc)),var(--th,var(--acc2)));pointer-events:none}
html[data-ui="pro"] .game.open{border-color:var(--mut2)}
html[data-ui="pro"] .game .head{padding:13px 14px 13px 19px}
html[data-ui="pro"] .game .match{font:700 17px/1.25 var(--body,system-ui,sans-serif);letter-spacing:-.005em}
html[data-ui="pro"] .game .match .vs{font-family:ui-monospace,Menlo,monospace;font-style:normal;font-size:13px;opacity:.6}
html[data-ui="pro"] .game .match small{font:500 12px/1.35 ui-monospace,Menlo,monospace;color:var(--mut)}
html[data-ui="pro"] .game .clock,html[data-ui="pro"] .game .head .hora{font:700 12px ui-monospace,Menlo,monospace;border-radius:6px;background:var(--bg2);border:1px solid var(--line2);color:var(--txt);padding:5px 8px}
html[data-ui="pro"] .game .clock.vivo{background:#e5384a;border-color:#e5384a;color:#fff}
html[data-ui="pro"] .dsProb{display:block;margin:11px 0 0}
html[data-ui="pro"] .dsProb .bb{display:flex;gap:2px;height:7px}
html[data-ui="pro"] .dsProb .bb i{display:block;border-radius:99px;min-width:6px}
html[data-ui="pro"] .dsProb .bb i{background:var(--line2)}
html[data-ui="pro"] .dsProb.fa .ba,html[data-ui="pro"] .dsProb.fh .bh{background:var(--hot)}
html[data-ui="pro"] .dsProb .bl{display:flex;justify-content:space-between;margin-top:5px;font:700 12px ui-monospace,Menlo,monospace;color:var(--mut)}
html[data-ui="pro"] .dsProb.fa .bl b:first-child,html[data-ui="pro"] .dsProb.fh .bl b:last-child{color:var(--txt)}
html[data-ui="pro"] .tabs{background:var(--bg1)!important;border-bottom:1px solid var(--line2);border-radius:0;padding:0 8px!important;gap:0!important}
html[data-ui="pro"] .tb{border-radius:0!important;background:transparent!important;border:0!important;border-bottom:2px solid transparent!important;color:var(--mut)!important;font-weight:700!important}
html[data-ui="pro"] .tb.on{color:var(--txt)!important;border-bottom-color:var(--hot)!important}
html[data-ui="pro"] .ovaHero{border-radius:12px;border:1px solid var(--line2);background:var(--bg1)!important}
html[data-ui="pro"] .ovaHero .pc,html[data-ui="pro"] .kpi b{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-weight:800;letter-spacing:-.03em}
html[data-ui="pro"] .kpi div,html[data-ui="pro"] .tarj div,html[data-ui="pro"] .cmpg div{border-radius:10px!important;background:var(--bg1)!important;border:1px solid var(--line2)}
html[data-ui="pro"] .kpi span,html[data-ui="pro"] .kpi small{text-transform:uppercase;letter-spacing:.08em;font-weight:600}
html[data-ui="pro"] .pick{border-radius:10px;border-left-width:4px;background:var(--bg1)}
html[data-ui="pro"] .cal,html[data-ui="pro"] .row,html[data-ui="pro"] .cuotasbox,html[data-ui="pro"] .observ,html[data-ui="pro"] .calc,html[data-ui="pro"] .pk,html[data-ui="pro"] .linea{border-radius:10px}
html[data-ui="pro"] .bar{height:28px;border-radius:6px}
html[data-ui="pro"] .fila,html[data-ui="pro"] .fila-rank{border-radius:10px;border:1px solid var(--line2)!important;background:var(--bg1)!important;margin:6px 0}
html[data-ui="pro"] .fila .pct,html[data-ui="pro"] .fila-rank .pct{font:800 18px ui-monospace,"SF Mono",Menlo,monospace}
html[data-ui="pro"] h3{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--mut);border-bottom:1px solid var(--line2);padding-bottom:6px}
html[data-ui="pro"] input[type=text],html[data-ui="pro"] input[type=number],html[data-ui="pro"] select{border-radius:8px}
html[data-ui="pro"] button.ghost{border-radius:8px}
html[data-ui="pro"] .vacio{border-radius:12px;border:1px dashed var(--line2);background:var(--bg1)}
html[data-ui="pro"] .ajustes{border-radius:12px;border:1px solid var(--line2);background:var(--bg1)}
html[data-ui="pro"] .dsCard,html[data-ui="pro"] .dsAv{border-radius:12px}

/* =========================================================== BOLETO (cada juego es un ticket) =========================================================== */
html[data-ui="boleto"]{--bzBg1:#F6F7F9;--bzBg2:#E9ECF1;--bzBg3:#DDE2EA;--bzLine:#E2E5EC;--bzLine2:#CBD1DC;--bzTxt:#10131C;--bzMut:#414B5E;--bzMut2:#566079;--bzInk:#10131C;--bzOnInk:#FFFFFF;--bzHi:#FFD84A;--bzHiTx:#10131C;--bzHiSoft:#FFF1B3;--bzGood:#0B7F57;--bzBad:#C3302B;--bzStamp:#D9381E;--bzIn:#FFFFFF;--bzOk:#DDF2E6;--bzNo:#F7DEDB;--bzSh:rgba(0,0,0,.45)}
html[data-ui="boletonoche"]{--bzBg1:#161C2A;--bzBg2:#202838;--bzBg3:#2B3548;--bzLine:#283044;--bzLine2:#394560;--bzTxt:#F2F5FA;--bzMut:#BBC6DA;--bzMut2:#9AA7BF;--bzInk:#F2F5FA;--bzOnInk:#10131C;--bzHi:#FF6B4A;--bzHiTx:#1B0A05;--bzHiSoft:#3B2019;--bzGood:#3DDC97;--bzBad:#FF7A59;--bzStamp:#FF7A59;--bzIn:#0E1320;--bzOk:#16301F;--bzNo:#3A1D1D;--bzSh:rgba(0,0,0,.6)}
html[data-ui^="boleto"]{--bzCond:"Avenir Next Condensed","DIN Condensed","Roboto Condensed","Arial Narrow",system-ui,sans-serif;--cond:"Avenir Next Condensed","DIN Condensed","Roboto Condensed","Arial Narrow",system-ui,sans-serif}
html[data-ui^="boleto"] body{background-image:none;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
html[data-ui^="boleto"] .topbar,html[data-ui^="boleto"] header{background:var(--bg)!important;border-bottom:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html[data-ui^="boleto"] .brand,html[data-ui^="boleto"] header h1{font:800 30px/1 var(--bzCond)!important;letter-spacing:.05em;color:var(--txt)}
html[data-ui^="boleto"] .ver{border-radius:5px;border:1.5px solid var(--mut2);background:transparent;color:var(--mut);font:700 11px var(--body,system-ui);padding:2px 6px}
html[data-ui^="boleto"] :is(header,.topbar) button:not(.ovaHome){background:transparent!important;border:1.5px solid var(--line2)!important;color:var(--txt)!important;border-radius:10px!important;box-shadow:none!important}
html[data-ui^="boleto"] header h1{font-size:20px!important;letter-spacing:.04em!important}
html[data-ui^="boleto"] .ovaHome{background:transparent;border:1.5px solid var(--line2)}
/* barra de abajo: solo el botón activo enseña su nombre */
html[data-ui^="boleto"] .navbar,html[data-ui^="boleto"] .tabbar{left:14px!important;right:14px!important;width:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)!important;display:flex!important;gap:4px!important;padding:6px!important;border-radius:22px!important;background:#10131C!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 20px 34px -12px rgba(0,0,0,.85)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html[data-ui^="boleto"] .navbar button,html[data-ui^="boleto"] .tabbar .tbar-btn{position:relative;flex:1 1 0!important;min-width:0;height:46px;display:flex;flex-direction:row!important;align-items:center;justify-content:center;gap:7px;padding:0 6px!important;border-radius:16px!important;background:transparent!important;color:#A3ACBE!important;transition:flex-grow .28s cubic-bezier(.3,.8,.3,1),background .2s}
html[data-ui^="boleto"] .navbar button.on,html[data-ui^="boleto"] .tabbar .tbar-btn.on{flex:2.5 1 0!important;background:var(--bzHi)!important;color:var(--bzHiTx)!important}
html[data-ui^="boleto"] .navbar button:not(.on) span,html[data-ui^="boleto"] .tabbar .tbar-btn:not(.on) .lb{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
html[data-ui^="boleto"] .navbar button.on span,html[data-ui^="boleto"] .tabbar .tbar-btn.on .lb{font:800 13px/1 var(--body,system-ui)!important;white-space:nowrap;letter-spacing:0}
html[data-ui^="boleto"] .navbar button.on svg,html[data-ui^="boleto"] .tabbar .tbar-btn.on svg{color:var(--bzHiTx);filter:none}
/* fecha y días */
html[data-ui^="boleto"] .cargafila input[type=date]{border-radius:10px;background:var(--bzBg1);color:var(--bzTxt);border:0}
html[data-ui="boleto"] .cargafila input[type=date]{color-scheme:light}
html[data-ui="boletonoche"] .cargafila input[type=date]{color-scheme:dark}
html[data-ui^="boleto"] .diaBtn{border-radius:9px;background:transparent;border:1.5px solid var(--line2);color:var(--mut);font-weight:700}
html[data-ui^="boleto"] .diaBtn.on{background:var(--bzHi);border-color:var(--bzHi);color:var(--bzHiTx)}
/* botones de página: el principal en amarillo, los secundarios con borde */
html[data-ui^="boleto"] button:not(.tbar-btn):not(.tb):not(.diaBtn):not(.teq):not(.ovaSk):not(.ovaHome):not(.fab):not(.ghost):not(.navbar button):not(.game button):not(.ajustes button):not(.dsAv button):not(.dsSeg button):not(header button):not(.topbar button){background:var(--bzHi)!important;color:var(--bzHiTx)!important;border:0!important;border-radius:12px!important;font-weight:800;box-shadow:none!important}
html[data-ui^="boleto"] button.ghost:not(.game button):not(.ajustes button){background:transparent!important;color:var(--txt)!important;border:1.5px solid rgba(255,255,255,.3)!important;font-weight:700}
html[data-ui^="boleto"] .cargafila #cargar{background:transparent!important;color:var(--txt)!important;border:1.5px solid rgba(255,255,255,.3)!important;border-radius:12px!important}
/* ---- superficies de papel: el ticket y todo lo que vive dentro de él ---- */
html[data-ui^="boleto"] :is(.game,.fila,.fila-rank,.pk,.vacio,.ajustes,.dsCard,.dsAv,.cuotasbox,.observ,.calc,.ovaCombo .row,.ovaCombo .leg,.ovaCombo .res,.ova-d-card){--bg1:var(--bzBg1);--bg2:var(--bzBg2);--bg3:var(--bzBg3);--line:var(--bzLine);--line2:var(--bzLine2);--txt:var(--bzTxt);--mut:var(--bzMut);--mut2:var(--bzMut2);--acc:var(--bzInk);--acc2:var(--bzMut);--accTx:var(--bzOnInk);--hot:var(--bzHi);--hotTx:var(--bzHiTx);--good:var(--bzGood);--bad:var(--bzBad);--info:var(--bzTxt);--ia:var(--bzMut);color:var(--txt);color-scheme:light}
html[data-ui="boletonoche"] :is(.game,.fila,.fila-rank,.pk,.vacio,.ajustes,.dsCard,.dsAv,.cuotasbox,.observ,.calc,.ovaCombo .row,.ovaCombo .leg,.ovaCombo .res,.ova-d-card){color-scheme:dark}
html[data-ui^="boleto"] :is(.fila,.fila-rank,.pk,.vacio,.ajustes,.dsCard,.dsAv,.cuotasbox,.observ,.calc,.ovaCombo .row,.ovaCombo .leg,.ovaCombo .res,.ova-d-card){background:var(--bg1)!important;border:0!important;border-radius:14px;box-shadow:0 10px 18px -12px rgba(0,0,0,.6)}
html[data-ui^="boleto"] :is(.fila,.fila-rank,.pk){margin:10px 0!important}
html[data-ui^="boleto"] :is(.fila,.fila-rank) .pct{color:var(--txt)!important;font-weight:800}
html[data-ui^="boleto"] .ova-d-card{padding:12px 14px}
html[data-ui^="boleto"] .ova-d-teams{color:var(--txt);font-weight:800;font-size:15px}
html[data-ui^="boleto"] .ova-d-time{color:var(--mut);font:800 16px var(--bzCond);margin-top:4px}
/* ---- el ticket ---- */
html[data-ui^="boleto"] .game{background:transparent!important;border:0!important;border-radius:16px;margin:16px 0;overflow:hidden;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:drop-shadow(0 12px 12px var(--bzSh)) drop-shadow(0 0 .6px rgba(255,255,255,.22));animation-name:none!important;opacity:1}
html[data-ui^="boleto"] .game.dsPC{opacity:.86}
html[data-ui^="boleto"] .game::before,html[data-ui^="boleto"] .game::after{display:none!important}
html[data-ui^="boleto"] .game .head{display:block!important;position:static!important;padding:0!important;background:var(--bg1)!important;color:var(--txt)!important;border:0!important;border-radius:16px 16px 0 0;box-shadow:none!important;cursor:pointer}
html[data-ui^="boleto"] .game.bzOn .head{-webkit-mask:radial-gradient(circle 10px at 0 calc(100% - 46px),#0000 96%,#000) left/51% 100% no-repeat,radial-gradient(circle 10px at 100% calc(100% - 46px),#0000 96%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle 10px at 0 calc(100% - 46px),#0000 96%,#000) left/51% 100% no-repeat,radial-gradient(circle 10px at 100% calc(100% - 46px),#0000 96%,#000) right/51% 100% no-repeat}
html[data-ui^="boleto"] .game.open:not(.bzOn) .head{border-radius:16px 16px 0 0}
html[data-ui^="boleto"] .game.bzOn .head>:not(.bzT):not(.bug){display:none!important}
html[data-ui^="boleto"] .game.bzOn .head .bug{margin:0;padding:0 16px 10px}
html[data-ui^="boleto"] .game.bzOn .head .bug:empty{display:none}
html[data-ui^="boleto"] .game .bzT{display:block}
html[data-ui^="boleto"] .bzTop{display:flex;align-items:center;gap:10px;padding:13px 16px 0}
html[data-ui^="boleto"] .bzHora{flex:0 0 auto;background:var(--bzInk);color:var(--bzOnInk);border-radius:6px;padding:4px 8px;font:800 14px/1 var(--bzCond);letter-spacing:.04em}
html[data-ui^="boleto"] .bzHora.vivo{background:var(--bzStamp);color:#fff}
html[data-ui^="boleto"] .bzInfo{flex:1 1 auto;min-width:0;font:600 12.5px/1.3 var(--body,system-ui);color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html[data-ui^="boleto"] .bzConf{flex:0 0 auto;font:700 12px/1 var(--body,system-ui);color:var(--mut);display:inline-flex;align-items:center;gap:5px}
html[data-ui^="boleto"] .bzConf::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--good)}
html[data-ui^="boleto"] .bzConf.media::before{background:#D69A00}
html[data-ui^="boleto"] .bzConf.baja::before{background:var(--bad)}
html[data-ui^="boleto"] .bzTop::after{content:"";flex:0 0 auto;width:8px;height:8px;border-right:2px solid var(--mut);border-bottom:2px solid var(--mut);transform:rotate(45deg) translateY(-2px);transition:transform .2s}
html[data-ui^="boleto"] .game.open .bzTop::after{transform:rotate(-135deg) translateY(-2px)}
html[data-ui^="boleto"] .bzVs{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:end;gap:6px;padding:12px 16px 10px}
html[data-ui^="boleto"] .bzSide{display:flex;flex-direction:column;gap:5px;min-width:0}
html[data-ui^="boleto"] .bzSide.h{align-items:flex-end;text-align:right}
html[data-ui^="boleto"] .bzSide.a{align-items:flex-start;text-align:left}
html[data-ui^="boleto"] .bzEsc{width:34px;height:34px;object-fit:contain;display:block}
html[data-ui^="boleto"] .bzNom{max-width:100%;font:700 14px/1.15 var(--body,system-ui);color:var(--txt);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
html[data-ui^="boleto"] .bzPc{display:inline-block;font:800 60px/.92 var(--bzCond);letter-spacing:-.02em;color:var(--mut2);font-variant-numeric:tabular-nums;padding:0 2px}
html[data-ui^="boleto"] .bzPc sup{font-size:20px;vertical-align:top;letter-spacing:0;margin-left:2px}
html[data-ui^="boleto"] .bzSide.w .bzPc{color:var(--txt);background:linear-gradient(transparent 68%,var(--bzHi) 68% 94%,transparent 94%)}
html[data-ui^="boleto"] .bzSin .bzVs{align-items:start;padding:14px 16px 16px}
html[data-ui^="boleto"] .bzSin .bzNom{font-size:17px}
html[data-ui^="boleto"] .bzSin .bzEsc{width:40px;height:40px}
html[data-ui^="boleto"] .bzSin .bzMid{align-self:center;padding-top:20px}
html[data-ui^="boleto"] .bzMid{align-self:center;padding-bottom:6px;font:700 13px var(--body,system-ui);color:var(--mut2)}
html[data-ui^="boleto"] .bzBar{display:flex;gap:3px;height:8px;margin:0 16px 14px}
html[data-ui^="boleto"] .bzBar i{display:block;border-radius:99px;background:var(--line2);min-width:8px}
html[data-ui^="boleto"] .bzBar i.w{background:var(--bzInk)}
html[data-ui^="boleto"] .bzStub{box-sizing:border-box;height:46px;display:flex;align-items:center;gap:16px;padding:0 16px;border-top:2px dashed var(--line2)}
html[data-ui^="boleto"] .bzC{display:flex;flex-direction:column;gap:2px;line-height:1}
html[data-ui^="boleto"] .bzC small{font:600 12px/1 var(--body,system-ui);color:var(--mut)}
html[data-ui^="boleto"] .bzC b{font:800 20px/1 var(--bzCond);color:var(--txt);letter-spacing:.01em}
html[data-ui^="boleto"] .bzSello{margin-left:auto;max-width:56%;transform:rotate(-3deg);border:2px solid currentColor;border-radius:6px;padding:4px 9px;font:800 14px/1.05 var(--bzCond);letter-spacing:.06em;text-transform:uppercase;color:var(--bad);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html[data-ui^="boleto"] .bzSello.gris{color:var(--mut)}
html[data-ui^="boleto"] .bzSello.si{color:var(--good)}
/* ---- lo de adentro ---- */
html[data-ui^="boleto"] .game .body{background:var(--bg1)!important;color:var(--txt)!important;padding:4px 16px 18px!important;border:0!important;border-radius:0 0 16px 16px}
html[data-ui^="boleto"] .game .body::before,html[data-ui^="boleto"] .game .body::after,html[data-ui^="boleto"] .game .body .wm{display:none!important}
html[data-ui^="boleto"] .game .tabs{display:flex!important;gap:2px!important;padding:3px!important;margin:4px 0 14px!important;background:var(--bg2)!important;border:0!important;border-radius:12px!important;overflow-x:auto;position:static!important;-webkit-overflow-scrolling:touch}
html[data-ui^="boleto"] .game .tb{flex:1 0 auto;display:flex;align-items:center;justify-content:center;padding:9px 10px!important;border-radius:9px!important;background:transparent!important;border:0!important;color:var(--mut)!important;font:700 13px/1 var(--body,system-ui)!important;white-space:nowrap;box-shadow:none!important}
html[data-ui^="boleto"] .game .tb svg{display:none}
html[data-ui^="boleto"] .game .tb.on{background:var(--bzInk)!important;color:var(--bzOnInk)!important}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero){background:transparent!important;border:0!important;padding:0!important;margin:0 0 10px!important;box-shadow:none!important;border-radius:0}
html[data-ui^="boleto"] .game .hero{display:block!important}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .cx>*{display:inline!important}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) :is(.row3,.side,.gz svg,.gz>svg){display:none!important}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .mid,html[data-ui^="boleto"] .game .ovaHero .gz{display:block;width:auto}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .cx{position:static;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;transform:none;text-align:left}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .cx small{font-size:12px;color:var(--mut)}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .cx b{font:800 22px/1 var(--bzCond);color:var(--txt)}
html[data-ui^="boleto"] .game :is(.ovaHero,.hero) .cap{margin:0;padding:10px 12px;background:var(--bg2);border-radius:10px;font-size:14px;color:var(--txt);text-align:left}
html[data-ui^="boleto"] .game .hero .mid{margin:0}
html[data-ui^="boleto"] .game :is(.bar,.hero+.bar){display:none!important}
html[data-ui^="boleto"] .game .pick{background:var(--bzHiSoft)!important;border:2px solid var(--bzInk)!important;border-left-width:2px!important;border-radius:12px;padding:12px 14px;color:var(--txt);transform:rotate(-.5deg);box-shadow:3px 3px 0 var(--bzInk)}
html[data-ui^="boleto"] .game .pick.no{background:var(--bg2)!important;border-style:dashed!important;box-shadow:none}
html[data-ui^="boleto"] .game .pick .q,html[data-ui^="boleto"] .game .pick>b:first-child{display:block;font:800 24px/1.05 var(--bzCond);letter-spacing:.01em;color:var(--txt)}
html[data-ui^="boleto"] .game .pick .r{margin-top:6px;font-size:14px;line-height:1.45;color:var(--txt)}
html[data-ui^="boleto"] .game .cal{display:flex;align-items:center;gap:12px;padding:10px 0;margin:10px 0 0;background:transparent!important;border:0!important;border-top:1px dotted var(--line2)!important;border-radius:0}
html[data-ui^="boleto"] .game .cal .n{flex:0 0 auto;min-width:46px;text-align:center;font:800 32px/1 var(--bzCond);color:var(--txt)}
html[data-ui^="boleto"] .game .cal .t{font-size:13px;color:var(--mut)}
html[data-ui^="boleto"] .game .cal .t b{display:block;font-size:14px;color:var(--txt)}
html[data-ui^="boleto"] .game .kpi{display:flex!important;gap:0!important;margin:12px 0;border-top:2px solid var(--bzInk);border-bottom:1px dotted var(--line2)}
html[data-ui^="boleto"] .game .kpi>div{flex:1 1 0;min-width:0;background:transparent!important;border:0!important;border-left:1px dotted var(--line2)!important;border-radius:0!important;box-shadow:none!important;padding:10px 8px!important;text-align:left}
html[data-ui^="boleto"] .game .kpi>div:first-child{border-left:0!important;padding-left:0!important}
html[data-ui^="boleto"] .game .kpi b{display:block;font:800 26px/1 var(--bzCond)!important;color:var(--txt)!important;letter-spacing:0}
html[data-ui^="boleto"] .game .kpi :is(span,small){display:block;margin-top:5px;font-size:12px;line-height:1.2;color:var(--mut);text-transform:none;letter-spacing:0}
html[data-ui^="boleto"] .game table{width:100%;border-collapse:collapse;background:transparent}
html[data-ui^="boleto"] .game :is(th,td){background:transparent!important;border:0!important;border-bottom:1px dotted var(--line2)!important;padding:8px 4px!important;color:var(--txt)}
html[data-ui^="boleto"] .game th{font:700 12px/1.2 var(--body,system-ui)!important;color:var(--mut)!important;text-align:right;border-bottom:2px solid var(--bzInk)!important}
html[data-ui^="boleto"] .game th:first-child{text-align:left}
html[data-ui^="boleto"] .game td.n{font:800 17px/1 var(--bzCond);text-align:right}
html[data-ui^="boleto"] .game tr.usa td{background:var(--bzHiSoft)!important;color:var(--txt)!important;font-weight:800}
html[data-ui^="boleto"] .game .par.pv{background:var(--bzOk)!important;border-radius:10px}
html[data-ui^="boleto"] .game .par.pr{background:var(--bzNo)!important;border-radius:10px}
html[data-ui^="boleto"] .game .srv-compara [style*="f1f5fb" i]{color:var(--txt)!important}
html[data-ui^="boleto"] .game .srv-compara [style*="9db2c8" i]{color:var(--mut)!important}
html[data-ui^="boleto"] .game h3{display:flex;align-items:center;gap:8px;margin:18px 0 8px;padding:0 0 6px;font:800 15px/1.2 var(--body,system-ui);color:var(--txt);text-transform:none;letter-spacing:0;border-bottom:2px solid var(--bzInk)}
html[data-ui^="boleto"] .game h3 svg{width:18px;height:18px;flex:0 0 auto;color:var(--txt)}
html[data-ui^="boleto"] .game .medido{margin-left:auto;font:700 12px/1 var(--body,system-ui);padding:3px 7px;border-radius:99px;border:1.5px solid currentColor;background:transparent;color:var(--mut)}
html[data-ui^="boleto"] .game .medido.ok{color:var(--good)}
html[data-ui^="boleto"] .game .medido.flojo{color:#9A6B00}
html[data-ui^="boleto"] .game :is(.flag,.aviso,.nota,.leyenda,.status,.srv-compara){background:transparent!important;border:0!important;border-left:3px solid var(--line2)!important;border-radius:0!important;padding:4px 0 4px 10px!important;margin:8px 0;color:var(--mut)!important;font-size:13px;line-height:1.45}
html[data-ui^="boleto"] .game :is(.flag,.aviso,.nota,.leyenda,.srv-compara) b{color:var(--txt)}
/* nota cerrada: la regla de arriba (font-size:13px y padding!important) le ganaba al font-size:0 y el texto se encimaba sobre la etiqueta */
/* cerrada vuelve a quedar solo la barrita; abierta deja espacio a la derecha para la i y la × */
html[data-ui^="boleto"] .game .leyenda:not(.abierta):not(.err){font-size:0!important;line-height:0!important;padding:0 38px 0 10px!important;height:38px;overflow:hidden}
html[data-ui^="boleto"] .game .leyenda:not(.abierta):not(.err):before{padding-left:10px;left:0}
html[data-ui^="boleto"] .game .leyenda.abierta,html[data-ui^="boleto"] .game .leyenda.err{padding-right:34px!important}
/* tabla de salidas del abridor: 7 columnas caben en el iPhone con numeros mas chicos */
html[data-ui^="boleto"] .game table.log td.n{font-size:15px}
html[data-ui^="boleto"] .game table.log th{font-size:11px!important}
html[data-ui^="boleto"] .game .cal .t b{font-family:var(--body,system-ui)}
html[data-ui^="boleto"] .game input{background:var(--bzIn)!important;color:var(--bzTxt)!important;border:1.5px solid var(--line2)!important;border-radius:9px!important;font:700 17px/1 var(--body,system-ui)!important;font-variant-numeric:tabular-nums;padding:10px 8px}
html[data-ui^="boleto"] .game input:focus{outline:0;border-color:var(--bzInk)!important;box-shadow:0 0 0 3px var(--bzHi)}
html[data-ui^="boleto"] .game :is(.row,.cuotasbox,.fila){background:transparent!important;border:0!important;box-shadow:none!important}
html[data-ui^="boleto"] .game .row.hcrow{background:var(--bg2)!important;border-radius:12px!important;padding:10px!important}
html[data-ui^="boleto"] .game :is(.btnAncho,.row button,button.ghost,.teq){background:var(--bzInk)!important;color:var(--bzOnInk)!important;border:0!important;border-radius:10px!important;font-weight:800;box-shadow:none!important}
html[data-ui^="boleto"] .game .teq:not(.on){background:var(--bg3)!important;color:var(--txt)!important}
html[data-ui^="boleto"] .game .out{color:var(--txt)}
html[data-ui^="boleto"] .dsItem{background:var(--bg2)!important;color:var(--txt)!important;border:0!important;border-radius:12px!important}
html[data-ui^="boleto"] .dsSeg{background:transparent;border:1.5px solid var(--line2);border-radius:12px;padding:3px}
html[data-ui^="boleto"] .dsSeg button{border-radius:9px;background:transparent!important;color:var(--mut)!important;font-weight:700;border:0!important}
html[data-ui^="boleto"] .dsSeg button.on{background:var(--bzHi)!important;color:var(--bzHiTx)!important}
html[data-ui^="boleto"] .game :is(.receta,.cabp,.cmpg>div){background:var(--bg2)!important;border-radius:12px!important;border:0!important}
html[data-ui^="boleto"] .game .cabp .nm b{color:var(--txt)}
/* ---------- seccion dentro de Apariencia ---------- */
.uiSec{margin:12px 0 6px}
.uiSec .uiTit{font:700 12px system-ui,-apple-system,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0 2px 8px}
.uiSec .uiRow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.uiSec .ovaSk .pv{height:50px}
.uiSec .ovaSk .tx{padding:7px 6px 8px;text-align:center}
.uiSec .ovaSk .tx b{font-size:12.5px}
.uiSec .uiTit.col{margin-top:16px}
.uiSec .uiTile.on{border-color:var(--hot,#FBBF24)!important;box-shadow:0 0 0 3px rgba(255,255,255,.1)}
/* ---------- hoja para elegir ---------- */
#uiSheet{position:fixed;inset:0;z-index:100001;display:none;align-items:flex-end;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
#uiSheet.on{display:flex}
#uiSheet .box{width:100%;max-width:520px;margin:0 auto;background:#0f141e;color:#F1F5FB;border-top:1px solid rgba(255,255,255,.18);border-radius:22px 22px 0 0;padding:16px 14px calc(20px + env(safe-area-inset-bottom));font-family:-apple-system,system-ui,sans-serif;animation:uiRise .35s cubic-bezier(.22,.7,.3,1)}
#uiSheet h2{margin:2px 0 3px;font-size:18px;font-weight:700}
#uiSheet p{margin:0 0 12px;font-size:12px;color:#9DB2C8}
#uiSheet .tiles{display:grid;grid-template-columns:1fr;gap:10px}
#uiSheet .tile{display:flex;align-items:center;gap:12px;padding:0;text-align:left;background:rgba(255,255,255,.04);color:inherit;border:2px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;cursor:pointer;font-family:inherit}
#uiSheet .tile.on{border-color:#FBBF24;box-shadow:0 0 0 3px rgba(251,191,36,.16)}
#uiSheet .tile .sw{flex:0 0 96px;align-self:stretch;min-height:64px}
#uiSheet .tile .tx{padding:10px 8px}
#uiSheet .tile b{display:block;font-size:15px}
#uiSheet .tile .tx>span{display:block;font-size:12px;color:#9DB2C8;margin-top:2px}
@media (prefers-reduced-motion:reduce){html[data-ui] *,html[data-ui] *::before,html[data-ui] *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important}}
`;

/* ===================================================================== v2: legibilidad + diseños Prensa y Radar */
function dis(id,rules){ var p='html[data-ui="'+id+'"][data-ui]'; return rules.map(function(r){ return r.split('&').join(p); }).join('\n'); }
var SERIF='Georgia,"Iowan Old Style","Palatino Linotype",Palatino,"Times New Roman",serif';
var MONO='ui-monospace,"SF Mono",Menlo,Consolas,monospace';
var LEGIBLE=[
 '/* legibilidad: el % del que pierde, las notas y los números "sin medir" ya no se apagan */',
 'html[data-ui^="boleto"] .bzPc{color:var(--mut)}',
 'html[data-ui^="boleto"] .bzMid{color:var(--mut)}',
 'html[data-ui^="boleto"] .game .nota{color:var(--mut)!important}',
 'html[data-ui] .kpi div.sinmed{opacity:1!important;border-bottom:2px dashed var(--mut2)}',
 'html[data-ui] .kpi div.sinmed b{color:var(--mut)}',
 '#uiSheet .box{max-height:86vh;overflow-y:auto;-webkit-overflow-scrolling:touch}'
].join('\n');

/* ---------- PRENSA: página de deportes de periódico (papel crema, tinta, serif, filetes) ---------- */
var PRENSA=dis('prensa',[
 '&{--bg:#F3EEE1;--bg1:#FBF8EF;--bg2:#ECE6D6;--bg3:#DFD7C2;--line:#D6CDB5;--line2:#8E8468;--txt:#17140E;--mut:#3F392B;--mut2:#5A523C;--acc:#17140E;--acc2:#3F392B;--accTx:#F3EEE1;--hot:#A61E16;--hotTx:#FFFFFF;--good:#0A6B3B;--bad:#A61E16;--info:#17140E;--ia:#3F392B;--r:2px;--r2:3px;--body:'+SERIF+';--cond:'+SERIF+';color-scheme:light}',
 '& body{background:var(--bg)!important;background-image:none!important;color:var(--txt)!important;font-family:'+SERIF+';padding-bottom:calc(env(safe-area-inset-bottom,0px) + 84px)!important}',
 '& :is(button,input,select,textarea){font-family:inherit}',
 '&,& body{background:var(--bg)!important;background-image:none!important}',
 '& body::before,& body::after{display:none!important}',
 '& :is(.topbar,header){background:var(--bg)!important;border-bottom:3px double var(--txt)!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
 '& :is(.brand,header h1){font:900 20px/1 '+SERIF+'!important;letter-spacing:.01em;text-transform:uppercase;color:var(--txt)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important}',
 '& .ver{border:1px solid var(--line2);border-radius:2px;background:transparent;color:var(--mut);font:700 10px '+SERIF+';padding:1px 4px}',
 '& :is(header,.topbar) :is(button,select,.ovaHome):not(.ovaHome),& .ovaHome,& select#ligaSel{background:var(--bg1)!important;border:1.5px solid var(--txt)!important;color:var(--txt)!important;border-radius:2px!important;box-shadow:none!important}',
 '& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;background:var(--bg)!important;border:0!important;border-top:3px double var(--txt)!important;border-radius:0!important;box-shadow:none!important;padding:3px 0 calc(env(safe-area-inset-bottom,0px) + 2px)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
 '& :is(.navbar button,.tabbar .tbar-btn){position:relative;flex:1 1 0!important;min-width:0!important;background:transparent!important;color:var(--mut)!important;border-radius:0!important;box-shadow:none!important}',
 '& :is(.navbar button span,.tabbar .lb){font:800 10.5px/1.1 '+SERIF+'!important;letter-spacing:.08em;text-transform:uppercase}',
 '& :is(.navbar button.on,.tabbar .tbar-btn.on){color:var(--txt)!important;box-shadow:inset 0 3px 0 var(--hot)!important;background:var(--bg2)!important}',
 '& .diaHead{font:800 12px '+SERIF+';letter-spacing:.16em;text-transform:uppercase;color:var(--txt);border-bottom:1px solid var(--txt);padding-bottom:5px}',
 '& .diaBtn{border-radius:2px;background:transparent;border:1.5px solid var(--txt);color:var(--txt);font-weight:800}',
 '& .diaBtn.on{background:var(--txt);color:var(--bg)}',
 '& .estado{color:var(--mut)}',
 '& .estado.bad{color:var(--bad)}',
 '& .game{background:var(--bg1)!important;border:1px solid var(--line2)!important;border-top:4px double var(--txt)!important;border-radius:2px!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;margin:14px 0;position:relative;animation-name:none!important;opacity:1}',
 '& .game::before,& .game::after{display:none!important}',
 '& .game .head{background:transparent!important;color:var(--txt)!important;padding:12px 14px!important}',
 '& .game .eq span,& .game .match{font:800 17px/1.2 '+SERIF+';color:var(--txt)}',
 '& .game .match small{font:600 12.5px/1.3 '+SERIF+';color:var(--mut)}',
 '& .game :is(.hora,.clock){font:800 12px '+SERIF+';background:transparent!important;border:1px solid var(--txt)!important;color:var(--txt)!important;border-radius:2px;padding:3px 7px}',
 '& .game .clock.vivo{background:var(--hot)!important;border-color:var(--hot)!important;color:#fff!important}',
 '& .game .chev{color:var(--txt)}',
 '& .game .body{background:transparent!important;color:var(--txt)!important;border-top:1px solid var(--line2)!important;border-radius:0!important}',
 '& .game .tabs{background:transparent!important;border:0!important;border-bottom:2px solid var(--txt)!important;border-radius:0!important;padding:0!important;gap:0!important}',
 '& .game .tb{background:transparent!important;border:0!important;border-bottom:4px solid transparent!important;border-radius:0!important;margin-bottom:-2px;color:var(--mut)!important;font:800 12.5px '+SERIF+'!important;letter-spacing:.07em;text-transform:uppercase;padding:10px 9px!important;box-shadow:none!important}',
 '& .game .tb.on{color:var(--txt)!important;border-bottom-color:var(--hot)!important}',
 '& :is(.ovaHero,.hero){background:transparent!important;background-image:none!important;border:1px solid var(--line2)!important;border-radius:2px!important;box-shadow:none!important}',
 '& :is(.ovaHero,.hero) .pc{font-family:'+SERIF+';font-weight:900;color:var(--txt)}',
 '& .pick{background:var(--bg2)!important;border:1px solid var(--txt)!important;border-left:6px solid var(--good)!important;border-radius:2px!important;color:var(--txt)!important;box-shadow:none!important;transform:none}',
 '& .pick b{color:var(--txt)!important;font:900 20px/1.15 '+SERIF+'}',
 '& .pick.no{border-left-color:var(--line2)!important}',
 '& .pick.no b{color:var(--mut)!important}',
 '& .kpi div{background:var(--bg1)!important;border:1px solid var(--line2)!important;border-radius:2px!important;box-shadow:none}',
 '& .kpi b{font:900 22px '+SERIF+';color:var(--txt)}',
 '& .kpi :is(small,span){color:var(--mut)!important;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}',
 '& .kpi div.sinmed{border-style:dashed!important}',
 '& :is(.fila,.fila-rank,.pk,.vacio,.ajustes,.dsCard,.dsAv,.cuotasbox,.observ,.calc,.linea,.estadio,.h2h,.cal,.row){background:var(--bg1)!important;border:1px solid var(--line2)!important;border-radius:2px!important;box-shadow:none!important;color:var(--txt)}',
 '& :is(.fila,.fila-rank) .pct{font:900 20px '+SERIF+';color:var(--txt)!important}',
 '& h3{font:800 12px '+SERIF+';text-transform:uppercase;letter-spacing:.16em;color:var(--txt);border-bottom:1px solid var(--txt);padding-bottom:5px}',
 '& :is(.nota,.observ,.egol,.noticia){color:var(--mut)!important}',
 '& :is(.nota,.observ,.egol) b{color:var(--txt)}',
 '& .aviso{background:var(--bg2)!important;border:1px solid var(--line2)!important;color:var(--txt)!important;border-radius:2px}',
 '& .bar{border-radius:2px!important;border:1px solid var(--txt)}',
 '& :is(input,select,textarea){background:#FFFFFF!important;color:var(--txt)!important;border:1.5px solid var(--txt)!important;border-radius:2px!important}',
 '& :is(.btnAncho,button.ghost,#cargar):not(.sec){background:var(--txt)!important;color:var(--bg)!important;border:1.5px solid var(--txt)!important;border-radius:2px!important;font-weight:800;box-shadow:none!important}',
 '& .btnAncho.sec{background:transparent!important;color:var(--txt)!important;border:1.5px solid var(--txt)!important;border-radius:2px!important}',
 '& .btnChico{background:var(--bg1)!important;color:var(--txt)!important;border:1.5px solid var(--txt)!important;border-radius:2px!important;box-shadow:none!important}'
]);

/* ---------- RADAR: negro puro (OLED), cian y lima, marcos con esquinas, números en mono ---------- */
var ESQ='linear-gradient(var(--acc),var(--acc))';
var RADAR=dis('radar',[
 '&{--bg:#000000;--bg1:#07090D;--bg2:#0E1218;--bg3:#18202B;--line:#1D2530;--line2:#334155;--txt:#FFFFFF;--mut:#C7D0DD;--mut2:#9AA6B8;--acc:#22E4FF;--acc2:#7BEFFF;--accTx:#001318;--hot:#C8FF3D;--hotTx:#0B1400;--good:#36F5A0;--bad:#FF7A7A;--info:#7BEFFF;--ia:#C7D0DD;--r:6px;--r2:6px;--body:system-ui,-apple-system,sans-serif;--cond:system-ui,-apple-system,sans-serif;color-scheme:dark}',
 '&,& body{background:#000!important;background-image:none!important}',
 '& body::before,& body::after{display:none!important}',
 '& body{color:var(--txt)!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 100px)!important}',
 '& :is(.topbar,header){background:#000!important;border-bottom:1px solid var(--acc)!important;box-shadow:0 10px 26px -14px rgba(34,228,255,.65)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
 '& :is(.brand,header h1){font:800 18px/1 '+MONO+'!important;letter-spacing:.1em;text-transform:uppercase;color:var(--acc)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:0 0 14px rgba(34,228,255,.65)!important}',
 '& .ver{border:1px solid var(--acc);border-radius:3px;background:transparent;color:var(--acc2);font:700 10px '+MONO+';letter-spacing:0;padding:2px 4px}',
 '& :is(header,.topbar) :is(button,select):not(.ovaHome),& .ovaHome,& select#ligaSel{background:#000!important;border:1px solid var(--line2)!important;color:var(--txt)!important;border-radius:8px!important;box-shadow:none!important}',
 '& :is(.navbar,.tabbar){left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;width:auto!important;display:flex!important;gap:2px!important;padding:5px!important;border-radius:999px!important;background:#05070A!important;border:1px solid var(--line2)!important;box-shadow:0 0 0 1px rgba(34,228,255,.18),0 18px 30px -12px #000!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
 '& :is(.navbar button,.tabbar .tbar-btn){flex:1 1 0!important;min-width:0!important;border-radius:999px!important;background:transparent!important;color:var(--mut)!important;box-shadow:none!important;padding:7px 1px 6px!important}',
 '& :is(.navbar button span,.tabbar .lb){font:700 9px/1.1 '+MONO+'!important;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}',
 '& :is(.navbar button.on,.tabbar .tbar-btn.on){color:var(--acc)!important;background:rgba(34,228,255,.1)!important;box-shadow:inset 0 0 0 1px var(--acc),0 0 16px -4px var(--acc)!important}',
 '& .diaHead{font:700 12px '+MONO+';letter-spacing:.18em;text-transform:uppercase;color:var(--acc2);border-bottom:1px solid var(--line2)}',
 '& .diaBtn{border-radius:999px;background:transparent;border:1px solid var(--line2);color:var(--mut);font:700 12px '+MONO+'}',
 '& .diaBtn.on{background:var(--acc);border-color:var(--acc);color:var(--accTx)}',
 '& .estado{color:var(--mut)}',
 '& .estado.bad{color:var(--bad)}',
 '& .game{background:var(--bg1)!important;border:1px solid var(--line2)!important;border-radius:4px!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;margin:14px 0;position:relative;animation-name:none!important;opacity:1}',
 '& .game::before{content:"";display:block!important;position:absolute;inset:-1px;pointer-events:none;border-radius:4px;background:'+ESQ+' 0 0/16px 2px no-repeat,'+ESQ+' 0 0/2px 16px no-repeat,'+ESQ+' 100% 0/16px 2px no-repeat,'+ESQ+' 100% 0/2px 16px no-repeat,'+ESQ+' 0 100%/16px 2px no-repeat,'+ESQ+' 0 100%/2px 16px no-repeat,'+ESQ+' 100% 100%/16px 2px no-repeat,'+ESQ+' 100% 100%/2px 16px no-repeat;z-index:2}',
 '& .game::after{display:none!important}',
 '& .game.open{border-color:var(--acc)!important;box-shadow:0 0 28px -10px rgba(34,228,255,.6)!important}',
 '& .game .head{background:transparent!important;color:var(--txt)!important;padding:13px 14px!important}',
 '& .game .eq span,& .game .match{font:700 17px/1.2 var(--body);color:var(--txt)}',
 '& .game .match small{font:500 12px/1.3 '+MONO+';color:var(--mut)}',
 '& .game :is(.hora,.clock){font:700 12px '+MONO+';background:transparent!important;border:1px solid var(--acc)!important;color:var(--acc)!important;border-radius:3px;padding:3px 7px}',
 '& .game .clock.vivo{background:var(--bad)!important;border-color:var(--bad)!important;color:#000!important}',
 '& .game .chev{color:var(--acc)}',
 '& .game .body{background:transparent!important;color:var(--txt)!important;border-top:1px solid var(--line2)!important;border-radius:0!important}',
 '& .game .tabs{background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;gap:6px!important}',
 '& .game .tb{background:transparent!important;border:1px solid var(--line2)!important;border-radius:999px!important;color:var(--mut)!important;font:700 12px '+MONO+'!important;letter-spacing:.06em;text-transform:uppercase;padding:8px 11px!important;box-shadow:none!important}',
 '& .game .tb.on{border-color:var(--acc)!important;color:var(--acc)!important;background:rgba(34,228,255,.08)!important;box-shadow:0 0 14px -4px var(--acc)!important}',
 '& :is(.ovaHero,.hero){background:transparent!important;background-image:none!important;border:1px solid var(--line2)!important;border-radius:6px!important;box-shadow:none!important}',
 '& :is(.ovaHero,.hero) .pc{font-family:'+MONO+';font-weight:800;color:var(--txt);text-shadow:0 0 14px rgba(34,228,255,.45)}',
 '& .pick{background:rgba(200,255,61,.07)!important;border:1px solid var(--hot)!important;border-left:4px solid var(--hot)!important;border-radius:4px!important;color:var(--txt)!important;box-shadow:none!important;transform:none}',
 '& .pick b{color:var(--hot)!important;font:800 19px/1.15 var(--body);text-shadow:0 0 12px rgba(200,255,61,.35)}',
 '& .pick.no{background:var(--bg2)!important;border-color:var(--line2)!important}',
 '& .pick.no b{color:var(--mut)!important;text-shadow:none}',
 '& .kpi div{background:var(--bg2)!important;border:1px solid var(--line2)!important;border-radius:6px!important;box-shadow:none}',
 '& .kpi b{font:800 22px '+MONO+';color:var(--txt);text-shadow:0 0 12px rgba(34,228,255,.45)}',
 '& .kpi :is(small,span){color:var(--mut)!important;font:700 11px '+MONO+';text-transform:uppercase;letter-spacing:.05em}',
 '& .kpi div.sinmed{border-style:dashed!important}',
 '& :is(.fila,.fila-rank,.pk,.vacio,.ajustes,.dsCard,.dsAv,.cuotasbox,.observ,.calc,.linea,.estadio,.h2h,.cal,.row){background:var(--bg1)!important;border:1px solid var(--line2)!important;border-radius:6px!important;box-shadow:none!important;color:var(--txt)}',
 '& :is(.fila,.fila-rank) .pct{font:800 19px '+MONO+';color:var(--acc)!important}',
 '& h3{font:700 12px '+MONO+';text-transform:uppercase;letter-spacing:.08em;color:var(--acc2);border-bottom:1px solid var(--line2);padding-bottom:6px}',
 '& h3::before{content:"";display:inline-block;width:6px;height:6px;margin-right:8px;background:var(--hot);box-shadow:0 0 8px var(--hot);vertical-align:1px}',
 '& :is(.nota,.observ,.egol,.noticia){color:var(--mut)!important}',
 '& :is(.nota,.observ,.egol) b{color:var(--txt)}',
 '& .aviso{background:var(--bg2)!important;border:1px solid var(--line2)!important;color:var(--txt)!important;border-radius:6px}',
 '& .bar{border-radius:6px!important}',
 '& :is(input,select,textarea){background:#000!important;color:var(--txt)!important;border:1px solid var(--line2)!important;border-radius:6px!important}',
 '& :is(input,select,textarea):focus{outline:0;border-color:var(--acc)!important;box-shadow:0 0 0 3px rgba(34,228,255,.25)}',
 '& :is(.btnAncho,button.ghost,#cargar):not(.sec){background:var(--acc)!important;color:var(--accTx)!important;border:0!important;border-radius:8px!important;font-weight:800;text-transform:uppercase;letter-spacing:.05em;box-shadow:none!important}',
 '& .btnAncho.sec{background:transparent!important;color:var(--acc)!important;border:1px solid var(--acc)!important;border-radius:8px!important}',
 '& .btnChico{background:#000!important;color:var(--txt)!important;border:1px solid var(--line2)!important;border-radius:8px!important;box-shadow:none!important}'
]);
CSS+='\n'+LEGIBLE+'\n/* ---- diseño Prensa ---- */\n'+PRENSA+'\n/* ---- diseño Radar ---- */\n'+RADAR+'\n';

/* ===================================================================== iconos nuevos */
var IC={
 ball:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6c3.4 3 3.4 9.8 0 12.8M18.4 5.6c-3.4 3-3.4 9.8 0 12.8"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7"/>',
 layers:'<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5" opacity=".5"/>',
 mark:'<path d="M6 4h12v17l-6-4-6 4z"/><path d="M9.5 9h5"/>',
 sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
 bars:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
 chart:'<path d="M3 17l5-5 4 3 8-9"/><path d="M15 6h5v5"/>'
};
function claveIcono(txt){
  var t=String(txt||'').toLowerCase().replace(/[^a-záéíóúñ ]/g,'').trim();
  if(t==='juegos') return 'ball'; if(t==='al gane') return 'trophy'; if(t==='combo'||t==='combina') return 'layers';
  if(t==='mis picks'||t==='registro') return 'mark'; if(t==='ajustes') return 'sliders'; if(t==='ratings') return 'bars'; if(t==='backtest') return 'chart';
  return null;
}
function iconos(){
  var ui=html.getAttribute('data-ui');
  [].forEach.call(doc.querySelectorAll('.navbar button, .tabbar .tbar-btn'),function(b){
    var lab=b.querySelector('.lb')||b.querySelector('span:not(.ic)'), txt=lab?lab.textContent:'', k=claveIcono(txt);
    var host=b.querySelector('svg')||b.querySelector('.ic'); if(!host||!k) return;
    if(!ui){   /* clásico: devolver el original */
      var o=b.getAttribute('data-ui-orig'); if(o!==null&&b.querySelector('svg.ic2')){ var s=b.querySelector('svg.ic2'); var tmp=doc.createElement('div'); tmp.innerHTML=o; var nuevo=tmp.firstChild; if(nuevo&&s.parentNode) s.parentNode.replaceChild(nuevo,s); b.removeAttribute('data-ui-orig'); }
      return;
    }
    if(host.classList&&host.classList.contains('ic2')){ host.innerHTML=IC[k]; return; }
    if(b.getAttribute('data-ui-orig')===null) b.setAttribute('data-ui-orig',host.outerHTML);
    var svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('class','ic2'); svg.innerHTML=IC[k];
    host.parentNode.replaceChild(svg,host);
  });
}
/* colores de equipo de la MLB (para la franja de cada tarjeta) */
var COL={108:'#BA0021',109:'#A71930',110:'#DF4601',111:'#BD3039',112:'#0E3386',113:'#C6011F',114:'#E31937',115:'#33006F',116:'#FA4616',117:'#EB6E1F',118:'#004687',119:'#005A9C',120:'#AB0003',121:'#FF5910',133:'#00A38B',134:'#FDB827',135:'#FFC425',136:'#005C5C',137:'#FD5A1E',138:'#C41E3A',139:'#8FBCE6',140:'#C0111F',141:'#134A8E',142:'#D31145',143:'#E81828',144:'#CE1141',145:'#C4CED4',146:'#00A3E0',147:'#0C2340',158:'#FFC52F'};
function colorear(){
  [].forEach.call(doc.querySelectorAll('#slate .game'),function(g){
    if(g.__col||!g._eq) return; g.__col=1;
    var a=COL[g._eq.a&&g._eq.a.id], h=COL[g._eq.h&&g._eq.h.id];
    if(a) g.style.setProperty('--ta',a); if(h) g.style.setProperty('--th',h);
  });
}

/* ===================================================================== selector */
var ST={id:'clasico'};
function leer(){ try{ if(!root.localStorage.getItem('ova_ui_r6')){ root.localStorage.setItem('ova_ui_r6','1'); root.localStorage.setItem(KEY,'boleto'); } var v=root.localStorage.getItem(KEY); return BY[v]?v:'clasico'; }catch(e){ return 'clasico'; } }
function inyectar(){
  if(doc.getElementById('uiInteriorCss')) return;
  var s=doc.createElement('style'); s.id='uiInteriorCss'; s.textContent=CSS; (doc.head||html).appendChild(s);
}
function aplicar(id,opts){
  opts=opts||{}; if(!BY[id]) id='clasico'; ST.id=id; inyectar();
  if(opts.guardar!==false){ try{ root.localStorage.setItem(KEY,id); }catch(e){} }
  if(id==='clasico') html.removeAttribute('data-ui'); else html.setAttribute('data-ui',id);
  if(!opts.inicial){ iconos(); colorear(); marcar(); }
  return id;
}
function marcar(){ [].forEach.call(doc.querySelectorAll('.uiSec .uiTile'),function(b){ var on=b.getAttribute('data-ui-id')===ST.id; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); }); }
function seccion(){
  var s=doc.createElement('div'); s.className='uiSec'; var t='';
  UIS.forEach(function(u){ t+='<button type="button" class="ovaSk uiTile" data-ui-id="'+u.id+'" aria-pressed="false"><span class="pv" style="background:'+u.sw+'"></span><span class="tx"><b>'+u.n+'</b></span></button>'; });
  s.innerHTML='<div class="uiTit">Diseño de adentro</div><div class="uiRow">'+t+'</div><div class="uiTit col">Tema de color</div>';
  s.addEventListener('click',function(ev){
    var el=ev.target; while(el&&el!==s){ if(el.getAttribute&&el.getAttribute('data-ui-id')){ aplicar(el.getAttribute('data-ui-id'),{}); marcar(); return; } el=el.parentNode; }
  });
  return s;
}
function montar(){
  /* MLB: Ajustes → Apariencia.  Fútbol y NBA: la hoja del botón 🎨.  Se mete debajo del texto de arriba, antes de los temas de color. */
  var hosts=[].slice.call(doc.querySelectorAll('#pane-ajustes .ovaApar, .ovaSheet .card'));
  hosts.forEach(function(h){
    if(h.querySelector('.uiSec')) return;
    var p=h.querySelector('p'); h.insertBefore(seccion(),p?p.nextSibling:h.firstChild);
  });
  marcar();
}
function abrirHoja(){
  var h=doc.getElementById('uiSheet');
  if(!h){
    h=doc.createElement('div'); h.id='uiSheet'; var t='';
    UIS.forEach(function(u){ t+='<button type="button" class="tile" data-id="'+u.id+'"><span class="sw" style="background:'+u.sw+'"></span><span class="tx"><b>'+u.n+'</b><span>'+u.d+'</span></span></button>'; });
    h.innerHTML='<div class="box"><h2>Diseño de adentro</h2><p>Cambia la forma de las pantallas. Va aparte del tema de color.</p><div class="tiles">'+t+'</div></div>';
    h.addEventListener('click',function(ev){
      var el=ev.target,tile=null;
      while(el&&el!==h){ if(el.getAttribute&&el.getAttribute('data-id')){ tile=el; break; } el=el.parentNode; }
      if(tile){ aplicar(tile.getAttribute('data-id'),{}); h.classList.remove('on'); return; }
      if(ev.target===h) h.classList.remove('on');
    });
    doc.body.appendChild(h);
  }
  [].forEach.call(h.querySelectorAll('.tile'),function(b){ b.classList.toggle('on',b.getAttribute('data-id')===ST.id); });
  h.classList.add('on');
}
function pulsacion(el){
  if(!el||el.__ui) return; el.__ui=1;
  var t=null,x0=0,y0=0;
  function ini(e){ x0=e.clientX; y0=e.clientY; if(t) root.clearTimeout(t); t=root.setTimeout(function(){ t=null; abrirHoja(); },650); }
  function can(){ if(t){ root.clearTimeout(t); t=null; } }
  function mov(e){ if(t&&(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12)) can(); }
  el.addEventListener('pointerdown',ini); el.addEventListener('pointermove',mov); el.addEventListener('pointerup',can); el.addEventListener('pointercancel',can); el.addEventListener('pointerleave',can);
  el.addEventListener('contextmenu',function(e){ if(e.preventDefault) e.preventDefault(); });
}
function params(){ try{ var m=String(root.location.search||'').match(/[?&]ui=([^&]+)/); return m&&BY[decodeURIComponent(m[1])]?decodeURIComponent(m[1]):null; }catch(e){ return null; } }

function arrancar(){
  var url=params(), id=url||leer();
  aplicar(id,{inicial:true,guardar:!!url});     /* en <head>: marca el diseño antes de pintar (sin parpadeo) */
  function listo(){
    try{
      [].forEach.call(doc.querySelectorAll('.topbar .brand, header h1'),pulsacion);
      iconos(); colorear(); montar();
      [250,800,1800,3500,6000].forEach(function(ms){ root.setTimeout(function(){ iconos(); colorear(); montar(); },ms); });
      var slate=doc.getElementById('slate');
      if(slate&&root.MutationObserver) new root.MutationObserver(function(){ colorear(); }).observe(slate,{childList:true});
      var nav=doc.querySelector('.navbar, .tabbar');
      if(nav&&root.MutationObserver) new root.MutationObserver(function(){ iconos(); }).observe(nav,{childList:true});
    }catch(e){ try{ if(root.console) root.console.error('interior',e); }catch(x){} }
  }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={UIS:UIS,css:CSS,aplicar:aplicar,leer:leer,abrirHoja:abrirHoja,actual:function(){ return ST.id; },_icons:IC,_clave:claveIcono,_seccion:seccion};
root.OVAInterior=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
