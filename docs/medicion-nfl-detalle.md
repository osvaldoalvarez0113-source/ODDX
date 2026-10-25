
# NFL · medición contra el mercado

Generado: 2026-10-25T18:54:54.805Z

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
| 2026 | 95 | 95 | 95 | 95 |

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

Juegos de prueba (temporadas 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026): 1452.

## 2) Ganador: modelo contra el mercado (moneyline de cierre sin margen)
Pérdida logarítmica (más baja = mejor). "dif" = modelo − mercado: positivo = el mercado acierta más.
|  | Juegos | Modelo | Mercado | dif ± 2·se | Veredicto |
|---|---|---|---|---|---|
| Log-loss | 1449 | 0.6419 | 0.5976 | 0.0442 ± 0.0111 | MERCADO MEJOR (z=8.0) |
| Brier | 1449 | 0.2248 | 0.2059 | 0.0189 ± 0.0049 | MERCADO MEJOR (z=7.7) |

Apertura contra cierre (446 juegos con las dos): log-loss de la línea de APERTURA 0.6036 contra 0.5928 del cierre (dif apertura−cierre 0.0108 ± 0.0127; positivo = el cierre es mejor, el mercado aprende durante el día).
Acierto del favorito: modelo 63.9% · mercado 68.0%. Local gana: 53.6% (el mercado le daba 54.2%).

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
| Modelo puro | 2 pts | 1180 | 425-755 | 36.0% | -18.8% ± 7.2 | -5.2 | -15.5% |
| Modelo puro | 3 pts | 1060 | 373-687 | 35.2% | -18.7% ± 7.8 | -4.8 | -15.4% |
| Modelo puro | 5 pts | 822 | 269-553 | 32.7% | -21.0% ± 8.9 | -4.7 | -17.8% |
| Modelo puro | 8 pts | 532 | 158-374 | 29.7% | -22.6% ± 11.4 | -3.9 | -19.3% |
| Mezcla λ=0.00 | 2 pts | 0 | — | — | — | — | +0.0% |
| Mezcla λ=0.00 | 3 pts | 0 | — | — | — | — | +0.0% |

Para separar un ROI real de la suerte hacen falta miles de apuestas: con ~1,000 apuestas el margen de error (±2·se) ronda ±6–7 puntos de ROI.

## 5) Margen esperado: modelo contra la línea de handicap de cierre (1452 juegos)
RMSE en puntos: modelo 13.168 · mercado 12.649 · dif de cuadrados 13.395 ± 4.623 → MERCADO MEJOR (z=5.8)
Regresión: margen real = a + b·(mercado) + c·(modelo − mercado):  b = 1.041 ± 0.112 · **c = -0.068 ± 0.215** (0 = el modelo no agrega nada a la línea; 1 = vale todo).

## 6) Handicap (spread): apostar cuando la probabilidad del modelo de cubrir difiere de la del precio
| Modelo | Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Normal | 3 pts | 1084 | 509-563-12 | 47.5% | -8.8% ± 5.8 | -3.0 |
| Normal | 5 pts | 849 | 404-438-7 | 48.0% | -7.8% ± 6.6 | -2.4 |
| Normal | 8 pts | 565 | 267-294-4 | 47.6% | -8.6% ± 8.0 | -2.1 |
| Con números clave | 3 pts | 1091 | 513-567-11 | 47.5% | -8.9% ± 5.8 | -3.1 |
| Con números clave | 5 pts | 879 | 416-453-10 | 47.9% | -8.2% ± 6.4 | -2.6 |
| Con números clave | 8 pts | 584 | 280-300-4 | 48.3% | -7.5% ± 7.9 | -1.9 |

Por puntos de diferencia entre el modelo y la línea (modelo − línea):
| Diferencia | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 1 pts | 1071 | 504-555-12 | 47.6% | -9.0% ± 5.8 | -3.1 |
| 1.5 pts | 895 | 421-466-8 | 47.5% | -9.3% ± 6.4 | -2.9 |
| 2 pts | 740 | 355-379-6 | 48.4% | -7.6% ± 7.0 | -2.2 |
| 3 pts | 462 | 230-228-4 | 50.2% | -4.0% ± 8.9 | -0.9 |
| 4 pts | 298 | 151-144-3 | 51.2% | -2.2% ± 11.0 | -0.4 |

Referencia: el local cubre 49.1% de las veces (sin push).

