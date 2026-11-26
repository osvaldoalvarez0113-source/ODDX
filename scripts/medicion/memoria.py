# MEMORIA FRACCIONARIA EN LA FORMA (26-nov-2026, idea de Osvaldo)
# Hoy la forma cuenta los últimos 10 parejo y el 11 no cuenta nada. Cálculo fraccionario: memoria larga, cada juego pesa
# w_k = k^(-alfa) (el de ayer 1, los viejos poco a poco menos, sin cortar). ¿Esa forma le dice algo al precio de cierre que
# los últimos 10, la temporada entera o un olvido exponencial no le digan?
# Modelo: p = sigmoide(logit(precio del favorito) + beta * (forma del favorito - forma del rival)). Se mide en log-loss y aciertos.
# Forma por victorias (1/0) y por margen (puntos o goles por juego).
# REGLA FIJADA ANTES DE CORRER: la memoria fraccionaria entra solo si, ajustando en una mitad y probando en la otra (en las dos
# direcciones), mejora al precio solo con t >= 2 en las dos, y además le gana a los últimos 10 en las dos.
# Uso (carpeta con nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json): python3 memoria.py
import math, os, sys, importlib.util, collections
spec = importlib.util.spec_from_file_location('S', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

MINJ = {'nba': 10, 'nhl': 10, 'nfl': 6}
ESC = {'nba': 12.0, 'nhl': 2.0, 'nfl': 12.0}   # margen típico, para que beta quede en la misma escala

def filas(J, dep):
    J = sorted(J, key=lambda g: g['ts']); H = collections.defaultdict(list); out = []
    for g in J:
        if g['hs'] is None or g['as_'] is None: continue
        hH = [x for x in H[g['h']] if x[0] == g['s']]; hA = [x for x in H[g['a']] if x[0] == g['s']]
        p = g['pH']
        if p is not None and g['ty'] == 2 and 0.03 < p < 0.97 and abs(p - .5) >= .02 and g['hs'] != g['as_'] and len(hH) >= MINJ[dep] and len(hA) >= MINJ[dep]:
            favH = p > .5; F, D = (hH, hA) if favH else (hA, hH)
            out.append(dict(s=g['s'], pf=p if favH else 1 - p, y=1 if (g['hs'] > g['as_']) == favH else 0,
                            Fw=[x[1] for x in reversed(F)], Dw=[x[1] for x in reversed(D)], Fm=[x[2] for x in reversed(F)], Dm=[x[2] for x in reversed(D)]))
        if g['hs'] != g['as_'] or dep != 'nfl':
            m = (g['hs'] - g['as_']) / ESC[dep]
            H[g['h']].append((g['s'], 1 if g['hs'] > g['as_'] else 0, m)); H[g['a']].append((g['s'], 1 if g['as_'] > g['hs'] else 0, -m))
    return out

def pesos(tipo, par, n):
    if tipo == 'u10': return [1.0 if k < 10 else 0.0 for k in range(n)]
    if tipo == 'temp': return [1.0] * n
    if tipo == 'exp': return [par ** k for k in range(n)]
    return [(k + 1) ** (-par) for k in range(n)]           # fraccionaria: k^-alfa

def forma(x, w):
    s = sum(w[:len(x)]); return sum(a * b for a, b in zip(x, w)) / s if s else 0.0

def feat(R, tipo, par, que):
    out = []
    for r in R:
        F, D = (r['Fw'], r['Dw']) if que == 'w' else (r['Fm'], r['Dm'])
        out.append(forma(F, pesos(tipo, par, len(F))) - forma(D, pesos(tipo, par, len(D))))
    return out

def lg(p): return math.log(p / (1 - p))
def sig(z): return 1 / (1 + math.exp(-z))

def ajusta(R, X):
    b = 0.0
    for _ in range(25):                                  # Newton en 1 dimensión
        g = h = 0.0
        for r, x in zip(R, X):
            p = sig(lg(r['pf']) + b * x); g += (r['y'] - p) * x; h += p * (1 - p) * x * x
        if h <= 0: break
        b += g / h
        if abs(g / h) < 1e-7: break
    return b

def perdida(R, X, b):
    return [-(r['y'] * math.log(q) + (1 - r['y']) * math.log(1 - q)) for r, x in zip(R, X) for q in [min(1 - 1e-9, max(1e-9, sig(lg(r['pf']) + b * x)))]]

def tstat(a, b):
    d = [x - y for x, y in zip(a, b)]; n = len(d); m = sum(d) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1)) if n > 1 else 0
    return m, (m / (sd / math.sqrt(n)) if sd else 0)

