"""Proposiciones de juego en los 5 deportes: ¿cuántas veces pasa de verdad y hay algún patrón que el mercado no vea?

Uso:  python3 -I scripts/medicion/props.py CARPETA_CON_props-datos  [salida.md]

Por cada proposición (gol en el 1er tiempo, ambos anotan, carrera en el 1er inning, F5, 1er periodo, 1a mitad…):
  1) FRECUENCIA REAL por temporada y su cuota justa (100 / %): si tu casa paga más que eso, hay valor.
  2) LO QUE IMPLICA EL MERCADO PRINCIPAL: una regresión logística con la línea de cierre (total y favorito) ajustada SOLO
     con temporadas anteriores (nunca ve el futuro). Así se calculan las props en las casas: a partir de la línea principal.
  3) PATRONES escritos ANTES de mirar los resultados (rachas del equipo en ese mismo prop, líneas altas o bajas, descanso):
     residuo = lo que pasó − lo que implicaba el mercado. z, p y corrección de Holm por todas las pruebas juntas.
Un patrón solo «aguanta» si pasa Holm y va a favor en la mayoría de las temporadas.
"""
import gzip, json, math, os, sys, collections
import numpy as np
from scipy.stats import norm

DIR = sys.argv[1] if len(sys.argv) > 1 else 'props-datos'
OUT = sys.argv[2] if len(sys.argv) > 2 else None
if os.path.isdir(os.path.join(DIR, 'props-datos')): DIR = os.path.join(DIR, 'props-datos')


def leer(dep):
    p = os.path.join(DIR, dep + '.json.gz')
    if not os.path.exists(p): return None
    with gzip.open(p, 'rt') as f: return json.load(f)


def imp(a): return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)


def justa(p):
    if p is None or not (0 < p < 1): return '—'
    a = -100 * p / (1 - p) if p >= 0.5 else 100 * (1 - p) / p
    return ('+' if a > 0 else '') + str(int(round(a)))


def pc(x, d=1): return '—' if x is None or (isinstance(x, float) and math.isnan(x)) else f'{x*100:.{d}f}%'


def sig(z): return 1 / (1 + np.exp(-z))


def logit_fit(X, y, l2=1e-3, it=60):
    X = np.asarray(X, float); y = np.asarray(y, float); b = np.zeros(X.shape[1])
    for _ in range(it):
        p = sig(X @ b); W = p * (1 - p) + 1e-9
        H = X.T @ (X * W[:, None]) + l2 * np.eye(X.shape[1]); g = X.T @ (y - p) - l2 * b
        step = np.linalg.solve(H, g); b += step
        if np.max(np.abs(step)) < 1e-8: break
    return b


# --------------------------------------------------------------------- filas comunes
class Fila:
    __slots__ = ('dep', 'temp', 'ts', 'h', 'a', 'x', 'props', 'flags')

    def __init__(self, dep, temp, ts, h, a, x):
        self.dep, self.temp, self.ts, self.h, self.a, self.x = dep, temp, ts, h, a, x
        self.props = {}; self.flags = {}


def racha(hist, eq, clave, n):
    v = [r for r in hist[eq] if r[0] == clave][-n:]
    return (sum(r[1] for r in v), len(v))


