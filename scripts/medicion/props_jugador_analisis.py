import gzip,json,sys,math
import numpy as np
from collections import defaultdict
S=sys.argv[1]
def roi(w,dec):
    u=np.where(w,dec-1,-1.0);return u.mean(),2*u.std()/math.sqrt(len(u))
for dep in ['nba','nhl','mlb','nfl']:
    R=json.load(gzip.open(f"{S}/pj/{dep}.json.gz"))
    R=[r for r in R if r['v']!=r['l']]
    o=np.array([r['o'] for r in R]);u=np.array([r['u'] for r in R]);io,iu=1/o,1/u;mg=io+iu-1;po=io/(io+iu)
    ov=np.array([r['v']>r['l'] for r in R]);s=np.array([r['s'] for r in R]);t=np.array([r['t'] for r in R])
    m=(mg>0)&(mg<.15)
    print(f"\n#### {dep.upper()} props {m.sum()} | margen mediano {100*np.median(mg[m]):.1f}% | temporadas {sorted(set(s))}")
    print(f"  Más pasa {100*ov[m].mean():.1f}% (precio decía {100*po[m].mean():.1f}) | apostar Más {100*roi(ov[m],o[m])[0]:+.1f}% ±{100*roi(ov[m],o[m])[1]:.1f} | apostar Menos {100*roi(~ov[m],u[m])[0]:+.1f}% ±{100*roi(~ov[m],u[m])[1]:.1f}")
    # lado favorito por tramo
    fav=np.where(po>=.5,ov,~ov);pf=np.maximum(po,1-po);df=np.where(po>=.5,o,u)
    for a,b in [(.5,.55),(.55,.6),(.6,.65),(.65,.7),(.7,.8),(.8,.95)]:
        q=m&(pf>=a)&(pf<b)
        if q.sum()>200: r_=roi(fav[q],df[q]);print(f"  lado favorito {int(a*100)}-{int(b*100)}%: n={q.sum()} pasó {100*fav[q].mean():.1f}% | rinde {100*r_[0]:+.1f}% ±{100*r_[1]:.1f}")
    print('  Por tipo (cerca de la línea principal: 40-60%):')
    for tt in sorted(set(t)):
        q=m&(t==tt)&(po>.4)&(po<.6)
        if q.sum()<300: continue
        ro=roi(ov[q],o[q]);ru=roi(~ov[q],u[q])
        ps=[]
        for ss in sorted(set(s)):
            qq=q&(s==ss)
            if qq.sum()>100: ps.append(f"{ss}:{100*roi(~ov[qq],u[qq])[0]:+.1f}")
        print(f"   {tt[:34]:34s} n={q.sum():6d} Más pasa {100*ov[q].mean():.1f} (precio {100*po[q].mean():.1f}) | Más {100*ro[0]:+.1f}±{100*ro[1]:.1f} | Menos {100*ru[0]:+.1f}±{100*ru[1]:.1f} | Menos por temp {' '.join(ps)}")
