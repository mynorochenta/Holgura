import type { ReactNode } from 'react'
import { MValue, formatMValue, formatNumber, type NumberFormat } from '../core/fraction'
import type { RowOperation, SimplexResult } from '../core/simplex'
import { formatObjectiveRow, rowLabel, type Step } from '../core/steps'
import { MathText, Var } from './MathText'

interface LiveEquationProps {
  step: Step
  result: SimplexResult
  format: NumberFormat
  /** Columna de la fila que cambió bajo el mouse: la ecuación muestra el cálculo de esa celda. */
  column: number | null
}

/** Operando con paréntesis si es negativo o tiene dos términos (−3, −M + 2). */
function operand(value: MValue, format: NumberFormat): string {
  const text = formatMValue(value, format)
  return value.isNegative() || (value.hasM() && !value.k.equals(0)) ? `(${text})` : text
}

const Hl = ({ children }: { children: ReactNode }) => <span className="eq-hl">{children}</span>
const Arrow = ({ children }: { children: ReactNode }) => <span className="eq-then">→ {children}</span>

function separated(items: ReactNode[]): ReactNode[] {
  return items.flatMap((item, i) => (i === 0 ? [item] : [', ', item]))
}

/** "R2 ← R2 − 3 · R1", "Z ← Z + 40 · R1", "R1 ← R1 ÷ 2". */
function operationRule(operation: RowOperation, format: NumberFormat): ReactNode {
  if (operation.kind === 'scale') {
    const label = rowLabel(operation.row)
    return (
      <>
        <span className="eq-target">{label}</span> ← {label} ÷ {operand(MValue.of(operation.divisor), format)}
      </>
    )
  }
  const target = rowLabel(operation.target)
  const c = operation.factor.neg()
  let sign = '+'
  let magnitude: string
  if (c.hasM() && !c.k.equals(0)) magnitude = `(${formatMValue(c, format)})`
  else {
    sign = c.isNegative() ? '−' : '+'
    magnitude = formatMValue(c.isNegative() ? c.neg() : c, format)
  }
  return (
    <>
      <span className="eq-target">
        <MathText text={target} />
      </span>{' '}
      ← <MathText text={target} /> {sign} {magnitude === '1' ? '' : <MathText text={`${magnitude} · `} />}
      <span className="eq-source">{rowLabel(operation.source)}</span>
    </>
  )
}

function equationBody(step: Step, result: SimplexResult, format: NumberFormat, column: number | null): ReactNode {
  const t = step.tableau
  const num = (v: MValue) => <MathText text={formatMValue(v, format)} />

  switch (step.kind) {
    case 'initial':
      return <MathText text={formatObjectiveRow(t, result.sense === 'min' ? '−Z' : 'Z', format)} />

    case 'enter': {
      const entering = step.enteringColumn!
      const negatives = t.z.flatMap((v, j) =>
        v.isNegative() ? [<span key={j} className={j === entering ? 'eq-hl' : undefined}>{num(v)}</span>] : [],
      )
      return (
        <>
          <span>mín({separated(negatives)})</span> = <Hl>{num(t.z[entering])}</Hl>
          <Arrow>
            entra <Var name={t.variables[entering]} />
          </Arrow>
        </>
      )
    }

    case 'leave': {
      const entering = step.enteringColumn!
      const leaving = step.leavingRow!
      const tests = step.ratios!.flatMap((ratio, i) =>
        ratio === null
          ? []
          : [
              <span key={i} className={i === leaving ? 'eq-hl' : undefined}>
                {formatNumber(t.rhs[i], format)} ÷ {formatNumber(t.rows[i][entering], format)}
              </span>,
            ],
      )
      return (
        <>
          <span>mín({separated(tests)})</span> = <Hl>{formatNumber(step.ratios![leaving]!, format)}</Hl>
          <Arrow>
            sale <Var name={t.variables[t.basis[leaving]]} />
          </Arrow>
        </>
      )
    }

    case 'scale':
    case 'eliminate':
    case 'objective': {
      const calculation = column === null ? undefined : step.calculations?.find((c) => c.column === column)
      if (!calculation) {
        return operationRule(step.operation!, format)
      }
      const value = <Hl>{num(calculation.value)}</Hl>
      const previous = <span className="eq-old">{num(calculation.previous)}</span>
      if (calculation.kind === 'scale') {
        return (
          <>
            {value} = {previous} ÷ {operand(MValue.of(calculation.divisor), format)}
          </>
        )
      }
      return (
        <>
          {value} = {previous} − <MathText text={operand(calculation.factor, format)} /> ×{' '}
          <span className="eq-source">{operand(MValue.of(calculation.source), format)}</span>
        </>
      )
    }

    case 'result':
      switch (result.status) {
        case 'optimal':
          return (
            <>
              ningún valor negativo en la fila <Var name="Z" />
              <Arrow>
                óptimo, <Var name="Z" /> = <Hl>{formatNumber(result.z, format)}</Hl>
              </Arrow>
            </>
          )
        case 'infeasible': {
          const artificials = result.infeasibleArtificials ?? []
          return (
            <>
              {separated(
                artificials.map((a) => (
                  <span key={a}>
                    <Var name={a} /> = <Hl>{formatNumber(result.values[a], format)}</Hl>
                  </span>
                )),
              )}{' '}
              {'>'} 0 en la base
              <Arrow>sin solución factible</Arrow>
            </>
          )
        }
        case 'unbounded':
          return (
            <>
              ningún coeficiente positivo en la columna <Var name={t.variables[step.enteringColumn!]} />
              <Arrow>no acotado</Arrow>
            </>
          )
        case 'iteration_limit':
          return <>límite de {result.iterations.length} iteraciones</>
      }
  }
}

/**
 * Ecuación viva: una franja con el color de la operación muestra la regla del paso. Con el mouse
 * sobre una celda de la fila que cambió, se llena con los números de esa celda (el valor viejo tachado).
 */
export function LiveEquation({ step, result, format, column }: LiveEquationProps) {
  return (
    <div className="live-eq" aria-live="polite">
      <div className="eq-line">{equationBody(step, result, format, column)}</div>
      {column === null && (step.calculations?.length ?? 0) > 0 && (
        <span className="eq-hint">Pasa el mouse o toca una celda de la fila coloreada</span>
      )}
    </div>
  )
}
