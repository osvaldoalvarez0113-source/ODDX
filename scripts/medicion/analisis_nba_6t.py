# NBA (2020-21 a 2025-26, DraftKings/ESPN): modelo del app (V0) contra el moneyline, peso óptimo de la mezcla, ROI y calibración.
# Datos: rama resultados-nba-6t (filas_nba.json), la escribe el workflow nba-6t.yml de la rama nba-6t (scripts/correr_deportes.js nba con TEMPS_NBA=2020…2025, NBA_SKMIN=2019, VOLCAR_PARTIDOS=1).
# Uso:  python3 -I scripts/medicion/analisis_nba_6t.py filas_nba.json
import json, math, sys
import numpy as np
from math import erf, sqrt, log, exp
r=json.load(open(sys.argv[1]))
def Phi(x): return 0.5*(1+erf(x/sqrt(2)))
def pML(pm,s):
    h=1-Phi((0.5-pm)/s); a=Phi((-0.5-pm)/s); return h/(h+a)
def imp(a): return (-a)/((-a)+100) if a<0 else 100/(a+100)
def dec(a): return 1+100/(-a) if a<0 else 1+a/100
def logit(p): p=min(max(p,1e-4),1-1e-4); return log(p/(1-p))
def sig(z): return 1/(1+exp(-z))
R=[]
for x in r:
    if x['mlH'] is None or x['mlA'] is None: continue
    iH,iA=imp(x['mlH']),imp(x['mlA']); pk=iH/(iH+iA)
    pm=pML(x['V0']['pm'],x['V0']['sM']); pm=min(max(pm,.02),.98)
    R.append(dict(sk=x['sk'],y=1 if x['mar']>0 else 0,pk=pk,pm=pm,dH=dec(x['mlH']),dA=dec(x['mlA']),vig=iH+iA-1))
print('juegos con moneyline',len(R),'vig medio %.1f%%'%(100*np.mean([x['vig'] for x in R])))
seasons=sorted(set(x['sk'] for x in R))
def L(p,y): return -log(p if y else 1-p)
print('\n1) pérdida log por temporada: modelo (app sola) vs mercado')
for s in seasons+['TODAS']:
    rr=[x for x in R if s=='TODAS' or x['sk']==s]
    d=[L(x['pm'],x['y'])-L(x['pk'],x['y']) for x in rr]; se=np.std(d,ddof=1)/sqrt(len(d))
    print(s,len(rr),'modelo %.4f mercado %.4f dif %+.4f (z %.1f)'%(np.mean([L(x['pm'],x['y']) for x in rr]),np.mean([L(x['pk'],x['y']) for x in rr]),np.mean(d),np.mean(d)/se))
print('\n2) peso óptimo w (logit) fuera de muestra, y curva')
Ws=[i/40 for i in range(0,41)]
def pb(x,w): return sig(logit(x['pk'])+w*(logit(x['pm'])-logit(x['pk'])))
tot=[];lams=[]
for s in seasons:
    tr=[x for x in R if x['sk']!=s]; te=[x for x in R if x['sk']==s]
    bw=min(Ws,key=lambda w:np.mean([L(pb(x,w),x['y']) for x in tr])); lams.append('%s:%.3f'%(s,bw))
    tot+=[L(pb(x,bw),x['y'])-L(x['pk'],x['y']) for x in te]
print(' '.join(lams),'dif %+.5f ± %.5f'%(np.mean(tot),2*np.std(tot,ddof=1)/sqrt(len(tot))))
print(' curva:',' '.join('%.2f:%+.5f'%(w,np.mean([L(pb(x,w),x['y'])-L(x['pk'],x['y']) for x in R])) for w in [0,.025,.05,.1,.2,.3,.5,1]))
print('\n3) ROI apostando el lado donde el MODELO SOLO ve ventaja (cuota DK real con vig)')
def bets(R,pfun,thr):
    out=[]
    for x in R:
        p=pfun(x)
        for side in (1,0):
            ps=p if side else 1-p; ref=x['pk'] if side else 1-x['pk']; o=x['dH'] if side else x['dA']
            if (ps-ref)>=thr: out.append((o-1 if x['y']==side else -1, x['sk'], ps*o-1))
    return out
for nom,pf in [('modelo solo',lambda x:x['pm']),('mezcla app 95/5',lambda x:pb(x,.05)),('mezcla 80/20',lambda x:pb(x,.2))]:
    print(nom)
    for thr in [.01,.03,.05,.08]:
        b=bets(R,pf,thr)
        if not b: print('  >=%d pts: 0 apuestas'%(thr*100)); continue
        q=[z[0] for z in b]; se=np.std(q,ddof=1)/sqrt(len(q)) if len(q)>1 else 0
        per=' | '.join('%s %d ap %+.1f%%'%(s,len([z for z in b if z[1]==s]),100*np.mean([z[0] for z in b if z[1]==s]) if any(z[1]==s for z in b) else 0) for s in seasons)
        print('  >=%d pts: %d ap, ROI %+.1f%% ± %.1f (EV prometido medio %+.1f%%) | %s'%(thr*100,len(q),100*np.mean(q),200*se,100*np.mean([z[2] for z in b]),per))
print('\n4) calibración')
for nom,k in [('mercado','pk'),('modelo','pm')]:
    out=[]
    for lo,hi in [(0,.2),(.2,.35),(.35,.5),(.5,.65),(.65,.8),(.8,1.01)]:
        pp=[x[k] for x in R if lo<=x[k]<hi]; yy=[x['y'] for x in R if lo<=x[k]<hi]
        out.append('%d-%d%%: n=%d pred %.1f real %.1f'%(lo*100,min(hi,1)*100,len(pp),100*np.mean(pp),100*np.mean(yy)))
    print(nom,'|',' | '.join(out))
print('\n5) favorito y ROI "ciego" (apostar siempre al favorito / al perro, cuota DK)')
for nom,sel in [('favorito',lambda x:1 if x['pk']>=.5 else 0),('perro',lambda x:0 if x['pk']>=.5 else 1)]:
    q=[(x['dH']-1 if x['y']==1 else -1) if sel(x)==1 else (x['dA']-1 if x['y']==0 else -1) for x in R]
    print(nom,len(q),'ROI %+.1f%% ± %.1f'%(100*np.mean(q),200*np.std(q,ddof=1)/sqrt(len(q))))
