# Fútbol: medición con el motor real y datos al día (noviembre 2026)

Medido el 4-nov-2026 con `scripts/medicion/fut_dc_real.js` (workflow *Medir futbol con el motor real*, resultado en la rama `resultados-futbol-actual`).
Por primera vez corre el `dcAjustar` y el `calcularDC` **copiados de `futbol.html`**, con el mismo historial que baja el teléfono. Las mediciones de octubre usaban una réplica.

Datos: football-data.co.uk, 5 ligas, 2018-19 a 2026-27 (14,737 partidos, hasta el 2-nov-2026). Cada partido se predice solo con lo anterior. Los ajustes se eligieron en 2021-22 y 2022-23; la prueba es de 2023-24 en adelante.

**Límite del mercado:** en 2026-27 no hay cierre de Pinnacle, solo promedio de cierre. En 2025-26 Pinnacle cubre la mitad. Por eso el ROI a cuota Pinnacle no incluye 2026-27 y la pérdida del mercado mezcla ambas fuentes en las dos últimas temporadas.

## Qué estaba mal en los números viejos

| Lo que decía la app | Lo medido ahora |
|---|---|
| Modelo 0.9888 en 5,256 partidos | La app real daba **0.9905** en esos mismos partidos: el 0.9888 usaba 3 años de historial y el teléfono bajaba solo 1 temporada anterior |
| −14% ±5 con 2+ pts (3 temporadas) | −10.0% ±3.8 con 7 temporadas. Sigue perdiendo, pero 2023-24 a 2025-26 fue el tramo malo |
| Elo al 10-20% mejora de 0.9888 a 0.9881 | Sobre la v22 no se distingue de cero (0.9856 contra 0.9858, z −0.6 a −1.1) |

El experimento de xG de la rama `resultados-futbol-xg` (23-oct) no estaba documentado. Con 5,256 partidos, los tiros solos empeoran el modelo (0.9961) y mitad goles, mitad tiros no cambia nada (0.9890). No se agregan.

## Cambio aplicado (fútbol v22)

Dos temporadas de historial en vez de una, y `xi` de 1.6 a 1.0 (los partidos viejos pierden peso más despacio). El `wt` de goles se queda en 0.5, que fue lo mejor en el ajuste.

| Prueba: 5,708 partidos, 2023-24 a 2026-27 | v21 | v22 | Mercado |
|---|---|---|---|
| Pérdida 1X2 | 0.9897 | **0.9858** | 0.9629 |
| Pérdida Más/Menos 2.5 | 0.6773 | **0.6761** | 0.6643 |

- **1X2:** −3.89 milésimas (z −4.6), y mejora en las 4 temporadas de prueba.
- **Más/Menos:** −1.18 milésimas (z −2.8).
- **Cuánto se acerca:** cierra el 15% de la distancia al mercado en 1X2. **Sigue sin ganarle** (z 10.4).
- **No mejora el dinero:** apostando 2+ pts en la prueba da −12.7% ±5.4 con la v21 y −13.4% ±5.5 con la v22. El número es más honesto, no más rentable.
- **Costo:** el teléfono baja una temporada más por liga la primera vez y luego la guarda. Si no baja, sigue con la pasada sola.
- **Tres temporadas de historial:** dan 0.9849 (−0.89 milésimas más, z −4.1, con `xi` elegido solo en 2022-23). No se aplicó: es más descarga para poco.

Por temporada (v22 contra mercado): 2020-21 1.0016/0.9773, 2021-22 0.9928/0.9758, 2022-23 0.9926/0.9749, 2023-24 0.9776/0.9525, 2024-25 0.9851/0.9606, 2025-26 0.9983/0.9780, 2026-27 0.9717/0.9542 (452 partidos).

## Cuando el modelo y el mercado discrepan (v22, 11,186 partidos, 2020-21 a 2026-27)

La mitad de los partidos discrepa 5.4 pts o más (p90 12.6, p99 20.5). «Lado del modelo» es el resultado donde el modelo da más que el mercado.

| Mayor diferencia | Partidos | Lado del modelo: dice | Mercado dice | Pasó | ROI a Pinnacle |
|---|---|---|---|---|---|
| Hasta 4 pts | 3,967 (35.5%) | 35.6% | 33.6% | 32.9% | −5.0% ±5.7 |
| 4 a 8 pts | 3,845 (34.4%) | 35.4% | 30.4% | 29.8% | −6.6% ±5.8 |
| 8 a 12 pts | 2,060 (18.4%) | 35.3% | 27.1% | 25.0% | −13.0% ±8.6 |
| 12+ pts | 1,314 (11.7%) | 36.9% | 24.3% | 21.5% | −12.2% ±11.3 |

Lo que ocurre queda siempre cerca del mercado y lejos del modelo. El lado elegido queda incluso un poco por debajo del mercado, porque se elige justo donde el modelo se pasa.

**ROI apostando donde el modelo da más que el mercado:**

| Ventaja | A Pinnacle | A cuota promedio |
|---|---|---|
| ≥2 pts | −10.0% ±3.8 (8,199) | −12.5% ±3.4 (9,255) |
| ≥4 pts | −10.0% ±4.6 | −12.4% ±4.2 |
| ≥6 pts | −11.6% ±5.7 | −15.3% ±5.2 |
| ≥8 pts | −10.7% ±7.2 | −14.4% ±6.5 |
| ≥10 pts | −11.1% ±9.4 | −14.5% ±8.6 |

Por temporada, ≥2 pts a Pinnacle: −9.6%, −3.6%, −8.4%, −14.5%, −11.6%, −14.8%. A cuota promedio en 2026-27: −4.8% (376 apuestas), negativo también y con muestra chica.

**Más/Menos 2.5 (ROI a Pinnacle, por diferencia):** 0-3 pts −2.3% ±3.4; 3-6 pts −3.7% ±4.1; 6-10 pts −5.4% ±5.0; 10+ pts −7.8% ±8.0.

**Mezcla con el mercado:** cualquier peso del modelo empeora al mercado (5% +0.45 milésimas, z 4.2; 30% +3.75, z 5.8). El peso óptimo sigue en 0.

## Qué no se midió

Ya está medido en [`MEDICION-FUTBOL-PENDIENTES-2026-11.md`](MEDICION-FUTBOL-PENDIENTES-2026-11.md): Ambos anotan, alineaciones, copas, selecciones y cuota previa. Sigue faltando lo que allí se detalla, como los picks reales.

## Cómo repetirlo

Actions → *Medir futbol con el motor real* → Run workflow (o subir a la rama `futbol-actual`). Baja los datos con `scripts/medicion/bajar_futbol.js`, y deja la salida y los partidos en `resultados-futbol-actual`.
