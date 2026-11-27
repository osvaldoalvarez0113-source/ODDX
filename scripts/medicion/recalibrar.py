# RECALIBRAR EL % DEL MERCADO: sesgo favorito-longshot (27-nov-2026, mejora diaria)
# Pista: en HISTORIA-LIGA-2026-11.md los favoritos grandes ganan más de lo que dice su % (NBA 85%+: 91.4 contra 88.3;
# NFL 85%+: 93.7 contra 88.8; NHL 75-80%: 82.8 contra 76.9). Es el sesgo favorito-longshot que describe la literatura.
# ¿Corregir el % de cierre con p' = sigmoide(a + b·logit(p) [+ c·favorito local]) lo vuelve más exacto en juegos nuevos?
# No cambia a quién se escoge (es la misma orden), cambia qué tan seguro es cada favorito: sirve para Al gane, combinadas
# y el simulador de suerte.
# REGLA FIJADA ANTES DE CORRER: entra en un deporte solo si, ajustando en una mitad y probando en la otra (las dos direcciones),
# mejora el log-loss del precio solo con t >= 2 en las dos y la pendiente b sale del mismo lado (>1 o <1) en las dos.
# Uso (carpeta con nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json cierres-mlb.json): python3 recalibrar.py
import math, os, importlib.util
spec = importlib.util.spec_from_file_location('S', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

def lg(p): return math.log(p / (1 - p))
def sig(z): return 1 / (1 + math.exp(-z))

def filas(J):
    out = []
    for g in J:
        p = g['pH']
        if p is None or g['ty'] != 2 or not (0.02 < p < 0.98) or g['hs'] is None or g['hs'] == g['as_']: continue
        favH = p >= 0.5; pf = p if favH else 1 - p
        out.append(dict(s=g['s'], x=lg(pf), loc=1.0 if favH else 0.0, y=1 if (g['hs'] > g['as_']) == favH else 0, pf=pf))
    return out

def ajusta(R, local):
    """Newton en 2 o 3 parámetros: a, b (y c para favorito local)."""
    th = [0.0, 1.0] + ([0.0] if local else [])
    for _ in range(50):
        k = len(th); g = [0.0] * k; H = [[0.0] * k for _ in range(k)]
        for r in R:
            f = [1.0, r['x']] + ([r['loc']] if local else [])
            p = sig(sum(t * v for t, v in zip(th, f))); w = p * (1 - p)
            for i in range(k):
                g[i] += (r['y'] - p) * f[i]
                for j in range(k): H[i][j] += w * f[i] * f[j]
        # resolver H d = g (Gauss)
        M = [H[i][:] + [g[i]] for i in range(k)]
        for i in range(k):
            piv = max(range(i, k), key=lambda q: abs(M[q][i])); M[i], M[piv] = M[piv], M[i]
            for q in range(k):
                if q != i and M[i][i]:
                    fct = M[q][i] / M[i][i]
                    for c in range(i, k + 1): M[q][c] -= fct * M[i][c]
        d = [M[i][k] / M[i][i] for i in range(k)]
        th = [t + dd for t, dd in zip(th, d)]
        if max(abs(x) for x in d) < 1e-9: break
    return th

def perd(R, th, local):
    out = []
    for r in R:
        f = [1.0, r['x']] + ([r['loc']] if local else [])
        q = min(1 - 1e-9, max(1e-9, sig(sum(t * v for t, v in zip(th, f)))))
        out.append(-(r['y'] * math.log(q) + (1 - r['y']) * math.log(1 - q)))
    return out

def tstat(base, nuevo):
    d = [a - b for a, b in zip(base, nuevo)]; n = len(d); m = sum(d) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1)); return m, m / (sd / math.sqrt(n))

def tramos(R, th, local):
    """franjas del % original: cuánto decía el precio, cuánto la corrección y cuánto pasó"""
    out = []
    for lo, hi in ((.5, .6), (.6, .7), (.7, .8), (.8, .9), (.9, 1)):
        G = [r for r in R if lo <= r['pf'] < hi]
        if len(G) < 30: continue
        cor = sum(sig(sum(t * v for t, v in zip(th, [1.0, r['x']] + ([r['loc']] if local else [])))) for r in G) / len(G)
        out.append((lo, hi, len(G), sum(r['pf'] for r in G) / len(G), cor, sum(r['y'] for r in G) / len(G)))
    return out

def main():
    datos = {'nba': S.nba('nba-box.json.gz', 'filas_nba.json'), 'nhl': S.espn('datos-nhl.json'), 'nfl': S.espn('datos-nfl.json'), 'mlb': S.espn('cierres-mlb.json')}
    corte = {'nba': 2024, 'nhl': 2024, 'nfl': 2023, 'mlb': 2025}
    ver = {}
    for dep, J in datos.items():
        R = filas(J); A = [r for r in R if r['s'] < corte[dep]]; B = [r for r in R if r['s'] >= corte[dep]]
        print('\n## %s — %d juegos con precio de cierre (A antes de %d: %d · B: %d). El favorito ganó %.1f%%, el precio decía %.1f%%' % (
            dep.upper(), len(R), corte[dep], len(A), len(B), 100 * sum(r['y'] for r in R) / len(R), 100 * sum(r['pf'] for r in R) / len(R)))
        print('\n| Corrección | Ajusta A → prueba B (milésimas, t) | Ajusta B → prueba A (milésimas, t) | Pendiente b en A / B |')
        print('|---|---|---|---|')
        for local, nom in ((False, 'pendiente (a + b·logit)'), (True, 'pendiente + favorito local')):
            tA, tB = ajusta(A, local), ajusta(B, local)
            m1, t1 = tstat(perd(B, [0, 1] + ([0] if local else []), local), perd(B, tA, local))
            m2, t2 = tstat(perd(A, [0, 1] + ([0] if local else []), local), perd(A, tB, local))
            pasa = t1 >= 2 and t2 >= 2 and (tA[1] - 1) * (tB[1] - 1) > 0
            print('| %s | %+.2f (t %+.1f) | %+.2f (t %+.1f) | %.3f / %.3f%s | %s' % (nom, m1 * 1000, t1, m2 * 1000, t2, tA[1], tB[1],
                  (' · local %+.3f / %+.3f' % (tA[2], tB[2])) if local else '', '**PASA**' if pasa else 'no pasa'))
            ver[dep + ' · ' + nom] = pasa
        th = ajusta(R, False)
        print('\nCon todo junto: a = %+.3f, b = %.3f. Por franja (precio decía → corregido → pasó):\n' % (th[0], th[1]))
        print('| Franja | Juegos | Precio decía | Corregido | Pasó |'); print('|---|---|---|---|---|')
        for lo, hi, n, pd, co, re in tramos(R, th, False):
            print('| %d-%d%% | %d | %.1f%% | %.1f%% | %.1f%% |' % (lo * 100, hi * 100, n, pd * 100, co * 100, re * 100))
    print('\n## Veredicto\n')
    for k, v in ver.items(): print('- %s: %s' % (k, 'PASA' if v else 'no pasa'))

if __name__ == '__main__':
    main()
