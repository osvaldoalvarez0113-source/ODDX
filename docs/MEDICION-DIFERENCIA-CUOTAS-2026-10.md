# Diferencia de cuotas: ¿cuántas veces gana el favorito? (MLB, octubre 2026)

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
