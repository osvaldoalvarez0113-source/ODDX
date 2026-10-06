/* OVA · presentaciones del inicio (hub)  v1
   6 estilos: Oro negro (el clásico, intacto), Aurora, Estadio, Neón, Constelación y Cristal.
   Cómo cambiar: mantén presionado el logo "O V A" o el título unos 0.7 segundos.
   También por enlace:  hub.html?estilo=aurora   (oro · aurora · estadio · neon · const · cristal)
   No toca las apps, ni los enlaces, ni ningún cálculo. Si algo fallara, el hub se queda como el clásico. */
(function(root){
"use strict";
var doc=root.document, html=doc&&doc.documentElement;
var KEY='ova_hub';
var ESTILOS=[
 {id:'oro',n:'Oro negro',d:'El clásico',sw:'linear-gradient(135deg,#0A0908,#3b2d10 60%,#C9A24A)'},
 {id:'aurora',n:'Aurora',d:'Luces que fluyen',sw:'radial-gradient(circle at 20% 30%,#2de2c0cc,transparent 55%),radial-gradient(circle at 80% 70%,#7b5cffcc,transparent 55%),radial-gradient(circle at 60% 10%,#ff5fa2bb,transparent 50%),#050612'},
 {id:'estadio',n:'Estadio',d:'Reflectores de noche',sw:'linear-gradient(0deg,#1e7a3c88,transparent 45%),linear-gradient(180deg,rgba(255,250,225,.55),transparent 70%),#03060c'},
 {id:'neon',n:'Neón',d:'Retro synthwave',sw:'linear-gradient(180deg,#0a0220 0%,#2a0a4a 50%,#ff4fe6 52%,#22d3ee 72%,#0a0220 100%)'},
 {id:'const',n:'Constelación',d:'Estrellas vivas',sw:'radial-gradient(circle at 30% 40%,#F0CE6B 0 2px,transparent 3px),radial-gradient(circle at 72% 28%,#fff 0 2px,transparent 3px),radial-gradient(circle at 55% 75%,#F0CE6B 0 2px,transparent 3px),radial-gradient(120% 90% at 50% 0%,#16254a,#050912)'},
 {id:'cristal',n:'Cristal',d:'Vidrio y agua',sw:'radial-gradient(circle at 25% 30%,#3b82f6cc,transparent 55%),radial-gradient(circle at 75% 70%,#22d3eecc,transparent 55%),radial-gradient(circle at 60% 20%,#fbbf24bb,transparent 45%),#070b14'}
];
var BY={};ESTILOS.forEach(function(e){BY[e.id]=e;});
var INTRO_MS={aurora:2600,estadio:2800,neon:2500,'const':2500,cristal:2600};
var reduce=false;try{reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){}

/* ===================================================================== CSS */
var CSS=[
'@property --ang{syntax:"<angle>";inherits:false;initial-value:0deg}',
'.brandbar,html h1{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',

/* ---------- comunes a los estilos nuevos ---------- */
'html[data-hub]:not([data-hub="oro"]) body::before{display:none}',
'html[data-hub]:not([data-hub="oro"]) #splash{display:none!important}',
'html[data-hub]:not([data-hub="oro"]) .wrap{position:relative;z-index:2}',
'html[data-hub]:not([data-hub="oro"]) .foot{display:none}',
'html[data-hub]:not([data-hub="oro"]) .card{--mx:72%;--my:18%}',
'#hubBg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}',
'#hubBg .par{position:absolute;inset:-4%;transition:transform .6s cubic-bezier(.2,.7,.2,1);transform:translate3d(calc(var(--px,0)*16px),calc(var(--py,0)*16px),0)}',
'#hubBg canvas{position:absolute;inset:0;width:100%;height:100%}',
'#hubIntro{position:fixed;inset:0;z-index:99990;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;transition:opacity .75s ease,visibility .75s ease}',
'#hubIntro.fuera{opacity:0;visibility:hidden;pointer-events:none}',
'html.hub-intro .wrap *{animation-play-state:paused!important}',
'#hubIntro .ltr{display:inline-block;opacity:0;animation:hubLetter 1.1s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.25s + var(--i)*.13s)}',
'#hubIntro .word{display:flex;gap:.12em;font-weight:800;line-height:1}',
'@keyframes hubLetter{from{opacity:0;transform:translateY(26px) scale(.55);filter:blur(12px);letter-spacing:.6em}to{opacity:1;transform:none;filter:blur(0)}}',
'@keyframes hubGrad{to{background-position:300% 0}}',
'@keyframes hubIn{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}',
'@keyframes hubInTilt{from{opacity:0;transform:perspective(800px) rotateX(-26deg) translateY(44px)}to{opacity:1;transform:none}}',
'@keyframes hubFade{from{opacity:0}to{opacity:1}}',
'@keyframes hubSpin{to{--ang:360deg}}',
'@keyframes hubShine{0%,62%{left:-60%}100%{left:140%}}',
'@keyframes hubBob{0%,100%{translate:0 0}50%{translate:0 -6px}}',
'@keyframes hubRip{to{transform:scale(16);opacity:0}}',
'.hubRipple{position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid rgba(255,255,255,.75);pointer-events:none;z-index:60;animation:hubRip .85s ease-out forwards}',
'html[data-hub] .card .glow{inset:0;top:0;right:0;width:100%;height:100%;border-radius:0;filter:none;opacity:1;transition:opacity .3s}',
'html[data-hub] .card::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:-60%;transform:skewX(-18deg);pointer-events:none;z-index:0;background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);animation:hubShine 7.5s ease-in-out infinite}',
'html[data-hub] .card:nth-child(2)::after{animation-delay:1.6s}',
'html[data-hub] .card:nth-child(3)::after{animation-delay:3.2s}',

/* ===================================================================== AURORA */
'html[data-hub="aurora"]{--bg:#050612;--txt:#F2F4FF;--mut:#BAC1E8;--mut2:#8A92C4;--hot:#8CF5E1;--acc:#8CF5E1;--acc2:#C7B8FF}',
'html[data-hub="aurora"] body{background:#050612}',
'.hb-aurora .blob{position:absolute;border-radius:50%;will-change:transform}',
'.hb-aurora .b1{width:92vmax;height:92vmax;left:-38vmax;top:-48vmax;background:radial-gradient(circle,rgba(45,226,192,.6),transparent 62%);animation:aurA 21s ease-in-out infinite alternate}',
'.hb-aurora .b2{width:82vmax;height:82vmax;right:-42vmax;top:4vh;background:radial-gradient(circle,rgba(123,92,255,.62),transparent 62%);animation:aurB 26s ease-in-out infinite alternate}',
'.hb-aurora .b3{width:88vmax;height:88vmax;left:-22vmax;bottom:-56vmax;background:radial-gradient(circle,rgba(255,95,162,.45),transparent 62%);animation:aurC 30s ease-in-out infinite alternate}',
'.hb-aurora .b4{width:50vmax;height:50vmax;right:-10vmax;bottom:6vh;background:radial-gradient(circle,rgba(80,170,255,.4),transparent 62%);animation:aurA 24s ease-in-out infinite alternate-reverse}',
'@keyframes aurA{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(26vw,15vh,0) scale(1.28)}}',
'@keyframes aurB{from{transform:translate3d(0,0,0) scale(1.1)}to{transform:translate3d(-30vw,22vh,0) scale(.9)}}',
'@keyframes aurC{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(30vw,-18vh,0) scale(1.2)}}',
'html[data-hub="aurora"] h1{background:linear-gradient(90deg,#fff 0%,#8CF5E1 28%,#C7B8FF 55%,#ffb3dc 78%,#fff 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:riseIn .7s cubic-bezier(.22,.7,.3,1) forwards .28s,hubGrad 8s linear infinite}',
'html[data-hub="aurora"] .brand{color:#C7D0FF}',
'html[data-hub="aurora"] .brand span{color:#8CF5E1}',
'html[data-hub="aurora"] .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(26px) saturate(170%);backdrop-filter:blur(26px) saturate(170%);box-shadow:0 1px 0 rgba(255,255,255,.14) inset,0 30px 60px -30px rgba(0,0,0,.85);animation:hubIn .9s cubic-bezier(.22,.7,.3,1) forwards}',
'html[data-hub="aurora"] .card:nth-child(1){animation-delay:.12s}',
'html[data-hub="aurora"] .card:nth-child(2){animation-delay:.27s}',
'html[data-hub="aurora"] .card:nth-child(3){animation-delay:.42s}',
'html[data-hub="aurora"] .card::before{background:conic-gradient(from var(--ang),rgba(255,255,255,0) 0 58%,rgba(140,245,225,.95) 78%,rgba(199,184,255,.95) 90%,rgba(255,255,255,0) 100%);animation:hubSpin 5.5s linear infinite}',
'html[data-hub="aurora"] .card:nth-child(2)::before{animation-delay:-1.8s}',
'html[data-hub="aurora"] .card:nth-child(3)::before{animation-delay:-3.6s}',
'html[data-hub="aurora"] .card .glow{background:radial-gradient(240px circle at var(--mx) var(--my),rgba(140,245,225,.2),transparent 70%)}',
'html[data-hub="aurora"] .ico{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22)}',
'html[data-hub="aurora"] .badge{color:#8CF5E1;background:rgba(140,245,225,.1);border-color:rgba(140,245,225,.32)}',
'html[data-hub="aurora"] .arrow{color:#C7D0FF}',
'html[data-hub="aurora"] .hubRipple{border-color:rgba(140,245,225,.85)}',
'#hubIntro.hi-aurora{background:#050612}',
'#hubIntro.hi-aurora .word{font-size:84px;color:#fff;text-shadow:0 0 40px rgba(140,245,225,.55)}',
'#hubIntro.hi-aurora .orb{position:absolute;border-radius:50%;opacity:0;animation:hubFade 1.4s ease forwards}',
'#hubIntro.hi-aurora .o1{width:120vmax;height:120vmax;left:-50vmax;top:-60vmax;background:radial-gradient(circle,rgba(45,226,192,.45),transparent 60%)}',
'#hubIntro.hi-aurora .o2{width:110vmax;height:110vmax;right:-55vmax;bottom:-55vmax;background:radial-gradient(circle,rgba(123,92,255,.5),transparent 60%);animation-delay:.3s}',
'#hubIntro.hi-aurora .line{height:2px;width:0;margin-top:22px;background:linear-gradient(90deg,transparent,#8CF5E1,#C7B8FF,transparent);animation:hubLine 1.3s .9s cubic-bezier(.2,.8,.2,1) forwards}',
'@keyframes hubLine{to{width:62vw}}',

/* ===================================================================== ESTADIO */
'html[data-hub="estadio"]{--bg:#03060c;--txt:#FBF8EC;--mut:#D0CBB6;--mut2:#9A9680;--hot:#FFE9A0;--acc:#FFE9A0;--acc2:#FFF3C8}',
'html[data-hub="estadio"] body{background:#03060c}',
'.hb-estadio .haze{position:absolute;inset:0;background:radial-gradient(ellipse 80% 55% at 50% 0%,rgba(255,244,200,.2),transparent 70%)}',
'.hb-estadio .beam{position:absolute;top:-6vh;left:50%;width:58vw;height:130vh;margin-left:-29vw;transform-origin:50% 0;background:linear-gradient(to bottom,rgba(255,248,215,.36),rgba(255,248,215,.07) 55%,transparent 88%);-webkit-clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);mix-blend-mode:screen;opacity:0;transform:rotate(var(--r));animation:hubBeamOn 1.4s ease-out forwards,hubSway var(--d) ease-in-out infinite alternate}',
'.hb-estadio .beam.l{left:14%}',
'.hb-estadio .beam.r{left:86%}',
'@keyframes hubBeamOn{to{opacity:1}}',
'@keyframes hubSway{from{transform:rotate(calc(var(--r) - 8deg))}to{transform:rotate(calc(var(--r) + 8deg))}}',
'.hb-estadio .lamp{position:absolute;top:-34px;width:96px;height:96px;margin-left:-48px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.98),rgba(255,244,200,.55) 30%,transparent 70%);animation:hubLamp 3.8s ease-in-out infinite alternate}',
'.hb-estadio .floor{position:absolute;left:0;right:0;bottom:0;height:46vh;background:radial-gradient(ellipse 115% 100% at 50% 100%,rgba(40,170,85,.46),rgba(20,95,48,.2) 45%,transparent 72%)}',
'@keyframes hubLamp{from{opacity:.7}to{opacity:1}}',
'.hb-estadio .pitch{position:absolute;left:-30%;right:-30%;bottom:-10vh;height:52vh;background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 2px,transparent 2px 15vw),radial-gradient(ellipse at 50% 100%,rgba(34,140,70,.5),transparent 72%);transform:perspective(520px) rotateX(60deg);transform-origin:50% 100%}',
'.hb-estadio .dust i{position:absolute;bottom:-12px;border-radius:50%;background:rgba(255,244,200,.8);opacity:0;animation:hubDust linear infinite}',
'@keyframes hubDust{0%{transform:translateY(0);opacity:0}12%{opacity:.8}100%{transform:translateY(-105vh) translateX(var(--dx));opacity:0}}',
'html[data-hub="estadio"] h1{color:#fff;text-shadow:0 0 28px rgba(255,235,160,.45)}',
'html[data-hub="estadio"] .brand{color:#E9DFB8}',
'html[data-hub="estadio"] .card{background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02));border:1px solid rgba(255,235,170,.24);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 30px 60px -28px rgba(0,0,0,.9),0 0 0 1px rgba(0,0,0,.2);transform-origin:50% 0;animation:hubInTilt 1s cubic-bezier(.22,.7,.3,1) forwards}',
'html[data-hub="estadio"] .card:nth-child(1){animation-delay:.15s}',
'html[data-hub="estadio"] .card:nth-child(2){animation-delay:.33s}',
'html[data-hub="estadio"] .card:nth-child(3){animation-delay:.51s}',
'html[data-hub="estadio"] .card::before{background:linear-gradient(150deg,rgba(255,235,170,.7),transparent 45%,rgba(255,235,170,.35))}',
'html[data-hub="estadio"] .card .glow{background:radial-gradient(260px circle at var(--mx) var(--my),rgba(255,240,190,.24),transparent 70%)}',
'html[data-hub="estadio"] .ico{background:rgba(255,235,170,.08);border-color:rgba(255,235,170,.3)}',
'html[data-hub="estadio"] .badge{color:#FFE9A0;background:rgba(255,233,160,.1);border-color:rgba(255,233,160,.34)}',
'#hubIntro.hi-estadio{background:#000}',
'#hubIntro.hi-estadio .flash{position:absolute;inset:0;background:#fff;opacity:0;animation:hubFlash 1.5s linear forwards}',
'@keyframes hubFlash{0%{opacity:0}6%{opacity:.95}12%{opacity:0}28%{opacity:.75}36%{opacity:.05}52%{opacity:1}100%{opacity:0}}',
'#hubIntro.hi-estadio .word{font-size:84px;color:#fff;text-shadow:0 0 36px rgba(255,235,160,.7)}',
'#hubIntro.hi-estadio .ltr{animation-delay:calc(.95s + var(--i)*.13s)}',
'#hubIntro.hi-estadio .flare{height:2px;width:0;margin-top:20px;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 28px 6px rgba(255,240,180,.65);animation:hubFlare 1.2s 1.1s ease-out forwards}',
'@keyframes hubFlare{0%{width:0;opacity:1}100%{width:86vw;opacity:.8}}',

/* ===================================================================== NEON */
'html[data-hub="neon"]{--bg:#0a0220;--txt:#F7F0FF;--mut:#C9B8F0;--mut2:#9A88C8;--hot:#FF4FE6;--acc:#22D3EE;--acc2:#7DEBFF}',
'html[data-hub="neon"] body{background:linear-gradient(180deg,#0a0220 0%,#1a0638 52%,#2b0a4c 100%)}',
'.hb-neon .stars{position:absolute;left:0;right:0;top:0;height:60vh;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1.5px 1.5px at 28% 8%,#9ff,transparent),radial-gradient(1px 1px at 41% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 57% 12%,#fcf,transparent),radial-gradient(1px 1px at 69% 26%,#fff,transparent),radial-gradient(1.5px 1.5px at 83% 10%,#9ff,transparent),radial-gradient(1px 1px at 92% 34%,#fff,transparent),radial-gradient(1px 1px at 20% 40%,#fcf,transparent);animation:hubTw 3.6s ease-in-out infinite alternate}',
'@keyframes hubTw{from{opacity:.45}to{opacity:1}}',
'.hb-neon .sun{position:absolute;left:50%;top:25vh;width:min(64vw,330px);height:min(64vw,330px);transform:translateX(-50%);border-radius:50%;background:linear-gradient(180deg,#ffe45e 0%,#ff6a8a 45%,#d11fd6 100%);-webkit-mask-image:linear-gradient(#000 0 56%,transparent 56% 60%,#000 60% 68%,transparent 68% 73%,#000 73% 82%,transparent 82% 88%,#000 88% 95%,transparent 95%);mask-image:linear-gradient(#000 0 56%,transparent 56% 60%,#000 60% 68%,transparent 68% 73%,#000 73% 82%,transparent 82% 88%,#000 88% 95%,transparent 95%);box-shadow:0 0 90px rgba(255,79,163,.55);animation:hubSun 6s ease-in-out infinite alternate}',
'@keyframes hubSun{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.05)}}',
'.hb-neon .hz{position:absolute;left:0;right:0;top:62vh;height:2px;background:#ff4fe6;box-shadow:0 0 30px 8px rgba(255,79,230,.65)}',
'.hb-neon .grid3{position:absolute;left:-60%;right:-60%;top:62vh;height:80vh;background-image:linear-gradient(rgba(255,79,230,.65) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(34,211,238,.6) 1.5px,transparent 1.5px);background-size:64px 64px;transform:perspective(360px) rotateX(64deg);transform-origin:50% 0;animation:hubGridMove 1.5s linear infinite;-webkit-mask-image:linear-gradient(transparent,#000 35%);mask-image:linear-gradient(transparent,#000 35%)}',
'@keyframes hubGridMove{to{background-position:0 64px,0 0}}',
'.hb-neon .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px)}',
'html[data-hub="neon"] h1{font-family:ui-monospace,"SF Mono",Menlo,monospace;text-transform:uppercase;letter-spacing:.05em;font-size:23px;color:#fff;text-shadow:0 0 6px #fff,0 0 18px #ff4fe6,0 0 42px #ff4fe6;animation:riseIn .7s cubic-bezier(.22,.7,.3,1) forwards .28s,hubFlick 6s 2s infinite}',
'@keyframes hubFlick{0%,92%,100%{opacity:1}93%{opacity:.4}94%{opacity:1}96%{opacity:.55}97%{opacity:1}}',
'html[data-hub="neon"] .brand{font-family:ui-monospace,Menlo,monospace;color:#22D3EE;text-shadow:0 0 12px rgba(34,211,238,.8)}',
'html[data-hub="neon"] .brand span{color:#FF4FE6}',
'html[data-hub="neon"] .sub{color:#E4D8FF;text-shadow:0 0 6px #0a0220,0 0 14px #0a0220,0 0 24px #0a0220}',
'html[data-hub="neon"] .card.mlb{--nc:#FFD84D;--nca:rgba(255,216,77,.38)}',
'html[data-hub="neon"] .card.fut{--nc:#3DFFB4;--nca:rgba(61,255,180,.38)}',
'html[data-hub="neon"] .card.nba{--nc:#FF7A3D;--nca:rgba(255,122,61,.38)}',
'html[data-hub="neon"] .card{background:rgba(12,4,34,.78);border:1px solid var(--nc);box-shadow:0 0 20px var(--nca),inset 0 0 22px rgba(255,79,230,.1);animation:hubIn .8s cubic-bezier(.22,.7,.3,1) forwards,hubNeon 3.2s ease-in-out infinite alternate}',
'html[data-hub="neon"] .card:nth-child(1){animation-delay:.12s,.9s}',
'html[data-hub="neon"] .card:nth-child(2){animation-delay:.27s,1.1s}',
'html[data-hub="neon"] .card:nth-child(3){animation-delay:.42s,1.3s}',
'@keyframes hubNeon{from{box-shadow:0 0 14px var(--nca),inset 0 0 18px rgba(255,79,230,.08)}to{box-shadow:0 0 34px var(--nca),inset 0 0 28px rgba(255,79,230,.18)}}',
'html[data-hub="neon"] .card::before{background:linear-gradient(135deg,var(--nc),transparent 55%,var(--nc))}',
'html[data-hub="neon"] .card::after{display:none}',
'html[data-hub="neon"] .card .glow{background:radial-gradient(220px circle at var(--mx) var(--my),var(--nca),transparent 70%)}',
'html[data-hub="neon"] .ico{background:rgba(255,255,255,.04);border-color:var(--nc)}',
'html[data-hub="neon"] .txt b{font-family:ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.06em;font-size:16px}',
'html[data-hub="neon"] .badge{color:var(--nc);background:transparent;border-color:var(--nc)}',
'html[data-hub="neon"] .arrow{color:var(--nc)}',
'html[data-hub="neon"] .hubRipple{border-color:#22D3EE}',
'#hubIntro.hi-neon{background:#07010f}',
'#hubIntro.hi-neon .glitch{position:relative;font:800 92px/1 ui-monospace,"SF Mono",Menlo,monospace;color:#fff;letter-spacing:.04em;text-shadow:0 0 10px #fff,0 0 30px #ff4fe6;animation:hubGl 1.9s steps(1,end) forwards}',
'#hubIntro.hi-neon .glitch::before,#hubIntro.hi-neon .glitch::after{content:attr(data-t);position:absolute;left:0;top:0;width:100%;overflow:hidden}',
'#hubIntro.hi-neon .glitch::before{color:#22D3EE;text-shadow:none;animation:hubGlA 1.9s steps(1,end) forwards}',
'#hubIntro.hi-neon .glitch::after{color:#FF4FE6;text-shadow:none;animation:hubGlB 1.9s steps(1,end) forwards}',
'@keyframes hubGl{0%{opacity:0}10%{opacity:1;transform:translate(3px,-2px)}18%{transform:translate(-4px,1px)}26%{transform:none}38%{opacity:.4}42%{opacity:1;transform:translate(5px,0)}50%,100%{transform:none;opacity:1}}',
'@keyframes hubGlA{0%{transform:translate(0)}10%{transform:translate(-6px,2px);clip-path:inset(10% 0 55% 0)}20%{transform:translate(5px,-1px);clip-path:inset(60% 0 8% 0)}30%{transform:translate(-4px,0);clip-path:inset(30% 0 40% 0)}45%,100%{transform:translate(0);clip-path:inset(0 0 100% 0)}}',
'@keyframes hubGlB{0%{transform:translate(0)}10%{transform:translate(6px,-2px);clip-path:inset(55% 0 12% 0)}20%{transform:translate(-5px,2px);clip-path:inset(8% 0 62% 0)}30%{transform:translate(4px,0);clip-path:inset(42% 0 30% 0)}45%,100%{transform:translate(0);clip-path:inset(0 0 100% 0)}}',
'#hubIntro.hi-neon .bar{position:absolute;left:0;right:0;height:90px;top:-100px;background:linear-gradient(to bottom,transparent,rgba(34,211,238,.28),transparent);animation:hubScanDown 1.8s .2s linear forwards}',
'@keyframes hubScanDown{to{top:110vh}}',

/* ===================================================================== CONSTELACION */
'html[data-hub="const"]{--bg:#050912;--txt:#F5F1E4;--mut:#C7C2AC;--mut2:#988F76;--hot:#F0CE6B;--acc:#F0CE6B;--acc2:#FFE8A3}',
'html[data-hub="const"] body{background:radial-gradient(90% 38% at 50% 112%,rgba(240,206,107,.14),transparent 70%),radial-gradient(120% 90% at 50% 0%,#14224a,#050912 68%)}',
'html[data-hub="const"] h1{background:linear-gradient(90deg,#F0CE6B 0%,#fff 25%,#F0CE6B 50%,#fff 75%,#F0CE6B 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:riseIn .7s cubic-bezier(.22,.7,.3,1) forwards .28s,hubGrad 7s linear infinite}',
'html[data-hub="const"] .card{background:rgba(14,24,52,.5);border:1px solid rgba(240,206,107,.3);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 28px 56px -28px rgba(0,0,0,.9);animation:hubIn .9s cubic-bezier(.22,.7,.3,1) forwards}',
'html[data-hub="const"] .card:nth-child(1){animation-delay:.15s}',
'html[data-hub="const"] .card:nth-child(2){animation-delay:.3s}',
'html[data-hub="const"] .card:nth-child(3){animation-delay:.45s}',
'html[data-hub="const"] .card::before{background:linear-gradient(150deg,rgba(240,206,107,.75),transparent 45%,rgba(240,206,107,.3))}',
'html[data-hub="const"] .card .glow{background:radial-gradient(250px circle at var(--mx) var(--my),rgba(240,206,107,.22),transparent 70%)}',
'html[data-hub="const"] .hubRipple{border-color:rgba(240,206,107,.9)}',
'#hubIntro.hi-const{background:transparent}',
'#hubIntro.hi-const .word{font-size:84px;color:#F0CE6B;text-shadow:0 0 40px rgba(240,206,107,.7)}',
'#hubIntro.hi-const .ltr{animation-delay:calc(.35s + var(--i)*.14s)}',
'#hubIntro.hi-const .ring{position:absolute;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(240,206,107,.8);opacity:0;animation:hubRing 2s ease-out forwards}',
'#hubIntro.hi-const .ring.r2{animation-delay:.35s}',
'@keyframes hubRing{0%{transform:scale(1);opacity:.9}100%{transform:scale(34);opacity:0}}',

/* ===================================================================== CRISTAL */
'html[data-hub="cristal"]{--bg:#070b14;--txt:#F4F7FF;--mut:#C0CBE6;--mut2:#8E9BBF;--hot:#7DEBFF;--acc:#7DEBFF;--acc2:#B7F3FF}',
'html[data-hub="cristal"] body{background:#070b14}',
'.hb-cristal .orb{position:absolute;border-radius:50%;will-change:transform}',
'.hb-cristal .c1{width:78vmax;height:78vmax;left:-30vmax;top:-26vmax;background:radial-gradient(circle,rgba(59,130,246,.65),transparent 64%);animation:crA 19s ease-in-out infinite alternate}',
'.hb-cristal .c2{width:70vmax;height:70vmax;right:-34vmax;top:18vh;background:radial-gradient(circle,rgba(34,211,238,.5),transparent 64%);animation:crB 23s ease-in-out infinite alternate}',
'.hb-cristal .c3{width:60vmax;height:60vmax;left:-12vmax;bottom:-30vmax;background:radial-gradient(circle,rgba(251,191,36,.42),transparent 64%);animation:crC 27s ease-in-out infinite alternate}',
'.hb-cristal .c4{width:54vmax;height:54vmax;right:-16vmax;bottom:-22vmax;background:radial-gradient(circle,rgba(167,139,250,.48),transparent 64%);animation:crA 25s ease-in-out infinite alternate-reverse}',
'@keyframes crA{from{transform:translate3d(0,0,0)}to{transform:translate3d(22vw,14vh,0) scale(1.15)}}',
'@keyframes crB{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(-26vw,-12vh,0) scale(1.2)}}',
'@keyframes crC{from{transform:translate3d(0,0,0)}to{transform:translate3d(26vw,-16vh,0) scale(.9)}}',
'html[data-hub="cristal"] h1{color:#fff;text-shadow:0 2px 30px rgba(125,235,255,.45)}',
'html[data-hub="cristal"] .brand{color:#D6E4FF}',
'html[data-hub="cristal"] .brand span{color:#7DEBFF}',
'html[data-hub="cristal"] .card{background:linear-gradient(135deg,rgba(255,255,255,.17),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.3);-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);box-shadow:inset 0 1px 1px rgba(255,255,255,.55),inset 0 -1px 1px rgba(255,255,255,.12),0 26px 52px -22px rgba(0,0,0,.75);animation:hubIn .95s cubic-bezier(.22,.7,.3,1) forwards,hubBob 6.5s ease-in-out infinite}',
'html[data-hub="cristal"] .card:nth-child(1){animation-delay:.12s,1.2s}',
'html[data-hub="cristal"] .card:nth-child(2){animation-delay:.27s,2.1s}',
'html[data-hub="cristal"] .card:nth-child(3){animation-delay:.42s,3s}',
'html[data-hub="cristal"] .card::before{background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,255,255,0) 40%,rgba(125,235,255,.5))}',
'html[data-hub="cristal"] .card .glow{background:radial-gradient(240px circle at var(--mx) var(--my),rgba(255,255,255,.22),transparent 70%)}',
'html[data-hub="cristal"] .ico{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.34)}',
'html[data-hub="cristal"] .badge{color:#D9F8FF;background:rgba(125,235,255,.14);border-color:rgba(125,235,255,.4)}',
'html[data-hub="cristal"] .arrow{color:#D6E4FF}',
'html[data-hub="cristal"] .hubRipple{border-color:rgba(255,255,255,.9)}',
'#hubIntro.hi-cristal{background:#070b14}',
'#hubIntro.hi-cristal .drop{position:absolute;width:26px;height:26px;border-radius:50%;border:2px solid rgba(125,235,255,.85);opacity:0;animation:hubDrop 2.1s ease-out forwards}',
'#hubIntro.hi-cristal .drop.d2{animation-delay:.3s}',
'#hubIntro.hi-cristal .drop.d3{animation-delay:.6s}',
'@keyframes hubDrop{0%{transform:scale(.3);opacity:0}15%{opacity:.95}100%{transform:scale(22);opacity:0}}',
'#hubIntro.hi-cristal .word{font-size:84px;filter:drop-shadow(0 0 22px rgba(125,235,255,.55))}',
'#hubIntro.hi-cristal .ltr{background:linear-gradient(180deg,#ffffff 0%,#bfeaff 55%,#7fd3ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}',
'#hubIntro.hi-cristal .ltr{animation-delay:calc(.5s + var(--i)*.14s)}',

/* ---------- hoja para elegir ---------- */
'#hubSheet{position:fixed;inset:0;z-index:100000;display:none;align-items:flex-end;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}',
'#hubSheet.on{display:flex}',
'#hubSheet .sheetbox{width:100%;max-width:520px;margin:0 auto;max-height:88vh;overflow:auto;background:#13110d;color:#F7F2E7;border-top:1px solid rgba(201,162,74,.35);border-radius:22px 22px 0 0;padding:16px 14px calc(20px + env(safe-area-inset-bottom));font-family:-apple-system,system-ui,sans-serif;animation:hubUp .35s cubic-bezier(.22,.7,.3,1)}',
'@keyframes hubUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}',
'#hubSheet h2{margin:2px 0 3px;font-size:18px;font-weight:700}',
'#hubSheet p{margin:0 0 12px;font-size:12px;color:#CBBFA5}',
'#hubSheet .tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
'#hubSheet .tile{display:flex;flex-direction:column;padding:0;text-align:left;background:transparent;color:inherit;border:2px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;cursor:pointer;font-family:inherit}',
'#hubSheet .tile.on{border-color:#F0CE6B;box-shadow:0 0 0 3px rgba(240,206,107,.16)}',
'#hubSheet .tile .sw{display:block;height:70px}',
'#hubSheet .tile .tx{display:block;padding:8px 10px 9px;background:rgba(255,255,255,.05)}',
'#hubSheet .tile b{display:block;font-size:13.5px}',
'#hubSheet .tile span span{display:block;font-size:11px;color:#CBBFA5;margin-top:1px}',

'@media (prefers-reduced-motion:reduce){html[data-hub] *,html[data-hub] *::before,html[data-hub] *::after,#hubBg *,#hubIntro *{animation-duration:.01ms!important;animation-iteration-count:1!important;animation-delay:0s!important}}'
].join('\n');

/* ===================================================================== utilidades */
var ST={id:'oro',loop:null,pointerOff:null,timers:[]};
function leer(){ try{ var v=root.localStorage.getItem(KEY); return BY[v]?v:'oro'; }catch(e){ return 'oro'; } }
function guardar(id){ try{ root.localStorage.setItem(KEY,id); }catch(e){} }
function letras(t){ var o=''; for(var i=0;i<t.length;i++) o+='<span class="ltr" style="--i:'+i+'">'+t.charAt(i)+'</span>'; return '<div class="word">'+o+'</div>'; }
function addT(f,ms){ var t=root.setTimeout(f,ms); ST.timers.push(t); return t; }
function inyectarCSS(){
  if(doc.getElementById('hubEstilosCss')) return;
  var s=doc.createElement('style'); s.id='hubEstilosCss'; s.textContent=CSS;
  (doc.head||html).appendChild(s);
}

/* ===================================================================== fondos */
function polvo(n){
  var o='';
  for(var i=0;i<n;i++){
    var sz=(1.5+Math.random()*2.5).toFixed(1), l=(Math.random()*100).toFixed(1), du=(9+Math.random()*10).toFixed(1), de=(-Math.random()*16).toFixed(1), dx=((Math.random()-.5)*60).toFixed(0);
    o+='<i style="left:'+l+'%;width:'+sz+'px;height:'+sz+'px;animation-duration:'+du+'s;animation-delay:'+de+'s;--dx:'+dx+'px"></i>';
  }
  return o;
}
function htmlFondo(id){
  if(id==='aurora') return '<div class="par hb-aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="blob b4"></div></div>';
  if(id==='estadio') return '<div class="par hb-estadio"><div class="haze"></div><div class="floor"></div><div class="lamp" style="left:14%"></div><div class="lamp" style="left:50%"></div><div class="lamp" style="left:86%"></div><div class="beam l" style="--r:16deg;--d:7.5s"></div><div class="beam" style="--r:0deg;--d:9.5s"></div><div class="beam r" style="--r:-16deg;--d:8.5s"></div><div class="pitch"></div><div class="dust">'+polvo(18)+'</div></div>';
  if(id==='neon') return '<div class="par hb-neon"><div class="stars"></div><div class="sun"></div><div class="hz"></div><div class="grid3"></div><div class="scan"></div></div>';
  if(id==='cristal') return '<div class="par hb-cristal"><div class="orb c1"></div><div class="orb c2"></div><div class="orb c3"></div><div class="orb c4"></div></div>';
  return '';
}
function constelacion(cv,burst){
  var ctx=cv.getContext&&cv.getContext('2d'); if(!ctx) return null;
  var W=0,H=0,dpr=Math.min(2,root.devicePixelRatio||1),P=[],F=[],fr=0,sig=240,mouse={x:-999,y:-999},raf=0,vivo=true;
  function medir(){ W=root.innerWidth||360; H=root.innerHeight||640; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  function crear(){
    P=[]; var n=Math.max(34,Math.min(90,Math.round(W*H/6500)));
    for(var i=0;i<n;i++){
      var a=Math.random()*Math.PI*2, v=0.12+Math.random()*0.28, p={x:Math.random()*W,y:Math.random()*H,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:0.8+Math.random()*1.7,g:Math.random()<0.35,b:v};
      if(burst){ var s=4+Math.random()*9; p.x=W/2; p.y=H/2; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s; }
      P.push(p);
    }
  }
  function pintar(){
    ctx.clearRect(0,0,W,H);
    var i,j,p,q,dx,dy,d;
    for(i=0;i<P.length;i++){
      p=P[i];
      var sp=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(sp>p.b*1.5){ p.vx*=0.965; p.vy*=0.965; }
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-10) p.x=W+10; else if(p.x>W+10) p.x=-10;
      if(p.y<-10) p.y=H+10; else if(p.y>H+10) p.y=-10;
      dx=p.x-mouse.x; dy=p.y-mouse.y; d=dx*dx+dy*dy;
      if(d<19600&&d>1){ var f=(1-Math.sqrt(d)/140)*0.9; p.vx+=dx/Math.sqrt(d)*f*0.35; p.vy+=dy/Math.sqrt(d)*f*0.35; }
    }
    for(i=0;i<P.length;i++){
      p=P[i];
      for(j=i+1;j<P.length;j++){
        q=P[j]; dx=p.x-q.x; dy=p.y-q.y; d=dx*dx+dy*dy;
        if(d<12100){ ctx.strokeStyle='rgba(240,206,107,'+((1-Math.sqrt(d)/110)*0.38).toFixed(3)+')'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); }
      }
      ctx.fillStyle=p.g?'rgba(240,206,107,.95)':'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832); ctx.fill();
    }
    fr++; if(fr>=sig){ fr=0; sig=260+Math.random()*320; F.push({x:Math.random()*W*0.7,y:Math.random()*H*0.35,vx:8+Math.random()*4,vy:3.5+Math.random()*3,t:0}); }
    for(i=F.length-1;i>=0;i--){
      var s2=F[i]; s2.x+=s2.vx; s2.y+=s2.vy; s2.t++;
      var al=Math.max(0,1-s2.t/42); if(al<=0){ F.splice(i,1); continue; }
      var g=ctx.createLinearGradient(s2.x-s2.vx*9,s2.y-s2.vy*9,s2.x,s2.y); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(255,245,210,'+al.toFixed(2)+')');
      ctx.strokeStyle=g; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(s2.x-s2.vx*9,s2.y-s2.vy*9); ctx.lineTo(s2.x,s2.y); ctx.stroke();
    }
  }
  function tick(){ if(!vivo) return; if(!doc.hidden) pintar(); raf=root.requestAnimationFrame(tick); }
  function mover(e){ mouse.x=e.clientX; mouse.y=e.clientY; }
  function soltar(){ mouse.x=-999; mouse.y=-999; }
  function tam(){ medir(); }
  medir(); crear();
  root.addEventListener('pointermove',mover); root.addEventListener('pointerdown',mover); root.addEventListener('pointerup',soltar); root.addEventListener('pointercancel',soltar); root.addEventListener('resize',tam);
  if(reduce){ pintar(); } else { raf=root.requestAnimationFrame(tick); }
  return {stop:function(){ vivo=false; try{ root.cancelAnimationFrame(raf); }catch(e){} root.removeEventListener('pointermove',mover); root.removeEventListener('pointerdown',mover); root.removeEventListener('pointerup',soltar); root.removeEventListener('pointercancel',soltar); root.removeEventListener('resize',tam); }};
}
function crearFondo(id,conIntro){
  var bg=doc.createElement('div'); bg.id='hubBg';
  if(id==='const'){ var cv=doc.createElement('canvas'); bg.appendChild(cv); }
  else bg.innerHTML=htmlFondo(id);
  doc.body.insertBefore(bg,doc.body.firstChild);
  if(id==='const'){ ST.loop=constelacion(bg.firstChild,!!conIntro); }
  if(id==='aurora'||id==='estadio'||id==='neon'||id==='cristal'){
    var par=bg.firstChild;
    var mv=function(e){ if(!par||!par.style) return; var x=(e.clientX/(root.innerWidth||1)-.5)*2, y=(e.clientY/(root.innerHeight||1)-.5)*2; par.style.setProperty('--px',x.toFixed(3)); par.style.setProperty('--py',y.toFixed(3)); };
    root.addEventListener('pointermove',mv); ST.pointerOff=function(){ root.removeEventListener('pointermove',mv); };
  }
}

/* ===================================================================== intro */
function htmlIntro(id){
  if(id==='aurora') return '<div class="orb o1"></div><div class="orb o2"></div>'+letras('OVA')+'<div class="line"></div>';
  if(id==='estadio') return '<div class="flash"></div>'+letras('OVA')+'<div class="flare"></div>';
  if(id==='neon') return '<div class="bar"></div><div class="glitch" data-t="OVA">OVA</div>';
  if(id==='const') return '<div class="ring"></div><div class="ring r2"></div>'+letras('OVA');
  if(id==='cristal') return '<div class="drop"></div><div class="drop d2"></div><div class="drop d3"></div>'+letras('OVA');
  return '';
}
function correrIntro(id){
  if(reduce) return;
  var ms=INTRO_MS[id]||2400, d=doc.createElement('div');
  d.id='hubIntro'; d.className='hi-'+id; d.innerHTML=htmlIntro(id);
  doc.body.appendChild(d); html.classList.add('hub-intro');
  try{ root.sessionStorage.setItem('ova_hub_intro','1'); }catch(e){}
  var hecho=false;
  function fin(){
    if(hecho) return; hecho=true;
    html.classList.remove('hub-intro'); d.classList.add('fuera');
    root.setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },900);
  }
  d.addEventListener('pointerdown',fin);
  addT(fin,ms);
  root.setTimeout(function(){ html.classList.remove('hub-intro'); },ms+3500);   /* seguro: nunca deja las tarjetas congeladas */
}

