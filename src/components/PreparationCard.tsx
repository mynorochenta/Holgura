import type { NumberFormat } from '../core/fraction'
import type { LinearModel } from '../core/model'
import { describeOperation, describePreparationStep, type SimplexResult } from '../core/simplex'
import { formatObjectiveRow } from '../core/steps'
import { ModelPreview } from './ModelPreview'
import SpotlightCard from './reactbits/SpotlightCard'
import { prettyText } from './text'

/** El modelo y su preparación: holguras, excesos, artificiales, Min → Max y ajuste de Gran M. */
export function PreparationCard({
  model,
  result,
  format,
}: {
  model: LinearModel
  result: SimplexResult | null
  format: NumberFormat
}) {
  const lhs = result?.sense === 'min' ? '−Z' : 'Z'
  const adjustment = result?.bigMAdjustment ?? null

  return (
    <SpotlightCard>
      <div className="relative grid gap-x-8 gap-y-4 p-4 sm:p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="modelo">
          <h2 id="modelo" className="kicker">
            Modelo
          </h2>
          <ModelPreview model={model} className="mt-1 text-[15px]" />
        </section>

        {result && (
          <section aria-labelledby="preparacion" className="md:border-l md:border-linea md:pl-8">
            <h2 id="preparacion" className="kicker">
              Preparación
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-[15px]">
              {result.preparation.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-sel-acento" />
                  <span>{prettyText(describePreparationStep(step, format))}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-linea pt-3.5 text-sm">
              <div>
                <dt className="text-tinta-suave">Fila Z inicial</dt>
                <dd className="mt-0.5 overflow-x-auto font-mono whitespace-nowrap">
                  {prettyText(formatObjectiveRow(result.initialTableau, lhs, format))}
                </dd>
              </div>
              {adjustment && (
                <div>
                  <dt className="text-tinta-suave">
                    Ajuste de Gran M:{' '}
                    <span className="font-mono text-tinta">
                      {adjustment.operations.map((op) => describeOperation(op, format)).join(' · ')}
                    </span>
                  </dt>
                  <dd className="mt-1 overflow-x-auto rounded-lg bg-zeta/60 px-2.5 py-1.5 font-mono whitespace-nowrap ring-1 ring-zeta-acento/40">
                    {prettyText(formatObjectiveRow(adjustment.after, lhs, format))}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
    </SpotlightCard>
  )
}
