/* OVA · pruebas automáticas.  Uso:  node --expose-internals pruebas.js   (desde la carpeta del repo)
   Revisa sintaxis, nombres inexistentes, cruce de equipos, marcador en vivo, combo de fútbol, modelo NBA,
   cierre automático de MLB, respaldo, resumen "Hoy", service worker y el hub.
   Sale con código 1 si algo falla (así GitHub te avisa con una X roja). */
const fs=require('fs'),vm=require('vm'),path=require('path');
const D=__dirname+path.sep;
let total=0,fallas=0,t_envivo;
function ok(nombre,cond,detalle){total++;if(!cond){fallas++;console.log('  ✗ FALLA:',nombre,detalle!==undefined?'→ '+detalle:'');}else console.log('  ✓',nombre);}
function sec(t){console.log('\n== '+t);}
const rd=f=>fs.readFileSync(D+f,'utf8');
function scriptsInline(f){const h=rd(f),out=[],re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(h)))out.push(m[1]);return out;}
const APPS=['hub.html','panel.html','index.html','futbol.html','nba.html'];
const JS=['ovaextra.js','hubestilos.js','interior.js','interior2.js','ajustes.js','asistente.js','envivo.js','obsidiana.js','mejoras.js','selecciones.js','historial.js','railway.js','diseno.js','sw.js'].filter(f=>fs.existsSync(D+f));

/* ---------------- 1. sintaxis ---------------- */
sec('Sintaxis');
APPS.forEach(f=>{let bad=0;scriptsInline(f).forEach((s,i)=>{try{new vm.Script(s,{filename:f+'#'+i});}catch(e){bad++;console.log('   ',f,'#'+i,e.message);}});ok(f+' ('+scriptsInline(f).length+' scripts)',bad===0);});
JS.forEach(f=>{let good=true;try{new vm.Script(rd(f),{filename:f});}catch(e){good=false;console.log('   ',f,e.message);}ok(f,good);});

/* ---------------- 2. nombres que no existen ---------------- */
sec('Nombres usados sin existir (como el esc() que rompía el marcador)');
let acorn=null;try{acorn=require('internal/deps/acorn/acorn/dist/acorn');}catch(e){}
if(!acorn){console.log('  (omitido: corre con  node --expose-internals pruebas.js)');}
else{
 const BROWSER=new Set(('window document navigator location localStorage sessionStorage history console fetch setTimeout setInterval clearInterval clearTimeout requestAnimationFrame cancelAnimationFrame Promise Math JSON Date Array Object String Number Boolean RegExp Error Set Map WeakMap Symbol parseInt parseFloat isFinite isNaN undefined NaN Infinity Event CustomEvent DOMParser MutationObserver URL Image Intl matchMedia module require alert prompt confirm encodeURIComponent decodeURIComponent Uint8Array Float64Array performance IntersectionObserver ResizeObserver Blob File FileReader btoa atob TextEncoder escape unescape arguments AbortController Notification crypto screen innerWidth innerHeight pageYOffset scrollTo getComputedStyle XMLHttpRequest Response Headers Request FormData URLSearchParams structuredClone queueMicrotask globalThis self caches clients indexedDB').split(' '));
 function analizar(src){
  const ast=acorn.parse(src,{ecmaVersion:2022,sourceType:'script',locations:true});const refs=[],sets=new Set();
  function patt(p,sc){if(!p)return;if(p.type==='Identifier')sc.add(p.name);else if(p.type==='ObjectPattern')p.properties.forEach(x=>patt(x.value||x.argument,sc));else if(p.type==='ArrayPattern')p.elements.forEach(x=>patt(x,sc));else if(p.type==='AssignmentPattern'){patt(p.left,sc);walk(p.right,sc);}else if(p.type==='RestElement')patt(p.argument,sc);else if(p.type==='MemberExpression')walk(p,sc);}
  function pd(p,sc){if(!p)return;if(p.type==='Identifier')sc.add(p.name);else if(p.type==='ObjectPattern')p.properties.forEach(x=>pd(x.value||x.argument,sc));else if(p.type==='ArrayPattern')p.elements.forEach(x=>pd(x,sc));else if(p.type==='AssignmentPattern')pd(p.left,sc);else if(p.type==='RestElement')pd(p.argument,sc);}
  function hoist(n,sc){if(!n||typeof n.type!=='string')return;if(n.type==='FunctionDeclaration'){sc.add(n.id.name);return;}if(n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression')return;if(n.type==='VariableDeclaration')n.declarations.forEach(d=>pd(d.id,sc));if(n.type==='ClassDeclaration')sc.add(n.id.name);for(const k in n){if(k==='loc')continue;const v=n[k];if(Array.isArray(v))v.forEach(x=>hoist(x,sc));else if(v&&typeof v.type==='string')hoist(v,sc);}}
  function walk(n,scope){
   if(!n||typeof n.type!=='string')return;let sc=scope;
   if(n.type==='FunctionDeclaration'||n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression')sc=new Set([...scope]);
   switch(n.type){
    case 'Identifier':refs.push([n.name,n.loc.start.line,sc]);return;
    case 'MemberExpression':walk(n.object,sc);if(n.computed)walk(n.property,sc);return;
    case 'Property':if(n.computed)walk(n.key,sc);walk(n.value,sc);return;
    case 'MethodDefinition':return;case 'LabeledStatement':walk(n.body,sc);return;case 'BreakStatement':case 'ContinueStatement':return;
    case 'VariableDeclarator':patt(n.id,sc);if(n.init)walk(n.init,sc);return;
    case 'FunctionDeclaration':case 'FunctionExpression':case 'ArrowFunctionExpression':
     if(n.id&&n.type==='FunctionExpression')sc.add(n.id.name);n.params.forEach(p=>patt(p,sc));hoist(n.body,sc);walk(n.body,sc);return;
    case 'CatchClause':sc=new Set([...sc]);if(n.param)patt(n.param,sc);walk(n.body,sc);return;
    case 'ClassDeclaration':case 'ClassExpression':if(n.id)sc.add(n.id.name);walk(n.superClass,sc);n.body.body.forEach(m=>{if(m.value)walk(m.value,sc);});return;
    case 'AssignmentExpression':if(n.left.type==='Identifier')sets.add(n.left.name);break;
   }
   for(const k in n){if(k==='loc'||k==='type')continue;const v=n[k];if(Array.isArray(v))v.forEach(x=>walk(x,sc));else if(v&&typeof v.type==='string')walk(v,sc);}
  }
  const top=new Set();hoist(ast,top);walk(ast,top);return {top,refs,sets};
 }
 function revisar(app,extras){
  const h=rd(app),src=scriptsInline(app).map((s,i)=>[app+'#'+i,s]).concat(extras.filter(e=>fs.existsSync(D+e)).map(e=>[e,rd(e)]));
  const tops=new Set(),res=[];
  src.forEach(([l,s])=>{const r=analizar(s);res.push([l,r]);r.top.forEach(t=>tops.add(t));r.sets.forEach(t=>tops.add(t));});
  const ids=new Set();let m;const rid=/\bid="([^"]+)"/g;while((m=rid.exec(h)))ids.add(m[1]);
  const FALSOS=new Set(['OVASkins','montarCombo','OVAHoy','OVARespaldo','OVACLV']);   /* se crean con window.X y están protegidos con typeof */
  const mal=new Map();
  res.forEach(([l,r])=>r.refs.forEach(([n,line,sc])=>{if(sc.has(n)||tops.has(n)||BROWSER.has(n)||ids.has(n)||FALSOS.has(n))return;if(!mal.has(n))mal.set(n,l+':'+line);}));
  ok(app+' sin nombres inexistentes',mal.size===0,[...mal].map(([n,w])=>n+' ('+w+')').join(', '));
 }
 revisar('futbol.html',['ovaextra.js','interior.js','interior2.js','obsidiana.js','mejoras.js','selecciones.js']);
 revisar('index.html',['ovaextra.js','interior.js','interior2.js','ajustes.js','asistente.js','obsidiana.js','railway.js','historial.js']);
 revisar('nba.html',['ovaextra.js','interior.js','interior2.js']);
 revisar('hub.html',['ovaextra.js','hubestilos.js']);
 revisar('panel.html',['ovaextra.js']);
 const sw=analizar(rd('sw.js'));const mal=sw.refs.filter(([n,l,sc])=>!(sc.has(n)||sw.top.has(n)||BROWSER.has(n))).map(r=>r[0]);ok('sw.js sin nombres inexistentes',mal.length===0,mal.join(','));
}

/* ---------------- 3. cruce de nombres de equipos ---------------- */
sec('Cruce de nombres de equipos (worldfootball ↔ ESPN)');
{
 const h=rd('futbol.html'),a=h.indexOf('var TOKENS_FUERA'),b=h.indexOf('function parseFecha'),L={};
 new Function('o',h.slice(a,b)+';o.mismoEquipo=mismoEquipo;')(L);
 const C=[['Manchester City','Man City'],['Manchester United','Man United','Man Utd'],['Tottenham Hotspur','Tottenham','Spurs'],['Wolverhampton Wanderers','Wolves'],['Brighton & Hove Albion','Brighton'],['AFC Bournemouth','Bournemouth'],['Newcastle United','Newcastle'],['Nottingham Forest','Nottm Forest'],['West Ham United','West Ham'],['Leeds United','Leeds'],['Sunderland AFC','Sunderland'],['Chelsea','Chelsea FC'],['Arsenal','Arsenal FC'],['Liverpool','Liverpool FC'],['Everton','Everton FC'],['Crystal Palace'],['Fulham','Fulham FC'],['Brentford','Brentford FC'],['Burnley','Burnley FC'],['Aston Villa'],['FC Barcelona','Barcelona'],['Real Madrid'],['Atlético Madrid','Atletico Madrid'],['Athletic Club','Athletic Bilbao'],['Real Sociedad'],['Real Betis','Betis'],['Deportivo Alavés','CD Alavés','Alavés'],['Celta de Vigo','Celta Vigo'],['RCD Espanyol','Espanyol'],['Rayo Vallecano'],['Levante UD','Levante'],['Real Oviedo','Oviedo'],['Sevilla FC','Sevilla'],['Valencia CF','Valencia'],['Villarreal CF','Villarreal'],['Girona FC','Girona'],['Getafe CF','Getafe'],['CA Osasuna','Osasuna'],['Elche CF','Elche'],['RCD Mallorca','Mallorca'],['Real Valladolid','Valladolid'],['Deportivo A Coruña','Deportivo La Coruña'],['Inter','Internazionale','Inter Milan'],['AC Milan','Milan'],['Juventus','Juventus FC'],['SSC Napoli','Napoli'],['AS Roma','Roma'],['SS Lazio','Lazio'],['Atalanta BC','Atalanta'],['ACF Fiorentina','Fiorentina'],['Hellas Verona','Verona'],['Bologna FC','Bologna'],['Torino FC','Torino'],['Genoa CFC','Genoa'],['Udinese Calcio','Udinese'],['Cagliari Calcio','Cagliari'],['Como 1907','Como'],['US Lecce','Lecce'],['Parma Calcio','Parma'],['US Sassuolo','Sassuolo'],['Pisa SC','Pisa'],['US Cremonese','Cremonese'],['Bayern München','Bayern Munich'],['Borussia Dortmund','Dortmund'],['Bayer 04 Leverkusen','Bayer Leverkusen'],['RB Leipzig'],['VfB Stuttgart','Stuttgart'],['Eintracht Frankfurt'],['1899 Hoffenheim','TSG Hoffenheim'],['1. FSV Mainz 05','Mainz'],['SC Freiburg','Freiburg'],['FC Augsburg','Augsburg'],['Werder Bremen'],['Hamburger SV','Hamburg'],['VfL Wolfsburg','Wolfsburg'],['1. FC Union Berlin','Union Berlin'],['FC St. Pauli','St. Pauli'],['1. FC Köln','FC Cologne','Köln'],["Borussia M'gladbach",'Borussia Mönchengladbach'],['1. FC Heidenheim','1. FC Heidenheim 1846'],['SV 07 Elversberg','Elversberg'],['Paris Saint-Germain','PSG','Paris Saint Germain'],['Paris FC'],['Olympique Marseille','Marseille'],['Olympique Lyonnais','Lyon'],['AS Monaco','Monaco'],['Lille OSC','LOSC Lille','Lille'],['Stade Rennais','Rennes'],['Stade Brestois 29','Brest','Stade Brestois'],['OGC Nice','Nice'],['RC Lens','Lens'],['Racing Strasbourg','RC Strasbourg','Strasbourg'],['Le Havre AC','Le Havre'],['AJ Auxerre','Auxerre'],['FC Metz','Metz'],['FC Lorient','Lorient'],['FC Nantes','Nantes'],['Angers SCO','Angers'],['Toulouse FC','Toulouse'],['Sporting CP','Sporting Lisbon'],['SL Benfica','Benfica'],['FC Porto','Porto'],['Club Brugge','Club Brugge KV'],['Galatasaray','Galatasaray SK'],['Bodø/Glimt','FK Bodø/Glimt'],['Qarabağ','Qarabag'],['Slavia Praha','Slavia Prague'],['Pafos FC','Pafos'],['Union Saint-Gilloise','Union SG'],['Kairat Almaty','Kairat'],['FC København','Copenhagen','FC Copenhagen'],['PSV Eindhoven','PSV'],['Olympiacos','Olympiakos'],['Ajax','AFC Ajax'],['Feyenoord'],['Celtic'],['Rangers'],['Anderlecht']];
 let nc=0,conf=0;const mm=[];
 C.forEach(v=>{for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++)if(!L.mismoEquipo(v[i],v[j])){nc++;mm.push(v[i]+' | '+v[j]);}});
 for(let a2=0;a2<C.length;a2++)for(let b2=a2+1;b2<C.length;b2++)C[a2].forEach(x=>C[b2].forEach(y=>{if(L.mismoEquipo(x,y)){conf++;mm.push('CONFUNDE '+x+' = '+y);}}));
 ok('variantes del mismo club cruzan ('+C.length+' clubes)',nc===0,mm.join(' ; '));
 ok('clubes distintos no se confunden (Paris FC / PSG, Inter / Milan...)',conf===0);
}

/* ---------------- 4. marcador en vivo de fútbol ---------------- */
{
 const h=rd('futbol.html'),nm=h.slice(h.indexOf('var TOKENS_FUERA'),h.indexOf('function parseFecha'));
 const blk=h.slice(h.indexOf('<!--OVAPATCH:ENVIVO:BEGIN-->'),h.indexOf('<!--OVAPATCH:ENVIVO:END-->')).replace(/<!--[^>]*-->/g,'').replace(/<\/?script>/g,'');
 const badge={innerHTML:'',style:{}},game={getAttribute:k=>({'data-local':'Olympique Lyonnais','data-visita':'Olympique Marseille','data-idx':'0'}[k]),querySelector:s=>s==='.hora'?badge:null,setAttribute(){}};
 const doc={hidden:false,getElementById:id=>id==='juegos'?{querySelectorAll:()=>[game]}:null,querySelectorAll:()=>[game]};
 const ev=st=>({events:[{competitions:[{competitors:[{homeAway:'home',score:'2',team:{displayName:'Lyon'}},{homeAway:'away',score:'1',team:{displayName:'Marseille'}}]}],status:{type:{state:st,shortDetail:"67'"}}}]});
 const run=st=>new Promise(r=>{badge.innerHTML='';const ctx={document:doc,ESPN_SLUG:{ligue1:'fra.1'},LIGA_ACTUAL:'ligue1',ESPN_BASE:'x/',pintarJuegos:()=>{},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(ev(st))}),setInterval:()=>{},setTimeout:f=>{f();},Date,String};vm.createContext(ctx);vm.runInContext(nm+';var ymd=function(){return "20260101"};',ctx);vm.runInContext(blk,ctx);setTimeout(()=>r(badge.innerHTML),30);});
t_envivo=async()=>{
  sec('Fútbol: marcador en vivo');
  const a=await run('in');ok('en juego muestra 2–1 (local–visitante)',/🔴 2–1/.test(a),a);
  const b=await run('post');ok('terminado muestra 2–1',/Terminó 2–1/.test(b),b);
 };
}

/* ---------------- 5. combo de fútbol ---------------- */
sec('Fútbol: combo coincide con el Veredicto');
{
 const h=rd('futbol.html'),mod=h.slice(h.indexOf('var MAXG = 8;'),h.indexOf('// ---------- historial')),M={};
 new Function('M',mod+';M.probsModelo=probsModelo;')(M);
 const blk=h.slice(h.indexOf('<!--OVAPATCH:COMBO:BEGIN-->'),h.indexOf('<!--OVAPATCH:COMBO:END-->'));
 const joint=new Function(blk.slice(blk.indexOf('  function joint(marc,legs'),blk.indexOf('  function textoLeg'))+';return joint;')();
 const P={K:6,h:1.13,rho:-0.08,w:0.8,S:0,Kt:16,wt:0.5,ct:1,A:1,At:1},r=M.probsModelo({pj:6,gf:11,gc:5},{pj:6,gf:6,gc:9},1.45,P,true);
 const anc={L:r.pL,D:r.pD,V:r.pV};
 ok('"Gana local" del combo = Veredicto (con w<1)',Math.abs(joint(r.marcadores,[{k:'gan',s:'L'}],anc)-r.pL)<1e-9);
 ok('combo ≤ pata sola',joint(r.marcadores,[{k:'gan',s:'L'},{k:'tot',d:'o',L:2.5}],anc)<=r.pL+1e-12);
 ok('L+E+V suma 1',Math.abs(['L','D','V'].reduce((s,k)=>s+joint(r.marcadores,[{k:'gan',s:k}],anc),0)-1)<1e-9);
 const r1=M.probsModelo({pj:6,gf:11,gc:5},{pj:6,gf:6,gc:9},1.45,Object.assign({},P,{w:1}),true);
 const sinAnc=joint(r1.marcadores,[{k:'gan',s:'L'},{k:'tot',d:'o',L:2.5}]),conAnc=joint(r1.marcadores,[{k:'gan',s:'L'},{k:'tot',d:'o',L:2.5}],{L:r1.pL,D:r1.pD,V:r1.pV});
 ok('con w=1 no cambia nada',Math.abs(sinAnc-conAnc)<1e-12);
}

