# Índice de documentos

Auditorías, mediciones y rondas de diseño de OVA, por tema.

| Archivo | Tema |
|---|---|
| [`MEDICION-XG-FUTBOL-2026-11.md`](MEDICION-XG-FUTBOL-2026-11.md) | **xG real (Understat, vía Hugging Face) en el modelo de fútbol**: mitad goles y mitad xG acierta +22 de 3,420 en 2022-25 (t 3.5), pero en la vuelta y en 2016-20 no se distingue de cero. No pasa por poco; falta fuente de xG en vivo |
| [`MEDICION-TENIS-CALIBRAR-2026-11.md`](MEDICION-TENIS-CALIBRAR-2026-11.md) | **Tenis: corregir el % de Kalshi** por el sesgo favorito-perro (ATP, WTA): fuera de muestra empeora, la pendiente cambia entre 2025 y 2026. No entra |
| [`MEDICION-HCAP-TOTAL-2026-11.md`](MEDICION-HCAP-TOTAL-2026-11.md) | **Hándicap + total → % de ganar** (NBA, NFL): el % del hándicap de cierre (con o sin el total) no es más exacto que el moneyline; 0 de 6 pasan. Ojo: NFL 2019 de `datos-nhl-nfl` trae líneas en vivo |
| [`MEDICION-RELOJ-NFL-2026-11.md`](MEDICION-RELOJ-NFL-2026-11.md) | **Reloj del cuerpo NFL**: equipo del oeste de visita a la 1 p. m. del este gana 64.5% contra 54.7% de su precio (107 juegos, z 2.2), al revés de la literatura. Sin la NFL 2019 (líneas en vivo) baja a z 1.91 y ya no pasa. **En vigilancia** hasta enero, no entra |
| [`MEDICION-DIVISION-2026-11.md`](MEDICION-DIVISION-2026-11.md) | **Juegos de división** (NFL, NHL, NBA): el no favorito no gana más que su precio. No entra |
| [`MEDICION-RECALIBRAR-2026-11.md`](MEDICION-RECALIBRAR-2026-11.md) | **Recalibrar el % del mercado** (sesgo favorito–longshot) en NBA, NHL, NFL y MLB: existe pero es chico e inestable; no mejora fuera de muestra. No entra |
| [`MEDICION-MEMORIA-2026-11.md`](MEDICION-MEMORIA-2026-11.md) | **Memoria fraccionaria** (cálculo fraccionario) en la forma: pesos k^(−α) contra últimos 10, temporada y exponencial. Ninguna forma mejora al precio de cierre en NBA, NHL ni NFL. No entra |
| [`MEDICION-GEMELOS-2026-11.md`](MEDICION-GEMELOS-2026-11.md) | **Gemelos del juego**: los 20/50/200 juegos más parecidos del archivo no predicen mejor que el precio (NBA, NHL, NFL; empeoran el Brier). No entra a la app |
| [`MEDICION-SORPRESAS-2026-11.md`](MEDICION-SORPRESAS-2026-11.md) | **Sorpresas**: cuándo gana el no favorito más de lo que dice su precio (NBA, NHL, NFL; 52 situaciones). Ninguna; en NBA la racha del no favorito engaña (gana 30.7% contra 38.2%) y entra como señal en el Veredicto |
| [`MEDICION-MEJORAS-2026-11.md`](MEDICION-MEJORAS-2026-11.md) | **«Haz todo para mejorar»**: clima MLB con cierres 2023-2026, ritmo NBA y árbitros NBA/NHL. Nada entra; árbitros NBA en el total queda en vigilancia (~52%) |
| [`MEDICION-MOVIMIENTO-2026-11.md`](MEDICION-MOVIMIENTO-2026-11.md) | **Movimiento de la línea** (apertura → cierre) en 12,850 juegos de NHL, NFL, MLB y NBA: el cierre acierta ~1 punto más; con el mismo %, el movimiento no agrega aciertos |
| [`HISTORIA-LIGA-2026-11.md`](HISTORIA-LIGA-2026-11.md) | **📚 Historia de la liga**: cuánto acierta el favorito por zona con ~58,000 juegos ya jugados (NBA, NHL, NFL, fútbol, tenis); alimenta la línea 🏆 desde hoy |
| [`NUTRIR-MODELO-2026-11.md`](NUTRIR-MODELO-2026-11.md) | **Nutrir el modelo**: patrones y props medidos contra el modelo y en aciertos; ESPN entra a NBA y NFL, el viento al total de NFL |
| [`AUDITORIA-2-2026-10.md`](AUDITORIA-2-2026-10.md) | Segunda auditoría (octubre 2026) |
| [`AUDITORIA-4-2026-11.md`](AUDITORIA-4-2026-11.md) | Cuarta auditoría (11 nov 2026): 6 apps con juegos simulados, seguridad, memoria del teléfono |
| [`AUDITORIA-3-2026-10.md`](AUDITORIA-3-2026-10.md) | Tercera auditoría (25 oct 2026) |
| [`AUDITORIA-2026-10.md`](AUDITORIA-2026-10.md) | Auditoría de octubre 2026 |
| [`MEDICION-6-TEMPORADAS-2026-10.md`](MEDICION-6-TEMPORADAS-2026-10.md) | Medición con 6 temporadas — MLB, fútbol y NBA (octubre 2026) |
| [`MEDICION-DIFERENCIA-CUOTAS-2026-10.md`](MEDICION-DIFERENCIA-CUOTAS-2026-10.md) | Diferencia de cuotas: ¿cuántas veces gana el favorito? (MLB y fútbol, octubre 2026) |
| [`MEDICION-FIP-2026-10.md`](MEDICION-FIP-2026-10.md) | FIP del abridor: medición de octubre 2026 |
| [`MEDICION-FUTBOL-PENDIENTES-2026-11.md`](MEDICION-FUTBOL-PENDIENTES-2026-11.md) | **Fútbol: lo que faltaba**: Ambos anotan, cuota previa, alineaciones, copas europeas, copas nacionales y selecciones |
| [`MEDICION-FORMULA-CALIBRADA-2026-11.md`](MEDICION-FORMULA-CALIBRADA-2026-11.md) | **¿Una fórmula que corrija al modelo con su diferencia contra el mercado?** No mejora en ningún deporte |
| [`MEDICION-MLB-RIVAL-2026-11.md`](MEDICION-MLB-RIVAL-2026-11.md) | **MLB ajustado por rival y con curva**: no mejora; la fórmula queda igual |
| [`MEDICION-PERIODOS-2026-11.md`](MEDICION-PERIODOS-2026-11.md) | **Por tramos**: 1er cuarto, 1a mitad y 1er periodo juego por juego en NBA, NFL y NHL (`periodos.js`) |
| [`MEDICION-PROPS-JUGADOR-2026-11.md`](MEDICION-PROPS-JUGADOR-2026-11.md) | **Props de jugador** con líneas de apertura de ESPN: NBA, NHL, MLB y NFL |
| [`MEDICION-PICKS-GANADORES-2026-11.md`](MEDICION-PICKS-GANADORES-2026-11.md) | **Picks ganadores**: cuánto acierta cada tramo, qué ayuda a encontrar ganadores y la pantalla nueva |
| [`MEDICION-KALSHI-JUGADORES-2026-11.md`](MEDICION-KALSHI-JUGADORES-2026-11.md) | **Kalshi contra las casas y Pinnacle**, y cambios de jugadores en NBA (regresos, traspasos, continuidad) |
| [`MEDICION-HUECOS-2026-11.md`](MEDICION-HUECOS-2026-11.md) | **Lo que el modelo no lee**: clima, viaje, mariscal, copas entre semana y selecciones |
| [`MEDICION-FUTBOL-COPAS-2026-11.md`](MEDICION-FUTBOL-COPAS-2026-11.md) | **Champions**: fuerza entre ligas con todas las copas europeas, y corrección del registro Auto en NBA, NHL y NFL |
| [`MEDICION-FUTBOL-MOTOR-REAL-2026-11.md`](MEDICION-FUTBOL-MOTOR-REAL-2026-11.md) | **Fútbol con el motor real y datos al día, hasta 2026-27**: qué pasa cuando modelo y mercado discrepan, y cambio a v22 |
| [`MEDICION-FUTBOL-LOCAL-ELO-2026-10.md`](MEDICION-FUTBOL-LOCAL-ELO-2026-10.md) | Fútbol: ¿mejoran el modelo los ratings local/visita, el Elo, la mezcla con el mercado o el descanso? |
| [`MEDICION-MERCADO-MLB-2026-10.md`](MEDICION-MERCADO-MLB-2026-10.md) | MLB contra el mercado: medición de octubre 2026 |
| [`MEDICION-MESA-2026-10.md`](MEDICION-MESA-2026-10.md) | Medición de las reglas de la Mesa (octubre 2026) |
| [`MEDICION-NHL-NFL-2026-10.md`](MEDICION-NHL-NFL-2026-10.md) | Medición de NHL y NFL contra el mercado (octubre 2026) |
| [`MEDICION-OVAEDGE-2026-10.md`](MEDICION-OVAEDGE-2026-10.md) | ovaedge.js: qué hace, qué se conectó y qué no (octubre 2026) |
| [`MEDICION-PICKS-APP-2026-10.md`](MEDICION-PICKS-APP-2026-10.md) | Qué habría dicho la app en 2024-2026 y cuánto habría rendido (MLB, ganador) |
| [`PATRONES-2026-10.md`](PATRONES-2026-10.md) | Patrones contra el mercado: 75 patrones en los 5 deportes, ¿alguno aguanta? (octubre 2026) |
| [`POLYMARKET-DIVERGENCIA.md`](POLYMARKET-DIVERGENCIA.md) | Polymarket contra la línea de cierre: ¿sirve la diferencia como señal? (octubre 2026) |
| [`PROPS-2026-10.md`](PROPS-2026-10.md) | Proposiciones de juego en las 5 apps: cuántas veces pasan, su cuota justa y 47 patrones (octubre 2026) |
| [`RONDA3-DISENO.md`](RONDA3-DISENO.md) | Ronda 3 · diseño unificado (MLB v51 · fútbol v12 · NBA v3.4) |
| [`RONDA4-PRO.md`](RONDA4-PRO.md) | Ronda 4 · pantalla Juegos más limpia + diseño «Pro» (MLB v52 · fútbol v13 · NBA v3.5) |
| [`RONDA6-BOLETO.md`](RONDA6-BOLETO.md) | Ronda 6 — diseño «Boleto» |
| [`medicion-nfl-detalle.md`](medicion-nfl-detalle.md) | NFL · medición contra el mercado |
| [`medicion-nhl-detalle.md`](medicion-nhl-detalle.md) | NHL · medición contra el mercado |

