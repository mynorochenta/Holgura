import { motion, useReducedMotion } from 'motion/react'
import { useRef, type CSSProperties } from 'react'
import { MValue, formatMValue, formatNumber, type NumberFormat } from '../core/fraction'
import type { SimplexResult } from '../core/simplex'
import { formatCalculation, type CellCalculation, type Step } from '../core/steps'
import { useRoughAnnotations } from '../hooks/useRoughAnnotations'
import { AnimatedValue } from './AnimatedValue'
import { subscript } from './text'
import { TONE_COLORS, TRANSPARENT, type Tone } from './tone'

interface TableauViewProps {
  step: Step
  result: SimplexResult
  format: NumberFormat
  tone: Tone
}

/** Qué se resalta en la tabla en este paso. */
interface Highlights {
  /** Columnas pintadas de arriba abajo. */
  columns: Set<number>
  columnTone: Tone
  /** Filas pintadas (índice de restricción o 'Z'). */
  rows: Map<number | 'Z', Tone>
  pivot: { row: number; column: number } | null
  /** Anotaciones a mano. */
  underlineColumn: number | null
  boxRows: Set<number>
  circlePivot: boolean
  roughTone: Tone
}

function highlightsFor(step: Step, result: SimplexResult, tone: Tone): Highlights {
  const h: Highlights = {
    columns: new Set(),
    columnTone: 'sel',
    rows: new Map(),
    pivot: null,
    underlineColumn: null,
    boxRows: new Set(),
    circlePivot: false,
    roughTone: tone,
  }
  const t = step.tableau
  switch (step.kind) {
    case 'enter':
      h.columns.add(step.enteringColumn!)
      h.underlineColumn = step.enteringColumn!
      break
    case 'leave':
      h.columns.add(step.enteringColumn!)
      h.rows.set(step.leavingRow!, 'sel')
      h.pivot = { row: step.leavingRow!, column: step.enteringColumn! }
      h.boxRows.add(step.leavingRow!)
      break
    case 'scale':
      h.rows.set(step.changedRow!, tone)
      h.pivot = { row: step.leavingRow!, column: step.enteringColumn! }
      h.circlePivot = true
      break
    case 'eliminate':
    case 'objective':
      h.rows.set(step.changedRow!, tone)
      break
    case 'result':
      if (result.status === 'unbounded' && step.enteringColumn !== undefined) {
        h.columns.add(step.enteringColumn)
        h.columnTone = tone
        h.underlineColumn = step.enteringColumn
      }
      if (result.status === 'infeasible') {
        t.basis.forEach((column, i) => {
          if (result.infeasibleArtificials?.includes(t.variables[column])) {
            h.rows.set(i, 'error')
            h.boxRows.add(i)
          }
        })
      }
      if (result.status === 'optimal') {
        const multiple = result.warnings.find((w) => w.kind === 'multiple_optima')
        multiple?.variables.forEach((name) => h.columns.add(t.variables.indexOf(name)))
        h.rows.set('Z', 'sel')
      }
      break
  }
  return h
}

const CELL = 'relative px-3.5 pt-4 pb-3 whitespace-nowrap sm:px-4'
const HEAD = 'px-3.5 py-3 text-[13px] font-medium whitespace-nowrap text-tinta-suave sm:px-4'

