# Fútbol: lo que faltaba por medir (noviembre 2026)

Medido el 4-nov-2026 con el workflow *Medir pendientes de futbol* (resultado en la rama `resultados-futbol-pendientes`). Solo mide. Las fórmulas se copian del código de la app en cada corrida (`futbol.html`, `selecciones.js`). Cada partido se predice solo con lo anterior. Pérdida log: menos es mejor.

**Conclusión:** en nada de esto el modelo le gana al mercado. Tomar la cuota antes del cierre tampoco lo arregla. Los recortes con ROI positivo son pocos partidos y no se repiten entre competiciones.

## Resumen

| Qué | Partidos | Modelo | Referencia | Apostar donde el modelo se separa |
|---|---|---|---|---|
| Ambos anotan | 11,186 | 0.6840 | Frecuencia 0.6884; implícita 0.6803 | Sin cuota real histórica |
| 1X2 a cuota previa de Pinnacle | 9,874 | 0.9898 | Previa 0.9704; cierre 0.9680 | −10.5% ±3.8 (≥2 pts) |
| Copas europeas | 1,143 con cuota | 0.9975 | Mercado 0.9283 | −8.0% ±11.4 (≥2 pts) |
| Selecciones (Elo) | 2,197 con cuota | 0.9037 | Mercado 0.8293 | −20.8% ±6.4 (≥2 pts) |

## Ambos anotan (v22, 5 ligas, 2020-21 a 2026-27)

No hay cuota histórica. «Implícita» es la probabilidad que sale de los goles esperados que reproducen el 1X2 y el Más/Menos de cierre. **No es un precio real, así que no hay ROI.**

- **Contra la frecuencia de la liga:** el modelo gana, −4.41 milésimas (z −5.0), con mejora en todas las temporadas. Esto cambia lo que se tenía anotado de que no le ganaba.
- **Contra la implícita:** pierde, +3.74 milésimas (z 3.8).
- **Calibración:** buena. Dice 52.6% y pasó 52.3%; dice 57.4% y pasó 56.4%; dice 62.6% y pasó 62.2%.
- **Cuando se separa 6+ pts de la implícita (2,783 partidos):** dice 54.6%, la implícita 46.1% y pasó 46.7%.
- **Mezcla con la frecuencia (`wt`):** 0.5 sigue siendo lo mejor (0.6832 en la prueba).

## Cuota previa en vez de cierre

football-data toma esta cuota de Pinnacle 1-3 días antes del partido. No es la apertura real. Es lo más parecido que hay a tomar temprano.

| Modelo sobre la previa | Apuestas | ROI a la previa | CLV |
|---|---|---|---|
| ≥2 pts | 7,801 | −10.5% ±3.8 | −3.32% ±0.22 |
| ≥4 pts | 5,058 | −11.4% ±4.7 | −3.42% ±0.28 |
| ≥6 pts | 2,966 | −11.8% ±6.0 | −3.44% ±0.37 |
| ≥8 pts | 1,642 | −14.0% ±7.9 | −3.22% ±0.49 |
| ≥10 pts | 851 | −12.6% ±10.7 | −3.03% ±0.72 |
| Control: un resultado cualquiera | 9,874 | −2.8% ±3.3 | −2.96% ±0.17 |

- **La línea no va hacia el modelo:** se mueve −0.82% (±0.65) de la distancia entre modelo y previa. El CLV es igual o peor que apostar cualquier resultado.
- **Las 6 temporadas pierden:** de −4.8% a −19.2%.
- **Más/Menos 2.5 a la previa:** −5.9% ±3.1 con ≥3 pts y −8.6% ±4.9 con ≥6 pts.

## Alineaciones (7,530 partidos, 5 ligas, 2020-21 a 2025-26)

Corrección: las alineaciones ya tenían una medición del 23-oct en `resultados-jugadores-futbol`, aunque el informe anterior decía que no había datos. Lo que no existe es el histórico de bajas anunciadas antes del partido. «Ausentes» son los titulares habituales que no arrancaron ese día.

Efecto en puntos por cada titular habitual ausente (local − visita):

| Referencia | c ± 2·se | z |
|---|---|---|
| Sin mirar ninguna cuota | −0.040 ± 0.015 | |
| Encima del modelo v22 | −0.032 ± 0.014 | −4.6 |
| Encima de la cuota previa | −0.020 ± 0.014 | −3.0 |
| Movimiento de la línea, cierre − previa | −0.011 ± 0.001 | −25.2 |
| Encima de la cuota de cierre | −0.009 ± 0.014 | −1.3 |

