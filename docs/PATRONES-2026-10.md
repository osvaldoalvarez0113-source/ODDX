# Patrones contra el mercado: ¿alguno aguanta? (octubre 2026)

Osvaldo preguntó si los patrones estadísticos sirven y cómo meterlos en las apps. Esta es la prueba: **75 patrones** de los cinco deportes (descanso, back-to-back, rachas, rebote tras goleada, mes, día, tamaño de la línea, techado/clima…), escritos **antes** de mirar resultados, medidos contra el **precio de cierre**.

## Veredicto

- **Ningún patrón demuestra que se pueda ganar dinero.** De 75 solo 1 aguanta la corrección por tantas pruebas (Holm), y ese pierde su ventaja al pagar el margen de la casa (ROI +1.1% ± 3.2: indistinguible de 0).
- Con 75 pruebas se esperan ≈ 4 "significativos" solo por suerte; salieron 6. El control con banderas al azar da lo mismo (6% con p < 0.05): así se ve cuando no hay nada.
- **Lo que la creencia popular dice casi nunca pasa:** el rebote tras una goleada, «toca ganar» tras 3 derrotas, los equipos con racha que «se regulan», el empate tras empatar, los unders de viernes, la ventaja de la semana libre en la NFL. El precio ya lo descuenta o es ruido.
- Aunque un patrón dé +2 pts, el margen de la casa (≈ 4.5%) se lo come.

## Los únicos con algo de señal

- **NHL, total de 6 o más → Menos (el único que pasa Holm).** Pasó 53.6% contra 50.7% del precio (3,460 juegos, z = +3.5, a favor en 4 de 5 temporadas; casi todos son totales de 6.5). Pero el Menos paga 1.90 y el ROI es +1.1% ± 3.2: la casa ya cobra por eso, y en 2026 va 50%. Es un sesgo pequeño del mercado, no una apuesta.
- **NHL, visitante en back-to-back contra local descansado → gana el local.** 61.1% contra 57.0% (819 juegos, z = +2.4, a favor en las 5 temporadas). No pasa Holm (p = 0.017 entre 75 pruebas) y el ROI es +3.0% ± 6.1. Es lo que las apps ya muestran como «descanso».
- **NBA, abril → Más** (al revés de lo que se esperaba: el Menos falló en 5 de 6 temporadas, p = 0.010 sin corregir). Se encontró mirando, así que es una hipótesis, no un hallazgo.

Los tres quedan **en vigilancia**: cada vez que se corre se miden solo con juegos jugados desde el 26-oct-2026 (nunca usados para encontrarlos). Si alguno repite con juegos nuevos, entonces sí merece entrar a una app.

## Cómo se hizo

- Script: `scripts/medicion/patrones.py` (`python3 -I scripts/medicion/patrones.py CARPETA`, con los archivos de datos dentro). Workflow: **Patrones contra el mercado** (a mano o el día 1 de cada mes; deja el informe en la rama `resultados-patrones`).
- Datos: fútbol 10,734 partidos / 5 ligas / 6 temporadas con Pinnacle de cierre; NBA 7,293 con spread, total y moneyline; MLB 12,311 con precio y resultado; NHL 5,284 y NFL 1,913 con líneas de cierre de ESPN (se descartan las líneas incoherentes).
- Límites honestos: los archivos de NBA y MLB no traen equipos, así que ahí solo se probó calendario y tamaño de línea (no descanso ni rachas); fútbol no sabe de copas entre semana; los precios de NHL/NFL son de DraftKings vía ESPN, menos afilados que Pinnacle.
- Residuo = (lo que pasó) − (probabilidad del precio sin margen). El z usa la varianza que tendría si el precio fuera exacto. Holm sobre las 75 pruebas. ROI a la cuota real de la casa.

## Qué se hace con esto en las apps

