# Valor de jugador en NFL y NHL (17-nov-2026)

Lo mismo que se aplicó en NBA (`MEDICION-VALOR-JUGADOR-NBA-2026-11.md`), en el contexto de cada deporte. Cada juego solo con lo de antes;
el ajuste se elige con las temporadas anteriores y se prueba en la siguiente, contra el modelo de la app.

## NFL · el mariscal titular y los mejores del ataque (`scripts/medicion/valor_jugador_nfl.js`)

Datos: boxscores de ESPN de 2,021 juegos de 2019 a hoy (rama `datos-nfl-box`, robot `scripts/bajar_nfl_box.js`).
Mariscal habitual = el que más abrió en los últimos 3; su calidad = ANY/A ((yardas + 20·TD − 45·INT) / intentos), jalado a la liga con 150 intentos.
Si hoy abre otro, falta la diferencia contra un suplente normal (ANY/A 4.8). Ataque = los 3 de más yardas por juego que hoy no aparecen.

| Temporada | Juegos | Aciertos sin → con | Pérdida sin → con | Juegos sin su mariscal |
|---|---|---|---|---|
| 2021 | 223 | 63.2% → 65.9% | 0.6578 → 0.6408 | 27 → 30 |
| 2022 | 222 | 65.3% → 64.4% | 0.6264 → 0.6397 | 29 → 27 |
| 2023 | 224 | 61.6% → 59.8% | 0.6489 → 0.6522 | 23 → 19 |
| 2024 | 224 | 68.3% → 70.5% | 0.6031 → 0.5823 | 30 → 36 |
| 2025 | 223 | 60.1% → 61.0% | 0.6496 → 0.6482 | 27 → 29 |
| 2026 (hasta hoy) | 101 | 66.3% → 65.3% | 0.6118 → 0.6040 | 12 → 14 |
| **Total** | **1,217** | **63.93% → 64.42%** | **0.6350 → 0.6302 (z 0.8)** | **148 → 155** |

Solo el mariscal: 63.93% → 64.17%, z 1.0. Empeora en 2022 y 2023. **No pasa** (hace falta z ≥ 2 y que se repita): con 270 juegos por temporada
y ~40 juegos sin el mariscal titular, no alcanza para separar la señal del ruido. Además, el pronóstico de ESPN (FPI), que la app ya mezcla con peso 0.80,
cuenta al mariscal. **No se aplica al %.** El aviso de «mariscal en la lista de lesionados» sigue en El análisis.

## NHL · el portero que abre (`scripts/medicion/valor_portero_nhl.js`)

Datos: `nhl-box.json` (API oficial de la NHL, 5,580 juegos con el portero de cada lado). Calidad del portero = goles evitados por tiro contra la liga,
jalado a 0 con 300 / 700 / 1,500 tiros; se compara con el portero habitual del equipo (últimas 10 aperturas).

| Tiros para jalar | Aciertos sin → con | Pérdida sin → con |
|---|---|---|
| 300 | 57.74% → 57.59% | 0.6705 → 0.6704 |
| 700 | 57.74% → 57.67% | 0.6705 → 0.6703 |
| 1,500 | 57.74% → 57.59% | 0.6705 → 0.6702 |

2,544 juegos de prueba (2024-25 a hoy). **No suma:** el % de atajadas de un portero cambia mucho de una temporada a otra y el modelo ya trae
el nivel del equipo. **No se aplica.** El aviso de «cambió el portero» sigue en El análisis.
