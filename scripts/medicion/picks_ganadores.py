import json,math,subprocess
from collections import defaultdict
import sys
S=sys.argv[1];R=sys.argv[2]
imp=lambda x:100/(x+100) if x>0 else -x/(-x+100)
dec=lambda x:1+x/100 if x>0 else 1+100/-x
Phi=lambda x:.5*(1+math.erf(x/math.sqrt(2)))
D={}
G=[]
for yr in range(2021,2027):
    for g in json.load(open(f"{S}/d/v{yr}.json")):
        if g.get('v') and g['v'].get('P40') is not None and 0<g['pK']<1: G.append(dict(s=yr,dia=g['f'],y=int(g['y']),m=g['v']['P40'],k=g['pK'],oH=1/g['iH'],oA=1/g['iA']))
D['MLB']=G
G=[]
for g in json.load(open(f"{S}/d/nba6t.json")):
    if g.get('mlH') and g.get('mlA') and g.get('V0') and g['V0'].get('pm') is not None and g['mar']!=0:
        v=g['V0'];h=1-Phi((.5-v['pm'])/v['sM']);a=Phi((-.5-v['pm'])/v['sM']);i,j=imp(g['mlH']),imp(g['mlA'])
        G.append(dict(s=g['sk'],dia=int((g['ts']-6*36e5)//864e5),y=int(g['mar']>0),m=h/(h+a),k=i/(i+j),oH=dec(g['mlH']),oA=dec(g['mlA'])))
D['NBA']=G
for dep,minJ,td in [('nhl',10,2021),('nfl',4,2019)]:
    src="const M=require('%s/modelo-%s.js'),d=JSON.parse(require('fs').readFileSync('%s/datos-%s.json'));let J=[];Object.keys(d.temps).forEach(s=>d.temps[s].juegos.forEach(g=>{if(g.done&&!g.skip){g.sk=+s;J.push(g)}}));J.sort((x,y)=>x.ts-y.ts);const R=[];M.correr(J,M.PDEF,(g,c)=>{const l=g.linea;if(!l||!l.ml||g.ty!==2||g.sk<%d||c.cH<%d||c.cA<%d||g.hs===g.as)return;const pm='%s'==='nhl'?M.dist(c.pm,c.pt,M.PDEF).pH:M.pML(c.pm,13.3);R.push({s:g.sk,ts:g.ts,y:g.hs>g.as?1:0,m:pm,ml:l.ml})});console.log(JSON.stringify(R))"%(R,dep,R,dep,td,minJ,minJ,dep)
    G=[]
    for g in json.loads(subprocess.run(['node','-e',src],capture_output=True,text=True).stdout):
        i,j=imp(g['ml'][0]),imp(g['ml'][1]);k=i/(i+j)
        if .03<k<.97: G.append(dict(s=g['s'],dia=int((g['ts']-6*36e5)//(864e5 if dep=='nhl' else 864e5*7)),y=g['y'],m=g['m'],k=k,oH=dec(g['ml'][0]),oA=dec(g['ml'][1])))
    D[dep.upper()]=G
def lado(g):
    fh=g['k']>=.5
    return dict(pk=g['k'] if fh else 1-g['k'],pm=g['m'] if fh else 1-g['m'],gana=(g['y']==1)==fh,o=g['oH'] if fh else g['oA'],s=g['s'],dia=g['dia'],pmo=g['m'] if not fh else 1-g['m'],oo=g['oA'] if fh else g['oH'],pko=1-g['k'] if fh else g['k'])
def rs(z,nom):
    if len(z)<25: return
    w=sum(x['gana'] for x in z)/len(z);u=[x['o']-1 if x['gana'] else -1 for x in z];m=sum(u)/len(u);e=(sum((v-m)**2 for v in u)/len(u))**.5/len(u)**.5
    pk=sum(x['pk'] for x in z)/len(z);print(f"  {nom}: n={len(z)} gana {100*w:.1f}% (mercado decía {100*pk:.1f}) | rinde {100*m:+.1f}% ±{200*e:.1f}")
ALL=[]
for n,G in D.items():
    print('##',n,len(G));L=[lado(g) for g in G];ALL+=[dict(x,dep=n) for x in L]
    for a,b in [(.5,.55),(.55,.6),(.6,.65),(.65,.7),(.7,.75),(.75,.8),(.8,.97)]:
        rs([x for x in L if a<=x['pk']<b],f"favorito {int(a*100)}-{int(b*100)}")
    rs([x for x in L if x['pk']>=.6],'fav 60+ todos')
    rs([x for x in L if x['pk']>=.6 and x['pm']>=.5],'fav 60+ y el modelo está de acuerdo')
    rs([x for x in L if x['pk']>=.6 and x['pm']>=x['pk']],'fav 60+ y el modelo le da más')
    rs([x for x in L if x['pk']>=.6 and x['pm']<.5],'fav 60+ y el modelo está en contra')
    q=defaultdict(list)
    for x in L:q[x['dia']].append(x)
    t1=[max(v,key=lambda x:x['pk']) for v in q.values()];rs(t1,'el más seguro de cada día')
    # perros que el modelo elige
    P=[dict(pk=x['pko'],gana=not x['gana'],o=x['oo'],pm=x['pmo']) for x in L]
    rs(P,'todos los perros');rs([x for x in P if x['pm']>=.5],'perro y el modelo lo da ganador');rs([x for x in P if x['pm']>=.55],'perro y modelo 55%+')
import json
from collections import defaultdict
L=[x for x in json.load(open(S+"/res/partidos_v22.json")) if x.get('mk') and x.get('F22') and (x.get('ps') or x.get('pe'))]
R=[]
for x in L:
    k=x['mk'];f=0 if k[0]>=k[2] else 2;o=x.get('ps') or x.get('pe');m=x['F22']
    R.append(dict(pk=k[f],pm=m[f],mfav=(0 if m[0]>=m[2] else 2)==f,gana=x['y']==f,o=o[f],dia=x['d'],opp=2-f,gopp=x['y']==2-f,oo=o[2-f],pkO=k[2-f],pmO=m[2-f]))
def rs(z,n):
    if len(z)<25:return
    w=sum(x['gana'] for x in z)/len(z);u=[x['o']-1 if x['gana'] else -1 for x in z];m=sum(u)/len(u);e=(sum((v-m)**2 for v in u)/len(u))**.5/len(u)**.5
    print(f"{n}: n={len(z)} gana {100*w:.1f}% (mercado {100*sum(x['pk'] for x in z)/len(z):.1f}) rinde {100*m:+.1f}% ±{200*e:.1f}")
for a,b in [(.3,.4),(.4,.5),(.5,.6),(.6,.7),(.7,.8),(.8,.97)]:rs([x for x in R if a<=x['pk']<b],f"fav {int(a*100)}-{int(b*100)}")
rs([x for x in R if x['pk']>=.6],'fav60+');rs([x for x in R if x['pk']>=.6 and x['mfav']],'fav60+ modelo acuerdo');rs([x for x in R if x['pk']>=.6 and x['pm']>=x['pk']],'fav60+ modelo más');rs([x for x in R if x['pk']>=.6 and not x['mfav']],'fav60+ modelo contra')
q=defaultdict(list)
for x in R:q[x['dia']].append(x)
rs([max(v,key=lambda y:y['pk']) for v in q.values()],'más seguro cada día')
P=[dict(pk=x['pkO'],gana=x['gopp'],o=x['oo'],pm=x['pmO'],mf=not x['mfav']) for x in R]
rs(P,'rival');rs([x for x in P if x['mf']],'rival que el modelo da favorito')
