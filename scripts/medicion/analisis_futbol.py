import json,math
d=json.load(open('fut.json'))
rows=[]
for r in d:
    pm,mk,y=r['pm'],r['mk'],r['y']
    fav=0 if pm[0]>=pm[2] else 2
    pf=pm[fav]*100; mf=mk[fav]*100
    favMer=0 if mk[0]>=mk[2] else 2
    won=1 if y==fav else 0
    odds=(r.get('ps') or r.get('avg'))
    dec=odds[fav] if odds else None
    mx=r.get('mx'); decmx=mx[fav] if mx else None
    rows.append(dict(t=r['t'],lg=r['lg'],pf=pf,mf=mf,won=won,dec=dec,decmx=decmx,same=(fav==favMer),pm=pm,mk=mk,y=y,fav=fav))
def cmp(r):
    d=r['pf']-r['mf']
    if (not r['same']) or abs(d)>=6: return 'choca'
    return 'coinc' if abs(d)<=3 else 'cerca'
def lab(p,t=(52,45)): return 'cand' if p>=t[0] else ('cuid' if p>=t[1] else 'evit')
def ll(p,y): p=min(max(p,1e-6),1-1e-6); return -math.log(p if y else 1-p)
def summ(rs,name):
    n=len(rs)
    if n==0: print(f'{name:34s} n=0'); return
    w=sum(r['won'] for r in rs)/n; se=math.sqrt(max(w*(1-w),1e-9)/n)
    mp=sum(r['pf'] for r in rs)/n; mm=sum(r['mf'] for r in rs)/n
    rr=[r for r in rs if r['dec']]
    roi=[(r['dec']-1) if r['won'] else -1 for r in rr]; rm=sum(roi)/len(roi)
    rse=math.sqrt(sum((x-rm)**2 for x in roi)/max(len(roi)-1,1)/len(roi))
    rx=[(r['decmx']-1) if r['won'] else -1 for r in rs if r['decmx']]; rxm=sum(rx)/len(rx) if rx else float('nan')
    lm=sum(ll(r['pf']/100,r['won']) for r in rs)/n; lk=sum(ll(r['mf']/100,r['won']) for r in rs)/n
    print(f'{name:34s} n={n:5d} modelo {mp:5.1f}% mercado {mm:5.1f}% GANÓ {w*100:5.1f}%±{se*100:3.1f} (vs mercado {w*100-mm:+5.1f}) ROI Pinnacle {rm*100:+5.1f}%±{rse*100:3.1f} ROI mejor línea {rxm*100:+5.1f}% | logloss mod {lm:.4f} mer {lk:.4f}')
print('=== FÚTBOL',len(rows),'partidos, 5 ligas, 2023-24..2025-26, cierre Pinnacle; favorito = local o visita con más prob (excluye empate como pick) ===')
summ(rows,'TODOS')
print('\n-- A. Por nivel (solo modelo): cand>=52, cuid 45-52, evit<45')
for k in ('cand','cuid','evit'): summ([r for r in rows if lab(r['pf'])==k],k)
print('\n-- B. Por coincidencia con el mercado')
for k in ('coinc','cerca','choca'): summ([r for r in rows if cmp(r)==k],k)
print('\n-- C. Cruce nivel x mercado')
for k in ('cand','cuid','evit'):
    for c in ('coinc','cerca','choca'): summ([r for r in rows if lab(r['pf'])==k and cmp(r)==c],f'{k} + {c}')
print('\n-- D. Barrido del corte de Candidato (modelo >= X)')
for t in (40,45,48,50,52,55,58,60,65,70): summ([r for r in rows if r['pf']>=t],f'modelo >= {t}')
print('\n-- E. Barrido de tolerancia (misma fav y |dif|<=X)')
for t in (1,2,3,4,5,6,8): summ([r for r in rows if r['same'] and abs(r['pf']-r['mf'])<=t],f'coinc <= {t}')
print('\n-- F. Quién tiene la razón cuando chocan')
summ([r for r in rows if r['same'] and r['pf']-r['mf']>=6],'modelo >= mercado+6')
summ([r for r in rows if r['same'] and r['pf']-r['mf']<=-6],'modelo <= mercado-6')
summ([r for r in rows if not r['same']],'distinto favorito')
print('\n-- G. Candidato real (>=52 y mercado de acuerdo <=6 pts) vs el resto de candidatos')
summ([r for r in rows if r['pf']>=52 and r['same'] and abs(r['pf']-r['mf'])<=6],'cand + coinc/cerca')
summ([r for r in rows if r['pf']>=52 and not (r['same'] and abs(r['pf']-r['mf'])<=6)],'cand + choca')
print('\n-- H. por temporada: cand + coinc/cerca')
for t in ('2324','2425','2526'): summ([r for r in rows if r['t']==t and r['pf']>=52 and r['same'] and abs(r['pf']-r['mf'])<=6],t)
print('\n-- I. el mercado solo (sin modelo): favorito del mercado con prob >= X')
for t in (45,50,55,60,65):
    rs=[dict(r,pf=r['mf'],dec=None) for r in rows if r['mf']>=t and not r['same']==False]
    n=len(rs)
