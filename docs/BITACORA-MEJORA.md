# Bitácora de la mejora diaria de OVA

La lleva la tarea programada «Mejora diaria de OVA» (todos los días, 2:22 p. m. de Chicago). Cada corrida lee esta bitácora,
mide UNA idea de la cola y anota aquí la fecha, la idea y el resultado. Lo ya medido está en `INDICE.md`.

## Cola de ideas (por medir)

- **Fuentes de datos gratis de machina-sports/sports-skills** (anotada el 27-nov-2026 a pedido de Osvaldo). Revisar su lista de
  fuentes «profundas» por liga (además de ESPN) en https://github.com/machina-sports/sports-skills (`skills/<deporte>/references/`)
  y ver si alguna trae un dato que OVA no tenga y que se pueda medir contra el precio de cierre. NO instalar la skill (riesgo medio
  en la revisión de seguridad de skills.sh y OVA ya hace lo que hace su parte de apuestas): solo usarla como pista de datos.

## En vigilancia

- **Reloj del cuerpo NFL** (equipo del oeste de visita a la 1 p. m. del este): pasó la regla al revés de la literatura (+9.7 pts, 107
  juegos, z 2.2). Revisar en enero de 2027 SOLO con los juegos de la temporada 2026 que no estaban en la medición (`reloj_nfl.py`).

## Hechas

| Fecha | Idea | De dónde salió | Resultado |
|---|---|---|---|
| 2026-11-27 | Recalibrar el % del mercado (sesgo favorito–longshot) | Historia de la liga + literatura | No pasa en NBA, NHL, NFL ni MLB |
| 2026-11-27 | Juegos de división | Literatura de la NFL | No pasa en NFL, NHL ni NBA |
| 2026-11-27 | Reloj del cuerpo en la NFL (oeste a la 1 p. m. del este) | Estudios de ritmo circadiano | Pasa al revés con 107 juegos: en vigilancia, no entra |
