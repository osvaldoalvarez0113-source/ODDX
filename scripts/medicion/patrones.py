#!/usr/bin/env python3
"""
OVA · BATERIA DE PATRONES CONTRA EL MERCADO (octubre 2026)

Pregunta: ¿hay algun "patron" (descanso, rachas, mes, tamaño de la linea...) que el precio de cierre NO tenga en cuenta
y que sirva para apostar?  La unica prueba que cuenta es contra el precio de cierre: si el patron esta bien descontado,
el resultado real coincide con lo que el precio decia y no hay nada que ganar.

Reglas de la prueba (para no engañarnos):
  1. Los patrones y su direccion se escriben ANTES de mirar resultados (lista PATRONES de abajo). No se añade ninguno despues.
  2. Se mide el "residuo": resultado real - probabilidad del precio sin margen. Si el patron no sirve, el residuo promedia 0.
  3. Con tantos patrones probados, algunos saldran "significativos" por pura suerte: se corrige con Holm sobre TODAS las pruebas
     (no solo las que se ven bonitas) y se exige que el signo se repita en la mayoria de temporadas.
  4. Control: 300 patrones al azar (banderas aleatorias) muestran cuantos "salen" solo por suerte.
  5. ROI: apuesta de 1 unidad al precio real de la casa (con su margen).

Uso:  python3 -I scripts/medicion/patrones.py <carpeta con fut.json, nba.json, mlb2021.json ... mlb2026.json>
Los archivos salen de las ramas resultados-futbol-6t (partidos_futbol.json), resultados-nba-6t (filas_nba.json) y var-S20XX.
"""
import json, sys, math, random, collections, datetime, os
import numpy as np
from scipy import stats

D = sys.argv[1] if len(sys.argv) > 1 else '.'
random.seed(7); np.random.seed(7)

# ------------------------------------------------------------------ utilidades
def cargar(n):
    p = os.path.join(D, n)
    return json.load(open(p)) if os.path.exists(p) else None

def am2dec(a):
    a = float(a)
    return 1 + a / 100 if a > 0 else 1 + 100 / abs(a)

class Prueba:
    """una apuesta posible: p = prob. del precio sin margen, win = 1/0 (None = push), dec = cuota decimal real"""
    __slots__ = ('p', 'win', 'dec', 'temp')
    def __init__(s, p, win, dec, temp): s.p, s.win, s.dec, s.temp = p, win, dec, temp

def resumen(ps):
    ps = [x for x in ps if x.win is not None]
    n = len(ps)
    if n < 30: return None
    res = np.array([x.win - x.p for x in ps])
    var = np.array([x.p * (1 - x.p) for x in ps])           # varianza teorica bajo "el precio es correcto"
    z = res.sum() / math.sqrt(var.sum())
    pago = np.array([(x.dec - 1) if x.win else -1.0 for x in ps])
    roi = pago.mean(); se = pago.std(ddof=1) / math.sqrt(n)
    por = collections.defaultdict(list)
    for x in ps: por[x.temp].append(x)
    sg = []
    for t, l in sorted(por.items()):
        if len(l) >= 15:
            sg.append(np.sign(sum(y.win - y.p for y in l)))
    pos = sum(1 for s in sg if s > 0); neg = sum(1 for s in sg if s < 0)
    return dict(n=n, tasa=float(np.mean([x.win for x in ps])), esperada=float(np.mean([x.p for x in ps])),
                resid=float(res.mean()), z=float(z), p=float(2 * (1 - stats.norm.cdf(abs(z)))),
                roi=float(roi), roi_se=float(se), temps_pos=pos, temps_neg=neg, temps=len(sg))

def holm(pvals, alfa=0.05):
    idx = sorted(range(len(pvals)), key=lambda i: pvals[i]); m = len(pvals); ok = [False] * m
    for k, i in enumerate(idx):
        if pvals[i] <= alfa / (m - k): ok[i] = True
        else: break
    return ok

