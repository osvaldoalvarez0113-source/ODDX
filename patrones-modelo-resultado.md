# Patrones contra EL MODELO: ¿alguno lo nutre? (noviembre 2026)

Los mismos **74 patrones** de `docs/PATRONES-2026-10.md`, pero la referencia ya no es el precio de la casa: es lo que dijo el modelo de cada app, sin mirar el mercado (calibrado con las otras temporadas).
Diferencia = (lo que pasó) − (lo que el modelo decía). Si no es 0 y se repite por temporada, el modelo no está leyendo ese dato y sumarlo lo hace acertar más.

| Deporte | Patrón | Juegos | Pasó | El modelo decía | Diferencia | z | p | Temporadas a favor/contra | ¿Aguanta Holm? |
|---|---|---|---|---|---|---|---|---|---|
| Fútbol | Local mucho mas descansado (≥3 dias mas) → gana el local | 303 | 41.6% | 42.4% | -0.9 pts | -0.3 | 0.7475 | 2 / 4 de 6 | no |
| Fútbol | Visitante con poco descanso (≤3 dias) → gana el local | 964 | 39.5% | 41.7% | -2.2 pts | -1.5 | 0.1418 | 1 / 5 de 6 | no |
| Fútbol | Local con poco descanso (≤3 dias) → gana el visitante | 973 | 29.2% | 31.2% | -2.0 pts | -1.4 | 0.1617 | 3 / 3 de 6 | no |
| Fútbol | Local venia de perder por 3+ goles → "rebote" gana el local | 956 | 35.9% | 36.5% | -0.6 pts | -0.4 | 0.6640 | 3 / 3 de 6 | no |
| Fútbol | Visitante venia de perder por 3+ goles → "rebote" gana el visitante | 702 | 23.1% | 24.7% | -1.6 pts | -1.0 | 0.2989 | 1 / 5 de 6 | no |
| Fútbol | Local con racha de 3+ victorias → sigue ganando | 691 | 57.7% | 57.7% | +0.0 pts | +0.0 | 0.9894 | 3 / 3 de 6 | no |
| Fútbol | Visitante con racha de 3+ victorias → sigue ganando | 755 | 47.4% | 44.1% | +3.3 pts | +1.9 | 0.0522 | 5 / 1 de 6 | no |
| Fútbol | Local con 3+ derrotas seguidas → "toca ganar" | 692 | 32.5% | 32.6% | -0.1 pts | -0.1 | 0.9477 | 3 / 3 de 6 | no |
| Fútbol | Visitante con 3+ derrotas seguidas → "toca ganar" | 567 | 19.8% | 21.8% | -2.0 pts | -1.2 | 0.2301 | 3 / 3 de 6 | no |
| Fútbol | Mejor forma (ult. 5) local vs visitante por 6+ puntos → gana el local | 1166 | 63.3% | 61.9% | +1.3 pts | +1.0 | 0.3249 | 5 / 1 de 6 | no |
| Fútbol | Mejor forma (ult. 5) visitante vs local por 6+ puntos → gana el visitante | 1252 | 50.8% | 49.0% | +1.8 pts | +1.3 | 0.1799 | 4 / 2 de 6 | no |
| Fútbol | Los dos empataron su ultimo partido → empate | 669 | 24.1% | 26.1% | -2.0 pts | -1.2 | 0.2343 | 2 / 4 de 6 | no |
| Fútbol | Local veniá de partido con 4+ goles → Menos de 2.5 ("se regula") | 3241 | 45.6% | 45.6% | +0.0 pts | +0.0 | 0.9625 | 3 / 3 de 6 | no |
| Fútbol | Los dos venian de partidos con 4+ goles → Menos de 2.5 | 1009 | 44.1% | 44.4% | -0.3 pts | -0.2 | 0.8621 | 2 / 4 de 6 | no |
| Fútbol | Los dos venian de partidos de 0-1 goles → Mas de 2.5 ("se regula") | 581 | 48.5% | 50.5% | -2.0 pts | -1.0 | 0.3327 | 2 / 4 de 6 | no |
| Fútbol | Primeras 4 jornadas del equipo local → gana el local | 1157 | 42.1% | 42.3% | -0.2 pts | -0.1 | 0.9024 | 2 / 4 de 6 | no |
| Fútbol | Ultimas 5 jornadas (equipo local ≥34 jugados) → Menos de 2.5 | 847 | 45.0% | 48.3% | -3.3 pts | -1.9 | 0.0545 | 2 / 4 de 6 | no |
| Fútbol | Entre semana (mar-jue) → gana el local | 1182 | 43.0% | 42.8% | +0.2 pts | +0.1 | 0.8875 | 3 / 3 de 6 | no |
| Fútbol | Lunes o viernes → Menos de 2.5 | 1325 | 49.1% | 47.7% | +1.3 pts | +1.0 | 0.3364 | 5 / 1 de 6 | no |
| Fútbol | Favorito fuerte (precio ≥ 75%) → gana el favorito (el mercado "regala" a favoritos) | 721 | 80.0% | 68.6% | +11.4 pts | +6.8 | 0.0000 | 6 / 0 de 6 | SÍ |
| Fútbol | Perro largo (precio ≤ 12%) → "siempre sorprende" (apostar al perro) | 1472 | 7.7% | 14.8% | -7.1 pts | -7.8 | 0.0000 | 0 / 6 de 6 | SÍ |
| Fútbol | Empate cuando el precio dice parejo (empate ≥ 29%) | 2401 | 31.2% | 28.8% | +2.4 pts | +2.6 | 0.0096 | 5 / 1 de 6 | no |
| Fútbol | Diciembre-enero (calendario apretado) → Mas de 2.5 | 2250 | 52.3% | 53.2% | -1.0 pts | -0.9 | 0.3510 | 3 / 3 de 6 | no |
| NBA | Local favorito grande (linea ≤ -10) → cubre el local | 1014 | 49.9% | 50.2% | -0.3 pts | -0.2 | 0.8414 | 3 / 3 de 6 | no |
| NBA | Perro local grande (linea ≥ +8) → cubre el visitante favorito | 673 | 52.0% | 50.4% | +1.6 pts | +0.8 | 0.3958 | 4 / 2 de 6 | no |
| NBA | Linea cerrada (|linea| ≤ 2) → cubre el local | 1022 | 50.3% | 50.0% | +0.3 pts | +0.2 | 0.8312 | 4 / 2 de 6 | no |
| NBA | Total alto (≥ 235) → Mas | 1283 | 50.0% | 50.8% | -0.9 pts | -0.6 | 0.5362 | 4 / 2 de 6 | no |
| NBA | Total bajo (≤ 215) → Menos | 938 | 49.9% | 49.7% | +0.1 pts | +0.1 | 0.9283 | 4 / 2 de 6 | no |
| NBA | Octubre-noviembre (inicio de temporada) → Mas | 1105 | 49.3% | 50.5% | -1.2 pts | -0.8 | 0.4142 | 2 / 3 de 5 | no |
| NBA | Abril (equipos sin nada en juego) → Menos | 700 | 45.1% | 49.7% | -4.6 pts | -2.4 | 0.0157 | 1 / 5 de 6 | no |
| NBA | Viernes y sabado → cubre el local | 2209 | 48.7% | 50.0% | -1.4 pts | -1.3 | 0.2038 | 3 / 3 de 6 | no |
| NBA | Domingo → Mas | 1102 | 48.3% | 50.4% | -2.2 pts | -1.4 | 0.1515 | 2 / 4 de 6 | no |
| NBA | Playoffs → Menos | 496 | 51.8% | 50.1% | +1.7 pts | +0.8 | 0.4395 | 3 / 3 de 6 | no |
| NBA | Favorito pesado (linea ≥ 11) → gana el favorito (moneyline) | 1077 | 87.0% | 79.6% | +7.4 pts | +6.2 | 0.0000 | 6 / 0 de 6 | SÍ |
| MLB | Perro largo (≤ 35%) → apostar al perro | 1690 | 29.1% | 38.6% | -9.5 pts | -8.1 | 0.0000 | 0 / 6 de 6 | SÍ |
| MLB | Favorito fuerte (≥ 65%) → apostar al favorito | 1690 | 70.9% | 61.4% | +9.5 pts | +8.1 | 0.0000 | 6 / 0 de 6 | SÍ |
| MLB | Local perro (local < 45%) → apostar al local | 2570 | 39.4% | 45.9% | -6.5 pts | -6.6 | 0.0000 | 0 / 6 de 6 | SÍ |
| MLB | Local favorito (local ≥ 60%) → apostar al local | 2913 | 65.0% | 59.8% | +5.2 pts | +5.7 | 0.0000 | 6 / 0 de 6 | SÍ |
| MLB | Abril → apostar al perro (el mercado aun no sabe quien es bueno) | 984 | 40.1% | 45.5% | -5.3 pts | -3.4 | 0.0007 | 0 / 6 de 6 | SÍ |
| MLB | Septiembre → apostar al favorito (los malos se rinden) | 2227 | 59.1% | 55.0% | +4.1 pts | +3.9 | 0.0001 | 6 / 0 de 6 | SÍ |
| MLB | Domingo → apostar al local | 2021 | 53.2% | 53.1% | +0.1 pts | +0.1 | 0.9242 | 3 / 3 de 6 | no |
| MLB | Viernes → apostar al visitante | 1986 | 47.1% | 46.7% | +0.4 pts | +0.3 | 0.7323 | 2 / 4 de 6 | no |
| MLB | Juego parejo (45-55%) → apostar al visitante | 4272 | 49.4% | 48.4% | +1.0 pts | +1.3 | 0.1970 | 4 / 2 de 6 | no |
| NHL | Visitante en back-to-back, local descansado → gana el local | 707 | 60.0% | 56.2% | +3.8 pts | +2.1 | 0.0384 | 4 / 0 de 4 | no |
| NHL | Local en back-to-back, visitante descansado → gana el visitante | 242 | 53.7% | 49.6% | +4.1 pts | +1.3 | 0.1902 | 3 / 1 de 4 | no |
| NHL | Visitante en back-to-back, local descansado → cubre el local (linea de gol) | 707 | 47.7% | 45.9% | +1.8 pts | +1.0 | 0.3294 | 4 / 0 de 4 | no |
| NHL | Visitante jugando su 3er juego en 4 noches → gana el local | 656 | 57.5% | 54.8% | +2.7 pts | +1.4 | 0.1559 | 4 / 0 de 4 | no |
| NHL | Equipo local venia de perder por 4+ goles → "rebote" gana el local | 389 | 51.2% | 49.8% | +1.4 pts | +0.6 | 0.5755 | 2 / 2 de 4 | no |
| NHL | Equipo visitante venia de perder por 4+ goles → "rebote" gana el visitante | 385 | 41.8% | 43.2% | -1.3 pts | -0.5 | 0.5842 | 1 / 3 de 4 | no |
| NHL | Local con racha de 4+ victorias → apostar contra el local (se regula) | 298 | 41.6% | 40.7% | +1.0 pts | +0.3 | 0.7299 | 3 / 1 de 4 | no |
| NHL | Local con 4+ derrotas seguidas → "toca ganar" | 318 | 50.0% | 46.8% | +3.2 pts | +1.2 | 0.2404 | 2 / 2 de 4 | no |
| NHL | Local venia de juego que se fue a OT/shootout (cansado) → gana el visitante | 1047 | 46.2% | 46.5% | -0.3 pts | -0.2 | 0.8495 | 2 / 2 de 4 | no |
| NHL | Los dos venian de partidos de 8+ goles → Menos | 311 | 48.2% | 52.0% | -3.8 pts | -1.3 | 0.1842 | 1 / 3 de 4 | no |
| NHL | Los dos venian de partidos de 4 goles o menos → Mas | 225 | 45.3% | 47.6% | -2.2 pts | -0.7 | 0.5038 | 1 / 3 de 4 | no |
| NHL | Total de 6+ → Menos | 2906 | 54.0% | 53.5% | +0.5 pts | +0.6 | 0.5594 | 3 / 2 de 5 | no |
| NHL | Total de 5.5 o menos → Mas | 1556 | 51.5% | 50.3% | +1.3 pts | +1.0 | 0.3217 | 3 / 1 de 4 | no |
| NHL | Fin de semana (sab-dom) → Menos | 1543 | 52.8% | 52.2% | +0.6 pts | +0.5 | 0.6314 | 3 / 1 de 4 | no |
| NHL | Perro grande (precio local o visitante ≤ 35%) → apostar al perro | 1038 | 27.4% | 31.2% | -3.8 pts | -2.7 | 0.0076 | 0 / 4 de 4 | no |
| NFL | Local sale de la semana libre (≥ 13 dias), visitante normal → gana el local | 85 | 64.7% | 56.5% | +8.2 pts | +1.6 | 0.1088 | 1 / 0 de 1 | no |
| NFL | Visitante sale de la semana libre (≥ 13 dias) → gana el visitante | 92 | 48.9% | 46.3% | +2.6 pts | +0.5 | 0.6060 | 0 / 1 de 1 | no |
| NFL | Local venia de perder por 14+ → "rebote" cubre el local | 274 | 51.5% | 48.9% | +2.5 pts | +0.8 | 0.4006 | 5 / 2 de 7 | no |
| NFL | Visitante venia de perder por 14+ → "rebote" cubre el visitante | 250 | 48.0% | 51.1% | -3.1 pts | -1.0 | 0.3296 | 3 / 4 de 7 | no |
| NFL | Local venia de ganar por 21+ → "se confia", cubre el visitante | 121 | 52.1% | 51.0% | +1.0 pts | +0.2 | 0.8212 | 3 / 3 de 6 | no |
| NFL | Visitante venia de ganar por 21+ → "se confia", cubre el local | 145 | 48.3% | 49.2% | -0.9 pts | -0.2 | 0.8313 | 2 / 4 de 6 | no |
| NFL | Local con racha de 3+ victorias → cubre el visitante (se regula) | 260 | 51.5% | 51.0% | +0.5 pts | +0.2 | 0.8638 | 4 / 3 de 7 | no |
| NFL | Local con 3+ derrotas seguidas → cubre el local ("toca") | 259 | 52.5% | 48.8% | +3.7 pts | +1.2 | 0.2324 | 7 / 0 de 7 | no |
| NFL | Jueves → Menos | 109 | 50.5% | 50.3% | +0.1 pts | +0.0 | 0.9754 | 2 / 3 de 5 | no |
| NFL | Domingo noche / lunes (prime time) → Mas | 213 | 42.3% | 49.8% | -7.6 pts | -2.2 | 0.0272 | 2 / 5 de 7 | no |
| NFL | Estadio techado → Mas | 431 | 54.8% | 50.1% | +4.6 pts | +1.9 | 0.0535 | 7 / 1 de 8 | no |
| NFL | Semana 14 o mas (frio, clima) → Menos | 370 | 47.8% | 50.9% | -3.0 pts | -1.2 | 0.2433 | 2 / 5 de 7 | no |
| NFL | Total de 50 o mas → Menos | 231 | 50.6% | 48.3% | +2.3 pts | +0.7 | 0.4808 | 3 / 3 de 6 | no |
| NFL | Total de 40 o menos → Mas | 215 | 47.9% | 47.9% | +0.0 pts | +0.0 | 0.9890 | 3 / 2 de 5 | no |
| NFL | Local perro de 3+ puntos → apostar al local con la linea | 449 | 51.7% | 48.6% | +3.1 pts | +1.3 | 0.1882 | 5 / 3 de 8 | no |
| NFL | Favorito de 10+ puntos → cubre el favorito | 200 | 50.0% | 50.0% | -0.0 pts | -0.0 | 0.9931 | 4 / 3 de 7 | no |

**Resultado:** 14 de 74 con p < 0.05 sin corregir (se esperan ≈ 3.7 por suerte). Después de Holm: **9**.

**Control con banderas al azar (fútbol, contra el modelo):** 10 de 300 (3.3%) con p < 0.05 y 1 con p < 0.01; desviación de z 0.97 (1.00 = el modelo calibrado se comporta como debe).
