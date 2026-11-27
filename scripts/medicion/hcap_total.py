# Hándicap + total → % de ganar (mejora diaria, 27-nov-2026)
# Idea (Stern 1991; «The Performance of Betting Lines for Predicting the Outcome of NFL Games», arXiv 1211.4000;
# «Converting College Football Point Spread Differentials to Probabilities», arXiv 2212.08116): el margen final se reparte
# casi normal alrededor del hándicap. Si el hándicap es el mercado más líquido, su % de ganar podría ser más exacto que
# el moneyline. Y con total alto hay más puntos y más varianza: el mismo hándicap valdría menos % (σ crece con el total).
#
# Se compara contra el moneyline de cierre sin vig (multiplicativo), que es lo que la app ya usa como mercado.
# Candidatos (fijados ANTES de correr; 3 por deporte, NBA y NFL = 6 pruebas):
#   A) Solo hándicap:          p = Φ(−sp / σ)                σ ajustado
#   B) Hándicap + total:       p = Φ(−sp / (k·√total))       k ajustado
#   C) Mezcla moneyline + B:   logit p = (1−w)·logit p_ml + w·logit p_B   (k y w ajustados)
# Reglas (fijadas antes): se ajusta en un bloque de temporadas y se prueba en el otro, en las DOS direcciones
#   NBA: 2020-22 ↔ 2023-25 (temporada en curso 2026-27 aparte, del archivo de cierres)
#   NFL: 2020-22 ↔ 2023-25 (2026 aparte). Al correr salió que 2019 trae líneas en vivo (corrección de datos, no de la regla).
# Pasa si: (1) la pérdida log baja contra el moneyline en las dos direcciones, (2) con las dos juntas p de Holm < 0.05
# sobre las 6 pruebas, (3) en la temporada en curso no va al revés (pérdida no peor), y (4) no pierde aciertos.
# Se descartan juegos sin hándicap o con el favorito del moneyline y el del hándicap al revés con |hándicap| ≥ 3 (línea rota).
# Uso: python3 hcap_total.py filas_nba.json cierres-nba.json datos-nfl.json cierres-nfl.json
import json, math, sys

def imp(x): return 100/(x+100) if x > 0 else -x/(-x+100)
def novig(a, b):
    if a is None or b is None: return None
    pa, pb = imp(a), imp(b); return pa/(pa+pb)
def Phi(x): return 0.5*(1+math.erf(x/math.sqrt(2)))
def lg(p): return math.log(p/(1-p))
def sg(x): return 1/(1+math.exp(-x))
def cl(p): return min(max(p, 1e-6), 1-1e-6)

def bueno(p, sp):
    if p is None or sp is None or not (0.01 < p < 0.99): return False
    if abs(sp) >= 3 and (p > 0.5) != (sp < 0): return False
    return True

def nba(filas_f, cier_f):
    J = []
    for r in json.load(open(filas_f)):
        if r.get('ty') not in (2, 3) or r.get('mar') in (None, 0): continue
        p = novig(r.get('mlH'), r.get('mlA')); sp = r.get('spread'); tot = r.get('total')
        if not bueno(p, sp) or not tot: continue
        J.append(dict(s=r['sk'], p=p, sp=sp, tot=tot, w=r['mar'] > 0))
    for g in json.load(open(cier_f))['temps']['2026']['juegos']:
        if not g.get('done') or g.get('skip') or g.get('ty') not in (2, 3) or g['hs'] == g['as']: continue
        l = g.get('linea') or {}; ml = l.get('ml') or [None, None]
        p = novig(ml[0], ml[1]); sp = l.get('sp'); tot = l.get('tot')
        if not bueno(p, sp) or not tot: continue
        J.append(dict(s=2026, p=p, sp=sp, tot=tot, w=g['hs'] > g['as']))
    return J

def nfl(datos_f, cier_f):
    J = []
    def add(g, s):
        if not g.get('done') or g.get('skip') or g['hs'] == g['as']: return
        l = g.get('linea') or {}; ml = l.get('ml') or [None, None]
        p = novig(ml[0], ml[1]); sp = l.get('sp'); tot = l.get('tot')
        if not bueno(p, sp) or not tot: return
        if not (33 <= tot <= 62): return   # total imposible en NFL = línea en vivo congelada (ver abajo)
        J.append(dict(s=s, p=p, sp=sp, tot=tot, w=g['hs'] > g['as']))
    d = json.load(open(datos_f))
    for s, T in d['temps'].items():
        if int(s) >= 2026 or int(s) < 2020: continue   # 2019: ESPN guardó líneas EN VIVO (totales de 21.5 y 60+, y el
                                                       # moneyline «acierta» con pérdida 0.511): se descarta, ver el doc
        for g in T['juegos']: add(g, int(s))
    for g in json.load(open(cier_f))['temps']['2026']['juegos']: add(g, 2026)
    return J

def ll(p, w): p = cl(p); return -math.log(p if w else 1-p)

def predA(J, sig): return [Phi(-g['sp']/sig) for g in J]
def predB(J, k): return [Phi(-g['sp']/(k*math.sqrt(g['tot']))) for g in J]
def predC(J, k, w): return [sg((1-w)*lg(cl(g['p'])) + w*lg(cl(q))) for g, q in zip(J, predB(J, k))]
def perd(P, J): return sum(ll(p, g['w']) for p, g in zip(P, J))/len(J)

