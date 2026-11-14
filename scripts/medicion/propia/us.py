import json, math, sys, numpy as np
from collections import defaultdict
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
dep=sys.argv[1]
D=json.load(open(f'/home/claude/oddx/datos-{dep}.json'))
G=[g for t in D['temps'].values() for g in t['juegos'] if g.get('done') and g.get('hs') is not None]
G.sort(key=lambda g:g['ts'])
shots={}
if dep=='nhl':
    for r in json.load(open('/home/claude/oddx/hist-nhl.json'))['g']:
        if len(r)>10 and r[9] and r[10]: shots[str(r[0])]=(r[9],r[10])
PRED={r['id']:r for r in json.load(open(f'pred-{dep}.json'))}
def season(ts):
    import datetime; d=datetime.datetime.utcfromtimestamp(ts/1000)
    return d.year if d.month>=8 else d.year-1
# estado
ELO=defaultdict(lambda:1500.0); LASTS=None
st=defaultdict(lambda:{'g':0,'gf':0,'ga':0,'l10':[],'last':None,'s':None,'sf':0,'sa':0,'ns':0})
Kel={'nhl':6,'nfl':20}[dep]; HA={'nhl':30,'nfl':48}[dep]
rows=[]
def sh(x,n,k,prior=0): return (x*n+prior*k)/(n+k)
for g in G:
    s=season(g['ts']); h,a=g['h'],g['a']
    for t in (h,a):
        T=st[t]
        if T['s']!=s:
            ELO[t]=1500+(ELO[t]-1500)*0.6
            T.update({'g':0,'gf':0,'ga':0,'l10':[],'s':s,'sf':0,'sa':0,'ns':0})
    H,A=st[h],st[a]
    def rest(T):
        if not T['last']: return 7
        return min(10,(g['ts']-T['last'])/864e5)
    kn={'nhl':15,'nfl':4}[dep]
    f=[ (ELO[h]-ELO[a])/100,
        sh((H['gf']-H['ga']),1,0)/max(H['g'],1)*H['g']/(H['g']+kn) - sh((A['gf']-A['ga']),1,0)/max(A['g'],1)*A['g']/(A['g']+kn),
        (np.mean(H['l10']) if H['l10'] else 0)-(np.mean(A['l10']) if A['l10'] else 0),
        min(rest(H),4)-min(rest(A),4),
        (1 if rest(H)<1.5 else 0)-(1 if rest(A)<1.5 else 0),
        ((H['sf']-H['sa'])/(H['ns']+20) - (A['sf']-A['sa'])/(A['ns']+20)) if dep=='nhl' else 0,
        (H['gf']/(H['g']+kn) - A['gf']/(A['g']+kn)),
        0 if g.get('neutral') else 1]
    win=1 if g['hs']>g['as'] else 0
    P=PRED.get(g['id'])
    if g.get('ty')==2 and H['g']>={'nhl':10,'nfl':4}[dep] and A['g']>={'nhl':10,'nfl':4}[dep]:
        rows.append(dict(f=f,y=win,s=s,id=g['id'],P=P))
    # actualizar
    mov=g['hs']-g['as']
    exp=1/(1+10**(-(ELO[h]-ELO[a]+(0 if g.get('neutral') else HA))/400))
    mult=math.log(abs(mov)+1)*2.2/((abs(ELO[h]-ELO[a])*0.001)+2.2)
    d=Kel*mult*(win-exp); ELO[h]+=d; ELO[a]-=d
    for T,gf,ga in ((H,g['hs'],g['as']),(A,g['as'],g['hs'])):
        T['g']+=1;T['gf']+=gf;T['ga']+=ga;T['l10'].append(1 if gf>ga else 0);T['l10']=T['l10'][-10:];T['last']=g['ts']
    if g['id'] in shots:
        sH,sA=shots[g['id']]; H['sf']+=sH;H['sa']+=sA;H['ns']+=1;A['sf']+=sA;A['sa']+=sH;A['ns']+=1
NOM=['Elo con margen','Dif. goles/pts por juego','Últimos 10','Descanso','Back-to-back','Tiros a puerta','Ataque','Local']
X=np.array([r['f'] for r in rows]); Y=np.array([r['y'] for r in rows]); S=np.array([r['s'] for r in rows])
has=np.array([r['P'] is not None for r in rows])
def nv(ml):
    i=lambda a: -a/(-a+100) if a<0 else 100/(a+100)
    x,y=i(ml[0]),i(ml[1]); return x/(x+y)
PM=np.array([r['P']['p'] if r['P'] else np.nan for r in rows]); PK=np.array([nv(r['P']['ml']) if r['P'] else np.nan for r in rows])
ll=lambda p,y: -(y*np.log(np.clip(p,1e-6,1))+(1-y)*np.log(np.clip(1-p,1e-6,1)))
acc=lambda p,y: np.mean((p>=.5)==(y==1))
tests=sorted(set(S[has])); pm=np.full(len(Y),np.nan)
cols=[0,1,2,3,4,5,6] if dep=='nhl' else [0,1,2,3,6]
for t in tests:
    tr=S<t; te=(S==t)
    if tr.sum()<200: continue
    sc=StandardScaler().fit(X[tr][:,cols]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[tr][:,cols]),Y[tr])
    pm[te]=m.predict_proba(sc.transform(X[te][:,cols]))[:,1]
sel=has&~np.isnan(pm)
print(dep.upper(),'juegos de prueba',sel.sum(),'temporadas',sorted(set(S[sel])))
for nm,p in (('Mercado',PK),('Actual',PM),('Mía',pm)): print(f'  {nm:8s} pérdida {ll(p[sel],Y[sel]).mean():.4f} aciertos {acc(p[sel],Y[sel])*100:.1f}%')
d=ll(pm[sel],Y[sel])-ll(PM[sel],Y[sel]); print('  Mía-Actual %+.4f z %.1f'%(d.mean(),d.mean()/(d.std()/math.sqrt(len(d)))))
for t in sorted(set(S[sel])):
    s=sel&(S==t); print('   ',t,s.sum(),f'MER {ll(PK[s],Y[s]).mean():.4f} ACT {ll(PM[s],Y[s]).mean():.4f} MÍA {ll(pm[s],Y[s]).mean():.4f} | aciertos {acc(PK[s],Y[s])*100:.1f}/{acc(PM[s],Y[s])*100:.1f}/{acc(pm[s],Y[s])*100:.1f}')
sc=StandardScaler().fit(X[:,cols]); m=LogisticRegression(C=0.1,max_iter=3000).fit(sc.transform(X[:,cols]),Y)
print('  pesos:',', '.join(f'{NOM[c]} {w:+.3f}' for c,w in zip(cols,m.coef_[0])))
# mezcla con mercado
from sklearn.linear_model import LogisticRegression as LR
lg=lambda p: np.log(p/(1-p))
Z=np.column_stack([lg(PK),lg(pm)-lg(PK)]); pmx=np.full(len(Y),np.nan); ts=sorted(set(S[sel]))
for t in ts[1:]:
    tr=sel&(S<t); te=sel&(S==t); mm=LR(C=1e6).fit(Z[tr],Y[tr]); pmx[te]=mm.predict_proba(Z[te])[:,1]
s2=sel&~np.isnan(pmx); d=ll(pmx[s2],Y[s2])-ll(PK[s2],Y[s2]); print('  mercado+mía vs mercado %+.4f z %.1f'%(d.mean(),d.mean()/(d.std()/math.sqrt(len(d)))))
np.save(f'mia-{dep}.npy',np.column_stack([pm,PM,PK,Y,S]))
