
# NFL · medición contra el mercado

Generado: 2026-11-17T04:12:07.112Z

Ejemplo crudo de una línea (para depurar el lector):
```
{"$ref":"http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401127928/competitions/401127928/odds/2000?lang=en&region=us","provider":{"$ref":"http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/providers/2000?lang=en&region=us","id":"2000","name":"Bet 365","priority":0},"bettingOdds":{"homeTeam":{"$ref":"http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2019/teams/5?lang=en&region=us"},"awayTeam":{"$ref":"http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2019/teams/10?lang=en&region=us"},"teamOdds":{"liveSpreadAway":{"oddId":"38884777","value":"10/11","betSlipUrl":"https://www.bet365.com/dl/sportsbookredirect?affiliate=365_728986&bs=80157129-38884777~10/11&bet=1"},"liveWinningMarginAway":{"oddId":"263648832","value":"10/3","betSlipUrl":"https://www.bet365.com/dl/sportsbookredirect?affiliate=365_728986&bs=80165263-263648832~10/3&bet=1"},"liveTotalUnder":{"oddId":"38884782","value":"10/11","betSlipUrl":"https://www.bet365.com/dl/sportsbookredirect?affiliate=365_728986&bs=80157131-38884782~10/11&bet=1"},"liveTotalHandicap":{"oddId":"38884782","value":"44.0","betSlipUrl":"https://www.bet365.com/dl/sportsbookredirect?affiliate=365_728986&bs=80157131-38884782~44.0&bet=1"},"liveTotalOver":{"oddId":"38884781","value":"10/11","betSlipUrl":"https://www.bet365.com/dl/sportsbookredirect?affiliate=365_728986&bs=80157131-38884781~10/11&bet=1"},"preMatchMoneyLineHome":{"oddId":"38884780","value":"2/5","betSlipUrl":"http
```
## 0) Datos
| Temporada | Juegos (regular) | Con moneyline | Con línea de handicap | Con total |
|---|---|---|---|---|
| 2016 | 256 | 0 | 0 | 0 |
| 2017 | 256 | 0 | 0 | 0 |
| 2018 | 256 | 0 | 0 | 0 |
| 2019 | 256 | 256 | 256 | 256 |
| 2020 | 256 | 256 | 256 | 256 |
| 2021 | 272 | 272 | 272 | 272 |
| 2022 | 271 | 271 | 271 | 271 |
| 2023 | 272 | 272 | 272 | 272 |
| 2024 | 272 | 271 | 271 | 271 |
| 2025 | 272 | 272 | 272 | 272 |
| 2026 | 149 | 149 | 149 | 149 |

Playoffs en el archivo (se usan para ratings, no para las pruebas): 128.

## 1) Parámetros elegidos usando SOLO temporadas anteriores
| Temporada de prueba | Parámetros |
|---|---|
| 2019 | {"kM":0.08,"kT":0.04,"carry":0.8,"H":2.4,"Rs":0,"Bb":0.8,"Z":1} |
| 2020 | {"kM":0.08,"kT":0.04,"carry":0.5,"H":1.2,"Rs":0,"Bb":0,"Z":1} |
| 2021 | {"kM":0.08,"kT":0.04,"carry":0.5,"H":1.2,"Rs":0,"Bb":0,"Z":1} |
| 2022 | {"kM":0.05,"kT":0.02,"carry":0.8,"H":1.8,"Rs":2,"Bb":0,"Z":1} |
| 2023 | {"kM":0.08,"kT":0.04,"carry":0.5,"H":2.4,"Rs":2,"Bb":1.6,"Z":1} |
| 2024 | {"kM":0.05,"kT":0.04,"carry":0.5,"H":2.4,"Rs":0,"Bb":1.6,"Z":1} |
| 2025 | {"kM":0.08,"kT":0.04,"carry":0.65,"H":2.4,"Rs":2,"Bb":0,"Z":1} |
| 2026 | {"kM":0.11,"kT":0.04,"carry":0.5,"H":1.8,"Rs":2,"Bb":1.6,"Z":1} |

