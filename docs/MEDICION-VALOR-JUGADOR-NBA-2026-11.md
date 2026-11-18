# Valor de cada jugador en la NBA (17-nov-2026)

Pregunta: si el modelo sabe **quién falta esa noche y cuánto vale**, ¿acierta más?

**Datos.** Boxscores de ESPN de 6,818 juegos (2021-22 a 2026-27; rama `datos-nba-box`, robot `scripts/bajar_nba_box.js`) unidos con lo que
decía el modelo de la app antes de cada juego (`resultados-nba-6t`, 5,973 juegos medibles). Cada juego solo con lo de antes.
Script: `scripts/medicion/valor_jugador_nba.py`.

**Valor de un jugador** = su producción por juego (PTS + 0.7·REB + 0.7·AST). **Talento que falta** = la suma de los que no jugaron esa noche
entre los 8 de más minutos del equipo esa temporada (5+ juegos, 16+ min, que hayan jugado en los últimos 12). Se probaron tres formas de contarlo;
esta es la del experimento anterior (`resultados-nba-lesiones`) y fue la mejor.

Ajuste: margen del modelo + c × (lo que le falta a la visita − lo que le falta al local). c se elige con las temporadas anteriores y se prueba en la siguiente.

| Temporada | Juegos | c | Aciertos sin → con | Pérdida sin → con |
|---|---|---|---|---|
| 2022-23 | 1,193 | 0.067 | 63.0% → 62.8% | 0.6475 → 0.6470 |
| 2023-24 | 1,194 | 0.055 | 66.1% → 66.5% | 0.6088 → 0.6050 |
| 2024-25 | 1,195 | 0.052 | 66.8% → 67.5% | 0.6067 → 0.5940 |
| 2025-26 | 1,194 | 0.053 | 68.3% → 70.0% | 0.5963 → 0.5845 |
| **Total** | **4,776** | | **66.04% → 66.71%** (+32) | **0.6148 → 0.6076** |

Mejora la pérdida en las 4 temporadas y los aciertos en 3 de 4. c final = **0.057 puntos de margen por punto de producción**
(Doncic ≈ 49 de producción ≈ 2.8 puntos; Reaves ≈ 30 ≈ 1.7 puntos).

**Encima de la mezcla con ESPN (BPI, peso 0.70, lo que la app usa cuando ESPN responde):** aciertos 67.63% → 67.59%, pérdida un poco mejor (z 2.6).
El BPI de ESPN ya cuenta las bajas, así que ahí casi no suma. Donde más se nota: el «modelo solo», cuando ESPN no responde, y para explicar
en El análisis cuánto vale cada baja.

**Ojo:** se midió con quién jugó de verdad (boxscore). En la app se usa la lista de ESPN de jugadores «Out», que sale antes del juego y
a veces cambia a última hora.

**En la app (`nba.html`):** `valores-nba.json` (robot `scripts/valores_nba.js`, dos veces al día en temporada) trae los 8 regulares de cada equipo.
Cuando llegan los lesionados, el modelo resta lo que vale cada «Out» antes de mezclar con ESPN, y El análisis dice cuánto vale cada baja.
