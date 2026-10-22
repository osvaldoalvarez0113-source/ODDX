# Qué habría dicho la app en 2024-2026 y cuánto habría rendido (MLB, ganador)

Prueba hecha sin guardar un solo pick a mano: se tomó cada juego de tres temporadas, se calculó lo que el modelo de la app
decía **antes** del juego (con datos anteriores a esa fecha), se pasó por el `veredictoEV()` real de `index.html` con la
**cuota de cierre de DraftKings**, y se vio cuánto habría pagado cada titular. 6,171 juegos (2,027 de 2024, 2,067 de 2025, 2,077 de 2026).
Los datos son los de las ramas `var-S2024`, `var-S2025` y `var-S2026` (los escribe `scripts/correr_variantes.js`).

- **Fidelidad:** el simulador en Python y la función real de la app dieron el **mismo titular y el mismo lado en los 6,171 juegos** (0 diferencias).
  `scripts/medicion/picks_app.js` corre la función real; `scripts/medicion/analisis_picks.py` hace el resto de los cortes.
- **Precio:** el de cierre (el más difícil de ganar). 1 unidad plana por pick. «Esperado» = lo que rinde apostar si el mercado lo supiera todo (es negativo: la comisión de la casa).

## Resultado 1: ningún titular gana dinero de forma comprobable

| Titular (v67) | Juegos | Acierto | ROI | ± error | Esperado si el mercado sabe todo |
|---|---|---|---|---|---|
| Valor fuerte | 668 | 43.1% | -0.7% | 4.5 | -3.9% |
| Valor moderado | 115 | 41.7% | +1.0% | 11.6 | -2.4% |
| Valor dudoso | 1,761 | 47.0% | -0.2% | 2.6 | -4.2% |
| Margen mínimo | 1,309 | 47.3% | -2.9% | 2.9 | -4.1% |
| Sin apuesta | 1,586 | 50.2% | -3.6% | 2.5 | -4.2% |
| Precio imposible (EV > 20%) | 732 | 34.7% | **-8.9%** | 4.7 | -3.9% |

Todos los picks de «valor» juntos (fuerte + moderado + dudoso, 2,544): **ROI -0.3% ± 2.2**. Por temporada: -6.4% (2024), +3.8% (2025), +1.2% (2026).
Rinden unos 3.7 puntos más que apostar sin criterio (-4.0%), pero con t = 1.7 no se separa de la suerte, y no hay ganancia: la ventaja que
detecta el modelo se la come la comisión de la casa.

**«Valor dudoso» (v67) no se confirma como señal de peor resultado:** rindió -0.2% contra -0.4% de fuerte + moderado. La etiqueta es honesta
(la mezcla con el mercado no deja valor), pero estos datos no muestran que esos picks sean peores. Lo que sí cambia con ella es el stake (resultado 3).

## Resultado 2: el número de la app dice más de lo que pasa

En los 2,544 picks de valor: la app decía **50.5%** de ganar, el mercado decía 44.0% y ganaron **45.8%**. O sea que la realidad quedó solo ~28% del camino hacia el
número de la app. Eso es consistente con el peso `W_MODELO` que ya se había medido (0.24 ± 0.28); la regresión de las 3 temporadas juntas da 0.09
(por temporada -0.12 / 0.21 / 0.23) y fuera de muestra la mezcla no mejora al mercado de forma significativa (t = -1.2). Conclusión: el modelo agrega muy poco o nada al precio de cierre.

Mientras más se separa la app del mercado, peor le va:

| Ventaja que veía (puntos sobre la cuota con vig) | Juegos | ROI |
|---|---|---|
| 2 a 6 | 1,967 | +0.4% ± 2.5 |
| 6 a 8 | 444 | -1.6% ± 5.3 |
| 8 o más (incluye «precio imposible») | 780 | **-8.5% ± 4.4** |

El 8+ perdió en las tres temporadas (-12.2%, -5.7%, -6.3%) y los «precio imposible» también (-11.1%, -9.7%, -4.5%). Estos cortes se miraron
**después** de ver los datos: son pistas, no pruebas.

## Resultado 3: el stake con tu número crudo hundía la banca

¼ Kelly día por día, banca inicial $1,000, las tres temporadas seguidas:

| Cálculo | Termina en | Peor caída | Mínimo |
|---|---|---|---|
| v66: todo lo que decía «valor», Kelly sobre tu número | $289 | 88% | $151 |
| v67: solo fuerte + moderado, Kelly sobre tu número | $524 | 64% | $413 |
| **v68: fuerte + moderado, Kelly sobre la mezcla con el mercado** | **$981** | **6%** | $947 |

Confirmado de forma independiente: los $524 y los $981 salen también de sumar los stakes que imprime la app real (no solo de mi simulador).
Con el número crudo el ROI era casi plano (-0.4%) y aun así se perdía más de la mitad de la banca, porque el número inflado hace apostar de más y
la volatilidad se come el capital. **v68 calcula el stake sobre la mezcla** (`valor()` en `index.html`); sigue sin ser una forma de ganar, pero
deja de ser una forma de perder la banca.

## Resultado 4: el modo «Al gane» está bien calibrado, pero acertar no es ganar

| La app dice | Juegos | Gana de verdad | ROI a la cuota de cierre |
|---|---|---|---|
| 50 a 55% | 3,197 | 52.6% (app 52.4%) | -3.3% ± 1.7 |
| 55 a 60% | 2,012 | 57.0% (app 57.2%) | -4.1% ± 1.9 |
| 60 a 65% | 761 | 63.2% (app 62.1%) | -0.7% ± 2.8 |
| 65 a 70% | 170 | 69.4% (app 66.7%) | +1.7% ± 5.3 |
| 70 a 80% | 31 | 74.2% (app 72.1%) | +2.8% ± 11.3 |

Cuando la app dice 57%, gana 57%. Pero el mercado dice lo mismo, así que a la cuota de cierre apostar a los favoritos rinde entre -3% y -4% (la comisión).

## Cuántos picks hacen falta para saber si ganas

Un pick de valor tiene una desviación de 1.11 unidades. Para distinguir de la suerte (t = 2) un ROI verdadero de +3% hacen falta ≈ 5,500 picks
(unas 6 temporadas completas con este ritmo); de +5%, ≈ 2,000. Por eso **el CLV** (Mis picks) es la medida útil: se mueve mucho más rápido que el ROI.

## Límites

- Cuota de cierre de DraftKings vía ESPN. Buscar el mejor precio entre varias casas puede sumar uno o dos puntos, no cambia la conclusión.
- El abridor es el que de verdad lanzó (boxscore), no el probable de antes del juego: eso favorece un poco al modelo, así que lo real puede ser algo peor.
- Es la fórmula base de la app (la que replica `backtests/backtestmercado.html`). Lineups del día, clima y bullpen quemado no se pueden reconstruir hacia atrás.
- Solo ganador de MLB. Fútbol, NBA y los otros mercados de MLB (hándicap, totales, F5, ponches) no se midieron así; el stake de todos ellos ya usa la mezcla (con el precio entre 1.045 como ancla cuando solo hay un precio), por prudencia.

## Cómo repetirlo

```
for s in S2024 S2025 S2026; do git clone --depth 1 --branch var-$s https://github.com/osvaldoalvarez0113-source/ODDX datos/var-$s; done
node scripts/medicion/picks_app.js datos
python3 -I scripts/medicion/analisis_picks.py datos
```
