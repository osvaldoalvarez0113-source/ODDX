/* OVA · diseño interior v2: cinco diseños con estructura propia (Historias, Duelo, Bento, Agenda, Radar de valor).
   Se eligen en Ajustes → Apariencia → «Diseño de adentro» (la lista vive en interior.js; aquí está lo que cada uno pinta).
   Igual que Boleto: lee lo que la tarjeta ya muestra (equipos, hora, probabilidades, cuota justa, veredicto) con
   OVALeerJuego (diseno.js) y arma una cabecera nueva. No calcula nada, no borra nada: la cabecera original se
   oculta con CSS y vuelve al cambiar de diseño. Los números de adentro (pestañas, calculadora) son los de siempre. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var NEW=['historias','duelo','bento','agenda','radarvalor'];
var NS='http://www.w3.org/2000/svg';
var MONO='ui-monospace,"SF Mono",Menlo,Consolas,monospace';
var COND='"Avenir Next Condensed","Arial Narrow",Impact,"Helvetica Neue",sans-serif';
var ROUND='ui-rounded,"SF Pro Rounded","Avenir Next",system-ui,sans-serif';
function dis(id,css){ return css.split('&').join('html[data-ui="'+id+'"][data-ui]'); }

/* ---------- lo que comparten los cinco ---------- */
var BASE=`
@keyframes nxRise{from{opacity:0;transform:translateY(26px) scale(.97)}to{opacity:1;transform:none}}
@keyframes nxDrop{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:none}}
@keyframes nxRing{from{stroke-dasharray:0 263.9}}
@keyframes nxPop{0%{opacity:0;transform:scale(.4) rotate(-14deg)}70%{transform:scale(1.12) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}
@keyframes nxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes nxTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes nxGrow{from{transform:scaleX(0)}}
@keyframes nxPulse{0%{box-shadow:0 0 0 0 rgba(255,107,87,.65)}100%{box-shadow:0 0 0 12px rgba(255,107,87,0)}}
@keyframes nxVs{0%,100%{transform:translate(-50%,-50%) scale(1) rotate(-4deg)}50%{transform:translate(-50%,-50%) scale(1.12) rotate(-4deg)}}
@keyframes nxBub{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
@keyframes nxPing{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.8);opacity:0}}
@keyframes nxSweep{to{transform:rotate(360deg)}}
.nxT,.nxProg,.nxSum,.nxPlot,.nxAhora{display:none}
.nxT *{box-sizing:border-box}
.nxLogo{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;font-weight:800;color:#fff}
.nxLogo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:14%;box-sizing:border-box}
.nxLogo.im{background:#fff!important}
.nxRing{display:block;width:100%;height:100%;transform:rotate(-90deg)}
.nxR0,.nxR1{fill:none;stroke-width:10}
.nxR1{stroke-linecap:round;animation:nxRing 1.1s .15s cubic-bezier(.3,.8,.3,1) both}
.nxMT{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.nxSin .nxMT,.nxSin .nxBar,.nxSin .nxPcF,.nxSin .nxSello,.nxSin .nxC{display:none}
.nxVsb{display:none}
.nxBar{display:flex;gap:2px}
.nxBar i{display:block;min-width:2px;transition:flex .4s}
.nxSello{display:inline-block;font-weight:800;line-height:1.1;white-space:nowrap}
.nxC{line-height:1.1}
.nxC small{display:block}
.nxC b{display:block;font-variant-numeric:tabular-nums}
.nxEmpty{font-size:12.5px;opacity:.8}
`;

