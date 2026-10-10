/* ===================================================================
   PRECIO JUSTO DE PINNACLE PARA FUTBOL Y NBA (GitHub Actions, Node 20+)
   Quita el margen al precio de Pinnacle -> probabilidad "justa" del mercado.
   La app la pone al lado de lo que dice su modelo. Pocas llamadas: 1 por grupo de ligas.
   Salida: pinnacle-futbol.json, pinnacle-nba.json (+ informe en resultado2.md)
   =================================================================== */
const fs=require('fs'); const ENV=process.env; const KEY=ENV.ODDSPAPI_KEY||'';
const OP='https://api.oddspapi.io/v4';
const HORAS_F=parseFloat(ENV.HORAS_FUTBOL||'72'), HORAS_N=parseFloat(ENV.HORAS_NBA||'48');
const MAX_MES=parseInt(ENV.MAX_MES||'100',10);
const LIGAS={ /* id de OddsPapi -> nombre que usa la app */
  17:'Premier League', 8:'La Liga', 23:'Serie A', 35:'Bundesliga', 34:'Ligue 1', 7:'Champions League', 242:'MLS' };
const NBA_ID='132';
const CDIR='.cache', CF=CDIR+'/valor2.json';
const out=[]; const P=(...a)=>{ const s=a.join(' '); out.push(s); console.log(s); };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let cache={uso:{},mk:null}; try{ cache=Object.assign(cache,JSON.parse(fs.readFileSync(CF,'utf8'))); }catch(e){}
const mes=new Date().toISOString().slice(0,7);
function guardar(){ try{ fs.mkdirSync(CDIR,{recursive:true}); fs.writeFileSync(CF,JSON.stringify(cache)); }catch(e){} }
let ultimo=0;
async function op(path,params,gasta){
  if(gasta && (cache.uso[mes]||0)>=MAX_MES) throw new Error('tope mensual ('+MAX_MES+')');
  const esp=(/odds-by-tournaments/.test(path)?6000:1200)-(Date.now()-ultimo); if(esp>0) await sleep(esp);
  ultimo=Date.now(); if(gasta) cache.uso[mes]=(cache.uso[mes]||0)+1;
  const u=new URLSearchParams(params||{}); u.set('apiKey',KEY);
  let r=await fetch(OP+path+'?'+u.toString());
  if(r.status===429){ const t=await r.text().catch(()=>''); const m=/wait ([0-9.]+) seconds/.exec(t); await sleep(Math.min(15,(m?parseFloat(m[1]):2)+2)*1000); r=await fetch(OP+path+'?'+u.toString()); }
  if(!r.ok){ const t=(await r.text().catch(()=>'')).slice(0,200).replace(KEY,'***'); const e=new Error(path+' HTTP '+r.status+' '+t); e.status=r.status; throw e; }
  guardar(); return r.json();
}
function dec(x){ x=+x; if(!isFinite(x)) return NaN; if(x>=100) return 1+x/100; if(x<=-100) return 1+100/(-x); return x; }
function noVig(ds){ const a=ds.map(d=>1/d), s=a.reduce((x,y)=>x+y,0); return a.map(x=>x/s); }
function precio(book,mk,oc){
  const m=book&&book.markets&&book.markets[mk]; if(!m||m.marketActive===false) return null;
  const o=m.outcomes&&m.outcomes[oc]; if(!o) return null;
  const pl=o.players||{}; let x=pl['0']||pl[Object.keys(pl)[0]]; if(Array.isArray(x)) x=x[0];
  if(!x||x.active===false) return null; const d=dec(x.price); return d>1?d:null;
}
function listaFix(j){ if(!j) return []; if(Array.isArray(j)) return j; if(j.fixtureId) return [j];
  for(const k of ['fixtures','data','results','items']) if(Array.isArray(j[k])) return j[k];
  return Object.values(j).filter(x=>x&&typeof x==='object'&&x.fixtureId); }
