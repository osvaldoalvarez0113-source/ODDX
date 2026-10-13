# Medición de las reglas de la Mesa (octubre 2026)

Se midieron con datos reales los parámetros que decide la Mesa: el corte de **Candidato** (62 % MLB/NBA, 52 % fútbol), el de **Cuidado** (55 % / 45 %), la tolerancia de **coincidencia** con el mercado (3 y 6 puntos) y qué hacer cuando el modelo y el mercado **chocan**.

**Datos:** MLB 6 171 juegos (2024-2026, línea de cierre de DraftKings vía ESPN) · fútbol 5 256 partidos (5 ligas, 2023-24 a 2025-26, cierre de Pinnacle) · NBA del backtest que ya existía. Ningún dato se usó para ajustar el modelo, solo para medir las etiquetas.

## Resultados

| | MLB (n) | Ganó | ROI al precio real | Fútbol (n) | Ganó | ROI Pinnacle |
|---|---|---|---|---|---|---|
| Candidato (modelo ≥ corte) | 547 | 67,1 % ± 2,0 (modelo decía 64,9) | +1,1 % ± 3,1 | 2 037 | 64,5 % ± 1,1 (modelo 62,1) | −3,4 % ± 1,7 |
| Cuidado | 2 427 | 57,8 % | −3,7 % | 1 229 | 51,1 % | −0,4 % |
| Evitar | 3 197 | 52,6 % | −3,3 % | 1 990 | 41,4 % | −1,9 % |

1. **Los cortes están bien calibrados como «probabilidad de ganar».** Los Candidatos ganaron lo que decían (o un poco más). Subir el corte sube el porcentaje de aciertos, pero **ningún nivel da ROI positivo significativo** a los precios reales. La Mesa dice «probable ganador», no «apuesta con ventaja».
2. **La tolerancia de 3 puntos no tiene nada especial.** Con 1, 2, 3, 4, 5, 6 u 8 puntos los resultados son iguales dentro del margen de error. Se deja como está porque es solo la etiqueta del chip.
3. **Cuando modelo y mercado eligen favoritos distintos, el mercado tiene la razón.** MLB (n = 1 368): el modelo decía 53,2 %, el mercado 45,4 %, ganó 46,6 %. Fútbol (n = 583): el modelo decía 40,4 %, el mercado 30,9 %, ganó 26,2 % (ROI −16,6 % ± 5,9). NBA: el peso del modelo sale ≈ 0 y el mercado es mejor en log-loss (z ≈ 5,9).
4. **Bajar un nivel cuando «chocan» por puntos no estaba justificado.** El mercado calibra mejor (log-loss), pero los Candidatos «que chocan» no ganaron distinto de los que coinciden: MLB 64,9 % ± 3,3 contra 68,9 % ± 3,4, fútbol 66,1 % ± 1,6 contra 63,2 % ± 2,0 (signos contrarios, dentro del margen). Cuando el modelo está más bajo que el mercado con el mismo favorito (n = 988 en MLB) el mercado acertó: 64,6 % dicho, 65,0 % ganado, y la regla vieja los penalizaba.
5. **Una mezcla 50/50 de modelo y mercado acierta más que el modelo solo** con el mismo corte: MLB ≥ 62 %: 70,9 % (n = 676) contra 67,1 % (n = 547); fútbol ≥ 52 %: 65,9 % contra 64,5 %. ROI sin cambio (≈ el margen de la casa).

## Qué cambió en la Mesa

- Con mercado disponible, el porcentaje y el nivel (Candidato / Cuidado / Evitar) se calculan con la **mezcla 50/50** (`mezclar`). Sin mercado, se usa el modelo solo, igual que antes.
- **Favoritos distintos → siempre «Parejo · evitar»**, en las tres apps.
- Se quitó el «baja un nivel si chocan por puntos» y el bonus/castigo de ordenamiento por coincidir o chocar: el orden usa el porcentaje de la mezcla.
- Se mantienen los cortes 62/55 (MLB y NBA) y 52/45 (fútbol), la tolerancia de 3 y 6 puntos para los chips, y «datos flojos baja un nivel».

## Si el objetivo es solo acertar el ganador (sin buscar ventaja)

Cuando el modelo y el mercado eligen favoritos distintos, el favorito del **mercado** gana más: MLB 53,4 % (n = 1 368) contra 46,6 % del modelo; fútbol 44,1 % contra 26,2 % del modelo (n = 583). Como pick de «quién gana» es lo correcto, pero son juegos casi parejos (53 % en MLB) y jugarle al mercado a su precio rinde −6,1 % ± 2,4 en MLB y +5,3 % ± 5,0 en fútbol (no distinguible de cero). La Mesa ahora muestra «Mercado prefiere a X» en esos juegos.

## Qué NO dice la medición

- No encontró una regla que gane dinero. Eso ya lo sabíamos del backtest del modelo; la Mesa ayuda a **descartar** y a **confirmar**, no a crear ventaja.
- 2024 y 2025 por separado tienen pocos Candidatos (91 y 144 en MLB); los márgenes son anchos. Revisar cuando haya otra temporada.

## Cómo repetirlo

`scripts/medicion/` — `medir_mesa_futbol.js` (corre en GitHub Actions con `.github/workflows/medir-mesa.yml`, escribe los partidos en la rama `resultados-mesa`) y los análisis `analisis_mlb.py`, `analisis_futbol.py`, `analisis_mezcla.py` (leen los JSON bajados).