/* ===================================================================== 1 · HISTORIAS */
var HISTORIAS=dis('historias',`
&{--bg:#07091c;--bg1:#12153a;--bg2:#1a1e4d;--bg3:#252a63;--line:#2b3070;--line2:#3d4490;--txt:#FFFFFF;--mut:#C3C8F5;--mut2:#A4ABE6;--acc:#FFD84A;--acc2:#FF9D45;--accTx:#1A1033;--hot:#7CFFB2;--hotTx:#04210F;--good:#7CFFB2;--bad:#FF9A9A;--info:#A9BBFF;--ia:#C4A6FF;--r:20px;--r2:28px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#07091c!important}
&,& body{color:var(--txt)!important}
& body{background:radial-gradient(120% 46% at 50% -8%,#3b2a7a,transparent 62%) no-repeat fixed!important}
& body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 104px)!important}
& :is(.topbar,header){background:rgba(7,9,28,.72)!important;border-bottom:0!important;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
& :is(.brand,header h1){font:800 22px/1 ${ROUND}!important;letter-spacing:.14em;color:#fff!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;width:auto!important;border-radius:28px!important;padding:6px!important;gap:2px!important;background:rgba(255,255,255,.1)!important;border:1px solid rgba(255,255,255,.18)!important;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 20px 40px -16px rgba(0,0,0,.8)!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:rgba(255,255,255,.2)!important;color:#fff!important;border-radius:20px!important}
& #slate{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;align-items:flex-start;padding:2px 0 12px;scrollbar-width:none}
& #slate::-webkit-scrollbar{display:none}
& #slate>.game{flex:0 0 100%;min-width:0;scroll-snap-align:center;scroll-snap-stop:always;margin:0}
& #slate>.dsSepConf{display:none!important}
& .game{border-radius:30px!important;background:linear-gradient(180deg,#1c1f55,#0d1033)!important;border:1px solid rgba(255,255,255,.14)!important;overflow:hidden;box-shadow:0 26px 50px -28px var(--th,#5b4bd6)!important;animation:nxRise .55s cubic-bezier(.2,.9,.3,1) both}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:0 14px 12px}
& .nxT{display:flex;flex-direction:column;position:relative;min-height:336px;padding:14px;overflow:hidden}
& .nxT::before,& .nxT::after{content:"";position:absolute;top:-40px;width:300px;height:300px;border-radius:50%;opacity:.7;pointer-events:none}
& .nxT::before{left:-90px;background:radial-gradient(circle,var(--ta,#5b6cf0),transparent 66%)}
& .nxT::after{right:-90px;background:radial-gradient(circle,var(--th,#e0709a),transparent 66%)}
& .nxT>*{position:relative;z-index:1}
& .nxArt{display:block;position:absolute!important;left:0;right:0;bottom:0;height:96px;z-index:0!important;pointer-events:none;opacity:.8}
& .nxArt svg{width:100%;height:100%;display:block}
& .nxArt .tw{animation:nxTwinkle 2.4s ease-in-out infinite}
& .nxTop{display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700}
& .nxTop>span{padding:6px 11px;border-radius:99px;background:rgba(0,0,0,.38)}
& .nxTit{display:none}
& .nxHora.vivo{background:#C0392B!important}
& .nxVs{display:flex;align-items:center;justify-content:space-between;margin-top:18px}
& .nxSide{width:88px;text-align:center}
& .nxLogo{width:86px;height:86px;margin:0 auto;border:4px solid rgba(255,255,255,.92);font-size:26px;animation:nxFloat 3.6s ease-in-out infinite;box-shadow:0 16px 30px -10px var(--ta,#5b6cf0)}
& .nxSide.h .nxLogo{background:var(--th,#e0709a);animation-delay:.6s;box-shadow:0 16px 30px -10px var(--th,#e0709a)}
& .nxSide.a .nxLogo{background:var(--ta,#5b6cf0)}
& .nxAb{display:none}
& .nxNom{display:block;margin-top:8px;font-size:12.5px;font-weight:700;color:#D8DCFF;line-height:1.15;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
& .nxPc{display:none}
& .nxMid{position:relative;width:126px;height:126px;flex:0 0 126px}
& .nxR0{stroke:rgba(255,255,255,.16)}
& .nxR1{stroke:#7CFFB2}
& .nxMid::before{content:"";position:absolute;inset:6px;border-radius:50%;background:rgba(5,7,25,.55)}
& .nxMT{z-index:1}
& .nxSin .nxMid{visibility:hidden}
& .nxRn{font:800 36px/1 ${ROUND};font-variant-numeric:tabular-nums}
& .nxRn::after{content:"%";font-size:17px}
& .nxRl{margin-top:4px;font-size:11.5px;font-weight:700;color:#B9BFF0;max-width:84px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar{display:none}
& .nxFoot{display:flex;align-items:flex-end;gap:10px;margin-top:auto;padding-top:22px}
& .nxPcF{display:none}
& .nxSello{padding:9px 14px;border-radius:14px;background:#FFD84A;color:#111;font-size:15px;transform:rotate(-6deg);box-shadow:0 10px 22px -8px rgba(0,0,0,.6);animation:nxPop .6s .35s cubic-bezier(.3,1.4,.5,1) both}
& .nxSello.gris{background:#E5E7F5}
& .nxSello.si{background:#7CFFB2}
& .nxFoot .sp{flex:1}
& .nxC{padding:8px 12px;border-radius:16px;background:rgba(255,255,255,.1);text-align:center}
& .nxC small{font-size:11px;color:#C3C8F5;font-weight:600}
& .nxC b{font-size:18px}
& .game .body{background:rgba(0,0,0,.18)!important}
& .nxProg{display:flex;gap:5px;padding:2px 2px 10px}
& .nxProg button{flex:1;height:22px;padding:0;border:0;background:none;display:flex;align-items:center}
& .nxProg button span{display:block;width:100%;height:4px;border-radius:4px;background:rgba(255,255,255,.24);overflow:hidden}
& .nxProg button.on span{background:#fff}
`);

