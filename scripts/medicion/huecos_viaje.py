import json,math,sys
from collections import defaultdict
import numpy as np
S=sys.argv[1]
C={ # lat,lon,huso (offset ET),altitud m
'nhl':{'ANA':(33.8,-117.9,3,50),'ARI':(33.4,-112,2,300),'UTAH':(40.8,-111.9,2,1300),'BOS':(42.4,-71.1,0,5),'BUF':(42.9,-78.9,0,180),'CGY':(51,-114,2,1050),'CAR':(35.8,-78.6,0,100),'CHI':(41.9,-87.7,1,180),'COL':(39.7,-105,2,1600),'CBJ':(40,-83,0,240),'DAL':(32.8,-96.8,1,130),'DET':(42.3,-83,0,180),'EDM':(53.5,-113.5,2,650),'FLA':(26.2,-80.3,0,3),'LA':(34,-118.3,3,70),'MIN':(45,-93.1,1,250),'MON':(45.5,-73.6,0,30),'NSH':(36.2,-86.8,1,170),'NJ':(40.7,-74.2,0,10),'NYI':(40.7,-73.7,0,20),'NYR':(40.75,-74,0,10),'OTT':(45.3,-75.9,0,90),'PHI':(39.9,-75.2,0,10),'PIT':(40.4,-80,0,300),'SJ':(37.3,-121.9,3,25),'SEA':(47.6,-122.3,3,50),'STL':(38.6,-90.2,1,150),'TB':(27.9,-82.5,0,5),'TOR':(43.6,-79.4,0,80),'VAN':(49.3,-123.1,3,5),'VGK':(36.1,-115.2,3,600),'WSH':(38.9,-77,0,20),'WPG':(49.9,-97.1,1,240)},
'nfl':{'ARI':(33.5,-112.3,2,330),'ATL':(33.8,-84.4,0,300),'BAL':(39.3,-76.6,0,10),'BUF':(42.8,-78.8,0,180),'CAR':(35.2,-80.9,0,220),'CHI':(41.9,-87.6,1,180),'CIN':(39.1,-84.5,0,150),'CLE':(41.5,-81.7,0,180),'DAL':(32.7,-97.1,1,170),'DEN':(39.7,-105,2,1600),'DET':(42.3,-83,0,180),'GB':(44.5,-88,1,200),'HOU':(29.7,-95.4,1,15),'IND':(39.8,-86.2,0,220),'JAX':(30.3,-81.6,0,5),'KC':(39,-94.5,1,250),'LV':(36.1,-115.2,3,600),'OAK':(37.75,-122.2,3,5),'LAC':(33.95,-118.3,3,30),'SD':(32.8,-117.1,3,30),'LAR':(33.95,-118.3,3,30),'STL':(38.6,-90.2,1,150),'MIA':(25.96,-80.2,0,3),'MIN':(45,-93.3,1,250),'NE':(42.1,-71.3,0,90),'NO':(30,-90.1,1,1),'NYG':(40.8,-74.1,0,5),'NYJ':(40.8,-74.1,0,5),'PHI':(39.9,-75.2,0,10),'PIT':(40.4,-80,0,230),'SF':(37.4,-122,3,5),'SEA':(47.6,-122.3,3,5),'TB':(27.98,-82.5,0,5),'TEN':(36.2,-86.8,1,130),'WSH':(38.9,-76.9,0,50)}}
def km(a,b):
    p=math.pi/180;d=math.sin((b[0]-a[0])*p/2)**2+math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2;return 12742*math.asin(math.sqrt(d))
def impl(a): return 100/(a+100) if a>0 else -a/(-a+100)
def ols(y,X):
    X=np.column_stack([np.ones(len(y)),X]);b=np.linalg.lstsq(X,y,rcond=None)[0];r=y-X@b;se=np.sqrt(np.diag(np.linalg.inv(X.T@X))*(r@r)/(len(y)-X.shape[1]));return b[1:],se[1:]