# ------------------------------------------------------------------ FUTBOL (5 ligas, 6 temporadas, Pinnacle cierre)
def futbol():
    raw = cargar('fut.json')
    if not raw: return []
    raw = sorted(raw, key=lambda g: g['d'])
    hist = collections.defaultdict(list)          # (temporada, equipo) -> [(fecha, gf, gc)]
    ult = {}                                      # (liga, equipo) -> fecha del ultimo partido
    out = []
    for g in raw:
        key = (g['t'], g['h']); keya = (g['t'], g['a'])
        hH, hA = hist[key], hist[keya]
        f = {}
        f['restH'] = (g['d'] - ult[(g['lg'], g['h'])]) / 864e5 if (g['lg'], g['h']) in ult and ult[(g['lg'], g['h'])] and (g['d'] - ult[(g['lg'], g['h'])]) < 20 * 864e5 else None
        f['restA'] = (g['d'] - ult[(g['lg'], g['a'])]) / 864e5 if (g['lg'], g['a']) in ult and (g['d'] - ult[(g['lg'], g['a'])]) < 20 * 864e5 else None
        def forma(h, k=5):
            if len(h) < k: return None
            return sum(3 if gf > gc else (1 if gf == gc else 0) for _, gf, gc in h[-k:])
        def racha(h):
            n = 0
            for _, gf, gc in reversed(h):
                if gf > gc: n += 1
                else: break
            return n
        def rachaP(h):
            n = 0
            for _, gf, gc in reversed(h):
                if gf < gc: n += 1
                else: break
            return n
        f['formH'], f['formA'] = forma(hH), forma(hA)
        f['lastMH'] = hH[-1][1] - hH[-1][2] if hH else None
        f['lastMA'] = hA[-1][1] - hA[-1][2] if hA else None
        f['lastTH'] = hH[-1][1] + hH[-1][2] if hH else None
        f['lastTA'] = hA[-1][1] + hA[-1][2] if hA else None
        f['rachaH'], f['rachaA'] = racha(hH), racha(hA)
        f['pierdeH'], f['pierdeA'] = rachaP(hH), rachaP(hA)
        f['nH'], f['nA'] = len(hH), len(hA)
        f['empH'] = (hH[-1][1] == hH[-1][2]) if hH else None
        f['empA'] = (hA[-1][1] == hA[-1][2]) if hA else None
        dt = datetime.datetime.fromtimestamp(g['d'] / 1000, datetime.timezone.utc)
        f['dow'] = dt.weekday(); f['mes'] = dt.month
        out.append((g, f))
        hist[key].append((g['d'], g['gh'], g['ga'])); hist[keya].append((g['d'], g['ga'], g['gh']))
        ult[(g['lg'], g['h'])] = g['d']; ult[(g['lg'], g['a'])] = g['d']
    return out

def fut_pruebas(g, lado):
    """devuelve Prueba de apostar a 'H','D','A' (1X2) o 'O','U' (2.5 goles) en este partido, o None"""
    mk = g.get('mk'); odds = g.get('ps') or g.get('avg')
    if lado in 'HDA':
        if not mk or not odds: return None
        i = 'HDA'.index(lado)
        return Prueba(mk[i], 1 if g['y'] == (0, 1, 2)[i] else 0, odds[i], g['t'])
    ou = g.get('ou'); ouo = g.get('ouPs') or g.get('ouAvg')
    if ou is None or not ouo: return None
    tot = g['gh'] + g['ga']
    if lado == 'O': return Prueba(ou, 1 if tot > 2.5 else 0, ouo[0], g['t'])
    return Prueba(1 - ou, 1 if tot < 2.5 else 0, ouo[1], g['t'])

def nn(*a): return all(x is not None for x in a)

PAT_FUT = [
  # nombre, lado, bandera(g, f)  -- todas escritas de antemano con la direccion de la creencia popular
  ('Local mucho mas descansado (≥3 dias mas) → gana el local', 'H', lambda g, f: nn(f['restH'], f['restA']) and f['restH'] - f['restA'] >= 3),
  ('Visitante con poco descanso (≤3 dias) → gana el local', 'H', lambda g, f: nn(f['restA']) and f['restA'] <= 3),
  ('Local con poco descanso (≤3 dias) → gana el visitante', 'A', lambda g, f: nn(f['restH']) and f['restH'] <= 3),
  ('Local venia de perder por 3+ goles → "rebote" gana el local', 'H', lambda g, f: nn(f['lastMH']) and f['lastMH'] <= -3),
  ('Visitante venia de perder por 3+ goles → "rebote" gana el visitante', 'A', lambda g, f: nn(f['lastMA']) and f['lastMA'] <= -3),
  ('Local con racha de 3+ victorias → sigue ganando', 'H', lambda g, f: f['rachaH'] >= 3),
  ('Visitante con racha de 3+ victorias → sigue ganando', 'A', lambda g, f: f['rachaA'] >= 3),
  ('Local con 3+ derrotas seguidas → "toca ganar"', 'H', lambda g, f: f['pierdeH'] >= 3),
  ('Visitante con 3+ derrotas seguidas → "toca ganar"', 'A', lambda g, f: f['pierdeA'] >= 3),
  ('Mejor forma (ult. 5) local vs visitante por 6+ puntos → gana el local', 'H', lambda g, f: nn(f['formH'], f['formA']) and f['formH'] - f['formA'] >= 6),
  ('Mejor forma (ult. 5) visitante vs local por 6+ puntos → gana el visitante', 'A', lambda g, f: nn(f['formH'], f['formA']) and f['formA'] - f['formH'] >= 6),
  ('Los dos empataron su ultimo partido → empate', 'D', lambda g, f: f['empH'] is True and f['empA'] is True),
  ('Local veniá de partido con 4+ goles → Menos de 2.5 ("se regula")', 'U', lambda g, f: nn(f['lastTH']) and f['lastTH'] >= 4),
  ('Los dos venian de partidos con 4+ goles → Menos de 2.5', 'U', lambda g, f: nn(f['lastTH'], f['lastTA']) and f['lastTH'] >= 4 and f['lastTA'] >= 4),
  ('Los dos venian de partidos de 0-1 goles → Mas de 2.5 ("se regula")', 'O', lambda g, f: nn(f['lastTH'], f['lastTA']) and f['lastTH'] <= 1 and f['lastTA'] <= 1),
  ('Primeras 4 jornadas del equipo local → gana el local', 'H', lambda g, f: f['nH'] < 4),
  ('Ultimas 5 jornadas (equipo local ≥34 jugados) → Menos de 2.5', 'U', lambda g, f: f['nH'] >= 34),
  ('Entre semana (mar-jue) → gana el local', 'H', lambda g, f: f['dow'] in (1, 2, 3)),
  ('Lunes o viernes → Menos de 2.5', 'U', lambda g, f: f['dow'] in (0, 4)),
  ('Favorito fuerte (precio ≥ 75%) → gana el favorito (el mercado "regala" a favoritos)', 'FAV', lambda g, f: max(g['mk']) >= 0.75 if g.get('mk') else False),
  ('Perro largo (precio ≤ 12%) → "siempre sorprende" (apostar al perro)', 'DOG', lambda g, f: min(g['mk'][0], g['mk'][2]) <= 0.12 if g.get('mk') else False),
  ('Empate cuando el precio dice parejo (empate ≥ 29%)', 'D', lambda g, f: g.get('mk') and g['mk'][1] >= 0.29),
  ('Diciembre-enero (calendario apretado) → Mas de 2.5', 'O', lambda g, f: f['mes'] in (12, 1)),
]

