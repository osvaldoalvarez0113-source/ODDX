# Sorpresas: ¿cuándo pierde el favorito más de lo que dice su precio? (25-nov-2026)

Idea de Osvaldo: en vez de mirar solo quién gana, mirar al que «no debería» ganar y buscar cuándo tiene chance real de dar la sorpresa, y por qué.
Se mide en **aciertos**: cuántas veces ganó el no favorito contra lo que decía su precio de cierre (sin margen).

`python3 scripts/medicion/sorpresas.py nba-box.json.gz filas_nba.json datos-nhl.json datos-nfl.json`
(ramas `datos-nba-box`, `resultados-nba-6t`, `datos-nhl-nfl`). Solo temporada regular, solo con lo que se sabía antes del juego.
A = antes de 2024, B = 2024 en adelante. **Regla fijada antes de correr:** pasa si |z| ≥ 2.5 con todo junto y en A y en B va hacia el
mismo lado con al menos 1 punto. Además Holm sobre las 52 pruebas.

## Veredicto

- **Ninguna situación hace que el no favorito gane más de lo que dice su precio**, en ningún deporte. El mercado ya ve descanso, giras,
  rachas, palizas, cruces previos y el modelo de la app.
- **Lo único que pasa es al revés: en NBA, cuando el no favorito viene 2+ victorias mejor en los últimos 10, gana MENOS**:
  30.7% contra 38.2% de su precio (501 juegos, z −3.5, pasa Holm; A −8.2 / B −6.1; las 5 temporadas van igual: −9.2, −8.5, −6.4, −7.8, −3.6).
  Crece con la diferencia (1+: −3.4 · 2+: −7.5 · 3+: −10.6) y aguanta por tramo de precio y de local o visita. La racha engaña: el favorito es más seguro.
- NHL, «rival jugó ayer y el favorito no»: el no favorito gana 32.7% contra 37.3% (z −2.6, A y B igual) pero no pasa Holm. Ya lo usa el modelo (R = 0.25) y
  coincide con `MEDICION-HEMBRAS-NHL-2026-11.md`.
- Temporada 2026-27 (fuera de muestra, `cierres-nba.json`): solo 3 juegos cumplen todavía; no dice nada. Hay que mirarlo otra vez en enero.

## Qué cambió en la app

- `forma.js`, Veredicto de NBA: si el no favorito viene 2+ victorias mejor en los últimos 10, sale **«📊 La racha engaña»** con el número medido
  en vez de «⚠️ El no favorito llega mejor». No cambia el %.
- El aviso «El no favorito llega mejor» (NHL, NFL, fútbol, tenis y NBA sin la señal) ya no dice «miras al no favorito con mejor pago»:
  medido, la racha del no favorito no le sube sus chances en ningún deporte.

## Tablas


