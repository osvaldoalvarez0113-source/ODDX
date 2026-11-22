# «Haz todo para mejorar»: clima MLB, ritmo NBA y árbitros (22 nov 2026)

Pedido de Osvaldo tras revisar la lista «Alimentar ODDX». Solo mide; no toca la app. Script `scripts/medicion/mejoras_nov.js`, workflow **Medir mejoras** (informe en la rama `resultados-mejoras`; lo bajado de ESPN, 13,179 resúmenes de juego con box y árbitros, queda en `datos-resumenes`).

**Regla fijada antes de correr:** una temporada afuera cada vez; entra solo si mejora en la mayoría de las temporadas y, todo junto, le gana a la línea con z ≥ 2 (ganador: menor pérdida log y más aciertos).

## Veredicto

| Idea | Resultado | ¿Entra? |
|---|---|---|
| **MLB viento y temperatura** sobre el total (7,739 juegos al aire libre, con las líneas de cierre 2023-2026 que bajó hoy el archivo de cierres) | El Más/Menos que señala acierta **50.0%** (z 0.03). Solo viento hacia afuera: 45.5%. La línea ya trae el clima. | **No.** Se cierra la «vigilancia» del viento de MLB. |
| **NBA ritmo** (posesiones esperadas de los dos equipos) sobre el total (6,257 juegos) | −0.011 puntos de total por posesión: cero. La línea ya trae el ritmo; no genera ni una señal. | **No.** |
| **Árbitros NBA → ganador** (7,257 juegos) | Empeora en 6 de 6 temporadas (aciertos 67.9% → 67.3%). | **No.** |
| **Árbitros NHL → ganador y total** (5,922 juegos) | Ganador empeora en 4 de 5; total 50.6% (z 0.57); 0 de 18 ajustes pasan. | **No.** |
| **Árbitros NBA → total** (Más/Menos según la cuadrilla) | Con el ajuste fijado: **52.2%** (2,804 picks, z 2.34, arriba de 50% en 5 de 6 temporadas). Pero con el efecto sacado **solo de temporadas anteriores** (como se usaría en vivo) baja a 51.7% (z 1.72), y de 18 ajustes pasan 7. Siempre sale un poco arriba de 50%, nunca fuerte. | **En vigilancia, no entra.** Señal débil y constante; con la regla realista no llega. Además hace falta saber la cuadrilla ANTES del juego. |

**En corto:** ninguna de las cinco ideas sube los aciertos del ganador. Lo único con algo de vida es árbitros NBA en el total (~52%), y no es firme.

---


MLB 2023: 1922 juegos al aire libre con línea de cierre y clima oficial
MLB 2024: 1896 juegos al aire libre con línea de cierre y clima oficial
MLB 2025: 2001 juegos al aire libre con línea de cierre y clima oficial
MLB 2026: 1920 juegos al aire libre con línea de cierre y clima oficial

## 1) MLB · viento y temperatura sobre el total de cierre (7739 juegos, 2023-2026)

Todo junto (carreras): viento afuera 0.020 por mph · viento adentro 0.014 por mph · temperatura 0.008 por °F sobre 70.

Una temporada afuera cada vez; el Más/Menos que señala cuando el efecto esperado es ≥ u carreras:

| Idea | Picks | Acierta | z | Por temporada | ¿Entra? |
|---|---|---|---|---|---|
| Viento + temperatura (≥0.25 carreras) | 1181 | 50.0% | 0.03 | 2023: 53% (75) · 2024: 49% (611) · 2025: 47% (260) · 2026: 54% (235) | no |
| Viento + temperatura (≥0.5 carreras) | 44 | 45.5% | -0.60 | 2023: — · 2024: 41% (41) · 2025: 100% (3) · 2026: — | no |
| Solo viento hacia afuera (≥0.25) | 224 | 45.5% | -1.34 | 2023: 39% (28) · 2024: 45% (157) · 2025: 51% (39) · 2026: — | no |
nba: 7257 juegos, 0 resúmenes por bajar

## 2) NBA · ritmo (posesiones esperadas sobre la liga) contra el total de cierre (6257 juegos)

Todo junto: -0.011 puntos de total por cada posesión de ritmo de más.

| Idea | Picks | Acierta | z | Por temporada | ¿Entra? |
|---|---|---|---|---|---|
| Ritmo solo (≥0.25 puntos) | 0 | — | 0.00 | 2020: — · 2021: — · 2022: — · 2023: — · 2024: — · 2025: — | no |
| Total del modelo OVA solo (≥0.25, para comparar) | 896 | 46.7% | -2.00 | 2020: — · 2021: — · 2022: 44% (41) · 2023: 47% (264) · 2024: — · 2025: 47% (591) | no |
| Modelo OVA + ritmo (≥0.25) | 939 | 47.0% | -1.86 | 2020: — · 2021: — · 2022: 36% (44) · 2023: 48% (307) · 2024: — · 2025: 47% (588) | no |
| Ritmo solo (≥0.5 puntos) | 0 | — | 0.00 | 2020: — · 2021: — · 2022: — · 2023: — · 2024: — · 2025: — | no |
| Total del modelo OVA solo (≥0.5, para comparar) | 253 | 51.8% | 0.57 | 2020: — · 2021: — · 2022: — · 2023: 41% (22) · 2024: — · 2025: 53% (231) | no |
| Modelo OVA + ritmo (≥0.5) | 266 | 52.3% | 0.74 | 2020: — · 2021: — · 2022: — · 2023: 48% (31) · 2024: — · 2025: 53% (235) | no |

