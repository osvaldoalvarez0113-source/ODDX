import json,sys,re,unicodedata
import numpy as np
from collections import defaultdict
S=sys.argv[1]+'/res/'
L=json.load(open(S+'partidos_v22.json'));X=[x for x in json.load(open(S+'partidos_copas.json')) if x['tipo']=='europa']
print(list(L[0].keys()))
al={"Man United":"Manchester United","Man City":"Manchester City","Ath Bilbao":"Athletic Club","Ath Madrid":"Atlético Madrid","Betis":"Real Betis","Sociedad":"Real Sociedad","Dortmund":"Borussia Dortmund","Leverkusen":"Bayer Leverkusen","M'gladbach":"Borussia Monchengladbach","Ein Frankfurt":"Eintracht Frankfurt","Paris SG":"Paris Saint-Germain","St Etienne":"AS Saint-Etienne","Inter":"Internazionale","Milan":"AC Milan","Newcastle":"Newcastle United","Tottenham":"Tottenham Hotspur","Wolves":"Wolverhampton Wanderers","West Ham":"West Ham United","Celta":"Celta Vigo","Espanol":"Espanyol","Union Berlin":"1. FC Union Berlin","FC Koln":"1. FC Cologne","Hoffenheim":"TSG Hoffenheim","Freiburg":"SC Freiburg","Stuttgart":"VfB Stuttgart","Wolfsburg":"VfL Wolfsburg","Rennes":"Stade Rennais","Monaco":"AS Monaco","Roma":"AS Roma","Vallecano":"Rayo Vallecano","Leicester":"Leicester City","Brighton":"Brighton & Hove Albion","Bournemouth":"AFC Bournemouth"}
cup=defaultdict(list)
for x in X:
    cup[x['h']].append((x['d'],x['nota'] or ''));cup[x['a']].append((x['d'],x['nota'] or ''))
nom=set(cup)
def cn(n):
    if n in al and al[n] in nom: return al[n]
    if n in nom: return n
    return None
D=864e5;R=[]
for m in L:
    if not m.get('mk'): continue
    ch,ca=cn(m['h']),cn(m['a'])
    f=lambda c,d0,d1: (1 if c and any(d0<=q[0]-m['d']<=d1 for q in cup[c]) else 0)
    R.append(dict(t=m['t'],y=m['y'],mk=m['mk'],antH=f(ch,-4.5*D,-.5*D),antA=f(ca,-4.5*D,-.5*D),despH=f(ch,.5*D,4.5*D),despA=f(ca,.5*D,4.5*D),ko=0,odd=m.get('ps') or m.get('pe')))
print('partidos',len(R),'con copa antes L/V',sum(r['antH'] for r in R),sum(r['antA'] for r in R),'después',sum(r['despH'] for r in R),sum(r['despA'] for r in R))
pts=np.array([[3,1,0][r['y']] for r in R],float);ex=np.array([3*r['mk'][0]+r['mk'][1] for r in R]);tt=np.array([r['t'] for r in R])
for nom2,v in [('copa ≤4 días ANTES (local − visita)',lambda r:r['antH']-r['antA']),('copa ≤4 días DESPUÉS (local − visita)',lambda r:r['despH']-r['despA'])]:
    x=np.array([v(r) for r in R],float);X2=np.column_stack([np.ones(len(x)),x]);y=pts-ex;b=np.linalg.lstsq(X2,y,rcond=None)[0];e=y-X2@b;se=np.sqrt(np.linalg.inv(X2.T@X2)[1,1]*e@e/(len(y)-2))
    sg=[]
    for t in sorted(set(tt)):
        m=tt==t;Xm=X2[m]
        if m.sum()>200: sg.append(np.linalg.lstsq(Xm,y[m],rcond=None)[0][1])
    print(f'{nom2}: c={b[1]:.3f} ±{2*se:.3f} pts z={b[1]/se:.1f} | mismo signo {sum(1 for s in sg if s*b[1]>0)}/{len(sg)}')
# ROI: al rival del equipo que jugó copa antes / cuya copa viene después
for nom2,fn in [('rival de quien jugó copa antes',lambda r:(2 if r['antH'] and not r['antA'] else 0 if r['antA'] and not r['antH'] else None)),('rival de quien juega copa después',lambda r:(2 if r['despH'] and not r['despA'] else 0 if r['despA'] and not r['despH'] else None))]:
    u=[]
    for r in R:
        l=fn(r)
        if l is None or not r['odd']: continue
        u.append(r['odd'][l]-1 if r['y']==l else -1)
    u=np.array(u);print(f'ROI {nom2}: {100*u.mean():.1f}% ±{200*u.std()/np.sqrt(len(u)):.1f} ({len(u)})')