## NBA — 5492 juegos con precio de cierre (A 3283, B 2209). El favorito ganó 69.5%, el precio decía 68.9%
| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|
| Favorito jugó ayer y el rival no | 528 | 35.2% | 32.9% | +2.4 pts | +1.2 | +1.8 / +3.2 | no |
| Rival jugó ayer y el favorito no | 858 | 28.7% | 29.4% | -0.7 pts | -0.5 | -1.1 / -0.0 | no |
| Favorito: 3er juego en 4 noches | 1302 | 31.2% | 31.3% | -0.1 pts | -0.1 | +0.4 / -0.7 | no |
| Rival descansó 2+ días más | 123 | 37.4% | 32.0% | +5.4 pts | +1.3 | +3.9 / +8.0 | no |
| Favorito de visita, 4º juego o más de gira | 288 | 28.1% | 32.4% | -4.3 pts | -1.6 | -5.8 / -2.1 | no |
| Favorito en casa (no favorito de visita) | 3400 | 29.6% | 29.9% | -0.4 pts | -0.5 | +0.1 / -1.2 | no |
| Favorito de visita | 2092 | 32.1% | 33.1% | -1.0 pts | -1.0 | -1.2 / -0.6 | no |
| Favorito viene de 5+ victorias seguidas | 508 | 30.1% | 28.7% | +1.4 pts | +0.7 | +1.6 / +1.1 | no |
| Rival viene de 5+ derrotas seguidas | 651 | 23.5% | 24.9% | -1.4 pts | -0.9 | -0.5 / -2.6 | no |
| Rival viene de 3+ victorias seguidas | 496 | 34.3% | 35.1% | -0.8 pts | -0.4 | -0.6 / -1.0 | no |
| Favorito viene de perder | 2218 | 31.1% | 32.2% | -1.1 pts | -1.1 | -0.7 / -1.7 | no |
| Favorito viene de ganar por paliza | 735 | 26.3% | 28.9% | -2.7 pts | -1.6 | -1.5 / -4.0 | no |
| Rival viene de perder por paliza | 732 | 28.1% | 27.4% | +0.8 pts | +0.5 | +2.4 / -1.3 | no |
| Rival ganó el último cruce entre los dos | 1328 | 33.2% | 33.6% | -0.4 pts | -0.3 | -1.8 / +1.8 | no |
| Rival viene mejor en los últimos 10 (2+ victorias más) | 501 | 30.7% | 38.2% | -7.5 pts | -3.5 | -8.2 / -6.1 | SÍ |
| Inicio de temporada (favorito con menos de 8 juegos) | 207 | 32.4% | 32.6% | -0.2 pts | -0.1 | -1.5 / +1.8 | no |
| Favorito grande (75%+) | 1664 | 17.1% | 17.4% | -0.3 pts | -0.3 | -0.4 / -0.3 | no |
| Favorito corto (52-58%) | 1105 | 44.9% | 45.0% | -0.1 pts | -0.1 | -0.2 / +0.1 | no |
| Modelo de la app le ve 4+ puntos MENOS al favorito | 1040 | 29.2% | 30.0% | -0.8 pts | -0.6 | -1.6 / +0.4 | no |
| Modelo de la app le ve 4+ puntos MÁS al favorito | 289 | 33.9% | 31.2% | +2.8 pts | +1.0 | +1.9 / +3.7 | no |

## NHL — 5003 juegos con precio de cierre (A 2378, B 2625). El favorito ganó 61.0%, el precio decía 60.8%
| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|
| Favorito jugó ayer y el rival no | 329 | 44.7% | 40.7% | +4.0 pts | +1.5 | +1.9 / +6.1 | no |
| Rival jugó ayer y el favorito no | 715 | 32.7% | 37.3% | -4.6 pts | -2.6 | -5.3 / -4.1 | SÍ |
| Favorito: 3er juego en 4 noches | 835 | 40.6% | 39.6% | +1.0 pts | +0.6 | -2.3 / +3.8 | no |
| Rival descansó 2+ días más | 140 | 35.7% | 39.4% | -3.7 pts | -0.9 | -6.1 / -0.9 | no |
| Favorito de visita, 4º juego o más de gira | 239 | 44.4% | 41.2% | +3.1 pts | +1.0 | +3.5 / +2.9 | no |
| Favorito en casa (no favorito de visita) | 3164 | 38.0% | 38.4% | -0.4 pts | -0.5 | -0.6 / -0.3 | no |
| Favorito de visita | 1839 | 40.7% | 40.7% | -0.0 pts | -0.0 | -1.9 / +1.8 | no |
| Favorito viene de 5+ victorias seguidas | 262 | 36.3% | 37.3% | -1.1 pts | -0.4 | +0.9 / -3.4 | no |
| Rival viene de 5+ derrotas seguidas | 319 | 35.7% | 36.0% | -0.3 pts | -0.1 | -3.8 / +3.8 | no |
| Rival viene de 3+ victorias seguidas | 441 | 37.9% | 41.1% | -3.2 pts | -1.4 | -2.9 / -3.4 | no |
| Favorito viene de perder | 2168 | 39.6% | 39.6% | +0.1 pts | +0.1 | -1.5 / +1.4 | no |
| Favorito viene de ganar por paliza | 1186 | 40.6% | 38.8% | +1.9 pts | +1.3 | +4.4 / -0.6 | no |
| Rival viene de perder por paliza | 1211 | 38.4% | 38.2% | +0.2 pts | +0.2 | -2.1 / +2.5 | no |
| Rival ganó el último cruce entre los dos | 1235 | 38.3% | 40.1% | -1.8 pts | -1.3 | -3.9 / +0.3 | no |
| Rival viene mejor en los últimos 10 (2+ victorias más) | 539 | 40.3% | 42.4% | -2.1 pts | -1.0 | -7.1 / +1.8 | no |
| Inicio de temporada (favorito con menos de 8 juegos) | 570 | 37.5% | 39.6% | -2.0 pts | -1.0 | -0.4 / -3.2 | no |
| Favorito grande (75%+) | 177 | 16.9% | 22.6% | -5.7 pts | -1.8 | -4.0 / -10.1 | no |
| Favorito corto (52-58%) | 2091 | 44.0% | 45.1% | -1.1 pts | -1.0 | -3.0 / +0.3 | no |

