# OVA · ¿Cuántos ACIERTOS suma mezclar el modelo con el pronóstico público de ESPN? (NBA: BPI, NFL: FPI). Noviembre 2026.
# Uso: cd <carpeta de datos> && python3 -I scripts/medicion/nutrir_mezcla.py
#   En la carpeta: espn-pred-nba.json y espn-pred-nfl.json (rama resultados-publicos), nba.json (filas_nba.json de resultados-nba-6t),
#   dnfl.json (datos-nfl.json de datos-nhl-nfl) y mod-nfl.json (node scripts/medicion/exportar_modelo.js nfl dnfl.json mod-nfl.json).
# El peso de ESPN se elige con las OTRAS temporadas y se prueba en la que quedó afuera. Resultado en docs/NUTRIR-MODELO-2026-11.md.
import json, math, numpy as np
from math import erf, sqrt
clip=lambda p: np.clip(p,1e-4,1-1e-4); lg=lambda p: np.log(clip(p)/(1-clip(p))); sig=lambda z: 1/(1+np.exp(-z))
ll=lambda p,y: -(y*np.log(clip(p))+(1-y)*np.log(1-clip(p)))
Phi=lambda x: 0.5*(1+erf(x/sqrt(2)))
def pML(pm,s): h=1-Phi((0.5-pm)/s); a=Phi((-0.5-pm)/s); return h/(h+a)
imp=lambda a: (-a)/((-a)+100) if a<0 else 100/(a+100)
def rep(nom,F):
    sk=np.array([r['sk'] for r in F]); y=np.array([r['w'] for r in F],float); o=np.array([r['o'] for r in F]); e=np.array([r['e'] for r in F]); q=np.array([r['q'] for r in F])
    grid=np.arange(0,1.0001,0.05); pm=np.zeros(len(y)); ws={}
    for s in np.unique(sk):
        m=sk!=s; l=grid[np.argmin([ll(sig((1-l)*lg(o[m])+l*lg(e[m])),y[m]).sum() for l in grid])]; ws[int(s)]=round(float(l),2); t=sk==s; pm[t]=sig((1-l)*lg(o[t])+l*lg(e[t]))
    acc=lambda p: 100*np.mean((p>=.5)==(y==1))
    print('\n##',nom,len(y),'juegos | pesos de ESPN por temporada dejada fuera:',ws)
    print('| | Acierta | Pérdida |'); 
    for n,p in (('Modelo OVA solo',o),('ESPN solo',e),('OVA + ESPN (mezcla, fuera de muestra)',pm),('Mercado',q)): print('| %s | %.1f%% | %.4f |'%(n,acc(p),ll(p,y).mean()))
    d=((pm>=.5)==(y==1)).astype(float)-((o>=.5)==(y==1)).astype(float); print('aciertos de más con la mezcla: %+d en %d (%.1f pts, z %.1f)'%(d.sum(),len(d),100*d.mean(),d.mean()/(d.std(ddof=1)/math.sqrt(len(d)))))
    print('por temporada (acierta OVA → mezcla):',' '.join('%s: %.1f→%.1f'%(s,acc(o[sk==s]) if False else 100*np.mean((o[sk==s]>=.5)==(y[sk==s]==1)),100*np.mean((pm[sk==s]>=.5)==(y[sk==s]==1))) for s in np.unique(sk)))
    # cuando chocan OVA y ESPN, quien acierta
    ch=(o>=.5)!=(e>=.5); print('chocan en %d juegos: acierta OVA %.1f%%, ESPN %.1f%%'%(ch.sum(),100*np.mean((o[ch]>=.5)==(y[ch]==1)),100*np.mean((e[ch]>=.5)==(y[ch]==1))))
    # tramos de la mezcla
    pf=np.maximum(pm,1-pm); won=((pm>=.5)==(y==1))
    for a,b in ((.5,.6),(.6,.7),(.7,.8),(.8,1.01)):
        m=(pf>=a)&(pf<b); print('  mezcla %d-%d%%: %d juegos, dice %.1f%%, acierta %.1f%%'%(100*a,min(100*b,100),m.sum(),100*pf[m].mean(),100*won[m].mean()))
eh={x['id']:x for x in json.load(open('espn-pred-nba.json'))}; F=[]
for r in json.load(open('nba.json')):
    e=eh.get(str(r['id']),{}).get('h')
    if e is None or r.get('ty')!=2 or r.get('mlH') is None or r.get('mlA') is None or r['mar']==0: continue
    i,j=imp(r['mlH']),imp(r['mlA']); F.append(dict(sk=r['sk'],w=1 if r['mar']>0 else 0,o=pML(r['V0']['pm'],r['V0']['sM']),e=e,q=i/(i+j)))
rep('NBA · ESPN BPI',F)
eh={x['id']:x for x in json.load(open('espn-pred-nfl.json'))}; mod=json.load(open('mod-nfl.json')); d=json.load(open('dnfl.json')); F=[]
for y,t in d['temps'].items():
    for g in t['juegos']:
        o=mod.get(str(g['id'])); e=eh.get(str(g['id']),{}).get('h'); l=g.get('linea') or {}
        if not o or e is None or not l.get('ml') or g['hs']==g['as']: continue
        i,j=imp(l['ml'][0]),imp(l['ml'][1]); F.append(dict(sk=int(y),w=1 if g['hs']>g['as'] else 0,o=o['pH'],e=e,q=i/(i+j)))
rep('NFL · ESPN FPI',F)