/* ===================================================================== 2 · DUELO */
var DUELO=dis('duelo',`
&{--bg:#0C0C11;--bg1:#171720;--bg2:#1D1D28;--bg3:#262633;--line:#262633;--line2:#3A3A4D;--txt:#FFFFFF;--mut:#B4B8D4;--mut2:#9599B8;--acc:#FFCC29;--acc2:#FFE07A;--accTx:#111111;--hot:#FF4D4D;--hotTx:#FFFFFF;--good:#5DFFA8;--bad:#FF7A7A;--info:#8FD8FF;--ia:#B4B8D4;--r:16px;--r2:22px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#0C0C11!important}
&,& body{color:var(--txt)!important}
& body{background:linear-gradient(180deg,#1a1a24,transparent 280px) no-repeat!important}
& body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
& :is(.topbar,header){background:#0C0C11!important;border-bottom:1px solid #262633!important}
& :is(.brand,header h1){font:900 24px/1 ${COND}!important;letter-spacing:.12em;color:#FFCC29!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;border-radius:0!important;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 6px)!important;background:#12121A!important;border:0!important;border-top:1px solid #262633!important;box-shadow:none!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:transparent!important;color:#FFCC29!important;box-shadow:inset 0 3px 0 #FFCC29!important;border-radius:0!important}
& .game{border-radius:22px!important;background:#171720!important;border:1px solid #262633!important;overflow:hidden;margin:0 0 12px;box-shadow:0 18px 30px -20px var(--th,#000)!important;animation:nxDrop .5s cubic-bezier(.2,.9,.3,1) both}
& .game.open{border-color:#FFCC29!important}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:8px 14px}
& .nxT{display:block;position:relative}
& .nxVs{position:relative;height:132px;background:var(--ta,#005A9C);overflow:hidden}
& .nxVs::before{content:"";position:absolute;inset:0;background:var(--th,#B4501D);clip-path:polygon(60% 0,100% 0,100% 100%,40% 100%)}
& .nxVs::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.5));pointer-events:none}
& .nxTop{position:absolute;top:8px;left:0;right:0;z-index:3;display:flex;justify-content:center;gap:8px;padding:0 12px;font:700 12.5px/1 ${COND};letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.92)}
& .nxTit,& .nxLogo,& .nxNom{display:none}
& .nxInfo{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}
& .nxHora.vivo{color:#FFCC29}
& .nxSide{position:absolute;bottom:10px;z-index:2;color:#fff}
& .nxSide.a{left:14px}
& .nxSide.h{right:14px;text-align:right}
& .nxAb{display:block;font:900 56px/.9 ${COND};letter-spacing:.02em;text-shadow:0 4px 0 rgba(0,0,0,.35)}
& .nxPc{display:block;margin-top:3px;font:700 18px/1 ${COND};letter-spacing:.05em}
& .nxMid{position:absolute;left:50%;top:58%;z-index:3;width:50px;height:50px;border-radius:50%;background:#FFCC29;color:#111;border:3px solid #0C0C11;display:flex;align-items:center;justify-content:center;animation:nxVs 2.2s ease-in-out infinite}
& .nxRing,& .nxMT{display:none}
& .nxVsb{display:block;font:900 20px/1 ${COND}}
& .nxBar{height:7px;background:#262633;gap:0}
& .nxBar i{background:#3A3A4D}
& .nxBar i.w{background:#FFCC29;transform-origin:left;animation:nxGrow .9s .2s cubic-bezier(.3,.9,.3,1) both}
& .nxFoot{display:flex;align-items:center;gap:12px;padding:11px 14px 12px;background:#171720}
& .nxPcF{display:none}
& .nxSello{padding:7px 11px;border:3px solid #7FD8FF;color:#7FD8FF;border-radius:10px;font:800 16px/1 ${COND};letter-spacing:.06em;text-transform:uppercase;transform:rotate(-3deg)}
& .nxSello.si{border-color:#5DFFA8;color:#5DFFA8}
& .nxSello.gris{border-color:#8F93B0;color:#B4B8D4}
& .nxFoot .sp{flex:1}
& .nxC{text-align:right}
& .nxC small{font:600 12.5px/1.1 ${COND};letter-spacing:.08em;text-transform:uppercase;color:#9AA0C8}
& .nxC b{font:800 20px/1.1 ${COND}}
& .nxArt{display:none}
`);

/* ===================================================================== 3 · BENTO */
var BENTO=dis('bento',`
&{--bg:#F3F0FB;--bg1:#FFFFFF;--bg2:#F6F3FF;--bg3:#E9E3FB;--line:#E4DEF5;--line2:#CFC6EE;--txt:#16132B;--mut:#4A4570;--mut2:#6D6890;--acc:#5B2BD6;--acc2:#7C55E8;--accTx:#FFFFFF;--hot:#B6FF6A;--hotTx:#14201A;--good:#0B7F57;--bad:#C3302B;--info:#3A1F78;--ia:#4A4570;--r:20px;--r2:28px;--body:${ROUND};color-scheme:light}
&,& body{background:#F3F0FB!important;color:var(--txt)!important}
& body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 104px)!important}
& :is(.topbar,header){background:#F3F0FB!important;border-bottom:0!important}
& :is(.brand,header h1){font:800 24px/1 ${ROUND}!important;letter-spacing:.06em;color:#16132B!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:16px!important;right:16px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 14px)!important;width:auto!important;border-radius:33px!important;padding:8px!important;gap:2px!important;background:#16132B!important;border:0!important;box-shadow:0 24px 40px -16px rgba(22,19,43,.7)!important}
& :is(.navbar button,.tabbar .tbar-btn){color:#C9C2F0!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:#B6FF6A!important;color:#14201A!important;border-radius:24px!important}
& :is(#slate,#juegos){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start}
& :is(#slate,#juegos)>:not(.game){grid-column:1/-1}
& :is(#slate,#juegos)>.diaHead{margin:8px 2px 0}
& .game.open{grid-column:1/-1}
& .game{--nxTile:#D8F98E;margin:0;border-radius:28px!important;border:0!important;background:#FFFFFF!important;overflow:hidden;box-shadow:0 14px 26px -18px rgba(40,20,120,.55)!important;animation:nxRise .55s cubic-bezier(.2,.9,.3,1) both}
& .game:nth-child(4n+2){--nxTile:#E3D7FF}
& .game:nth-child(4n+3){--nxTile:#FFD6BD}
& .game:nth-child(4n+4){--nxTile:#CFE9FF}
& .game.live{--nxTile:#FFC9C2}
& .game .head{padding:0!important;background:var(--nxTile)!important;position:relative!important;top:auto!important;display:block!important;color:#16132B}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:0 12px 10px}
& .nxT{display:flex;flex-direction:column;gap:8px;padding:12px;color:#16132B}
& .nxTop{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
& .nxHora{order:1;padding:4px 9px;border-radius:99px;background:#16132B;color:#fff;font:700 12px/1.2 ${ROUND}}
& .nxHora.vivo{background:#D9381E}
& .nxTit{order:2;flex-basis:100%;font:800 17px/1.1 ${ROUND}}
& .nxInfo{order:3;flex-basis:100%;font-size:12px;font-weight:600;color:#4A4570;display:none}
& .game.open .nxInfo{display:block}
& .nxVs{display:flex;align-items:center;justify-content:center;gap:4px}
& .nxSide{display:flex;flex-direction:column;align-items:center;width:42px}
& .nxLogo{width:42px;height:42px;border:3px solid #fff;font-size:12px}
& .nxSide.a .nxLogo{background:var(--ta,#6D6890)}
& .nxSide.h .nxLogo{background:var(--th,#6D6890)}
& .nxAb,& .nxNom,& .nxPc{display:none}
& .nxMid{position:relative;width:68px;height:68px;flex:0 0 68px}
& .nxR0{stroke:rgba(22,19,43,.12)}
& .nxR1{stroke:#16132B}
& .nxRn{font:800 20px/1 ${ROUND}}
& .nxRn::after{content:"%";font-size:11px}
& .nxRl{display:none}
& .nxBar{display:none}
& .nxFoot{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
& .nxPcF{display:none}
& .nxSello{padding:5px 10px;border-radius:12px;background:#16132B;color:#fff;font-size:12.5px}
& .nxSello.si{background:#B6FF6A;color:#14201A}
& .nxSello.gris{background:rgba(22,19,43,.12);color:#16132B}
& .nxC{font-size:12px}
& .nxC small{display:inline;font-weight:600;color:#4A4570;margin-right:4px}
& .nxC b{display:inline;font-size:13px}
& .nxArt{display:none}
& .game .body{background:#FFFFFF!important}
& .nxSum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 12px}
& .nxSum div{border-radius:22px;padding:11px 10px;line-height:1.1;animation:nxRise .5s both}
& .nxSum div:nth-child(1){background:#CFE9FF}
& .nxSum div:nth-child(2){background:#FFD6BD;animation-delay:.07s}
& .nxSum div:nth-child(3){background:#E3D7FF;animation-delay:.14s}
& .nxSum small{display:block;font-size:12px;font-weight:700;color:#4A4570}
& .nxSum b{display:block;margin-top:3px;font:800 19px/1.1 ${ROUND};color:#16132B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`);