# --------------------------------------------------------------------- fútbol
def filas_fut(d):
    out = []; hist = collections.defaultdict(list); vistos = set()
    for p in sorted(d['p'], key=lambda r: r[2]):
        lg, t, ts, H, A, fh, fa, hh, ha, x12, ou = p
        clave = (lg, ts, H, A)
        if clave in vistos: continue
        vistos.add(clave)
        temp = int('20' + t[:2])
        x = None
        if x12 and ou:
            i = [1 / v for v in x12]; s = sum(i); pH, pD, pA = [v / s for v in i]
            j = [1 / v for v in ou]; po = j[0] / sum(j)
            pf = max(pH, pA)
            x = [1.0, math.log(po / (1 - po)), pH - pA, pf, pD]
        f = Fila('fut', temp, ts, (lg, temp, H), (lg, temp, A), x)
        sh, sa = fh - hh, fa - ha
        fav = None if x is None else ('h' if pH >= pA else 'a')
        f.props = {
            'Ambos anotan: sí': int(fh > 0 and fa > 0),
            'Gol en el 1er tiempo': int(hh + ha > 0),
            'Más de 1.5 goles en el 1er tiempo': int(hh + ha > 1),
            'Empate al descanso': int(hh == ha),
            'El 2º tiempo tiene más goles que el 1º': int(sh + sa > hh + ha),
            'El local gana el 1er tiempo': int(hh > ha),
        }
        if fav: f.props['El favorito gana el 1er tiempo'] = int((hh > ha) if fav == 'h' else (ha > hh))
        # rachas de los dos equipos ANTES del partido (misma liga y temporada, últimos 5)
        def r5(eq, k):
            v = hist[eq][-5:]; return (sum(r[k] for r in v), len(v))
        bh, nh = r5(f.h, 0); ba, na = r5(f.a, 0)
        gh, _ = r5(f.h, 1); ga, _ = r5(f.a, 1)
        eh, _ = r5(f.h, 2); ea, _ = r5(f.a, 2)
        ok = nh >= 5 and na >= 5
        f.flags = {
            ('Ambos anotan: sí', 'Los dos con «ambos anotan» en 4+ de sus últimos 5'): ok and bh >= 4 and ba >= 4,
            ('Ambos anotan: sí', 'Los dos con «ambos anotan» en 1 o 0 de sus últimos 5 (→ NO)'): ok and bh <= 1 and ba <= 1,
            ('Gol en el 1er tiempo', 'Los dos con gol en el 1er tiempo en 4+ de sus últimos 5'): ok and gh >= 4 and ga >= 4,
            ('Gol en el 1er tiempo', 'Los dos con 1er tiempo sin goles en 3+ de sus últimos 5 (→ NO)'): ok and gh <= 2 and ga <= 2,
            ('Empate al descanso', 'Los dos empataron al descanso en 3+ de sus últimos 5'): ok and eh >= 3 and ea >= 3,
            ('Empate al descanso', 'Partido parejo (ningún favorito pasa de 40%)'): x is not None and max(pH, pA) < 0.40,
            ('Gol en el 1er tiempo', 'Total alto (Más de 2.5 ≥ 60% en el cierre)'): x is not None and po >= 0.60,
            ('Gol en el 1er tiempo', 'Total bajo (Más de 2.5 ≤ 42% en el cierre) (→ NO)'): x is not None and po <= 0.42,
            ('El favorito gana el 1er tiempo', 'Favorito fuerte (≥ 65%)'): x is not None and max(pH, pA) >= 0.65,
            ('El 2º tiempo tiene más goles que el 1º', 'Siempre (¿el 2º tiempo da más goles de lo que se cree?)'): x is not None,
        }
        for lgk, nom in [('E0', 'Premier'), ('SP1', 'La Liga'), ('I1', 'Serie A'), ('D1', 'Bundesliga'), ('F1', 'Ligue 1')]:
            f.flags[('Gol en el 1er tiempo', 'Liga: ' + nom)] = x is not None and lg == lgk
            f.flags[('Ambos anotan: sí', 'Liga: ' + nom)] = x is not None and lg == lgk
        out.append(f)
        hist[f.h].append((int(fh > 0 and fa > 0), int(hh > 0 or ha > 0), int(hh == ha)))
        hist[f.a].append((int(fh > 0 and fa > 0), int(hh > 0 or ha > 0), int(hh == ha)))
    return out


# --------------------------------------------------------------------- ESPN (mlb, nba, nhl, nfl)
def mercado(ln):
    if not ln or ln.get('tot') is None or not ln.get('ml'): return None
    a, b = ln['ml']; ih, ia = imp(a), imp(b); s = ih + ia
    if not (1.0 <= s <= 1.15): return None
    ph = ih / s
    return ln['tot'], ph


def juegos(d):
    for sk, t in sorted(d['temps'].items(), key=lambda kv: int(kv[0])):
        for g in t['g']:
            yield int(sk), g