def correr_futbol():
    datos = futbol(); res = []
    for nombre, lado, fl in PAT_FUT:
        ps = []
        for g, f in datos:
            try:
                if not fl(g, f): continue
            except Exception: continue
            l = lado
            if lado == 'FAV': l = 'HDA'[int(np.argmax(g['mk']))] if g.get('mk') and g['mk'][0] != g['mk'][2] else None
            if lado == 'DOG': l = 'H' if g['mk'][0] < g['mk'][2] else 'A'
            if not l: continue
            x = fut_pruebas(g, l)
            if x: ps.append(x)
        r = resumen(ps)
        if r: res.append(('Fútbol', nombre, r))
    return res, datos

# ------------------------------------------------------------------ NBA (sin equipos en el archivo: solo calendario y precio)
def correr_nba():
    raw = cargar('nba.json')
    if not raw: return []
    filas = []
    for g in raw:
        if g.get('spread') is None or g.get('total') is None or g.get('mar') is None: continue
        dt = datetime.datetime.fromtimestamp(g['ts'] / 1000 - 6 * 3600, datetime.timezone.utc)   # dia de la noche en EE. UU.
        filas.append(dict(g=g, dow=dt.weekday(), mes=dt.month, t=str(g['sk'])))
    def cubre(g, lado):          # lado 'H' o 'A' contra la linea; push -> None; precio -110 ambos lados
        x = g['mar'] + g['spread']
        if abs(x) < 1e-9: return None
        return 1 if (x > 0) == (lado == 'H') else 0
    def over(g, lado):
        x = g['tot'] - g['total']
        if abs(x) < 1e-9: return None
        return 1 if (x > 0) == (lado == 'O') else 0
    def ml(g, lado):
        mh, ma = g.get('mlH'), g.get('mlA')
        if mh is None or ma is None: return None
        dh, da = am2dec(mh), am2dec(ma); ih, ia = 1 / dh, 1 / da
        p = (ih if lado == 'H' else ia) / (ih + ia)
        w = 1 if (g['mar'] > 0) == (lado == 'H') else 0
        return Prueba(p, w, dh if lado == 'H' else da, str(g['sk']))
    def ps_linea(sel, lado, tipo):
        out = []
        for r in filas:
            if not sel(r): continue
            g = r['g']
            if tipo == 'spread': w = cubre(g, lado)
            elif tipo == 'total': w = over(g, lado)
            if tipo in ('spread', 'total'): out.append(Prueba(0.5, w, 1.909, r['t']))
            else:
                x = ml(g, lado)
                if x: out.append(x)
        return out
    PAT = [
      ('NBA · Local favorito grande (linea ≤ -10) → cubre el local', lambda r: r['g']['spread'] <= -10, 'H', 'spread'),
      ('NBA · Perro local grande (linea ≥ +8) → cubre el visitante favorito', lambda r: r['g']['spread'] >= 8, 'A', 'spread'),
      ('NBA · Linea cerrada (|linea| ≤ 2) → cubre el local', lambda r: abs(r['g']['spread']) <= 2, 'H', 'spread'),
      ('NBA · Total alto (≥ 235) → Mas', lambda r: r['g']['total'] >= 235, 'O', 'total'),
      ('NBA · Total bajo (≤ 215) → Menos', lambda r: r['g']['total'] <= 215, 'U', 'total'),
      ('NBA · Octubre-noviembre (inicio de temporada) → Mas', lambda r: r['mes'] in (10, 11), 'O', 'total'),
      ('NBA · Abril (equipos sin nada en juego) → Menos', lambda r: r['mes'] == 4 and r['g']['ty'] == 2, 'U', 'total'),
      ('NBA · Viernes y sabado → cubre el local', lambda r: r['dow'] in (4, 5), 'H', 'spread'),
      ('NBA · Domingo → Mas', lambda r: r['dow'] == 6, 'O', 'total'),
      ('NBA · Playoffs → Menos', lambda r: r['g']['ty'] == 3, 'U', 'total'),
      ('NBA · Favorito pesado (linea ≥ 11) → gana el favorito (moneyline)', lambda r: r['g'].get('mlH') is not None and abs(r['g']['spread']) >= 11, 'FAVML', 'ml'),
    ]
    res = []
    for nombre, sel, lado, tipo in PAT:
        if lado == 'FAVML':
            ps = []
            for r in filas:
                if not sel(r): continue
                l = 'H' if r['g']['spread'] < 0 else 'A'; x = ml(r['g'], l)
                if x: ps.append(x)
        else:
            ps = ps_linea(sel, lado, tipo)
        rr = resumen(ps)
        if rr: res.append(('NBA', nombre.replace('NBA · ', ''), rr))
    return res, filas