/* ===================================================================== 4 · AGENDA */
var AGENDA=dis('agenda',`
&{--bg:#E9F3FF;--bg1:#FFFFFF;--bg2:#EEF5FF;--bg3:#DFEAFA;--line:#D3E2F5;--line2:#AAC3E3;--txt:#14213D;--mut:#44597D;--mut2:#5B7094;--acc:#14213D;--acc2:#44597D;--accTx:#FFFFFF;--hot:#FF6B57;--hotTx:#14213D;--good:#0B7A70;--bad:#C2410C;--info:#0369A1;--ia:#44597D;--r:18px;--r2:24px;--body:system-ui,-apple-system,sans-serif;color-scheme:light}
&,& body{background:#E9F3FF!important;color:var(--txt)!important}
& body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 100px)!important}
& :is(.topbar,header){background:#E9F3FF!important;border-bottom:0!important}
& :is(.brand,header h1){font:700 26px/1 "DM Serif Display",Georgia,"Times New Roman",serif!important;letter-spacing:.02em;color:#14213D!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:14px!important;right:14px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 14px)!important;width:auto!important;border-radius:24px!important;padding:7px!important;gap:2px!important;background:#FFFFFF!important;border:0!important;box-shadow:0 18px 32px -16px rgba(20,33,61,.55)!important}
& :is(.navbar button,.tabbar .tbar-btn){color:#44597D!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:#14213D!important;color:#FFFFFF!important;border-radius:16px!important}
& :is(#slate,#juegos){position:relative;display:block;padding-left:60px}
& :is(#slate,#juegos)::before{content:"";position:absolute;left:47px;top:8px;bottom:8px;border-left:2px dashed #AAC3E3}
& :is(#slate,#juegos)>.diaHead{margin-left:-60px;position:relative;z-index:1;background:#E9F3FF}
& :is(#slate,#juegos)>.dsSepConf{margin-left:-60px}
& .game{position:relative;margin:0 0 12px;border-radius:24px!important;border:0!important;background:#FFFFFF!important;overflow:visible;box-shadow:0 14px 26px -18px rgba(20,33,61,.55)!important;animation:nxRise .5s cubic-bezier(.2,.9,.3,1) both}
& .game::before{content:attr(data-nxh);position:absolute;left:-60px;top:19px;width:40px;text-align:right;font:800 13.5px/1.05 system-ui,sans-serif;color:#14213D;white-space:pre-line}
& .game::after{content:"";position:absolute;left:-21px;top:21px;width:16px;height:16px;border-radius:50%;background:var(--nxDot,#38BDF8);border:3px solid #E9F3FF}
& .game[data-nxv="si"]{--nxDot:#14B8A6}
& .game[data-nxv="gris"]{--nxDot:#9AA9C2}
& .game.live{--nxDot:#FF6B57}
& .game.live::after{animation:nxPulse 1.6s ease-out infinite}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important;border-radius:24px}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:0 14px 10px}
& .nxT{display:flex;align-items:center;gap:10px;padding:12px 14px;color:#14213D}
& .nxVs{order:1;display:flex;flex:0 0 auto}
& .nxSide{display:block;width:auto}
& .nxSide.h{margin-left:-13px}
& .nxLogo{width:40px;height:40px;border:3px solid #fff;font-size:11.5px}
& .nxSide.a .nxLogo{background:var(--ta,#5B7094)}
& .nxSide.h .nxLogo{background:var(--th,#5B7094)}
& .nxAb,& .nxNom,& .nxPc,& .nxMid,& .nxBar,& .nxArt{display:none}
& .nxTop{order:2;flex:1;min-width:0;display:block;line-height:1.15}
& .nxHora{display:none}
& .nxTit{display:block;font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
& .nxInfo{display:block;font-size:12.5px;font-weight:600;color:#5B7094;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxFoot{order:3;display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}
& .nxPcF{display:block;font-weight:800;font-size:22px;line-height:1}
& .nxSello{font-size:12.5px;color:#0369A1}
& .nxSello.si{color:#0B7A70}
& .nxSello.gris{color:#5B7094}
& .nxFoot .sp,& .nxC{display:none}
& .game.open{box-shadow:0 0 0 2px #14213D,0 18px 30px -18px rgba(20,33,61,.6)!important}
& .game .body{background:#FFFFFF!important;border-radius:0 0 24px 24px}
& .nxAhora{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:8px 12px;border-radius:14px;background:#FF6B57;color:#fff;font:800 13px/1 system-ui,sans-serif;letter-spacing:.06em}
`);

