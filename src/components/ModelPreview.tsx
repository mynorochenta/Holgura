import katex from 'katex'
import { useMemo } from 'react'
import { Fraction } from '../core/fraction'
import type { LinearModel, NumberInput, Operator } from '../core/model'

const OPERATOR_LATEX: Record<Operator, string> = { '<=': '\\le', '>=': '\\ge', '=': '=' }

function numberLatex(value: Fraction): string {
  const decimal = value.toString()
  if (!decimal.includes('(')) return decimal
  return `${value.compare(0) < 0 ? '-' : ''}\\tfrac{${value.n}}{${value.d}}`
}

/** 40x_1 + 30x_2, con 1 y −1 implícitos y sin términos en 0. */
function linearLatex(coefficients: NumberInput[]): string {
  let latex = ''
  coefficients.forEach((raw, j) => {
    const c = new Fraction(raw)
    if (c.equals(0)) return
    const magnitude = c.abs()
    const term = `${magnitude.equals(1) ? '' : numberLatex(magnitude)}x_{${j + 1}}`
    const negative = c.compare(0) < 0
    if (latex === '') latex = negative ? `-${term}` : term
    else latex += negative ? ` - ${term}` : ` + ${term}`
  })
  return latex === '' ? '0' : latex
}

function modelToLatex(model: LinearModel): string {
  const sense = model.sense === 'max' ? '\\text{Máx}' : '\\text{Mín}'
  const rows = model.constraints.map(
    (c) => `& ${linearLatex(c.coefficients)} ${OPERATOR_LATEX[c.operator]} ${numberLatex(new Fraction(c.rhs))}`,
  )
  const variables = model.objective.map((_, j) => `x_{${j + 1}}`).join(', ')
  if (rows.length > 0) rows[0] = `\\text{s.a.} ${rows[0]}`
  return [
    '\\begin{array}{rl}',
    `${sense}\\; Z = & ${linearLatex(model.objective)} \\\\[4pt]`,
    rows.join(' \\\\ '),
    ` \\\\ & ${variables} \\ge 0`,
    '\\end{array}',
  ].join('\n')
}

interface ModelPreviewProps {
  model: LinearModel
  className?: string
}

/** Modelo con notación matemática (KaTeX). */
export function ModelPreview({ model, className = '' }: ModelPreviewProps) {
  const html = useMemo(
    () => katex.renderToString(modelToLatex(model), { displayMode: true, throwOnError: false, output: 'html' }),
    [model],
  )
  return <div className={`overflow-x-auto text-ink ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
