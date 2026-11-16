# Hembras (no favoritos) en NHL: ¿hay señal para separar la viva de la muerta? (15-nov-2026)

`node scripts/medicion/hembras.js`. Temporada regular 2022 a hoy, moneyline de cierre de ESPN BET / DraftKings, modelo walk-forward
(igual que `correr_nhl_nfl.js`) **con tiros a puerta** de `hist-nhl.json` (2023-24 en adelante). Hembra = menos de 50% en el mercado
sin margen. A = 2022-2023, B = 2024-2026. Regla fijada antes de correr: pasa solo si rinde > 0 con z ≥ 2 y es positiva en las dos mitades.

**Veredicto: ninguna regla pasa.** El modelo no agrega nada al precio de la hembra (regresión c = 0.09 ± 0.29).

- **Corrección (misma fecha):** la primera corrida usó el modelo sin tiros (los juegos de `datos-nhl.json` no los traen) y dio que la hembra
  que le gusta al modelo gana *menos* (c = −0.32). Con el modelo de la app eso desaparece: ni ayuda ni estorba.
- **Lo único que se repite en las dos mitades es una señal de NO jugar**: hembra que jugó ayer contra favorito descansado
  (654 juegos, gana 34.7% contra 38.0% del precio, −13.3% ±9.6; A −17.0%, B −10.1%). No depende del modelo.
- «Modelo +2 y el dinero entró a la hembra» dio +8.0% ±18.6 en 150 juegos: muy pocos, no pasa.
- +1.5 de la hembra: pega ~62% en general y ~66% en las cortas, pero rinde −2% a −7% (el margen). Sirve para acertar más, no para ganar más.

## ¿Se puede afinar más el modelo? (15-nov-2026)
Rejilla de 324 combinaciones (kM, kS, Ws, R, carry) elegida solo con temporadas anteriores y medida en la siguiente (2024-2026, 2,422 juegos):
afinado − actual = −0.03 milésimas ± 1.30 (z −0.04). **Nada que cambiar**: las constantes de `modelo-nhl.js` ya están en su techo.
Pérdida del modelo contra el mercado: 2024 0.6605 / 0.6583 · 2025 0.6830 / 0.6821.

## Por precio
| Regla | Juegos | Gana | Mercado decía | Rinde al gane | A / B | ¿Pasa? | +1.5 pega | Rinde +1.5 | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|---|
| Todas las hembras | 4498 | 39.7% | 39.9% | -4.9% ±3.6 | -7.8% / -2.1% | no | 61.8% | -3.8% ±2.3 | -5.0% / -2.6% | no |
| Corta: 45-50% (hasta +120) | 1143 | 45.5% | 47.4% | -8.1% ±6.0 | -16.2% / -1.4% | no | 66.7% | -6.9% ±4.0 | -11.0% / -3.6% | no |
| Media: 40-45% (+120 a +150) | 1429 | 43.9% | 42.5% | -0.8% ±5.9 | -1.8% / +0.1% | no | 65.5% | -2.4% ±3.8 | -3.2% / -1.8% | no |
| Larga: 33-40% (+150 a +200) | 1179 | 37.9% | 36.7% | -0.9% ±7.4 | +1.1% / -2.8% | no | 58.6% | -3.8% ±4.7 | -3.7% / -3.9% | no |
| Palo: menos de 33% (+200 o más) | 747 | 25.4% | 28.1% | -14.2% ±10.9 | -17.4% / -8.3% | no | 51.3% | -1.5% ±7.5 | -2.4% / -0.0% | no |

## El modelo le ve más chance que el mercado
| Regla | Juegos | Gana | Mercado decía | Rinde al gane | A / B | ¿Pasa? | +1.5 pega | Rinde +1.5 | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|---|
| Modelo +2 pts o más | 1621 | 39.8% | 40.1% | -4.4% ±6.0 | -11.3% / +2.3% | no | 61.6% | -4.3% ±3.9 | -8.5% / -0.3% | no |
| Modelo +4 pts o más | 995 | 39.5% | 40.0% | -5.1% ±7.7 | -13.2% / +3.0% | no | 61.9% | -3.9% ±4.9 | -8.1% / +0.2% | no |
| Modelo +6 pts o más | 524 | 38.0% | 40.0% | -9.5% ±10.3 | -24.4% / +7.0% | no | 59.8% | -7.3% ±6.8 | -14.8% / +0.8% | no |
| Modelo la tiene en 50% o más | 504 | 45.0% | 46.3% | -6.6% ±9.2 | -10.2% / -3.4% | no | 67.0% | -5.2% ±6.1 | -8.7% / -2.1% | no |
| Modelo le ve MENOS (−2 pts) | 1437 | 37.4% | 39.3% | -9.7% ±6.4 | -11.6% / -7.6% | no | 60.2% | -5.5% ±4.2 | -2.8% / -8.6% | no |