## Auditoría de Muse (30 oct 2026) — aplicado
- P0: cuota OddsPapi (MLB 2 corridas, fútbol/NBA 1 → ≈222 llamadas/mes), escáner en rojo si no hay precio nuevo, XSS de Railway, moneyline de NBA, ranking MLB con la mezcla, «Valor mínimo» por debajo de +2% en NHL/NFL, empate a 60' de NHL (solo para mostrar).
- Historia de precios: rama `historia-precios`, `historia/<archivo>-<AAAA-MM>.jsonl`, una línea por corrida (`scripts/historia_precios.sh`). Octubre relleno desde el historial de git.
- Fútbol: piso 0.5 a la media de goles de liga (un arranque con 0-0 dejaba NaN).
- Worker `ova-ia`: apagado por defecto (`ACTIVO = si` para encenderlo). Ninguna página lo llama. El cambio solo cuenta cuando se vuelve a publicar en Cloudflare.
- [MEDICION-HANDICAP-2026-11.md](MEDICION-HANDICAP-2026-11.md): hándicap ±1.5 de NHL y spreads de NFL por tramo del favorito, con precio real.
- [MEDICION-HEMBRAS-NHL-2026-11.md](MEDICION-HEMBRAS-NHL-2026-11.md): hembras (no favoritos) en NHL por precio, modelo, forma, descanso y movimiento; ninguna regla pasa.
- [MEDICION-XG-NHL-2026-11.md](MEDICION-XG-NHL-2026-11.md): goles esperados de MoneyPuck contra tiros a puerta en el modelo de NHL; no entra.
- [MEDICION-MODELOS-PUBLICOS-2026-11.md](MEDICION-MODELOS-PUBLICOS-2026-11.md): OVA contra nfelo (NFL) y el pronóstico de ESPN (NFL, NBA, MLB); los públicos le ganan a OVA en NFL y NBA, ninguno al mercado.
- [MEDICION-TORNEOS-2026-11.md](MEDICION-TORNEOS-2026-11.md): selecciones (4 años, 19 torneos) y copas nacionales con el motor de las ligas; Elo 59% y copas 58.5% de acierto en 1X2.
- [MEDICION-MEMORIA-EQUIPO-2026-11.md](MEDICION-MEMORIA-EQUIPO-2026-11.md): memoria por equipo (de favorito / de no favorito) en NHL, NFL y MLB; no cambia lo que acierta el modelo, entra como contexto.
- [MEDICION-VALOR-JUGADOR-NBA-2026-11.md](MEDICION-VALOR-JUGADOR-NBA-2026-11.md): valor de cada jugador y bajas en NBA; el modelo solo pasa de 66.0% a 66.7% de aciertos; aplicado en la app.
- [MEDICION-VALOR-JUGADOR-NHL-NFL-2026-11.md](MEDICION-VALOR-JUGADOR-NHL-NFL-2026-11.md): mariscal titular y ataque en NFL, portero que abre en NHL; ninguno pasa, no se aplican al %.
