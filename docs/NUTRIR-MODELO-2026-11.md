# Nutrir el modelo: todo medido en aciertos y contra el modelo (16-nov-2026)

Pedido de Osvaldo: dejar de medir contra lo que cobra la casa. La pregunta ya no es «¿se le gana al precio?» sino
**«¿con este dato el modelo acierta más?»**. Un dato puede no decirle nada nuevo al precio y aun así mejorar el modelo.

Cómo se midió: la referencia es lo que dijo el modelo de cada app sin mirar el mercado. Todo ajuste se elige con unas
temporadas y se prueba en la que quedó afuera. Se cuenta en aciertos y en error; no hay ROI ni cuotas en este documento.

## Lo que entró a las apps

| Cambio | App | Antes | Ahora | Prueba |
|---|---|---|---|---|
| Mezcla con el pronóstico público de ESPN (BPI), peso 0.70 | NBA | acierta 65.8% | **67.2%** | 6,748 juegos, +95 aciertos, z 3.5; mejora en las 6 temporadas |
| Mezcla con el pronóstico público de ESPN (FPI), peso 0.80 | NFL | acierta 63.9% | **65.2%** | 1,591 juegos, +20 aciertos (z 1.4 en aciertos, z −2.8 en pérdida) |
| Viento y techo en el total del modelo | NFL | error del total 10.84 pts | **10.70 pts** | 1,501 juegos, z −2.5; lado Más/Menos 49.2% → 51.7% (+37) |

- **NBA y NFL (`publico.js`).** La app pide a ESPN el pronóstico de cada juego que no ha empezado, lo guarda en el teléfono y lo mezcla
  con el modelo en logit. La mezcla se pasa a margen, que también mejora (NBA: error del margen 10.94 → 10.74 pts, z −6.4). El Veredicto
  muestra «Modelo + ESPN» y una línea con los tres números. Si ESPN no responde, sigue el modelo solo. Cuando chocan, ESPN acierta más
  que el modelo (NBA: 54.0% contra 46.0% en 1,040 juegos).
- **NFL, viento (`modelo-nfl.js` → `ajusteClima`).** Cada mph de viento a la hora del juego quita 0.38 puntos al total (z −4.5, mismo
  signo en las 8 temporadas). Bajo techo se anota como al aire libre sin viento (+2.6 puntos sobre el promedio). Contra la línea este
  mismo dato se había medido en −0.21 por mph: contra el modelo es casi el doble, porque la línea ya lo traía y el modelo no.
  Lluvia (z −1.2 fuera de muestra), temperatura (z −0.8) y frío no pasaron.
- Límite: ESPN marca sus pronósticos viejos como modificados al cierre de temporada, así que no se puede comprobar que el número
  guardado sea exactamente el de antes del juego. La app solo usa el de antes de empezar.

Con precio del mercado, las apps siguen usando 95% mercado y 5% modelo. Lo que cambia es la columna del modelo, el pick del modelo en
el registro automático, la alerta cuando el modelo se separa (habrá menos, porque ahora queda más cerca) y los juegos sin precio.

## Los 75 patrones, ahora contra el modelo

`OVA_CONTRA=modelo python3 -I scripts/medicion/patrones.py CARPETA` (74 con datos suficientes). La probabilidad del modelo se calibra
con las otras temporadas antes de medir, para que un patrón no salga solo porque el modelo en general exagera.

Contra el precio pasaba 1 de 75. Contra el modelo pasan 9, y los 9 dicen lo mismo:

- **Lo que más le falta al modelo es el propio porcentaje del mercado.** Cuando el precio marca un favorito fuerte, gana bastante más
  de lo que el modelo cree: MLB +9.5 pts (favorito ≥ 65%), fútbol +11.4 (≥ 75%), NBA +7.4 (línea ≥ 11), en las 6 temporadas.
  Por eso las apps mezclan con el mercado. «Abril → perro» y «septiembre → favorito» en MLB son el mismo efecto, no el mes.
- **Patrones de situación (descanso, rachas, rebote, calendario): ninguno pasa la corrección por tantas pruebas.** Los que quedaron cerca:

| Deporte | Patrón | Diferencia con el modelo | z | Temporadas | Qué se hizo |
|---|---|---|---|---|---|
| NHL | Visitante en back-to-back, local descansado → gana el local | +3.8 pts | +2.1 | 4 / 0 | El modelo ya lo suma (R = 0.25 goles) y con eso acierta más (58.71% → 59.03%). Subirlo a 0.45 no da aciertos (−6 en 4,730). Se queda. |
| NFL | Domingo noche / lunes → Más | −7.6 pts (sale Menos) | −2.2 | 2 / 5 | Como ajuste al total: −2.3 puntos, error 10.91 → 10.60 (z −2.3). Se encontró mirando: **en vigilancia**. |
| NFL | Estadio techado → Más | +4.6 pts | +1.9 | 7 / 1 | Entró junto con el viento (arriba). |
| NBA | Abril → Menos | −4.6 pts (sale Más) | −2.4 | 1 / 5 | Sumarle puntos al total en abril no baja el error (z +0.7). No entra. |
| Fútbol | Visitante con racha de 3+ victorias → sigue ganando | +3.3 pts | +1.9 | 5 / 1 | **En vigilancia.** |