/* ===================================================================== 5 · RADAR DE VALOR */
var RADARV=dis('radarvalor',`
&{--bg:#05060A;--bg1:#0A1120;--bg2:#0F1A2E;--bg3:#16233B;--line:#1D2E4A;--line2:#2B4163;--txt:#E9F1FF;--mut:#B4C2DE;--mut2:#8798BB;--acc:#22E4FF;--acc2:#7BEFFF;--accTx:#001318;--hot:#B8FF3C;--hotTx:#0B1400;--good:#B8FF3C;--bad:#FF3D9A;--info:#7BEFFF;--ia:#B4C2DE;--r:16px;--r2:22px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#05060A!important}
&,& body{color:var(--txt)!important}
& body{background:radial-gradient(90% 38% at 80% 8%,rgba(34,228,255,.12),transparent 70%),radial-gradient(70% 30% at 10% 60%,rgba(255,61,154,.08),transparent 70%) no-repeat fixed!important}
& body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 100px)!important}
& :is(.topbar,header){background:rgba(5,6,10,.85)!important;border-bottom:1px solid #1D2E4A!important}
& :is(.brand,header h1){font:700 19px/1 ${MONO}!important;letter-spacing:.14em;text-transform:uppercase;color:#22E4FF!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:0 0 14px rgba(34,228,255,.6)}
& :is(.navbar,.tabbar){left:14px!important;right:14px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)!important;width:auto!important;border-radius:22px!important;padding:5px!important;gap:2px!important;background:rgba(15,26,46,.94)!important;border:1px solid #22324D!important;box-shadow:0 18px 30px -12px #000!important}
& :is(.navbar button span,.tabbar .lb){font-family:${MONO}!important;text-transform:uppercase}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:rgba(34,228,255,.14)!important;color:#22E4FF!important;border-radius:16px!important;box-shadow:inset 0 0 0 1px #22E4FF!important}
& .game{margin:0 0 10px;border-radius:18px!important;background:linear-gradient(160deg,#0F1A2E,#0A1120)!important;border:1px solid #22324D!important;overflow:hidden;box-shadow:none!important;animation:nxRise .5s cubic-bezier(.2,.9,.3,1) both}
& .game.open{border-color:#22E4FF!important;box-shadow:0 0 26px -10px rgba(34,228,255,.6)!important}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:0 14px 10px}
& .nxT{display:flex;align-items:center;gap:12px;padding:11px 14px}
& .nxVs{order:1;flex:0 0 auto}
& .nxSide{display:none}
& .nxMid{position:relative;width:60px;height:60px;display:block}
& .nxR0{stroke:#16233B}
& .nxR1{stroke:var(--nxC,#22E4FF);filter:drop-shadow(0 0 4px var(--nxC,#22E4FF))}
& .game[data-nxv="si"]{--nxC:#B8FF3C}
& .game[data-nxv="gris"]{--nxC:#8798BB}
& .nxRn{font:700 17px/1 ${MONO}}
& .nxRn::after{content:"%";font-size:10px}
& .nxRl{display:none}
& .nxTop{order:2;flex:1;min-width:0;display:block;line-height:1.2}
& .nxHora{display:inline-block;margin-right:6px;font:700 12px/1 ${MONO};color:#22E4FF}
& .nxHora.vivo{color:#FF3D9A}
& .nxTit{display:inline;font-weight:700;font-size:17px}
& .nxInfo{display:block;font:500 12px/1.3 ${MONO};color:#8798BB;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar,& .nxArt,& .nxPcF{display:none}
& .nxFoot{order:3;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
& .nxSello{padding:5px 9px;border-radius:9px;border:1px solid var(--nxC,#22E4FF);color:var(--nxC,#22E4FF);font:700 11.5px/1 ${MONO};text-transform:uppercase}
& .nxFoot .sp,& .nxC{display:none}
& .game .body{background:rgba(0,0,0,.2)!important}
& .nxPlot{display:block;margin:0 0 12px;padding:12px 12px 10px;border:1px solid #22324D;border-radius:20px;background:rgba(10,17,32,.8)}
& .nxPlot h4{margin:0 0 8px;font:700 12px/1 ${MONO};letter-spacing:.16em;color:#22E4FF;text-transform:uppercase}
& .nxPlot .area{position:relative;height:210px;margin-left:30px;border:1px solid #1D2E4A;border-radius:14px;overflow:hidden;background:rgba(10,16,28,.7)}
& .nxPlot .area::before{content:"";position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;background:conic-gradient(from 0deg,rgba(34,228,255,0) 0deg,rgba(34,228,255,.14) 330deg,rgba(34,228,255,0) 360deg);animation:nxSweep 7s linear infinite;pointer-events:none}
& .nxPlot .gy{position:absolute;left:0;right:0;height:0;border-top:1px dashed #1C2638}
& .nxPlot .yl{position:absolute;left:-30px;width:26px;text-align:right;font:500 10.5px/1 ${MONO};color:#8798BB;transform:translateY(50%)}
& .nxPlot .b{position:absolute;padding:0;border:0;background:none}
& .nxPlot .b span{position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 10.5px/1 ${MONO};color:var(--bc);border:2px solid var(--bc);background:rgba(5,6,10,.78);box-shadow:0 0 14px -2px var(--bc);animation:nxBub .6s cubic-bezier(.3,1.5,.5,1) both}
& .nxPlot .b.v span{background:var(--bc);color:#05060A}
& .nxPlot .b.v::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--bc);animation:nxPing 2s ease-out infinite}
& .nxPlot .ax{display:flex;justify-content:space-between;margin:6px 0 0 30px;font:500 10.5px/1 ${MONO};color:#8798BB}
& .nxPlot p{margin:8px 0 0;font:500 11.5px/1.35 ${MONO};color:#8798BB}
`);

