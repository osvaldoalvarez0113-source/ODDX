# Fútbol (5 ligas, 2020-21 a 2025-26, cierre de Pinnacle): qué habría dicho el modelo del app contra el mercado, ROI, mezcla y calibración.
# Datos: rama resultados-futbol-6t (partidos_futbol.json), la escribe el workflow futbol-6t.yml de la rama futbol-6t (scripts/correr_deportes.js futbol con TEMPS_FUTBOL=1819…2526, TUNE_FUTBOL=1920, PRE_FUTBOL=1819, VOLCAR_PARTIDOS=1).
# Uso:  python3 -I scripts/medicion/analisis_futbol_6t.py partidos_futbol.json
import json, math, sys
import numpy as np
r = json.load(open(sys.argv[1]))
r = [x for x in r if all(v is not None for v in x['F0']) ]
print('partidos', len(r))
def ll(p,y): return -math.log(max(p[y],1e-9))
seasons = sorted(set(x['t'] for x in r))
def pool(pm,pk,w):
    q=[(pm[i]**w)*(pk[i]**(1-w)) for i in range(3)]; s=sum(q); return [v/s for v in q]
# 1) log loss por temporada
print('\n1) pérdida log por temporada (menor = mejor)')
print('temp   n    F0     F1     F3     MKT   F0-MKT')
for t in seasons+['TODAS']:
    rr=[x for x in r if t=='TODAS' or x['t']==t]
    m={k:np.mean([ll(x[k] if k!='MK' else x['mk'],x['y']) for x in rr]) for k in ['F0','F1','F3','MK']}
    d=[ll(x['F0'],x['y'])-ll(x['mk'],x['y']) for x in rr]; se=np.std(d,ddof=1)/math.sqrt(len(d))
    print(t,len(rr),'%.4f %.4f %.4f %.4f  %+.4f (z %.1f)'%(m['F0'],m['F1'],m['F3'],m['MK'],np.mean(d),np.mean(d)/se))
# 2) mezcla w óptimo, leave-one-season-out, F0 y F3
print('\n2) peso del modelo en la mezcla (potencia) fuera de muestra')
Ws=[i/20 for i in range(0,21)]
for k in ['F0','F3']:
    tot=[];lams=[]
    for t in seasons:
        tr=[x for x in r if x['t']!=t]; te=[x for x in r if x['t']==t]
        best=min(Ws,key=lambda w:np.mean([ll(pool(x[k],x['mk'],w),x['y']) for x in tr]))
        lams.append('%s:%.2f'%(t,best))
        tot+= [ll(pool(x[k],x['mk'],best),x['y'])-ll(x['mk'],x['y']) for x in te]
    print(k,' '.join(lams),'dif vs mercado %+.5f ± %.5f (z %.1f)'%(np.mean(tot),2*np.std(tot,ddof=1)/math.sqrt(len(tot)),np.mean(tot)/(np.std(tot,ddof=1)/math.sqrt(len(tot)))))
    # curva global
    print('   curva global w->dif:',' '.join('%.2f:%+.4f'%(w,np.mean([ll(pool(x[k],x['mk'],w),x['y'])-ll(x['mk'],x['y']) for x in r])) for w in [0,0.1,0.2,0.3,0.5,0.75,1]))
# 3) ROI de apostar el pick del modelo a cuota Pinnacle, por umbral y por temporada
def dec(o): return o
def roi(rows,key,thr,oddsk='ps'):
    rets=[]
    for x in rows:
        o=x.get(oddsk)
        if not o: continue
        e=[x[key][i]-x['mk'][i] for i in range(3)]; i=max(range(3),key=lambda j:e[j])
        if e[i]<thr: continue
        rets.append(o[i]-1 if x['y']==i else -1)
    return rets
print('\n3) ROI apostando el resultado donde el modelo ve más ventaja (cuota Pinnacle cierre), por temporada')
for k in ['F0','F3']:
    print(k)
    for thr in [0.02,0.05,0.08]:
        line=[]
        for t in seasons:
            q=roi([x for x in r if x['t']==t],k,thr); line.append('%s %d ap %+.1f%%'%(t,len(q),100*np.mean(q) if q else 0))
        q=roi(r,k,thr); se=np.std(q,ddof=1)/math.sqrt(len(q))
        print('  >=%d pts: TOTAL %d ap %+.1f%% ±%.1f | '%(thr*100,len(q),100*np.mean(q),200*se)+' | '.join(line))
# 4) calibración de F0 (todas las prob. de los 3 resultados) y del mercado
print('\n4) calibración (prob predicha -> frecuencia real)')
for k in ['F0','F3','MK']:
    bins=[(0,.15),(.15,.25),(.25,.35),(.35,.45),(.45,.55),(.55,.7),(.7,1.01)]
    out=[]
    for lo,hi in bins:
        pp=[];yy=[]
        for x in r:
            P=x[k] if k!='MK' else x['mk']
            for i in range(3):
                if lo<=P[i]<hi: pp.append(P[i]); yy.append(1 if x['y']==i else 0)
        out.append('%.0f-%.0f%%: n=%d pred %.1f%% real %.1f%%'%(lo*100,min(hi,1)*100,len(pp),100*np.mean(pp),100*np.mean(yy)))
    print(k,'|',' | '.join(out))
# 5) line shopping: Pinnacle fair vs odds promedio / mejor, EV por tramo
print('\n5) "El valor" que da la app cuando usa Pinnacle sin margen como número justo, y tú tienes cuota promedio o mejor cuota')
for oddsk,nom in [('avg','promedio cierre'),('mx','mejor cuota cierre')]:
    for lo,hi in [(0,0.02),(0.02,0.05),(0.05,0.10),(0.10,9)]:
        rets=[];evs=[]
        for x in r:
            o=x.get(oddsk)
            if not o: continue
            for i in range(3):
                ev=x['mk'][i]*o[i]-1
                if lo<=ev<hi: rets.append(o[i]-1 if x['y']==i else -1); evs.append(ev)
        if rets:
            se=np.std(rets,ddof=1)/math.sqrt(len(rets))
            print(' %-18s EV prometido %2.0f-%2.0f%%: %5d apuestas  EV medio %+.1f%%  ROI real %+.1f%% ± %.1f'%(nom,lo*100,min(hi,9)*100,len(rets),100*np.mean(evs),100*np.mean(rets),200*se))
