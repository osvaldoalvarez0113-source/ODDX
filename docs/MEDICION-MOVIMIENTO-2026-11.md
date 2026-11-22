# Movimiento de la línea (apertura → cierre) en aciertos — 22 nov 2026

**Pregunta de Osvaldo:** ¿qué nos dice el movimiento de líneas?

**Datos:** 12,850 juegos con línea de apertura y de cierre de ESPN (moneyline sin margen): NHL 4,520, NFL 708, MLB 7,382 y NBA 240 (solo esta temporada; los archivos viejos de NBA no guardaron la apertura). Ramas `datos-nhl-nfl` y `cierres` (robot del archivo de cierres). Script: `scripts/medicion/movimiento.js`.

## Veredicto

1. **El cierre escoge mejor al ganador que la apertura** en los tres deportes con datos: NHL 59.3% contra 58.5%, NFL 67.7% contra 66.5%, MLB 57.1% contra 56.3%; también con menor pérdida log. O sea, la línea se mueve por algo (bajas, portero, abridor, dinero informado) y ese algo es verdad.
2. **Cuando cambia el favorito** entre apertura y cierre, el de cierre gana 54-56% (NHL 185 de 337, NFL 40 de 72, MLB 407 de 761). Créele al de ahora.
3. **Con el mismo % de cierre, el movimiento NO agrega aciertos**: el favorito al que la línea se le movió a favor (o en contra) gana lo mismo que dice su %. Ninguna diferencia pasa de z 1.6 y el signo cambia de temporada a temporada (NHL a favor: +1.4, −1.5, −3.7, +11.4). El precio de cierre ya trae toda la noticia.

**En la práctica:** mira el pick lo más cerca posible del juego (con el precio de ahora, no el de la mañana): se gana ~1 punto de aciertos. No hace falta perseguir «steam»: una vez que el precio se movió, ya no da más. En las apps, el aviso de «La línea se movió…» del Veredicto ahora lo dice así (y si cambió el favorito, que el de ahora gana 54 de cada 100).

---


## NHL · 4520 juegos (2023–2026)

| | Apertura | Cierre |
|---|---|---|
| Escoge al ganador | 58.5% | 59.3% |
| Pérdida log (más bajo = mejor) | 0.6672 | 0.6642 |

Cambió el favorito entre apertura y cierre en 337 juegos: el de cierre ganó 185 (54.9%).

Con el mismo % de cierre, según el movimiento (real − decía; z = qué tan lejos de la suerte):

| Movimiento | Juegos | Real | Decía | Real − decía | z |
|---|---|---|---|---|---|
| en contra 3+ pts | 365 | 54.0% | 55.6% | -1.7 | -0.65 |
| quieta (±3) | 3296 | 59.8% | 59.5% | +0.3 | 0.34 |
| a favor 3+ pts | 859 | 59.6% | 59.9% | -0.3 | -0.18 |

Por temporada (real − decía):

| Temporada | Juegos | en contra 3+ pts | quieta (±3) | a favor 3+ pts |
|---|---|---|---|---|
| 2023 | 1374 | -5.2 (59) | +0.9 (1121) | +1.4 (194) |
| 2024 | 1394 | -0.1 (111) | +2.0 (966) | -1.5 (317) |
| 2025 | 1390 | -1.9 (163) | -2.1 (961) | -3.7 (266) |
| 2026 | 362 | +0.3 (32) | +0.2 (248) | +11.4 (82) |

## NFL · 708 juegos (2023–2026)

| | Apertura | Cierre |
|---|---|---|
| Escoge al ganador | 66.5% | 67.7% |
| Pérdida log (más bajo = mejor) | 0.6137 | 0.6020 |

Cambió el favorito entre apertura y cierre en 72 juegos: el de cierre ganó 40 (55.6%).

Con el mismo % de cierre, según el movimiento (real − decía; z = qué tan lejos de la suerte):

| Movimiento | Juegos | Real | Decía | Real − decía | z |
|---|---|---|---|---|---|
| en contra 3+ pts | 108 | 68.5% | 63.8% | +4.7 | 1.03 |
| quieta (±3) | 307 | 68.1% | 67.3% | +0.8 | 0.30 |
| a favor 3+ pts | 293 | 66.9% | 66.1% | +0.8 | 0.30 |

Por temporada (real − decía):

| Temporada | Juegos | en contra 3+ pts | quieta (±3) | a favor 3+ pts |
|---|---|---|---|---|
| 2024 | 278 | +4.1 (40) | +8.2 (128) | +3.7 (110) |
| 2025 | 276 | +10.0 (35) | -6.2 (133) | -2.0 (108) |
| 2026 | 142 | -0.1 (33) | +2.9 (36) | +1.2 (73) |

## MLB · 7382 juegos (2023–2026)

| | Apertura | Cierre |
|---|---|---|
| Escoge al ganador | 56.3% | 57.1% |
| Pérdida log (más bajo = mejor) | 0.6793 | 0.6767 |

Cambió el favorito entre apertura y cierre en 761 juegos: el de cierre ganó 407 (53.5%).

Con el mismo % de cierre, según el movimiento (real − decía; z = qué tan lejos de la suerte):

| Movimiento | Juegos | Real | Decía | Real − decía | z |
|---|---|---|---|---|---|
| en contra 3+ pts | 645 | 56.1% | 54.7% | +1.4 | 0.73 |
| quieta (±3) | 5119 | 56.5% | 57.2% | -0.7 | -0.96 |
| a favor 3+ pts | 1618 | 59.1% | 58.8% | +0.3 | 0.23 |

Por temporada (real − decía):

| Temporada | Juegos | en contra 3+ pts | quieta (±3) | a favor 3+ pts |
|---|---|---|---|---|
| 2024 | 2426 | +3.9 (223) | -1.0 (1769) | +0.8 (434) |
| 2025 | 2472 | -0.1 (277) | -1.6 (1392) | -0.3 (803) |
| 2026 | 2464 | +0.6 (145) | +0.6 (1939) | +1.1 (380) |

## NBA · 240 juegos (2026–2026)

| | Apertura | Cierre |
|---|---|---|
| Escoge al ganador | 70.8% | 70.8% |
| Pérdida log (más bajo = mejor) | 0.5720 | 0.5672 |

Cambió el favorito entre apertura y cierre en 20 juegos: el de cierre ganó 10 (50.0%).

Con el mismo % de cierre, según el movimiento (real − decía; z = qué tan lejos de la suerte):

| Movimiento | Juegos | Real | Decía | Real − decía | z |
|---|---|---|---|---|---|
| en contra 3+ pts | 29 | 62.1% | 62.0% | +0.0 | 0.00 |
| quieta (±3) | 127 | 74.0% | 67.8% | +6.2 | 1.54 |
| a favor 3+ pts | 84 | 69.0% | 68.7% | +0.4 | 0.08 |

Por temporada (real − decía):

| Temporada | Juegos | en contra 3+ pts | quieta (±3) | a favor 3+ pts |
|---|---|---|---|---|
| 2026 | 240 | +0.0 (29) | +6.2 (127) | +0.4 (84) |

