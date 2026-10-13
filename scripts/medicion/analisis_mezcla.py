import json,math
def ci(w,n): return 100*math.sqrt(max(w*(1-w),1e-9)/n)
def rep(name,rs):
    n=len(rs)
    if not n: print(name,'n=0'); return
    w=sum(r[0] for r in rs)/n
    roi=[(r[1]-1) if r[0] else -1 for r in rs if r[1]]
    rm=sum(roi)/len(roi); se=math.sqrt(sum((x-rm)**2 for x in roi)/max(len(roi)-1,1)/len(roi))
    print(f'{name:40s} n={n:5d} ganó {w*100:5.1f}%±{ci(w,n):3.1f} ROI {rm*100:+5.1f}%±{se*100:3.1f}')
# MLB
rows=[]
for y in (2024,2025,2026):
    for r in json.load(open(f'mlb_{y}.json')):
        pH=r['v']['P40'];pK=r['pK']
        for w in (0,0.5,1):   # w = peso del mercado
            pass
        rows.append((pH,pK,r['y'],r['dH'],r['dA']))
print('MLB: etiqueta por prob. modelo / mezcla 50-50 / mercado, corte Candidato>=62')
for nm,w in (('modelo',0),('mezcla50',.5),('mercado',1)):
    for cut in (58,62,66):
        rs=[]
        for pH,pK,y,dH,dA in rows:
            p=(1-w)*pH+w*pK
            fav='H' if p>=.5 else 'A'; pf=max(p,1-p)*100
            if pf<cut: continue
            won=(y==1) if fav=='H' else (y==0)
            rs.append((1 if won else 0, dH if fav=='H' else dA))
        rep(f'{nm} >= {cut}',rs)
print('FUT')
d=json.load(open('fut.json'))
for nm,w in (('modelo',0),('mezcla50',.5),('mercado',1)):
    for cut in (48,52,56):
        rs=[]
        for r in d:
            pm,mk=r['pm'],r['mk']
            p=[(1-w)*pm[i]+w*mk[i] for i in range(3)]
            fav=0 if p[0]>=p[2] else 2
            if p[fav]*100<cut: continue
            odds=r.get('ps') or r.get('avg')
            rs.append((1 if r['y']==fav else 0, odds[fav] if odds else None))
        rep(f'{nm} >= {cut}',rs)
