# FIP del abridor: medición de octubre 2026

Pregunta: ¿el FIP (o xFIP) del abridor predice mejor sus carreras limpias de la próxima salida que el ERA solo?
Script: `scripts/medicion/backtest_fip.js` (workflow «Backtest FIP del abridor», resultado en la rama `resultados-fip`).
Mismo método que `backtests/backtestmarcel.html`: salida por salida, solo con datos anteriores a cada fecha, abridores con 40+ innings
en las tres temporadas previas, 2024-2026 (3,862 / 3,997 / 3,968 salidas), ajustar con dos temporadas y medir en la tercera.
FIP y xFIP van «crudos» (sin la constante) y jalados a la liga con los mismos 40 innings que el ERA.

**Regla fijada antes de correr:** una comparación pasa si mejora el error en las tres pruebas, con peso positivo del dato nuevo,
y la t de las tres juntas llega a 2. Entre 1.3 y 2 es dudoso (se archiva). Si pasa, entra a la app como opción apagada;
solo sería el valor por defecto si el efecto llega a 1 punto de probabilidad. Las comparaciones principales eran dos:
FIP suma al ERA del año (B vs A) y FIP suma al historial de 3 años (E1 vs E0).

## Lo que salió

| Comparación | Mejora del error | t (tres juntas) | Pruebas con t ≥ 2 | Efecto | Veredicto |
|---|---|---|---|---|---|
| **FIP suma al ERA del año** (principal) | 0.30% | 3.35 | 2 de 3 | ~0.6 pts | pasa |
| **FIP suma al historial de 3 años** (principal) | 0.21% | 2.84 | 1 de 3 | ~0.5 pts | pasa |
| FIP reemplaza al ERA | 0.27% | 2.27 | 0 de 3 | ~0.9 pts | pasa (informativa) |
| xFIP suma al ERA del año | 0.45% | 3.91 | 2 de 3 | ~0.8 pts | pasa (informativa) |
| xFIP suma al historial | 0.28% | 3.01 | 1 de 3 | ~0.6 pts | pasa (informativa) |
| xFIP reemplaza al ERA | 0.29% | 1.82 | 0 de 3 | ~1.1 pts | dudoso |

Pesos estables entre temporadas (FIP ≈ 0.58-0.69 sumado al ERA; ≈ 0.47-0.60 sumado al historial).
Modelo que quedó en la app: `ERA = 1.5913 + 0.1739·ERA año + 0.3329·historial + 0.5375·FIP`.

## Cómo leerlo

- **Pasa la regla, pero el efecto es chico:** unos 0.5 puntos de probabilidad de ese lado, menos del punto que haría falta para ser valor por defecto.
- Son seis comparaciones y la regla pide t ≥ 2 solo juntas; en la principal de historial solo una de las tres pruebas individuales llega a 2.
  Un «pasa» así se toma con cuidado, no como una mejora firme.
- La t trata cada salida como independiente, pero las salidas de un mismo abridor se parecen entre sí, así que la t real es algo menor.
- **Contra el mercado no se midió.** El historial de 3 años, que pasó una regla igual, no sostuvo ventaja contra el cierre de DraftKings
  (ver `MEDICION-MERCADO-MLB-2026-10.md`). No hay razón para esperar que el FIP, con un efecto parecido, haga mejor papel.
- La app ya usaba el FIP de dos maneras: como ancla de la regresión de las últimas 5 salidas y como modo «FIP» en Ajustes (solo FIP, jalado a la liga), que equivale a la comparación «FIP reemplaza al ERA»: mejora 0.27%, t 2.27, y ninguna de las tres pruebas individuales llega a 2.

## Qué se hizo en la app (v64)

Opción «FIP del abridor» en Ajustes, **apagada por defecto**, en `historial.js`. Solo cambia el cálculo de los abridores con historial
(los mismos con los que se midió) y solo en los modos «mezcla 70/30» y «temporada». La pestaña Números muestra siempre la fila
«ERA con historial + FIP», aunque esté apagada. Diferencia con la prueba: el ERA de liga es el del año en curso y el FIP crudo de
la liga se aproxima con ERA de liga − 3.15 (en 2024-2026 la diferencia con el valor medido fue de −0.04 a +0.03).
Pruebas: 11 nuevas en `pruebas.js` (apagado no cambia nada, encendido da la fórmula medida, sin historial no se toca).
