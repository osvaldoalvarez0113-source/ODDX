"""NHL · ¿los datos que le faltan a OVA mejoran el precio de cierre?
Une datos-nhl.json (marcadores + líneas de cierre DraftKings vía ESPN) con nhl-box.json (tiros, portero titular,
power play; API oficial NHL). Todos los factores se calculan SOLO con juegos anteriores. Cada factor se prueba
dejando una temporada afuera (se ajusta con las demás y se mide en la que quedó afuera).
Uso: python3 -I scripts/medicion/nhl_factores.py datos-nhl.json nhl-box.json > docs/medicion-nhl-factores.md"""
import json, sys, math
from datetime import datetime, timezone
import numpy as np

ESP = {'LA': 'LAK', 'NJ': 'NJD', 'SJ': 'SJS', 'TB': 'TBL', 'WSH': 'WSH', 'UTAH': 'UTA', 'MON': 'MTL'}
d = json.load(open(sys.argv[1])); box = json.load(open(sys.argv[2]))['g']

def impl(a): return 100 / (a + 100) if a > 0 else -a / (-a + 100)
def pay(a): return a / 100 if a > 0 else 100 / -a
def temp(ts):
    t = datetime.fromtimestamp(ts / 1000 - 36000, timezone.utc); return t.year if t.month >= 8 else t.year - 1

# líneas por (local, fecha UTC aproximada)
lin = {}
for s, T in d['temps'].items():
    for g in T['juegos']:
        if g.get('done') and g.get('linea') and g['linea'].get('ml') and g.get('ty') == 2:
            k = (ESP.get(g['abH'], g['abH']), ESP.get(g['abA'], g['abA']))
            lin.setdefault(k, []).append(g)
def buscar(b):
    for g in lin.get((b['h'], b['a']), []):
        if abs(g['ts'] - b['ts']) < 12 * 3600e3: return g
    return None

# ---------- factores previos al juego ----------
A = 0.06      # peso de cada juego nuevo en los promedios móviles (≈ últimos 15-20 juegos)
team = {}; gk = {}; last = {}
lgSV = 0.905; lgPP = 0.21
def T_(t):
    return team.setdefault(t, {'sf': 30.0, 'sa': 30.0, 'gf': 3.05, 'ga': 3.05, 'ppo': 3.0, 'ppg': 0.63, 'pko': 3.0, 'pkg': 0.63, 'gks': {}, 'n': 0, 'dias': []})
def G_(i):
    return gk.setdefault(i, {'sa': 0.0, 'ga': 0.0})
def qGk(i):  # goles salvados sobre lo esperado por tiro, encogido hacia 0 (600 tiros de prior)
    g = gk.get(i); return 0.0 if not g else (lgSV * g['sa'] - g['ga']) / (g['sa'] + 600)
def qTipico(t):  # calidad del portero "normal" del equipo, ponderada por titularidades recientes
    w = T_(t)['gks']; s = sum(w.values()); return 0.0 if s <= 0 else sum(v * qGk(k) for k, v in w.items()) / s

