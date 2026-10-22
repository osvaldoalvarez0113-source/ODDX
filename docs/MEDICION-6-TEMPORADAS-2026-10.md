# Medición con 6 temporadas — MLB, fútbol y NBA (octubre 2026)

Pregunta: **si hubiera seguido a la app durante 6 temporadas, ¿habría ganado dinero?** Se simuló juego por juego lo que
habría dicho cada app *antes* del partido y se comparó con el resultado real y con el precio del mercado.

| App | Temporadas | Partidos | Mercado contra el que se mide |
|---|---|---|---|
| MLB (ganador) | 2021 a 2026 | 12,311 | DraftKings vía ESPN (2024-26 cierre; 2021-23 último precio registrado) |
| Fútbol 1X2 y Más/Menos 2.5 | 2020-21 a 2025-26, 5 ligas | 10,732 | Pinnacle cierre (en 2025-26 la mitad es el promedio de cierre) |
| NBA (spread, total, moneyline) | 2020-21 a 2025-26 | 7,293 | DraftKings/ESPN BET vía ESPN |

## Resultado en una línea por app

- **MLB:** el modelo no le gana al mercado en ninguna de las 6 temporadas. Los picks que la app llama «valor» (5,176)
  rindieron **-1.9% ±1.6** por dólar; sin criterio se esperaba -3.9% por la comisión. La diferencia (+2.0 pts) no se
  distingue de la suerte. El peso óptimo del modelo al mezclarlo con el mercado es **≈0.04**, no 0.24.
- **Fútbol:** el modelo pierde contra Pinnacle en las 6 temporadas (z de 6.6 a 8.4 cada año). Apostar sus picks da
  **-9% a -14%** de ROI. El peso óptimo del modelo sobre el mercado es **0** en todas las temporadas.
- **NBA:** el modelo pierde contra la línea en las 6 temporadas (z de 4.2 a 5.8 en margen). Apostar sus picks contra el
  spread da **-5%** y contra el total **-6%**. El peso óptimo es **0**.

## MLB (12,311 juegos)

Cómo se hizo: `scripts/correr_variantes.js` (rama `variantes-6t`, workflow que guarda cada temporada en `var-S2021…S2026`)
guarda la probabilidad del modelo y el precio de cada juego. `scripts/medicion/picks_app.js` corre el `veredictoEV()` y
`valor()` **reales** de `index.html` sobre cada juego; `scripts/medicion/analisis_picks.py` hace el resto
(`python3 -I scripts/medicion/analisis_picks.py <carpeta con var-S20XX>`).

**Pérdida log por temporada** (menor = mejor): el mercado le gana al modelo todos los años.

| | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|
| Modelo (P40) | 0.6794 | 0.6751 | 0.6841 | 0.6836 | 0.6816 | 0.6811 |
| Mercado | 0.6680 | 0.6636 | 0.6792 | 0.6691 | 0.6770 | 0.6770 |
| Mejor peso del modelo en la mezcla | -0.10 | -0.13 | +0.23 | -0.12 | +0.21 | +0.23 |

Todo junto: **0.04**. Ajustando el peso en 5 temporadas y probándolo en la sexta sale 0.07, 0.08, 0.01, 0.08, 0.01 y 0.01,
y esa mezcla no le gana al mercado (-0.00009 por juego, t -1.4). El error del peso es ≈ ±0.2: 0.24 no queda descartado,
pero los datos apuntan a un valor mucho más bajo, y en fútbol y NBA el óptimo es 0.

**Picks de valor** (EV > 0 y ≥ 2 pts sobre la cuota, sin «precio imposible»): 5,176.

| | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | Todas |
|---|---|---|---|---|---|---|---|
| ROI | -4.5% | -2.7% | -3.3% | -6.4% | +3.8% | +1.2% | **-1.9% ±1.6** |
| Esperado si el mercado sabe todo | -3.9% | -3.7% | -3.9% | -4.0% | -4.2% | -3.9% | -3.9% |

La app decía 49.7% de ganar en esos picks; ganaron 44.2% (el mercado decía 43.3%).

