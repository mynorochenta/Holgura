import type { NumberFormat } from '../core/fraction'
import type { LinearModel } from '../core/model'
import { describeOperation, describePreparationStep, type SimplexResult } from '../core/simplex'
import { formatObjectiveRow } from '../core/steps'
import { ModelPreview } from './ModelPreview'
import { MathText } from './MathText'

/** El modelo resuelto y su preparación: holguras, excesos, artificiales, Min → Max y ajuste de Gran M. */
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
    <div className="grid gap-x-9 gap-y-4 border-b border-rule pb-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section aria-labelledby="modelo-resuelto">
        <h3 id="modelo-resuelto" className="kicker">
          Modelo
        </h3>
        <ModelPreview model={model} className="text-[15px]" />
      </section>

      {result && (
        <section aria-labelledby="preparacion" className="md:border-l md:border-rule md:pl-9">
          <h3 id="preparacion" className="kicker">
            Preparación
          </h3>
          <ul className="mt-2 space-y-1">
            {result.preparation.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[9px] h-[1.5px] w-2 shrink-0 bg-muted" />
                <span>
                  <MathText text={describePreparationStep(step, format)} />
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3.5 space-y-2 border-t border-rule pt-3 text-[13px]">
            <div>
              <dt className="text-muted">Fila Z inicial</dt>
              <dd className="mt-0.5 overflow-x-auto font-display text-[16px] whitespace-nowrap">
                <MathText text={formatObjectiveRow(result.initialTableau, lhs, format)} />
              </dd>
            </div>
            {adjustment && (
              <div>
                <dt className="text-muted">
                  Ajuste de Gran M:{' '}
                  <span className="font-display text-[15px] text-ink">
                    <MathText text={adjustment.operations.map((op) => describeOperation(op, format)).join(' · ')} />
                  </span>
                </dt>
                <dd className="mt-1 overflow-x-auto border-l-[3px] border-zeta bg-zeta-t/60 px-2.5 py-1 font-display text-[16px] whitespace-nowrap">
                  <MathText text={formatObjectiveRow(adjustment.after, lhs, format)} />
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  )
}
