# GEMELOS DEL JUEGO (25-nov-2026, idea de Osvaldo): para cada juego, los K juegos más parecidos del archivo (mismo precio de
# cierre, local/visita, back-to-back de cada lado, rachas y diferencia en los últimos 10). ¿Lo que ganaron los gemelos, contra lo que
# decía su precio, predice algo en juegos nuevos? Se busca en el archivo antes de 2024 y se prueba en 2024 en adelante.
# Uso (en la carpeta con nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json): python3 gemelos.py [K]
# Resultado: NO. Ver docs/MEDICION-GEMELOS-2026-11.md
import sys, math, os, importlib.util
spec=importlib.util.spec_from_file_location('S',os.path.join(os.path.dirname(os.path.abspath(__file__)),'sorpresas.py')); S=importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
def feats(r):
    F,D=r['F'],r['D']
    b=lambda c: 1 if (c['dias'] is not None and c['dias']<=1.6) else 0
    u=lambda c: c['g10']
    return dict(pf=r['pf'],loc=1 if r['favLocal'] else 0,fb=b(F),db=b(D),uf=(u(F) if u(F) is not None and u(D) is not None else None),ud=(u(D) if u(F) is not None and u(D) is not None else None),rf=max(-5,min(5,F['racha'])),rd=max(-5,min(5,D['racha'])))
def dist(a,b):
    d=((a['pf']-b['pf'])/0.02)**2 + 2*(a['loc']!=b['loc']) + 1.5*(a['fb']!=b['fb']) + 1.5*(a['db']!=b['db'])
    d+=((a['rf']-b['rf'])/3)**2+((a['rd']-b['rd'])/3)**2
    if a['uf'] is not None and b['uf'] is not None: d+=(((a['ud']-a['uf'])-(b['ud']-b['uf']))/2)**2
    elif (a['uf'] is None)!=(b['uf'] is None): d+=1
    return d
datos={'nba':S.nba('nba-box.json.gz','filas_nba.json'),'nhl':S.espn('datos-nhl.json'),'nfl':S.espn('datos-nfl.json')}
K=int(sys.argv[1]) if len(sys.argv)>1 else 50
for dep,J in datos.items():
    R=S.filas(S.contexto(J,dep),dep)
    for r in R: r['x']=feats(r)
    tr=[r for r in R if r['s']<2024]; te=[r for r in R if r['s']>=2024]
    # index archive by pf bucket to speed
    tr.sort(key=lambda r:r['pf']); import bisect; keys=[r['pf'] for r in tr]
    bp=bg=bm=0; n=0; res=[]
    for r in te:
        lo=bisect.bisect_left(keys,r['pf']-0.06); hi=bisect.bisect_right(keys,r['pf']+0.06)
        C=sorted(tr[lo:hi],key=lambda c:dist(r['x'],c['x']))[:K]
        if len(C)<K: continue
        w=sum(c['gana'] for c in C); e=sum(c['pf'] for c in C)
        res.append((r,(w-e)/K))
        y=1 if r['gana'] else 0
        bp+=(r['pf']-y)**2; g=min(.99,max(.01,r['pf']+(w-e)/K)); bg+=(g-y)**2; m=min(.99,max(.01,r['pf']+0.5*(w-e)/K)); bm+=(m-y)**2; n+=1
    # does residual predict? correlation between neighbor residual and actual residual
    import statistics
    xs=[q for _,q in res]; ys=[(1 if r['gana'] else 0)-r['pf'] for r,_ in res]
    mx,my=statistics.mean(xs),statistics.mean(ys); cov=sum((a-mx)*(b-my) for a,b in zip(xs,ys))/len(xs); corr=cov/(statistics.pstdev(xs)*statistics.pstdev(ys))
    z=corr*math.sqrt(len(xs))
    # top/bottom tercile of neighbor residual
    srt=sorted(res,key=lambda t:t[1]); t=len(srt)//5
    def grp(G): return sum(1 for r,_ in G if r['gana'])/len(G)*100, sum(r['pf'] for r,_ in G)/len(G)*100
    print(dep.upper(),'prueba',n,'Brier precio %.5f gemelos %.5f mitad %.5f'%(bp/n,bg/n,bm/n),'corr %.3f z %.1f'%(corr,z),
          '| gemelos más flojos: fav gana %.1f%% vs %.1f%%'%grp(srt[:t]),'| más fuertes: %.1f%% vs %.1f%%'%grp(srt[-t:]))
