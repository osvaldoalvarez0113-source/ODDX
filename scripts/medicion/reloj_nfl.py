# EL RELOJ DEL CUERPO EN LA NFL (27-nov-2026, mejora diaria)
# Idea clásica (estudios de ritmo circadiano, Smith et al. y otros): un equipo de la costa oeste que juega de visita en la
# costa este a la 1 p. m. (10 a. m. en su cuerpo) rinde menos. ¿Gana menos de lo que dice su precio de cierre? Se mide en aciertos.
# REGLA FIJADA ANTES DE CORRER: pasa si |z| >= 2 y las dos mitades (antes de 2023 / 2023 en adelante) van hacia el mismo lado
# con 1+ punto cada una. Una sola prueba (más la de los partidos de noche como comparación).
# Uso (carpeta con datos-nfl.json): python3 reloj_nfl.py
import math, os, time, importlib.util
spec = importlib.util.spec_from_file_location('S', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
OESTE = {'SEA', 'SF', 'LAR', 'LAC', 'LV', 'OAK'}
ESTE = {'BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT', 'IND', 'JAX', 'TEN', 'DET', 'ATL', 'CAR', 'TB', 'NYG', 'PHI', 'WSH'}

def hora_este(ts):
    t = time.gmtime(ts / 1000); dst = 3 <= t.tm_mon <= 10 or (t.tm_mon == 11 and t.tm_mday < 7)
    return (t.tm_hour - (4 if dst else 5)) % 24

def medir(R):
    n = len(R); w = sum(r['y'] for r in R); e = sum(r['p'] for r in R); v = sum(r['p'] * (1 - r['p']) for r in R)
    return dict(n=n, gana=w / n * 100, precio=e / n * 100, d=(w - e) / n * 100, z=(w - e) / math.sqrt(v)) if n else None

R = []
for g in S.espn('datos-nfl.json'):
    p = g['pH']
    if p is None or g['ty'] != 2 or g['hs'] is None or g['hs'] == g['as_'] or g['a'] not in OESTE or g['h'] not in ESTE: continue
    R.append(dict(s=g['s'], temprano=hora_este(g['ts']) < 15, p=1 - p, y=1 if g['as_'] > g['hs'] else 0))   # visto desde el equipo del oeste
T = [r for r in R if r['temprano']]; N = [r for r in R if not r['temprano']]
t, a, b, o = medir(T), medir([r for r in T if r['s'] < 2023]), medir([r for r in T if r['s'] >= 2023]), medir(N)
print('## Equipo del oeste de visita en el este (%d juegos con precio de cierre)\n' % len(R))
print('| | Juegos | El del oeste gana | Su precio decía | Diferencia | z |'); print('|---|---|---|---|---|---|')
for nom, m in (('A la 1 p. m. del este (10 a. m. en su cuerpo)', t), ('Mitad A (antes de 2023)', a), ('Mitad B', b), ('De tarde o de noche (comparación)', o)):
    if m: print('| %s | %d | %.1f%% | %.1f%% | %+.1f pts | %+.2f |' % (nom, m['n'], m['gana'], m['precio'], m['d'], m['z']))
pasa = abs(t['z']) >= 2 and a and b and a['d'] * b['d'] > 0 and abs(a['d']) >= 1 and abs(b['d']) >= 1
print('\n**%s**' % ('PASA' if pasa else 'No pasa'))