# ------------------------------------------------------------------ MLB (solo fecha, precio y resultado)
def correr_mlb():
    juegos = []
    for y in range(2021, 2027):
        r = cargar('mlb%d.json' % y)
        if not r: continue
        for g in r:
            if g.get('dH') is None or g.get('dA') is None: continue
            dt = datetime.date.fromisoformat(g['f'])
            juegos.append(dict(g=g, mes=dt.month, dow=dt.weekday(), t=str(y)))
    def ap(r, lado):
        g = r['g']; ih, ia = g['iH'], g['iA']
        p = (ih if lado == 'H' else ia) / (ih + ia)
        w = 1 if (g['y'] == 1) == (lado == 'H') else 0
        return Prueba(p, w, g['dH'] if lado == 'H' else g['dA'], r['t'])
    def pm(r): g = r['g']; return g['iH'] / (g['iH'] + g['iA'])
    PAT = [
      ('Perro largo (≤ 35%) → apostar al perro', lambda r: min(pm(r), 1 - pm(r)) <= 0.35, 'DOG'),
      ('Favorito fuerte (≥ 65%) → apostar al favorito', lambda r: max(pm(r), 1 - pm(r)) >= 0.65, 'FAV'),
      ('Local perro (local < 45%) → apostar al local', lambda r: pm(r) < 0.45, 'H'),
      ('Local favorito (local ≥ 60%) → apostar al local', lambda r: pm(r) >= 0.60, 'H'),
      ('Abril → apostar al perro (el mercado aun no sabe quien es bueno)', lambda r: r['mes'] == 4, 'DOG'),
      ('Septiembre → apostar al favorito (los malos se rinden)', lambda r: r['mes'] == 9, 'FAV'),
      ('Domingo → apostar al local', lambda r: r['dow'] == 6, 'H'),
      ('Viernes → apostar al visitante', lambda r: r['dow'] == 4, 'A'),
      ('Juego parejo (45-55%) → apostar al visitante', lambda r: 0.45 <= pm(r) <= 0.55, 'A'),
    ]
    res = []
    for nombre, sel, lado in PAT:
        ps = []
        for r in juegos:
            if not sel(r): continue
            l = lado
            if lado == 'DOG': l = 'H' if pm(r) < 0.5 else 'A'
            if lado == 'FAV': l = 'H' if pm(r) >= 0.5 else 'A'
            ps.append(ap(r, l))
        rr = resumen(ps)
        if rr: res.append(('MLB', nombre, rr))
    return res, juegos


# ------------------------------------------------------------------ NHL y NFL (marcadores + lineas de cierre de ESPN; archivos de la rama datos-nhl-nfl)
def am_dec(a): return am2dec(a)

