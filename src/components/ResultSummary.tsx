import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import { formatNumber, type Fraction, type NumberFormat } from '../core/fraction'
import type { SimplexResult } from '../core/simplex'
import type { Verification } from '../core/verify'
import CountUp from './reactbits/CountUp'
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
        <span aria-hidden className="mt-[7px] h-3 w-[3px] shrink-0 bg-sel" />
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
    <div className="flex items-start gap-3 border-l-[3px] border-err bg-err-t/50 px-3 py-2.5">
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

/** Valor que cuenta desde 0 (Count Up) en decimales; en fracciones, entra con una transición. */
function CountedValue({ value, format }: { value: Fraction; format: NumberFormat }) {
  const reduce = useReducedMotion()
  const text = formatNumber(value, format)
  if (format === 'fraction' || reduce) {
    return (
      <motion.span
        key={text}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.4 }}
      >
        {text}
      </motion.span>
    )
  }
  return <CountUp key={text} to={Number(value.valueOf().toFixed(4))} duration={1} />
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
    <div className={emphasis ? 'border-l-[3px] border-sel bg-sel-t/60 px-4 py-2.5' : 'py-2.5 pl-1'}>
      <div className="font-display text-[15px] text-muted">
        <MathText text={name} />
      </div>
      <div className={`font-display leading-tight tabular-nums ${emphasis ? 'text-[32px]' : 'text-[26px]'}`}>
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
}: {
  result: SimplexResult
  verification: Verification
  format: NumberFormat
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
              <h4 className="kicker">Holguras y excesos</h4>
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
