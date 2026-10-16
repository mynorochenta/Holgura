import { useState } from 'react'
import { Fraction } from '../core/fraction'
import type { LinearModel, Operator, Sense } from '../core/model'
import { modelToText, parseNumber, toInputText } from '../core/parser'
import { Segmented } from './Segmented'

interface TableEditorProps {
  /** Modelo con el que arranca la tabla. */
  initialModel: LinearModel
  /** Texto nuevo del modelo, o null si alguna celda no es un número. */
  onChange: (text: string | null) => void
}

interface Draft {
  sense: Sense
  objective: string[]
  constraints: { coefficients: string[]; operator: Operator; rhs: string }[]
}

const MAX_VARIABLES = 8
const MAX_CONSTRAINTS = 12

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '<=', label: '≤' },
  { value: '>=', label: '≥' },
  { value: '=', label: '=' },
]

function toDraft(model: LinearModel): Draft {
  const cell = (v: LinearModel['objective'][number]) => toInputText(new Fraction(v))
  return {
    sense: model.sense,
    objective: model.objective.map(cell),
    constraints: model.constraints.map((c) => ({
      coefficients: c.coefficients.map(cell),
      operator: c.operator,
      rhs: cell(c.rhs),
    })),
  }
}

/** Modelo a partir de las celdas; null si alguna no es un número. */
function fromDraft(draft: Draft): LinearModel | null {
  const cells = [...draft.objective, ...draft.constraints.flatMap((c) => [...c.coefficients, c.rhs])]
  if (cells.some((cell) => parseNumber(cell) === null)) return null
  const value = (cell: string) => toInputText(parseNumber(cell)!)
  return {
    sense: draft.sense,
    objective: draft.objective.map(value),
    constraints: draft.constraints.map((c) => ({
      coefficients: c.coefficients.map(value),
      operator: c.operator,
      rhs: value(c.rhs),
    })),
  }
}

function resize(cells: string[], length: number): string[] {
  return Array.from({ length }, (_, j) => cells[j] ?? '0')
}

interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const buttonClass =
    'size-8 cursor-pointer rounded-md text-base text-tinta-suave transition-all duration-150 hover:bg-hoja hover:text-tinta hover:shadow-hoja active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none'
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm text-tinta-suave">{label}</span>
      <div className="inline-flex items-center rounded-lg bg-suave p-[3px]">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Quitar ${label.toLowerCase()}`}
        >
          −
        </button>
        <span className="w-7 text-center font-mono text-sm tabular-nums">{value}</span>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Agregar ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Entrada en forma de tabla: coeficientes en una grilla y selector ≤ ≥ = por restricción. */
export function TableEditor({ initialModel, onChange }: TableEditorProps) {
  const [draft, setDraft] = useState(() => toDraft(initialModel))
  const n = draft.objective.length
  const m = draft.constraints.length

  function update(next: Draft) {
    setDraft(next)
    const model = fromDraft(next)
    onChange(model ? modelToText(model) : null)
  }

  function setVariables(count: number) {
    update({
      ...draft,
      objective: resize(draft.objective, count),
      constraints: draft.constraints.map((c) => ({ ...c, coefficients: resize(c.coefficients, count) })),
    })
  }

  function setConstraints(count: number) {
    const constraints = Array.from(
      { length: count },
      (_, i) => draft.constraints[i] ?? { coefficients: resize([], n), operator: '<=' as Operator, rhs: '0' },
    )
    update({ ...draft, constraints })
  }

  function setObjective(j: number, text: string) {
    update({ ...draft, objective: draft.objective.map((v, k) => (k === j ? text : v)) })
  }

  function setConstraint(i: number, patch: Partial<Draft['constraints'][number]>) {
    update({ ...draft, constraints: draft.constraints.map((c, k) => (k === i ? { ...c, ...patch } : c)) })
  }

  function setCoefficient(i: number, j: number, text: string) {
    const coefficients = draft.constraints[i].coefficients.map((v, k) => (k === j ? text : v))
    setConstraint(i, { coefficients })
  }

  const invalid = (text: string) => parseNumber(text) === null
  const variables = Array.from({ length: n }, (_, j) => j)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Objetivo"
          value={draft.sense}
          onChange={(sense) => update({ ...draft, sense })}
          options={[
            { value: 'max', label: 'Maximizar' },
            { value: 'min', label: 'Minimizar' },
          ]}
        />
        <Stepper label="Variables" value={n} min={1} max={MAX_VARIABLES} onChange={setVariables} />
        <Stepper label="Restricciones" value={m} min={1} max={MAX_CONSTRAINTS} onChange={setConstraints} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-linea">
        <table className="w-full border-separate border-spacing-0 font-mono text-sm">
          <thead>
            <tr className="text-[13px] text-tinta-suave">
              <th className="sticky left-0 bg-suave px-3 py-2.5 text-left font-medium" />
              {variables.map((j) => (
                <th key={j} className="bg-suave px-2 py-2.5 text-right font-medium">
                  x<sub>{j + 1}</sub>
                </th>
              ))}
              <th className="bg-suave px-2 py-2.5 text-center font-medium">Signo</th>
              <th className="bg-suave px-3 py-2.5 text-right font-medium whitespace-nowrap">Lado derecho</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="sticky left-0 border-b border-linea bg-zeta/50 px-3 py-2 text-left font-medium whitespace-nowrap">
                Z
              </th>
              {variables.map((j) => (
                <td key={j} className="border-b border-linea bg-zeta/25 px-1.5 py-2">
                  <input
                    className="field min-w-16"
                    value={draft.objective[j]}
                    onChange={(e) => setObjective(j, e.target.value)}
                    aria-label={`Coeficiente de x${j + 1} en Z`}
                    aria-invalid={invalid(draft.objective[j])}
                  />
                </td>
              ))}
              <td className="border-b border-linea bg-zeta/25" colSpan={2} />
            </tr>
            {draft.constraints.map((constraint, i) => (
              <tr key={i} className="transition-colors duration-150 hover:bg-suave/60">
                <th className="sticky left-0 bg-hoja px-3 py-2 text-left font-medium text-tinta-suave">R{i + 1}</th>
                {variables.map((j) => (
                  <td key={j} className="px-1.5 py-1.5">
                    <input
                      className="field min-w-16"
                      value={constraint.coefficients[j]}
                      onChange={(e) => setCoefficient(i, j, e.target.value)}
                      aria-label={`Coeficiente de x${j + 1} en la restricción ${i + 1}`}
                      aria-invalid={invalid(constraint.coefficients[j])}
                    />
                  </td>
                ))}
                <td className="px-1.5 py-1.5">
                  <select
                    className="field min-w-14 cursor-pointer text-center"
                    value={constraint.operator}
                    onChange={(e) => setConstraint(i, { operator: e.target.value as Operator })}
                    aria-label={`Signo de la restricción ${i + 1}`}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1.5 py-1.5 pr-3">
                  <input
                    className="field min-w-20"
                    value={constraint.rhs}
                    onChange={(e) => setConstraint(i, { rhs: e.target.value })}
                    aria-label={`Lado derecho de la restricción ${i + 1}`}
                    aria-invalid={invalid(constraint.rhs)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-tinta-suave">
        Todas las variables son no negativas. Acepta decimales (1.5), fracciones (3/2) y negativos; una celda vacía
        vale 0.
      </p>
    </div>
  )
}
