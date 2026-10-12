/* ===================================================================
   AVISOS MLB (GitHub Actions, Node 20+)  ·  sin llave: usa la API pública de la MLB
   Cada corrida (cada 30 min en horas de juego) mira los juegos que no han empezado y te avisa por ntfy, UNA sola vez cada cosa:
     ⚾ cambió el abridor probable (o lo quitaron)
     📋 salió la alineación oficial
     🌬️ viento fuerte, lluvia o temperatura extrema (el techo cerrado no cuenta)
   La primera vez que ve un juego solo lo anota: no avisa de lo que ya estaba. El estado vive en .cache/avisos.json
   (actions/cache). Las funciones puras se exportan para las pruebas (pruebas.js).
   =================================================================== */
const fs=require('fs');
const ENV=process.env;
const NTFY=(ENV.NTFY_TOPIC||'').trim();
const HORAS=parseFloat(ENV.HORAS||'8');            /* juegos que empiezan en las próximas N horas */
const VIENTO=parseFloat(ENV.VIENTO_MPH||'15');
const FRIO=parseFloat(ENV.FRIO_F||'45'), CALOR=parseFloat(ENV.CALOR_F||'95');
const API=ENV.MLB_API||'https://statsapi.mlb.com/api/v1';
const CF='.cache/avisos.json';

