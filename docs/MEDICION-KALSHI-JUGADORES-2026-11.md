# Kalshi y cambios de jugadores (noviembre 2026)

Medido el 5-nov-2026 con `scripts/medicion/kalshi_pinnacle.js` y `cambios_jugadores.js` (workflow *Medir Kalshi y cambios de jugadores*, rama `resultados-cambios`). Solo mide.

## Kalshi

8,384 juegos resueltos, del 15-abr-2025 al 4-nov-2026 (NBA 1,632, NHL 1,614, NFL 491, MLB 4,647). Precio de compra de la última vela de 1 hora antes de empezar. ROI con comisión estimada de 0.07 × P × (1 − P) por contrato.

- **El precio:** a 0.7 pts de la línea de ESPN sin margen (mediana). Error 0.6518 contra 0.6515 en 5,040 juegos: aciertan igual.
- **Comprar todo:** −4.6% ±1.6.
- **Más barato que la línea:** 1+¢ +0.9% ±10.3 (720), 2+¢ −3.1% ±19.2 (196), 3+¢ +12.9% ±31.8 (64). No se distingue de cero, y son pocos.
- **Más barato que Pinnacle:** 0+¢ −21.0% ±23.3 (80). La historia de Pinnacle es corta, y su precio puede tener horas.

| Compra | Rinde | Ganó | Precio |
|---|---|---|---|
| 35-40¢ | −3.6% ±7.1 | 37.5% | 37.3 |
| 40-45¢ | +2.6% ±4.9 | 45.0% | 42.2 |
| 45-50¢ | −2.0% ±4.0 | 47.8% | 47.0 |
| 50-55¢ | −5.2% ±3.6 | 51.0% | 52.0 |
| 55-60¢ | −8.6% ±3.4 | 53.6% | 56.9 |
| 60-65¢ | −8.3% ±3.8 | 58.1% | 61.8 |
| 65-70¢ | −4.5% ±4.7 | 65.2% | 66.8 |
| 70-75¢ | −0.6% ±5.3 | 72.7% | 71.8 |
| 75-80¢ | −0.5% ±6.1 | 77.7% | 76.9 |

**Rango −120 a −150 (54.5-60¢):** −7.7% ±3.1 (2,898). MLB −7.8% ±3.9, NHL −9.0% ±6.7, NFL −8.1% ±16.1, NBA −4.0% ±9.9. Negativo en 2025 y 2026.

La pista de la primera corrida (favoritos 60-75¢ en +0.9%, 1,046 juegos) no aguantó: con todo el historial da −5.9% ±2.6. Los tramos se miraron después de ver los datos. Ningún tramo gana de forma comprobable.

## Cambios de jugadores en NBA

6,525 juegos, 2020-21 a 2025-26. Quién jugó sale del boxscore: es casi lo que se sabe al empezar, no la lista previa.

| Variable (local − visita) | Sobre la línea (z) | Sobre el modelo (z) | Apostando a −110 |
|---|---|---|---|
| Regreso de estrella, ausente 3+ juegos | 0.1 | 1.7 | +0.4% ±9.6 (388) |
| Producción llegada por traspaso | 0.2 | 1.0 | A favor −2.8% ±6.0 · en contra −6.1% ±6.0 |
| Producción ida por traspaso | −0.8 | −1.1 | |
| Continuidad del plantel | 3.0 | 6.1 | 20+ pts: −1.2% ±3.9 · 40+ pts: −1.3% ±7.4 |
| Producción de los que juegan hoy | 0.2 | 13.1 | |

- **Continuidad:** 2.17 puntos por cada 100% de diferencia, o 0.55 con una diferencia típica. Por temporada: z 2.2, −0.2, 1.3, 2.2, 1.1. Pasa el corte, pero no paga el margen. No entra.
- **Modelo con jugadores:** el error del margen baja de 14.21 a 13.98, fuera de muestra (línea 13.69). Cierra 44% de la distancia. Encima de la línea no añade nada.

## Qué cambió en la app

Una línea en el bloque de Kalshi del Veredicto con el resultado de 55-60¢. La app ya contaba la comisión y ya decía a qué precio entrar. El modelo de NBA no cambió: quién jugó no está medido con la lista previa, y el número final ya es 95% mercado.

Traspasos solo se midieron en NBA. En los demás deportes ya está medido lo parecido: `MEDICION-HUECOS-2026-11.md`.
