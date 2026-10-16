// Modelo de programación lineal tal como lo escribe el usuario.
// Lógica pura: este módulo no depende de React.

/** Un número de entrada: 3, -1.5, "3/2"… Se convierte a fracción exacta al resolver. */
export type NumberInput = number | string

export type Sense = 'max' | 'min'

export type Operator = '<=' | '>=' | '='

export interface Constraint {
  /** Coeficientes de x1…xn. */
  coefficients: NumberInput[]
  operator: Operator
  /** Lado derecho (bᵢ). */
  rhs: NumberInput
}

export interface LinearModel {
  sense: Sense
  /** Coeficientes de la función objetivo c1…cn. */
  objective: NumberInput[]
  constraints: Constraint[]
}