Juegos de prueba (temporadas 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026): 1506.

## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)
Pérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.
|  | Juegos | Modelo | Mercado | dif ± 2·se | Veredicto |
|---|---|---|---|---|---|
| Log-loss | 1503 | 0.6389 | 0.5952 | 0.0437 ± 0.0107 | MERCADO MEJOR (z=8.1) |
| Brier | 1503 | 0.2235 | 0.2047 | 0.0188 ± 0.0048 | MERCADO MEJOR (z=7.9) |

Apertura contra cierre (500 juegos con las dos): log-loss de la línea de APERTURA 0.6046 contra 0.5861 del cierre (dif apertura−cierre 0.0185 ± 0.0133; positivo = el cierre es mejor, el mercado aprende durante el día).
Acierto del favorito: modelo 64.3% · mercado 68.5%. Local gana: 53.2% (el mercado le daba 54.2%).

## 3) Mezcla mercado + modelo (en el espacio logit): predictor = mercado + λ·(modelo − mercado)
λ se ajusta con las demás temporadas y se prueba en la que quedó afuera.
| Temporada probada | λ ajustado con las otras | Juegos |
|---|---|---|
| 2019 | 0.00 | 191 |
| 2020 | 0.00 | 191 |
| 2021 | 0.00 | 207 |
| 2022 | 0.00 | 206 |
| 2023 | 0.00 | 208 |
| 2024 | 0.00 | 208 |
| 2025 | 0.00 | 208 |

λ con todos los juegos: **0.00**. Mezcla fuera de muestra contra el mercado solo: dif -0.00000 ± 0.00000 (negativo = la mezcla mejora) · no se distingue (z=-0.9).

## 4) Apostar al ganador cuando el modelo discrepa del mercado (1 unidad por juego, al precio real de la casa)
"A precio justo" = la misma apuesta si pagaran el precio sin margen (aísla cuánto cuesta el margen de la casa).
| Predictor | Diferencia mínima | Apuestas | G-P | % ganadas | ROI ± 2·se | z | ROI a precio justo |
|---|---|---|---|---|---|---|---|
| Modelo puro | 2 pts | 1219 | 441-778 | 36.2% | -19.0% ± 7.1 | -5.4 | -15.7% |
| Modelo puro | 3 pts | 1093 | 384-709 | 35.1% | -19.1% ± 7.6 | -5.0 | -15.8% |
| Modelo puro | 5 pts | 844 | 274-570 | 32.5% | -21.5% ± 8.8 | -4.9 | -18.3% |
| Modelo puro | 8 pts | 544 | 161-383 | 29.6% | -22.7% ± 11.3 | -4.0 | -19.5% |
| Mezcla λ=0.00 | 2 pts | 0 | — | — | — | — | +0.0% |
| Mezcla λ=0.00 | 3 pts | 0 | — | — | — | — | +0.0% |

Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.

## 5) Margen esperado: modelo contra la línea de handicap de cierre (1506 juegos)
RMSE en puntos: modelo 13.166 · mercado 12.655 · dif de cuadrados 13.206 ± 4.499 → MERCADO MEJOR (z=5.9)
Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = 1.065 ± 0.110 · **c = -0.053 ± 0.213** (0 = el modelo no agrega nada a la línea; 1 = vale todo).

## 6) Handicap (spread): apostar cuando la probabilidad del modelo de cubrir difiere de la del precio
| Modelo | Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Normal | 3 pts | 1120 | 530-578-12 | 47.8% | -8.1% ± 5.7 | -2.9 |
| Normal | 5 pts | 872 | 416-449-7 | 48.1% | -7.6% ± 6.5 | -2.3 |
| Normal | 8 pts | 574 | 271-299-4 | 47.5% | -8.7% ± 8.0 | -2.2 |
| Con números clave | 3 pts | 1124 | 526-587-11 | 47.3% | -9.4% ± 5.7 | -3.3 |
| Con números clave | 5 pts | 903 | 426-467-10 | 47.7% | -8.5% ± 6.3 | -2.7 |
| Con números clave | 8 pts | 597 | 286-307-4 | 48.2% | -7.5% ± 7.8 | -1.9 |

