# Sorpresas: ¿cuándo pierde el favorito más de lo que dice su precio? (idea de Osvaldo, 25-nov-2026)
# En vez de mirar quién gana, mirar al que «no debería» ganar: situaciones donde el no favorito gana más
# (o menos) de lo que el mercado de cierre le daba. Se mide en ACIERTOS: ganó contra esperado.
# Reglas fijadas ANTES de correr: pasa si |z| >= 2.5 con todo junto, y en las dos mitades (A y B) va hacia el mismo
# lado con al menos 1 punto de diferencia. Además se reporta Holm sobre todas las pruebas.
# Uso: python3 sorpresas.py nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json
import json, gzip, math, sys, collections

def novig(a, b):
    def imp(x): return 100/(x+100) if x > 0 else -x/(-x+100)
    if not a or not b: return None
    pa, pb = imp(a), imp(b); return pa/(pa+pb)

def nba(box_f, filas_f):
    filas = {r['id']: r for r in json.load(open(filas_f))}
    out = []
    for g in json.load(gzip.open(box_f))['g']:
        f = filas.get(g['id']); p = None; ty = 2; mod = None
        if f:
            ty = f.get('ty', 2); p = novig(f.get('mlH'), f.get('mlA'))
            if f.get('V0') and f.get('spread') is not None: mod = f['V0']['pm'] + f['spread']   # >0: el modelo le ve más al local que la línea
        out.append(dict(ts=g['ts'], s=g['sk'], h=g['h'], a=g['a'], hs=g['hs'], as_=g['as'], pH=p, ty=ty, mod=mod))
    return out

def espn(f):
    d = json.load(open(f)); out = []
    for s, T in d['temps'].items():
        for g in T['juegos']:
            if not g.get('done') or g.get('skip'): continue
            l = g.get('linea') or {}; ml = l.get('ml') or [None, None]
            p = novig(ml[0], ml[1]) if not g.get('neutral') else None
            out.append(dict(ts=g['ts'], s=int(s), h=g['abH'], a=g['abA'], hs=g['hs'], as_=g['as'], pH=p, ty=g.get('ty', 2), mod=None))
    return out

PALIZA = {'nba': 20, 'nhl': 3, 'nfl': 17}
B2B = {'nba': 1.6, 'nhl': 1.6, 'nfl': 0}   # días; en NFL no hay back-to-back

def contexto(J, dep):
    """Agrega a cada juego lo que se sabía ANTES: descanso, rachas, gira, último juego, cruce previo."""
    J.sort(key=lambda g: g['ts'])
    hist = collections.defaultdict(list)   # equipo -> [(ts, local?, gano, margen, rival, temporada)]
    for g in J:
        for lado, eq, riv in (('H', g['h'], g['a']), ('A', g['a'], g['h'])):
            H = [x for x in hist[eq] if x[5] == g['s']]
            c = {}
            c['dias'] = (g['ts'] - H[-1][0])/864e5 if H else None
            c['n4'] = sum(1 for x in H if g['ts'] - x[0] <= 3.6*864e5)          # juegos en las 3 noches anteriores
            c['racha'] = 0
            for x in reversed(H):
                if c['racha'] >= 0 and x[2]: c['racha'] += 1
                elif c['racha'] <= 0 and not x[2]: c['racha'] -= 1
                else: break
            c['ult_mar'] = H[-1][3] if H else None
            c['gira'] = 0
            if lado == 'A':
                for x in reversed(H):
                    if x[1]: break
                    c['gira'] += 1
                c['gira'] += 1    # este juego cuenta
            u10 = H[-10:]; c['g10'] = sum(x[2] for x in u10) if len(u10) == 10 else None
            c['nj'] = len(H)
            prev = [x for x in H if x[4] == riv]; c['perdio_cruce'] = (not prev[-1][2]) if prev else None
            g['c'+lado] = c
        gH = g['hs'] > g['as_']
        if g['hs'] != g['as_'] or dep != 'nfl':
            hist[g['h']].append((g['ts'], True, gH, g['hs']-g['as_'], g['a'], g['s']))
            hist[g['a']].append((g['ts'], False, not gH, g['as_']-g['hs'], g['h'], g['s']))
    return J

def filas(J, dep):
    R = []
    for g in J:
        p = g['pH']
        if p is None or g['ty'] != 2 or not (0.03 < p < 0.97) or abs(p-0.5) < 0.02 or g['hs'] == g['as_']: continue
        favH = p > 0.5; F, D = (g['cH'], g['cA']) if favH else (g['cA'], g['cH'])
        pf = p if favH else 1-p
        gana = (g['hs'] > g['as_']) == favH
        modf = None
        if g['mod'] is not None: modf = g['mod'] if favH else -g['mod']   # >0: el modelo le ve MÁS al favorito que la línea
        R.append(dict(s=g['s'], pf=pf, gana=gana, F=F, D=D, favLocal=favH, mod=modf))
    return R

