# Análisis de los picks que habría dicho la app (MLB, ganador) en 2024-2026, a la cuota de cierre de DraftKings.
# Replica veredictoEV de index.html (v68: la mezcla con el mercado decide «dudoso»; scripts/medicion/picks_app.js corre la función REAL
# y este script comprueba además por temporada, por tamaño de ventaja, el peso real del modelo y el modo «Al gane»).
# Datos: ramas var-S2024, var-S2025 y var-S2026 (ver picks_app.js).   Uso:  python3 scripts/medicion/analisis_picks.py <carpeta con var-S20XX>
# Informe: docs/MEDICION-PICKS-APP-2026-10.md
import math, random
import json, math, sys, random
from collections import defaultdict
R=(sys.argv[1] if len(sys.argv)>1 else '.').rstrip('/')+'/'
SEAS=['S2024','S2025','S2026']
W=0.24; EV_IMP=0.20
def logit(p): p=min(max(p,1e-9),1-1e-9); return math.log(p/(1-p))
def sig(x): return 1/(1+math.exp(-x))

def cargar(clave='P40'):
    out=[]
    for s in SEAS:
        for g in json.load(open(f'{R}var-{s}/variantes_{s}.json')):
            p=g['v'].get(clave)
            if p is None: continue
            out.append(dict(s=s,f=g['f'],y=g['y'],pH=p,iH=g['iH'],iA=g['iA'],dH=g['dH'],dA=g['dA']))
    return out

def decidir(g, w=W, imp_max=EV_IMP):
    """Replica veredictoEV de index.html v67. Devuelve (etiqueta, lado, p_lado, dec, fair, ev, edge, evmix)."""
    S=g['iH']+g['iA']; fH=g['iH']/S; fA=g['iA']/S
    lados={'A':dict(p=1-g['pH'],imp=g['iA'],fair=fA,dec=g['dA']),'H':dict(p=g['pH'],imp=g['iH'],fair=fH,dec=g['dH'])}
    for k,L in lados.items():
        L['ev']=L['p']*(L['dec']-1)-(1-L['p']); L['edge']=(L['p']-L['imp'])*100
        mix=sig(w*logit(L['p'])+(1-w)*logit(L['fair'])); L['evmix']=mix*(L['dec']-1)-(1-mix)
    k='A' if lados['A']['ev']>=lados['H']['ev'] else 'H'   # empate -> visita, igual que la app
    L=lados[k]
    if L['ev']>imp_max: et='alerta'
    elif L['ev']<=0: et='sin_apuesta'
    elif L['edge']<2: et='margen_minimo'
    elif L['evmix']<=0: et='dudoso'
    elif L['edge']<5: et='moderado'
    else: et='fuerte'
    return et,k,L

def resultado(g,k,L):
    gano=(k=='H' and g['y']==1) or (k=='A' and g['y']==0)
    return (L['dec']-1) if gano else -1.0, gano

def stats(rets):
    n=len(rets)
    if n==0: return dict(n=0)
    m=sum(rets)/n
    sd=math.sqrt(sum((x-m)**2 for x in rets)/(n-1)) if n>1 else 0
    se=sd/math.sqrt(n) if n>1 else 0
    return dict(n=n,roi=m,se=se,t=m/se if se else 0)


# ---------------- análisis por temporada, tamaño de ventaja, favorito/underdog ----------------
G=cargar()
filas=[]
for g in G:
    et,k,L=decidir(g); r,gano=resultado(g,k,L)
    filas.append(dict(g=g,et=et,k=k,L=L,r=r,gano=gano,s=g['s']))
VAL=('fuerte','moderado','dudoso')            # todo lo que la app v66 llamaba "valor" (EV>0, >=2 pts, sin alerta)
def pr(nom,v):
    if not v: print(f'{nom:34} sin juegos'); return
    st=stats([x['r'] for x in v]); esp=sum(x['L']['fair']*x['L']['dec']-1 for x in v)/len(v)
    w=sum(1 for x in v if x['gano'])/len(v)
    pm=sum(x['L']['p'] for x in v)/len(v); pf=sum(x['L']['fair'] for x in v)/len(v)
    ex=[x['r']-(x['L']['fair']*x['L']['dec']-1) for x in v]; se=stats(ex)
    print(f"{nom:34}{st['n']:>6}  acierto {w*100:5.1f}% (app decía {pm*100:4.1f}%, mercado {pf*100:4.1f}%)  ROI {st['roi']*100:+6.1f}% ±{st['se']*100:3.1f}  | esperado si el mercado sabe todo {esp*100:+5.1f}%  | exceso {se['roi']*100:+5.1f}% ±{se['se']*100:3.1f} (t {se['t']:+.2f})")