Por puntos de diferencia entre el modelo y la línea (modelo − línea):
| Diferencia | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 1 pts | 1108 | 523-573-12 | 47.7% | -8.8% ± 5.7 | -3.1 |
| 1.5 pts | 922 | 435-479-8 | 47.6% | -9.1% ± 6.3 | -2.9 |
| 2 pts | 755 | 361-388-6 | 48.2% | -7.9% ± 6.9 | -2.3 |
| 3 pts | 470 | 233-233-4 | 50.0% | -4.4% ± 8.8 | -1.0 |
| 4 pts | 300 | 152-145-3 | 51.2% | -2.2% ± 11.0 | -0.4 |

Referencia: el local cubre 48.6% de las veces (sin push).

## 7) Totales (1506 juegos)
RMSE: modelo 13.575 · línea 12.897 · dif de cuadrados 17.935 ± 5.318 → MERCADO MEJOR (z=6.7)
Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = 0.804 · **c = -0.302 ± 0.251**
λ del total (peso del modelo sobre la línea): **0.00**; mezcla fuera de muestra contra la línea sola: 0.0000 ± 0.0000 (negativo = mejora).
Apostar Más/Menos cuando el modelo difiere del precio:
| Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 3 pts | 1097 | 537-549-11 | 49.4% | -3.3% ± 6.1 | -1.1 |
| 5 pts | 857 | 429-421-7 | 50.5% | -0.8% ± 7.0 | -0.2 |
| 8 pts | 536 | 259-273-4 | 48.7% | -2.6% ± 9.3 | -0.6 |

Por puntos de diferencia:
| Regla | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Más si modelo ≥ línea + 1.5 | 593 | 282-306-5 | 48.0% | -6.3% ± 8.3 | -1.5 |
| Menos si modelo ≤ línea − 1.5 | 334 | 176-154-4 | 53.3% | +2.6% ± 10.6 | 0.5 |
| Más si modelo ≥ línea + 3 | 331 | 143-185-3 | 43.6% | -13.5% ± 11.3 | -2.4 |
| Menos si modelo ≤ línea − 3 | 160 | 87-72-1 | 54.7% | +6.1% ± 15.8 | 0.8 |
| Más si modelo ≥ línea + 4.5 | 166 | 71-94-1 | 43.0% | -11.8% ± 17.2 | -1.4 |
| Menos si modelo ≤ línea − 4.5 | 68 | 43-25 | 63.2% | +24.1% ± 24.8 | 1.9 |


## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)
**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)
| Tramo | Prob. de la casa (con margen) | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Muy perro (<35%) | 25.3% | 764 | 173-591 | 22.6% | -12.4% ± 12.5 | -2.0 |
| Perro (35–45%) | 41.9% | 551 | 216-335 | 39.2% | -6.3% ± 10.0 | -1.3 |
| Parejo (45–55%) | 52.1% | 376 | 188-188 | 50.0% | -4.3% ± 9.9 | -0.9 |
| Favorito (55–65%) | 62.1% | 551 | 335-216 | 60.8% | -2.1% ± 6.7 | -0.6 |
| Favorito fuerte (65–80%) | 75.1% | 561 | 417-144 | 74.3% | -1.1% ± 4.9 | -0.4 |
| Gran favorito (>80%) | 89.0% | 203 | 174-29 | 85.7% | -3.8% ± 5.6 | -1.4 |

