# Fórmula propia de MLB contra OVA y el mercado (nov-2026). Datos: ramas mia-S2021 … mia-S2026 (workflow de la rama medir-mi-formula).
#   for s in S2021 S2022 S2023 S2024 S2025 S2026; do git clone --depth 1 --branch mia-$s https://github.com/osvaldoalvarez0113-source/ODDX datos/mia/$s; done
import json, math, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
R=[]
for y in range(2021,2027):
    for r in json.load(open(f'datos/mia/S{y}/variantes_S{y}.json')):
        r['yr']=y; R.append(r)
def nz(x,d): return d if x is None else x
def shr(v,ip,L,k): return (nz(v,L)*ip+L*k)/(ip+k) if ip else L
def feats(r):
    v=r['v']; L=v['L']; sH,sA,tH,tA=v['sH'],v['sA'],v['tH'],v['tA']
    def sp(s):
        x,h=s['x'],s['h3']; ip=s['ip'] or 0
        fip=shr(s['fip'],ip,L,40)
        kbb=shr(x['kbb'],ip,0.12,60)
        hk=(h['kp']-h['bbp']) if h['kp'] is not None and h['ip']>20 else 0.12
        he=shr(h['era'],h['ip'],L,60) if h['era'] is not None else L
        return [fip,kbb,hk,he,nz(x['ipg'],5.2),min(nz(x['rest'],5),10)]
    def tm(t):
        return [nz(t['rg'],4.4),nz(t['rag'],4.4),math.log(t['py']/(1-t['py'])),nz(t['l10'],.5),min(nz(t['rest'],1),3),t['g7']]
    a=sp(sH); b=sp(sA); c=tm(tH); d=tm(tA)
    era=v['eA']-v['eH']
    f=[era]+[b[i]-a[i] for i in (0,)]+[a[1]-b[1],a[2]-b[2],b[3]-a[3],a[4]-b[4],a[5]-b[5]]+[c[0]-d[0],d[1]-c[1],c[2]-d[2],c[3]-d[3],c[4]-d[4],c[5]-d[5],v['bpA']-v['bpH']]
    return f
NOM=['ERA abridor (OVA)','FIP abridor','K-BB% temporada','K-BB% 3 años','ERA 3 años','Innings por salida','Descanso abridor','Carreras anotadas/j','Carreras permitidas/j','Pitagórico (dif. carreras)','Últimos 10','Descanso equipo','Juegos últimos 7','Bullpen proxy']
X=np.array([feats(r) for r in R]); Y=np.array([r['y'] for r in R]); YR=np.array([r['yr'] for r in R])
P40=np.array([r['v']['P40'] for r in R]); PK=np.array([r['pK'] for r in R])
dH=np.array([r['dH'] for r in R]); dA=np.array([r['dA'] for r in R])
def ll(p,y): p=np.clip(p,1e-6,1-1e-6); return -(y*np.log(p)+(1-y)*np.log(1-p))
def acc(p,y): return np.mean((p>=.5)==(y==1))
lg=lambda p: np.log(p/(1-p))
out={}
tests=[2023,2024,2025,2026]
pm=np.full(len(Y),np.nan); pmk=np.full(len(Y),np.nan)
for t in tests:
    tr=YR<t; te=YR==t
    sc=StandardScaler().fit(X[tr]); m=LogisticRegression(C=0.05,max_iter=2000).fit(sc.transform(X[tr]),Y[tr])
    pm[te]=m.predict_proba(sc.transform(X[te]))[:,1]
    # mercado + mía
    Z=np.column_stack([lg(PK),lg(pm)]) 
    # train mixing on previous seasons using in-sample-of-past predictions: refit model per past season walk-forward is costly; use oof via previous test seasons only
sel=np.isin(YR,tests)
print('Juegos de prueba (2023-2026):',sel.sum())
for nm,p in (('Mercado (cierre sin vig)',PK),('OVA actual (P40)',P40),('Mi fórmula',pm)):
    print(f'{nm:28s} pérdida {ll(p[sel],Y[sel]).mean():.4f}  aciertos {acc(p[sel],Y[sel])*100:.1f}%')
for t in tests:
    s=YR==t; print(t, ' '.join(f'{nm} {ll(p[s],Y[s]).mean():.4f}/{acc(p[s],Y[s])*100:.1f}%' for nm,p in (('MER',PK),('OVA',P40),('MIA',pm))))
