# Props de jugador (noviembre 2026)

Medido el 6-nov-2026. ESPN guarda las props de jugador de juegos pasados (`core.api` → `odds/{casa}/propBets`). Se usó la línea de **apertura** de cada lado (Más y Menos), que es de antes del juego. La actual puede quedar movida en vivo. El resultado sale del boxscore de ESPN. Descarga: `scripts/medicion/props_jugador.js` (workflow *Medir props de jugador*, ramas `props-jugador-*`). Análisis: `props_jugador_analisis.py`.

Casa: ESPN BET. NBA y NHL 2024-25 y 2025-26, MLB 2025, NFL 2024 y 2025. Desde que ESPN cambió a DraftKings no trae apertura con los dos lados.

| Liga | Props | Margen mediano | Apostar Más | Apostar Menos |
|---|---|---|---|---|
| NBA | 109,977 | 6.9% | −9.9% ±0.6 | −6.0% ±0.6 |
| NHL | 120,768 | 6.9% | −19.4% ±1.0 | −4.6% ±0.4 |
| MLB | 232,667 | 8.1% | −14.4% ±0.6 | −5.3% ±0.3 |
| NFL | 12,232 | 6.5% | −3.9% ±1.9 | −8.1% ±1.7 |

## El lado más probable

El precio acierta casi exacto. Rinde negativo en todos los tramos:

| Liga | 50-55% | 60-65% | 70-80% | 80-95% |
|---|---|---|---|---|
| NBA | 51.7% · −6.4% | 61.8% · −8.5% | 76.1% · −5.9% | 90.5% · −4.3% |
| NHL | 52.6% · −6.0% | 64.1% · −3.6% | 77.2% · −4.7% | 90.7% · −3.6% |
| MLB | 52.7% · −6.7% | 64.6% · −4.7% | 76.2% · −5.5% | 89.1% · −4.4% |

## Por tipo, cerca de la línea principal (40-60%)

- **El Menos pierde menos que el Más** en NBA, NHL y MLB, en ambas temporadas. Ninguno gana. Los mejores: rebotes NBA −3.5%, carreras anotadas MLB −2.9%, RBIs MLB −2.4%, carreras limpias MLB −1.6% ±4.0.
- **NFL va al revés:** el Más pierde menos (yardas recibidas −2.4% ±3.1). Pases de touchdown, Más +0.7% ±8.9 con 484 props: no se distingue de cero.

Las filas incluyen líneas alternas del mismo jugador, así que no son todas independientes. Los ± se quedan cortos. Con margen de 7-8%, haría falta una ventaja grande para ganar, y no aparece.
