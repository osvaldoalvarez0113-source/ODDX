/* OVA · diseño interior v1  (MLB, fútbol y NBA)
   Cambia la FORMA de las pantallas de adentro (tarjetas de partido, pestañas, barra de abajo, iconos,
   números y animaciones). Es aparte del tema de color: se combinan.
   Diseños:  Clásico (como estaba) · Cristal · Broadcast
   Cómo cambiar: mantén presionado el logo "OVA" de arriba unos 0.7 segundos.
   No toca ningún cálculo, ningún dato ni ningún botón de las apps. Solo CSS, iconos y un selector. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var KEY='ova_interior';
var UIS=[
 {id:'clasico',n:'Clásico',d:'Como lo tenías',sw:'linear-gradient(135deg,#0b121c,#1b2838)'},
 {id:'cristal',n:'Cristal',d:'Vidrio, dock flotante y versus',sw:'radial-gradient(circle at 25% 30%,#3b82f6aa,transparent 55%),radial-gradient(circle at 80% 70%,#a855f7aa,transparent 55%),#0a0f1d'},
 {id:'broadcast',n:'Broadcast',d:'Gráficos de TV deportiva',sw:'linear-gradient(115deg,#0a0f1d 0 60%,#FBBF24 60% 64%,#0a0f1d 64%)'}
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
html[data-ui="cristal"] .navbar button span,html[data-ui="cristal"] .tabbar .lb{font-size:10px!important;font-weight:700}
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
html[data-ui="broadcast"] .navbar button span,html[data-ui="broadcast"] .tabbar .lb{font-size:10px!important;font-weight:800}
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
html[data-ui="broadcast"] .tabs{background:transparent!important;gap:4px!important;padding:2px 2px 10px!important;border-bottom:3px solid var(--line2)}
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
function leer(){ try{ var v=root.localStorage.getItem(KEY); return BY[v]?v:'clasico'; }catch(e){ return 'clasico'; } }
function inyectar(){
  if(doc.getElementById('uiInteriorCss')) return;
  var s=doc.createElement('style'); s.id='uiInteriorCss'; s.textContent=CSS; (doc.head||html).appendChild(s);
}
function aplicar(id,opts){
  opts=opts||{}; if(!BY[id]) id='clasico'; ST.id=id; inyectar();
  if(opts.guardar!==false){ try{ root.localStorage.setItem(KEY,id); }catch(e){} }
  if(id==='clasico') html.removeAttribute('data-ui'); else html.setAttribute('data-ui',id);
  if(!opts.inicial){ iconos(); colorear(); }
  return id;
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
      iconos(); colorear();
      [250,800,1800,3500].forEach(function(ms){ root.setTimeout(function(){ iconos(); colorear(); },ms); });
      var slate=doc.getElementById('slate');
      if(slate&&root.MutationObserver) new root.MutationObserver(function(){ colorear(); }).observe(slate,{childList:true});
      var nav=doc.querySelector('.navbar, .tabbar');
      if(nav&&root.MutationObserver) new root.MutationObserver(function(){ iconos(); }).observe(nav,{childList:true});
    }catch(e){ try{ if(root.console) root.console.error('interior',e); }catch(x){} }
  }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={UIS:UIS,css:CSS,aplicar:aplicar,leer:leer,abrirHoja:abrirHoja,actual:function(){ return ST.id; },_icons:IC,_clave:claveIcono};
root.OVAInterior=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
