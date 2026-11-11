const fs=require('fs'); fs.mkdirSync('sj',{recursive:true});
const W=(n,o)=>fs.writeFileSync('sj/'+n,JSON.stringify(o));
async function j(u){ try{ const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 ova-sonda'}}); return r.ok?r.json():{status:r.status}; }catch(e){ return {err:e.message}; } }
const LIGAS=[['hockey','nhl','20261111-20261114'],['football','nfl','20261112-20261117'],['soccer','eng.1','20261111-20261125'],['soccer','esp.1','20261111-20261125'],['soccer','uefa.champions','20261111-20261127'],['baseball','mlb','20261020-20261103'],['tennis','atp','20261111-20261113']];
(async()=>{
  const res={};
  for(const [sp,lg,fechas] of LIGAS){ const R=res[lg]={};
    const [f0,f1]=fechas.split('-'), D=x=>new Date(Date.UTC(+x.slice(0,4),+x.slice(4,6)-1,+x.slice(6))); const sb={events:[]};
    for(let d=D(f0);d<=D(f1);d=new Date(+d+864e5)){ const k=d.toISOString().slice(0,10).replace(/-/g,''); const r=await j(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/scoreboard?dates=${k}`); if(r.events) sb.events=sb.events.concat(r.events); else sb.status=r.status||r.err; }
    const evs=(sb.events||[]); R.eventos=evs.length; R.sbErr=sb.status||sb.err||Object.keys(sb).join(','); R.ej=evs.slice(0,3).map(e=>e.id+' '+e.shortName+' '+e.date+' '+(e.status&&e.status.type&&e.status.type.state));
    if(sp==='tennis') continue; try{
    let hecho=false;
    for(const e of evs.slice(0,12)){ if(hecho) break; const id=e.id, base=`https://sports.core.api.espn.com/v2/sports/${sp}/leagues/${lg}/events/${id}/competitions/${id}`;
      const od=await j(base+'/odds'); const provs=((od.items)||[]).map(i=>i.provider&&(i.provider.id+':'+i.provider.name)); R['provs_'+id]=provs.join(',');
      for(const pv of ((od.items)||[]).map(i=>i.provider&&i.provider.id)){
        let all=[]; for(let pg=1;pg<6;pg++){ const r=await j(base+`/odds/${pv}/propBets?limit=1000&page=${pg}`); if(!r.items) break; all=all.concat(r.items); if(pg>=r.pageCount) break; }
        if(!all.length) continue; hecho=true; R.ev=id; R.prov=pv; R.nprops=all.length;
        const tipos={}; all.forEach(it=>{const t=it.type&&it.type.name; tipos[t]=(tipos[t]||0)+1;}); R.tipos=tipos;
        const crudo={}; all.forEach(it=>{const t=it.type&&it.type.name; if(!crudo[t]) crudo[t]=it;}); W('crudo_'+lg+'.json',crudo);
        W('props_'+lg+'.json',all.map(it=>({a:(/athletes\/(\d+)/.exec(it.athlete&&it.athlete.$ref||'')||[])[1],tm:(/teams\/(\d+)/.exec(it.team&&it.team.$ref||'')||[])[1],t:it.type&&it.type.name,am:it.odds&&it.odds.american&&it.odds.american.value,cur:it.current&&it.current.target&&it.current.target.value,disp:it.current&&it.current.target&&it.current.target.displayValue,op:it.open&&it.open.target&&it.open.target.value})));
        const comp=e.competitions[0].competitors; R.comp=comp.map(c=>({id:c.team&&c.team.id,ab:c.team&&c.team.abbreviation,ha:c.homeAway}));
        for(const c of comp){ const r=await j(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/teams/${c.team.id}/roster`); const ath=r.athletes||[]; const plano=ath.length&&ath[0].items?[].concat(...ath.map(g=>g.items.map(x=>Object.assign({grp:g.position},x)))):ath;
          W('roster_'+lg+'_'+c.team.id+'.json',{forma:ath.length&&ath[0].items?'grupos':'plano',keys0:plano[0]&&Object.keys(plano[0]),l:plano.map(a=>({id:a.id,n:a.displayName,pos:a.position&&a.position.abbreviation,grp:a.grp,inj:(a.injuries||[]).map(x=>x.status)}))}); }
        const conLinea=all.map(it=>(/athletes\/(\d+)/.exec(it.athlete&&it.athlete.$ref||'')||[])[1]).filter(Boolean); const cnt={}; conLinea.forEach(a=>cnt[a]=(cnt[a]||0)+1); const top=Object.keys(cnt).sort((x,y)=>cnt[y]-cnt[x]).slice(0,2);
        for(const aid of top){ const gl=await j(`https://site.web.api.espn.com/apis/common/v3/sports/${sp}/${lg}/athletes/${aid}/gamelog`); const st=(gl.seasonTypes||[]).slice(0,2).map(s=>({displayName:s.displayName,categories:(s.categories||[]).slice(0,2).map(c=>({displayName:c.displayName,type:c.type,splitType:c.splitType,events:(c.events||[]).slice(0,3),nev:(c.events||[]).length}))}));
          W('gamelog_'+lg+'_'+aid+'.json',{status:gl.status,labels:gl.labels,names:gl.names,categories:gl.categories,seasonTypes:st,nST:(gl.seasonTypes||[]).length}); }
        break; }
    }
    const fin=evs.find(e=>e.status&&e.status.type&&e.status.type.completed) || ((await j(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/scoreboard?dates=${sp==='football'?'20261108':'20261110'}`)).events||[]).find(e=>e.status.type.completed);
    if(fin){ const s=await j(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${lg}/summary?event=${fin.id}`); const bp=s.boxscore&&s.boxscore.players; R.boxEv=fin.id;
      W('box_'+lg+'.json',{keysSum:Object.keys(s),players:(bp||[]).map(t=>({team:t.team&&t.team.id,statistics:(t.statistics||[]).map(g=>({name:g.name,type:g.type,keys:g.keys,names:g.names,labels:g.labels,athletes:(g.athletes||[]).slice(0,2)}))})),rosters:s.rosters&&s.rosters.map(r=>({team:r.team&&r.team.id,roster:(r.roster||[]).slice(0,3)})),hdr:s.header&&s.header.competitions&&s.header.competitions[0].status}); }
    }catch(e){ R.error=String(e&&e.stack||e).slice(0,400); } W('resumen.json',res);
  }
  W('resumen.json',res); console.log(JSON.stringify(res,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
