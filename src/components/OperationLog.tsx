import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, type CSSProperties } from 'react'
import type { StepText } from '../core/steps'
import { MathText } from './MathText'
import { LEGEND, toneVars, type Tone } from './tone'

interface OperationLogProps {
  texts: StepText[]
  tones: Tone[]
  current: number
  onGo: (index: number) => void
}

/** Bitácora de operaciones agrupada por iteración; cada renglón lleva a su paso. */
export function OperationLog({ texts, tones, current, onGo }: OperationLogProps) {
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
    <section aria-labelledby="bitacora">
      <h3 id="bitacora" className="kicker mb-2">
        Operaciones
      </h3>
      <ol ref={list} className="op-log relative max-h-[380px] overflow-y-auto lg:max-h-[520px]">
        {texts.map((text, i) => {
          const newGroup = i === 0 || texts[i - 1].kicker !== text.kicker
          const state = i < current ? 'done' : i === current ? 'current' : 'future'
          return (
            <li key={i}>
              {newGroup && <div className="op-group">{text.kicker}</div>}
              <button
                type="button"
                onClick={() => onGo(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`op-item ${state}`}
                style={{ '--a': toneVars(tones[i]).accent } as CSSProperties}
              >
                <span className="op-number">{i + 1}</span>
                <span>
                  <MathText text={text.title} />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 border-t border-rule pt-2.5 text-[11px] text-muted">
        {LEGEND.map(({ tone, label }) => (
          <span key={tone} className="flex items-center gap-1.5">
            <span className="h-2.5 w-[3px]" style={{ background: toneVars(tone).accent }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
