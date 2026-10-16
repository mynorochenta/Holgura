// Paso a paso del método Simplex: una operación por paso.
// Lógica pura: este módulo no depende de React.
//
// A partir del resultado del motor se arma la secuencia que ve el usuario:
//   Preparación: tabla inicial y, con Gran M, cada Z ← Z − M·Rᵢ.
//   Cada iteración: entra, sale (con la columna de razón), pivote a 1, cada "hacer cero" y la fila Z.
//   Resultado: óptimo, soluciones múltiples, infactible, no acotado o límite de iteraciones.
// Cada paso guarda la tabla resultante, la anterior, la fila que cambió y el cálculo de cada celda.

import { Fraction, MValue, formatMValue, formatNumber, type NumberFormat } from './fraction'
import {
  describeOperation,
  explainObjectiveValue,
  type Iteration,
  type RowOperation,
  type SimplexResult,
  type Tableau,
} from './simplex'

export type StepKind = 'initial' | 'enter' | 'leave' | 'scale' | 'eliminate' | 'objective' | 'result'

export type StepGroup = 'preparation' | 'iteration' | 'result'

/** Fila de la tabla: índice de restricción (R1 = 0) o la fila Z. */
export type StepRow = number | 'Z'

/**
 * Cálculo de una celda de la fila que cambia. La columna Solución es `column === variables.length`.
 * scale:     value = previous ÷ divisor
 * eliminate: value = previous − factor × source
 */
export type CellCalculation =
  | { kind: 'scale'; column: number; previous: MValue; value: MValue; divisor: Fraction }
  | { kind: 'eliminate'; column: number; previous: MValue; value: MValue; factor: MValue; source: Fraction }

export interface Step {
  index: number
  group: StepGroup
  /** Número de iteración; 0 en la preparación. */
  iteration: number
  kind: StepKind
  /** Tabla después del paso. */
  tableau: Tableau
  /** Tabla antes del paso (igual a `tableau` si el paso no cambia valores). */
  previous: Tableau
  /** Columna que entra (pasos entra, sale, pivote, hacer cero y fila Z; también en no acotado). */
  enteringColumn?: number
  /** Columnas que empataban como más negativas en Z. */
  enteringTies?: number[]
  /** Fila que sale. */
  leavingRow?: number
  leavingTies?: number[]
  /** Prueba de la razón mínima: RHS ÷ coeficiente, null si el coeficiente no es positivo. */
  ratios?: (Fraction | null)[]
  operation?: RowOperation
  /** Fila cuyos valores cambian en este paso. */
  changedRow?: StepRow
  /** Fila que se usa para el cálculo (la del pivote). */
  sourceRow?: number
  calculations?: CellCalculation[]
  /** La variable básica de `changedRow` cambió en este paso. */
  basisChanged?: boolean
}

const ZERO = new Fraction(0)

/** Aplica una operación de renglón y devuelve la tabla nueva y el cálculo de cada celda. */
export function applyOperation(
  tableau: Tableau,
  operation: RowOperation,
): { tableau: Tableau; calculations: CellCalculation[] } {
  const rows = tableau.rows.map((row) => [...row])
  const rhs = [...tableau.rhs]
  const n = tableau.variables.length

  if (operation.kind === 'scale') {
    const { row, divisor } = operation
    const previous = [...rows[row], rhs[row]]
    const next = previous.map((v) => v.div(divisor))
    rows[row] = next.slice(0, n)
    rhs[row] = next[n]
    const calculations = previous.map(
      (v, column): CellCalculation => ({
        kind: 'scale',
        column,
        previous: MValue.of(v),
        value: MValue.of(next[column]),
        divisor,
      }),
    )
    return { tableau: { ...tableau, rows, rhs }, calculations }
  }

  const { target, source, factor } = operation
  const sourceValues = [...rows[source], rhs[source]]

  if (target === 'Z') {
    const previous = [...tableau.z, tableau.zRhs]
    const next = previous.map((v, j) => v.sub(factor.mul(sourceValues[j])))
    const calculations = previous.map(
      (v, column): CellCalculation => ({
        kind: 'eliminate',
        column,
        previous: v,
        value: next[column],
        factor,
        source: sourceValues[column],
      }),
    )
    return { tableau: { ...tableau, z: next.slice(0, n), zRhs: next[n] }, calculations }
  }

  const k = factor.k
  const previous = [...rows[target], rhs[target]]
  const next = previous.map((v, j) => v.sub(k.mul(sourceValues[j])))
  rows[target] = next.slice(0, n)
  rhs[target] = next[n]
  const calculations = previous.map(
    (v, column): CellCalculation => ({
      kind: 'eliminate',
      column,
      previous: MValue.of(v),
      value: MValue.of(next[column]),
      factor,
      source: sourceValues[column],
    }),
  )
  return { tableau: { ...tableau, rows, rhs }, calculations }
}

