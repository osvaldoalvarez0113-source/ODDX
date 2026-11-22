# Historia de la liga: cuánto acierta el favorito por zona (22 nov 2026)

La liga de modelos empezó a contar el 21-nov-2026 y su mapa de confianza necesita 30 juegos por zona para decir algo. Para no esperar semanas, `scripts/historia_liga.js` (workflow **Historia de la liga**, todos los días) junta los juegos ya jugados que el repo tenía guardados y calcula cuánto acertó el favorito en cada zona. Es la misma zona de la liga (franja de 5 puntos + local/visita/empate). Se sigue alimentando sola con lo que la liga califica después de cada archivo.

**Qué es «el favorito»:** en NBA, NHL y NFL el moneyline de cierre sin margen (lo más parecido a OVA, que en esas apps es el mercado con el modelo al 5%); en fútbol el 1X2 de cierre de Pinnacle (el titular de la liga en fútbol es el mercado); en tenis el modelo de OVA (no hay mercado guardado).

**Lo que dice, en corto:** en los cinco deportes el % se cumple: lo que decía el favorito y lo que pasó van casi iguales en cada franja. O sea, la confianza que ves en la app es real en promedio, pero no hay una franja mágica que acierte mucho más de lo que dice. Por eso «Años» importa: en NFL una franja puede ir de 53% a 78% según la temporada; con pocos juegos por año, un año bueno no es una regla.

## NBA

7,299 juegos (2021-01-02 a 2026-11-22, 7 temporadas). El favorito acertó **68%**.

| Franja | Juegos | Real | Decía | Años (peor–mejor) |
|---|---|---|---|---|
| 50-55% | 1,032 | 51.4% | 52.5% | 47–54% |
| 55-60% | 1,218 | 60.7% | 57.5% | 58–65% |
| 60-65% | 1,122 | 61.8% | 62.4% | 59–67% |
| 65-70% | 999 | 67.4% | 67.4% | 61–71% |
| 70-75% | 924 | 72.3% | 72.4% | 58–78% |
| 75-80% | 716 | 77.5% | 77.4% | 72–81% |
| 80-85% | 662 | 80.2% | 82.4% | 76–85% |
| 85%+ | 626 | 91.4% | 88.3% | 84–95% |

## NHL

5,907 juegos (2022-10-11 a 2026-11-22, 5 temporadas). El favorito acertó **59.9%**.

| Franja | Juegos | Real | Decía | Años (peor–mejor) |
|---|---|---|---|---|
| 50-55% | 1,656 | 53.3% | 52.4% | 50–57% |
| 55-60% | 1,855 | 56.4% | 57.4% | 53–64% |
| 60-65% | 1,136 | 61.5% | 62.4% | 55–68% |
| 65-70% | 695 | 67.3% | 67.1% | 63–71% |
| 70-75% | 388 | 75.5% | 72% | 74–76% |
| 75-80% | 157 | 82.8% | 76.9% | 79–84% |

## NFL

2,056 juegos (2019-09-06 a 2026-11-16, 8 temporadas). El favorito acertó **67.7%**.

| Franja | Juegos | Real | Decía | Años (peor–mejor) |
|---|---|---|---|---|
| 50-55% | 262 | 50.8% | 52.6% | 44–58% |
| 55-60% | 425 | 58.6% | 57.7% | 47–67% |
| 60-65% | 343 | 63.0% | 62.4% | 53–75% |
| 65-70% | 267 | 66.3% | 67.4% | 53–78% |
| 70-75% | 279 | 77.1% | 72.5% | 66–83% |
| 75-80% | 213 | 77.9% | 77.3% | 64–89% |
| 80-85% | 125 | 81.6% | 81.8% | — |
| 85%+ | 142 | 93.7% | 88.8% | — |

## Fútbol

14,765 juegos (2018-08-10 a 2026-11-22, 9 temporadas). El favorito acertó **53.8%**.

| Franja | Juegos | Real | Decía | Años (peor–mejor) |
|---|---|---|---|---|
| 30-35% | 179 | 38.5% | 34.4% | — |
| 35-40% | 2,436 | 37.4% | 37.7% | 31–41% |
| 40-45% | 2,519 | 44.1% | 42.4% | 39–47% |
| 45-50% | 2,111 | 47.4% | 47.4% | 44–54% |
| 50-55% | 1,800 | 52.9% | 52.5% | 47–56% |
| 55-60% | 1,625 | 56.7% | 57.4% | 50–61% |
| 60-65% | 1,210 | 65.7% | 62.5% | 59–79% |
| 65-70% | 999 | 70.4% | 67.3% | 67–75% |
| 70-75% | 804 | 75.2% | 72.3% | 69–79% |
| 75-80% | 553 | 77.6% | 77.4% | 73–83% |
| 80-85% | 337 | 81.9% | 82.2% | 76–88% |
| 85%+ | 192 | 88.0% | 87.4% | 86–87% |

## Tenis

28,342 juegos (2024-01-01 a 2026-11-21, 3 temporadas). El favorito acertó **65.1%**.

| Franja | Juegos | Real | Decía | Años (peor–mejor) |
|---|---|---|---|---|
| 50-55% | 5,785 | 51.8% | 52.5% | 51–53% |
| 55-60% | 5,317 | 56.9% | 57.4% | 56–58% |
| 60-65% | 4,846 | 63.1% | 62.5% | 62–65% |
| 65-70% | 3,950 | 68.5% | 67.4% | 67–69% |
| 70-75% | 3,166 | 72.4% | 72.3% | 71–74% |
| 75-80% | 2,280 | 77.6% | 77.4% | 76–80% |
| 80-85% | 1,602 | 82.8% | 82.3% | 81–84% |
| 85%+ | 1,396 | 90.8% | 88.9% | 91–91% |

## Cómo se ve en la app

- **Veredicto → 📊 «Cuántas veces acierta este %»** (y el «de cada 100» de El análisis): `aciertos.js` usa esta historia cuando la zona tiene 120+ juegos (al día, con el rango por año); si no, su tabla fija de octubre. La línea 🏆 ya no la repite: habla solo de lo en vivo. (Corregido el mismo 22-nov: al principio la 🏆 la repetía con otro número que el 📊.)
- **Herramientas → 🏆 Liga**: columna 📚 en el mapa de confianza y una tabla plegable por franja en cada deporte.

No cambia ningún número ni pick de la app. MLB queda sin historia hasta tener líneas de cierre guardadas (temporada 2027).