**Por tamaño de la ventaja que veía la app** (ROI): 0 a 2 pts -4.3%; 2 a 4 pts -1.1%; 4 a 6 pts +0.1%; 6 a 8 pts -3.7%;
8 a 10 pts -9.6%; 10 a 15 pts -6.3%. Mientras más se separa del mercado, peor (≈7 pts menos en 8+ que en 2 a 6), igual que
con 3 temporadas. Estos cortes se miraron después de ver los datos: son pistas, no pruebas.

**«Precio imposible»** (EV > 20%): 1,713 juegos, ROI **-5.6% ±3.2**, perdieron en 5 de 6 temporadas.

**Modo «Al gane»:** bien calibrado (50-55%: ganó 53.1%; 60-65%: 63.3%; 65-70%: 68.4%) pero a la cuota rinde -3.2%, -5.1%,
-2.3%, -0.5%, +1.6% en los tramos de 50-55 hasta 70-80%.

**Banca de $1,000 con ¼ Kelly día por día:**

| Stake sobre… | Termina en | Peor caída |
|---|---|---|
| tu número crudo, todo lo que decía «valor» | **$10** | 100% |
| tu número crudo, solo valor fuerte+moderado (v67) | $75 | 95% |
| mezcla con el mercado al 24% (v68) | $914 | 12% (y rindió entre -3% y -7% por stake en 5 de 6 temporadas) |
| mezcla con el mercado al 5% (v69) | $1,000 | 0% (la app casi nunca sugiere stake) |

Con la mezcla al 24% el ROI ponderado por stake fue -7.1%, -3.2%, -3.6%, -5.4%, -6.2% y +3.6% por temporada. Con las 3
temporadas más recientes (2024-26) se había visto $981 con caída de 6%; con las 6 el resultado es peor.

**Cambio en la app (v69):** `W_MODELO` 0.24 → **0.05**. Con 0.05, los 5,176 picks de valor salen como «Valor dudoso»
(gris, sin stake) y el Veredicto solo mantiene «Valor moderado/fuerte» para números extremos (p. ej. 99% contra 50/50).
Es lo que dice la medición: contra el cierre de DraftKings la app no tiene ventaja detectable en el ganador. Para volver
al comportamiento anterior basta poner `var W_MODELO=0.24;`.

**Variantes del modelo** (6 temporadas, pérdida log): PRIOR_ERA 20/30/40/60/80/120 = 0.6816/0.6811/0.6808/0.6805/0.6805/
0.6805; Marcel 0.6807. Todo dentro de 0.001: no se toca el 40.

**Cuántos picks hacen falta:** para distinguir de la suerte un ROI verdadero de +3% hacen falta ≈5,650 picks (≈6.6
temporadas con este ritmo). Por eso el CLV en «Mis picks» es la medida útil.

## Fútbol (10,732 partidos: PL, La Liga, Serie A, Bundesliga, Ligue 1)

Cómo se hizo: `scripts/correr_deportes.js futbol` con `TEMPS_FUTBOL=1819…2526`, `TUNE_FUTBOL=1920`, `PRE_FUTBOL=1819`
(se ajusta con 2019-20 y las 6 temporadas siguientes son 100% fuera de muestra), `VOLCAR_PARTIDOS=1` (rama `futbol-6t`).
Análisis: `scripts/medicion/analisis_futbol_6t.py`.

| Pérdida log 1X2 | 2020-21 | 2021-22 | 2022-23 | 2023-24 | 2024-25 | 2025-26 | Todas |
|---|---|---|---|---|---|---|---|
| F0 modelo del app | 1.0277 | 1.0163 | 1.0111 | 0.9918 | 1.0071 | 1.0188 | 1.0123 |
| F1 mismo modelo, parámetros reajustados | 1.0095 | 0.9983 | 0.9992 | 0.9849 | 0.9904 | 1.0045 | 0.9979 |
| F3 Dixon-Coles calibrado | 1.0051 | 0.9909 | 0.9990 | 0.9764 | 0.9851 | 0.9949 | 0.9920 |
| Mercado (Pinnacle sin vig) | 0.9772 | 0.9758 | 0.9749 | 0.9525 | 0.9606 | 0.9780 | **0.9699** |

