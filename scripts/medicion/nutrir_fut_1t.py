import json,gzip,math,collections,numpy as np
P=json.load(gzip.open('fut.json.gz'))['p']
M={(g['lg'],g['d'],g['h'],g['a']):g for g in json.load(open('fut_mod.json'))}
lg=lambda p:math.log(p/(1-p))
rows=[]
for r in P:
  L,S,d,h,a,gh,ga,hh,ha=r[:9]
  m=M.get((L,d,h,a))
  if not m or m.get('o0') is None: continue
  rows.append((S,L,m['o0'],int(hh+ha>0)))
print('partidos',len(rows),collections.Counter(r[1] for r in rows), sorted(set(r[0] for r in rows)))
LG=sorted(set(r[1] for r in rows))
def X(s,mode):
  cols=[np.ones(len(s))]
  if mode in('liga','liga+total'): cols+= [np.array([r[1]==l for r in s],float) for l in LG[1:]]
  if mode in('total','liga+total'): cols.append(np.array([lg(min(max(r[2],.02),.98)) for r in s]))
  return np.c_[tuple(cols)]
def fit(A,y):
  w=np.zeros(A.shape[1])
  for _ in range(40):
    p=1/(1+np.exp(-A@w)); g=A.T@(y-p)-0.01*w; H=-(A.T*(p*(1-p)))@A-0.01*np.eye(len(w)); w-=np.linalg.solve(H,g)
  return w
S=sorted(set(r[0] for r in rows)); res=collections.defaultdict(lambda:[0,0,0])
tope=collections.defaultdict(lambda:[0,0])
for sk in S[2:]:
  tr=[r for r in rows if r[0]<sk]; te=[r for r in rows if r[0]==sk]; y=np.array([r[3] for r in te])
  base=np.mean([r[3] for r in tr]); line=[sk,len(te),'real %.1f%%'%(100*y.mean())]
  for mode in ('plano','liga','total','liga+total'):
    if mode=='plano': p=np.full(len(te),base)
    else: w=fit(X(tr,mode),np.array([r[3] for r in tr])); p=1/(1+np.exp(-X(te,mode)@w))
    ll=-np.mean(y*np.log(p)+(1-y)*np.log(1-p)); res[mode][0]+=ll*len(te); res[mode][1]+=len(te)
    line.append('%s %.4f'%(mode,ll))
    # aciertos: jugar solo el tercio de partidos con mayor % 
    if mode!='plano':
      k=np.argsort(-p)[:len(te)//3]; tope[mode][0]+=y[k].sum(); tope[mode][1]+=len(k)
  print(*line)
for m,v in res.items(): print(m,'perdida media %.4f'%(v[0]/v[1]))
print('acierto plano (todos)', '%.1f%%'%(100*np.mean([r[3] for r in rows if r[0] in S[2:]])))
for m,v in tope.items(): print('tercio mas alto segun',m,'%.1f%%'%(100*v[0]/v[1]),'n',v[1])
print('---- detalle modo total')
D=[];B=collections.defaultdict(lambda:[0,0,0])
for sk in S[2:]:
  tr=[r for r in rows if r[0]<sk]; te=[r for r in rows if r[0]==sk]; y=np.array([r[3] for r in te])
  base=np.mean([r[3] for r in tr]); w=fit(X(tr,'total'),np.array([r[3] for r in tr])); p=1/(1+np.exp(-X(te,'total')@w))
  l0=-(y*np.log(base)+(1-y)*np.log(1-base)); l1=-(y*np.log(p)+(1-y)*np.log(1-p)); D+=list(l0-l1)
  k=np.argsort(-p)[:len(te)//3]; print(sk,'w',np.round(w,3),'tercio alto %.1f%% vs todos %.1f%%'%(100*y[k].mean(),100*y.mean()))
  for pi,yi in zip(p,y):
    b=min(int((pi-0.55)/0.05),5) if pi>=0.55 else -1; B[b][0]+=1;B[b][1]+=pi;B[b][2]+=yi
D=np.array(D); print('z mejora %.2f'%(D.mean()/D.std()*math.sqrt(len(D))))
for b in sorted(B): n,s,yy=B[b]; print('tramo',b,'n',n,'dice %.1f gana %.1f'%(100*s/n,100*yy/n))
print('ultimo ajuste (todo):',fit(X(rows,'total'),np.array([r[3] for r in rows])))
