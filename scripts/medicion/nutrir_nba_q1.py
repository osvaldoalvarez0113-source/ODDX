import json,gzip,math,collections
P=json.load(gzip.open('nba.json.gz'))['temps']
M={str(r['id']):r for r in json.load(open('nba_mod.json'))}
bw=0.06797  # periodos.js C.nba.q1.bw
Phi=lambda x:0.5*(1+math.erf(x/math.sqrt(2)))
sig=lambda z:1/(1+math.exp(-z)); lg=lambda p:math.log(p/(1-p))
rows=[]
for sk,t in P.items():
  for g in t['g']:
    m=M.get(str(g['id']));
    if not m or not m.get('V0') or len(g.get('lh',[]))<4: continue
    v=m['V0']; pm=v['pm']
    h=1-Phi((0.5-pm)/v['sM']); a=Phi((-0.5-pm)/v['sM']); pH=h/(h+a); pf=max(pH,1-pH)
    q=g['lh'][0]-g['la'][0]
    if q==0: continue
    favH=pH>=0.5; win=int((q>0)==favH)
    pq=sig(bw*pm); pqf=pq if favH else 1-pq
    rows.append((int(sk),pf,pqf,win))
print('juegos',len(rows))
for cut in (0.5,0.65,0.75):
  print('\nfavorito >=',cut)
  for sk in sorted(set(r[0] for r in rows)):
    s=[r for r in rows if r[0]==sk and r[1]>=cut]
    if s: print(sk,len(s),'app dice %.1f%%  gano %.1f%%'%(100*sum(r[2] for r in s)/len(s),100*sum(r[3] for r in s)/len(s)))
# walk-forward: recalibrate logit(pq) with a + b*logit + c*[pf>=.75] fit on prior seasons
import numpy as np
def fit(X,y):
  w=np.zeros(X.shape[1])
  for _ in range(50):
    p=1/(1+np.exp(-X@w)); g=X.T@(y-p); H=-(X.T*(p*(1-p)))@X; w-=np.linalg.solve(H,g)
  return w
def feats(s,mode):
  L=np.array([lg(min(max(r[2],1e-4),1-1e-4)) for r in s])
  if mode=='escala': return np.c_[np.zeros(len(s)),L][:,1:]
  return np.c_[L, np.array([lg(r[1]) for r in s])]
tot=collections.Counter()
for sk in sorted(set(r[0] for r in rows))[2:]:
  tr=[r for r in rows if r[0]<sk]; te=[r for r in rows if r[0]==sk]
  y=np.array([r[3] for r in te]); p0=np.array([r[2] for r in te])
  ll0=-np.mean(y*np.log(p0)+(1-y)*np.log(1-p0))
  out=[sk,len(te),'app %.4f'%ll0]
  for mode in ('escala','juego'):
    w=fit(feats(tr,mode),np.array([r[3] for r in tr])); p=1/(1+np.exp(-feats(te,mode)@w))
    ll=-np.mean(y*np.log(p)+(1-y)*np.log(1-p)); out.append('%s %.4f'%(mode,ll)); tot[mode]+=(ll0-ll)*len(te)
    st=np.array([r[1]>=0.75 for r in te]); 
    if mode=='juego': out.append('fuertes: app %.1f%% nuevo %.1f%% real %.1f%% (n %d)'%(100*p0[st].mean(),100*p[st].mean(),100*y[st].mean(),st.sum()))
  print(*out)
print(tot)