filas = []; ant = None
for b in sorted(box, key=lambda x: x['ts']):
    s = temp(b['ts'])
    if ant is not None and s != ant:     # nueva temporada: los equipos se acercan al promedio, los porteros pierden peso
        for t in team.values():
            for k in ('sf', 'sa'): t[k] = 30 + 0.6 * (t[k] - 30)
            for k in ('gf', 'ga'): t[k] = 3.05 + 0.6 * (t[k] - 3.05)
            t['n'] = 0
        for g in gk.values(): g['sa'] *= 0.6; g['ga'] *= 0.6
    ant = s
    h, a = T_(b['h']), T_(b['a']); dia = b['ts'] // 864e5
    m = buscar(b)
    gH, gA = b.get('gH') or {}, b.get('gA') or {}
    if m and h['n'] >= 8 and a['n'] >= 8 and gH.get('id') and gA.get('id'):
        L = m['linea']; ph, pa = impl(L['ml'][0]), impl(L['ml'][1]); pm = ph / (ph + pa)
        def b2b(t): return 1 if last.get(t) == dia - 1 else 0
        def tres(t): return 1 if len([x for x in T_(t)['dias'] if dia - 4 < x < dia]) >= 2 else 0
        tot = b['hs'] + b['as'] - (1 if b.get('pt') == 'SO' else 0)
        f = dict(s=s, y=1 if b['hs'] > b['as'] else 0, pm=pm, mlH=L['ml'][0], mlA=L['ml'][1],
                 tl=L.get('tot'), ou=L.get('ou'), tot=tot,
                 tiros=(h['sf'] - h['sa']) - (a['sf'] - a['sa']),
                 goles=(h['gf'] - h['ga']) - (a['gf'] - a['ga']),
                 pdo=((h['gf'] - h['ga']) - (a['gf'] - a['ga'])) - 0.1 * ((h['sf'] - h['sa']) - (a['sf'] - a['sa'])),
                 port=qGk(gH['id']) - qGk(gA['id']),
                 suplente=(qGk(gH['id']) - qTipico(b['h'])) - (qGk(gA['id']) - qTipico(b['a'])),
                 pp=(h['ppg'] / h['ppo'] - h['pkg'] / h['pko']) - (a['ppg'] / a['ppo'] - a['pkg'] / a['pko']),
                 cansancio=(tres(b['a']) - tres(b['h'])),
                 volTiros=h['sf'] + h['sa'] + a['sf'] + a['sa'] - 120,
                 sumPort=qGk(gH['id']) + qGk(gA['id']),
                 volPP=(h['ppo'] + h['pko'] + a['ppo'] + a['pko']) - 12,
                 golesTot=h['gf'] + h['ga'] + a['gf'] + a['ga'] - 12.2)
        filas.append(f)
    # actualizar con el resultado
    for t, sf, sa, gf, ga, ppx, ppy in ((h, b.get('hsog'), b.get('asog'), b['hs'], b['as'], b.get('ppH'), b.get('ppA')),
                                         (a, b.get('asog'), b.get('hsog'), b['as'], b['hs'], b.get('ppA'), b.get('ppH'))):
        if sf is not None and sa is not None: t['sf'] += A * (sf - t['sf']); t['sa'] += A * (sa - t['sa'])
        t['gf'] += A * (gf - t['gf']); t['ga'] += A * (ga - t['ga'])
        if ppx: t['ppo'] += A * (ppx[1] - t['ppo']); t['ppg'] += A * (ppx[0] - t['ppg'])
        if ppy: t['pko'] += A * (ppy[1] - t['pko']); t['pkg'] += A * (ppy[0] - t['pkg'])
        t['n'] += 1
    for t, g in ((h, gH), (a, gA)):
        if g.get('id'):
            for k in list(t['gks']): t['gks'][k] *= 0.92
            t['gks'][g['id']] = t['gks'].get(g['id'], 0) + 1
    for g in (gH, gA):
        if g.get('id') and g.get('sa') is not None and g.get('ga') is not None:
            G_(g['id'])['sa'] += g['sa']; G_(g['id'])['ga'] += g['ga']
    last[b['h']] = dia; last[b['a']] = dia
    h['dias'] = (h['dias'] + [dia])[-4:]; a['dias'] = (a['dias'] + [dia])[-4:]

S = sorted(set(f['s'] for f in filas))
print('# NHL · ¿los factores que faltan mejoran la línea de cierre?\n')
print('Juegos unidos (línea de cierre + datos de la NHL, 8+ juegos por equipo): **%d** · temporadas %s\n' % (len(filas), ', '.join(map(str, S))))

# ---------- ganador: logit(mercado) + b·x, dejando una temporada afuera ----------
def lg(p): p = min(max(p, 1e-6), 1 - 1e-6); return math.log(p / (1 - p))
def ajustar(X, off, y):
    b = np.zeros(X.shape[1])
    for _ in range(30):
        z = off + X @ b; p = 1 / (1 + np.exp(-z)); W = p * (1 - p)
        H = X.T @ (X * W[:, None]) + 1e-3 * np.eye(X.shape[1]); g = X.T @ (y - p)
        b += np.linalg.solve(H, g)
    return b
def ll(p, y): p = np.clip(p, 1e-9, 1 - 1e-9); return -(y * np.log(p) + (1 - y) * np.log(1 - p))
def probar(cols):
    sd = {c: np.std([f[c] for f in filas]) or 1 for c in cols}
    dif = []; bs = []
    for s in S:
        tr = [f for f in filas if f['s'] != s]; te = [f for f in filas if f['s'] == s]
        Xtr = np.array([[f[c] / sd[c] for c in cols] for f in tr]); otr = np.array([lg(f['pm']) for f in tr]); ytr = np.array([f['y'] for f in tr])
        b = ajustar(Xtr, otr, ytr); bs.append(b)
        Xte = np.array([[f[c] / sd[c] for c in cols] for f in te]); ote = np.array([lg(f['pm']) for f in te]); yte = np.array([f['y'] for f in te])
        pm = 1 / (1 + np.exp(-ote)); pq = 1 / (1 + np.exp(-(ote + Xte @ b)))
        dif += list(ll(pm, yte) - ll(pq, yte))
    dif = np.array(dif); z = dif.mean() / (dif.std(ddof=1) / math.sqrt(len(dif)))
    return dif.mean(), z, np.mean(bs, axis=0), np.std(bs, axis=0)
PRUEBAS = [('Tiros a puerta (dominio del juego)', ['tiros']), ('Portero titular (calidad, GSAx por tiro)', ['port']),
           ('Portero suplente (titular vs. el de siempre)', ['suplente']), ('Power play y penalty kill', ['pp']),
           ('Suerte (goles por encima de lo que dan los tiros)', ['pdo']), ('3 juegos en 4 noches', ['cansancio']),
           ('Todo junto', ['tiros', 'port', 'suplente', 'pp', 'pdo', 'cansancio'])]
