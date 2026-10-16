import { motion, useReducedMotion } from 'motion/react'
import { TONE_COLORS, type Tone } from './tone'

interface StepNavProps {
  current: number
  total: number
  tone: Tone
  onGo: (index: number) => void
}

/** Anterior / Siguiente, contador y barra de progreso con clic. */
export function StepNav({ current, total, tone, onGo }: StepNavProps) {
  const reduce = useReducedMotion()
  const last = total - 1
  return (
    <div className="relative border-t border-linea">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
        <button type="button" className="btn" disabled={current === 0} onClick={() => onGo(current - 1)}>
          ← Anterior
        </button>
        <button type="button" className="btn btn-primary" disabled={current === last} onClick={() => onGo(current + 1)}>
          Siguiente →
        </button>
        {current < last && (
          <button
            type="button"
            className="cursor-pointer rounded-md px-2 py-1 text-sm text-tinta-suave transition-colors duration-200 hover:text-tinta"
            onClick={() => onGo(last)}
          >
            Ir al resultado
          </button>
        )}
        <span className="ml-auto text-[13px] text-tinta-suave tabular-nums">
          Paso {current + 1} de {total}
        </span>
      </div>
      <div className="flex gap-[3px] px-4 pb-4" role="group" aria-label="Progreso">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir al paso ${i + 1}`}
            aria-current={i === current ? 'step' : undefined}
            onClick={() => onGo(i)}
            className="group flex h-3 flex-1 cursor-pointer items-center"
          >
            <motion.span
              className="block h-1 w-full rounded-full transition-transform duration-150 group-hover:scale-y-[1.8]"
              animate={{
                backgroundColor:
                  i === current ? TONE_COLORS[tone].acento : i < current ? '#a7a2ad' : '#f1ece5',
              }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
