import json,math,collections
D=json.load(open('datos/partidos_futbol.json'))
print(collections.Counter(g['lg'] for g in D), collections.Counter(g['t'] for g in D))
B=[(0,10),(10,20),(20,30),(30,40),(40,50),(50,60),(60,100)]
data=[]
for g in D:
    mk,ps=g.get('mk'),g.get('ps')
    if not mk or not ps or g.get('y') is None: continue
    f=0 if mk[0]>=mk[2] else 2; d=2-f
    data.append(dict(t=g['t'],lg=g['lg'],dif=(mk[f]-mk[d])*100,pf=mk[f],pe=mk[1],pd=mk[d],
      of=ps[f],oe=ps[1],od=ps[d],af=g['avg'][f] if g.get('avg') else None,ad=g['avg'][d] if g.get('avg') else None,
      y=0 if g['y']==f else (1 if g['y']==1 else 2),loc='L' if f==0 else 'V'))
print("partidos",len(data))
def st(sel):
    n=len(sel); 
    if not n: return None
    wf=sum(r['y']==0 for r in sel)/n; we=sum(r['y']==1 for r in sel)/n; wd=sum(r['y']==2 for r in sel)/n
    ef=sum(r['pf'] for r in sel)/n; ee=sum(r['pe'] for r in sel)/n; ed=sum(r['pd'] for r in sel)/n
    var=sum(r['pf']*(1-r['pf']) for r in sel); z=(wf-ef)*n/math.sqrt(var)
    rf=sum((r['of']-1) if r['y']==0 else -1 for r in sel)/n
    re=sum((r['oe']-1) if r['y']==1 else -1 for r in sel)/n
    rd=sum((r['od']-1) if r['y']==2 else -1 for r in sel)/n
    sa=[r for r in sel if r['af']]
    raf=sum((r['af']-1) if r['y']==0 else -1 for r in sa)/len(sa) if sa else 0
    return dict(n=n,gana=round(wf*100,1),esp=round(ef*100,1),emp=round(we*100,1),empE=round(ee*100,1),hem=round(wd*100,1),hemE=round(ed*100,1),z=round(z,2),roiF=round(rf*100,1),roiE=round(re*100,1),roiD=round(rd*100,1),roiFavg=round(raf*100,1))
def tabla(sel,tit):
    print("\n==",tit); print("dif    n    fav(esp)       emp(esp)      hem(esp)     z   ROIfav ROIemp ROIhem ROIfav_prom")
    res=[]
    for a,b in B:
        s=st([r for r in sel if a<=r['dif']<b])
        if s:
            s.update(a=a,b=b);res.append(s)
            print(f"{a:>2}-{b:<3}{s['n']:5}  {s['gana']:5.1f}({s['esp']:5.1f})  {s['emp']:5.1f}({s['empE']:5.1f})  {s['hem']:5.1f}({s['hemE']:5.1f}) {s['z']:+.1f} {s['roiF']:+6.1f} {s['roiE']:+6.1f} {s['roiD']:+6.1f} {s['roiFavg']:+6.1f}")
    s=st(sel);print(f"TOTAL{s['n']:6}  {s['gana']:5.1f}({s['esp']:5.1f})  {s['emp']:5.1f}({s['empE']:5.1f})  {s['hem']:5.1f}({s['hemE']:5.1f}) {s['z']:+.1f} {s['roiF']:+6.1f} {s['roiE']:+6.1f} {s['roiD']:+6.1f} {s['roiFavg']:+6.1f}")
    return res
out={'junto':tabla(data,'6 temporadas')}
for t in sorted(set(r['t'] for r in data)): out[t]=tabla([r for r in data if r['t']==t],t)
out['favLocal']=tabla([r for r in data if r['loc']=='L'],'fav local')
out['favVisita']=tabla([r for r in data if r['loc']=='V'],'fav visita')
for lg in sorted(set(r['lg'] for r in data)): out['lg_'+lg]=tabla([r for r in data if r['lg']==lg],lg)
json.dump(out,open('diferencia_futbol_res.json','w'))