## 7) Totales (1452 juegos)
RMSE: modelo 13.564 · línea 12.880 · dif de cuadrados 18.104 ± 5.455 → MERCADO MEJOR (z=6.6)
Regresión: total real = a + b·(línea) + c·(modelo − línea):  b = 0.817 · **c = -0.288 ± 0.254**
λ del total (peso del modelo sobre la línea): **0.00**; mezcla fuera de muestra contra la línea sola: 0.0000 ± 0.0000 (negativo = mejora).
Apostar Más/Menos cuando el modelo difiere del precio:
| Diferencia mínima | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| 3 pts | 1054 | 512-531-11 | 49.1% | -3.9% ± 6.2 | -1.3 |
| 5 pts | 823 | 409-407-7 | 50.1% | -1.3% ± 7.2 | -0.4 |
| 8 pts | 515 | 247-264-4 | 48.3% | -3.1% ± 9.5 | -0.6 |

Por puntos de diferencia:
| Regla | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Más si modelo ≥ línea + 1.5 | 574 | 270-299-5 | 47.5% | -7.2% ± 8.4 | -1.7 |
| Menos si modelo ≤ línea − 1.5 | 316 | 166-146-4 | 53.2% | +2.4% ± 10.9 | 0.4 |
| Más si modelo ≥ línea + 3 | 318 | 137-178-3 | 43.5% | -13.6% ± 11.6 | -2.3 |
| Menos si modelo ≤ línea − 3 | 153 | 82-70-1 | 53.9% | +4.7% ± 16.2 | 0.6 |
| Más si modelo ≥ línea + 4.5 | 158 | 67-90-1 | 42.7% | -12.1% ± 17.7 | -1.4 |
| Menos si modelo ≤ línea − 4.5 | 67 | 42-25 | 62.7% | +23.2% ± 25.1 | 1.8 |


## 8) Sesgos del mercado, sin usar el modelo (apostando 1 unidad al precio real)
**Moneyline por probabilidad del mercado** (cada juego aporta sus dos lados)
| Tramo | Prob. de la casa (con margen) | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|---|
| Muy perro (<35%) | 25.2% | 737 | 170-567 | 23.1% | -10.7% ± 12.8 | -1.7 |
| Perro (35–45%) | 41.9% | 529 | 210-319 | 39.7% | -5.2% ± 10.2 | -1.0 |
| Parejo (45–55%) | 52.1% | 366 | 183-183 | 50.0% | -4.3% ± 10.1 | -0.9 |
| Favorito (55–65%) | 62.1% | 529 | 319-210 | 60.3% | -2.8% ± 6.9 | -0.8 |
| Favorito fuerte (65–80%) | 75.1% | 538 | 396-142 | 73.6% | -2.1% ± 5.1 | -0.8 |
| Gran favorito (>80%) | 89.0% | 199 | 171-28 | 85.9% | -3.6% ± 5.6 | -1.3 |

**Local contra visitante**
| Grupo | Apuestas | G-P | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Todos los locales · apostar al local | 1449 | 776-673 | 53.6% | -6.3% ± 5.5 | -2.3 |
| Todos los locales · apostar al visitante | 1449 | 673-776 | 46.4% | -4.4% ± 6.6 | -1.3 |
| Locales favoritos · apostar al local | 847 | 580-267 | 68.5% | -3.6% ± 4.7 | -1.5 |
| Locales favoritos · apostar al visitante | 847 | 267-580 | 31.5% | -7.1% ± 10.5 | -1.4 |
| Locales perros · apostar al local | 602 | 196-406 | 32.6% | -10.0% ± 11.5 | -1.7 |
| Locales perros · apostar al visitante | 602 | 406-196 | 67.4% | -0.6% ± 5.8 | -0.2 |

