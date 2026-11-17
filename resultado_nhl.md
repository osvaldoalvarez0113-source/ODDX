
# NHL · medición contra el mercado

Generado: 2026-11-17T04:12:02.934Z

Ejemplo crudo de una línea (para depurar el lector):
```
{"$ref":"http://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/events/401458590/competitions/401458590/odds/1001?lang=en&region=us","provider":{"$ref":"http://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/providers/1001?lang=en&region=us","id":"1001","name":"Bet365","priority":0},"details":"NSH -115","overUnder":5.5,"spread":-1.5,"overOdds":-130,"underOdds":110,"awayTeamOdds":{"favorite":false,"underdog":true,"moneyLine":250,"spreadOdds":-150,"current":{"pointSpread":{"alternateDisplayValue":"+1.5","american":"+1.5"},"spread":{"alternateDisplayValue":"-150","american":"-150"},"moneyLine":{"alternateDisplayValue":"+250","american":"+250"}},"team":{"$ref":"http://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/2023/teams/18?lang=en&region=us"}},"homeTeamOdds":{"favorite":true,"underdog":false,"moneyLine":-115,"spreadOdds":130,"current":{"pointSpread":{"alternateDisplayValue":"-1.5","american":"-1.5"},"spread":{"alternateDisplayValue":"+130","american":"+130"},"moneyLine":{"alternateDisplayValue":"-115","american":"-115"}},"team":{"$ref":"http://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/2023/teams/27?lang=en&region=us"}},"moneylineWinner":false,"spreadWinner":false,"current":{"over":{"alternateDisplayValue":"-130","american":"-130"},"under":{"alternateDisplayValue":"+110","american":"+110"},"total":{"alternateDisplayValue":"5.5","american":"5.5"}}}
```
## 0) Datos
| Temporada | Juegos (regular) | Con moneyline | Con línea de handicap | Con total |
|---|---|---|---|---|
| 2021 | 1315 | 0 | 0 | 0 |
| 2022 | 1315 | 1312 | 1312 | 1312 |
| 2023 | 1315 | 1314 | 1314 | 1314 |
| 2024 | 1319 | 1319 | 1319 | 1319 |
| 2025 | 1312 | 1312 | 1312 | 1312 |
| 2026 | 323 | 323 | 323 | 323 |

Playoffs en el archivo (se usan para ratings, no para las pruebas): 433.