def logit_fit(y,off,x):
    a=0.;c=0.
    for _ in range(25):
        z=off+a+c*x;p=1/(1+np.exp(-z));W=p*(1-p);g=np.array([(y-p).sum(),((y-p)*x).sum()]);H=np.array([[W.sum(),(W*x).sum()],[(W*x).sum(),(W*x*x).sum()]]);d=np.linalg.solve(H,g);a+=d[0];c+=d[1]
    return c,1/np.sqrt(np.linalg.inv(H)[1,1])**-1 if False else np.sqrt(np.linalg.inv(H)[1,1])
def run(dep):
    d=json.load(open(dep_f[dep]));J=[]
    for s,T in d['temps'].items():
        for g in T['juegos']:
            if g.get('done') and not g.get('skip'): g['_s']=int(s);J.append(g)
    J.sort(key=lambda g:g['ts']);C0=C[dep];last={};F=[];loc={}
    for g in J:
        h,a=g['abH'],g['abA']
        if h not in C0 or a not in C0: continue
        here=C0[h]
        f=[]
        for t in (h,a):
            pl=last.get(t)
            if pl and g['ts']-pl[1]<20*864e5: f.append((km(pl[0],here),(pl[0][2]-here[2]),(g['ts']-pl[1])/864e5))
            else: f.append(None)
        last[h]=(here,g['ts']);last[a]=(here,g['ts'])
        l=g.get('linea')
        if not(l and f[0] and f[1] and l.get('ml') and g.get('ty',2)==2): continue
        if g.get('neutral'): continue
        pH=impl(l['ml'][0]);pA=impl(l['ml'][1]);pk=pH/(pH+pA)
        if not(.03<pk<.97): continue
        F.append(dict(s=g['_s'],y=1 if g['hs']>g['as'] else 0,mk=pk,mar=g['hs']-g['as'],sp=l.get('sp'),tot=g['hs']+g['as'],lt=l.get('tot'),
            dKm=(f[1][0]-f[0][0])/1000,kmA=f[1][0]/1000,tzA=f[1][1],tzWestA=max(f[1][1],0)*0+(-min(f[1][1],0) if False else 0),east=max(-f[1][1],0),west=max(f[1][1],0),alt=1 if here[3]>=1000 else 0,
            kmA_b2b=(f[1][0]/1000 if f[1][2]<=1.6 else 0),dRest=f[1][2]-f[0][2]))
    print('\n##',dep,'juegos',len(F))
    y=np.array([x['y'] for x in F],float);off=np.log(np.array([x['mk'] for x in F])/(1-np.array([x['mk'] for x in F])));ss=np.array([x['s'] for x in F])
    for v,nom in [('dKm','km del visitante − km del local (miles)'),('kmA','km del visitante (miles)'),('east','husos hacia el este, visitante'),('west','husos hacia el oeste, visitante'),('alt','visita a altura (≥1000 m)'),('kmA_b2b','km visitante si jugó ayer')]:
        if dep=='nfl' and v=='kmA_b2b': continue
        x=np.array([r[v] for r in F],float);c,se=logit_fit(y,off,x)
        ps=[]
        for s in sorted(set(ss)):
            m=ss==s
            if m.sum()>100 and x[m].std()>0:
                cs,_=logit_fit(y[m],off[m],x[m]);ps.append(cs)
        print(f'{nom}: c={c:.3f} ±{2*se:.3f} z={c/se:.1f} | a favor en {sum(1 for p in ps if p*c>0)}/{len(ps)} temporadas')
    t=[r for r in F if r['lt']];yt=np.array([r['tot']-r['lt'] for r in t],float)
    for v,nom in [('kmA','Total: km visitante'),('alt','Total: altura')]:
        b,se=ols(yt,np.array([r[v] for r in t],float).reshape(-1,1));print(f'{nom}: c={b[0]:.3f} ±{2*se[0]:.3f} z={b[0]/se[0]:.1f} (n={len(t)})')
dep_f={'nhl':'datos-nhl.json','nfl':'datos-nfl.json'}
run('nhl');run('nfl')
a=json.load(open(S+'/d/nba6t.json'));print('\nNBA 6t claves',list(a[0].keys())[:25] if isinstance(a,list) else list(a)[:10])
b=json.load(open(S+'/res/partidos_v22.json'));print('v22',len(b),json.dumps(b[0])[:400])