def nhlnfl(dep):
    d = cargar('dnhl.json' if dep == 'nhl' else 'dnfl.json')
    if not d: return []
    tmin, tmax = (4.5, 9) if dep == 'nhl' else (25, 80)
    rows = []
    for y, t in d['temps'].items():
        for g in t['juegos']:
            if g['done'] and not g['skip'] and g['ty'] == 2: rows.append((y, g))
    rows.sort(key=lambda r: r[1]['ts'])
    hist = collections.defaultdict(list)     # (temporada, equipo) -> [(ts, gf, gc, ot)]
    out = []
    for y, g in rows:
        kh, ka = (y, g['h']), (y, g['a'])
        hH, hA = hist[kh], hist[ka]
        f = dict(y=y)
        def rest(h): return (g['ts'] - h[-1][0]) / 864e5 if h else None
        f['restH'], f['restA'] = rest(hH), rest(hA)
        def b2b(h): return bool(h) and (g['ts'] - h[-1][0]) <= 30 * 3600e3
        def tres4(h): return len(h) >= 2 and (g['ts'] - h[-2][0]) <= 75 * 3600e3
        f['b2bH'], f['b2bA'] = b2b(hH), b2b(hA)
        f['t4H'], f['t4A'] = tres4(hH), tres4(hA)
        f['lastMH'] = hH[-1][1] - hH[-1][2] if hH else None
        f['lastMA'] = hA[-1][1] - hA[-1][2] if hA else None
        f['lastOtH'] = hH[-1][3] if hH else None
        f['lastOtA'] = hA[-1][3] if hA else None
        f['lastTH'] = hH[-1][1] + hH[-1][2] if hH else None
        f['lastTA'] = hA[-1][1] + hA[-1][2] if hA else None
        def racha(h, sgn):
            n = 0
            for _, gf, gc, _o in reversed(h):
                if (gf - gc) * sgn > 0: n += 1
                else: break
            return n
        f['rachaH'], f['rachaA'] = racha(hH, 1), racha(hA, 1)
        f['pierdeH'], f['pierdeA'] = racha(hH, -1), racha(hA, -1)
        f['n'] = len(hH)
        dt = datetime.datetime.fromtimestamp(g['ts'] / 1000 - 5 * 3600, datetime.timezone.utc)   # hora del este
        f['dow'] = dt.weekday(); f['hora'] = dt.hour; f['mes'] = dt.month
        l = g.get('linea')
        ok = False
        if l and l.get('ml') and l.get('tot') is not None and tmin <= l['tot'] <= tmax and l.get('sp') is not None:
            mh, ma = l['ml']
            ok = not ((mh < ma) != (l['sp'] < 0) and abs(l['sp']) >= 1)
        out.append(dict(g=g, f=f, l=l if ok else None, t=str(y)))
        hist[kh].append((g['ts'], g['hs'], g['as'], bool(g.get('ot') or g.get('so'))))
        hist[ka].append((g['ts'], g['as'], g['hs'], bool(g.get('ot') or g.get('so'))))
    return out

def nn_ml(r, lado):
    l = r['l']; g = r['g']
    if not l or not l.get('ml'): return None
    dh, da = am_dec(l['ml'][0]), am_dec(l['ml'][1]); ih, ia = 1 / dh, 1 / da
    p = (ih if lado == 'H' else ia) / (ih + ia)
    if g['hs'] == g['as']: return None
    return Prueba(p, 1 if (g['hs'] > g['as']) == (lado == 'H') else 0, dh if lado == 'H' else da, r['t'])

def nn_sp(r, lado):
    l = r['l']; g = r['g']
    if not l or l.get('sp') is None: return None
    so = 1 if g.get('so') else 0
    x = (g['hs'] - g['as']) + l['sp']
    if abs(x) < 1e-9: return None
    ow = l.get('spOdds')
    if ow and 1 <= am_dec(ow[0]) and 1 <= am_dec(ow[1]):
        ih, ia = 1 / am_dec(ow[0]), 1 / am_dec(ow[1]); p = (ih if lado == 'H' else ia) / (ih + ia); dec = am_dec(ow[0] if lado == 'H' else ow[1])
    else: p, dec = 0.5, 1.909
    return Prueba(p, 1 if (x > 0) == (lado == 'H') else 0, dec, r['t'])

def nn_tot(r, lado, dep):
    l = r['l']; g = r['g']
    if not l or l.get('tot') is None: return None
    tt = g['hs'] + g['as'] - (1 if (dep == 'nhl' and g.get('so')) else 0)
    x = tt - l['tot']
    if abs(x) < 1e-9: return None
    ou = l.get('ou')
    if ou and am_dec(ou[0]) >= 1 and am_dec(ou[1]) >= 1:
        io, iu = 1 / am_dec(ou[0]), 1 / am_dec(ou[1]); p = (io if lado == 'O' else iu) / (io + iu); dec = am_dec(ou[0] if lado == 'O' else ou[1])
    else: p, dec = 0.5, 1.909
    return Prueba(p, 1 if (x > 0) == (lado == 'O') else 0, dec, r['t'])

