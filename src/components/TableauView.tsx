import { animate } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { MValue, formatMValue, formatNumber, type NumberFormat } from '../core/fraction'
import type { SimplexResult } from '../core/simplex'
import type { CellCalculation, Step, StepRow } from '../core/steps'
import { useRoughAnnotations } from '../hooks/useRoughAnnotations'
import { AnimatedValue } from './AnimatedValue'
import { Var } from './MathText'
import { subscript } from './text'
import { toneStyle, toneVars, type Tone } from './tone'

interface TableauViewProps {
  step: Step
  result: SimplexResult
  format: NumberFormat
  tone: Tone
  /** Movimiento con significado: solo al avanzar un paso hacia adelante. */
  meaningfulMotion: boolean
  /** Animar números y trazos (no al arrastrar la línea de tiempo). */
  animateValues: boolean
  /** Cambia con el tema, para redibujar los trazos a mano con los colores nuevos. */
  theme: string
  onHoverColumn: (column: number | null) => void
}

/** Qué se resalta en la tabla en este paso. */
interface Highlights {
  columns: Set<number>
  columnTone: Tone
  rows: Map<StepRow, Tone>
  pivot: { row: number; column: number } | null
  underlineColumn: number | null
  circlePivot: boolean
}

function highlightsFor(step: Step, result: SimplexResult, tone: Tone): Highlights {
  const h: Highlights = {
    columns: new Set(),
    columnTone: 'sel',
    rows: new Map(),
    pivot: null,
    underlineColumn: null,
    circlePivot: false,
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

/** HTML de una variable para las piezas que viajan (fuera del árbol de React). */
function varHTML(name: string): string {
  const match = /^([A-Za-z])(\d*)$/.exec(name)
  if (!match) return name
  return `<span class="mv">${match[1]}</span>${match[2] ? `<sub>${match[2]}</sub>` : ''}`
}

const EASE_OUT: [number, number, number, number] = [0.3, 0.7, 0.2, 1]
/** El "hacer cero" muestra los números nuevos cuando la franja llega a la fila. */
const BAND_MS = 520
const REVEAL_MS = 400

export function TableauView({
  step,
  result,
  format,
  tone,
  meaningfulMotion,
  animateValues,
  theme,
  onHoverColumn,
}: TableauViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const roughLayer = useRef<HTMLDivElement>(null)
  const motionLayer = useRef<HTMLDivElement>(null)
  useRoughAnnotations(container, roughLayer, `${step.index}-${format}-${theme}`, animateValues)

  const t = step.tableau
  const n = t.variables.length
  const h = highlightsFor(step, result, tone)
  const showRatios = step.ratios !== undefined
  const calculations = new Map<number, CellCalculation>((step.calculations ?? []).map((c) => [c.column, c]))
  const isElimination = step.kind === 'eliminate' || step.kind === 'objective'

  // En "hacer cero" hacia adelante, la fila conserva sus valores viejos mientras baja la franja.
  const delayReveal = meaningfulMotion && isElimination
  const [revealed, setRevealed] = useState(-1)
  const showPrevious = delayReveal && revealed !== step.index
  useEffect(() => {
    if (!delayReveal) return
    const timer = setTimeout(() => setRevealed(step.index), REVEAL_MS)
    return () => clearTimeout(timer)
  }, [delayReveal, step.index])

  // Movimiento con significado: piezas temporales en una capa que React deja vacía.
  useLayoutEffect(() => {
    const root = container.current
    const layer = motionLayer.current
    if (!meaningfulMotion || !root || !layer) return
    const origin = root.getBoundingClientRect()
    const rel = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
    }
    const pieces: HTMLElement[] = []
    const controls: { stop: () => void }[] = []
    let hidden: HTMLElement | null = null

    if (step.kind === 'scale' && step.basisChanged && step.enteringColumn !== undefined) {
      // La variable que entra viaja del encabezado de su columna a la columna Base; la que sale se va.
      const row = step.changedRow as number
      const header = root.querySelector(`[data-head="${step.enteringColumn}"] [data-name]`)
      const basisName = root.querySelector<HTMLElement>(`[data-row="${row}"] [data-basis]`)
      if (header && basisName) {
        const from = rel(header)
        const to = rel(basisName)
        const oldName = step.previous.variables[step.previous.basis[row]]

        const ghost = document.createElement('div')
        ghost.className = 'motion-piece text-muted'
        ghost.innerHTML = varHTML(oldName)
        Object.assign(ghost.style, { left: `${to.x}px`, top: `${to.y}px` })
        layer.appendChild(ghost)
        pieces.push(ghost)
        const fade = animate(ghost, { x: [0, -28], opacity: [1, 0] }, { duration: 0.42, ease: 'easeIn' })
        controls.push(fade)
        fade.then(() => ghost.remove())

        const fly = document.createElement('div')
        fly.className = 'motion-piece text-[var(--c-ink)]'
        fly.innerHTML = varHTML(t.variables[step.enteringColumn])
        Object.assign(fly.style, { left: `${from.x}px`, top: `${from.y}px` })
        layer.appendChild(fly)
        pieces.push(fly)
        hidden = basisName
        basisName.style.opacity = '0'
        const dx = to.x - from.x
        const dy = to.y - from.y
        const flight = animate(
          fly,
          { x: [0, dx * 0.5, dx], y: [0, dy * 0.5 - 26, dy], scale: [1, 1.15, 1] },
          { duration: 0.65, delay: 0.12, ease: EASE_OUT },
        )
        controls.push(flight)
        flight.then(() => {
          basisName.style.opacity = ''
          fly.remove()
        })
      }
    }

    if (isElimination && step.sourceRow !== undefined) {
      // Una franja con el color del pivote viaja de la fila pivote a la fila que cambia.
      const source = root.querySelector(`[data-row="${step.sourceRow}"]`)
      const target = root.querySelector(`[data-row="${String(step.changedRow)}"]`)
      if (source && target) {
        const from = rel(source)
        const to = rel(target)
        const band = document.createElement('div')
        band.className = 'motion-band'
        Object.assign(band.style, { top: `${from.y}px`, height: `${from.h}px`, width: `${root.scrollWidth}px` })
        layer.appendChild(band)
        pieces.push(band)
        const dy = to.y - from.y
        const travel = animate(
          band,
          { y: [0, dy, dy], opacity: [0.85, 0.6, 0] },
          { duration: BAND_MS / 1000, times: [0, 0.75, 1], ease: [0.4, 0, 0.2, 1] },
        )
        controls.push(travel)
        travel.then(() => band.remove())
      }
    }

    return () => {
      controls.forEach((c) => c.stop())
      pieces.forEach((p) => p.remove())
      if (hidden) hidden.style.opacity = ''
    }
    // Solo al llegar a un paso nuevo; el formato o el tema no repiten el movimiento.
  }, [step.index, meaningfulMotion])

  const renderRow = (row: StepRow) => {
    const isZ = row === 'Z'
    const changed = step.changedRow === row
    const source = changed && showPrevious ? step.previous : t
    const values: MValue[] = isZ
      ? [...source.z, source.zRhs]
      : [...source.rows[row].map((v) => MValue.of(v)), MValue.of(source.rhs[row])]
    const isSource = !isZ && step.sourceRow === row
    const rowTone = h.rows.get(row)
    const basisName = isZ ? 'Z' : t.variables[t.basis[row]]
    const previousBasis =
      !isZ && changed && step.basisChanged ? step.previous.variables[step.previous.basis[row]] : null
    const ratio = !isZ && showRatios ? step.ratios![row] : undefined
    const hoverable = changed && calculations.size > 0
    const style = (rowTone ? toneStyle(rowTone) : undefined) as CSSProperties | undefined

    const className = [isZ && 'z-row', rowTone && 'marked', changed && 'changed', isSource && 'source']
      .filter(Boolean)
      .join(' ')

    return (
      <tr
        key={String(row)}
        data-row={String(row)}
        className={className}
        style={style}
        data-rough-color={toneVars(rowTone ?? tone).accent}
      >
        <td className="basis">
          {previousBasis && previousBasis !== basisName && (
            <span className="old-value left">
              <Var name={previousBasis} />
            </span>
          )}
          <span data-basis className="inline-block">
            <Var name={basisName} />
          </span>
        </td>
        {values.map((value, column) => {
          const calculation = changed && !showPrevious ? calculations.get(column) : undefined
          const isPivot = !isZ && h.pivot?.row === row && h.pivot.column === column
          const moved = calculation !== undefined && !calculation.previous.equals(calculation.value)
          const classes = [
            column === n && 'rhs',
            h.columns.has(column) && !rowTone && 'col',
            isPivot && step.kind === 'leave' && 'pivot',
            hoverable && 'cell',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <td
              key={column}
              className={classes}
              style={h.columns.has(column) && !rowTone ? (toneStyle(h.columnTone) as CSSProperties) : undefined}
              tabIndex={hoverable ? 0 : undefined}
              aria-label={
                hoverable
                  ? `${subscript(column === n ? 'Solución' : t.variables[column])}: ${formatMValue(value, format)}`
                  : undefined
              }
              onPointerEnter={hoverable ? () => onHoverColumn(column) : undefined}
              onFocus={hoverable ? () => onHoverColumn(column) : undefined}
              onClick={hoverable ? () => onHoverColumn(column) : undefined}
            >
              {moved && <span className="old-value">{formatMValue(calculation.previous, format)}</span>}
              <span
                className="inline-block"
                data-rough={isPivot && h.circlePivot ? 'circle' : undefined}
                data-rough-color={toneVars(tone).accent}
              >
                <AnimatedValue
                  value={value}
                  format={format}
                  animated={animateValues}
                  delay={changed ? column * 0.04 : 0}
                />
              </span>
            </td>
          )
        })}
        {showRatios && (
          <td className={`ratio ${row === step.leavingRow ? 'min' : ''}`}>
            {ratio === undefined ? null : ratio === null ? '—' : formatNumber(ratio, format)}
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="tableau-wrap">
      <div ref={container} className="relative w-max min-w-full" onPointerLeave={() => onHoverColumn(null)}>
        <table className="tableau">
          <thead>
            <tr>
              <th>Base</th>
              {t.variables.map((name, column) => (
                <th
                  key={name}
                  data-head={column}
                  className={h.columns.has(column) ? 'col' : undefined}
                  style={h.columns.has(column) ? (toneStyle(h.columnTone) as CSSProperties) : undefined}
                >
                  <span
                    data-name
                    className="inline-block"
                    data-rough={h.underlineColumn === column ? 'underline' : undefined}
                    data-rough-color={toneVars(h.columnTone).accent}
                  >
                    <Var name={name} />
                  </span>
                </th>
              ))}
              <th className="rhs font-sans text-[13px] text-muted">Solución</th>
              {showRatios && <th className="ratio font-sans text-[13px]">Razón</th>}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((_, i) => renderRow(i))}
            {renderRow('Z')}
          </tbody>
        </table>
        <div ref={roughLayer} aria-hidden className="pointer-events-none absolute inset-0" />
        <div ref={motionLayer} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>
    </div>
  )
}
