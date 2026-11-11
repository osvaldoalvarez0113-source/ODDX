"""Mitades, cuartos y periodos POR JUEGO a partir de la linea principal (NBA, NFL, NHL).

Uso:  python3 -I scripts/medicion/periodos.py CARPETA_CON_props-datos [salida.md] [coef.json]

Pregunta: con la linea del juego (handicap/ganador y total), cuanto vale cada mercado de 1er cuarto / 1a mitad / 1er periodo
en ESTE juego, y si ese numero sale bien cuando se mide con juegos que no vio.
Metodo: cada temporada se predice con coeficientes ajustados SOLO con temporadas anteriores.
  - linea justa del tramo (handicap y total): recta sobre la linea del juego completo.
  - probabilidades (gana el tramo, empate, pasa de la linea): logistica / normal / Poisson, segun el mercado.
Se compara contra «decir siempre el promedio de las temporadas anteriores» (lo que ya muestra la app en Al gane).
"""
import gzip, json, math, os, sys
import numpy as np
from scipy.stats import norm, poisson, skellam

DIR = sys.argv[1] if len(sys.argv) > 1 else 'props-datos'
OUT = sys.argv[2] if len(sys.argv) > 2 else None
COEF = sys.argv[3] if len(sys.argv) > 3 else None
if os.path.isdir(os.path.join(DIR, 'props-datos')): DIR = os.path.join(DIR, 'props-datos')

def leer(dep):
    with gzip.open(os.path.join(DIR, dep + '.json.gz'), 'rt') as f: return json.load(f)
def imp(a): return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)
def sig(z): return 1 / (1 + np.exp(-z))
def lgt(p): return np.log(p / (1 - p))
def logit_fit(X, y, l2=1e-3, it=80):
    X = np.asarray(X, float); y = np.asarray(y, float); b = np.zeros(X.shape[1])
    for _ in range(it):
        p = sig(X @ b); W = p * (1 - p) + 1e-9
        H = X.T @ (X * W[:, None]) + l2 * np.eye(X.shape[1]); g = X.T @ (y - p) - l2 * b
        s = np.linalg.solve(H, g); b += s
        if np.max(np.abs(s)) < 1e-9: break
    return b
def ols(X, y):
    X = np.asarray(X, float); y = np.asarray(y, float)
    b = np.linalg.lstsq(X, y, rcond=None)[0]; r = y - X @ b
    return b, float(np.sqrt(np.mean(r * r)))
def justa(p):
    if not (0 < p < 1): return '—'
    a = -100 * p / (1 - p) if p >= 0.5 else 100 * (1 - p) / p
    return ('+' if a > 0 else '') + str(int(round(a)))

RANGO = {'nba': (185, 265, 25), 'nfl': (30, 62, 25), 'nhl': (4.5, 8, 9)}
def cargar(dep):
    d = leer(dep); lo, hi, spmax = RANGO[dep]; out = []
    for sk, t in sorted(d['temps'].items(), key=lambda kv: int(kv[0])):
        for g in t['g']:
            ln = g.get('ln')
            if g.get('ty') not in (2, 3) or not ln or ln.get('tot') is None or not ln.get('ml'): continue
            a, b = ln['ml']; ih, ia = imp(a), imp(b); s = ih + ia
            if not (1.0 <= s <= 1.15) or not (lo <= ln['tot'] <= hi): continue
            lh, la = g.get('lh') or [], g.get('la') or []
            nper = 3 if dep == 'nhl' else 4
            if len(lh) < nper or len(la) < nper: continue
            pH = ih / s
            if dep == 'nhl': m = None
            else:
                if ln.get('sp') is None or abs(ln['sp']) > spmax: continue
                m = -ln['sp']
                if (m > 0) != (pH > 0.5) and abs(m) > 1.5: continue          # linea cruzada
            out.append(dict(temp=int(sk), tot=float(ln['tot']), pH=pH, m=m, lh=lh, la=la, hs=g['hs'], as_=g['as']))
    return out