print('=== 1) TODOS LOS PICKS DE "VALOR" (fuerte+moderado+dudoso), por temporada ===')
for s in ['S2024','S2025','S2026','TODAS']:
    pr(s,[x for x in filas if x['et'] in VAL and (s=='TODAS' or x['s']==s)])
print('\n=== 2) Solo lo que v67 sigue llamando valor (fuerte+moderado) vs "dudoso" ===')
for nom,ets in [('fuerte+moderado',('fuerte','moderado')),('dudoso',('dudoso',))]:
    for s in ['S2024','S2025','S2026','TODAS']:
        pr(f'{nom} {s}',[x for x in filas if x['et'] in ets and (s=='TODAS' or x['s']==s)])
print('\n=== 3) ROI según el tamaño de la ventaja que veía la app (pts sobre la cuota CON vig) ===')
for lo,hi in [(-99,0),(0,2),(2,4),(4,6),(6,8),(8,10),(10,15),(15,99)]:
    pr(f'ventaja {lo}..{hi}',[x for x in filas if lo<=x['L']['edge']<hi])
print('\n=== 4) Favorito vs underdog en los picks de valor ===')
for nom,f in [('favorito (mercado>50%)',lambda x:x['L']['fair']>0.5),('underdog (mercado<=50%)',lambda x:x['L']['fair']<=0.5),('local',lambda x:x['k']=='H'),('visita',lambda x:x['k']=='A')]:
    pr(nom,[x for x in filas if x['et'] in VAL and f(x)])
print('\n=== 5) Lo que MÁS se separa del mercado (EV>20% = "precio imposible") por temporada ===')
for s in ['S2024','S2025','S2026']: pr('alerta '+s,[x for x in filas if x['et']=='alerta' and x['s']==s])


# ---------------- peso del modelo, modo «Al gane», banca y tamaño de muestra ----------------
SE=['S2024','S2025','S2026']
filas=[]
for g in G:
    et,k,L=decidir(g); r,gano=resultado(g,k,L); filas.append(dict(g=g,et=et,k=k,L=L,r=r,gano=gano,s=g['s']))
def roi(v):
    st=stats([x['r'] for x in v]); return st
def fmt(st): return f"n={st['n']:>4} ROI {st['roi']*100:+6.1f}% ±{st['se']*100:4.1f}" if st['n'] else 'n=0'
VAL=('fuerte','moderado','dudoso')
print('=== A) ¿El patrón "mientras más se separa del mercado, peor" se repite en CADA temporada? ===')
print(f"{'':10}{'ventaja 2 a 6 pts':>34}{'ventaja 6 a 8':>34}{'ventaja 8+ pts':>34}")
for s in SE+['TODAS']:
    row=[x for x in filas if x['et'] in VAL+('alerta',) and (s=='TODAS' or x['s']==s)]
    a=[x for x in row if 2<=x['L']['edge']<6 and x['et']!='alerta']; b=[x for x in row if 6<=x['L']['edge']<8 and x['et']!='alerta']; c=[x for x in filas if x['L']['edge']>=8 and (s=='TODAS' or x['s']==s)]
    print(f"{s:10}{fmt(roi(a)):>34}{fmt(roi(b)):>34}{fmt(roi(c)):>34}")
print('   (la columna 8+ incluye también lo que la app marca como "precio imposible")')

print('\n=== B) Peso real del modelo (regresión logística y ~ logit(mercado) + w·(logit(modelo)-logit(mercado))) ===')
def ll(p,y): p=min(max(p,1e-9),1-1e-9); return -(math.log(p) if y else math.log(1-p))
def ajustar(rows):
    # busca w en [-0.5, 1.5] que minimiza log-loss
    best=None
    for i in range(-50,151):
        w=i/100; t=0
        for g in rows:
            S=g['iH']+g['iA']; fH=g['iH']/S
            p=sig((1-w)*logit(fH)+w*logit(g['pH'])); t+=ll(p,g['y'])
        if best is None or t<best[0]: best=(t,w)
    return best[1]
def perdida(rows,w):
    t=0
    for g in rows:
        S=g['iH']+g['iA']; fH=g['iH']/S; t+=ll(sig((1-w)*logit(fH)+w*logit(g['pH'])),g['y'])
    return t/len(rows)
for s in SE+['TODAS']:
    rows=[g for g in G if s=='TODAS' or g['s']==s]
    w=ajustar(rows); print(f"{s:7} mejor peso del modelo w = {w:.2f}  | log-loss: mercado {perdida(rows,0):.4f}  modelo solo {perdida(rows,1):.4f}  mezcla w=0.24 {perdida(rows,0.24):.4f}  mezcla óptima {perdida(rows,w):.4f}")
