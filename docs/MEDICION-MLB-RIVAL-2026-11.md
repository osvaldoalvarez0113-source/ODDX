# MLB ajustado por rival y con curva (noviembre 2026)

Medido el 6-nov-2026 con `scripts/correr_variantes.js` de la rama `medir-mlb-rival` (resultados en `rival-S2021` a `rival-S2026`). Mismo motor del backtest de mercado, juego por juego, solo con lo anterior a cada juego. 12,311 juegos con línea de cierre.

Variantes contra la fórmula actual (P40):
- **RIVAL:** carreras por juego ÷ (carreras que permiten los rivales enfrentados ÷ liga).
- **RIVAL2:** lo mismo, y el bullpen ÷ (carreras que anotan los rivales ÷ liga).
- **CURVA:** curva logística en vez de recta con tope 22-78%, misma pendiente en el centro.
- **CURVA_RIVAL2:** las dos.

| Temporada | Mercado | P40 | RIVAL | RIVAL2 | CURVA | CURVA+RIVAL2 |
|---|---|---|---|---|---|---|
| 2021 | 0.6680 | 0.6794 | 0.6800 | 0.6800 | 0.6794 | 0.6801 |
| 2022 | 0.6636 | 0.6751 | 0.6753 | 0.6754 | 0.6751 | 0.6754 |
| 2023 | 0.6792 | 0.6841 | 0.6843 | 0.6843 | 0.6841 | 0.6843 |
| 2024 | 0.6691 | 0.6836 | 0.6840 | 0.6841 | 0.6836 | 0.6841 |
| 2025 | 0.6770 | 0.6816 | 0.6813 | 0.6813 | 0.6817 | 0.6814 |
| 2026 | 0.6770 | 0.6811 | 0.6815 | 0.6814 | 0.6811 | 0.6814 |
| **Total** | **0.6724** | **0.6808** | 0.6811 (z +2.4) | 0.6811 (z +2.3) | 0.6808 (z +1.3) | 0.6811 (z +2.5) |

Pérdida log: más alto es peor. Aciertos: P40 56.4%, RIVAL 56.3%, RIVAL2 56.2%, CURVA 56.4%, mercado 58.2%.

**No se aplica.** El ajuste por rival empeora un poco (5 de 6 temporadas) y la curva queda igual: el tope casi nunca se toca. En MLB todos juegan contra casi todos en una temporada, así que el ajuste corrige poco y suma ruido.
