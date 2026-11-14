// Prueba con la API real de la MLB que la fórmula nueva de index.html lee bien los datos (juegos ya jugados, con corte al día anterior).
const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('index.html','utf8');
const g=n=>{const i=s.indexOf(n); if(i<0) throw new Error('no está '+n); let d=0,j=s.indexOf('{',i);for(;;j++){if(s[j]=='{')d++;if(s[j]=='}'){d--;if(!d)break;}}return s.slice(i,j+1);};
const src=["var API='https://statsapi.mlb.com/api/v1'; var EN_VUELO={}; var cache={sea:{}}; var STAND=null; var LIGA_ERA=null; var PRIOR_ERA=40; var MODO='mix';",
 s.match(/var PESO_ERA=[^\n]*/)[0], 'var MULT=6,BONO_LOCAL=0.55; var CORTE=null;',
 g('function j(url)'),g('function corteSufijo'),g('function rangoQS'),g('function pedirStats'),g('function ipToNum'),
 g('function temporada'),'var KBB3_C={};',g('function kbb3'),g('function standings'),g('function kbbUsado'),g('function ventaja')].join('\n');
const ctx={fetch,console,Promise,JSON,Math,isFinite,parseFloat,String,Object,Error,Date};
vm.createContext(ctx); vm.runInContext(src,ctx);
(async()=>{
  const dia='2026-08-20'; ctx.CORTE='2026-08-19';
  const sch=await (await fetch('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+dia+'&hydrate=probablePitcher')).json();
  const st=await ctx.standings(2026);
  for(const gm of sch.dates[0].games.slice(0,6)){
    const a=gm.teams.away,h=gm.teams.home, pa=a.probablePitcher, ph=h.probablePitcher; if(!pa||!ph) continue;
    const [sa,sh,ka,kh]=await Promise.all([ctx.temporada(pa.id,2026),ctx.temporada(ph.id,2026),ctx.kbb3(pa.id,2026),ctx.kbb3(ph.id,2026)]);
    const ra=id=>{const t=st[id]; return t&&t.ra!=null?t.ra/(t.w+t.l)*0.92:null;};
    const r=ctx.ventaja({eraA:sa.era,eraH:sh.era,rgA:4.5,rgH:4.5,bpA:4,bpH:4,raA:ra(a.team.id),raH:ra(h.team.id),kbbA:ctx.kbbUsado(sa),kbbH:ctx.kbbUsado(sh),k3A:ka,k3H:kh});
    console.log(`${a.team.name} @ ${h.team.name} | ${pa.fullName}: ERA ${sa.era} IP ${sa.ip.toFixed(1)} BF ${sa.bf} K-BB ${(sa.kbb*100).toFixed(1)}% 3a ${ka==null?'—':(ka*100).toFixed(1)+'%'} | ${ph.fullName}: ERA ${sh.era} BF ${sh.bf} K-BB ${(sh.kbb*100).toFixed(1)}% 3a ${kh==null?'—':(kh*100).toFixed(1)+'%'} | RA/j ${ra(a.team.id)?.toFixed(2)} vs ${ra(h.team.id)?.toFixed(2)} | local ${r.pct.toFixed(1)}%`);
  }
})().catch(e=>{console.error(e);process.exit(1);});
