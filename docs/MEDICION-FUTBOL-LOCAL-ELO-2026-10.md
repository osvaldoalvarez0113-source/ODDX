# Fútbol: ¿mejoran el modelo los ratings local/visita, el Elo, la mezcla con el mercado o el descanso?

Medido el 13-oct-2026 con `scripts/experimento_futbol.js` (GitHub Actions, workflow «Experimento de futbol»).
Datos: 5,256 partidos de PL, La Liga, Serie A, Bundesliga y Ligue 1, temporadas 2023-24 a 2025-26, contra el cierre de Pinnacle (football-data.co.uk).
Todo camina hacia adelante (cada partido se predice solo con lo anterior). Los parámetros nuevos (Elo, descanso) se ajustaron en 2021-22 y 2022-23, sin ver las temporadas de prueba.
Control: el modelo actual da 0.9888 de pérdida 1X2 y el mercado 0.9637, igual que en la medición anterior.

| Idea | Pérdida 1X2 | Diferencia con el modelo actual (milésimas) | Veredicto |
|---|---|---|---|
| Modelo actual (Dixon-Coles con peso por antigüedad) | 0.9888 | 0 | — |
| Ratings local/visita separados, K=8 / 16 / 32 / 64 | 0.9917 / 0.9896 / 0.9887 / 0.9884 | +2.97 / +0.87 / −0.12 / −0.35 (z 2.0 / 0.8 / −0.2 / −0.9) | No aporta (con poco encogimiento empeora) |
| Mezcla con Elo 10 % / 20 % / 30 % / 50 % | 0.9884 / 0.9881 / 0.9880 / 0.9882 | −0.39 / −0.65 / −0.77 / −0.59 (z −2.5 / −2.0 / −1.6 / −0.7) | Mejora real pero minúscula (1.6 % de la distancia al mercado) |
| Solo Elo | 0.9911 | +2.31 | Peor |
| Días de descanso | 0.9886 | −0.15 (z −1.7) | Nada |
| Mezclar el modelo con la cuota del mercado | siempre peor que el mercado solo | +0.5 con 5 % de modelo; +25 con 100 % | El modelo no le suma nada al mercado |

Conclusión: ninguna de las ideas cambia los picks de forma útil. La mejor (Elo al 10-20 %) gana 0.0004-0.0006 de pérdida, mientras el mercado le saca 0.025; no justifica añadir una pieza más al modelo. No se tocó `futbol.html`.
Lesionados y alineaciones no se pudieron medir: no hay datos históricos de bajas.