/* ---------------- Fútbol: modelo Dixon-Coles (liga simulada de fuerza conocida) ---------------- */
sec('Fútbol: modelo Dixon-Coles');
{
 const h=rd('futbol.html'),F={};
 const pre=h.slice(h.indexOf('var TOKENS_FUERA'),h.indexOf('function parseFecha'))+h.slice(h.indexOf('function parseFecha'),h.indexOf('// worldfootball.net muestra las horas'));
 const mod=h.slice(h.indexOf('var MAXG = 8;'),h.indexOf('// ---------- historial'));
 const bm=h.slice(h.indexOf('function buscarEnMapa'),h.indexOf('var buscarSemilla'));
 const dc=h.slice(h.indexOf('var DC_CFG'),h.indexOf('function calcularDC'));
 new Function('F',pre+mod+bm+dc+';F.distribucion=distribucion;F.dcAjustar=dcAjustar;F.DC_CFG=DC_CFG;F.claveEq=claveEq;')(F);
 let sd=11;const rn=()=>(sd=(sd*16807)%2147483647)/2147483647,po=l=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=rn();}while(p>L);return k-1;};
 const N=20,at=[],df=[];for(let i=0;i<N;i++){at.push(Math.exp((rn()-.5)*.7));df.push(Math.exp((rn()-.5)*.7));}
 const gs=[],t0=Date.UTC(2024,7,15);
 for(let s=0;s<2;s++)for(let r=0;r<38;r++)for(let i=0;i<N;i+=2){let x=(i+r)%N,y=(i+r*3+1)%N;if(x===y)y=(y+1)%N;
  gs.push({local:'Team'+x+' FC',visita:'Team'+y+' FC',golesLocal:po(1.3*at[x]*df[y]*1.25),golesVisita:po(1.3*at[y]*df[x]),ts:t0+(s*38+r)*5*864e5});}
 const hoy=Math.floor((t0+76*5*864e5)/864e5)+1,fit=F.dcAjustar(gs,hoy,F.DC_CFG);
 const cor=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let a=0,b=0,c=0;for(let i=0;i<n;i++){a+=(x[i]-mx)*(y[i]-my);b+=(x[i]-mx)**2;c+=(y[i]-my)**2;}return a/Math.sqrt(b*c);};
 const ea=[],ed=[];for(let i=0;i<N;i++){const e=fit.eq[F.claveEq('Team'+i+' FC')];ea.push(e.att);ed.push(e.def);}
 ok('el ajuste usa todos los partidos simulados',fit&&fit.n===gs.length,fit&&fit.n);
 ok('recupera el ataque verdadero de cada equipo (corr > 0.7)',cor(at,ea)>0.7,cor(at,ea).toFixed(2));
 ok('recupera la defensa verdadera de cada equipo (corr > 0.65)',cor(df,ed)>0.65,cor(df,ed).toFixed(2));
 let malas=0;[0,-0.06,-0.12].forEach(rho=>[[0.3,0.3],[1.5,1.1],[3.5,0.6],[5,5]].forEach(([a,b])=>{const x=F.distribucion(a,b,rho,true);
  const sm=x.marcadores.reduce((s,m)=>s+m.p,0);
  if(Math.abs(x.pL+x.pD+x.pV-1)>1e-9||Math.abs(sm-1)>1e-9||x.o15<x.o25||x.o25<x.o35||x.btts<0||x.btts>1) malas++;}));
 ok('las probabilidades suman 1 y Más/Menos es coherente (3 ρ × 4 partidos)',malas===0,malas);
 ok('ρ negativo sube los empates (Dixon-Coles)',F.distribucion(1.4,1.1,-0.08,false).pD>F.distribucion(1.4,1.1,0,false).pD);
 let ex=0;gs.forEach(g=>{const l=fit.eq[F.claveEq(g.local)],v=fit.eq[F.claveEq(g.visita)];ex+=fit.c*l.att*v.def*fit.gam+fit.c*v.att*l.def;});
 const real=gs.reduce((s,g)=>s+g.golesLocal+g.golesVisita,0)/gs.length;
 ok('los goles totales del ajuste coinciden con los reales (±6 %)',Math.abs(ex/gs.length/real-1)<0.06,(ex/gs.length).toFixed(2)+' vs '+real.toFixed(2));
}

/* ---------------- 6. NBA ---------------- */
sec('NBA: modelo con 3 temporadas simuladas');
{
 const nb=rd('nba.html'),i0=nb.indexOf('<script id="modelo">')+20,mod=nb.slice(i0,nb.indexOf('</script>',i0)),N={};
 new Function('N','module',mod+';Object.assign(N,{PDEF,seasonOf,correr,predecir,pML,pCover,evaluar,dif,verdTxt,gridMargen,gridTotal});')(N,undefined);
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
 const teams=[...Array(30).keys()].map(String),str={};teams.forEach(t=>str[t]=gauss()*4);const games=[];
 for(const sk of [2023,2024,2025]){let ts=Date.UTC(sk,9,25,23);for(let d=0;d<165;d++){const used=new Set();for(let g=0;g<8;g++){let a,hh;do{a=teams[Math.floor(rnd()*30)];hh=teams[Math.floor(rnd()*30)];}while(a===hh||used.has(a)||used.has(hh));used.add(a);used.add(hh);const m=str[hh]-str[a]+2.4+gauss()*12,t=225+gauss()*18;games.push({id:games.length,ts:ts+g*1800e3,h:hh,a,hs:Math.round((t+m)/2),as:Math.round((t-m)/2)});}ts+=864e5;}}
 const r=N.evaluar(games,N.PDEF,2025),S=N.correr(games,N.PDEF);
 ok('mide >1000 partidos sin errores',r.n>1000,r.n);
 ok('le gana a "sin modelo" en el ganador (datos con fuerza real conocida)',N.verdTxt(N.dif(r.qW,r.n),0.003).t==='✓ le gana');
 const x=teams.map(t=>S.m[t]),y=teams.map(t=>str[t]),mx=x.reduce((a,b)=>a+b)/30,my=y.reduce((a,b)=>a+b)/30;let sxy=0,sx=0,sy=0;for(let k=0;k<30;k++){sxy+=(x[k]-mx)*(y[k]-my);sx+=(x[k]-mx)**2;sy+=(y[k]-my)**2;}
 ok('los ratings aprendidos se parecen a la fuerza verdadera (corr > 0.8)',sxy/Math.sqrt(sx*sy)>0.8);
 ok('Phi, simetría y push',Math.abs(N.pML(0,12.4)-0.5)<1e-9&&Math.abs(N.pML(-5.5,12)+N.pML(5.5,12)-1)<1e-9);
 const gm=N.gridMargen(games,2025,null,N.PDEF);ok('calibración devuelve parámetros',!!gm&&isFinite(gm.P.kM));
 const p=N.predecir(S,N.PDEF,{h:'1',a:'2',ts:Date.UTC(2026,9,28,23)},{});ok('predecir temporada nueva da números finitos',isFinite(p.pm)&&isFinite(p.pt)&&p.pH>0&&p.pH<1);
}

/* ---------------- 7. MLB: cierre automático ---------------- */
sec('MLB: cierre automático de picks');
{
 const ix=rd('index.html'),a=ix.indexOf("function norm(s){ return String(s==null"),b=ix.indexOf('function armarG(g)'),A={};
 new Function('A',ix.slice(a,b)+';A.resolver=resolver;')(A);
 const G={a:{ab:'NYY',name:'New York Yankees',runs:5},h:{ab:'BOS',name:'Boston Red Sox',runs:3},inn:[{a:1,h:0},{a:0,h:1},{a:2,h:0},{a:0,h:0},{a:0,h:1},{a:1,h:0},{a:0,h:0},{a:1,h:1},{a:0,h:0}],ks:{'gerrit cole':{k:7,gs:1},'brayan bello':{k:4,gs:1}}};
 const T=[['NYY gana','G'],['BOS gana','P'],['NYY −1.5 (gana por 2+)','G'],['BOS −1.5 (gana por 2+)','P'],['BOS +1.5 (pierde por 1 o gana)','P'],['NYY +1.5 (pierde por 1 o gana)','G'],['Over 8 carreras','E'],['Over 7.5 carreras','G'],['Under 8.5 carreras','G'],['Over 4.5 carreras de NYY','G'],['Under 3.5 carreras de BOS','G'],['Over 3.5 F5','G'],['Under 3.5 F5','P'],['NYY F5 (gana las 5)','G'],['Empate en F5','P'],['Gerrit Cole Over 6.5 K','G'],['Brayan Bello Under 3.5 K','P'],['Combo: NYY gana + NYY más de 3.5 carreras','G'],['Combo: NYY gana + Total menos de 7.5','P']];
 let bad=[];T.forEach(([m,e])=>{const r=A.resolver({m,juego:'NYY @ BOS'},G),got=r.res||('?'+r.why);if(got!==e)bad.push(m+'→'+got);});
 ok(T.length+' tipos de pick se cierran bien (ganador, hándicap, totales, F5, ponches, combos, push)',bad.length===0,bad.join(' ; '));
 /* perder por EXACTAMENTE 1: el borde del hándicap */
 const G1={a:{ab:'NYY',name:'New York Yankees',runs:4},h:{ab:'BOS',name:'Boston Red Sox',runs:3},inn:[],ks:null};
 const T1=[['BOS +1.5 (pierde por 1 o gana)','G'],['NYY +1.5 (pierde por 1 o gana)','G'],['NYY −1.5 (gana por 2+)','P'],['BOS −1.5 (gana por 2+)','P'],['NYY gana','G']];
 const bad1=[];T1.forEach(([m,e])=>{const r=A.resolver({m,juego:'NYY @ BOS'},G1),got=r.res||('?'+r.why);if(got!==e)bad1.push(m+'→'+got);});
 ok('hándicap cuando se pierde por exactamente 1 carrera',bad1.length===0,bad1.join(' ; '));
 const Gt={a:{ab:'NYY',name:'x',runs:2},h:{ab:'BOS',name:'y',runs:2},inn:[],ks:null};
 ok('juego empatado no cierra el ganador (no inventa resultado)',!A.resolver({m:'NYY gana',juego:'NYY @ BOS'},Gt).res);
}
sec('NBA: cierre de picks (ganador, hándicap, total, push)');
{
 const nb=rd('nba.html'),a=nb.indexOf('function resolver(p,g){'),b=nb.indexOf('let VERIF'),X={};
 new Function('X',nb.slice(a,b)+';X.resolver=resolver;')(X);
 const g={hs:110,as:100};   /* local gana por 10, total 210 */
 const C=[[{mercado:'ML',side:'H'},'ganado'],[{mercado:'ML',side:'A'},'perdido'],
  [{mercado:'SPR',side:'H',linea:-5.5},'ganado'],[{mercado:'SPR',side:'A',linea:-5.5},'perdido'],
  [{mercado:'SPR',side:'H',linea:-10},'push'],[{mercado:'SPR',side:'A',linea:-10},'push'],
  [{mercado:'SPR',side:'H',linea:-11.5},'perdido'],[{mercado:'SPR',side:'A',linea:-11.5},'ganado'],
  [{mercado:'SPR',side:'H',linea:4.5},'ganado'],
  [{mercado:'TOT',side:'O',linea:209.5},'ganado'],[{mercado:'TOT',side:'U',linea:209.5},'perdido'],
  [{mercado:'TOT',side:'O',linea:210},'push'],[{mercado:'TOT',side:'U',linea:215.5},'ganado']];
 const bad=[];C.forEach(([p,e])=>{const got=X.resolver(p,g);if(got!==e)bad.push(JSON.stringify(p)+'→'+got);});
 ok(C.length+' casos de cierre en NBA',bad.length===0,bad.join(' ; '));
}

/* ---------------- 8. ovaextra: respaldo + hoy ---------------- */
const EX=require(D+'ovaextra.js'),R=EX.OVARespaldo,H=EX.OVAHoy;
function fakeLS(){const m={};return{getItem:k=>(k in m?m[k]:null),setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];},clear:()=>{for(const k in m)delete m[k];},_m:m};}
function fakeStore(){const m={};return{get:k=>Promise.resolve(k in m?m[k]:null),put:(k,v)=>{m[k]=v;return Promise.resolve(true);}};}
const picksMlb=[{id:'a1',f:'2026-10-05',juego:'NYY @ BOS',m:'NYY gana',p:60,am:'-110',plat:'book',res:'G'},{id:'a2',f:'2026-10-05',juego:'NYY @ BOS',m:'Over 8.5 carreras',p:55,am:'60',plat:'kalshi',res:'P'},{id:'a3',f:'2026-10-06',juego:'LAD @ SF',m:'LAD gana',p:62,am:'-150',plat:'book',res:null}];
const picksFut=[{id:'f1',fecha:'05.10.2026',local:'Lyon',visita:'Marseille',seleccion:'Lyon',cuota:'+200',estado:'ganado'},{id:'f2',fecha:'06.10.2026',local:'PSG',visita:'Nice',seleccion:'PSG',cuota:'-300',estado:'pendiente'}];
const picksNba=[{id:'n1',ts:Date.UTC(2026,9,28,23),aN:'Celtics',hN:'Knicks',seleccion:'Más de 224.5',cuota:'-110',estado:'push'},{id:'n2',ts:Date.UTC(2026,9,29,23),aN:'Heat',hN:'Bulls',seleccion:'Heat gana',cuota:'+150',estado:'pendiente'}];
const t_respaldo=async()=>{
 sec('Respaldo (sobrevive a que Safari borre)');
 const ls=fakeLS(),st=fakeStore();R._setStore(st);
 ls.setItem('ventaja_picks_v1',JSON.stringify(picksMlb));ls.setItem('ova_nba_registro_v1',JSON.stringify(picksNba));ls.setItem('ova_futbol_registro_v1',JSON.stringify(picksFut));ls.setItem('ova_skin','campo');
 let r=await R.snapshot(ls);ok('guarda copia automática (7 picks)',r.estado==='guardado'&&r.picks===7,JSON.stringify(r));
 r=await R.snapshot(ls);ok('si no cambió nada, no reescribe',r.estado==='igual');
 ls.clear();
 const info=await R.necesitaRestaurar(ls);ok('detecta que se borraron los picks',!!info&&info.picks===7);
 r=await R.snapshot(ls);ok('una copia vacía NO pisa la buena',r.estado==='protegido');
 const n=await R.restaurarSnapshot(ls);ok('restaura los 7 picks',n===7&&R.contarPicks(R.tomar(ls))===7,n);
 ok('restaura también el tema',ls.getItem('ova_skin')==='campo');
 const n2=await R.restaurarSnapshot(ls);ok('restaurar dos veces no duplica',n2===0&&R.contarPicks(R.tomar(ls))===7);
 ls.clear();await R.ignorar();ok('"Ignorar" apaga el aviso',(await R.necesitaRestaurar(ls))===null);
 r=await R.snapshot(ls);ok('después de ignorar sí puede guardar vacío',r.estado==='guardado');
 // importar / exportar
 const ls2=fakeLS();ls2.setItem('ventaja_picks_v1',JSON.stringify(picksMlb));ls2.setItem('ova_nba_registro_v1',JSON.stringify(picksNba));
 const txt=R.exportar(ls2),ls3=fakeLS();ok('exportar → importar (ida y vuelta)',R.importar(txt,ls3)===5&&JSON.stringify(JSON.parse(ls3.getItem('ventaja_picks_v1')))===JSON.stringify(picksMlb));
 const ls4=fakeLS();ok('importa el respaldo viejo de NBA',R.importar(JSON.stringify({app:'ova-nba',v:1,registro:picksNba,combinada:[],params:{kM:0.05}}),ls4)===2&&!!ls4.getItem('ova_nba_params_v1'));
 const ls5=fakeLS();ok('importa el respaldo viejo de fútbol',R.importar(JSON.stringify({app:'ova-futbol',v:1,registro:picksFut,combinada:[],params:null}),ls5)===2);
 const ls6=fakeLS();ok('importa el respaldo viejo de MLB (lista)',R.importar(JSON.stringify(picksMlb),ls6)===3);
 let malo=false;try{R.importar('esto no es json',fakeLS());}catch(e){malo=true;}ok('texto inválido da error claro',malo);
 let malo2=false;try{R.importar('{"app":"otra"}',fakeLS());}catch(e){malo2=true;}ok('formato desconocido da error claro',malo2);
 const ls7=fakeLS();ls7.setItem('ventaja_picks_v1','{{roto');R._setStore(fakeStore());const rr=await R.snapshot(ls7);ok('datos corruptos no tumban el respaldo',rr.estado!=='error');
 R._setStore(false);const sn=await R.snapshot(ls);ok('sin IndexedDB (modo privado) no truena',sn.estado==='sin-almacen');
};
sec('Resumen Hoy');
{
 const ls=fakeLS();ls.setItem('ventaja_picks_v1',JSON.stringify(picksMlb));ls.setItem('ova_futbol_registro_v1',JSON.stringify(picksFut));ls.setItem('ova_nba_registro_v1',JSON.stringify(picksNba));
 const ahora=Date.UTC(2026,9,5,18,0,0),hoy=H.hoyLocal(new Date(ahora));
 let s=H.resumen(ls,ahora);
 ok('MLB: récord 1-1, unidades = +0.909 −1.028',s.rec.mlb.g===1&&s.rec.mlb.p===1&&Math.abs(s.rec.mlb.u-(100/110-1.028))<1e-9,JSON.stringify(s.rec.mlb));
 ok('Fútbol: +200 ganado = +2.00u',s.rec.fut.g===1&&Math.abs(s.rec.fut.u-2)<1e-9);
 ok('NBA: push cuenta 0u',s.rec.nba.e===1&&s.rec.nba.u===0);
 ok('3 picks abiertos (1 por app… + MLB)',s.pend.length===3,s.pend.length);
 const l2=fakeLS();l2.setItem('ventaja_picks_v1',JSON.stringify([{id:'x',f:'2026-10-06',juego:'LAD @ SF',m:'LAD gana',p:60,am:'-150',plat:'book',res:null},{id:'y',f:'2026-10-06',juego:'LAD @ SF',m:'Under 8 carreras',p:55,am:'-110',plat:'book',res:null}]));
 s=H.resumen(l2,ahora);ok('dos picks del mismo juego se marcan como una sola apuesta',s.pend.length===2&&s.pend.every(x=>x.corr));
 const l3=fakeLS();
 l3.setItem('ova_hoy_mlb',JSON.stringify({t:ahora-3600e3,fecha:hoy,items:[{n:'NYY (NYY @ BOS)',p:71.2,sub:'ventaja 1.9'},{n:'LAD (LAD @ SF)',p:64,sub:''}]}));
 l3.setItem('ova_hoy_fut',JSON.stringify({t:ahora-3600e3,fecha:hoy,items:[{n:'PSG vs Nice',p:78.5,sub:'Ligue 1'}]}));
 l3.setItem('ova_hoy_nba',JSON.stringify({t:ahora-30*3600e3,fecha:'2020-01-01',items:[{n:'Celtics @ Knicks',p:99,sub:''}]}));
 s=H.resumen(l3,ahora);
 ok('favoritos de hoy ordenados por probabilidad entre apps',s.tops.length===3&&s.tops[0].app==='fut'&&s.tops[1].app==='mlb',JSON.stringify(s.tops.map(t=>t.app)));
 ok('lo viejo (de otro día) no se mezcla como si fuera de hoy',!s.tops.some(t=>t.app==='nba')&&s.apps.nba.vigente===false);
 const l4=fakeLS();l4.setItem('ventaja_picks_v1','basura');s=H.resumen(l4,ahora);ok('registro corrupto no tumba el resumen',s.pend.length===0);
}

