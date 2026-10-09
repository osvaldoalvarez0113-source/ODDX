# Auditoría de octubre 2026

Alcance: todo el repo ODDX (114 archivos): las cinco páginas, los JS, el service worker, los workflows de GitHub Actions, los scripts y los ~22 backtests.
Cómo se verificó: las pruebas de `pruebas.js` (137 en el original → 150 ahora; las nuevas son de estructura y 8 de ellas fallan contra el repo original, es decir, detectan los defectos de abajo), un humo con Chromium sin interfaz, un E2E de MLB con la red simulada (statsapi, open-meteo, Railway), y una simulación de la API de GitHub para probar la subida.

No se pudo probar: el servidor Railway real (el sandbox bloquea ese dominio), el Worker de Cloudflare real, y los secretos de Actions. Eso está marcado abajo como «tuyo».

## Lo que se arregló

| # | Hallazgo | Gravedad | Qué se hizo |
|---|---|---|---|
| 1 | El parche de Railway estaba **dos veces**: pegado dentro de `index.html` y en `railway.js`. Las dos copias pintaban la misma caja y se pisaban (reproducido en el E2E: caja duplicada / dos peticiones al servidor). | Alta | Una sola copia en `railway.js`, con guardas contra doble pintado. Se cortó la de `index.html`. |
| 2 | El Veredicto muestra los números del **servidor**, pero «Guardar», «Al gane», el ranking de valor y el combo usan los de **OVA propio**. Si difieren, lo que ves y lo que se registra en Mis picks no es lo mismo. | Alta | La caja ahora muestra el número propio de OVA y la diferencia; se resalta si pasa de 1.5 pts. Interruptor `APLICAR_ARRIBA` en `railway.js` (ponlo en `false` si prefieres que el Veredicto use siempre OVA). |
| 3 | `ova_formula.py` tenía `BONUS_LOCAL = 0.12`; la app usa `0.59`. Cualquier cosa calculada con el .py daba ~2.8 pts menos al local. | Alta | Corregido a 0.59 y con aviso de sincronía. **El servidor Railway puede tener el mismo error** (ver «Tuyo»). |
| 4 | `esc()` en `index.html` y `futbol.html` escapaba `< > &` pero no comillas: un nombre con `"` o `'` rompía atributos HTML. | Media | Ahora escapa también `"` y `'`. Hay prueba que lo vigila. |
| 5 | `valor-pinnacle.yml` (41 KB) **reescribía los scripts** con `cat > x.js <<EOF` en cada corrida, llamaba a `valor.js` y `parche.js` que no existían, y hacía `git add index.html` (podía pisar tus cambios con una copia vieja). | Alta | El escáner es ahora `scripts/valor.js` (archivo real, revisable). El workflow solo hace commit de `pinnacle-datos.json`, tiene `concurrency` para no solaparse y avisa si falta el secreto. |
| 6 | El tema de avisos `NTFY_TOPIC` caía a `my-bets`, un tema público: cualquiera que lo adivine lee (o manda) tus avisos. | Media | El workflow imprime una advertencia si el secreto no existe. Crea el secreto con un nombre largo y aleatorio. |
| 7 | `sw.js` no guardaba `pinnacle.js`: sin internet la app cargaba sin la capa de Pinnacle. | Media | Añadido. La prueba ahora deriva la lista de los `<script src>` reales para que no vuelva a pasar. |
| 8 | 12 archivos con **espacios en el nombre** (`correr mercado.js`, `ova formula.py`, `backtest umbral v4.html`, ` mercado.yaml`…). Desde el iPhone dan 404 o se suben cambiados. | Media | Renombrados / movidos. Prueba nueva que prohíbe espacios. |
| 9 | Dos workflows con extensión `.yaml` y uno con un espacio al inicio del nombre, más duplicados de `correr_mercado`. | Baja | Reemplazados por `mercado.yml`, `deportes.yml` y `pruebas.yml`. |
| 10 | ~85 archivos sueltos en la raíz: `parche*.html`, `push*.html`, `auto*.html`, `inspector*.html`, `test*.html`, `datos_*.json`, `probesavant`, `clave33`. Ya aplicados, siguen publicados en Pages y abultan el repo. | Media | Borrados (siguen en el historial de git). Los backtests pasaron a `backtests/` con un índice. |
| 11 | Un comentario de `index.html` decía que la clave de Anthropic «va pegada en el código». Ya no es cierto (vive en el Worker) y confunde. | Baja | Comentario corregido. |
| 12 | `manifest.json` sin `id` (iOS/Chrome pueden duplicar el icono si cambia `start_url`) y descripción sin NBA. | Baja | Añadidos. |
| 13 | La etiqueta de versión seguía en v49. | Baja | v50, para confirmar en pantalla que la actualización llegó. |
| 14 | Sin README ni `.gitignore`; las constantes del modelo solo estaban en la cabeza de quien las midió. | Baja | `README.md` con mapa de carpetas, procedimiento de actualización, tabla de constantes y secretos. |

## Qué NO se tocó (a propósito)

- **La fórmula de MLB.** Las constantes (`MULT 6`, `BONO_LOCAL 0.59`, `DISP 2.3`, `ENCOGE 0.45`, `F5_FRAC 0.56`, topes 22–78 %) salen de backtests tuyos; cambiarlas sin medir sería inventar. `PRIOR_ERA = 40` es la única que el README marca como «supuesto, nunca medido».
- Fútbol (Poisson + Dixon-Coles) y NBA (rating de margen): revisados, sin errores encontrados.
- La clave `ventaja_picks_v1` de localStorage: ahí viven tus picks.

## Tuyo (fuera del repo, no pude hacerlo yo)

1. **Worker `ova-ia` (Cloudflare).** Pega `worker/ova-ia.js` como nuevo código: acepta solo tu página, fija el modelo (variable `MODELO`, por defecto `claude-sonnet-5-5`), topa tokens/búsquedas/largo del prompt. Y pon un **límite de gasto** en console.anthropic.com: sin eso, cualquiera que encuentre la URL del Worker gasta tu saldo.
2. **Servidor Railway (repo Betbot).** Revisa que use `BONO_LOCAL = 0.59` (ver hallazgo 3). Si usaba 0.12, el servidor le daba menos al local que la app.
3. **Secreto `NTFY_TOPIC`** en Settings → Secrets → Actions, con un nombre largo y aleatorio; suscríbete a ese tema en la app ntfy.
4. **Settings → Actions → General → Workflow permissions: Read and write** (si no, el escáner no puede guardar `pinnacle-datos.json`).
5. El token para subir esta auditoría necesita **Contents: Read and write** y, para los 4 workflows, **Workflows: Read and write**. Sin lo segundo, se sube todo lo demás y los workflows se suben a mano.

## Riesgos que quedan

- El modelo sigue dependiendo de `statsapi.mlb.com` sin respaldo: si cambia el formato, la app muestra vacío (las pruebas cubren los casos conocidos, no los futuros).
- `localStorage` en iOS puede borrarse si el Safari se queda sin espacio; el respaldo en IndexedDB (`ovaextra.js`) ayuda, pero exporta tus picks de vez en cuando con el botón de respaldo (`ovaextra.js`).
- Los backtests miden 2025–2026; una constante que hoy parece medida puede dejar de serlo. Repite `backtestmercado.html` al inicio de cada temporada.
