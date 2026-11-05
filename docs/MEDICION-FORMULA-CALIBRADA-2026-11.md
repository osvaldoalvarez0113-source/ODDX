# Fórmula que corrige al modelo con su diferencia contra el mercado (noviembre 2026)

Medido el 5-nov-2026 con `scripts/medicion/formula_calibrada.py`. Cada temporada se predice con coeficientes ajustados solo en las anteriores. No cambió nada en la app.

Fórmulas probadas: `logit(p) = a + b·logit(modelo)` (corrige inclinación y sesgo), lo mismo sobre el mercado, y `logit(p) = a + b·logit(mercado) + c·(logit(modelo) − logit(mercado))`. En fútbol, temperatura más ajuste de empate y local.

| App | Partidos | Modelo | Fórmula | Mercado | Fórmula contra modelo | ROI ≥2 pts |
|---|---|---|---|---|---|---|
| MLB | 10,288 | 0.6811 | 0.6811 | 0.6732 | +0.06, z 0.3 | −2.4% ±2.5 |
| NBA | 6,210 | 0.6176 | 0.6177 | 0.5928 | +0.10, z 0.3 | −6.5% ±4.0 |
| NHL | 3,470 | 0.6717 | 0.6740 | 0.6647 | +2.26, z 1.2 | −5.4% ±3.9 |
| NFL | 1,080 | 0.6365 | 0.6376 | 0.6054 | +1.10, z 0.5 | −13.2% ±9.2 |
| Fútbol, ligas | 9,360 | 0.9885 | 0.9893 | 0.9678 | +0.78, z 1.7 | −7.6% ±4.1 |

Pérdida log, milésimas en la diferencia. Más alto es peor.

- **Por qué no ayuda:** la inclinación medida ya está cerca de 1 (MLB 1.08-1.21, NBA 0.92-0.97, NFL 0.82-0.93). En NHL sale 1.36-1.85, pero aplicarla empeora fuera de muestra. El error del modelo es falta de información, no un sesgo fijo.
- **El −3.5 no es un error constante:** esa cifra mira al favorito que eligió el mercado. Elegir el lado por un número selecciona los casos donde ese número se pasó, así que el otro siempre sale más bajo.
- **Mercado corregido:** tampoco mejora al mercado (de +0.10 a +1.29 milésimas).
- **Modelo + mercado ajustado:** no mejora al mercado. En NFL, ≥4 pts da +0.9% ±11.2: no se distingue de cero.
- **Rating sacado de las líneas (NHL y NFL):** comparar la línea de hoy con la historia del propio mercado no da señal (z de 1.0 a 1.4).