async function pinnacle(ids){
  const lista=[]; 
  try{ return listaFix(await op('/odds-by-tournaments',{tournamentIds:ids.join(','),bookmaker:'pinnacle'},true)); }
  catch(e){ if(e.status!==400) throw e; P('  (varias ligas juntas dieron 400: '+e.message.slice(0,160)+'; pido de una en una)'); }
  for(const id of ids){ try{ listaFix(await op('/odds-by-tournaments',{tournamentIds:String(id),bookmaker:'pinnacle'},true)).forEach(f=>lista.push(f)); }catch(e){ P('  liga '+id+': '+e.message.slice(0,160)); } }
  return lista;
}
/* mercado ganador a 2 vias del basquet: se busca en la lista de mercados de OddsPapi */
async function mercadoNba(){
  if(cache.mk) return cache.mk;
  const m=await op('/markets',{},false); const a=Array.isArray(m)?m:Object.values(m);
  const c=a.filter(x=>x.sportId===11&&x.marketLength===2&&(x.handicap===0||x.handicap==null)&&/fulltime|full_time|incl|match/i.test(String(x.period||'')+' '+x.marketName)&&!x.playerProp);
  P('Candidatos de ganador en basquet: '+JSON.stringify(c.slice(0,10).map(x=>({id:x.marketId,n:x.marketName,t:x.marketType,p:x.period,o:(x.outcomes||[]).map(o=>o.outcomeId+'='+o.outcomeName)}))));
  const el=c.find(x=>/moneyline|winner|1x2|ml/i.test(String(x.marketType)))||c.find(x=>/winner|moneyline/i.test(x.marketName))||c[0];
  if(!el) throw new Error('no encontre el mercado ganador del basquet');
  const ids=(el.outcomes||[]).map(o=>String(o.outcomeId)).sort((p,q)=>+p-+q);
  cache.mk={id:String(el.marketId),a:ids[0],b:ids[1],nombre:el.marketName,orden:(el.outcomes||[]).map(o=>o.outcomeId+'='+o.outcomeName)}; guardar(); return cache.mk;
}
(async()=>{
  if(!KEY){ P('Falta ODDSPAPI_KEY'); process.exit(1); }
  const ahora=Date.now(); let salio=0;
  try{
    /* ---- futbol ---- */
    const fx=await pinnacle(Object.keys(LIGAS));
    P('Futbol: OddsPapi devolvio '+fx.length+' partidos');
    const fut=[]; const razon={lejos:0,empezado:0,sinPin:0,sinPrecio:0};
    fx.forEach(f=>{
      const t=Date.parse(f.startTime); if(!isFinite(t)||t<ahora){razon.empezado++;return;} if(t>ahora+HORAS_F*3600e3){razon.lejos++;return;}
      const pin=f.bookmakerOdds&&f.bookmakerOdds.pinnacle; if(!pin){razon.sinPin++;return;}
      const a=precio(pin,'101','101'), x=precio(pin,'101','102'), b=precio(pin,'101','103');
      if(!a||!x||!b){razon.sinPrecio++;return;}
      const fair=noVig([a,x,b]);
      const o=precio(pin,'1010','1010'), u=precio(pin,'1010','1011');
      const fila={t:new Date(t).toISOString(),liga:LIGAS[f.tournamentId]||String(f.tournamentId||''),n:[f.participant1Name||('Equipo '+f.participant1Id),f.participant2Name||('Equipo '+f.participant2Id)],
        r:fair.map(v=>+v.toFixed(4))};
      if(o&&u){ const nv=noVig([o,u]); fila.ou25=[+nv[0].toFixed(4),+nv[1].toFixed(4)]; }
      fut.push(fila);
    });
    fut.sort((p,q)=>Date.parse(p.t)-Date.parse(q.t));
    P('Futbol usable: '+fut.length+' · descartados '+JSON.stringify(razon));
    P('Muestra nombres: '+fut.slice(0,12).map(x=>x.liga+': '+x.n.join(' vs ')+' '+x.r.join('/')).join(' | '));
    if(fx[0]) P('Campos de un partido: '+Object.keys(fx[0]).join(','));
    fs.writeFileSync('pinnacle-futbol.json',JSON.stringify({generado:new Date().toISOString(),ventanaH:HORAS_F,juegos:fut})); salio++;
    /* ---- NBA ---- */
    try{
      const mk=await mercadoNba(); P('Mercado NBA: '+JSON.stringify(mk));
      const nx=await pinnacle([NBA_ID]);
      P('NBA: OddsPapi devolvio '+nx.length+' partidos');
      const nba=[]; const rz={lejos:0,empezado:0,sinPin:0,sinPrecio:0};
      nx.forEach(f=>{
        const t=Date.parse(f.startTime); if(!isFinite(t)||t<ahora){rz.empezado++;return;} if(t>ahora+HORAS_N*3600e3){rz.lejos++;return;}
        const pin=f.bookmakerOdds&&f.bookmakerOdds.pinnacle; if(!pin){rz.sinPin++;return;}
        const a=precio(pin,mk.id,mk.a), b=precio(pin,mk.id,mk.b); if(!a||!b){rz.sinPrecio++;return;}
        const fair=noVig([a,b]);
        nba.push({t:new Date(t).toISOString(),n:[f.participant1Name||('Equipo '+f.participant1Id),f.participant2Name||('Equipo '+f.participant2Id)],ml:fair.map(v=>+v.toFixed(4))});
      });
      P('NBA usable: '+nba.length+' · descartados '+JSON.stringify(rz));
      P('Muestra NBA: '+nba.slice(0,8).map(x=>x.n.join(' vs ')+' '+x.ml.join('/')).join(' | '));
      fs.writeFileSync('pinnacle-nba.json',JSON.stringify({generado:new Date().toISOString(),ventanaH:HORAS_N,juegos:nba})); salio++;
    }catch(e){ P('NBA ERROR: '+String(e.message).replace(KEY,'***')); }
  }catch(e){ P('ERROR: '+String(e.message).replace(KEY,'***')); process.exitCode=1; }
  P('Llamadas este mes (este escaner): '+(cache.uso[mes]||0)+' de '+MAX_MES);
  try{ fs.writeFileSync('resultado2.md',out.join('\n')); }catch(e){}
  guardar();
})();
