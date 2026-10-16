// Método Simplex en forma de tabla con el método de la Gran M.
// Lógica pura: este módulo no depende de React.
//
// Flujo:
//   1. Preparación: lado derecho negativo (× −1), Min → Max (−Z), variables S, e y A.
//   2. Tabla inicial: columnas x1…xn, S/e (en el orden de las restricciones), A y Solución (RHS);
//      la fila Z va al final, escrita como Z − c1x1 − … − cnxn = 0 (coeficientes con signo cambiado),
//      y cada artificial aparece con +M.
//   3. Ajuste de Gran M: Z ← Z − M·Rᵢ en cada fila cuya básica es artificial.
//   4. Iteraciones: entra la variable más negativa en Z (comparando primero M y luego el número)
//      y sale la de razón mínima.
//   5. Resultado: óptimo, no acotado o infactible (una artificial quedó en la base con valor > 0).

import { Fraction, MValue, formatMValue, formatNumber, type NumberFormat } from './fraction'
import type { LinearModel, Operator, Sense } from './model'

export const MAX_ITERATIONS = 50

export type ColumnKind = 'decision' | 'slack' | 'surplus' | 'artificial'

export interface Tableau {
  /** Nombres de las columnas: x1…xn, S/e, A. */
  variables: string[]
  /** Tipo de cada columna. */
  kinds: ColumnKind[]
  /** Para cada fila de restricción, el índice de columna de su variable básica. */
  basis: number[]
  /** Coeficientes de las filas de restricción (sin la columna Solución). */
  rows: Fraction[][]
  /** Columna Solución (RHS) de las filas de restricción. */
  rhs: Fraction[]
  /** Coeficientes de la fila Z; pueden incluir M. */
  z: MValue[]
  /** Solución (RHS) de la fila Z: el valor actual de Z (o de −Z si se minimiza). */
  zRhs: MValue
}

/** Restricción con coeficientes exactos, después de corregir el lado derecho negativo. */
export interface NormalizedConstraint {
  coefficients: Fraction[]
  operator: Operator
  rhs: Fraction
}

/** Paso de preparación del modelo, mostrado antes de la primera tabla. Restricciones numeradas desde 0. */
export type PreparationStep =
  | { kind: 'negative_rhs'; constraint: number; result: NormalizedConstraint }
  | { kind: 'minimize'; original: Fraction[]; converted: Fraction[] }
  | {
      kind: 'auxiliary'
      constraint: number
      operator: Operator
      slack?: string
      surplus?: string
      artificial?: string
    }
  | { kind: 'big_m_objective'; sense: Sense; objective: Fraction[]; artificials: string[] }

/** Operación de renglón. Las filas se numeran R1…Rm; la fila Z es 'Z'. */
export type RowOperation =
  | { kind: 'scale'; row: number; divisor: Fraction }
  | { kind: 'eliminate'; target: number | 'Z'; source: number; factor: MValue }
// 'scale':     R_row ← R_row ÷ divisor
// 'eliminate': target ← target − factor · R_source

/** Ajuste de la fila Z para que las artificiales básicas queden con 0 en Z. */
export interface BigMAdjustment {
  before: Tableau
  operations: RowOperation[]
  after: Tableau
}

export const BIG_M_ADJUSTMENT_TITLE = 'Ajuste de la fila Z: las artificiales básicas deben tener 0 en Z'

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

export type SimplexStatus = 'optimal' | 'unbounded' | 'infeasible' | 'iteration_limit'

export type SimplexWarning =
  | { kind: 'multiple_optima'; variables: string[] }
  | { kind: 'degeneracy'; iteration: number }

export interface SimplexResult {
  status: SimplexStatus
  /** Sentido original del problema. Si es 'min', la tabla trabaja con Max (−Z). */
  sense: Sense
  preparation: PreparationStep[]
  /** Tabla inicial, antes del ajuste de Gran M. */
  initialTableau: Tableau
  /** null si no hay artificiales. */
  bigMAdjustment: BigMAdjustment | null
  iterations: Iteration[]
  finalTableau: Tableau
  /** Valor de cada variable (x, S, e, A) en la tabla final. */
  values: Record<string, Fraction>
  /** Valor de Z con el signo original del problema. */
  z: Fraction
  warnings: SimplexWarning[]
  /** Si el problema es no acotado: la columna que entraba y no tenía coeficientes positivos. */
  unboundedColumn?: number
  /** Si es infactible: las artificiales que quedaron en la base con valor > 0. */
  infeasibleArtificials?: string[]
}