def descanso(dias_eq, eq, ts):
    prev = dias_eq.get(eq); dias_eq[eq] = ts
    return None if prev is None else (ts - prev) / 864e5


def filas_mlb(d):
    out = []; hist = collections.defaultdict(list)
    for sk, g in juegos(d):
        lh, la = g['lh'], g['la']
        if len(lh) < 5 or len(la) < 5: continue
        m = mercado(g.get('ln'))
        x = None
        if m:
            T, ph = m; pf = max(ph, 1 - ph); x = [1.0, T, ph, pf, T * T / 10]
        H, A = (sk, g['h']), (sk, g['a'])
        f = Fila('mlb', sk, g['ts'], H, A, x)
        r1h, r1a = lh[0], la[0]
        f5h, f5a = sum(lh[:5]), sum(la[:5])
        f.props = {'Nadie anota en el 1er inning (NRFI)': int(r1h + r1a == 0),
                   'El local anota en el 1er inning': int(r1h > 0),
                   'La visita anota en el 1er inning': int(r1a > 0),
                   'Empate tras 5 innings (F5)': int(f5h == f5a)}
        if m:
            favh = ph >= 0.5
            if f5h != f5a: f.props['El favorito va ganando tras 5 innings (sin empates)'] = int((f5h > f5a) == favh)
            f.props['Ambos equipos anotan en el juego'] = int(g['hs'] > 0 and g['as'] > 0)
        a20h = racha(hist, H, 'r1', 20); a20a = racha(hist, A, 'r1', 20)
        ok = a20h[1] >= 20 and a20a[1] >= 20
        f.flags = {
            ('Nadie anota en el 1er inning (NRFI)', 'Los dos anotaron en el 1er inning en 6 o menos de sus últimos 20'): ok and a20h[0] <= 6 and a20a[0] <= 6,
            ('Nadie anota en el 1er inning (NRFI)', 'Los dos anotaron en el 1er inning en 10+ de sus últimos 20 (→ SÍ hay carrera)'): ok and a20h[0] >= 10 and a20a[0] >= 10,
            ('Nadie anota en el 1er inning (NRFI)', 'Total bajo (7.5 o menos)'): m is not None and m[0] <= 7.5,
            ('Nadie anota en el 1er inning (NRFI)', 'Total alto (9.5 o más) (→ SÍ hay carrera)'): m is not None and m[0] >= 9.5,
            ('La visita anota en el 1er inning', 'Visita favorita fuerte (≥ 62%)'): m is not None and (1 - m[1]) >= 0.62,
            ('El local anota en el 1er inning', 'Local favorito fuerte (≥ 65%)'): m is not None and m[1] >= 0.65,
            ('El favorito va ganando tras 5 innings (sin empates)', 'Favorito fuerte (≥ 65%)'): m is not None and max(m[1], 1 - m[1]) >= 0.65,
            ('El favorito va ganando tras 5 innings (sin empates)', 'Favorito chico (50-55%)'): m is not None and max(m[1], 1 - m[1]) < 0.55,
            ('Empate tras 5 innings (F5)', 'Total bajo (7.5 o menos)'): m is not None and m[0] <= 7.5,
        }
        out.append(f)
        hist[H].append(('r1', int(r1h > 0))); hist[A].append(('r1', int(r1a > 0)))
    return out


