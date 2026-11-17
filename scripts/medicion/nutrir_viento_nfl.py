# OVA · NFL: viento y techo contra el total del MODELO (no contra la línea). Noviembre 2026.
# Uso: python3 -I scripts/medicion/nutrir_viento_nfl.py <carpeta>
#   En la carpeta: clima_nfl.json (filas_clima_nfl.json de la rama resultados-huecos), dnfl.json (datos-nfl.json de datos-nhl-nfl)
#   y mod-nfl.json (node scripts/medicion/exportar_modelo.js nfl dnfl.json mod-nfl.json).
# Las filas de clima no traen id: se unen por temporada + margen + total + línea (se descartan las ambiguas).
# Ajuste: total real − total del modelo = base + techo·(techado) + mph·(viento al aire libre). Se ajusta con las otras temporadas
# y se prueba en la que quedó afuera. De aquí salen las constantes CLIMA de modelo-nfl.js. Resultado en docs/NUTRIR-MODELO-2026-11.md.
import json, math, sys, collections, numpy as np
D = (sys.argv[1] if len(sys.argv) > 1 else '.').rstrip('/') + '/'
mod = json.load(open(D + 'mod-nfl.json')); d = json.load(open(D + 'dnfl.json')); C = json.load(open(D + 'clima_nfl.json'))
idx = collections.defaultdict(list)
for y, t in d['temps'].items():
    for g in t['juegos']:
        l = g.get('linea') or {}
        if g.get('done') and str(g['id']) in mod: idx[(int(y), g['hs'] - g['as'], g['hs'] + g['as'], l.get('sp'), l.get('tot'))].append(g)
R = []
for c in C:
    v = idx.get((c['s'], c['mar'], c['tot'], c.get('sp'), c.get('l')), [])
    if len(v) == 1 and (c['ind'] or c.get('viento') is not None):
        R.append((c['s'], mod[str(v[0]['id'])]['pt'], c['tot'], c.get('l'), bool(c['ind']), 0.0 if c['ind'] else c['viento']))
T = np.array([r[0] for r in R]); pt = np.array([r[1] for r in R]); y = np.array([r[2] for r in R], float)
L = np.array([np.nan if r[3] is None else r[3] for r in R], float); ind = np.array([r[4] for r in R]); v = np.array([r[5] for r in R])
print('juegos', len(R), '| techados', int(ind.sum()), '| viento medio al aire libre %.1f mph' % v[~ind].mean())
X = np.c_[np.ones(len(y)), ind.astype(float), np.where(ind, 0, v)]
co = np.linalg.lstsq(X, y - pt, rcond=None)[0]; sesgo = float((y - pt).mean())
print('ajuste con todo: base %+.2f | techo %+.2f | por mph %+.3f | sesgo general del modelo %+.2f' % (co[0], co[1], co[2], sesgo))
print('constantes para modelo-nfl.js (sin el sesgo general): base %.2f, mph %.3f, techo %.2f' % (co[0] - sesgo, co[2], co[0] + co[1] - sesgo))
k = ~ind; A = np.c_[np.ones(k.sum()), v[k]]; c2 = np.linalg.lstsq(A, (y - pt)[k], rcond=None)[0]; res = (y - pt)[k] - A @ c2
print('solo al aire libre: %+.3f puntos por mph, z %+.1f' % (c2[1], c2[1] / math.sqrt(res.var(ddof=2) / ((v[k] - v[k].mean()) ** 2).sum())))
p0 = np.zeros(len(y)); p1 = np.zeros(len(y))
for t in np.unique(T):
    tr = T != t; q = T == t; c = np.linalg.lstsq(X[tr], (y - pt)[tr], rcond=None)[0]
    p0[q] = pt[q] + (y - pt)[tr].mean(); p1[q] = pt[q] + X[q] @ c
e0 = np.abs(y - p0); e1 = np.abs(y - p1); dd = e1 - e0
print('fuera de muestra · error medio del total: %.2f → %.2f (z %.1f)' % (e0.mean(), e1.mean(), dd.mean() / (dd.std(ddof=1) / math.sqrt(len(dd)))))
ok = ~np.isnan(L) & (y != L); a = ((p0 > L) == (y > L))[ok]; b = ((p1 > L) == (y > L))[ok]; dq = b.astype(float) - a.astype(float)
print('fuera de muestra · lado Más/Menos contra la línea: %.1f%% → %.1f%% (%d juegos, %+d aciertos, z %.1f)' % (100 * a.mean(), 100 * b.mean(), ok.sum(), dq.sum(), dq.mean() / (dq.std(ddof=1) / math.sqrt(len(dq)))))
print('por temporada (error):', '  '.join('%d: %.2f→%.2f' % (t, e0[T == t].mean(), e1[T == t].mean()) for t in np.unique(T)))
