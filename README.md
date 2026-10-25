# OVA · ODDX

Apps de análisis de apuestas (MLB, fútbol, NBA, NHL y NFL) publicadas en GitHub Pages e instaladas en la pantalla de inicio del iPhone.
Todo corre en el navegador: no hay servidor propio salvo dos Workers de Cloudflare y un servidor opcional en Railway (ver «Piezas externas»).

Página pública: https://osvaldoalvarez0113-source.github.io/ODDX/

## Qué hay en cada carpeta

| Ruta | Qué es |
|---|---|
| `hub.html` | Pantalla de inicio: cinco tarjetas (MLB, Fútbol, NBA, NHL, NFL). Es lo que abre el icono del iPhone (`manifest.json` → `start_url`). |
| `index.html` | App de **MLB** (la más grande). Fórmula de ventaja en carreras, cuotas, ranking por valor, registro de picks con CLV. |
| `futbol.html` | App de **fútbol**: Poisson / Dixon-Coles, ligas de clubes, copas y (vía `selecciones.js`) selecciones. |
| `nba.html` | App de **NBA**: rating tipo Elo de margen, márgenes y totales. |
| `nhl.html` + `nfl.html` + `usdeporte.js` | Apps de **NHL** y **NFL**. Comparten `usdeporte.js` (partidos de `hist-<dep>.json` + ESPN, mercado de Pinnacle o DraftKings, picks y cierre); cada una trae su modelo: `modelo-nhl.js` (Poisson de goles, tiempo extra/shootout, back-to-back) y `modelo-nfl.js` (Elo de margen, números clave 3 y 7, descanso). Medidas en `docs/MEDICION-NHL-NFL-2026-10.md`: el mercado manda, el modelo pesa 5%. |
| `scripts/valor3.js` + `.github/workflows/valor-nhl-nfl.yml` | Escáner de Pinnacle para NHL y NFL (`pinnacle-nhl.json`, `pinnacle-nfl.json`), con su propio tope de 60 llamadas al mes (MLB 100 + fútbol/NBA 80 + NHL/NFL 60 = 240 de las 250 del plan de OddsPapi). |
| `scripts/correr_nhl_nfl.js`, `datos_nhl_nfl.js`, `archivo_nhl_nfl.js`, `lib_medir.js` | Medición contra el mercado (workflow *Medir NHL y NFL*, resultado en la rama `resultados-nhl-nfl`) y archivo diario de partidos (`hist-nhl.json`, `hist-nfl.json`). |
| `panel.html` | Panel de respaldo y resumen del día. No está enlazado desde el hub a propósito. |
| `sw.js`, `manifest.json`, `icon-*.png` | Service worker (red primero, sin internet usa copia), manifest e iconos de la app instalada. |
| `ovaedge.js` | Matemática de apuestas en un solo archivo, sin dependencias (`window.OVAEdge`): quitar el vig (Shin, power, multiplicativo), Kelly fraccional con margen de error, CLV contra el cierre sin vig y su prueba t, calibración (Brier, Platt, isotónica) y Monte Carlo del juego (ML, hándicap, totales, carreras por equipo y F5 de una sola simulación). En MLB lo usan el **Chequeo contra el mercado** del Veredicto (plegado) y, en Mis picks, la prueba t del CLV y el Brier. El Monte Carlo **no** está conectado a ningún cálculo: coincide con `matriz()` (ver `docs/MEDICION-OVAEDGE-2026-10.md`). |
| `ovaextra.js` | Respaldo de picks en IndexedDB, exportar/importar y resumen «Hoy». Lo cargan las cinco páginas. |
| `interior2.js` | Diez diseños con cabecera propia: **Historias** (un juego por pantalla, se desliza de lado), **Duelo** (cartelera de pelea en diagonal), **Bento** (recuadros de colores y resumen), **Agenda** (línea de tiempo con AHORA), **Radar de valor** (mapa del día de burbujas), **Cromos** (carta coleccionable con borde holográfico), **Campo** (el juego sobre el diamante), **Telemetría** (aguja de probabilidad y letra de máquina), **Marcador** (fichas que giran, ámbar sobre negro) y **Recibo** (recibo de caja con sello y código de barras). Leen las tarjetas con `OVALeerJuego` (`diseno.js`), no calculan nada. |
| `ajustes.js` | **Ajustes de MLB como menú**: Apariencia, Modelo y apuestas, Cálculo a mano y Cómo funciona, cada uno en su ventana con «‹ Ajustes» para volver. Mueve los bloques que ya existen (no los recrea), así que ningún ajuste ni cálculo cambia. En fútbol y NBA, Ajustes → Apariencia abre la hoja 🎨. Dentro de Apariencia hay dos pestañas: **Diseño de adentro** (18 diseños en 3 categorías) y **Tema de color**. |
| `asistente.js` | **Mesa** (botón flotante en las cinco apps): lee todos los juegos y todas las pestañas sin que los abras, los ordena con reglas fijas y sin internet, calcula si una cuota que tú escribes tiene valor (pide +5% por el ruido del modelo) lee el mercado del servidor (pinnacle-datos/futbol/nba.json) y marca si modelo y mercado coinciden o chocan, verifica en MLB con la API oficial (lineups, abridor probable, estado, clima, lesionados; solo MLB) sin gastar IA (si chocan baja el nivel y manda el mercado), y, si quieres, manda todo lo leído (≤ 11,500 caracteres) al mismo Worker de la 🦈 IA para que busque lineups, lesiones y noticias y devuelva una SENAL por juego. Solo lee: no escribe en tus registros ni toca ningún cálculo. |
| `autoregistro.js` | **Registro automático** (`window.OVARegAuto`): cada vez que abres MLB, Fútbol o NBA guarda solo cada juego **antes** de que empiece (lo que dijo el modelo y lo que decía Pinnacle sin margen), baja el resultado de ESPN unas 3 h después y lo resume en Herramientas → 🤖 Auto: acierto, ROI a precio justo y con margen de 3%, quién acierta cuando modelo y mercado chocan, y Brier. Vive aparte (`ova_auto_v1`, entra en el respaldo): no toca Mis picks, CLV, banca ni ningún cálculo. En fútbol guarda la liga que tengas en pantalla. |
| `herramientas.html` + `herramientas.js` + `banca.js` | Pantalla **Herramientas** (enlace en el pie del hub): **Marcador** (resultados reales de las cinco apps con curva de unidades, ROI y CLV), **Banca** (lo que apuestas, con topes diario/semanal/mensual; `banca.js` pone un aviso ámbar al 80% y rojo al llegar al tope en las demás páginas), **Casas** (misma cuota en varias casas: mejor precio, EV contra tu número, arbitraje) y **Avisos**. Todo sale de tu teléfono (localStorage), sin servidor. |
| `interior.js`, `obsidiana.js`, `hubestilos.js` | Ocho diseños de adentro (Clásico, Cristal, Broadcast, Pro, Boleto, Boleto noche, **Prensa** y **Radar**; la lista de los 18 vive en `interior.js`; se eligen con pulsación larga en el logo o en 🎨), tema «Oro negro» y los 6 estilos del hub. Prensa y Radar traen sus propios colores (no cambian con el tema de color) para garantizar que se lean. |
| `diseno.js` | Barra de abajo igual en las cinco apps (Juegos · Al gane · Combo · Mis picks · Ajustes), lo técnico (Backtest, Ratings, Diagnóstico) en Ajustes → Avanzado, versión visible en Ajustes y carga automática de MLB. No cambia ningún cálculo. |
| `historial.js` | MLB v47-v64: historial del abridor a 3 años y FIP del abridor (los dos opcionales, apagados por defecto), botón 🦈 de IA con análisis completo, y la etiqueta de versión que se ve junto al título. |
| `railway.js` | Compara (o aplica) el cálculo del servidor Railway sobre el Veredicto de MLB. **Única copia** de ese parche. |
| `pinnacle.js` + `pinnacle-datos.json` | Muestra lo que dice el mercado (Pinnacle sin margen). El JSON lo escribe el escáner de GitHub Actions. |
| `mejoras.js`, `selecciones.js` | Lesionados + clima (fútbol) y selecciones (ESPN). |
| `pruebas.js` | 400 pruebas automáticas. `node --expose-internals pruebas.js` |
| `backtests/` | Páginas de medición (se abren en el navegador). Cada decisión de la fórmula salió de una de ellas. Índice en `backtests/index.html`. |
| `scripts/` | Lo que corre en GitHub Actions o a mano: `valor.js` (escáner Pinnacle, ahora también avisa movimientos de cuota con `mov.js`), `avisos.js` (abridor cambiado, alineación oficial y clima por ntfy), `correr_mercado.js`, `correr_deportes.js`, `ova_formula.py`. |
| `worker/ova-ia.js` | Versión **endurecida** del Worker de Cloudflare del botón 🦈 (ver abajo). |
| `docs/AUDITORIA-2026-10.md` | Informe de la auditoría de octubre 2026. |
| `docs/AUDITORIA-2-2026-10.md` | Segunda auditoría: nombres de ESPN limpios en el origen, peticiones compartidas en MLB, botones tocables. |
| `docs/MEDICION-PICKS-APP-2026-10.md` | **Qué habría dicho la app en 2024-2026 y cuánto habría rendido** (6,171 juegos de MLB, cuota de cierre): ningún titular gana de forma comprobable, el número de la app dice más de lo que pasa (50.5% vs 45.8%) y el stake sobre el número crudo hundía la banca ($1,000 → $524; sobre la mezcla con el mercado, $981). Scripts en `scripts/medicion/picks_app.js` y `analisis_picks.py`. |
| `docs/MEDICION-MESA-2026-10.md` | Medición con datos reales de las reglas de la Mesa (cortes, coincidencia con el mercado, mezcla modelo+mercado). Scripts en `scripts/medicion/`. |
| `docs/MEDICION-FUTBOL-LOCAL-ELO-2026-10.md` | Medición de ratings local/visita, Elo, mezcla con el mercado y descanso en fútbol (ninguno aporta lo suficiente). Se repite con el workflow «Experimento de futbol». |
| `.github/workflows/` | Ver la tabla «Workflows de GitHub Actions» más abajo. |

