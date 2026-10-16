import { useRef } from 'react'
import { formatParseError, type ParseError } from '../core/parser'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  errors: ParseError[]
}

const LINE_HEIGHT = 26
const PLACEHOLDER = `max z = 40x1 + 30x2
2x1 + x2 <= 40
3x1 + 4x2 <= 120
x1, x2 >= 0`

/**
 * Editor de texto con números de línea. Las líneas con error se marcan en el margen y con un
 * fondo suave detrás del texto; la lista de errores va debajo y cada uno lleva a su línea.
 */
export function TextEditor({ value, onChange, errors }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const lineCount = Math.max(value.split('\n').length, 4)
  const errorLines = new Set(errors.map((e) => e.line))

  function syncScroll() {
    const textarea = textareaRef.current
    const backdrop = backdropRef.current
    if (!textarea || !backdrop) return
    backdrop.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
  }

  function goToLine(line: number) {
    const textarea = textareaRef.current
    if (!textarea) return
    const lines = value.split('\n')
    const start = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0)
    const end = start + (lines[line - 1]?.length ?? 0)
    textarea.focus()
    textarea.setSelectionRange(start, end)
  }

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <div>
      <div className="relative flex overflow-hidden rounded-xl border border-linea bg-hoja transition-colors duration-200 focus-within:border-piv-acento focus-within:shadow-[0_0_0_3px_var(--color-piv)]">
        <div
          aria-hidden
          className="relative w-11 shrink-0 overflow-hidden border-r border-linea bg-suave/60 py-3 font-mono text-xs text-tinta-suave select-none"
        >
          <div style={{ lineHeight: `${LINE_HEIGHT}px` }}>
            {lineNumbers.map((n) => (
              <div key={n} className="relative pr-2.5 text-right">
                {errorLines.has(n) && (
                  <span className="absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full bg-error-acento" />
                )}
                {n}
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden py-3">
            <div ref={backdropRef} style={{ lineHeight: `${LINE_HEIGHT}px` }}>
              {lineNumbers.map((n) => (
                <div key={n} className={errorLines.has(n) ? 'bg-error/70' : ''}>
                  &nbsp;
                </div>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            rows={lineCount}
            placeholder={PLACEHOLDER}
            aria-label="Modelo de programación lineal"
            aria-invalid={errors.length > 0}
            className="relative block w-full resize-none overflow-x-auto bg-transparent px-3.5 py-3 font-mono text-[15px] text-tinta outline-none placeholder:text-tinta-suave/50"
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {errors.map((error) => (
            <li key={`${error.line}-${error.message}`} className="fade-up">
              <button
                type="button"
                onClick={() => goToLine(error.line)}
                className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-error-acento/40 bg-error/50 px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-error"
              >
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-error-acento" />
                <span>{formatParseError(error)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