1. **No se agrega ningún patrón como señal de apuesta.** Ninguno lo justifica.
2. **Los tres candidatos quedan en vigilancia automática** (workflow mensual). Si uno repite fuera de muestra con z ≥ 2 y ROI positivo, se propone como ajuste pequeño al total o al ganador de NHL o NBA.
3. El valor para las apps es **no creerse patrones falsos**: esta batería es la prueba que cualquier idea nueva tiene que pasar antes de tocar el modelo.

## Resultados completos

| Deporte | Patrón | Juegos | Pasó | Precio decía | Residuo | z | p | ROI ± 2·se | Temporadas a favor/contra | ¿Aguanta Holm? |
|---|---|---|---|---|---|---|---|---|---|---|
| Fútbol | Local mucho mas descansado (≥3 dias mas) → gana el local | 303 | 41.6% | 43.1% | -1.5 pts | -0.6 | 0.567 | -9.7% ± 14.9 | 2 / 4 de 6 | no |
| Fútbol | Visitante con poco descanso (≤3 dias) → gana el local | 964 | 39.5% | 41.9% | -2.4 pts | -1.6 | 0.102 | -11.9% ± 8.5 | 1 / 5 de 6 | no |
| Fútbol | Local con poco descanso (≤3 dias) → gana el visitante | 973 | 29.2% | 31.1% | -1.9 pts | -1.4 | 0.159 | -12.1% ± 11.4 | 2 / 4 de 6 | no |
| Fútbol | Local venia de perder por 3+ goles → "rebote" gana el local | 956 | 35.9% | 37.8% | -1.9 pts | -1.3 | 0.201 | -11.8% ± 8.9 | 3 / 3 de 6 | no |
| Fútbol | Visitante venia de perder por 3+ goles → "rebote" gana el visitante | 702 | 23.1% | 25.3% | -2.3 pts | -1.4 | 0.147 | -16.9% ± 14.7 | 1 / 5 de 6 | no |
| Fútbol | Local con racha de 3+ victorias → sigue ganando | 691 | 57.7% | 59.2% | -1.5 pts | -0.9 | 0.390 | -7.5% ± 6.9 | 3 / 3 de 6 | no |
| Fútbol | Visitante con racha de 3+ victorias → sigue ganando | 755 | 47.4% | 45.8% | +1.7 pts | +1.0 | 0.325 | -2.8% ± 9.2 | 4 / 2 de 6 | no |
| Fútbol | Local con 3+ derrotas seguidas → "toca ganar" | 692 | 32.5% | 33.2% | -0.6 pts | -0.4 | 0.707 | -5.0% ± 12.2 | 3 / 3 de 6 | no |
| Fútbol | Visitante con 3+ derrotas seguidas → "toca ganar" | 567 | 19.8% | 21.7% | -1.9 pts | -1.2 | 0.245 | -15.6% ± 16.9 | 3 / 3 de 6 | no |
| Fútbol | Mejor forma (ult. 5) local vs visitante por 6+ puntos → gana el local | 1166 | 63.3% | 63.6% | -0.3 pts | -0.2 | 0.814 | -3.9% ± 4.7 | 3 / 3 de 6 | no |
| Fútbol | Mejor forma (ult. 5) visitante vs local por 6+ puntos → gana el visitante | 1252 | 50.8% | 50.0% | +0.8 pts | +0.6 | 0.554 | -3.0% ± 6.0 | 4 / 2 de 6 | no |
| Fútbol | Los dos empataron su ultimo partido → empate | 669 | 24.1% | 25.6% | -1.6 pts | -0.9 | 0.353 | -7.4% ± 13.2 | 2 / 4 de 6 | no |
| Fútbol | Local veniá de partido con 4+ goles → Menos de 2.5 ("se regula") | 3241 | 45.6% | 45.3% | +0.3 pts | +0.4 | 0.701 | -2.8% ± 3.9 | 3 / 3 de 6 | no |
| Fútbol | Los dos venian de partidos con 4+ goles → Menos de 2.5 | 1009 | 44.1% | 43.3% | +0.8 pts | +0.5 | 0.618 | -1.6% ± 7.4 | 2 / 4 de 6 | no |
| Fútbol | Los dos venian de partidos de 0-1 goles → Mas de 2.5 ("se regula") | 581 | 48.5% | 48.6% | -0.1 pts | -0.0 | 0.969 | -3.0% ± 8.6 | 3 / 3 de 6 | no |
| Fútbol | Primeras 4 jornadas del equipo local → gana el local | 1159 | 42.0% | 43.3% | -1.3 pts | -1.0 | 0.328 | -11.1% ± 7.3 | 1 / 5 de 6 | no |
| Fútbol | Ultimas 5 jornadas (equipo local ≥34 jugados) → Menos de 2.5 | 847 | 45.0% | 45.1% | -0.1 pts | -0.1 | 0.931 | -3.3% ± 7.7 | 3 / 3 de 6 | no |
| Fútbol | Entre semana (mar-jue) → gana el local | 1182 | 43.0% | 43.4% | -0.5 pts | -0.4 | 0.722 | -7.3% ± 7.6 | 3 / 3 de 6 | no |
| Fútbol | Lunes o viernes → Menos de 2.5 | 1325 | 49.1% | 49.6% | -0.5 pts | -0.4 | 0.712 | -4.6% ± 5.6 | 1 / 5 de 6 | no |
| Fútbol | Favorito fuerte (precio ≥ 75%) → gana el favorito (el mercado "regala" a favoritos) | 721 | 80.0% | 80.3% | -0.3 pts | -0.2 | 0.846 | -3.7% ± 3.6 | 3 / 3 de 6 | no |
| Fútbol | Perro largo (precio ≤ 12%) → "siempre sorprende" (apostar al perro) | 1472 | 7.7% | 8.7% | -1.0 pts | -1.4 | 0.161 | -12.0% ± 16.8 | 2 / 4 de 6 | no |
| Fútbol | Empate cuando el precio dice parejo (empate ≥ 29%) | 2402 | 31.1% | 30.8% | +0.4 pts | +0.4 | 0.697 | -1.3% ± 6.0 | 3 / 3 de 6 | no |
| Fútbol | Diciembre-enero (calendario apretado) → Mas de 2.5 | 2250 | 52.3% | 52.0% | +0.3 pts | +0.3 | 0.790 | -2.3% ± 4.1 | 3 / 3 de 6 | no |
| NBA | Local favorito grande (linea ≤ -10) → cubre el local | 1014 | 49.9% | 50.0% | -0.1 pts | -0.1 | 0.950 | -4.7% ± 6.0 | 3 / 3 de 6 | no |
| NBA | Perro local grande (linea ≥ +8) → cubre el visitante favorito | 673 | 52.0% | 50.0% | +2.0 pts | +1.0 | 0.298 | -0.7% ± 7.4 | 4 / 1 de 6 | no |
| NBA | Linea cerrada (|linea| ≤ 2) → cubre el local | 1022 | 50.3% | 50.0% | +0.3 pts | +0.2 | 0.851 | -4.0% ± 6.0 | 4 / 2 de 6 | no |
| NBA | Total alto (≥ 235) → Mas | 1283 | 50.0% | 50.0% | -0.0 pts | -0.0 | 0.978 | -4.6% ± 5.3 | 4 / 2 de 6 | no |
| NBA | Total bajo (≤ 215) → Menos | 938 | 49.9% | 50.0% | -0.1 pts | -0.1 | 0.948 | -4.8% ± 6.2 | 4 / 2 de 6 | no |
| NBA | Octubre-noviembre (inicio de temporada) → Mas | 1105 | 49.3% | 50.0% | -0.7 pts | -0.5 | 0.652 | -5.8% ± 5.7 | 2 / 3 de 5 | no |
| NBA | Abril (equipos sin nada en juego) → Menos | 700 | 45.1% | 50.0% | -4.9 pts | -2.6 | 0.010 | -13.8% ± 7.2 | 1 / 5 de 6 | no |
| NBA | Viernes y sabado → cubre el local | 2209 | 48.7% | 50.0% | -1.3 pts | -1.3 | 0.209 | -7.1% ± 4.1 | 3 / 3 de 6 | no |
| NBA | Domingo → Mas | 1102 | 48.3% | 50.0% | -1.7 pts | -1.1 | 0.252 | -7.8% ± 5.7 | 2 / 4 de 6 | no |
| NBA | Playoffs → Menos | 496 | 51.8% | 50.0% | +1.8 pts | +0.8 | 0.419 | -1.1% ± 8.6 | 3 / 1 de 6 | no |
| NBA | Favorito pesado (linea ≥ 11) → gana el favorito (moneyline) | 1077 | 87.0% | 86.0% | +1.0 pts | +0.9 | 0.360 | -3.2% ± 2.3 | 5 / 1 de 6 | no |
| MLB | Perro largo (≤ 35%) → apostar al perro | 1690 | 29.1% | 31.1% | -2.1 pts | -1.8 | 0.068 | -10.6% ± 6.8 | 1 / 5 de 6 | no |
| MLB | Favorito fuerte (≥ 65%) → apostar al favorito | 1690 | 70.9% | 68.9% | +2.1 pts | +1.8 | 0.068 | -1.0% ± 3.1 | 5 / 1 de 6 | no |
| MLB | Local perro (local < 45%) → apostar al local | 2570 | 39.4% | 39.8% | -0.4 pts | -0.4 | 0.664 | -4.7% ± 4.7 | 3 / 3 de 6 | no |
| MLB | Local favorito (local ≥ 60%) → apostar al local | 2913 | 65.0% | 65.4% | -0.4 pts | -0.5 | 0.650 | -4.7% ± 2.6 | 2 / 4 de 6 | no |
| MLB | Abril → apostar al perro (el mercado aun no sabe quien es bueno) | 984 | 40.1% | 42.5% | -2.3 pts | -1.5 | 0.137 | -8.9% ± 7.2 | 1 / 5 de 6 | no |
| MLB | Septiembre → apostar al favorito (los malos se rinden) | 2227 | 59.1% | 58.8% | +0.3 pts | +0.3 | 0.750 | -3.7% ± 3.4 | 3 / 3 de 6 | no |
| MLB | Domingo → apostar al local | 2021 | 53.2% | 53.3% | -0.1 pts | -0.1 | 0.948 | -4.2% ± 4.1 | 3 / 3 de 6 | no |
| MLB | Viernes → apostar al visitante | 1986 | 47.1% | 46.6% | +0.5 pts | +0.4 | 0.672 | -3.7% ± 4.8 | 2 / 4 de 6 | no |
| MLB | Juego parejo (45-55%) → apostar al visitante | 4272 | 49.4% | 49.6% | -0.3 pts | -0.3 | 0.733 | -4.7% ± 3.0 | 4 / 2 de 6 | no |
| NHL | Visitante en back-to-back, local descansado → gana el local | 819 | 61.1% | 57.0% | +4.0 pts | +2.4 | 0.017 | +3.0% ± 6.1 | 5 / 0 de 5 | no |
| NHL | Local en back-to-back, visitante descansado → gana el visitante | 269 | 53.5% | 50.4% | +3.1 pts | +1.1 | 0.292 | +4.0% ± 12.8 | 3 / 1 de 4 | no |
| NHL | Visitante en back-to-back, local descansado → cubre el local (linea de gol) | 819 | 49.0% | 46.9% | +2.1 pts | +1.2 | 0.225 | +0.1% ± 7.6 | 4 / 1 de 5 | no |
| NHL | Visitante jugando su 3er juego en 4 noches → gana el local | 739 | 57.8% | 55.5% | +2.2 pts | +1.3 | 0.206 | -0.8% ± 6.6 | 4 / 0 de 4 | no |
| NHL | Equipo local venia de perder por 4+ goles → "rebote" gana el local | 442 | 49.8% | 49.9% | -0.1 pts | -0.1 | 0.953 | -3.4% ± 9.8 | 3 / 2 de 5 | no |
| NHL | Equipo visitante venia de perder por 4+ goles → "rebote" gana el visitante | 436 | 40.6% | 42.8% | -2.2 pts | -1.0 | 0.330 | -9.9% ± 11.0 | 2 / 2 de 4 | no |
| NHL | Local con racha de 4+ victorias → apostar contra el local (se regula) | 327 | 41.9% | 41.0% | +0.9 pts | +0.3 | 0.728 | -2.2% ± 13.5 | 2 / 2 de 4 | no |
| NHL | Local con 4+ derrotas seguidas → "toca ganar" | 362 | 49.4% | 47.2% | +2.3 pts | +0.9 | 0.374 | -1.9% ± 11.1 | 3 / 1 de 4 | no |
| NHL | Local venia de juego que se fue a OT/shootout (cansado) → gana el visitante | 1187 | 46.2% | 46.5% | -0.3 pts | -0.2 | 0.807 | -5.1% ± 6.4 | 3 / 2 de 5 | no |
| NHL | Los dos venian de partidos de 8+ goles → Menos | 366 | 49.7% | 49.4% | +0.4 pts | +0.1 | 0.886 | -4.1% ± 10.1 | 3 / 2 de 5 | no |
| NHL | Los dos venian de partidos de 4 goles o menos → Mas | 250 | 46.0% | 49.9% | -3.9 pts | -1.2 | 0.220 | -12.1% ± 12.1 | 1 / 3 de 4 | no |
| NHL | Total de 6+ → Menos | 3460 | 53.6% | 50.7% | +3.0 pts | +3.5 | 0.000 | +1.1% ± 3.2 | 4 / 1 de 5 | SÍ |
| NHL | Total de 5.5 o menos → Mas | 1788 | 51.5% | 52.3% | -0.8 pts | -0.7 | 0.483 | -5.6% ± 4.3 | 1 / 4 de 5 | no |
| NHL | Inicio de temporada (primeros 8 juegos del local) → Mas | 628 | 47.1% | 50.5% | -3.3 pts | -1.7 | 0.095 | -10.6% ± 7.6 | 0 / 5 de 5 | no |
| NHL | Fin de semana (sab-dom) → Menos | 1810 | 52.4% | 49.6% | +2.8 pts | +2.4 | 0.018 | +0.9% ± 4.5 | 4 / 1 de 5 | no |
| NHL | Perro grande (precio local o visitante ≤ 35%) → apostar al perro | 1204 | 27.8% | 29.9% | -2.0 pts | -1.5 | 0.123 | -11.3% ± 8.3 | 2 / 3 de 5 | no |
| NFL | Local sale de la semana libre (≥ 13 dias), visitante normal → gana el local | 83 | 63.9% | 60.1% | +3.7 pts | +0.8 | 0.449 | -0.1% ± 20.0 | 1 / 0 de 1 | no |
| NFL | Visitante sale de la semana libre (≥ 13 dias) → gana el visitante | 90 | 47.8% | 45.9% | +1.9 pts | +0.4 | 0.698 | +4.7% ± 28.5 | 0 / 1 de 1 | no |
| NFL | Local venia de perder por 14+ → "rebote" cubre el local | 314 | 51.3% | 49.9% | +1.4 pts | +0.5 | 0.619 | -1.9% ± 10.8 | 4 / 3 de 7 | no |
| NFL | Visitante venia de perder por 14+ → "rebote" cubre el visitante | 288 | 50.3% | 50.1% | +0.3 pts | +0.1 | 0.923 | -4.1% ± 11.3 | 3 / 4 de 7 | no |
| NFL | Local venia de ganar por 21+ → "se confia", cubre el visitante | 139 | 54.0% | 50.0% | +3.9 pts | +0.9 | 0.352 | +3.0% ± 16.2 | 3 / 3 de 6 | no |
| NFL | Visitante venia de ganar por 21+ → "se confia", cubre el local | 162 | 49.4% | 50.2% | -0.8 pts | -0.2 | 0.841 | -6.4% ± 14.9 | 3 / 4 de 7 | no |
| NFL | Local con racha de 3+ victorias → cubre el visitante (se regula) | 259 | 51.4% | 50.1% | +1.3 pts | +0.4 | 0.686 | -2.1% ± 11.9 | 4 / 3 de 7 | no |
| NFL | Local con 3+ derrotas seguidas → cubre el local ("toca") | 257 | 52.9% | 49.8% | +3.1 pts | +1.0 | 0.314 | +1.5% ± 12.0 | 6 / 1 de 7 | no |
| NFL | Jueves → Menos | 129 | 51.2% | 50.2% | +0.9 pts | +0.2 | 0.830 | -2.8% ± 16.8 | 2 / 3 de 5 | no |
| NFL | Domingo noche / lunes (prime time) → Mas | 262 | 42.0% | 49.7% | -7.8 pts | -2.5 | 0.012 | -19.4% ± 11.8 | 2 / 5 de 7 | no |
| NFL | Estadio techado → Mas | 522 | 54.0% | 49.7% | +4.3 pts | +2.0 | 0.049 | +3.7% ± 8.5 | 7 / 1 de 8 | no |
| NFL | Semana 14 o mas (frio, clima) → Menos | 370 | 47.8% | 50.0% | -2.2 pts | -0.8 | 0.406 | -8.5% ± 9.9 | 2 / 5 de 7 | no |
| NFL | Total de 50 o mas → Menos | 288 | 50.0% | 49.7% | +0.3 pts | +0.1 | 0.923 | -3.4% ± 11.7 | 4 / 3 de 7 | no |
| NFL | Total de 40 o menos → Mas | 247 | 46.6% | 48.9% | -2.3 pts | -0.7 | 0.459 | -9.6% ± 12.5 | 2 / 3 de 5 | no |
| NFL | Local perro de 3+ puntos → apostar al local con la linea | 531 | 51.6% | 50.1% | +1.5 pts | +0.7 | 0.478 | -1.7% ± 8.3 | 5 / 3 de 8 | no |
| NFL | Favorito de 10+ puntos → cubre el favorito | 220 | 51.4% | 49.9% | +1.4 pts | +0.4 | 0.672 | -1.8% ± 12.9 | 4 / 3 de 7 | no |

