# Medición de la app de tenis (noviembre 2026)

Datos: ESPN, individuales ATP y WTA del 1-ene-2023 al 7-nov-2026 (38,412 partidos; sin Challengers ni ITF).
Cada partido de 2024 en adelante se predijo **solo con lo que había antes de jugarse**. 2023 sirvió para arrancar los ratings.
Los parámetros se eligieron con 2024-2025 y se comprobaron en 2026, que el modelo no vio al elegirlos.
Lo repite cada día `scripts/tenis_datos.js` (workflow *Tenis*); los números al día viven en `ratings-tenis.json` → `medicion`.

## Ganador del partido

| | ATP | WTA |
|---|---|---|
| Partidos medidos | 11,415 | 16,827 |
| Acierta el ganador | 63.3% | 64.0% |
| Solo 2026 (prueba) | 63.9% | 64.2% |
| Cuadro principal / clasificación | 65.2% / 59.3% | 64.7% / 62.4% |
| Mismos partidos: modelo vs «gana el de mejor ranking» | 66.6% vs 64.2% | 62.1% vs 60.3% |

Por tramo de probabilidad (ATP · WTA, el favorito ganó):

| El modelo dice | ATP | WTA |
|---|---|---|
| 50–55% | 51.1% | 51.2% |
| 60–65% | 61.2% | 62.7% |
| 70–75% | 69.4% | 71.1% |
| 75–80% | 75.2% | 78.8% |
| 80–85% | 78.0% | 83.7% |
| 85–90% | 88.2% | 87.4% |
| 90%+ | 93.0% | 91.9% |

Está bien calibrado. Por eso la app muestra junto a cada pick lo que ganó de verdad el favorito en su tramo.

Qué se probó (pérdida log en 2024-2025; gana la más baja):
- Peso de la superficie 0 / 25 / 50 / 75 / 100% → **25%** en los dos circuitos.
- Prior por ranking para jugadores nuevos → **sí** (ayuda un poco).
- K del Elo ×0.8 / ×1 / ×1.25 → **×0.8**.
- Grand Slam a 5 sets: subirle el % al favorito con Markov no mejoró (0.5552 vs 0.5550 en 1,534 partidos) → **no se usa**.

## Sets y games

El Markov punto a punto (todos sacan igual) daba menos 2-0 de los reales (28% vs 34% en el tramo 50-60%)
y su total de games acertaba **menos que una moneda** (46-49%). Se cambió por tablas de lo que pasó de verdad:
para cada circuito, superficie y tramo de probabilidad del favorito, cuántos 2-0, 2-1, primer set, total y diferencia de games.

Prueba en 2026 (dura), eligiendo el lado más probable:

| Mercado | ATP | WTA | Elegir siempre lo más común |
|---|---|---|---|
| Favorito gana sin perder set | 60.0% | 59.9% | 57.3% / 55.2% |
| Favorito −3.5 games | 59.8% | 58.5% | 56.6% / 48.3% |
| Total de games | 52.8% | 51.2% | 52.3% / 53.4% |

- **Ganador, 2-0 y hándicap de games: sirven.**
- **Total de games: no le gana a apostar siempre lo más común.** ESPN no da puntos de saque, así que el modelo no sabe quién es gran sacador. La app lo muestra solo como referencia y lo dice.

## Lo que falta

- Cuotas: ESPN no trae líneas de tenis, así que no hay comparación contra el mercado. Lo que se mide son aciertos.
- Retiros: 342 ATP y 515 WTA en la medición (~3%). No cuentan; cada casa los paga distinto.
- Jugadores de Challenger que entran al cuadro: tienen pocos partidos en la base. La app avisa «con cuidado».
