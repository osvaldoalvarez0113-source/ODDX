/* OVA · diseño interior v2: cinco diseños con estructura propia (Historias, Duelo, Bento, Agenda, Radar de valor).
   Se eligen en Ajustes → Apariencia → «Diseño de adentro» (la lista vive en interior.js; aquí está lo que cada uno pinta).
   Igual que Boleto: lee lo que la tarjeta ya muestra (equipos, hora, probabilidades, cuota justa, veredicto) con
   OVALeerJuego (diseno.js) y arma una cabecera nueva. No calcula nada, no borra nada: la cabecera original se
   oculta con CSS y vuelve al cambiar de diseño. Los números de adentro (pestañas, calculadora) son los de siempre. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var NEW=['historias','duelo','bento','agenda','radarvalor','cromos','campo','telemetria','marcador','recibo'];
var NS='http://www.w3.org/2000/svg';
var MONO='ui-monospace,"SF Mono",Menlo,Consolas,monospace';
var COND='"Avenir Next Condensed","Arial Narrow",Impact,"Helvetica Neue",sans-serif';
var ROUND='ui-rounded,"SF Pro Rounded","Avenir Next",system-ui,sans-serif';
/* Los temas de color de la app (Platino, Esmeralda, Zafiro…) pintan las pestañas, la tarjeta del pícher, avisos y barras con variables --x-*
   pensadas para su propio fondo. Cada diseño de aquí trae sus colores, así que también fija esas variables con SUS colores:
   así nunca queda texto oscuro sobre fondo oscuro ni al revés, sin importar qué tema de color esté puesto. */
