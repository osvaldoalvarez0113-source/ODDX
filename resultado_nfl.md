
# NFL · medición contra el mercado

Generado: 2026-10-30T19:12:57.835Z

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
| 2026 | 108 | 108 | 108 | 108 |

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

Juegos de prueba (temporadas 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026): 1465.

## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)
Pérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.
|  | Juegos | Modelo | Mercado | dif ± 2·se | Veredicto |
|---|---|---|---|---|---|
| Log-loss | 1462 | 0.6423 | 0.5982 | 0.0441 ± 0.0110 | MERCADO MEJOR (z=8.0) |
| Brier | 1462 | 0.2250 | 0.2061 | 0.0189 ± 0.0049 | MERCADO MEJOR (z=7.8) |

Apertura contra cierre (459 juegos con las dos): log-loss de la línea de APERTURA 0.6061 contra 0.5947 del cierre (dif apertura−cierre 0.0114 ± 0.0131; positivo = el cierre es mejor, el mercado aprende durante el día).
Acierto del favorito: modelo 63.8% · mercado 68.1%. Local gana: 53.4% (el mercado le daba 54.2%).

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
| Modelo puro | 2 pts | 1191 | 431-760 | 36.2% | -18.4% ± 7.2 | -5.1 | -15.1% |
| Modelo puro | 3 pts | 1069 | 377-692 | 35.3% | -18.4% ± 7.8 | -4.7 | -15.1% |
| Modelo puro | 5 pts | 829 | 271-558 | 32.7% | -20.7% ± 9.0 | -4.6 | -17.5% |
| Modelo puro | 8 pts | 536 | 159-377 | 29.7% | -22.2% ± 11.5 | -3.9 | -19.0% |
| Mezcla λ=0.00 | 2 pts | 0 | — | — | — | — | +0.0% |
| Mezcla λ=0.00 | 3 pts | 0 | — | — | — | — | +0.0% |

Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.

## 5) Margen esperado: modelo contra la línea de handicap de cierre (1465 juegos)
RMSE en puntos: modelo 13.186 · mercado 12.659 · dif de cuadrados 13.632 ± 4.605 → MERCADO MEJOR (z=5.9)
Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = 1.040 ± 0.112 · **c = -0.079 ± 0.215** (0 = el modelo no agrega nada a la línea; 1 = vale todo).

## 6) Handicap (spread): apostar cuando la probabilidad del modelo de cubrir difiere de la del precio
| Modelo | Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Normal | 3 pts | 1094 | 513-569-12 | 47.4% | -8.9% ± 5.8 | -3.1 |
| Normal | 5 pts | 857 | 407-443-7 | 47.9% | -8.0% ± 6.5 | -2.5 |
| Normal | 8 pts | 569 | 268-297-4 | 47.4% | -8.9% ± 8.0 | -2.2 |
| Con números clave | 3 pts | 1099 | 515-573-11 | 47.3% | -9.2% ± 5.7 | -3.2 |
| Con números clave | 5 pts | 886 | 418-458-10 | 47.7% | -8.5% ± 6.4 | -2.7 |
| Con números clave | 8 pts | 589 | 282-303-4 | 48.2% | -7.6% ± 7.9 | -1.9 |

Por puntos de diferencia entre el modelo y la línea (modelo − línea):
| Diferencia | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 1 pts | 1081 | 507-562-12 | 47.4% | -9.3% ± 5.8 | -3.2 |
| 1.5 pts | 903 | 423-472-8 | 47.3% | -9.7% ± 6.3 | -3.1 |
| 2 pts | 746 | 356-384-6 | 48.1% | -8.1% ± 7.0 | -2.3 |
| 3 pts | 466 | 231-231-4 | 50.0% | -4.4% ± 8.8 | -1.0 |
| 4 pts | 299 | 151-145-3 | 51.0% | -2.5% ± 11.0 | -0.5 |

Referencia: el local cubre 48.9% de las veces (sin push).

## 7) Totales (1465 juegos)
RMSE: modelo 13.542 · línea 12.871 · dif de cuadrados 17.740 ± 5.421 → MERCADO MEJOR (z=6.5)
Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = 0.812 · **c = -0.284 ± 0.253**
λ del total (peso del modelo sobre la línea): **0.00**; mezcla fuera de muestra contra la línea sola: 0.0000 ± 0.0000 (negativo = mejora).
Apostar Más/Menos cuando el modelo difiere del precio:
| Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 3 pts | 1065 | 521-533-11 | 49.4% | -3.3% ± 6.2 | -1.1 |
| 5 pts | 832 | 416-409-7 | 50.4% | -0.8% ± 7.1 | -0.2 |
| 8 pts | 520 | 251-265-4 | 48.6% | -2.5% ± 9.4 | -0.5 |

