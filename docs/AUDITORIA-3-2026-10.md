# Tercera auditoría (25 de octubre de 2026)

Alcance: todo el repo después de agregar NHL y NFL (5 apps, hub, Herramientas, Panel, 14 workflows, 29 scripts, 18 backtests, docs).

Cómo se verificó: las 8 pantallas cargadas en un navegador de 390 px de ancho (errores, desborde horizontal, ids repetidos, botones chicos, imágenes sin texto, cada pestaña); el Escáner tocado con un dedo simulado en los **18 diseños × NHL y NFL**; archivos del service worker contra lo que cada página carga; funciones que nadie llama; textos que seguían diciendo «MLB, fútbol y NBA»; workflows y su gasto de llamadas de OddsPapi; las 633 pruebas.

## Estaba bien
- 0 errores de consola, 0 desbordes, 0 ids repetidos, 0 botones menores de 30 px en las 8 pantallas.
- Todas las pestañas de las 5 apps abren con contenido; ninguna queda en blanco.
- El Escáner abre y despliega el detalle en los 18 diseños de NHL y NFL (36 combinaciones).
- Service worker: todo lo que cargan las páginas está en su lista y todo lo de su lista existe.
- Nada de lo que viene de ESPN se pinta sin limpiar en NHL/NFL.

## Lo que se arregló

| # | Hallazgo | Qué se hizo |
|---|---|---|
| 1 | **Las llamadas de OddsPapi no cuadraban**: los topes de los 3 escáneres sumaban 380 y el plan da 250. Se pasaron del límite y el escáner de NHL/NFL quedó sin precios. | Topes: MLB 100 + fútbol/NBA 80 + NHL/NFL 60 = 240. NHL/NFL corre menos veces. Hay una prueba que falla si la suma pasa de 250. |
| 2 | Dos workflows de sonda (`sonda-mercados`, `sonda-nhl-nfl`) **gastaban llamadas cada vez que se tocaba su archivo**. Ya habían cumplido su trabajo. | Borrados con sus scripts. El escáner de NHL/NFL tampoco corre ya al tocar su script. Hay una prueba: ningún workflow con OddsPapi corre por push. |
| 3 | En NHL y NFL el diseño **Campo** dibujaba un diamante de béisbol, y el ícono de «Juegos» era una pelota de béisbol (también en NBA). | Cancha propia por deporte: pista de hockey, campo de fútbol americano, cancha de baloncesto, cancha de fútbol. Íconos propios: disco, balón de fútbol americano, balón de basket. |
| 4 | Fútbol, **Al gane** y **Escáner** mostraban porcentajes distintos sin explicar por qué (modelo solo contra mitad modelo, mitad mercado). | Al gane dice «solo modelo» y trae una nota. |
| 5 | Cinco funciones muertas que nadie llamaba (`calcularForma`, `calcularH2H`, `cargarPerfil`, `pinBloqueFutbol`, `pinNba`). | Borradas (71 líneas menos). |
| 6 | Textos viejos «MLB, fútbol y NBA» (aviso de banca, comentarios, README). | Cambiados a las cinco apps. |
| 7 | Los avisos de MLB corrían cada 30 minutos todo el año, también en invierno. | Solo de marzo a noviembre. |
| 8 | No había forma de ver qué tan frescos están los datos ni de forzar la actualización de la app en el iPhone. | **Herramientas → 🩺 Salud** (ver abajo). |
| 9 | README sin lista de workflows ni de documentos. | Tabla de workflows en el README y `docs/INDICE.md`. |

## Lo nuevo: Herramientas → 🩺 Salud
- Edad y cantidad de juegos del precio de Pinnacle de cada deporte (verde = al día, ámbar = viejo o sin archivo).
- Edad del archivo de partidos de NHL y NFL.
- Cuántos picks lleva guardados cada app, cuántos ya tienen resultado, cuántos faltan y cuándo guardó el último.
- Estado de la copia interna de respaldo de tus picks.
- Botón **Forzar actualización**: borra solo la copia de la app que guarda el teléfono (caché y service worker) y recarga. No toca tus picks, tu banca ni tus ajustes.

## Qué NO se tocó (y por qué)
- **Ninguna fórmula ni constante** de ninguna de las 5 apps.
- Los 18 diseños interiores, los 6 del hub y los temas (`interior.js`, `interior2.js`, `obsidiana.js`, `mejoras.js`, `railway.js`, ~230 KB): funcionan y no estorban la carga (el service worker los guarda). Si algún día quieres adelgazar, el candidato es dejar 4 o 5 diseños; pero eso lo decides tú según cuáles usas.
- `datos-nhl.json` y `datos-nfl.json` (3.7 MB): los usa solo la medición de GitHub, no se bajan a la app.
- `backtests/` (18 páginas sueltas) y `sonda.yml`: son herramientas de medición a mano; no cargan con la app.

## Pendiente y limitaciones conocidas
1. **Cuota de OddsPapi**: este mes ya se gastó. Hasta que se renueve (creo que el 1 de noviembre) NHL y NFL usan las líneas de ESPN. Si quieres precios de Pinnacle más seguido, la salida es subir de plan.
2. **Fútbol guarda solo los juegos de la liga que tienes en pantalla** al abrir la app (cada liga necesita su propio modelo cargado). Mejorarlo exige descargar y calcular todas las ligas en segundo plano; no se hizo para no gastar batería ni datos.
3. **Avisos por ntfy solo existen para MLB.** Un aviso de portero confirmado (NHL) o de lesionados (NFL) sería la siguiente mejora natural.
4. Con 1,449 juegos de NFL y 4,577 de NHL, los márgenes de error de cualquier ROI son de ±6 a ±10 puntos: la medición en vivo (🤖 Auto) irá diciendo más con el tiempo.
5. La verificación se hizo en un navegador de computadora con un iPhone simulado: falta tu prueba en el teléfono real (pestaña Salud, Escáner en NHL/NFL, ícono nuevo de Juegos).

## Adición: lesionados y avisos dentro de las apps (mismo día)
- **Robot** `lesiones.yml` + `scripts/lesiones.js`: cada 3 horas baja la lista de lesionados de ESPN (1 a 9 MB) y deja un archivo chico por deporte (`lesiones-nba|nhl|nfl.json`, 20 a 45 KB) en la rama `datos`, junto con los juegos de las próximas 36 h. No gasta OddsPapi.
- **En cada app (NBA, NHL, NFL)**: el Escáner muestra por juego quién está fuera y quién es dudoso de los dos equipos, con lesión y fecha de regreso; el resumen de arriba suma los de todos los juegos; la barra «Escáner del día» dice cuántos son nuevos sin abrirla.
- **🆕 = nuevo desde la última vez que abriste el Escáner** (se compara con lo que ya viste, guardado en el teléfono). La primera vez solo toma la lista de hoy como base. Los jugadores que no juegan por decisión técnica no cuentan (en la NFL el domingo eran la mayoría del ruido).
- **Aviso al teléfono** (opcional): si existe el secreto `NTFY_TOPIC`, el robot manda UN mensaje por corrida con los Out y Doubtful nuevos de equipos que juegan hoy o mañana.
- Para MLB ya existían los movimientos de lesionados del Escáner (API oficial) y los avisos por ntfy. Fútbol no tiene lista de lesionados en ESPN.
- Límite honesto: dentro de la app los avisos aparecen cuando la abres; un iPhone no recibe avisos con la app cerrada sin un servidor de notificaciones. Para eso está el aviso por ntfy.
