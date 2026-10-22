import { useState } from 'react'
import { ExampleGallery } from '../components/ExampleGallery'
import { ModelPreview } from '../components/ModelPreview'
import { Section } from '../components/Section'
import { Segmented } from '../components/Segmented'
import { TableEditor } from '../components/TableEditor'
import { TextEditor } from '../components/TextEditor'
import type { LinearModel } from '../core/model'
import type { ParseResult } from '../core/parser'
import type { Example } from '../examples'

export type InputTab = 'text' | 'table'

interface ModelSectionProps {
  text: string
  parsed: ParseResult
  /** Último modelo sin errores, para la vista previa mientras se corrige el texto. */
  lastValidModel: LinearModel | null
  tab: InputTab
  onTabChange: (tab: InputTab) => void
  onTextChange: (text: string) => void
  activeExampleId: string | null
  /** Cambia al cargar un ejemplo, para que la tabla se vuelva a llenar. */
  tableKey: number
  onSelectExample: (example: Example) => void
  onSolve: () => void
}

/** Sección 1: entrada del modelo (texto o tabla), vista previa y ejemplos. */
export function ModelSection({
  text,
  parsed,
  lastValidModel,
  tab,
  onTabChange,
  onTextChange,
  activeExampleId,
  tableKey,
  onSelectExample,
  onSolve,
}: ModelSectionProps) {
  const [tableInvalid, setTableInvalid] = useState(false)
  const hasErrors = parsed.errors.length > 0
  const tableBlocked = tab === 'table' && hasErrors
  const canSolve = !hasErrors && !(tab === 'table' && tableInvalid)

  function handleTableChange(next: string | null) {
    setTableInvalid(next === null)
    if (next !== null) onTextChange(next)
  }

  function handleTabChange(next: InputTab) {
    setTableInvalid(false)
    onTabChange(next)
  }

  const previewModel = parsed.model ?? lastValidModel

  return (
    <Section number={1} title="Modelo" note="Simplex con Gran M para ≥ y =, verificado con un solver independiente">
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div
          className="min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSolve) {
              e.preventDefault()
              onSolve()
            }
          }}
        >
          <div className="mb-3">
            <Segmented
              label="Forma de entrada"
              value={tab}
              onChange={handleTabChange}
              options={[
                { value: 'text', label: 'Escribir' },
                { value: 'table', label: 'Tabla' },
              ]}
            />
          </div>

          {tab === 'text' && <TextEditor value={text} onChange={onTextChange} errors={parsed.errors} />}
          {tab === 'table' && !tableBlocked && parsed.model && (
            <TableEditor key={tableKey} initialModel={parsed.model} onChange={handleTableChange} />
          )}
          {tableBlocked && (
            <div className="notice-error text-[15px]">
              <p>El texto tiene errores, así que la tabla no se puede llenar todavía.</p>
              <button type="button" className="btn mt-2.5" onClick={() => handleTabChange('text')}>
                Ver los errores en Escribir
              </button>
            </div>
          )}

          {/* Vista previa y Resolver comparten fila: se lee el modelo y se resuelve desde el mismo lugar. */}
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-t border-rule pt-4">
            <section aria-labelledby="vista-previa" className="min-w-0 flex-1 basis-[260px]">
              <div className="flex items-baseline gap-3">
                <h3 id="vista-previa" className="block-title">
                  Vista previa
                </h3>
                {hasErrors && previewModel && <span className="text-xs text-muted">Último modelo válido</span>}
              </div>
              {previewModel ? (
                <ModelPreview
                  model={previewModel}
                  className={`model-preview text-[16px] transition-opacity duration-200 ${hasErrors ? 'opacity-40' : ''}`}
                />
              ) : (
                <p className="mt-3 text-[13px] text-muted">El modelo aparecerá aquí con notación matemática.</p>
              )}
            </section>

            <div className="flex flex-col items-end gap-2 pb-1">
              {!canSolve && (
                <span className="text-right text-[13px] text-err-ink" role="status">
                  {tab === 'table' && tableInvalid
                    ? 'Hay celdas que no son números.'
                    : `Corrige ${parsed.errors.length === 1 ? 'el error' : 'los errores'} para resolver.`}
                </span>
              )}
              <button type="button" className="btn btn-primary" disabled={!canSolve} onClick={onSolve}>
                Resolver
              </button>
            </div>
          </div>
        </div>

        <aside className="min-w-0">
          <ExampleGallery activeId={activeExampleId} onSelect={onSelectExample} />
        </aside>
      </div>
    </Section>
  )
}
