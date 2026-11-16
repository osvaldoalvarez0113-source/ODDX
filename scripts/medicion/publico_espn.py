# OVA contra el pronóstico previo de ESPN (FPI en NFL, BPI en NBA, ESPN Analytics en MLB) y contra el mercado.
# Uso: python3 -I scripts/medicion/publico_espn.py <carpeta>   con, en la carpeta: espn-pred-{nfl,nba,mlb}.json (rama resultados-publicos),
#   filas_nba.json (rama resultados-nba-6t), ova_nfl.json (filas del modelo NFL walk-forward: id, sk, w, o, q) y datos/mia/S<año>/variantes_S<año>.json (ramas lu-S2021…lu-S2026).
import json, math, numpy as np, sys, collections
from math import erf, sqrt
D=(sys.argv[1] if len(sys.argv)>1 else '.').rstrip('/')+'/'
clip=lambda p: np.clip(p,1e-4,1-1e-4); lg=lambda p: np.log(clip(p)/(1-clip(p))); sig=lambda z: 1/(1+np.exp(-z))
ll=lambda p,y: -(y*np.log(clip(p))+(1-y)*np.log(1-clip(p)))
def ms(d): d=np.asarray(d); se=d.std(ddof=1)/math.sqrt(len(d)); return d.mean(), se, d.mean()/se if se>0 else 0
def mezcla(a,b,y,sk):
    grid=np.arange(0,1.0001,0.05); dif=np.zeros(len(y)); 
    best=lambda m: grid[np.argmin([ll(sig((1-l)*lg(a[m])+l*lg(b[m])),y[m]).sum() for l in grid])]
    for s in np.unique(sk):
        l=best(sk!=s); t=sk==s; dif[t]=ll(sig((1-l)*lg(a[t])+l*lg(b[t])),y[t])-ll(a[t],y[t])
    return best(np.ones(len(y),bool)), ms(dif)
def informe(nom, sk, y, mods, espn_nom):
    sk=np.asarray(sk); y=np.asarray(y); out=[]
    S=sorted(set(sk)); out.append(f'\n## {nom} ({len(y):,} juegos)\n'); out.append('| Modelo | '+' | '.join(map(str,S))+' | Total | Aciertos |'); out.append('|'+'---|'*(len(S)+3))
    for n,p in mods.items():
        out.append(f'| {n} | '+' | '.join('%.4f'%ll(p[sk==s],y[sk==s]).mean() for s in S)+' | %.4f | %.1f%% |'%(ll(p,y).mean(),100*np.mean((p>=.5)==(y==1))))
    k=list(mods); o,e,q=mods[k[0]],mods[espn_nom],mods[k[-1]]
    m,se,z=ms(ll(e,y)-ll(o,y)); out.append(f'\n- {espn_nom} − {k[0]}: {m*1000:+.1f} milésimas ± {2000*se:.1f} (z {z:.1f}; negativo = ESPN acierta más).')
    m,se,z=ms(ll(e,y)-ll(q,y)); out.append(f'- {espn_nom} − mercado: {m*1000:+.1f} milésimas ± {2000*se:.1f} (z {z:.1f}).')
    l,(m,se,z)=mezcla(o,e,y,sk); out.append(f'- Mezcla {k[0]} + ESPN (probada en la temporada que quedó afuera): peso de ESPN {l:.2f}, mejora sobre OVA {m*1000:+.1f} ± {2000*se:.1f} (z {z:.1f}) → '+('**ESPN le aporta a OVA**' if z<=-2 else 'no se distingue'))
    l,(m,se,z)=mezcla(q,e,y,sk); out.append(f'- Mezcla mercado + ESPN: peso de ESPN {l:.2f}, mejora sobre el mercado {m*1000:+.1f} ± {2000*se:.1f} (z {z:.1f}) → '+('**le aporta al precio**' if z<=-2.6 else 'no le aporta al precio'))
    l,(m,se,z)=mezcla(q,o,y,sk); out.append(f'- Mezcla mercado + OVA: peso de OVA {l:.2f}, mejora {m*1000:+.1f} ± {2000*se:.1f} (z {z:.1f}).')
    return '\n'.join(out)
