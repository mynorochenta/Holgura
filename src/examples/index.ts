// Problemas de ejemplo precargados. El texto usa el mismo formato que el editor.

/** Cómo se lee la solución de un ejemplo en el lenguaje de su historia. */
export interface ExampleReading {
  /** Qué conviene hacer, con {x1}, {x2}… en lugar de los valores: "armar {x1} mesas y {x2} sillas". */
  plan: string
  /** El objetivo con {z} en lugar del valor: "una utilidad máxima de Q{z}". */
  objective: string
  /** Factor para expresar Z en quetzales (el textil usa cientos de quetzales). */
  scale?: number
  /** Una lectura por restricción: "tight" si su holgura o exceso es 0, "loose" (con {v}) si no. */
  constraints: { tight: string; loose?: string }[]
  /** Explicación cuando el problema no tiene solución factible. */
  infeasible?: string
}

export interface Example {
  id: string
  title: string
  /** Contexto del problema en una o dos oraciones. */
  description: string
  /** Etiqueta corta del tipo de problema. */
  tag: string
  text: string
  reading: ExampleReading
}

export const EXAMPLES: Example[] = [
  {
    id: 'taller',
    title: 'Taller de ensamble',
    tag: 'Máx · ≤',
    description:
      'Un taller de muebles en Mixco arma mesas (x1) y sillas (x2) con Q40 y Q30 de utilidad. Tiene 100 horas máquina, 80 horas de ensamble y vende como máximo 40 sillas.',
    text: `max z = 40x1 + 30x2
2x1 + x2 <= 100
x1 + x2 <= 80
x2 <= 40
x1, x2 >= 0`,
    reading: {
      plan: 'armar {x1} mesas y {x2} sillas',
      objective: 'una utilidad máxima de Q{z}',
      constraints: [
        { tight: 'Se usan las 100 horas máquina.', loose: 'Sobran {v} horas máquina.' },
        { tight: 'Se usan las 80 horas de ensamble.', loose: 'Sobran {v} horas de ensamble.' },
        { tight: 'Se venden las 40 sillas que admite el mercado.', loose: 'Quedan {v} sillas por debajo del límite de venta.' },
      ],
    },
  },
  {
    id: 'cafe',
    title: 'Mezcla de café',
    tag: 'Mín · ≥',
    description:
      'Una tostaduría en Antigua mezcla café de Atitlán (x1, Q20/lb) y de Huehuetenango (x2, Q30/lb). Necesita al menos 40 lb y 60 puntos de aroma; cada libra de Huehuetenango aporta 3.',
    text: `min z = 20x1 + 30x2
x1 + x2 >= 40
x1 + 3x2 >= 60
x1, x2 >= 0`,
    reading: {
      plan: 'mezclar {x1} lb de café de Atitlán y {x2} lb de Huehuetenango',
      objective: 'un costo mínimo de Q{z}',
      constraints: [
        { tight: 'La mezcla pesa justo las 40 lb pedidas.', loose: 'La mezcla pasa {v} lb de las 40 pedidas.' },
        { tight: 'El aroma llega justo a los 60 puntos.', loose: 'El aroma supera por {v} puntos el mínimo de 60.' },
      ],
    },
  },
  {
    id: 'textil',
    title: 'Plan de producción con igualdad',
    tag: 'Máx · =',
    description:
      'Una cooperativa textil en Sololá teje lotes de güipiles (x1) y de mantas (x2), con utilidad en cientos de quetzales. Puede tejer hasta 4 lotes de güipiles, tiene 12 horas de telar para mantas (2 por lote) y el tinte preparado (18 litros) debe usarse completo.',
    text: `max z = 3x1 + 5x2
x1 <= 4
2x2 <= 12
3x1 + 2x2 = 18
x1, x2 >= 0`,
    reading: {
      plan: 'tejer {x1} lotes de güipiles y {x2} lotes de mantas',
      objective: 'una utilidad máxima de Q{z}',
      scale: 100,
      constraints: [
        { tight: 'Se tejen los 4 lotes de güipiles posibles.', loose: 'Quedan {v} lotes de güipiles por debajo del máximo de 4.' },
        { tight: 'Se ocupan las 12 horas de telar para mantas.', loose: 'Sobran {v} horas de telar para mantas.' },
        { tight: 'Se usan los 18 litros de tinte, como pide el plan.' },
      ],
    },
  },
  {
    id: 'panaderia',
    title: 'Pedido sin capacidad',
    tag: 'Infactible',
    description:
      'Una panadería en Quetzaltenango hornea pan francés (x1) y pan dulce (x2), en docenas. El horno da para 200 docenas al día, pero los contratos exigen al menos 250.',
    text: `max z = 12x1 + 15x2
x1 + x2 <= 200
x1 + x2 >= 250
x1, x2 >= 0`,
    reading: {
      plan: 'hornear {x1} docenas de pan francés y {x2} de pan dulce',
      objective: 'una utilidad máxima de Q{z}',
      constraints: [{ tight: 'Se usa toda la capacidad del horno.' }, { tight: 'Se cumple justo el mínimo de los contratos.' }],
      infeasible:
        'No hay plan posible: el horno da para 200 docenas al día y los contratos piden al menos 250. Hay que ampliar el horno o renegociar los contratos.',
    },
  },
]
