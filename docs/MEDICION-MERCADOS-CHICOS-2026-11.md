# ¿Los mercados chicos de Kalshi se equivocan más? (9-nov-2026)

`scripts/medicion/mercados_chicos.js` (workflow *Medir mercados chicos de Kalshi*, el 5 de cada mes). No usa modelo:
precio de la última vela de 1 hora antes de la hora de inicio, comprar SÍ al «ask» o NO a 1 − «bid», con comisión.
Si un mercado se equivoca, algún tramo de precio gana de forma repetida. El detalle completo está en la rama `resultados-chicos`.

| Mercado | Mercados | Compra-venta | Mejor tramo | ROI | z | ¿En las dos mitades? |
|---|---|---|---|---|---|---|
| Tenis Challenger ATP | 728 | 1¢ | SÍ 75-90¢ | +4.6% | 1.1 | sí |
| NFL recepciones (jugador) | 389 | 6¢ | NO 10-25¢ | +7.3% | 2.7 | sí |
| NFL yardas por tierra | 633 | 10¢ | — | todo negativo | | |
| NBA rebotes / puntos | 133 / 137 | 33¢ / 12¢ | — | todo negativo | | |
| ATP / WTA (grandes) | 994 / 1,026 | 1¢ | — | nada distinto de cero | | |
| ITF, NHL goleador, basket universitario | < 100 | | | muy pocos con precio | | |

- **Nada pasa la prueba** (hace falta z ≥ 3.3 con 168 pruebas). Los mercados chicos de Kalshi tampoco regalan.
- **Props:** el punto medio dice el doble de lo que pasa (NFL recepciones 25-45¢: dice 34%, pasó 16%). Pero la diferencia
  compra-venta es enorme (6-33¢), así que comprar el NO cuesta casi lo justo. La ventaja existe en papel; al precio de verdad, no.
- **A vigilar:** NFL recepciones, comprar NO a 10-25¢. Ganó en las dos mitades, pero es una sola semana: puede ser suerte.
  La medición mensual dirá si se repite.
- **Límite:** Kalshi da precios de antes de empezar solo de las últimas semanas en estas series. Con más meses, más datos.
