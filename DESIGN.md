# Holgura — Sistema visual

Mundo: **Láminas en secuencia**. Cada tabla Simplex es una lámina blanca a escala fija; entre un paso y otro la tabla no se mueve y solo se entintan las celdas que toca la operación. El color vive en la tinta de los números, no en rellenos grandes ni en franjas laterales.

## Tokens (src/index.css)

| Rol | Papel | Blanco | Sepia | Pizarra |
|---|---|---|---|---|
| `--bg` fondo | `#F1F0EC` | `#FFFFFF` | `#ECE3D0` | `#17191C` |
| `--paper` lámina | `#FFFFFF` | `#FFFFFF` | `#F9F4E9` | `#1F2226` |
| `--ink` tinta | `#1E2320` | `#1C1E22` | `#33291F` | `#E8E6E1` |
| `--muted` texto secundario (AA) | `#605D56` | `#5D5F66` | `#64553D` | `#A19F99` |
| `--line` bordes | `#D9D6CE` | `#DFDFE3` | `#D3C4A6` | `#3A3E45` |
| `--rule` líneas internas | `#EBE9E3` | `#EEEEF1` | `#E6DCC6` | `#2B2E33` |

Tintas por operación (claras / Pizarra): selección `#2F7D4F` / `#6CC896`, pivote a 1 `#2D5DA8` / `#8FB2F0`, hacer cero `#B05510` / `#F0A262`, fila Z `#8A3B6E` / `#E294C6`, error `#C42B3C` / `#F4838F`. `--*-t` es la tinta al 11 % (16 % en Pizarra) sobre la lámina, solo para el fondo de la fila o columna señalada.

## Tipografía

- Interfaz: **Work Sans** 400/500/600 (cuerpo 16 px, secundarios 13–14 px).
- Matemática: **KaTeX_Main** para números, tablas y títulos; **KaTeX_Math** cursiva con subíndice para las variables.
- Editor de texto: **Fragment Mono** (es código; no se usa en ningún otro lugar).
- Escala: 13 / 14 / 16 / 17 / 21 (tabla) / 30 (secciones) / 40 (título del paso).

## Componentes

- **Tira de láminas** (`PlateStrip`): miniatura de la tabla por paso, agrupada por iteración; la operación entinta su fila, su columna o el pivote. Es la única navegación del paso a paso: clic, ← →, Inicio/Fin, arrastre con el mouse y deslizamiento táctil. Con más de 16 pasos las miniaturas se angostan y su pie se recorta con puntos suspensivos.
- **Marca**: lámina en miniatura de 4×4 celdas con la segunda fila en la tinta del pivote (encabezado y favicon).
- **Comparar** (`.plate.comparing`): la lámina muestra el paso anterior con borde punteado; botón en el pie y tecla C.
- **Lámina** (`.plate`): ecuación del paso (franja con el tinte de la operación), tabla y pie. Borde de 1 px, radio 3 px, sin sombra.
- **Botones**: alto mínimo 40 px, radio 3 px; el primario es tinta sólida. Íconos dibujados en SVG, nunca glifos de texto.
- **Avisos de error**: tinte de error de fondo, sin franja lateral.

## Reglas

- Prohibido: franjas de color a la izquierda, etiquetas pequeñas encima de un título, números que suben, degradados, sombras en reposo, glassmorphism, emojis.
- Las marcas a mano (rough-notation) solo para el pivote (círculo) y la variable que entra (subrayado).
- Movimiento con significado (variable que viaja a la base, franja del pivote) solo al avanzar un paso; con `prefers-reduced-motion` no hay recorridos y los estados se ven igual.