Los tips populares siguen sin cumplirse también contra el modelo: rebote tras goleada, «toca ganar», rachas que se regulan.

### Tabla completa

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

## Las props, ahora contra el modelo

`OVA_CONTRA=modelo python3 -I scripts/medicion/props.py CARPETA`. La referencia de cada prop sale del total y el favorito **del modelo**.
Se volvieron a correr 34 de los 47 patrones: los 13 de MLB quedan fuera porque sus archivos no traen el total del modelo.
Ninguno pasa Holm; salieron 6 con p < 0.05 (se esperan 2). Los que se repiten todas las temporadas quedan como candidatos para
`periodos.js` y la app de fútbol, sin aplicar todavía:

| Deporte | Prop | Cuándo | Diferencia | z | Temporadas |
|---|---|---|---|---|---|
| NBA | El favorito gana el 1er cuarto | Favorito del modelo ≥ 75% | +3.9 pts | +3.0 | 5 / 0 |
| NBA | La 1a mitad tiene más de la mitad de los puntos | Total del modelo ≥ 235 | −4.1 pts | −3.0 | 0 / 5 |
| Fútbol | Gol en el 1er tiempo | Bundesliga | +3.6 pts | +3.2 | 5 / 0 |
| Fútbol | Gol en el 1er tiempo | La Liga | −3.2 pts | −3.1 | 0 / 5 |
| Fútbol | Gol en el 1er tiempo | Más de 2.5 del modelo ≥ 60% | +3.0 pts | +3.0 | 5 / 0 |

### Tabla completa

