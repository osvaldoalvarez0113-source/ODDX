import json,math,subprocess
import numpy as np
import sys
S=sys.argv[1];R=sys.argv[2]
imp=lambda x:100/(x+100) if x>0 else -x/(-x+100)
dec=lambda x:1+x/100 if x>0 else 1+100/-x
lg=lambda p:np.log(p/(1-p))
sg=lambda z:1/(1+np.exp(-z))
def fit(y,X,it=30,ridge=1e-6):
    b=np.zeros(X.shape[1])
    for _ in range(it):
        p=sg(X@b);W=p*(1-p);H=(X*W[:,None]).T@X+ridge*np.eye(X.shape[1]);b+=np.linalg.solve(H,X.T@(y-p)-ridge*b)
    return b
ll=lambda y,p:-(y*np.log(np.clip(p,1e-9,1))+(1-y)*np.log(np.clip(1-p,1e-9,1)))
def ev(n,G):
    # G: lista {s,y,m,k,oH,oA}
    s=np.array([g['s'] for g in G]);y=np.array([g['y'] for g in G],float);m=np.clip(np.array([g['m'] for g in G]),.01,.99);k=np.clip(np.array([g['k'] for g in G]),.01,.99)
    oH=np.array([g.get('oH') or np.nan for g in G],float);oA=np.array([g.get('oA') or np.nan for g in G],float)
    C=np.full(len(y),np.nan);MK=C.copy();ST=C.copy();coef=[]
    ts=sorted(set(s))
    for t in ts[1:]:
        tr=s<t;te=s==t
        if tr.sum()<300: continue
        X=np.column_stack([np.ones(tr.sum()),lg(m[tr])]);b=fit(y[tr],X);C[te]=sg(b[0]+b[1]*lg(m[te]));coef.append(b[1])
        X=np.column_stack([np.ones(tr.sum()),lg(k[tr])]);b=fit(y[tr],X);MK[te]=sg(b[0]+b[1]*lg(k[te]))
        X=np.column_stack([np.ones(tr.sum()),lg(k[tr]),lg(m[tr])-lg(k[tr])]);b=fit(y[tr],X);ST[te]=sg(b[0]+b[1]*lg(k[te])+b[2]*(lg(m[te])-lg(k[te])))
    o=~np.isnan(C);print(f"\n## {n} n={o.sum()} pendiente del modelo por temporada {min(coef):.2f}..{max(coef):.2f}")
    base=ll(y[o],k[o]);
    for nom,p in [('Modelo',m[o]),('Fórmula (modelo calibrado)',C[o]),('Mercado',k[o]),('Mercado calibrado',MK[o]),('Modelo+mercado ajustado',ST[o])]:
        d=ll(y[o],p)-ll(y[o],m[o]);d2=ll(y[o],p)-base
        print(f"  {nom}: error {ll(y[o],p).mean():.4f} | contra modelo {1000*d.mean():+.2f} z {d.mean()/(d.std()/np.sqrt(len(d))+1e-12):.1f} | contra mercado {1000*d2.mean():+.2f} z {d2.mean()/(d2.std()/np.sqrt(len(d2))+1e-12):.1f}")
    for nom,p in [('Fórmula',C),('Mercado calibrado',MK),('Modelo+mercado',ST)]:
        for u in (.02,.04):
            sel=[]
            for i in np.where(o)[0]:
                dH=p[i]-k[i];oo,w=(oH[i],y[i]==1) if dH>0 else (oA[i],y[i]==0)
                if abs(dH)>=u and oo==oo: sel.append(oo-1 if w else -1)
            if len(sel)>30:
                a=np.array(sel);print(f"    {nom} ≥{int(u*100)} pts: ROI {100*a.mean():+.1f}% ±{200*a.std()/np.sqrt(len(a)):.1f} ({len(a)})")
    return dict(s=s,y=y,m=m,k=k,o=o,C=C)
G=[]
for yr in range(2021,2027):
    for g in json.load(open(f"{S}/d/v{yr}.json")):
        if g.get('v') and g['v'].get('P40') is not None and 0<g['pK']<1: G.append(dict(s=yr,y=int(g['y']),m=g['v']['P40'],k=g['pK'],oH=1/g['iH'],oA=1/g['iA']))
ev('MLB',G)
Phi=lambda x:.5*(1+math.erf(x/math.sqrt(2)))
G=[]
for g in json.load(open(f"{S}/d/nba6t.json")):
    if g.get('mlH') and g.get('mlA') and g.get('V0') and g['V0'].get('pm') is not None and g['mar']!=0:
        v=g['V0'];h=1-Phi((.5-v['pm'])/v['sM']);a=Phi((-.5-v['pm'])/v['sM']);pH=h/(h+a);i,j=imp(g['mlH']),imp(g['mlA'])
        G.append(dict(s=g['sk'],y=int(g['mar']>0),m=pH,k=i/(i+j),oH=dec(g['mlH']),oA=dec(g['mlA'])))