print('   Fuera de muestra (ajusto w en 2 temporadas y lo pruebo en la tercera):')
tot_d=[]
for s in SE:
    w=ajustar([g for g in G if g['s']!=s]); rows=[g for g in G if g['s']==s]
    d=[]
    for g in rows:
        S=g['iH']+g['iA']; fH=g['iH']/S
        d.append(ll(fH,g['y'])-ll(sig((1-w)*logit(fH)+w*logit(g['pH'])),g['y']))
    m=sum(d)/len(d); sd=math.sqrt(sum((x-m)**2 for x in d)/(len(d)-1)); tot_d+=d
    print(f"   prueba en {s}: w={w:.2f}  mejora vs mercado = {m:+.5f} por juego (t {m/(sd/math.sqrt(len(d))):+.2f})")
m=sum(tot_d)/len(tot_d); sd=math.sqrt(sum((x-m)**2 for x in tot_d)/(len(tot_d)-1))
print(f"   las 3 pruebas juntas: {m:+.5f} por juego (t {m/(sd/math.sqrt(len(tot_d))):+.2f}) — positivo = la mezcla le gana al mercado")

print('\n=== C) Modo "Al gane": cuando la app dice que un equipo tiene X% de ganar, ¿cuánto gana de verdad? ===')
print(f"{'la app dice':14}{'juegos':>7}{'gana de verdad':>16}{'app decía':>11}{'mercado decía':>15}{'ROI a cuota de cierre':>24}")
bands=[(.50,.55),(.55,.60),(.60,.65),(.65,.70),(.70,.80)]
for lo,hi in bands:
    v=[]
    for g in G:
        p=max(g['pH'],1-g['pH']); 
        if not(lo<=p<hi): continue
        k='H' if g['pH']>=0.5 else 'A'
        S=g['iH']+g['iA']; fair=(g['iH'] if k=='H' else g['iA'])/S; dec=g['dH'] if k=='H' else g['dA']
        gano=(k=='H' and g['y']==1) or (k=='A' and g['y']==0)
        v.append((p,fair,dec,gano))
    n=len(v); w=sum(1 for x in v if x[3])/n
    rets=[(x[2]-1) if x[3] else -1 for x in v]; st=stats(rets)
    print(f"{lo*100:.0f}% a {hi*100:.0f}%   {n:>7}{w*100:>15.1f}%{sum(x[0] for x in v)/n*100:>10.1f}%{sum(x[1] for x in v)/n*100:>14.1f}%{st['roi']*100:>16.1f}% ±{st['se']*100:.1f}")

print('\n=== D) Tu banca de $1,000 con el ¼ Kelly de la app (stake = banca × ¼ × Kelly con TU número), día por día, 3 temporadas seguidas ===')
def kelly_app(L, usar_mix=False):
    p=L['p'] if not usar_mix else sig(0.24*logit(L['p'])+0.76*logit(L['fair']))
    b=L['dec']-1; return max(0,(p*b-(1-p))/b)
def banca(sel, usar_mix=False, cap=None):
    por_dia=defaultdict(list)
    for x in sel: por_dia[x['g']['f']].append(x)
    bk=1000.0; pico=bk; dd=0; hist=[]
    for f in sorted(por_dia):
        base=bk; delta=0
        for x in por_dia[f]:
            st=base*0.25*kelly_app(x['L'],usar_mix)
            if cap: st=min(st,base*cap)
            delta+= st*x['r']
        bk+=delta; pico=max(pico,bk); dd=max(dd,(pico-bk)/pico); hist.append(bk)
    return bk,dd,min(hist)
for nom,sel,mix in [('v66: todo lo que decía "valor" (fuerte+moderado+dudoso)',[x for x in filas if x['et'] in VAL],False),
                    ('v67: solo fuerte+moderado',[x for x in filas if x['et'] in ('fuerte','moderado')],False),
                    ('v67 pero con Kelly sobre la mezcla (mercado+modelo)',[x for x in filas if x['et'] in ('fuerte','moderado')],True)]:
    bk,dd,mn=banca(sel,mix)
    print(f"{nom:62} termina en ${bk:,.0f}  | peor caída {dd*100:.0f}%  | mínimo ${mn:,.0f}")

print('\n=== E) ¿Cuántos picks hacen falta para saberlo con ROI? ===')
sd=math.sqrt(sum((x['r']-sum(y['r'] for y in filas if y['et'] in VAL)/len([1 for y in filas if y['et'] in VAL]))**2 for x in filas if x['et'] in VAL)/(len([1 for y in filas if y['et'] in VAL])-1))
print(f"   desviación de un pick de valor = {sd:.2f} unidades")
por_temp=len([1 for y in filas if y['et'] in VAL])/3
for r in [0.02,0.03,0.05]:
    n=math.ceil((2*sd/r)**2); print(f"   para distinguir de la suerte un ROI verdadero de +{r*100:.0f}% (t=2) hacen falta ≈ {n:,} picks (≈ {n/por_temp:.1f} temporadas completas con el ritmo de {por_temp:.0f} picks por temporada)")
