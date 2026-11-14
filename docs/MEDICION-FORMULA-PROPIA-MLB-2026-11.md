# Fórmula propia de MLB contra OVA y el mercado (noviembre 2026)

Medido el 14-nov-2026. Datos juego por juego con el mismo motor de `backtests/backtestmercado.html` (solo lo que se sabía antes de cada juego, línea de cierre de DraftKings sin vig): rama `medir-mi-formula`, resultados en `mia-S2021` … `mia-S2026` (12,311 juegos). Análisis: `scripts/medicion/formula_propia.py`. **No cambió nada en la app.**

Fórmula propia: regresión logística con 14 datos (ERA del abridor de OVA, FIP, K-BB% de la temporada, K-BB% de 3 años, ERA de 3 años, innings por salida, descanso del abridor, carreras anotadas y permitidas, pitagórico, últimos 10, descanso del equipo, juegos en 7 días, bullpen). Cada temporada se predice con lo ajustado solo en las anteriores (prueba: 2023-2026, 8,233 juegos).

| | Pérdida log | Aciertos |
|---|---|---|
| Mercado | 0.6756 | 57.2% |
| **Fórmula propia** | **0.6798** | 56.1% |
| OVA actual (P40) | 0.6826 | 56.0% |

- Propia contra OVA: −2.8 milésimas, z −2.3; mejor en las 4 temporadas.
- Propia contra mercado: +4.2 milésimas, z +3.8. El mercado sigue ganando.
- Mezclada con el mercado no aporta (+0.5 milésimas, z 1.4; peso 0.12-0.24).

Qué aporta cada dato sumado a la base de OVA (ERA abridor, carreras/j, bullpen, local):

| Dato | Milésimas | z |
|---|---|---|
| K-BB% de 3 años del abridor | −1.60 | −2.9 |
| K-BB% de la temporada | −1.25 | −1.9 |
| Innings por salida | −0.72 | −1.4 |
| ERA de 3 años | −0.33 | −1.1 |
| FIP | −0.19 | −0.5 |
| Descanso, últimos 10, pitagórico, juegos en 7 días | ≈0 | — |

Con K-BB% (temporada y 3 años), innings por salida y pitagórico: 0.6799, −1.85 milésimas contra la base, z −2.5, aciertos 56.5%.

Versión a mano (pesos de 2021-2024, probada en 2025-2026), escala de OVA (MULT 6):
`Δ = (ERA rival − ERA mío)×0.25 + (R/G mío − R/G rival)×0.6 + (carreras permitidas/j rival − mías)×0.7 + (K-BB% mío − rival)×10 + (K-BB% 3 años mío − rival)×5 + 0.55 local`
2025-2026: 0.6792 contra OVA 0.6813 (z −1.6), aciertos 56.1% contra 55.9%; mercado 0.6770 y 57.3%.

**Lectura:** el abridor se mide mejor por K-BB% (temporada + 3 años) que por ERA; el ERA pesa mucho menos de lo que tiene OVA (0.14-0.25 contra 0.65) y el pitcheo del equipo más (0.7-0.9 contra 0.25). Mejora real pero chica (~1 acierto más cada 200 juegos) y no alcanza al mercado. Candidata para MLB 2027, junto con lo pendiente.

## Lineup del día (14-nov-2026)

Fuerza del lineup titular = OPS de 3 años de cada titular (5/4/3, jalado a .700 con 200 PA); se compara con el lineup normal del equipo (sus últimos 30 o 10 juegos). Rama `medir-mi-formula`, datos en `lu-S2021` … `lu-S2026`; script `scripts/medicion/propia/lineup_mlb.py`. Una primera corrida leyó el lineup del final del juego (con los cambios) y salió contaminada; la buena usa solo titulares (battingOrder 100…900).

- Fórmula nueva 0.6782 → con lineup 0.6779 / 0.6774 (z −1.2 / −1.3), mejor en 3 de 5 temporadas. **No pasa; no se monta.**
- El mercado ya lo tiene: cuando el lineup local viene 0.03+ de OPS más fuerte que su normal, el local ganó 61% y el mercado le daba 57%; la fórmula, 54%. En los otros tramos el mercado acierta su % casi exacto.
- Diferencia típica del lineup contra su normal: 0.007 de OPS (90% de los juegos menos de 0.020). Pesa poco porque casi siempre juegan los mismos.
