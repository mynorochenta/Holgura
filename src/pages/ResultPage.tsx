import { useMemo } from 'react'
import { ModelPreview } from '../components/ModelPreview'
import { Segmented } from '../components/Segmented'
import { formatNumber, type NumberFormat } from '../core/fraction'
import type { LinearModel } from '../core/model'
import { MAX_ITERATIONS, explainInfeasibility, solveSimplex, type SimplexResult } from '../core/simplex'
import { verify, type Verification } from '../core/verify'

interface ResultPageProps {
  model: LinearModel
  format: NumberFormat
  onFormatChange: (format: NumberFormat) => void
  onEdit: () => void
}

type Tone = 'sel' | 'cero' | 'error'

const TONE_CLASS: Record<Tone, { bar: string; chip: string }> = {
  sel: { bar: 'bg-sel-acento', chip: 'bg-sel' },
  cero: { bar: 'bg-cero-acento', chip: 'bg-cero' },
  error: { bar: 'bg-error-acento', chip: 'bg-error' },
}

interface StatusMessage {
  label: string
  title: string
  body: string
  tone: Tone
  notes: string[]
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/** x1 → x₁, S12 → S₁₂ */
function subscript(name: string): string {
  return name.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
}

function joinNames(names: string[]): string {
  const pretty = names.map(subscript)
  return pretty.length === 1 ? pretty[0] : `${pretty.slice(0, -1).join(', ')} y ${pretty[pretty.length - 1]}`
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
        return {
          label: 'Óptimo',
          title: 'Soluciones múltiples',
          body: `Esta es una solución óptima, pero no la única: ${joinNames(multiple.variables)} no ${multiple.variables.length === 1 ? 'está' : 'están'} en la base y ${multiple.variables.length === 1 ? 'tiene' : 'tienen'} 0 en la fila Z, así que puede${multiple.variables.length === 1 ? '' : 'n'} entrar sin cambiar el valor de Z. ${steps}`,
          tone: 'sel',
          notes: degeneracyNote ? [degeneracyNote] : [],
        }
      }
      if (degeneracyNote) {
        return {
          label: 'Óptimo',
          title: 'Solución óptima degenerada',
          body: `${degeneracyNote} El valor de Z es óptimo. ${steps}`,
          tone: 'sel',
          notes: [],
        }
      }
      return {
        label: 'Óptimo',
        title: 'Solución óptima',
        body: `Ya no quedan valores negativos en la fila Z: ninguna variable puede mejorar el resultado. ${steps}`,
        tone: 'sel',
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
        tone: 'error',
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
        tone: 'cero',
        notes: [],
      }
    }
    case 'iteration_limit':
      return {
        label: 'Sin terminar',
        title: `Se alcanzó el límite de ${MAX_ITERATIONS} iteraciones`,
        body: 'El método no llegó al óptimo dentro del límite. Puede deberse a un ciclo por degeneración.',
        tone: 'cero',
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

function ValueTile({ name, value, emphasis = false }: { name: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-xl bg-sel/60 px-4 py-3 ring-1 ring-sel-acento/50' : 'px-1 py-3'}>
      <div className="kicker normal-case">{name}</div>
      <div className={`mt-0.5 font-mono font-medium tabular-nums ${emphasis ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
    </div>
  )
}

export function ResultPage({ model, format, onFormatChange, onEdit }: ResultPageProps) {
  const outcome = useMemo(() => {
    try {
      const result = solveSimplex(model)
      return { result, verification: verify(model, result), error: null }
    } catch (error) {
      return { result: null, verification: null, error: (error as Error).message }
    }
  }, [model])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      <section className="card mt-5 p-4 sm:p-5" aria-labelledby="modelo">
        <h2 id="modelo" className="kicker">
          Modelo
        </h2>
        <ModelPreview model={model} className="mt-1 text-[15px]" />
      </section>

      {outcome.error !== null && (
        <section className="card mt-5 p-5">
          <p className="font-medium">No se pudo resolver el modelo</p>
          <p className="mt-1 text-sm text-tinta-suave">{outcome.error}</p>
        </section>
      )}

      {outcome.result && outcome.verification && (
        <ResultCard result={outcome.result} verification={outcome.verification} format={format} />
      )}
    </div>
  )
}

function ResultCard({
  result,
  verification,
  format,
}: {
  result: SimplexResult
  verification: Verification
  format: NumberFormat
}) {
  const status = describeStatus(result, format)
  const tone = TONE_CLASS[status.tone]
  const variables = result.finalTableau.variables
  const decision = variables.filter((_, j) => result.finalTableau.kinds[j] === 'decision')
  const auxiliary = variables.filter((_, j) => ['slack', 'surplus'].includes(result.finalTableau.kinds[j]))
  const solved = result.status === 'optimal'

  return (
    <section className="card fade-up relative mt-5 overflow-hidden" aria-live="polite">
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <div className="p-5 pl-6 sm:p-6 sm:pl-7">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.chip}`}>
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
                  value={formatNumber(result.z, format)}
                  emphasis
                />
              </div>
              {decision.map((name) => (
                <ValueTile key={name} name={subscript(name)} value={formatNumber(result.values[name], format)} />
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
    </section>
  )
}