## Cómo se actualiza

1. Se sube el archivo nuevo al repo (en el iPhone: GitHub → Add file → Upload files, o una página `subir_*.html` con tu token).
2. GitHub Pages publica solo (tarda ~1 minuto).
3. En el iPhone, si ves una versión vieja: abre la app con `?v=NUMERO` al final de la dirección, o borra el icono y vuelve a añadirlo. La versión que se ve junto al título de MLB confirma qué cargó.

Regla práctica: **nunca pongas espacios ni guiones bajos en nombres de archivo** al subir desde el iPhone (los cambia y da 404). `pruebas.js` lo vigila.

## Pruebas

```
node --expose-internals pruebas.js
```

Revisa sintaxis de todas las páginas, nombres usados sin existir, el service worker, el respaldo de picks, el marcador en vivo, el combo de fútbol, el modelo NBA, el cierre automático de picks de MLB y que el repo no tenga archivos rotos o duplicados. Corre sola en cada subida (`pruebas.yml`); una X roja en GitHub significa que algo se rompió.

## Constantes del modelo de MLB (fuente de verdad: `index.html`)

| Constante | Valor | De dónde salió |
|---|---|---|
| `MULT` | 6 | backtests de 2025 y 2026 (ganó al 13 y al 17) |
| `BONO_LOCAL` | 0.59 | backtest contra el mercado, temporada 2025 completa (`backtests/backtestmercado.html`) |
| `PRIOR_ERA` | 40 innings | medido contra el mercado en 2021-2026: 20 a 120 no cambia nada (±0.001 de pérdida log) (`docs/MEDICION-MERCADO-MLB-2026-10.md`) |
| `DISP` | 2.3 | `backtests/backtestforma.html` (razón varianza/media de 2.32 y 2.37) |
| `ENCOGE` | 0.45 | backtest del total (pendiente medida 0.45 en 2026 y 0.44 en 2025) |
| `F5_FRAC` | 0.56 | `backtests/backtestequipo.html` (0.558 y 0.562) |
| Tope de probabilidad | 22 % - 78 % | |
| `W_MODELO` | 0.05 | peso del modelo al mezclarlo con el mercado: Chequeo del Veredicto y **stake** (`valor()`). Medido en 6 temporadas (12,311 juegos): óptimo junto ≈0.04, por temporada de -0.13 a +0.23 (`docs/MEDICION-6-TEMPORADAS-2026-10.md`); con 3 temporadas se había puesto 0.24 |