| Deporte | Proposición | Patrón | Lado | Juegos | Pasó | Esperado | Residuo | z | p | Temporadas a favor/contra | ¿Aguanta Holm? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Liga: Bundesliga | SÍ | 1,529 | 77.2% | 73.6% | +3.6 pts | +3.2 | 0.002 | 5 / 0 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Liga: La Liga | SÍ | 1,900 | 67.3% | 70.5% | -3.2 pts | -3.1 | 0.002 | 0 / 5 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Total alto (Más de 2.5 ≥ 60% en el cierre) | SÍ | 1,886 | 77.4% | 74.3% | +3.0 pts | +3.0 | 0.003 | 5 / 0 | no |
| 🏀 NBA | La 1a mitad tiene más de la mitad de los puntos | Total alto (235 o más) | SÍ | 1,280 | 50.7% | 54.9% | -4.1 pts | -3.0 | 0.003 | 0 / 5 | no |
| 🏀 NBA | El favorito gana el 1er cuarto (sin empates) | Favorito fuerte (≥ 75%) | SÍ | 1,283 | 70.6% | 66.7% | +3.9 pts | +3.0 | 0.003 | 5 / 0 | no |
| 🏒 NHL | Empate a los 60 minutos | Partido parejo (favorito ≤ 55%) | SÍ | 1,020 | 21.4% | 24.9% | -3.5 pts | -2.6 | 0.009 | 1 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Liga: Bundesliga | SÍ | 1,529 | 60.1% | 57.7% | +2.5 pts | +1.9 | 0.052 | 4 / 1 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | El 2º tiempo tiene más goles que el 1º | Siempre (¿el 2º tiempo da más goles de lo que se cree?) | SÍ | 8,907 | 44.4% | 43.5% | +0.9 pts | +1.8 | 0.073 | 3 / 2 | no |
| 🏒 NHL | El favorito gana en los 60 minutos | Visitante en back-to-back y local descansado | SÍ | 378 | 53.2% | 49.2% | +4.0 pts | +1.6 | 0.116 | 3 / 0 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Liga: Premier | SÍ | 1,900 | 73.6% | 72.0% | +1.6 pts | +1.6 | 0.120 | 4 / 1 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Empate al descanso | Partido parejo (ningún favorito pasa de 40%) | SÍ | 1,550 | 44.5% | 42.7% | +1.7 pts | +1.4 | 0.170 | 4 / 1 | no |
| 🏒 NHL | Ambos anotan (en los 60 min) | Favorito fuerte (≥ 68%) (→ NO) | NO | 599 | 11.4% | 13.2% | -1.9 pts | -1.3 | 0.178 | 0 / 3 | no |
| 🏀 NBA | La 1a mitad tiene más de la mitad de los puntos | Favorito fuerte (≥ 80%) (→ NO: la 2a mitad se afloja) | NO | 782 | 45.8% | 43.6% | +2.2 pts | +1.2 | 0.219 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Liga: Serie A | SÍ | 1,900 | 51.4% | 52.8% | -1.4 pts | -1.2 | 0.225 | 2 / 3 | no |
| 🏈 NFL | Ambos anotan en la 1a mitad | Favorito fuerte (≥ 75%) (→ NO) | NO | 182 | 19.8% | 16.7% | +3.1 pts | +1.1 | 0.261 | 3 / 1 | no |
| 🏀 NBA | El favorito gana la 1a mitad (sin empates) | Favorito en back-to-back y el otro descansado (→ NO) | NO | 592 | 41.6% | 39.3% | +2.2 pts | +1.1 | 0.264 | 4 / 1 | no |
| 🏀 NBA | El local gana el 1er cuarto | Visitante en back-to-back y local descansado | SÍ | 816 | 52.5% | 50.7% | +1.8 pts | +1.0 | 0.304 | 4 / 1 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Los dos con «ambos anotan» en 4+ de sus últimos 5 | SÍ | 524 | 58.4% | 56.6% | +1.8 pts | +0.8 | 0.400 | 5 / 0 | no |
| 🏀 NBA | El favorito gana la 1a mitad (sin empates) | Favorito fuerte (≥ 75%) | SÍ | 1,320 | 74.3% | 73.3% | +1.0 pts | +0.8 | 0.416 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Los dos con 1er tiempo sin goles en 3+ de sus últimos 5 (→ NO) | NO | 173 | 32.4% | 29.7% | +2.7 pts | +0.8 | 0.440 | 4 / 1 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Total bajo (Más de 2.5 ≤ 42% en el cierre) (→ NO) | NO | 635 | 34.2% | 32.8% | +1.4 pts | +0.8 | 0.448 | 4 / 1 | no |
| 🏈 NFL | Hay puntos en el 1er cuarto | Total 47 o más | SÍ | 327 | 93.0% | 93.9% | -0.9 pts | -0.7 | 0.482 | 2 / 3 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Liga: La Liga | SÍ | 1,900 | 51.8% | 52.6% | -0.8 pts | -0.7 | 0.497 | 2 / 3 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Los dos con gol en el 1er tiempo en 4+ de sus últimos 5 | SÍ | 2,467 | 73.0% | 72.5% | +0.6 pts | +0.7 | 0.512 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Liga: Serie A | SÍ | 1,900 | 69.9% | 70.5% | -0.6 pts | -0.6 | 0.559 | 2 / 3 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | El favorito gana el 1er tiempo | Favorito fuerte (≥ 65%) | SÍ | 1,214 | 52.5% | 51.7% | +0.8 pts | +0.6 | 0.576 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Los dos con «ambos anotan» en 1 o 0 de sus últimos 5 (→ NO) | NO | 168 | 50.6% | 48.4% | +2.1 pts | +0.6 | 0.577 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Empate al descanso | Los dos empataron al descanso en 3+ de sus últimos 5 | SÍ | 813 | 39.7% | 40.6% | -0.9 pts | -0.5 | 0.602 | 1 / 4 | no |
| 🏈 NFL | Ambos anotan en la 1a mitad | Total 47 o más | SÍ | 327 | 88.7% | 87.9% | +0.8 pts | +0.4 | 0.665 | 3 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Liga: Premier | SÍ | 1,900 | 55.3% | 54.9% | +0.4 pts | +0.4 | 0.710 | 3 / 2 | no |
| 🏒 NHL | Hay gol en el 1er periodo | Los dos con gol en el 1er periodo en 9+ de sus últimos 10 | SÍ | 789 | 83.1% | 83.6% | -0.5 pts | -0.4 | 0.719 | 1 / 2 | no |
| 🏒 NHL | Hay gol en el 1er periodo | Total 6.5 o más | SÍ | 295 | 84.7% | 85.2% | -0.5 pts | -0.2 | 0.820 | 1 / 2 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Ambos anotan: sí | Liga: Ligue 1 | SÍ | 1,678 | 55.1% | 54.9% | +0.3 pts | +0.2 | 0.828 | 4 / 1 | no |
| ⚽ Fútbol (5 ligas, Pinnacle de cierre) | Gol en el 1er tiempo | Liga: Ligue 1 | SÍ | 1,678 | 71.9% | 71.8% | +0.2 pts | +0.1 | 0.881 | 3 / 2 | no |

## Lo que no se volvió a correr

