# Champions: fuerza entre ligas y registro Auto (noviembre 2026)

Medido el 4-nov-2026 con `scripts/medicion/fut_copas_fuerza.js`, usando los partidos de la rama `resultados-futbol-pendientes` (4,310 de copas europeas, hasta el 3-nov-2026). Corre `dcAjustar` y `probsModelo` copiados de `futbol.html`. Cada partido se predice solo con lo anterior.

Los ajustes se eligieron en 2020-21 a 2022-23, sin cuotas: `xi` 0.25, `Kp` 2, ventana 1,100 días. La prueba es de 2023-24 en adelante, con cuotas de ESPN BET y DraftKings (margen ≈6%, peores que Pinnacle).

## Resultado 1X2 (pérdida log, menos es mejor)

| Competición | Partidos | Básico | Copas juntas | Mercado | Contra básico |
|---|---|---|---|---|---|
| **Champions** | 539 | 0.9858 | **0.9125** | 0.8994 | −73.3 mil., z −4.9 |
| Europa League | 540 | 1.0174 | 0.9956 | 0.9385 | −21.8 mil., z −1.5 |
| Conference | 441 | 1.0347 | 1.0379 | 0.9452 | +3.2 mil., z 0.2 |

- **Aplicado solo en Champions.** Europa no se distingue de cero y Conference no mejora, así que siguen con el básico.
- **Sigue sin ganarle al mercado:** +13.1 milésimas en Champions (z 1.0, no se distingue), contra una cuota peor que Pinnacle.
- **Por temporada en Champions:** 2023-24 0.9816/0.9591, 2024-25 0.9155/0.8798, 2025-26 0.9127/0.9231, 2026-27 0.7955/0.7945 (modelo/mercado; 63 partidos en la última).
- **Fase:** liga 0.8749 (básico 0.9710, mercado 0.8597). Eliminatorias 1.0466 (básico 1.0387, mercado 1.0410): ahí no ayuda.
- **Diferencia mediana con el mercado:** baja de 11 a 8 pts.

## Calibración del favorito (todas las copas, 2023-24 en adelante)

| Dice | Básico: pasó | Copas juntas: dice / pasó |
|---|---|---|
| 45-55% | 56.8% (dice 49.0%) | 49.8% / 53.9% |
| 55-65% | 66.7% (dice 59.0%) | 59.8% / 57.7% |
| 65-75% | 64.7% (dice 68.5%, 51 partidos) | 69.5% / 68.8% |
| 75%+ | 8 partidos | 82.1% / 76.7% |

El básico se quedaba corto con el favorito y casi nunca pasaba de 65%. El nuevo se pasa un poco arriba de 75%.

## Goles

En 277 partidos de Champions con línea 2.5: básico 0.7312, copas juntas 0.6886, mercado 0.6828. Con el peso de `wt` elegido en 2020-22 (0.25): Más/Menos 0.6763 y Ambos anotan 0.6915 en todas las copas, contra 0.6915 y 0.7028 del básico.

## Lo que no entró

- **Temporada pasada de la misma copa:** 0.9497 con la regla de 10 partidos y 0.9494 con 6. Mejora, pero menos.
- **Sumar las 5 grandes ligas:** 0.9153 en Champions, sin mejora. En todas las copas baja a 0.9721, con 70 de 156 equipos cruzados, y exige más datos. No se aplicó.
- **Volver al básico con equipos de pocos partidos:** empeora con cualquier corte probado.

## El dinero

ROI apostando donde este modelo da 2+ pts más que el mercado en Champions: **+8.6% ±15.5** (493 apuestas). No se distingue de cero, y con ligas sumadas el mismo corte da −6.9%. **No es una señal.** Para saberlo hay que medirlo hacia adelante en Auto, con cuota de Pinnacle.

## Registro Auto de NBA, NHL y NFL

Hasta hoy esas tres apps guardaban como «modelo» el número final, que es 95% mercado y 5% modelo. Por eso «modelo contra mercado» casi siempre coincidía y no medía nada. Ahora guardan el modelo solo (`pHMod`, marcado con `cr`). Los juegos resueltos con el número viejo salen como «Modelo: no guardado» y no entran en las comparaciones ni en la curva de unidades. MLB y fútbol ya guardaban el modelo solo.

## Cómo repetirlo

`node scripts/medicion/fut_copas_fuerza.js partidos_copas.json`, con el archivo de esa rama. El dato diario lo actualiza el workflow *Fuerza de copas europeas*.
