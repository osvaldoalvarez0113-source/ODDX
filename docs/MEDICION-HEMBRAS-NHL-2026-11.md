# Hembras (no favoritos) en NHL: ¿hay señal para separar la viva de la muerta? (15-nov-2026)

`node scripts/medicion/hembras.js datos-nhl.json`. Temporada regular 2022 a hoy, moneyline de cierre de ESPN BET / DraftKings,
modelo walk-forward (igual que `correr_nhl_nfl.js`). Hembra = menos de 50% en el mercado sin margen. A = 2022-2023, B = 2024-2026.
Regla fijada antes de correr: una señal pasa solo si rinde > 0 con z ≥ 2 y es positiva en las dos mitades.

**Veredicto: ninguna de las 24 reglas pasa.** Y cuando el modelo le ve más chance a la hembra que el mercado, la hembra gana *menos*
de lo que dice su precio (regresión c = −0.32 ± 0.31): el modelo no sirve para escoger hembras.

- **Lo único que se repite en las dos mitades es una señal de NO jugar**: hembra que jugó ayer contra favorito descansado
  (654 juegos, gana 34.7% contra 38.0% del precio, −13.3% ±9.6; A −17.0%, B −10.1%).
- El «macho cuando el modelo se enamora de la hembra» (+6 pts) dio +4.7% ±5.5, pero todo viene de 2022-2023 (+14%, +10%) y
  en 2024-2025 fue 0%: no pasa. Hipótesis nacida de esta corrida; no se usa.
- +1.5 de la hembra: pega 61.8% en general y ~66% en las cortas, pero rinde −2% a −7% (el margen). Sirve para acertar más, no para ganar más.

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
| Modelo +2 pts o más | 2104 | 37.5% | 39.1% | -8.0% ±5.3 | -13.0% / -4.0% | no | 60.5% | -4.7% ±3.5 | -9.0% / -1.4% | no |
| Modelo +4 pts o más | 1350 | 36.7% | 39.0% | -9.5% ±6.6 | -17.8% / -3.5% | no | 59.5% | -6.2% ±4.3 | -10.7% / -3.1% | no |
| Modelo +6 pts o más | 752 | 33.6% | 39.1% | -18.6% ±8.5 | -31.7% / -10.4% | no | 57.4% | -10.5% ±5.8 | -17.0% / -6.5% | no |
| Modelo la tiene en 50% o más | 580 | 43.4% | 46.0% | -8.9% ±8.7 | -11.9% / -6.8% | no | 64.5% | -8.3% ±5.8 | -10.3% / -7.0% | no |
| Modelo le ve MENOS (−2 pts) | 944 | 42.1% | 41.3% | -2.7% ±7.6 | -8.8% / +5.2% | no | 64.0% | -2.0% ±4.9 | -1.4% / -2.6% | no |

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
| Corta (42%+) y modelo +2 | 844 | 41.9% | 45.5% | -11.4% ±7.2 | -13.3% / -9.9% | no | 64.5% | -7.9% ±4.8 | -11.6% / -5.1% | no |
| Corta y viene mejor | 271 | 40.2% | 46.0% | -16.1% ±12.5 | -28.2% / -5.9% | no | 63.9% | -9.3% ±8.4 | -10.1% / -8.6% | no |
| Corta, modelo +2 y viene mejor | 136 | 34.6% | 45.9% | -27.8% ±17.1 | -34.2% / -14.9% | no | 60.6% | -13.8% ±12.2 | -16.1% / -9.2% | no |
| Corta, en casa y modelo +2 | 403 | 42.7% | 45.6% | -10.4% ±10.4 | -7.4% / -11.9% | no | 62.1% | -11.5% ±7.1 | -19.7% / -7.5% | no |
| Modelo +2 y dinero entró a la hembra | 86 | 43.0% | 43.2% | -3.4% ±24.6 | -9.4% / -1.0% | no | 61.2% | -8.2% ±16.1 | -25.4% / -1.1% | no |

## Al revés: jugar el MACHO cuando el modelo se enamora de la hembra
| Regla | Juegos | Macho gana | Mercado decía | Rinde | z | A / B | Por temporada |
|---|---|---|---|---|---|---|---|
| Todos los machos | 4498 | 60.3% | 60.1% | -3.7% ±2.4 | -3.2 | -1.8% / -5.6% | -1.8% (1111) · -1.9% (1118) · -3.0% (1120) · -8.4% (1113) · -0.4% (36) |
| Modelo le da +2 a la hembra | 2104 | 62.5% | 60.9% | -1.3% ±3.4 | -0.8 | +1.9% / -3.9% | +1.1% (516) · +2.9% (415) · -2.7% (606) · -5.9% (541) · +11.7% (26) |
| Modelo le da +4 a la hembra | 1350 | 63.3% | 61.0% | -0.2% ±4.2 | -0.1 | +5.0% / -4.0% | +3.6% (331) · +7.0% (234) · -2.1% (393) · -6.0% (376) · -1.0% (16) |
| Modelo le da +6 a la hembra | 752 | 66.4% | 60.9% | +4.7% ±5.5 | 1.7 | +12.8% / -0.5% | +14.2% (181) · +10.5% (109) · -0.5% (223) · -0.0% (232) · -14.8% (7) |
| Modelo de acuerdo con el mercado (±2) | 1450 | 58.8% | 60.0% | -6.1% ±4.2 | -2.9 | -7.1% / -5.0% | -9.9% (370) · -4.4% (397) · -0.9% (366) · -8.9% (309) · -35.8% (8) |
| Modelo le da −2 a la hembra | 944 | 57.9% | 58.7% | -5.5% ±5.3 | -2.1 | -0.8% / -11.6% | +5.0% (225) · -5.0% (306) · -8.9% (148) · -13.0% (263) · -16.2% (2) |
| Hembra jugó ayer y el macho no | 654 | 65.3% | 62.0% | +0.9% ±5.9 | 0.3 | +3.2% / -1.1% | +0.5% (153) · +6.1% (148) · +7.3% (165) · -9.0% (184) · +19.0% (4) |

Regresión: gana = a + b·(mercado) + c·(modelo − mercado): b = 1.04 ± 0.21 · c = -0.32 ± 0.31 (c = 0: el modelo no agrega nada al precio de la hembra).