def ajustar(J):
    sig = min([x/4 for x in range(20, 80)], key=lambda s: perd(predA(J, s), J))
    k = min([x/100 for x in range(30, 160)], key=lambda k: perd(predB(J, k), J))
    w = min([x/20 for x in range(0, 21)], key=lambda w: perd(predC(J, k, w), J))
    return dict(sig=sig, k=k, w=w)

def preds(J, P):
    return dict(A=predA(J, P['sig']), B=predB(J, P['k']), C=predC(J, P['k'], P['w']))

def comparar(J, Q):
    """Q: predicciones del candidato. Devuelve mejora de pérdida (milésimas, + = mejor que moneyline), z, aciertos."""
    d = [ll(g['p'], g['w']) - ll(q, g['w']) for g, q in zip(J, Q)]
    n = len(d); m = sum(d)/n; sd = math.sqrt(sum((x-m)**2 for x in d)/(n-1)) if n > 1 else 0
    okm = sum(((g['p'] > .5) == g['w']) for g in J); okq = sum(((q > .5) == g['w']) for g, q in zip(J, Q))
    dif = [(g, q) for g, q in zip(J, Q) if (g['p'] > .5) != (q > .5)]
    br = lambda P: sum((p - g['w'])**2 for p, g in zip(P, J))/n
    return dict(n=n, mej=1000*m, z=m/(sd/math.sqrt(n)) if sd else 0, okm=okm, okq=okq, ndif=len(dif),
                dif_q=sum(((q > .5) == g['w']) for g, q in dif), brm=br([g['p'] for g in J]), brq=br(Q), d=d)

def pval(z): return math.erfc(abs(z)/math.sqrt(2))

def correr(nom, J, A, B):
    print(f'\n=== {nom} ===')
    for s in sorted(set(g['s'] for g in J)): print(' temporada', s, sum(1 for g in J if g['s'] == s), 'juegos')
    JA = [g for g in J if g['s'] in A]; JB = [g for g in J if g['s'] in B]; JC = [g for g in J if g['s'] == 2026]
    PA, PB = ajustar(JA), ajustar(JB); PT = ajustar(JA + JB)
    print(' ajuste en', A, PA, '| en', B, PB, '| todo', PT)
    out = {}
    for c in 'ABC':
        r1 = comparar(JB, preds(JB, PA)[c]); r2 = comparar(JA, preds(JA, PB)[c])
        dd = r1['d'] + r2['d']; n = len(dd); m = sum(dd)/n; sd = math.sqrt(sum((x-m)**2 for x in dd)/(n-1)); z = m/(sd/math.sqrt(n))
        rc = comparar(JC, preds(JC, PT)[c]) if JC else None
        out[c] = dict(ida=r1, vuelta=r2, n=n, mej=1000*m, z=z, p=pval(z), cur=rc,
                      okm=r1['okm']+r2['okm'], okq=r1['okq']+r2['okq'], ndif=r1['ndif']+r2['ndif'], dif_q=r1['dif_q']+r2['dif_q'])
        x = out[c]
        print(f" {c}: ida {r1['mej']:+.2f} (z {r1['z']:+.2f}) · vuelta {r2['mej']:+.2f} (z {r2['z']:+.2f}) · juntas {x['mej']:+.2f} milésimas z {z:+.2f} p {x['p']:.4f}"
              f" | aciertos ML {x['okm']} vs {x['okq']} de {n} ({100*x['okm']/n:.2f}% → {100*x['okq']/n:.2f}%), cambian {x['ndif']} picks y el candidato acierta {x['dif_q']}"
              f" | Brier ida {r1['brm']:.5f}→{r1['brq']:.5f}"
              + (f" | en curso {rc['n']}: {rc['mej']:+.2f} (z {rc['z']:+.2f}), aciertos {rc['okm']}→{rc['okq']}" if rc else ''))
    return out, PA, PB, PT

def main():
    a = sys.argv[1:]
    R = {}
    R['NBA'] = correr('NBA', nba(a[0], a[1]), {2020, 2021, 2022}, {2023, 2024, 2025})
    R['NFL'] = correr('NFL', nfl(a[2], a[3]), {2020, 2021, 2022}, {2023, 2024, 2025})
    # Holm sobre las 6 pruebas (solo cuentan las que mejoran)
    T = sorted([(R[d][0][c]['p'], d, c) for d in R for c in 'ABC'])
    print('\nHolm (6 pruebas, 5%):')
    sigue = True
    for i, (p, d, c) in enumerate(T):
        x = R[d][0][c]; lim = 0.05/(6-i); ok = sigue and p < lim and x['mej'] > 0
        if not ok: sigue = False
        dirs = x['ida']['mej'] > 0 and x['vuelta']['mej'] > 0
        cur = x['cur'] is None or x['cur']['mej'] >= 0
        pasa = ok and dirs and cur and x['okq'] >= x['okm']
        print(f' {d} {c}: p {p:.4f} límite {lim:.4f} mejora {x["mej"]:+.2f} · dos direcciones {"sí" if dirs else "no"} · en curso {"bien" if cur else "al revés"} · aciertos {x["okm"]}→{x["okq"]} → {"PASA" if pasa else "no pasa"}')

if __name__ == '__main__':
    main()