def filas_por_periodo(d, dep):
    out = []; hist = collections.defaultdict(list); ult = {}
    for sk, g in juegos(d):
        lh, la = g['lh'], g['la']
        need = {'nba': 4, 'nhl': 3, 'nfl': 4}[dep]
        if len(lh) < need: continue
        m = mercado(g.get('ln'))
        x = None; T = ph = None
        if m:
            T, ph = m; pf = max(ph, 1 - ph); x = [1.0, T, ph, pf]
        H, A = (sk, g['h']), (sk, g['a'])
        f = Fila(dep, sk, g['ts'], H, A, x)
        dh, da = descanso(ult, g['h'], g['ts']), descanso(ult, g['a'], g['ts'])
        favh = (ph >= 0.5) if m else None
        if dep == 'nhl':
            p1 = lh[0] + la[0]; rh, ra = sum(lh[:3]), sum(la[:3])
            f.props = {'Hay gol en el 1er periodo': int(p1 > 0), 'Más de 1.5 goles en el 1er periodo': int(p1 > 1),
                       'Empate a los 60 minutos': int(rh == ra), 'Ambos anotan (en los 60 min)': int(rh > 0 and ra > 0)}
            if m:
                if lh[0] != la[0]: f.props['El favorito gana el 1er periodo (sin empates)'] = int((lh[0] > la[0]) == favh)
                f.props['El favorito gana en los 60 minutos'] = int((rh > ra) if favh else (ra > rh))
            r = racha(hist, H, 'p1', 10), racha(hist, A, 'p1', 10)
            ok = r[0][1] >= 10 and r[1][1] >= 10
            b2b = lambda x_: x_ is not None and x_ < 1.6
            f.flags = {
                ('Hay gol en el 1er periodo', 'Los dos con gol en el 1er periodo en 9+ de sus últimos 10'): ok and r[0][0] >= 9 and r[1][0] >= 9,
                ('Hay gol en el 1er periodo', 'Los dos con 1er periodo sin goles en 4+ de sus últimos 10 (→ NO)'): ok and r[0][0] <= 6 and r[1][0] <= 6,
                ('Hay gol en el 1er periodo', 'Total 5.5 o menos (→ NO)'): m is not None and T <= 5.5,
                ('Hay gol en el 1er periodo', 'Total 6.5 o más'): m is not None and T >= 6.5,
                ('Empate a los 60 minutos', 'Partido parejo (favorito ≤ 55%)'): m is not None and max(ph, 1 - ph) <= 0.55,
                ('Empate a los 60 minutos', 'Total 5.5 o menos'): m is not None and T <= 5.5,
                ('El favorito gana en los 60 minutos', 'Visitante en back-to-back y local descansado'): m is not None and b2b(da) and not b2b(dh) and favh,
                ('Ambos anotan (en los 60 min)', 'Favorito fuerte (≥ 68%) (→ NO)'): m is not None and max(ph, 1 - ph) >= 0.68,
            }
            hist[H].append(('p1', int(lh[0] > 0 or la[0] > 0))); hist[A].append(('p1', int(lh[0] > 0 or la[0] > 0)))
        elif dep == 'nba':
            h1h, h1a = lh[0] + lh[1], la[0] + la[1]
            f.props = {'El local gana el 1er cuarto': int(lh[0] > la[0]), 'El local gana la 1a mitad': int(h1h > h1a)}
            if m:
                if lh[0] != la[0]: f.props['El favorito gana el 1er cuarto (sin empates)'] = int((lh[0] > la[0]) == favh)
                if h1h != h1a: f.props['El favorito gana la 1a mitad (sin empates)'] = int((h1h > h1a) == favh)
                f.props['La 1a mitad tiene más de la mitad de los puntos'] = int(h1h + h1a > (g['hs'] + g['as']) / 2)
            b2b = lambda x_: x_ is not None and x_ < 1.6
            f.flags = {
                ('El favorito gana la 1a mitad (sin empates)', 'Favorito fuerte (≥ 75%)'): m is not None and max(ph, 1 - ph) >= 0.75,
                ('El favorito gana el 1er cuarto (sin empates)', 'Favorito fuerte (≥ 75%)'): m is not None and max(ph, 1 - ph) >= 0.75,
                ('El favorito gana la 1a mitad (sin empates)', 'Favorito en back-to-back y el otro descansado (→ NO)'): m is not None and ((favh and b2b(dh) and not b2b(da)) or ((not favh) and b2b(da) and not b2b(dh))),
                ('El local gana el 1er cuarto', 'Visitante en back-to-back y local descansado'): b2b(da) and not b2b(dh),
                ('La 1a mitad tiene más de la mitad de los puntos', 'Total alto (235 o más)'): m is not None and T >= 235,
                ('La 1a mitad tiene más de la mitad de los puntos', 'Favorito fuerte (≥ 80%) (→ NO: la 2a mitad se afloja)'): m is not None and max(ph, 1 - ph) >= 0.80,
            }
        else:  # nfl
            h1h, h1a = lh[0] + lh[1], la[0] + la[1]
            f.props = {'Hay puntos en el 1er cuarto': int(lh[0] + la[0] > 0), 'Ambos anotan en la 1a mitad': int(h1h > 0 and h1a > 0),
                       'Empate al medio tiempo': int(h1h == h1a)}
            if m:
                if h1h != h1a: f.props['El favorito gana la 1a mitad (sin empates)'] = int((h1h > h1a) == favh)
            f.flags = {
                ('Hay puntos en el 1er cuarto', 'Total 47 o más'): m is not None and T >= 47,
                ('Hay puntos en el 1er cuarto', 'Total 40 o menos (→ NO)'): m is not None and T <= 40,
                ('Ambos anotan en la 1a mitad', 'Total 47 o más'): m is not None and T >= 47,
                ('Ambos anotan en la 1a mitad', 'Favorito fuerte (≥ 75%) (→ NO)'): m is not None and max(ph, 1 - ph) >= 0.75,
                ('El favorito gana la 1a mitad (sin empates)', 'Favorito fuerte (≥ 75%)'): m is not None and max(ph, 1 - ph) >= 0.75,
                ('Empate al medio tiempo', 'Total 40 o menos'): m is not None and T <= 40,
            }
        out.append(f)
    return out


