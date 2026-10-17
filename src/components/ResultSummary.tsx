import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import { formatNumber, type Fraction, type NumberFormat } from '../core/fraction'
import { MAX_ITERATIONS, explainInfeasibility, type SimplexResult } from '../core/simplex'
import type { Verification } from '../core/verify'
import CountUp from './reactbits/CountUp'
import { MathText, Var } from './MathText'
import { joinNames } from './text'
import { resultTone, toneStyle } from './tone'

interface StatusMessage {
  label: string
  title: string
  body: string
  notes: string[]
}

function iterationsText(count: number): string {
  return count === 1 ? '1 iteración' : `${count} iteraciones`
}

function describeStatus(result: SimplexResult, format: NumberFormat): StatusMessage {
  const multiple = result.warnings.find((w) => w.kind === 'multiple_optima')
  const degenerate = result.warnings.filter((w) => w.kind === 'degeneracy')
  const degeneracyNote =
    degenerate.length > 0
      ? `Hubo empate en la razón mínima (iteración ${degenerate.map((w) => w.iteration).join(', ')}): la solución es degenerada, con al menos una variable básica igual a 0.`
      : null

  switch (result.status) {
    case 'optimal': {
      const steps = `Se llegó en ${iterationsText(result.iterations.length)}.`
      if (multiple) {
        const one = multiple.variables.length === 1
        return {
          label: 'Óptimo',
          title: 'Soluciones múltiples',
          body: `Esta es una solución óptima, pero no la única: ${joinNames(multiple.variables)} no ${one ? 'está' : 'están'} en la base y ${one ? 'tiene' : 'tienen'} 0 en la fila Z, así que puede${one ? '' : 'n'} entrar sin cambiar el valor de Z. ${steps}`,
          notes: degeneracyNote ? [degeneracyNote] : [],
        }
      }
      if (degeneracyNote) {
        return {
          label: 'Óptimo',
          title: 'Solución óptima degenerada',
          body: `${degeneracyNote} El valor de Z es óptimo. ${steps}`,
          notes: [],
        }
      }
      return {
        label: 'Óptimo',
        title: 'Solución óptima',
        body: `Ya no quedan valores negativos en la fila Z: ninguna variable puede mejorar el resultado. ${steps}`,
        notes: [],
      }
    }
    case 'infeasible': {
      // "El problema no tiene solución factible: la artificial A2 quedó…" → solo el detalle.
      const detail = explainInfeasibility(result, format)?.split(': ')[1]
      return {
        label: 'Infactible',
        title: 'El problema no tiene solución factible',
        body: `Las restricciones se contradicen: ningún punto las cumple todas a la vez.${detail ? ` Al terminar el método, ${detail}.` : ''}`,
        notes: [],
      }
    }
    case 'unbounded': {
      const column = result.unboundedColumn
      const name = column === undefined ? 'una variable' : result.finalTableau.variables[column]
      return {
        label: 'No acotado',
        title: 'El problema no está acotado',
        body: `${name} puede crecer sin límite: su columna no tiene coeficientes positivos, así que ninguna restricción la detiene y Z mejora indefinidamente.`,
        notes: [],
      }
    }
    case 'iteration_limit':
      return {
        label: 'Sin terminar',
        title: `Se alcanzó el límite de ${MAX_ITERATIONS} iteraciones`,
        body: 'El método no llegó al óptimo dentro del límite. Puede deberse a un ciclo por degeneración.',
        notes: [],
      }
  }
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
        <span className="mt-[7px] h-3 w-[3px] shrink-0 bg-sel" />
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

/** Tarjeta final: estado, valores, Z, holguras y verificación con el solver. */
export function ResultSummary({
  result,
  verification,
  format,
}: {
  result: SimplexResult
  verification: Verification
  format: NumberFormat
}) {
  const status = describeStatus(result, format)
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
      <div className="kicker text-[var(--c-ink)]">{status.label}</div>
      <h3 id="resultado" className="mt-1 font-display text-[25px] leading-tight font-normal">
        {status.title}
      </h3>
      <p className="mt-1.5 max-w-[68ch]">
        <MathText text={status.body} />
      </p>
      {status.notes.map((note) => (
        <p key={note} className="mt-2 max-w-[68ch] text-[13px] text-muted">
          <MathText text={note} />
        </p>
      ))}

      {solved && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
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

      <div className="mt-5 border-t border-rule pt-4">
        <VerificationLine verification={verification} />
      </div>
    </section>
  )
}