export function TableauView({ step, result, format, tone }: TableauViewProps) {
  const reduce = useReducedMotion()
  const container = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  useRoughAnnotations(container, layer, `${step.index}-${format}`, !reduce)

  const t = step.tableau
  const n = t.variables.length
  const h = highlightsFor(step, result, tone)
  const roughColor = TONE_COLORS[h.roughTone].acento
  const showRatios = step.ratios !== undefined
  const calculations = new Map<number, CellCalculation>((step.calculations ?? []).map((c) => [c.column, c]))
  const colorTransition = { duration: reduce ? 0 : 0.4, ease: 'easeOut' } as const

  const cellBackground = (row: number | 'Z', column: number | null): string => {
    const rowTone = h.rows.get(row)
    if (rowTone) return TONE_COLORS[rowTone].pastel
    if (column !== null && h.columns.has(column)) return TONE_COLORS[h.columnTone].pastel
    return TRANSPARENT
  }

  const renderRow = (row: number | 'Z') => {
    const isZ = row === 'Z'
    const values: MValue[] = isZ
      ? [...t.z, t.zRhs]
      : [...t.rows[row].map((v) => MValue.of(v)), MValue.of(t.rhs[row])]
    const changed = step.changedRow === row
    const isSource = !isZ && step.sourceRow === row
    const rowTone = h.rows.get(row)
    const basisName = isZ ? 'Z' : subscript(t.variables[t.basis[row]])
    const previousBasis = !isZ && changed && step.basisChanged ? subscript(step.previous.variables[step.previous.basis[row]]) : null

    const baseShadow = changed
      ? `inset 3px 0 0 ${TONE_COLORS[rowTone ?? tone].acento}`
      : isSource
        ? 'inset 3px 0 0 var(--color-linea)'
        : 'none'
    const border: CSSProperties = isZ ? { borderTop: '1.5px solid var(--color-tinta)' } : {}
    const rowBorder = isZ ? '' : 'border-b border-suave'
    const ratio = !isZ && showRatios ? step.ratios![row] : undefined

    return (
      <tr
        key={String(row)}
        data-rough={!isZ && h.boxRows.has(row) ? 'box' : undefined}
        data-rough-color={roughColor}
      >
        <motion.td
          className={`${CELL} ${rowBorder} text-left font-medium transition-shadow duration-300`}
          style={{ boxShadow: baseShadow, ...border }}
          animate={{ backgroundColor: cellBackground(row, null) }}
          transition={colorTransition}
        >
          {previousBasis && previousBasis !== basisName && (
            <span className="absolute top-px left-3.5 text-[11px] text-tinta-suave line-through opacity-80 sm:left-4">
              {previousBasis}
            </span>
          )}
          <span className="inline-block">{basisName}</span>
        </motion.td>
        {values.map((value, column) => {
          const calculation = changed ? calculations.get(column) : undefined
          const isPivot = !isZ && h.pivot?.row === row && h.pivot.column === column
          const isRhs = column === n
          const moved = calculation !== undefined && !calculation.previous.equals(calculation.value)
          const tip = calculation ? formatCalculation(calculation, format) : undefined
          return (
            <motion.td
              key={column}
              className={`${CELL} ${rowBorder} text-right ${isRhs ? 'border-l border-linea' : ''} ${tip ? 'tip cursor-help' : ''} ${moved ? 'font-medium' : ''}`}
              style={{
                ...border,
                boxShadow: isPivot && step.kind === 'leave' ? `inset 0 0 0 2px ${TONE_COLORS.sel.acento}` : undefined,
              }}
              animate={{
                backgroundColor: isPivot && step.kind === 'leave' ? '#ffffff' : cellBackground(row, column),
              }}
              transition={colorTransition}
              data-tip={tip}
              tabIndex={tip ? 0 : undefined}
              aria-label={tip}
            >
              {moved && (
                <span className="absolute top-px right-3.5 text-[11px] font-normal text-tinta-suave line-through opacity-80 sm:right-4">
                  {formatMValue(calculation.previous, format)}
                </span>
              )}
              <span
                className="inline-block"
                data-rough={isPivot && h.circlePivot ? 'circle' : undefined}
                data-rough-color={roughColor}
              >
                <AnimatedValue value={value} format={format} delay={changed ? column * 0.04 : 0} />
              </span>
            </motion.td>
          )
        })}
        {showRatios && (
          <td className={`${CELL} ${rowBorder} min-w-[84px] text-right border-l border-dashed border-linea text-tinta-suave`} style={border}>
            {ratio === undefined ? null : ratio === null ? (
              '—'
            ) : (
              <span
                className={
                  row === step.leavingRow
                    ? 'rounded-md bg-sel px-1.5 py-0.5 font-semibold text-tinta ring-1 ring-sel-acento'
                    : ''
                }
              >
                {formatNumber(ratio, format)}
              </span>
            )}
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto p-2">
      <div ref={container} className="relative w-max min-w-full">
        <table className="w-full border-separate border-spacing-0 font-mono text-[15px] tabular-nums">
          <thead>
            <tr>
              <th className={`${HEAD} border-b border-linea text-left`}>Base</th>
              {t.variables.map((name, column) => (
                <motion.th
                  key={name}
                  className={`${HEAD} border-b border-linea text-right`}
                  animate={{ backgroundColor: h.columns.has(column) ? TONE_COLORS[h.columnTone].pastel : TRANSPARENT }}
                  transition={colorTransition}
                >
                  <span
                    className={h.columns.has(column) ? 'text-tinta' : ''}
                    data-rough={h.underlineColumn === column ? 'underline' : undefined}
                    data-rough-color={roughColor}
                  >
                    {subscript(name)}
                  </span>
                </motion.th>
              ))}
              <th className={`${HEAD} border-b border-l border-linea text-right`}>Solución</th>
              {showRatios && <th className={`${HEAD} border-b border-l border-dashed border-linea text-right`}>Razón</th>}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((_, i) => renderRow(i))}
            {renderRow('Z')}
          </tbody>
        </table>
        <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>
    </div>
  )
}

