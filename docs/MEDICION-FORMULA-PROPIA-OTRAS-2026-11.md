# Fórmula propia en NBA, NHL, NFL, fútbol y tenis (noviembre 2026)

Medido el 14-nov-2026, igual que en MLB (`MEDICION-FORMULA-PROPIA-MLB-2026-11.md`): una regresión logística con todos los datos que hay en los archivos, ajustada solo con temporadas anteriores y probada en las siguientes. Scripts en `scripts/medicion/propia/` (NBA con datos de la rama `resultados-nba-mia`). **No cambió nada en las apps.**

| App | Juegos de prueba | Mía | Actual | Mercado | Mía − actual (z) | Temporadas mejores | Aciertos mía / actual / mercado |
|---|---|---|---|---|---|---|---|
| NBA | 6,210 (2021-2025) | 0.6160 | 0.6176 | 0.5928 | −1.3 | 4 de 5 | 66.2 / 66.1 / 68.1% |
| NHL | 4,577 (2022-2025) | 0.6680 | 0.6695 | 0.6609 | −1.0 | 3 de 4 | 58.5 / 58.2 / 60.0% |
| NFL | 1,462 (2019-2026) | 0.6358 | 0.6423 | 0.5982 | −2.1 | 4 de 8 | 63.7 / 63.8 / 68.1% |
| Fútbol (5 ligas) | 7,082 (2022-23 a 2025-26) | 0.9893 | 0.9918 | 0.9691 | −2.2 | 2 de 4 (2 iguales) | 52.5 / 52.3 / 54.1% |
| Tenis | 19,127 (2025-2026) | 0.6169 | 0.6173 | sin cuotas | −0.9 | 2 de 2, por poco | 65.5 / 65.1% |

Datos probados: Elo con margen, margen/goles por juego, últimos 10, descanso, back-to-back, juegos seguidos, tiros a puerta (NHL), ataque, el modelo actual; en tenis Elo general/superficie/pico, últimos 10, días sin jugar, cansancio, experiencia y cara a cara.

**Por qué no se monta:** ninguna pasa la regla que sí pasó MLB (mejor en todas las temporadas y z ≤ −2). NFL y fútbol llegan a z −2 pero solo mejoran en la mitad de las temporadas y no suben los aciertos. Además en estas cinco apps el pick ya sale del mercado (95% mercado, 5% modelo; tenis con precio de Kalshi), así que cambiar el modelo casi no movería ningún pick. Mezclar la fórmula propia con el mercado tampoco mejora al mercado (NHL +1.6 milésimas, NFL +0.6).
