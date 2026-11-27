# Tenis: ¿corregir el % de Kalshi por el sesgo favorito-perro lo hace más exacto? (mejora diaria, 27-nov-2026)
# Pista: MEDICION-TENIS-BATERIA-2026-11.md (favorito de Kalshi 80-90% ganó 86.5% contra 84.4%; 90%+ ganó 95.9% contra 93.4%) y la
# literatura del sesgo favorito-longshot (en NBA/NHL/NFL/MLB ya se probó en MEDICION-RECALIBRAR-2026-11.md: no pasa).
# Datos: filas_tenis_kalshi.json (rama resultados-tenis): 7,506 partidos ATP y WTA con la última vela de 1 h antes de empezar.
# El % del mercado es el medio entre compra y venta (como en tenis_mercado.js). Se mira desde el favorito del mercado.
#
# Candidatos (fijados ANTES de correr; 2 pruebas):
#   1) Una curva para los dos circuitos:   p' = sigmoide(a + b·logit(p))
#   2) Una curva por circuito (ATP y WTA aparte)
# Regla: se ajusta en 2025 y se prueba en 2026, y al revés. Pasa si baja la pérdida log con t >= 2 en LAS DOS direcciones,
# Holm < 5% sobre las 2 pruebas (con las dos direcciones juntas), b sale del mismo lado de 1 en las dos mitades y no pierde aciertos.
# Uso: python3 tenis_calibrar.py filas_tenis_kalshi.json
import json, math, sys, time

def lg(p): return math.log(p/(1-p))
def sg(x): return 1/(1+math.exp(-x))
def ll(p, y): p = min(max(p, 1e-6), 1-1e-6); return -math.log(p if y else 1-p)

def cargar(f):
    R = []
    for r in json.load(open(f)):
        m = (r['aW'] + r['bW'])/2
        m = min(max(m, 0.01), 0.99)
        if abs(m-0.5) < 1e-9: continue
        fav = m > 0.5
        R.append(dict(y=1 if fav else 0, p=m if fav else 1-m, tour=r['tour'], an=time.gmtime(r['ts']).tm_year))
    return R

def ajustar(R):
    """Newton para logística con offset: y ~ sigmoide(a + b·logit(p))."""
    a, b = 0.0, 1.0
    for _ in range(50):
        ga = gb = haa = hab = hbb = 0.0
        for r in R:
            x = lg(r['p']); q = sg(a + b*x); e = r['y'] - q; w = q*(1-q)
            ga += e; gb += e*x; haa += w; hab += w*x; hbb += w*x*x
        det = haa*hbb - hab*hab
        da = (hbb*ga - hab*gb)/det; db = (haa*gb - hab*ga)/det
        a += da; b += db
        if abs(da) + abs(db) < 1e-10: break
    return a, b

def corr(r, ab): a, b = ab; return sg(a + b*lg(r['p']))

def prueba(train, test, por_tour):
    if por_tour:
        P = {t: ajustar([r for r in train if r['tour'] == t]) for t in ('a', 'w')}
        Q = [corr(r, P[r['tour']]) for r in test]
    else:
        P = ajustar(train); Q = [corr(r, P) for r in test]
    d = [ll(r['p'], r['y']) - ll(q, r['y']) for r, q in zip(test, Q)]
    ok0 = sum((r['p'] > .5) == bool(r['y']) for r in test); ok1 = sum((q > .5) == bool(r['y']) for r, q in zip(test, Q))
    return P, d, ok0, ok1

def tz(d):
    n = len(d); m = sum(d)/n; sd = math.sqrt(sum((x-m)**2 for x in d)/(n-1)); return 1000*m, m/(sd/math.sqrt(n))

def tabla(R, ab_por_tour):
    out = []
    for lo, hi in ((.5, .6), (.6, .7), (.7, .8), (.8, .9), (.9, 1.0)):
        G = [r for r in R if lo <= r['p'] < hi]
        if not G: continue
        c = sum(corr(r, ab_por_tour) for r in G)/len(G)
        out.append('| %d-%d%% | %d | %.1f%% | %.1f%% | %.1f%% |' % (lo*100, hi*100, len(G), 100*sum(r['p'] for r in G)/len(G), 100*c, 100*sum(r['y'] for r in G)/len(G)))
    return out

def main():
    R = cargar(sys.argv[1])
    A = [r for r in R if r['an'] == 2025]; B = [r for r in R if r['an'] == 2026]
    print('Partidos: %d (2025: %d · 2026: %d). Favorito de Kalshi ganó %.1f%%, su precio decía %.1f%%' % (
        len(R), len(A), len(B), 100*sum(r['y'] for r in R)/len(R), 100*sum(r['p'] for r in R)/len(R)))
    res = []
    for nom, pt in (('Una curva (ATP y WTA juntos)', False), ('Una curva por circuito', True)):
        P1, d1, a1, b1 = prueba(A, B, pt); P2, d2, a2, b2 = prueba(B, A, pt)
        m1, t1 = tz(d1); m2, t2 = tz(d2); mj, tj = tz(d1 + d2); p = math.erfc(abs(tj)/math.sqrt(2))
        def bs(P): return [P[t][1] for t in ('a', 'w')] if pt else [P[1]]
        mismo = all((x > 1) == (bs(P1)[0] > 1) for x in bs(P1) + bs(P2))
        res.append(dict(nom=nom, m1=m1, t1=t1, m2=m2, t2=t2, mj=mj, tj=tj, p=p, mismo=mismo, ok0=a1+a2, ok1=b1+b2, n=len(d1)+len(d2), P1=P1, P2=P2))
        print('\n%s\n ajusta 2025 → prueba 2026: %+.2f milésimas (t %+.2f) · ajusta 2026 → prueba 2025: %+.2f (t %+.2f) · juntas %+.2f (t %+.2f, p %.4f)' % (nom, m1, t1, m2, t2, mj, tj, p))
        print(' parámetros 2025:', P1, '| 2026:', P2)
        print(' aciertos: precio %d → corregido %d de %d' % (a1+a2, b1+b2, len(d1)+len(d2)))
    print('\nHolm (2 pruebas, 5%):')
    sigue = True
    for i, x in enumerate(sorted(res, key=lambda x: x['p'])):
        lim = 0.05/(2-i); ok = sigue and x['p'] < lim and x['mj'] > 0
        if not ok: sigue = False
        pasa = ok and x['t1'] >= 2 and x['t2'] >= 2 and x['mismo'] and x['ok1'] >= x['ok0']
        print(' %s: p %.4f (límite %.4f) · t ida %+.2f vuelta %+.2f · pendiente del mismo lado %s · aciertos %d→%d → %s' % (
            x['nom'], x['p'], lim, x['t1'], x['t2'], 'sí' if x['mismo'] else 'no', x['ok0'], x['ok1'], 'PASA' if pasa else 'no pasa'))
    T = ajustar(R)
    print('\nCon todo junto: a = %.3f, b = %.3f. Por franja (precio decía → corregido → pasó):\n' % T)
    print('| Franja | Partidos | Precio decía | Corregido | Pasó |\n|---|---|---|---|---|')
    print('\n'.join(tabla(R, T)))
    for t, nom in (('a', 'ATP'), ('w', 'WTA')):
        G = [r for r in R if r['tour'] == t]; Tt = ajustar(G)
        print('\n%s (%d partidos): a = %.3f, b = %.3f\n' % (nom, len(G), Tt[0], Tt[1]))
        print('| Franja | Partidos | Precio decía | Corregido | Pasó |\n|---|---|---|---|---|'); print('\n'.join(tabla(G, Tt)))

if __name__ == '__main__':
    main()
