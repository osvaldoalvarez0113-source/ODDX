import json, math, numpy as np, datetime
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
d=json.load(open('preds-tenis.json')); rng=np.random.default_rng(1)
R=[]
for r in d:
    if r.get('fin')!='F' or r['pW'] is None: continue
    fW,fL=r['fW'],r['fL']; flip=rng.random()<.5
    A,B=(fW,fL) if not flip else (fL,fW); p=r['pW'] if not flip else 1-r['pW']; y=0 if flip else 1
    nA,nB=(r['nW'],r['nL']) if not flip else (r['nL'],r['nW'])
    h=r['h2h'] if not flip else r['h2h'][::-1]
    lg=lambda q: math.log(q/(1-q))
    pc=min(max(p,1e-4),1-1e-4)
    f=[lg(pc),(A['all']-B['all'])/100,(A['sup']-B['sup'])/100,(A.get('pico',A['all'])-B.get('pico',B['all']))/100,
       (A.get('v10',0)/max(A.get('n10',0),1))-(B.get('v10',0)/max(B.get('n10',0),1)),
       min(A['dias'] if A['dias'] is not None else 30,30)-min(B['dias'] if B['dias'] is not None else 30,30),(A.get('gPrev') or 0)-(B.get('gPrev') or 0),(A.get('setsPrev') or 0)-(B.get('setsPrev') or 0),
       math.log(nA+1)-math.log(nB+1),(h[0]-h[1])/(h[0]+h[1]+2)]
    R.append(dict(f=f,y=y,p=pc,yr=datetime.datetime.utcfromtimestamp(r['ts']).year,tour=r['tour'],bo5=r['bo5']))
NOM=['Modelo actual','Elo general','Elo superficie','Elo pico','Últimos 10','Días sin jugar','Games previos (cansancio)','Sets previos','Experiencia','Cara a cara']
X=np.array([r['f'] for r in R]); Y=np.array([r['y'] for r in R]); YR=np.array([r['yr'] for r in R]); P=np.array([r['p'] for r in R])
print('años',{y:int((YR==y).sum()) for y in sorted(set(YR))})
ll=lambda p,y: -(y*np.log(p)+(1-y)*np.log(1-p)); acc=lambda p,y: np.mean((p>=.5)==(y==1))
tests=[2025,2026]
for cols,nm in (([1,2,3,4,5,6,7,8,9],'Mía sin el actual'),(list(range(10)),'Mía + actual')):
    pm=np.full(len(Y),np.nan)
    for t in tests:
        tr=YR<t; te=YR==t; sc=StandardScaler().fit(X[tr][:,cols]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[tr][:,cols]),Y[tr]); pm[te]=m.predict_proba(sc.transform(X[te][:,cols]))[:,1]
    s=np.isin(YR,tests); dd=ll(pm[s],Y[s])-ll(P[s],Y[s])
    print(f'{nm}: {ll(pm[s],Y[s]).mean():.4f} vs actual {ll(P[s],Y[s]).mean():.4f} z {dd.mean()/(dd.std()/math.sqrt(len(dd))):.1f} | aciertos {acc(pm[s],Y[s])*100:.1f} vs {acc(P[s],Y[s])*100:.1f} (n {s.sum()})')
    for t in tests: q=YR==t; print('   ',t,f'{ll(pm[q],Y[q]).mean():.4f} vs {ll(P[q],Y[q]).mean():.4f} aciertos {acc(pm[q],Y[q])*100:.1f} vs {acc(P[q],Y[q])*100:.1f}')
    sc=StandardScaler().fit(X[:,cols]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[:,cols]),Y)
    print('   pesos:',', '.join(f'{NOM[c]} {w:+.2f}' for c,w in zip(cols,m.coef_[0])))