PAT_NHL = [
  ('NHL · Visitante en back-to-back, local descansado → gana el local', 'ML', 'H', lambda r, f: f['b2bA'] and not f['b2bH']),
  ('NHL · Local en back-to-back, visitante descansado → gana el visitante', 'ML', 'A', lambda r, f: f['b2bH'] and not f['b2bA']),
  ('NHL · Visitante en back-to-back, local descansado → cubre el local (linea de gol)', 'SP', 'H', lambda r, f: f['b2bA'] and not f['b2bH']),
  ('NHL · Visitante jugando su 3er juego en 4 noches → gana el local', 'ML', 'H', lambda r, f: f['t4A'] and not f['t4H']),
  ('NHL · Equipo local venia de perder por 4+ goles → "rebote" gana el local', 'ML', 'H', lambda r, f: nn(f['lastMH']) and f['lastMH'] <= -4),
  ('NHL · Equipo visitante venia de perder por 4+ goles → "rebote" gana el visitante', 'ML', 'A', lambda r, f: nn(f['lastMA']) and f['lastMA'] <= -4),
  ('NHL · Local con racha de 4+ victorias → apostar contra el local (se regula)', 'ML', 'A', lambda r, f: f['rachaH'] >= 4),
  ('NHL · Local con 4+ derrotas seguidas → "toca ganar"', 'ML', 'H', lambda r, f: f['pierdeH'] >= 4),
  ('NHL · Local venia de juego que se fue a OT/shootout (cansado) → gana el visitante', 'ML', 'A', lambda r, f: f['lastOtH'] is True),
  ('NHL · Los dos venian de partidos de 8+ goles → Menos', 'TOT', 'U', lambda r, f: nn(f['lastTH'], f['lastTA']) and f['lastTH'] >= 8 and f['lastTA'] >= 8),
  ('NHL · Los dos venian de partidos de 4 goles o menos → Mas', 'TOT', 'O', lambda r, f: nn(f['lastTH'], f['lastTA']) and f['lastTH'] <= 4 and f['lastTA'] <= 4),
  ('NHL · Total de 6+ → Menos', 'TOT', 'U', lambda r, f: r['l'] and r['l']['tot'] >= 6),
  ('NHL · Total de 5.5 o menos → Mas', 'TOT', 'O', lambda r, f: r['l'] and r['l']['tot'] <= 5.5),
  ('NHL · Inicio de temporada (primeros 8 juegos del local) → Mas', 'TOT', 'O', lambda r, f: f['n'] < 8),
  ('NHL · Fin de semana (sab-dom) → Menos', 'TOT', 'U', lambda r, f: f['dow'] in (5, 6)),
  ('NHL · Perro grande (precio local o visitante ≤ 35%) → apostar al perro', 'ML', 'DOG', lambda r, f: r['l'] and min(1 / am_dec(r['l']['ml'][0]), 1 / am_dec(r['l']['ml'][1])) / (1 / am_dec(r['l']['ml'][0]) + 1 / am_dec(r['l']['ml'][1])) <= 0.35),
]
PAT_NFL = [
  ('NFL · Local en semana corta (≤ 5 dias), visitante con descanso normal → gana el visitante', 'ML', 'A', lambda r, f: nn(f['restH'], f['restA']) and f['restH'] <= 5 and f['restA'] >= 6),
  ('NFL · Visitante en semana corta (≤ 5 dias), local descansado → gana el local', 'ML', 'H', lambda r, f: nn(f['restH'], f['restA']) and f['restA'] <= 5 and f['restH'] >= 6),
  ('NFL · Local sale de la semana libre (≥ 13 dias), visitante normal → gana el local', 'ML', 'H', lambda r, f: nn(f['restH'], f['restA']) and f['restH'] >= 13 and f['restA'] < 10),
  ('NFL · Visitante sale de la semana libre (≥ 13 dias) → gana el visitante', 'ML', 'A', lambda r, f: nn(f['restA']) and f['restA'] >= 13),
  ('NFL · Local venia de perder por 14+ → "rebote" cubre el local', 'SP', 'H', lambda r, f: nn(f['lastMH']) and f['lastMH'] <= -14),
  ('NFL · Visitante venia de perder por 14+ → "rebote" cubre el visitante', 'SP', 'A', lambda r, f: nn(f['lastMA']) and f['lastMA'] <= -14),
  ('NFL · Local venia de ganar por 21+ → "se confia", cubre el visitante', 'SP', 'A', lambda r, f: nn(f['lastMH']) and f['lastMH'] >= 21),
  ('NFL · Visitante venia de ganar por 21+ → "se confia", cubre el local', 'SP', 'H', lambda r, f: nn(f['lastMA']) and f['lastMA'] >= 21),
  ('NFL · Local con racha de 3+ victorias → cubre el visitante (se regula)', 'SP', 'A', lambda r, f: f['rachaH'] >= 3),
  ('NFL · Local con 3+ derrotas seguidas → cubre el local ("toca")', 'SP', 'H', lambda r, f: f['pierdeH'] >= 3),
  ('NFL · Jueves → Menos', 'TOT', 'U', lambda r, f: f['dow'] == 3),
  ('NFL · Domingo noche / lunes (prime time) → Mas', 'TOT', 'O', lambda r, f: (f['dow'] == 6 and f['hora'] >= 19) or f['dow'] == 0),
  ('NFL · Estadio techado → Mas', 'TOT', 'O', lambda r, f: r['g'].get('indoor') is True),
  ('NFL · Semana 14 o mas (frio, clima) → Menos', 'TOT', 'U', lambda r, f: (r['g'].get('wk') or 0) >= 14 and not r['g'].get('indoor')),
  ('NFL · Total de 50 o mas → Menos', 'TOT', 'U', lambda r, f: r['l'] and r['l']['tot'] >= 50),
  ('NFL · Total de 40 o menos → Mas', 'TOT', 'O', lambda r, f: r['l'] and r['l']['tot'] <= 40),
  ('NFL · Local perro de 3+ puntos → apostar al local con la linea', 'SP', 'H', lambda r, f: r['l'] and r['l']['sp'] >= 3),
  ('NFL · Favorito de 10+ puntos → cubre el favorito', 'SPFAV', 'FAV', lambda r, f: r['l'] and abs(r['l']['sp']) >= 10),
]

