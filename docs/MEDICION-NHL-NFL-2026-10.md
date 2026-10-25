# Medición de NHL y NFL contra el mercado (octubre 2026)

Misma prueba que se le hizo a MLB, fútbol y NBA: el modelo de cada deporte se compara con el **precio de cierre sin margen** del mercado, en juegos que el modelo no había visto (los parámetros de cada temporada se eligen solo con temporadas anteriores).

- **NHL**: 4,577 juegos de temporada regular (2022-2025), líneas de DraftKings vía ESPN.
- **NFL**: 1,449 juegos (2019 a hoy, 2026 incluida), mismas líneas.
- Detalle completo (todas las tablas): `docs/medicion-nhl-detalle.md` y `docs/medicion-nfl-detalle.md`. Lo vuelve a generar el workflow **Medir NHL y NFL contra el mercado** (rama `resultados-nhl-nfl`).

## Veredicto

| | NHL | NFL |
|---|---|---|
| Pérdida log, modelo | 0.6691 | 0.6419 |
| Pérdida log, mercado | **0.6609** | **0.5976** |
| ¿Quién gana? | Mercado (z = 5.9) | Mercado (z = 8.0) |
| λ ganador (peso del modelo sobre el mercado) | 0.00 | 0.00 |
| Apostar donde el modelo discrepa (ganador) | ROI −7% a −22% | ROI −19% a −23% |
| Apostar al hándicap / línea de gol por el modelo | −5% a −6% | −8% a −9% |
| λ total (peso del modelo sobre la línea) | **0.70** | 0.00 |

**Lo mismo que en MLB, fútbol y NBA: el mercado manda.** En ninguno de los dos deportes el modelo mejora el precio del mercado en el ganador ni en el margen. Por eso las apps usan el mercado como base (Pinnacle sin margen cuando existe, DraftKings de ESPN si no) y mezclan solo un 5% de modelo (`LAM_M = 0.05`), igual que las otras tres. El modelo sirve para **explicar** el juego (ritmo, descanso, tiempo extra, números clave), no para encontrar valor.

## Lo propio de cada deporte

### NHL
- **Tiempo extra**: 22.3% de los juegos de temporada regular llegan a OT; 67.4% de eso se decide en OT y 32.6% en shootout. El modelo usa 67% de gol en OT (`OTG`). Quien gana en OT/SO es el local el 53% de las veces.
- **Goles**: media 6.18 por juego, varianza 5.41 (más baja que Poisson: razón 0.876), por eso el modelo aprieta los totales (`KT = 0.023`).
- **Totales**: es el único mercado donde el modelo aporta algo: λ = 0.70 fuera de muestra y el error cuadrático baja de forma significativa (z = 2.5). En la app el total mezcla 50% modelo (`LAM_T = 0.5`, un poco por debajo de lo medido a propósito). Aun así no hay ROI demostrable: las reglas Más/Menos dan entre −2% y +13% con márgenes de error de ±4 a ±10.
- **Sesgo del mercado**: apostar **Más** en total 6.5 pierde −10.9% (z = −5.9) y **Menos** gana +1.8% (≈ cero); el Más pierde todos los años (−8% a −11%). Eso es el margen de la casa más una ligera preferencia del público por los goles, no una ventaja.
- **Back-to-back**: el visitante que jugó ayer rinde 0.14 goles menos de lo que el mercado ya descuenta (± 0.18): no se distingue de cero. El modelo usa 0.25 goles de ajuste (`R`).
- Favoritos y perros: todo el mercado de ganador da ROI de −4% a −7% para cualquier regla; nada supera al margen de la casa.

### NFL
- **Números clave** (la parte más útil medida): el margen exacto de 3 puntos ocurre **2.65 veces** más de lo que daría una curva normal, y el de 7 puntos **1.74 veces**; 6, 14 y 17 también sobran, mientras 0, 9, 11, 12 y 13 faltan. El modelo corrige su distribución con esos pesos (`pesosClave`) para calcular cuánto vale pasar de −3 a −3.5, el *push* en líneas enteras, etc. El push en la línea de 3 fue 4.5% real; la normal daba 3.0% y los pesos dan 7.7%, así que se pasan un poco (prior de 8 juegos): útil para ver la dirección, no la cifra exacta.
- **Pero** corregir los números clave no vuelve rentable el hándicap: la regla «Normal» da −8.8% y «con números clave» casi lo mismo. Sirve para valorar mejor una línea, no para ganarle al mercado.
- **Totales**: el mercado es mejor que el modelo (z = 6.6, λ = 0); el Más/Menos de la app queda con un peso de 5% de modelo.
- **Techo cerrado**: el total real supera la línea en +2.6 puntos (± 1.3) en juegos bajo techo; Más gana +5.8% ± 10 allí, aún no concluyente.
- **Descanso (bye)**: el local que viene de bye rinde −0.6 puntos frente a la línea (± 2): sin efecto detectable.
- Ventaja de local: gana 54.3%; el hándicap del local cubre 49.1%.
- Con 1,449 juegos el margen de error de cualquier ROI es de ±6 a ±10 puntos: hacen falta varias temporadas más para concluir algo sobre reglas finas.

## Qué se cambió en el código por esta medición
- `usdeporte.js` (núcleo de `nhl.html` y `nfl.html`): `LAM_M = 0.05`; `LAM_T` NHL 0.5, NFL 0.05; `ESC_SIG` NFL ≈ 0.96 (qué tanto confía en el margen del mercado).
- `modelo-nhl.js`: `kM 0.015`, `kT 0.008`, `H 0.2`, `R 0.25`, `Q 0.25`, `KT 0.023`.
- `modelo-nfl.js`: `kM 0.08`, `kT 0.04`, `H 2.0`, `Rs 1.0`, `Bb 0.8`.
- Corrección del medidor: la fila «Normal» del hándicap de la NFL usaba por error los números clave (`cubreN`).

## Cómo se mide en vivo
- **Auto** (Herramientas → 🤖 Auto) guarda cada juego de NHL y NFL antes de que empiece con lo que dijo el modelo y el precio de mercado, lo resuelve solo con el resultado de ESPN y mide acierto, ROI a precio justo y quién acierta cuando chocan.
- **Escáner de Pinnacle** (`scripts/valor3.js`, workflow **Pinnacle NHL y NFL**): dos veces al día baja el precio de Pinnacle (ganador, hándicap principal, total principal y, en NHL, ganador a 60 minutos) a `pinnacle-nhl.json` / `pinnacle-nfl.json`. Tope propio de 60 llamadas al mes (`MAX_MES`). El plan de OddsPapi da 250 al mes en total: MLB 100 + fútbol/NBA 80 + NHL/NFL 60 = 240.
- **CLV** (`cierre.js`): compara tu cuota con la de cierre de ESPN.

## Límites
- ESPN solo guarda líneas desde 2019 (NFL) y 2022 (NHL): no hay más historia de mercado gratis.
- El archivo de partidos de la NFL cubre las últimas 3 temporadas completas y la actual.
- Las líneas de DraftKings no son el cierre de Pinnacle; Pinnacle se usa solo hacia adelante, desde el escáner.
