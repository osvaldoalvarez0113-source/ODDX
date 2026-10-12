/* Movimiento de cuota entre dos revisiones del escáner (Pinnacle sin margen).
   Pura: la usan scripts/valor.js y pruebas.js. prev = {clave: probabilidad_del_equipo_1}, filas = las de analizar(). */
function clave(f){ return new Date(f.t).toLocaleDateString('en-CA',{timeZone:'America/Chicago'})+'|'+f.n.join('@'); }
function movimientos(prev,filas,umbral){
  prev=prev||{}; umbral=umbral>0?umbral:0.03;
  const out=[], nuevo={};
  (filas||[]).forEach(f=>{
    const k=clave(f), p1=f.fair[0]; nuevo[k]=+p1.toFixed(4);
    if(prev[k]==null) return;
    const d=p1-prev[k]; if(Math.abs(d)<umbral) return;
    const i=d>0?0:1;                                   /* el equipo que sube en el mercado */
    out.push({f:f,eq:f.n[i],otro:f.n[1-i],ahora:f.fair[i],antes:i===0?prev[k]:1-prev[k],puntos:Math.abs(d)*100,clave:k+'|'+(+p1.toFixed(2))});
  });
  out.sort((a,b)=>b.puntos-a.puntos);
  return {mov:out,nuevo:nuevo};
}
function lineaMov(m,hora){
  return '• '+m.eq+' sube '+m.puntos.toFixed(1)+' pts ('+(m.antes*100).toFixed(1)+'% → '+(m.ahora*100).toFixed(1)+'%) | '+m.f.n[0]+' vs '+m.f.n[1]+(hora?' | '+hora(m.f.t):'');
}
module.exports={movimientos,lineaMov,clave};
