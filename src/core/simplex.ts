// Método Simplex en forma de tabla: tabla inicial, iteraciones y casos especiales.
// Lógica pura: este módulo no depende de React.
//
// Convención de la tabla:
//   columnas x1…xn, S1…Sm y Solución (RHS);
//   una fila por restricción con su variable básica;
//   la fila Z va al final, escrita como Z − c1x1 − … − cnxn = 0 (coeficientes con signo cambiado).
// Entra la variable con el coeficiente más negativo en Z y sale la de razón mínima.

import { Fraction, MValue, formatMValue, formatNumber, type NumberFormat } from './fraction'
import type { LinearModel } from './model'

export const MAX_ITERATIONS = 50

export interface Tableau {
  /** Nombres de las columnas: x1…xn, S1…Sm. */
  variables: string[]
  /** Para cada fila de restricción, el índice de columna de su variable básica. */
  basis: number[]
  /** Coeficientes de las filas de restricción (sin la columna Solución). */
  rows: Fraction[][]
  /** Columna Solución (RHS) de las filas de restricción. */
  rhs: Fraction[]
  /** Coeficientes de la fila Z; pueden incluir M. */
  z: MValue[]
  /** Solución (RHS) de la fila Z: el valor actual de Z. */
  zRhs: MValue
}

/** Operación de renglón. Las filas se numeran R1…Rm; la fila Z es 'Z'. */
export type RowOperation =
  | { kind: 'scale'; row: number; divisor: Fraction }
  | { kind: 'eliminate'; target: number | 'Z'; source: number; factor: MValue }
// 'scale':     R_row ← R_row ÷ divisor
// 'eliminate': target ← target − factor · R_source

export interface Iteration {
  /** Número de iteración, empezando en 1. */
  number: number
  /** Tabla antes de pivotear. */
  before: Tableau
  /** Columna de la variable que entra. */
  entering: number
  /** Columnas que empataban como más negativas en Z (incluye la que entra). */
  enteringTies: number[]
  /** Razón RHS ÷ coeficiente por fila; null ("—") si el coeficiente no es positivo. */
  ratios: (Fraction | null)[]
  /** Fila de la variable que sale. */
  leaving: number
  /** Filas que empataban en la razón mínima (incluye la que sale). */
  leavingTies: number[]
  /** Hubo empate en la razón mínima: posible degeneración. */
  degenerate: boolean
  /** Elemento pivote. */
  pivot: Fraction
  operations: RowOperation[]
  /** Tabla después de pivotear. */
  after: Tableau
}

export type SimplexStatus = 'optimal' | 'unbounded' | 'iteration_limit'

export type SimplexWarning =
  | { kind: 'multiple_optima'; variables: string[] }
  | { kind: 'degeneracy'; iteration: number }

export interface SimplexResult {
  status: SimplexStatus
  /** Valor de cada variable (x y holguras) en la tabla final. */
  values: Record<string, Fraction>
  /** Valor de Z en la tabla final. */
  z: Fraction
  finalTableau: Tableau
  iterations: Iteration[]
  warnings: SimplexWarning[]
  /** Si el problema es no acotado: la columna que entraba y no tenía coeficientes positivos. */
  unboundedColumn?: number
}

const ZERO = new Fraction(0)

/** Resuelve el modelo con el método Simplex. Por ahora: maximizar con restricciones ≤ y lado derecho ≥ 0. */
export function solveSimplex(model: LinearModel): SimplexResult {
  validate(model)

  let tableau = buildInitialTableau(model)
  const iterations: Iteration[] = []

  while (iterations.length < MAX_ITERATIONS) {
    const enteringTies = mostNegativeColumns(tableau)
    if (enteringTies.length === 0) {
      return finish('optimal', tableau, iterations)
    }
    const entering = enteringTies[0]

    const ratios = tableau.rows.map((row, i) =>
      row[entering].compare(ZERO) > 0 ? tableau.rhs[i].div(row[entering]) : null,
    )
    const leavingTies = minimumRatioRows(ratios)
    if (leavingTies.length === 0) {
      return { ...finish('unbounded', tableau, iterations), unboundedColumn: entering }
    }
    const leaving = leavingTies[0]

    const { after, operations } = pivot(tableau, leaving, entering)
    iterations.push({
      number: iterations.length + 1,
      before: tableau,
      entering,
      enteringTies,
      ratios,
      leaving,
      leavingTies,
      degenerate: leavingTies.length > 1,
      pivot: tableau.rows[leaving][entering],
      operations,
      after,
    })
    tableau = after
  }

  return finish('iteration_limit', tableau, iterations)
}