- **Mezcla con el mercado:** el peso óptimo del modelo es 0.00 en las 6 temporadas (con w = 0.1 ya empeora +0.0014).
- **ROI apostando el resultado donde el modelo ve más ventaja, a cuota Pinnacle:** F0 ≥2 pts -10.0% (8,767 apuestas),
  ≥5 pts -11.6%, ≥8 pts -14.0%; F3 ≥2 pts -8.8%, ≥5 pts -9.3%. Ninguna temporada es positiva en F0.
- **Calibración:** F0 es sobreconfiado arriba (dice 76.7% donde ocurre 71.4%). El mercado acierta: 77.5% donde dice 76.7%.
- **Más/Menos 2.5:** el modelo pierde contra el mercado (z 7.8) y apostar a ≥3 pts da -5.2% a cuota Pinnacle.
- **Lo que hace la app con Pinnacle:** usa el precio sin vig de Pinnacle como número justo y te dice si TU casa paga más.
  Con la mejor cuota de cierre disponible, el «valor» prometido de +3.3% rindió **+0.5% ±5.1** (y +7.0% prometido, -3.2%
  ±8.2): la ventaja de comprar línea no se distingue de cero en este cierre (la «mejor cuota» incluye precios viejos).
- **Recomendación pendiente:** los parámetros F1 (K=4, rho=0, S=20, Kt=8, wt=0.8, ct=1.05) bajan la pérdida 0.0144 en las
  6 temporadas, pero siguen 0.028 detrás del mercado. No se cambiaron los de la app porque este análisis usa una réplica
  del modelo, no el código de `futbol.html`.

## NBA (7,293 juegos)

Cómo se hizo: `scripts/correr_deportes.js nba` con `TEMPS_NBA=2020…2025`, `NBA_SKMIN=2019`, `VOLCAR_PARTIDOS=1` (rama
`nba-6t`). Análisis: `scripts/medicion/analisis_nba_6t.py`. El modelo es el V0 (parámetros actuales de `nba.html`).

- **Margen:** RMSE modelo 14.07 contra 13.55 de la línea (z 12.2); el mercado gana en cada temporada (z de 4.2 a 5.8).
  Cuánto vale la opinión del modelo encima de la línea: c = -0.013 ±0.093 (cero).
- **Spread:** apostar contra la línea cuando el modelo difiere ≥3 pts: -5.8% (2,814 apuestas); ≥5 pts: -9.7%.
  **Total:** ≥3 pts -6.5%, ≥6 pts -9.5%.
- **Moneyline:** pérdida log del modelo 0.6203 contra 0.5958 del mercado; el peso óptimo es 0.00 en las 6 temporadas.
  Apostar el lado donde el modelo ve ≥3 pts da -5.7% (5,342 apuestas), negativo en las 6 temporadas.
  Siempre al favorito: -3.6%; siempre al perro: -6.0%.
- **La app (95% mercado, 5% modelo, `LAM_M`):** con esa mezcla, 0 apuestas llegan a los 3 pts de «valor» contra el mismo
  mercado; el 5% cuesta apenas 0.00013 de pérdida log. No se cambió.

## Modelos de otros: qué se buscó, qué se probó y qué se cambió

**Lo que dice lo público** (todo lo de abajo está en la literatura; no son pruebas mías):
- Estudio de Serie A, 19 temporadas, Dixon-Coles con decaimiento por antigüedad contra el cierre: el mercado gana en las 7 temporadas
  de prueba y el peso óptimo del modelo al mezclarlo es **0.000**. Una variante con tiros a puerta trae información que los goles no
  traen (peso 0.35 contra el modelo de goles), pero 0.000 contra el mercado. Es lo mismo que salió aquí con 10,732 partidos.
- MLB: el trabajo que simula los playoffs de 2024 con modelos bateador-lanzador (Statcast) no demuestra ventaja: en las 28 apuestas
  de ventaja cero rindió -15.5%, y los cortes con ganancia tienen 16 apuestas o menos. FiveThirtyEight (Elo con ajuste por abridor)
  ya no está disponible para consultar.
- NBA: un trabajo con redes recurrentes y mapas de tiros dice agregar algo en moneyline, pero lo simula sin costos de apuesta y
  reconoce que en spread y total casi no hay margen. No lo tomo como prueba.
