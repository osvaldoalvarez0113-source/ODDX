# Picks ganadores (noviembre 2026)

Pedido de Osvaldo: enfocar las apps en acertar, no en cazar valor. Medido el 5-nov-2026 con `scripts/medicion/picks_ganadores.py`, a cuota de cierre. Solo el modelo usa parámetros que se ajustaron con parte de estos años.

| App | Juegos | Favoritos 60%+ | Rinde | ⭐ más seguro de cada día | Rinde |
|---|---|---|---|---|---|
| MLB | 12,311 | 64.8% | −4.4% ±2.2 | 70.8% (992) | −1.1% ±4.1 |
| NBA | 7,293 | 73.1% | −4.2% ±1.7 | 79.5% (1,183) | −3.9% ±3.0 |
| NHL | 4,613 | 66.9% | −3.7% ±3.1 | 71.5% (621) | −1.4% ±5.1 |
| NFL | 1,462 | 73.4% | −2.8% ±3.8 | 84.0% (100, uno por semana) | −5.4% ±8.4 |
| Fútbol, ligas | 9,884 | 72.4% | +0.5% ±2.4 | 71.2% (1,018) | −0.6% ±4.3 |

Fútbol usa Pinnacle cuando existe, y no cuenta el empate como ganado. No se distingue de cero, y esa cuota es difícil de conseguir.

## Lo que ayuda a encontrar ganadores

El % del mercado. En cada deporte, lo que dice se cumple casi igual. Por ejemplo, NBA 80%+: dice 85.3%, ganó 85.6%.

## Lo que no ayuda

| Filtro | MLB | NBA | NHL | NFL |
|---|---|---|---|---|
| Favorito 60%+ | 64.8% | 73.1% | 66.9% | 73.4% |
| Y el modelo de acuerdo | 64.9% | 73.6% | 67.3% | 73.9% |
| Y el modelo le da más | 64.8% | 71.4% | 59.5% | 68.8% |
| Y el modelo en contra | 64.3% | 65.6% | pocos | 64.9% |
| Hembra que el modelo da ganadora | 45.7% | 42.1% | 44.7% | 38.7% |
| Lo que el mercado le daba a esa hembra | 45.3% | 41.9% | 46.2% | 42.1% |

En fútbol, el rival del favorito rinde −9.5% ±4.1, y también cuando el modelo lo da favorito (−9.5% ±8.7).

## Acertar no es ganar dinero

A precio justo, una derrota borra p/(1−p) victorias: 1.5 con 60%, 2.3 con 70%, 4 con 80%, 5.7 con 85%. Con margen de casa, hace falta acertar más que eso.

## La pantalla

`ganadores.js`: barra «Picks ganadores» arriba de los juegos en las cinco apps. Lee el registro automático. Muestra por día, de más a menos probable: ⭐ el más probable, historial del tramo, cuántas victorias borra una derrota, precio justo, ganadores esperados, y alerta si el modelo se separa más que 9 de cada 10 juegos (MLB 11, fútbol 12, NBA 16, NHL 9, NFL 15 pts). Arriba, el marcador del mes: tus picks y el ⭐ de cada día con margen de 3%. En fútbol solo salen las ligas que se hayan abierto.