function validate(model: LinearModel): void {
  const n = model.objective.length
  if (n === 0) throw new Error('La función objetivo no tiene variables.')
  if (model.sense !== 'max') {
    throw new Error('Aún no soportado: por ahora solo se puede maximizar.')
  }
  model.constraints.forEach((constraint, i) => {
    if (constraint.coefficients.length !== n) {
      throw new Error(`La restricción ${i + 1} tiene ${constraint.coefficients.length} coeficientes y se esperaban ${n}.`)
    }
    if (constraint.operator !== '<=') {
      throw new Error(`Aún no soportado: la restricción ${i + 1} usa "${constraint.operator}"; por ahora solo se aceptan restricciones ≤.`)
    }
    if (new Fraction(constraint.rhs).compare(ZERO) < 0) {
      throw new Error(`Aún no soportado: la restricción ${i + 1} tiene lado derecho negativo.`)
    }
  })
}

/** Tabla inicial: una holgura Sᵢ por restricción, que es la variable básica de su fila. */
export function buildInitialTableau(model: LinearModel): Tableau {
  const n = model.objective.length
  const m = model.constraints.length

  const variables = [
    ...model.objective.map((_, j) => `x${j + 1}`),
    ...model.constraints.map((_, i) => `S${i + 1}`),
  ]
  const rows = model.constraints.map((constraint, i) => [
    ...constraint.coefficients.map((c) => new Fraction(c)),
    ...Array.from({ length: m }, (_, k) => new Fraction(k === i ? 1 : 0)),
  ])
  const rhs = model.constraints.map((constraint) => new Fraction(constraint.rhs))
  const z = [
    ...model.objective.map((c) => MValue.of(c).neg()),
    ...Array.from({ length: m }, () => MValue.of(0)),
  ]

  return {
    variables,
    basis: model.constraints.map((_, i) => n + i),
    rows,
    rhs,
    z,
    zRhs: MValue.of(0),
  }
}

/** Columnas con el coeficiente más negativo en Z (en orden de índice). Vacío si no hay negativos. */
function mostNegativeColumns(tableau: Tableau): number[] {
  let best: MValue | null = null
  let ties: number[] = []
  tableau.z.forEach((value, j) => {
    if (!value.isNegative()) return
    const cmp = best === null ? -1 : value.compare(best)
    if (cmp < 0) {
      best = value
      ties = [j]
    } else if (cmp === 0) {
      ties.push(j)
    }
  })
  return ties
}

/** Filas con la razón mínima (en orden de índice). Vacío si ninguna fila tiene razón. */
function minimumRatioRows(ratios: (Fraction | null)[]): number[] {
  let best: Fraction | null = null
  let ties: number[] = []
  ratios.forEach((ratio, i) => {
    if (ratio === null) return
    const cmp = best === null ? -1 : ratio.compare(best)
    if (cmp < 0) {
      best = ratio
      ties = [i]
    } else if (cmp === 0) {
      ties.push(i)
    }
  })
  return ties
}

/** Pivotea sobre (fila, columna): deja 1 en el pivote y 0 en el resto de la columna. */
export function pivot(
  tableau: Tableau,
  pivotRow: number,
  pivotColumn: number,
): { after: Tableau; operations: RowOperation[] } {
  const operations: RowOperation[] = []
  const rows = tableau.rows.map((row) => [...row])
  const rhs = [...tableau.rhs]

  const pivotValue = rows[pivotRow][pivotColumn]
  if (!pivotValue.equals(1)) {
    operations.push({ kind: 'scale', row: pivotRow, divisor: pivotValue })
    rows[pivotRow] = rows[pivotRow].map((v) => v.div(pivotValue))
    rhs[pivotRow] = rhs[pivotRow].div(pivotValue)
  }
  const source = rows[pivotRow]

  rows.forEach((row, i) => {
    const factor = row[pivotColumn]
    if (i === pivotRow || factor.equals(ZERO)) return
    operations.push({ kind: 'eliminate', target: i, source: pivotRow, factor: MValue.of(factor) })
    rows[i] = row.map((v, j) => v.sub(factor.mul(source[j])))
    rhs[i] = rhs[i].sub(factor.mul(rhs[pivotRow]))
  })

  let z = tableau.z
  let zRhs = tableau.zRhs
  const zFactor = z[pivotColumn]
  if (!zFactor.isZero()) {
    operations.push({ kind: 'eliminate', target: 'Z', source: pivotRow, factor: zFactor })
    z = z.map((v, j) => v.sub(zFactor.mul(source[j])))
    zRhs = zRhs.sub(zFactor.mul(rhs[pivotRow]))
  }

  const basis = [...tableau.basis]
  basis[pivotRow] = pivotColumn

  return {
    after: { variables: tableau.variables, basis, rows, rhs, z, zRhs },
    operations,
  }
}

