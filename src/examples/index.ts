// Problemas de ejemplo precargados. El texto usa el mismo formato que el editor.

export interface Example {
  id: string
  title: string
  /** Contexto del problema en una o dos oraciones. */
  description: string
  /** Etiqueta corta del tipo de problema. */
  tag: string
  text: string
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
  },
  {
    id: 'textil',
    title: 'Plan de producción con igualdad',
    tag: 'Máx · =',
    description:
      'Una cooperativa textil en Sololá teje lotes de güipiles (x1) y de mantas (x2), con utilidad en cientos de quetzales. El tinte preparado (18 litros) debe usarse completo.',
    text: `max z = 3x1 + 5x2
x1 <= 4
2x2 <= 12
3x1 + 2x2 = 18
x1, x2 >= 0`,
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
  },
]