## NFL — 1891 juegos con precio de cierre (A 1247, B 644). El favorito ganó 68.7%, el precio decía 67.4%
| Situación | Juegos | Rival (no favorito) gana | Su precio decía | Diferencia | z | A / B | ¿Pasa? |
|---|---|---|---|---|---|---|---|
| Rival viene de semana libre y el favorito no | 83 | 33.7% | 32.0% | +1.7 pts | +0.3 | +4.4 / -4.0 | no |
| Favorito jugó jueves (semana corta) | 129 | 33.3% | 32.8% | +0.5 pts | +0.1 | -3.4 / +7.1 | no |
| Favorito en casa (no favorito de visita) | 1128 | 31.4% | 31.4% | -0.1 pts | -0.0 | -0.1 / +0.0 | no |
| Favorito de visita | 763 | 31.1% | 34.3% | -3.2 pts | -1.9 | -2.4 / -4.9 | no |
| Favorito viene de 5+ victorias seguidas | 122 | 25.4% | 27.4% | -1.9 pts | -0.5 | +1.7 / -7.7 | no |
| Rival viene de 5+ derrotas seguidas | 153 | 25.5% | 25.9% | -0.4 pts | -0.1 | -2.0 / +2.2 | no |
| Rival viene de 3+ victorias seguidas | 153 | 36.6% | 37.3% | -0.7 pts | -0.2 | +0.5 / -2.8 | no |
| Favorito viene de perder | 722 | 33.2% | 33.9% | -0.6 pts | -0.4 | -0.7 / -0.3 | no |
| Favorito viene de ganar por paliza | 302 | 29.8% | 30.1% | -0.3 pts | -0.1 | +0.4 / -1.7 | no |
| Rival viene de perder por paliza | 331 | 29.3% | 29.6% | -0.3 pts | -0.1 | +0.6 / -1.6 | no |
| Rival ganó el último cruce entre los dos | 111 | 32.4% | 34.0% | -1.6 pts | -0.4 | -1.9 / -1.0 | no |
| Inicio de temporada (favorito con menos de 8 juegos) | 472 | 32.0% | 33.2% | -1.3 pts | -0.6 | -2.3 / +0.5 | no |
| Favorito grande (75%+) | 457 | 16.6% | 18.0% | -1.4 pts | -0.8 | -3.3 / +3.1 | no |
| Favorito corto (52-58%) | 406 | 42.9% | 44.7% | -1.9 pts | -0.8 | -2.6 / -0.5 | no |

Holm sobre 52 pruebas:
- NBA · Rival viene mejor en los últimos 10 (2+ victorias más): p = 0.0005, umbral Holm 0.0010 → pasa
- NHL · Rival jugó ayer y el favorito no: p = 0.0101, umbral Holm 0.0010 → no pasa
- NFL · Favorito de visita: p = 0.0551, umbral Holm 0.0010 → no pasa
- NHL · Favorito grande (75%+): p = 0.0717, umbral Holm 0.0010 → no pasa
- NBA · Favorito viene de ganar por paliza: p = 0.0997, umbral Holm 0.0010 → no pasa
- NBA · Favorito de visita, 4º juego o más de gira: p = 0.1099, umbral Holm 0.0011 → no pasa
