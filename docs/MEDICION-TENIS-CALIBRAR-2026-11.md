# Tenis: corregir el % de Kalshi por el sesgo favorito-perro (27-nov-2026)

Mejora diaria (segunda corrida del día). Pista: `MEDICION-TENIS-BATERIA-2026-11.md`. Ahí el favorito de Kalshi de 80-90% ganó 86.5%
contra 84.4%, y el de 90%+ ganó 95.9% contra 93.4%. Es el sesgo favorito-perro de la literatura. En NBA, NHL, NFL y MLB ya se probó
corregirlo y no pasó (`MEDICION-RECALIBRAR-2026-11.md`); faltaba el tenis, donde la app usa el precio de Kalshi con 5% de modelo.

`python3 scripts/medicion/tenis_calibrar.py filas_tenis_kalshi.json` (rama `resultados-tenis`, guardada el 8-nov-2026):
7,483 partidos ATP y WTA con la última vela de 1 hora antes de empezar. El % del mercado es el medio entre compra y venta.

## Regla fijada antes de correr

- Corrección: p' = sigmoide(a + b·logit(p)), vista desde el favorito del mercado. Dos pruebas: **una curva** para los dos circuitos, y
  **una curva por circuito** (ATP y WTA aparte).
- Ajusta en 2025 y prueba en 2026, y al revés. Pasa si baja la pérdida log con t ≥ 2 en las dos direcciones, Holm < 5% con las dos
  juntas, la pendiente b sale del mismo lado de 1 en las dos mitades y no pierde aciertos.

## Veredicto: no pasa. No entra

| Prueba | Ajusta 2025 → prueba 2026 | Ajusta 2026 → prueba 2025 | Juntas | Aciertos (precio → corregido) |
|---|---|---|---|---|
| Una curva | −0.15 milésimas (t −1.49) | −0.93 (t −0.86) | −0.29 (t −1.38) | 5,173 → 5,175 de 7,483 |
| Una curva por circuito | −0.54 (t −2.19) | −1.17 (t −0.98) | −0.65 (t −2.21) | 5,173 → 5,172 |

- **La corrección empeora el % fuera de muestra**: las dos pruebas salen negativas en las dos direcciones. La curva por circuito
  empeora con t −2.2.
- **La pendiente cambia de una mitad a la otra.** En la WTA sale b = 0.92 con 2025 y 1.23 con 2026: en 2025 los favoritos ganaron
  *menos* que su precio y en 2026 *más*. Es ruido, igual que en los otros deportes.
- **Los aciertos no se mueven** (±2 de 7,483): la corrección no cambia a quién se escoge.
- **Revisión extra** (no decide): 2025 trae solo 1,349 partidos (Kalshi empezó en abril) contra 6,134 en 2026. Con dos mitades
  iguales por fecha (corte 5-may-2026, ~3,740 cada una): +0.23 milésimas (t 0.43) en las dos direcciones con una curva, y la
  curva por circuito pierde 10 aciertos. Cero.
- **Conclusión:** el sesgo se ve con todo junto (b = 1.12; en 90%+ ganó 95.9% contra 93.4%), pero no se puede aprovechar
  porque no se repite de un periodo al otro. El precio de Kalshi se queda como está. La tabla de franjas sirve para *mostrar*
  cuánto gana cada tramo, no para corregir el %.

## Tablas

Con todo junto: a = -0.055, b = 1.124. Por franja (precio decía → corregido → pasó):

| Franja | Partidos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 2132 | 55.4% | 54.7% | 54.2% |
| 60-70% | 2257 | 64.6% | 65.1% | 66.6% |
| 70-80% | 1649 | 74.6% | 76.0% | 74.2% |
| 80-90% | 1006 | 84.4% | 86.2% | 86.5% |
| 90-100% | 439 | 93.4% | 94.8% | 95.9% |

ATP (3779 partidos): a = -0.028, b = 1.070

| Franja | Partidos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 1082 | 55.6% | 55.2% | 54.4% |
| 60-70% | 1201 | 64.7% | 65.0% | 67.4% |
| 70-80% | 824 | 74.5% | 75.4% | 72.8% |
| 80-90% | 475 | 84.2% | 85.3% | 85.3% |
| 90-100% | 197 | 93.6% | 94.4% | 94.9% |

WTA (3704 partidos): a = -0.080, b = 1.174

| Franja | Partidos | Precio decía | Corregido | Pasó |
|---|---|---|---|---|
| 50-60% | 1050 | 55.2% | 54.2% | 53.9% |
| 60-70% | 1056 | 64.6% | 65.2% | 65.8% |
| 70-80% | 825 | 74.7% | 76.7% | 75.5% |
| 80-90% | 531 | 84.6% | 87.1% | 87.6% |
| 90-100% | 242 | 93.2% | 95.2% | 96.7% |
