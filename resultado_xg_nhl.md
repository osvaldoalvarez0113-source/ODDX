MoneyPuck: 23432 juegos (fila del local, todas las situaciones).
Unidos con datos-nhl.json: 7296 de 7312 juegos.

# NHL · calidad del tiro (xG de MoneyPuck) contra contar tiros

Datos: MoneyPuck.com (uso no comercial). Temporadas de prueba: 2023, 2024, 2025, 2026. Pérdida logarítmica del ganador: más baja = mejor.

| Variante | 2023 | 2024 | 2025 | 2026 | Total | Contra «tiros» (milésimas ± 2·se) | z | Mejora en | ¿Entra? |
|---|---|---|---|---|---|---|---|---|---|
| Solo goles (sin tiros) | 0.6635 | 0.6664 | 0.6882 | 0.6468 | 0.6717 | +6.04 ± 2.83 | 4.3 | 0 de 3 | no |
| Tiros a puerta (lo de hoy) | 0.6562 | 0.6615 | 0.6826 | 0.6378 | 0.6657 | — | — | — | base |
| Intentos de tiro (dominio de zona) | 0.6547 | 0.6637 | 0.6826 | 0.6430 | 0.6661 | +0.39 ± 1.61 | 0.5 | 2 de 3 | no |
| Goles esperados (xG) | 0.6559 | 0.6654 | 0.6854 | 0.6375 | 0.6677 | +2.02 ± 2.12 | 1.9 | 1 de 3 | no |
| xG ajustado por marcador y pista | 0.6563 | 0.6672 | 0.6836 | 0.6372 | 0.6678 | +2.13 ± 2.14 | 2.0 | 0 de 3 | no |
| xG de tiros de alto peligro | 0.6604 | 0.6667 | 0.6886 | 0.6416 | 0.6707 | +5.05 ± 2.74 | 3.7 | 0 de 3 | no |
| **Mercado (cierre sin margen)** | 0.6538 | 0.6583 | 0.6821 | 0.6613 |  |  |  |  |  |

Juegos por temporada de prueba: 2023: 1146 · 2024: 1143 · 2025: 1145 · 2026: 134. Las temporadas con menos de 600 juegos no cuentan para «Mejora en».

## ¿Le agrega algo al precio de cierre?
| Variante | Juegos con línea | Peso del modelo sobre el mercado (c ± 2·se) | Veredicto |
|---|---|---|---|
| Solo goles (sin tiros) | 3470 | -0.51 ± 0.39 | no se distingue de cero (z -2.7) |
| Tiros a puerta (lo de hoy) | 3470 | 0.21 ± 0.39 | no se distingue de cero (z 1.1) |
| Intentos de tiro (dominio de zona) | 3470 | 0.20 ± 0.38 | no se distingue de cero (z 1.0) |
| Goles esperados (xG) | 3470 | -0.13 ± 0.40 | no se distingue de cero (z -0.6) |
| xG ajustado por marcador y pista | 3470 | -0.15 ± 0.40 | no se distingue de cero (z -0.7) |
| xG de tiros de alto peligro | 3470 | -0.50 ± 0.40 | no se distingue de cero (z -2.5) |

Constantes elegidas con las temporadas anteriores:
- Solo goles (sin tiros): 2023 {"kM":0.025,"Ws":0,"kS":0} · 2024 {"kM":0.015,"Ws":0,"kS":0} · 2025 {"kM":0.015,"Ws":0,"kS":0} · 2026 {"kM":0.015,"Ws":0,"kS":0}
- Tiros a puerta (lo de hoy): 2023 {"kM":0.015,"kS":0.015,"Ws":0.14} · 2024 {"kM":0.008,"kS":0.03,"Ws":0.14} · 2025 {"kM":0.008,"kS":0.06,"Ws":0.1} · 2026 {"kM":0.008,"kS":0.06,"Ws":0.1}
- Intentos de tiro (dominio de zona): 2023 {"kM":0.015,"kS":0.015,"Ws":0.14} · 2024 {"kM":0.008,"kS":0.03,"Ws":0.14} · 2025 {"kM":0.008,"kS":0.06,"Ws":0.1} · 2026 {"kM":0.008,"kS":0.09,"Ws":0.1}
- Goles esperados (xG): 2023 {"kM":0.008,"kS":0.015,"Ws":0.14} · 2024 {"kM":0.008,"kS":0.015,"Ws":0.1} · 2025 {"kM":0.008,"kS":0.03,"Ws":0.1} · 2026 {"kM":0.004,"kS":0.03,"Ws":0.1}
- xG ajustado por marcador y pista: 2023 {"kM":0.008,"kS":0.015,"Ws":0.14} · 2024 {"kM":0.004,"kS":0.015,"Ws":0.14} · 2025 {"kM":0.004,"kS":0.03,"Ws":0.1} · 2026 {"kM":0.004,"kS":0.03,"Ws":0.1}
- xG de tiros de alto peligro: 2023 {"kM":0.015,"kS":0.015,"Ws":0.07} · 2024 {"kM":0.015,"kS":0.015,"Ws":0.04} · 2025 {"kM":0.015,"kS":0.015,"Ws":0.04} · 2026 {"kM":0.015,"kS":0.015,"Ws":0.04}