Las páginas de `backtests/` y `scripts/ova_formula.py` **replican** estas constantes. Si cambias una en `index.html`, cámbiala allí también o los números dejarán de coincidir.

## Piezas externas (no están en este repo)

- **Worker `ova-ia`** (Cloudflare, repo `Ova-worker`): recibe la petición del botón 🦈 y le pone la clave de Anthropic. La clave vive como secreto del Worker, nunca en el código. Usa `worker/ova-ia.js` como base: acepta solo peticiones desde tu página, fija el modelo y topa los gastos por petición.
- **Worker `kalshi-ova`** (Cloudflare, repo `Kalshi-ova`): proxy de solo lectura hacia la API pública de Kalshi.
- **Servidor Railway** (`worker-production-be04.up.railway.app`, repo Betbot): cálculo de MLB en segundo plano. Su fórmula debe usar las mismas constantes que `index.html` (sobre todo `BONO_LOCAL = 0.59`).

## Workflows de GitHub Actions

Todos en `.github/workflows/`. «OddsPapi» = gasta llamadas del plan (250 al mes en total para toda la cuenta; los topes por escáner suman 240).

| Workflow | Cuándo corre | Qué hace | OddsPapi |
|---|---|---|---|
| `pruebas.yml` | en cada subida a `main` y en pull requests | corre `pruebas.js` (sintaxis, nombres, modelos, hub, respaldo…). Una X roja = algo se rompió | no |
| `valor-pinnacle.yml` | 3 veces al día | escáner MLB → `pinnacle-datos.json` (tope 100 al mes) | sí |
| `valor-futbol-nba.yml` | 2 veces al día | escáner fútbol y NBA → `pinnacle-futbol.json`, `pinnacle-nba.json` (tope 80) | sí |
| `valor-nhl-nfl.yml` | NHL cada noche, NFL jueves/domingo/lunes | escáner NHL y NFL → `pinnacle-nhl.json`, `pinnacle-nfl.json` (tope 60) | sí |
| `avisos-mlb.yml` | cada 30 min en horas de juego, marzo a noviembre | avisos por ntfy: abridor cambiado, lineup, clima | no |
| `archivo-espn.yml` | 4 veces al día | archivo de partidos de fútbol/NBA/MLB desde ESPN | no |
| `archivo-nhl-nfl.yml` | diario 09:40 UTC | `hist-nhl.json`, `hist-nfl.json` (3 temporadas completas + la actual) | no |
| `medir-nhl-nfl.yml` | al tocar el modelo o el medidor de NHL/NFL | mide los modelos contra el mercado → rama `resultados-nhl-nfl` | no |
| `mercado.yml`, `deportes.yml`, `backtest-fip.yml`, `experimento-futbol.yml`, `medir-mesa.yml` | a mano | backtests y mediciones puntuales (resultados en ramas `resultados-*`) | no |
| `sonda.yml` | a mano | diagnóstico de OddsPapi (no correr sin necesidad: gasta llamadas) | sí |

## Secretos de GitHub Actions

| Secreto | Para qué |
|---|---|
| `ODDSPAPI_KEY` | Escáner Valor vs Pinnacle (OddsPapi). |
| `NTFY_TOPIC` | Tema privado de ntfy para los avisos al teléfono. Si no existe, el escáner NO manda avisos (ya no cae a un tema público) y el workflow lo avisa; ponle un nombre largo y aleatorio. |

En Settings → Actions → General → Workflow permissions debe estar **Read and write** (el escáner guarda `pinnacle-datos.json`).

## Qué NO tocar

- La clave `ventaja_picks_v1` de localStorage (ahí viven tus picks). Se llama así por historia; cambiarla los borra.
- `pinnacle-datos.json`: lo reescribe el escáner.
