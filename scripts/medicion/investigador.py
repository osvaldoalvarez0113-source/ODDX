# INVESTIGADOR DE PATRONES (semanal, idea de Osvaldo 25-nov-2026)
# Prueba solo las situaciones de sorpresas.py (descanso, giras, rachas, palizas, cruces, forma, tamaño del precio) y TODAS las
# parejas de ellas, en NBA, NHL y NFL, contra el precio de cierre. Se mide en ACIERTOS: ganó contra lo que decía su precio.
# REGLAS FIJAS (no se tocan para que algo pase):
#   1. Mínimo 150 juegos (una sola situación) o 200 (pareja).
#   2. Holm al 5% sobre TODAS las pruebas de la corrida (cientos: hace falta un z de ~3.9).
#   3. Las dos mitades del archivo (antes de 2024 / 2024 en adelante) van hacia el mismo lado, con 1+ punto cada una.
#   4. Si la temporada en curso (cierres-<dep>.json) ya tiene 40+ juegos de esa situación, no puede ir hacia el lado contrario.
# Además vigila las señales que ya entraron a la app (VIGILADAS): si con la temporada en curso van al revés (z >= 2), avisa.
# Uso: python3 investigador.py <carpeta con nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json cierres-*.json> [estado anterior]
import json, math, os, sys, importlib.util, itertools

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('sorpresas', os.path.join(AQUI, 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

MIN1, MIN2, MIN_ACT = 150, 200, 40
VIGILADAS = [   # señales que ya están en la app: (deporte, nombre de la situación, lado medido: -1 = el no favorito gana MENOS)
    ('nba', 'Rival viene mejor en los últimos 10 (2+ victorias más)', -1),
]

def cargar(d):
    def f(n): return os.path.join(d, n)
    hist, act = {}, {}
    if os.path.exists(f('nba-box.json.gz')) and os.path.exists(f('filas_nba.json')):
        hist['nba'] = S.nba(f('nba-box.json.gz'), f('filas_nba.json'))
    for dep in ('nhl', 'nfl'):
        if os.path.exists(f('datos-%s.json' % dep)): hist[dep] = S.espn(f('datos-%s.json' % dep))
    for dep in ('nba', 'nhl', 'nfl'):
        if os.path.exists(f('cierres-%s.json' % dep)): act[dep] = S.espn(f('cierres-%s.json' % dep))
    return hist, act

def extras(dep):
    """situaciones que no estaban en sorpresas.py (se agregan aquí para no cambiar esa medición)"""
    L = [('Favorito con peor récord de temporada que el rival', lambda r: r['F']['pct'] is not None and r['D']['pct'] is not None and r['D']['pct'] > r['F']['pct']),
         ('Favorito viene de 3+ derrotas seguidas', lambda r: r['F']['racha'] <= -3),
         ('Rival viene de ganar por paliza', lambda r: r['D']['ult_mar'] is not None and r['D']['ult_mar'] >= S.PALIZA[dep])]
    if dep != 'nfl':
        L += [('Los dos jugaron ayer', lambda r: r['F']['dias'] is not None and r['D']['dias'] is not None and r['F']['dias'] <= 1.6 and r['D']['dias'] <= 1.6),
              ('Rival descansó 3+ días', lambda r: r['D']['dias'] is not None and 3.5 <= r['D']['dias'] < 8),
              ('Final de temporada (marzo y abril)', lambda r: r['mes'] in (3, 4))]
    else:
        L += [('Final de temporada (diciembre y enero)', lambda r: r['mes'] in (12, 1))]
    return L

def pruebas(dep):
    base = [(n, fn) for n, fn in S.reglas(dep)] + extras(dep)
    out = [(n, fn, MIN1) for n, fn in base]
    for (n1, f1), (n2, f2) in itertools.combinations(base, 2):
        out.append((n1 + ' + ' + n2, (lambda a, b: lambda r: a(r) and b(r))(f1, f2), MIN2))
    return out

def mira(R, f):
    t = S.medir(R, f)
    if not t: return None
    # visto desde el NO favorito
    return dict(n=t['n'], gana=round((t['n'] - t['w']) / t['n'] * 100, 1), precio=round((t['n'] - t['e']) / t['n'] * 100, 1), d=round(-t['d'], 1), z=round(-t['z'], 2))

def correr(hist, act):
    filas = []
    for dep, J in hist.items():
        R = S.filas(S.contexto(J, dep), dep)
        sk_act = max([g['s'] for g in act.get(dep, [])] or [0])
        R = [r for r in R if r['s'] < sk_act] if sk_act else R          # el archivo sin la temporada en curso (esa es la prueba aparte)
        RA = S.filas(S.contexto(act[dep], dep), dep) if dep in act else []
        A = [r for r in R if r['s'] < 2024]; B = [r for r in R if r['s'] >= 2024]
        solos = {}
        for nom, f, mn in pruebas(dep):
            t = mira(R, f)
            if not t or t['n'] < mn: continue
            if ' + ' not in nom: solos[nom] = t['n']
            elif t['n'] in [solos.get(x) for x in nom.split(' + ')]: continue      # la pareja no agrega nada (es igual a una de las dos)
            a, b, c = mira(A, f), mira(B, f), mira(RA, f)
            t.update(dep=dep, nom=nom, A=a and a['d'], B=b and b['d'], act=c, p=math.erfc(abs(t['z']) / math.sqrt(2)))
            filas.append(t)
    m = len(filas); filas.sort(key=lambda x: x['p']); holm = True
    for i, x in enumerate(filas):
        holm = holm and x['p'] < 0.05 / (m - i)
        x['holm'] = holm
        mitades = x['A'] is not None and x['B'] is not None and x['A'] * x['B'] > 0 and abs(x['A']) >= 1 and abs(x['B']) >= 1 and x['A'] * x['d'] > 0
        actual_ok = not (x['act'] and x['act']['n'] >= MIN_ACT and x['act']['d'] * x['d'] < 0)
        x['pasa'] = bool(holm and mitades and actual_ok)
    return filas, m

def vigilar(act):
    out = []
    for dep, nom, lado in VIGILADAS:
        if dep not in act: continue
        f = dict(S.reglas(dep) + extras(dep)).get(nom)
        if not f: continue
        c = mira(S.filas(S.contexto(act[dep], dep), dep), f)
        estado = 'pocos juegos' if not c or c['n'] < MIN_ACT else ('SE DAÑÓ' if c['d'] * lado < 0 and abs(c['z']) >= 2 else ('aguanta' if c['d'] * lado > 0 else 'dudosa'))
        out.append(dict(dep=dep, nom=nom, act=c, estado=estado))
    return out

def main():
    d = sys.argv[1]; prev = {}
    if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
        try: prev = json.load(open(sys.argv[2]))
        except Exception: prev = {}
    hist, act = cargar(d)
    filas, m = correr(hist, act); vig = vigilar(act)
    pasan = [x for x in filas if x['pasa']]
    vistas = set(prev.get('vistas', []))
    conocidas = set(dep + '|' + nom for dep, nom, _ in VIGILADAS)
    nuevas = [x for x in pasan if x['dep'] + '|' + x['nom'] not in vistas and x['dep'] + '|' + x['nom'] not in conocidas]
    daño = [v for v in vig if v['estado'] == 'SE DAÑÓ']
    res = dict(v=1, pruebas=m, juegos={k: len(v) for k, v in hist.items()}, actual={k: len(v) for k, v in act.items()},
               pasan=pasan, mejores=filas[:15], vigiladas=vig, nuevas=nuevas,
               vistas=sorted(vistas | set(x['dep'] + '|' + x['nom'] for x in pasan)))
    json.dump(res, open(os.path.join(d, 'investigador.json'), 'w'), ensure_ascii=False)
    L = ['# Investigador de patrones', '', '%d pruebas (situaciones solas y en pareja) en %s. Pasan: %d. Nuevas: %d.' % (m, ', '.join(k.upper() for k in hist), len(pasan), len(nuevas)), '',
         '| Deporte | Situación | Juegos | El no favorito gana | Su precio decía | Dif | z | A / B | Temporada en curso | ¿Pasa? |', '|---|---|---|---|---|---|---|---|---|---|']
    for x in filas[:25]:
        c = x['act']; ct = '%d juegos, %+.1f' % (c['n'], c['d']) if c else '—'
        L.append('| %s | %s | %d | %.1f%% | %.1f%% | %+.1f | %+.1f | %+.1f / %+.1f | %s | %s |' % (x['dep'].upper(), x['nom'], x['n'], x['gana'], x['precio'], x['d'], x['z'], x['A'] or 0, x['B'] or 0, ct, 'SÍ' if x['pasa'] else 'no'))
    L += ['', '## Señales que ya están en la app']
    for v in vig:
        c = v['act']; L.append('- %s · %s: %s%s' % (v['dep'].upper(), v['nom'], v['estado'], (' (temporada en curso: %d juegos, %+.1f pts, z %+.1f)' % (c['n'], c['d'], c['z'])) if c else ''))
    open(os.path.join(d, 'investigador.md'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))
    # aviso: solo si hay algo nuevo que pasó o una señal de la app que se dañó
    av = []
    for x in nuevas[:5]:
        av.append('🔎 %s: %s → el no favorito gana %.1f%% y su precio decía %.1f%% (%d juegos, igual en las dos mitades). %s' % (x['dep'].upper(), x['nom'], x['gana'], x['precio'], x['n'], 'El favorito es MÁS seguro.' if x['d'] < 0 else 'Ojo con el favorito.'))
    for v in daño:
        av.append('⚠️ %s: la señal «%s» va al revés esta temporada (%d juegos, %+.1f pts). Hay que revisarla.' % (v['dep'].upper(), v['nom'], v['act']['n'], v['act']['d']))
    open(os.path.join(d, 'aviso.txt'), 'w').write('\n'.join(av))

if __name__ == '__main__':
    main()
