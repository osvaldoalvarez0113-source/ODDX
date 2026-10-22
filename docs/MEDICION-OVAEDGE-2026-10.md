# ovaedge.js: qué hace, qué se conectó y qué no (octubre 2026)

## Qué se conectó en MLB (`index.html`, v66)

Todo es **adicional**: ningún cálculo ni veredicto existente cambió.

1. **Chequeo contra el mercado** (plegado, dentro del Veredicto). Mezcla tu número con el «sin vig» del mercado usando
   `W_MODELO = 0.24`, el peso que salió de tu propia medición contra el cierre de DraftKings
   (`MEDICION-MERCADO-MLB-2026-10.md`: 0.24 ± 0.28 sobre ~6,200 juegos; el modelo no le gana al cierre en ninguna temporada).
   Muestra el EV y el ¼ Kelly con la mezcla. Solo para casas de apuestas (no Kalshi) y solo si el EV de arriba no es «imposible».
2. **CLV con prueba de suerte** (Mis picks). Antes, cualquier promedio positivo con 25 picks o más decía «tu número le gana al
   mercado». Ahora, si la t es menor que 2, dice «positivo pero todavía dentro del ruido».
3. **Brier** bajo la tabla de calibración (Mis picks), con 10 resueltos o más, y su mejora contra decir siempre la frecuencia base.

## Qué NO se conectó: el Monte Carlo

Se comparó contra `matriz()` (binomial negativa con DISP 2.3, equipos independientes) con los mismos promedios de carreras,
9 entradas, 600,000 simulaciones por juego:

| mu local / visita | Mercado | `matriz()` | Monte Carlo indep. | Monte Carlo con correlación |
|---|---|---|---|---|
| 4.8 / 4.2 | Over 9.5 | 40.5% | 40.5% | 39.9% |
| 4.8 / 4.2 | Local gana por 2+ | 40.7% | 40.2% | 39.7% |
| 5.3 / 4.0 | Over 9.5 | 43.1% | 43.1% | 42.5% |
| 4.4 / 4.4 | Over 8.5 | 47.3% | 47.4% | 46.6% |
| 3.9 / 3.6 | Over 7.5 | 44.2% | 44.2% | 43.6% |

Con equipos independientes coinciden dentro de 0.8 puntos (validan a las dos). La correlación entre equipos (≈0.08) solo mueve
0.5 a 0.9 puntos, menos que el ruido del propio modelo (r de 0.10 a 0.16 en los backtests). Por eso no se sustituyó nada.
Queda una prueba automática en `pruebas.js` que lo vigila.

## Pendiente a propósito

- **Platt / isotónica**: están en el módulo pero no se aplican a nada todavía. Necesitan cientos de juegos con probabilidad
  y resultado; los backtests los tienen, Mis picks (0 picks guardados) todavía no.
- **Shin**: está en el módulo; la app sigue mostrando el «sin vig» multiplicativo para no tener dos números casi iguales en pantalla.
