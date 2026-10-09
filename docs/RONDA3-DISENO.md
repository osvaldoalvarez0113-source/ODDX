# Ronda 3 · diseño unificado (MLB v51 · fútbol v12 · NBA v3.4)

No cambia ningún cálculo. Solo cómo se ve y cómo se navega.

| # | Qué cambió | Dónde |
|---|---|---|
| 1 | La barra de abajo es la misma en las tres apps: **Juegos · Al gane · Combo · Mis picks · Ajustes**. Fútbol y NBA tenían 5–6 pestañas con nombres distintos (Registro, Combina, Backtest, Ratings). | `diseno.js` |
| 2 | Lo técnico (Backtest, Ratings, Diagnóstico) vive en **Ajustes → Avanzado**. Las herramientas pesadas (bajar tiros, calibrar) van en un desplegable cerrado dentro del Backtest. | `diseno.js` |
| 3 | Barra de estado de una línea: «✓ Premier League · 10 partidos del día · 80 resultados leídos · actualizado 9/10, 02:37». Los avisos (worldfootball caído, sin resultados) siguen saliendo. El 🔍 Diagnóstico pasó al encabezado; si la barra está en rojo o ámbar, tocarla abre el diagnóstico. | `futbol.html`, `nba.html`, `diseno.js` |
| 4 | Caja del servidor Railway: una línea («☁️ Servidor · NYY 46% · BOS 54% · ✓ coincide con OVA» o «⚠ OVA propio difiere 2.3 pts») que se despliega al tocar. | `railway.js` |
| 5 | El hub ya no dice «LIVE» fijo: muestra «Top 67% hoy» (si corriste Al gane hoy), «2 pendientes» (picks abiertos) o «Abrir». | `hubestilos.js` |
| 6 | Letra mínima de 12 px en notas y pies, y etiquetas de la barra a 11 px; gris de las notas más claro. | `diseno.js`, `interior.js` |
| 7 | MLB abre con los juegos de hoy ya cargados. `cargar()` ignora respuestas viejas, así que tocar «Cargar partidos» a la vez no duplica juegos. | `index.html`, `diseno.js` |
| 8 | La versión se ve siempre en Ajustes (el tema Cristal oculta la etiqueta del título). | `diseno.js` |

Los botones viejos no se borran: se ocultan y se activan por código, así que todos sus eventos siguen funcionando.
Si `diseno.js` fallara, las apps quedan como estaban antes (cada paso va en try/catch).

## Decisión pendiente (tuya)

`APLICAR_ARRIBA` en `railway.js` sigue en `true`: el Veredicto muestra el número del servidor, y «Guardar», «Al gane» y el combo usan el de OVA. Cuando confirmes que Railway usa `BONO_LOCAL = 0.59`, ponlo en `false` y los dos números pasan a ser el mismo.
