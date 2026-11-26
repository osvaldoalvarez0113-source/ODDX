# Memoria fraccionaria en la forma (26-nov-2026)

Idea de Osvaldo, del cálculo fraccionario: en vez de contar los últimos 10 parejo (y el 11 nada), que cada juego pese
k^(−α) según qué tan viejo es: memoria larga, sin cortar de golpe. ¿Esa forma le agrega algo al precio de cierre?

`python3 scripts/medicion/memoria.py` (mismos datos que `sorpresas.py`). Modelo: p = sigmoide(logit(precio del favorito) +
β · (forma del favorito − forma del rival)). Se compara la fraccionaria (α de 0.25 a 1.5) contra últimos 10, temporada entera
y olvido exponencial (0.80 / 0.90 / 0.95), con la forma por victorias y por margen. Se ajusta en una mitad (antes de 2024 /
2024 en adelante) y se prueba en la otra, en las dos direcciones.

**Regla fijada antes de correr:** entra solo si mejora al precio solo con t ≥ 2 en las dos direcciones y le gana a los
últimos 10 en las dos.

## Veredicto: no pasa en ningún deporte

- **Ninguna forma** (fraccionaria, últimos 10, temporada ni exponencial) mejora al precio de cierre fuera de muestra.
  En NBA y NFL lo **empeoran**; en NHL quedan en cero. Los aciertos no cambian (NBA 70.9%, NHL 58.9%, NFL 71.6%).
- La fraccionaria le gana a los últimos 10 solo en NFL por margen en una dirección (t 2.3) y en la otra no (t 0.8).
- En NFL el peso de la forma cambia de signo entre mitades (−0.47 antes de 2024, +1.05 después): es ruido. Por eso
  empeora tanto fuera de muestra.
- Coincide con `MEDICION-SORPRESAS-2026-11.md`: el precio ya mira la forma. La señal «La racha engaña» (NBA) es un corte
  (no favorito 2+ victorias mejor en los últimos 10), no una forma lineal: sigue como aviso aparte y **no toca el %**.
  Esta medición confirma que meter la forma al % lo empeoraría.

## Tablas


## NBA — 5123 juegos (A antes de 2024: 3064 · B 2024 en adelante: 2059)

**Forma por victorias** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | -1.06 | -1.7 | -0.83 | -2.2 | 70.9% (precio 70.9%) |
| temporada entera / temporada entera | -0.22 | -1.1 | -0.30 | -1.0 | 70.9% (precio 70.9%) |
| exponencial 0.80 / exponencial 0.80 | -0.99 | -1.8 | -0.95 | -2.2 | 70.9% (precio 70.9%) |
| fraccionaria α=1.50 / fraccionaria α=1.00 | -0.72 | -1.5 | -0.66 | -1.8 | 70.8% (precio 70.9%) |

Fraccionaria contra últimos 10: +0.34 (t +0.8) y +0.18 (t +0.8). **no pasa**

**Forma por margen** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | -0.62 | -2.0 | -0.92 | -1.6 | 70.9% (precio 70.9%) |
| temporada entera / temporada entera | -0.17 | -1.4 | -0.37 | -0.9 | 70.9% (precio 70.9%) |
| exponencial 0.80 / exponencial 0.80 | -0.72 | -2.2 | -1.11 | -1.7 | 70.9% (precio 70.9%) |
| fraccionaria α=1.50 / fraccionaria α=1.50 | -1.03 | -2.2 | -1.29 | -2.1 | 70.8% (precio 70.9%) |

Fraccionaria contra últimos 10: -0.40 (t -1.3) y -0.37 (t -0.8). **no pasa**

## NHL — 4263 juegos (A antes de 2024: 2077 · B 2024 en adelante: 2186)

**Forma por victorias** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | +0.25 | +1.6 | -0.51 | -0.6 | 58.9% (precio 58.9%) |
| temporada entera / temporada entera | -0.14 | -0.8 | -0.24 | -0.7 | 58.9% (precio 58.9%) |
| exponencial 0.80 / exponencial 0.90 | +0.20 | +0.6 | -0.06 | -0.1 | 58.9% (precio 58.9%) |
| fraccionaria α=1.50 / fraccionaria α=0.75 | +0.09 | +0.2 | -0.07 | -0.1 | 58.9% (precio 58.9%) |

Fraccionaria contra últimos 10: -0.16 (t -0.5) y +0.44 (t +0.8). **no pasa**

**Forma por margen** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | +0.34 | +0.9 | +0.11 | +0.2 | 59.0% (precio 58.9%) |
| temporada entera / temporada entera | -0.05 | -0.5 | -0.11 | -0.5 | 58.9% (precio 58.9%) |
| exponencial 0.80 / exponencial 0.90 | +0.11 | +0.2 | +0.16 | +0.3 | 59.0% (precio 58.9%) |
| fraccionaria α=1.50 / fraccionaria α=0.75 | -0.04 | -0.1 | +0.16 | +0.4 | 59.0% (precio 58.9%) |

Fraccionaria contra últimos 10: -0.38 (t -0.8) y +0.06 (t +0.2). **no pasa**

## NFL — 1159 juegos (A antes de 2024: 786 · B 2024 en adelante: 373)

**Forma por victorias** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | -11.81 | -3.8 | -16.69 | -3.3 | 71.6% (precio 71.6%) |
| temporada entera / temporada entera | -11.44 | -4.0 | -19.88 | -3.4 | 71.6% (precio 71.6%) |
| exponencial 0.95 / exponencial 0.80 | -10.96 | -4.0 | -15.41 | -2.8 | 71.6% (precio 71.6%) |
| fraccionaria α=0.25 / fraccionaria α=0.50 | -10.69 | -4.0 | -17.01 | -3.1 | 72.1% (precio 71.6%) |

Fraccionaria contra últimos 10: +1.12 (t +1.2) y -0.32 (t -0.2). **no pasa**

**Forma por margen** (mejora del log-loss contra el precio solo, en milésimas; t de la mejora)

| Forma | Ajusta A → prueba B | t | Ajusta B → prueba A | t | Aciertos en B |
|---|---|---|---|---|---|
| últimos 10 / últimos 10 | -10.89 | -3.4 | -15.67 | -3.2 | 71.3% (precio 71.6%) |
| temporada entera / temporada entera | -8.83 | -3.3 | -16.16 | -3.1 | 71.3% (precio 71.6%) |
| exponencial 0.95 / exponencial 0.90 | -8.82 | -3.4 | -15.38 | -2.9 | 71.3% (precio 71.6%) |
| fraccionaria α=0.25 / fraccionaria α=0.50 | -8.64 | -3.4 | -14.57 | -2.9 | 71.3% (precio 71.6%) |

Fraccionaria contra últimos 10: +2.25 (t +2.3) y +1.10 (t +0.8). **no pasa**

## Veredicto

- nba por victorias: no pasa
- nba por margen: no pasa
- nhl por victorias: no pasa
- nhl por margen: no pasa
- nfl por victorias: no pasa
- nfl por margen: no pasa
