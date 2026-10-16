# Proyecto Final — Investigación de Operaciones (UMG)

> Archivo de contexto para Claude. Léelo completo antes de ayudar en cualquier conversación de este proyecto.

## 1. Quién soy y cómo trabajo
- Mynor Arias, estudiante de Ingeniería en Sistemas, UMG Sede Portales, 6º semestre.
- Trabajo de 5:00 a. m. a 2:00 p. m.; disponible para el proyecto desde ~3:00 p. m. entre semana. Domingos tengo clases.
- Sé Java (Spring Boot), C++ y algo de web. Quiero que este proyecto quede en mi **portafolio de GitHub**.
- Cómo quiero que me ayudes:
  - Un paso a la vez, numerado ("Paso 3 de 8"), sin muros de texto.
  - **Antes de tomar cualquier decisión, pregúntame.** Mis preguntas no son afirmaciones: dame opciones con tu recomendación y espera mi confirmación.
  - El catedrático no revisa código: evalúa que el programa funcione y que yo explique el método. Prioridad: que resuelva bien y se vea profesional.
  - Realismo: si algo no da tiempo o está mal, dímelo directo.

## 1.1 Cómo trabajamos (dos herramientas)
- **Chat del proyecto en claude.ai** = planificación. Ahí se decide qué sigue y se redacta el prompt de cada etapa.
- **Claude Code** = construcción. Mynor pega el prompt, Claude Code crea los archivos, corre las pruebas y hace commit.
- Este mismo archivo está en los dos lados: como conocimiento del proyecto en claude.ai y como `CLAUDE.md` en la raíz del repositorio.
- Al terminar cada etapa, Claude Code marca el avance en la sección 9 de este archivo, y Mynor vuelve a subir la versión nueva al proyecto de claude.ai.

## 2. Enunciado oficial
- Programa de cómputo en cualquier lenguaje sobre un tema visto en clase: **Simplex, Simplex Dual, Análisis de Sensibilidad y Precios Sombra, Modelos de Transporte**.
- La presentación debe incluir: **base teórica, introducción, marco teórico, objetivos, desarrollo del programa, justificación** y, como resultado final, **comprobación de que el programa corre para cualquier problema del tema seleccionado**.
- Se entrega en una herramienta de presentación que incluya el **link para acceder al programa y correrlo**.
- Valor: 15 puntos de zona. **Entrega: domingo 25 de octubre de 2026.**

