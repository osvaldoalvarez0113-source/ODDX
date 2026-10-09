# OVA · ODDX

Apps de análisis de apuestas (MLB, fútbol y NBA) publicadas en GitHub Pages e instaladas en la pantalla de inicio del iPhone.
Todo corre en el navegador: no hay servidor propio salvo dos Workers de Cloudflare y un servidor opcional en Railway (ver «Piezas externas»).

Página pública: https://osvaldoalvarez0113-source.github.io/ODDX/

## Qué hay en cada carpeta

| Ruta | Qué es |
|---|---|
| `hub.html` | Pantalla de inicio: tres tarjetas (MLB, Fútbol, NBA). Es lo que abre el icono del iPhone (`manifest.json` → `start_url`). |
| `index.html` | App de **MLB** (la más grande). Fórmula de ventaja en carreras, cuotas, ranking por valor, registro de picks con CLV. |
| `futbol.html` | App de **fútbol**: Poisson / Dixon-Coles, ligas de clubes, copas y (vía `selecciones.js`) selecciones. |
| `nba.html` | App de **NBA**: rating tipo Elo de margen, márgenes y totales. |
| `panel.html` | Panel de respaldo y resumen del día. No está enlazado desde el hub a propósito. |
| `sw.js`, `manifest.json`, `icon-*.png` | Service worker (red primero, sin internet usa copia), manifest e iconos de la app instalada. |
| `ovaextra.js` | Respaldo de picks en IndexedDB, exportar/importar y resumen «Hoy». Lo cargan las cinco páginas. |
| `interior.js`, `obsidiana.js`, `hubestilos.js` | Diseños (Clásico/Cristal/Broadcast), tema «Oro negro» y los 6 estilos del hub. |
| `diseno.js` | Barra de abajo igual en MLB, fútbol y NBA (Juegos · Al gane · Combo · Mis picks · Ajustes), lo técnico (Backtest, Ratings, Diagnóstico) en Ajustes → Avanzado, versión visible en Ajustes y carga automática de MLB. No cambia ningún cálculo. |
| `historial.js` | MLB v47-v50: historial del abridor a 3 años (apagado por defecto), botón 🦈 de IA con análisis completo, y la etiqueta de versión que se ve junto al título. |
| `railway.js` | Compara (o aplica) el cálculo del servidor Railway sobre el Veredicto de MLB. **Única copia** de ese parche. |
| `pinnacle.js` + `pinnacle-datos.json` | Muestra lo que dice el mercado (Pinnacle sin margen). El JSON lo escribe el escáner de GitHub Actions. |
| `mejoras.js`, `selecciones.js` | Lesionados + clima (fútbol) y selecciones (ESPN). |
| `pruebas.js` | 179 pruebas automáticas. `node --expose-internals pruebas.js` |
| `backtests/` | Páginas de medición (se abren en el navegador). Cada decisión de la fórmula salió de una de ellas. Índice en `backtests/index.html`. |
| `scripts/` | Lo que corre en GitHub Actions o a mano: `valor.js` (escáner Pinnacle), `correr_mercado.js`, `correr_deportes.js`, `ova_formula.py`. |
| `worker/ova-ia.js` | Versión **endurecida** del Worker de Cloudflare del botón 🦈 (ver abajo). |
| `docs/AUDITORIA-2026-10.md` | Informe de la auditoría de octubre 2026. |
| `.github/workflows/` | `pruebas.yml` (corre las pruebas en cada subida), `valor-pinnacle.yml` (escáner 3 veces al día), `mercado.yml` y `deportes.yml` (backtests manuales). |

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
| `PRIOR_ERA` | 40 innings | supuesto, nunca medido (se puede mover en Ajustes) |
| `DISP` | 2.3 | `backtests/backtestforma.html` (razón varianza/media de 2.32 y 2.37) |
| `ENCOGE` | 0.45 | backtest del total (pendiente medida 0.45 en 2026 y 0.44 en 2025) |
| `F5_FRAC` | 0.56 | `backtests/backtestequipo.html` (0.558 y 0.562) |
| Tope de probabilidad | 22 % - 78 % | |

Las páginas de `backtests/` y `scripts/ova_formula.py` **replican** estas constantes. Si cambias una en `index.html`, cámbiala allí también o los números dejarán de coincidir.

## Piezas externas (no están en este repo)

- **Worker `ova-ia`** (Cloudflare, repo `Ova-worker`): recibe la petición del botón 🦈 y le pone la clave de Anthropic. La clave vive como secreto del Worker, nunca en el código. Usa `worker/ova-ia.js` como base: acepta solo peticiones desde tu página, fija el modelo y topa los gastos por petición.
- **Worker `kalshi-ova`** (Cloudflare, repo `Kalshi-ova`): proxy de solo lectura hacia la API pública de Kalshi.
- **Servidor Railway** (`worker-production-be04.up.railway.app`, repo Betbot): cálculo de MLB en segundo plano. Su fórmula debe usar las mismas constantes que `index.html` (sobre todo `BONO_LOCAL = 0.59`).

## Secretos de GitHub Actions

| Secreto | Para qué |
|---|---|
| `ODDSPAPI_KEY` | Escáner Valor vs Pinnacle (OddsPapi). |
| `NTFY_TOPIC` | Tema privado de ntfy para los avisos al teléfono. Si no existe se usa el tema público `my-bets` y el workflow lo avisa; ponle un nombre largo y aleatorio. |

En Settings → Actions → General → Workflow permissions debe estar **Read and write** (el escáner guarda `pinnacle-datos.json`).

## Qué NO tocar

- La clave `ventaja_picks_v1` de localStorage (ahí viven tus picks). Se llama así por historia; cambiarla los borra.
- `pinnacle-datos.json`: lo reescribe el escáner.
