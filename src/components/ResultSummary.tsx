import { motion, useReducedMotion } from 'motion/react'
import { formatNumber, type Fraction, type NumberFormat } from '../core/fraction'
import { MAX_ITERATIONS, explainInfeasibility, type SimplexResult } from '../core/simplex'
import type { Verification } from '../core/verify'
import CountUp from './reactbits/CountUp'
import SpotlightCard from './reactbits/SpotlightCard'
import { joinNames, subscript } from './text'
import { TONE_CLASS, resultTone, type Tone } from './tone'

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
        body: `Las restricciones se contradicen: ningún punto las cumple todas a la vez.${detail ? ` Al terminar el método, ${subscript(detail)}.` : ''}`,
        notes: [],
      }
    }
    case 'unbounded': {
      const column = result.unboundedColumn
      const name = column === undefined ? 'una variable' : subscript(result.finalTableau.variables[column])
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
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sel-acento ring-4 ring-sel" />
        <div>
          <p className="font-medium">Coincide con un solver independiente</p>
          <p className="text-sm text-tinta-suave">
            javascript-lp-solver resolvió el mismo modelo por su cuenta y {externalText}.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-error-acento/40 bg-error/50 p-3">
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-error-acento" />
      <div>
        <p className="font-medium">No coincide con el solver independiente</p>
        <p className="text-sm">
          Holgura {ownText}, pero javascript-lp-solver {externalText}. Revisa el modelo antes de usar este resultado.
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
    <div className={emphasis ? 'rounded-xl bg-sel/60 px-4 py-3 ring-1 ring-sel-acento/50' : 'px-1 py-3'}>
      <div className="kicker normal-case">{name}</div>
      <div className={`mt-0.5 font-mono font-medium tabular-nums ${emphasis ? 'text-3xl' : 'text-2xl'}`}>
        <CountedValue value={value} format={format} />
      </div>
    </div>
  )
}

const TONE_BAR: Record<Tone, string> = {
  sel: 'bg-sel-acento',
  piv: 'bg-piv-acento',
  cero: 'bg-cero-acento',
  zeta: 'bg-zeta-acento',
  error: 'bg-error-acento',
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
    <SpotlightCard className="overflow-hidden" aria-live="polite">
      <span className={`absolute inset-y-0 left-0 w-1 ${TONE_BAR[tone]}`} />
      <div className="relative p-5 pl-6 sm:p-6 sm:pl-7">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone].pastel}`}>
          {status.label}
        </span>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{status.title}</h2>
        <p className="mt-1.5 max-w-[68ch] text-tinta-suave">{status.body}</p>
        {status.notes.map((note) => (
          <p key={note} className="mt-2 max-w-[68ch] text-sm text-tinta-suave">
            {note}
          </p>
        ))}

        {solved && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
              <div className="col-span-2 sm:col-span-1">
                <ValueTile
                  name={result.sense === 'max' ? 'Z máximo' : 'Z mínimo'}
                  value={result.z}
                  format={format}
                  emphasis
                />
              </div>
              {decision.map((name) => (
                <ValueTile key={name} name={subscript(name)} value={result.values[name]} format={format} />
              ))}
            </div>

            {auxiliary.length > 0 && (
              <div className="mt-4 border-t border-linea pt-4">
                <h3 className="kicker">Holguras y excesos</h3>
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm">
                  {auxiliary.map((name) => (
                    <div key={name} className="flex gap-2">
                      <dt className="text-tinta-suave">{subscript(name)}</dt>
                      <dd className="tabular-nums">{formatNumber(result.values[name], format)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </>
        )}

        <div className="mt-6 border-t border-linea pt-5">
          <VerificationLine verification={verification} />
        </div>
      </div>
    </SpotlightCard>
  )
}
