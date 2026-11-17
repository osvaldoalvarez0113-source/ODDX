# Selecciones y copas nacionales (noviembre 2026)

Hasta hoy, fuera de las ligas casi no salía nada en la app de fútbol:

- **Selecciones:** el teléfono bajaba el historial solo. ESPN dejó de aceptar rangos de fechas, así que caía al modo día por día: **1 año y solo 4 torneos** (amistosos, las dos Nations League y la eliminatoria UEFA). Por eso UAE salía con 1 partido y sin Elo, y el aviso decía «últimos 1 años».
- **Copas nacionales** (FA Cup, DFB-Pokal, Coppa Italia, Coupe de France, Copa del Rey): sin porcentajes, y la forma solo contaba partidos de esa misma copa (1 o 2).

## Qué cambió

`scripts/torneos_datos.js` corre en GitHub Actions (`torneos.yml`, 4 veces al día) y deja en el repo:

| Archivo | Qué tiene |
|---|---|
| `hist-selecciones.json` | 4,073 partidos de selecciones (4 años) de 19 torneos de ESPN + los próximos 21 días |
| `fuerza-nacional.json` | fuerza de cada club por país (1.ª + 2.ª división + copas juntas, mismo motor `dcAjustar` de las ligas) |
| `hist-nac-<país>.json` | partidos de los últimos 14 meses del país (forma, rachas y cara a cara en todas las competencias) |

Torneos de selecciones que respondieron: amistosos, UEFA y Concacaf Nations League, eliminatorias de las 6 confederaciones, eliminatoria de la Euro, de la AFCON, de la Copa Asia y de la Copa Oro, Mundial, Euro, Copa América, Copa Oro, AFCON y Copa Asia. No están en ESPN: Copa Árabe, Copa del Golfo y CHAN. Tampoco la 3. Liga alemana.

En la app:

- **Selecciones:** el Elo sale del archivo (UAE pasó de 1 partido a 37, Elo 1672, #39 de 212). Nueva opción **🌐 Selecciones: todos los torneos**. Pestañas Veredicto, Goles, Forma y Cara a cara; Observaciones (rachas); Al gane con el favorito del Elo y registro automático.
- **Copas nacionales:** porcentajes a 90 minutos con el motor de las ligas, «pasa de ronda», goles, forma y cara a cara de todas las competencias, Observaciones, Al gane y registro automático.
- **Ligas:** Observaciones (rachas en esa competencia) en el Veredicto.

## Medición (cada partido predicho solo con lo anterior)

### Selecciones, últimos 2 años (1,875 partidos con 5+ previos de cada uno)

| Mercado | Acierto | Ir con lo más común | Pérdida | Sin modelo |
|---|---|---|---|---|
| 1X2 (Elo) | **58.8%** | 47.8% | **0.900** | 1.048 |
| Más/Menos 2.5 | **55.3%** | 50.2% | **0.684** | 0.693 |
| Ambos anotan | 50.8% | 55.6% | 0.702 | 0.687 |

Calibración del favorito del Elo: dice 50-60% → gana 60%; 60-70% → 65%; 70%+ (442) → 81%. Ambos anotan **no** le gana a la frecuencia y la app lo dice.

### Copas nacionales, 2 temporadas y lo que va (766 partidos con los dos equipos conocidos)

| Mercado | Acierto | Ir con lo más común | Pérdida | Sin modelo |
|---|---|---|---|---|
| 1X2 | **58.5%** | 46.1% | **0.947** | 1.022 |
| Más/Menos 2.5 | 59.9% | 58.0% | 0.673 | 0.682 |
| Ambos anotan | 54.4% | 52.0% | 0.693 | 0.694 |

Por país (1X2): Inglaterra 56% (455), Alemania 73% (93), España 67% (67), Italia 55% (95), Francia 48% (56).

**Se queda corto con el favorito:** cuando dice 60-70% gana 80% (66); cuando dice 70%+ gana 88% (51); cuando dice 50-60% gana 63% (207). Una corrección que estire las probabilidades podría subir los aciertos, pero con esta muestra hay que medirla antes de aplicarla.

630 partidos de copa quedaron fuera porque uno de los equipos es de 3.ª división o más abajo (ESPN no los trae). En esos la app lo avisa y no da porcentajes.

El marcador de ESPN en copas incluye la prórroga, así que el 1X2 medido no es 100% a 90 minutos.

## Cómo repetirlo

`node scripts/torneos_datos.js` (o `sel` / `copas` para uno solo). `TORNEOS_COMPLETO=1` vuelve a bajar los 4 años de selecciones.
