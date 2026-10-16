import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Step, StepText } from '../core/steps'
import SpotlightCard from './reactbits/SpotlightCard'
import { prettyText } from './text'
import { LEGEND, TONE_CLASS, type Tone } from './tone'

interface OperationLogProps {
  steps: Step[]
  texts: StepText[]
  tones: Tone[]
  current: number
  onGo: (index: number) => void
}

/** Bitácora de operaciones agrupada por iteración; cada renglón lleva a su paso. */
export function OperationLog({ steps, texts, tones, current, onGo }: OperationLogProps) {
  const reduce = useReducedMotion()
  const list = useRef<HTMLOListElement>(null)

  // Mantiene visible el paso actual dentro de la lista (sin mover la página).
  useEffect(() => {
    const container = list.current
    const item = container?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!container || !item) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      container.scrollTo({ top: top - container.clientHeight / 2, behavior: reduce ? 'auto' : 'smooth' })
    }
  }, [current, reduce])

  return (
    <SpotlightCard className="overflow-hidden">
      <div className="relative">
        <h2 className="kicker border-b border-linea px-[18px] py-4">Operaciones</h2>
        <ol ref={list} className="relative max-h-[420px] overflow-y-auto p-2 lg:max-h-[560px]">
          {steps.map((step, i) => {
            const newGroup = i === 0 || texts[i - 1].kicker !== texts[i].kicker
            const state = i < current ? 'done' : i === current ? 'current' : 'future'
            return (
              <li key={step.index}>
                {newGroup && (
                  <div className="px-2.5 pt-3 pb-1 text-[11px] font-medium tracking-[0.08em] text-tinta-suave uppercase">
                    {texts[i].kicker}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onGo(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-[background-color,opacity,transform] duration-200 hover:translate-x-0.5 ${
                    state === 'current' ? TONE_CLASS[tones[i]].pastel : 'hover:bg-suave'
                  } ${state === 'future' ? 'opacity-40 hover:opacity-80' : ''}`}
                >
                  <span className={`size-2 shrink-0 rounded-full ${TONE_CLASS[tones[i]].dot}`} />
                  <span className="font-mono text-[13px]">{prettyText(texts[i].title)}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-linea px-[18px] py-3 text-xs text-tinta-suave">
          {LEGEND.map(({ tone, label }) => (
            <span key={tone} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${TONE_CLASS[tone].dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </SpotlightCard>
  )
}