**Handicap por tamaño** (apostar siempre al favorito, al perro, al local favorito o al local perro)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Línea 0–3 · favorito | 492 | 249-235-8 | 51.4% | -2.6% ± 8.5 | -0.6 |
| Línea 0–3 · perro | 492 | 235-249-8 | 48.6% | -6.6% ± 8.6 | -1.5 |
| Línea 0–3 · local favorito | 259 | 123-131-5 | 48.4% | -8.1% ± 11.7 | -1.4 |
| Línea 0–3 · local perro | 233 | 104-126-3 | 45.2% | -12.7% ± 12.5 | -2.0 |
| Línea 3.5–6 · favorito | 418 | 193-222-3 | 46.5% | -10.4% ± 9.4 | -2.2 |
| Línea 3.5–6 · perro | 418 | 222-193-3 | 53.5% | +1.5% ± 9.2 | 0.3 |
| Línea 3.5–6 · local favorito | 245 | 108-136-1 | 44.3% | -14.4% ± 12.3 | -2.3 |
| Línea 3.5–6 · local perro | 173 | 86-85-2 | 50.3% | -4.5% ± 14.4 | -0.6 |
| Línea 6.5–10 · favorito | 369 | 175-189-5 | 48.1% | -8.2% ± 9.9 | -1.7 |
| Línea 6.5–10 · perro | 369 | 189-175-5 | 51.9% | -0.9% ± 9.9 | -0.2 |
| Línea 6.5–10 · local favorito | 227 | 114-110-3 | 50.9% | -2.9% ± 12.6 | -0.5 |
| Línea 6.5–10 · local perro | 142 | 79-61-2 | 56.4% | +7.7% ± 15.9 | 1.0 |
| Línea 10.5+ · favorito | 167 | 84-81-2 | 50.9% | -2.6% ± 14.8 | -0.4 |
| Línea 10.5+ · perro | 167 | 81-84-2 | 49.1% | -6.2% ± 14.7 | -0.8 |
| Línea 10.5+ · local favorito | 126 | 65-59-2 | 52.4% | +0.5% ± 17.0 | 0.1 |
| Línea 10.5+ · local perro | 41 | 22-19 | 53.7% | +2.2% ± 30.1 | 0.1 |

**Totales por línea** (8 líneas con 60+ juegos)
| Grupo | Apuestas | G-P-Push | % ganadas | ROI ± 2·se | z |
|---|---|---|---|---|---|
| Total 41.5 · Más | 95 | 49-46 | 51.6% | -1.5% ± 19.7 | -0.1 |
| Total 41.5 · Menos | 95 | 46-49 | 48.4% | -8.3% ± 19.6 | -0.8 |
| Total 42.5 · Más | 60 | 32-28 | 53.3% | +1.2% ± 24.7 | 0.1 |
| Total 42.5 · Menos | 60 | 28-32 | 46.7% | -10.6% ± 25.0 | -0.9 |
| Total 43.5 · Más | 84 | 44-40 | 52.4% | +0.8% ± 21.1 | 0.1 |
| Total 43.5 · Menos | 84 | 40-44 | 47.6% | -8.8% ± 21.0 | -0.8 |
| Total 44.5 · Más | 104 | 56-48 | 53.8% | +3.1% ± 18.8 | 0.3 |
| Total 44.5 · Menos | 104 | 48-56 | 46.2% | -12.2% ± 18.7 | -1.3 |
| Total 45.5 · Más | 80 | 42-38 | 52.5% | +0.1% ± 21.4 | 0.0 |
| Total 45.5 · Menos | 80 | 38-42 | 47.5% | -9.0% ± 21.6 | -0.8 |
| Total 46.5 · Más | 77 | 39-38 | 50.6% | -3.7% ± 21.8 | -0.3 |
| Total 46.5 · Menos | 77 | 38-39 | 49.4% | +1.7% ± 28.5 | 0.1 |
| Total 47.5 · Más | 84 | 43-41 | 51.2% | -1.6% ± 21.1 | -0.1 |
| Total 47.5 · Menos | 84 | 41-43 | 48.8% | -8.1% ± 20.7 | -0.8 |
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
| 2026 | Más | 31 | 16-15 | 51.6% | -1.7% ± 34.8 | -0.1 |
| 2019 | Menos | 191 | 99-92 | 51.8% | +3.5% ± 16.4 | 0.4 |
| 2020 | Menos | 191 | 98-90-3 | 52.1% | -0.3% ± 13.7 | -0.0 |
| 2021 | Menos | 208 | 107-98-3 | 52.2% | -0.5% ± 13.1 | -0.1 |
| 2022 | Menos | 207 | 112-92-3 | 54.9% | +4.8% ± 13.1 | 0.7 |
| 2023 | Menos | 208 | 110-95-3 | 53.7% | +2.5% ± 13.2 | 0.4 |
| 2024 | Menos | 208 | 91-117 | 43.8% | -16.5% ± 13.2 | -2.5 |
| 2025 | Menos | 208 | 97-111 | 46.6% | -10.8% ± 13.3 | -1.6 |
| 2026 | Menos | 31 | 15-16 | 48.4% | -6.8% ± 35.2 | -0.4 |