**Resultado:** 6 de 75 patrones salen con p < 0.05 sin corregir (con 75 pruebas se esperan ≈ 3.8 solo por suerte). Después de corregir por tantas pruebas (Holm): **1**.

**Control con banderas al azar:** de 300 "patrones" inventados al tirar la moneda, 18 (6.0%) salieron con p < 0.05 y 8 con p < 0.01. Es lo esperado (5% y 1%): eso es lo que se ve cuando NO hay nada.

## En vigilancia (solo juegos jugados desde el 26-oct-2026, fuera de la muestra donde se encontraron)

Un patrón solo "se gana" un lugar en las apps si repite en juegos que no se usaron para encontrarlo. Estos tres son los únicos con algo de señal; cada vez que se vuelve a correr se miden solo con juegos nuevos.

| Deporte | Patrón | Por qué se vigila | Juegos nuevos | Pasó | Precio decía | z | ROI |
|---|---|---|---|---|---|---|---|
| NHL | Total de 6 o más → Menos | El único patrón que pasó Holm (+2.9 pts sobre el precio, pero el Menos paga menos y el ROI es +1% ± 3) | 0 | — | — | — | — |
| NHL | Visitante en back-to-back, local descansado → gana el local | Dio a favor en las 5 temporadas (+4 pts) pero sin pasar Holm | 0 | — | — | — | — |
| NBA | Abril → Mas | Al revés de lo que se creía: el Menos de abril falló en 5 de 6 temporadas (p = 0.010 sin corregir) | 0 | — | — | — | — |
