import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { forwardRef, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { LiveEquation } from '../components/LiveEquation'
import { PreparationCard } from '../components/PreparationCard'
import { ResultSummary } from '../components/ResultSummary'
import { Section } from '../components/Section'
import { TableauView } from '../components/TableauView'
import { PlateStrip } from '../components/PlateStrip'
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
      <button type="button" className="btn min-h-8 px-3 text-[13px]" disabled={!canResolve} onClick={onResolve}>
        Resolver de nuevo
      </button>
    </span>
  ) : null

  return (
    <Section ref={ref} number={2} title="Solución" note={note}>
      <div style={toneStyle(tone) as CSSProperties}>
        {outcome.error !== null && (
          <div className="notice-error">
            <p className="font-medium">No se pudo resolver el modelo</p>
            <p className="mt-1 text-[14px]">{outcome.error}</p>
          </div>
        )}

        {result && verification && step && text && (
          <>
            <PlateStrip steps={steps} texts={texts} tones={tones} result={result} current={current} onGo={(i) => go({ index: i })} />

            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div key={current} className={animateValues ? 'fade-up' : undefined} aria-live="polite">
                  <p className="text-[14px] text-muted">
                    Lámina {current + 1} de {total} · {text.kicker}
                  </p>
                  <h3 className="mt-1 font-display text-[30px] leading-tight font-normal text-balance sm:text-[40px]">
                    <MathText text={text.title} />
                  </h3>
                  <p className="mt-2 mb-5 max-w-[68ch] text-[17px]">
                    <MathText text={text.explanation} />
                  </p>
                </div>

                <div className="plate">
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
                  <div className="plate-foot">
                    <span>Los valores tachados son los de la lámina anterior.</span>
                    <span className="hidden sm:inline">← → para avanzar</span>
                  </div>
                </div>

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

              {/* Columna derecha: el modelo resuelto y su preparación, a la vista mientras se avanza. */}
              <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                <PreparationCard model={model} result={result} format={format} />
              </aside>
            </div>
          </>
        )}
      </div>
    </Section>
  )
})
