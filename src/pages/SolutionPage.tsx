import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { OperationLog } from '../components/OperationLog'
import { PreparationCard } from '../components/PreparationCard'
import { ResultSummary } from '../components/ResultSummary'
import { Segmented } from '../components/Segmented'
import { StepExplanation } from '../components/StepExplanation'
import { StepNav } from '../components/StepNav'
import { TableauView } from '../components/TableauView'
import SpotlightCard from '../components/reactbits/SpotlightCard'
import { TONE_COLORS, stepTone } from '../components/tone'
import type { NumberFormat } from '../core/fraction'
import type { LinearModel } from '../core/model'
import { solveSimplex } from '../core/simplex'
import { buildSteps, describeStep } from '../core/steps'
import { verify } from '../core/verify'

interface SolutionPageProps {
  model: LinearModel
  format: NumberFormat
  onFormatChange: (format: NumberFormat) => void
  onEdit: () => void
}

const STAGGER: Variants = { show: { transition: { staggerChildren: 0.07 } } }
const CARD: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } },
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

export function SolutionPage({ model, format, onFormatChange, onEdit }: SolutionPageProps) {
  const reduce = useReducedMotion()
  const outcome = useMemo(() => {
    try {
      const result = solveSimplex(model)
      return { result, steps: buildSteps(result), verification: verify(model, result), error: null }
    } catch (error) {
      return { result: null, steps: [], verification: null, error: (error as Error).message }
    }
  }, [model])

  const [current, setCurrent] = useState(0)
  const total = outcome.steps.length
  const go = useCallback((index: number) => setCurrent(Math.max(0, Math.min(total - 1, index))), [total])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowRight') setCurrent((i) => Math.min(total - 1, i + 1))
      else if (event.key === 'ArrowLeft') setCurrent((i) => Math.max(0, i - 1))
      else if (event.key === 'Home') setCurrent(0)
      else if (event.key === 'End') setCurrent(total - 1)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  const { result, steps, verification } = outcome
  const texts = useMemo(() => (result ? steps.map((s) => describeStep(s, result, format)) : []), [steps, result, format])
  const tones = useMemo(() => (result ? steps.map((s) => stepTone(s, result)) : []), [steps, result])

  const step = steps[current]
  const tone = tones[current] ?? 'sel'
  const atEnd = current === total - 1

  return (
    <motion.div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-10"
      style={{ '--spot': TONE_COLORS[tone].pastel } as CSSProperties}
      variants={STAGGER}
      initial={reduce ? false : 'hidden'}
      animate="show"
    >
      <motion.div variants={CARD} className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn" onClick={onEdit}>
          ← Editar problema
        </button>
        <Segmented
          label="Formato de los números"
          value={format}
          onChange={onFormatChange}
          options={[
            { value: 'decimal', label: 'Decimales' },
            { value: 'fraction', label: 'Fracciones' },
          ]}
        />
      </motion.div>

      <motion.div variants={CARD} className="mt-5">
        <PreparationCard model={model} result={result} format={format} />
      </motion.div>

      {outcome.error !== null && (
        <motion.section variants={CARD} className="card mt-5 p-5">
          <p className="font-medium">No se pudo resolver el modelo</p>
          <p className="mt-1 text-sm text-tinta-suave">{outcome.error}</p>
        </motion.section>
      )}

      {result && verification && step && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">
          <div className="min-w-0 space-y-5">
            <motion.div variants={CARD}>
              <StepExplanation text={texts[current]} tone={tone} stepKey={current} />
            </motion.div>

            <motion.div variants={CARD}>
              <SpotlightCard>
                <div className="relative">
                  <TableauView step={step} result={result} format={format} tone={tone} />
                  <StepNav current={current} total={total} tone={tone} onGo={go} />
                </div>
              </SpotlightCard>
            </motion.div>

            <AnimatePresence>
              {atEnd && (
                <motion.div
                  key="result"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: 6, transition: { duration: 0.15 } }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <ResultSummary result={result} verification={verification} format={format} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.aside variants={CARD} className="min-w-0 lg:sticky lg:top-5 lg:self-start">
            <OperationLog steps={steps} texts={texts} tones={tones} current={current} onGo={go} />
          </motion.aside>
        </div>
      )}
    </motion.div>
  )
}
