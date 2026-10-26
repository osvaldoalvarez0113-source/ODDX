# Polymarket contra la línea de cierre (26-oct-2026)

Pregunta: ¿la diferencia entre el precio de Polymarket y el de las casas sirve como señal de apuesta?

Datos: 311 juegos terminados de la temporada 2026 (NFL 105, NHL 163, NBA 43) con el precio de Polymarket justo antes de empezar (historial público), el cierre de DraftKings/ESPN sin margen y el resultado. Script: `scripts/divergencia.js` (workflow **Polymarket contra la línea de cierre**, rama `resultados-div`, se repite el 1 y el 15 de cada mes).

Hipótesis escrita antes de mirar (H1): el local gana más de lo que dice la casa cuando Polymarket lo ve más probable que la casa.

## Resultado

- **Polymarket y la casa son casi el mismo precio:** diferencia típica 1.4 puntos. Solo 5 de 311 juegos difieren 3 puntos o más.
- **Aciertan igual:** Brier 0.2241 (Polymarket) contra 0.2244 (casa), z = −0.4.
- **H1 no se puede confirmar ni descartar:** b = 1.11 ± 1.66 (b = 0 la casa lo sabe todo, b = 1 Polymarket manda). Con tan poca diferencia entre los dos precios, harían falta miles de juegos.
- Apostar al lado de Polymarket: 23 apuestas con diferencia ≥ 2 pts, ROI −9.8% ± 17.1%. Nada.

## Qué se hace

1. **No se agrega como señal.** No hay diferencia suficiente que aprovechar.
2. **Polymarket queda como lo que sí aporta:** precio gratis en vivo (ESPN borra su línea al empezar) y respaldo cuando no hay Pinnacle ni línea de ESPN.
3. La medición se repite sola; los juegos desde el 26-oct-2026 son la prueba fuera de muestra. Si algún día b da z ≥ 2 con juegos nuevos, se reconsidera.

Fútbol no está en esta prueba: ESPN no trae línea de cierre confiable para esos partidos terminados. La Champions (`ucl`) devuelve 0 mercados porque Polymarket publica los partidos pocos días antes (próxima jornada, principios de noviembre).