## Cómo vienen (últimos 10) y descanso
| Regla | Juegos | Gana | Mercado decía | Rinde al gane | A / B | ¿Pasa? | +1.5 pega | Rinde +1.5 | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|---|
| Hembra viene mejor (2+ victorias más en 10) | 411 | 40.4% | 43.1% | -8.9% ±11.2 | -17.7% / -1.7% | no | 63.1% | -6.4% ±7.2 | -10.9% / -2.7% | no |
| Hembra viene peor (2+ menos) | 1476 | 37.6% | 37.0% | -3.5% ±6.7 | -6.8% / +0.4% | no | 59.8% | -2.4% ±4.4 | -2.7% / -2.1% | no |
| Hembra en casa | 1686 | 41.3% | 41.3% | -3.5% ±5.7 | -8.8% / +2.0% | no | 62.5% | -4.5% ±3.7 | -8.2% / -0.8% | no |
| Hembra de visita | 2812 | 38.7% | 39.0% | -5.8% ±4.6 | -7.2% / -4.5% | no | 61.4% | -3.3% ±3.0 | -3.0% / -3.7% | no |
| Favorito jugó ayer y la hembra no | 317 | 43.5% | 41.5% | +3.1% ±13.6 | -0.9% / +7.3% | no | 64.8% | +0.2% ±8.6 | -1.7% / +2.4% | no |
| Hembra jugó ayer y el favorito no | 654 | 34.7% | 38.0% | -13.3% ±9.6 | -17.0% / -10.1% | no | 57.7% | -7.9% ±6.5 | -10.5% / -5.8% | no |

## Movimiento del precio (apertura → cierre)
| Regla | Juegos | Gana | Mercado decía | Rinde al gane | A / B | ¿Pasa? | +1.5 pega | Rinde +1.5 | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|---|
| El dinero entró a la hembra (+2 pts) | 520 | 44.8% | 43.2% | -0.0% ±9.9 | -1.6% / +0.5% | no | 64.3% | -4.0% ±6.4 | -8.7% / -2.5% | no |
| El dinero entró al favorito (−2 pts) | 1039 | 41.2% | 39.4% | -0.3% ±7.6 | -0.7% / -0.2% | no | 62.8% | -2.2% ±4.9 | -3.1% / -1.9% | no |
| Sin movimiento | 1828 | 38.9% | 40.0% | -7.0% ±5.6 | -11.7% / -4.2% | no | 62.1% | -3.6% ±3.6 | -4.3% / -3.2% | no |

## «Hembra viva» (combinaciones)
| Regla | Juegos | Gana | Mercado decía | Rinde al gane | A / B | ¿Pasa? | +1.5 pega | Rinde +1.5 | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|---|---|---|
| Corta (42%+) y modelo +2 | 749 | 43.3% | 45.6% | -8.9% ±7.6 | -13.5% / -4.8% | no | 65.2% | -7.0% ±5.1 | -11.6% / -2.8% | no |
| Corta y viene mejor | 271 | 40.2% | 46.0% | -16.1% ±12.5 | -28.2% / -5.9% | no | 63.9% | -9.3% ±8.4 | -10.1% / -8.6% | no |
| Corta, modelo +2 y viene mejor | 131 | 35.9% | 46.1% | -25.5% ±17.5 | -31.7% / -15.5% | no | 63.0% | -10.8% ±12.2 | -7.4% / -16.2% | no |
| Corta, en casa y modelo +2 | 315 | 45.7% | 45.7% | -4.2% ±11.8 | -8.6% / -1.4% | no | 66.0% | -6.1% ±7.9 | -15.1% / -0.4% | no |
| Modelo +2 y dinero entró a la hembra | 150 | 48.7% | 43.9% | +8.0% ±18.6 | +0.3% / +10.6% | no | 62.8% | -6.8% ±11.9 | -21.6% / -2.1% | no |

## Al revés: jugar el MACHO cuando el modelo se enamora de la hembra
| Regla | Juegos | Macho gana | Mercado decía | Rinde | z | A / B | Por temporada |
|---|---|---|---|---|---|---|---|
| Todos los machos | 4498 | 60.3% | 60.1% | -3.7% ±2.4 | -3.2 | -1.8% / -5.6% | -1.8% (1111) · -1.9% (1118) · -3.0% (1120) · -8.4% (1113) · -0.4% (36) |
| Modelo le da +2 a la hembra | 1621 | 60.2% | 59.9% | -3.2% ±4.0 | -1.6 | +0.7% / -7.1% | +1.1% (516) · +0.0% (282) · -2.6% (408) · -11.1% (395) · -20.4% (20) |
| Modelo le da +4 a la hembra | 995 | 60.5% | 60.0% | -3.0% ±5.0 | -1.2 | +1.5% / -7.6% | +3.6% (331) · -2.5% (167) · -1.8% (251) · -14.1% (237) · +2.6% (9) |
| Modelo le da +6 a la hembra | 524 | 62.0% | 60.0% | -0.7% ±6.9 | -0.2 | +7.6% / -9.9% | +14.2% (181) · -5.1% (94) · -1.2% (143) · -21.6% (104) · -29.6% (2) |
| Modelo de acuerdo con el mercado (±2) | 1440 | 58.2% | 59.9% | -6.8% ±4.2 | -3.2 | -7.0% / -6.7% | -9.9% (370) · -3.5% (300) · -6.4% (343) · -7.5% (415) · +13.8% (12) |
| Modelo le da −2 a la hembra | 1437 | 62.6% | 60.7% | -1.2% ±4.1 | -0.6 | +0.1% / -2.6% | +5.0% (225) · -2.0% (536) · -0.2% (369) · -6.3% (303) · +56.8% (4) |
| Hembra jugó ayer y el macho no | 654 | 65.3% | 62.0% | +0.9% ±5.9 | 0.3 | +3.2% / -1.1% | +0.5% (153) · +6.1% (148) · +7.3% (165) · -9.0% (184) · +19.0% (4) |

Regresión: gana = a + b·(mercado) + c·(modelo − mercado): b = 1.06 ± 0.21 · c = 0.09 ± 0.29 (c = 0: el modelo no agrega nada al precio de la hembra).