## 1) Parámetros elegidos usando SOLO temporadas anteriores
| Temporada de prueba | Parámetros |
|---|---|
| 2022 | {"kM":0.025,"kT":0.015,"carry":0.5,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2023 | {"kM":0.025,"kT":0.015,"carry":0.7,"H":0.08,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2024 | {"kM":0.008,"kT":0.008,"carry":0.85,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2025 | {"kM":0.008,"kT":0.008,"carry":0.85,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2026 | {"kM":0.015,"kT":0.008,"carry":0.5,"H":0.08,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |

Juegos de prueba (temporadas 2022, 2023, 2024, 2025, 2026): 4731.

## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)
Pérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.
|  | Juegos | Modelo | Mercado | dif ± 2·se | Veredicto |
|---|---|---|---|---|---|
| Log-loss | 4731 | 0.6691 | 0.6604 | 0.0087 ± 0.0029 | MERCADO MEJOR (z=5.9) |
| Brier | 4731 | 0.2384 | 0.2342 | 0.0042 ± 0.0014 | MERCADO MEJOR (z=6.0) |

Apertura contra cierre (3588 juegos con las dos): log-loss de la línea de APERTURA 0.6666 contra 0.6639 del cierre (dif apertura−cierre 0.0027 ± 0.0020; positivo = el cierre es mejor, el mercado aprende durante el día).
Acierto del favorito: modelo 58.3% · mercado 60.1%. Local gana: 53.5% (el mercado le daba 53.5%).

## 3) Mezcla mercado + modelo (en el espacio logit): predictor = mercado + λ·(modelo − mercado)
λ se ajusta con las demás temporadas y se prueba en la que quedó afuera.
| Temporada probada | λ ajustado con las otras | Juegos |
|---|---|---|
| 2022 | 0.00 | 1143 |
| 2023 | 0.00 | 1146 |
| 2024 | 0.00 | 1143 |
| 2025 | 0.00 | 1145 |
| 2026 | 0.00 | 154 |

λ con todos los juegos: **0.00**. Mezcla fuera de muestra contra el mercado solo: dif 0.00000 ± 0.00000 (negativo = la mezcla mejora) · no se distingue (z=0.7).

## 4) Apostar al ganador cuando el modelo discrepa del mercado (1 unidad por juego, al precio real de la casa)
"A precio justo" = la misma apuesta si pagaran el precio sin margen (aísla cuánto cuesta el margen de la casa).
| Predictor | Diferencia mínima | Apuestas | G-P | % ganadas | ROI ± 2·se | z | ROI a precio justo |
|---|---|---|---|---|---|---|---|
| Modelo puro | 2 pts | 3210 | 1399-1811 | 43.6% | -7.8% ± 3.9 | -4.0 | -3.9% |
| Modelo puro | 3 pts | 2508 | 1076-1432 | 42.9% | -7.6% ± 4.5 | -3.4 | -3.7% |
| Modelo puro | 5 pts | 1399 | 557-842 | 39.8% | -12.4% ± 6.0 | -4.1 | -8.7% |
| Modelo puro | 8 pts | 471 | 180-291 | 38.2% | -11.9% ± 10.7 | -2.2 | -8.2% |
| Mezcla λ=0.00 | 2 pts | 0 | — | — | — | — | +0.0% |
| Mezcla λ=0.00 | 3 pts | 0 | — | — | — | — | +0.0% |

Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.

## 5) Margen esperado: modelo contra el margen implícito en el moneyline y el total (4731 juegos)
RMSE en goles: modelo 2.540 · mercado 2.513 · dif de cuadrados 0.138 ± 0.045 → MERCADO MEJOR (z=6.1)
Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = 1.004 ± 0.109 · **c = -0.224 ± 0.255** (0 = el modelo no agrega nada a la línea; 1 = vale todo).

## 6) Línea de gol (±1.5): apostar cuando la probabilidad del modelo de cubrir difiere de la del precio
| Modelo | Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Poisson | 3 pts | 3322 | 1965-1357 | 59.2% | -5.5% ± 2.8 | -3.9 |
| Poisson | 5 pts | 2316 | 1369-947 | 59.1% | -5.1% ± 3.4 | -3.0 |
| Poisson | 8 pts | 1026 | 588-438 | 57.3% | -5.4% ± 5.2 | -2.1 |

Referencia: el local cubre 47.4% de las veces (sin push).

## 7) Totales (4731 juegos)
RMSE: modelo 2.301 · línea 2.315 · dif de cuadrados -0.067 ± 0.050 → MODELO MEJOR (z=2.7)
Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = 0.683 · **c = 0.458 ± 0.250**
λ del total (peso del modelo sobre la línea): **0.75**; mezcla fuera de muestra contra la línea sola: -0.0770 ± 0.0370 (negativo = mejora).
Apostar Más/Menos cuando el modelo difiere del precio:
| Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 3 pts | 2304 | 1160-1128-16 | 50.7% | -3.2% ± 4.0 | -1.6 |
| 5 pts | 1130 | 592-530-8 | 52.8% | +0.4% ± 5.7 | 0.1 |
| 8 pts | 332 | 192-136-4 | 58.5% | +11.2% ± 10.3 | 2.2 |

Por goles de diferencia:
| Regla | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Más si modelo ≥ línea + 0.25 | 1466 | 744-709-13 | 51.2% | -7.4% ± 4.7 | -3.2 |
| Menos si modelo ≤ línea − 0.25 | 1149 | 647-501-1 | 56.4% | +2.3% ± 5.3 | 0.9 |
| Más si modelo ≥ línea + 0.5 | 595 | 301-291-3 | 50.8% | -8.8% ± 7.3 | -2.4 |
| Menos si modelo ≤ línea − 0.5 | 322 | 201-121 | 62.4% | +11.6% ± 9.7 | 2.4 |
| Más si modelo ≥ línea + 0.75 | 132 | 69-63 | 52.3% | -6.8% ± 15.6 | -0.9 |
| Menos si modelo ≤ línea − 0.75 | 49 | 35-14 | 71.4% | +26.7% ± 23.2 | 2.3 |


## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)
**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)
| Tramo | Prob. de la casa (con margen) | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Muy perro (<35%) | 31.0% | 1057 | 286-771 | 27.1% | -13.5% ± 8.9 | -3.1 |
| Perro (35–45%) | 42.3% | 2375 | 999-1376 | 42.1% | -0.4% ± 4.8 | -0.2 |
| Parejo (45–55%) | 52.3% | 2598 | 1299-1299 | 50.0% | -4.5% ± 3.8 | -2.4 |
| Favorito (55–65%) | 61.7% | 2375 | 1376-999 | 57.9% | -6.1% ± 3.3 | -3.7 |
| Favorito fuerte (65–80%) | 72.9% | 1040 | 755-285 | 72.6% | -0.5% ± 3.8 | -0.3 |
| Gran favorito (>80%) | 84.8% | 17 | 16-1 | 94.1% | +10.9% ± 13.9 | 1.6 |

**Local contra visitante**
| Grupo | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todos los locales · apostar al local | 4731 | 2532-2199 | 53.5% | -4.1% ± 2.8 | -3.0 |
| Todos los locales · apostar al visitante | 4731 | 2199-2532 | 46.5% | -4.7% ± 3.1 | -3.0 |
| Locales favoritos · apostar al local | 2993 | 1818-1175 | 60.7% | -4.0% ± 2.9 | -2.8 |
| Locales favoritos · apostar al visitante | 2993 | 1175-1818 | 39.3% | -5.5% ± 4.4 | -2.5 |
| Locales perros · apostar al local | 1738 | 714-1024 | 41.1% | -4.2% ± 5.6 | -1.5 |
| Locales perros · apostar al visitante | 1738 | 1024-714 | 58.9% | -3.3% ± 3.9 | -1.7 |

**Línea de gol por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todas · favorito | 4731 | 1795-2936 | 37.9% | -5.9% ± 3.6 | -3.3 |
| Todas · perro | 4731 | 2936-1795 | 62.1% | -3.6% ± 2.2 | -3.2 |
| Todas · local favorito | 2968 | 1137-1831 | 38.3% | -7.1% ± 4.4 | -3.2 |
| Todas · local perro | 1763 | 1105-658 | 62.7% | -4.7% ± 3.6 | -2.7 |

**Totales por línea** (3 líneas con 60+ juegos)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Total 5.5 · Más | 1618 | 833-785 | 51.5% | -5.4% ± 4.6 | -2.4 |
| Total 5.5 · Menos | 1618 | 785-833 | 48.5% | -2.5% ± 5.0 | -1.0 |
| Total 6 · Más | 227 | 90-107-30 | 45.7% | -11.4% ± 11.8 | -1.9 |
| Total 6 · Menos | 227 | 107-90-30 | 54.3% | +4.0% ± 11.9 | 0.7 |
| Total 6.5 · Más | 2861 | 1318-1543 | 46.1% | -10.8% ± 3.6 | -5.9 |
| Total 6.5 · Menos | 2861 | 1543-1318 | 53.9% | +1.6% ± 3.5 | 0.9 |

**Más y Menos, por temporada** (¿el mercado de totales se corrige con los años?)
| Temporada | Lado | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| 2022 | Más | 1143 | 541-569-33 | 48.7% | -8.3% ± 5.5 | -3.0 |
| 2023 | Más | 1146 | 544-602 | 47.5% | -9.5% ± 5.7 | -3.3 |
| 2024 | Más | 1143 | 529-614 | 46.3% | -11.4% ± 5.7 | -4.0 |
| 2025 | Más | 1145 | 556-589 | 48.6% | -7.9% ± 5.6 | -2.8 |
| 2026 | Más | 154 | 78-76 | 50.6% | -4.1% ± 15.4 | -0.5 |
| 2022 | Menos | 1143 | 569-541-33 | 51.3% | -1.4% ± 5.6 | -0.5 |
| 2023 | Menos | 1146 | 602-544 | 52.5% | +1.5% ± 5.7 | 0.5 |
| 2024 | Menos | 1143 | 614-529 | 53.7% | +2.9% ± 5.7 | 1.0 |
| 2025 | Menos | 1145 | 589-556 | 51.4% | -0.9% ± 5.7 | -0.3 |
| 2026 | Menos | 154 | 76-78 | 49.4% | -4.7% ± 15.7 | -0.6 |


## 9) Lo propio de hockey
Juegos de temporada regular: 6899. Llegan a tiempo extra: **22.3%** (se deciden en OT 67.3% · en shootout 32.7%). El modelo supone 67% de goles en OT entre los empates a 60 min.
Local gana (incluye OT/SO): 53.7% · en 60 min: 41.9% · quien gana en OT/SO es el local el 52.9% de las veces.
Goles por juego: media 6.179 · varianza 5.412 (Poisson puro daría varianza ≈ media; razón 0.876).
**Back-to-back**: 1004 juegos en los que solo uno jugó ayer. Margen real − margen del mercado, por cada back-to-back del visitante (positivo = el local rinde más de lo que el mercado dice): 0.139 ± 0.182 goles (el modelo usa R=0.25). Cero = el mercado ya lo tiene en el precio.
| Regla | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Visitante en back-to-back (local descansado) · apostar al descansado | 751 | 448-303 | 59.7% | +0.6% ± 6.4 | 0.2 |
| Local en back-to-back (visitante descansado) · apostar al descansado | 253 | 136-117 | 53.8% | +4.5% ± 13.3 | 0.7 |

Empates a 60 minutos (llegan a OT): modelo 15.9% · real 22.5%. Local gana en OT/SO: real 52.9% · modelo 51.2%.
Calibración de P(Más 5.5) del modelo:
| Tramo del modelo | Juegos | Modelo dijo | Real |
|---|---|---|---|
| 0.00–0.40 | 5 | 38.8% | 40.0% |
| 0.40–0.46 | 92 | 44.2% | 54.3% |
| 0.46–0.52 | 558 | 49.5% | 52.3% |
| 0.52–0.58 | 790 | 54.6% | 50.8% |
| 0.58–1.00 | 173 | 59.8% | 50.9% |

Calibración de P(Más 6.5) del modelo:
| Tramo del modelo | Juegos | Modelo dijo | Real |
|---|---|---|---|
| 0.00–0.40 | 229 | 37.8% | 36.2% |
| 0.40–0.46 | 1067 | 43.4% | 45.3% |
| 0.46–0.52 | 1182 | 48.6% | 45.9% |
| 0.52–0.58 | 350 | 54.1% | 53.4% |
| 0.58–1.00 | 33 | 60.0% | 66.7% |

Línea de 6 (con push): el modelo daba Más 43.1% · real 39.6% · push real 13.2% (modelo 13.6%).

## 10) Calibración de la probabilidad de que gane el local
| Tramo | Modelo: juegos | Dijo | Ganó | Mercado: juegos | Dijo | Ganó |
|---|---|---|---|---|---|---|
| 0.00–0.30 | 97 | 26.2% | 33.0% | 95 | 27.1% | 29.5% |
| 0.30–0.40 | 433 | 36.0% | 38.1% | 483 | 35.8% | 36.9% |
| 0.40–0.50 | 1257 | 45.7% | 46.4% | 1160 | 44.9% | 43.8% |
| 0.50–0.60 | 1677 | 54.8% | 53.5% | 1605 | 55.0% | 54.4% |
| 0.60–0.70 | 996 | 64.0% | 64.6% | 994 | 64.2% | 63.5% |
| 0.70–1.00 | 271 | 74.5% | 77.9% | 394 | 74.1% | 79.7% |


## 11) Resumen para decidir
```
Parámetros de la última temporada de prueba (2026): {"kM":0.015,"kT":0.008,"carry":0.5,"H":0.08,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5}
λ ganador (peso del modelo sobre el mercado): medido 0.00 → recomendado en la app 0.05
λ total: 0.75 → 0.5
El mercado se equivoca 0.011 (relativo) menos que el modelo en el margen → ESC_SIG 0.989
```