## 3a) Árbitros NBA (7257 juegos; efecto de cada árbitro sacado SOLO de las otras temporadas)

**Ganador:** pérdida log cierre 0.5962 → con árbitros 0.6029 · aciertos 67.9% → 67.3% · mejora en 0 de 6 temporadas → no entra

**Total (Más/Menos según la cuadrilla):** 2804 picks, acierta 52.2% (z 2.34) · 2020: 52% (420) · 2021: 51% (458) · 2022: 57% (434) · 2023: 53% (468) · 2024: 52% (448) · 2025: 49% (576) → **entra**

Sensibilidad del total de árbitros NBA (encogimiento K, umbral de la cuadrilla, y solo temporadas anteriores):

| K | Umbral | Solo antes | Picks | Acierta | z | ¿Entra? |
|---|---|---|---|---|---|---|
| 30 | 0.02 | no | 4429 | 51.3% | 1.70 | no |
| 30 | 0.02 | sí | 4170 | 52.0% | 2.57 | sí |
| 30 | 0.03 | no | 3244 | 51.1% | 1.23 | no |
| 30 | 0.03 | sí | 3249 | 51.6% | 1.84 | no |
| 30 | 0.05 | no | 1457 | 52.4% | 1.81 | no |
| 30 | 0.05 | sí | 1777 | 51.8% | 1.54 | no |
| 60 | 0.02 | no | 4082 | 51.5% | 1.88 | no |
| 60 | 0.02 | sí | 3730 | 51.8% | 2.16 | sí |
| 60 | 0.03 | no | 2804 | 52.2% | 2.34 | sí |
| 60 | 0.03 | sí | 2683 | 51.7% | 1.72 | no |
| 60 | 0.05 | no | 1086 | 53.5% | 2.31 | sí |
| 60 | 0.05 | sí | 1172 | 53.2% | 2.22 | sí |
| 120 | 0.02 | no | 3568 | 51.6% | 1.91 | no |
| 120 | 0.02 | sí | 3023 | 51.8% | 2.02 | sí |
| 120 | 0.03 | no | 2111 | 52.5% | 2.29 | sí |
| 120 | 0.03 | sí | 1846 | 51.9% | 1.63 | no |
| 120 | 0.05 | no | 577 | 50.1% | 0.04 | no |
| 120 | 0.05 | sí | 539 | 49.4% | -0.30 | no |
nhl: 5922 juegos, 0 resúmenes por bajar

## 3b) Árbitros NHL (5922 juegos; efecto de cada árbitro sacado SOLO de las otras temporadas)

**Ganador:** pérdida log cierre 0.6615 → con árbitros 0.6660 · aciertos 59.9% → 59.2% · mejora en 1 de 5 temporadas → no entra

**Total (Más/Menos según la cuadrilla):** 2088 picks, acierta 50.6% (z 0.57) · 2022: 53% (414) · 2023: 48% (595) · 2024: 51% (453) · 2025: 51% (515) · 2026: 53% (111) → no entra

Sensibilidad del total de árbitros NHL (encogimiento K, umbral de la cuadrilla, y solo temporadas anteriores):

| K | Umbral | Solo antes | Picks | Acierta | z | ¿Entra? |
|---|---|---|---|---|---|---|
| 30 | 0.02 | no | 3440 | 49.9% | -0.17 | no |
| 30 | 0.02 | sí | 3018 | 49.7% | -0.36 | no |
| 30 | 0.03 | no | 2462 | 50.6% | 0.60 | no |
| 30 | 0.03 | sí | 2321 | 49.6% | -0.35 | no |
| 30 | 0.05 | no | 1026 | 48.8% | -0.75 | no |
| 30 | 0.05 | sí | 1185 | 49.7% | -0.20 | no |
| 60 | 0.02 | no | 3124 | 49.9% | -0.07 | no |
| 60 | 0.02 | sí | 2732 | 49.6% | -0.46 | no |
| 60 | 0.03 | no | 2088 | 50.6% | 0.57 | no |
| 60 | 0.03 | sí | 1942 | 49.6% | -0.36 | no |
| 60 | 0.05 | no | 738 | 49.6% | -0.22 | no |
| 60 | 0.05 | sí | 755 | 49.3% | -0.40 | no |
| 120 | 0.02 | no | 2617 | 50.2% | 0.25 | no |
| 120 | 0.02 | sí | 2192 | 49.6% | -0.38 | no |
| 120 | 0.03 | no | 1519 | 49.9% | -0.08 | no |
| 120 | 0.03 | sí | 1261 | 50.6% | 0.42 | no |
| 120 | 0.05 | no | 335 | 47.5% | -0.93 | no |
| 120 | 0.05 | sí | 263 | 54.0% | 1.29 | no |