/* ===================================================================== aplicar */
function parar(){
  if(ST.loop&&ST.loop.stop) ST.loop.stop(); ST.loop=null;
  if(ST.pointerOff) ST.pointerOff(); ST.pointerOff=null;
  ST.timers.forEach(function(t){ root.clearTimeout(t); }); ST.timers=[];
  ['hubBg','hubIntro'].forEach(function(i){ var e=doc.getElementById(i); if(e&&e.parentNode) e.parentNode.removeChild(e); });
  html.classList.remove('hub-intro');
}
function aplicar(id,opts){
  opts=opts||{};
  if(!BY[id]) id='oro';
  var antes=ST.id; ST.id=id;
  inyectarCSS();
  if(opts.guardar!==false) guardar(id);
  if(opts.inicial){
    if(id==='oro'){ html.removeAttribute('data-hub'); return id; }
    html.setAttribute('data-hub',id);
    return id;
  }
  parar();
  if(id==='oro'){
    html.removeAttribute('data-hub');
    if(antes!=='oro' && opts.recargar!==false){ try{ root.location.reload(); }catch(e){} }   /* el clásico trae su propia animación de entrada al cargar */
    return id;
  }
  html.setAttribute('data-hub',id);
  crearFondo(id,!!opts.intro);
  if(opts.intro) correrIntro(id);
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
      if(tile){ cerrarHoja(); aplicar(tile.getAttribute('data-id'),{intro:true}); return; }
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
  function mov(e){ if(t && (Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12)) can(); }
  el.addEventListener('pointerdown',ini); el.addEventListener('pointermove',mov); el.addEventListener('pointerup',can); el.addEventListener('pointercancel',can); el.addEventListener('pointerleave',can);
  el.addEventListener('contextmenu',function(e){ if(e.preventDefault) e.preventDefault(); });
}
function brillo(){
  /* el brillo de las tarjetas sigue tu dedo */
  var f=function(e){
    var c=e.target&&e.target.closest?e.target.closest('.card'):null; if(!c) return;
    var r=c.getBoundingClientRect(); c.style.setProperty('--mx',(e.clientX-r.left)+'px'); c.style.setProperty('--my',(e.clientY-r.top)+'px');
  };
  doc.addEventListener('pointermove',f); doc.addEventListener('pointerdown',f);
  /* onda al tocar */
  doc.addEventListener('pointerdown',function(e){
    var a=html.getAttribute('data-hub'); if(!a||a==='oro'||reduce) return;
    if(e.target&&e.target.closest&&e.target.closest('#hubSheet')) return;
    var r=doc.createElement('div'); r.className='hubRipple'; r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px';
    doc.body.appendChild(r); root.setTimeout(function(){ if(r.parentNode) r.parentNode.removeChild(r); },900);
  });
}
function params(){
  try{ var m=String(root.location.search||'').match(/[?&]estilo=([^&]+)/); if(!m) return null; var v=decodeURIComponent(m[1]); var n=parseInt(v,10); if(n>=1&&n<=ESTILOS.length) v=ESTILOS[n-1].id; return BY[v]?v:null; }catch(e){ return null; }
}

