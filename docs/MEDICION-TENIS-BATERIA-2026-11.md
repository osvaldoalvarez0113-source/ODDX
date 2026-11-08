# Tenis: la misma batería de pruebas que MLB, fútbol, NBA, NHL y NFL (noviembre 2026)

Medido el 8-nov-2026 con `scripts/medicion/tenis_mercado.js` (workflow *Medir tenis*, cada mes, rama `resultados-tenis`).
Base: 28,250 partidos ATP y WTA de 2024 a hoy, cada uno predicho solo con lo de antes. Mercado: Kalshi (KXATPMATCH y KXWTAMATCH),
7,506 partidos cruzados con ESPN (abr-2025 a nov-2026), precio de la última vela de 1 hora antes de empezar, ROI con comisión.

## 1) Huecos del modelo

Cada factor se agregó al modelo con una logística elegida en 2024-2025 y se probó en 2026 (9,831 partidos). Hace falta z > 2.8.

| Factor | Mejora ×1000 | z | Veredicto |
|---|---|---|---|
| Pocos partidos en la base | +10.6 | 8.6 | **ayuda** → entra |
| Caída desde su mejor Elo | +3.4 | 3.9 | **ayuda** → entra |
| Días de descanso | +2.2 | 2.8 | justo en el borde: no entra |
| Jugó ayer / partido largo antes | ≈0 | ≤1.2 | no se distingue |
| Cara a cara, forma últimos 10, vuelve tras 45 días | ≈0 | ≤1 | no se distingue |
| Más peso a la superficie | −0.1 | −2.1 | empeora (se queda en 25%) |

**Se aplicó** (`params[circuito].aj` en `ratings-tenis.json`, `ajustar()` en `modelo-tenis.js`). Acierto en 2026:
ATP 63.9% → **64.5%**, WTA 64.2% → **66.1%** (pérdida log −5.5 y −15.2 ×1000; z 2.9 y 8.5).

**Cansancio** (jugó en las últimas 30 h un partido de 30+ games): el favorito ganó 57.7% cuando el modelo decía 62.6% (982).
Con la logística no pasa la prueba, así que **solo se avisa** en el Veredicto, como el clima en la NFL.

## 2) Fórmula calibrada

logit(p) = a + b·logit(modelo): ATP b = 0.92, WTA b = 1.00. En 2026 no mejora (z 0.4 y −0.3). El modelo ya está bien inclinado.

## 3) Contra el mercado (Kalshi)

| | Partidos | Pérdida log modelo | Mercado | Acierto modelo | Mercado |
|---|---|---|---|---|---|
| Todos | 7,506 | 0.6133 | **0.5768** | 65.6% | **69.1%** |
| ATP | 3,790 | 0.6260 | 0.5864 | 64.3% | 68.5% |
| WTA | 3,716 | 0.6003 | 0.5671 | 67.0% | 69.7% |
| Clasificación | 2,315 | 0.6343 | 0.5679 | 62.9% | 69.6% |
| Alguno con pocos partidos | 788 | 0.6130 | 0.5051 | 66.2% | 74.7% |

**El mercado manda, igual que en los otros cinco deportes.** El mercado gana con z = 13.8, y el peso del modelo sobre el mercado (λ) sale **0**. Esta comparación se hizo con el modelo sin el ajuste del punto 1. El ajuste sube el acierto 1-2 puntos, todavía lejos del 69%.
Donde más pierde el modelo es en clasificación y con jugadores casi sin partidos: el mercado conoce Challengers e ITF y ESPN no.

**Se aplicó:** si hay precio de Kalshi, la app usa el mercado con 5% de modelo (`LAM_M = 0.05`, como en las otras apps). El historial del tramo sale de cuánto ganó el favorito de Kalshi. Sin precio, se usa el modelo con su propio historial.

Apostar donde el modelo ve más que el precio: −12% (5+ pts encima, 4,048) y −18.5% (12+ pts). Pierde en 2025 y en 2026.

## Picks ganadores

| Filtro | Partidos | Mercado dice | Ganó | ROI a precio de compra |
|---|---|---|---|---|
| Favorito del mercado 60%+ | 5,351 | 73.8% | 75.1% | −1.0% ±1.6 |
| 60%+ y el modelo de acuerdo | 4,907 | 74.3% | 75.3% | −1.4% ±1.7 |
| 60%+ y el modelo le da más | 1,413 | 70.9% | 71.5% | −2.0% ±3.4 |
| 60%+ y el modelo en contra | 444 | 67.5% | 72.3% | +3.7% ±6.2 (no se distingue de cero) |
| Favorito 80-90% / 90%+ | 1,006 / 439 | 84.4% / 93.4% | 86.5% / 95.9% | +0.6% ±2.5 / +1.5% ±2.0 |
| ⭐ El más seguro de cada día (por mercado) | 784 | 83.7% | 83.7% | −2.3% ±3.2 |
| ⭐ El más seguro de cada día (por modelo) | 784 | 80.2% | 80.0% | −2.9% ±3.6 |
| Perro que el modelo da ganador | 1,202 | 40.5% | 38.8% | −11.3% ±6.7 |

- Lo que dice el mercado se cumple. Por eso Picks ordena por el % de Kalshi cuando lo hay.
- Los favoritos grandes (80%+) son lo que más se acerca a cero, pero ningún filtro gana de forma comprobable.
- Que el modelo esté de acuerdo no agrega aciertos.

## Patrones

ROI del favorito del mercado por superficie, circuito, clasificación, Grand Slam, final/semi, jugó ayer, 30+ días sin jugar y pocos partidos: entre −3.8% y +0.3%.
Ninguno pasa de 2 veces su margen de error.