# --------------------------------------------------------------------- medición
def walk_forward(filas, prop):
    """probabilidad que implica la línea principal, ajustada solo con temporadas anteriores"""
    temps = sorted(set(f.temp for f in filas))
    pred = {}
    for s in temps:
        tr = [f for f in filas if f.temp < s and f.x is not None and prop in f.props]
        te = [f for f in filas if f.temp == s and f.x is not None and prop in f.props]
        if len(tr) < 400 or not te: continue
        b = logit_fit([f.x for f in tr], [f.props[prop] for f in tr])
        P = sig(np.asarray([f.x for f in te]) @ b)
        for f, p in zip(te, P): pred[id(f)] = float(p)
    return pred


def holm(ps):
    o = sorted(range(len(ps)), key=lambda i: ps[i]); m = len(ps); ok = [False] * m
    for k, i in enumerate(o):
        if ps[i] <= 0.05 / (m - k): ok[i] = True
        else: break
    return ok


def medir(dep, nombre, filas, md, todas):
    if not filas: md.append(f'\n## {nombre}\n\nSin datos.\n'); return
    temps = sorted(set(f.temp for f in filas))
    md.append(f'\n## {nombre}\n\n{len(filas):,} juegos, temporadas {temps[0]}–{temps[-1]}; con línea de cierre: {sum(1 for f in filas if f.x is not None):,}.\n')
    props = []
    for f in filas:
        for k in f.props:
            if k not in props: props.append(k)
    md.append('\n**Cuántas veces pasa** (cuota justa = lo mínimo que te tienen que pagar para que valga la pena):\n\n')
    md.append('| Proposición | Juegos | Pasó | Cuota justa | Por temporada (mín – máx) | Mercado principal explica | Residuo | z |\n|---|---|---|---|---|---|---|---|\n')
    preds = {}
    for k in props:
        v = [f.props[k] for f in filas if k in f.props]
        porT = []
        for s in temps:
            w = [f.props[k] for f in filas if f.temp == s and k in f.props]
            if len(w) >= 100: porT.append(sum(w) / len(w))
        pr = walk_forward(filas, k); preds[k] = pr
        res = [f.props[k] - pr[id(f)] for f in filas if id(f) in pr]
        pm = [pr[id(f)] for f in filas if id(f) in pr]
        z = (sum(res) / math.sqrt(sum(p * (1 - p) for p in pm))) if pm else float('nan')
        fr = sum(v) / len(v)
        md.append(f'| {k} | {len(v):,} | {pc(fr)} | {justa(fr)} | {pc(min(porT)) if porT else "—"} – {pc(max(porT)) if porT else "—"} | '
                  f'{pc(np.mean(pm)) if pm else "—"} | {(np.mean(res)*100):+.1f} pts | {z:+.1f} |\n' if pm else
                  f'| {k} | {len(v):,} | {pc(fr)} | {justa(fr)} | {pc(min(porT)) if porT else "—"} – {pc(max(porT)) if porT else "—"} | — | — | — |\n')
    # patrones
    claves = []
    for f in filas:
        for k in f.flags:
            if k not in claves: claves.append(k)
    for (prop, pat) in claves:
        pr = preds.get(prop) or {}
        sel = [f for f in filas if f.flags.get((prop, pat)) and prop in f.props and id(f) in pr]
        if len(sel) < 150: continue
        no = '(→ NO' in pat or '(→ SÍ hay carrera' in pat and prop.startswith('Nadie')
        y = np.array([f.props[prop] for f in sel], float); p = np.array([pr[id(f)] for f in sel])
        if no: y, p = 1 - y, 1 - p
        res = y - p; z = res.sum() / math.sqrt((p * (1 - p)).sum()); pv = 2 * (1 - norm.cdf(abs(z)))
        favT = contra = 0
        for s in sorted(set(f.temp for f in sel)):
            idx = [i for i, f in enumerate(sel) if f.temp == s]
            if len(idx) < 20: continue
            if res[idx].mean() > 0: favT += 1
            else: contra += 1
        lado = 'NO' if no else 'SÍ'
        todas.append(dict(dep=nombre, prop=prop, pat=pat, lado=lado, n=len(sel), paso=float(y.mean()), esp=float(p.mean()),
                          res=float(res.mean()), z=float(z), p=float(pv), favT=favT, contra=contra))


