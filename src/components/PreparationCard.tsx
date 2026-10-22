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
    <div className="flex flex-col gap-6">
      <section aria-labelledby="modelo-resuelto" className="min-w-0">
        <h3 id="modelo-resuelto" className="block-title">
          Modelo
        </h3>
        <ModelPreview model={model} className="model-preview text-[16px]" />
      </section>

      {result && (
        <section aria-labelledby="preparacion" className="min-w-0 border-t border-rule pt-5">
          <h3 id="preparacion" className="block-title">
            Preparación
          </h3>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {result.preparation.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span aria-hidden className="mt-[11px] h-px w-2.5 shrink-0 bg-muted" />
                <span>
                  <MathText text={describePreparationStep(step, format)} />
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-3 text-[14px]">
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
                <dd className="mt-1 overflow-x-auto rounded-[3px] bg-zeta-t px-2.5 py-1.5 font-display text-[16px] whitespace-nowrap text-zeta-ink">
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
