import json, math, numpy as np
from collections import defaultdict
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
d=json.load(open('partidos_futbol.json')); d.sort(key=lambda r:r['d'])
ELO=defaultdict(lambda:1500.); st={}
rows=[]
for r in d:
    key=r['lg']; h=(key,r['h']); a=(key,r['a']); s=r['t']
    for t in (h,a):
        if t not in st or st[t]['s']!=s:
            ELO[t]=1500+(ELO[t]-1500)*0.75 if t in st else 1450.
            st[t]={'s':s,'g':0,'gf':0,'ga':0,'pts':[],'sh':0}
    H,A=st[h],st[a]
    if r.get('F3') and r.get('mk') and H['g']>=4 and A['g']>=4:
        f3=np.clip(r['F3'],1e-4,1)
        f=[ (ELO[h]-ELO[a])/100, (H['gf']-H['ga'])/(H['g']+6)-(A['gf']-A['ga'])/(A['g']+6),
            (np.mean(H['pts'][-6:]))-(np.mean(A['pts'][-6:])),
            math.log(f3[0]/f3[2]), math.log(f3[1]/(1-f3[1])),
            H['gf']/(H['g']+6)+A['ga']/(A['g']+6), A['gf']/(A['g']+6)+H['ga']/(H['g']+6)]
        rows.append(dict(f=f,y=r['y'],s=s,F3=f3/np.sum(f3),mk=np.array(r['mk'])))
    gd=r['gh']-r['ga']; res=1 if gd>0 else (0.5 if gd==0 else 0)
    e=1/(1+10**(-(ELO[h]-ELO[a]+65)/400)); k=20*(1+abs(gd))**0.5
    ELO[h]+=k*(res-e); ELO[a]-=k*(res-e)
    for T,gf,ga in ((H,r['gh'],r['ga']),(A,r['ga'],r['gh'])):
        T['g']+=1;T['gf']+=gf;T['ga']+=ga;T['pts'].append(3 if gf>ga else (1 if gf==ga else 0))
X=np.array([r['f'] for r in rows]); Y=np.array([r['y'] for r in rows]); S=np.array([r['s'] for r in rows])
F3=np.array([r['F3'] for r in rows]); MK=np.array([r['mk'] for r in rows])
ll=lambda P: -np.log(np.clip(P[np.arange(len(Y)),Y],1e-9,1))
acc=lambda P,m: np.mean(P[m].argmax(1)==Y[m])
pm=np.full((len(Y),3),np.nan); tests=['2223','2324','2425','2526']
for cols,nm in (([0,1,2,5,6],'Mía sin el modelo actual'),([0,1,2,3,4,5,6],'Mía (incluye el DC actual)')):
    pm=np.full((len(Y),3),np.nan)
    for t in tests:
        tr=S<t; te=S==t
        sc=StandardScaler().fit(X[tr][:,cols]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[tr][:,cols]),Y[tr])
        pm[te]=m.predict_proba(sc.transform(X[te][:,cols]))
    sel=np.isin(S,tests)
    lm,lf,lk=ll(pm),ll(F3),ll(MK)
    dd=(lm-lf)[sel]
    print(f'{nm}: {lm[sel].mean():.4f} | actual {lf[sel].mean():.4f} | mercado {lk[sel].mean():.4f} | mía-actual {dd.mean():+.4f} z {dd.mean()/(dd.std()/math.sqrt(len(dd))):.1f} | aciertos {acc(pm,sel)*100:.1f}/{acc(F3,sel)*100:.1f}/{acc(MK,sel)*100:.1f}')
    for t in tests:
        s=S==t; print('   ',t,f'{lm[s].mean():.4f} vs {lf[s].mean():.4f} (mercado {lk[s].mean():.4f})')