def main():
    md = ['# Proposiciones de juego: ¿cuántas veces pasa y hay algún patrón que el mercado no vea?\n']
    todas = []
    fuentes = [('fut', '⚽ Fútbol (5 ligas, Pinnacle de cierre)', filas_fut), ('mlb', '⚾ MLB', filas_mlb),
               ('nba', '🏀 NBA', lambda d: filas_por_periodo(d, 'nba')), ('nhl', '🏒 NHL', lambda d: filas_por_periodo(d, 'nhl')),
               ('nfl', '🏈 NFL', lambda d: filas_por_periodo(d, 'nfl'))]
    for dep, nombre, fn in fuentes:
        d = leer(dep)
        if d is None: md.append(f'\n## {nombre}\n\nNo hay archivo de datos.\n'); continue
        medir(dep, nombre, fn(d), md, todas)
    ok = holm([t['p'] for t in todas])
    md.append('\n## Patrones (escritos antes de mirar)\n\n')
    md.append(f'{len(todas)} patrones probados. Residuo = lo que pasó − lo que implicaba la línea principal (ajustada con temporadas anteriores). '
              f'Con {len(todas)} pruebas se esperan ≈ {len(todas)*0.05:.0f} con p < 0.05 solo por suerte; salieron {sum(1 for t in todas if t["p"] < 0.05)}.\n\n')
    md.append('| Deporte | Proposición | Patrón | Lado | Juegos | Pasó | Esperado | Residuo | z | p | Temporadas a favor/contra | ¿Aguanta Holm? |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n')
    for t, h in sorted(zip(todas, ok), key=lambda x: x[0]['p']):
        md.append(f"| {t['dep']} | {t['prop']} | {t['pat']} | {t['lado']} | {t['n']:,} | {pc(t['paso'])} | {pc(t['esp'])} | {t['res']*100:+.1f} pts | {t['z']:+.1f} | {t['p']:.3f} | {t['favT']} / {t['contra']} | {'**sí**' if h else 'no'} |\n")
    txt = ''.join(md)
    if OUT: open(OUT, 'w').write(txt)
    print(txt)


if __name__ == '__main__':
    main()