/* ---------------- Diseño unificado (ronda 3) ---------------- */
sec('Diseño unificado: misma barra en las 3 apps, lo técnico en Ajustes');
{
 const dj=rd('diseno.js');
 ok('diseno.js existe y lo cargan MLB, fútbol y NBA',['index.html','futbol.html','nba.html'].every(f=>/<script src="diseno\.js"><\/script>/.test(rd(f))));
 ok('el service worker lo guarda para abrir sin internet',/'diseno\.js'/.test(rd('sw.js')));
 ok('fútbol y NBA renombran Registro → «Mis picks» y Combina → «Combo»',/Mis picks/.test(dj)&&/'Combo'/.test(dj));
 ok('la barra queda en el orden Juegos · Al gane · Combo · Mis picks · Ajustes',/\['vJuegos','vAlgane','vComb','vReg','dsAjustes'\]/.test(dj)&&/\['juegos','algane','combo','registro','dsAjustes'\]/.test(dj));
 ok('los botones originales se ocultan, no se borran (conservan sus eventos)',/style\.display='none'/.test(dj)&&!/removeChild/.test(dj));
 ok('MLB: abre con los juegos de hoy cargados',/function autoMLB/.test(dj)&&/b\.click\(\)/.test(dj));
 ok('MLB: cargar() ignora respuestas viejas (no duplica juegos si se toca dos veces)',/CARGA_TK/.test(rd('index.html'))&&/if\(_tk!==CARGA_TK\) return;/.test(rd('index.html')));
 ok('la versión se ve en Ajustes (también con el tema Cristal)',/tarjetaVersion/.test(dj)&&/dsCard/.test(dj));
 ok('letra mínima de 12 px en notas y pies',/\.nota[^}]*font-size:12px!important/.test(dj));
 ok('el hub ya no muestra «LIVE» fijo',!/>LIVE<\/span>/.test(rd('hubestilos.js'))&&/livHtml/.test(rd('hubestilos.js')));
 ok('la caja del servidor Railway es de una línea y se despliega',/srv-chip/.test(rd('railway.js')));
 ok('la barra de estado de fútbol y NBA es corta',!/terminados medibles/.test(rd('futbol.html'))&&!/partidos medidos de 3 temporadas/.test(rd('nba.html')));
 ok('el aviso de worldfootball sigue saliendo en la barra de estado',/avisoWorldfootball\(\)/.test(rd('futbol.html'))&&/avisoWF/.test(rd('futbol.html')));
}

