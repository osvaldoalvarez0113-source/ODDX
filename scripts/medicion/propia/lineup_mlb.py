import numpy as np, math
from collections import defaultdict
exec(open('mia.py').read().split("out={}")[0])
from sklearn.linear_model import LogisticRegression as LRg
# ordenar por fecha para la "normal" del equipo
idx=sorted(range(len(R)),key=lambda i:R[i]['f'])
run=defaultdict(list); q=np.zeros((len(R),4)); ok=np.zeros(len(R),bool)
for i in idx:
    v=R[i]['v']; lu=v.get('lu'); y=R[i]['yr']
    if not lu or not lu['h'] or not lu['a']: continue
    kh=(y,v['hId']); ka=(y,v['aId'])
    nh=np.mean(run[kh][-30:]) if len(run[kh])>=5 else lu['h']['q']; na=np.mean(run[ka][-30:]) if len(run[ka])>=5 else lu['a']['q']
    q[i]=[lu['h']['q'],lu['a']['q'],nh,na]; ok[i]=True
    run[kh].append(lu['h']['q']); run[ka].append(lu['a']['q'])
LQ=np.column_stack([(q[:,0]-q[:,1])*10,((q[:,0]-q[:,2])-(q[:,1]-q[:,3]))*10])
base=X[:,[0,7,13,2,3]]
k=0.24
def wf(F):
    p=np.full(len(Y),np.nan)
    for t in [2022,2023,2024,2025,2026]:
        tr=(YR<t)&ok; te=(YR==t)&ok
        m=LRg(C=1e6,max_iter=5000).fit(F[tr],Y[tr]); p[te]=m.predict_proba(F[te])[:,1]
    return p
p0=wf(base); p1=wf(np.column_stack([base,LQ[:,1]])); p2=wf(np.column_stack([base,LQ]))
s=ok&np.isin(YR,[2022,2023,2024,2025,2026])
for nm,p in (('fórmula nueva',p0),('+ lineup de hoy vs su normal',p1),('+ lineup de hoy completo',p2),('mercado',PK)):
    print(f'{nm:30s} {ll(p[s],Y[s]).mean():.4f} aciertos {acc(p[s],Y[s])*100:.1f}%')
for nm,p in (('vs normal',p1),('completo',p2)):
    d=ll(p[s],Y[s])-ll(p0[s],Y[s]); print(nm,'mejora %.2f milésimas z %.1f'%(d.mean()*1000,d.mean()/(d.std()/math.sqrt(len(d)))))
    for t in [2022,2023,2024,2025,2026]:
        q_=s&(YR==t); print('   ',t,'%.4f vs %.4f'%(ll(p[q_],Y[q_]).mean(),ll(p0[q_],Y[q_]).mean()))
# cuánto se mueve el mercado con el lineup: residuo del mercado vs fórmula
lg=lambda p: np.log(p/(1-p))
res=lg(PK)-lg(np.clip(p0,1e-3,1-1e-3))
print('corr(residuo del mercado, lineup vs normal) %.3f'%np.corrcoef(res[s],LQ[s,1])[0,1])
m=LRg(C=1e6,max_iter=5000).fit(np.column_stack([base,LQ])[ok],Y[ok]); c=m.coef_[0]
print('pesos en carreras:',np.round(c/k,3),'local',round(m.intercept_[0]/k,3))
d=np.abs(LQ[ok,1])/10; print('lineup vs normal: diferencia típica %.3f OPS, 90%% de juegos < %.3f'%(np.median(d),np.percentile(d,90)))
for W_ in (10,):
    run=defaultdict(list); L2=np.zeros(len(R))
    for i in idx:
        v=R[i]['v']; lu=v.get('lu'); y=R[i]['yr']
        if not ok[i]: continue
        kh=(y,v['hId']); ka=(y,v['aId'])
        nh=np.mean(run[kh][-W_:]) if len(run[kh])>=3 else lu['h']['q']; na=np.mean(run[ka][-W_:]) if len(run[ka])>=3 else lu['a']['q']
        L2[i]=((lu['h']['q']-nh)-(lu['a']['q']-na))*10
        run[kh].append(lu['h']['q']); run[ka].append(lu['a']['q'])
    p3=wf(np.column_stack([base,L2])); d=ll(p3[s],Y[s])-ll(p0[s],Y[s])
    print('normal = últimos',W_,'%.4f z %.1f aciertos %.1f'%(ll(p3[s],Y[s]).mean(),d.mean()/(d.std()/math.sqrt(len(d))),acc(p3[s],Y[s])*100))
    for t in [2022,2023,2024,2025,2026]:
        q_=s&(YR==t); print('   ',t,'%.4f vs %.4f'%(ll(p3[q_],Y[q_]).mean(),ll(p0[q_],Y[q_]).mean()))
    m=LRg(C=1e6,max_iter=5000).fit(np.column_stack([base,L2])[ok],Y[ok]); print('   pesos',np.round(m.coef_[0]/k,3),round(m.intercept_[0]/k,3))
m=LRg(C=1e6,max_iter=5000).fit(np.column_stack([base,LQ[:,1]])[ok],Y[ok]); print('pesos (normal 30):',np.round(m.coef_[0]/k,3),round(m.intercept_[0]/k,3))
v=LQ[:,1]
for lo,hi in ((-9,-0.3),(-0.3,-0.1),(-0.1,0.1),(0.1,0.3),(0.3,9)):
    m_=ok&(v>=lo)&(v<hi); print(f'lineup local vs normal {lo:+.1f}..{hi:+.1f} (x0.1 OPS): n={m_.sum()} local ganó {Y[m_].mean()*100:.1f}%  mercado daba {PK[m_].mean()*100:.1f}%  fórmula {p0[m_][~np.isnan(p0[m_])].mean()*100:.1f}%')
print('corr con dif de ERA', np.corrcoef(v[ok],X[ok,0])[0,1], 'con rg', np.corrcoef(v[ok],X[ok,7])[0,1])