print('## 1) Ganador: ¿mejora el precio de cierre del mercado?\n')
print('Mejora = cuánto baja la pérdida logarítmica frente al mercado solo (positivo = el factor ayuda). Con 6 pruebas, hace falta z > 2.6 (corrección de Holm) para creerle.\n')
print('| Factor | Juegos | Mejora (×1000) | z | Peso (por desv. típica) ± entre temporadas | Veredicto |\n|---|---|---|---|---|---|')
res = {}
for nom, cols in PRUEBAS:
    m, z, b, sb = probar(cols); res[nom] = (m, z)
    ver = 'AYUDA' if z > 2.6 else ('empeora' if z < -2 else 'no se distingue')
    print('| %s | %d | %+.2f | %.1f | %s | %s |' % (nom, len(filas), m * 1000, z, ', '.join('%+.3f±%.3f' % (x, y) for x, y in zip(b, sb)), ver))

# ---------- totales ----------
print('\n## 2) Total de goles: ¿mejora la línea?\n')
TF = [f for f in filas if f['tl'] and f['ou']]
def probarT(cols):
    dif = []; bs = []
    for s in S:
        tr = [f for f in TF if f['s'] != s]; te = [f for f in TF if f['s'] == s]
        X = np.array([[1] + [f[c] for c in cols] for f in tr]); y = np.array([f['tot'] - f['tl'] for f in tr])
        b = np.linalg.lstsq(X, y, rcond=None)[0]; bs.append(b)
        Xe = np.array([[1] + [f[c] for c in cols] for f in te]); ye = np.array([f['tot'] - f['tl'] for f in te])
        X0 = np.ones((len(tr), 1)); b0 = np.linalg.lstsq(X0, y, rcond=None)[0]
        dif += list((ye - b0[0]) ** 2 - (ye - Xe @ b) ** 2)
    dif = np.array(dif); return dif.mean(), dif.mean() / (dif.std(ddof=1) / math.sqrt(len(dif))), np.mean(bs, axis=0)
print('Comparado contra la línea (más su sesgo medio). Mejora = baja del error cuadrático (positivo = ayuda).\n')
print('| Factor | Juegos | Mejora | z | Coeficientes | Veredicto |\n|---|---|---|---|---|---|')
for nom, cols in [('Volumen de tiros de los dos', ['volTiros']), ('Porteros de los dos (calidad)', ['sumPort']), ('Volumen de power play', ['volPP']),
                  ('Goles recientes de los dos (lo que usa OVA)', ['golesTot']), ('Todo junto', ['volTiros', 'sumPort', 'volPP', 'golesTot'])]:
    m, z, b = probarT(cols)
    print('| %s | %d | %+.3f | %.1f | %s | %s |' % (nom, len(TF), m, z, ', '.join('%+.3f' % x for x in b), 'AYUDA' if z > 2.6 else ('empeora' if z < -2 else 'no se distingue')))

# ---------- apuestas con lo mejor ----------
print('\n## 3) ¿Se gana dinero? Apostar Menos/Más con el modelo de totales «todo junto» (precio real de cierre)\n')
print('| Temporada probada | Regla | Apuestas | % ganadas | ROI |\n|---|---|---|---|---|')
cols = ['volTiros', 'sumPort', 'volPP', 'golesTot']; tot = {}
for s in S:
    tr = [f for f in TF if f['s'] != s]; te = [f for f in TF if f['s'] == s]
    X = np.array([[1] + [f[c] for c in cols] for f in tr]); y = np.array([f['tot'] - f['tl'] for f in tr]); b = np.linalg.lstsq(X, y, rcond=None)[0]
    for f in te:
        e = b[0] + sum(b[i + 1] * f[c] for i, c in enumerate(cols))
        if f['tot'] == f['tl']: continue
        for th in (0.25, 0.4):
            for lado, cond, gana, odd in (('Menos', e <= -th, f['tot'] < f['tl'], f['ou'][1]), ('Más', e >= th, f['tot'] > f['tl'], f['ou'][0])):
                if cond:
                    r = tot.setdefault((s, lado, th), [0, 0, 0.0]); r[0] += 1; r[1] += gana; r[2] += pay(odd) if gana else -1
for k in sorted(tot):
    n, w, p = tot[k]; print('| %d | %s si espera %.2f+ goles de diferencia | %d | %.1f%% | %+.1f%% |' % (k[0], k[1], k[2], n, w / n * 100, p / n * 100))
ag = {}
for (s, l, th), v in tot.items():
    r = ag.setdefault((l, th), [0, 0, 0.0]); r[0] += v[0]; r[1] += v[1]; r[2] += v[2]
for (l, th), (n, w, p) in sorted(ag.items()):
    print('| **todas** | %s · %.2f | %d | %.1f%% | **%+.1f%% ± %.0f** |' % (l, th, n, w / n * 100, p / n * 100, 200 / math.sqrt(n)))