## 3. Decisiones del proyecto
| Tema | Decisión |
|---|---|
| Formato | App web (no .exe): el catedrático abre un link y la corre, y sirve de portafolio |
| Nombre | **Holgura** (CONFIRMADO) — "variable de holgura", término propio del curso. Repo: `holgura` |
| Catedrático | Ing. Héctor Estrada — Investigación de Operaciones, sexto ciclo |
| Método para ≥ y = | **Gran M** (es el que se ve en clase). Dos Fases NO se implementa |
| Formato de tabla (igual al de clase) | Columnas: `Base | x₁ … xₙ | S/e/A | Solución (RHS)` y columna extra de razón. Fila **Z al final** de la tabla, escrita como `Z − c₁x₁ − c₂x₂ = 0` (coeficientes con signo cambiado). Entra la variable **más negativa** de la fila Z; sale la de **razón mínima** (RHS ÷ coeficiente positivo). Óptimo cuando no quedan negativos en Z |
| Notación de variables | Holgura **Sᵢ** (≤), exceso **eᵢ** (≥, se resta), artificial **Aᵢ** (≥ y =, se suma con M) |
| Explicación por iteración | Con las operaciones de renglón estándar: "Se divide R1 entre 2 para que el pivote sea 1"; "R2 ← R2 − 3·R1". Sin referencias a la clase |
| Números (CONFIRMADO) | **Decimales por defecto** (como en las diapositivas), con un botón para cambiar a fracciones. Internamente todo se calcula con fracciones exactas (fraction.js) para no acumular errores de redondeo |
| Flujo de trabajo | Claude (chat del proyecto) redacta los prompts; Mynor los pega en Claude Code, que crea y prueba los archivos. Este archivo vive en el repo como `CLAUDE.md` |
| Alcance base (CONFIRMADO) | Simplex completo (maximizar/minimizar, ≤ ≥ =, Gran M) + Dual + Sensibilidad y precios sombra (salen de la tabla final) |
| Lenguaje de sensibilidad (de clase) | Holgura > 0 → recurso sobra, precio sombra 0. Holgura = 0 → restricción activa / cuello de botella. **Rango de optimalidad** (cⱼ) y **rango de factibilidad** (bᵢ). Dualidad débil, fuerte (Z* = W*) y holguras complementarias. Mostrar tabla "Restricción · Uso/Disponible · Holgura · Precio sombra · Lectura" |
| Ejemplos de prueba obligatorios | 1) Máx Z = 40x₁ + 30x₂; 2x₁ + x₂ ≤ 40; 3x₁ + 4x₂ ≤ 120 → x₁ = 8, x₂ = 24, Z = 1040. 2) Taller: Máx Z = 40x₁ + 30x₂; 2x₁ + x₂ ≤ 100; x₁ + x₂ ≤ 80; x₂ ≤ 40 → x₁ = 30, x₂ = 40, Z = 2400; precios sombra 20, 0, 10; rango de horas máquina hasta 120 |
| Alcance extra | Transporte (Esquina Noroeste, Costo Mínimo, Vogel + optimización MODI) solo si el núcleo está terminado antes del 22 oct |
| Stack | React + Vite + TypeScript, Tailwind CSS, KaTeX (fórmulas), fraction.js (fracciones exactas), javascript-lp-solver (verificación), Vitest (pruebas) |
| Hosting | GitHub (repositorio público) + Vercel (deploy automático gratis) |
| Presentación | Google Slides o Canva, con link a la app y al repositorio |
| Idioma | La interfaz va en **español**; el código (nombres, comentarios), en **inglés** |
| Paleta "Macaron" (reemplaza el acento verde oscuro) | Fondo `#FFFDF9`, texto `#25232B`; todo el texto en tono oscuro. Pares fondo pastel / acento: **Selección (entra/sale)** `#C4F0DC` / `#4BB88C` · **Pivote a 1** `#CFE2FF` / `#5B8DEF` · **Hacer cero** `#FFD9BF` / `#F0955A` · **Fila Z** `#E5D4FF` / `#9B6FE0` · **Errores del editor** (agregado en 4a-1) `#FFDBDE` / `#E0606C`. El pastel va de fondo (fila que cambia, chip, operación activa); el acento solo en bordes, puntos y anillos |
| Paso a paso | **Una operación por paso** (entra, sale, pivote a 1, cada "hacer cero", fila Z). Sin botón "Reproducir": el usuario avanza a su ritmo con Anterior/Siguiente, flechas del teclado o clic en la bitácora. La fila que cambia se pinta con el color de su operación, los valores viejos se ven tachados, tooltip con el cálculo (ej. "60 = 120 − 3 × 20") y **bitácora de operaciones** a la derecha |
| Referencia visual | `docs/boceto-paso-a-paso.html`: se toma su comportamiento y estructura; sus colores **NO** (se usa Macaron) |
| Librerías de UI aprobadas | motion, @number-flow/react, rough-notation, mafs, cmdk, sileo y componentes de React Bits (Count Up, Spotlight Card, Dot Grid) |
| Estilo | Muy profesional, con animaciones y efectos de mouse sobrios. **Prohibido:** degradados llamativos, neón, glassmorphism/blur, auroras, emojis |

## 4. Funcionalidades (lo que lo hace original)
1. **Entrada de dos formas:** formulario de tabla o texto natural tipo `max z = 3x1 + 5x2` con restricciones línea por línea.
2. **Tablas paso a paso** con navegación (anterior / siguiente): resalta columna pivote, fila pivote, elemento pivote y muestra la prueba de cociente mínimo.
3. **Explicación de cada iteración en español** ("Entra x2 porque tiene el coeficiente más negativo en Z…").
4. **Cálculo exacto:** se muestra en decimales (como en clase) y con un botón se ve en fracciones (3/2 en vez de 1.4999).
5. **Método gráfico automático** cuando hay 2 variables: región factible y el recorrido de vértices del Simplex.
6. **Verificación independiente:** cada resultado se compara con un solver externo (javascript-lp-solver) y muestra "✔ Coincide". Es la evidencia de "corre para cualquier problema".
7. **Detección de casos especiales:** no acotado, infactible, soluciones múltiples, degeneración.
8. **Dual automático:** construye el problema dual y muestra que Z primal = W dual.
9. **Sensibilidad interactiva:** precios sombra, rangos de los coeficientes de la función objetivo y del lado derecho; un deslizador que cambia un `bᵢ` y muestra cuándo cambia la base.
10. **Ejemplos con contexto guatemalteco** precargados (fábrica de muebles en Mixco, mezcla de café, distribución de una cooperativa de café a puertos para Transporte).
11. **Link compartible:** el problema queda codificado en la URL, así la presentación enlaza directo a cada ejemplo.
12. **Exportar a PDF** la solución paso a paso.