def correr_nhlnfl(dep):
    datos = nhlnfl(dep); res = []
    for nombre, tipo, lado, fl in (PAT_NHL if dep == 'nhl' else PAT_NFL):
        ps = []
        for r in datos:
            if not r['l']: continue
            try:
                if not fl(r, r['f']): continue
            except Exception: continue
            l = lado
            if lado == 'DOG':
                ih, ia = 1 / am_dec(r['l']['ml'][0]), 1 / am_dec(r['l']['ml'][1]); l = 'H' if ih < ia else 'A'
            if lado == 'FAV': l = 'H' if r['l']['sp'] < 0 else 'A'
            x = nn_ml(r, l) if tipo == 'ML' else (nn_sp(r, l) if tipo in ('SP', 'SPFAV') else nn_tot(r, l, dep))
            if x: ps.append(x)
        rr = resumen(ps)
        if rr: res.append((dep.upper(), nombre.split(' · ', 1)[1], rr))
    return res, datos

# ------------------------------------------------------------------ control: banderas al azar
def control_azar(datos_fut, n_pat=300):
    """banderas aleatorias (10% de los partidos, lado local): cuantas parecen 'significativas' solo por suerte"""
    ps_all = []
    for g, f in datos_fut:
        x = fut_pruebas(g, 'H')
        if x: ps_all.append(x)
    sig5 = sig1 = 0; zs = []
    for _ in range(n_pat):
        sub = [x for x in ps_all if random.random() < 0.10]
        r = resumen(sub)
        if r:
            zs.append(r['z']); sig5 += r['p'] < 0.05; sig1 += r['p'] < 0.01
    return len(zs), sig5, sig1, float(np.std(zs))


# ------------------------------------------------------------------ VIGILANCIA: candidatos que se prueban SOLO con juegos jugados despues del corte
CORTE = datetime.datetime(2026, 10, 26, tzinfo=datetime.timezone.utc).timestamp() * 1000
VIGILANCIA = [
  ('NHL', 'Total de 6 o más → Menos', 'El único patrón que pasó Holm (+2.9 pts sobre el precio, pero el Menos paga menos y el ROI es +1% ± 3)'),
  ('NHL', 'Visitante en back-to-back, local descansado → gana el local', 'Dio a favor en las 5 temporadas (+4 pts) pero sin pasar Holm'),
  ('NBA', 'Abril → Mas', 'Al revés de lo que se creía: el Menos de abril falló en 5 de 6 temporadas (p = 0.010 sin corregir)'),
]
def vigilancia():
    out = []
    nh = nhlnfl('nhl')
    ps = [nn_tot(r, 'U', 'nhl') for r in nh if r['l'] and r['g']['ts'] >= CORTE and r['l']['tot'] >= 6]
    out.append(('NHL', VIGILANCIA[0], resumen_vig([x for x in ps if x])))
    ps = [nn_ml(r, 'H') for r in nh if r['l'] and r['g']['ts'] >= CORTE and r['f']['b2bA'] and not r['f']['b2bH']]
    out.append(('NHL', VIGILANCIA[1], resumen_vig([x for x in ps if x])))
    raw = cargar('nba.json') or []
    ps = []
    for g in raw:
        if g.get('total') is None or g.get('tot') is None or g['ts'] < CORTE: continue
        dt = datetime.datetime.fromtimestamp(g['ts'] / 1000 - 6 * 3600, datetime.timezone.utc)
        if dt.month != 4 or g['ty'] != 2: continue
        x = g['tot'] - g['total']
        if abs(x) < 1e-9: continue
        ps.append(Prueba(0.5, 1 if x > 0 else 0, 1.909, str(g['sk'])))
    out.append(('NBA', VIGILANCIA[2], resumen_vig(ps)))
    return out