- **Al modelo sí le falta esto:** es información real que no ve.
- **El cierre ya lo descuenta:** apostar por el once más completo a cuota de cierre da −2.7% ±4.0 (1+), −2.9% ±5.2 (2+) y −0.8% ±7.7 (3+).
- **La cuota previa no lo sabe todo:** pero no se puede tomar esa cuota sabiendo ya la alineación, así que no es una jugada. Solo serviría anticipar la rotación antes que el mercado, y eso no está medido.

## Copas europeas

Fórmula básica de la app, con lo acumulado en esa competición. Resultados desde 2018; cuotas previas desde 2023, de ESPN BET y DraftKings (margen ≈6%, peores que Pinnacle). Control en la Premier con la misma fuente: pérdida 0.9729, bien calibrada.

| Competición | Con cuota | Modelo | Mercado | Diferencia mediana | ROI ≥2 pts |
|---|---|---|---|---|---|
| Champions | 419 | 0.9761 | 0.9121 | 11.1 pts | −10.6% ±19.2 |
| Europa League | 409 | 0.9951 | 0.9197 | 11.5 pts | −10.2% ±17.9 |
| Conference | 315 | 1.0290 | 0.9612 | 14.0 pts | −1.9% ±22.5 |
| **Todas** | **1,143** | **0.9975** | **0.9283** | **12.0 pts** | **−8.0% ±11.4** |

- **Contra la frecuencia:** el modelo gana (1.0145 contra 1.0581, z −8.4, 2,698 partidos), pero es poco decir.
- **Por eso se descuadra más que en ligas:** la diferencia mediana es 12 pts contra 5.4 en las 5 ligas, porque el modelo tiene pocos partidos por equipo y no cruza fuerza entre ligas.
- **Recorte que no hay que creer:** Champions con ≥12 pts y ambos con 4+ partidos da +37.9% ±51.4 en 95 apuestas. Los mismos cortes en Europa (−5.1%) y Conference (−11.2%) salen negativos, y se miró después de ver los datos.
- **Actualización:** lo que se aplicó fue otro modelo, en [`MEDICION-FUTBOL-COPAS-2026-11.md`](MEDICION-FUTBOL-COPAS-2026-11.md).
- **Pista sin aplicar:** sumar la temporada pasada de esa copa mejora Champions (−24.7 milésimas, z −3.1; 0.9566 contra el mercado 0.9121). En Europa y Conference no se distingue de cero. Se midió aceptando equipos con 6+ partidos; la app exige 10, que muchos equipos de Champions no alcanzan, así que habría que volver a medir con esa regla.

## Copas nacionales

La app no da pronóstico (sin tabla no hay modelo). Solo se mide el mercado, en 1,043 partidos con cuota: pérdida 0.8878, favorito −7.6% ±5.1, no favorito −18.5% ±12.6.

## Selecciones (Elo de `selecciones.js`)

- **Contra la frecuencia:** gana (0.9385 contra 1.0615, 6,328 partidos). Acierta 55.0%.
- **Contra el mercado:** pierde, 0.9037 contra 0.8293 (z 10.6), diferencia mediana 9.3 pts, margen 8.2%.
- **Calibración:** dice 42.5% y pasó 40.0%; dice 56.9% y pasó 54.0%; dice 72.2% y pasó 70.0%; dice 86.8% y pasó 87.3%.
- **Empates:** la tasa base del Elo se calcula con toda la muestra, igual que en la app, así que trae un poco de información futura.

| Tipo | Con cuota | Modelo | Mercado | ROI ≥2 pts |
|---|---|---|---|---|
| Amistoso | 553 | 0.9445 | 0.8569 | −20.3% ±13.0 |
| Liga de naciones | 467 | 0.9314 | 0.8428 | −23.5% ±12.9 |
| Eliminatoria | 808 | 0.8369 | 0.7726 | −18.8% ±10.4 |
| Torneo | 265 | 0.9720 | 0.9160 | −23.2% ±20.0 |
| Mundial | 104 | 0.9064 | 0.8422 | −21.2% ±34.3 |

## Qué sigue sin medir

- **Tus picks reales:** están en el teléfono. Es la única medida de las cuotas que tomas de verdad.
- **Ambos anotan a precio real:** hay que empezar a guardar la cuota; no existe histórica gratis en estas fuentes.
- **Bajas anunciadas antes de la alineación:** ESPN no guarda el histórico, y el robot de lesiones solo guarda NBA, NFL y NHL.
- **Copas y selecciones contra Pinnacle:** solo hay ESPN BET y DraftKings.

## Lo que cambió en la app

Solo textos: el aviso de «sin medir» en copas ahora da la cifra, y el Elo de selecciones avisa que el mercado le gana. Ningún cálculo cambió.

## Cómo repetirlo

Actions → *Medir pendientes de futbol* → Run workflow. Tarda cerca de 2 horas: va despacio con ESPN a propósito.
