# Hándicap NHL y NFL: ¿pega más que el moneyline? (9-nov-2026)

`node scripts/medicion/handicap.js nhl datos-nhl.json` (y `nfl datos-nfl.json`). Precio real de ESPN BET guardado en
`datos-<dep>.json`, temporada regular. Tramo = % del mercado (moneyline sin margen) para el favorito. A = 2021-2023, B = 2024-2026.

## NHL (5,258 juegos con línea ±1.5)

| Favorito | Juegos | Rival +1.5 pega | Rinde | Favorito −1.5 pega | Rinde | Moneyline del favorito pega | Rinde |
|---|---|---|---|---|---|---|---|
| 50-55% | 1,405 | 67.1% | −6.5% ±3.5 | 32.9% | −2.4% ±7.5 | 54.2% | −1.0% |
| 55-60% | 1,680 | 65.6% | −2.4% ±3.5 | 34.4% | −8.4% ±6.2 | 56.0% | −6.1% |
| 60-65% | 1,056 | 60.2% | −2.6% ±4.9 | 39.8% | −5.7% ±7.2 | 61.5% | −5.3% |
| 65-70% | 659 | 55.7% | −1.7% ±6.8 | 44.3% | −7.1% ±8.1 | 67.4% | −3.4% |
| 70%+ | 458 | 48.5% | −2.6% ±9.4 | 51.5% | −6.4% ±8.5 | 77.6% | +1.0% |

- El rival +1.5 **sí pega más** que el moneyline en juegos parejos (2 de cada 3), igual en las dos mitades.
- **Ningún lado gana dinero**: todo negativo o dentro del ruido. El precio ya lo descuenta.

## NFL (1,978 juegos)

Spreads de 1.5 a 7.5 por tramo: todo entre −27% y +18% con errores de ±12 a ±22 y sin repetirse entre mitades. Nada que mostrar.

## En la app

`ganadores.js` (pestaña Al gane de NHL): una línea por juego con lo que pegó el +1.5 / −1.5 en su tramo, y la tabla plegada
«🏒 Hándicap ±1.5». Solo informativo. MLB (run line) y NBA no se midieron aquí: sus datos con línea no están en el repo.