# ------------------------------------------------------------------ modelos por tramo (puntos: NBA y NFL)
def tramo_pts(G, k):
    """k = cuantos periodos suma el tramo (1 = 1er cuarto, 2 = 1a mitad)"""
    mh = np.array([sum(g['lh'][:k]) for g in G], float); ma = np.array([sum(g['la'][:k]) for g in G], float)
    return mh - ma, mh + ma

def ajustar_pts(G, k):
    mar, tot = tramo_pts(G, k)
    m = np.array([g['m'] for g in G]); T = np.array([g['tot'] for g in G])
    bm, sm = ols(np.c_[m], mar)                           # margen del tramo = bm * margen del juego (sin constante: simetrico)
    bt, st = ols(np.c_[np.ones(len(G)), T], tot)          # total del tramo = a + b * total
    PR = np.arange(1, 50) / 50.0
    qm = [float(x) for x in np.quantile(mar - bm[0] * m, PR)]; qt = [float(x) for x in np.quantile(tot - (bt[0] + bt[1] * T), PR)]
    emp = (mar == 0).astype(float)
    be = logit_fit(np.c_[np.ones(len(G)), np.abs(m), T - T.mean()], emp)
    ne = mar != 0
    bw = logit_fit(np.c_[m[ne]], (mar[ne] > 0).astype(float), l2=1e-6)
    return dict(bm=float(bm[0]), sm=sm, bt=[float(x) for x in bt], st=st, be=[float(x) for x in be], Tm=float(T.mean()), bw=float(bw[0]), qm=[round(x, 2) for x in qm], qt=[round(x, 2) for x in qt])

def predecir_pts(C, m, T):
    mu = C['bm'] * m; mt = C['bt'][0] + C['bt'][1] * T
    pe = sig(C['be'][0] + C['be'][1] * np.abs(m) + C['be'][2] * (T - C['Tm']))
    pw = sig(C['bw'] * m)                                  # gana el tramo el local, sin empates
    return mu, mt, pe, pw

def pmas(q, r):
    """P(residuo > r) con los 49 cuantiles q (2%..98%): interpolacion lineal, colas pegadas a 1% y 99%"""
    r = np.asarray(r, float); PR = np.arange(1, 50) / 50.0
    return 1 - np.clip(np.interp(r, q, PR, left=0.01, right=0.99), 0.01, 0.99)

# ------------------------------------------------------------------ NHL: 1er periodo (Poisson)
def ajustar_nhl(G, ult=3):
    ts = sorted(set(g['temp'] for g in G)); R = [g for g in G if g['temp'] in ts[-ult:]] if ult else G
    C = _nhl(G); C['c'] = _nhl(R)['c']; return C

def _nhl(G):
    g1h = np.array([g['lh'][0] for g in G], float); g1a = np.array([g['la'][0] for g in G], float)
    T = np.array([g['tot'] for g in G]); x = lgt(np.array([g['pH'] for g in G]))
    f = float((g1h + g1a).sum() / T.sum())                # goles del 1er periodo = f * total de la linea
    # reparto: de los goles del 1P, que parte es del local = sig(c * logit(pH))   (binomial)
    c = 0.3
    for _ in range(60):
        q = sig(c * x); n = g1h + g1a
        g = np.sum(x * (g1h - n * q)); H = np.sum(n * q * (1 - q) * x * x) + 1e-9
        c += g / H
    return dict(f=f, c=float(c))

def predecir_nhl(C, pH, T):
    lam = C['f'] * T; q = sig(C['c'] * lgt(pH)); lh, la = lam * q, lam * (1 - q)
    p_gol = 1 - np.exp(-lam); p_o15 = 1 - poisson.cdf(1, lam)
    pe = skellam.pmf(0, lh, la); ph = 1 - skellam.cdf(0, lh, la)
    return dict(lam=lam, p_gol=p_gol, p_o15=p_o15, pe=pe, ph=ph, pa=1 - pe - ph)

