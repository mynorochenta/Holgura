import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { StepText } from '../core/steps'
import SpotlightCard from './reactbits/SpotlightCard'
import { prettyText } from './text'
import { TONE_COLORS, type Tone } from './tone'

/** Explicación del paso actual: qué se hace y por qué. */
export function StepExplanation({ text, tone, stepKey }: { text: StepText; tone: Tone; stepKey: number }) {
  const reduce = useReducedMotion()
  return (
    <SpotlightCard className="overflow-hidden">
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        animate={{ backgroundColor: TONE_COLORS[tone].acento }}
        transition={{ duration: reduce ? 0 : 0.35 }}
      />
      <div className="relative min-h-[148px] px-5 py-5 pl-6 sm:px-6 sm:pl-7" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepKey}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -2 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
          >
            <div className="kicker">{text.kicker}</div>
            <h2 className="mt-1 mb-2 font-mono text-lg font-medium sm:text-[22px]">{prettyText(text.title)}</h2>
            <p className="max-w-[72ch] leading-relaxed">{prettyText(text.explanation)}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </SpotlightCard>
  )
}