function xv(blk){
  function g(n){ var m=blk.match(new RegExp('--'+n+':([^;]+)')); return m?m[1].trim():null; }
  var luz=/color-scheme:light/.test(blk), bg1=g('bg1')||'#fff', bg2=g('bg2')||bg1, bg3=g('bg3')||bg2, l2=g('line2')||'#888', acc=g('acc')||'#55f', aTx=g('accTx')||'#fff', hot=g('hot')||acc, good=g('good')||'#0a7', bad=g('bad')||'#c33';
  var okbg=luz?'#E6F7EE':'rgba(124,255,178,.12)', flbg=luz?'#FDECEA':'rgba(255,138,112,.14)', errbg=luz?'#FDECEA':'rgba(255,107,107,.14)', errbd=luz?'#F2B8B3':'rgba(255,107,107,.4)', warn=luz?'#FFF4D6':'rgba(255,200,80,.12)';
  return '--x-stbg:'+bg1+';--x-cabbg:'+bg2+';--x-herobg:'+bg2+';--x-teqon:'+bg3+';--x-tabtx:'+aTx+';--x-atx:'+aTx+';--x-onhead:'+hot+';--x-lead:'+acc+';--x-leadglow:transparent;--x-glow:transparent;--x-headglow:transparent;'+
    '--x-okbg:'+okbg+';--x-oktx:'+good+';--x-flbg:'+flbg+';--x-fltx:'+bad+';--x-errbg:'+errbg+';--x-errbd:'+errbd+';--x-errb:'+bad+';--x-warnbg:'+warn+';'+
    '--x-pvbg:'+bg2+';--x-pvbd:'+l2+';--x-iabg:'+bg2+';--x-iabd:'+l2+';--x-goodbg:'+okbg+';--x-goodbd:'+l2+';';
}
function dis(id,css){
  var sel='html[data-ui="'+id+'"][data-ui]', m=css.match(/&\{(--bg:[^}]*)\}/);
  var skin=m?sel+'[data-skin] :is(.ajustes,.pk,.cuotasbox,.row.hcrow,.fila-rank,.fila,.ovaHero){background:'+((m[1].match(/--bg2:([^;]+)/)||[0,'transparent'])[1])+'!important;border-color:'+((m[1].match(/--line2:([^;]+)/)||[0,'transparent'])[1])+'!important}\n':'';
  return (m?sel+'{'+xv(m[1])+'}\n'+skin:'')+css.split('&').join(sel);
}

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
@keyframes n3Foil{to{background-position:300% 50%}}
@keyframes n3Sheen{0%{background-position:170% 0}100%{background-position:-70% 0}}
@keyframes n3Gauge{from{stroke-dasharray:0 163.4}}
@keyframes n3Needle{from{transform:rotate(-90deg)}}
@keyframes n3Flip{from{opacity:0;transform:rotateX(-90deg)}to{opacity:1;transform:none}}
@keyframes n3Print{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}
.nxFlap,.nxCod,.nxGauge,.nxStars{display:none}
.game{position:relative}
.nxT,.nxProg,.nxSum,.nxPlot,.nxAhora{display:none}
html[data-ui] .game>.cambioP{margin:0;border-radius:0;font-size:11.5px;padding:6px 12px}
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
.nxFoto{position:relative;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#2b3070;color:#fff;overflow:visible}
.nxFoto i{font-style:normal;font-size:55%;line-height:1}
.nxFoto img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#cfd6ee}
.nxPn{display:none}
.nxSide{position:relative}
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
& .nxFoto{position:relative;margin:10px auto 22px;width:40px;height:40px;border:3px solid #FFD84A;box-shadow:0 8px 16px -6px rgba(0,0,0,.7)}
& .nxPn{display:block;position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;white-space:nowrap;font-size:11.5px;font-weight:700;color:#D8DCFF;max-width:96px;overflow:hidden;text-overflow:ellipsis}
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
& .nxVs{position:relative;height:150px;background:var(--ta,#005A9C);overflow:hidden}
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
& .nxFoto{position:absolute;bottom:calc(100% + 4px);width:36px;height:36px;border:2px solid #fff;box-shadow:0 6px 14px -4px rgba(0,0,0,.6)}
& .nxSide.a .nxFoto{left:0}
& .nxSide.h .nxFoto{right:0}
& .nxPn{display:block;position:absolute;top:50%;transform:translateY(-50%);font:700 13px/1 ${COND};letter-spacing:.06em;text-transform:uppercase;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.6);white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis}
& .nxSide.a .nxPn{left:44px}
& .nxSide.h .nxPn{right:44px}
& .nxMid{position:absolute;left:50%;top:62%;z-index:3;width:50px;height:50px;border-radius:50%;background:#FFCC29;color:#111;border:3px solid #0C0C11;display:flex;align-items:center;justify-content:center;animation:nxVs 2.2s ease-in-out infinite}
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
&{--bg:#F3F0FB;--bg1:#FFFFFF;--bg2:#F6F3FF;--bg3:#E9E3FB;--line:#E4DEF5;--line2:#CFC6EE;--txt:#16132B;--mut:#4A4570;--mut2:#6D6890;--acc:#5B2BD6;--acc2:#7C55E8;--accTx:#FFFFFF;--hot:#0B7F57;--hotTx:#FFFFFF;--good:#0B7F57;--bad:#C3302B;--info:#3A1F78;--ia:#4A4570;--r:20px;--r2:28px;--body:${ROUND};color-scheme:light;--x-onhead:#B6FF6A}
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
& .nxVs{display:flex;align-items:center;justify-content:center;gap:2px}
& .nxSide{display:flex;flex-direction:column;align-items:center;width:42px}
& .nxLogo{width:42px;height:42px;border:3px solid #fff;font-size:12px}
& .nxSide.a .nxLogo{background:var(--ta,#6D6890)}
& .nxSide.h .nxLogo{background:var(--th,#6D6890)}
& .nxAb,& .nxNom,& .nxPc{display:none}
& .nxFoto{position:absolute;right:-3px;bottom:-4px;width:22px;height:22px;border:2px solid #fff;box-shadow:0 4px 8px -3px rgba(22,19,43,.5)}
& .game.open .nxFoto{width:30px;height:30px}
& .nxMid{position:relative;width:60px;height:60px;flex:0 0 60px}
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
& .bug{--hot:#B6FF6A;--good:#7CFFB2;--bad:#FF9A9A}
& .bug .caja{background:#16132B!important;max-width:100%;box-sizing:border-box;overflow:hidden}
& .game:not(.open) .bug .caja{padding:8px 6px;gap:4px 8px;flex-wrap:wrap;justify-content:center}
& .game:not(.open) .bug .caja.fin{padding:8px 6px}
& .game:not(.open) .bug .fq{font-size:12px;gap:4px}
& .game:not(.open) .bug .fq i{font-size:17px}
& .game:not(.open) .bug .ft{margin-left:0;font-size:10px}
& .game:not(.open) .bug .dia,& .game:not(.open) .bug .cnt{display:none}
& .game .body{--hot:#0B7F57}
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
& .nxSide.h{margin-left:6px}
& .nxLogo{width:40px;height:40px;border:3px solid #fff;font-size:11.5px}
& .nxSide.a .nxLogo{background:var(--ta,#5B7094)}
& .nxSide.h .nxLogo{background:var(--th,#5B7094)}
& .nxAb,& .nxNom,& .nxPc,& .nxMid,& .nxBar,& .nxArt{display:none}
& .nxFoto{position:absolute;right:-5px;bottom:-5px;width:21px;height:21px;border:2px solid #fff;box-shadow:0 3px 6px -2px rgba(20,33,61,.5)}
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
& .nxVs{display:flex;align-items:center;gap:8px}
& .nxSide{display:block;position:static;width:auto;height:auto}
& .nxSide .nxLogo,& .nxSide .nxAb,& .nxSide .nxNom,& .nxSide .nxPc{display:none}
& .nxSide.a{order:2}
& .nxSide.h{order:3;margin-left:-16px}
& .nxFoto{position:relative;width:30px;height:30px;border:2px solid #22E4FF;box-shadow:0 0 10px -2px #22E4FF}
& .nxMid{order:1;position:relative;width:60px;height:60px;display:block}
& .nxR0{stroke:#16233B}
& .nxR1{stroke:var(--nxC,#22E4FF);filter:drop-shadow(0 0 4px var(--nxC,#22E4FF))}
& .game[data-nxv="si"]{--nxC:#B8FF3C}
& .game[data-nxv="gris"]{--nxC:#8798BB}
& .nxRn{font:700 17px/1 ${MONO}}
& .nxRn::after{content:"%";font-size:10px}
& .nxRl{display:none}
& .nxTop{order:2;flex:1;min-width:0;display:block;line-height:1.2}
& .nxHora{display:block;margin:0 0 3px;font:700 12px/1 ${MONO};color:#22E4FF}
& .nxHora.vivo{color:#FF3D9A}
& .nxTit{display:block;font-weight:700;font-size:17px;white-space:nowrap}
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

/* ===================================================================== 6 · CROMOS */
var CROMOS=dis('cromos',`
&{--bg:#0a0920;--bg1:#14122b;--bg2:#1c1a3d;--bg3:#262350;--line:#2f2b63;--line2:#463f8c;--txt:#FFFFFF;--mut:#CFCCF7;--mut2:#ABA8E8;--acc:#FFD84A;--acc2:#7FD8FF;--accTx:#1A1033;--hot:#7CFFB2;--hotTx:#04210F;--good:#7CFFB2;--bad:#FF9A9A;--info:#A9BBFF;--ia:#C4A6FF;--r:18px;--r2:26px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#0a0920!important}
&,& body{color:var(--txt)!important}
& body{background:radial-gradient(90% 40% at 50% 8%,#3a1f8f,transparent 70%) no-repeat fixed,radial-gradient(70% 30% at 92% 100%,#0b5a7a,transparent 70%) no-repeat fixed,#0a0920!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 100px)!important}
& :is(.topbar,header){background:rgba(10,9,32,.78)!important;border-bottom:0!important;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
& :is(.brand,header h1){font:800 22px/1 ${ROUND}!important;letter-spacing:.14em;color:#fff!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;width:auto!important;border-radius:28px!important;padding:6px!important;gap:2px!important;background:rgba(30,26,80,.78)!important;border:1px solid rgba(255,255,255,.18)!important;-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px)}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:rgba(255,255,255,.2)!important;color:#fff!important;border-radius:20px!important}
& .game{padding:5px!important;border:0!important;border-radius:26px!important;margin:0 0 16px;overflow:hidden;background:linear-gradient(115deg,#ff7ad9,#ffd84a,#7cffb2,#7fd8ff,#b58cff,#ff7ad9)!important;background-size:300% 100%!important;animation:n3Foil 7s linear infinite,nxRise .55s cubic-bezier(.2,.9,.3,1) both;box-shadow:0 26px 40px -24px var(--th,#7a5cff)!important}
& .game::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:26px;background:linear-gradient(115deg,transparent 25%,rgba(255,255,255,.5) 42%,rgba(130,220,255,.3) 50%,rgba(255,130,230,.3) 58%,transparent 75%);background-size:260% 100%;mix-blend-mode:overlay;animation:n3Sheen 3.8s ease-in-out infinite}
& .game .head{padding:0!important;background:#14122b!important;position:relative!important;top:auto!important;display:block!important;border-radius:21px!important;overflow:hidden}
& .game.open .head{border-radius:21px 21px 0 0!important}
& .game .body{background:#100f24!important;border-radius:0 0 21px 21px}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:6px 14px 10px}
& .nxT{display:block;position:relative;overflow:hidden}
& .nxTop{position:absolute;z-index:3;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;gap:6px;font-size:11.5px;font-weight:700}
& .nxTop>span{padding:5px 10px;border-radius:99px;background:rgba(10,8,40,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
& .nxTit{display:none}
& .nxInfo{max-width:150px}
& .nxHora.vivo{background:#C0392B!important}
& .nxStars{letter-spacing:.14em;color:#FFD84A}
& .nxVs{position:relative;display:flex;justify-content:space-between;align-items:flex-start;padding:48px 12px 58px;background:linear-gradient(100deg,var(--ta,#5b6cf0) 0 46%,var(--th,#e0709a) 54% 100%)}
& .nxVs::before{content:"";position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 50% 125%,rgba(255,255,255,.14) 0 5deg,transparent 5deg 10deg)}
& .nxVs::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02) 30%,rgba(10,8,40,.82) 100%)}
& .nxSide{position:relative;z-index:1;width:104px;text-align:center}
& .nxLogo{width:78px;height:78px;margin:0 auto;border:3px solid #fff;font-size:24px;animation:nxFloat 3.4s ease-in-out infinite;background:var(--ta,#5b6cf0);box-shadow:0 14px 24px -10px rgba(0,0,0,.7)}
& .nxSide.h .nxLogo{background:var(--th,#e0709a);animation-delay:.7s}
& .nxAb{position:absolute;left:0;right:0;top:-34px;font:800 34px/1 ${ROUND};opacity:.26;z-index:-1}
& .nxNom{display:block;margin-top:6px;font-size:12.5px;font-weight:700;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxPc{display:none}
& .nxFoto{position:absolute;right:2px;top:50px;width:34px;height:34px;border:2px solid #fff;box-shadow:0 6px 12px -4px rgba(0,0,0,.7)}
& .nxSide.a .nxFoto{right:auto;left:2px}
& .nxPn{display:block;margin-top:2px;position:absolute;left:50%;transform:translateX(-50%);top:104px;white-space:nowrap;font-size:11px;font-weight:700;color:#DCDCFF;max-width:104px;overflow:hidden;text-overflow:ellipsis}
& .nxMid{position:absolute;z-index:4;left:50%;bottom:-34px;margin-left:-47px;width:94px;height:94px;border-radius:50%;background:#14122b;box-shadow:0 0 0 4px #7CFFB2,0 18px 28px -12px #7CFFB2}
& .nxMid .nxR0{stroke:rgba(255,255,255,.14);stroke-width:8}
& .nxMid .nxR1{stroke:#7CFFB2;stroke-width:8}
& .nxMT{z-index:1}
& .nxRn{font:800 26px/1 ${ROUND}}
& .nxRn::after{content:"%";font-size:12px}
& .nxRl{margin-top:3px;font-size:10.5px;font-weight:700;color:#DCDCFF;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar{display:none}
& .nxFoot{display:flex;align-items:center;gap:7px;padding:44px 12px 12px;background:#14122b}
& .nxPcF{display:none}
& .nxSello{padding:7px 11px;border-radius:99px;background:rgba(255,255,255,.1);border:2px solid #7FD8FF;color:#7FD8FF;font-size:12.5px}
& .nxSello.si{border-color:#7CFFB2;color:#7CFFB2}
& .nxSello.gris{border-color:#8F93B0;color:#C9CCDB}
& .nxFoot .sp{flex:1}
& .nxC{padding:7px 12px;border-radius:14px;background:rgba(255,255,255,.08);text-align:center}
& .nxC small{font-size:10.5px;color:#B3B2E6;font-weight:700}
& .nxC b{font-size:16px}
& .nxArt,& .nxFlap,& .nxCod,& .nxGauge{display:none}
`);

/* ===================================================================== 7 · CAMPO */
var CAMPO=dis('campo',`
&{--bg:#06140c;--bg1:#0d2418;--bg2:#12301f;--bg3:#1a4029;--line:#1f4a31;--line2:#2f6b47;--txt:#F4FFF6;--mut:#BFE3CB;--mut2:#98C9AA;--acc:#F2E14B;--acc2:#B8FF8A;--accTx:#10200F;--hot:#F2E14B;--hotTx:#10200F;--good:#7CFFA8;--bad:#FF9A8A;--info:#8FD8FF;--ia:#C4B6FF;--r:16px;--r2:24px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#06140c!important}
&,& body{color:var(--txt)!important}
& body{background:radial-gradient(120% 40% at 50% -6%,#1d5a35,transparent 65%) no-repeat fixed,#06140c!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
& :is(.topbar,header){background:rgba(6,20,12,.85)!important;border-bottom:1px solid #1f4a31!important}
& :is(.brand,header h1){font:900 23px/1 ${COND}!important;letter-spacing:.14em;color:#F2E14B!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;border-radius:0!important;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 6px)!important;background:#0a1d12!important;border:0!important;border-top:2px solid #2f6b47!important;box-shadow:none!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:transparent!important;color:#F2E14B!important;box-shadow:inset 0 3px 0 #F2E14B!important;border-radius:0!important}
& .game{border-radius:22px!important;background:#0d2418!important;border:1px solid #1f4a31!important;overflow:hidden;margin:0 0 12px;animation:nxRise .5s cubic-bezier(.2,.9,.3,1) both}
& .game.open{border-color:#F2E14B!important}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:6px 14px 10px}
& .nxT{display:block;position:relative;overflow:hidden;min-height:218px;background:repeating-linear-gradient(90deg,#1b6b3a 0 28px,#1f7a42 28px 56px)}
& .nxArt{display:block;position:absolute;inset:0;z-index:0;pointer-events:none}
& .nxArt svg{width:100%;height:100%;display:block}
& .nxArt .pu{animation:nxTwinkle 2.4s ease-in-out infinite}
& .nxTop{position:relative;z-index:3;display:flex;justify-content:space-between;gap:8px;padding:10px 12px 0;font:700 12.5px/1 ${COND};letter-spacing:.1em;text-transform:uppercase}
& .nxTop>span{padding:5px 9px;border-radius:8px;background:rgba(6,20,12,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
& .nxTit{display:none}
& .nxInfo{max-width:160px}
& .nxHora.vivo{background:#E04B3A!important}
& .nxVs{position:relative;z-index:2;height:128px}
& .nxSide{position:absolute;top:16px;width:104px;text-align:center}
& .nxSide.a{left:10px}
& .nxSide.h{right:10px}
& .nxLogo{width:58px;height:58px;margin:0 auto;border:3px solid #fff;font-size:19px;background:var(--ta,#3b82f6);box-shadow:0 10px 16px -6px rgba(0,0,0,.7)}
& .nxSide.h .nxLogo{background:var(--th,#ef4444)}
& .nxAb{display:none}
& .nxNom{display:block;margin-top:5px;font:800 13px/1 ${COND};letter-spacing:.05em;text-transform:uppercase;text-shadow:0 2px 4px rgba(0,0,0,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxPc{display:inline-block;margin-top:4px;padding:3px 9px;border-radius:99px;background:#F2E14B;color:#10200F;font:900 17px/1.1 ${COND}}
& .nxFoto{position:absolute;top:32px;width:34px;height:34px;border:2px solid #F2E14B}
& .nxSide.a .nxFoto{right:-14px}
& .nxSide.h .nxFoto{left:-14px}
& .nxPn{display:block;position:absolute;top:70px;white-space:nowrap;font:700 11px/1 ${COND};letter-spacing:.06em;text-transform:uppercase;text-shadow:0 2px 3px rgba(0,0,0,.8);max-width:80px;overflow:hidden;text-overflow:ellipsis}
& .nxSide.a .nxPn{right:-30px}
& .nxSide.h .nxPn{left:-30px}
& .nxMid{position:absolute;left:50%;top:30px;margin-left:-38px;width:76px;height:76px;border-radius:50%;background:rgba(6,20,12,.7)}
& .nxMid .nxR0{stroke:rgba(255,255,255,.2);stroke-width:9}
& .nxMid .nxR1{stroke:#F2E14B;stroke-width:9}
& .nxRn{font:900 24px/1 ${COND}}
& .nxRn::after{content:"%";font-size:11px}
& .nxRl{margin-top:2px;font:700 10px/1 ${COND};letter-spacing:.06em;text-transform:uppercase;max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar{position:relative;z-index:2;height:12px;margin:0 12px;border-radius:99px;overflow:hidden;background:rgba(6,20,12,.7)}
& .nxBar i{background:rgba(255,255,255,.45)}
& .nxBar i.w{background:#F2E14B;transform-origin:left;animation:nxGrow .9s .2s cubic-bezier(.3,.9,.3,1) both}
& .nxFoot{position:relative;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 12px 12px}
& .nxPcF{display:none}
& .nxSello{padding:6px 10px;border-radius:8px;background:#F2E14B;color:#10200F;font:900 14px/1 ${COND};letter-spacing:.06em;text-transform:uppercase}
& .nxSello.gris{background:#C9D4CD}
& .nxFoot .sp{flex:1}
& .nxC{text-align:center;padding:5px 10px;border-radius:8px;background:rgba(6,20,12,.72)}
& .nxC small{font:700 10.5px/1.1 ${COND};letter-spacing:.08em;text-transform:uppercase;color:#BFE3CB}
& .nxC b{font:900 18px/1.1 ${COND}}
& .nxFlap,& .nxCod,& .nxGauge,& .nxStars{display:none}
`);

/* ===================================================================== 8 · TELEMETRÍA */
var TELEM=dis('telemetria',`
&{--bg:#04080F;--bg1:#0A111C;--bg2:#101A29;--bg3:#16243A;--line:#1B2B44;--line2:#2A4468;--txt:#E6F1FF;--mut:#9FB6D3;--mut2:#7E97B8;--acc:#22E4FF;--acc2:#B8FF3C;--accTx:#001318;--hot:#B8FF3C;--hotTx:#0B1500;--good:#B8FF3C;--bad:#FF6B6B;--info:#22E4FF;--ia:#B49BFF;--r:6px;--r2:10px;--body:${MONO};color-scheme:dark}
&{background:#04080F!important}
&,& body{color:var(--txt)!important}
& body{background:linear-gradient(rgba(34,228,255,.04) 1px,transparent 1px) 0 0/100% 24px,#04080F!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
& :is(.topbar,header){background:#04080F!important;border-bottom:1px solid #1B2B44!important}
& :is(.brand,header h1){font:700 20px/1 ${MONO}!important;letter-spacing:.2em;color:#22E4FF!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;border-radius:0!important;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 6px)!important;background:#070D17!important;border:0!important;border-top:1px solid #1B2B44!important;box-shadow:none!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:transparent!important;color:#22E4FF!important;box-shadow:inset 0 2px 0 #22E4FF!important;border-radius:0!important}
& .game{border-radius:8px!important;background:#0A111C!important;border:1px solid #1B2B44!important;overflow:hidden;margin:0 0 12px;animation:nxDrop .45s ease both;position:relative}
& .game::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;z-index:3;background:linear-gradient(180deg,var(--ta,#22E4FF),var(--th,#B8FF3C))}
& .game.open{border-color:#22E4FF!important}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:6px 14px 10px}
& .nxT{display:block;position:relative;font-family:${MONO}}
& .nxTop{display:flex;gap:10px;align-items:center;padding:8px 12px 8px 16px;border-bottom:1px dashed #1B2B44;font:600 11.5px/1 ${MONO};letter-spacing:.08em;color:#7E97B8}
& .nxTop .nxHora{color:#22E4FF}
& .nxTop .nxHora.vivo{color:#FF6B6B}
& .nxTit{margin-left:auto;color:#E6F1FF}
& .nxInfo{display:none}
& .nxVs{display:grid;grid-template-columns:1fr 132px;grid-template-rows:auto auto;column-gap:8px;padding:10px 10px 4px 16px;align-items:center}
& .nxSide{grid-column:1;display:grid;grid-template-columns:30px 1fr auto 28px;align-items:center;gap:8px;padding:5px 0}
& .nxSide.a{grid-row:1}
& .nxSide.h{grid-row:2;border-top:1px dashed #1B2B44}
& .nxLogo{width:28px;height:28px;font-size:10px;background:var(--ta,#22E4FF)}
& .nxSide.h .nxLogo{background:var(--th,#B8FF3C)}
& .nxAb{display:none}
& .nxNom{font:600 13px/1.15 ${MONO};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxPc{font:700 17px/1 ${MONO};color:#22E4FF;font-variant-numeric:tabular-nums}
& .nxSide.h .nxPc{color:#B8FF3C}
& .nxFoto{width:26px;height:26px;border:1px solid #2A4468;grid-column:4}
& .nxPn{display:none}
& .nxMid{grid-column:2;grid-row:1 / span 2;position:relative;width:132px;height:100px}
& .nxRing{display:none}
& .nxMT{inset:auto 0 0 0;height:36px;justify-content:flex-end}
& .nxGauge{display:block;position:absolute;inset:0;width:100%;height:100%;overflow:visible}
& .nxGauge .g0{fill:none;stroke:#1B2B44;stroke-width:9}
& .nxGauge .g1{fill:none;stroke:#22E4FF;stroke-width:9;stroke-linecap:round;animation:n3Gauge 1.1s .2s cubic-bezier(.3,.8,.3,1) both}
& .nxGauge .nd{transform-origin:66px 62px;transform:rotate(var(--ang,0deg));animation:n3Needle 1.1s .2s cubic-bezier(.3,.8,.3,1) both}
& .nxRn{font:700 21px/1 ${MONO};color:#E6F1FF;font-variant-numeric:tabular-nums}
& .nxRn::after{content:"%";font-size:11px;color:#7E97B8}
& .nxRl{margin-top:2px;font:600 9.5px/1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:#7E97B8;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar{display:none}
& .nxFoot{display:flex;align-items:center;gap:8px;padding:8px 12px 10px 16px;border-top:1px dashed #1B2B44}
& .nxPcF{display:none}
& .nxSello{padding:4px 8px;border:1px solid #B8FF3C;color:#B8FF3C;border-radius:3px;font:700 11.5px/1 ${MONO};letter-spacing:.08em;text-transform:uppercase}
& .nxSello.gris{border-color:#5E7391;color:#9FB6D3}
& .nxFoot .sp{flex:1}
& .nxC{text-align:right}
& .nxC small{font:600 9.5px/1.1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:#7E97B8}
& .nxC b{font:700 15px/1.2 ${MONO};color:#E6F1FF}
& .nxArt,& .nxFlap,& .nxCod,& .nxStars{display:none}
`);

/* ===================================================================== 9 · MARCADOR */
var MARCADOR=dis('marcador',`
&{--bg:#0A0D08;--bg1:#14180F;--bg2:#1B2114;--bg3:#262E1B;--line:#2A3320;--line2:#3F4C2E;--txt:#FFF6DC;--mut:#D2C79B;--mut2:#B3A87F;--acc:#FFB000;--acc2:#FFD05A;--accTx:#1A1000;--hot:#FFB000;--hotTx:#1A1000;--good:#9CFF7A;--bad:#FF8A70;--info:#8FD8FF;--ia:#C9B8FF;--r:10px;--r2:16px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#0A0D08!important}
&,& body{color:var(--txt)!important}
& body{background:radial-gradient(110% 40% at 50% -8%,#2d3a18,transparent 65%) no-repeat fixed,#0A0D08!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
& :is(.topbar,header){background:#0A0D08!important;border-bottom:2px solid #FFB000!important}
& :is(.brand,header h1){font:900 22px/1 ${COND}!important;letter-spacing:.16em;color:#FFB000!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;border-radius:0!important;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 6px)!important;background:#0F130A!important;border:0!important;border-top:2px solid #FFB000!important;box-shadow:none!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:transparent!important;color:#FFB000!important;box-shadow:inset 0 3px 0 #FFB000!important;border-radius:0!important}
& .game{border-radius:14px!important;background:#14180F!important;border:2px solid #2A3320!important;overflow:hidden;margin:0 0 12px;animation:nxRise .5s cubic-bezier(.2,.9,.3,1) both}
& .game.open{border-color:#FFB000!important}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:6px 14px 10px}
& .nxT{display:block;position:relative;background:repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0 2px,transparent 2px 4px),#0F130A}
& .nxTop{display:flex;justify-content:space-between;gap:8px;padding:9px 12px 7px;font:700 12px/1 ${COND};letter-spacing:.14em;text-transform:uppercase;color:#FFB000}
& .nxTop .nxHora.vivo{color:#FF6B4A}
& .nxTit{display:none}
& .nxInfo{color:#B3A87F;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxVs{display:flex;justify-content:space-between;align-items:stretch;gap:8px;padding:2px 10px 10px}
& .nxSide{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px;border-radius:10px;background:#0A0D08;border:1px solid #2A3320;min-width:0}
& .nxLogo{width:34px;height:34px;font-size:11px;background:var(--ta,#444)}
& .nxSide.h .nxLogo{background:var(--th,#444)}
& .nxAb,& .nxNom,& .nxPc,& .nxRing,& .nxMT,& .nxMid{display:none}
& .nxFlap{display:flex;gap:3px;justify-content:center}
& .nxFlap.fx{margin-top:2px}
& .fp{position:relative;display:inline-flex;align-items:center;justify-content:center;width:22px;height:34px;border-radius:4px;background:linear-gradient(180deg,#1d1d1d 0 50%,#101010 50%);color:#FFD05A;font:900 22px/1 ${COND};box-shadow:inset 0 0 0 1px #000;animation:n3Flip .55s calc(var(--i,0)*.09s + .1s) cubic-bezier(.3,.9,.3,1) both}
& .fp::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#000}
& .nxFlap.big .fp{width:30px;height:48px;font-size:34px;color:#FFB000}
& .nxFlap.big.w .fp{color:#9CFF7A}
& .nxFoto{width:26px;height:26px;border:1px solid #FFB000}
& .nxPn{display:block;font:700 11px/1 ${COND};letter-spacing:.06em;text-transform:uppercase;color:#D2C79B;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxBar{display:none}
& .nxFoot{display:flex;align-items:center;gap:8px;padding:8px 12px 10px;border-top:1px solid #2A3320}
& .nxPcF{display:none}
& .nxSello{padding:5px 9px;background:#FFB000;color:#1A1000;border-radius:3px;font:900 13px/1 ${COND};letter-spacing:.1em;text-transform:uppercase}
& .nxSello.gris{background:#8A8466}
& .nxFoot .sp{flex:1}
& .nxC{text-align:center;padding:3px 9px;border-radius:4px;background:#0A0D08;border:1px solid #2A3320}
& .nxC small{font:700 10px/1.1 ${COND};letter-spacing:.12em;text-transform:uppercase;color:#B3A87F}
& .nxC b{font:900 18px/1.1 ${COND};color:#FFD05A}
& .nxArt,& .nxCod,& .nxGauge,& .nxStars{display:none}
`);

/* ===================================================================== 10 · RECIBO */
var RECIBO=dis('recibo',`
&{--bg:#101114;--bg1:#191B20;--bg2:#21242B;--bg3:#2B2F38;--line:#2B2F38;--line2:#3F4450;--txt:#F6F2E6;--mut:#C9C4B3;--mut2:#A9A494;--acc:#FF5A3C;--acc2:#FF9A7E;--accTx:#FFFFFF;--hot:#FF5A3C;--hotTx:#FFFFFF;--good:#7CE0A1;--bad:#FF8A70;--info:#8FD8FF;--ia:#C9B8FF;--r:12px;--r2:18px;--body:system-ui,-apple-system,sans-serif;color-scheme:dark}
&{background:#101114!important}
&,& body{color:var(--txt)!important}
& body{background:#101114!important;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important}
& :is(.topbar,header){background:#101114!important;border-bottom:1px dashed #3F4450!important}
& :is(.brand,header h1){font:700 20px/1 ${MONO}!important;letter-spacing:.18em;color:#F6F2E6!important;background:none!important;-webkit-text-fill-color:currentColor!important}
& :is(.navbar,.tabbar){left:0!important;right:0!important;bottom:0!important;width:auto!important;border-radius:0!important;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 6px)!important;background:#15171B!important;border:0!important;border-top:1px dashed #3F4450!important;box-shadow:none!important}
& :is(.navbar button.on,.tabbar .tbar-btn.on){background:transparent!important;color:#FF5A3C!important;box-shadow:inset 0 3px 0 #FF5A3C!important;border-radius:0!important}
& .game{border-radius:6px!important;background:#191B20!important;border:0!important;overflow:visible;margin:0 0 14px;filter:drop-shadow(0 14px 14px rgba(0,0,0,.45))}
& .game .head{padding:0!important;background:transparent!important;position:relative!important;top:auto!important;display:block!important}
& .game .head>:not(.nxT):not(.bug){display:none!important}
& .game .head .bug{margin:0;padding:8px 14px 10px;background:#191B20}
& .game .body{background:#191B20!important;border-radius:0 0 8px 8px}
& .nxT{display:block;position:relative;padding:14px 16px 12px;background:#F6F2E6;color:#1A1814;font-family:${MONO};animation:n3Print .9s cubic-bezier(.3,.8,.3,1) both;-webkit-mask:radial-gradient(circle 7px at 7px 0,#0000 98%,#000) -7px 0/14px 100% repeat-x,linear-gradient(#000 0 0);-webkit-mask-composite:source-in;mask:radial-gradient(circle 7px at 7px 0,#0000 98%,#000) -7px 0/14px 100% repeat-x,linear-gradient(#000 0 0);mask-composite:intersect}
& .game.open .nxT{-webkit-mask:none;mask:none}
& .nxTop{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;padding-bottom:9px;border-bottom:2px dashed #1A1814;font:700 11.5px/1.2 ${MONO};letter-spacing:.12em;text-transform:uppercase}
& .nxTit{order:-1;font:900 19px/1.1 ${MONO};letter-spacing:.06em}
& .nxHora.vivo{color:#C0261A}
& .nxInfo{font-weight:600;color:#5C564A;text-transform:none;letter-spacing:.02em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
& .nxVs{display:block;padding:8px 0 4px}
& .nxMid{display:none}
& .nxSide{display:grid;grid-template-columns:24px 1fr auto;align-items:center;column-gap:8px;padding:5px 0}
& .nxLogo{width:22px;height:22px;font-size:8px;background:#1A1814!important;filter:grayscale(1) contrast(1.1)}
& .nxAb{display:none}
& .nxNom{font:700 14px/1.1 ${MONO};text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-bottom:0}
& .nxPc{font:900 20px/1 ${MONO};font-variant-numeric:tabular-nums}
& .nxFoto{display:none}
& .nxPn{display:block;grid-column:2 / span 2;font:600 11px/1 ${MONO};color:#5C564A;text-transform:uppercase}
& .nxPn::before{content:"P · "}
& .nxBar{height:9px;margin:4px 0 6px;border:2px solid #1A1814;gap:0;background:#fff}
& .nxBar i{background:repeating-linear-gradient(90deg,#1A1814 0 2px,transparent 2px 4px)}
& .nxBar i.w{background:#1A1814}
& .nxFoot{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding-top:8px;border-top:2px dashed #1A1814}
& .nxPcF{display:none}
& .nxFoot .sp{display:none}
& .nxSello{grid-row:1 / span 3;grid-column:2;justify-self:end;align-self:center;padding:9px 11px;border:3px solid #C0261A;color:#C0261A;border-radius:10px;font:900 15px/1.05 ${MONO};letter-spacing:.06em;text-transform:uppercase;transform:rotate(-8deg);animation:nxPop .6s .5s cubic-bezier(.3,1.4,.5,1) both;max-width:130px;white-space:normal;text-align:center}
& .nxSello.si{border-color:#0B7A3B;color:#0B7A3B}
& .nxSello.gris{border-color:#6B655A;color:#6B655A}
& .nxC{display:flex;justify-content:space-between;align-items:baseline;gap:6px;grid-column:1}
& .nxC small{display:inline;flex:0 0 auto;font:600 12px/1.3 ${MONO};text-transform:uppercase;color:#1A1814}
& .nxC::before{content:"";order:1;flex:1;border-bottom:2px dotted #1A1814;transform:translateY(-3px)}
& .nxC small{order:0}
& .nxC b{order:2;display:inline;font:900 15px/1.3 ${MONO}}
& .nxCod{display:block;height:26px;margin-top:10px;background:repeating-linear-gradient(90deg,#1A1814 0 2px,transparent 2px 4px,#1A1814 4px 5px,transparent 5px 8px,#1A1814 8px 11px,transparent 11px 13px,#1A1814 13px 14px,transparent 14px 17px)}
& .nxArt,& .nxFlap,& .nxGauge,& .nxStars{display:none}
`);

var CSS_ALL=[BASE,HISTORIAS,DUELO,BENTO,AGENDA,RADARV,CROMOS,CAMPO,TELEM,MARCADOR,RECIBO].join('\n');
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
/* foto del abridor (misma fuente que usa la app en la pestaña de abridores) + apellido */
function foto(p){
  var f=T('span','nxFoto'), i=T('i','','⚾'); f.appendChild(i);
  var im=T('img'); im.alt=''; im.loading='lazy';
  im.onload=function(){ i.style.display='none'; }; im.onerror=function(){ im.style.display='none'; };
  im.src='https://midfield.mlbstatic.com/v1/people/'+encodeURIComponent(p.id)+'/spots/120'; f.appendChild(im);
  var nom=String(p.n||'').trim().split(/\s+/), ap=nom.length>1?nom.slice(1).join(' '):nom[0];
  f.appendChild(T('b','nxPn',ap||''));
  return f;
}
var ESTADIO='<svg viewBox="0 0 362 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 150V70Q50 30 112 54T236 40T362 62V150Z" fill="rgba(5,7,25,.55)"/><polygon points="181,24 262,95 181,150 100,95" fill="rgba(52,211,100,.26)" stroke="rgba(255,255,255,.32)" stroke-width="1.5"/><circle cx="181" cy="24" r="3.5" fill="#fff"/><circle cx="262" cy="95" r="3.5" fill="#fff"/><circle cx="100" cy="95" r="3.5" fill="#fff"/><g class="tw"><rect x="38" y="20" width="4" height="52" fill="#9AA3E6"/><circle cx="40" cy="16" r="9" fill="#fff" opacity=".9"/></g><g class="tw" style="animation-delay:1.1s"><rect x="320" y="16" width="4" height="56" fill="#9AA3E6"/><circle cx="322" cy="12" r="9" fill="#fff" opacity=".9"/></g></svg>';


/* ---------- piezas extra de los diseños nuevos (solo dibujos y números que ya salen de la tarjeta) ---------- */
var CAMPO_SVG='<svg viewBox="0 0 362 218" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M181 206 L10 70 Q181 -40 352 70 Z" fill="rgba(0,0,0,.14)" stroke="rgba(255,255,255,.55)" stroke-width="2"/><polygon points="181,70 262,138 181,206 100,138" fill="#B9794A" stroke="rgba(255,255,255,.7)" stroke-width="2"/><polygon points="181,92 240,138 181,184 122,138" fill="#2a8a4a"/><circle cx="181" cy="138" r="8" fill="#C98F5C"/><g fill="#fff"><rect class="pu" x="176" y="65" width="10" height="10" transform="rotate(45 181 70)"/><rect x="257" y="133" width="10" height="10" transform="rotate(45 262 138)"/><rect x="95" y="133" width="10" height="10" transform="rotate(45 100 138)"/><polygon points="181,198 188,203 188,210 174,210 174,203"/></g></svg>';
/* cada deporte dibuja su propia cancha: el diamante solo es de MLB */
var CAMPO_SVGS={
 nhl:'<svg viewBox="0 0 362 218" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="14" y="52" width="334" height="156" rx="52" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.7)" stroke-width="2.5"/><line x1="181" y1="52" x2="181" y2="208" stroke="#FF6B6B" stroke-width="3"/><line x1="126" y1="52" x2="126" y2="208" stroke="#6AA5FF" stroke-width="3"/><line x1="236" y1="52" x2="236" y2="208" stroke="#6AA5FF" stroke-width="3"/><line x1="46" y1="60" x2="46" y2="200" stroke="#FF6B6B" stroke-width="1.5"/><line x1="316" y1="60" x2="316" y2="200" stroke="#FF6B6B" stroke-width="1.5"/><circle cx="181" cy="130" r="24" fill="none" stroke="#6AA5FF" stroke-width="2"/><circle cx="181" cy="130" r="3.5" fill="#6AA5FF"/><g fill="none" stroke="#FF6B6B" stroke-width="1.8"><circle cx="86" cy="96" r="15"/><circle cx="86" cy="164" r="15"/><circle cx="276" cy="96" r="15"/><circle cx="276" cy="164" r="15"/><path d="M46 112a18 18 0 0 1 0 36M316 112a18 18 0 0 0 0 36"/></g></svg>',
 nfl:'<svg viewBox="0 0 362 218" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="10" y="54" width="342" height="154" fill="rgba(0,0,0,.12)" stroke="rgba(255,255,255,.7)" stroke-width="2.5"/><rect x="10" y="54" width="36" height="154" fill="rgba(255,255,255,.14)"/><rect x="316" y="54" width="36" height="154" fill="rgba(255,255,255,.14)"/><g stroke="rgba(255,255,255,.55)" stroke-width="2"><line x1="46" y1="54" x2="46" y2="208"/><line x1="316" y1="54" x2="316" y2="208"/><line x1="84" y1="54" x2="84" y2="208"/><line x1="122" y1="54" x2="122" y2="208"/><line x1="160" y1="54" x2="160" y2="208"/><line x1="181" y1="54" x2="181" y2="208" stroke-width="3"/><line x1="202" y1="54" x2="202" y2="208"/><line x1="240" y1="54" x2="240" y2="208"/><line x1="278" y1="54" x2="278" y2="208"/></g><g stroke="rgba(255,255,255,.4)" stroke-width="1.2"><path d="M46 112h270M46 150h270" stroke-dasharray="2 8"/></g><ellipse cx="181" cy="131" rx="13" ry="8" fill="#B9794A" stroke="#fff" stroke-width="1.5"/></svg>',
 nba:'<svg viewBox="0 0 362 218" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="14" y="54" width="334" height="154" fill="rgba(210,140,70,.30)" stroke="rgba(255,255,255,.7)" stroke-width="2.5"/><line x1="181" y1="54" x2="181" y2="208" stroke="rgba(255,255,255,.65)" stroke-width="2"/><circle cx="181" cy="131" r="24" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"/><g fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"><rect x="14" y="101" width="62" height="60"/><rect x="286" y="101" width="62" height="60"/><path d="M14 78h38a62 62 0 0 1 0 106H14M348 78h-38a62 62 0 0 0 0 106h38"/><circle cx="76" cy="131" r="14"/><circle cx="286" cy="131" r="14"/></g><g fill="#FF8A4C"><circle cx="30" cy="131" r="4.5"/><circle cx="332" cy="131" r="4.5"/></g></svg>',
 fut:'<svg viewBox="0 0 362 218" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="12" y="54" width="338" height="154" fill="rgba(0,0,0,.12)" stroke="rgba(255,255,255,.7)" stroke-width="2.5"/><line x1="181" y1="54" x2="181" y2="208" stroke="rgba(255,255,255,.65)" stroke-width="2"/><circle cx="181" cy="131" r="26" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"/><circle cx="181" cy="131" r="3" fill="#fff"/><g fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"><rect x="12" y="92" width="52" height="78"/><rect x="298" y="92" width="52" height="78"/><rect x="12" y="112" width="20" height="38"/><rect x="330" y="112" width="20" height="38"/><path d="M64 118a22 22 0 0 1 0 26M298 118a22 22 0 0 0 0 26"/></g></svg>'
};
function campoSvg(){ var a=''; try{ a=html&&html.getAttribute('data-app'); }catch(e){} return CAMPO_SVGS[a]||CAMPO_SVG; }
function decorar(u,t,o,tiene,pf,aA,aH){
  if(u==='cromos'&&tiene){
    var n=o.tono==='si'?3:(o.tono==='gris'?1:2), tp=t.querySelector('.nxTop');
    if(tp) tp.appendChild(T('span','nxStars','★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n)));
  }
  if(u==='campo'){ var a=T('div','nxArt'); a.innerHTML=campoSvg(); t.insertBefore(a,t.firstChild); }
  if(u==='telemetria'&&tiene){
    var mid=t.querySelector('.nxMid'), rg=mid&&mid.querySelector('.nxRing'); if(rg) rg.remove();
    if(mid){
      var gs=doc.createElementNS(NS,'svg'); gs.setAttribute('viewBox','0 0 132 100'); gs.setAttribute('class','nxGauge'); gs.setAttribute('aria-hidden','true');
      var len=Math.max(0,Math.min(1,(pf-50)/28)), ang=(len*180-90).toFixed(1);
      gs.innerHTML='<path class="g0" d="M14 62A52 52 0 0 1 118 62"/><path class="g1" d="M14 62A52 52 0 0 1 118 62" style="stroke-dasharray:'+(len*163.4).toFixed(1)+' 163.4"/><g class="nd" style="--ang:'+ang+'deg"><line x1="66" y1="62" x2="66" y2="18" stroke="#E6F1FF" stroke-width="2.5" stroke-linecap="round"/><circle cx="66" cy="62" r="5" fill="#E6F1FF"/></g>';
      mid.insertBefore(gs,mid.firstChild);
    }
  }
  if(u==='marcador'&&tiene){
    [].forEach.call(t.querySelectorAll('.nxSide'),function(s,k){
      var ab=k===0?aA:aH, pc=k===0?o.pa:o.ph, gana=k===0?o.pa>o.ph:o.ph>=o.pa;
      function celdas(txt,cls){ var f=T('div','nxFlap '+cls); String(txt).split('').forEach(function(ch,i){ var c=T('span','fp',ch); c.style.setProperty('--i',String(i+(k?3:0))); f.appendChild(c); }); return f; }
      var lg=s.querySelector('.nxLogo');
      var f1=celdas(ab.slice(0,4),'fx'), f2=celdas(pc,'big'+(gana?' w':''));
      if(lg&&lg.nextSibling){ s.insertBefore(f1,lg.nextSibling); s.insertBefore(f2,f1.nextSibling); } else { s.appendChild(f1); s.appendChild(f2); }
    });
  }
  if(u==='recibo') t.appendChild(T('div','nxCod'));
}

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
  function lado(cls,ab,src,nom,pc,pit){
    var s=T('div','nxSide '+cls); s.appendChild(logo(src,ab)); s.appendChild(T('span','nxAb',ab)); s.appendChild(T('span','nxNom',nom||ab));
    s.appendChild(T('span','nxPc',pc!=null?pc+'%':''));
    if(pit&&pit.id){ s.appendChild(foto(pit)); }
    return s;
  }
  vs.appendChild(lado('a',aA,o.ea,o.na,tiene?o.pa:null,g._pit&&g._pit.a));
  var mid=T('div','nxMid');
  if(tiene){
    mid.appendChild(anillo(pf));
    var mt=T('div','nxMT'); mt.appendChild(T('span','nxRn',String(pf))); mt.appendChild(T('span','nxRl','gana '+(favA?aA:aH))); mid.appendChild(mt);
  }
  mid.appendChild(T('span','nxVsb','VS'));
  vs.appendChild(mid);
  vs.appendChild(lado('h',aH,o.eh,o.nh,tiene?o.ph:null,g._pit&&g._pit.h));
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
  decorar(u,t,o,tiene,pf,aA,aH);
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
