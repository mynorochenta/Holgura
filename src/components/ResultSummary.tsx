import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import { formatNumber, type Fraction, type NumberFormat } from '../core/fraction'
import type { SimplexResult } from '../core/simplex'
import type { Verification } from '../core/verify'
import type { SolutionReading } from '../examples/reading'
import { MathText, Var } from './MathText'
import { resultTone, toneStyle } from './tone'

function iterationsText(count: number): string {
  return count === 1 ? '1 iteración' : `${count} iteraciones`
}

const STATUS_NAME: Record<string, string> = {
  optimal: 'óptimo',
  infeasible: 'infactible',
  unbounded: 'no acotado',
  iteration_limit: 'sin terminar',
}

function VerificationLine({ verification }: { verification: Verification }) {
  const { external } = verification
  const zText = (z: number) => `Z = ${String(Number(z.toFixed(4))).replace('-', '−')}`
  const outcomeText = (z: number | null, status: string) =>
    z !== null ? `obtuvo ${zText(z)}` : `concluyó que el problema es ${STATUS_NAME[status]}`
  const externalText = outcomeText(external.z, external.status)
  const ownText = outcomeText(verification.ownZ, verification.ownStatus)

  if (verification.matches) {
    return (
      <div className="flex items-start gap-3">
        <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-sel" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12.8c1.7 1.3 3.4 3 4.9 5.2 3-5.6 6.9-10 12.1-13.6" />
        </svg>
        <div>
          <p className="font-medium">Coincide con un solver independiente</p>
          <p className="text-[13px] text-muted">
            javascript-lp-solver resolvió el mismo modelo por su cuenta y <MathText text={externalText} />.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="notice-error flex items-start gap-3">
      <div>
        <p className="font-medium">No coincide con el solver independiente</p>
        <p className="text-[13px]">
          Holgura <MathText text={ownText} />, pero javascript-lp-solver <MathText text={externalText} />. Revisa el
          modelo antes de usar este resultado.
        </p>
      </div>
    </div>
  )
}

/** Valor final: aparece con una transición corta (sin contar desde 0). */
function CountedValue({ value, format }: { value: Fraction; format: NumberFormat }) {
  const reduce = useReducedMotion()
  const text = formatNumber(value, format)
  return (
    <motion.span
      key={text}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {text}
    </motion.span>
  )
}

function ValueTile({
  name,
  value,
  format,
  emphasis = false,
}: {
  name: string
  value: Fraction
  format: NumberFormat
  emphasis?: boolean
}) {
  return (
    <div className={emphasis ? 'pr-6' : ''}>
      <div className="font-display text-[16px] text-muted">
        <MathText text={name} />
      </div>
      <div className={`font-display leading-tight tabular-nums ${emphasis ? 'text-[40px] text-sel-ink' : 'text-[28px]'}`}>
        <CountedValue value={value} format={format} />
      </div>
    </div>
  )
}

/**
 * Tarjeta final: valores de la solución, holguras y verificación con el solver. El estado y su
 * explicación ya están en el texto del último paso, así que aquí no se repiten.
 */
export function ResultSummary({
  result,
  verification,
  format,
  reading,
}: {
  result: SimplexResult
  verification: Verification
  format: NumberFormat
  /** Lectura en el lenguaje del ejemplo, si el modelo resuelto es uno de ellos. */
  reading?: SolutionReading | null
}) {
  const tone = resultTone(result)
  const variables = result.finalTableau.variables
  const decision = variables.filter((_, j) => result.finalTableau.kinds[j] === 'decision')
  const auxiliary = variables.filter((_, j) => ['slack', 'surplus'].includes(result.finalTableau.kinds[j]))
  const solved = result.status === 'optimal'

  return (
    <section
      className="result-card"
      style={toneStyle(tone) as CSSProperties}
      aria-live="polite"
      aria-labelledby="resultado"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="resultado" className="font-display text-[22px] leading-tight font-normal">
          {solved ? 'Valores óptimos' : 'Comprobación'}
        </h3>
        {solved && <span className="text-[13px] text-muted">{iterationsText(result.iterations.length)}</span>}
      </div>

      {reading && (
        <div className="mt-3 max-w-[64ch]">
          <p className="text-[18px] leading-snug text-ink">{reading.headline}</p>
          {reading.details.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[15px] text-muted">
              {reading.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {solved && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
            <div className="col-span-2 sm:col-span-1">
              <ValueTile
                name={result.sense === 'max' ? 'Z máximo' : 'Z mínimo'}
                value={result.z}
                format={format}
                emphasis
              />
            </div>
            {decision.map((name) => (
              <ValueTile key={name} name={name} value={result.values[name]} format={format} />
            ))}
          </div>

          {auxiliary.length > 0 && (
            <div className="mt-4 border-t border-rule pt-3.5">
              <h4 className="block-title">Holguras y excesos</h4>
              <dl className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 font-display text-[16px]">
                {auxiliary.map((name) => (
                  <div key={name} className="flex gap-2">
                    <dt className="text-muted">
                      <Var name={name} />
                    </dt>
                    <dd>= {formatNumber(result.values[name], format)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}

      <div className={solved ? 'mt-5 border-t border-rule pt-4' : 'mt-3'}>
        <VerificationLine verification={verification} />
      </div>
    </section>
  )
}
