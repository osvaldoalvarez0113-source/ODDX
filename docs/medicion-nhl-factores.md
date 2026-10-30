# NHL · ¿los factores que faltan mejoran la línea de cierre?

Juegos unidos (línea de cierre + datos de la NHL, 8+ juegos por equipo): **4754** · temporadas 2022, 2023, 2024, 2025, 2026

## 1) Ganador: ¿mejora el precio de cierre del mercado?

Mejora = cuánto baja la pérdida logarítmica frente al mercado solo (positivo = el factor ayuda). Con 6 pruebas, hace falta z > 2.6 (corrección de Holm) para creerle.

| Factor | Juegos | Mejora (×1000) | z | Peso (por desv. típica) ± entre temporadas | Veredicto |
|---|---|---|---|---|---|
| Tiros a puerta (dominio del juego) | 4754 | +0.20 | 0.6 | +0.050±0.009 | no se distingue |
| Portero titular (calidad, GSAx por tiro) | 4754 | -0.30 | -2.0 | +0.007±0.017 | empeora |
| Portero suplente (titular vs. el de siempre) | 4754 | -0.22 | -1.3 | +0.016±0.016 | no se distingue |
| Power play y penalty kill | 4754 | +0.08 | 0.3 | -0.035±0.008 | no se distingue |
| Suerte (goles por encima de lo que dan los tiros) | 4754 | +0.61 | 1.1 | -0.079±0.011 | no se distingue |
| 3 juegos en 4 noches | 4754 | +0.44 | 1.0 | +0.064±0.007 | no se distingue |
| Todo junto | 4754 | +0.22 | 0.3 | +0.060±0.011, +0.023±0.065, -0.007±0.062, -0.022±0.009, -0.073±0.019, +0.066±0.007 | no se distingue |

## 2) Total de goles: ¿mejora la línea?

Comparado contra la línea (más su sesgo medio). Mejora = baja del error cuadrático (positivo = ayuda).

| Factor | Juegos | Mejora | z | Coeficientes | Veredicto |
|---|---|---|---|---|---|
| Volumen de tiros de los dos | 4754 | -0.004 | -0.7 | -0.013, -0.010 | no se distingue |
| Porteros de los dos (calidad) | 4754 | -0.011 | -1.5 | -0.222, +0.228 | no se distingue |
| Volumen de power play | 4754 | +0.003 | 0.6 | -0.009, -0.069 | no se distingue |
| Goles recientes de los dos (lo que usa OVA) | 4754 | -0.002 | -0.4 | +0.033, -0.100 | no se distingue |
| Todo junto | 4754 | -0.026 | -2.3 | -0.102, -0.002, +0.102, -0.046, -0.076 | empeora |

## 3) ¿Se gana dinero? Apostar Menos/Más con el modelo de totales «todo junto» (precio real de cierre)

| Temporada probada | Regla | Apuestas | % ganadas | ROI |
|---|---|---|---|---|
| 2022 | Menos si espera 0.25+ goles de diferencia | 598 | 49.8% | -3.2% |
| 2022 | Menos si espera 0.40+ goles de diferencia | 167 | 45.5% | -10.6% |
| 2025 | Menos si espera 0.25+ goles de diferencia | 8 | 50.0% | -1.5% |
| **todas** | Menos · 0.25 | 606 | 49.8% | **-3.2% ± 8** |
| **todas** | Menos · 0.40 | 167 | 45.5% | **-10.6% ± 15** |
