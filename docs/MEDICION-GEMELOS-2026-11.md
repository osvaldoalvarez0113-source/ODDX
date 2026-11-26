# Gemelos del juego (25-nov-2026)

Idea de Osvaldo: para cada juego de hoy, buscar en el archivo los juegos más parecidos y ver cómo terminaron.

`python3 scripts/medicion/gemelos.py [K]` (mismos datos que `sorpresas.py`). Parecido = mismo precio de cierre (pesa más),
local o visita, back-to-back de cada lado, racha de cada uno y diferencia en los últimos 10. Se buscan los gemelos en el archivo
**antes de 2024** y se prueba en **2024 en adelante**. Se mide si lo que ganaron los gemelos **contra lo que decía su precio**
anticipa lo que pasa en el juego nuevo (aciertos y Brier).

## Resultado: no pasa, no entra a la app

| Deporte | Juegos de prueba | Brier del precio | Precio + gemelos (50) | Correlación (50 / 200 / 20 gemelos) |
|---|---|---|---|---|
| NBA | 2,208 | 0.1927 | 0.1966 (peor) | +0.01 / +0.00 / +0.01 |
| NHL | 2,625 | 0.2362 | 0.2424 (peor) | −0.00 / +0.01 / −0.00 |
| NFL | 644 | 0.2060 | 0.2144 (peor) | −0.07 / −0.08 / −0.05 |

- Con 20, 50 o 200 gemelos, y aunque se les dé solo la mitad del peso, **empeoran** al precio en los tres deportes.
- Cuando los gemelos «ganaron más de lo esperado», el favorito del juego nuevo gana lo mismo que dice su precio (NBA, NHL)
  o hasta menos (NFL). Es ruido: el precio de cierre ya resume esos casos.
- Mostrarlos en la app sería peligroso: un «ganó 38 de 50» cuando el precio decía 33 parece una ventaja y no lo es.
  Por eso **no se pusieron** en el Veredicto ni en el resumen.