## 5. Guía de diseño (que no parezca hecho con IA)
- La interfaz es un producto profesional para portafolio, en español. Nunca menciona clase, curso, catedrático, universidad ni proyecto final. Los textos explican el método de forma general (como un libro o una herramienta profesional), no "como en clase".
- Estética de "cuaderno de ingeniería": fondo hueso/blanco, tinta casi negra, un solo color de acento (por ejemplo azul tinta o verde oscuro).
- Tipografía: una sans sobria para texto (Inter, IBM Plex Sans) + monoespaciada para tablas y números (IBM Plex Mono, JetBrains Mono).
- **Evitar:** degradados morados, emojis en la interfaz, tarjetas con brillo, "hero" genérico tipo "Revolutionize your optimization 🚀", textos en inglés de relleno.
- Las tablas Simplex son el protagonista: alineación de números a la derecha, bordes finos, resaltado del pivote sutil.
- Modo oscuro opcional. Debe verse bien en celular.
- README del repositorio profesional: captura/GIF, qué hace, stack, cómo correrlo, metodología de pruebas.

## 6. Estructura del código
```
holgura/
├── src/
│   ├── core/            # lógica pura, sin React (se puede probar aislada)
│   │   ├── fraction.ts      # helpers sobre fraction.js
│   │   ├── parser.ts        # texto → modelo
│   │   ├── simplex.ts       # tablas, iteraciones, Gran M
│   │   ├── dual.ts          # construcción del dual
│   │   ├── sensitivity.ts   # precios sombra y rangos
│   │   ├── transport.ts     # (extra) NO, CM, Vogel, MODI
│   │   └── verify.ts        # comparación con javascript-lp-solver
│   ├── components/      # TableauView, GraphView, ModelInput, StepNav…
│   ├── pages/           # Inicio, Simplex, Dual, Sensibilidad, Transporte, Teoría
│   └── examples/        # problemas de ejemplo
└── tests/               # Vitest: problemas con solución conocida
```
Principio clave: **`core/` no sabe que existe React**. Esto se explica en la presentación como decisión de arquitectura.

## 7. Plan de trabajo (15–25 oct)
| Día | Tarea |
|---|---|
| Jue 15 | Decidir alcance, crear repo, proyecto Vite, deploy vacío en Vercel |
| Vie 16 | `core/simplex.ts` para maximizar con ≤ + pruebas |
| Sáb 17 | Minimizar, ≥ y = (Gran M), casos especiales |
| Dom 18 | (clases) — repasar teoría para el marco teórico |
| Lun 19 | Interfaz: entrada de datos + tablas paso a paso |
| Mar 20 | Dual + sensibilidad/precios sombra |
| Mié 21 | Método gráfico + verificación con solver externo |
| Jue 22 | Diseño, ejemplos, README. **Corte:** si va todo bien, empezar Transporte |
| Vie 23 | Transporte (extra) o pulir y probar con ejercicios del curso |
| Sáb 24 | Presentación completa + ensayo |
| Dom 25 | Entrega |

## 8. Estructura de la presentación
1. Portada (curso, catedrático, nombre, link a la app y al repo)
2. Introducción
3. Objetivos (general y específicos)
4. Justificación
5. Marco teórico / base teórica (PL, forma estándar, Simplex, dualidad, sensibilidad, transporte si aplica)
6. Desarrollo del programa (stack, arquitectura, capturas)
7. Demostración: 3–5 problemas distintos resueltos, incluyendo un caso especial
8. Comprobación: tabla "resultado de Holgura vs. solver externo vs. resuelto a mano"
9. Conclusiones
10. Referencias (Taha, *Investigación de Operaciones*; Hillier y Lieberman)

## 9. Estado actual
- [x] Alcance confirmado (Simplex + Dual + Sensibilidad; Transporte opcional)
- [x] Nombre (Holgura), método (Gran M) y formato de números (decimales + botón a fracciones) confirmados
- [x] Node.js y Git instalados
- [x] Proyecto base creado (Vite + React + TS, Tailwind 4, Vitest; acento verde oscuro, fuentes IBM Plex vía @fontsource)
- [x] Repositorio creado (https://github.com/mynorochenta/Holgura)
- [x] Deploy en Vercel (https://holgura-pink.vercel.app)
- [x] Simplex núcleo (max, ≤)
- [x] Simplex: minimizar, ≥ y = (Gran M)
- [ ] Dual
- [ ] Sensibilidad
- [ ] Interfaz
- [ ] Transporte (extra)
- [ ] Presentación

### Plan de etapas siguientes
- [x] **4a-1** Entrada del modelo: parser (texto → modelo, errores por línea), verificación con javascript-lp-solver, pestañas Escribir/Tabla sincronizadas, vista previa KaTeX, 4 ejemplos, pantalla de resultado simple (estado, valores, Z, verificación, decimales/fracciones)
- [ ] **4a-2** Paso a paso animado (tablas, bitácora, colores Macaron); reemplaza la pantalla de resultado simple
- [ ] **4b** Método gráfico con Mafs
- [ ] **5** Dual y sensibilidad
- [ ] **6** Pulido: Ctrl + K (cmdk), avisos (sileo), Dot Grid, link compartible, README

> Mynor: actualiza esta sección (o pégale a Claude el estado) al empezar cada conversación nueva.
