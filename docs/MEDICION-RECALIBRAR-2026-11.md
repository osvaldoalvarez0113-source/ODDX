# Recalibrar el % del mercado: sesgo favorito–longshot (27-nov-2026)

Mejora diaria. Pista de `HISTORIA-LIGA-2026-11.md`: los favoritos grandes ganan algo más de lo que dice su % (NBA 85%+:
91.4% contra 88.3%; NFL 85%+: 93.7% contra 88.8%). Es el sesgo favorito–longshot de la literatura. Se probó corregir el %
de cierre con p' = sigmoide(a + b·logit(p)), y con un término de favorito local. No cambia a quién se escoge; haría el % más exacto
(Al gane, combinadas, simulador de suerte).

`python3 scripts/medicion/recalibrar.py`. **Regla fijada antes de correr:** entra en un deporte solo si, ajustando en una mitad
y probando en la otra (las dos direcciones), mejora el log-loss con t ≥ 2 en las dos y la pendiente sale del mismo lado.

## Veredicto: no pasa en ningún deporte (NBA, NHL, NFL, MLB)

- Con todo junto la pendiente sale un poco mayor que 1 (NBA 1.06, NHL 1.08, NFL 1.17, MLB 1.01): el sesgo existe, pero es chico.
- Fuera de muestra no mejora nada: la pendiente cambia de una mitad a la otra (NFL 1.33 contra 0.96) y la corrección queda en cero o
  empeora. El % de cierre ya es lo bastante exacto; la tabla de franjas de la historia de la liga sigue siendo la forma honesta de mostrarlo.

## Tablas


## NBA — 5757 juegos con precio de cierre (A antes de 2024: 3453 · B: 2304). El favorito ganó 68.5%, el precio decía 68.0%

| Corrección | Ajusta A → prueba B (milésimas, t) | Ajusta B → prueba A (milésimas, t) | Pendiente b en A / B |
|---|---|---|---|
| pendiente (a + b·logit) | -0.01 (t -0.0) | -0.63 (t -1.0) | 0.993 / 1.158 | no pasa
| pendiente + favorito local | +0.02 (t +0.1) | -0.56 (t -0.9) | 1.000 / 1.162 · local -0.058 / -0.037 | no pasa

Con todo junto: a = -0.020, b = 1.062. Por franja (precio decía → corregido → pasó):

| Franja | Juegos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 1735 | 55.3% | 55.1% | 55.8% |
| 60-70% | 1627 | 64.8% | 65.2% | 64.4% |
| 70-80% | 1309 | 74.6% | 75.5% | 76.1% |
| 80-90% | 954 | 84.5% | 85.6% | 84.4% |
| 90-100% | 132 | 91.7% | 92.7% | 96.2% |

## NHL — 5551 juegos con precio de cierre (A antes de 2024: 2614 · B: 2937). El favorito ganó 60.1%, el precio decía 59.8%

| Corrección | Ajusta A → prueba B (milésimas, t) | Ajusta B → prueba A (milésimas, t) | Pendiente b en A / B |
|---|---|---|---|
| pendiente (a + b·logit) | -0.37 (t -0.9) | -0.26 (t -0.6) | 1.005 / 1.142 | no pasa
| pendiente + favorito local | -0.64 (t -1.4) | -0.52 (t -1.1) | 1.016 / 1.125 · local -0.059 / +0.057 | no pasa

Con todo junto: a = -0.017, b = 1.077. Por franja (precio decía → corregido → pasó):

| Franja | Juegos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 3258 | 55.0% | 55.0% | 55.2% |
| 60-70% | 1736 | 64.2% | 64.8% | 63.7% |
| 70-80% | 539 | 73.5% | 74.7% | 77.4% |

## NFL — 1974 juegos con precio de cierre (A antes de 2023: 1037 · B: 937). El favorito ganó 67.8%, el precio decía 66.7%

| Corrección | Ajusta A → prueba B (milésimas, t) | Ajusta B → prueba A (milésimas, t) | Pendiente b en A / B |
|---|---|---|---|
| pendiente (a + b·logit) | -2.59 (t -1.2) | -1.16 (t -0.9) | 1.333 / 0.958 | no pasa
| pendiente + favorito local | -1.59 (t -0.6) | +0.00 (t +0.0) | 1.355 / 0.989 · local -0.209 / -0.194 | no pasa

Con todo junto: a = -0.053, b = 1.165. Por franja (precio decía → corregido → pasó):

| Franja | Juegos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 662 | 55.7% | 55.4% | 55.9% |
| 60-70% | 588 | 64.6% | 65.7% | 65.0% |
| 70-80% | 470 | 74.5% | 76.8% | 77.0% |
| 80-90% | 208 | 84.3% | 87.0% | 86.5% |
| 90-100% | 46 | 92.2% | 94.4% | 95.7% |

## MLB — 9675 juegos con precio de cierre (A antes de 2025: 4825 · B: 4850). El favorito ganó 57.2%, el precio decía 57.6%

| Corrección | Ajusta A → prueba B (milésimas, t) | Ajusta B → prueba A (milésimas, t) | Pendiente b en A / B |
|---|---|---|---|
| pendiente (a + b·logit) | -0.03 (t -0.2) | +0.03 (t +0.4) | 1.042 / 0.980 | no pasa
| pendiente + favorito local | -0.37 (t -1.2) | -0.27 (t -1.3) | 1.060 / 0.965 · local -0.068 / +0.057 | no pasa

Con todo junto: a = -0.019, b = 1.011. Por franja (precio decía → corregido → pasó):

| Franja | Juegos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 6958 | 54.7% | 54.3% | 54.2% |
| 60-70% | 2381 | 63.9% | 63.6% | 63.3% |
| 70-80% | 336 | 72.1% | 71.9% | 76.8% |

## Veredicto

- nba · pendiente (a + b·logit): no pasa
- nba · pendiente + favorito local: no pasa
- nhl · pendiente (a + b·logit): no pasa
- nhl · pendiente + favorito local: no pasa
- nfl · pendiente (a + b·logit): no pasa
- nfl · pendiente + favorito local: no pasa
- mlb · pendiente (a + b·logit): no pasa
- mlb · pendiente + favorito local: no pasa
