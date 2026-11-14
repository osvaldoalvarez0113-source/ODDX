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
