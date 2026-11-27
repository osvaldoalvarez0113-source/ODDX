# Bitácora de la mejora diaria de OVA

La tarea programada «Mejora diaria de OVA» quedó **apagada el 27-nov-2026 por decisión de Osvaldo**: ahora cada cosa que él pide se corre
en el momento, sin dejar nada para después. Esta bitácora sigue como registro de lo medido y de las ideas en cola. Lo ya medido está en `INDICE.md`.

## Cola de ideas (por medir)

- **Fuentes de datos gratis de machina-sports/sports-skills** (anotada el 27-nov-2026 a pedido de Osvaldo). Revisar su lista de
  fuentes «profundas» por liga (además de ESPN) en https://github.com/machina-sports/sports-skills (`skills/<deporte>/references/`)
  y ver si alguna trae un dato que OVA no tenga y que se pueda medir contra el precio de cierre. NO instalar la skill (riesgo medio
  en la revisión de seguridad de skills.sh y OVA ya hace lo que hace su parte de apuestas): solo usarla como pista de datos.
  Ojo: casi todo lo que traería necesita bajar datos nuevos (no se puede medir con lo guardado).
- **xG real en el fútbol (Understat u otra fuente con historia)** (27-nov-2026, pedido de Osvaldo hablando del Forest vs Chelsea). El modelo
  de fútbol solo probó un «xG aproximado» hecho con tiros (tiros a puerta + 0.1 × tiros fuera, `resultados-futbol-xg`, no mejoró). Nunca
  se probó el xG de verdad (calidad de cada tiro). Bajar xG a favor y en contra por partido de las 5 ligas (Understat tiene desde 2014),
  meterlo en los ratings del modelo (mezcla goles/xG) y medir en aciertos y pérdida 1X2: ajusta en unas temporadas, prueba en otras.
  Si pasa: entra al modelo y se puede mostrar «juega mejor/peor de lo que dice la tabla» en el Veredicto (lo aprueba Osvaldo).
  Ojo: en la NHL el xG real (MoneyPuck) no ayudó; hace falta bajar datos nuevos (no se mide con lo guardado).
Ya cubiertas por mediciones viejas (no repetir): movimiento de línea en vivo (Management Science 2024, «Inefficient Forecasts at the
Sportsbook») → `MEDICION-MOVIMIENTO-2026-11.md`; sesgo favorito-perro de NBA/NHL/NFL/MLB (Woodland & Woodland en la NHL) →
`MEDICION-RECALIBRAR-2026-11.md`; y TIGRE (movimiento rápido y acumulado: 4,033 avisos, gana 48.3% contra 49.3% que promete).

## En vigilancia

- **Reloj del cuerpo NFL** (equipo del oeste de visita a la 1 p. m. del este): pasó la regla al revés de la literatura (+9.7 pts, 107
  juegos, z 2.2). Revisar en enero de 2027 SOLO con los juegos de la temporada 2026 que no estaban en la medición (`reloj_nfl.py`).
  **Ojo (27-nov, tarde):** esos 107 incluyen la NFL 2019, que trae líneas en vivo. Sin 2019: 93 juegos, 62.4% contra 53.2%, z **1.91**
  → con datos limpios **ya no pasa** la regla. Sigue en vigilancia solo por curiosidad; no cuenta como señal.

## Hechas

| Fecha | Idea | De dónde salió | Resultado |
|---|---|---|---|
| 2026-11-27 | Recalibrar el % del mercado (sesgo favorito–longshot) | Historia de la liga + literatura | No pasa en NBA, NHL, NFL ni MLB |
| 2026-11-27 | Juegos de división | Literatura de la NFL | No pasa en NFL, NHL ni NBA |
| 2026-11-27 | Reloj del cuerpo en la NFL (oeste a la 1 p. m. del este) | Estudios de ritmo circadiano | Pasa al revés con 107 juegos: en vigilancia, no entra. Sin NFL 2019 (líneas en vivo): z 1.91, no pasa |
| 2026-11-27 | **Hándicap + total → % de ganar** (NBA y NFL): ¿el % que sale del hándicap de cierre, con σ que crece con el total, es más exacto que el moneyline? | Stern 1991; arXiv 1211.4000 y 2212.08116 | **No pasa.** NBA 7,254 juegos: pérdida −0.57/−0.67/−0.23 milésimas (A/B/C), aciertos 67.98% → 67.76%. NFL 1,683: −0.96/−0.92/−0.33, 66.90% → 66.61%. Holm: 0 de 6. Hallazgo: NFL 2019 trae líneas en vivo. `MEDICION-HCAP-TOTAL-2026-11.md` |
| 2026-11-27 | **Tenis: corregir el % de Kalshi por el sesgo favorito-perro** (una curva, y una por circuito) | `MEDICION-TENIS-BATERIA-2026-11.md` + literatura favorito-longshot | **No pasa.** 7,483 partidos; fuera de muestra empeora (−0.29 y −0.65 milésimas, t −1.4 y −2.2), aciertos 5,173 → 5,175 / 5,172; la pendiente de la WTA cambia de 0.92 a 1.23. `MEDICION-TENIS-CALIBRAR-2026-11.md` |
| 2026-11-27 | **NFL 2019 sin líneas en vivo**: se repitieron sorpresas, memoria, gemelos, recalibrar, división, reloj e investigador sin 2019 | Hallazgo de la medición de hándicap + total | Solo cambia el reloj NFL (deja de pasar). Se sacó 2019 en `sorpresas.py` y en la historia de la liga. `MEDICION-HCAP-TOTAL-2026-11.md` |
| 2026-11-27 | **NHL 2025-26 con favoritos flojos** (55.5%) | Mismo hallazgo | La línea es de cierre y la apertura da igual: temporada pareja de verdad, no error |