def reglas(dep):
    b, pz = B2B[dep], PALIZA[dep]
    L = []
    if dep != 'nfl':
        L += [('Favorito jugó ayer y el rival no', lambda r: r['F']['dias'] is not None and r['D']['dias'] is not None and r['F']['dias'] <= b and r['D']['dias'] > b),
              ('Rival jugó ayer y el favorito no', lambda r: r['F']['dias'] is not None and r['D']['dias'] is not None and r['D']['dias'] <= b and r['F']['dias'] > b),
              ('Favorito: 3er juego en 4 noches', lambda r: r['F']['n4'] >= 2),
              ('Rival descansó 2+ días más', lambda r: r['F']['dias'] is not None and r['D']['dias'] is not None and r['D']['dias'] - r['F']['dias'] >= 2 and r['D']['dias'] < 8)]
    else:
        L += [('Rival viene de semana libre y el favorito no', lambda r: r['D']['dias'] is not None and r['F']['dias'] is not None and r['D']['dias'] >= 12 and r['F']['dias'] < 10),
              ('Favorito jugó jueves (semana corta)', lambda r: r['F']['dias'] is not None and r['F']['dias'] <= 5)]
    L += [('Favorito de visita, 4º juego o más de gira', lambda r: (not r['favLocal']) and r['F']['gira'] >= 4),
          ('Favorito en casa (no favorito de visita)', lambda r: r['favLocal']),
          ('Favorito de visita', lambda r: not r['favLocal']),
          ('Favorito viene de 5+ victorias seguidas', lambda r: r['F']['racha'] >= 5),
          ('Rival viene de 5+ derrotas seguidas', lambda r: r['D']['racha'] <= -5),
          ('Rival viene de 3+ victorias seguidas', lambda r: r['D']['racha'] >= 3),
          ('Favorito viene de perder', lambda r: r['F']['racha'] < 0),
          ('Favorito viene de ganar por paliza', lambda r: r['F']['ult_mar'] is not None and r['F']['ult_mar'] >= pz),
          ('Rival viene de perder por paliza', lambda r: r['D']['ult_mar'] is not None and r['D']['ult_mar'] <= -pz),
          ('Rival ganó el último cruce entre los dos', lambda r: r['F']['perdio_cruce'] is True),
          ('Rival viene mejor en los últimos 10 (2+ victorias más)', lambda r: r['F']['g10'] is not None and r['D']['g10'] is not None and r['D']['g10'] - r['F']['g10'] >= 2),
          ('Inicio de temporada (favorito con menos de 8 juegos)', lambda r: r['F']['nj'] < (4 if dep == 'nfl' else 8)),
          ('Favorito grande (75%+)', lambda r: r['pf'] >= 0.75),
          ('Favorito corto (52-58%)', lambda r: r['pf'] < 0.58)]
    if dep == 'nba':
        L += [('Modelo de la app le ve 4+ puntos MENOS al favorito', lambda r: r['mod'] is not None and r['mod'] <= -4),
              ('Modelo de la app le ve 4+ puntos MÁS al favorito', lambda r: r['mod'] is not None and r['mod'] >= 4)]
    return L

def medir(R, f):
    n = w = e = v = 0
    for r in R:
        if f(r): n += 1; w += r['gana']; e += r['pf']; v += r['pf']*(1-r['pf'])
    if not n: return None
    return dict(n=n, w=w, e=e, d=(w-e)/n*100, z=(w-e)/math.sqrt(v) if v else 0)

def main():
    box, fil, nhl, nfl = sys.argv[1:5]
    datos = {'nba': nba(box, fil), 'nhl': espn(nhl), 'nfl': espn(nfl)}
    corte = {'nba': 2024, 'nhl': 2024, 'nfl': 2024}   # A = antes de 2024, B = 2024 en adelante
    todas = []
    for dep, J in datos.items():
        R = filas(contexto(J, dep), dep)
        A = [r for r in R if r['s'] < corte[dep]]; B = [r for r in R if r['s'] >= corte[dep]]
        base = medir(R, lambda r: True)
        print('\n## %s — %d juegos con precio de cierre (A %d, B %d). El favorito ganó %.1f%%, el precio decía %.1f%%' % (dep.upper(), base['n'], len(A), len(B), base['w']/base['n']*100, base['e']/base['n']*100))
        print('| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |')
        print('|---|---|---|---|---|---|---|---|')
        for nom, f in reglas(dep):
            t, a, b = medir(R, f), medir(A, f), medir(B, f)
            if not t or t['n'] < 60: continue
            # visto desde el NO favorito: gana = n - w ; esperado = n - e ; su diferencia = -d
            dd = -t['d']; da = -a['d'] if a else 0; db = -b['d'] if b else 0
            pasa = abs(t['z']) >= 2.5 and a and b and da*db > 0 and abs(da) >= 1 and abs(db) >= 1
            p2 = math.erfc(abs(t['z'])/math.sqrt(2))
            todas.append((p2, dep, nom))
            print('| %s | %d | %.1f%% | %.1f%% | %+.1f pts | %+.1f | %+.1f / %+.1f | %s |' % (nom, t['n'], (t['n']-t['w'])/t['n']*100, (t['n']-t['e'])/t['n']*100, dd, -t['z'], da, db, 'SÍ' if pasa else 'no'))
    todas.sort(); m = len(todas)
    print('\nHolm sobre %d pruebas:' % m)
    for i, (p, dep, nom) in enumerate(todas[:6]):
        print('- %s · %s: p = %.4f, umbral Holm %.4f → %s' % (dep.upper(), nom, p, 0.05/(m-i), 'pasa' if p < 0.05/(m-i) else 'no pasa'))

main()
