import { Fragment, useRef, type ReactNode } from 'react'
import type { ParseError } from '../core/parser'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  errors: ParseError[]
}

const PLACEHOLDER = `max z = 40x1 + 30x2
2x1 + x2 <= 40
3x1 + 4x2 <= 120
x1, x2 >= 0`

// max/min, variables, números, signos de relación, operadores y comentarios.
const TOKEN =
  /(#.*|\/\/.*)|\b(maximizar|minimizar|max|min)\b|(máx|mín)|(\bx\d+\b)|(\d+(?:\.\d+)?|\.\d+)|(<=|>=|≤|≥|=)|([+\-−·*/,:])/gi
const TOKEN_CLASS = ['tk-c', 'tk-k', 'tk-k', 'tk-v', 'tk-n', 'tk-o', 'tk-s']

function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index
    if (index > last) out.push(line.slice(last, index))
    const group = match.slice(1).findIndex((g) => g !== undefined)
    out.push(
      <span key={index} className={TOKEN_CLASS[group]}>
        {match[0]}
      </span>,
    )
    last = index + match[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/**
 * Editor con números de línea y resaltado de sintaxis. Un textarea transparente va encima de un
 * bloque resaltado con el mismo tipo y medidas; la línea con error se subraya con ondas y su número
 * se pinta de rojo. Los mensajes van debajo y cada uno selecciona su línea.
 */
export function TextEditor({ value, onChange, errors }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')
  const lineCount = Math.max(lines.length, 4)
  const errorLines = new Set(errors.map((e) => e.line))

  function syncScroll() {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    if (textarea && highlight) highlight.style.transform = `translateX(${-textarea.scrollLeft}px)`
  }

  function goToLine(line: number) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0)
    const end = start + (lines[line - 1]?.length ?? 0)
    textarea.focus()
    textarea.setSelectionRange(start, end)
  }

  return (
    <div>
      <div className="editor">
        <div aria-hidden className="editor-gutter">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={errorLines.has(i + 1) ? 'text-err-ink' : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="editor-code">
          <div aria-hidden className="editor-highlight">
            <div ref={highlightRef}>
              {lines.map((line, i) => (
                <Fragment key={i}>
                  {errorLines.has(i + 1) && line.trim() ? (
                    <span className="wavy">{highlightLine(line)}</span>
                  ) : (
                    highlightLine(line)
                  )}
                  {'\n'}
                </Fragment>
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
            aria-describedby="editor-mensajes"
          />
        </div>
      </div>

      <div id="editor-mensajes" className="mt-2 min-h-[22px] text-[13px]" aria-live="polite">
        {errors.length === 0 ? (
          <p className="text-muted">Una restricción por línea. Ctrl&nbsp;+&nbsp;Enter para resolver.</p>
        ) : (
          <ul className="space-y-0.5">
            {errors.map((error) => (
              <li key={`${error.line}-${error.message}`} className="fade-up">
                <button
                  type="button"
                  onClick={() => goToLine(error.line)}
                  className="flex cursor-pointer items-baseline gap-2 text-left text-err-ink hover:underline"
                >
                  <span className="font-medium whitespace-nowrap">Línea {error.line}</span>
                  <span>{error.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
