nfelo: 4614 juegos de temporada regular.
Juegos comunes (OVA + nfelo + moneyline de cierre, desde la semana 5 de cada temporada): 1462.

# NFL · el modelo de OVA contra nfelo y contra el mercado

Pérdida logarítmica del ganador (más baja = mejor). nfelo: datos públicos de github.com/greerreNFL/nfelo.

| Modelo | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | Total | Aciertos |
|---|---|---|---|---|---|---|---|---|---|---|
| OVA (modelo de la app) | 0.6487 | 0.6322 | 0.6567 | 0.6382 | 0.6448 | 0.6101 | 0.6533 | 0.6988 | 0.6423 | 63.8% |
| nfelo puro (sin mirar la línea) | 0.6295 | 0.5997 | 0.6317 | 0.6083 | 0.6340 | 0.5779 | 0.6401 | 0.6781 | 0.6192 | 65.3% |
| nfelo final (ya mezclado con la línea) | 0.6180 | 0.5864 | 0.6260 | 0.5933 | 0.6230 | 0.5535 | 0.6291 | 0.6792 | 0.6064 | 67.4% |
| **Mercado (cierre sin margen)** | 0.5626 | 0.5930 | 0.6197 | 0.5932 | 0.6268 | 0.5508 | 0.6224 | 0.6733 | 0.5982 | 68.1% |

nfelo puro − OVA: -23.1 milésimas ± 9.4 (z -4.9; negativo = nfelo acierta más).

## ¿Qué aporta cada uno?
| Mezcla (probada en la temporada que quedó afuera) | Peso del segundo | Mejora sobre el primero (milésimas ± 2·se) | z | Veredicto |
|---|---|---|---|---|
| OVA + nfelo puro | 1.00 | -23.1 ± 9.4 | -4.9 | nfelo LE APORTA a OVA |
| Mercado + nfelo puro | 0.00 | -0.0 ± 0.0 | -0.5 | no le aporta al precio |
| Mercado + OVA | 0.00 | -0.0 ± 0.0 | -0.5 | no le aporta al precio |

Regresión: gana = a + b·OVA + c·(nfelo − OVA), en logit: c = 0.257 ± 0.060 (c > 0 con z ≥ 2: nfelo sabe algo que OVA no).