Por puntos de diferencia:
| Regla | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Más si modelo ≥ línea + 1.5 | 580 | 275-300-5 | 47.8% | -6.5% ± 8.4 | -1.6 |
| Menos si modelo ≤ línea − 1.5 | 320 | 169-147-4 | 53.5% | +2.9% ± 10.9 | 0.5 |
| Más si modelo ≥ línea + 3 | 321 | 139-179-3 | 43.7% | -13.2% ± 11.5 | -2.3 |
| Menos si modelo ≤ línea − 3 | 154 | 83-70-1 | 54.2% | +5.3% ± 16.1 | 0.7 |
| Más si modelo ≥ línea + 4.5 | 158 | 67-90-1 | 42.7% | -12.1% ± 17.7 | -1.4 |
| Menos si modelo ≤ línea − 4.5 | 68 | 43-25 | 63.2% | +24.1% ± 24.8 | 1.9 |


## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)
**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)
| Tramo | Prob. de la casa (con margen) | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Muy perro (<35%) | 25.3% | 742 | 172-570 | 23.2% | -10.3% ± 12.8 | -1.6 |
| Perro (35–45%) | 41.9% | 537 | 212-325 | 39.5% | -5.7% ± 10.1 | -1.1 |
| Parejo (45–55%) | 52.1% | 366 | 183-183 | 50.0% | -4.3% ± 10.1 | -0.9 |
| Favorito (55–65%) | 62.1% | 537 | 325-212 | 60.5% | -2.5% ± 6.8 | -0.7 |
| Favorito fuerte (65–80%) | 75.1% | 542 | 399-143 | 73.6% | -2.1% ± 5.1 | -0.8 |
| Gran favorito (>80%) | 89.0% | 200 | 171-29 | 85.5% | -4.1% ± 5.6 | -1.5 |

**Local contra visitante**
| Grupo | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todos los locales · apostar al local | 1462 | 781-681 | 53.4% | -6.5% ± 5.5 | -2.4 |
| Todos los locales · apostar al visitante | 1462 | 681-781 | 46.6% | -4.1% ± 6.6 | -1.2 |
| Locales favoritos · apostar al local | 854 | 584-270 | 68.4% | -3.7% ± 4.7 | -1.6 |
| Locales favoritos · apostar al visitante | 854 | 270-584 | 31.6% | -6.7% ± 10.4 | -1.3 |
| Locales perros · apostar al local | 608 | 197-411 | 32.4% | -10.6% ± 11.4 | -1.9 |
| Locales perros · apostar al visitante | 608 | 411-197 | 67.6% | -0.3% ± 5.8 | -0.1 |

**Handicap por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Línea 0–3 · favorito | 497 | 252-237-8 | 51.5% | -2.4% ± 8.4 | -0.6 |
| Línea 0–3 · perro | 497 | 237-252-8 | 48.5% | -6.8% ± 8.6 | -1.6 |
| Línea 0–3 · local favorito | 261 | 124-132-5 | 48.4% | -8.1% ± 11.6 | -1.4 |
| Línea 0–3 · local perro | 236 | 105-128-3 | 45.1% | -13.0% ± 12.4 | -2.1 |
| Línea 3.5–6 · favorito | 424 | 197-224-3 | 46.8% | -9.9% ± 9.3 | -2.1 |
| Línea 3.5–6 · perro | 424 | 224-197-3 | 53.2% | +1.0% ± 9.2 | 0.2 |
| Línea 3.5–6 · local favorito | 248 | 109-138-1 | 44.1% | -14.7% ± 12.2 | -2.4 |
| Línea 3.5–6 · local perro | 176 | 86-88-2 | 49.4% | -6.1% ± 14.3 | -0.9 |
| Línea 6.5–10 · favorito | 371 | 175-191-5 | 47.8% | -8.7% ± 9.8 | -1.8 |
| Línea 6.5–10 · perro | 371 | 191-175-5 | 52.2% | -0.4% ± 9.9 | -0.1 |
| Línea 6.5–10 · local favorito | 229 | 114-112-3 | 50.4% | -3.8% ± 12.6 | -0.6 |
| Línea 6.5–10 · local perro | 142 | 79-61-2 | 56.4% | +7.7% ± 15.9 | 1.0 |
| Línea 10.5+ · favorito | 167 | 84-81-2 | 50.9% | -2.6% ± 14.8 | -0.4 |
| Línea 10.5+ · perro | 167 | 81-84-2 | 49.1% | -6.2% ± 14.7 | -0.8 |
| Línea 10.5+ · local favorito | 126 | 65-59-2 | 52.4% | +0.5% ± 17.0 | 0.1 |
| Línea 10.5+ · local perro | 41 | 22-19 | 53.7% | +2.2% ± 30.1 | 0.1 |

