# MLB contra el mercado: medición de octubre 2026

Prueba: la fórmula de `index.html` contra la línea de cierre de DraftKings (vía ESPN, sin vig), juego por juego,
usando solo datos de antes de cada fecha. Script: `scripts/correr_mercado.js` (modelo base) y
`scripts/correr_variantes.js` (PRIOR_ERA y historial de 3 años). Temporadas 2024, 2025 y 2026 (hasta el 10-oct), ~6,200 juegos.

## Lo que salió

| | 2024 | 2025 | 2026 | Junto |
|---|---|---|---|---|
| Pérdida log, modelo | 0.6836 | 0.6816 | 0.6811 | 0.6821 |
| Pérdida log, mercado | 0.6691 | 0.6770 | 0.6770 | 0.6744 |
| z (modelo peor que mercado) | 4.6 | 1.7 | 1.5 | 4.7 |
| Peso del modelo en la regresión | -0.03 ± 0.50 | 0.24 ± 0.49 | 0.54 ± 0.48 | 0.24 ± 0.28 |

- El modelo **no le gana al cierre del mercado** en ninguna temporada. Su señal casi toda ya está en el precio.
- Apostar donde el modelo ve ventaja, al precio real de DraftKings, junto da: ≥2 pts -2.2% (±4.0), ≥3 pts -2.5%, ≥5 pts -4.6%, ≥8 pts -8.5%. Ningún umbral da retorno positivo estable.
- Ventaja de local: modelo 53.5% / mercado 53.2% / real 53.4%. `BONO_LOCAL` está bien.

## PRIOR_ERA (40 innings)

Probado 20, 30, 40, 60, 80, 120. Las diferencias son de ±0.0006 de pérdida log y el signo cambia entre temporadas
(en 2024-2025 mejora algo con más innings; en 2026 empeora). Junto: ninguno distingue de 40 (|z| < 1). **Se queda en 40.**

## Historial de 3 años (Marcel)

Contra el modelo base: 2024 -0.0018 (z -2.2, mejora), 2025 -0.0003 (z -0.3), 2026 +0.0017 (z +1.9, empeora). Junto -0.0001 (z -0.2).
No pasa la regla de t ≥ 2 en dos temporadas. **Se queda apagado por defecto.**
(Los coeficientes de Marcel se ajustaron con estas mismas temporadas; aun así no sostiene la ventaja.)

## Qué significa para usar la app

OVA sirve para leer el juego (abridor, ofensiva, bullpen, total), no para ganarle al mercado de moneyline de MLB.
Para ganar hay que mirar el CLV de los picks (campo «Cierre» en Mis picks) y solo seguir lo que lo tenga positivo de forma sostenida.
