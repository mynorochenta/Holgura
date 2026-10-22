import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { forwardRef, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { LiveEquation } from '../components/LiveEquation'
import { OperationLog } from '../components/OperationLog'
import { PreparationCard } from '../components/PreparationCard'
import { ResultSummary } from '../components/ResultSummary'
import { Section } from '../components/Section'
import { TableauView } from '../components/TableauView'
import { Timeline } from '../components/Timeline'
import { MathText } from '../components/MathText'
import { stepTone, toneStyle } from '../components/tone'
import type { NumberFormat } from '../core/fraction'
import type { LinearModel } from '../core/model'
import { solveSimplex } from '../core/simplex'
import { buildSteps, describeStep } from '../core/steps'
import { verify } from '../core/verify'

interface SolutionSectionProps {
  model: LinearModel
  format: NumberFormat
  theme: string
  /** El texto del modelo cambió después de resolver. */
  stale: boolean
  canResolve: boolean
  onResolve: () => void
}

/**
 * Cómo se llegó al paso actual. Solo "step" (un paso hacia adelante) lleva movimiento con
 * significado; "drag" (línea de tiempo) cambia la tabla sin animar.
 */
type Navigation = 'step' | 'jump' | 'drag'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/** Sección 2: preparación, paso a paso con la tabla, línea de tiempo, bitácora y resultado. */
export const SolutionSection = forwardRef<HTMLElement, SolutionSectionProps>(function SolutionSection(
  { model, format, theme, stale, canResolve, onResolve },
  ref,
) {
  const reduce = useReducedMotion()
  const outcome = useMemo(() => {
    try {
      const result = solveSimplex(model)
      return { result, steps: buildSteps(result), verification: verify(model, result), error: null }
    } catch (error) {
      return { result: null, steps: [], verification: null, error: (error as Error).message }
    }
  }, [model])

  // Paso actual y cómo se llegó a él (se actualizan juntos).
  const [view, setView] = useState<{ current: number; navigation: Navigation }>({ current: 0, navigation: 'jump' })
  const [hoverColumn, setHoverColumn] = useState<number | null>(null)
  const total = outcome.steps.length
  const { current, navigation } = view

  /** Va a un paso (index) o avanza/retrocede (delta). Sin "how", un paso adelante cuenta como "step". */
  const go = useCallback(
    (target: { index: number } | { delta: number }, how?: Navigation) => {
      setView((prev) => {
        const wanted = 'index' in target ? target.index : prev.current + target.delta
        const next = Math.max(0, Math.min(total - 1, wanted))
        if (next === prev.current) return prev
        return { current: next, navigation: how ?? (next === prev.current + 1 ? 'step' : 'jump') }
      })
      setHoverColumn(null)
    },
    [total],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowRight') go({ delta: 1 })
      else if (event.key === 'ArrowLeft') go({ delta: -1 })
      else if (event.key === 'Home') go({ index: 0 })
      else if (event.key === 'End') go({ index: total - 1 })
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, total])

  const { result, steps, verification } = outcome
  const texts = useMemo(() => (result ? steps.map((s) => describeStep(s, result, format)) : []), [steps, result, format])
  const tones = useMemo(() => (result ? steps.map((s) => stepTone(s, result)) : []), [steps, result])

  const step = steps[current]
  const tone = tones[current] ?? 'sel'
  const text = texts[current]
  const atEnd = current === total - 1
  const meaningfulMotion = !reduce && navigation === 'step'
  const animateValues = !reduce && navigation !== 'drag'

  const note = stale ? (
    <span className="flex items-center gap-3">
      <span>El modelo cambió</span>
      <button type="button" className="btn px-2.5 py-0.5 text-xs" disabled={!canResolve} onClick={onResolve}>
        Resolver de nuevo
      </button>
    </span>
  ) : (
    <span className="hidden sm:inline">Arrastra la línea de tiempo o usa las flechas del teclado</span>
  )

  return (
    <Section ref={ref} number={2} title="Solución" note={note}>
      <div style={toneStyle(tone) as CSSProperties}>
        <PreparationCard model={model} result={result} format={format} />

        {outcome.error !== null && (
          <div className="mt-6 border-l-[3px] border-err bg-err-t/50 px-4 py-3">
            <p className="font-medium">No se pudo resolver el modelo</p>
            <p className="mt-1 text-[13px]">{outcome.error}</p>
          </div>
        )}

        {result && verification && step && text && (
          <div className="mt-6 grid gap-x-9 gap-y-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div key={current} className={animateValues ? 'fade-up' : undefined} aria-live="polite">
                {/* Título del paso con su iteración en la misma línea, a la derecha. */}
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-display text-[22px] leading-snug font-normal sm:text-[24px]">
                    <MathText text={text.title} />
                  </h3>
                  <span className="text-[13px] text-muted">{text.kicker}</span>
                </div>
                <p className="max-w-[66ch] text-[15.5px]">
                  <MathText text={text.explanation} />
                </p>
              </div>

              <LiveEquation step={step} result={result} format={format} column={hoverColumn} />

              <TableauView
                step={step}
                result={result}
                format={format}
                tone={tone}
                meaningfulMotion={meaningfulMotion}
                animateValues={animateValues}
                theme={theme}
                onHoverColumn={setHoverColumn}
              />

              <Timeline texts={texts} tones={tones} current={current} onGo={(i, dragging) => go({ index: i }, dragging ? 'drag' : 'jump')} />

              <AnimatePresence>
                {atEnd && (
                  <motion.div
                    key="result"
                    className="mt-8"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: 6, transition: { duration: 0.15 } }}
                    transition={{ duration: reduce ? 0 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <ResultSummary result={result} verification={verification} format={format} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Columna derecha: bitácora de operaciones. */}
            <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
              <OperationLog texts={texts} tones={tones} current={current} onGo={(i) => go({ index: i })} />
            </aside>
          </div>
        )}
      </div>
    </Section>
  )
})
