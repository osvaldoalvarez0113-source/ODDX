# Lo que el modelo no lee (noviembre 2026)

Medido el 4-nov-2026 con `scripts/medicion/huecos_clima.js` (workflow *Medir huecos del modelo*, rama `resultados-huecos`), `huecos_viaje.py` y `huecos_copa_liga.py`. Solo se cambió la app donde la mejora quedó fuera de muestra y es usable antes del juego.

Regla para creerle a un efecto encima de la línea: |z| ≥ 3 y que se repita por temporada. Aquí se probaron unas 30 variables, así que algún |z| cerca de 2.5 sale por azar.

## Se aplicó

**Selecciones (Elo).** K ×1.25, localía 60 en eliminatorias y Liga de Naciones, 40 en amistosos y torneos. Elegido con datos hasta 2022; prueba de 2023 a 2026:

| | Partidos | Antes | Ahora | Mercado |
|---|---|---|---|---|
| Todos | 3,329 | 0.9165 | **0.9050** (z −4.8) | — |
| Con cuota | 2,197 | 0.9037 | 0.8930 | 0.8293 |

Mejora en las 4 temporadas. Por tipo: Liga de Naciones −29.6 milésimas (z −5.2), eliminatorias −10.2 (z −2.6), amistosos −8.1 (z −2.0). Torneos +5.7 y Mundial −3.0 no se distinguen de cero. El mercado sigue muy por encima.

**Clima en NFL.** Se muestra en el Veredicto, sin entrar al cálculo.

## Se midió y no entra

| Hueco | Encima de la línea | Apostando (−110 o cuota real) |
|---|---|---|
| MLB, viento hacia afuera | +0.032 carreras por mph, z 2.9 (mismo signo en 4 de 4 temporadas) | 10+ mph: −0.9% ±5.7 · 15+ mph: −5.5% ±10.5 |
| MLB, viento hacia adentro | z −0.2 | 10+ mph: −5.1% ±9.5 |
| MLB, temperatura | +0.012 carreras por °F, z 2.5 | Con viento, efecto ≥0.5: +3.7% ±8.6 (465) |
| NFL, viento | −0.205 puntos por mph, z −2.8 | 15+ mph: +3.8% ±16.9 (126) |
| NFL, lluvia o nieve | −2.4 puntos, z −1.9 | |
| NFL, frío | z −0.1 | <32°F: −5.9% ±23 |
| NFL, techo cerrado → Más | | +2.5% ±8.1 (545) |
| NFL, mariscal distinto al habitual | −0.63 puntos, z −1.0 | −6.2% ±9.1 (426) |
| NBA, viaje | z de −2.0 a 1.5 | Local en altura: −3.7% ±8.6 |
| NHL, viaje | Hacia el este z −2.1; el resto de −0.7 a 2.3 | |
| NFL, viaje | z de −1.9 a 1.7 | |
| Fútbol, copa ≤4 días antes | +0.037 puntos, z 1.2 | Al rival: −4.7% ±12.4 |
| Fútbol, copa ≤4 días después | +0.032 puntos, z 0.7 | Al rival: +2.8% ±20.2 |

**Trampa del mariscal:** la primera versión dio z −3.3 porque contaba al que más lanzó, y eso incluye lesiones a mitad de juego, que no se saben antes. Contando solo cuando el habitual no lanzó ni un pase, el efecto desaparece.

**En vigilancia, sin aplicar:** viento afuera en MLB y viento en NFL sobre los totales. Hay que verlos con juegos nuevos. Las líneas de MLB son de ESPN, sin 2024 ni 2025 (no las devolvió) y sin garantía de ser el cierre exacto.

## Medido antes y sin efecto encima de la línea

- NHL: portero titular, tiros, power play, 3 juegos en 4 noches (`medicion-nhl-factores.md`).
- NBA: ausencias sobre el spread (z −1.9), posiciones, estrellas. Ausencias sobre el total: z 3.4, pero usa quién jugó de verdad, no la lista previa, y no se repite parejo por temporada.
- MLB: lineup (z −1.1), lanzamientos, paciencia y cansancio del bullpen.
- Fútbol: alineaciones sobre el cierre (z −1.3), descanso, tiros.

## No se pudo medir

Sin datos históricos: noticias de última hora, dinero de apostadores fuertes, motivación y rotaciones anunciadas. Clima de fútbol tampoco se midió: pide estadio por partido.