function ratiosFor(tableau: Tableau, column: number): (Fraction | null)[] {
  return tableau.rows.map((row, i) => (row[column].compare(ZERO) > 0 ? tableau.rhs[i].div(row[column]) : null))
}

function tiesFor(tableau: Tableau, column: number): number[] {
  return tableau.z.flatMap((v, j) => (v.equals(tableau.z[column]) ? [j] : []))
}

/** Genera la lista de pasos (una operación por paso) a partir del resultado del motor. */
export function buildSteps(result: SimplexResult): Step[] {
  const steps: Omit<Step, 'index'>[] = []
  let current = result.initialTableau

  steps.push({ group: 'preparation', iteration: 0, kind: 'initial', tableau: current, previous: current })

  for (const operation of result.bigMAdjustment?.operations ?? []) {
    if (operation.kind !== 'eliminate') continue
    const applied = applyOperation(current, operation)
    steps.push({
      group: 'preparation',
      iteration: 0,
      kind: 'objective',
      tableau: applied.tableau,
      previous: current,
      operation,
      changedRow: 'Z',
      sourceRow: operation.source,
      calculations: applied.calculations,
    })
    current = applied.tableau
  }

  for (const it of result.iterations) {
    steps.push(...iterationSteps(it, current))
    current = steps[steps.length - 1].tableau
  }

  if (result.status === 'unbounded' && result.unboundedColumn !== undefined) {
    const column = result.unboundedColumn
    steps.push({
      group: 'iteration',
      iteration: result.iterations.length + 1,
      kind: 'enter',
      tableau: current,
      previous: current,
      enteringColumn: column,
      enteringTies: tiesFor(current, column),
    })
    steps.push({
      group: 'result',
      iteration: result.iterations.length + 1,
      kind: 'result',
      tableau: current,
      previous: current,
      enteringColumn: column,
      ratios: ratiosFor(current, column),
    })
  } else {
    steps.push({
      group: 'result',
      iteration: result.iterations.length,
      kind: 'result',
      tableau: current,
      previous: current,
    })
  }

  return steps.map((step, index) => ({ ...step, index }))
}

function iterationSteps(it: Iteration, start: Tableau): Omit<Step, 'index'>[] {
  const base = { group: 'iteration' as const, iteration: it.number, enteringColumn: it.entering }
  const steps: Omit<Step, 'index'>[] = [
    { ...base, kind: 'enter', tableau: start, previous: start, enteringTies: it.enteringTies },
    {
      ...base,
      kind: 'leave',
      tableau: start,
      previous: start,
      leavingRow: it.leaving,
      leavingTies: it.leavingTies,
      ratios: it.ratios,
    },
  ]

  // Pivote a 1: también es el paso en que la variable que entra reemplaza a la que sale en la base.
  const basis = [...start.basis]
  basis[it.leaving] = it.entering
  const withBasis: Tableau = { ...start, basis }
  const scale = it.operations.find((op) => op.kind === 'scale')
  const operation: RowOperation = scale ?? { kind: 'scale', row: it.leaving, divisor: new Fraction(1) }
  const scaled = scale ? applyOperation(withBasis, scale) : { tableau: withBasis, calculations: [] }
  steps.push({
    ...base,
    kind: 'scale',
    tableau: scaled.tableau,
    previous: start,
    leavingRow: it.leaving,
    operation,
    changedRow: it.leaving,
    calculations: scaled.calculations,
    basisChanged: true,
  })

  let current = scaled.tableau
  for (const op of it.operations) {
    if (op.kind !== 'eliminate') continue
    const applied = applyOperation(current, op)
    steps.push({
      ...base,
      kind: op.target === 'Z' ? 'objective' : 'eliminate',
      tableau: applied.tableau,
      previous: current,
      leavingRow: it.leaving,
      operation: op,
      changedRow: op.target,
      sourceRow: op.source,
      calculations: applied.calculations,
    })
    current = applied.tableau
  }
  return steps
}