- **MLB (viento, temperatura y los backtests de septiembre).** Los archivos guardados no traen el total del modelo ni con qué unir cada
  juego. Los backtests de MLB (lineup, contacto, suerte, defensa, hits, bases, Marcel, bullpen, día/noche) ya se habían medido contra el
  modelo, no contra la casa. Viento y temperatura quedan para la pretemporada 2027, con lo demás pendiente de MLB.
- **Viaje y altura en NBA, mariscal en NFL, copas entre semana en fútbol.** Necesitan bajar datos de ESPN (solo corre en GitHub Actions).
- **Tenis, xG de NHL, fórmula propia, modelos públicos.** Ya estaban medidos contra el modelo.

## Archivos

| Archivo | Qué es |
|---|---|
| `publico.js` | Pide, guarda y mezcla el pronóstico de ESPN (NBA y NFL) |
| `modelo-nfl.js` → `ajusteClima`, `usdeporte.js` → `rellenarViento` | Viento y techo en el total del modelo de NFL |
| `scripts/medicion/exportar_modelo.js` | Lo que dijo el modelo de NHL/NFL en cada juego pasado (walk-forward) |
| `scripts/medicion/patrones.py`, `props.py` | Modo `OVA_CONTRA=modelo` (sin la variable miden contra el precio, igual que antes) |
| `scripts/medicion/nutrir_mezcla.py`, `nutrir_viento_nfl.py`, `nutrir_nhl_descanso.js` | Las tres pruebas de este documento |

El workflow *Patrones contra el mercado* corre ahora las dos pasadas cada mes (rama `resultados-patrones`, `patrones-modelo-resultado.md`).

## Calibración del favorito (17-nov-2026)

¿El modelo se queda corto con el favorito? Se probó estirar el 1X2 (q ∝ p^a), eligiendo `a` con unas temporadas y probándolo en las que quedaron afuera.

| | Prueba | Antes | Estirado | Resultado |
|---|---|---|---|---|
| **Copas nacionales** (`torneos.js`) | 462 partidos de 2025-26 en adelante, `a` = 1.3 | pérdida 0.9413; dice 64.5% → gana 84.2% | **0.9257** (z −3.2); dice 64.5% → gana 71.8% | **Aplicado.** Aciertos iguales (59.1%) |
| **5 ligas** (`scripts/medicion/fut_calibrar.js`) | 5,708 partidos de 2023-24 a 2026-27, `a` = 1.04 | pérdida 0.98577; dice 69.3% → gana 72.3%; dice 80% → gana 85.2% | 0.98520 (z −2.7, mejora en las 4 temporadas) | **No aplicado:** 0.6 milésimas; mueve un 70% a 71%. Aciertos iguales (52.8%) |

En las ligas el modelo ya está casi bien calibrado: se queda 1.5 a 5 puntos corto arriba de 55%, nada parecido a las copas. Lo de «el favorito de 75%+ del mercado gana 80% y el modelo le daba 68.6%» no es un error de calibración del modelo. Es información que el precio tiene y el modelo no (alineaciones, lesiones, rotaciones). Para cerrar esa distancia hay que darle al modelo esa información, no estirarlo.

## Alineaciones en fútbol (17-nov-2026): no entra

¿Saber cuántos titulares de siempre faltan sube los aciertos? `scripts/medicion/fut_alineaciones.js` (workflow *Medir alineaciones en futbol*): 4,003 alineaciones titulares de ESPN de las 5 ligas desde 2024-25 (cache en la rama `datos-alineaciones`), con el motor real de la app y cada día solo con lo anterior. Ajuste: λ × e^(−α·faltan propios) × e^(β·faltan del rival). α y β se eligieron en 2024-25 (1,512 partidos) y se probaron en 2025-26 y 2026-27 (2,134).

| Cómo se cuenta «faltan» | α / β | Pérdida antes → después | Aciertos antes → después |
|---|---|---|---|
| Los 11 que más arrancaron en los últimos 10, pesado por cuánto arrancaron | 0.03 / 0.06 | 0.98915 → 0.99026 (z +0.5) | 1,129 → 1,104 |
| Los mismos 11, solo contando cuántos faltan | 0.02 / 0.05 | 0.98915 → 0.99134 (z +0.9) | 1,129 → 1,106 |
| Solo titulares fijos (8+ de los últimos 10) | 0.01 / 0.07 | 0.98915 → 0.99169 (z +1.2) | 1,129 → 1,104 |

Las tres versiones empeoran fuera de muestra, también en los 1,180 partidos con 2+ titulares fijos fuera. Contar ausencias no basta: un suplente de un equipo grande puede valer más que un titular de uno chico, y el modelo ya ve el efecto en los goles de los partidos recientes. Para que sirviera habría que saber cuánto vale cada jugador (minutos, goles, valor de mercado), y eso ESPN no lo da gratis de forma confiable.
