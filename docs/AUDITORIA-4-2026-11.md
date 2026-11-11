# Cuarta auditoría (11 de noviembre de 2026)

Alcance: todo el repo con las 6 apps (MLB, fútbol, NBA, NHL, NFL, tenis), el hub, «Lo mejor de hoy», Herramientas, Panel,
32 workflows, 28 scripts, 2 Workers y los datos.

## Cómo se verificó
- Las 11 pantallas cargadas en un navegador de 390 px: errores, desborde, ids repetidos, botones chicos, archivos que faltan.
- **NBA, NHL y NFL con juegos simulados** (marcador de ESPN de mentira con cuotas, más los archivos reales de lesionados y
  Kalshi): los 3 juegos de cada app abiertos, sus 6 pestañas, Al gane, Mis picks, Ratings y el Escáner.
- Los mismos juegos con **nombres y abreviaturas maliciosas** (HTML dentro del nombre) para ver si algo se cuela.
- Que las escaleras vayan en orden y que los porcentajes sumen lo que deben, leído de la pantalla.
- Las 32 automatizaciones: horario, permisos, secretos, scripts que existen y sus últimas corridas.
- Búsqueda de claves filtradas, `eval`, enlaces inseguros, archivos sin uso, service worker contra lo que carga cada página.
- 893 pruebas automáticas (13 nuevas).

## Estaba bien
- 0 errores de consola, 0 desbordes, 0 ids repetidos en las 11 pantallas; ningún archivo local falta.
- Las 13 automatizaciones que corrieron en los últimos días terminaron bien (0 fallas). Los robots de datos escriben en ramas
  de un solo commit, así que el repo no engorda.
- Ninguna clave en el código. Los Workers solo responden a tu página; el de IA sigue apagado.
- OddsPapi: los topes siguen sumando 250 o menos y ningún workflow con la clave corre por push.
- Escaleras de hándicap y totales en orden, márgenes y resultado a 60 min suman bien, en los 9 juegos simulados.
- NBA y «Lo mejor de hoy» aguantaron los nombres maliciosos sin colar nada.
- El service worker lista todo lo que cargan las páginas y nada que no exista.

## Lo que se arregló

| # | Hallazgo | Gravedad | Qué se hizo |
|---|---|---|---|
| 1 | **NHL y NFL pintaban la abreviatura del equipo sin limpiar** en más de 200 sitios de la pantalla. Si ESPN mandara HTML ahí, se ejecutaba en tu app. | Media (depende de que ESPN falle o lo intervengan) | La abreviatura se limpia en el origen: solo letras y números (`abLimpia`). Probado con nombres maliciosos: 0 colados. |
| 2 | **Si la memoria del teléfono se llenaba, guardar un pick fallaba en silencio.** Safari da ~5 MB para todas las apps juntas y solo NHL + NFL + NBA ya guardan ~0.9 MB de copias de datos. Nada lo vigilaba. | Media (en la prueba iba por ~18% solo con esas tres; tu teléfono real lo dice Salud; crece cada temporada) | `ovaextra.js`: si no cabe, borra las copias que se vuelven a bajar solas (nunca picks, banca ni ajustes) y reintenta; si aun así no cabe, sale un aviso rojo. **Herramientas → Salud** muestra cuánto llevas usado y trae un botón para liberar. |
| 3 | Fútbol: el ranking viejo de Al gane pintaba nombres y escudos sin limpiar. | Baja | Limpiados con `escT`. |
| 4 | NBA decía v4.0 arriba y v4.1 en el reporte de diagnóstico. | Baja | Una sola versión (v4.2) y una prueba que las compara. |
| 5 | Un archivo compilado de Python (`__pycache__`) estaba subido al repo y cambiaba solo. | Baja | Fuera del repo y en `.gitignore`. |
| 6 | El manifest y el README no nombraban tenis ni «Lo mejor de hoy». | Baja | Corregidos. |

## Lo que encontré y NO toqué (decides tú)

1. **Quedan 15 diseños que ya no se ofrecen pero se siguen descargando.** El 8-nov elegiste 4 (Oro negro, Cristal, Paneles,
   Bento). Los otros 15 siguen dentro de `interior.js` e `interior2.js` (174 KB en cada app, casi un tercio de lo que baja
   NBA, NHL o NFL). No rompen nada; borrarlos aligera la carga. Es una cirugía grande (CSS y pruebas enlazadas), por eso no la
   hice sin avisar.
2. **NBA es una copia aparte de NHL/NFL.** `nba.html` trae su propio lector de ESPN, de cuotas y de tarjetas; NHL y NFL
   comparten `usdeporte.js`. Cada arreglo hay que hacerlo dos veces (el hallazgo 1 existía en uno y no en el otro por eso).
   Lo sano a mediano plazo es pasar NBA a `usdeporte.js`.
3. **Tenis no sale en Herramientas** (Marcador, Auto ni Salud): lleva su propio registro adentro de su app.
4. **Las versiones no te dicen si tienes lo último.** NHL, NFL y tenis dicen «v1.0» desde que nacieron aunque cambian cada
   semana. Sugerencia: mostrar la fecha de la última subida en vez de un número a mano.
5. **112 ramas en GitHub**, la mayoría de experimentos y mediciones ya terminadas (`experimento-*`, `resultados-*`,
   `sonda-*`, `var-S*`, `rival-S*`). No estorban a la app; se pueden borrar las que ya tienen su documento en `docs/`.
6. **Avisos de MLB siguen corriendo cada 30 min en noviembre**, sin temporada. No cuesta dinero (repo público); se puede
   cortar a marzo–octubre.
7. `pinnacle-datos.json` (MLB) es del 24 de octubre: normal, se acabó la temporada. `pinnacle-futbol.json` está vacío hoy:
   hay parón de selecciones, sin juegos de liga en 72 h.
8. `datos-nhl.json` y `datos-nfl.json` (3.8 MB) viven en `main` y solo los usa la medición. Podrían ir a una rama de datos.

## Límites de esta auditoría
- **MLB, fútbol y tenis no se probaron con juegos simulados**: MLB está fuera de temporada, fútbol en parón, y simular sus
  fuentes (MLB Stats, worldfootball, torneos de ESPN) no se hizo. Se revisaron en carga, por código y con las pruebas.
- Las fórmulas no se volvieron a derivar una por una; se comprobó que lo que sale en pantalla sea coherente entre sí. Su
  acierto real lo dicen las mediciones de `docs/` y la pestaña Auto.
- Todo fue en Chrome simulando un iPhone, no en Safari de verdad. La guardia de memoria se probó con un almacén de prueba y
  en Chrome; el límite exacto de Safari puede variar.
- No se entró a Cloudflare ni a Railway: solo se leyó el código de los Workers que está en el repo.