/* ===================================================================== arranque */
function arrancar(){
  var url=params(), id=url||leer();
  /* en <head>: solo se marca el estilo y se inyecta el CSS (así no se ve el clásico un instante antes) */
  aplicar(id,{inicial:true,guardar:!!url});
  function listo(){
    try{
      if(id!=='oro'){
        var primera=true; try{ primera=!root.sessionStorage.getItem('ova_hub_intro'); root.sessionStorage.setItem('ova_hub_intro','1'); }catch(e){}
        crearFondo(id,primera); if(primera) correrIntro(id);
      }
      [].forEach.call(doc.querySelectorAll('.brandbar,h1'),pulsacion);
      brillo();
    }catch(e){ try{ if(root.console) root.console.error('hubestilos',e); }catch(x){} }
  }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',listo); else listo();
}

var API={ESTILOS:ESTILOS,css:CSS,aplicar:aplicar,abrirHoja:abrirHoja,cerrarHoja:cerrarHoja,actual:function(){ return ST.id; },leer:leer,_arrancar:arrancar,_pulsacion:pulsacion};
root.OVAHub=API;
if(typeof module!=='undefined'&&module.exports){ module.exports=API; }
else if(doc&&html){ try{ arrancar(); }catch(e){} }
})(typeof window!=='undefined'?window:globalThis);