function finish(status: SimplexStatus, tableau: Tableau, iterations: Iteration[]): SimplexResult {
  const values: Record<string, Fraction> = {}
  tableau.variables.forEach((name) => {
    values[name] = new Fraction(0)
  })
  tableau.basis.forEach((column, i) => {
    values[tableau.variables[column]] = tableau.rhs[i]
  })

  const warnings: SimplexWarning[] = iterations
    .filter((it) => it.degenerate)
    .map((it) => ({ kind: 'degeneracy', iteration: it.number }))

  if (status === 'optimal') {
    const alternatives = tableau.variables.filter(
      (_, j) => !tableau.basis.includes(j) && tableau.z[j].isZero(),
    )
    if (alternatives.length > 0) warnings.push({ kind: 'multiple_optima', variables: alternatives })
  }

  return {
    status,
    values,
    z: tableau.zRhs.k,
    finalTableau: tableau,
    iterations,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Textos en español. Se generan a partir de los datos para poder mostrarlos en
// decimales o en fracciones según el formato elegido.

function rowLabel(row: number | 'Z'): string {
  return row === 'Z' ? 'Z' : `R${row + 1}`
}

/** "Se divide R1 entre 2 para que el pivote sea 1", "R2 ← R2 − 3·R1", "Z ← Z + 40·R1". */
export function describeOperation(operation: RowOperation, format: NumberFormat = 'decimal'): string {
  if (operation.kind === 'scale') {
    const label = rowLabel(operation.row)
    return `Se divide ${label} entre ${formatNumber(operation.divisor, format)} para que el pivote sea 1`
  }

  const target = rowLabel(operation.target)
  const source = rowLabel(operation.source)
  // target ← target − factor·source se escribe como target ± |c|·source, con c = −factor.
  const c = operation.factor.neg()
  let sign: string
  let magnitude: string
  if (c.hasM() && !c.k.equals(ZERO)) {
    sign = '+'
    magnitude = `(${formatMValue(c, format)})`
  } else {
    sign = c.isNegative() ? '−' : '+'
    magnitude = formatMValue(c.isNegative() ? c.neg() : c, format)
  }
  const multiplier = magnitude === '1' ? '' : `${magnitude}·`
  return `${target} ← ${target} ${sign} ${multiplier}${source}`
}

/** Por qué entra la variable de esta iteración. */
export function explainEntering(iteration: Iteration, format: NumberFormat = 'decimal'): string {
  const { before, entering, enteringTies } = iteration
  const name = before.variables[entering]
  const value = formatMValue(before.z[entering], format)
  let text = `Entra ${name} porque tiene el coeficiente más negativo en la fila Z (${value}).`
  if (enteringTies.length > 1) {
    const names = enteringTies.map((j) => before.variables[j]).join(', ')
    text += ` Hay empate entre ${names}; se elige ${name} por tener el menor índice.`
  }
  return text
}

/** Por qué sale la variable de esta iteración (prueba de la razón mínima). */
export function explainLeaving(iteration: Iteration, format: NumberFormat = 'decimal'): string {
  const { before, entering, leaving, leavingTies, ratios } = iteration
  const name = before.variables[before.basis[leaving]]
  const rhs = formatNumber(before.rhs[leaving], format)
  const coefficient = formatNumber(before.rows[leaving][entering], format)
  const ratio = formatNumber(ratios[leaving]!, format)
  let text = `Sale ${name} porque tiene la razón mínima (${rhs} ÷ ${coefficient} = ${ratio}).`
  if (leavingTies.length > 1) {
    const names = leavingTies.map((i) => before.variables[before.basis[i]]).join(', ')
    text += ` Hay empate entre ${names}; se elige ${name} por estar en la fila de menor índice. Posible degeneración: una variable básica quedará en 0.`
  }
  return text
}
