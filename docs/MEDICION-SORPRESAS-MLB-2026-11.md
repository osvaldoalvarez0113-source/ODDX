# Sorpresas en MLB: ¿cuándo gana el no favorito más de lo que dice su precio? (28-nov-2026)

Lleva a MLB la medición de `MEDICION-SORPRESAS-2026-11.md` (NBA, NHL, NFL), que se había dejado para la temporada. Se hizo con
temporadas pasadas: `cierres-mlb.json` (rama `cierres`, 2023-2026, línea de cierre de ESPN por juego).

`python3 scripts/medicion/sorpresas_mlb.py cierres-mlb.json` (usa `contexto()` y `filas()` de `sorpresas.py`).

## Regla fijada antes de correr

La misma de sorpresas: pasa si |z| ≥ 2.5 con todo junto y en las dos mitades (A = 2023-2024, B = 2025-2026) va hacia el mismo
lado con al menos 1 punto; además Holm al 5% sobre las 17 pruebas. Ajustes de béisbol fijados antes: sin back-to-back (se juega
casi a diario), paliza = 5+ carreras, gira larga = 7º juego o más fuera, inicio de temporada = favorito con menos de 15 juegos,
favorito grande = 65%+. Se cuentan situaciones con 100+ juegos.

## Veredicto: ninguna situación pasa. Nada entra a la app de MLB

- 8,284 juegos con precio de cierre (sin campo neutral ni juegos de 48-52%). El favorito ganó **58.2%**, su precio decía **58.7%**:
  el precio de cierre de MLB ya es casi exacto.
- **«La racha engaña» NO se cumple en MLB.** En NBA el no favorito que viene 2+ victorias mejor en los últimos 10 gana menos que su
  precio (30.7% contra 38.2%). En MLB pasa al revés y sin fuerza: gana **45.0% contra 42.7%** de su precio (1,454 juegos, z +1.7,
  A +0.4 / B +3.9). No pasa la regla ni Holm (p 0.08, umbral 0.003). **No se lleva la señal 📊 a MLB.**
- Lo más cerca después: favorito grande 65%+ gana un poco más de lo que dice (el perro 29.4% contra 31.3%, z −1.3) y rival que
  viene de 3+ victorias (44.7% contra 42.6%, z +1.2). Ruido.
- Cruce previo, paliza, inicio de temporada, gira larga, descanso: todo dentro de ±2.5 puntos y z < 1.3.
- Igual que en NBA, NHL y NFL: el precio ya mira la racha, la gira y el resto.

## Tablas

## MLB — 8284 juegos con precio de cierre (A 2023-24: 4197 · B 2025-26: 4087). El favorito ganó 58.2%, el precio decía 58.7%

| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|
| Favorito de visita, 7º juego o más de gira | 333 | 39.9% | 42.3% | -2.4 pts | -0.9 | -4.6 / +0.4 | no |
| Favorito en casa (no favorito de visita) | 5506 | 41.5% | 40.7% | +0.7 pts | +1.1 | +0.9 / +0.5 | no |
| Favorito de visita | 2778 | 42.5% | 42.4% | +0.1 pts | +0.1 | -0.8 / +1.2 | no |
| Favorito viene de 5+ victorias seguidas | 382 | 41.1% | 39.7% | +1.4 pts | +0.6 | +1.9 / +1.0 | no |
| Rival viene de 5+ derrotas seguidas | 432 | 41.0% | 39.2% | +1.8 pts | +0.8 | +1.0 / +2.6 | no |
| Rival viene de 3+ victorias seguidas | 816 | 44.7% | 42.6% | +2.1 pts | +1.2 | +1.7 / +2.4 | no |
| Favorito viene de perder | 3695 | 42.1% | 41.7% | +0.3 pts | +0.4 | -0.0 / +0.7 | no |
| Favorito viene de ganar por paliza (5+) | 1378 | 40.9% | 40.5% | +0.4 pts | +0.3 | -0.3 / +1.1 | no |
| Rival viene de perder por paliza (5+) | 1369 | 41.0% | 40.4% | +0.6 pts | +0.4 | +1.1 / +0.0 | no |
| Rival ganó el último cruce entre los dos | 3010 | 42.3% | 41.9% | +0.3 pts | +0.4 | -0.7 / +1.4 | no |
| Rival viene mejor en los últimos 10 (2+ victorias más) — «La racha engaña» de NBA | 1454 | 45.0% | 42.7% | +2.3 pts | +1.7 | +0.4 / +3.9 | no |
| Rival viene mejor en los últimos 10 (4+ victorias más) | 328 | 44.8% | 43.1% | +1.7 pts | +0.6 | +3.5 / +0.5 | no |
| Favorito con peor récord de temporada que el rival | 1779 | 45.4% | 44.0% | +1.4 pts | +1.2 | +1.6 / +1.2 | no |
| Inicio de temporada (favorito con menos de 15 juegos) | 780 | 40.3% | 41.4% | -1.2 pts | -0.7 | -2.1 / -0.2 | no |
| Favorito grande (65%+) | 1085 | 29.4% | 31.3% | -1.9 pts | -1.3 | -0.5 / -3.7 | no |
| Favorito corto (52-55%) | 2209 | 46.3% | 46.8% | -0.5 pts | -0.5 | -1.0 / -0.0 | no |
| Rival descansó y el favorito no (rival sin jugar ayer, favorito sí) | 268 | 40.7% | 41.5% | -0.8 pts | -0.3 | -5.2 / +3.8 | no |

Holm sobre 17 pruebas:
- Rival viene mejor en los últimos 10 (2+ victorias más) — «La racha engaña» de NBA: p = 0.0809, umbral Holm 0.0029 → no pasa
- Favorito grande (65%+): p = 0.1783, umbral Holm 0.0031 → no pasa
- Rival viene de 3+ victorias seguidas: p = 0.2248, umbral Holm 0.0033 → no pasa
- Favorito con peor récord de temporada que el rival: p = 0.2301, umbral Holm 0.0036 → no pasa
- Favorito en casa (no favorito de visita): p = 0.2712, umbral Holm 0.0038 → no pasa
