import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import type { SimplexResult } from '../core/simplex'
import type { Step, StepText } from '../core/steps'
import { subscript } from './text'
import { LEGEND, toneVars, type Tone } from './tone'

interface PlateStripProps {
  steps: Step[]
  texts: StepText[]
  tones: Tone[]
  result: SimplexResult
  current: number
  onGo: (index: number) => void
}

/** Celdas que entinta cada paso en su miniatura: una fila, una columna o ambas (el pivote). */
interface Marks {
  rows: Set<number>
  columns: Set<number>
}

/** Índice de fila de la miniatura: las restricciones y luego Z al final. */
function marksFor(step: Step, result: SimplexResult): Marks {
  const t = step.tableau
  const zRow = t.rows.length
  const rows = new Set<number>()
  const columns = new Set<number>()
  switch (step.kind) {
    case 'enter':
      columns.add(step.enteringColumn!)
      break
    case 'leave':
      rows.add(step.leavingRow!)
      columns.add(step.enteringColumn!)
      break
    case 'scale':
    case 'eliminate':
    case 'objective':
      rows.add(step.changedRow === 'Z' ? zRow : (step.changedRow as number))
      break
    case 'result':
      if (result.status === 'optimal') rows.add(zRow)
      if (result.status === 'unbounded' && step.enteringColumn !== undefined) columns.add(step.enteringColumn)
      if (result.status === 'infeasible') {
        t.basis.forEach((column, i) => {
          if (result.infeasibleArtificials?.includes(t.variables[column])) rows.add(i)
        })
      }
      break
  }
  return { rows, columns }
}

/** Miniatura de la tabla: una celda por número, entintadas las que toca la operación. */
function Thumbnail({ step, marks }: { step: Step; marks: Marks }) {
  const rows = step.tableau.rows.length + 1
  const columns = step.tableau.variables.length + 1
  const leave = step.kind === 'leave'
  return (
    <span aria-hidden className="plate-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: rows * columns }, (_, k) => {
        const r = Math.floor(k / columns)
        const c = k % columns
        // Al salir una variable, la fila y la columna se cruzan en el pivote: solo ese cruce va lleno.
        const inked = leave ? marks.rows.has(r) && marks.columns.has(c) : marks.rows.has(r) || marks.columns.has(c)
        const soft = leave && !inked && (marks.rows.has(r) || marks.columns.has(c))
        return <i key={k} className={inked ? 'ink' : soft ? 'soft' : undefined} />
      })}
    </span>
  )
}

/** Título corto para el pie de la miniatura: sin la explicación, solo la operación. */
function caption(title: string): string {
  return title.replace(/: el pivote ya es 1$/, ' ya es 1')
}

/**
 * Tira de láminas: una miniatura por paso, agrupadas por iteración. Es la navegación del paso a
 * paso: clic o toque en una lámina, flechas del teclado (en la sección), y arrastre o deslizamiento
 * para recorrer la tira cuando no cabe.
 */
export function PlateStrip({ steps, texts, tones, result, current, onGo }: PlateStripProps) {
  const reduce = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const compact = steps.length > 16

  // La lámina actual siempre queda a la vista dentro de la tira, sin mover la página.
  useEffect(() => {
    const box = scroller.current
    const item = box?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!box || !item) return
    const left = item.offsetLeft - box.offsetLeft
    const right = left + item.offsetWidth
    if (left < box.scrollLeft + 24 || right > box.scrollLeft + box.clientWidth - 24) {
      box.scrollTo({ left: left - box.clientWidth / 2 + item.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' })
    }
  }, [current, reduce])

  // Arrastrar con el mouse recorre la tira (con el dedo ya se desliza de forma nativa).
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) event.currentTarget.scrollLeft = d.left - dx
  }
  function endDrag() {
    // El clic que termina un arrastre no debe saltar a otra lámina.
    setTimeout(() => (drag.current = null), 0)
  }

  const groups: { label: string; items: number[] }[] = []
  texts.forEach((text, i) => {
    const last = groups[groups.length - 1]
    if (last && last.label === text.kicker) last.items.push(i)
    else groups.push({ label: text.kicker, items: [i] })
  })

  return (
    <nav aria-label="Láminas del paso a paso" className="plate-strip">
      <div
        ref={scroller}
        className={`plate-scroller ${compact ? 'compact' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {groups.map((group) => (
          <div key={group.label} className="plate-group">
            <div className="plate-group-label">{group.label}</div>
            <ol className="plate-row">
              {group.items.map((i) => {
                const state = i < current ? 'done' : i === current ? 'current' : 'future'
                const vars = toneVars(tones[i])
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={`plate-thumb ${state}`}
                      style={{ '--a': vars.accent } as CSSProperties}
                      aria-current={state === 'current' ? 'step' : undefined}
                      aria-label={`Lámina ${i + 1}: ${subscript(texts[i].title)}`}
                      title={subscript(texts[i].title)}
                      onClick={() => {
                        if (!drag.current?.moved) onGo(i)
                      }}
                    >
                      <Thumbnail step={steps[i]} marks={marksFor(steps[i], result)} />
                      <span className="plate-caption">
                        <span className="plate-number">{i + 1}</span>
                        {!compact && <span className="truncate">{subscript(caption(texts[i].title))}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
      <div className="plate-legend" aria-label="Colores de las operaciones">
        {LEGEND.map(({ tone, label }) => (
          <span key={tone}>
            <i style={{ background: toneVars(tone).accent }} />
            {label}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">← → para avanzar · Inicio y Fin</span>
      </div>
    </nav>
  )
}