# ------------------------------------------------------------------ medicion hacia adelante
class Med:
    def __init__(s, nom): s.nom = nom; s.p = []; s.y = []; s.b = []
    def add(s, p, y, b): s.p += list(np.asarray(p, float)); s.y += list(np.asarray(y, float)); s.b += [b] * len(y)
    def res(s):
        p = np.clip(np.array(s.p), 1e-6, 1 - 1e-6); y = np.array(s.y); b = np.clip(np.array(s.b), 1e-6, 1 - 1e-6); n = len(y)
        ll = -(y * np.log(p) + (1 - y) * np.log(1 - p)); lb = -(y * np.log(b) + (1 - y) * np.log(1 - b)); d = lb - ll
        z = d.mean() / (d.std(ddof=1) / math.sqrt(n)) if n > 1 else 0
        lado = (p >= 0.5); ac = np.mean(lado == (y == 1)); acb = np.mean((b >= 0.5) == (y == 1))
        o = np.argsort(p); ter = np.array_split(o, 3)
        cal = ' · '.join(f'{p[t].mean()*100:.0f}→{y[t].mean()*100:.0f}' for t in ter)
        fu = np.maximum(p, 1 - p) >= 0.65
        fuerte = (int(fu.sum()), float(np.mean(lado[fu] == (y[fu] == 1))) if fu.sum() else float('nan'), float(np.maximum(p, 1 - p)[fu].mean()) if fu.sum() else float('nan'))
        return dict(nom=s.nom, n=n, paso=y.mean(), pred=p.mean(), ll=ll.mean(), lb=lb.mean(), z=z, ac=ac, acb=acb, cal=cal, fuerte=fuerte)

def medir(dep, G):
    temps = sorted(set(g['temp'] for g in G)); M = {}; lin = {}
    def med(k): return M.setdefault(k, Med(k))
    for t in temps[2:]:
        A = [g for g in G if g['temp'] < t]; B = [g for g in G if g['temp'] == t]
        if len(B) < 30: continue
        if dep == 'nhl':
            C = ajustar_nhl(A); P = predecir_nhl(C, np.array([g['pH'] for g in B]), np.array([g['tot'] for g in B]))
            ah = np.array([g['lh'][0] for g in A]); aa = np.array([g['la'][0] for g in A])
            bh = np.array([g['lh'][0] for g in B]); ba = np.array([g['la'][0] for g in B])
            med('Hay gol en el 1er periodo').add(P['p_gol'], bh + ba > 0, np.mean(ah + aa > 0))
            med('Más de 1.5 goles en el 1er periodo').add(P['p_o15'], bh + ba > 1, np.mean(ah + aa > 1))
            med('Empate en el 1er periodo').add(P['pe'], bh == ba, np.mean(ah == aa))
            med('El local gana el 1er periodo (3 opciones)').add(P['ph'], bh > ba, np.mean(ah > aa))
            ne = bh != ba; fav = np.array([g['pH'] for g in B]) >= 0.5
            pf = np.where(fav, P['ph'], P['pa']) / (P['ph'] + P['pa']); yf = np.where(fav, bh > ba, ba > bh)
            afav = np.array([g['pH'] for g in A]) >= 0.5; ane = ah != aa
            med('El favorito gana el 1er periodo (sin empates)').add(pf[ne], yf[ne], np.mean(np.where(afav, ah > aa, aa > ah)[ane]))
            continue
        for k, nom in ((1, '1er cuarto'), (2, '1a mitad')):
            C = ajustar_pts(A, k); mar, tot = tramo_pts(B, k); amar, atot = tramo_pts(A, k)
            m = np.array([g['m'] for g in B]); T = np.array([g['tot'] for g in B]); am = np.array([g['m'] for g in A])
            mu, mt, pe, pw = predecir_pts(C, m, T)
            fav = m > 0; par = m != 0; ne = (mar != 0) & par
            pf = np.where(fav, pw, 1 - pw); yf = np.where(fav, mar > 0, mar < 0)
            ane = (amar != 0) & (am != 0)
            med(f'El favorito gana {"el" if k == 1 else "la"} {nom} (sin empates)').add(pf[ne], yf[ne], np.mean(np.where(am > 0, amar > 0, amar < 0)[ane]))
            med(f'Empate en {"el" if k == 1 else "la"} {nom}').add(pe, mar == 0, np.mean(amar == 0))
            # cubrir el handicap justo del tramo redondeado a .5, y pasar el total justo redondeado a .5 (deben dar ~50%)
            Ls = np.round(mu + C['qm'][24] - 0.5) + 0.5; Lt = np.round(mt + C['qt'][24] - 0.5) + 0.5
            pc = pmas(C['qm'], Ls - mu); po = pmas(C['qt'], Lt - mt)
            med(f'Local cubre el hándicap justo de {nom}').add(pc, mar > Ls, 0.5)
            med(f'Pasa del total justo de {nom}').add(po, tot > Lt, 0.5)
            # escalones lejos de la linea justa: ±(1 desviacion/2)
            for sgn, et in ((+1, 'alto'), (-1, 'bajo')):
                L2 = np.round(mt + sgn * 0.6 * C['st'] - 0.5) + 0.5; p2 = pmas(C['qt'], L2 - mt)
                med(f'Pasa de un total {et} de {nom}').add(p2, tot > L2, float(np.mean(p2)))
            e = lin.setdefault(nom, dict(em=[], et=[], em0=[], et0=[]))
            e['em'] += list(np.abs(mar - mu)); e['et'] += list(np.abs(tot - mt))
            e['em0'] += list(np.abs(mar - amar.mean())); e['et0'] += list(np.abs(tot - atot.mean()))
    return [M[k].res() for k in M], {k: {a: float(np.mean(v)) for a, v in e.items()} for k, e in lin.items()}