**Totales por línea** (8 líneas con 60+ juegos)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Total 41.5 · Más | 96 | 49-47 | 51.0% | -2.5% ± 19.6 | -0.3 |
| Total 41.5 · Menos | 96 | 47-49 | 49.0% | -7.3% ± 19.5 | -0.7 |
| Total 42.5 · Más | 60 | 32-28 | 53.3% | +1.2% ± 24.7 | 0.1 |
| Total 42.5 · Menos | 60 | 28-32 | 46.7% | -10.6% ± 25.0 | -0.9 |
| Total 43.5 · Más | 87 | 46-41 | 52.9% | +1.6% ± 20.7 | 0.2 |
| Total 43.5 · Menos | 87 | 41-46 | 47.1% | -9.8% ± 20.6 | -1.0 |
| Total 44.5 · Más | 106 | 58-48 | 54.7% | +4.8% ± 18.6 | 0.5 |
| Total 44.5 · Menos | 106 | 48-58 | 45.3% | -13.8% ± 18.5 | -1.5 |
| Total 45.5 · Más | 80 | 42-38 | 52.5% | +0.1% ± 21.4 | 0.0 |
| Total 45.5 · Menos | 80 | 38-42 | 47.5% | -9.0% ± 21.6 | -0.8 |
| Total 46.5 · Más | 78 | 40-38 | 51.3% | -2.5% ± 21.7 | -0.2 |
| Total 46.5 · Menos | 78 | 38-40 | 48.7% | +0.4% ± 28.2 | 0.0 |
| Total 47.5 · Más | 85 | 43-42 | 50.6% | -2.7% ± 21.0 | -0.3 |
| Total 47.5 · Menos | 85 | 42-43 | 49.4% | -6.9% ± 20.6 | -0.7 |
| Total 48.5 · Más | 72 | 38-34 | 52.8% | +0.7% ± 22.6 | 0.1 |
| Total 48.5 · Menos | 72 | 34-38 | 47.2% | -10.1% ± 22.6 | -0.9 |

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
| 2026 | Más | 44 | 24-20 | 54.5% | +4.1% ± 29.0 | 0.3 |
| 2019 | Menos | 191 | 99-92 | 51.8% | +3.5% ± 16.4 | 0.4 |
| 2020 | Menos | 191 | 98-90-3 | 52.1% | -0.3% ± 13.7 | -0.0 |
| 2021 | Menos | 208 | 107-98-3 | 52.2% | -0.5% ± 13.1 | -0.1 |
| 2022 | Menos | 207 | 112-92-3 | 54.9% | +4.8% ± 13.1 | 0.7 |
| 2023 | Menos | 208 | 110-95-3 | 53.7% | +2.5% ± 13.2 | 0.4 |
| 2024 | Menos | 208 | 91-117 | 43.8% | -16.5% ± 13.2 | -2.5 |
| 2025 | Menos | 208 | 97-111 | 46.6% | -10.8% ± 13.3 | -1.6 |
| 2026 | Menos | 44 | 20-24 | 45.5% | -12.6% ± 29.2 | -0.9 |