// ---------------------------------------------------------------------------
// Textos en español. Los nombres de variables van sin subíndices (x1, S2); la interfaz los da formato.

export interface StepText {
  /** "Preparación", "Iteración 2", "Resultado". */
  kicker: string
  /** Título corto: "Entra x1", "R2 ← R2 − 3·R1"… También se usa en la bitácora. */
  title: string
  explanation: string
}

const MINUS = '−'

export function rowLabel(row: StepRow): string {
  return row === 'Z' ? 'Z' : `R${row + 1}`
}

/** "x1", "S1 y S2", "x1, x2 y S3". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** Un operando dentro de un cálculo: lleva paréntesis si es negativo o tiene dos términos. */
function operand(value: MValue, format: NumberFormat): string {
  const text = formatMValue(value, format)
  const compound = value.hasM() && !value.k.equals(ZERO)
  return value.isNegative() || compound ? `(${text})` : text
}

/** "60 = 120 − 3 × 20", "1 = 2 ÷ 2", "−M − 3 = −3 − M × 1". */
export function formatCalculation(calculation: CellCalculation, format: NumberFormat = 'decimal'): string {
  const value = formatMValue(calculation.value, format)
  const previous = formatMValue(calculation.previous, format)
  if (calculation.kind === 'scale') {
    return `${value} = ${previous} ÷ ${operand(MValue.of(calculation.divisor), format)}`
  }
  const factor = operand(calculation.factor, format)
  const source = operand(MValue.of(calculation.source), format)
  return `${value} = ${previous} − ${factor} × ${source}`
}

/** Z − 40x1 − 30x2 = 0, Z − 3x1 − 5x2 + MA3 = 0, Z + (−2M − 3)x1 + … = −10M. */
export function formatObjectiveRow(tableau: Tableau, lhs = 'Z', format: NumberFormat = 'decimal'): string {
  let text = lhs
  tableau.z.forEach((c, j) => {
    if (c.isZero()) return
    const name = tableau.variables[j]
    if (c.hasM() && !c.k.equals(ZERO)) {
      text += ` + (${formatMValue(c, format)})${name}`
      return
    }
    const negative = c.isNegative()
    const magnitude = formatMValue(negative ? c.neg() : c, format)
    const coefficient = magnitude === '1' ? '' : magnitude.includes('/') ? `(${magnitude})` : magnitude
    text += ` ${negative ? MINUS : '+'} ${coefficient}${name}`
  })
  return `${text} = ${formatMValue(tableau.zRhs, format)}`
}

/** target ← target − factor·source sumando o restando |c| veces, con c = −factor. */
function timesPhrase(factor: MValue, format: NumberFormat): { verb: 'suma' | 'resta'; amount: string } {
  const c = factor.neg()
  if (c.hasM() && !c.k.equals(ZERO)) return { verb: 'suma', amount: `(${formatMValue(c, format)}) veces` }
  const negative = c.isNegative()
  const magnitude = formatMValue(negative ? c.neg() : c, format)
  return { verb: negative ? 'resta' : 'suma', amount: magnitude === '1' ? '1 vez' : `${magnitude} veces` }
}

function basicName(tableau: Tableau, row: number): string {
  return tableau.variables[tableau.basis[row]]
}

function kickerFor(step: Step): string {
  if (step.group === 'preparation') return 'Preparación'
  if (step.group === 'result') return 'Resultado'
  return `Iteración ${step.iteration}`
}

/** Título y explicación en español de un paso. */
export function describeStep(step: Step, result: SimplexResult, format: NumberFormat = 'decimal'): StepText {
  const kicker = kickerFor(step)
  const { title, explanation } = describeBody(step, result, format)
  return { kicker, title, explanation }
}