**Local contra visitante**
| Grupo | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todos los locales · apostar al local | 1503 | 799-704 | 53.2% | -7.3% ± 5.4 | -2.7 |
| Todos los locales · apostar al visitante | 1503 | 704-799 | 46.8% | -4.1% ± 6.4 | -1.3 |
| Locales favoritos · apostar al local | 877 | 601-276 | 68.5% | -3.4% ± 4.6 | -1.5 |
| Locales favoritos · apostar al visitante | 877 | 276-601 | 31.5% | -7.5% ± 10.3 | -1.5 |
| Locales perros · apostar al local | 626 | 198-428 | 31.6% | -12.7% ± 11.1 | -2.3 |
| Locales perros · apostar al visitante | 626 | 428-198 | 68.4% | +0.7% ± 5.7 | 0.2 |

**Handicap por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Línea 0–3 · favorito | 510 | 261-241-8 | 52.0% | -1.5% ± 8.3 | -0.4 |
| Línea 0–3 · perro | 510 | 241-261-8 | 48.0% | -7.6% ± 8.5 | -1.8 |
| Línea 0–3 · local favorito | 269 | 128-136-5 | 48.5% | -7.9% ± 11.5 | -1.4 |
| Línea 0–3 · local perro | 241 | 105-133-3 | 44.1% | -14.8% ± 12.3 | -2.4 |
| Línea 3.5–6 · favorito | 437 | 205-229-3 | 47.2% | -9.0% ± 9.2 | -2.0 |
| Línea 3.5–6 · perro | 437 | 229-205-3 | 52.8% | +0.1% ± 9.0 | 0.0 |
| Línea 3.5–6 · local favorito | 255 | 113-141-1 | 44.5% | -14.0% ± 12.0 | -2.3 |
| Línea 3.5–6 · local perro | 182 | 88-92-2 | 48.9% | -7.1% ± 14.0 | -1.0 |
| Línea 6.5–10 · favorito | 383 | 184-194-5 | 48.7% | -7.1% ± 9.7 | -1.5 |
| Línea 6.5–10 · perro | 383 | 194-184-5 | 51.3% | -2.0% ± 9.7 | -0.4 |
| Línea 6.5–10 · local favorito | 235 | 118-114-3 | 50.9% | -3.0% ± 12.4 | -0.5 |
| Línea 6.5–10 · local perro | 148 | 80-66-2 | 54.8% | +4.6% ± 15.6 | 0.6 |
| Línea 10.5+ · favorito | 170 | 86-82-2 | 51.2% | -2.1% ± 14.6 | -0.3 |
| Línea 10.5+ · perro | 170 | 82-86-2 | 48.8% | -6.7% ± 14.6 | -0.9 |
| Línea 10.5+ · local favorito | 128 | 66-60-2 | 52.4% | +0.5% ± 16.9 | 0.1 |
| Línea 10.5+ · local perro | 42 | 22-20 | 52.4% | -0.2% ± 29.7 | -0.0 |

**Totales por línea** (9 líneas con 60+ juegos)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Total 40.5 · Más | 60 | 30-30 | 50.0% | +1.4% ± 28.7 | 0.1 |
| Total 40.5 · Menos | 60 | 30-30 | 50.0% | -3.7% ± 25.1 | -0.3 |
| Total 41.5 · Más | 98 | 51-47 | 52.0% | -0.6% ± 19.4 | -0.1 |
| Total 41.5 · Menos | 98 | 47-51 | 48.0% | -9.2% ± 19.3 | -0.9 |
| Total 42.5 · Más | 61 | 32-29 | 52.5% | -0.4% ± 24.5 | -0.0 |
| Total 42.5 · Menos | 61 | 29-32 | 47.5% | -9.0% ± 24.8 | -0.7 |
| Total 43.5 · Más | 89 | 47-42 | 52.8% | +1.5% ± 20.5 | 0.1 |
| Total 43.5 · Menos | 89 | 42-47 | 47.2% | -9.7% ± 20.4 | -1.0 |
| Total 44.5 · Más | 108 | 60-48 | 55.6% | +6.4% ± 18.4 | 0.7 |
| Total 44.5 · Menos | 108 | 48-60 | 44.4% | -15.4% ± 18.3 | -1.7 |
| Total 45.5 · Más | 85 | 45-40 | 52.9% | +0.9% ± 20.8 | 0.1 |
| Total 45.5 · Menos | 85 | 40-45 | 47.1% | -9.8% ± 20.9 | -0.9 |
| Total 46.5 · Más | 81 | 42-39 | 51.9% | -1.3% ± 21.3 | -0.1 |
| Total 46.5 · Menos | 81 | 39-42 | 48.1% | -1.0% ± 27.5 | -0.1 |
| Total 47.5 · Más | 89 | 45-44 | 50.6% | -2.7% ± 20.5 | -0.3 |
| Total 47.5 · Menos | 89 | 44-45 | 49.4% | -6.7% ± 20.2 | -0.7 |
| Total 48.5 · Más | 73 | 38-35 | 52.1% | -0.7% ± 22.5 | -0.1 |
| Total 48.5 · Menos | 73 | 35-38 | 47.9% | -8.6% ± 22.5 | -0.8 |

