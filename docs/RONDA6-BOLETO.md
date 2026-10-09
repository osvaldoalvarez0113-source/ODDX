# Ronda 6 — diseño «Boleto»

Dos diseños nuevos para el interior de las tres apps (MLB, fútbol y NBA). Se eligen en Ajustes → Apariencia (en fútbol y NBA, con el botón 🎨).

- **Boleto**: cada juego es un ticket claro sobre fondo oscuro. Arriba la hora y los datos del juego; en el centro las dos probabilidades en grande (el favorito lleva el resaltador amarillo); línea perforada con muescas; abajo la cuota justa, el total (o el empate en fútbol) y el sello del veredicto.
- **Boleto noche**: lo mismo en oscuro, con acento coral.

Qué cambia además de los colores:
- Barra de abajo: solo la pestaña activa muestra su nombre (en un botón amarillo/coral que se estira); las demás son iconos.
- Pestañas de adentro (Veredicto, Cuotas, Números…): control segmentado.
- Veredicto: sello grande con borde, las tres cifras como regleta, tablas como recibo (líneas punteadas, fila usada resaltada).
- Botones: el principal con el color de acento, los secundarios con borde.

Cómo funciona: `diseno.js` lee lo que cada tarjeta ya muestra (equipos, hora, probabilidades, cuota justa, veredicto) y arma el ticket (`.bzT`); no calcula nada y no borra nada original (se oculta con CSS). El CSS vive en `interior.js` y toda regla cuelga de `html[data-ui^="boleto"]`.

Se activa solo la primera vez que abres la app después de actualizar (clave `ova_ui_r6`); para volver al de antes: Ajustes → Apariencia → Clásico.
