
# NHL · medición contra el mercado

Generado: 2026-10-30T19:12:53.270Z

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
| 2026 | 205 | 205 | 205 | 205 |

Playoffs en el archivo (se usan para ratings, no para las pruebas): 433.

## 1) Parámetros elegidos usando SOLO temporadas anteriores
| Temporada de prueba | Parámetros |
|---|---|
| 2022 | {"kM":0.025,"kT":0.015,"carry":0.5,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2023 | {"kM":0.025,"kT":0.015,"carry":0.7,"H":0.08,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2024 | {"kM":0.008,"kT":0.008,"carry":0.85,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |
| 2025 | {"kM":0.008,"kT":0.008,"carry":0.85,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5} |

Juegos de prueba (temporadas 2022, 2023, 2024, 2025): 4577.

## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)
Pérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.
|  | Juegos | Modelo | Mercado | dif ± 2·se | Veredicto |
|---|---|---|---|---|---|
| Log-loss | 4577 | 0.6695 | 0.6609 | 0.0086 ± 0.0030 | MERCADO MEJOR (z=5.7) |
| Brier | 4577 | 0.2386 | 0.2345 | 0.0041 ± 0.0014 | MERCADO MEJOR (z=5.7) |

Apertura contra cierre (3434 juegos con las dos): log-loss de la línea de APERTURA 0.6670 contra 0.6647 del cierre (dif apertura−cierre 0.0022 ± 0.0021; positivo = el cierre es mejor, el mercado aprende durante el día).
Acierto del favorito: modelo 58.2% · mercado 60.0%. Local gana: 53.7% (el mercado le daba 53.6%).

## 3) Mezcla mercado + modelo (en el espacio logit): predictor = mercado + λ·(modelo − mercado)
λ se ajusta con las demás temporadas y se prueba en la que quedó afuera.
| Temporada probada | λ ajustado con las otras | Juegos |
|---|---|---|
| 2022 | 0.00 | 1143 |
| 2023 | 0.00 | 1146 |
| 2024 | 0.00 | 1143 |
| 2025 | 0.00 | 1145 |

λ con todos los juegos: **0.00**. Mezcla fuera de muestra contra el mercado solo: dif 0.00000 ± 0.00000 (negativo = la mezcla mejora) · no se distingue (z=0.6).

## 4) Apostar al ganador cuando el modelo discrepa del mercado (1 unidad por juego, al precio real de la casa)
"A precio justo" = la misma apuesta si pagaran el precio sin margen (aísla cuánto cuesta el margen de la casa).
| Predictor | Diferencia mínima | Apuestas | G-P | % ganadas | ROI ± 2·se | z | ROI a precio justo |
|---|---|---|---|---|---|---|---|
| Modelo puro | 2 pts | 3095 | 1356-1739 | 43.8% | -7.6% ± 4.0 | -3.8 | -3.7% |
| Modelo puro | 3 pts | 2426 | 1048-1378 | 43.2% | -7.3% ± 4.6 | -3.2 | -3.4% |
| Modelo puro | 5 pts | 1351 | 542-809 | 40.1% | -12.1% ± 6.1 | -4.0 | -8.4% |
| Modelo puro | 8 pts | 460 | 177-283 | 38.5% | -11.3% ± 10.8 | -2.1 | -7.7% |
| Mezcla λ=0.00 | 2 pts | 0 | — | — | — | — | +0.0% |
| Mezcla λ=0.00 | 3 pts | 0 | — | — | — | — | +0.0% |

Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.

## 5) Margen esperado: modelo contra el margen implícito en el moneyline y el total (4577 juegos)
RMSE en goles: modelo 2.543 · mercado 2.516 · dif de cuadrados 0.134 ± 0.046 → MERCADO MEJOR (z=5.9)
Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = 0.991 ± 0.111 · **c = -0.213 ± 0.258** (0 = el modelo no agrega nada a la línea; 1 = vale todo).

## 6) Línea de gol (±1.5): apostar cuando la probabilidad del modelo de cubrir difiere de la del precio
| Modelo | Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Poisson | 3 pts | 3192 | 1889-1303 | 59.2% | -5.3% ± 2.9 | -3.7 |
| Poisson | 5 pts | 2227 | 1319-908 | 59.2% | -4.9% ± 3.4 | -2.9 |
| Poisson | 8 pts | 983 | 567-416 | 57.7% | -4.9% ± 5.3 | -1.8 |

Referencia: el local cubre 47.4% de las veces (sin push).

## 7) Totales (4577 juegos)
RMSE: modelo 2.298 · línea 2.312 · dif de cuadrados -0.065 ± 0.051 → MODELO MEJOR (z=2.6)
Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = 0.692 · **c = 0.460 ± 0.252**
λ del total (peso del modelo sobre la línea): **0.70**; mezcla fuera de muestra contra la línea sola: -0.0752 ± 0.0368 (negativo = mejora).
Apostar Más/Menos cuando el modelo difiere del precio:
| Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 3 pts | 2233 | 1130-1087-16 | 51.0% | -2.7% ± 4.0 | -1.3 |
| 5 pts | 1105 | 584-513-8 | 53.2% | +1.2% ± 5.7 | 0.4 |
| 8 pts | 330 | 192-134-4 | 58.9% | +11.8% ± 10.3 | 2.3 |

Por goles de diferencia:
| Regla | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Más si modelo ≥ línea + 0.25 | 1424 | 719-692-13 | 51.0% | -7.8% ± 4.8 | -3.3 |
| Menos si modelo ≤ línea − 0.25 | 1128 | 641-486-1 | 56.9% | +3.3% ± 5.4 | 1.2 |
| Más si modelo ≥ línea + 0.5 | 560 | 282-275-3 | 50.6% | -9.2% ± 7.6 | -2.4 |
| Menos si modelo ≤ línea − 0.5 | 322 | 201-121 | 62.4% | +11.6% ± 9.7 | 2.4 |
| Más si modelo ≥ línea + 0.75 | 124 | 67-57 | 54.0% | -3.6% ± 16.1 | -0.5 |
| Menos si modelo ≤ línea − 0.75 | 49 | 35-14 | 71.4% | +26.7% ± 23.2 | 2.3 |


## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)
**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)
| Tramo | Prob. de la casa (con margen) | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Muy perro (<35%) | 31.0% | 1032 | 281-751 | 27.2% | -13.0% ± 9.0 | -2.9 |
| Perro (35–45%) | 42.3% | 2299 | 975-1324 | 42.4% | +0.4% ± 4.9 | 0.2 |
| Parejo (45–55%) | 52.3% | 2492 | 1246-1246 | 50.0% | -4.5% ± 3.8 | -2.4 |
| Favorito (55–65%) | 61.7% | 2299 | 1324-975 | 57.6% | -6.6% ± 3.4 | -4.0 |
| Favorito fuerte (65–80%) | 72.9% | 1015 | 735-280 | 72.4% | -0.7% ± 3.9 | -0.4 |
| Gran favorito (>80%) | 84.8% | 17 | 16-1 | 94.1% | +10.9% ± 13.9 | 1.6 |

**Local contra visitante**
| Grupo | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todos los locales · apostar al local | 4577 | 2460-2117 | 53.7% | -3.6% ± 2.8 | -2.6 |
| Todos los locales · apostar al visitante | 4577 | 2117-2460 | 46.3% | -5.0% ± 3.2 | -3.1 |
| Locales favoritos · apostar al local | 2905 | 1768-1137 | 60.9% | -3.8% ± 2.9 | -2.6 |
| Locales favoritos · apostar al visitante | 2905 | 1137-1768 | 39.1% | -5.6% ± 4.5 | -2.5 |
| Locales perros · apostar al local | 1672 | 692-980 | 41.4% | -3.4% ± 5.8 | -1.2 |
| Locales perros · apostar al visitante | 1672 | 980-692 | 58.6% | -3.9% ± 4.0 | -2.0 |

**Línea de gol por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todas · favorito | 4577 | 1733-2844 | 37.9% | -6.1% ± 3.6 | -3.4 |
| Todas · perro | 4577 | 2844-1733 | 62.1% | -3.4% ± 2.3 | -3.0 |
| Todas · local favorito | 2883 | 1105-1778 | 38.3% | -6.9% ± 4.5 | -3.1 |
| Todas · local perro | 1694 | 1066-628 | 62.9% | -4.3% ± 3.6 | -2.4 |

**Totales por línea** (3 líneas con 60+ juegos)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Total 5.5 · Más | 1578 | 810-768 | 51.3% | -5.6% ± 4.6 | -2.4 |
| Total 5.5 · Menos | 1578 | 768-810 | 48.7% | -2.3% ± 5.1 | -0.9 |
| Total 6 · Más | 227 | 90-107-30 | 45.7% | -11.4% ± 11.8 | -1.9 |
| Total 6 · Menos | 227 | 107-90-30 | 54.3% | +4.0% ± 11.9 | 0.7 |
| Total 6.5 · Más | 2747 | 1263-1484 | 46.0% | -10.9% ± 3.7 | -5.9 |
| Total 6.5 · Menos | 2747 | 1484-1263 | 54.0% | +1.8% ± 3.6 | 1.0 |

**Más y Menos, por temporada** (¿el mercado de totales se corrige con los años?)
| Temporada | Lado | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| 2022 | Más | 1143 | 541-569-33 | 48.7% | -8.3% ± 5.5 | -3.0 |
| 2023 | Más | 1146 | 544-602 | 47.5% | -9.5% ± 5.7 | -3.3 |
| 2024 | Más | 1143 | 529-614 | 46.3% | -11.4% ± 5.7 | -4.0 |
| 2025 | Más | 1145 | 556-589 | 48.6% | -7.9% ± 5.6 | -2.8 |
| 2022 | Menos | 1143 | 569-541-33 | 51.3% | -1.4% ± 5.6 | -0.5 |
| 2023 | Menos | 1146 | 602-544 | 52.5% | +1.5% ± 5.7 | 0.5 |
| 2024 | Menos | 1143 | 614-529 | 53.7% | +2.9% ± 5.7 | 1.0 |
| 2025 | Menos | 1145 | 589-556 | 51.4% | -0.9% ± 5.7 | -0.3 |


## 9) Lo propio de hockey
Juegos de temporada regular: 6781. Llegan a tiempo extra: **22.3%** (se deciden en OT 67.4% · en shootout 32.6%). El modelo supone 67% de goles en OT entre los empates a 60 min.
Local gana (incluye OT/SO): 53.8% · en 60 min: 42.1% · quien gana en OT/SO es el local el 52.8% de las veces.
Goles por juego: media 6.178 · varianza 5.417 (Poisson puro daría varianza ≈ media; razón 0.877).
**Back-to-back**: 976 juegos en los que solo uno jugó ayer. Margen real − margen del mercado, por cada back-to-back del visitante (positivo = el local rinde más de lo que el mercado dice): 0.138 ± 0.184 goles (el modelo usa R=0.25). Cero = el mercado ya lo tiene en el precio.
| Regla | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Visitante en back-to-back (local descansado) · apostar al descansado | 728 | 433-295 | 59.5% | +0.3% ± 6.5 | 0.1 |
| Local en back-to-back (visitante descansado) · apostar al descansado | 248 | 133-115 | 53.6% | +4.4% ± 13.5 | 0.7 |

Empates a 60 minutos (llegan a OT): modelo 15.9% · real 22.6%. Local gana en OT/SO: real 52.8% · modelo 51.2%.
Calibración de P(Más 5.5) del modelo:
| Tramo del modelo | Juegos | Modelo dijo | Real |
|---|---|---|---|
| 0.00–0.40 | 5 | 38.8% | 40.0% |
| 0.40–0.46 | 92 | 44.2% | 54.3% |
| 0.46–0.52 | 558 | 49.5% | 52.3% |
| 0.52–0.58 | 762 | 54.6% | 50.1% |
| 0.58–1.00 | 161 | 59.8% | 52.2% |

Calibración de P(Más 6.5) del modelo:
| Tramo del modelo | Juegos | Modelo dijo | Real |
|---|---|---|---|
| 0.00–0.40 | 229 | 37.8% | 36.2% |
| 0.40–0.46 | 1037 | 43.4% | 45.0% |
| 0.46–0.52 | 1106 | 48.7% | 45.8% |
| 0.52–0.58 | 342 | 54.1% | 53.8% |
| 0.58–1.00 | 33 | 60.0% | 66.7% |

Línea de 6 (con push): el modelo daba Más 43.1% · real 39.6% · push real 13.2% (modelo 13.6%).

## 10) Calibración de la probabilidad de que gane el local
| Tramo | Modelo: juegos | Dijo | Ganó | Mercado: juegos | Dijo | Ganó |
|---|---|---|---|---|---|---|
| 0.00–0.30 | 97 | 26.2% | 33.0% | 94 | 27.1% | 29.8% |
| 0.30–0.40 | 425 | 35.9% | 38.1% | 468 | 35.8% | 37.0% |
| 0.40–0.50 | 1201 | 45.7% | 47.0% | 1110 | 44.9% | 44.2% |
| 0.50–0.60 | 1605 | 54.8% | 53.8% | 1556 | 55.0% | 54.6% |
| 0.60–0.70 | 980 | 64.0% | 64.1% | 965 | 64.2% | 63.6% |
| 0.70–1.00 | 269 | 74.5% | 78.1% | 384 | 74.1% | 79.4% |


## 11) Resumen para decidir
```
Parámetros de la última temporada de prueba (2025): {"kM":0.008,"kT":0.008,"carry":0.85,"H":0.2,"R":0.25,"Q":0.25,"KT":0.023,"Z":1,"kS":0.06,"Ws":0.1,"Hs":1.5,"E":1.5}
λ ganador (peso del modelo sobre el mercado): medido 0.00 → recomendado en la app 0.05
λ total: 0.70 → 0.5
El mercado se equivoca 0.010 (relativo) menos que el modelo en el margen → ESC_SIG 0.99
```