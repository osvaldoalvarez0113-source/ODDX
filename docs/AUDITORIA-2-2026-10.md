# Segunda auditoría (octubre 2026)

Alcance: el zip completo del repo (el mismo estado que ya estaba publicado, con la Mesa incluida): 6 páginas, 19 JS, service worker, 8 workflows, scripts, backtests y docs.

Cómo se verificó: sintaxis de todos los scripts (los de archivo y los inline de cada HTML), referencias locales rotas, ids duplicados, búsqueda de secretos, humo con Chromium sin interfaz en las 6 páginas a 390 px (errores de consola, desborde horizontal, alt, nombres accesibles, tamaño de los botones), revisión de cada punto donde se pinta texto de APIs con innerHTML, funciones sin uso, localStorage sin try/catch, workflows. 398 pruebas pasan (389 antes).

## Estaba bien (no se tocó)

- 0 errores de sintaxis, 0 referencias rotas, 0 secretos, 0 ids duplicados, 0 errores de consola, 0 desborde horizontal en las 6 páginas.
- Todo localStorage/sessionStorage ya va dentro de try/catch.
- Las cuentas de MLB (`esc()` en origen para abreviaturas de equipo), el Worker (solo tu página, modelo y topes fijos) y los workflows (permisos mínimos, `concurrency`, `pull --rebase` antes de subir).

## Lo que se arregló

| # | Hallazgo | Gravedad | Qué se hizo |
|---|---|---|---|
| 1 | **Fútbol pintaba sin limpiar los nombres y escudos que vienen de ESPN** (`p.local`, `p.visita`, `escudoLocal`…) en unos 70 sitios con `innerHTML`. ESPN es fuente confiable, pero un nombre con `<` o `"` rompía la pantalla (o algo peor). | Media | Se limpian **una vez, en el origen** (`nomSeguro` y `urlSegura`) en las 5 puertas de entrada: `parseESPN`, el scraping, los resultados y `selecciones.js`. Un nombre real nunca lleva `< > "`, así que no cambia ninguno. |
| 2 | NBA: `esc()` no escapaba la comilla simple (MLB y fútbol sí desde la auditoría 1). | Baja | Igualado. |
| 3 | MLB: al cargar varios juegos, **cada juego pedía de nuevo** la misma estadística de liga (ligaEra, kLiga, standings…) a statsapi: la caché solo guardaba el resultado cuando ya había llegado, no la petición en curso. | Media | `j()` comparte las peticiones iguales que salen a la vez (se comparte el texto, no el objeto, así nadie le cambia los datos a otro). Probado: 3 peticiones iguales = 1 llamada de red, y cada quien recibe su propio JSON. |
| 3b | Botones del encabezado de fútbol y NBA (🎨, 🔍, selector de liga) medían 29–30 px de alto. | Baja | Mínimo de 38 px. |
| 4 | Dos funciones sin ningún uso (`impDe`, `iaSinAcentos`). | Baja | Borradas. |
| 5 | `pruebas.yml` se disparaba cada vez que el escáner guardaba `pinnacle-futbol.json` o `pinnacle-nba.json` (solo ignoraba el de MLB). | Baja | Los tres datos del mercado se ignoran. |
| 6 | La Mesa: el texto de introducción ocupaba un cuarto de la pantalla. | Baja | Dos frases. |

## Qué NO se tocó (a propósito)

- **Ninguna fórmula ni constante** de MLB, fútbol o NBA.
- La recarga única por sesión al abrir `index.html` (`ventaja_fresco`): hoy es redundante con el service worker de red primero, pero quitarla no se puede probar en un iPhone real desde aquí y solo cuesta una carga extra.
- El selector de liga de fútbol muestra «Premi…» recortado: el encabezado de 390 px no tiene más espacio (título + 3 botones). Se ve completo al abrirlo.
- `viewport-fit=cover` solo falta en `futbol.html`: agregarlo cambia los márgenes de la barra de abajo y no se puede verificar en un iPhone real desde aquí.
- `sonda.yml` y `scripts/sonda.js` (diagnóstico manual de OddsPapi): siguen por si hay que repetir la sonda.

## Tuyo (no se puede hacer desde el repo)

1. **Los escáneres de Pinnacle corren 3 veces al día para MLB (10:30, 13:30 y 16:30 hora de Chicago) y 2 para fútbol/NBA.** Para juegos de noche, a las 7–9 pm los precios tienen entre 2.5 y 4.5 horas (la Mesa solo avisa «cuotas viejas» a partir de 8 h) y las líneas se mueven. Si tu plan de OddsPapi lo aguanta, agrega una corrida a las 22:30 UTC en `valor-pinnacle.yml` (te lo hago si me dices cuántas consultas tienes al mes).
2. Límite de gasto mensual en console.anthropic.com para la clave del Worker (la Mesa y la 🦈 IA gastan de ahí).
3. Prueba en el iPhone real: la Mesa con juegos de hoy (lineups, mercado) y el cruce de nombres en fútbol.
