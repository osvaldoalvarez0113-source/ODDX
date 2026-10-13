import json,math
S='./'
rows=[]
for y in (2024,2025,2026):
    for r in json.load(open(f'mlb_{y}.json')):
        pH=r['v']['P40']; pK=r['pK']
        fav='H' if pH>=0.5 else 'A'
        pf=pH if fav=='H' else 1-pH
        mf=pK if fav=='H' else 1-pK
        won=(r['y']==1) if fav=='H' else (r['y']==0)
        dec=r['dH'] if fav=='H' else r['dA']
        favMer='H' if pK>=0.5 else 'A'
        rows.append(dict(y=y,pf=pf*100,mf=mf*100,won=1 if won else 0,dec=dec,same=(fav==favMer),pH=pH,pK=pK,res=r['y']))
def cmp(r):
    d=r['pf']-r['mf']
    if (not r['same']) or abs(d)>=6: return 'choca'
    return 'coinc' if abs(d)<=3 else 'cerca'
def lab(p,t=(62,55)):
    return 'cand' if p>=t[0] else ('cuid' if p>=t[1] else 'evit')
def ll(p,y): p=min(max(p,1e-6),1-1e-6); return -math.log(p if y else 1-p)
def summ(rs,name):
    n=len(rs)
    if n==0: print(f'{name:34s} n=0'); return
    w=sum(r['won'] for r in rs)/n
    se=math.sqrt(max(w*(1-w),1e-9)/n)
    mp=sum(r['pf'] for r in rs)/n; mm=sum(r['mf'] for r in rs)/n
    roi=[(r['dec']-1) if r['won'] else -1 for r in rs]; rm=sum(roi)/n
    rse=math.sqrt(sum((x-rm)**2 for x in roi)/max(n-1,1)/n)
    lm=sum(ll(r['pf']/100,r['won']) for r in rs)/n; lk=sum(ll(r['mf']/100,r['won']) for r in rs)/n
    print(f'{name:34s} n={n:5d}  modelo {mp:5.1f}%  mercado {mm:5.1f}%  GANÓ {w*100:5.1f}%±{se*100:3.1f}  (gana-mercado {w*100-mm:+5.1f})  ROI {rm*100:+5.1f}%±{rse*100:3.1f}  logloss mod {lm:.4f} mer {lk:.4f}')
print('=== MLB',len(rows),'juegos (2024-2026), línea de cierre DraftKings (ESPN) ===')
summ(rows,'TODOS (favorito del modelo)')
print('\n-- A. Por nivel de la Mesa (solo modelo): cand>=62, cuid 55-62, evit<55')
for k in ('cand','cuid','evit'): summ([r for r in rows if lab(r['pf'])==k],k)
print('\n-- B. Por coincidencia con el mercado (diferencia entre modelo y mercado del favorito)')
for k in ('coinc','cerca','choca'): summ([r for r in rows if cmp(r)==k],k)
print('\n-- C. Cruce nivel x mercado')
for k in ('cand','cuid','evit'):
    for c in ('coinc','cerca','choca'): summ([r for r in rows if lab(r['pf'])==k and cmp(r)==c],f'{k} + {c}')
print('\n-- D. Barrido del corte de "Candidato" (modelo >= X)')
for t in (50,52,54,55,56,58,60,62,64,66,68):
    summ([r for r in rows if r['pf']>=t],f'modelo >= {t}')
print('\n-- E. Barrido de la tolerancia de coincidencia (mismo favorito y |dif| <= X)')
for t in (1,2,3,4,5,6,8):
    summ([r for r in rows if r['same'] and abs(r['pf']-r['mf'])<=t],f'coinc <= {t} pts')
print('\n-- F. Cuando CHOCAN: ¿quién tiene la razón? (modelo ve MÁS que el mercado vs MENOS)')
summ([r for r in rows if r['same'] and r['pf']-r['mf']>=6],'modelo >= mercado+6 (misma fav)')
summ([r for r in rows if r['same'] and r['pf']-r['mf']<=-6],'modelo <= mercado-6 (misma fav)')
summ([r for r in rows if not r['same']],'distinto favorito')
print('\n-- G. Candidato real = modelo>=62 Y mercado de acuerdo (<=6 pts, misma fav)')
summ([r for r in rows if r['pf']>=62 and r['same'] and abs(r['pf']-r['mf'])<=6],'cand + coinc/cerca')
summ([r for r in rows if r['pf']>=62 and not (r['same'] and abs(r['pf']-r['mf'])<=6)],'cand + choca (se baja a Cuidado)')
print('\n-- H. por temporada: Candidato + mercado de acuerdo')
for y in (2024,2025,2026): summ([r for r in rows if r['y']==y and r['pf']>=62 and r['same'] and abs(r['pf']-r['mf'])<=6],f'{y}')
print('\n-- I. referencia: favorito del MERCADO solo (sin modelo), por nivel de prob de mercado')
for lo,hi in ((50,55),(55,60),(60,65),(65,100)):
    rs=[dict(r,pf=r['mf']) for r in rows if lo<=r['mf']<hi and not r['same'] or (lo<=r['mf']<hi)]
    pass
