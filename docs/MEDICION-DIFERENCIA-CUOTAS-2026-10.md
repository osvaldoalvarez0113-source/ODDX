# Diferencia de cuotas: ¿cuántas veces gana el favorito? (MLB y fútbol, octubre 2026)

Idea de Osvaldo: si la cuota dice 59-41 (18 puntos de diferencia), ¿cuántas veces gana el favorito? ¿Hay rangos donde gane más (o menos) de lo que dice la cuota?

Datos: 6,171 juegos de MLB 2024-2026, cierre de DraftKings vía ESPN, con el margen de la casa quitado (ramas `var-S2024/25/26`).
Script: `scripts/medicion/diferencia_cuotas.py`. Página con calculadora: `backtests/backtestdiferencia.html`.

## Resultado (3 temporadas juntas)

| Diferencia | Juegos | Ganó fav. | Decía la cuota | z | ROI fav. | ROI no fav. |
|---|---|---|---|---|---|---|
| 0-4 | 922 | 53.3% | 50.8% | +1.5 | +0.3% | -9.0% |
| 4-8 | 1016 | 53.5% | 52.8% | +0.5 | -2.7% | -5.8% |
| 8-12 | 949 | 52.4% | 54.8% | -1.5 | -8.3% | +1.2% |
| 12-16 | 859 | 55.9% | 56.9% | -0.6 | -5.8% | -1.9% |
| 16-20 | 784 | 57.8% | 59.1% | -0.7 | -5.9% | -0.8% |
| 20-25 | 597 | 60.5% | 61.4% | -0.5 | -5.4% | -1.8% |
| 25-30 | 399 | 63.2% | 63.6% | -0.2 | -4.6% | -2.5% |
| 30-40 | 431 | 69.8% | 67.2% | +1.2 | -0.0% | -11.6% |
| 40+ | 214 | 77.6% | 73.6% | +1.3 | +1.3% | -23.0% |
| Total | 6171 | 57.4% | 57.4% | 0.0 | -4.0% | -4.4% |

## Conclusión

- La cuota de cierre ya dice cuántas veces gana el favorito, casi exacto. Ningún rango se separa más que el azar.
- Ningún rango da ganancia estable: los que salen positivos en una temporada se voltean en otra (16-20 pts, no favorito: +9.9% en 2025, -10.0% en 2026; 0-4 pts, favorito: -4.8% en 2024, +6.9% en 2026).
- Favorito local o visitante: mismo patrón, nada.
- Lo único que se repite: con 30+ pts el no favorito pierde mucho (-11% a -26% en las 3 temporadas). Regla útil para **no** jugar no favoritos grandes; el favorito tampoco deja ganancia.
- **No se agrega al cálculo de las apps.** Queda como página de consulta en Backtests.

## Fútbol (agregado el mismo día)

Datos: 9,884 partidos de Premier, La Liga, Serie A, Bundesliga y Ligue 1, de 2020-21 a 2025-26, cierre 1X2 de Pinnacle sin margen
(rama `resultados-futbol-6t`, `partidos_futbol.json`). Script: `scripts/medicion/diferencia_cuotas_futbol.py`.
Diferencia = probabilidad del favorito menos la del no favorito (el empate no cuenta).

| Dif. | Partidos | Fav. (cuota) | Empate (cuota) | No fav. (cuota) | ROI fav. | ROI emp. | ROI no fav. |
|---|---|---|---|---|---|---|---|
| 0-10 | 1864 | 38.2 (37.8) | 31.2 (29.4) | 30.6 (32.8) | -1.4% | +3.6% | -8.9% |
| 10-20 | 1847 | 45.3 (43.1) | 28.3 (28.7) | 26.4 (28.2) | +2.7% | -3.5% | -9.0% |
| 20-30 | 1564 | 47.7 (48.7) | 29.0 (27.3) | 23.3 (23.9) | -4.7% | +3.1% | -4.7% |
| 30-40 | 1457 | 56.5 (54.8) | 24.4 (25.4) | 19.1 (19.8) | +0.3% | -6.7% | -5.6% |
| 40-50 | 1140 | 63.1 (60.9) | 23.2 (23.0) | 13.8 (16.2) | +0.7% | -2.2% | -17.1% |
| 50-60 | 913 | 70.3 (67.4) | 18.9 (19.9) | 10.7 (12.7) | +1.3% | -7.2% | -18.7% |
| 60+ | 1099 | 78.1 (77.5) | 14.6 (14.5) | 7.4 (8.0) | -2.3% | -3.2% | -7.8% |
| Total | 9884 | 54.0 (52.9) | 25.4 (25.1) | 20.6 (22.1) | -0.5% | -1.7% | -9.5% |

- El no favorito pierde en las 6 temporadas (-1.3%, -2.9%, -6.3%, -24.7%, -9.6%, -16.2%). Regla firme: no jugar la hembra a ganador.
- El favorito no deja ganancia: -0.5% a precio de Pinnacle, -1.9% al promedio de las casas.
- Favorito visitante: +2.5% junto, pero sale de 2 temporadas (23-24 +10.1%, 24-25 +9.4%); las otras 4 dan -3.1% a +0.3%. No se repite.
- Por rango y por liga los positivos se voltean entre temporadas. **Tampoco se agrega al cálculo de las apps.**