function describeBody(step: Step, result: SimplexResult, format: NumberFormat): Omit<StepText, 'kicker'> {
  const t = step.tableau
  const num = (v: Fraction) => formatNumber(v, format)
  switch (step.kind) {
    case 'initial':
      return { title: 'Tabla inicial', explanation: explainInitial(t, result, format) }

    case 'enter': {
      const column = step.enteringColumn!
      const name = t.variables[column]
      const value = t.z[column]
      let text = `El valor más negativo de la fila Z es ${formatMValue(value, format)}, en la columna ${name}: es la variable que más mejora el objetivo por cada unidad, así que entra a la base.`
      if (value.hasM()) text += ' Como M es un número muy grande, se comparan primero los coeficientes de M.'
      const ties = step.enteringTies ?? []
      if (ties.length > 1) {
        text += ` Hay empate entre ${joinList(ties.map((j) => t.variables[j]))}; se elige ${name} por tener el menor índice.`
      }
      return { title: `Entra ${name}`, explanation: text }
    }

    case 'leave': {
      const column = step.enteringColumn!
      const row = step.leavingRow!
      const ratios = step.ratios!
      const leaving = basicName(t, row)
      const tests = ratios.flatMap((ratio, i) =>
        ratio === null ? [] : [`${num(t.rhs[i])} ÷ ${num(t.rows[i][column])} = ${num(ratio)}`],
      )
      const without = ratios.flatMap((ratio, i) => (ratio === null ? [rowLabel(i)] : []))
      let text = `Se divide la columna Solución entre los coeficientes positivos de ${t.variables[column]}: ${joinList(tests)}.`
      if (without.length === 1) text += ` ${without[0]} no tiene razón porque su coeficiente no es positivo.`
      if (without.length > 1) text += ` ${joinList(without)} no tienen razón porque sus coeficientes no son positivos.`
      text += ` La menor razón indica la restricción que se agota primero: sale ${leaving}. El pivote es ${num(t.rows[row][column])}.`
      const ties = step.leavingTies ?? []
      if (ties.length > 1) {
        text += ` Hay empate entre ${joinList(ties.map((i) => basicName(t, i)))}; se elige ${leaving} por estar en la fila de menor índice. Posible degeneración: una variable básica quedará en 0.`
      }
      return { title: `Sale ${leaving}`, explanation: text }
    }

    case 'scale': {
      const op = step.operation as Extract<RowOperation, { kind: 'scale' }>
      const label = rowLabel(op.row)
      const swap = `${t.variables[t.basis[op.row]]} reemplaza a ${basicName(step.previous, op.row)} en la base.`
      if (op.divisor.equals(1)) {
        return { title: `${label}: el pivote ya es 1`, explanation: `El pivote ya vale 1, así que ${label} no cambia. ${swap}` }
      }
      return {
        title: `${label} ← ${label} ÷ ${operand(MValue.of(op.divisor), format)}`,
        explanation: `${describeOperation(op, format)}. ${swap}`,
      }
    }

    case 'eliminate': {
      const op = step.operation as Extract<RowOperation, { kind: 'eliminate' }>
      const target = rowLabel(op.target)
      const column = t.variables[step.enteringColumn!]
      const { verb, amount } = timesPhrase(op.factor, format)
      return {
        title: describeOperation(op, format),
        explanation: `${target} tiene ${formatMValue(op.factor, format)} en la columna ${column} y debe quedar en 0: se le ${verb} ${amount} la nueva ${rowLabel(op.source)}.`,
      }
    }

    case 'objective': {
      const op = step.operation as Extract<RowOperation, { kind: 'eliminate' }>
      const source = rowLabel(op.source)
      const { verb, amount } = timesPhrase(op.factor, format)
      const factor = formatMValue(op.factor, format)
      const title = describeOperation(op, format)
      if (step.group === 'preparation') {
        const artificial = basicName(t, op.source)
        return {
          title,
          explanation: `${artificial} está en la base, pero tiene ${factor} en la fila Z y una variable básica debe tener 0. Se le ${verb} ${amount} ${source} a la fila Z.`,
        }
      }
      const column = t.variables[step.enteringColumn!]
      const before = formatMValue(step.previous.zRhs, format)
      const after = formatMValue(t.zRhs, format)
      return {
        title,
        explanation: `La fila Z tiene ${factor} en la columna ${column}. Al ${verb === 'suma' ? 'sumarle' : 'restarle'} ${amount} ${source} queda en 0, y la Solución de la fila Z pasa de ${before} a ${after}.`,
      }
    }

    case 'result':
      return describeResult(step, result, format)
  }
}

