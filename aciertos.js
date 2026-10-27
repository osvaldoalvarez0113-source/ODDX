/* OVA · «Cuántas veces acierta este %» (window.OVAAciertos) — MLB, fútbol, NBA, NHL y NFL
   Una línea en el Veredicto de cada juego: con este porcentaje, cuántas veces ganó de verdad el favorito en temporadas pasadas.
   Tablas sacadas de los mismos datos de la medición de 6 temporadas (docs/MEDICION-6-TEMPORADAS-2026-10.md y MEDICION-NHL-NFL):
   mlb 2021-2026 (precio DraftKings vía ESPN) · fut 5 ligas 2020-21 a 2025-26 (Pinnacle de cierre) · nba 2020-21 a 2025-26
   (DraftKings) · nhl 2022-2025 · nfl 2019-2026 (DraftKings vía ESPN). Cada fila: [desde %, hasta %, juegos, ganó el favorito].
   «mk» = cuando el porcentaje es del mercado; «mod» = cuando es del modelo solo (sin precio del mercado). L = favorito local, V = visitante.
   Los tramos se juntan hasta tener 120 juegos o más, para que el número no sea pura suerte.
   Medido fuera de muestra: estas tablas NO mejoran el porcentaje del mercado (el mercado ya acierta lo que dice); sirven para ver
   en juegos reales cuántas veces se cumple ese porcentaje. Solo informativo: no entra a ningún cálculo. */
(function(root){
"use strict";
var T={"mlb":{"mkL":[[50,55,2564,1349],[55,60,2556,1469],[60,65,1581,933],[65,70,869,613],[70,100,463,347]],"mkV":[[50,55,1708,894],[55,60,1516,879],[60,65,696,440],[65,100,358,239]],"modL":[[50,55,3642,1905],[55,60,3099,1754],[60,65,1436,918],[65,100,486,337]],"modV":[[50,55,2418,1310],[55,60,945,543],[60,100,285,172]],"n":12311,"temps":6},"fut":{"mkL":[[0,40,1022,367],[40,45,1057,480],[45,50,975,435],[50,55,884,468],[55,60,770,442],[60,65,609,394],[65,70,526,376],[70,75,450,333],[75,80,307,232],[80,100,294,248]],"mkV":[[0,40,806,321],[40,45,790,357],[45,50,568,289],[50,55,470,246],[55,60,430,257],[60,65,280,190],[65,70,201,136],[70,75,141,107],[75,100,120,97]],"modL":[[0,40,758,274],[40,45,1099,444],[45,50,1088,472],[50,55,965,481],[55,60,857,475],[60,65,693,428],[65,70,624,414],[70,75,403,289],[75,80,283,206],[80,100,287,230]],"modV":[[0,40,600,228],[40,45,840,377],[45,50,676,329],[50,55,543,303],[55,60,381,199],[60,65,271,164],[65,70,168,117],[70,100,156,114]],"n":10732,"temps":6},"nba":{"mkL":[[50,55,549,278],[55,60,664,406],[60,65,661,409],[65,70,625,417],[70,75,606,443],[75,80,492,377],[80,85,448,355],[85,100,474,431]],"mkV":[[50,55,482,252],[55,60,554,333],[60,65,466,287],[65,70,367,251],[70,75,318,225],[75,80,224,178],[80,85,212,175],[85,100,151,140]],"modL":[[50,55,726,400],[55,60,784,434],[60,65,766,467],[65,70,666,444],[70,75,590,431],[75,80,479,363],[80,85,370,300],[85,100,347,295]],"modV":[[50,55,629,336],[55,60,539,317],[60,65,433,271],[65,70,374,259],[70,75,259,195],[75,80,164,130],[80,100,167,142]],"n":7293,"temps":6},"nhl":{"mkL":[[50,55,733,396],[55,60,823,453],[60,65,591,360],[65,70,374,254],[70,75,241,186],[75,100,143,119]],"mkV":[[50,55,513,277],[55,60,597,342],[60,65,288,169],[65,100,274,192]],"modL":[[50,55,806,423],[55,60,765,412],[60,65,582,379],[65,70,383,239],[70,100,304,238]],"modV":[[50,55,689,350],[55,60,479,260],[60,65,295,178],[65,100,274,180]],"n":4577,"temps":4},"nfl":{"mkL":[[50,60,251,137],[60,65,128,84],[65,75,219,152],[75,100,249,207]],"mkV":[[50,60,229,137],[60,70,184,115],[70,100,189,154]],"modL":[[50,55,161,76],[55,60,167,98],[60,65,135,81],[65,70,147,96],[70,75,120,88],[75,100,181,143]],"modV":[[50,55,153,89],[55,60,130,80],[60,100,255,175]],"n":1449,"temps":8}};
var NOMBRE={mlb:'juegos',fut:'partidos',nba:'juegos',nhl:'juegos',nfl:'juegos'};
function fila(dep,p,local,mercado){
 var d=T[dep]; if(!d||!(p>0&&p<=1)) return null;
 var lista=d[(mercado?'mk':'mod')+(local?'L':'V')]; if(!lista||!lista.length) return null;
 var v=p*100, i;
 for(i=0;i<lista.length;i++){ var f=lista[i]; if(v>=f[0]&&(v<f[1]||(i===lista.length-1&&v<=100))) return {desde:f[0],hasta:f[1],n:f[2],w:f[3],pct:f[3]/f[2]}; }
 if(v<lista[0][0]){ var f0=lista[0]; return {desde:f0[0],hasta:f0[1],n:f0[2],w:f0[3],pct:f0[3]/f0[2]}; }
 return null;
}
function miles(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function rango(f){ return f.desde<=0?'menos de '+f.hasta+'%':(f.hasta>=100?'más de '+f.desde+'%':f.desde+'-'+f.hasta+'%'); }
/* texto listo para el Veredicto (o null si no aplica) */
function texto(dep,p,local,mercado){
 var f=fila(dep,p,local,mercado); if(!f) return null;
 var d=T[dep];
 return 'Cuando '+(mercado?'el mercado':'el modelo')+' le dio '+rango(f)+' al favorito '+(local?'local':'visitante')+
  ', ganó <b>'+miles(f.w)+' de '+miles(f.n)+'</b> '+NOMBRE[dep]+' ('+Math.round(f.pct*100)+'%) en '+d.temps+' temporadas'+
  (dep==='fut'?' (el empate cuenta como no ganó)':'')+'.';
}
/* bloque HTML con el mismo estilo de los avisos del Veredicto */
function html(dep,p,local,mercado){
 var t=texto(dep,p,local,mercado); if(!t) return '';
 return '<div class="rvP rvAc" style="margin-top:9px">📊 <b>Cuántas veces acierta este %:</b> '+t+'</div>';
}
var API={T:T,fila:fila,texto:texto,html:html};
root.OVAAciertos=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