**Más y Menos, por temporada** (¿el mercado de totales se corrige con los años?)
| Temporada | Lado | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| 2019 | Más | 191 | 92-99 | 48.2% | -1.0% ± 16.3 | -0.1 |
| 2020 | Más | 191 | 90-98-3 | 47.9% | -8.4% ± 13.7 | -1.2 |
| 2021 | Más | 208 | 98-107-3 | 47.8% | -8.6% ± 13.2 | -1.3 |
| 2022 | Más | 207 | 92-112-3 | 45.1% | -13.7% ± 13.1 | -2.1 |
| 2023 | Más | 208 | 95-110-3 | 46.3% | -11.4% ± 13.1 | -1.7 |
| 2024 | Más | 208 | 117-91 | 56.3% | +7.7% ± 13.2 | 1.2 |
| 2025 | Más | 208 | 111-97 | 53.4% | +1.9% ± 13.2 | 0.3 |
| 2026 | Más | 85 | 46-39 | 54.1% | +3.2% ± 20.7 | 0.3 |
| 2019 | Menos | 191 | 99-92 | 51.8% | +3.5% ± 16.4 | 0.4 |
| 2020 | Menos | 191 | 98-90-3 | 52.1% | -0.3% ± 13.7 | -0.0 |
| 2021 | Menos | 208 | 107-98-3 | 52.2% | -0.5% ± 13.1 | -0.1 |
| 2022 | Menos | 207 | 112-92-3 | 54.9% | +4.8% ± 13.1 | 0.7 |
| 2023 | Menos | 208 | 110-95-3 | 53.7% | +2.5% ± 13.2 | 0.4 |
| 2024 | Menos | 208 | 91-117 | 43.8% | -16.5% ± 13.2 | -2.5 |
| 2025 | Menos | 208 | 97-111 | 46.6% | -10.8% ± 13.3 | -1.6 |
| 2026 | Menos | 85 | 39-46 | 45.9% | -11.8% ± 20.9 | -1.1 |


## 9) Lo propio de fútbol americano
Juegos de temporada regular: 2788. Empates: 11 (0.39%). Tiempo extra: 5.6%. Local gana: 54.1%.
Margen medio (local − visitante) 1.64 · desviación 14.18. Total medio 45.61 · desviación 13.89.
**Números clave**: frecuencia real de cada margen exacto contra lo que daría una curva normal con la misma desviación
| Margen | Real | Normal | Real / Normal |
|---|---|---|---|
| 0 | 0.39% | 2.81% | 0.14 |
| 1 | 4.52% | 5.57% | 0.81 |
| 2 | 4.73% | 5.53% | 0.86 |
| 3 | 14.53% | 5.47% | 2.66 |
| 4 | 4.73% | 5.37% | 0.88 |
| 5 | 4.48% | 5.26% | 0.85 |
| 6 | 6.81% | 5.12% | 1.33 |
| 7 | 8.54% | 4.96% | 1.72 |
| 8 | 4.45% | 4.78% | 0.93 |
| 9 | 1.72% | 4.58% | 0.38 |
| 10 | 4.73% | 4.37% | 1.08 |
| 11 | 2.01% | 4.15% | 0.48 |
| 12 | 1.94% | 3.93% | 0.49 |
| 13 | 1.90% | 3.69% | 0.51 |
| 14 | 4.99% | 3.46% | 1.44 |
| 15 | 1.76% | 3.22% | 0.55 |
| 16 | 2.26% | 2.98% | 0.76 |
| 17 | 3.69% | 2.75% | 1.34 |
| 20 | 2.15% | 2.10% | 1.03 |
| 21 | 2.22% | 1.89% | 1.17 |