function ap(g,l){ const t=g.teams&&g.teams[l]&&g.teams[l].team||{}; return t.abbreviation||String(t.name||'').split(' ').pop()||'?'; }
function nombre(p){ return p&&p.fullName?String(p.fullName):null; }
function hora(t){ return new Date(t).toLocaleTimeString('es-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}); }
function etiqueta(g){ return ap(g,'away')+' @ '+ap(g,'home')+' '+hora(g.gameDate); }

/* "12 mph, Out To CF" -> {mph:12, dir:'out'|'in'|'lado'|'calma'} */
function leerViento(txt){
  const s=String(txt||''); const m=/(\d+)\s*mph/i.exec(s); if(!m) return null;
  const mph=+m[1]; let dir='lado';
  if(/\bout\b/i.test(s)) dir='out'; else if(/\bin\b/i.test(s)&&/from/i.test(s)) dir='in'; else if(/none|calm/i.test(s)||mph===0) dir='calma';
  return {mph,dir};
}
function techado(g){
  const c=String(g.weather&&g.weather.condition||'').toLowerCase();
  return /dome|roof closed/.test(c);
}
/* Qué le importa al que apuesta: el clima solo cuenta si mueve el total. */
function climaAlertas(g){
  const w=g.weather; if(!w||techado(g)) return [];
  const out=[], cond=String(w.condition||''), temp=parseFloat(w.temp);
  if(/rain|drizzle|shower|storm|snow/i.test(cond)) out.push({k:'lluvia',t:'🌧️ '+cond+' — riesgo de retraso o suspensión; confirma la hora y revisa que el abridor no salga temprano.'});
  const v=leerViento(w.wind);
  if(v&&v.mph>=VIENTO){
    if(v.dir==='out') out.push({k:'viento',t:'🌬️ Viento '+v.mph+' mph hacia afuera: ayuda a las carreras (Over).'});
    else if(v.dir==='in') out.push({k:'viento',t:'🌬️ Viento '+v.mph+' mph hacia adentro: baja las carreras (Under).'});
    else out.push({k:'viento',t:'🌬️ Viento '+v.mph+' mph de lado: más difícil de leer, ojo con el total.'});
  }
  if(isFinite(temp)&&temp<=FRIO) out.push({k:'frio',t:'🥶 '+temp+'°F: el frío le quita carreras al juego (Under).'});
  if(isFinite(temp)&&temp>=CALOR) out.push({k:'calor',t:'🥵 '+temp+'°F: el calor ayuda a la pelota a viajar (Over).'});
  return out;
}

/* juegos: lista de juegos del schedule (con hydrate probablePitcher,lineups,weather,team)
   estado: lo guardado en la corrida anterior · ahora: ms. Devuelve {avisos:[{tipo,juego,texto}], estado} */
function analizar(juegos, estado, ahora){
  estado=estado&&typeof estado==='object'?estado:{}; estado.pit=estado.pit||{}; estado.hechos=estado.hechos||{};
  ahora=ahora||Date.now();
  const avisos=[]; const lim=ahora+HORAS*3600e3;
  Object.keys(estado.hechos).forEach(k=>{ if(ahora-estado.hechos[k]>3*86400e3) delete estado.hechos[k]; });
  Object.keys(estado.pit).forEach(k=>{ if(estado.pit[k].t&&ahora-estado.pit[k].t>3*86400e3) delete estado.pit[k]; });
  const una=(k,fn)=>{ if(estado.hechos[k]) return; estado.hechos[k]=ahora; fn(); };
  (juegos||[]).forEach(g=>{
    const pk=g.gamePk, t=Date.parse(g.gameDate);
    if(!pk||!isFinite(t)) return;
    const st=g.status&&g.status.abstractGameState;
    if(st&&st!=='Preview') return;                      /* ya empezó o terminó */
    if(t<ahora-5*60e3||t>lim) return;                    /* fuera de la ventana */
    const a=g.teams&&g.teams.away&&g.teams.away.probablePitcher, h=g.teams&&g.teams.home&&g.teams.home.probablePitcher;
    const act={a:a?a.id:null,h:h?h.id:null,an:nombre(a),hn:nombre(h),t:ahora};
    const ant=estado.pit[pk];
    if(ant){
      [['a','away'],['h','home']].forEach(([c,l])=>{
        if(ant[c]!=null && ant[c]!==act[c]){
          const antes=ant[c+'n']||'el anterior', ahoraN=act[c+'n'];
          una('pit|'+pk+'|'+c+'|'+ant[c]+'>'+act[c],()=>avisos.push({tipo:'abridor',juego:etiqueta(g),
            texto:'⚾ '+ap(g,l)+': '+antes+' ya no es el abridor'+(ahoraN?' → ahora '+ahoraN:' (todavía sin nombre)')+'. Lo que armaste con el otro ya no vale.'}));
        }
      });
    }
    estado.pit[pk]=act;
    const L=g.lineups;
    if(L&&Array.isArray(L.awayPlayers)&&L.awayPlayers.length>=9&&Array.isArray(L.homePlayers)&&L.homePlayers.length>=9 && t-ahora<=3*3600e3)
      una('lin|'+pk,()=>avisos.push({tipo:'alineacion',juego:etiqueta(g),texto:'📋 Alineación oficial lista: '+etiqueta(g)+'. Revisa que jueguen las estrellas antes de apostar.'}));
    climaAlertas(g).forEach(c=>una('clima|'+pk+'|'+c.k,()=>avisos.push({tipo:'clima',juego:etiqueta(g),texto:etiqueta(g)+' · '+c.t})));
  });
  return {avisos,estado};
}
function mensaje(avisos){
  const grupos=[['abridor','CAMBIOS DE ABRIDOR'],['alineacion','ALINEACIONES'],['clima','CLIMA']];
  const L=[];
  grupos.forEach(([k,tit])=>{
    const g=avisos.filter(a=>a.tipo===k); if(!g.length) return;
    if(L.length) L.push('');
    L.push(tit+':');
    if(k==='alineacion') L.push('📋 Listas: '+g.map(a=>a.juego).join(' · '));
    else g.forEach(a=>L.push(a.texto));
  });
  return L.join('\n');
}
function prioridad(avisos){ return avisos.some(a=>a.tipo==='abridor')?'high':'default'; }

async function avisar(texto,pri){
  if(!NTFY){ console.log('(Sin NTFY_TOPIC: no se envió aviso al teléfono.)'); return false; }
  const r=await fetch('https://ntfy.sh/'+encodeURIComponent(NTFY),{method:'POST',
    headers:{'Title':'Avisos MLB','Priority':pri||'default','Tags':'baseball','Content-Type':'text/plain; charset=utf-8'},body:texto});
  console.log('Aviso al teléfono:',r.ok?'enviado':('falló ('+r.status+')')); return r.ok;
}
function ymd(d){ return d.toLocaleDateString('en-CA',{timeZone:'America/Chicago'}); }
async function main(){
  let estado={}; try{ estado=JSON.parse(fs.readFileSync(CF,'utf8')); }catch(e){}
  const hoy=new Date(), man=new Date(hoy.getTime()+86400000);
  const url=API+'/schedule?sportId=1&startDate='+ymd(hoy)+'&endDate='+ymd(man)+'&hydrate=probablePitcher,lineups,weather,team';
  const r=await fetch(url); if(!r.ok) throw new Error('MLB schedule HTTP '+r.status);
  const j=await r.json(); const juegos=[]; (j.dates||[]).forEach(d=>(d.games||[]).forEach(g=>juegos.push(g)));
  console.log('Juegos vistos:',juegos.length);
  const res=analizar(juegos,estado,Date.now());
  const guardar=()=>{ try{ fs.mkdirSync('.cache',{recursive:true}); fs.writeFileSync(CF,JSON.stringify(res.estado)); }catch(e){} };
  if(!res.avisos.length){ console.log('Nada nuevo que avisar.'); guardar(); return; }
  const txt=mensaje(res.avisos); console.log(txt);
  const ok=await avisar(txt,prioridad(res.avisos));
  if(ok||!NTFY) guardar();                  /* si ntfy falló se vuelve a intentar en la próxima corrida */
  if(ENV.GITHUB_STEP_SUMMARY) try{ fs.appendFileSync(ENV.GITHUB_STEP_SUMMARY,'# Avisos MLB\n```\n'+txt+'\n```\n'); }catch(e){}
}
if(require.main===module) main().catch(e=>{ console.error('ERROR:',e.message); process.exitCode=1; });
module.exports={analizar,mensaje,leerViento,climaAlertas,prioridad,techado};
