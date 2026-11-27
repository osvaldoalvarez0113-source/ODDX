# xG real en el modelo de fútbol (27-nov-2026)

Pedido de Osvaldo, hablando del Forest vs Chelsea: «¿por qué OVA no razona con el xG?». El modelo de fútbol solo había probado un
«xG aproximado» hecho con tiros (`resultados-futbol-xg`, oct-2026), que no mejoró. Esta es la primera prueba con **xG de verdad**
(calidad de cada tiro, de Understat).

## De dónde salió el xG

- Understat no deja bajar con robots (su robots.txt cierra todo el sitio y su API devuelve una página en vez de datos), y FBref tampoco.
  No se le dio la vuelta a eso.
- ESPN trae xG solo de **jugadores** y solo de 2026-27: no sirve para medir.
- La API de ClubElo no responde desde GitHub.
- **Se usó el dataset público `ganendraditya/understat-data` de Hugging Face** (con permiso de Osvaldo). Son los números de Understat,
  reconstruidos de copias del **Wayback Machine** (archive.org). Trae xG por equipo y partido de la **Premier, La Liga y Serie A,
  2014-15 a 2024-25** (12,540 partidos). No trae Bundesliga ni Ligue 1, ni 2025-26 en adelante. Understat no publica licencia: se usó
  solo para medir, no se muestra en la app. Rama `datos-xg-futbol` (`team_match.csv`).

## Cómo se midió

`node scripts/medicion/xg_futbol.js partidos_actual.json team_match.csv`. Corre el **motor real** de `futbol.html` (`dcAjustar` +
`calcularDC`, v22: 2 temporadas de historial, xi 1.0), igual que `fut_dc_real.js`. Lo único que cambia: ataque y defensa se ajustan con
**A·goles + (1−A)·xG**. A = 1 es la app de hoy; A = 0 es solo xG. Se cruzó con `partidos_actual.json` (marcador y cierre de Pinnacle):
7,980 partidos, 1 sin xG.

**Regla fijada antes de correr:** A en {1, 0.75, 0.5, 0.25, 0}. Se elige A en 2020-21 y 2021-22 y se prueba en 2022-23 a 2024-25, y al
revés. Pasa si la pérdida 1X2 baja contra A = 1 con t ≥ 2 en las **dos** direcciones y no pierde aciertos.

## Veredicto: no pasa (por poco). No entra todavía

| | Partidos | Pérdida 1X2 (app → con xG) | Aciertos (app → con xG) | t |
|---|---|---|---|---|
| Elige en 2020-22 (A = 0.5), prueba en 2022-25 | 3,420 | 0.9777 → 0.9736 (+4.1 milésimas) | 1,827 → **1,849** (53.4% → 54.1%) | **3.49** |
| Elige en 2022-25 (A = 0.25), prueba en 2020-22 | 2,280 | +2.1 milésimas | 1,207 → 1,210 | 1.02 |
| **Confirmación** en temporadas que nadie miró (2016-17 a 2019-20, A = 0.5 fija) | 4,560 | 0.9549 → 0.9542 (+0.7) | 2,525 → 2,540 (55.4% → 55.7%) | 0.66 |

- **Lo bueno:** mitad goles y mitad xG (A = 0.5) mejora en las **5 temporadas** de 2020-21 a 2024-25 (+2.5, +2.6, +6.1, +2.2, +3.9
  milésimas) y en las 3 ligas. De 2022 a 2025 acierta **22 partidos más de 3,420**.
- **Lo que no deja que entre:** en la vuelta (t 1.0) y en la confirmación con 4 temporadas nuevas (t 0.66) la mejora es chiquita y no se
  distingue de cero. 2016-17 y 2017-18 salen en cero o un pelo peor, y Serie A sale peor en la confirmación (−1.2).
- **Sumando todo** (9 temporadas, 10,260 partidos): con xG acierta **+40 partidos** (+0.4 puntos) y la pérdida baja en 7 de 9 temporadas.
  Es una señal **real pero chiquita**, más fuerte en los años recientes.
- **El mercado sigue muy lejos:** con xG el modelo queda en 0.9736 y el cierre de Pinnacle en 0.9546 (2022-25). El xG cierra ~18% de esa
  distancia, no la borra.
- **Más/Menos 2.5:** igual (0.6814 → 0.6809). El xG no ayuda al total.

## Qué haría falta para que entre

1. **Una fuente de xG en vivo** que la app pueda leer cada día: hoy no hay una legal y estable (Understat bloquea; ESPN solo da xG de
   jugadores en el resumen del partido).
2. **Más prueba:** repetir cuando haya xG de 2025-26 y 2026-27 (el dataset se puede actualizar) y con Bundesliga y Ligue 1.
3. Si las dos cosas se dan y vuelve a salir a favor, el cambio en la app es pequeño: ajustar con mitad goles y mitad xG.

## Salida completa

```
partidos 7980, sin xG 1
temporadas con xG 1819 1920 2021 2122 2223 2324 2425 | se predicen 2021 2122 2223 2324 2425 | bloques 2021,2122 ↔ 2223,2324,2425 | config {"xi":1,"Kp":5,"rho":-0.06,"promo":1,"wt":0.5,"win":1100,"ligas":{"pl":1,"laliga":1,"seriea":1,"bundesliga":1,"ligue1":1}}

| A (peso de los goles) | Bloque 2020-22: pérdida 1X2 · aciertos | Bloque 2022-25: pérdida 1X2 · aciertos | Más/Menos 2.5 (todo) |
|---|---|---|---|
| 1 (app hoy) | 0.9887 · 1207/2280 (52.9%) | 0.9777 · 1827/3420 (53.4%) | 0.6814 |
| 0.75 | 0.9868 · 1206/2280 (52.9%) | 0.9750 · 1829/3420 (53.5%) | 0.6809 |
| 0.5 | 0.9861 · 1206/2280 (52.9%) | 0.9736 · 1849/3420 (54.1%) | 0.6809 |
| 0.25 | 0.9866 · 1210/2280 (53.1%) | 0.9734 · 1850/3420 (54.1%) | 0.6814 |
| 0 (solo xG) | 0.9882 · 1213/2280 (53.2%) | 0.9743 · 1847/3420 (54.0%) | 0.6824 |

Mercado (Pinnacle cierre) en los mismos partidos: 2020-22 0.9680 · 2022-25 0.9546

Elige en 2020-22: A = 0.5 → prueba en 2022-25: mejora 4.08 milésimas (t 3.49), aciertos 1827 → 1849 de 3420
Elige en 2022-25: A = 0.25 → prueba en 2020-22: mejora 2.12 milésimas (t 1.02), aciertos 1207 → 1210 de 2280

**No pasa**

Por temporada, A = 0.5 contra A = 1 (milésimas, + = mejor): 2021 2.54 · 2122 2.59 · 2223 6.13 · 2324 2.20 · 2425 3.90
Por liga, A = 0.5 contra A = 1: E0 4.26 · SP1 5.37 · I1 0.79

### Confirmación (temporadas nuevas)
partidos del dataset 12540, con rival encontrado 12540
A = 0.5 contra A = 1 en 1617, 1718, 1819, 1920: 4560 partidos, pérdida 0.9549 → 0.9542, mejora 0.72 milésimas (t 0.66), aciertos 2525 → 2540 (55.4% → 55.7%)
Por temporada: 1617 -0.16 (1140) · 1718 -0.05 (1140) · 1819 0.47 (1140) · 1920 2.63 (1140)
Por liga: E0 2.15 · SP1 1.21 · I1 -1.19

**Confirmación: no pasa**
```
