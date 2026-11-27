# Hándicap + total → % de ganar (27-nov-2026)

Mejora diaria de OVA. Idea sacada de la literatura de líneas de apuestas: Stern (1991) y
[«The Performance of Betting Lines for Predicting the Outcome of NFL Games»](https://arxiv.org/pdf/1211.4000) y
[«Converting College Football Point Spread Differentials to Probabilities»](https://arxiv.org/pdf/2212.08116):
el margen final se reparte casi normal alrededor del hándicap. Dos preguntas:

1. ¿El % de ganar que sale del **hándicap** de cierre es más exacto que el del **moneyline** de cierre (lo que la app usa hoy)?
2. ¿Ayuda el **total**? Con total alto hay más puntos y más varianza, así que el mismo hándicap valdría menos % (σ crece con √total).

`python3 scripts/medicion/hcap_total.py filas_nba.json cierres-nba.json datos-nfl.json cierres-nfl.json`
(ramas `resultados-nba-6t`, `cierres` y `datos-nhl-nfl`; NHL no entra porque su hándicap es casi siempre ±1.5 y no trae el margen).

## Regla fijada antes de correr

- Base: moneyline de cierre sin vig (multiplicativo).
- Candidatos (3 por deporte, 6 pruebas): **A** solo hándicap `Φ(−sp/σ)`; **B** hándicap + total `Φ(−sp/(k·√total))`;
  **C** mezcla `logit p = (1−w)·logit(moneyline) + w·logit(B)`.
- Se ajusta en un bloque de temporadas y se prueba en el otro, en las **dos direcciones** (NBA 2020-22 ↔ 2023-25; NFL 2020-22 ↔ 2023-25).
  La temporada en curso (2026-27) va aparte, con lo ajustado en todo lo anterior.
- Pasa si: baja la pérdida log en las dos direcciones, Holm < 5% sobre las 6 pruebas, la temporada en curso no va al revés y no pierde aciertos.
- Se tiran juegos sin hándicap o con el favorito del moneyline y el del hándicap al revés con |hándicap| ≥ 3 (línea rota).

## Veredicto: no pasa. No entra.

| | Juegos | Mejora de pérdida log (milésimas, + = mejor que moneyline) | z | Aciertos moneyline → candidato | Temporada en curso |
|---|---|---|---|---|---|
| NBA A (solo hándicap) | 7,254 | ida −1.09 · vuelta −0.02 · juntas **−0.57** | −1.26 | 4,931 → 4,915 (67.98% → 67.76%) | 270 juegos, +0.55 (z 0.2), 187 → 187 |
| NBA B (hándicap + total) | 7,254 | −1.25 · −0.05 · **−0.67** | −1.43 | 4,931 → 4,915 | +0.48 (z 0.2), 187 → 187 |
| NBA C (mezcla) | 7,254 | −0.51 · +0.06 · **−0.23** | −1.12 | 4,931 → 4,915 | +0.27 (z 0.5), 187 → 187 |
| NFL A | 1,683 | +0.37 · −2.31 · **−0.96** | −0.67 | 1,126 → 1,121 (66.90% → 66.61%) | 163 juegos, +2.59 (z 0.7), 111 → 112 |
| NFL B | 1,683 | +0.27 · −2.13 · **−0.92** | −0.60 | 1,126 → 1,121 | +3.84 (z 0.9), 111 → 112 |
| NFL C | 1,683 | +0.00 · −0.66 · **−0.33** | −0.51 | 1,126 → 1,125 | +1.28 (z 1.2), 111 → 112 |

- **El hándicap y el moneyline dicen lo mismo.** En la NBA la pérdida por temporada es casi idéntica (p. ej. 2024: 0.5813 contra 0.5811).
  Cuando no coinciden en el favorito (52 juegos NBA, 7 NFL), el moneyline acierta más: el candidato solo acierta 18 de 52 y 1 de 7.
- **El total no agrega nada:** B sale igual o peor que A. La σ ajustada (NBA ≈ 12.5 puntos, NFL ≈ 11) ya cubre la varianza; el total no la afina.
- La mezcla C elige pesos que cambian de una mitad a otra (NBA w = 0.6 y 0.1; NFL 0.0 y 0.55): es ruido.
- La temporada en curso sale un poquito a favor en todo, pero con z < 1.3 y 0-1 acierto de diferencia: no se distingue de cero.
- **Conclusión:** la app sigue con el moneyline de cierre sin vig. No hace falta leer el hándicap ni el total para el % de ganar.

## Hallazgo de datos: la NFL 2019 trae líneas EN VIVO

La primera corrida incluía NFL 2019 y la vuelta salía −19 milésimas (z −5.8). Revisando: en `datos-nfl.json` (rama `datos-nhl-nfl`),
**2019** tiene totales de 21.5, 24.5 y más de 60, y el moneyline «acierta» 74.1% con pérdida 0.518 (las demás temporadas: 63-70% y 0.59-0.63).
36 de 266 juegos con precio de menos de 10% o más de 90%. Eso solo pasa si ESPN guardó la línea **durante el juego**.
Se sacó 2019 (y los totales fuera de 33-62) y se repitió: el veredicto no cambia, pero el dato importa para otras mediciones.

**Ojo:** `sorpresas.py`, `memoria.py`, `gemelos.py` y el **investigador** leen `datos-nfl.json` con 2019 adentro (por ejemplo,
la memoria reporta NFL con 71.6% de aciertos del precio, alto para la NFL). Las que dicen «no entra» casi seguro siguen igual,
pero **una sí cambia:** el reloj del cuerpo NFL (`MEDICION-RELOJ-NFL-2026-11.md`, en vigilancia) pasaba con 107 juegos y z 2.18;
sin 2019 quedan 93 juegos, 62.4% contra 53.2%, **z 1.91: ya no pasa**. `recalibrar.py`, `division.py` y `reloj_nfl.py` también leen
2019. Repetirlas todas sin 2019 quedó en la cola de la bitácora.

También se vio que en la NHL 2025-26 el favorito de cierre ganó solo 55.5% (1,394 juegos; 2022-24: 61%). Es igual con DraftKings
y con ESPN BET y en casi todos los meses, así que parece una temporada pareja de verdad y no un error; se anota por si acaso.

## Repetición sin la NFL 2019 (27-nov-2026, a pedido de Osvaldo)

Se corrieron otra vez, con y sin 2019, todas las mediciones que leen `datos-nfl.json`:

| Medición | Con 2019 | Sin 2019 | ¿Cambia la conclusión? |
|---|---|---|---|
| Sorpresas (`sorpresas.py`), NFL | 1,891 juegos; ninguna situación pasa (la más cerca: favorito de visita −3.2 pts, z −1.9) | 1,652; ninguna pasa (−3.0 pts, z −1.6) | No |
| Memoria (`memoria.py`), NFL | ninguna forma mejora (−11 a −20 milésimas) | ninguna (−12 a −20) | No |
| Gemelos (`gemelos.py`), NFL | Brier 0.20598 → 0.21441 (peor) | 0.20660 → 0.21550 (peor) | No |
| Recalibrar (`recalibrar.py`), NFL | no pasa (t −1.2 / −0.9) | no pasa (t −1.7 / −1.5) | No |
| División (`division.py`), NFL | −0.2 pts, p 0.89 | +0.4 pts, p 0.82 | No |
| Investigador, NFL | 0 pasan | 0 pasan | No |
| **Reloj del cuerpo NFL** (`reloj_nfl.py`) | **pasa** (107 juegos, z 2.18) | **no pasa** (93 juegos, z 1.91) | **Sí** |

**Se arregló en el código:** `sorpresas.py` (que importan memoria, gemelos, recalibrar, división, reloj y el investigador) y
`scripts/historia_liga.js` (la 📚 historia de la liga que sale en «de cada 100») ya no cuentan la NFL 2019. En la historia,
lo que más cambia es la franja de 90%+: tenía 46 juegos con el favorito ganando 95.7% y queda en 10 juegos con 90.0%.
Las otras franjas casi no se mueven (50-60%: 56.5% → 56.3%; 70-80%: 77.4% → 77.3%). Prueba nueva en `pruebas.js`.

**NHL 2025-26 (favoritos que ganan solo 55.5%):** revisado. La línea guardada es de cierre (en el 89% de los juegos es distinta
de la apertura) y con la apertura sale igual (55.4%). Fue una temporada pareja de verdad, no un error de datos.