- Conclusión de la literatura: los modelos públicos de equipo no le ganan al cierre. Lo que cambia el resultado es información que
  el mercado todavía no tiene (lesiones, alineaciones, cambios de abridor) y los precios de casas «sharp».

**Lo que se probó con tus datos:**

| Idea | Dónde | Resultado |
|---|---|---|
| Promediar las 7 variantes del modelo de MLB, o usar el historial de 3 años (Marcel) | MLB, 12,311 juegos | Ninguna agrega nada sobre el mercado: peso óptimo 0.03 a 0.07 fuera de muestra, mezcla sin mejora (t ≤ 1.8, y no le gana al mercado) |
| Recalibrar la probabilidad del modelo (Platt) | MLB | Casi igual (pendiente 1.1): +0.00003 por juego |
| Mezclar goles con tiros a puerta (35%, 60%, 100%) | Fútbol, réplica | Mejora el modelo (1.0123 → 0.9949) pero el peso sobre el mercado sigue en 0 |
| Descanso, 3 juegos en 4 noches, forma reciente | NBA | Sin mejora (RMSE 14.07 → 14.06) |
| Reajustar parámetros con el **motor real** de `futbol.html` | Fútbol, 5 ligas | Pérdida 1X2 fuera de muestra 1.0028 → **0.9921**; Más/Menos 0.6832 → **0.6800**. **Aplicado en v21** |

**Cambio aplicado en fútbol v21:** `PARAMS_DEFECTO` pasa de `K 6, S 0, wt 0.5, ct 1` a `K 8, S 20, wt 0.8, ct 0.97` (h y rho igual).
Se ajustó solo con 2021-22 y 2022-23 y se probó en 2023-24 a 2025-26 (5,200 partidos, fuera de muestra). Mejora en cada una
de esas temporadas. `S = 20` solo actúa si la temporada pasada ya está bajada en el teléfono (Calibrar/Backtest la baja una vez);
sin ella el resultado es el mismo de antes (1.0033 contra 1.0028). Quien ya calibró sus parámetros en la app no se ve afectado.
**Sigue sin ganarle al mercado**: queda 0.029 por detrás en pérdida log. La ganancia es que el número del modelo es más honesto
cuando no hay precio de Pinnacle. Scripts: `scripts/medicion/fut_real.js` y `fut_grid.js`.

**Cómo se le quita el margen a las cuotas (devig), fútbol 1X2, 9,880 partidos con Pinnacle de cierre:**

| Método | Pérdida log | Diferencia contra el multiplicativo |
|---|---|---|
| Multiplicativo (el que había) | 0.96802 | — |
| Potencia | 0.96778 | -0.00024 (z -1.3) |
| Shin | 0.96780 | -0.00022 (z -1.7) |
| Aditivo | 0.96776 | -0.00026 (z -1.5) |

Ninguno pasa z ≥ 2: la mejora es **chica** y no es prueba. Shin mejora en las últimas 4 temporadas y empeora un poco en las 2 primeras.
Lo que sí se ve: el método multiplicativo **sobreestima la probabilidad de los perros** (0-15%: dice 10.9%, ocurre 9.7%) y por eso
inventa «valor» en cuotas largas. Con Shin hay casi la mitad de apuestas con EV > 10% (553 contra 1,032) y los perros con EV>0
rinden -0.6% en vez de -3.4% (con error de ±11%). **Aplicado solo a `scripts/valor2.js` (1X2 de fútbol, Pinnacle)**; Más/Menos y
las líneas de dos lados siguen igual, y `index.html`/`nba.html` no cambian. Es la misma dirección que dice la literatura
(sesgo favorito-perro), pero con esta muestra no se puede decir que gane dinero.

**Descartado en la segunda ronda de búsqueda (más sitios, mismas conclusiones):**

