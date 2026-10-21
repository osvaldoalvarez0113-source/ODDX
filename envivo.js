/* OVA · En vivo — MLB, fútbol y NBA.
   Una pestaña «En vivo» dentro de cada juego y una pantalla con todos los juegos que se están jugando ahora; al tocar uno,
   la vista del juego en vivo con refresco automático:
   · MLB: rombo con corredores, conteo (bolas, strikes, outs), zona de strike con cada lanzamiento, marcador por entrada
          y jugada por jugada. Fuente: MLB Stats API (gratis).
   · NBA: cancha con cada tiro (anotado o fallado) según va pasando, jugadas y estadísticas. Fuente: NBA.com (respaldo: ESPN).
   · Fútbol: comentarios minuto a minuto, línea de tiempo del partido (goles, tarjetas, cambios) y estadísticas. Fuente: ESPN.
   No hay posiciones de jugadores moviéndose: ese seguimiento es de pago y no existe gratis. Todo lo que se dibuja sale
   de datos reales; si una fuente no trae algo, esa parte no se muestra (no se inventa nada).
   No cambia ningún cálculo de la app ni escribe en tus registros: solo lee. */
(function(root){
"use strict";
var doc=root.document;
var ESPN='https://site.api.espn.com/apis/site/v2/sports/';
var MLBAPI='https://statsapi.mlb.com/api/';
var LIGAS=[['eng.1','Premier League'],['esp.1','LaLiga'],['ita.1','Serie A'],['ger.1','Bundesliga'],['fra.1','Ligue 1'],
 ['uefa.champions','Champions League'],['uefa.europa','Europa League'],['uefa.europa.conf','Conference League'],['mex.1','Liga MX'],['usa.1','MLS']];

/* ---------- funciones puras (se prueban en node) ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function num(v,d){ var n=parseFloat(v); return isFinite(n)?n:(d==null?0:d); }
function safeUrl(u){ u=String(u||''); return /^https:\/\//i.test(u)?u:''; }
function pad2(n){ return (n<10?'0':'')+n; }
function ymd(d){ return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate()); }

/* Traductor chico de lo que narran las fuentes (vienen en inglés). Reglas en orden; lo que no reconoce se deja igual. */
var TR=[
 /* fútbol */
 [/\bGoal!/g,'¡Gol!'],[/\bAttempt saved\./g,'Tiro atajado.'],[/\bAttempt missed\./g,'Tiro desviado.'],[/\bAttempt blocked\./g,'Tiro bloqueado.'],
 [/\bFoul by\b/g,'Falta de'],[/\bCorner,/g,'Córner,'],[/\bConceded by\b/g,'cedido por'],[/\bSubstitution,/g,'Cambio,'],
 [/\breplaces\b/gi,'sustituye a'],[/\bbecause of an injury\b/gi,'por lesión'],[/\bOffside,/g,'Fuera de juego,'],[/\bis caught offside\b/gi,'cae en fuera de juego'],
 [/\bFirst Half begins\b/gi,'Comienza el primer tiempo'],[/\bSecond Half begins\b/gi,'Comienza el segundo tiempo'],
 [/\bFirst Half ends\b/gi,'Termina el primer tiempo'],[/\bSecond Half ends\b/gi,'Termina el segundo tiempo'],[/\bMatch ends\b/gi,'Termina el partido'],
 [/\bleft footed shot\b/gi,'disparo con la zurda'],[/\bright footed shot\b/gi,'disparo con la derecha'],[/\bheader\b/gi,'cabezazo'],
 [/\bfrom the centre of the box\b/gi,'desde el centro del área'],[/\bfrom outside the box\b/gi,'desde fuera del área'],[/\bfrom very close range\b/gi,'desde muy cerca'],
 [/\bto the bottom left corner\b/gi,'al ángulo inferior izquierdo'],[/\bto the bottom right corner\b/gi,'al ángulo inferior derecho'],
 [/\bto the top left corner\b/gi,'al ángulo superior izquierdo'],[/\bto the top right corner\b/gi,'al ángulo superior derecho'],
 [/\bYellow Card\b/gi,'Tarjeta amarilla'],[/\bRed Card\b/gi,'Tarjeta roja'],[/\bDelay in match\b/gi,'Demora en el partido'],[/\bVAR Decision:?/gi,'Decisión del VAR:'],
 [/\bmisses to the right\b/gi,'se va por la derecha'],[/\bmisses to the left\b/gi,'se va por la izquierda'],[/\bis too high\b/gi,'se va por arriba'],[/\bis high and wide\b/gi,'se va alto y desviado'],[/\bis close, but misses\b/gi,'pasa cerca'],
 /* béisbol */
 [/\bintentionally walks\b/gi,'recibe boleto intencional'],[/\bis intentionally walked\b/gi,'recibe boleto intencional'],
 [/\bwalks\b/gi,'recibe boleto'],[/\bis hit by pitch\b/gi,'es golpeado por el lanzamiento'],[/\bhit by pitch\b/gi,'golpeado por el lanzamiento'],
 [/\bstrikes out swinging\b/gi,'se poncha tirándole'],[/\bstrikes out looking\b/gi,'se poncha mirando'],[/\bcalled out on strikes\b/gi,'se poncha mirando'],
 [/\bstrikes out\b/gi,'se poncha'],[/\bgrounds into a double play\b/gi,'rola para doble play'],[/\bgrounds into a force out\b/gi,'rola con out de fuerza'],
 [/\bgrounds out\b/gi,'rola de out'],[/\bflies out\b/gi,'elevado de out'],[/\blines out\b/gi,'línea de out'],[/\bpops out\b/gi,'fly de out'],
 [/\bhits a sacrifice fly\b/gi,'elevado de sacrificio'],[/\bsacrifice bunt\b/gi,'toque de sacrificio'],
 [/\bfielding error\b/gi,'error de fildeo'],[/\bfield error\b/gi,'error de fildeo'],
 [/\bsingles\b/gi,'sencillo'],[/\bdoubles\b/gi,'doble'],[/\btriples\b/gi,'triple'],[/\bhomers\b/gi,'jonrón'],
 [/\bon a sharp ground ball\b/gi,'en rola fuerte'],[/\bon a ground ball\b/gi,'en rola'],[/\bon a fly ball\b/gi,'en elevado'],
 [/\bon a line drive\b/gi,'en línea'],[/\bon a pop up\b/gi,'en fly corto'],[/\bon a bunt\b/gi,'en toque'],
 [/\bshortstop\b/gi,'campocorto'],[/\bfirst baseman\b/gi,'primera base'],[/\bsecond baseman\b/gi,'segunda base'],[/\bthird baseman\b/gi,'tercera base'],
 [/\bleft fielder\b/gi,'jardinero izquierdo'],[/\bcenter fielder\b/gi,'jardinero central'],[/\bright fielder\b/gi,'jardinero derecho'],
 [/\bcatcher\b/gi,'receptor'],[/\bpitcher\b/gi,'lanzador'],[/\bleft field\b/gi,'jardín izquierdo'],[/\bcenter field\b/gi,'jardín central'],[/\bright field\b/gi,'jardín derecho'],
 [/ to (?=campocorto|primera|segunda|tercera|jard[ií]n|jardinero|receptor|lanzador)/gi,' a '],
 [/\bscores\b/gi,'anota'],[/\badvances to\b/gi,'avanza a'],[/\bcaught stealing\b/gi,'out robando'],[/\bsteals\b/gi,'se roba'],
 [/\bPitching Change:/gi,'Cambio de lanzador:'],[/\bDefensive Substitution:?/gi,'Cambio defensivo:'],[/\bOffensive Substitution:?/gi,'Cambio ofensivo:'],
 [/\bpinch-hitter\b/gi,'bateador emergente'],[/\bpinch-runner\b/gi,'corredor emergente'],[/\bwild pitch\b/gi,'lanzamiento descontrolado'],
 [/\bpassed ball\b/gi,'bola pasada'],[/\bMound Visit\b/gi,'Visita al montículo'],[/\bumpire\b/gi,'árbitro'],
 /* básquet (formato de NBA.com) */
 [/\bMISS\b/g,'FALLA'],[/\b3PT Pullup Jump Shot\b/gi,'triple tras bote'],[/\b3PT Jump Shot\b/gi,'triple en suspensión'],[/\b3PT\b/g,'triple'],[/\bPullup Jump Shot\b/gi,'tiro tras bote'],[/\bStep Back Jump shot\b/gi,'tiro hacia atrás'],[/\bFloating Jump Shot\b/gi,'flotador'],[/\bHook Shot\b/gi,'gancho'],[/\bJump Shot\b/gi,'tiro en suspensión'],
 [/\bFree Throw (\d) of (\d)\b/gi,'tiro libre $1 de $2'],[/\bBad Pass\b/gi,'pase malo'],[/\bBLOCK\b/g,'TAPÓN'],[/\bPTS\b/g,'pts'],[/\bOff:(\d+) Def:(\d+)/g,'of:$1 def:$2'],
 [/\bSUB: (.+?) FOR (.+)$/g,'Cambio: entra $1 por $2'],[/\bStart of (\d)(?:st|nd|rd|th) Period\b/gi,'Comienza el cuarto $1'],[/\bEnd of (\d)(?:st|nd|rd|th) Period\b/gi,'Fin del cuarto $1'],
 [/\bS\.FOUL\b/g,'falta en tiro'],[/\bP\.FOUL\b/g,'falta personal'],[/\bOFF\.FOUL\b/g,'falta ofensiva'],[/\bT\.FOUL\b/g,'falta técnica'],[/\bViolation:?/gi,'Violación:'],[/\bDefensive Goaltending\b/gi,'goaltending defensivo'],[/\bTravelling\b/gi,'pasos'],[/\bInstant Replay\b/gi,'Revisión de video'],
 [/\bmakes\b/gi,'anota'],[/\bmisses\b/gi,'falla'],[/\bthree point jumper\b/gi,'triple en suspensión'],[/\bthree point\b/gi,'triple'],
 [/\bdriving layup\b/gi,'bandeja en penetración'],[/\blayup\b/gi,'bandeja'],[/\bjumper\b/gi,'tiro en suspensión'],[/\bdunk\b/gi,'clavada'],
 [/\bfree throw\b/gi,'tiro libre'],[/\bdefensive rebound\b/gi,'rebote defensivo'],[/\boffensive rebound\b/gi,'rebote ofensivo'],[/\brebound\b/gi,'rebote'],
 [/\bturnover\b/gi,'pérdida'],[/\bblocks\b/gi,'tapona a'],[/\bassists\b/gi,'asiste'],[/\bshooting foul\b/gi,'falta en tiro'],
 [/\bpersonal foul\b/gi,'falta personal'],[/\bfoul\b/gi,'falta'],[/\btimeout\b/gi,'tiempo fuera'],[/\benters the game for\b/gi,'entra por'],
 [/\bEnd of the (\d)(?:st|nd|rd|th) Quarter\b/gi,'Fin del cuarto $1'],[/\bEnd of (\d)(?:st|nd|rd|th) quarter\b/gi,'Fin del cuarto $1'],
 [/\bJump Ball\b/gi,'Salto inicial'],[/(\d+)-foot\b/gi,'$1 pies'],
];
function tr(t){ var s=String(t==null?'':t); for(var i=0;i<TR.length;i++) s=s.replace(TR[i][0],TR[i][1]); return s; }

var TIPOS_LANZ={'four-seam fastball':'Recta 4 costuras','two-seam fastball':'Recta 2 costuras','fastball':'Recta','sinker':'Sinker','slider':'Slider','curveball':'Curva','knuckle curve':'Curva nudillo','changeup':'Cambio','cutter':'Cutter','split-finger':'Splitter','sweeper':'Sweeper','knuckleball':'Nudillo','slurve':'Slurve','forkball':'Forkball','eephus':'Eephus','screwball':'Screwball'};
var LLAMADAS={'called strike':'Strike cantado','swinging strike':'Strike tirándole','swinging strike (blocked)':'Strike tirándole','ball':'Bola','ball in dirt':'Bola en el suelo','foul':'Foul','foul tip':'Foul tip','foul bunt':'Foul de toque','foul (runner going)':'Foul','hit by pitch':'Golpeado','intent ball':'Bola intencional','pitchout':'Pitchout','automatic ball':'Bola automática','automatic strike':'Strike automático','missed bunt':'Toque fallado','swinging strike (foul tip)':'Strike tirándole'};
function nombreLanz(t){ var k=String(t||'').toLowerCase(); return TIPOS_LANZ[k]||t||''; }
function nombreLlamada(t){
 var k=String(t||'').toLowerCase();
 if(LLAMADAS[k]) return LLAMADAS[k];
 if(/^in play, out/.test(k)) return 'En juego, out';
 if(/^in play, run/.test(k)) return 'En juego, anotación';
 if(/^in play/.test(k)) return 'En juego';
 return t||'';
}
function detalleCorto(s){
 s=String(s||'');
 return s.replace(/^Halftime$/i,'Medio tiempo').replace(/^Half ?time$/i,'Medio tiempo').replace(/^End of (\d)(?:st|nd|rd|th)$/i,'Fin del $1º').replace(/^Final\/OT$/i,'Final/TE')
  .replace(/^Final\/(\d)OT$/i,'Final/$1TE').replace(/^Full ?Time$/i,'Final').replace(/^FT$/,'Final').replace(/^HT$/,'Medio tiempo').replace(/^Scheduled$/i,'Programado')
  .replace(/\s-\s(\d)(?:st|nd|rd|th)$/i,' · $1º').replace(/^Postponed$/i,'Pospuesto').replace(/^Canceled$/i,'Cancelado').replace(/^Delayed$/i,'Demorado').replace(/^Suspended$/i,'Suspendido');
}
function minutoDe(s){
 var m=String(s||'').match(/(\d+)\s*'?\s*(?:\+\s*(\d+))?/);
 return m?(parseInt(m[1],10)+(m[2]?parseInt(m[2],10):0)):0;
}
function coordOk(x,y){ return typeof x==='number'&&typeof y==='number'&&isFinite(x)&&isFinite(y)&&x>=0&&x<=50&&y>=0&&y<=94; }
/* todos los tiros se dibujan en una sola media cancha: lo que cae en la mitad de arriba se gira 180° */
function plegar(x,y){ return y>47?{x:50-x,y:94-y}:{x:x,y:y}; }
function tm(c){
 var t=(c&&c.team)||{}, lg=(t.logos&&t.logos[0]&&t.logos[0].href)||'';
 return {id:String(t.id==null?'':t.id),n:t.displayName||t.name||'?',ab:t.abbreviation||String(t.shortDisplayName||t.displayName||'?').slice(0,3).toUpperCase(),
  logo:safeUrl(t.logo||lg),score:(!c||c.score==null||c.score==='')?'0':String(c.score)};
}
function parseEspnEventos(j,liga,slug){
 var out=[];
 ((j&&j.events)||[]).forEach(function(e){
  var c=(e.competitions||[])[0]||{}, cs=c.competitors||[], h=null, a=null;
  cs.forEach(function(x){ if(x.homeAway==='home') h=x; else if(x.homeAway==='away') a=x; });
  if(!h||!a) return;
  var st=e.status||c.status||{}, ty=st.type||{};
  out.push({id:String(e.id),liga:liga||'',slug:slug||'',state:ty.state||'pre',det:detalleCorto(ty.shortDetail||ty.detail||''),clock:st.displayClock||'',
   start:Date.parse(e.date)||0,home:tm(h),away:tm(a)});
 });
 return out;
}
function parseMlbSchedule(j){
 var out=[];
 ((j&&j.dates)||[]).forEach(function(dt){ (dt.games||[]).forEach(function(g){
  var s=g.status||{}, ab=s.abstractGameState||'', dd=s.detailedState||'', ls=g.linescore||{}, T=g.teams||{};
  var st=ab==='Live'?'in':(ab==='Final'?'post':'pre'), det='';
  if(/Warmup|Pre-Game|Scheduled|Delayed Start/i.test(dd)&&!/In Progress/i.test(dd)) st=(ab==='Final')?'post':'pre';
  if(/Postponed|Cancel/i.test(dd)){ st='post'; det='Pospuesto'; }
  else if(/Suspended/i.test(dd)){ st='post'; det='Suspendido'; }
  else if(st==='in') det=(ls.isTopInning?'▲':'▼')+(ls.currentInning||'')+(ls.outs!=null?' · '+ls.outs+' out'+(ls.outs===1?'':'s'):'')+(/Delay/i.test(dd)?' · demora':'');
  else if(st==='post') det='Final'+((ls.currentInning&&ls.currentInning!==9)?'/'+ls.currentInning:'');
  function eq(side){ var t=(T[side]&&T[side].team)||{}; return {id:String(t.id||''),n:t.name||t.teamName||'?',ab:t.abbreviation||String(t.teamName||t.name||'?').slice(0,3).toUpperCase(),
   logo:t.id?'https://www.mlbstatic.com/team-logos/'+t.id+'.svg':'',score:String((T[side]&&T[side].score!=null)?T[side].score:0)}; }
  out.push({id:String(g.gamePk),liga:'MLB',slug:'',state:st,det:det,clock:'',start:Date.parse(g.gameDate)||0,home:eq('home'),away:eq('away')});
 }); });
 return out;
}
function ordenarJuegos(l){
 var rk={in:0,pre:1,post:2};
 return l.slice().sort(function(a,b){ return (rk[a.state]-rk[b.state])||(a.state==='post'?(b.start-a.start):(a.start-b.start))||(a.liga<b.liga?-1:1); });
}
/* NBA: jugadas con su lugar en la cancha */
function nbaJugadas(j){
 return ((j&&j.plays)||[]).map(function(p,i){
  var c=p.coordinate||{}, x=(typeof c.x==='number')?c.x:parseFloat(c.x), y=(typeof c.y==='number')?c.y:parseFloat(c.y);
  var ty=(p.type&&p.type.text)||'', txt=p.text||'';
  return {id:String(p.id!=null?p.id:(p.sequenceNumber!=null?p.sequenceNumber:i)),txt:txt,per:num(p.period&&p.period.number!=null?p.period.number:p.period,0),
   clk:(p.clock&&p.clock.displayValue)||'',sc:!!p.scoringPlay,shot:!!p.shootingPlay,val:num(p.scoreValue,0),tid:String((p.team&&p.team.id)||''),
   x:x,y:y,ok:coordOk(x,y),hs:p.homeScore,as:p.awayScore,tl:/free throw/i.test(ty+' '+txt)};
 });
}
function nbaTiros(pl){ return pl.filter(function(p){ return p.shot&&p.ok; }); }
function resumenTiros(tiros,tid){
 var t=tiros.filter(function(p){ return p.tid===tid&&!p.tl; }), m=t.filter(function(p){ return p.sc; });
 return {fg:m.length,att:t.length,pct:t.length?Math.round(m.length/t.length*100):0,tres:m.filter(function(p){ return p.val===3; }).length};
}
/* NBA.com (cdn.nba.com): fuente principal de la NBA. Si no responde, la app usa ESPN. */
var NBACDN='https://cdn.nba.com/static/json/liveData/';
function isoClock(c){
 var m=String(c||'').match(/^PT(\d+)M(\d+)(?:\.\d+)?S$/); if(!m) return '';
 return parseInt(m[1],10)+':'+pad2(parseInt(m[2],10));
}
function relojNba(per,clock){ var c=isoClock(clock); per=num(per,0); return (c?c+' · ':'')+(per>4?'TE'+(per>5?(per-4):''):(per?per+'º':'')); }
function tmNba(t){
 t=t||{}; var id=t.teamId==null?'':String(t.teamId);
 return {id:id,n:((t.teamCity||'')+' '+(t.teamName||'')).trim()||t.teamTricode||'?',ab:t.teamTricode||String(t.teamName||'?').slice(0,3).toUpperCase(),
  logo:id?'https://cdn.nba.com/logos/nba/'+id+'/global/L/logo.svg':'',score:String(t.score!=null&&t.score!==''?t.score:0)};
}
function estadoNba(gs){ return gs===2?'in':(gs===3?'post':'pre'); }
function detNba(st,per,clock,texto){
 if(st==='in') return isoClock(clock)?relojNba(per,clock):detalleCorto(texto||'');
 if(st==='post') return detalleCorto(texto||'Final');
 return '';
}
function parseNbaScoreboard(j){
 return (((j&&j.scoreboard&&j.scoreboard.games)||[]).map(function(g){
  var st=estadoNba(g.gameStatus);
  return {id:String(g.gameId),src:'nba',liga:'NBA',slug:'',state:st,det:detNba(st,g.period,g.gameClock,g.gameStatusText),clock:'',start:Date.parse(g.gameTimeUTC)||0,home:tmNba(g.homeTeam),away:tmNba(g.awayTeam)};
 }));
}
/* las coordenadas de NBA.com vienen en décimas de pie con el aro en (0,0); se pasan al mismo sistema que usa la cancha (aro en x=25, y=5.25 pies) */
function nbaComJugadas(j){
 return (((j&&j.game&&j.game.actions)||[]).map(function(a,i){
  var xl=parseFloat(a.xLegacy), yl=parseFloat(a.yLegacy), fx=25+xl/10, fy=5.25+yl/10, ty=String(a.actionType||'');
  var ft=/free ?throw/i.test(ty), made=String(a.shotResult||'')==='Made';
  return {id:String(a.actionNumber!=null?a.actionNumber:i),txt:a.description||'',per:num(a.period,0),clk:isoClock(a.clock),sc:made,shot:(a.isFieldGoal===1||a.isFieldGoal==='1'),
   val:made?(ty==='3pt'?3:(ft?1:2)):0,tid:String(a.teamId||''),x:fx,y:fy,ok:isFinite(fx)&&isFinite(fy)&&fx>=0&&fx<=50&&fy>=0&&fy<=47,hs:a.scoreHome,as:a.scoreAway,tl:ft};
 })).filter(function(p){ return p.txt; });
}
function cabeceraNba(j,g){
 var b=(j&&j.box&&j.box.game)||null;
 if(b&&b.homeTeam&&b.awayTeam){
  var st=estadoNba(b.gameStatus), home=tmNba(b.homeTeam), away=tmNba(b.awayTeam);
  return {home:home,away:away,state:st,det:detNba(st,b.period,b.gameClock,b.gameStatusText)||g.det,clock:isoClock(b.gameClock)};
 }
 return {home:g.home,away:g.away,state:g.state,det:g.det,clock:''};
}
var MAPA_NBACOM=[['fieldGoalsPercentage','% de tiros de campo',1],['threePointersPercentage','% de triples',1],['freeThrowsPercentage','% de tiros libres',1],['reboundsTotal','Rebotes'],['assists','Asistencias'],['turnovers','Pérdidas'],['steals','Robos'],['blocks','Tapones'],['pointsInThePaint','Puntos en la pintura'],['pointsFastBreak','Puntos al contraataque']];
function statsNbaCom(box){
 var g=(box&&box.game)||{}, H=(g.homeTeam&&g.homeTeam.statistics)||{}, A=(g.awayTeam&&g.awayTeam.statistics)||{}, rows=[];
 MAPA_NBACOM.forEach(function(m){
  var a=A[m[0]], hh=H[m[0]]; if(a==null&&hh==null) return;
  function f(v){ var n=num(v,0); return m[2]&&n<=1?Math.round(n*1000)/10:n; }
  var av=f(a), hv=f(hh);
  rows.push({label:m[1],a:av,h:hv,as:a==null?'–':String(av),hs:hh==null?'–':String(hv),pct:!!m[2]});
 });
 return rows;
}
/* fútbol */
function futEventos(j){
 return ((j&&j.keyEvents)||[]).map(function(k,i){
  var who=(k.participants&&k.participants[0]&&k.participants[0].athlete&&k.participants[0].athlete.displayName)||'';
  var ty=(k.type&&k.type.text)||'';
  return {id:String(k.id!=null?k.id:i),ty:ty,clk:(k.clock&&k.clock.displayValue)||'',min:minutoDe((k.clock&&k.clock.displayValue)||''),sc:!!k.scoringPlay,
   txt:k.shortText||k.text||'',tid:String((k.team&&k.team.id)||''),who:who};
 }).filter(function(e){ return e.ty&&!/^(kickoff|halftime|end|start|full)/i.test(e.ty); });
}
function futComentarios(j){
 var l=((j&&j.commentary)||[]).map(function(c,i){
  return {id:String(c.sequence!=null?c.sequence:i),seq:num(c.sequence,i),clk:(c.time&&c.time.displayValue)||'',txt:c.text||(c.play&&c.play.text)||'',ty:(c.play&&c.play.type&&c.play.type.text)||''};
 }).filter(function(c){ return c.txt; });
 l.sort(function(a,b){ return b.seq-a.seq; });
 return l;
}
function iconoFut(ty,sc){
 var t=String(ty||'').toLowerCase();
 if(sc||/^goal|penalty - scored|own goal/.test(t)) return '⚽';
 if(/yellow/.test(t)) return '🟨'; if(/red/.test(t)) return '🟥'; if(/substitution/.test(t)) return '🔄';
 if(/var/.test(t)) return '📺'; if(/corner/.test(t)) return '🚩'; if(/offside/.test(t)) return '🚫';
 if(/save|saved/.test(t)) return '🧤'; if(/shot|attempt|miss|post/.test(t)) return '🎯'; if(/foul/.test(t)) return '✋';
 if(/half|full|end|start|kick/.test(t)) return '⏱'; return '•';
}
function statsPor(j,idHome,idAway,mapa){
 var T=((j&&j.boxscore&&j.boxscore.teams)||[]), pH={}, pA={};
 T.forEach(function(t){
  var id=String((t.team&&t.team.id)||''), dst=(id===idHome)?pH:((id===idAway)?pA:null); if(!dst) return;
  (t.statistics||[]).forEach(function(s){ dst[s.name]=s.displayValue!=null?s.displayValue:s.value; });
 });
 var rows=[];
 mapa.forEach(function(m){
  var a=pA[m[0]], h=pH[m[0]]; if(a==null&&h==null) return;
  rows.push({label:m[1],a:num(String(a).replace('%',''),0),h:num(String(h).replace('%',''),0),as:String(a==null?'–':a),hs:String(h==null?'–':h),pct:!!m[2]});
 });
 return rows;
}
var MAPA_NBA=[['fieldGoalPct','% de tiros de campo',1],['threePointFieldGoalPct','% de triples',1],['freeThrowPct','% de tiros libres',1],['totalRebounds','Rebotes'],['assists','Asistencias'],['turnovers','Pérdidas'],['steals','Robos'],['blocks','Tapones']];
var MAPA_FUT=[['possessionPct','Posesión %',1],['totalShots','Tiros'],['shotsOnTarget','Tiros a puerta'],['wonCorners','Córners'],['foulsCommitted','Faltas'],['yellowCards','Amarillas'],['redCards','Rojas'],['saves','Atajadas'],['offsides','Fuera de juego'],['accuratePasses','Pases precisos']];
/* MLB: tipo de lanzamiento por resultado, para el color */
function claseLanz(ev){
 var d=(ev&&ev.details)||{};
 if(d.isInPlay) return 'ip'; if(d.isBall) return 'ba'; if(d.isStrike) return 'st';
 var c=(d.call&&d.call.code)||''; if(/^[B]/.test(c)) return 'ba'; if(/^[XDE]/.test(c)) return 'ip'; return 'st';
}
function mlbLanzamientos(play){
 var out=[], n=0;
 ((play&&play.playEvents)||[]).forEach(function(ev){
  if(!ev||!ev.isPitch) return; n++;
  var pd=ev.pitchData||{}, co=pd.coordinates||{}, d=ev.details||{};
  out.push({n:n,id:String((play.about&&play.about.atBatIndex)||'')+'-'+n,px:(typeof co.pX==='number')?co.pX:null,pz:(typeof co.pZ==='number')?co.pZ:null,
   v:pd.startSpeed!=null?Math.round(pd.startSpeed*10)/10:null,tipo:nombreLanz((d.type&&d.type.description)||''),res:nombreLlamada((d.call&&d.call.description)||''),cl:claseLanz(ev),
   top:num(pd.strikeZoneTop,3.5),bot:num(pd.strikeZoneBottom,1.5)});
 });
 return out;
}
function mlbJugadas(j){
 var all=((j&&j.liveData&&j.liveData.plays&&j.liveData.plays.allPlays)||[]), out=[];
 for(var i=all.length-1;i>=0&&out.length<40;i--){
  var p=all[i], r=p.result||{}, a=p.about||{}; if(!r.description) continue;
  out.push({id:String(a.atBatIndex!=null?a.atBatIndex:i),inn:a.inning||0,top:a.halfInning==='top',txt:r.description,ev:r.event||'',sc:!!a.isScoringPlay,as:r.awayScore,hs:r.homeScore});
 }
 return out;
}
var API={esc:esc,tr:tr,minutoDe:minutoDe,coordOk:coordOk,plegar:plegar,parseEspnEventos:parseEspnEventos,parseMlbSchedule:parseMlbSchedule,ordenarJuegos:ordenarJuegos,
 nbaJugadas:nbaJugadas,nbaTiros:nbaTiros,resumenTiros:resumenTiros,futEventos:futEventos,futComentarios:futComentarios,statsPor:statsPor,MAPA_NBA:MAPA_NBA,MAPA_FUT:MAPA_FUT,
 mlbLanzamientos:mlbLanzamientos,mlbJugadas:mlbJugadas,isoClock:isoClock,relojNba:relojNba,parseNbaScoreboard:parseNbaScoreboard,nbaComJugadas:nbaComJugadas,cabeceraNba:cabeceraNba,statsNbaCom:statsNbaCom,detalleCorto:detalleCorto,iconoFut:iconoFut,nombreLlamada:nombreLlamada,nombreLanz:nombreLanz,safeUrl:safeUrl};
root.OVAEnVivo=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(!doc) return;

/* ---------- pantalla ---------- */
function appActual(){
 var a=doc.documentElement.getAttribute('data-app')||'';
 if(a==='mlb'||a==='fut'||a==='nba') return a;
 var p=(root.location&&root.location.pathname)||'';
 return /futbol/.test(p)?'fut':(/nba/.test(p)?'nba':'mlb');
}
var APP=appActual();
var S={prevSc:{},sinLang:false,open:false,view:'list',games:[],cur:null,det:null,tab:'',filt:'all',timer:null,pollList:null,req:0,seen:{},cargado:false,error:'',upd:0,scroll:0};
var sheet=null,fab=null,bodyEl=null,titleEl=null,backEl=null,fabN=null;

function $(s,r){ return (r||doc).querySelector(s); }
function mk(tag,cls,txt){ var e=doc.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function getJSON(url){
 var ctl=(typeof AbortController!=='undefined')?new AbortController():null, to=null;
 if(ctl) to=setTimeout(function(){ try{ ctl.abort(); }catch(e){} },9000);
 return root.fetch(url,{cache:'no-store',signal:ctl?ctl.signal:undefined}).then(function(r){ if(to) clearTimeout(to); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); },function(e){ if(to) clearTimeout(to); throw e; });
}
function horaTxt(ms){ try{ return new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
function diaTxt(ms){
 var d=new Date(ms), h=new Date(); if(ymd(d)===ymd(h)) return 'hoy';
 var m=new Date(h.getTime()+864e5); if(ymd(d)===ymd(m)) return 'mañana';
 try{ return d.toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'}); }catch(e){ return ''; }
}

var CSS=[
 '@keyframes evPulso{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.7)}50%{box-shadow:0 0 0 7px rgba(248,113,113,0)}}',
 '.evSheet{display:none;position:fixed;inset:0;z-index:96;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:var(--bg,#070b12);color:var(--txt,#f1f5fb);font-family:system-ui,-apple-system,sans-serif;padding:0 0 calc(40px + env(safe-area-inset-bottom,0px))}',
 '.evSheet.on{display:block}',
 '.evPitch{position:relative}.evPitchTop,.evPitchBot{display:flex;justify-content:space-between;align-items:center;gap:8px;font:700 12px system-ui,-apple-system,sans-serif;color:var(--mut,#9db2c8);padding:4px 2px}',
 '.evPitchBot{align-items:flex-start}.evPitchTxt{flex:1;text-align:right;font-weight:500;line-height:1.35}',
 '.evPitchSvg{display:block;width:100%;height:auto;border-radius:10px}',
 '.evPt{fill:#0b0f14}.evPt.l{fill:#3a2a00}.evPt.v{fill:#00263a}',
 '.evPase{stroke:#fff;stroke-width:.55;stroke-linecap:round;opacity:0}',
 '.evAct{transition:transform .3s ease-out}.evAct circle{fill:#0b0f14;stroke:#fff;stroke-width:.4}.evAct.l circle{fill:#7a5a00}.evAct.v circle{fill:#0b5f85}',
 '.evAct text{fill:#fff;font:700 2.1px system-ui,-apple-system,sans-serif;paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:.5px}.evAct .evAx{font-size:2.3px}',
 '.evBola{transition:transform .45s linear}.evBola circle{fill:#fff;stroke:#111;stroke-width:.3}',
 '.evPitch.evGolPit .evPitchSvg{animation:evGolPit 1.2s ease-out 2}@keyframes evGolPit{0%,100%{filter:none}50%{filter:brightness(1.5)}}',
 '.evLiveDot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--bad,#f87171);margin-right:6px;vertical-align:middle;animation:evPulso 1.4s ease-in-out infinite}',
 '.evScore.evFlash{animation:evGol 1.3s ease-out}@keyframes evGol{0%{transform:scale(1.4);color:var(--hot,#fbbf24)}55%{transform:scale(1.08)}100%{transform:none}}',
 '.evBar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:var(--bg,#070b12);border-bottom:1px solid var(--line2,#2a3e56)}',
 '.evBar h2{flex:1;margin:0;font-size:17px;line-height:1.2}.evBar h2 small{display:block;font-size:11px;font-weight:600;color:var(--mut,#9db2c8)}',
 '.evBtn{border:1px solid var(--line2,#2a3e56);background:var(--bg2,#131d2c);color:var(--txt,#f1f5fb);border-radius:12px;padding:9px 13px;font:700 14px system-ui;min-height:40px;cursor:pointer;-webkit-tap-highlight-color:transparent;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;user-select:none;-webkit-user-select:none}',
 '.evWrap{padding:12px 12px 0;max-width:640px;margin:0 auto}',
 '.evSec{margin:16px 2px 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut,#9db2c8);font-weight:800}',
 '.evRow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line2,#2a3e56);background:var(--bg1,#0d1420);color:var(--txt,#f1f5fb);border-radius:16px;padding:12px 14px;margin:0 0 8px;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;user-select:none;-webkit-user-select:none}',
 '.evRow.in{border-left:4px solid var(--bad,#f87171)}',
 '.evRow .eqs{flex:1;min-width:0}.evRow .eq{display:flex;align-items:center;gap:8px;padding:3px 0;font-weight:700;font-size:15px}',
 '.evRow .eq img{width:22px;height:22px;object-fit:contain}.evRow .eq span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.evRow .eq em{font-style:normal;font-size:18px;font-weight:800;min-width:22px;text-align:right}',
 '.evRow .st{flex:0 0 auto;text-align:right;font-size:12px;color:var(--mut,#9db2c8);font-weight:700;max-width:92px}',
 '.evRow .st.v{color:var(--bad,#f87171)}.evRow .lg{display:block;font-size:10.5px;color:var(--mut,#9db2c8);font-weight:600;margin-top:2px}',
 '.evVacio{text-align:center;color:var(--mut,#9db2c8);padding:34px 16px;font-size:14px;line-height:1.5}',
 '.evHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 6px 6px}',
 '.evTm{flex:1;text-align:center;font-weight:800;font-size:13px;min-width:0}.evTm img{width:54px;height:54px;object-fit:contain;display:block;margin:0 auto 6px}.evTm span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.evSc{flex:0 0 auto;text-align:center}.evScore{font-size:40px;font-weight:800;letter-spacing:.02em;line-height:1}.evScore i{font-style:normal;color:var(--mut,#9db2c8);margin:0 6px}',
 '.evStP{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:800;background:var(--bg2,#131d2c);color:var(--mut,#9db2c8)}',
 '.evStP.v{background:var(--bad,#f87171);color:#fff}',
 '.evGol{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mut,#9db2c8);padding:2px 8px 6px}.evGol div{flex:1;line-height:1.5}.evGol div:last-child{text-align:right}',
 '.evTabs{display:flex;gap:6px;margin:12px 0 10px;overflow-x:auto}.evTab{flex:1;white-space:nowrap;border:1px solid var(--line2,#2a3e56);background:var(--bg1,#0d1420);color:var(--mut,#9db2c8);border-radius:99px;padding:9px 14px;font:700 13px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none}',
 '.evTab.on{background:var(--hot,#fbbf24);color:var(--hotTx,#1a1305);border-color:var(--hot,#fbbf24)}',

 '.evMas{margin:14px 0 4px;padding:12px;border-radius:12px;text-align:center;font:700 13px system-ui,-apple-system,sans-serif;color:var(--mut,#9db2c8);border:1px dashed var(--line2,#2a3e56);cursor:pointer}',
 '.evTabBtn.evHas::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--bad,#f87171);margin-right:6px;vertical-align:middle;animation:evPulso 1.4s ease-in-out infinite}',
 '.evCard{background:var(--bg1,#0d1420);border:1px solid var(--line2,#2a3e56);border-radius:16px;padding:12px;margin:0 0 10px}',
 '.evCard h3{margin:0 0 8px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--mut,#9db2c8)}',
 '.evCourt,.evZone,.evDiam{display:block;width:100%;height:auto}',
 '.evCtBg{fill:var(--bg2,#131d2c)}.evLn{fill:none;stroke:var(--line2,#2a3e56);stroke-width:3}.evLnD{stroke-dasharray:8 7}',
 '.evShotM{stroke-width:2}.evShotF{fill:none;stroke-width:4}',
 '.evNewDot{animation:evPop .7s ease-out;transform-box:fill-box;transform-origin:center}',
 '@keyframes evPop{0%{transform:scale(3);opacity:0}60%{transform:scale(.85);opacity:1}100%{transform:scale(1)}}',
 '.evRing{fill:none;stroke:var(--txt,#f1f5fb);stroke-width:3;animation:evRing 1.4s ease-out infinite;transform-box:fill-box;transform-origin:center}',
 '@keyframes evRing{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.8);opacity:0}}',
 '.evChips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}.evChip{border:1px solid var(--line2,#2a3e56);background:var(--bg2,#131d2c);color:var(--txt,#f1f5fb);border-radius:99px;padding:6px 12px;font:700 12px system-ui;cursor:pointer;user-select:none;-webkit-user-select:none}',
 '.evChip.on{background:var(--hot,#fbbf24);color:var(--hotTx,#1a1305);border-color:var(--hot,#fbbf24)}',
 '.evLeg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut,#9db2c8);margin-top:8px}.evLeg span{display:inline-flex;align-items:center;gap:5px}',
 '.evDot{display:inline-block;width:11px;height:11px;border-radius:50%}',
 '.evFeed{display:block}.evItem{display:flex;gap:10px;padding:10px 4px;border-bottom:1px solid var(--line,#1c2838);font-size:14px;line-height:1.45}',
 '.evItem:last-child{border-bottom:0}.evItem .t{flex:0 0 auto;min-width:50px;font-weight:800;font-size:12px;color:var(--mut,#9db2c8);padding-top:1px}',
 '.evItem .x{flex:1;min-width:0}.evItem.g .x{font-weight:800}.evItem .sc{flex:0 0 auto;font-weight:800;font-size:12px;color:var(--hot,#fbbf24)}',
 '.evItem.evNew{animation:evEntra .9s ease-out}@keyframes evEntra{0%{background:rgba(251,191,36,.28);transform:translateY(-6px)}100%{background:transparent;transform:none}}',
 '.evBar2{display:flex;align-items:center;gap:8px;margin:9px 0;font-size:13px}.evBar2 b{min-width:42px;font-weight:800}.evBar2 b:last-child{text-align:right}',
 '.evBar2 .m{flex:1;text-align:center;color:var(--mut,#9db2c8);font-size:12px}',
 '.evBar2w{display:flex;height:6px;border-radius:6px;overflow:hidden;background:var(--bg2,#131d2c);margin:-3px 0 10px}.evBar2w i{display:block;height:100%}',
 '.evTime{position:relative;height:74px;margin:6px 6px 4px}.evTime .ln{position:absolute;left:0;right:0;top:36px;height:3px;border-radius:3px;background:var(--line2,#2a3e56)}',
 '.evTime .mk{position:absolute;transform:translateX(-50%);font-size:17px;line-height:1}.evTime .mk.h{top:4px}.evTime .mk.a{top:44px}',
 '.evTime .tk{position:absolute;top:30px;width:2px;height:15px;background:var(--mut,#9db2c8);opacity:.7}.evTime .lb{position:absolute;top:58px;font-size:10px;color:var(--mut,#9db2c8);transform:translateX(-50%)}',
 '.evLs{width:100%;border-collapse:collapse;font-size:13px;text-align:center}.evLs th,.evLs td{padding:6px 4px}.evLs th{color:var(--mut,#9db2c8);font-weight:700;font-size:11px}',
 '.evLs td:first-child,.evLs th:first-child{text-align:left;font-weight:800}.evLs td.r{font-weight:800}',
 '.evCnt{display:flex;gap:16px;justify-content:center;margin:6px 0 2px;font-size:13px;font-weight:800}.evCnt span{display:inline-flex;align-items:center;gap:6px}',
 '.evCnt i{display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid var(--line2,#2a3e56)}.evCnt i.on.b{background:#60a5fa;border-color:#60a5fa}.evCnt i.on.s{background:#f87171;border-color:#f87171}.evCnt i.on.o{background:var(--hot,#fbbf24);border-color:var(--hot,#fbbf24)}',
 '.evBase{fill:var(--bg2,#131d2c);stroke:var(--line2,#2a3e56);stroke-width:3}.evBase.on{fill:var(--hot,#fbbf24);stroke:var(--hot,#fbbf24)}',
 '.evGrass{fill:none;stroke:var(--line2,#2a3e56);stroke-width:2}',
 '.evPit{stroke:#0b0f16;stroke-width:2}.evPit.st{fill:#f87171}.evPit.ba{fill:#60a5fa}.evPit.ip{fill:#fbbf24}.evPitT{font:800 12px system-ui;fill:#0b0f16;text-anchor:middle;dominant-baseline:central}',
 '.evZn{fill:rgba(255,255,255,.04);stroke:var(--txt,#f1f5fb);stroke-width:2.5}.evZg{stroke:var(--line2,#2a3e56);stroke-width:1.5}',
 '.evMatch{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin:8px 2px 0;line-height:1.45}.evMatch div{flex:1}.evMatch div:last-child{text-align:right}.evMatch small{display:block;color:var(--mut,#9db2c8);font-size:11px}',
 '.evBanner{border-radius:12px;padding:10px 12px;margin:0 0 10px;background:var(--bg2,#131d2c);font-size:14px;line-height:1.45}.evBanner.g{border:1px solid var(--hot,#fbbf24)}',
 '.evNota{margin:14px 4px 0;font-size:11.5px;color:var(--mut,#9db2c8);line-height:1.5;text-align:center}',
 '.evRun{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;justify-content:center}.evRun span{font-size:11.5px;background:var(--bg2,#131d2c);border-radius:99px;padding:3px 9px;color:var(--mut,#9db2c8)}',
 '@media (prefers-reduced-motion:reduce){.evAct,.evBola,.evPitch.evGolPit .evPitchSvg,.evLiveDot,.evScore.evFlash,.evNewDot,.evRing,.evItem.evNew,.evTabBtn.evHas::before{animation:none}}'
].join('\n');

/* ---------- carga ---------- */
var NBA_ERR='';
function cargarLista(){
 var hoy=new Date(), ayer=new Date(hoy.getTime()-864e5), ps=[];
 if(APP==='nba'){
  var fechas=[ymd(hoy)]; if(hoy.getHours()<6) fechas.push(ymd(ayer));
  var viaEspn=function(){ return Promise.all(fechas.map(function(f){ return getJSON(ESPN+'basketball/nba/scoreboard?dates='+f+'&limit=100').then(function(j){ return parseEspnEventos(j,'NBA','').map(function(g){ g.src='espn'; return g; }); }).catch(function(){ return null; }); })).then(function(rs){ var ok=rs.filter(function(r){ return r; }); if(!ok.length) throw new Error('sin ESPN'); return [].concat.apply([],ok); }); };
  ps=[getJSON(NBACDN+'scoreboard/todaysScoreboard_00.json').then(parseNbaScoreboard).then(function(l){ if(!l.length) throw new Error('vacío'); NBA_ERR=''; return l; }).catch(function(e){ NBA_ERR=String((e&&e.message)||e).slice(0,70); return viaEspn(); }).catch(function(){ return null; })];
 } else if(APP==='fut'){
  ps=LIGAS.map(function(l){ return getJSON(ESPN+'soccer/'+l[0]+'/scoreboard').then(function(j){ return parseEspnEventos(j,l[1],l[0]); }).catch(function(){ return null; }); });
 } else {
  var f2=[hoy]; if(hoy.getHours()<6) f2.push(ayer);
  ps=f2.map(function(d){ return getJSON(MLBAPI+'v1/schedule?sportId=1&date='+pad2(d.getMonth()+1)+'/'+pad2(d.getDate())+'/'+d.getFullYear()+'&hydrate=team,linescore').then(parseMlbSchedule).catch(function(){ return null; }); });
 }
 return Promise.all(ps).then(function(rs){
  var ok=rs.filter(function(r){ return r; }), todo=[].concat.apply([],ok), vistos={}, uniq=[];
  if(!ok.length) throw new Error('sin red');
  todo.forEach(function(g){ var k=g.slug+'|'+g.id; if(!vistos[k]){ vistos[k]=1; g.key=k; uniq.push(g); } });
  S.games=ordenarJuegos(uniq); S.cargado=true; S.error=''; S.upd=Date.now(); actualizarFab();
 }).catch(function(){ S.error='No pude cargar los juegos. Revisa tu internet; lo intento otra vez solo.'; });
}
function enVivo(){ return S.games.filter(function(g){ return g.state==='in'; }); }
function actualizarFab(){
 var n=enVivo().length, els=doc.querySelectorAll('.evTabBtn');
 for(var i=0;i<els.length;i++) els[i].classList.toggle('evHas',n>0);
}
function urlDetalle(g){
 var q=S.sinLang?'':'&lang=es&region=us';
 if(APP==='nba') return ESPN+'basketball/nba/summary?event='+g.id+q;
 if(APP==='fut') return ESPN+'soccer/'+g.slug+'/summary?event='+g.id+q;
 return MLBAPI+'v1.1/game/'+g.id+'/feed/live';
}
function detalleNba(g){
 return Promise.all([getJSON(NBACDN+'playbyplay/playbyplay_'+g.id+'.json'),getJSON(NBACDN+'boxscore/boxscore_'+g.id+'.json').catch(function(){ return null; })]).then(function(r){ return {src:'nba',pbp:r[0],box:r[1]}; });
}
function cargarDetalle(){
 var g=S.cur; if(!g) return Promise.resolve(); var id=++S.req;
 var pedir=(APP==='nba'&&g.src==='nba')?detalleNba(g):getJSON(urlDetalle(g)).catch(function(e){ if(APP==='mlb'||S.sinLang) throw e; S.sinLang=true; return getJSON(urlDetalle(g)); });
 return pedir.then(function(j){
  if(id!==S.req||S.view!=='game') return;
  S.det=j; S.error=''; S.upd=Date.now(); pintar();
 }).catch(function(){ if(id!==S.req||S.view!=='game') return; if(!S.det) S.error='No pude cargar este juego. Lo intento otra vez solo.'; pintar(); });
}
function tick(){
 if(doc.hidden||!S.open) return;
 if(S.view==='game') cargarDetalle(); else cargarLista().then(pintar);
}
function programar(){
 if(S.timer){ clearInterval(S.timer); S.timer=null; }
 if(!S.open) return;
 var ms=S.view==='game'?10000:25000;
 S.timer=setInterval(tick,ms);
}

/* ---------- piezas de dibujo ---------- */
function imgTag(u,cls){ return u?'<img'+(cls?' class="'+cls+'"':'')+' src="'+esc(u)+'" alt="" loading="lazy">':''; }
function pill(g,H){
 var st=(H&&H.state)||g.state, det=(H&&H.det)||g.det;
 if(st==='in') return '<span class="evStP v"><i class="evLiveDot"></i>'+esc(det||'En vivo')+'</span>';
 if(st==='post') return '<span class="evStP">'+esc(det||'Final')+'</span>';
 return '<span class="evStP">'+esc(horaTxt(g.start))+' · '+esc(diaTxt(g.start))+'</span>';
}
function cabecera(g,H,izq,der){
 var L=izq, R=der, st=(H&&H.state)||g.state;
 /* si el marcador cambió desde la última vez que se dibujó este juego, el número hace un destello (como FotMob al caer un gol) */
 var marca=String(L.score)+'-'+String(R.score), flash='';
 if(st==='in'&&g.key){ if(S.prevSc[g.key]!==undefined&&S.prevSc[g.key]!==marca) flash=' evFlash'; S.prevSc[g.key]=marca; }
 var sc=(st==='pre')?'<div class="evScore"><i>vs</i></div>':'<div class="evScore'+flash+'">'+esc(L.score)+'<i>–</i>'+esc(R.score)+'</div>';
 return '<div class="evHead"><div class="evTm">'+imgTag(L.logo)+'<span>'+esc(L.n)+'</span></div><div class="evSc">'+sc+pill(g,H)+'</div><div class="evTm">'+imgTag(R.logo)+'<span>'+esc(R.n)+'</span></div></div>';
}
function barras(rows,A,H,izqEsHome){
 if(!rows.length) return '<div class="evVacio">Todavía no hay estadísticas de este juego.</div>';
 var cI=izqEsHome?'#fbbf24':'#38bdf8', cD=izqEsHome?'#38bdf8':'#fbbf24', s='';
 rows.forEach(function(r){
  var l=izqEsHome?r.h:r.a, d=izqEsHome?r.a:r.h, ls=izqEsHome?r.hs:r.as, ds=izqEsHome?r.as:r.hs, tot=l+d, pl=tot?Math.round(l/tot*100):50;
  s+='<div class="evBar2"><b>'+esc(ls)+'</b><span class="m">'+esc(r.label)+'</span><b>'+esc(ds)+'</b></div><div class="evBar2w"><i style="width:'+pl+'%;background:'+cI+'"></i><i style="width:'+(100-pl)+'%;background:'+cD+'"></i></div>';
 });
 return s;
}
function marcarNuevos(clave,ids){
 var seen=S.seen[clave], nuevos={};
 if(!seen){ S.seen[clave]={}; ids.forEach(function(i){ S.seen[clave][i]=1; }); return nuevos; }
 ids.forEach(function(i){ if(!seen[i]){ nuevos[i]=1; seen[i]=1; } });
 return nuevos;
}

/* ---------- NBA ---------- */
function cuarto(p){ return p>4?('TE'+(p>5?(p-4):'')):('C'+p); }
function canchaSVG(tiros,flt,home,away,nuevos){
 var cH='#fbbf24', cA='#38bdf8', ult=null, s='<svg class="evCourt" viewBox="-14 -14 528 498" role="img" aria-label="Mapa de tiros en vivo"><rect class="evCtBg" x="-14" y="-14" width="528" height="498" rx="14"/>';
 s+='<rect class="evLn" x="170" y="2" width="160" height="188"/><path class="evLn" d="M190 190 A60 60 0 0 0 310 190"/><path class="evLn evLnD" d="M190 190 A60 60 0 0 1 310 190"/>';
 s+='<path class="evLn" d="M30 2 L30 142 A237.5 237.5 0 0 0 470 142 L470 2"/><path class="evLn" d="M210 52.5 A40 40 0 0 0 290 52.5"/><line class="evLn" x1="220" y1="40" x2="280" y2="40"/><circle class="evLn" cx="250" cy="52.5" r="7.5"/>';
 s+='<path class="evLn" d="M190 468 A60 60 0 0 1 310 468"/>';
 var lista=tiros.filter(function(p){ return flt==='all'||(flt==='home'?p.tid===home.id:p.tid===away.id); });
 lista.forEach(function(p,i){
  var q=plegar(p.x,p.y), cx=Math.round(q.x*10), cy=Math.round(q.y*10), col=p.tid===home.id?cH:cA, nu=nuevos&&nuevos[p.id]?' evNewDot':'';
  if(p.sc) s+='<circle class="evShotM'+nu+'" cx="'+cx+'" cy="'+cy+'" r="9" fill="'+col+'" stroke="#0b0f16" opacity=".95"/>';
  else s+='<circle class="evShotF'+nu+'" cx="'+cx+'" cy="'+cy+'" r="7.5" stroke="'+col+'" opacity=".85"/>';
  if(i===lista.length-1) ult={cx:cx,cy:cy};
 });
 if(ult) s+='<circle class="evRing" cx="'+ult.cx+'" cy="'+ult.cy+'" r="14"/>';
 return s+'</svg>';
}
function renderNBA(g){
 var j=S.det, nb=!!(j&&j.src==='nba'), H=nb?cabeceraNba(j,g):cabeceraEspn(j,g), A=H.away, Hm=H.home, pl=nb?nbaComJugadas(j.pbp):nbaJugadas(j), tiros=nbaTiros(pl), nuevos=marcarNuevos('p'+g.key,pl.map(function(p){ return p.id; }));
 var s=cabecera(g,H,A,Hm);
 s+='<div class="evTabs"><div role="button" tabindex="0" class="evTab'+(S.tab==='cancha'?' on':'')+'" data-a="tab" data-v="cancha">Cancha</div><div role="button" tabindex="0" class="evTab'+(S.tab==='jugadas'?' on':'')+'" data-a="tab" data-v="jugadas">Jugadas</div><div role="button" tabindex="0" class="evTab'+(S.tab==='stats'?' on':'')+'" data-a="tab" data-v="stats">Estadísticas</div></div>';
 if(S.tab==='cancha'){
  if(!tiros.length) s+='<div class="evCard"><div class="evVacio">'+(H.state==='pre'?'El juego todavía no empieza.':'Esta fuente no trae la ubicación de los tiros de este juego. Mira las jugadas.')+'</div></div>';
  else {
   var rA=resumenTiros(tiros,A.id), rH=resumenTiros(tiros,Hm.id);
   s+='<div class="evCard"><h3>Tiros en vivo</h3><div class="evChips"><div role="button" tabindex="0" class="evChip'+(S.filt==='all'?' on':'')+'" data-a="filt" data-v="all">Todos</div><div role="button" tabindex="0" class="evChip'+(S.filt==='away'?' on':'')+'" data-a="filt" data-v="away">'+esc(A.ab)+'</div><div role="button" tabindex="0" class="evChip'+(S.filt==='home'?' on':'')+'" data-a="filt" data-v="home">'+esc(Hm.ab)+'</div></div>';
   s+=canchaSVG(tiros,S.filt,Hm,A,nuevos);
   s+='<div class="evLeg"><span><i class="evDot" style="background:#38bdf8"></i>'+esc(A.ab)+' '+rA.fg+'/'+rA.att+(rA.att?' ('+rA.pct+'%)':'')+(rA.tres?' · '+rA.tres+' triples':'')+'</span><span><i class="evDot" style="background:#fbbf24"></i>'+esc(Hm.ab)+' '+rH.fg+'/'+rH.att+(rH.att?' ('+rH.pct+'%)':'')+(rH.tres?' · '+rH.tres+' triples':'')+'</span></div>';
   s+='<div class="evLeg"><span><i class="evDot" style="background:#9db2c8"></i>relleno = anotó</span><span><i class="evDot" style="border:3px solid #9db2c8"></i>aro = falló</span></div></div>';
  }
  s+='<div class="evCard"><h3>Últimas jugadas</h3>'+feedNBA(pl.slice(-8).reverse(),nuevos)+'</div>';
 } else if(S.tab==='jugadas'){
  s+='<div class="evCard"><h3>Jugada por jugada</h3>'+feedNBA(pl.slice(-80).reverse(),nuevos)+'</div>';
 } else {
  var rows=nb?statsNbaCom(j.box):statsPor(j,Hm.id,A.id,MAPA_NBA);
  s+='<div class="evCard"><div class="evMatch"><div><b>'+esc(A.ab)+'</b></div><div><b>'+esc(Hm.ab)+'</b></div></div>'+barras(rows,A,Hm,false)+'</div>';
 }
 return s+nota(nb?'NBA':'ESPN',APP);
}
function feedNBA(l,nuevos){
 if(!l.length) return '<div class="evVacio">Todavía no hay jugadas.</div>';
 return '<div class="evFeed">'+l.map(function(p){
  return '<div class="evItem'+(p.sc?' g':'')+(nuevos[p.id]?' evNew':'')+'"><span class="t">'+esc(cuarto(p.per))+' '+esc(p.clk)+'</span><span class="x">'+esc(tr(p.txt))+'</span>'+(p.sc&&p.as!=null?'<span class="sc">'+esc(p.as)+'-'+esc(p.hs)+'</span>':'')+'</div>';
 }).join('')+'</div>';
}
function cabeceraEspn(j,g){
 var c=(((j||{}).header||{}).competitions||[])[0]||{}, cs=c.competitors||[], h=null, a=null;
 cs.forEach(function(x){ if(x.homeAway==='home') h=x; else if(x.homeAway==='away') a=x; });
 var st=c.status||{}, ty=st.type||{}, state=ty.state||g.state;
 var home=h?tm(h):g.home, away=a?tm(a):g.away;
 if(h&&!home.logo) home.logo=g.home.logo; if(a&&!away.logo) away.logo=g.away.logo;
 var det=detalleCorto(ty.shortDetail||ty.detail||'')||g.det;
 return {home:home,away:away,state:state,det:det,clock:st.displayClock||''};
}

/* ---------- fútbol ---------- */
function renderFut(g){
 var j=S.det, H=cabeceraEspn(j,g), Hm=H.home, A=H.away, ev=futEventos(j), com=futComentarios(j);
 var nuevos=marcarNuevos('c'+g.key,com.map(function(c){ return c.id; }));
 var s=cabecera(g,H,Hm,A);
 var gl=ev.filter(function(e){ return e.sc; }), lh=gl.filter(function(e){ return e.tid===Hm.id; }), la=gl.filter(function(e){ return e.tid===A.id; });
 function lista(l){ return l.map(function(e){ return esc((e.who||'Gol')+' '+e.clk); }).join('<br>'); }
 if(gl.length) s+='<div class="evGol"><div>'+lista(lh)+'</div><div>'+lista(la)+'</div></div>';
 s+='<div class="evTabs"><div role="button" tabindex="0" class="evTab'+(S.tab==='cancha'?' on':'')+'" data-a="tab" data-v="cancha">Cancha</div><div role="button" tabindex="0" class="evTab'+(S.tab==='com'?' on':'')+'" data-a="tab" data-v="com">Comentarios</div><div role="button" tabindex="0" class="evTab'+(S.tab==='eventos'?' on':'')+'" data-a="tab" data-v="eventos">Eventos</div><div role="button" tabindex="0" class="evTab'+(S.tab==='stats'?' on':'')+'" data-a="tab" data-v="stats">Estadísticas</div></div>';
 if(S.tab==='cancha'){
  s+='<div class="evCard"><div class="evPitchHost" data-k="'+esc(g.key)+'"></div><div class="evLeg"><span>● '+esc(Hm.ab)+' ataca →</span><span>● '+esc(A.ab)+' ataca ←</span></div></div>';
 } else if(S.tab==='com'){
  s+='<div class="evCard"><h3>Minuto a minuto</h3>';
  s+=com.length?'<div class="evFeed">'+com.slice(0,80).map(function(c){
   return '<div class="evItem'+(/goal/i.test(c.ty)||/^¡?goal/i.test(c.txt)?' g':'')+(nuevos[c.id]?' evNew':'')+'"><span class="t">'+esc(c.clk)+'</span><span class="x">'+iconoFut(c.ty,false)+' '+esc(tr(c.txt))+'</span></div>';
  }).join('')+'</div>':'<div class="evVacio">'+(H.state==='pre'?'El partido todavía no empieza.':'Esta fuente no tiene comentarios de este partido todavía.')+'</div>';
  s+='</div>';
 } else if(S.tab==='eventos'){
  s+='<div class="evCard"><h3>Línea de tiempo</h3>'+lineaTiempo(ev,Hm,H.state)+'<div class="evLeg"><span>▲ arriba: '+esc(Hm.ab)+'</span><span>▼ abajo: '+esc(A.ab)+'</span></div></div><div class="evCard"><h3>Goles, tarjetas y cambios</h3>';
  s+=ev.length?'<div class="evFeed">'+ev.slice().sort(function(a,b){ return b.min-a.min; }).map(function(e){
   var eq=e.tid===Hm.id?Hm.ab:(e.tid===A.id?A.ab:'');
   return '<div class="evItem'+(e.sc?' g':'')+'"><span class="t">'+esc(e.clk)+'</span><span class="x">'+iconoFut(e.ty,e.sc)+' '+esc(e.who||tr(e.txt))+(eq?' · '+esc(eq):'')+'</span></div>';
  }).join('')+'</div>':'<div class="evVacio">Todavía no hay eventos.</div>';
  s+='</div>';
 } else {
  s+='<div class="evCard"><div class="evMatch"><div><b>'+esc(Hm.ab)+'</b></div><div><b>'+esc(A.ab)+'</b></div></div>'+barras(statsPor(j,Hm.id,A.id,MAPA_FUT),A,Hm,true)+'</div>';
 }
 return s+nota('ESPN',APP);
}
function lineaTiempo(ev,home,state){
 var max=Math.max(90,ev.reduce(function(m,e){ return Math.max(m,e.min); },0)), s='<div class="evTime"><div class="ln"></div>';
 [0,15,30,45,60,75,90].forEach(function(m){ if(m<=max) s+='<div class="tk" style="left:'+(m/max*100)+'%"></div><div class="lb" style="left:'+(m/max*100)+'%">'+m+"'</div>"; });
 ev.forEach(function(e){ s+='<div class="mk '+(e.tid===home.id?'h':'a')+'" style="left:'+Math.min(98,Math.max(2,e.min/max*100))+'%" title="'+esc(e.clk)+'">'+iconoFut(e.ty,e.sc)+'</div>'; });
 return s+'</div>';
}

/* ---------- MLB ---------- */
function renderMLB(g){
 var j=S.det, gd=(j&&j.gameData)||{}, ld=(j&&j.liveData)||{}, ls=ld.linescore||{}, T=(gd.teams)||{};
 var st=((gd.status||{}).abstractGameState)==='Live'?'in':(((gd.status||{}).abstractGameState)==='Final'?'post':'pre');
 if(/Warmup|Pre-Game|Scheduled/i.test((gd.status||{}).detailedState||'')) st=(st==='post')?'post':'pre';
 var away=Object.assign({},g.away), home=Object.assign({},g.home);
 if(ls.teams&&ls.teams.away&&ls.teams.away.runs!=null) away.score=String(ls.teams.away.runs);
 if(ls.teams&&ls.teams.home&&ls.teams.home.runs!=null) home.score=String(ls.teams.home.runs);
 var det=st==='in'?((ls.isTopInning?'▲ Alta ':'▼ Baja ')+(ls.currentInning||'')):(st==='post'?'Final':g.det);
 var H={state:st,det:det}, play=(ld.plays&&ld.plays.currentPlay)||null, s=cabecera(g,H,away,home);
 if(st==='pre'){
  var pp=gd.probablePitchers||{};
  s+='<div class="evCard"><h3>Todavía no empieza</h3><div class="evMatch"><div><small>Abridor probable</small>'+esc((pp.away&&pp.away.fullName)||'por confirmar')+'</div><div><small>Abridor probable</small>'+esc((pp.home&&pp.home.fullName)||'por confirmar')+'</div></div></div>';
  return s+nota('MLB',APP);
 }
 var jug=mlbJugadas(j), nuevos=marcarNuevos('m'+g.key,jug.map(function(p){ return p.id; }));
 if(jug.length){ var u=jug[0]; s+='<div class="evBanner'+(u.sc?' g':'')+'"><b>Última jugada · '+(u.top?'▲':'▼')+u.inn+'</b><br>'+esc(tr(u.txt))+'</div>'; }
 if(st==='in'){
  var off=ls.offense||{}, df=ls.defense||{}, mu=(play&&play.matchup)||{}, cnt=(play&&play.count)||{balls:ls.balls,strikes:ls.strikes,outs:ls.outs};
  s+='<div class="evCard"><h3>Situación</h3>'+rombo(off)+conteo(num(cnt.balls,0),num(cnt.strikes,0),num(cnt.outs,ls.outs||0));
  var lado={R:'derecho',L:'zurdo',S:'ambidiestro'};
  s+='<div class="evMatch"><div><small>Al bate'+(mu.batSide&&lado[mu.batSide.code]?' · '+lado[mu.batSide.code]:'')+'</small><b>'+esc((mu.batter&&mu.batter.fullName)||(off.batter&&off.batter.fullName)||'—')+'</b></div>';
  s+='<div><small>Lanza'+(mu.pitchHand&&lado[mu.pitchHand.code]?' · '+lado[mu.pitchHand.code]:'')+'</small><b>'+esc((mu.pitcher&&mu.pitcher.fullName)||(df.pitcher&&df.pitcher.fullName)||'—')+'</b></div></div></div>';
  var lz=mlbLanzamientos(play);
  var nu=marcarNuevos('z'+g.key,lz.map(function(p){ return p.id; }));
  s+='<div class="evCard"><h3>Zona de strike · este turno al bate</h3>'+zona(lz,nu);
  s+=lz.length?'<div class="evFeed">'+lz.slice().reverse().map(function(p){ return '<div class="evItem'+(nu[p.id]?' evNew':'')+'"><span class="t">#'+p.n+'</span><span class="x">'+esc(p.tipo||'Lanzamiento')+(p.v!=null?' · '+p.v+' mph':'')+' — <b>'+esc(p.res)+'</b></span></div>'; }).join('')+'</div>':'<div class="evVacio">Todavía no hay lanzamientos en este turno.</div>';
  s+='<div class="evLeg"><span><i class="evDot" style="background:#f87171"></i>strike</span><span><i class="evDot" style="background:#60a5fa"></i>bola</span><span><i class="evDot" style="background:#fbbf24"></i>en juego</span></div></div>';
 }
 s+='<div class="evCard"><h3>Marcador por entrada</h3>'+lineaScore(ls,away,home)+'</div>';
 s+='<div class="evCard"><h3>Jugada por jugada</h3>'+(jug.length?'<div class="evFeed">'+jug.map(function(p){ return '<div class="evItem'+(p.sc?' g':'')+(nuevos[p.id]?' evNew':'')+'"><span class="t">'+(p.top?'▲':'▼')+p.inn+'</span><span class="x">'+esc(tr(p.txt))+'</span>'+(p.sc&&p.as!=null?'<span class="sc">'+esc(p.as)+'-'+esc(p.hs)+'</span>':'')+'</div>'; }).join('')+'</div>':'<div class="evVacio">Todavía no hay jugadas.</div>')+'</div>';
 return s+nota('MLB',APP);
}
function rombo(off){
 var b1=off.first, b2=off.second, b3=off.third;
 var s='<svg class="evDiam" viewBox="0 0 220 170" role="img" aria-label="Corredores en base" style="max-width:300px;margin:0 auto"><path class="evGrass" d="M110 150 L180 90 L110 30 L40 90 Z"/><circle class="evGrass" cx="110" cy="92" r="9"/>';
 function base(x,y,on){ return '<rect class="evBase'+(on?' on':'')+'" x="'+(x-12)+'" y="'+(y-12)+'" width="24" height="24" transform="rotate(45 '+x+' '+y+')"/>'; }
 s+=base(180,90,!!b1)+base(110,30,!!b2)+base(40,90,!!b3);
 s+='<path class="evBase" d="M110 142 L118 150 L118 158 L102 158 L102 150 Z"/></svg>';
 var r=[]; if(b3) r.push('3B: '+(b3.fullName||'')); if(b2) r.push('2B: '+(b2.fullName||'')); if(b1) r.push('1B: '+(b1.fullName||''));
 return s+(r.length?'<div class="evRun">'+r.map(function(x){ return '<span>'+esc(x)+'</span>'; }).join('')+'</div>':'<div class="evRun"><span>Bases vacías</span></div>');
}
function conteo(b,s,o){
 function dots(n,max,c){ var x=''; for(var i=0;i<max;i++) x+='<i class="'+(i<n?'on ':'')+c+'"></i>'; return x; }
 return '<div class="evCnt"><span>B '+dots(b,4,'b')+'</span><span>S '+dots(s,3,'s')+'</span><span>O '+dots(o,3,'o')+'</span></div>';
}
function zona(lz,nu){
 var W=240,Hh=260,k=75,cx=120, top=3.5, bot=1.5; if(lz.length){ top=lz[lz.length-1].top; bot=lz[lz.length-1].bot; }
 function PX(x){ return cx+x*k; } function PY(z){ return Hh-(z-0.8)*72; }
 var x0=PX(-0.708), x1=PX(0.708), y0=PY(top), y1=PY(bot), w=x1-x0, h=y1-y0;
 var s='<svg class="evZone" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Lanzamientos de este turno" style="max-width:300px;margin:0 auto"><rect class="evZn" x="'+x0.toFixed(1)+'" y="'+y0.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'"/>';
 s+='<line class="evZg" x1="'+(x0+w/3).toFixed(1)+'" y1="'+y0.toFixed(1)+'" x2="'+(x0+w/3).toFixed(1)+'" y2="'+y1.toFixed(1)+'"/><line class="evZg" x1="'+(x0+2*w/3).toFixed(1)+'" y1="'+y0.toFixed(1)+'" x2="'+(x0+2*w/3).toFixed(1)+'" y2="'+y1.toFixed(1)+'"/>';
 s+='<line class="evZg" x1="'+x0.toFixed(1)+'" y1="'+(y0+h/3).toFixed(1)+'" x2="'+x1.toFixed(1)+'" y2="'+(y0+h/3).toFixed(1)+'"/><line class="evZg" x1="'+x0.toFixed(1)+'" y1="'+(y0+2*h/3).toFixed(1)+'" x2="'+x1.toFixed(1)+'" y2="'+(y0+2*h/3).toFixed(1)+'"/>';
 lz.forEach(function(p){
  if(p.px==null||p.pz==null) return;
  var x=Math.max(14,Math.min(W-14,PX(p.px))), y=Math.max(14,Math.min(Hh-14,PY(p.pz)));
  s+='<g class="'+(nu&&nu[p.id]?'evNewDot':'')+'"><circle class="evPit '+p.cl+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="11"/><text class="evPitT" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'">'+p.n+'</text></g>';
 });
 return s+'</svg>';
}
function lineaScore(ls,away,home){
 var inn=ls.innings||[], n=Math.max(9,inn.length), h='<tr><th></th>', a='<tr><td>'+esc(away.ab)+'</td>', c='<tr><td>'+esc(home.ab)+'</td>';
 for(var i=0;i<n;i++){ var x=inn[i]||{}; h+='<th>'+(i+1)+'</th>'; a+='<td>'+(x.away&&x.away.runs!=null?x.away.runs:'')+'</td>'; c+='<td>'+(x.home&&x.home.runs!=null?x.home.runs:'')+'</td>'; }
 var t=ls.teams||{}, ta=t.away||{}, th=t.home||{};
 h+='<th>R</th><th>H</th><th>E</th></tr>';
 a+='<td class="r">'+num(ta.runs,0)+'</td><td>'+num(ta.hits,0)+'</td><td>'+num(ta.errors,0)+'</td></tr>';
 c+='<td class="r">'+num(th.runs,0)+'</td><td>'+num(th.hits,0)+'</td><td>'+num(th.errors,0)+'</td></tr>';
 return '<div style="overflow-x:auto"><table class="evLs">'+h+a+c+'</table></div>';
}
function nota(fuente,app){
 var t=S.upd?new Date(S.upd).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}):'';
 return '<div class="evNota">Datos: '+(fuente==='MLB'?'MLB Stats API':(fuente==='NBA'?'NBA.com':'ESPN'))+' · se actualiza solo'+(t?' · '+esc(t):'')+(app==='nba'&&fuente==='ESPN'&&NBA_ERR?'<br>NBA.com no respondió ('+esc(NBA_ERR)+'), por eso se usa ESPN.':'')+(app==='fut'?'<br>El fútbol no trae las posiciones de los jugadores moviéndose (ese seguimiento es de pago).':'')+'</div>';
}

/* ---------- lista ---------- */
function filaJuego(g,mostrarLiga){
 var izq=APP==='fut'?g.home:g.away, der=APP==='fut'?g.away:g.home, v=g.state==='in', pre=g.state==='pre';
 var est=v?'<i class="evLiveDot"></i>'+esc(g.det||'En vivo'):(pre?esc(horaTxt(g.start))+'<span class="lg">'+esc(diaTxt(g.start))+'</span>':esc(g.det||'Final'));
 function eq(t){ return '<div class="eq">'+imgTag(t.logo)+'<span>'+esc(t.n)+'</span>'+(pre?'':'<em>'+esc(t.score)+'</em>')+'</div>'; }
 return '<div role="button" tabindex="0" class="evRow '+g.state+'" data-a="open" data-k="'+esc(g.key)+'"><div class="eqs">'+eq(izq)+eq(der)+'</div><div class="st'+(v?' v':'')+'">'+est+(mostrarLiga&&g.liga?'<span class="lg">'+esc(g.liga)+'</span>':'')+'</div></div>';
}
function renderLista(){
 if(!S.cargado) return '<div class="evVacio">'+(S.error?esc(S.error):'Buscando juegos…')+'</div>';
 var vivos=S.games.filter(function(g){ return g.state==='in'; }), pre=S.games.filter(function(g){ return g.state==='pre'; }), fin=S.games.filter(function(g){ return g.state==='post'; });
 var s='', liga=APP==='fut';
 if(S.error) s+='<div class="evBanner">'+esc(S.error)+'</div>';
 s+='<div class="evSec">En vivo ahora</div>';
 s+=vivos.length?vivos.map(function(g){ return filaJuego(g,liga); }).join(''):'<div class="evVacio" style="padding:14px 8px">No hay juegos en vivo en este momento.</div>';
 if(pre.length) s+='<div class="evSec">Próximos</div>'+pre.slice(0,25).map(function(g){ return filaJuego(g,liga); }).join('');
 if(fin.length) s+='<div class="evSec">Terminados</div>'+fin.slice(0,25).map(function(g){ return filaJuego(g,liga); }).join('');
 return s+'<div class="evNota">'+(APP==='mlb'?'Fuente: MLB Stats API':(APP==='nba'&&S.games.some(function(g){ return g.src==='nba'; })?'Fuente: NBA.com':'Fuente: ESPN'))+' · se actualiza solo cada 25 segundos</div>';
}

/* ---------- pintar ---------- */
function pintar(){
 if(!sheet||!S.open) return;
 var y=sheet.scrollTop, html='', nombre=({mlb:'MLB',fut:'Fútbol',nba:'NBA'})[APP];
 if(S.view==='game'&&S.cur){
  titleEl.firstChild.nodeValue=(APP==='fut'?S.cur.home.ab+' vs '+S.cur.away.ab:S.cur.away.ab+' @ '+S.cur.home.ab); titleEl.lastChild.textContent=S.cur.liga||nombre;
  backEl.style.visibility='visible';
  if(!S.det) html='<div class="evVacio">'+(S.error?esc(S.error):'Cargando el juego…')+'</div>';
  else { try{ html=(APP==='nba'?renderNBA(S.cur):(APP==='fut'?renderFut(S.cur):renderMLB(S.cur))); }catch(e){ html='<div class="evVacio">No pude dibujar este juego con los datos que llegaron.</div>'; if(root.console) root.console.error('envivo',e); } }
 } else {
  titleEl.firstChild.nodeValue='En vivo'; titleEl.lastChild.textContent=nombre; backEl.style.visibility='hidden'; html=renderLista();
 }
 bodyEl.innerHTML='<div class="evWrap">'+html+'</div>';
 try{ montarCanchas(bodyEl); }catch(e){ if(root.console) root.console.error('cancha',e); }
 var im=bodyEl.querySelectorAll('img'); for(var i=0;i<im.length;i++) im[i].addEventListener('error',function(ev){ ev.target.style.visibility='hidden'; });
 sheet.scrollTop=y;
}
function abrirJuego(key){
 var g=null; for(var i=0;i<S.games.length;i++) if(S.games[i].key===key){ g=S.games[i]; break; }
 if(!g) return;
 S.view='game'; S.cur=g; S.det=null; S.error=''; S.filt='all'; S.tab=(APP==='nba'||APP==='fut'?'cancha':''); S.listY=sheet.scrollTop;
 sheet.scrollTop=0; pintar();
 if(g.state==='pre'&&APP!=='mlb'){ S.det={}; pintar(); } else cargarDetalle();
 programar();
}
function volver(){
 S.view='list'; S.cur=null; S.det=null; S.req++; pintar(); sheet.scrollTop=S.listY||0; programar(); cargarLista().then(pintar);
}
function abrir(){
 S.open=true; sheet.classList.add('on'); S.view='list'; pintar(); programar();
 cargarLista().then(pintar);
}
function cerrar(){ S.open=false; S.req++; sheet.classList.remove('on'); programar(); }
function onClick(ev){
 var t=ev.target; while(t&&t!==sheet&&!(t.getAttribute&&t.getAttribute('data-a'))) t=t.parentNode;
 if(!t||t===sheet) return; var a=t.getAttribute('data-a');
 if(a==='close') cerrar(); else if(a==='back') volver(); else if(a==='open') abrirJuego(t.getAttribute('data-k'));
 else if(a==='tab'){ S.tab=t.getAttribute('data-v'); pintar(); } else if(a==='filt'){ S.filt=t.getAttribute('data-v'); pintar(); }
}

/* ---------- cancha en vivo (fútbol): los pases de ESPN con coordenadas, como la cancha de FotMob ---------- */
var CORE='https://sports.core.api.espn.com/v2/sports/soccer/leagues/';
var PIT={};                                   /* un tablero por juego: se queda en memoria aunque cambies de pestaña */
var COL_L='#fbbf24', COL_V='#38bdf8';
function refEq(r){ var m=/teams\/(\d+)/.exec(String(r||'')); return m?m[1]:''; }
function nombreJug(t){ var m=/(?:^|\.\s+)([^.()]+?)\s+\(([^)]+)\)/.exec(String(t||'')); return m?m[1].trim():''; }
function jugadaCancha(p,g){
 var part=p.participants&&p.participants[0], tid=refEq(p.team&&p.team.$ref);
 var o={id:String(p.id),tipo:(p.type&&p.type.text)||'',txt:p.text||p.shortText||'',clk:(p.clock&&p.clock.displayValue)||'',wall:p.wallclock?Date.parse(p.wallclock):0,
  local:tid===''||tid===String(g.home.id),dorsal:part&&part.jersey?String(part.jersey):'',nom:nombreJug(p.text||p.shortText),gol:!!p.scoringPlay||/^goal/i.test((p.type&&p.type.text)||'')};
 if(typeof p.fieldPositionX==='number'&&typeof p.fieldPositionY==='number'&&isFinite(p.fieldPositionX)&&isFinite(p.fieldPositionY)){
  o.xy=[p.fieldPositionX,p.fieldPositionY];
  if(typeof p.fieldPosition2X==='number'&&typeof p.fieldPosition2Y==='number'&&isFinite(p.fieldPosition2X)&&isFinite(p.fieldPosition2Y)) o.xy2=[p.fieldPosition2X,p.fieldPosition2Y];
 }
 return o;
}
/* cada equipo juega de izquierda a derecha en sus datos; el visitante se voltea para ver los dos en la misma cancha (local → derecha, visita → izquierda) */
function aCancha(xy,local){ var x=local?xy[0]:100-xy[0], y=local?xy[1]:100-xy[1]; return [Math.max(0,Math.min(100,x))*1.05,Math.max(0,Math.min(100,y))*0.68]; }
var PITCH_SVG='<svg viewBox="0 0 105 68" class="evPitchSvg" role="img" aria-label="Cancha en vivo"><rect width="105" height="68" rx="2" fill="#2f7d32"/>'+
 '<g fill="#348a38"><rect x="0" width="8.75" height="68"/><rect x="17.5" width="8.75" height="68"/><rect x="35" width="8.75" height="68"/><rect x="52.5" width="8.75" height="68"/><rect x="70" width="8.75" height="68"/><rect x="87.5" width="8.75" height="68"/></g>'+
 '<g fill="none" stroke="rgba(255,255,255,.72)" stroke-width=".35"><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9.15"/>'+
 '<rect x="1" y="13.85" width="16.5" height="40.3"/><rect x="87.5" y="13.85" width="16.5" height="40.3"/><rect x="1" y="24.85" width="5.5" height="18.3"/><rect x="98.5" y="24.85" width="5.5" height="18.3"/></g>'+
 '<g class="evPts"></g><line class="evPase" x1="0" y1="0" x2="0" y2="0"/>'+
 '<g class="evAct" style="transform:translate(52.5px,34px)"><circle r="2.5"/><text class="evAn" y="1" text-anchor="middle"></text><text class="evAx" y="6.4" text-anchor="middle"></text></g>'+
 '<g class="evBola" style="transform:translate(52.5px,34px)"><circle r="1.25"/></g></svg>';
function nuevaCancha(g){
 var P={g:g,key:g.key,seen:{},cola:[],ptsN:0,timer:null,poll:null,tick:null,pgAnt:0,inicio:true,ultWall:0,total:0,err:'',cargando:false};
 var el=mk('div','evPitch');
 el.innerHTML='<div class="evPitchTop"><span class="evPitchClk"></span><span class="evLag"></span></div>'+PITCH_SVG+'<div class="evPitchBot"><span class="evPitchEq"></span><span class="evPitchTxt"></span></div>';
 P.el=el; P.svg=$('.evPitchSvg',el); P.gPts=$('.evPts',el); P.line=$('.evPase',el); P.act=$('.evAct',el); P.bola=$('.evBola',el);
 return P;
}
function dibujarPunto(P,xy,local){
 var c=doc.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',xy[0].toFixed(1)); c.setAttribute('cy',xy[1].toFixed(1)); c.setAttribute('r','.9'); c.setAttribute('class','evPt'+(local?' l':' v'));
 P.gPts.appendChild(c); P.ptsN++;
 while(P.gPts.childNodes.length>36) P.gPts.removeChild(P.gPts.firstChild);
 var n=P.gPts.childNodes.length; for(var i=0;i<n;i++) P.gPts.childNodes[i].style.opacity=(0.18+0.82*(i+1)/n).toFixed(2);
}
function mostrarJugada(P,o,rapido){
 var g=P.g, col=o.local?COL_L:COL_V;
 $('.evPitchClk',P.el).textContent=o.clk?'⏱ '+o.clk:'';
 $('.evPitchEq',P.el).innerHTML='<b style="color:'+col+'">'+(o.local?'':'‹ ')+esc(o.local?g.home.ab:g.away.ab)+(o.local?' ›':'')+'</b>';
 $('.evPitchTxt',P.el).textContent=tr(o.txt).slice(0,110);
 P.el.classList.toggle('evGolPit',!!o.gol);
 if(!o.xy) return;
 var a=aCancha(o.xy,o.local), b=o.xy2?aCancha(o.xy2,o.local):a;
 dibujarPunto(P,a,o.local);
 P.act.style.transform='translate('+a[0].toFixed(1)+'px,'+a[1].toFixed(1)+'px)'; P.act.setAttribute('class','evAct '+(o.local?'l':'v'));
 $('.evAn',P.act).textContent=o.nom?o.nom.split(' ').slice(-1)[0]:''; $('.evAx',P.act).textContent=o.dorsal||'';
 var L=Math.sqrt(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2));
 P.line.setAttribute('x1',a[0].toFixed(1)); P.line.setAttribute('y1',a[1].toFixed(1)); P.line.setAttribute('x2',b[0].toFixed(1)); P.line.setAttribute('y2',b[1].toFixed(1));
 P.line.style.transition='none'; P.line.style.strokeDasharray=L.toFixed(1)+' '+L.toFixed(1); P.line.style.strokeDashoffset=rapido?'0':L.toFixed(1); P.line.style.opacity=L>0.5?'1':'0';
 if(!rapido){ void P.line.getBoundingClientRect(); P.line.style.transition='stroke-dashoffset .45s linear'; P.line.style.strokeDashoffset='0'; }
 P.bola.style.transform='translate('+b[0].toFixed(1)+'px,'+b[1].toFixed(1)+'px)';
}
function reproducir(P){
 if(P.timer) return;
 (function paso(){
  P.timer=null;
  if(!doc.contains(P.el)) return;                          /* no se ve: se pausa; al volver sigue donde iba */
  if(P.cola.length>80) P.cola.splice(0,P.cola.length-30);
  var o=P.cola.shift(); if(!o) return;
  mostrarJugada(P,o,false);
  var sig=P.cola[0], d=800;
  if(sig&&sig.wall&&o.wall) d=Math.min(2400,Math.max(450,(sig.wall-o.wall)*900));
  if(P.cola.length>25) d=Math.min(d,260); else if(P.cola.length>10) d=Math.min(d,600);
  P.timer=setTimeout(paso,d);
 })();
}
function pedirPases(P){
 var g=P.g; if(P.cargando||!g.slug) return Promise.resolve();
 P.cargando=true;
 var base=CORE+g.slug+'/events/'+g.id+'/competitions/'+g.id+'/plays';
 return getJSON(base+'?limit=1').then(function(a){
  var total=num(a&&a.count,0); P.total=total; if(!total) return null;
  var tam=100, ult=Math.ceil(total/tam), pgs=[ult];
  if(ult>1&&(P.inicio||ult!==P.pgAnt)) pgs.unshift(ult-1);
  P.pgAnt=ult;
  return Promise.all(pgs.map(function(pg){ return getJSON(base+'?limit='+tam+'&page='+pg); }));
 }).then(function(rs){
  if(!rs) return;
  var items=[].concat.apply([],rs.map(function(r){ return (r&&r.items)||[]; })), nuevos=[];
  items.forEach(function(p){ var id=String(p.id); if(P.seen[id]) return; P.seen[id]=1; nuevos.push(jugadaCancha(p,g)); });
  var ult=items[items.length-1]; if(ult&&ult.wallclock) P.ultWall=Date.parse(ult.wallclock)||P.ultWall;
  P.err='';
  if(P.inicio){
   P.inicio=false;
   var hist=nuevos.filter(function(o){ return o.xy; }), pasado=hist.slice(-24), cola=pasado.slice(-4);
   pasado.slice(0,pasado.length-cola.length).forEach(function(o){ dibujarPunto(P,aCancha(o.xy,o.local),o.local); });
   if(pasado.length&&g.state!=='in'){ mostrarJugada(P,pasado[pasado.length-1],true); }   /* juego terminado: se queda la última jugada fija */
   else cola.forEach(function(o){ P.cola.push(o); });
   if(!pasado.length) $('.evPitchTxt',P.el).textContent=g.state==='in'?'Esperando las primeras jugadas con posición…':'Este partido no trae posiciones de las jugadas.';
  } else nuevos.forEach(function(o){ P.cola.push(o); });
  reproducir(P);
 }).catch(function(){ P.err='No pude leer las jugadas ahora mismo; lo intento otra vez solo.'; })
 .then(function(){ P.cargando=false; actualizarLag(P); });
}
function actualizarLag(P){
 var e=$('.evLag',P.el); if(!e) return;
 if(P.err){ e.textContent=P.err; return; }
 if(P.g.state!=='in'||!P.ultWall){ e.textContent=P.g.state==='post'?'Partido terminado':''; return; }
 var s=Math.max(0,Math.round((Date.now()-P.ultWall)/1000));
 e.textContent='dato de hace '+(s<90?s+' s':Math.round(s/60)+' min');
}
function iniciarCancha(P){
 if(P.g.state==='pre') return;
 if(!P.poll){
  pedirPases(P);
  if(P.g.state==='in') P.poll=setInterval(function(){
   if(!doc.contains(P.el)||doc.hidden){ if(!doc.contains(P.el)){ clearInterval(P.poll); P.poll=null; clearInterval(P.tick); P.tick=null; } return; }
   if(P.g.state!=='in'){ return; }
   pedirPases(P);
  },6000);
 } else { reproducir(P); }
 if(!P.tick) P.tick=setInterval(function(){ if(doc.contains(P.el)) actualizarLag(P); },1000);
}
function juegoPorClave(k){
 for(var i=0;i<S.games.length;i++) if(S.games[i].key===k) return S.games[i];
 if(I&&I.g&&I.g.key===k) return I.g; if(S.cur&&S.cur.key===k) return S.cur; return null;
}
function montarCanchas(raiz){
 var hs=raiz.querySelectorAll('.evPitchHost');
 for(var i=0;i<hs.length;i++){
  var k=hs[i].getAttribute('data-k'), g=juegoPorClave(k); if(!g) continue;
  var P=PIT[k]||(PIT[k]=nuevaCancha(g)); P.g=g;
  hs[i].innerHTML=''; hs[i].appendChild(P.el);
  if(g.state==='pre'){ $('.evPitchTxt',P.el).textContent='El partido todavía no empieza.'; }
  iniciarCancha(P);
 }
}

/* ---------- pestaña «En vivo» dentro de cada juego ---------- */
var I=null;                           /* juego que se está viendo en una pestaña: {pane,g,det,tab,filt,error,req,timer} */
function normTxt(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
/* Texto del elemento con un espacio entre cada pieza (textContent pega «Magic» con «LOCAL» y rompe las palabras) */
function textoDe(el){
 var out=[], w=doc.createTreeWalker(el,4,null,false), n;
 while((n=w.nextNode())) out.push(n.nodeValue);
 return out.join(' ');
}
function puntajeEq(t,txt){
 var w=normTxt(t&&t.n).split(' ').filter(function(x){ return x.length>=3; }); if(!w.length) return 0;
 var hit=0; for(var i=0;i<w.length;i++) if((' '+txt+' ').indexOf(' '+w[i]+' ')>=0) hit++;
 return hit/w.length;
}
/* Busca, de adentro hacia afuera, el primer contenedor del juego donde aparezcan los dos equipos de un juego de la lista */
function juegoDe(el){
 var a=el;
 for(var n=0;a&&n<8;n++,a=a.parentNode){
  if(a._pk!=null){ for(var i=0;i<S.games.length;i++) if(String(S.games[i].id)===String(a._pk)) return S.games[i]; }
  var txt=normTxt(textoDe(a)), mejor=null, mp=0;
  for(var j=0;j<S.games.length;j++){
   var g=S.games[j], p1=puntajeEq(g.home,txt), p2=puntajeEq(g.away,txt);
   if(p1>=0.5&&p2>=0.5&&p1+p2>mp){ mp=p1+p2; mejor=g; }
  }
  if(mejor) return mejor;
 }
 return null;
}
function porDefecto(){ return (APP==='nba'||APP==='fut')?'cancha':''; }
function pintarInline(){
 if(!I) return;
 if(!doc.contains(I.pane)){ pararInline(); return; }
 var sv={cur:S.cur,det:S.det,tab:S.tab,filt:S.filt,error:S.error}, html='';
 S.cur=I.g; S.det=I.det; S.tab=I.tab; S.filt=I.filt; S.error=I.error;
 try{
  if(!I.det) html='<div class="evVacio">'+(I.error?esc(I.error):'Cargando el juego…')+'</div>';
  else html=(APP==='nba'?renderNBA(I.g):(APP==='fut'?renderFut(I.g):renderMLB(I.g)));
 }catch(e){ html='<div class="evVacio">No pude dibujar este juego con los datos que llegaron.</div>'; if(root.console) root.console.error('envivo',e); }
 I.tab=S.tab; I.filt=S.filt;
 S.cur=sv.cur; S.det=sv.det; S.tab=sv.tab; S.filt=sv.filt; S.error=sv.error;
 I.pane.innerHTML='<div class="evWrap">'+html+'<div role="button" tabindex="0" class="evMas" data-a="lista">Ver todos los juegos en vivo ›</div></div>';
 try{ montarCanchas(I.pane); }catch(e){ if(root.console) root.console.error('cancha',e); }
 var im=I.pane.querySelectorAll('img'); for(var i=0;i<im.length;i++) im[i].addEventListener('error',function(ev){ ev.target.style.visibility='hidden'; });
}
function cargarInline(){
 if(!I) return Promise.resolve(); var g=I.g, id=++I.req;
 var pedir=(APP==='nba'&&g.src==='nba')?detalleNba(g):getJSON(urlDetalle(g)).catch(function(e){ if(APP==='mlb'||S.sinLang) throw e; S.sinLang=true; return getJSON(urlDetalle(g)); });
 return pedir.then(function(j){ if(!I||id!==I.req) return; I.det=j; I.error=''; S.upd=Date.now(); pintarInline(); })
  .catch(function(){ if(!I||id!==I.req) return; if(!I.det) I.error='No pude cargar este juego. Lo intento otra vez solo.'; pintarInline(); });
}
function pararInline(){ if(I&&I.timer) clearInterval(I.timer); I=null; }
function activarInline(pane,g){
 if(I&&I.pane!==pane) pararInline();
 if(I&&I.pane===pane){ cargarInline(); return; }
 I={pane:pane,g:g,key:g.key,det:null,tab:porDefecto(),filt:'all',error:'',req:0,timer:null};
 if(!pane._evL){
  pane._evL=1;
  pane.addEventListener('click',function(ev){
   var t=ev.target; while(t&&t!==pane&&!(t.getAttribute&&t.getAttribute('data-a'))) t=t.parentNode;
   if(!t||t===pane) return; ev.stopPropagation(); var a=t.getAttribute('data-a');
   if(a==='lista') abrir(); else if(I&&I.pane===pane){ if(a==='tab'){ I.tab=t.getAttribute('data-v'); pintarInline(); } else if(a==='filt'){ I.filt=t.getAttribute('data-v'); pintarInline(); } }
  });
 }
 pintarInline();
 if(g.state==='pre'&&APP!=='mlb'){ I.det={}; pintarInline(); } else cargarInline();
 I.timer=setInterval(function(){
  if(doc.hidden) return;
  if(!I||!doc.contains(I.pane)){ pararInline(); return; }
  if(!I.pane.classList.contains('on')) return;               /* solo se actualiza mientras la pestaña está a la vista */
  for(var i=0;i<S.games.length;i++) if(S.games[i].key===I.key){ I.g=S.games[i]; break; }
  if(I.g.state==='pre'&&APP!=='mlb'){ pintarInline(); return; }
  cargarInline();
 },10000);
}
function ponerPestana(st){
 if(st.querySelector('.evTabBtn')) return;
 var body=st.closest?st.closest('.body'):null; if(!body||!st.querySelector('.tb')) return;
 var muestra=body.querySelector('.tab[data-t]'), esMlb=!!muestra;
 var panes=body.querySelectorAll(esMlb?'.tab[data-t]':'.pane'); if(!panes.length) return;
 var btn=mk('button','tb evTabBtn','En vivo'); btn.setAttribute('type','button'); btn.setAttribute('data-t','evv');
 var pane=mk(esMlb?'section':'div',(esMlb?'tab':'pane')+' evPane'); pane.setAttribute('data-t','evv'); pane.setAttribute('data-p','evv');
 panes[panes.length-1].parentNode.appendChild(pane);
 st.appendChild(btn);
 btn.addEventListener('click',function(ev){
  ev.stopPropagation();
  var bs=st.querySelectorAll('.tb'); for(var i=0;i<bs.length;i++) bs[i].classList.toggle('on',bs[i]===btn);
  var ps=body.querySelectorAll('.tab[data-t],.pane'); for(var j=0;j<ps.length;j++) ps[j].classList.toggle('on',ps[j]===pane);
  var go=function(){
   var g=juegoDe(body);
   if(!g){ pane.innerHTML='<div class="evWrap"><div class="evVacio">No encontré este juego en la lista de ESPN/MLB. Puede que todavía no esté publicado.</div><div role="button" tabindex="0" class="evMas" data-a="lista">Ver todos los juegos en vivo ›</div></div>'; if(!pane._evL){ pane._evL=1; pane.addEventListener('click',function(e2){ var t=e2.target; while(t&&t!==pane&&!(t.getAttribute&&t.getAttribute('data-a'))) t=t.parentNode; if(t&&t!==pane&&t.getAttribute('data-a')==='lista'){ e2.stopPropagation(); abrir(); } }); } return; }
   activarInline(pane,g);
  };
  if(S.cargado) go(); else { pane.innerHTML='<div class="evWrap"><div class="evVacio">Buscando el juego…</div></div>'; cargarLista().then(go,go); }
 });
}
function escanearPestanas(){ var l=doc.querySelectorAll('.tabs'); for(var i=0;i<l.length;i++) try{ ponerPestana(l[i]); }catch(e){} }
function vigilarJuegos(){
 var prog=false;
 var obs=new root.MutationObserver(function(){ if(prog) return; prog=true; (root.requestAnimationFrame||root.setTimeout)(function(){ prog=false; escanearPestanas(); }); });
 obs.observe(doc.body,{childList:true,subtree:true}); escanearPestanas();
}

function armar(){
 if($('#evCss')) return;
 var st=mk('style'); st.id='evCss'; st.textContent=CSS; (doc.head||doc.documentElement).appendChild(st);
 sheet=mk('div','evSheet'); sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-label','Juegos en vivo');
 var bar=mk('div','evBar');
 backEl=mk('div','evBtn','‹ Juegos'); backEl.setAttribute('role','button'); backEl.setAttribute('tabindex','0'); backEl.setAttribute('data-a','back'); backEl.style.visibility='hidden';
 titleEl=mk('h2'); titleEl.appendChild(doc.createTextNode('En vivo')); titleEl.appendChild(mk('small'));
 var x=mk('div','evBtn','✕'); x.setAttribute('role','button'); x.setAttribute('tabindex','0'); x.setAttribute('data-a','close'); x.setAttribute('aria-label','Cerrar');
 bar.appendChild(backEl); bar.appendChild(titleEl); bar.appendChild(x); sheet.appendChild(bar);
 bodyEl=mk('div'); sheet.appendChild(bodyEl); sheet.addEventListener('click',onClick); sheet.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ var t=e.target; if(t&&t.getAttribute&&t.getAttribute('role')==='button'){ e.preventDefault(); onClick(e); } } }); doc.body.appendChild(sheet);
 vigilarJuegos();
 setTimeout(function(){ cargarLista(); },2500);
 S.pollList=setInterval(function(){ if(!doc.hidden&&!S.open) cargarLista(); },90000);
}
function arrancar(){ try{ armar(); }catch(e){ if(root.console) root.console.error('envivo',e); } }
if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',arrancar); else arrancar();
})(typeof window!=='undefined'?window:globalThis);