REP=[]
# ---------- NFL
E_=json.load(open(D+'espn-pred-nfl.json')); eh={x['id']:x for x in E_}
F=[r for r in json.load(open(D+'ova_nfl.json')) if eh.get(r['id'],{}).get('h') is not None]
arr=lambda k: np.array([r[k] for r in F],float)
REP.append(informe('NFL · ESPN FPI', [r['sk'] for r in F], arr('w'), {'OVA (modelo de la app)':arr('o'),'ESPN FPI':np.array([eh[r['id']]['h'] for r in F]),'Mercado (cierre)':arr('q')}, 'ESPN FPI'))
# ---------- NBA
Phi=lambda x: 0.5*(1+erf(x/sqrt(2)))
def pML(pm,s): h=1-Phi((0.5-pm)/s); a=Phi((-0.5-pm)/s); return h/(h+a)
imp=lambda a: (-a)/((-a)+100) if a<0 else 100/(a+100)
E_=json.load(open(D+'espn-pred-nba.json')); eh={x['id']:x for x in E_}
F=[]
for r in json.load(open(D+'filas_nba.json')):
    e=eh.get(str(r['id']),{}).get('h')
    if e is None or r.get('ty')!=2 or r.get('mlH') is None or r.get('mlA') is None or r['mar']==0: continue
    i,j=imp(r['mlH']),imp(r['mlA']); F.append(dict(sk=r['sk'],w=1 if r['mar']>0 else 0,o=pML(r['V0']['pm'],r['V0']['sM']),e=e,q=i/(i+j)))
arr=lambda k: np.array([r[k] for r in F],float)
REP.append(informe('NBA · ESPN BPI', [r['sk'] for r in F], arr('w'), {'OVA (modelo de la app)':arr('o'),'ESPN BPI':arr('e'),'Mercado (cierre)':arr('q')}, 'ESPN BPI'))
# ---------- MLB
import os; os.chdir(D)
src=open('/home/claude/oddx/scripts/medicion/formula_propia.py').read().split("out={}")[0]
exec(src)
from sklearn.linear_model import LogisticRegression; from sklearn.preprocessing import StandardScaler
pm=np.full(len(Y),np.nan)
for t in (2024,2025,2026):
    tr=YR<t; te=YR==t; sc=StandardScaler().fit(X[tr]); m=LogisticRegression(C=0.05,max_iter=2000).fit(sc.transform(X[tr]),Y[tr]); pm[te]=m.predict_proba(sc.transform(X[te]))[:,1]
ID={108:'LAA',109:'ARI',110:'BAL',111:'BOS',112:'CHC',113:'CIN',114:'CLE',115:'COL',116:'DET',117:'HOU',118:'KC',119:'LAD',120:'WSH',121:'NYM',133:'OAK',134:'PIT',135:'SD',136:'SEA',137:'SF',138:'STL',139:'TB',140:'TEX',141:'TOR',142:'MIN',143:'PHI',144:'ATL',145:'CHW',146:'MIA',147:'NYY',158:'MIL'}
E_=json.load(open(D+'espn-pred-mlb.json')); c=collections.Counter(); ek={}
for x in E_:
    k=(x['f'],{'ATH':'OAK'}.get(x['hAb'],x['hAb'])); c[k]+=1; ek[k]=x
pre=[x for x in E_ if x.get('lm') and x.get('h') is not None]; antes=sum(1 for x in pre if x['lm']<x['ts'])
F=[]
for i,r in enumerate(R):
    if r['yr']<2024 or np.isnan(pm[i]): continue
    k=(r['f'].replace('-',''),ID.get(r['v'].get('hId')))
    if c.get(k)!=1 or ek[k].get('h') is None: continue
    x=ek[k]
    if (x['hs']>x['as'])!=(r['y']==1): continue      # el resultado no coincide: no es el mismo juego
    F.append(dict(sk=r['yr'],w=r['y'],o=pm[i],o40=r['v']['P40'],e=x['h'],q=r['pK']))
arr=lambda k: np.array([r[k] for r in F],float)
REP.append(informe('MLB · pronóstico de ESPN', [r['sk'] for r in F], arr('w'), {'OVA (fórmula nueva)':arr('o'),'OVA (fórmula anterior)':arr('o40'),'ESPN':arr('e'),'Mercado (cierre)':arr('q')}, 'ESPN'))
REP.append(f"\nMLB: el pronóstico de ESPN quedó guardado antes de la hora del juego en {antes:,} de {len(pre):,} juegos ({100*antes/len(pre):.0f}%).")
print('\n'.join(REP)); open('informe_publicos.md','w').write('\n'.join(REP)+'\n')