def resumen_vig(ps):
    n = len(ps)
    if n == 0: return None
    res = sum(x.win - x.p for x in ps); var = sum(x.p * (1 - x.p) for x in ps)
    pago = [(x.dec - 1) if x.win else -1.0 for x in ps]
    return dict(n=n, tasa=sum(x.win for x in ps) / n, esperada=sum(x.p for x in ps) / n, z=res / math.sqrt(var), roi=sum(pago) / n)

# ------------------------------------------------------------------ informe
def main():
    todo = []
    rf, dfut = correr_futbol(); todo += rf
    rn, _ = correr_nba(); todo += rn
    rm, _ = correr_mlb(); todo += rm
    rh, _ = correr_nhlnfl('nhl'); todo += rh
    rl, _ = correr_nhlnfl('nfl'); todo += rl
    ok = holm([r['p'] for _, _, r in todo])
    L = []
    pr = L.append
    pr('# Patrones contra el mercado: ¿alguno aguanta? (octubre 2026)\n')
    pr('Se probaron **%d patrones** escritos de antemano (descanso, rachas, rebote tras goleada, mes, día, tamaño de la línea…) contra el **precio de cierre**.' % len(todo))
    pr('Residuo = (lo que pasó) − (lo que el precio sin margen decía). Si el patrón sirviera, el residuo no sería 0. ROI = apostar 1 unidad al precio real de la casa.\n')
    pr('| Deporte | Patrón | Juegos | Pasó | Precio decía | Residuo | z | p | ROI ± 2·se | Temporadas a favor/contra | ¿Aguanta Holm? |')
    pr('|---|---|---|---|---|---|---|---|---|---|---|')
    for (dep, nom, r), o in zip(todo, ok):
        pr('| %s | %s | %d | %.1f%% | %.1f%% | %+.1f pts | %+.1f | %.3f | %+.1f%% ± %.1f | %d / %d de %d | %s |' % (
            dep, nom, r['n'], 100 * r['tasa'], 100 * r['esperada'], 100 * r['resid'], r['z'], r['p'],
            100 * r['roi'], 200 * r['roi_se'], r['temps_pos'], r['temps_neg'], r['temps'], 'SÍ' if o else 'no'))
    n_nom = sum(1 for _, _, r in todo if r['p'] < 0.05)
    n_ok = sum(ok)
    pr('\n**Resultado:** %d de %d patrones salen con p < 0.05 sin corregir (con %d pruebas se esperan ≈ %.1f solo por suerte). Después de corregir por tantas pruebas (Holm): **%d**.' % (n_nom, len(todo), len(todo), 0.05 * len(todo), n_ok))
    n, s5, s1, sd = control_azar(dfut)
    pr('\n**Control con banderas al azar:** de %d "patrones" inventados al tirar la moneda, %d (%.1f%%) salieron con p < 0.05 y %d con p < 0.01. Es lo esperado (5%% y 1%%): eso es lo que se ve cuando NO hay nada.' % (n, s5, 100 * s5 / max(n, 1), s1))
    pr('\n## En vigilancia (solo juegos jugados desde el 26-oct-2026, fuera de la muestra donde se encontraron)\n')
    pr('Un patrón solo "se gana" un lugar en las apps si repite en juegos que no se usaron para encontrarlo. Estos tres son los únicos con algo de señal; cada vez que se vuelve a correr se miden solo con juegos nuevos.\n')
    pr('| Deporte | Patrón | Por qué se vigila | Juegos nuevos | Pasó | Precio decía | z | ROI |')
    pr('|---|---|---|---|---|---|---|---|')
    for dep, (_, nom, why), r in vigilancia():
        if r: pr('| %s | %s | %s | %d | %.1f%% | %.1f%% | %+.1f | %+.1f%% |' % (dep, nom, why, r['n'], 100 * r['tasa'], 100 * r['esperada'], r['z'], 100 * r['roi']))
        else: pr('| %s | %s | %s | 0 | — | — | — | — |' % (dep, nom, why))
    texto = '\n'.join(L)
    print(texto)
    open(os.path.join(D, 'patrones-resultado.md'), 'w').write(texto + '\n')
    json.dump([dict(dep=d, patron=n_, **r) for d, n_, r in todo], open(os.path.join(D, 'patrones-resultado.json'), 'w'), ensure_ascii=False)

if __name__ == '__main__':
    main()