# diferencia y error estándar
d=ll(pm[sel],Y[sel])-ll(P40[sel],Y[sel]); print('Mía - OVA: %.4f ± %.4f (z %.1f)'%(d.mean(),d.std()/math.sqrt(len(d)),d.mean()/(d.std()/math.sqrt(len(d)))))
d=ll(pm[sel],Y[sel])-ll(PK[sel],Y[sel]); print('Mía - Mercado: %.4f ± %.4f (z %.1f)'%(d.mean(),d.std()/math.sqrt(len(d)),d.mean()/(d.std()/math.sqrt(len(d)))))
# coeficientes con todo
sc=StandardScaler().fit(X); m=LogisticRegression(C=0.05,max_iter=2000).fit(sc.transform(X),Y)
print('\nPeso de cada dato (estandarizado, todo 2021-2026):')
for n,c in sorted(zip(NOM,m.coef_[0]),key=lambda z:-abs(z[1])): print(f'  {n:28s} {c:+.3f}')
print('local (intercepto)', round(m.intercept_[0],3))
# ¿aporta algo sobre el mercado? regresión logit(y) ~ logit(PK) + (logit(pm)-logit(PK)) walk-forward
pmix=np.full(len(Y),np.nan)
for t in [2024,2025,2026]:
    tr=(YR<t)&(YR>=2023); te=YR==t
    Z=np.column_stack([lg(PK),lg(pm)-lg(PK)])
    mm=LogisticRegression(C=1e6,max_iter=2000).fit(Z[tr],Y[tr]); pmix[te]=mm.predict_proba(Z[te])[:,1]
    print(t,'peso de mi fórmula sobre el mercado',np.round(mm.coef_[0],3))
s2=np.isin(YR,[2024,2025,2026])
for nm,p in (('Mercado',PK),('Mercado+mía',pmix)): print(f'{nm:14s} {ll(p[s2],Y[s2]).mean():.4f} aciertos {acc(p[s2],Y[s2])*100:.1f}%')
d=ll(pmix[s2],Y[s2])-ll(PK[s2],Y[s2]); print('Mezcla - Mercado: %.4f z %.1f'%(d.mean(),d.mean()/(d.std()/math.sqrt(len(d)))))
# aciertos por tramo: favorito de mi fórmula vs mercado
for lo,hi in ((.5,.55),(.55,.6),(.6,.65),(.65,1)):
    for nm,p in (('MER',PK),('OVA',P40),('MIA',pm)):
        pf=np.where(p>=.5,p,1-p); w=np.where(p>=.5,Y,1-Y); s=sel&(pf>=lo)&(pf<hi)
        print(f'  {nm} fav {int(lo*100)}-{int(hi*100)}%: n={s.sum():5d} acertó {w[s].mean()*100:5.1f}%',end='')
    print()


print('\n--- ¿Qué agregar a la fórmula de OVA? (base = ERA abridor, carreras/j, bullpen, local; prueba 2023-2026) ---')
base=[0,7,13]
def wf(cols):
    p=np.full(len(Y),np.nan)
    for t in tests:
        tr=YR<t; te=YR==t
        sc=StandardScaler().fit(X[tr][:,cols]); m=LogisticRegression(C=0.05,max_iter=2000).fit(sc.transform(X[tr][:,cols]),Y[tr])
        p[te]=m.predict_proba(sc.transform(X[te][:,cols]))[:,1]
    return p
pb=wf(base); lb=ll(pb[sel],Y[sel])
print(f'Base recalibrada: {lb.mean():.4f} aciertos {acc(pb[sel],Y[sel])*100:.1f}%')
for k in range(len(NOM)):
    if k in base: continue
    p=wf(base+[k]); d=ll(p[sel],Y[sel])-lb
    print(f'  + {NOM[k]:28s} {d.mean()*1000:+.2f} milésimas  z {d.mean()/(d.std()/math.sqrt(len(d))):+.1f}')
best=base+[2,3,4,9]
p=wf(best); d=ll(p[sel],Y[sel])-lb
print(f'Base + K-BB temp + K-BB 3a + innings/salida + pitagórico: {ll(p[sel],Y[sel]).mean():.4f} ({d.mean()*1000:+.2f}, z {d.mean()/(d.std()/math.sqrt(len(d))):+.1f}) aciertos {acc(p[sel],Y[sel])*100:.1f}%')
for t in tests:
    s=YR==t; print('  ',t, f'{ll(p[s],Y[s]).mean():.4f} vs OVA {ll(P40[s],Y[s]).mean():.4f}')
