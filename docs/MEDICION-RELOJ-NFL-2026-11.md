# El reloj del cuerpo en la NFL (27-nov-2026)

Mejora diaria. Idea clásica de los estudios de ritmo circadiano: un equipo de la costa oeste (SEA, SF, LAR, LAC, LV/OAK) que juega de
visita en la costa este a la 1 p. m. (10 a. m. en su cuerpo) rinde menos. ¿Gana menos de lo que dice su precio de cierre?

`python3 scripts/medicion/reloj_nfl.py`. **Regla fijada antes de correr:** |z| ≥ 2 y las dos mitades (antes de 2023 / desde 2023)
hacia el mismo lado con 1+ punto.

## Resultado: pasa la regla, pero AL REVÉS de la idea, y con muy pocos juegos. En vigilancia, no entra

- El equipo del oeste a la 1 p. m. del este ganó **64.5%** cuando su precio decía **54.7%** (+9.7 puntos, z +2.18, 107 juegos).
  Va igual en las dos mitades (+12.1 y +7.7). En partidos de tarde o noche no pasa nada (51.5% contra 51.8%).
- Es lo contrario de lo que dice la literatura (que rinden menos). Lo más probable es que el mercado **castigue de más** ese viaje
  desde que se publicaron esos estudios… o que sea casualidad: 107 juegos es muy poco, z 2.18 es apenas sobre el borde, y esta
  semana se probaron más de 10 ideas (con tantas pruebas, una que pase por suerte es normal).
- **No se aplica a la app.** Queda en vigilancia: revisar al final de la temporada 2026 (enero) solo con los juegos nuevos. Si vuelve
  a dar lo mismo con juegos que no se usaron aquí, entonces se propone como señal.

## Tablas

## Equipo del oeste de visita en el este (140 juegos con precio de cierre)

| | Juegos | El del oeste gana | Su precio decía | Diferencia | z |
|---|---|---|---|---|---|
| A la 1 p. m. del este (10 a. m. en su cuerpo) | 107 | 64.5% | 54.7% | +9.7 pts | +2.18 |
| Mitad A (antes de 2023) | 50 | 70.0% | 57.9% | +12.1 pts | +1.84 |
| Mitad B | 57 | 59.6% | 52.0% | +7.7 pts | +1.26 |
| De tarde o de noche (comparación) | 33 | 51.5% | 51.8% | -0.3 pts | -0.03 |

**PASA**
