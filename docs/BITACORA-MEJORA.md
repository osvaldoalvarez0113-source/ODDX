# Bitácora de la mejora diaria de OVA

La tarea programada «Mejora diaria de OVA» quedó **apagada el 27-nov-2026 por decisión de Osvaldo**: ahora cada cosa que él pide se corre
en el momento, sin dejar nada para después. Esta bitácora sigue como registro de lo medido y de las ideas en cola. Lo ya medido está en `INDICE.md`.

## Cola de ideas (por medir)

Vacía (27-nov-2026): todo lo que estaba en cola se corrió o se cerró. Ver «Hechas».

Ya cubiertas por mediciones viejas (no repetir): movimiento de línea en vivo (Management Science 2024, «Inefficient Forecasts at the
Sportsbook») → `MEDICION-MOVIMIENTO-2026-11.md`; sesgo favorito-perro de NBA/NHL/NFL/MLB (Woodland & Woodland en la NHL) →
`MEDICION-RECALIBRAR-2026-11.md`; y TIGRE (movimiento rápido y acumulado: 4,033 avisos, gana 48.3% contra 49.3% que promete).

## En vigilancia

- **xG real en el fútbol** (mitad goles, mitad xG): señal chiquita a favor en 7 de 9 temporadas. Repetir cuando haya xG de 2025-26 en adelante
  y de Bundesliga/Ligue 1, y si aparece una fuente de xG en vivo que la app pueda leer (`xg_futbol.js`).

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
| 2026-11-27 | **Fuentes de machina-sports/sports-skills** | Pedido de Osvaldo | Revisadas: ESPN, football-data.co.uk, Transfermarkt, Kalshi y Polymarket ya están en OVA; openfootball no trae nada nuevo; FPL (bajas de la Premier) y Sleeper (NFL) solo traen lo de hoy, sin historia para medir; Understat no deja bajar con robots; la API de ClubElo no responde desde GitHub (se intentó, 3 veces). Nada nuevo que se pueda medir hoy |
| 2026-11-27 | **xG real en el modelo de fútbol** | Pedido de Osvaldo (Forest vs Chelsea) | **No pasa por poco.** Con el dataset público de Hugging Face (Understat vía Wayback Machine; Premier, La Liga, Serie A 2014-25): mitad goles/mitad xG acierta 1,827 → 1,849 de 3,420 en 2022-25 (t 3.5), pero la vuelta (t 1.0) y la confirmación 2016-20 (t 0.66) no se distinguen de cero. En vigilancia; falta fuente de xG en vivo. `MEDICION-XG-FUTBOL-2026-11.md` |
| 2026-11-28 | **Sorpresas en MLB** (las situaciones de sorpresas.py llevadas a béisbol, con cierres 2023-2026) | Pendiente «para la temporada» de MLB | **No pasa ninguna** (17 pruebas, 8,284 juegos). «La racha engaña» al revés y sin fuerza en MLB: 45.0% contra 42.7% (z +1.7). `MEDICION-SORPRESAS-MLB-2026-11.md` |
