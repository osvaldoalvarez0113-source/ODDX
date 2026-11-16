## NFL contra nfelo

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

## NFL · ESPN FPI (1,462 juegos)

| Modelo | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | Total | Aciertos |
|---|---|---|---|---|---|---|---|---|---|---|
| OVA (modelo de la app) | 0.6487 | 0.6322 | 0.6567 | 0.6382 | 0.6448 | 0.6101 | 0.6533 | 0.6988 | 0.6423 | 63.8% |
| ESPN FPI | 0.6248 | 0.6170 | 0.6432 | 0.6210 | 0.6496 | 0.5904 | 0.6511 | 0.6929 | 0.6302 | 64.6% |
| Mercado (cierre) | 0.5626 | 0.5930 | 0.6197 | 0.5932 | 0.6268 | 0.5508 | 0.6224 | 0.6733 | 0.5982 | 68.1% |

- ESPN FPI − OVA (modelo de la app): -12.1 milésimas ± 10.6 (z -2.3; negativo = ESPN acierta más).
- ESPN FPI − mercado: +32.0 milésimas ± 9.4 (z 6.8).
- Mezcla OVA (modelo de la app) + ESPN (probada en la temporada que quedó afuera): peso de ESPN 0.80, mejora sobre OVA -12.2 ± 8.6 (z -2.8) → **ESPN le aporta a OVA**
- Mezcla mercado + ESPN: peso de ESPN 0.00, mejora sobre el mercado -0.0 ± 0.0 (z -1.2) → no le aporta al precio
- Mezcla mercado + OVA: peso de OVA 0.00, mejora -0.0 ± 0.0 (z -1.2).

## NBA · ESPN BPI (6,748 juegos)

| Modelo | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | Total | Aciertos |
|---|---|---|---|---|---|---|---|---|
| OVA (modelo de la app) | 0.6339 | 0.6275 | 0.6466 | 0.6054 | 0.6004 | 0.5945 | 0.6177 | 65.8% |
| ESPN BPI | 0.6354 | 0.6151 | 0.6329 | 0.5945 | 0.5922 | 0.5849 | 0.6086 | 67.1% |
| Mercado (cierre) | 0.6085 | 0.6027 | 0.6208 | 0.5790 | 0.5768 | 0.5650 | 0.5917 | 68.3% |

- ESPN BPI − OVA (modelo de la app): -9.1 milésimas ± 5.3 (z -3.5; negativo = ESPN acierta más).
- ESPN BPI − mercado: +16.8 milésimas ± 4.3 (z 7.9).
- Mezcla OVA (modelo de la app) + ESPN (probada en la temporada que quedó afuera): peso de ESPN 0.70, mejora sobre OVA -11.0 ± 3.7 (z -6.0) → **ESPN le aporta a OVA**
- Mezcla mercado + ESPN: peso de ESPN 0.00, mejora sobre el mercado +0.0 ± 0.0 (z 0.3) → no le aporta al precio
- Mezcla mercado + OVA: peso de OVA 0.00, mejora +0.0 ± 0.0 (z 0.3).

## MLB · pronóstico de ESPN (6,017 juegos)

| Modelo | 2024 | 2025 | 2026 | Total | Aciertos |
|---|---|---|---|---|---|
| OVA (fórmula nueva) | 0.6771 | 0.6804 | 0.6796 | 0.6791 | 56.3% |
| OVA (fórmula anterior) | 0.6832 | 0.6823 | 0.6810 | 0.6822 | 55.9% |
| ESPN | 0.6756 | 0.6864 | 0.6802 | 0.6808 | 56.4% |
| Mercado (cierre) | 0.6688 | 0.6783 | 0.6766 | 0.6746 | 57.4% |

- ESPN − OVA (fórmula nueva): +1.7 milésimas ± 3.2 (z 1.1; negativo = ESPN acierta más).
- ESPN − mercado: +6.2 milésimas ± 3.2 (z 3.8).
- Mezcla OVA (fórmula nueva) + ESPN (probada en la temporada que quedó afuera): peso de ESPN 0.40, mejora sobre OVA -0.6 ± 1.3 (z -0.9) → no se distingue
- Mezcla mercado + ESPN: peso de ESPN 0.15, mejora sobre el mercado +0.0 ± 0.4 (z 0.1) → no le aporta al precio
- Mezcla mercado + OVA: peso de OVA 0.10, mejora +0.0 ± 0.3 (z 0.2).

MLB: el pronóstico de ESPN quedó guardado antes de la hora del juego en 7,282 de 7,287 juegos (100%).