const ZERO = new Fraction(0)

/** Resuelve el modelo con el método Simplex (Gran M para restricciones ≥ y =). */
export function solveSimplex(model: LinearModel): SimplexResult {
  validate(model)

  const { constraints, objective, preparation } = prepare(model)
  const initialTableau = buildInitialTableau(objective, constraints)
  const bigMAdjustment = adjustBigM(initialTableau)
  const start = bigMAdjustment ? bigMAdjustment.after : initialTableau

  const base = { sense: model.sense, preparation, initialTableau, bigMAdjustment }
  let tableau = start
  const iterations: Iteration[] = []

  while (iterations.length < MAX_ITERATIONS) {
    const enteringTies = mostNegativeColumns(tableau)
    if (enteringTies.length === 0) {
      return finish(base, 'optimal', tableau, iterations)
    }
    const entering = enteringTies[0]

    const ratios = tableau.rows.map((row, i) =>
      row[entering].compare(ZERO) > 0 ? tableau.rhs[i].div(row[entering]) : null,
    )
    const leavingTies = minimumRatioRows(ratios)
    if (leavingTies.length === 0) {
      return { ...finish(base, 'unbounded', tableau, iterations), unboundedColumn: entering }
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

  return finish(base, 'iteration_limit', tableau, iterations)
}

function validate(model: LinearModel): void {
  const n = model.objective.length
  if (n === 0) throw new Error('La función objetivo no tiene variables.')
  model.constraints.forEach((constraint, i) => {
    if (constraint.coefficients.length !== n) {
      throw new Error(
        `La restricción ${i + 1} tiene ${constraint.coefficients.length} coeficientes y se esperaban ${n}.`,
      )
    }
  })
}

const FLIPPED: Record<Operator, Operator> = { '<=': '>=', '>=': '<=', '=': '=' }

/** Lleva el modelo a la forma que usa la tabla y registra cada transformación. */
export function prepare(model: LinearModel): {
  constraints: NormalizedConstraint[]
  objective: Fraction[]
  preparation: PreparationStep[]
} {
  const preparation: PreparationStep[] = []

  const constraints = model.constraints.map((constraint, i): NormalizedConstraint => {
    const normalized = {
      coefficients: constraint.coefficients.map((c) => new Fraction(c)),
      operator: constraint.operator,
      rhs: new Fraction(constraint.rhs),
    }
    if (normalized.rhs.compare(ZERO) >= 0) return normalized

    const result = {
      coefficients: normalized.coefficients.map((c) => c.neg()),
      operator: FLIPPED[normalized.operator],
      rhs: normalized.rhs.neg(),
    }
    preparation.push({ kind: 'negative_rhs', constraint: i, result })
    return result
  })

  const original = model.objective.map((c) => new Fraction(c))
  const objective = model.sense === 'min' ? original.map((c) => c.neg()) : original
  if (model.sense === 'min') {
    preparation.push({ kind: 'minimize', original, converted: objective })
  }

  const artificials: string[] = []
  constraints.forEach((constraint, i) => {
    const k = i + 1
    if (constraint.operator === '<=') {
      preparation.push({ kind: 'auxiliary', constraint: i, operator: '<=', slack: `S${k}` })
    } else if (constraint.operator === '>=') {
      preparation.push({ kind: 'auxiliary', constraint: i, operator: '>=', surplus: `e${k}`, artificial: `A${k}` })
      artificials.push(`A${k}`)
    } else {
      preparation.push({ kind: 'auxiliary', constraint: i, operator: '=', artificial: `A${k}` })
      artificials.push(`A${k}`)
    }
  })

  if (artificials.length > 0) {
    preparation.push({ kind: 'big_m_objective', sense: model.sense, objective, artificials })
  }

  return { constraints, objective, preparation }
}

/**
 * Tabla inicial: ≤ suma Sᵢ (básica), ≥ resta eᵢ y suma Aᵢ (básica), = suma Aᵢ (básica).
 * La fila Z tiene −cⱼ en las variables de decisión y +M en las artificiales.
 */
export function buildInitialTableau(objective: Fraction[], constraints: NormalizedConstraint[]): Tableau {
  const variables = objective.map((_, j) => `x${j + 1}`)
  const kinds: ColumnKind[] = objective.map(() => 'decision')
  // Columna de la variable auxiliar de cada restricción (S o e) y de su artificial.
  const auxColumn: (number | null)[] = []
  const artificialColumn: (number | null)[] = []

  constraints.forEach((constraint, i) => {
    if (constraint.operator === '=') {
      auxColumn.push(null)
      return
    }
    auxColumn.push(variables.length)
    variables.push(constraint.operator === '<=' ? `S${i + 1}` : `e${i + 1}`)
    kinds.push(constraint.operator === '<=' ? 'slack' : 'surplus')
  })
  constraints.forEach((constraint, i) => {
    if (constraint.operator === '<=') {
      artificialColumn.push(null)
      return
    }
    artificialColumn.push(variables.length)
    variables.push(`A${i + 1}`)
    kinds.push('artificial')
  })

  const rows = constraints.map((constraint, i) => {
    const row = [...constraint.coefficients, ...kinds.slice(objective.length).map(() => new Fraction(0))]
    const aux = auxColumn[i]
    if (aux !== null) row[aux] = new Fraction(constraint.operator === '<=' ? 1 : -1)
    const artificial = artificialColumn[i]
    if (artificial !== null) row[artificial] = new Fraction(1)
    return row
  })

  const z = kinds.map((kind, j) =>
    kind === 'decision' ? MValue.of(objective[j]).neg() : kind === 'artificial' ? MValue.of(0, 1) : MValue.of(0),
  )

  return {
    variables,
    kinds,
    basis: constraints.map((_, i) => artificialColumn[i] ?? auxColumn[i]!),
    rows,
    rhs: constraints.map((constraint) => constraint.rhs),
    z,
    zRhs: MValue.of(0),
  }
}

/** Z ← Z − M·Rᵢ por cada fila cuya variable básica es artificial. null si no hay artificiales. */
function adjustBigM(tableau: Tableau): BigMAdjustment | null {
  const operations: RowOperation[] = []
  let z = tableau.z
  let zRhs = tableau.zRhs

  tableau.basis.forEach((column, i) => {
    const factor = z[column]
    if (tableau.kinds[column] !== 'artificial' || factor.isZero()) return
    operations.push({ kind: 'eliminate', target: 'Z', source: i, factor })
    z = z.map((v, j) => v.sub(factor.mul(tableau.rows[i][j])))
    zRhs = zRhs.sub(factor.mul(tableau.rhs[i]))
  })

  if (operations.length === 0) return null
  return { before: tableau, operations, after: { ...tableau, z, zRhs } }
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
    after: { variables: tableau.variables, kinds: tableau.kinds, basis, rows, rhs, z, zRhs },
    operations,
  }
}

function finish(
  base: Pick<SimplexResult, 'sense' | 'preparation' | 'initialTableau' | 'bigMAdjustment'>,
  reached: SimplexStatus,
  tableau: Tableau,
  iterations: Iteration[],
): SimplexResult {
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

  let status = reached
  let infeasibleArtificials: string[] | undefined
  if (status === 'optimal') {
    const positive = tableau.basis
      .map((column, i) => ({ column, value: tableau.rhs[i] }))
      .filter(({ column, value }) => tableau.kinds[column] === 'artificial' && value.compare(ZERO) > 0)
      .map(({ column }) => tableau.variables[column])
    if (positive.length > 0) {
      status = 'infeasible'
      infeasibleArtificials = positive
    }
  }

  if (status === 'optimal') {
    const alternatives = tableau.variables.filter(
      (_, j) => tableau.kinds[j] !== 'artificial' && !tableau.basis.includes(j) && tableau.z[j].isZero(),
    )
    if (alternatives.length > 0) warnings.push({ kind: 'multiple_optima', variables: alternatives })
  }

  // La tabla trabaja con Max; si el problema original es Min, la fila Z guarda −Z.
  const zValue = tableau.zRhs.k
  const result: SimplexResult = {
    ...base,
    status,
    iterations,
    finalTableau: tableau,
    values,
    z: base.sense === 'min' ? zValue.neg() : zValue,
    warnings,
  }
  if (infeasibleArtificials) result.infeasibleArtificials = infeasibleArtificials
  return result
}

// ---------------------------------------------------------------------------
// Textos en español. Se generan a partir de los datos para poder mostrarlos en
// decimales o en fracciones según el formato elegido.

const OPERATOR_SYMBOL: Record<Operator, string> = { '<=': '≤', '>=': '≥', '=': '=' }

function coefficientText(value: Fraction, format: NumberFormat): string {
  if (value.equals(1)) return ''
  const text = formatNumber(value, format)
  return text.includes('/') ? `(${text})` : text
}

/** −x1 + x2, 3x1 − 2x2… Omite los términos con coeficiente 0. */
export function formatLinear(coefficients: Fraction[], names: string[], format: NumberFormat = 'decimal'): string {
  let text = ''
  coefficients.forEach((c, j) => {
    if (c.equals(ZERO)) return
    const negative = c.compare(ZERO) < 0
    const term = `${coefficientText(c.abs(), format)}${names[j]}`
    if (text === '') text = negative ? `−${term}` : term
    else text += negative ? ` − ${term}` : ` + ${term}`
  })
  return text === '' ? '0' : text
}

function decisionNames(n: number): string[] {
  return Array.from({ length: n }, (_, j) => `x${j + 1}`)
}

/** Texto de un paso de preparación. */
export function describePreparationStep(step: PreparationStep, format: NumberFormat = 'decimal'): string {
  switch (step.kind) {
    case 'negative_rhs': {
      const { coefficients, operator, rhs } = step.result
      const expression = formatLinear(coefficients, decisionNames(coefficients.length), format)
      return `La restricción ${step.constraint + 1} tiene lado derecho negativo: se multiplica por −1 → ${expression} ${OPERATOR_SYMBOL[operator]} ${formatNumber(rhs, format)}`
    }
    case 'minimize': {
      const names = decisionNames(step.original.length)
      return `Min Z = ${formatLinear(step.original, names, format)} se convierte en Max (−Z) = ${formatLinear(step.converted, names, format)}`
    }
    case 'auxiliary': {
      const label = `Restricción ${step.constraint + 1} (${OPERATOR_SYMBOL[step.operator]})`
      if (step.operator === '<=') return `${label}: se suma ${step.slack}`
      if (step.operator === '>=') return `${label}: se resta ${step.surplus} y se suma ${step.artificial}`
      return `${label}: se suma ${step.artificial}`
    }
    case 'big_m_objective': {
      const objective = formatLinear(step.objective, decisionNames(step.objective.length), format)
      const penalties = step.artificials.map((a) => ` − M${a}`).join('')
      const label = step.sense === 'min' ? 'Max (−Z)' : 'Max Z'
      return `Cada artificial entra en la función objetivo con −M: ${label} = ${objective}${penalties}`
    }
  }
}

function rowLabel(row: number | 'Z'): string {
  return row === 'Z' ? 'Z' : `R${row + 1}`
}

/** "Se divide R1 entre 2 para que el pivote sea 1", "R2 ← R2 − 3·R1", "Z ← Z + 40·R1", "Z ← Z − M·R3". */
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

/** "Z = 36" o, si se minimizó, "Z = −(−Z) = −(−9) = 9". */
export function explainObjectiveValue(result: SimplexResult, format: NumberFormat = 'decimal'): string {
  const z = formatNumber(result.z, format)
  if (result.sense === 'max') return `Z = ${z}`
  return `Z = −(−Z) = −(${formatNumber(result.z.neg(), format)}) = ${z}`
}

/** "El problema no tiene solución factible: la artificial A2 quedó con valor 3 en la solución final". */
export function explainInfeasibility(result: SimplexResult, format: NumberFormat = 'decimal'): string | null {
  const artificials = result.infeasibleArtificials
  if (!artificials || artificials.length === 0) return null
  const prefix = 'El problema no tiene solución factible:'
  if (artificials.length === 1) {
    const [name] = artificials
    return `${prefix} la artificial ${name} quedó con valor ${formatNumber(result.values[name], format)} en la solución final`
  }
  const list = artificials.map((name) => `${name} (${formatNumber(result.values[name], format)})`)
  const joined = `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
  return `${prefix} las artificiales ${joined} quedaron con valor positivo en la solución final`
}