function explainInitial(t: Tableau, result: SimplexResult, format: NumberFormat): string {
  const parts: string[] = []
  const slacks = t.variables.filter((_, j) => t.kinds[j] === 'slack')
  const surplus = t.variables.filter((_, j) => t.kinds[j] === 'surplus')
  const artificials = t.variables.filter((_, j) => t.kinds[j] === 'artificial')
  // Artificiales de las restricciones = (las que no tienen exceso).
  const equalityArtificials = artificials.filter((a) => !surplus.includes(`e${a.slice(1)}`))
  const geArtificials = artificials.filter((a) => !equalityArtificials.includes(a))

  if (slacks.length === 1) parts.push(`La restricción ≤ suma la holgura ${slacks[0]}, que mide el recurso sin usar.`)
  if (slacks.length > 1) parts.push(`Las restricciones ≤ suman una holgura (${joinList(slacks)}), que mide el recurso sin usar.`)
  if (surplus.length === 1) {
    parts.push(`La restricción ≥ resta el exceso ${surplus[0]} y suma la artificial ${geArtificials[0]}.`)
  }
  if (surplus.length > 1) {
    parts.push(`Las restricciones ≥ restan un exceso (${joinList(surplus)}) y suman una artificial (${joinList(geArtificials)}).`)
  }
  if (equalityArtificials.length === 1) parts.push(`La restricción = suma la artificial ${equalityArtificials[0]}.`)
  if (equalityArtificials.length > 1) {
    parts.push(`Las restricciones = suman una artificial (${joinList(equalityArtificials)}).`)
  }
  parts.push(`La base inicial la forman ${joinList(t.basis.map((j) => t.variables[j]))}.`)

  const minimize = result.sense === 'min'
  const row = formatObjectiveRow(t, minimize ? '−Z' : 'Z', format)
  parts.push(
    minimize
      ? `Como se minimiza, se trabaja con Max (−Z): la última fila es ${row}.`
      : `La función objetivo se escribe como ${row} y ocupa la última fila.`,
  )
  if (artificials.length > 0) {
    parts.push('Cada artificial lleva M, un número muy grande, para que el método la saque de la base.')
  }
  return parts.join(' ')
}

function describeResult(step: Step, result: SimplexResult, format: NumberFormat): Omit<StepText, 'kicker'> {
  const t = step.tableau
  const num = (v: Fraction) => formatNumber(v, format)
  const degenerate = result.warnings.filter((w) => w.kind === 'degeneracy')
  const degeneracyNote =
    degenerate.length > 0
      ? ` Hubo empate en la razón mínima (iteración ${joinList(degenerate.map((w) => String(w.iteration)))}): la solución es degenerada.`
      : ''

  switch (result.status) {
    case 'optimal': {
      const decision = t.variables.filter((_, j) => t.kinds[j] === 'decision')
      const values = joinList(decision.map((name) => `${name} = ${num(result.values[name])}`))
      const z = result.sense === 'min' ? `Como se trabajó con Max (−Z), ${explainObjectiveValue(result, format)}.` : `Z = ${num(result.z)}.`
      let text = `Ya no quedan valores negativos en la fila Z: ninguna variable puede mejorar el resultado. La solución es ${values}. ${z}`
      const multiple = result.warnings.find((w) => w.kind === 'multiple_optima')
      if (multiple) {
        const names = joinList(multiple.variables)
        const one = multiple.variables.length === 1
        text += ` ${names} no ${one ? 'está' : 'están'} en la base y ${one ? 'tiene' : 'tienen'} 0 en la fila Z: puede${one ? '' : 'n'} entrar sin cambiar Z, así que hay soluciones múltiples.`
      }
      return { title: multiple ? 'Soluciones múltiples' : 'Solución óptima', explanation: text + degeneracyNote }
    }
    case 'infeasible': {
      const artificials = result.infeasibleArtificials ?? []
      const list = joinList(artificials.map((a) => `${a} = ${num(result.values[a])}`))
      const one = artificials.length === 1
      return {
        title: 'Sin solución factible',
        explanation: `Ya no quedan valores negativos en la fila Z, pero ${one ? 'la artificial' : 'las artificiales'} ${list} ${one ? 'sigue' : 'siguen'} en la base con valor positivo. Una artificial distinta de 0 significa que su restricción original no se cumple: las restricciones se contradicen y el problema no tiene solución factible.`,
      }
    }
    case 'unbounded': {
      const name = t.variables[step.enteringColumn!]
      return {
        title: 'Problema no acotado',
        explanation: `Ningún coeficiente de la columna ${name} es positivo, así que no hay razón mínima: ninguna restricción limita cuánto puede crecer ${name}. El objetivo mejora sin límite y el problema no está acotado.`,
      }
    }
    case 'iteration_limit':
      return {
        title: 'Límite de iteraciones',
        explanation: `El método no llegó al óptimo dentro de ${result.iterations.length} iteraciones. Puede deberse a un ciclo por degeneración.`,
      }
  }
}