## 9) Lo propio de fútbol americano
Juegos de temporada regular: 2734. Empates: 11 (0.40%). Tiempo extra: 5.6%. Local gana: 54.3%.
Margen medio (local − visitante) 1.70 · desviación 14.15. Total medio 45.60 · desviación 13.89.
**Números clave**: frecuencia real de cada margen exacto contra lo que daría una curva normal con la misma desviación
| Margen | Real | Normal | Real / Normal |
|---|---|---|---|
| 0 | 0.40% | 2.82% | 0.14 |
| 1 | 4.57% | 5.58% | 0.82 |
| 2 | 4.79% | 5.54% | 0.86 |
| 3 | 14.52% | 5.48% | 2.65 |
| 4 | 4.72% | 5.38% | 0.88 |
| 5 | 4.46% | 5.26% | 0.85 |
| 6 | 6.84% | 5.12% | 1.33 |
| 7 | 8.63% | 4.96% | 1.74 |
| 8 | 4.43% | 4.78% | 0.93 |
| 9 | 1.72% | 4.59% | 0.37 |
| 10 | 4.79% | 4.38% | 1.09 |
| 11 | 2.05% | 4.16% | 0.49 |
| 12 | 1.98% | 3.93% | 0.50 |
| 13 | 1.94% | 3.69% | 0.52 |
| 14 | 4.97% | 3.46% | 1.44 |
| 15 | 1.76% | 3.22% | 0.55 |
| 16 | 2.27% | 2.98% | 0.76 |
| 17 | 3.51% | 2.75% | 1.28 |
| 20 | 2.12% | 2.09% | 1.01 |
| 21 | 2.19% | 1.89% | 1.16 |

Pesos clave medidos con todo el historial (para |margen| = 0..45): 0.35 0.77 0.87 2.78 0.85 0.87 1.35 1.78 1.00 0.42 1.13 0.53 0.54 0.59 1.42 0.57 0.76 1.29 0.90 0.55 0.92 1.05
**Push en líneas enteras** (lo que pasa cuando el margen cae justo en la línea)
| Línea | Juegos | Push real | Push que daría la normal | Push con números clave |
|---|---|---|---|---|
| 1 | 44 | 0.0% | 3.0% | 2.3% |
| 2 | 35 | 2.9% | 3.0% | 2.3% |
| 3 | 154 | 4.5% | 3.0% | 7.7% |
| 4 | 40 | 5.0% | 3.0% | 2.2% |
| 6 | 35 | 2.9% | 3.0% | 3.8% |
| 7 | 63 | 3.2% | 3.0% | 5.4% |
| 10 | 26 | 11.5% | 3.0% | 3.3% |

**Descanso**: margen real − margen de la línea (positivo = el local rinde más de lo que la línea dice)
| Situación | Juegos | Margen real − línea |
|---|---|---|
| Local viene de bye (11+ días) | 99 | -0.62 ± 1.99 |
| Visitante viene de bye | 102 | 0.95 ± 2.58 |

**Totales por situación**: total real − línea, y ROI de apostar siempre Más
| Situación | Juegos | Total real − línea | ROI de Más ± 2·se |
|---|---|---|---|
| Techo cerrado | 396 | 2.58 ± 1.32 | +5.8% ± 10.1 |
| Al aire libre | 1056 | 0.03 ± 0.78 | -8.7% ± 5.9 |
| Semanas 5–12 | 831 | -0.13 ± 0.85 | -8.6% ± 6.9 |
| Semanas 13–18 | 621 | 1.87 ± 1.09 | +0.5% ± 7.6 |
| Juego de noche (jueves/domingo/lunes, 8pm ET o después) | 296 | -0.84 ± 1.58 | -15.8% ± 11.0 |


## 10) Calibración de la probabilidad de que gane el local
| Tramo | Modelo: juegos | Dijo | Ganó | Mercado: juegos | Dijo | Ganó |
|---|---|---|---|---|---|---|
| 0.00–0.30 | 106 | 23.0% | 31.1% | 189 | 22.5% | 18.5% |
| 0.30–0.40 | 149 | 35.7% | 31.5% | 184 | 35.4% | 37.5% |
| 0.40–0.50 | 283 | 45.2% | 40.3% | 229 | 44.2% | 40.2% |
| 0.50–0.60 | 328 | 55.0% | 53.0% | 251 | 55.7% | 54.6% |
| 0.60–0.70 | 282 | 65.0% | 62.8% | 227 | 64.5% | 64.3% |
| 0.70–1.00 | 301 | 78.3% | 76.7% | 369 | 78.8% | 80.5% |


## 11) Resumen para decidir
```
Parámetros de la última temporada de prueba (2026): {"kM":0.11,"kT":0.04,"carry":0.5,"H":1.8,"Rs":2,"Bb":1.6,"Z":1}
λ ganador (peso del modelo sobre el mercado): medido 0.00 → recomendado en la app 0.05
λ total: 0.00 → 0.05
El mercado se equivoca 0.039 (relativo) menos que el modelo en el margen → ESC_SIG 0.961
```