CAND = [('u10', None), ('temp', None)] + [('exp', l) for l in (0.8, 0.9, 0.95)] + [('frac', a) for a in (0.25, 0.5, 0.75, 1.0, 1.5)]

def nombre(t, p):
    return {'u10': 'últimos 10', 'temp': 'temporada entera', 'exp': 'exponencial %.2f' % (p or 0), 'frac': 'fraccionaria α=%.2f' % (p or 0)}[t]

def una_direccion(tr, te, que):
    """Ajusta beta (y el parámetro) en tr, mide en te. Devuelve dict por familia con la mejora contra el precio solo."""
    base = perdida(te, [0.0] * len(te), 0.0)
    res = {}
    for fam in ('u10', 'temp', 'exp', 'frac'):
        mejor = None
        for t, p in CAND:
            if t != fam: continue
            Xtr = feat(tr, t, p, que); b = ajusta(tr, Xtr)
            ll = sum(perdida(tr, Xtr, b)) / len(tr)
            if mejor is None or ll < mejor[0]: mejor = (ll, t, p, b)
        _, t, p, b = mejor
        L = perdida(te, feat(te, t, p, que), b)
        m, tt = tstat(base, L)          # m > 0: la forma mejora al precio solo
        acier = sum(1 for r, x in zip(te, feat(te, t, p, que)) if (sig(lg(r['pf']) + b * x) >= .5) == (r['y'] == 1)) / len(te)
        res[fam] = dict(nom=nombre(t, p), b=b, mejora=m * 1000, t=tt, L=L, ac=acier)
    res['_precio_ac'] = sum(1 for r in te if r['y'] == 1) / len(te)
    return res

def main():
    datos = {'nba': S.nba('nba-box.json.gz', 'filas_nba.json'), 'nhl': S.espn('datos-nhl.json'), 'nfl': S.espn('datos-nfl.json')}
    veredicto = {}
    for dep, J in datos.items():
        R = filas(J, dep); A = [r for r in R if r['s'] < 2024]; B = [r for r in R if r['s'] >= 2024]
        print('\n## %s — %d juegos (A antes de 2024: %d · B 2024 en adelante: %d)' % (dep.upper(), len(R), len(A), len(B)))
        for que, qn in (('w', 'por victorias'), ('m', 'por margen')):
            print('\n**Forma %s** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)\n' % qn)
            print('| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B (precio: %s) |' % '')
            print('|---|---|---|---|---|---|')
            d1, d2 = una_direccion(A, B, que), una_direccion(B, A, que)
            for fam in ('u10', 'temp', 'exp', 'frac'):
                x, y = d1[fam], d2[fam]
                print('| %s / %s | %+.2f | %+.1f | %+.2f | %+.1f | %.1f%% (precio %.1f%%) |' % (x['nom'], y['nom'], x['mejora'], x['t'], y['mejora'], y['t'], x['ac'] * 100, d1['_precio_ac'] * 100))
            fr1, fr2 = d1['frac'], d2['frac']
            gana10_1 = tstat(d1['u10']['L'], fr1['L']); gana10_2 = tstat(d2['u10']['L'], fr2['L'])
            pasa = fr1['t'] >= 2 and fr2['t'] >= 2 and gana10_1[0] > 0 and gana10_2[0] > 0
            print('\nFraccionaria contra últimos 10: %+.2f (t %+.1f) y %+.2f (t %+.1f). **%s**' % (gana10_1[0] * 1000, gana10_1[1], gana10_2[0] * 1000, gana10_2[1], 'PASA' if pasa else 'no pasa'))
            veredicto[dep + ' ' + qn] = pasa
    print('\n## Veredicto\n')
    for k, v in veredicto.items(): print('- %s: %s' % (k, 'PASA' if v else 'no pasa'))

if __name__ == '__main__':
    main()
