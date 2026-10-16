import { useState } from 'react'
import { ExampleGallery } from '../components/ExampleGallery'
import { ModelPreview } from '../components/ModelPreview'
import { Segmented } from '../components/Segmented'
import { TableEditor } from '../components/TableEditor'
import { TextEditor } from '../components/TextEditor'
import type { LinearModel } from '../core/model'
import type { ParseResult } from '../core/parser'
import type { Example } from '../examples'

export type InputTab = 'text' | 'table'

interface InputPageProps {
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

export function InputPage({
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
}: InputPageProps) {
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resuelve un modelo de programación lineal</h1>
        <p className="mt-2 text-tinta-suave">
          Escribe la función objetivo y las restricciones, o llénalas en una tabla. Holgura aplica el método Simplex
          (con Gran M para ≥ y =) y verifica el resultado con un solver independiente.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card flex min-w-0 flex-col self-start">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-4 py-3 sm:px-5">
            <Segmented
              label="Forma de entrada"
              value={tab}
              onChange={handleTabChange}
              options={[
                { value: 'text', label: 'Escribir' },
                { value: 'table', label: 'Tabla' },
              ]}
            />
            <span className="hidden text-xs text-tinta-suave sm:inline">
              Ctrl + Enter para resolver
            </span>
          </div>

          <div
            className="flex-1 p-4 sm:p-5"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSolve) {
                e.preventDefault()
                onSolve()
              }
            }}
          >
            {tab === 'text' && <TextEditor value={text} onChange={onTextChange} errors={parsed.errors} />}
            {tab === 'table' && !tableBlocked && parsed.model && (
              <TableEditor key={tableKey} initialModel={parsed.model} onChange={handleTableChange} />
            )}
            {tableBlocked && (
              <div className="rounded-xl border border-error-acento/40 bg-error/50 p-4 text-sm">
                <p>El texto tiene errores, así que la tabla no se puede llenar todavía.</p>
                <button type="button" className="btn mt-3" onClick={() => handleTabChange('text')}>
                  Ver los errores en Escribir
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-linea px-4 py-3 sm:px-5">
            {!canSolve && (
              <span className="mr-auto text-sm text-tinta-suave">
                {tab === 'table' && tableInvalid
                  ? 'Hay celdas que no son números.'
                  : `Corrige ${parsed.errors.length === 1 ? 'el error' : 'los errores'} para resolver.`}
              </span>
            )}
            <button type="button" className="btn btn-primary px-5" disabled={!canSolve} onClick={onSolve}>
              Resolver
            </button>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <section className="card p-4 sm:p-5" aria-labelledby="vista-previa">
            <div className="flex items-center justify-between">
              <h2 id="vista-previa" className="kicker">
                Vista previa
              </h2>
              {hasErrors && previewModel && <span className="text-xs text-tinta-suave">Último modelo válido</span>}
            </div>
            {previewModel ? (
              <ModelPreview
                model={previewModel}
                className={`mt-2 text-[15px] transition-opacity duration-200 ${hasErrors ? 'opacity-40' : ''}`}
              />
            ) : (
              <p className="mt-3 text-sm text-tinta-suave">El modelo aparecerá aquí con notación matemática.</p>
            )}
          </section>

          <ExampleGallery activeId={activeExampleId} onSelect={onSelectExample} />
        </aside>
      </div>
    </div>
  )
}