var CSS_ALL=[BASE,HISTORIAS,DUELO,BENTO,AGENDA,RADARV].join('\n');
function inyectar(){
  if(!doc||doc.getElementById('uiInterior2Css')) return;
  var s=doc.createElement('style'); s.id='uiInterior2Css'; s.textContent=CSS_ALL; (doc.head||html).appendChild(s);
}

/* ===================================================================== armado de la cabecera */
function activo(){ var u=html&&html.getAttribute('data-ui')||''; return NEW.indexOf(u)>=0?u:''; }
function T(tag,cls,txt){ var e=doc.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function abr(g,o,lado){
  var e=g._eq&&g._eq[lado], ab=e&&e.ab?String(e.ab):'';
  if(ab&&ab.length<=4) return ab.toUpperCase();
  var n=(lado==='a'?o.na:o.nh)||'', w=n.split(/\s+/).filter(function(x){ return /[A-Za-zÀ-ÿ]/.test(x); });
  if(w.length>1) return w.slice(0,3).map(function(x){ return x.replace(/[^A-Za-zÀ-ÿ]/g,'').charAt(0); }).join('').toUpperCase();
  return (w[0]||n).replace(/[^A-Za-zÀ-ÿ]/g,'').slice(0,3).toUpperCase();
}
function logo(src,ab){
  var s=T('span','nxLogo'), i=T('i','',ab); s.appendChild(i);
  if(src){ var im=T('img'); im.alt=''; im.onload=function(){ i.style.display='none'; s.classList.add('im'); }; im.onerror=function(){ im.style.display='none'; }; im.src=src; s.appendChild(im); }
  return s;
}
function anillo(p){
  var s=doc.createElementNS(NS,'svg'); s.setAttribute('viewBox','0 0 100 100'); s.setAttribute('class','nxRing'); s.setAttribute('aria-hidden','true');
  s.innerHTML='<circle class="nxR0" cx="50" cy="50" r="42"/><circle class="nxR1" cx="50" cy="50" r="42" style="stroke-dasharray:'+(Math.max(0,Math.min(100,p))*2.639).toFixed(1)+' 263.9"/>';
  return s;
}
var ESTADIO='<svg viewBox="0 0 362 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 150V70Q50 30 112 54T236 40T362 62V150Z" fill="rgba(5,7,25,.55)"/><polygon points="181,24 262,95 181,150 100,95" fill="rgba(52,211,100,.26)" stroke="rgba(255,255,255,.32)" stroke-width="1.5"/><circle cx="181" cy="24" r="3.5" fill="#fff"/><circle cx="262" cy="95" r="3.5" fill="#fff"/><circle cx="100" cy="95" r="3.5" fill="#fff"/><g class="tw"><rect x="38" y="20" width="4" height="52" fill="#9AA3E6"/><circle cx="40" cy="16" r="9" fill="#fff" opacity=".9"/></g><g class="tw" style="animation-delay:1.1s"><rect x="320" y="16" width="4" height="56" fill="#9AA3E6"/><circle cx="322" cy="12" r="9" fill="#fff" opacity=".9"/></g></svg>';

function armar(g,u){
  var leer=root.OVALeerJuego; if(!leer) return false;
  var head=g.querySelector('.head'); if(!head) return false;
  var o=leer(g); if(!o) return false;
  var sig=u+'|'+JSON.stringify(o);
  if(g.__nx===sig&&head.querySelector('.nxT')) return true;
  g.__nx=sig;
  var viejo=head.querySelector('.nxT'); if(viejo) viejo.remove();
  var tiene=o.pa!=null&&o.ph!=null, aA=abr(g,o,'a'), aH=abr(g,o,'h');
  var favA=tiene&&o.pa>o.ph, pf=tiene?Math.max(o.pa,o.ph):null;
  var t=T('div','nxT'+(tiene?'':' nxSin'));
  if(u==='historias') { var art=T('div','nxArt'); art.innerHTML=ESTADIO; t.appendChild(art); }
  var top=T('div','nxTop');
  top.appendChild(T('span','nxHora'+(o.vivo?' vivo':''),o.hora||'—'));
  top.appendChild(T('span','nxTit',aA+' '+(o.vs||'@')+' '+aH));
  top.appendChild(T('span','nxInfo',o.info||''));
  t.appendChild(top);
  var vs=T('div','nxVs');
  function lado(cls,ab,src,nom,pc){
    var s=T('div','nxSide '+cls); s.appendChild(logo(src,ab)); s.appendChild(T('span','nxAb',ab)); s.appendChild(T('span','nxNom',nom||ab));
    s.appendChild(T('span','nxPc',pc!=null?pc+'%':'')); return s;
  }
  vs.appendChild(lado('a',aA,o.ea,o.na,tiene?o.pa:null));
  var mid=T('div','nxMid');
  if(tiene){
    mid.appendChild(anillo(pf));
    var mt=T('div','nxMT'); mt.appendChild(T('span','nxRn',String(pf))); mt.appendChild(T('span','nxRl','gana '+(favA?aA:aH))); mid.appendChild(mt);
  }
  mid.appendChild(T('span','nxVsb','VS'));
  vs.appendChild(mid);
  vs.appendChild(lado('h',aH,o.eh,o.nh,tiene?o.ph:null));
  t.appendChild(vs);
  if(tiene){
    var br=T('div','nxBar'), ia=T('i',o.pa>o.ph?'w':''), ih=T('i',o.ph>=o.pa?'w':'');
    ia.style.flex=String(Math.max(o.pa,1)); ih.style.flex=String(Math.max(o.ph,1)); br.appendChild(ia); br.appendChild(ih); t.appendChild(br);
  }
  var ft=T('div','nxFoot');
  if(tiene){
    ft.appendChild(T('span','nxPcF',pf+'%'));
    if(o.sello) ft.appendChild(T('span','nxSello '+(o.tono||''),o.sello));
    ft.appendChild(T('span','sp'));
    var c1=T('div','nxC'); c1.appendChild(T('small','','Cuota justa')); c1.appendChild(T('b','',o.cu||'—')); ft.appendChild(c1);
    if(o.tot||o.emp){ var c2=T('div','nxC'); c2.appendChild(T('small','',o.tot?'Total':'Empate')); c2.appendChild(T('b','',o.tot||o.emp)); ft.appendChild(c2); }
  } else {
    ft.appendChild(T('span','nxEmpty','Toca para ver los números'));
  }
  t.appendChild(ft);
  head.insertBefore(t,head.firstChild);
  g.classList.add('nxOn');
  var h=String(o.hora||'').trim();
  if(/^\d{1,2}:\d{2}\s*[AP]M$/i.test(h)) h=h.replace(/\s*([AP]M)$/i,'\n$1').toUpperCase();
  else if(o.vivo) h='EN\nVIVO'; else if(/final/i.test(h)) h='FINAL';
  g.setAttribute('data-nxh',h);
  g.setAttribute('data-nxv',o.tono||'');
  g.__nxo={pa:o.pa,ph:o.ph,fav:favA?aA:aH,pf:pf,tot:parseFloat(String(o.tot||'').replace(',','.'))||null,tono:o.tono||'',hora:(g._hora||o.hora||''),sello:o.sello||''};
  return true;
}

/* ---------- lo que va fuera de las tarjetas ---------- */
function minutos(txt){
  var m=String(txt||'').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i); if(!m) return null;
  var h=+m[1], mi=+m[2], ap=m[3]&&m[3].toUpperCase();
  if(ap==='PM'&&h<12) h+=12; if(ap==='AM'&&h===12) h=0;
  return h*60+mi;
}
function contenedor(){ return doc.getElementById('slate')||doc.getElementById('juegos'); }
function quitarExtras(){ [].forEach.call(doc.querySelectorAll('.nxProg,.nxSum,.nxPlot,.nxAhora'),function(e){ e.remove(); }); }
function extras(u,cards){
  var c=contenedor(); if(!c) return;
  var datos=cards.filter(function(g){ return g.__nxo&&g.__nxo.pa!=null; });
  var firma=u+'|'+cards.length+'|'+datos.map(function(g){ return g.__nxo.fav+g.__nxo.pf+g.__nxo.sello+g.__nxo.hora; }).join(',')+'|'+((doc.getElementById('fecha')||{}).value||'');
  if(c.__nxFirma===firma) return;
  c.__nxFirma=firma; quitarExtras();
  if(u==='historias'&&c.id==='slate'&&cards.length>1){
    var p=T('div','nxProg'), segs=[];
    cards.forEach(function(g,i){
      var b=T('button'); b.type='button'; b.setAttribute('aria-label','Juego '+(i+1)); b.appendChild(T('span'));
      b.addEventListener('click',function(){ c.scrollTo?c.scrollTo({left:i*c.clientWidth,behavior:'smooth'}):(c.scrollLeft=i*c.clientWidth); });
      p.appendChild(b); segs.push(b);
    });
    function marca(){ var i=Math.round(c.scrollLeft/Math.max(1,c.clientWidth)); segs.forEach(function(b,k){ b.classList.toggle('on',k<=i); }); }
    if(!c.__nxScroll){ c.__nxScroll=1; c.addEventListener('scroll',function(){ if(c.__nxMarca) c.__nxMarca(); },{passive:true}); }
    c.__nxMarca=marca; marca();
    c.parentNode.insertBefore(p,c);
  }
  if(u==='bento'&&datos.length){
    var s=T('div','nxSum'), mejor=datos.slice().sort(function(a,b){ return b.__nxo.pf-a.__nxo.pf; })[0].__nxo;
    var fuertes=datos.filter(function(g){ return g.__nxo.tono==='si'; }).length;
    function cel(et,v){ var d=T('div'); d.appendChild(T('small','',et)); d.appendChild(T('b','',v)); s.appendChild(d); }
    cel('🏟️ Juegos',String(cards.length)); cel('🔥 Con pick',String(fuertes)); cel('🎯 Más claro',mejor.fav+' '+mejor.pf+'%');
    c.parentNode.insertBefore(s,c);
  }
  if(u==='agenda'&&c.id==='slate'){
    var f=doc.getElementById('fecha'), hoy=new Date(), p2=function(n){ return String(n).padStart(2,'0'); };
    if(f&&f.value===hoy.getFullYear()+'-'+p2(hoy.getMonth()+1)+'-'+p2(hoy.getDate())){
      var ahora=hoy.getHours()*60+hoy.getMinutes(), sig1=null;
      for(var i=0;i<cards.length;i++){ var m=minutos(cards[i].__nxo&&cards[i].__nxo.hora); if(m!=null&&m>=ahora){ sig1=cards[i]; break; } }
      if(sig1){ var a=T('div','nxAhora','⏱️ AHORA · '+hoy.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})); c.insertBefore(a,sig1); }
    }
  }
  if(u==='radarvalor'&&datos.length>=2){
    var pl=T('div','nxPlot'); pl.appendChild(T('h4','','◉ Mapa del día · '+datos.length+' juegos'));
    var ar=T('div','area'), ms=datos.map(function(g,i){ var m=minutos(g.__nxo.hora); return m!=null?m:i; });
    var x0=Math.min.apply(null,ms), x1=Math.max.apply(null,ms); if(x1===x0) x1=x0+1;
    var ys=datos.map(function(g){ return g.__nxo.pf; }), y0=Math.floor(Math.min.apply(null,ys)/5)*5-5, y1=Math.ceil(Math.max.apply(null,ys)/5)*5+5;
    for(var yy=y0+5;yy<y1;yy+=5){ var gy=T('div','gy'); gy.style.bottom=((0.1+0.8*(yy-y0)/(y1-y0))*100)+'%'; var yl=T('span','yl',yy+'%'); gy.appendChild(yl); ar.appendChild(gy); }
    datos.forEach(function(g,i){
      var o=g.__nxo, sz=o.tot?Math.round((o.tot-5)*5+24):34; sz=Math.max(28,Math.min(46,sz));
      var col=o.tono==='si'?'#B8FF3C':(o.tono==='gris'?'#8798BB':'#22E4FF');
      var b=T('button','b'+(o.tono==='si'?' v':'')); b.type='button'; b.setAttribute('aria-label',o.fav+' '+o.pf+'%');
      var px=0.1+0.8*(ms[i]-x0)/(x1-x0), py=0.1+0.8*(o.pf-y0)/(y1-y0);
      b.style.cssText='--bc:'+col+';width:'+sz+'px;height:'+sz+'px;left:calc('+(px*100)+'% - '+(sz/2)+'px);bottom:calc('+(py*100)+'% - '+(sz/2)+'px)';
      var sp=T('span','',o.fav); sp.style.animationDelay=(i*0.07).toFixed(2)+'s'; b.appendChild(sp);
      b.addEventListener('click',function(){ var hd=g.querySelector('.head'); if(hd&&hd.click) hd.click(); });
      ar.appendChild(b);
    });
    pl.appendChild(ar);
    var ax=T('div','ax'); ax.appendChild(T('span','','antes')); ax.appendChild(T('span','','hora del juego →')); ax.appendChild(T('span','','después')); pl.appendChild(ax);
    pl.appendChild(T('p','','Altura = probabilidad del favorito. Tamaño = total de carreras. Verde = pick marcado. Toca una burbuja para abrir el juego.'));
    c.parentNode.insertBefore(pl,c);
  }
}