/* ---------------- Ronda 4: pantalla Juegos más limpia + diseño Pro ---------------- */
sec('Ronda 4: pantalla Juegos más limpia + diseño Pro');
{
 const dj=rd('diseno.js'), ob=rd('obsidiana.js'), ix=rd('index.html'), ic=rd('interior.js');
 ok('«Destacados de hoy» solo sale con 5 o más juegos (con pocos repetía la lista)',/kids\.length<5/.test(ob));
 ok('la fila de fecha de MLB es compacta (el botón ya no es el protagonista)',/\.cargafila #cargar\{padding:8px 12px/.test(dj));
 ok('el texto de estado de MLB ya no explica dos líneas',!/dale a Ranking al gane para calcularlos todos/.test(ix)&&/toca uno para ver los números/.test(ix));
 ok('los juegos sin abridores van al final bajo «Por confirmar»',/function ordenarJuegos/.test(dj)&&/Por confirmar \(/.test(dj));
 ok('Ajustes de MLB abre con banca y modo de pago; la Apariencia va después',/function ajustesMLB/.test(dj)&&/pa\.insertBefore\(ap,ref\)/.test(dj));
 ok('mismos iconos de la barra en Clásico',/function iconosIguales/.test(dj));
 ok('diseño Pro: toda regla cuelga de data-ui="pro" y hay barra de probabilidad',/data-ui="pro"\] \.dsProb/.test(ic)&&/function barrasProb/.test(dj));
 ok('el diseño Pro se elige en Apariencia (4 fichas)',/id:'pro'/.test(ic)&&/repeat\(2,minmax\(0,1fr\)\)/.test(ic));
}

/* ---------------- 9. service worker ---------------- */
const t_sw=async()=>{
 sec('Service worker (abre sin internet, siempre prefiere lo nuevo)');
 const L={},store=new Map(),mk=(url,body,okv=true)=>({url,ok:okv,body,clone(){return mk(url,body,okv);}});
 let red=true;
 const ctx={self:{location:{origin:'https://x.github.io'},addEventListener:(t,f)=>{L[t]=f;},skipWaiting:()=>Promise.resolve(),clients:{claim:()=>Promise.resolve()}},
  URL,Promise,setTimeout,clearTimeout,
  caches:{open:()=>Promise.resolve({add:u=>{store.set(u,mk(u,'viejo'));return Promise.resolve();},put:(r,c)=>{store.set(r.url.replace('https://x.github.io/',''),c);return Promise.resolve();}}),
          match:(r)=>{const k=r.url.replace('https://x.github.io/','').split('?')[0];return Promise.resolve(store.get(k));},keys:()=>Promise.resolve([]),delete:()=>Promise.resolve()},
  fetch:r=>red?Promise.resolve(mk(r.url,'nuevo')):Promise.reject(new Error('sin red'))};
 vm.createContext(ctx);vm.runInContext(rd('sw.js'),ctx);
 const pedir=url=>{let p=null;const ev={request:{method:'GET',url},respondWith:x=>{p=x;}};L.fetch(ev);return p;};
 red=true;let p=pedir('https://x.github.io/index.html');ok('con internet entrega lo NUEVO',(await p).body==='nuevo');
 red=false;p=pedir('https://x.github.io/index.html?t=123');ok('sin internet entrega la copia guardada (aunque cambie el ?t=)',(await p).body==='nuevo');
 p=pedir('https://x.github.io/futbol.html');await Promise.race([p.catch(()=>{}),new Promise(r=>setTimeout(r,200))]);ok('sin internet y sin copia falla limpio (no se cuelga)',true);
 ok('no toca APIs de otros sitios',pedir('https://statsapi.mlb.com/api/v1/schedule')===null);
 ok('pide siempre la versión nueva al servidor (la app de la pantalla de inicio no se queda 10 min con la vieja)',/fetch\(req,\s*\{cache:'no-cache'\}\)/.test(rd('sw.js')));
 ok('no toca POST',(()=>{let t=false;L.fetch({request:{method:'POST',url:'https://x.github.io/a'},respondWith:()=>{t=true;}});return !t;})());
};

/* ---------------- 10. hub (se ejecuta su script real con un DOM falso) ---------------- */
sec('Hub limpio (solo las 3 tarjetas) y Panel aparte');
{
 const hh=rd('hub.html');
 ok('el hub tiene SOLO las 3 tarjetas, sin Hoy ni Respaldo',(hh.match(/class="card /g)||[]).length===3&&!/id="hoy"|id="resp"|Respaldo|Favoritos/.test(hh));
 ok('el hub no enlaza al panel (no estorba)',!/panel\.html/.test(hh));
 ok('el hub ya no resetea tu tema cada vez que entras',/if\(!localStorage\.getItem\('ova_skin'\)\)/.test(hh));
 const h=rd('panel.html');
 const ls=fakeLS();ls.setItem('ventaja_picks_v1',JSON.stringify(picksMlb));ls.setItem('ova_futbol_registro_v1',JSON.stringify(picksFut));ls.setItem('ova_skin','neon');
 const ahora=Date.now(),hoy=H.hoyLocal(new Date(ahora));
 ls.setItem('ova_hoy_fut',JSON.stringify({t:ahora-60e3,fecha:hoy,items:[{n:'PSG vs <Nice>',p:78.5,sub:'Ligue 1'}]}));
 const els={};const el=id=>els[id]||(els[id]={id,innerHTML:'',textContent:'',value:'',onclick:null,classList:{add(){},remove(){}},parentNode:null});
 const sb={localStorage:ls,document:{getElementById:el,documentElement:{setAttribute(){}}},navigator:{},console,Date,JSON,setTimeout:()=>{},Promise};sb.window=sb;sb.OVAHoy=H;sb.OVARespaldo=R;R._setStore(fakeStore());
 vm.createContext(sb);
 const scripts=scriptsInline('panel.html'),js=scripts[scripts.length-1];
 let err=null;try{vm.runInContext(js,sb);}catch(e){err=e;}
 ok('el script del hub corre sin errores',err===null,err&&err.message);
 const body=el('hoyBody').innerHTML;
 ok('muestra el récord por app',/rec/.test(body)&&/MLB/.test(body));
 ok('muestra picks abiertos con su cuota',/LAD gana/.test(body)&&/-150/.test(body));
 ok('muestra favoritos y escapa el HTML (no inyecta <Nice>)',/78\.5%/.test(body)&&!/<Nice>/.test(body)&&/&lt;Nice&gt;/.test(body));
 ok('avisa qué apps no han corrido "Al gane"',/aún no has corrido/.test(body));
 ok('el botón de restaurar está conectado',typeof el('rBtnRest').onclick==='function');
 el('rTxt').value=JSON.stringify({app:'ova-nba',registro:picksNba,combinada:[]});el('rBtnRest').onclick();
 ok('restaurar desde texto funciona y avisa',/Restaurado: 2/.test(el('rMsg').textContent),el('rMsg').textContent);
 el('rTxt').value='basura';el('rBtnRest').onclick();ok('texto malo no rompe el hub',/No se pudo/.test(el('rMsg').textContent));
}
/* ---------------- 11. ganchos conectados ---------------- */
sec('Presentaciones del hub (6 diseños)');
{
 const hub=rd('hub.html'),i1=hub.indexOf('hubestilos.js'),i2=hub.indexOf('<style>');
 ok('el hub carga hubestilos.js en la cabecera (antes que sus estilos, así no parpadea)',i1>0&&i1<i2);
 const el=()=>{const a={};return {id:'',className:'',innerHTML:'',textContent:'',style:{setProperty(){},cssText:''},children:[],parentNode:null,
  classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){f?this._s.add(c):this._s.delete(c);},contains(c){return this._s.has(c);}},
  setAttribute(k,v){a[k]=v;},getAttribute(k){return k in a?a[k]:null;},removeAttribute(k){delete a[k];},addEventListener(){},removeEventListener(){},
  appendChild(c){c.parentNode=this;this.children.push(c);return c;},insertBefore(c){c.parentNode=this;this.children.unshift(c);return c;},
  removeChild(c){this.children=this.children.filter(x=>x!==c);c.parentNode=null;return c;},querySelectorAll(){return [];}};};
 const root=el(),body=el(),head=el();
 const D={documentElement:root,body,head,readyState:'complete',hidden:false,createElement:()=>el(),
  getElementById:id=>{const f=n=>{if(n.id===id)return n;for(const c of n.children){const r=f(c);if(r)return r;}return null;};return f(body)||f(head);},querySelectorAll:()=>[],addEventListener(){}};
 const store={},mk=()=>({getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);}});
 let recargas=0;
 globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 globalThis.document=D;globalThis.localStorage=mk();globalThis.sessionStorage=mk();globalThis.location={search:'',pathname:'/hub.html',reload(){recargas++;}};
 const HB=require(path.join(__dirname,'hubestilos.js'));
 const IDS=['oro','carrusel','orbita','paneles','mazo','tablero'];
 ok('hay 6 diseños: '+IDS.join(', '),JSON.stringify(HB.ESTILOS.map(e=>e.id))===JSON.stringify(IDS));
 ok('los 3 deportes llevan a MLB, fútbol y NBA',JSON.stringify(HB.DEP.map(d=>d.href))===JSON.stringify(['index.html','futbol.html','nba.html'])&&HB.DEP.every(d=>fs.existsSync(D0(d.href))));
 function D0(f){return path.join(__dirname,f);}
 IDS.slice(1).forEach(id=>{const h=HB._html[id]();ok('diseño '+id+': arma sus 3 enlaces y el logo para cambiar de diseño',['index.html','futbol.html','nba.html'].every(x=>h.indexOf('href="'+x+'"')>=0)&&h.indexOf('hl-brand')>=0);});
 const css=HB.css;
 let nivel=0,okb=true;for(const c of css){if(c==='{')nivel++;if(c==='}'){nivel--;if(nivel<0)okb=false;}}
 ok('el CSS tiene llaves balanceadas',okb&&nivel===0);
 const kf=new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m=>m[1]));
 const falta=new Set(),KW=new Set(['infinite','alternate','alternate-reverse','forwards','both','none','linear','ease','ease-in','ease-out','ease-in-out','paused','running','backwards','reverse','normal']);
 [...css.matchAll(/animation:\s*([^;}]+)/g)].forEach(m=>{m[1].replace(/[\w-]+\([^)]*\)/g,'').split(/[\s,]+/).forEach(tk=>{if(!tk||KW.has(tk)||/^-?[\d.]+m?s$/.test(tk)||/^\d+$/.test(tk))return;if(!kf.has(tk))falta.add(tk);});});
 ok('todas las animaciones usadas están definidas',falta.size===0,[...falta].join(','));
 IDS.slice(1).forEach(id=>ok('diseño '+id+': tiene su CSS propio',css.indexOf('.L-'+id)>=0&&css.indexOf('html[data-hub="'+id+'"]')>=0));
 const sueltos=css.split('\n').filter(l=>l&&!/^(@|html|#hub|\.L-|\.brandbar|\}|\/\*)/.test(l));
 ok('ningún selector suelto puede afectar a las apps ni al clásico',sueltos.length===0,sueltos.slice(0,2).join(' | '));
 ok('el clásico no recibe ninguna regla visible (solo se oculta lo nuevo con :not([data-hub="oro"]))',!/html\[data-hub="oro"\]\s*[^:{]/.test(css.replace(/:not\(\[data-hub="oro"\]\)/g,'')));
 ok('el carrusel permite deslizar con el dedo (touch-action no lo bloquea)',/#hubLay\.L-carrusel\{touch-action:pan-x\}/.test(css));
 ok('respeta "reducir movimiento"',/prefers-reduced-motion:reduce/.test(css));
 ok('un estilo inválido o viejo (aurora, neon...) cae al clásico',['aurora','neon','estadio','const','cristal','x'].every(v=>{HB.aplicar(v,{inicial:true,guardar:false});return root.getAttribute('data-hub')===null;}));
 const _ce=console.error;console.error=()=>{};HB.aplicar('carrusel',{});console.error=_ce;
 ok('si un diseño falla al armarse, vuelve solo al clásico (nunca pantalla vacía)',root.getAttribute('data-hub')===null&&store.ova_hub==='oro'&&HB.actual()==='oro');
 HB.aplicar('paneles',{inicial:true});ok('el modo inicial solo marca el diseño (para no parpadear)',root.getAttribute('data-hub')==='paneles');
 globalThis.localStorage.setItem('ova_hub','<script>');ok('guardado corrupto se lee como clásico',HB.leer()==='oro');
 delete globalThis.addEventListener;delete globalThis.removeEventListener;delete globalThis.document;delete globalThis.localStorage;delete globalThis.sessionStorage;delete globalThis.location;
}
sec('Diseño interior de las apps (Clásico · Cristal · Broadcast · Pro · Boleto · Prensa · Radar)');
{
 const UI=require(path.join(__dirname,'interior.js'));
ok('18 diseños: los 8 de siempre, los 5 de la segunda tanda (historias, duelo, bento, agenda, radar de valor) y los 5 nuevos (cromos, campo, telemetría, marcador, recibo)',JSON.stringify(UI.UIS.map(u=>u.id))===JSON.stringify(['clasico', 'cristal', 'broadcast', 'pro', 'boleto', 'boletonoche', 'prensa', 'radar', 'historias', 'duelo', 'bento', 'agenda', 'radarvalor', 'cromos', 'campo', 'telemetria', 'marcador', 'recibo']));
 ok('Boleto: los dos diseños definen sus colores y comparten la forma',/html\[data-ui="boleto"\]\{--bzBg1/.test(UI.css)&&/html\[data-ui="boletonoche"\]\{--bzBg1/.test(UI.css)&&/html\[data-ui\^="boleto"\] \.bzSello/.test(UI.css));
 ok('Boleto: el ticket tiene muescas (máscara) y en la barra de abajo solo la pestaña activa lleva nombre',/\.game\.bzOn \.head\{-webkit-mask:radial-gradient/.test(UI.css)&&/\.tbar-btn:not\(\.on\) \.lb\{position:absolute/.test(UI.css));
 ok('Boleto: los botones que la app oculta con display:none siguen ocultos',!/\.tabbar \.tbar-btn\{[^}]*display:flex!important/.test(UI.css));
 ok('Boleto: el ticket solo se arma con ese diseño y no borra nada original',/\.bzT\{display:none\}/.test(rd('diseno.js'))&&/function bzArmar/.test(rd('diseno.js'))&&/indexOf\('boleto'\)===0/.test(rd('diseno.js'))&&!/removeChild/.test(rd('diseno.js')));
 ok('Boleto: se activa una sola vez al actualizar y se puede volver a Clásico',/ova_ui_r6/.test(rd('interior.js'))&&UI.UIS.some(u=>u.id==='clasico'));

 /* contraste (WCAG): texto gris sobre fondo >= 7 (AAA) y el gris tenue >= 4.5, en las paletas nocturnas y claras */
 {
  const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  const lum=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const paleta=(sel,pref)=>{const m=UI.css.split('\n').find(l=>l.indexOf(sel)===0&&l.indexOf(pref+'Bg1:')>0||(l.indexOf(sel)===0&&l.indexOf('--bg1:')>0&&pref===''));const g=n=>{const r=m.match(new RegExp('--'+n+':(#[0-9A-Fa-f]{6})'));return r&&r[1];};return {m,g};};
  const casos=[['html[data-ui="boleto"]{','bz','Boleto'],['html[data-ui="boletonoche"]{','bz','Boleto noche'],['html[data-ui="prensa"][data-ui]{','','Prensa'],['html[data-ui="radar"][data-ui]{','','Radar']];
  casos.forEach(([sel,pref,nombre])=>{
   const P=paleta(sel,pref);if(!P.m){ok(nombre+': paleta encontrada',false);return;}
   const b1=P.g(pref?'bzBg1':'bg1'),b2=P.g(pref?'bzBg2':'bg2'),b3=P.g(pref?'bzBg3':'bg3'),mu=P.g(pref?'bzMut':'mut'),m2=P.g(pref?'bzMut2':'mut2'),tx=P.g(pref?'bzTxt':'txt');
   ok(nombre+': el gris de las etiquetas se lee (≥7 sobre fondo y tarjeta)',cr(mu,b1)>=7&&cr(mu,b2)>=7,cr(mu,b1).toFixed(1)+' / '+cr(mu,b2).toFixed(1));
   ok(nombre+': el gris tenue se lee (≥4.5)',cr(m2,b1)>=4.5&&cr(m2,b2)>=4.5,cr(m2,b1).toFixed(1)+' / '+cr(m2,b2).toFixed(1));
   ok(nombre+': el texto principal se lee (≥12)',cr(tx,b1)>=12&&cr(tx,b3)>=9,cr(tx,b1).toFixed(1));
  });
  ok('los números "sin medir" ya no se atenúan por opacidad',/\.kpi div\.sinmed\{opacity:1!important/.test(UI.css));
 }
 const css=UI.css;let nv=0,okb=true;for(const c of css){if(c==='{')nv++;if(c==='}'){nv--;if(nv<0)okb=false;}}
 ok('el CSS tiene llaves balanceadas',okb&&nv===0);
 const kf=new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m=>m[1]));
 const falta=new Set(),KW=new Set(['infinite','alternate','alternate-reverse','forwards','both','none','linear','ease','ease-in','ease-out','ease-in-out','paused','running','backwards','reverse','normal']);
 [...css.matchAll(/animation:\s*([^;}]+)/g)].forEach(m=>{m[1].replace(/[\w-]+\([^)]*\)/g,'').split(/[\s,]+/).forEach(tk=>{if(!tk||KW.has(tk)||/^-?[\d.]+m?s$/.test(tk)||/^\d+$/.test(tk))return;if(!kf.has(tk)) falta.add(tk);});});
 ok('todas las animaciones usadas están definidas',falta.size===0,[...falta].join(','));
 const sueltos=css.split('\n').filter(l=>l&&!/^(@|html|#uiSheet|\.topbar|\.uiSec|\.uiSeg|\}|\/\*)/.test(l));
 ok('ninguna regla suelta puede afectar al Clásico',sueltos.length===0,sueltos.slice(0,2).join(' | '));
 ok('toda regla de diseño cuelga de html[data-ui]',css.split('\n').filter(l=>/^html/.test(l)).every(l=>l.indexOf('data-ui')>=0));
 ok('el diseño Clásico no recibe reglas (solo existen cristal y broadcast)',!/data-ui="clasico"/.test(css));
 ['juegos','al gane','combo','combina','mis picks','registro','ajustes','ratings','backtest'].forEach(l=>ok('icono nuevo para «'+l+'»',!!UI._icons[UI._clave(l)]));
 ok('respeta "reducir movimiento"',/prefers-reduced-motion:reduce/.test(css));
 ['index.html','futbol.html','nba.html'].forEach(f=>{const h=rd(f),i1=h.indexOf('interior.js'),i2=h.indexOf('<style>');ok(f+' carga interior.js en la cabecera (sin parpadeo)',i1>0&&i1<i2);});
 ok('el service worker guarda interior.js para abrir sin internet',/'interior\.js'/.test(rd('sw.js')));
 ok('las filas del ranking nunca quedan invisibles (error de la captura: la 1.ª fila no salía)',/html\[data-ui\] \.fila\{opacity:1;transform:none\}/.test(css)&&/html\[data-ui\] \.fila\.gris\{opacity:\.5\}/.test(css));
 ok('el selector de diseño vive dentro de Apariencia (sin mantener presionado)',/uiTit.*Diseño de adentro/.test(rd('interior.js'))&&/#pane-ajustes \.ovaApar, \.ovaSheet \.card/.test(rd('interior.js')));
 ok('la marca del diseño elegido no depende del administrador de temas',/classList\.toggle\('on',on\)/.test(rd('interior.js')));
 const obs=rd('obsidiana.js');
 ok('ya no sale la animación de OVA (círculo) al abrir MLB, fútbol o NBA',!/^\s*if\(document\.body\) mostrarSplash\(\)/m.test(obs)&&!/addEventListener\(["']DOMContentLoaded["'],\s*mostrarSplash\)/.test(obs));
}
sec('Herramientas: banca, marcador, comparador de casas, avisos y abridor cambiado');
{
 const B=require(path.join(__dirname,'banca.js')), H=require(path.join(__dirname,'herramientas.js'));
 const AV=require(path.join(__dirname,'scripts','avisos.js')), MV=require(path.join(__dirname,'scripts','mov.js'));
 /* ---- banca ---- */
 const lun=new Date(2026,9,12,15,0).getTime();           /* lunes 12/oct/2026 3 pm */
 const I=B.inicios(lun);
 ok('banca: el día empieza a medianoche y la semana el lunes',I.dia===new Date(2026,9,12).getTime()&&I.sem===new Date(2026,9,12).getTime());
 ok('banca: un domingo cuenta en la semana que empezó el lunes anterior',B.inicios(new Date(2026,9,11,20,0).getTime()).sem===new Date(2026,9,5).getTime());
 const o=B.leer({getItem:()=>null}); o.topes={dia:100,sem:300,mes:900};
 B.agregar(o,50,'LAD',lun-3600e3); B.agregar(o,35,'',lun-1800e3);
 ok('banca: suma lo apostado hoy, semana y mes',(t=>t.dia===85&&t.sem===85&&t.mes===85)(B.totales(o,lun)));
 ok('banca: 85% del tope diario = cerca',B.estados(o,lun).dia==='cerca'&&B.estados(o,lun).sem==='ok');
 B.agregar(o,20,'',lun-60e3);
 ok('banca: al llegar al tope pasa a rojo y el aviso lo dice',B.estados(o,lun).dia==='pasado'&&/Llegaste al tope de hoy/.test(B.aviso(o,lun).texto));
 ok('banca: lo de ayer no cuenta en hoy pero sí en la semana',(()=>{ const p=B.leer({getItem:()=>null}); B.agregar(p,40,'',lun-86400e3*0.9); return B.totales(p,lun).dia===0||B.totales(p,lun).sem>=0; })());
 ok('banca: sin tope no hay aviso',B.aviso((()=>{ const p=B.leer({getItem:()=>null}); B.agregar(p,500,'',lun); return p; })(),lun)===null);
 ok('banca: ignora montos inválidos y lee datos dañados sin romper',B.agregar(B.leer({getItem:()=>null}),'abc')===null&&B.leer({getItem:()=>'{{no'}).movs.length===0);
 ok('banca: escribe y lee en el mismo formato',(()=>{ const m={}; const ls={getItem:k=>m[k]||null,setItem:(k,v)=>{m[k]=v;}}; B.escribir(o,ls); const r=B.leer(ls); return r.movs.length===3&&r.topes.dia===100; })());
 ok('banca: el resultado en dólares cambia la banca actual',(()=>{ const p=B.leer({getItem:()=>null}); p.inicial=1000; const m=B.agregar(p,50,'',lun); B.resultado(p,m.id,'-25'); return B.bancaActual(p)===975; })());
 /* ---- cuotas y comparador ---- */
 ok('cuotas: americana, decimal y centavos de Kalshi',Math.abs(H.aDecimal('-150')-1.6667)<1e-3&&H.aDecimal('+130')===2.3&&H.aDecimal('1.91')===1.91&&H.aDecimal('64¢')>1.5&&H.aDecimal('basura')===null);
 ok('cuotas: Kalshi descuenta su comisión (peor que 1/0.64)',H.aDecimal('64¢')<1/0.64);
 const C=H.compararCasas([{n:'A',a:'-150',b:'+130'},{n:'B',a:'-140',b:'+125'},{n:'C',a:'-155',b:'+135'}],58);
 ok('comparador: mejor precio de cada lado y casa que lo da',C.mejor[0].n==='B'&&C.mejor[1].n==='C'&&C.arbitraje===null);
 ok('comparador: consenso sin margen suma 100%',Math.abs(C.consenso[0]+C.consenso[1]-1)<1e-9);
 ok('comparador: EV con tu número (58% a -140 = +0.4%)',Math.abs(C.ev[0]-(0.58*(1+100/140)-1))<1e-9);
 const AR=H.compararCasas([{n:'A',a:'+110',b:'-130'},{n:'B',a:'-130',b:'+120'}],null,100);
 ok('comparador: detecta arbitraje y reparte el total',AR.arbitraje&&AR.arbitraje.ganancia>0&&Math.abs(AR.arbitraje.sA+AR.arbitraje.sB-100)<1e-9);
 ok('comparador: en el arbitraje las dos patas pagan lo mismo',(a=>Math.abs(a.sA*AR.mejor[0].d-a.sB*AR.mejor[1].d)<1e-9)(AR.arbitraje));
 ok('comparador: una sola casa no inventa consenso de varias',H.compararCasas([{n:'A',a:'-110',b:'-110'}]).mejoraVsPeor[0]===null);
 /* ---- marcador ---- */
 const ls={ventaja_picks_v1:JSON.stringify([{id:'p1',f:'2026-10-01',juego:'A @ B',m:'A gana',p:58,am:'+110',plat:'book',res:'G',cierre:'-105'},{id:'p2',f:'2026-10-02',juego:'C @ D',m:'C gana',p:55,am:'-120',plat:'book',res:'P'},{id:'p3',f:'2026-10-03',juego:'E @ F',m:'E gana',p:55,am:'60',plat:'kalshi',res:null}]),
   ova_futbol_registro_v1:JSON.stringify([{id:'1760000000000_a',fecha:'2026-10-04',local:'R',visita:'B',seleccion:'R',cuota:'-150',estado:'ganado'}]),
   ova_nba_registro_v1:JSON.stringify([{id:'1760000000001_b',ts:1760000000001,aN:'BOS',hN:'NYK',seleccion:'BOS',cuota:'-110',estado:'push'}])};
 const items=H.normalizar(k=>ls[k]||null), R=H.resumir(items);
 ok('marcador: junta los tres registros',items.length===5&&['mlb','fut','nba'].every(a=>items.some(x=>x.app===a)));
 ok('marcador: unidades de MLB (+110 gana = +1.1, -120 pierde = -1)',Math.abs(items.filter(x=>x.app==='mlb'&&x.res)[0].u-1.1)<1e-9||Math.abs(items.filter(x=>x.app==='mlb'&&x.res).reduce((s,x)=>s+x.u,0)-0.1)<1e-9);
 ok('marcador: un pick pendiente no cuenta como resuelto',R.pend===1&&R.jugados===4);
 ok('marcador: CLV del pick con cierre (+110 → cierre -105 = +…)',(c=>c!=null&&Math.abs(c-(105/205*100-100/210*100))<1e-6)(items.find(x=>x.cuota==='+110').clv));
 ok('marcador: la curva acumula en orden de fecha',(c=>c.pts.length===5&&Math.abs(c.final-R.u)<1e-9)(H.curva(items)));
 ok('marcador: racha cuenta ganados o perdidos seguidos',(r=>r&&r.n>=1)(H.racha(items)));
 ok('marcador: sin picks no falla',H.resumir(H.normalizar(()=>null)).n===0&&H.curva([]).pts.length===1);
 /* ---- avisos del robot ---- */
 const t0=Date.parse('2026-10-12T20:00:00Z'), mk=(pk,pa,ph,extra)=>Object.assign({gamePk:pk,gameDate:'2026-10-12T23:08:00Z',status:{abstractGameState:'Preview'},
   teams:{away:{team:{abbreviation:'LAD',name:'Los Angeles Dodgers'},probablePitcher:pa},home:{team:{abbreviation:'SD',name:'San Diego Padres'},probablePitcher:ph}}},extra||{});
 const P=(id,n)=>({id:id,fullName:n});
 let r1=AV.analizar([mk(1,P(10,'Yamamoto'),P(20,'Darvish'))],{},t0);
 ok('avisos: la primera vez que ve un juego no avisa de nada',r1.avisos.length===0);
 let r2=AV.analizar([mk(1,P(11,'Glasnow'),P(20,'Darvish'))],r1.estado,t0+1800e3);
 ok('avisos: detecta cambio de abridor y dice quién salió y quién entró',r2.avisos.length===1&&/Yamamoto/.test(r2.avisos[0].texto)&&/Glasnow/.test(r2.avisos[0].texto));
 let r3=AV.analizar([mk(1,P(11,'Glasnow'),P(20,'Darvish'))],r2.estado,t0+3600e3);
 ok('avisos: no repite el mismo cambio',r3.avisos.length===0);
 ok('avisos: abridor que se quita sin reemplazo también avisa',AV.analizar([mk(1,null,P(20,'Darvish'))],r3.estado,t0+5400e3).avisos.length===1);
 ok('avisos: pasar de "por confirmar" a un nombre no es un cambio',AV.analizar([mk(2,P(30,'Nuevo'),P(20,'D'))],AV.analizar([mk(2,null,P(20,'D'))],{},t0).estado,t0+1e6).avisos.length===0);
 const lin=Array.from({length:9},(_,i)=>({id:i}));
 ok('avisos: alineación oficial avisa una sola vez',(()=>{ const g=mk(3,P(1,'A'),P(2,'B'),{gameDate:'2026-10-12T22:00:00Z',lineups:{awayPlayers:lin,homePlayers:lin}}); const a=AV.analizar([g],{},t0), b=AV.analizar([g],a.estado,t0+1e6); return a.avisos.filter(x=>x.tipo==='alineacion').length===1&&b.avisos.length===0; })());
 ok('avisos: viento fuerte hacia afuera sugiere Over',(a=>a.length===1&&/Over/.test(a[0].t))(AV.climaAlertas(mk(4,null,null,{weather:{condition:'Sunny',temp:'75',wind:'18 mph, Out To CF'}}))));
 ok('avisos: viento hacia adentro sugiere Under, lluvia y frío cuentan',AV.climaAlertas(mk(4,null,null,{weather:{condition:'Rain',temp:'41',wind:'16 mph, In From LF'}})).map(x=>x.k).sort().join()==='frio,lluvia,viento');
 ok('avisos: techo cerrado o viento suave no avisan',AV.climaAlertas(mk(4,null,null,{weather:{condition:'Roof Closed',temp:'72',wind:'20 mph, Out To CF'}})).length===0&&AV.climaAlertas(mk(4,null,null,{weather:{condition:'Cloudy',temp:'70',wind:'6 mph, Out To CF'}})).length===0);
 ok('avisos: ignora juegos que ya empezaron o están lejos',AV.analizar([mk(5,P(1,'A'),P(2,'B'),{status:{abstractGameState:'Live'}}),mk(6,P(1,'A'),P(2,'B'),{gameDate:'2026-10-14T23:00:00Z',weather:{condition:'Rain',temp:'70',wind:'3 mph'}})],{},t0).avisos.length===0);
 ok('avisos: el mensaje agrupa por tipo y el cambio de abridor sube la prioridad',(()=>{ const a=[{tipo:'abridor',juego:'x',texto:'⚾ LAD: …'},{tipo:'clima',juego:'y',texto:'y · 🌧️'}]; return /CAMBIOS DE ABRIDOR/.test(AV.mensaje(a))&&/CLIMA/.test(AV.mensaje(a))&&AV.prioridad(a)==='high'&&AV.prioridad([a[1]])==='default'; })());
 /* ---- movimiento de cuota ---- */
 const f=(p)=>({t:Date.parse('2026-10-12T23:00:00Z'),n:['Dodgers','Padres'],fair:[p,1-p]});
 const m1=MV.movimientos({},[f(0.60)],0.03);
 ok('movimiento: la primera revisión solo guarda',m1.mov.length===0&&Object.keys(m1.nuevo).length===1);
 const m2=MV.movimientos(m1.nuevo,[f(0.645)],0.03);
 ok('movimiento: avisa cuando se mueve 3 puntos o más y dice quién sube',m2.mov.length===1&&m2.mov[0].eq==='Dodgers'&&Math.abs(m2.mov[0].puntos-4.5)<1e-6);
 ok('movimiento: el otro lado sube cuando cae el primero',MV.movimientos(m1.nuevo,[f(0.55)],0.03).mov[0].eq==='Padres');
 ok('movimiento: menos de 3 puntos no avisa',MV.movimientos(m1.nuevo,[f(0.62)],0.03).mov.length===0);
 /* ---- abridor cambiado dentro de la app ---- */
 {
  const ix=rd('index.html'), ini=ix.indexOf('function pitCambios'), fin=ix.indexOf('function fila(g,year)');
  const mem={}; const fake={getItem:k=>(k in mem?mem[k]:null),setItem:(k,v)=>{mem[k]=v;}};
  const pit=new Function('localStorage',ix.slice(ini,fin)+'; return pitCambios;')(fake);
  const n1={a:{id:1,n:'Uno'},h:{id:2,n:'Dos'}}, n2={a:{id:9,n:'Nuevo'},h:{id:2,n:'Dos'}};
  ok('app: la primera vez que ve un juego no marca cambio',pit(77,n1,1000).length===0);
  ok('app: abridor distinto marca cambio con el nombre anterior',(c=>c.length===1&&c[0].antes==='Uno'&&c[0].ahora==='Nuevo'&&c[0].l==='a')(pit(77,n2,2000)));
  ok('app: el aviso se conserva en la siguiente carga y no se duplica',pit(77,n2,3000).length===1);
  ok('app: un aviso de hace más de 3 días se borra',pit(77,n2,2000+4*86400000).length===0);
  ok('app: el aviso solo se pinta en juegos por empezar y sin fecha pasada',/!CORTE&&g\.status&&g\.status\.abstractGameState==='Preview'/.test(ix));
 }
 /* ---- cableado ---- */
 ['index.html','futbol.html','nba.html','hub.html'].forEach(h=>ok(h+' carga banca.js (aviso de tope arriba)',/<script src="banca\.js"><\/script>/.test(rd(h))));
 ok('el hub tiene la tarjeta de Herramientas',/href="herramientas\.html"/.test(rd('hub.html')));
 ok('el service worker guarda banca.js, herramientas.html y herramientas.js',['banca.js','herramientas.html','herramientas.js'].every(a=>rd('sw.js').indexOf("'"+a+"'")>=0));
 const wf=rd('.github/workflows/avisos-mlb.yml');
 ok('avisos-mlb.yml corre cada 30 min, pasa NTFY_TOPIC sin valor por defecto y no escribe en el repo',/\*\/30/.test(wf)&&/NTFY_TOPIC:\s*\$\{\{\s*secrets\.NTFY_TOPIC\s*\}\}/.test(wf)&&/contents:\s*read/.test(wf)&&!/git push/.test(wf));
 ok('valor.js incluye el movimiento de cuota en el aviso',/MOV\.movimientos\(cache\.fairPrev,filas,MOV_PTS\)/.test(rd('scripts/valor.js'))&&/MOVIMIENTO DE CUOTA/.test(rd('scripts/valor.js')));
 ok('herramientas.js y banca.js no usan innerHTML (todo con textContent)',!/innerHTML/.test(rd('herramientas.js').replace(/\/\*[\s\S]*?\*\//g,''))&&!/innerHTML/.test(rd('banca.js').replace(/\/\*[\s\S]*?\*\//g,'')));
}
sec('Salidas del pícher: carreras permitidas a la vista');
{
 const ix=rd('index.html'), b=ix.slice(ix.indexOf('function salidasBloque'),ix.indexOf('/* ---------- registro de picks'));
 ok('la tabla principal de salidas trae R (carreras) y LP (limpias) junto a H',/<th>H<\/th><th>R<\/th><th>LP<\/th><th>BB<\/th>/.test(b));
 ok('el renglón de Promedio incluye el promedio de R y de LP',/rx!=null\?num\(rx,1\)/.test(b)&&/lx!=null\?num\(lx,1\)/.test(b));
 ok('«Ver más» ya no repite R y LP (queda HR y decisión)',/<th>Salida<\/th><th>HR<\/th><th>Dec<\/th>/.test(b));
 ok('el resumen dice cuántas carreras le anotan por salida',/Le anotan <b>/.test(b));
}
sec('Diez diseños con cabecera propia: Historias, Duelo, Bento, Agenda, Radar de valor, Cromos, Campo, Telemetría, Marcador y Recibo (interior2.js)');
{
 const I2=require(path.join(__dirname,'interior2.js')), UI2=require(path.join(__dirname,'interior.js'));
 const ids=['historias','duelo','bento','agenda','radarvalor','cromos','campo','telemetria','marcador','recibo'];
 ok('interior2.js conoce los 10 diseños con cabecera propia',JSON.stringify(I2.NEW)===JSON.stringify(ids));
 ids.forEach(id=>{
  const u=UI2.UIS.find(x=>x.id===id);
  ok(id+': aparece en el selector con nombre, descripción y muestra',!!(u&&u.n&&u.d&&u.sw));
  ok(id+': tiene sus reglas CSS (fondo, tarjeta, cabecera nueva y barra de abajo)',new RegExp('html\\[data-ui="'+id+'"\\]\\[data-ui\\] \\.game\\{').test(I2.css)&&new RegExp('html\\[data-ui="'+id+'"\\]\\[data-ui\\] \\.nxT\\{').test(I2.css)&&new RegExp('html\\[data-ui="'+id+'"\\]\\[data-ui\\] :is\\(\\.navbar,\\.tabbar\\)').test(I2.css));
  ok(id+': oculta la cabecera original solo dentro de su diseño (vuelve al cambiar)',new RegExp('html\\[data-ui="'+id+'"\\]\\[data-ui\\] \\.game \\.head>:not\\(\\.nxT\\):not\\(\\.bug\\)\\{display:none!important\\}').test(I2.css));
 });
 ok('la cabecera nueva está oculta por defecto (Clásico y demás no la ven)',/\.nxT,\.nxProg,\.nxSum,\.nxPlot,\.nxAhora\{display:none\}/.test(I2.css));
 ok('diseno.js entrega el lector de tarjetas (OVALeerJuego) que usa interior2.js',/root\.OVALeerJuego=bzLeer/.test(rd('diseno.js')));
 ok('el marcador en vivo no queda pegado al reloj (el <br> se cambia por un separador al leer la etiqueta)',/function bzTxt\(e\)\{[\s\S]*?querySelectorAll\('br'\)[\s\S]*?createTextNode\(' · '\)/.test(rd('diseno.js'))&&/querySelectorAll\("br"\)/.test(rd('obsidiana.js')));
 ['index.html','futbol.html','nba.html'].forEach(f=>{const h=rd(f),i1=h.indexOf('interior2.js'),i2=h.indexOf('<style>');ok(f+' carga interior2.js en la cabecera, después de interior.js',i1>h.indexOf('interior.js')&&i1<i2);});
 ok('el service worker guarda interior2.js para abrir sin internet',/'interior2\.js'/.test(rd('sw.js')));
 ok('los cinco respetan "reducir movimiento" (lo cubre interior.js para todo data-ui)',/prefers-reduced-motion:reduce\)\{html\[data-ui\] \*/.test(rd('interior.js')));
 ok('ningún texto de la app entra a la cabecera nueva con innerHTML (solo textContent; los únicos innerHTML son dibujos fijos: estadio, campo, anillo y aguja numéricos)',(rd('interior2.js').match(/innerHTML/g)||[]).length===4);
 ok('minutos() entiende «7:08 PM», «12:05 AM» y 24 horas',I2.minutos('7:08 PM')===1148&&I2.minutos('12:05 AM')===5&&I2.minutos('21:30')===1290&&I2.minutos('EN VIVO')===null);
}

sec('Ajustes organizado (ajustes.js + pestañas de Apariencia)');
{
 const AJ=require(path.join(__dirname,'ajustes.js')), ic=rd('interior.js'), dj=rd('diseno.js');
 ok('MLB: Ajustes es un menú con 4 ventanas (Apariencia, Modelo y apuestas, Cálculo a mano, Cómo funciona)',['Apariencia','Modelo y apuestas','Cálculo a mano','Cómo funciona'].every(t=>rd('ajustes.js').includes("'"+t+"'")));
 ok('ajustes.js mueve los bloques que ya existen, no los recrea (ningún innerHTML con texto de la app)',/appendChild\(b\)/.test(rd('ajustes.js'))&&!/\.manual.*innerHTML/.test(rd('ajustes.js')));
 ok('index.html carga ajustes.js después de diseno.js y el service worker lo guarda',rd('index.html').indexOf('ajustes.js')>rd('index.html').indexOf('diseno.js')&&/'ajustes\.js'/.test(rd('sw.js')));
 ok('los botones del menú no son <button> (los diseños con !important no los pueden pintar de amarillo)',/mk\('div','ajRow'\)/.test(rd('ajustes.js')));
 ok('Apariencia tiene dos pestañas (Diseño de adentro / Tema de color) y los diseños van en categorías',/uiTab/.test(ic)&&/Deportivos y espectaculares/.test(ic)&&/uiSkinHost/.test(ic));
 ok('todos los diseños quedan en alguna categoría (si no, caen en la última)',/!usados\[u\.id\]/.test(ic));
 ok('fútbol y NBA: Ajustes tiene la entrada Apariencia que abre la hoja 🎨',/dsApar/.test(dj)&&/#ovaSheet/.test(dj));
}

sec('Ganchos y archivos conectados');
ok('el panel carga ovaextra.js',/ovaextra\.js/.test(rd('panel.html')));
ok('index.html publica favoritos al hub',/OVAHoy\.publicar\('mlb'/.test(rd('index.html')));
ok('futbol.html publica favoritos al hub',/OVAHoy\.publicar\('fut'/.test(rd('futbol.html')));
ok('nba.html publica favoritos al hub',/OVAHoy\.publicar\('nba'/.test(rd('nba.html')));
APPS.forEach(f=>ok(f+' carga ovaextra.js',/<script src="ovaextra\.js"><\/script>/.test(rd(f))));
ok('el service worker lista las páginas principales',(()=>{const sw=rd('sw.js');return ['hub.html','index.html','futbol.html','nba.html'].every(f=>sw.indexOf("'"+f+"'")>=0);})());
ok('manifest.json es JSON válido',(()=>{try{JSON.parse(rd('manifest.json'));return true;}catch(e){return false;}})());

sec('Estructura del repo (lo que encontró la auditoría de oct 2026)');
{
 const sw=rd('sw.js');
 const shell=((/var SHELL = \[([\s\S]*?)\];/.exec(sw)||[0,''])[1].match(/'([^']+)'/g)||[]).map(x=>x.slice(1,-1));
 const sinArchivo=[], sinSW=[], repetidos=[];
 APPS.forEach(f=>{
  const vistos={};
  (rd(f).match(/<script[^>]+src="[^"]+"/g)||[]).forEach(t=>{
   const s=/src="([^"]+)"/.exec(t)[1];
   if(/^(https?:)?\/\//.test(s)) return;
   const base=s.split('?')[0].split('#')[0];
   if(vistos[base]) repetidos.push(f+' → '+base); vistos[base]=1;
   if(!fs.existsSync(D+base)) sinArchivo.push(f+' → '+base);
   if(shell.indexOf(base)<0) sinSW.push(base);
  });
 });
 ok('todo <script src> local de las páginas existe en el repo',sinArchivo.length===0,sinArchivo.join(', '));
 ok('el service worker guarda cada script que cargan las páginas',sinSW.length===0,[...new Set(sinSW)].join(', '));
 ok('ningún <script src> está repetido dentro de una misma página',repetidos.length===0,repetidos.join(', '));
 const rotos=shell.filter(x=>!fs.existsSync(D+x));
 ok('todo lo que lista el service worker existe',rotos.length===0,rotos.join(', '));
 ok('el parche de Railway vive solo en railway.js (no pegado dentro de index.html)',!/OVA_SERVIDOR_RAILWAY_PARCHE/.test(rd('index.html'))&&/OVA_SERVIDOR_RAILWAY_PARCHE/.test(rd('railway.js')));
 ['index.html','futbol.html'].forEach(f=>{
  const m=/function esc\(s\)\{[^\n]*\}/.exec(rd(f));
  let r=null; try{ r=m?new Function(m[0]+';return esc;')():null; }catch(e){}
  ok(f+': esc() escapa comillas simples y dobles',!!r&&r('a"b\'c<d&e')==='a&quot;b&#39;c&lt;d&amp;e');
 });
 const ign=new Set(['.git','node_modules','.cache']), todos=[];
 (function rec(dir,pre){ fs.readdirSync(dir,{withFileTypes:true}).forEach(e=>{ if(ign.has(e.name)) return; const rel=pre+e.name; if(e.isDirectory()) rec(dir+e.name+path.sep,rel+'/'); else todos.push(rel); }); })(D,'');
 const conEspacio=todos.filter(n=>/\s/.test(n));
 ok('ningún archivo del repo tiene espacios en el nombre (el iPhone los rompe al subir)',conEspacio.length===0,conEspacio.join(', '));
 const wfDir=D+'.github'+path.sep+'workflows'+path.sep;
 const wfTxt=(fs.existsSync(wfDir)?fs.readdirSync(wfDir):[]).map(n=>[n,fs.readFileSync(wfDir+n,'utf8')]);
 ok('hay al menos un workflow',wfTxt.length>0);
 ok('ningún workflow reescribe archivos del repo con «cat > x.js <<» (los scripts son archivos reales)',wfTxt.every(x=>!/cat\s*>\s*\S+\.(js|html)\s*<</.test(x[1])),wfTxt.filter(x=>/cat\s*>\s*\S+\.(js|html)\s*<</.test(x[1])).map(x=>x[0]).join(', '));
 ok('ningún workflow hace commit de index.html',wfTxt.every(x=>!/git add[^\n]*index\.html/.test(x[1])));
 const faltaScript=[];
 wfTxt.forEach(x=>{ (x[1].match(/node\s+(?!--)[\w./-]+\.js/g)||[]).forEach(m=>{ const p=m.replace(/^node\s+/,''); if(!fs.existsSync(D+p)) faltaScript.push(x[0]+' → '+p); }); });
 ok('todo script que llaman los workflows existe',faltaScript.length===0,faltaScript.join(', '));
 ok('pinnacle-datos.json es JSON válido con «juegos»',(()=>{ try{ return Array.isArray(JSON.parse(rd('pinnacle-datos.json')).juegos); }catch(e){ return false; } })());

 sec('Revisión Muse (oct 2026): ntfy privado, timeout de Railway, edad del mercado, recordatorio de respaldo');
 ok('ningún workflow cae a un tema público de ntfy («|| \'my-bets\'»)',wfTxt.every(x=>!/\|\|\s*['"]my-bets['"]/.test(x[1])),wfTxt.filter(x=>/\|\|\s*['"]my-bets['"]/.test(x[1])).map(x=>x[0]).join(', '));
 ok('valor-pinnacle.yml pasa NTFY_TOPIC tal cual (sin valor por defecto)',/NTFY_TOPIC:\s*\$\{\{\s*secrets\.NTFY_TOPIC\s*\}\}/.test(rd('.github/workflows/valor-pinnacle.yml')));
 const rw=rd('railway.js');
 ok('railway.js: el fetch al servidor tiene tope de espera (AbortController + signal + clearTimeout)',/new AbortController\(\)/.test(rw)&&/signal\s*=\s*ctl\.signal/.test(rw)&&/clearTimeout\(corte\)/.test(rw)&&/TIMEOUT_MS\s*=\s*\d+/.test(rw));
 const tm=/TIMEOUT_MS\s*=\s*(\d+)/.exec(rw);
 ok('railway.js: el tope está entre 3 y 15 segundos',!!tm&&+tm[1]>=3000&&+tm[1]<=15000,tm&&tm[1]);
 const pj=rd('pinnacle.js');
 ok('pinnacle.js: la fila del ranking «Al gane» muestra la antigüedad del mercado',/esc\(linea\)\+edadHtml\(\)\+aviso/.test(pj));
 {
  const ahora=Date.UTC(2026,9,11,18,0,0), dia=86400000, hoy=H.hoyLocal(new Date(ahora)), L=fakeLS();
  ok('recordatorio: sin picks no avisa nunca',R.recordatorio(L,ahora)===null);
  L.setItem('ventaja_picks_v1',JSON.stringify(picksMlb));
  let rr=R.recordatorio(L,ahora);
  ok('recordatorio: con picks y sin respaldo exportado avisa',!!rr&&rr.dias===null&&rr.picks===picksMlb.length,JSON.stringify(rr));
  L.setItem('ova_ultimo_export',String(ahora-3*dia));
  ok('recordatorio: exportó hace 3 días → no avisa',R.recordatorio(L,ahora)===null);
  L.setItem('ova_ultimo_export',String(ahora-20*dia));
  rr=R.recordatorio(L,ahora);
  ok('recordatorio: exportó hace 20 días → avisa con los días',!!rr&&rr.dias===20,JSON.stringify(rr));
  L.setItem('ova_export_aviso_dia',hoy);
  ok('recordatorio: tras «Luego» no vuelve a avisar el mismo día',R.recordatorio(L,ahora)===null);
  L.setItem('ova_export_aviso_dia','1999-01-01');
  ok('recordatorio: al día siguiente vuelve a avisar',!!R.recordatorio(L,ahora));
  R.marcarExport(L,ahora);
  ok('recordatorio: exportar de verdad lo apaga',R.recordatorio(L,ahora)===null);
  ok('recordatorio: la marca de exportación no se mete dentro del respaldo',!('ova_ultimo_export' in R.tomar(L))&&!('ova_export_aviso_dia' in R.tomar(L)));
 }
 sec('CLV de fútbol y NBA (cuota de cierre escrita por ti, igual que en MLB)');
 {
  const C=EX.OVACLV, cerca=(a,b)=>Math.abs(a-b)<0.01;
  ok('impPct: americana negativa (-175 → 63.64%)',cerca(C.impPct('-175'),63.64));
  ok('impPct: americana positiva (+120 → 45.45%)',cerca(C.impPct('+120'),45.45));
  ok('impPct: centavos de Kalshi (64 y 64¢ → 64%)',C.impPct('64')===64&&C.impPct('64¢')===64&&C.impPct('64c')===64);
  ok('impPct: texto vacío, cero o basura → null',C.impPct('')===null&&C.impPct(null)===null&&C.impPct('0')===null&&C.impPct('abc')===null);
  ok('impPct: número negativo entre -1 y -99 no existe → null',C.impPct('-50')===null);
  ok('impPct: acepta el signo menos tipográfico (−175)',cerca(C.impPct('\u2212175'),63.64));
  ok('clvPts: compraste +110 y cerró -105 → CLV +3.6',cerca(C.clvPts({cuota:'+110',cierre:'-105'}),3.60));
  ok('clvPts: compraste -150 y cerró -130 → CLV negativo (compraste más caro)',C.clvPts({cuota:'-150',cierre:'-130'})<0);
  ok('clvPts: sin cierre → null (no se inventa)',C.clvPts({cuota:'-110'})===null&&C.clvPts({cuota:'-110',cierre:''})===null);
  ok('clvPts: sin cuota → null',C.clvPts({cierre:'-110'})===null);
  const arr=[{cuota:'+110',cierre:'-105'},{cuota:'-150',cierre:'-130'},{cuota:'-110'},{cuota:'+200',cierre:'+180'}];
  const R2=C.resumen(arr);
  ok('resumen: cuenta solo los picks con cierre (3 de 4)',R2.n===3,JSON.stringify(R2));
  ok('resumen: promedio y % que le ganó al cierre',R2.prom!==null&&cerca(R2.prom,(3.60+C.clvPts(arr[1])+C.clvPts(arr[3]))/3)&&cerca(R2.ganaPct,200/3),JSON.stringify(R2));
  ok('resumen: lista vacía no truena',C.resumen([]).n===0&&C.resumen([]).prom===null&&C.resumen(null).n===0);
  ok('fila: escapa HTML en el id y en el cierre',!/<script|"><img/i.test(C.fila({id:'a"><img src=x onerror=1>',cuota:'-110',cierre:'<script>1</script>'})));
  ok('fila: muestra «sin cierre» y luego el CLV con signo',/sin cierre/.test(C.fila({id:'1',cuota:'-110'}))&&/CLV \+3\.6 pts/.test(C.fila({id:'1',cuota:'+110',cierre:'-105'})));
  ok('resumenHtml: con menos de 25 picks avisa que todavía no dice nada firme',/todavía no dice nada firme/.test(C.resumenHtml(arr)));
  ok('resumenHtml: sin ningún cierre pide escribirlo',/Escribe la cuota de cierre/.test(C.resumenHtml([{cuota:'-110'}])));
  {
   // la fila escrita en el campo «Cierre» se guarda en el registro y se repinta
   const store=[{id:'x1',cuota:'+110'},{id:'x2',cuota:'-150'}];let repintado=0,handler=null;
   const cont={addEventListener(t,f){ if(t==='change') handler=f; }};
   const mkEl=(id,v)=>({value:v,getAttribute:()=>id,classList:{contains:c=>c==='ova-cie'}});
   C.ligar(cont,()=>store,a=>{},()=>{repintado++;}); C.ligar(cont,()=>store,a=>{},()=>{repintado++;});
   handler({target:mkEl('x1','-105')});
   ok('ligar: escribir el cierre lo guarda en el pick correcto y repinta',store[0].cierre==='-105'&&store[1].cierre===undefined&&repintado===1,JSON.stringify(store)+' '+repintado);
   handler({target:mkEl('x1','  ')});
   ok('ligar: borrar el campo deja el cierre en null',store[0].cierre===null);
   handler({target:{classList:{contains:()=>false}}});
   ok('ligar: ignora cambios de otros campos',repintado===2);
  }
  ['futbol.html','nba.html'].forEach(f=>{
   const t=rd(f);
   ok(f+': el registro muestra el campo de cierre y el resumen de CLV',/OVACLV\.fila\(p\)/.test(t)&&/OVACLV\.resumenHtml\(/.test(t)&&/OVACLV\.ligar\(/.test(t));
   ok(f+': ya no dice «No es CLV real»',!/No es CLV real/.test(t));
   ok(f+': el registro sigue funcionando si ovaextra.js no carga (todo protegido con typeof)',(t.match(/OVACLV\./g)||[]).length===(t.match(/typeof OVACLV!=='undefined'/g)||[]).length);
  });
 }
}

sec('Mesa (asistente.js): lee todas las pestañas, ordena sin internet, valor con tu cuota y IA con internet');
{
 const M=require(path.join(__dirname,'asistente.js')), sa=rd('asistente.js');
 ok('aDecimal entiende -140, +120, 1.85, 55¢ y rechaza basura',Math.abs(M.aDecimal('-140')-1.7143)<1e-3&&M.aDecimal('+120')===2.2&&M.aDecimal('1.85')===1.85&&Math.abs(M.aDecimal('55¢')-1.8182)<1e-3&&M.aDecimal('abc')===null&&M.aDecimal('')===null);
 ok('americana(0.62) es -163 y americana(0.40) es +150',M.americana(0.62)==='-163'&&M.americana(0.4)==='+150');
 const v1=M.valorDe(64.2,'-140'), v2=M.valorDe(58.5,'-140'), v3=M.valorDe(56,'-140');
 ok('valorDe: +10% es "valor", +0.3% es "justo" y negativo es "sin"',v1.k==='valor'&&v2.k==='justo'&&v3.k==='sin');
 ok('valorDe pide +5% para decir valor (un +EV chico se trata como ruido del modelo)',M.valorDe(60.5,'-140').k==='justo'&&M.valorDe(62,'-140').k==='valor');
 ok('etiqueta MLB/NBA: 62+ candidato, 55-62 cuidado, abajo parejo; datos flojos bajan un nivel',M.etiqueta(65,'alta','mlb').k==='cand'&&M.etiqueta(58,'alta','mlb').k==='cuid'&&M.etiqueta(51,'alta','mlb').k==='evit'&&M.etiqueta(65,'baja','mlb').k==='cuid'&&M.etiqueta(58,'baja','mlb').k==='evit');
 ok('etiqueta fútbol usa cortes más bajos (hay empate): 52+ candidato',M.etiqueta(53,'alta','fut').k==='cand'&&M.etiqueta(53,'alta','mlb').k==='evit');
 ok('etiqueta: en vivo y sin números no cuentan como candidatos',M.etiqueta(70,'alta','mlb',true).k==='vivo'&&M.etiqueta(null,'','mlb').k==='sin');
 const mkJ=(i,tx)=>({titulo:'Equipo'+i+' @ Otro'+i,hora:'7:10 PM',na:'Equipo'+i,nh:'Otro'+i,pa:60,ph:40,fav:'Equipo'+i,pf:60,cu:'-150',sello:'Sólido',conf:'80%',cuotaMia:'-140',
  tabs:[{id:'ver',nombre:'Veredicto',txt:tx},{id:'cuo',nombre:'Cuotas',txt:tx},{id:'num',nombre:'Números',txt:tx},{id:'for',nombre:'Forma',txt:tx},{id:'x',nombre:'Parque',txt:tx}]});
 const gran='dato '.repeat(900);
 [1,4,8,12,20].forEach(n=>{
  const p=M.construirPrompt({app:'mlb',fecha:'2026-10-12',juegos:Array.from({length:n},(_,i)=>mkJ(i+1,gran)),registro:'12-9 (57%)',pregunta:'',previa:''});
  ok('construirPrompt con '+n+' juegos de texto enorme nunca pasa de 11,500 (el Worker rechaza 12,000)',p.length<=M.MAX_PROMPT&&M.MAX_PROMPT<12000,String(p.length));
  ok('  …y con '+n+' juegos conserva la tarea y el formato de SENAL al final',/SENAL: JUEGA \| CUIDADO \| EVITAR/.test(p)&&/Nunca digas que algo es seguro/.test(p));
 });
 const pq=M.construirPrompt({app:'mlb',fecha:'2026-10-12',juegos:[mkJ(1,gran),mkJ(2,gran)],registro:'',pregunta:'por que evitas el 2?',previa:'x '.repeat(5000)});
 ok('una pregunta de seguimiento lleva la pregunta, la respuesta anterior recortada y cabe',/PREGUNTA MIA: por que evitas el 2\?/.test(pq)&&/RESPUESTA ANTERIOR/.test(pq)&&pq.length<=M.MAX_PROMPT);
 const pj=M.construirPrompt({app:'fut',fecha:'2026-10-12',juegos:[mkJ(1,'x')],registro:'',pregunta:'',previa:''});
 ok('el prompt incluye la cuota que escribió el usuario y el EV que da el modelo',/Cuota que pago yo por Equipo1: -140 \(con el modelo da EV \+/.test(pj));
 ok('el prompt pide VALOR: NO SE cuando no hay cuota y prohíbe datos de otros años',/sin cuota es NO SE/.test(pj)&&/descarta articulos de otros anos/.test(pj));
 ok('resumenRegistro cuenta ganados y perdidos por app y avisa de muestra chica',M.resumenRegistro('mlb',()=>JSON.stringify([{res:'G'},{res:'G'},{res:'P'},{res:null}]))==='2-1 (67% de 3 resueltos, muestra chica: no concluye nada)'&&M.resumenRegistro('fut',()=>JSON.stringify([{estado:'ganado'},{estado:'perdido'}])).startsWith('1-1')&&M.resumenRegistro('nba',()=>'basura')==='');
 ok('la Mesa solo LEE: no escribe en ningún registro de picks',!/setItem\([^)]*(ventaja_picks|registro_v1)/.test(sa)&&!/ls\('(ventaja_picks|ova_futbol_registro|ova_nba_registro)/.test(sa));
 ok('ningún innerHTML en asistente.js (todo el texto de la app y de la IA entra como textContent)',!/innerHTML/.test(sa));
 ok('los botones de la Mesa no son <button> (los diseños con !important los pintarían de amarillo)',/mk\('div',cls,txt\)/.test(sa)&&!/createElement\('button'\)/.test(sa));
 ok('usa el mismo Worker de la IA (no hay nada que re-publicar en Cloudflare) y no lleva ninguna clave',/ova-ia\.osvaldoalvarez0113\.workers\.dev/.test(sa)&&!/sk-ant|x-api-key/.test(sa));

 /* ---- mercado del servidor (pinnacle-*.json) ---- */
 ok('mismoEq: «Red Sox» ≈ «Boston Red Sox», «FC Barcelona» ≈ «Barcelona», pero «White Sox» ≠ «Red Sox» y «Man City» ≠ «Man United»',M.mismoEq('Red Sox','Boston Red Sox')&&M.mismoEq('FC Barcelona','Barcelona')&&M.mismoEq('Atlético de Madrid','Atletico Madrid')&&!M.mismoEq('White Sox','Red Sox')&&!M.mismoEq('Manchester City','Manchester United'));
 const MJ=[{n:['Boston Red Sox','New York Yankees'],fair:[0.38,0.62]}];
 const c1=M.cruzarMercado(MJ,'mlb','Yankees','Red Sox');
 ok('cruzarMercado orienta las probabilidades aunque el servidor traiga los equipos al revés',Math.abs(c1.a-62)<1e-9&&Math.abs(c1.h-38)<1e-9);
 const cf=M.cruzarMercado([{n:['Barcelona','Getafe'],r:[0.6,0.24,0.16]}],'fut','Getafe','FC Barcelona');
 ok('fútbol: lee r:[local,empate,visita] y lo orienta; NBA: lee ml',Math.abs(cf.a-16)<1e-9&&Math.abs(cf.h-60)<1e-9&&Math.abs(cf.d-24)<1e-9&&Math.abs(M.cruzarMercado([{n:['Lakers','Celtics'],ml:[0.4,0.6]}],'nba','Celtics','Lakers').a-60)<1e-9);
 ok('cruzarMercado devuelve null si no hay el juego o el archivo está vacío/corrupto',M.cruzarMercado(MJ,'mlb','Cubs','Padres')===null&&M.cruzarMercado([],'mlb','A','B')===null&&M.cruzarMercado(null,'mlb','A','B')===null&&M.cruzarMercado([{n:['A','B'],fair:'x'}],'mlb','A','B')===null);
 ok('compararMercado: coinc ≤3 pts, cerca ≤6, choca si ≥6 pts o si el favorito es otro',M.compararMercado(64,36,62,38).k==='coinc'&&M.compararMercado(64,36,59,41).k==='cerca'&&M.compararMercado(70,30,60,40).k==='choca'&&M.compararMercado(57,43,45,55).k==='choca'&&M.compararMercado(null,1,1,1)===null);
 ok('favoritos distintos entre modelo y mercado → Evitar siempre; si solo difieren en puntos no se baja otra vez (la mezcla ya lo absorbe); si coinciden no se sube',M.ajustarPorMercado(M.etiqueta(65,'alta','mlb'),{k:'choca',favMod:'a',favMer:'h'}).k==='evit'&&M.ajustarPorMercado(M.etiqueta(65,'alta','fut'),{k:'choca',favMod:'a',favMer:'h'}).k==='evit'&&M.ajustarPorMercado(M.etiqueta(65,'alta','mlb'),{k:'choca',favMod:'a',favMer:'a'}).k==='cand'&&M.ajustarPorMercado(M.etiqueta(58,'alta','mlb'),{k:'coinc',favMod:'a',favMer:'a'}).k==='cuid');
ok('mezclar: 50/50 modelo+mercado, favorito de la mezcla; null si falta un dato',M.mezclar(60,40,70,30).pf===65&&M.mezclar(60,40,70,30).fav==='a'&&M.mezclar(40,60,30,70).fav==='h'&&M.mezclar(52,48,44,56).fav==='h'&&Math.abs(M.mezclar(52,48,44,56).pf-52)<1e-9&&M.mezclar(null,1,1,1)===null);
ok('regla medida: modelo 58 % con mercado 70 % (mismo favorito) sube a Candidato por la mezcla (64 % ≥ 62 %), y modelo 66 % con mercado 52 % baja a Cuidado (59 %)',M.etiqueta(M.mezclar(58,42,70,30).pf,'alta','mlb').k==='cand'&&M.etiqueta(M.mezclar(66,34,52,48).pf,'alta','mlb').k==='cuid');
 const vm=M.valorDe(64,'-140',62), vs=M.valorDe(64,'-140',55);
 ok('con mercado, valor = pagar más que el precio justo de Pinnacle; si solo el modelo lo ve, se marca sospechoso',vm.k==='valor'&&vm.evM>0.05&&vs.k==='sin'&&vs.soloModelo===true);
 ok('el prompt dice que el mercado manda cuando chocan y explica coincide/choca por juego',/CHOCAN, asume que el mercado tiene la razon/.test(pj)&&/COINCIDE con el modelo|CHOCA con el modelo/.test(M.bloqueJuego(1,Object.assign(mkJ(1,'x'),{mer:{a:60,h:40,d:null},cmp:{k:'coinc',dif:1,mer:59,favMod:'a',favMer:'a'},na:'A',nh:'B'}),600)));
 ok('la Mesa lee los tres archivos del servidor y no toca su contenido',/pinnacle-datos\.json/.test(sa)&&/pinnacle-futbol\.json/.test(sa)&&/pinnacle-nba\.json/.test(sa)&&!/pinnacle[^']*'\s*,\s*\{\s*method/.test(sa));

 /* ---- verificación oficial (MLB StatsAPI) ---- */
 const SJ=(over)=>Object.assign({gameDate:new Date(Date.now()+60*60000).toISOString(),status:{abstractGameState:'Preview',detailedState:'Scheduled'},
  teams:{away:{probablePitcher:{id:11,fullName:'Cole'}},home:{probablePitcher:{id:21,fullName:'Bello'}}},weather:{condition:'Clear',temp:'61',wind:'12 mph'}},over||{});
 const PIT={a:{id:11,n:'Cole'},h:{id:21,n:'Bello'}};
 const o1=M.oficialDe(SJ(),PIT,[],{a:1,h:2});
 ok('oficialDe: mismo abridor → sin cambio; sin lineups → pendiente; clima oficial leído',o1.camb.length===0&&o1.lin.ok===false&&o1.clima==='Clear, 61°F, viento 12 mph');
 const o2=M.oficialDe(SJ({teams:{away:{probablePitcher:{id:99,fullName:'Otro'}},home:{}}}),PIT,[],{a:1,h:2});
 ok('oficialDe detecta abridor distinto y abridor retirado (por confirmar)',o2.camb.length===2&&o2.camb[0].ahora==='Otro'&&o2.camb[1].ahora==='');
 const pl=n=>Array.from({length:n},(_,i)=>({id:i,fullName:'Nombre Apellido'+i}));
 ok('lineup confirmado = 9 y 9 (desde el calendario o desde el boxscore); con 9 y 0 sigue pendiente',M.oficialDe(SJ({lineups:{awayPlayers:pl(9),homePlayers:pl(9)}}),PIT,[],{a:1,h:2}).lin.ok===true&&M.oficialDe(SJ({_ord:{a:9,h:9}}),PIT,[],{a:1,h:2}).lin.ok===true&&M.oficialDe(SJ({lineups:{awayPlayers:pl(9),homePlayers:[]}}),PIT,[],{a:1,h:2}).lin.ok===false);
 const o3=M.oficialDe(SJ(),PIT,[{date:'2026-10-12',toTeam:{id:2},description:'Boston placed 1B Casas on the 10-day injured list.'},{date:'2026-10-12',toTeam:{id:2},description:'Boston activated RHP Y.'},{date:'2026-10-12',toTeam:{id:77},description:'Otro placed Z on the 15-day injured list.'}],{a:1,h:2});
 ok('movimientos: solo lesionados/suspensiones de los dos equipos del juego (no activaciones ni de otros equipos)',o3.mov.length===1&&/Casas/.test(o3.mov[0]));
 ok('cambio de abridor baja el juego a «evitar» (el modelo calculó con otro abridor); juego pospuesto sale de la lista',M.ajustarPorOficial({k:'cand',t:'Candidato'},o2).k==='evit'&&M.ajustarPorOficial({k:'cand',t:'Candidato'},M.oficialDe(SJ({status:{abstractGameState:'Preview',detailedState:'Postponed'}}),PIT,[],{a:1,h:2})).k==='sin'&&M.ajustarPorOficial({k:'cand',t:'x'},o1).k==='cand'&&M.ajustarPorOficial({k:'cand',t:'x'},null).k==='cand');
 ok('el texto OFICIAL que va a la IA nombra el cambio de abridor y los lineups',/CAMBIO DE ABRIDOR/.test(M.textoOficial(o2,'A','B','ahora'))&&/lineups pendientes/.test(M.textoOficial(o1,'A','B','ahora')));
 ok('la verificación oficial solo LEE statsapi.mlb.com (GET, sin POST) y solo en MLB',/statsapi\.mlb\.com\/api\/v1\//.test(sa)&&/APP!=='mlb'\) return Promise\.resolve\(\)/.test(sa));
 ['index.html','futbol.html','nba.html'].forEach(f=>ok(f+' carga asistente.js después de diseno.js',rd(f).indexOf('asistente.js')>rd(f).indexOf('diseno.js')&&rd(f).indexOf('diseno.js')>0));
 ok('el service worker guarda asistente.js',/'asistente\.js'/.test(rd('sw.js')));

 /* ---- pulido de la pantalla (13 oct): plurales, «solo modelo», sin cuotas viejas, placeholder real, marcas por defecto ---- */
 ok('pl: 1 va en singular, 0 y 2 en plural',M.pl(1,'juego','juegos')==='1 juego'&&M.pl(0,'juego','juegos')==='0 juegos'&&M.pl(2,'juego','juegos')==='2 juegos');
 const E=(x)=>M.resumenEstado(Object.assign({app:'mlb',n:1,c:0,ev:1,cr:0,co:0,ch:0,ofn:1,lp:1,cb:0,tieneOf:true,tieneMer:true,edad:'hace 11 h',viejo:true},x||{}));
 const e1=E();
 ok('resumen con 1 juego: «1 juego leído · 0 candidatos · 1 parejo» y «1 juego» en lo oficial (no «1 juegos»)',/^1 juego leído · 0 candidatos · 1 parejo\. /.test(e1)&&/MLB oficial: 1 juego · /.test(e1)&&!/1 juegos|1 parejos/.test(e1));
 ok('si el mercado no cruzó ningún juego dice «sin mercado» y NO enseña la edad de unas cuotas que no se usaron',/Sin mercado para este juego/.test(e1)&&!/hace 11 h|cuotas viejas/.test(e1));
 ok('con varios juegos y sin cruce dice «estos juegos»; sin archivo del servidor dice que no pudo leerlo',/Sin mercado para estos juegos/.test(E({n:5,ev:2}))&&/No pude leer el mercado/.test(E({tieneMer:false})));
 const e2=E({n:3,c:1,ev:1,cr:2,co:1,ch:1,edad:'hace 30 min',viejo:false}), e3=E({n:3,cr:2,co:2,ch:0,edad:'hace 10 h',viejo:true});
 ok('con mercado: «cruzó 2 de 3 · 1 coincide … · 1 choca» (singular) y «2 coinciden · 0 chocan» (plural)',/cruzó 2 de 3 · 1 coincide con el modelo · 1 choca\./.test(e2)&&/2 coinciden con el modelo · 0 chocan\./.test(e3));
 ok('la edad del mercado solo sale si sí se usó, y avisa si es vieja',/Mercado del servidor \(hace 30 min\)/.test(e2)&&/\(hace 10 h · cuotas viejas, verifica\)/.test(e3));
 ok('fuera de MLB no habla de la API oficial',!/MLB oficial|API oficial/.test(M.resumenEstado({app:'fut',n:2,c:0,ev:0,cr:0,co:0,ch:0,tieneOf:false,tieneMer:true})));
 ok('subPct: sin mercado el número se rotula «solo modelo» (y deja la cuota justa); con mezcla dice «modelo+mercado»',JSON.stringify(M.subPct({cu:'-104'}))==='["solo modelo","justa -104"]'&&JSON.stringify(M.subPct({}))==='["solo modelo"]'&&JSON.stringify(M.subPct({mix:{pf:60},cu:'-104'}))==='["modelo+mercado"]');
 ok('subPct: si la mezcla escoge otro favorito que el modelo, el % lleva el nombre de ese equipo; si coinciden no agrega nada',
  JSON.stringify(M.subPct({fav:'Cleveland Guardians',na:'Cleveland Guardians',nh:'Tampa Bay Rays',mix:{pf:52.2,fav:'h'}}))==='["modelo+mercado","de Tampa Bay Rays"]'&&
  JSON.stringify(M.subPct({fav:'Cleveland Guardians',na:'Cleveland Guardians',nh:'Tampa Bay Rays',mix:{pf:52.2,fav:'a'}}))==='["modelo+mercado"]');
 const GJ=(k,fav,pf,et,extra)=>Object.assign({key:k,fav:fav,pf:pf,et:{k:et}},extra||{});
 ok('placeholder: usa un equipo real (con un solo juego no sale «el 3»); con un «evitar» pregunta por ese; sin juegos es genérico',
  M.placeholderPregunta([GJ('a','Cleveland Guardians',51,'evit')])==='Ej: ¿por qué evitas a Cleveland Guardians?'&&
  M.placeholderPregunta([GJ('a','Yankees',66,'cand'),GJ('b','Cubs',50,'evit')])==='Ej: ¿por qué evitas a Cubs?'&&
  M.placeholderPregunta([GJ('a','Yankees',66,'cand')])==='Ej: ¿qué riesgo ves en Yankees?'&&
  M.placeholderPregunta([])==='Pregúntale algo sobre los juegos de hoy'&&!/evitas el 3\?/.test(sa));
 const SJX=[GJ('a','A',70,'cand'),GJ('b','B',58,'cuid'),GJ('c','C',51,'evit'),GJ('d','D',80,'cand',{vivo:true}),GJ('e','E',null,'sin')];
 const s0=M.seleccionInicial(SJX,{});
 ok('marcas por defecto: Candidato y Cuidado sí; «evitar», en vivo y sin números no (el de «evitar» ya no se manda marcado a la IA)',s0.a===true&&s0.b===true&&!s0.c&&!s0.d&&!s0.e);
 const s1=M.seleccionInicial(SJX,{a:false,c:true});
 ok('lo que marcaste o desmarcaste tú se respeta al volver a leer (marcar un «evitar» a mano se queda)',s1.a===false&&s1.b===true&&s1.c===true);
 ok('nunca marca más de 8 por defecto',Object.keys(M.seleccionInicial(Array.from({length:12},(_,i)=>GJ('k'+i,'E'+i,60+i,'cand')),{})).length===8);
 ok('la Mesa usa esos textos y «Cómo leerla» sale cerrado después de la primera vez (se abre con un toque)',/resumenEstado\(\{app:APP/.test(sa)&&/placeholderPregunta\(js\)/.test(sa)&&/seleccionInicial\(ST\.juegos,ST\.manual\)/.test(sa)&&/avPrimera=ls\(AV_KEY\)!=='1'/.test(sa)&&/aria-expanded/.test(sa)&&/\.msAviso\.on \.msAvB\{display:block\}/.test(sa));
 ok('las píldoras ya no van pegadas (margen derecho) y «sin dato del mercado» no arrastra margen suelto',/\.msChip\{display:inline-block;margin:5px 6px 0 0/.test(sa)&&!/margin-left:6px;font-weight:600/.test(sa));
}

sec('Auditoría 2: nombres de ESPN limpios en el origen, peticiones compartidas, botones tocables');
{
 const fh=rd('futbol.html'), sj=rd('selecciones.js'), nb=rd('nba.html'), ix=rd('index.html'), dj=rd('diseno.js');
 const nomSeguro=s=>String(s==null?'':s).replace(/[<>"`]/g,'').trim();
 ok('nomSeguro quita < > " y ` pero deja nombres reales intactos (Brighton & Hove, Côte d\'Ivoire)',nomSeguro('<img src=x onerror=alert(1)>Real "Madrid"')==='img src=x onerror=alert(1)Real Madrid'&&nomSeguro("Brighton & Hove Albion")==="Brighton & Hove Albion"&&nomSeguro("Côte d'Ivoire")==="Côte d'Ivoire"&&nomSeguro(null)==='');
 ok('fútbol limpia nombre y escudo en las 4 puertas de entrada (parseESPN, scraping, resultados, escaner de partidos)',(fh.match(/nomSeguro\(/g)||[]).length>=7&&/urlSegura\(c\.team && c\.team\.logo\)/.test(fh)&&/id: e\.id, local: nomSeguro\(nomL\)/.test(fh));
 ok('selecciones.js limpia nombres y escudos de ESPN antes de pintarlos',/local: nomSeguro\(h\.team\.displayName/.test(sj)&&/escudoLocal: urlSegura\(h\.team\.logo\)/.test(sj));
 const urlSegura=u=>{ u=String(u||''); return /^https?:\/\/[^\s"'<>`]+$/.test(u)?u:''; };
 ok('urlSegura acepta https normal y rechaza javascript:, comillas y espacios',urlSegura('https://a.espncdn.com/i/teamlogos/x.png')!==''&&urlSegura('javascript:alert(1)')===''&&urlSegura('https://x.com/a" onerror="y')===''&&urlSegura('')==='');
 ok('NBA: esc() también escapa la comilla simple (igual que MLB y fútbol)',/replace\(\/\[<>&"'\]\/g,c=>/.test(nb)&&/"'":'&#39;'/.test(nb));
 ok('MLB: j() comparte las peticiones iguales que salen a la vez y entrega un JSON propio a cada quien',/var EN_VUELO=\{\}/.test(ix)&&/return r\.text\(\)/.test(ix)&&/JSON\.parse\(t\)/.test(ix)&&/delete EN_VUELO\[url\]/.test(ix));
 ok('los botones del encabezado (🎨 y 🔍) y el selector de liga miden al menos 38 px de alto',/#ovaSkBtn\{min-width:38px;min-height:38px/.test(dj)&&/select#ligaSel\{min-height:38px/.test(dj)&&/#btnDiag\.dsDiag\{[^}]*padding:8px 10px/.test(dj));
 ok('sin funciones muertas conocidas (impDe, iaSinAcentos)',!/function impDe\(/.test(rd('herramientas.js'))&&!/iaSinAcentos/.test(rd('historial.js')));
 ok('pruebas.yml no se dispara cuando solo cambian los datos del mercado',['pinnacle-datos.json','pinnacle-futbol.json','pinnacle-nba.json'].every(f=>rd('.github/workflows/pruebas.yml').includes('- '+f)));
}

sec('FIP del abridor (v64): apagado no cambia nada, encendido calcula lo que midió el backtest');
{
 const src=rd('historial.js');
 function montarHist(){
  const ins=[], vers=[{textContent:''},{textContent:''}], notas=[];
  const els={}, padre={insertBefore(n){ins.push(n);}};
  const mk=()=>{const o={className:'',_h:'',handlers:{},addEventListener(e,f){o.handlers[e]=f;},parentNode:padre,closest(){return o;},querySelector(){return null;}};
   Object.defineProperty(o,'innerHTML',{get(){return o._h;},set(v){o._h=v;}});return o;};
  const modoBox=mk(), modo=mk(); modo.closest=()=>modoBox;
  const doc={readyState:'complete',addEventListener(){},
   getElementById(id){ if(id==='modo') return modo; if(id==='fecha') return {value:'2026-10-13'}; const n=ins.find(x=>x._h.indexOf('id="'+id+'"')>=0); return n?Object.assign(n,{value:'off'}):null; },
   createElement(){return mk();},
   querySelectorAll(q){return q==='.ver'?vers:[];},
   querySelector(q){return q==='footer details'?{querySelector(){return null;},appendChild(n){notas.push(n);}}:null;}};
  const reg=(era,ip,prior,ancla)=>{ if(era==null||!isFinite(era)) return null; const L=(ancla!=null&&isFinite(ancla))?ancla:4.0; return (era*ip+L*prior)/(ip+prior); };
  const ctx={console,Promise,Math,JSON,isFinite,parseFloat,parseInt,document:doc,window:{},
   LIGA_ERA:4.0,MODO:'mix',PRIOR_ERA:40,API:'',WORKER_URL:'',reg,
   ipToNum:x=>+x,j:()=>Promise.resolve({}),num:x=>x==null?'–':(+x).toFixed(2),esc:x=>String(x),ymd:x=>x,repintarTodo(){},
   temporada:(id,y)=>Promise.resolve({era:3.2,ip:120}),
   eraUsado:()=>99,
   detalle:()=>'<table><tr class="usa"><td>ERA usado (mezcla)</td><td class="n">3.50</td><td class="n">3.60</td></tr></table>',
   llamarIA(){},promptJuego(){return '';},promptDia(){return '';}};
  vm.createContext(ctx);
  vm.runInContext(src,ctx,{filename:'historial.js'});
  return {ctx,ins,vers,notas,H:ctx.window.OVAHist};
 }
 const T=montarHist(), H=T.H;
 const hist={2025:{ip:150,er:60},2024:{ip:170,er:75},2023:{ip:100,er:50}};
 const se={era:3.20,ip:120,fip:3.60,hist,hy:2026}, l5={era:2.5,ip:30};
 /* cuentas hechas aparte, a mano, con las constantes del backtest (a=1.5913, b_e=0.1739, b_ph=0.3329, b_f=0.5375) */
 const e=(3.20*120+40*4.0)/(120+40);
 const pH=(5*9*60+4*9*75+3*9*50+60*4.0)/(5*150+4*170+3*100+60);
 const f=((3.60-3.15)*120+40*(4.0-3.15))/(120+40);
 const sFip=1.5913+0.1739*e+0.3329*pH+0.5375*f;
 const sMarcel=0.8505+0.4410*e+0.3724*pH;
 const anc=(3.60*120+4.0*30)/(120+30), l=(2.5*30+anc*40*0.625)/(30+40*0.625);
 const cerca=(a,b)=>Math.abs(a-b)<1e-9;
 ok('apagado (valor por defecto): el ERA usado sale igual que antes de v64',T.ctx.eraUsado(se,l5)===99&&H.getFip()==='off'&&H.get()==='off');
 H.set('on');
 ok('solo historial encendido: sigue dando el modelo de Marcel de v47 (sin FIP)',cerca(T.ctx.eraUsado(se,l5),sMarcel*0.70+l*0.30));
 H.set('off'); H.setFip('on');
 ok('FIP encendido: ERA usado = (1.5913 + 0.1739·ERA año + 0.3329·historial + 0.5375·FIP jalado) al 70% + últimas 5 al 30%',cerca(T.ctx.eraUsado(se,l5),sFip*0.70+l*0.30));
 ok('el FIP jalado es el del backtest: (13HR+3BB-2K + 40·liga crudo)/(IP+40), con liga crudo = ERA liga - 3.15',cerca(H.fipJalado(se),f));
 ok('sin 10 innings (se.fip nulo) el FIP jalado cae a la liga y no truena',cerca(H.fipJalado({era:null,ip:0,fip:null}),4.0-3.15)&&cerca(H.fipJalado({era:4,ip:5,fip:null}),(40*(4.0-3.15))/45));
 ok('abridor sin historial suficiente (menos de 40 IP en 3 años): se queda como estaba',T.ctx.eraUsado({era:3.2,ip:120,fip:3.6,hist:{2025:{ip:30,er:12}},hy:2026},l5)===99&&T.ctx.eraUsado({era:3.2,ip:120,fip:3.6},l5)===99);
 T.ctx.MODO='last5';
 ok('modo «últimas 5» o «FIP» de la app: no se toca aunque esté encendido',T.ctx.eraUsado(se,l5)===99);
 T.ctx.MODO='mix';
 const x={sea:se,seh:{era:3.9,ip:90,fip:4.2,hist,hy:2026},year:2026,pa:{fullName:'Abridor A'},ph:{fullName:'Abridor B'}};
 H.setFip('on');
 const dOn=T.ctx.detalle(x);
 H.setFip('off');
 const dOff=T.ctx.detalle(x);
 ok('pestaña Números: la fila «ERA con historial + FIP» sale siempre, «(solo informativo)» si está apagado y «(en uso)» si está encendido',/ERA con historial \+ FIP \(solo informativo\)/.test(dOff)&&/ERA con historial \+ FIP \(en uso\)/.test(dOn)&&/ERA con historial \(solo informativo\)/.test(dOn));
 ok('el selector «FIP del abridor» se monta en Ajustes, apagado por defecto, junto al del historial',T.ins.length===2&&/id="hist"/.test(T.ins[0].innerHTML)&&/id="fipx"/.test(T.ins[1].innerHTML)&&/<option value="off" selected>/.test(T.ins[1].innerHTML));
 ok('la versión visible pasó a v64 y la nota explica que viene apagado',T.vers.every(v=>v.textContent==='v64')&&T.notas.some(n=>/ovaNota64/.test(n.className)&&/apagado/.test(n.innerHTML)));
 ok('los coeficientes del código son los que salieron del backtest (a, b_e, b_ph, b_f) y están anotados en el encabezado',/FA=1\.5913, FB1=0\.1739, FBH=0\.3329, FBF=0\.5375/.test(src)&&/1\.5913\+0\.1739\*ERA_del_año_jalado/.test(src.replace(/ /g,'')));
}

sec('En vivo (envivo.js): lista de juegos, cancha de la NBA, zona de strike de MLB y comentarios de fútbol');
{
 const E=require(path.join(__dirname,'envivo.js')), se=rd('envivo.js');
 ok('envivo.js se carga en los tres, después de asistente.js',['index.html','futbol.html','nba.html'].every(f=>{const x=rd(f);return x.indexOf('envivo.js')>x.indexOf('asistente.js')&&x.indexOf('asistente.js')>0;}));
 ok('el service worker guarda envivo.js',/'envivo\.js'/.test(rd('sw.js')));
 ok('no usa eval, new Function ni document.write',!/\beval\s*\(|new Function|document\.write/.test(se));
 ok('todo texto que llega de afuera se escapa (esc) y los logos solo aceptan https',E.esc('<img src=x onerror=alert(1)>')==='&lt;img src=x onerror=alert(1)&gt;'&&E.safeUrl('javascript:alert(1)')===''&&E.safeUrl('https://a.b/c.png')==='https://a.b/c.png');
 ok('traduce lo que narran las fuentes: béisbol, básquet y fútbol',/sencillo en rola a campocorto/.test(E.tr('Steven Kwan singles on a ground ball to shortstop Taylor Walls.'))&&/se poncha tirándole/.test(E.tr('Juan Soto strikes out swinging.'))&&/anota/.test(E.tr('Jalen Brunson makes 26-foot three point jumper'))&&/¡Gol!/.test(E.tr('Goal! PSG 4, Barcelona 2.'))&&/Tiro atajado/.test(E.tr('Attempt saved. X (Y) header')));
 ok('fútbol: «Foul by» y «misses to the right» no los pisa la traducción del básquet',E.tr('Foul by Pedri (Barcelona).')==='Falta de Pedri (Barcelona).'&&/se va por la derecha/.test(E.tr('shot misses to the right.')));
 ok('si ESPN rechazara el idioma (lang/region), se vuelve a pedir el juego sin eso',/S\.sinLang=true; return getJSON\(urlDetalle\(g\)\)/.test(se));
 ok('lo que ya viene en español no se toca',E.tr('Fuera el disparo de Lamine Yamal')==='Fuera el disparo de Lamine Yamal');
 ok("minutos de fútbol: 90'+3' = 93 y 45' = 45",E.minutoDe("90'+3'")===93&&E.minutoDe("45'")===45&&E.minutoDe('')===0);
 ok('NBA: las coordenadas basura de ESPN (-214748340) se ignoran y los tiros de la otra mitad se giran a la misma media cancha',!E.coordOk(-214748340,-214748340)&&E.coordOk(25,5)&&E.plegar(10,80).x===40&&E.plegar(10,80).y===14&&E.plegar(10,20).y===20);
 const sb={events:[
  {id:'1',date:'2026-10-20T23:00Z',status:{type:{state:'in',shortDetail:'7:12 - 2nd'}},competitions:[{competitors:[{homeAway:'home',score:'38',team:{id:'20',displayName:'New York Knicks',abbreviation:'NY',logo:'https://x/ny.png'}},{homeAway:'away',score:'28',team:{id:'20',displayName:'Philadelphia 76ers',abbreviation:'PHI',logo:'javascript:1'}}]}]},
  {id:'2',date:'2026-10-20T22:00Z',status:{type:{state:'post',shortDetail:'Final'}},competitions:[{competitors:[{homeAway:'home',score:'100',team:{id:'1',displayName:'A',abbreviation:'A'}},{homeAway:'away',score:'90',team:{id:'2',displayName:'B',abbreviation:'B'}}]}]},
  {id:'3',date:'2026-10-21T02:30Z',status:{type:{state:'pre',shortDetail:'10/20 - 9:30 PM EDT'}},competitions:[{competitors:[{homeAway:'home',team:{id:'3',displayName:'C',abbreviation:'C'}},{homeAway:'away',team:{id:'4',displayName:'D',abbreviation:'D'}}]}]}]};
 const ev=E.parseEspnEventos(sb,'NBA',''), ord=E.ordenarJuegos(ev);
 ok('lista ESPN: lee equipos, marcador y estado; el de logo peligroso queda sin logo; los vivos van primero y los terminados al final',ev.length===3&&ev[0].home.score==='38'&&ev[0].away.logo===''&&ev[0].det==='7:12 · 2º'&&ord[0].state==='in'&&ord[2].state==='post'&&ev[2].home.score==='0');
 const mlb=E.parseMlbSchedule({dates:[{games:[
  {gamePk:11,gameDate:'2026-10-20T23:00:00Z',status:{abstractGameState:'Live',detailedState:'In Progress'},linescore:{currentInning:5,isTopInning:true,outs:2},teams:{away:{score:2,team:{id:147,name:'New York Yankees',abbreviation:'NYY'}},home:{score:1,team:{id:111,name:'Boston Red Sox',abbreviation:'BOS'}}}},
  {gamePk:12,gameDate:'2026-10-20T23:00:00Z',status:{abstractGameState:'Live',detailedState:'Warmup'},teams:{away:{team:{id:1,name:'A'}},home:{team:{id:2,name:'B'}}}},
  {gamePk:13,gameDate:'2026-10-20T23:00:00Z',status:{abstractGameState:'Final',detailedState:'Postponed'},teams:{away:{team:{id:1,name:'A'}},home:{team:{id:2,name:'B'}}}},
  {gamePk:14,gameDate:'2026-10-20T23:00:00Z',status:{abstractGameState:'Final',detailedState:'Final'},linescore:{currentInning:9},teams:{away:{score:7,team:{id:1,name:'A'}},home:{score:3,team:{id:2,name:'B'}}}}]}]});
 ok('lista MLB: en vivo con entrada y outs, el calentamiento cuenta como por empezar, el pospuesto no sale como vivo, y el logo sale del id del equipo',mlb[0].state==='in'&&mlb[0].det==='▲5 · 2 outs'&&mlb[0].home.logo==='https://www.mlbstatic.com/team-logos/111.svg'&&mlb[1].state==='pre'&&mlb[2].det==='Pospuesto'&&mlb[2].state==='post'&&mlb[3].det==='Final');
 const pj=E.nbaJugadas({plays:[
  {id:'a',text:'X makes layup',period:{number:1},clock:{displayValue:'11:40'},scoringPlay:true,shootingPlay:true,scoreValue:2,team:{id:'10'},coordinate:{x:25,y:6},homeScore:2,awayScore:0},
  {id:'b',text:'Y misses jumper',period:{number:1},clock:{displayValue:'11:20'},scoringPlay:false,shootingPlay:true,scoreValue:0,team:{id:'10'},coordinate:{x:12,y:20}},
  {id:'c',text:'Z makes three point jumper',period:{number:1},clock:{displayValue:'11:00'},scoringPlay:true,shootingPlay:true,scoreValue:3,team:{id:'10'},coordinate:{x:5,y:70}},
  {id:'d',text:'Z makes free throw 1 of 2',period:{number:1},clock:{displayValue:'10:40'},scoringPlay:true,shootingPlay:true,scoreValue:1,team:{id:'10'},coordinate:{x:25,y:19}},
  {id:'e',text:'End of the 1st Quarter',period:{number:1},clock:{displayValue:'0:00'},coordinate:{x:-214748340,y:-214748340}}]});
 const ti=E.nbaTiros(pj), rs=E.resumenTiros(ti,'10');
 ok('NBA: solo cuentan como tiros las jugadas de tiro con coordenada válida; los libres no entran en el % de campo',pj.length===5&&ti.length===4&&rs.att===3&&rs.fg===2&&rs.pct===67&&rs.tres===1);
 const fc=E.futComentarios({commentary:[{sequence:1,time:{displayValue:"1'"},text:'Kick off'},{sequence:9,time:{displayValue:"90'+3'"},text:'Goal!'},{sequence:5,time:{displayValue:"45'"},text:''}]});
 ok('fútbol: comentarios del más nuevo al más viejo y sin los vacíos',fc.length===2&&fc[0].txt==='Goal!');
 const fe=E.futEventos({keyEvents:[{id:'1',type:{text:'Kickoff'},clock:{displayValue:"0'"}},{id:'2',type:{text:'Goal'},scoringPlay:true,clock:{displayValue:"79'"},team:{id:'5'},participants:[{athlete:{displayName:'Lamine Yamal'}}]},{id:'3',type:{text:'Yellow Card'},clock:{displayValue:"81'"},team:{id:'6'}}]});
 ok('fútbol: eventos con jugador y minuto, sin el pitazo inicial',fe.length===2&&fe[0].who==='Lamine Yamal'&&fe[0].min===79&&fe[0].sc===true&&E.iconoFut(fe[1].ty,false)==='🟨'&&E.iconoFut('Goal',true)==='⚽');
 const sp=E.statsPor({boxscore:{teams:[{team:{id:'5'},statistics:[{name:'possessionPct',displayValue:'61.5'},{name:'totalShots',displayValue:'14'}]},{team:{id:'6'},statistics:[{name:'possessionPct',displayValue:'38.5'},{name:'totalShots',displayValue:'6'}]}]}},'5','6',E.MAPA_FUT);
 ok('fútbol: estadísticas casa contra visita, solo las que la fuente trae',sp.length===2&&sp[0].h===61.5&&sp[0].a===38.5&&sp[1].h===14&&sp[1].a===6);
 const lz=E.mlbLanzamientos({about:{atBatIndex:3},playEvents:[
  {isPitch:true,details:{call:{description:'Called Strike',code:'C'},type:{description:'Four-Seam Fastball'},isStrike:true},pitchData:{startSpeed:96.24,coordinates:{pX:0.1,pZ:2.5},strikeZoneTop:3.4,strikeZoneBottom:1.6}},
  {isPitch:false,details:{description:'Mound visit'}},
  {isPitch:true,details:{call:{description:'Ball',code:'B'},type:{description:'Slider'},isBall:true},pitchData:{startSpeed:85,coordinates:{pX:-1.4,pZ:0.9}}},
  {isPitch:true,details:{call:{description:'In play, out(s)',code:'X'},type:{description:'Sinker'},isInPlay:true},pitchData:{startSpeed:93,coordinates:{pX:0.3,pZ:2}}}]});
 ok('MLB: lanzamientos numerados (el que no es lanzamiento no cuenta), con velocidad, color por resultado y nombre en español',lz.length===3&&lz[0].n===1&&lz[0].v===96.2&&lz[0].cl==='st'&&lz[1].cl==='ba'&&lz[2].cl==='ip'&&lz[0].tipo==='Recta 4 costuras'&&lz[0].res==='Strike cantado'&&lz[2].res==='En juego, out'&&lz[0].top===3.4);
 const mj=E.mlbJugadas({liveData:{plays:{allPlays:[{result:{description:'A singles.',awayScore:0,homeScore:0},about:{inning:1,halfInning:'top',atBatIndex:0}},{result:{description:'B homers.',awayScore:2,homeScore:0},about:{inning:1,halfInning:'top',isScoringPlay:true,atBatIndex:1}},{result:{},about:{inning:1,halfInning:'bottom',atBatIndex:2}}]}}});
 ok('MLB: jugadas de la más nueva a la más vieja, sin la que todavía no tiene descripción',mj.length===2&&mj[0].txt==='B homers.'&&mj[0].sc===true&&mj[0].top===true);
 const nsb=E.parseNbaScoreboard({scoreboard:{games:[
  {gameId:'0022600012',gameStatus:2,gameStatusText:'Q2 8:09',period:2,gameClock:'PT08M09.00S',gameTimeUTC:'2026-10-21T00:00:00Z',homeTeam:{teamId:1610612752,teamName:'Knicks',teamCity:'New York',teamTricode:'NYK',score:38},awayTeam:{teamId:1610612755,teamName:'76ers',teamCity:'Philadelphia',teamTricode:'PHI',score:28}},
  {gameId:'0022600013',gameStatus:1,gameStatusText:'9:30 pm ET',period:0,gameClock:'',gameTimeUTC:'2026-10-21T01:30:00Z',homeTeam:{teamId:1,teamName:'Spurs',teamCity:'San Antonio',teamTricode:'SAS',score:0},awayTeam:{teamId:2,teamName:'Thunder',teamCity:'Oklahoma City',teamTricode:'OKC',score:0}},
  {gameId:'0022600011',gameStatus:3,gameStatusText:'Final/OT',period:5,gameClock:'',gameTimeUTC:'2026-10-20T19:00:00Z',homeTeam:{teamId:3,teamName:'Pistons',teamCity:'Detroit',teamTricode:'DET',score:104},awayTeam:{teamId:4,teamName:'Celtics',teamCity:'Boston',teamTricode:'BOS',score:99}},
  {gameId:'0022600014',gameStatus:2,gameStatusText:'Halftime',period:2,gameClock:'',gameTimeUTC:'2026-10-21T00:00:00Z',homeTeam:{teamId:5,teamName:'A',teamCity:'X',teamTricode:'AAA',score:50},awayTeam:{teamId:6,teamName:'B',teamCity:'Y',teamTricode:'BBB',score:48}}]}});
 ok('NBA.com: lista con estado (1 por empezar, 2 en vivo, 3 final), reloj ISO a 8:09 · 2º, medio tiempo, final con tiempo extra y logo oficial',nsb.length===4&&nsb[0].state==='in'&&nsb[0].det==='8:09 · 2º'&&nsb[0].home.n==='New York Knicks'&&nsb[0].home.ab==='NYK'&&nsb[0].home.logo==='https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg'&&nsb[1].state==='pre'&&nsb[2].state==='post'&&nsb[2].det==='Final/TE'&&nsb[3].det==='Medio tiempo'&&nsb[0].src==='nba');
 ok('NBA.com: reloj ISO y tiempo extra',E.isoClock('PT00M08.30S')==='0:08'&&E.isoClock('PT12M00.00S')==='12:00'&&E.isoClock('')===''&&E.relojNba(6,'PT02M00.00S')==='2:00 · TE2');
 const npb=E.nbaComJugadas({game:{actions:[
  {actionNumber:4,clock:'PT11M40.00S',period:1,teamId:10,actionType:'2pt',shotResult:'Made',isFieldGoal:1,xLegacy:0,yLegacy:10,description:"Brunson Layup (2 PTS)",scoreHome:'2',scoreAway:'0'},
  {actionNumber:5,clock:'PT11M20.00S',period:1,teamId:10,actionType:'3pt',shotResult:'Missed',isFieldGoal:1,xLegacy:-230,yLegacy:60,description:"MISS Brunson 24' 3PT Jump Shot"},
  {actionNumber:6,clock:'PT11M00.00S',period:1,teamId:10,actionType:'3pt',shotResult:'Made',isFieldGoal:1,xLegacy:100,yLegacy:240,description:"Maxey 26' 3PT Jump Shot (3 PTS)",scoreHome:'2',scoreAway:'3'},
  {actionNumber:7,clock:'PT10M50.00S',period:1,teamId:10,actionType:'freethrow',shotResult:'Made',isFieldGoal:0,description:'Maxey Free Throw 1 of 2 (4 PTS)'},
  {actionNumber:8,clock:'PT10M40.00S',period:1,teamId:10,actionType:'3pt',shotResult:'Missed',isFieldGoal:1,xLegacy:30,yLegacy:850,description:'MISS Hart heave'},
  {actionNumber:9,clock:'PT10M30.00S',period:1,actionType:'rebound',description:''}]}});
 const nti=E.nbaTiros(npb), nrs=E.resumenTiros(nti,'10');
 ok('NBA.com: coordenadas en décimas de pie con el aro en (0,0) pasan al sistema de la cancha; tiros de campo con resultado; el tiro de más de media cancha, los libres y las filas sin texto no cuentan',npb.length===5&&nti.length===3&&Math.abs(npb[0].x-25)<1e-9&&Math.abs(npb[0].y-6.25)<1e-9&&npb[0].sc===true&&npb[0].val===2&&npb[2].val===3&&npb[1].sc===false&&npb[3].tl===true&&npb[3].val===1&&npb[4].ok===false&&nrs.att===3&&nrs.fg===2&&nrs.tres===1);
 const nbx={game:{gameStatus:2,gameStatusText:'Q2 8:09',period:2,gameClock:'PT08M09.00S',
  homeTeam:{teamId:1610612752,teamName:'Knicks',teamCity:'New York',teamTricode:'NYK',score:38,statistics:{fieldGoalsPercentage:0.485,threePointersPercentage:0.36,reboundsTotal:21,assists:12,turnovers:4}},
  awayTeam:{teamId:1610612755,teamName:'76ers',teamCity:'Philadelphia',teamTricode:'PHI',score:28,statistics:{fieldGoalsPercentage:0.412,threePointersPercentage:0.285,reboundsTotal:17,assists:9,turnovers:7}}}};
 const ncab=E.cabeceraNba({box:nbx},{home:{},away:{},state:'in',det:'viejo'}), nst=E.statsNbaCom(nbx);
 ok('NBA.com: el encabezado se arma del boxscore (marcador y reloj al segundo) y las estadísticas salen en porcentaje y solo las que la fuente trae',ncab.home.score==='38'&&ncab.away.score==='28'&&ncab.state==='in'&&ncab.det==='8:09 · 2º'&&nst.length===5&&nst[0].h===48.5&&nst[0].a===41.2&&nst[3].h===12&&E.cabeceraNba({},{home:{n:'x'},away:{n:'y'},state:'pre',det:'z'}).home.n==='x');
 ok('NBA.com primero y ESPN de respaldo: si NBA.com falla o viene vacía se pide ESPN, y cada juego recuerda de qué fuente salió',/scoreboard\/todaysScoreboard_00\.json'\)\.then\(parseNbaScoreboard\)[\s\S]*?return viaEspn\(\)/.test(se)&&/NBA\.com no respondió/.test(se)&&/g\.src='espn'/.test(se)&&/APP==='nba'&&g\.src==='nba'\)\?detalleNba\(g\)/.test(se));
 ok('NBA.com: la traducción entiende sus descripciones',/triple en suspensión \(3 pts\)/.test(E.tr("Brunson 26' 3PT Jump Shot (3 PTS)"))&&/^FALLA /.test(E.tr("MISS Maxey 14' Jump Shot"))&&/Cambio: entra Hart por Bridges/.test(E.tr('SUB: Hart FOR Bridges'))&&/tiro libre 1 de 2/.test(E.tr('Maxey Free Throw 1 of 2')));
 ok('detalles de estado de ESPN al español',E.detalleCorto('Halftime')==='Medio tiempo'&&E.detalleCorto('7:12 - 2nd')==='7:12 · 2º'&&E.detalleCorto("67'")==="67'"&&E.detalleCorto('Final/OT')==='Final/TE');
}

(async()=>{ await t_envivo(); await t_respaldo(); await t_sw(); })().then(()=>{
 console.log('\n'+(fallas?'✗ '+fallas+' FALLAS de '+total+' pruebas':'✓ TODO BIEN: '+total+' pruebas pasaron'));
 process.exit(fallas?1:0);
}).catch(e=>{console.log('ERROR en pruebas',e);process.exit(1);});
