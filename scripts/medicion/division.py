# JUEGOS DE DIVISIÓN (27-nov-2026, mejora diaria)
# Idea clásica de la literatura de la NFL: en juegos entre rivales de la misma división (se ven 2 veces al año, se conocen),
# el no favorito gana más de lo que dice su precio. Se prueba en NFL, NHL y NBA contra el precio de cierre, en ACIERTOS.
# REGLA FIJADA ANTES DE CORRER: pasa en un deporte si |z| >= 2 con Holm sobre los 3 deportes, y las dos mitades del archivo
# van hacia el mismo lado con 1+ punto cada una.
# Uso (carpeta con nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json): python3 division.py
import math, os, importlib.util
spec = importlib.util.spec_from_file_location('S', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

DIV = {
 'nfl': [['BUF','MIA','NE','NYJ'],['BAL','CIN','CLE','PIT'],['HOU','IND','JAX','TEN'],['DEN','KC','LV','OAK','LAC'],
         ['DAL','NYG','PHI','WSH'],['CHI','DET','GB','MIN'],['ATL','CAR','NO','TB'],['ARI','LAR','SF','SEA']],
 'nhl': [['BOS','BUF','DET','FLA','MTL','OTT','TB','TOR'],['CAR','CBJ','NJ','NYI','NYR','PHI','PIT','WSH'],
         ['ARI','UTA','UTAH','CHI','COL','DAL','MIN','NSH','STL','WPG'],['ANA','CGY','EDM','LA','SJ','SEA','VAN','VGK']],
 'nba': [['BOS','BKN','NY','PHI','TOR'],['CHI','CLE','DET','IND','MIL'],['ATL','CHA','MIA','ORL','WSH'],
         ['DEN','MIN','OKC','POR','UTAH'],['GS','LAC','LAL','PHX','SAC'],['DAL','HOU','MEM','NO','SA']]}
NBA_ID = {'1':'ATL','2':'BOS','3':'NO','4':'CHI','5':'CLE','6':'DAL','7':'DEN','8':'DET','9':'GS','10':'HOU','11':'IND','12':'LAC','13':'LAL',
          '14':'MIA','15':'MIL','16':'MIN','17':'BKN','18':'NY','19':'ORL','20':'PHI','21':'PHX','22':'POR','23':'SAC','24':'SA','25':'OKC',
          '26':'UTAH','27':'WSH','28':'TOR','29':'MEM','30':'CHA'}

def division(dep, ab):
    for i, d in enumerate(DIV[dep]):
        if ab in d: return i
    return None

def medir(R):
    n = len(R); w = sum(1 - r['y'] for r in R); e = sum(1 - r['pf'] for r in R); v = sum(r['pf'] * (1 - r['pf']) for r in R)
    return dict(n=n, gana=w / n * 100, precio=e / n * 100, d=(w - e) / n * 100, z=(w - e) / math.sqrt(v)) if n else None

def main():
    datos = {'nfl': S.espn('datos-nfl.json'), 'nhl': S.espn('datos-nhl.json'), 'nba': S.nba('nba-box.json.gz', 'filas_nba.json')}
    corte = {'nfl': 2023, 'nhl': 2024, 'nba': 2024}
    res = []
    for dep, J in datos.items():
        R, sin = [], set()
        for g in J:
            p = g['pH']
            if p is None or g['ty'] != 2 or not (0.03 < p < 0.97) or g['hs'] is None or g['hs'] == g['as_']: continue
            h, a = (NBA_ID.get(str(g['h'])), NBA_ID.get(str(g['a']))) if dep == 'nba' else (g['h'], g['a'])
            dh, da = division(dep, h), division(dep, a)
            if dh is None: sin.add(h)
            if da is None: sin.add(a)
            if dh is None or da is None: continue
            favH = p >= .5
            R.append(dict(s=g['s'], div=dh == da, pf=p if favH else 1 - p, y=1 if (g['hs'] > g['as_']) == favH else 0))
        D = [r for r in R if r['div']]; N = [r for r in R if not r['div']]
        t, o = medir(D), medir(N)
        a, b = medir([r for r in D if r['s'] < corte[dep]]), medir([r for r in D if r['s'] >= corte[dep]])
        print('\n## %s — %d juegos de división de %d (equipos sin división en el mapa: %s)' % (dep.upper(), len(D), len(R), ', '.join(sorted(x for x in sin if x)) or 'ninguno'))
        print('| | Juegos | El no favorito gana | Su precio decía | Diferencia | z |'); print('|---|---|---|---|---|---|')
        for nom, m in (('De división', t), ('Mitad A (antes de %d)' % corte[dep], a), ('Mitad B', b), ('Fuera de la división', o)):
            print('| %s | %d | %.1f%% | %.1f%% | %+.1f pts | %+.2f |' % (nom, m['n'], m['gana'], m['precio'], m['d'], m['z']))
        res.append((math.erfc(abs(t['z']) / math.sqrt(2)), dep, t, a, b))
    res.sort(key=lambda x: x[0]); m = len(res); holm = True
    print('\n## Veredicto (Holm sobre %d deportes)\n' % m)
    for i, (p, dep, t, a, b) in enumerate(res):
        holm = holm and p < 0.05 / (m - i)
        mitades = a['d'] * b['d'] > 0 and abs(a['d']) >= 1 and abs(b['d']) >= 1 and a['d'] * t['d'] > 0
        print('- %s: diferencia %+.1f pts, p = %.3f (umbral %.3f) → %s' % (dep.upper(), t['d'], p, 0.05 / (m - i), 'PASA' if (holm and mitades and abs(t['z']) >= 2) else 'no pasa'))

if __name__ == '__main__':
    main()