ev('NBA',G)
for dep,minJ,td in [('nhl',10,2021),('nfl',4,2019)]:
    src="const M=require('%s/modelo-%s.js'),d=JSON.parse(require('fs').readFileSync('%s/datos-%s.json'));let J=[];Object.keys(d.temps).forEach(s=>d.temps[s].juegos.forEach(g=>{if(g.done&&!g.skip){g.sk=+s;J.push(g)}}));J.sort((x,y)=>x.ts-y.ts);const R=[];M.correr(J,M.PDEF,(g,c)=>{const l=g.linea;if(!l||!l.ml||g.ty!==2||g.sk<%d||c.cH<%d||c.cA<%d||g.hs===g.as)return;const pm='%s'==='nhl'?M.dist(c.pm,c.pt,M.PDEF).pH:M.pML(c.pm,13.3);R.push({s:g.sk,ts:g.ts,h:g.abH,a:g.abA,y:g.hs>g.as?1:0,m:pm,ml:l.ml})});console.log(JSON.stringify(R))"%(R,dep,R,dep,td,minJ,minJ,dep)
    A=json.loads(subprocess.run(['node','-e',src],capture_output=True,text=True).stdout)
    G=[]
    for g in A:
        i,j=imp(g['ml'][0]),imp(g['ml'][1]);k=i/(i+j)
        if .03<k<.97: G.append(dict(s=g['s'],ts=g['ts'],h=g['h'],a=g['a'],y=g['y'],m=g['m'],k=k,oH=dec(g['ml'][0]),oA=dec(g['ml'][1])))
    ev(dep.upper(),G)
    # rating sacado de las lineas del mercado: linea de hoy contra la propia historia del mercado
    for K in (.03,.08,.15):
        r={};ha=.15;out=[]
        for g in sorted(G,key=lambda x:x['ts']):
            pr=r.get(g['h'],0)-r.get(g['a'],0)+ha;z=math.log(g['k']/(1-g['k']));out.append(dict(g,delta=z-pr));e=z-pr;r[g['h']]=r.get(g['h'],0)+K*e;r[g['a']]=r.get(g['a'],0)-K*e;ha+=.005*e
        q=[o for o in out[200:]];y=np.array([o['y'] for o in q],float);z=np.array([math.log(o['k']/(1-o['k'])) for o in q]);d=np.array([o['delta'] for o in q]);
        X=np.column_stack([np.ones(len(y)),d]);b=np.zeros(2)
        for _ in range(25):
            p=sg(z+X@b);W=p*(1-p);H=(X*W[:,None]).T@X;b+=np.linalg.solve(H,X.T@(y-p))
        se=np.sqrt(np.linalg.inv(H)[1,1]);print(f"  Línea vs rating del mercado K={K}: c={b[1]:+.3f} z={b[1]/se:.1f} (desv. {d.std():.3f})")
# Futbol 1X2: temperatura por temporada, walk-forward
L=[x for x in json.load(open(f"{S}/res/partidos_v22.json")) if x.get('mk') and x.get('F22')]
ts=sorted(set(x['t'] for x in L));M=np.array([x['F22'] for x in L]);Kk=np.array([x['mk'] for x in L]);Y=np.array([x['y'] for x in L]);T=np.array([x['t'] for x in L]);O=[x.get('ps') or x.get('pe') for x in L]
def cal(P,bt,bias): 
    q=np.log(np.clip(P,1e-6,1))*bt+bias;q=np.exp(q);return q/q.sum(1,keepdims=True)
llm=lambda P:-np.log(P[np.arange(len(P)),Yy])
print('\n## Fútbol ligas');res=np.full(M.shape,np.nan)
for t in ts[1:]:
    tr=T<t;te=T==t
    if tr.sum()<500: continue
    best=None;Yy=Y[tr]
    for bt in np.arange(.8,1.61,.05):
        for d in np.arange(-.3,.31,.05):
            for hh in np.arange(-.3,.31,.1):
                v=llm(cal(M[tr],bt,np.array([hh,d,0]))).mean()
                if best is None or v<best[0]: best=(v,bt,d,hh)
    res[te]=cal(M[te],best[1],np.array([best[3],best[2],0]));print(' ',t,'temperatura',round(best[1],2),'empate',round(best[2],2),'local',round(best[3],2))
o=~np.isnan(res[:,0]);Yy=Y[o]
a=llm(M[o]);c=llm(res[o]);k=llm(Kk[o]);print(f"  Modelo {a.mean():.4f} Fórmula {c.mean():.4f} Mercado {k.mean():.4f} | contra modelo {1000*(c-a).mean():+.2f} z {(c-a).mean()/((c-a).std()/np.sqrt(len(a))):.1f} | contra mercado {1000*(c-k).mean():+.2f}")
for u in (.02,.04):
    S2=[]
    for i in np.where(o)[0]:
        dd=res[i]-Kk[i];l=int(np.argmax(dd))
        if dd[l]>=u and O[i]: S2.append(O[i][l]-1 if Y[i]==l else -1)
    S2=np.array(S2);print(f"    Fórmula ≥{int(u*100)} pts: ROI {100*S2.mean():+.1f}% ±{200*S2.std()/np.sqrt(len(S2)):.1f} ({len(S2)})")