def final(dep, G):
    if dep == 'nhl': return ajustar_nhl(G)
    return {'q1': ajustar_pts(G, 1), 'h1': ajustar_pts(G, 2)}

NOM = {'nba': '🏀 NBA', 'nfl': '🏈 NFL', 'nhl': '🏒 NHL'}
L = []; COEFS = {}
for dep in ('nba', 'nfl', 'nhl'):
    G = cargar(dep); R, lin = medir(dep, G); C = final(dep, G); COEFS[dep] = C
    ts = sorted(set(g['temp'] for g in G))
    L.append(f'\n## {NOM[dep]}\n\n{len(G):,} juegos con línea, temporadas {ts[0]}–{ts[-1]}. Medido en las temporadas {ts[2]}–{ts[-1]}, cada una con coeficientes de las anteriores.\n')
    if lin:
        L.append('| Tramo | Error del hándicap justo | Error de decir el promedio | Error del total justo | Error de decir el promedio |\n|---|---|---|---|---|')
        for k, e in lin.items(): L.append(f"| {k} | {e['em']:.2f} | {e['em0']:.2f} | {e['et']:.2f} | {e['et0']:.2f} |")
        L.append('')
    L.append('| Mercado | Juegos | Pasó | La app dijo | Por tercios (dijo→pasó) | Acierto del lado más probable | Cuando dice ≥65% (juegos · acertó · dijo) | ¿Mejor que el promedio fijo? (z) |\n|---|---|---|---|---|---|---|---|')
    for r in R:
        f = r['fuerte']; ft = f'{f[0]:,} · {f[1]*100:.1f}% · {f[2]*100:.1f}%' if f[0] else '—'
        L.append(f"| {r['nom']} | {r['n']:,} | {r['paso']*100:.1f}% | {r['pred']*100:.1f}% | {r['cal']} | {r['ac']*100:.1f}% | {ft} | {r['z']:+.1f} |")
    L.append('\nCoeficientes finales (todas las temporadas): `' + json.dumps(C, separators=(',', ':')) + '`')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt + '\n')
else: print(txt)
if COEF: json.dump(COEFS, open(COEF, 'w'), indent=1)
