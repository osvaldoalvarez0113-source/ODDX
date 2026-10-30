import json,math,sys
rows=[]
for s in (2024,2025,2026):
    for g in json.load(open(f'datos/var-S{s}/variantes_S{s}.json')):
        if g.get('dH') and g.get('dA') and g.get('pK') is not None:
            rows.append((s,g))
print("juegos",len(rows))
B=[(0,4),(4,8),(8,12),(12,16),(16,20),(20,25),(25,30),(30,40),(40,100)]
def stats(sel):
    n=len(sel)
    if not n: return None
    w=sum(r['favwin'] for r in sel); exp=sum(r['pf'] for r in sel)
    rf=sum((r['of']-1) if r['favwin'] else -1 for r in sel)
    rd=sum((r['od']-1) if not r['favwin'] else -1 for r in sel)
    var=sum(r['pf']*(1-r['pf']) for r in sel)
    z=(w-exp)/math.sqrt(var) if var else 0
    return n,w/n,exp/n,rf/n,rd/n,z
out={}
data=[]
for s,g in rows:
    pH=g['pK']; pA=1-pH
    if pH>=pA: pf,of,od,fw=pH,g['dH'],g['dA'],g['y']==1; loc='L'
    else: pf,of,od,fw=pA,g['dA'],g['dH'],g['y']==0; loc='V'
    data.append(dict(s=s,pf=pf,dif=(2*pf-1)*100,of=of,od=od,favwin=fw,loc=loc))
def tabla(sel,tit):
    print("\n==",tit)
    print("dif     n   gana_fav  esperado  z    ROI_fav  ROI_dog")
    res=[]
    for a,b in B:
        st=stats([r for r in sel if a<=r['dif']<b])
        if st:
            n,wr,ex,rf,rd,z=st
            print(f"{a:>2}-{b:<3} {n:5} {wr*100:6.1f}%  {ex*100:6.1f}%  {z:+.1f}  {rf*100:+6.1f}% {rd*100:+6.1f}%")
            res.append(dict(a=a,b=b,n=n,gana=round(wr*100,1),esp=round(ex*100,1),z=round(z,2),roiF=round(rf*100,1),roiD=round(rd*100,1)))
    st=stats(sel);n,wr,ex,rf,rd,z=st
    print(f"TOTAL  {n:5} {wr*100:6.1f}%  {ex*100:6.1f}%  {z:+.1f}  {rf*100:+6.1f}% {rd*100:+6.1f}%")
    return res
out['junto']=tabla(data,"3 temporadas")
for s in (2024,2025,2026): out[str(s)]=tabla([r for r in data if r['s']==s],str(s))
out['favLocal']=tabla([r for r in data if r['loc']=='L'],"favorito LOCAL")
out['favVisita']=tabla([r for r in data if r['loc']=='V'],"favorito VISITANTE")
json.dump(out,open('diferencia_res.json','w'))
