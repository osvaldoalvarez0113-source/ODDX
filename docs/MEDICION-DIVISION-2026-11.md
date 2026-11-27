# Juegos de división (27-nov-2026)

Mejora diaria. Idea clásica de la literatura de la NFL: entre rivales de la misma división (se ven dos veces al año) el no favorito
gana más de lo que dice su precio. Se probó en NFL, NHL y NBA contra el precio de cierre, en aciertos.

`python3 scripts/medicion/division.py`. **Regla fijada antes de correr:** |z| ≥ 2 con Holm sobre los 3 deportes y las dos mitades
hacia el mismo lado con 1+ punto.

## Veredicto: no pasa en ningún deporte

- NFL: el no favorito de división gana 32.5% y su precio decía 32.7% (711 juegos). Cero efecto: el mercado ya lo ve.
- NHL y NBA: si acaso va al revés (el no favorito gana un poco menos), pero sin fuerza (z −0.8 y −1.4) ni igual en las dos mitades.

## Tablas


## NFL — 711 juegos de división de 1974 (equipos sin división en el mapa: ninguno)
| | Juegos | El no favorito gana | Su precio decía | Diferencia | z |
|---|---|---|---|---|---|
| De división | 711 | 32.5% | 32.7% | -0.2 pts | -0.13 |
| Mitad A (antes de 2023) | 378 | 31.2% | 32.2% | -1.0 pts | -0.43 |
| Mitad B | 333 | 33.9% | 33.3% | +0.7 pts | +0.26 |
| Fuera de la división | 1263 | 32.1% | 33.6% | -1.5 pts | -1.18 |

## NHL — 1751 juegos de división de 5549 (equipos sin división en el mapa: HUG, MAC, MAT, MCD)
| | Juegos | El no favorito gana | Su precio decía | Diferencia | z |
|---|---|---|---|---|---|
| De división | 1751 | 38.8% | 39.8% | -0.9 pts | -0.81 |
| Mitad A (antes de 2024) | 826 | 36.6% | 38.8% | -2.2 pts | -1.31 |
| Mitad B | 925 | 40.9% | 40.7% | +0.2 pts | +0.12 |
| Fuera de la división | 3798 | 40.4% | 40.4% | +0.0 pts | +0.02 |

## NBA — 1088 juegos de división de 5755 (equipos sin división en el mapa: ninguno)
| | Juegos | El no favorito gana | Su precio decía | Diferencia | z |
|---|---|---|---|---|---|
| De división | 1088 | 30.1% | 32.0% | -2.0 pts | -1.44 |
| Mitad A (antes de 2024) | 654 | 30.1% | 32.8% | -2.7 pts | -1.49 |
| Mitad B | 434 | 30.0% | 30.9% | -0.9 pts | -0.44 |
| Fuera de la división | 4667 | 31.8% | 31.9% | -0.1 pts | -0.16 |

## Veredicto (Holm sobre 3 deportes)

- NBA: diferencia -2.0 pts, p = 0.150 (umbral 0.017) → no pasa
- NHL: diferencia -0.9 pts, p = 0.419 (umbral 0.025) → no pasa
- NFL: diferencia -0.2 pts, p = 0.894 (umbral 0.050) → no pasa
