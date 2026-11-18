# Memoria por equipo (17-nov-2026)

`memoria.js` recuerda, para cada equipo y temporada, cómo le fue **entrando de favorito** y **de no favorito**, y si gana más o menos de lo esperado.
«Favorito» y «esperado» salen de un rating de resultados (Elo) que se recorre juego por juego, sin mirar el futuro. En tenis lo calcula el robot
(`scripts/tenis_datos.js`, campo `memoria` de `ratings-tenis.json`, últimos 12 meses). Sale en «🧠 El análisis» de NBA, NHL, NFL, fútbol y tenis.

## ¿Le suma aciertos al modelo? (`scripts/medicion/memoria_equipo.js`, hist-nhl.json y hist-nfl.json)

Se tomó el % del modelo antes de cada juego y se miró si los grupos de la memoria ganan distinto de lo que el modelo decía:

| Deporte | Grupo | Juegos | El modelo decía | Ganó | z |
|---|---|---|---|---|---|
| NHL | Al favorito le cuesta (de favorito gana ≤ 50%) | 1,285 | 57.5% | 56.4% | −0.8 |
| NHL | El favorito cumple (≥ 75%) | 201 | 59.5% | 60.7% | +0.4 |
| NHL | El rival da sorpresas (de no favorito ≥ 45%) | 1,771 | 57.0% | 57.1% | +0.1 |
| NFL | Al favorito le cuesta | 87 | 61.6% | 70.1% | +1.6 |
| NFL | El favorito cumple | 177 | 67.8% | 72.3% | +1.3 |
| NFL | El rival da sorpresas | 112 | 62.9% | 61.6% | −0.3 |

Nada pasa de z 2: el modelo ya lo trae. Por eso la memoria entra como **contexto** y **no mueve la confianza** del análisis.
Los cortes de cada deporte quedaron relativos a lo normal (NHL: le cuesta si gana ≤ 45%, cumple ≥ 72%, sorprende ≥ 50%).