Pesos clave medidos con todo el historial (para |margen| = 0..45): 0.35 0.76 0.86 2.78 0.86 0.87 1.35 1.76 1.01 0.42 1.11 0.51 0.53 0.58 1.42 0.57 0.75 1.36 0.89 0.56 0.94 1.07
**Push en líneas enteras** (lo que pasa cuando el margen cae justo en la línea)
| Línea | Juegos | Push real | Push que daría la normal | Push con números clave |
|---|---|---|---|---|
| 1 | 44 | 0.0% | 3.0% | 2.3% |
| 2 | 35 | 2.9% | 3.0% | 2.3% |
| 3 | 163 | 4.3% | 3.0% | 7.7% |
| 4 | 40 | 5.0% | 3.0% | 2.2% |
| 6 | 35 | 2.9% | 3.0% | 3.8% |
| 7 | 65 | 3.1% | 3.0% | 5.3% |
| 10 | 27 | 11.1% | 3.0% | 3.3% |

**Descanso**: margen real − margen de la línea (positivo = el local rinde más de lo que la línea dice)
| Situación | Juegos | Margen real − línea |
|---|---|---|
| Local viene de bye (11+ días) | 107 | -0.01 ± 1.98 |
| Visitante viene de bye | 109 | 0.50 ± 2.51 |

**Totales por situación**: total real − línea, y ROI de apostar siempre Más
| Situación | Juegos | Total real − línea | ROI de Más ± 2·se |
|---|---|---|---|
| Techo cerrado | 414 | 2.42 ± 1.28 | +5.3% ± 9.9 |
| Al aire libre | 1092 | 0.10 ± 0.77 | -8.0% ± 5.8 |
| Semanas 5–12 | 885 | -0.06 ± 0.83 | -7.7% ± 6.7 |
| Semanas 13–18 | 621 | 1.87 ± 1.09 | +0.5% ± 7.6 |
| Juego de noche (jueves/domingo/lunes, 8pm ET o después) | 306 | -0.83 ± 1.55 | -14.8% ± 10.8 |


## 10) Calibración de la probabilidad de que gane el local
| Tramo | Modelo: juegos | Dijo | Ganó | Mercado: juegos | Dijo | Ganó |
|---|---|---|---|---|---|---|
| 0.00–0.30 | 112 | 23.0% | 29.5% | 196 | 22.5% | 17.9% |
| 0.30–0.40 | 160 | 35.7% | 30.6% | 195 | 35.4% | 35.9% |
| 0.40–0.50 | 287 | 45.2% | 39.7% | 235 | 44.1% | 39.6% |
| 0.50–0.60 | 339 | 55.1% | 53.1% | 260 | 55.7% | 54.6% |
| 0.60–0.70 | 295 | 65.0% | 62.7% | 238 | 64.5% | 64.7% |
| 0.70–1.00 | 310 | 78.2% | 76.8% | 379 | 78.8% | 80.5% |


## 11) Resumen para decidir
```
Parámetros de la última temporada de prueba (2026): {"kM":0.11,"kT":0.04,"carry":0.5,"H":1.8,"Rs":2,"Bb":1.6,"Z":1}
λ ganador (peso del modelo sobre el mercado): medido 0.00 → recomendado en la app 0.05
λ total: 0.00 → 0.05
El mercado se equivoca 0.039 (relativo) menos que el modelo en el margen → ESC_SIG 0.961
```