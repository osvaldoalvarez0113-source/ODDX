# Sorpresas en MLB: ¿cuándo gana el no favorito más (o menos) de lo que dice su precio de cierre? (28-nov-2026)
# Lleva a MLB la medición de sorpresas.py (NBA, NHL, NFL), con temporadas pasadas: cierres-mlb.json (rama cierres, 2023-2026).
# Se mide en ACIERTOS: cuántas veces ganó el no favorito contra lo que su precio sin margen decía.
# REGLA FIJADA ANTES DE CORRER (la misma de sorpresas.py): pasa si |z| >= 2.5 con todo junto y en las dos mitades
# (A = 2023-2024, B = 2025-2026) va hacia el mismo lado con al menos 1 punto. Además Holm 5% sobre todas las pruebas.
# Cambios para béisbol (fijados antes): sin reglas de back-to-back (se juega casi a diario), paliza = 5+ carreras,
# gira larga = 7º juego o más fuera, inicio de temporada = favorito con menos de 15 juegos, favorito grande = 65%+.
# Uso: python3 sorpresas_mlb.py cierres-mlb.json
import math, os, sys, importlib.util
spec = importlib.util.spec_from_file_location('S', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorpresas.py'))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

def reglas():
    return [
        ('Favorito de visita, 7º juego o más de gira', lambda r: (not r['favLocal']) and r['F']['gira'] >= 7),
        ('Favorito en casa (no favorito de visita)', lambda r: r['favLocal']),
        ('Favorito de visita', lambda r: not r['favLocal']),
        ('Favorito viene de 5+ victorias seguidas', lambda r: r['F']['racha'] >= 5),
        ('Rival viene de 5+ derrotas seguidas', lambda r: r['D']['racha'] <= -5),
        ('Rival viene de 3+ victorias seguidas', lambda r: r['D']['racha'] >= 3),
        ('Favorito viene de perder', lambda r: r['F']['racha'] < 0),
        ('Favorito viene de ganar por paliza (5+)', lambda r: r['F']['ult_mar'] is not None and r['F']['ult_mar'] >= 5),
        ('Rival viene de perder por paliza (5+)', lambda r: r['D']['ult_mar'] is not None and r['D']['ult_mar'] <= -5),
        ('Rival ganó el último cruce entre los dos', lambda r: r['F']['perdio_cruce'] is True),
        ('Rival viene mejor en los últimos 10 (2+ victorias más) — «La racha engaña» de NBA', lambda r: r['F']['g10'] is not None and r['D']['g10'] is not None and r['D']['g10'] - r['F']['g10'] >= 2),
        ('Rival viene mejor en los últimos 10 (4+ victorias más)', lambda r: r['F']['g10'] is not None and r['D']['g10'] is not None and r['D']['g10'] - r['F']['g10'] >= 4),
        ('Favorito con peor récord de temporada que el rival', lambda r: r['F']['pct'] is not None and r['D']['pct'] is not None and r['F']['pct'] < r['D']['pct']),
        ('Inicio de temporada (favorito con menos de 15 juegos)', lambda r: r['F']['nj'] < 15),
        ('Favorito grande (65%+)', lambda r: r['pf'] >= 0.65),
        ('Favorito corto (52-55%)', lambda r: r['pf'] < 0.55),
        ('Rival descansó y el favorito no (rival sin jugar ayer, favorito sí)', lambda r: r['F']['dias'] is not None and r['D']['dias'] is not None and r['F']['dias'] <= 1.6 and r['D']['dias'] > 1.6),
    ]

def main():
    J = S.espn(sys.argv[1] if len(sys.argv) > 1 else 'cierres-mlb.json')
    R = S.filas(S.contexto(J, 'mlb'), 'mlb')
    A = [r for r in R if r['s'] < 2025]; B = [r for r in R if r['s'] >= 2025]
    base = S.medir(R, lambda r: True)
    print('## MLB — %d juegos con precio de cierre (A 2023-24: %d · B 2025-26: %d). El favorito ganó %.1f%%, el precio decía %.1f%%\n' % (base['n'], len(A), len(B), base['w']/base['n']*100, base['e']/base['n']*100))
    print('| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |')
    print('|---|---|---|---|---|---|---|---|')
    todas = []
    for nom, f in reglas():
        t, a, b = S.medir(R, f), S.medir(A, f), S.medir(B, f)
        if not t or t['n'] < 100: continue
        dd = -t['d']; da = -a['d'] if a else 0; db = -b['d'] if b else 0
        pasa = abs(t['z']) >= 2.5 and a and b and da*db > 0 and abs(da) >= 1 and abs(db) >= 1
        p2 = math.erfc(abs(t['z'])/math.sqrt(2)); todas.append((p2, nom, pasa))
        print('| %s | %d | %.1f%% | %.1f%% | %+.1f pts | %+.1f | %+.1f / %+.1f | %s |' % (nom, t['n'], (t['n']-t['w'])/t['n']*100, (t['n']-t['e'])/t['n']*100, dd, -t['z'], da, db, 'SÍ' if pasa else 'no'))
    todas.sort(); m = len(todas)
    print('\nHolm sobre %d pruebas:' % m)
    for i, (p, nom, pasa) in enumerate(todas[:5]):
        print('- %s: p = %.4f, umbral Holm %.4f → %s' % (nom, p, 0.05/(m-i), 'pasa' if (p < 0.05/(m-i) and pasa) else 'no pasa'))

if __name__ == '__main__':
    main()
