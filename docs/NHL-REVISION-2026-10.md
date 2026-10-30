# NHL · revisión de resultados (30 oct 2026)

Osvaldo reportó resultados negativos con los pronósticos de la app de NHL. Revisión con los datos de `datos-nhl.json` (líneas de cierre de DraftKings vía ESPN, 1 unidad por apuesta al precio real).

## Lo que hace hoy la app
- El «Pronóstico» del Veredicto es el **favorito del mercado** (Pinnacle o ESPN sin margen) si pasa de 55%. El modelo pesa solo 5% porque nunca le ganó al mercado (ver `MEDICION-NHL-NFL-2026-10.md`).
- O sea: el pronóstico dice quién es más probable que gane, no dónde hay valor.

## Reglas simples medidas
| Regla | 2025 (1,312 juegos) | 2026 hasta hoy (171) |
|---|---|---|
| Pronóstico de la app (favorito ≥55%) | −8.7% ± 7 (846 apuestas) | +2.8% ± 19 (113) |
| Favorito 55–62% | −8.9% | −2.5% |
| Favorito 62–70% | −10.7% | +4.1% |
| Favorito −1.5 | −15.4% | +1.4% |
| Perro +1.5 | +1.5% | −8.2% |
| Más (Over) | −6.7% | −8.4% |
| Menos (Under) | −2.0% | −0.1% |

2026 tiene muy pocos juegos: cualquier cosa entre −19% y +19% es azar.

## Totales por temporada (modelo con PDEF)
| Regla | 2022 | 2023 | 2024 | 2025 | Total |
|---|---|---|---|---|---|
| Más 6.5 siempre | −6.1% | −11.0% | −17.4% | −8.3% | −10.0% ± 4 (2,866) |
| Menos si modelo ≤ línea − 0.5 | +23.4% | +7.7% | +13.1% | −4.9% | +9.4% ± 10 (364) |
| Menos si modelo ≤ línea − 0.25 | −1.7% | +1.3% | +7.6% | −0.3% | +2.1% ± 5 (1,406) |
| Más si modelo ≥ línea + 0.25 | −9.6% | −6.2% | −8.8% | −5.1% | −7.4% ± 5 (1,327) |

Ojo: PDEF se eligió con estos mismos años, así que la señal Menos está algo inflada. Se muestra como «en prueba», no como pick.

## Cambio en la app
`usdeporte.js` → `guiaNhl()`: bloque «Qué apostar y qué no (medido)» en el Veredicto de NHL (no en vivo):
- El favorito no es un pick (−8.7% en 2025).
- 🧪 Señal en prueba: Menos cuando el modelo solo espera 0.5 goles o más por debajo de la línea.
- Evita Más de 6.5 y el favorito −1.5; con favorito de 65%+, evita el perro.

## Lo que falta para saber por qué pierde Osvaldo
Sus apuestas viven en el teléfono (localStorage), no en el repo. Hace falta ver qué apostó (ganador, −1.5, Más/Menos, combinadas), a qué precio y dónde (Kalshi cobra comisión y diferencial).