function pasar(){
  var u=activo(); if(!u){ return; }
  var cards=[].slice.call(doc.querySelectorAll('#slate .game, #juegos .game')), ok=0;
  cards.forEach(function(g){ try{ if(armar(g,u)) ok++; }catch(e){ if(root.console) root.console.error('interior2',e); } });
  try{ extras(u,cards); }catch(e){ if(root.console) root.console.error('interior2 extras',e); }
  return ok;
}
function vigilar(){
  var c=contenedor(); if(!c||c.__nxObs||!root.MutationObserver) return;
  c.__nxObs=1; var pend=false;
  function lanzar(){ if(pend) return; pend=true; root.setTimeout(function(){ pend=false; pasar(); },160); }
  new root.MutationObserver(lanzar).observe(c,{childList:true,subtree:true,characterData:true});
  new root.MutationObserver(function(){ c.__nxFirma=null; quitarExtras(); lanzar(); }).observe(html,{attributes:true,attributeFilter:['data-ui']});
  var f=doc.getElementById('fecha'); if(f) f.addEventListener('change',function(){ c.__nxFirma=null; lanzar(); });
  pasar();
}
function arrancar(){
  inyectar();
  function listo(){ [0,300,900,2000,4500,8000].forEach(function(ms){ root.setTimeout(function(){ try{ vigilar(); pasar(); }catch(e){} },ms); }); }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={NEW:NEW,css:CSS_ALL,armar:armar,minutos:minutos,_pasar:pasar};
root.OVAInterior2=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