## 9) Lo propio de fútbol americano
Juegos de temporada regular: 2747. Empates: 11 (0.40%). Tiempo extra: 5.6%. Local gana: 54.2%.
Margen medio (local − visitante) 1.67 · desviación 14.15. Total medio 45.60 · desviación 13.88.
**Números clave**: frecuencia real de cada margen exacto contra lo que daría una curva normal con la misma desviación
| Margen | Real | Normal | Real / Normal |
|---|---|---|---|
| 0 | 0.40% | 2.82% | 0.14 |
| 1 | 4.55% | 5.58% | 0.81 |
| 2 | 4.77% | 5.54% | 0.86 |
| 3 | 14.56% | 5.48% | 2.66 |
| 4 | 4.70% | 5.38% | 0.87 |
| 5 | 4.44% | 5.26% | 0.84 |
| 6 | 6.88% | 5.12% | 1.34 |
| 7 | 8.59% | 4.96% | 1.73 |
| 8 | 4.44% | 4.78% | 0.93 |
| 9 | 1.75% | 4.59% | 0.38 |
| 10 | 4.77% | 4.38% | 1.09 |
| 11 | 2.04% | 4.16% | 0.49 |
| 12 | 1.97% | 3.93% | 0.50 |
| 13 | 1.93% | 3.69% | 0.52 |
| 14 | 5.02% | 3.46% | 1.45 |
| 15 | 1.75% | 3.22% | 0.54 |
| 16 | 2.26% | 2.98% | 0.76 |
| 17 | 3.57% | 2.75% | 1.30 |
| 20 | 2.11% | 2.09% | 1.01 |
| 21 | 2.18% | 1.89% | 1.16 |

Pesos clave medidos con todo el historial (para |margen| = 0..45): 0.35 0.77 0.86 2.79 0.85 0.86 1.36 1.77 1.01 0.43 1.12 0.52 0.54 0.59 1.44 0.56 0.75 1.31 0.89 0.55 0.92 1.05
**Push en líneas enteras** (lo que pasa cuando el margen cae justo en la línea)
| Línea | Juegos | Push real | Push que daría la normal | Push con números clave |
|---|---|---|---|---|
| 1 | 44 | 0.0% | 3.0% | 2.3% |
| 2 | 35 | 2.9% | 3.0% | 2.3% |
| 3 | 157 | 4.5% | 3.0% | 7.7% |
| 4 | 40 | 5.0% | 3.0% | 2.2% |
| 6 | 35 | 2.9% | 3.0% | 3.8% |
| 7 | 63 | 3.2% | 3.0% | 5.4% |
| 10 | 27 | 11.1% | 3.0% | 3.3% |

**Descanso**: margen real − margen de la línea (positivo = el local rinde más de lo que la línea dice)
| Situación | Juegos | Margen real − línea |
|---|---|---|
| Local viene de bye (11+ días) | 101 | -0.62 ± 1.95 |
| Visitante viene de bye | 104 | 0.69 ± 2.56 |

**Totales por situación**: total real − línea, y ROI de apostar siempre Más
| Situación | Juegos | Total real − línea | ROI de Más ± 2·se |
|---|---|---|---|
| Techo cerrado | 402 | 2.49 ± 1.30 | +5.6% ± 10.0 |
| Al aire libre | 1063 | 0.06 ± 0.78 | -8.4% ± 5.9 |
| Semanas 5–12 | 844 | -0.11 ± 0.84 | -8.2% ± 6.8 |
| Semanas 13–18 | 621 | 1.87 ± 1.09 | +0.5% ± 7.6 |
| Juego de noche (jueves/domingo/lunes, 8pm ET o después) | 299 | -0.85 ± 1.58 | -16.0% ± 10.9 |


## 10) Calibración de la probabilidad de que gane el local
| Tramo | Modelo: juegos | Dijo | Ganó | Mercado: juegos | Dijo | Ganó |
|---|---|---|---|---|---|---|
| 0.00–0.30 | 106 | 23.0% | 31.1% | 189 | 22.5% | 18.5% |
| 0.30–0.40 | 151 | 35.7% | 31.8% | 187 | 35.3% | 36.9% |
| 0.40–0.50 | 285 | 45.2% | 40.0% | 232 | 44.1% | 40.1% |
| 0.50–0.60 | 331 | 55.0% | 52.6% | 252 | 55.7% | 54.8% |
| 0.60–0.70 | 286 | 65.0% | 62.9% | 231 | 64.5% | 64.1% |
| 0.70–1.00 | 303 | 78.2% | 76.6% | 371 | 78.8% | 80.3% |


## 11) Resumen para decidir
```
Parámetros de la última temporada de prueba (2026): {"kM":0.11,"kT":0.04,"carry":0.5,"H":1.8,"Rs":2,"Bb":1.6,"Z":1}
λ ganador (peso del modelo sobre el mercado): medido 0.00 → recomendado en la app 0.05
λ total: 0.00 → 0.05
El mercado se equivoca 0.040 (relativo) menos que el modelo en el margen → ESC_SIG 0.96
```