| Idea / fuente | Qué dice | Decisión |
|---|---|---|
| Elo hecho con cuotas en vez de resultados (ELO-Odds, ~15,000 partidos, 4 ligas + Europa) | Mejor que Elo con resultados o goles, pero **las cuotas siguen ganando**; no captura lesiones ni motivación | No sirve: la app ya usa las cuotas |
| Benchmark de LLMs en el Mundial 2026 (104 partidos, 7 modelos, forecasts con fecha) | Mejor Brier 0.497 contra 0.498 del cierre sin margen; ningún modelo se separa del resto (p ≥ 0.055); con búsqueda web mejora 0.023 | Empate con el mercado, no ventaja; sin costos de apuesta |
| Lesiones en la línea (Action Network) | La línea se mueve en segundos tras la noticia; el margen es solo antes de que se ajuste | Confirma que el edge es información rápida, no un modelo |
| Mercados de predicción (Kalshi / Polymarket, estudios con 300,000+ contratos) | Sesgo favorito-perro: contratos de menos de 30¢ ganan 4%; la mayoría de los usuarios pierde | Es el mismo sesgo que cubre Shin; no hay un modelo nuevo que copiar |
| Dixon-Coles / tiros a puerta / Elo en Serie A y fútbol | Peso 0.000 contra el cierre | Ya medido aquí con 10,732 partidos |
| Revisiones de aprendizaje automático en apuestas | Resultados buenos casi siempre sin costos, sin cierre de Pinnacle o con pocas apuestas | No se toman como prueba |
| Mezcla / Platt / Marcel / descanso / forma (propio) | Ver tabla de arriba | Sin mejora; **no se agregan** |

**Auditoría de las apps (v70 / v21 / NBA v4.0):** los textos de NBA decían «2,486 juegos» y «peso 0.00-0.06» (2 temporadas); ahora dicen
7,293 juegos y 6 temporadas. `index.html` y `futbol.html` ya estaban al día. Quedan 513 pruebas pasando. No se tocó ningún cálculo de
NBA (95% mercado, 5% modelo ya era lo medido). `diseno.js` dice «ESPN (3 temporadas)» y es lo que la app baja en el teléfono, no una cifra de medición.

**Lo que NO se pudo probar** (y es donde está la información que el mercado todavía no tiene): lesiones y alineaciones confirmadas
en NBA y fútbol, y movimiento de la línea desde la apertura. Haría falta guardar las cuotas de apertura y las bajas de cada día.

## Límites (léelos antes de creer cualquier cifra)

1. **Cierre, no apertura.** El cierre es el precio más difícil de ganar. Si tomas cuota temprano o en casas lentas, hay un
   margen que esta prueba no mide; el CLV de «Mis picks» sí.
2. **MLB 2021-2023:** ESPN no guarda la etiqueta de cierre en esos años; se usó el último precio registrado (mismo vig
   mediano: 3.8% a 4.2%). Se verificó que las 6 temporadas se parecen (vig, % de victorias locales).
3. **Sesgo a favor del modelo en MLB 2024-26:** algunas constantes del modelo (PESO_ABRIDOR, ×6, etc.) se calibraron con esas
   temporadas; 2021-2023 son lo más limpio y ahí el modelo rindió peor que en 2025-26.
4. **Fútbol y NBA son réplicas** del modelo (F0 y V0), no el código de las apps; MLB sí corre el código real de `index.html`.
5. **No hay stake en fútbol ni NBA**, así que no hay banca que simular; se midió ROI plano.
6. **Fútbol 2025-26:** Pinnacle de cierre solo en la mitad de los partidos; el resto usa el promedio de cierre. Dos
   partidos de Ligue 1 de 2020-21 salen sin probabilidad de F0 y se excluyen (10,732 de 10,734).
7. **Los cortes por tamaño de ventaja se miraron después de ver los datos.** Son pistas.

## Cómo repetirlo

Las ramas `variantes-6t`, `futbol-6t` y `nba-6t` traen cada una un workflow que se dispara al hacer push y guarda el
resultado en `var-S20XX`, `resultados-futbol-6t` y `resultados-nba-6t` (esas ramas se conservan: son los datos de este informe). Las ramas de sonda
(`sonda-6t`, `sonda-6t2`) y la del experimento de tiros (`experimento-tiros`, `resultados-*`) ya no hacen falta y se pueden borrar a mano en GitHub; lo que mostraron está resumido arriba.
