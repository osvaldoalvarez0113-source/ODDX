import json, math, numpy as np
from collections import defaultdict
from scipy.stats import norm
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
G=json.load(open('nbamia/juegos_nba.json')); G.sort(key=lambda g:(g['ts'],g['id']))
F={r['id']:r for r in json.load(open('nbamia/filas_nba.json'))}
import datetime
def sk(ts): d=datetime.datetime.utcfromtimestamp(ts/1000); return d.year if d.month>=9 else d.year-1
ELO=defaultdict(lambda:1500.); st={}; rows=[]
for g in G:
    s=sk(g['ts']); h,a=g['h'],g['a']
    for t in (h,a):
        if t not in st or st[t]['s']!=s:
            ELO[t]=1500+(ELO[t]-1500)*0.7; st[t]={'s':s,'g':0,'m':0,'l10':[],'last':None,'gl':[]}
    H,A=st[h],st[a]
    def rest(T): return 4 if not T['last'] else min(4,(g['ts']-T['last'])/864e5)
    def g7(T): return sum(1 for x in T['gl'] if g['ts']-x<=4*864e5)
    if g['id'] in F and H['g']>=5 and A['g']>=5:
        r=F[g['id']]
        if r.get('mlH') and r.get('mlA'):
            f=[(ELO[h]-ELO[a])/100, H['m']/(H['g']+8)-A['m']/(A['g']+8), np.mean(H['l10'])-np.mean(A['l10']),
               rest(H)-rest(A), (rest(H)<1.5)-(rest(A)<1.5), g7(H)-g7(A)]
            i=lambda x: -x/(-x+100) if x<0 else 100/(x+100); q=i(r['mlH']); w=i(r['mlA'])
            pact=norm.cdf(r['V0']['pm']/r['V0']['sM'])
            rows.append(dict(f=f,y=1 if g['hs']>g['as'] else 0,s=s,pk=q/(q+w),pa=pact))
    mov=g['hs']-g['as']; win=1 if mov>0 else 0
    e=1/(1+10**(-(ELO[h]-ELO[a]+(0 if g['n'] else 70))/400)); k=20*((abs(mov)+3)**0.8)/(7.5+0.006*abs(ELO[h]-ELO[a]))
    ELO[h]+=k*(win-e); ELO[a]-=k*(win-e)
    for T,m in ((H,mov),(A,-mov)):
        T['g']+=1;T['m']+=m;T['l10'].append(m);T['l10']=T['l10'][-10:];T['last']=g['ts'];T['gl'].append(g['ts'])
NOM=['Elo con margen','Margen por juego','Margen últimos 10','Descanso','Back-to-back','Juegos en 4 días']
X=np.array([r['f'] for r in rows]); Y=np.array([r['y'] for r in rows]); S=np.array([r['s'] for r in rows]); PK=np.array([r['pk'] for r in rows]); PA=np.clip(np.array([r['pa'] for r in rows]),1e-4,1-1e-4)
ll=lambda p,y: -(y*np.log(p)+(1-y)*np.log(1-p)); acc=lambda p,y: np.mean((p>=.5)==(y==1))
tests=[2021,2022,2023,2024,2025]; pm=np.full(len(Y),np.nan)
for t in tests:
    tr=S<t; te=S==t; sc=StandardScaler().fit(X[tr]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[tr]),Y[tr]); pm[te]=m.predict_proba(sc.transform(X[te]))[:,1]
sel=np.isin(S,tests); dd=ll(pm[sel],Y[sel])-ll(PA[sel],Y[sel])
print(f'NBA n={sel.sum()} mía {ll(pm[sel],Y[sel]).mean():.4f} actual {ll(PA[sel],Y[sel]).mean():.4f} mercado {ll(PK[sel],Y[sel]).mean():.4f} | z {dd.mean()/(dd.std()/math.sqrt(len(dd))):.1f} | aciertos {acc(pm[sel],Y[sel])*100:.1f}/{acc(PA[sel],Y[sel])*100:.1f}/{acc(PK[sel],Y[sel])*100:.1f}')
for t in tests: q=S==t; print('  ',t,f'{ll(pm[q],Y[q]).mean():.4f} vs {ll(PA[q],Y[q]).mean():.4f} (mercado {ll(PK[q],Y[q]).mean():.4f}) aciertos {acc(pm[q],Y[q])*100:.1f}/{acc(PA[q],Y[q])*100:.1f}')
sc=StandardScaler().fit(X); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X),Y); print('  pesos:',', '.join(f'{n} {w:+.2f}' for n,w in zip(NOM,m.coef_[0])))
