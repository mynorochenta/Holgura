// Convierte texto (p. ej. "max z = 3x1 + 5x2") en un modelo, y un modelo en texto.
// Lógica pura: este módulo no depende de React.
//
// Formato:
//   max z = 40x1 + 30x2        ← primera línea: max o min y la función objetivo
//   2x1 + x2 <= 40             ← una restricción por línea: ≤, ≥ o =
//   3x1 + 4x2 <= 120
//   x1, x2 >= 0                ← opcional (no negatividad)
// Se aceptan ≤ ≥ y <= >=, decimales (1.5), fracciones (3/2), coeficientes negativos,
// espacios opcionales, "*" entre coeficiente y variable, comentarios con # o //.

import { Fraction } from './fraction'
import type { Constraint, LinearModel, NumberInput, Operator, Sense } from './model'

export interface ParseError {
  /** Línea del texto, empezando en 1. */
  line: number
  message: string
}

export interface ParseResult {
  /** null si hubo errores. */
  model: LinearModel | null
  errors: ParseError[]
}

/** "Línea 3: falta el signo ≤, ≥ o =" */
export function formatParseError(error: ParseError): string {
  return `Línea ${error.line}: ${error.message}`
}

const OBJECTIVE_RE = /^(maximizar|minimizar|max|min|máx|mín)(?=[\sz:]|$)\s*(?:z\s*[=:]|[:])?\s*(.*)$/i
const SUBJECT_TO_RE = /^(s\.?\s*a\.?|sujeto a|subject to|s\.?\s*t\.?)\s*:?$/i
const NUMBER_RE = /^(\d+(?:\.\d+)?|\.\d+)(?:\/(\d+(?:\.\d+)?))?$/
const TERM_RE = /^([+-]*)(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?|\.\d+)?\*?x(\d+)$/i
const VARIABLE_LIST_RE = /^x\d+(,x\d+)*$/i

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/** Unifica símbolos: ≤ → <=, − → -, x₁ → x1, quita espacios y "·". */
function normalize(line: string): string {
  return line
    .replace(/[₀-₉]/g, (d) => String(SUBSCRIPTS.indexOf(d)))
    .replace(/≤|=</g, '<=')
    .replace(/≥|=>/g, '>=')
    .replace(/[−–]/g, '-')
    .replace(/·/g, '*')
    .replace(/\s+/g, '')
}

function stripComment(line: string): string {
  return line.replace(/(#|\/\/).*$/, '')
}

/** Número sin signo ("40", "1.5", "3/2") a fracción; null si no es válido. */
function parseUnsigned(text: string): Fraction | null {
  const match = NUMBER_RE.exec(text)
  if (!match) return null
  if (match[2] !== undefined && Number(match[2]) === 0) return null
  return new Fraction(match[1]).div(match[2] ?? 1)
}

function signOf(signs: string): number {
  return [...signs].filter((s) => s === '-').length % 2 === 0 ? 1 : -1
}

type LinearParse =
  | { ok: true; terms: Map<number, Fraction> }
  | { ok: false; message: string }

/** "2x1+x2-3x1" → {1: −1, 2: 1}. Los términos repetidos se suman. */
function parseLinear(expression: string): LinearParse {
  if (expression === '') return { ok: false, message: 'falta la expresión con las variables' }
  const chunks = expression.match(/[+-]*[^+-]+|[+-]+$/g) ?? []
  const terms = new Map<number, Fraction>()

  for (const chunk of chunks) {
    const match = TERM_RE.exec(chunk)
    if (!match) {
      const bare = chunk.replace(/^[+-]+/, '')
      if (parseUnsigned(bare) !== null) {
        return { ok: false, message: `el término «${bare}» no tiene variable; pasa las constantes al lado derecho` }
      }
      if (bare === '') return { ok: false, message: 'hay un signo + o − sin término' }
      return { ok: false, message: `no se reconoce «${bare}»; escribe los términos como 3x1, −x2 o 1.5x3` }
    }
    const [, signs, coefficientText, indexText] = match
    const index = Number(indexText)
    if (index === 0) return { ok: false, message: 'las variables se numeran desde x1' }
    const magnitude = coefficientText === undefined ? new Fraction(1) : parseUnsigned(coefficientText)
    if (magnitude === null) return { ok: false, message: `el coeficiente «${coefficientText}» no es válido` }
    const value = magnitude.mul(signOf(signs))
    terms.set(index, (terms.get(index) ?? new Fraction(0)).add(value))
  }
  return { ok: true, terms }
}

type RhsParse = { ok: true; value: Fraction } | { ok: false; message: string }

function parseRhs(text: string): RhsParse {
  if (text === '') return { ok: false, message: 'falta el número del lado derecho' }
  const match = /^([+-]*)(.*)$/.exec(text)!
  const value = parseUnsigned(match[2])
  if (value !== null) return { ok: true, value: value.mul(signOf(match[1])) }
  if (/x/i.test(text)) {
    return { ok: false, message: 'el lado derecho debe ser un número; pasa las variables al lado izquierdo' }
  }
  return { ok: false, message: `el lado derecho «${text}» no es un número` }
}

/** Celda de la tabla: "", "−3", "1.5", "3/2"… La celda vacía vale 0. null si no es un número. */
export function parseNumber(text: string): Fraction | null {
  const value = normalize(text)
  if (value === '') return new Fraction(0)
  const rhs = parseRhs(value)
  return rhs.ok ? rhs.value : null
}

/** 3/2 → "1.5"; 1/3 → "1/3" (sin decimales periódicos). */
export function toInputText(value: Fraction): string {
  const decimal = value.toString()
  return decimal.includes('(') ? value.toFraction() : decimal
}

const OPERATOR_PATTERN = /<=|>=|=|<|>/g

/** Lee el texto completo. Devuelve el modelo o la lista de errores con su número de línea. */
export function parseModel(text: string): ParseResult {
  const errors: ParseError[] = []
  let sense: Sense | null = null
  let objective: Map<number, Fraction> | null = null
  let objectiveLine = 0
  const constraints: { terms: Map<number, Fraction>; operator: Operator; rhs: Fraction }[] = []
  let declared = 0

  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const lineNumber = i + 1
    const line = normalize(stripComment(raw))
    if (line === '') return
    const fail = (message: string) => errors.push({ line: lineNumber, message })

    const spaced = stripComment(raw).trim()
    const objectiveMatch = OBJECTIVE_RE.exec(spaced)
    if (objectiveMatch) {
      if (sense !== null) return fail('solo puede haber una función objetivo (max o min)')
      sense = /^m[aá]x/i.test(objectiveMatch[1]) ? 'max' : 'min'
      objectiveLine = lineNumber
      const expression = normalize(objectiveMatch[2])
      if (expression === '') return fail('falta la función objetivo después de max/min, por ejemplo max z = 3x1 + 5x2')
      const parsed = parseLinear(expression)
      if (!parsed.ok) return fail(parsed.message)
      objective = parsed.terms
      return
    }

    if (SUBJECT_TO_RE.test(spaced)) return

    if (sense === null) {
      return fail('la primera línea debe ser la función objetivo y empezar con max o min (ej. max z = 3x1 + 5x2)')
    }

    const operators = line.match(OPERATOR_PATTERN) ?? []
    if (operators.length === 0) return fail('falta el signo ≤, ≥ o =')
    if (operators.length > 1) return fail('hay más de un signo ≤, ≥ o =; escribe una restricción por línea')
    const symbol = operators[0]!
    if (symbol === '<' || symbol === '>') {
      return fail(`usa ${symbol === '<' ? '≤ (<=)' : '≥ (>=)'}; las desigualdades estrictas no se usan en programación lineal`)
    }
    const operator = symbol as Operator
    const [left, right] = line.split(symbol)

    // No negatividad: "x1, x2 >= 0" o "x1 >= 0".
    const rhs = parseRhs(right)
    if (VARIABLE_LIST_RE.test(left) && operator === '>=' && rhs.ok && rhs.value.equals(0)) {
      for (const name of left.split(',')) {
        const index = Number(name.slice(1))
        if (index === 0) return fail('las variables se numeran desde x1')
        declared = Math.max(declared, index)
      }
      return
    }
    if (left.includes(',')) return fail('la lista de variables solo se usa para la no negatividad: x1, x2 >= 0')
    if (left === '') return fail('falta el lado izquierdo de la restricción')

    const lhs = parseLinear(left)
    if (!lhs.ok) return fail(lhs.message)
    if (!rhs.ok) return fail(rhs.message)
    constraints.push({ terms: lhs.terms, operator, rhs: rhs.value })
  })

  if (sense === null && errors.length === 0) {
    errors.push({ line: 1, message: 'escribe la función objetivo, por ejemplo max z = 3x1 + 5x2' })
  }
  if (sense !== null && objective !== null && constraints.length === 0 && errors.length === 0) {
    errors.push({ line: objectiveLine + 1, message: 'agrega al menos una restricción, por ejemplo 2x1 + x2 <= 40' })
  }
  if (errors.length > 0 || sense === null || objective === null) return { model: null, errors }

  const finalObjective: Map<number, Fraction> = objective
  const n = Math.max(declared, ...finalObjective.keys(), ...constraints.flatMap((c) => [...c.terms.keys()]))
  const vector = (terms: Map<number, Fraction>): NumberInput[] =>
    Array.from({ length: n }, (_, j) => toInputText(terms.get(j + 1) ?? new Fraction(0)))

  return {
    model: {
      sense,
      objective: vector(finalObjective),
      constraints: constraints.map(
        (c): Constraint => ({ coefficients: vector(c.terms), operator: c.operator, rhs: toInputText(c.rhs) }),
      ),
    },
    errors: [],
  }
}

/** "40x1 + 30x2", "−x1 + 2.5x2"; "0x1" si todos son cero. ASCII para que se pueda editar. */
function linearToText(coefficients: NumberInput[]): string {
  let text = ''
  coefficients.forEach((raw, j) => {
    const c = new Fraction(raw)
    if (c.equals(0)) return
    const magnitude = c.abs()
    const coefficient = magnitude.equals(1) ? '' : toInputText(magnitude)
    const term = `${coefficient}x${j + 1}`
    const negative = c.compare(0) < 0
    if (text === '') text = negative ? `-${term}` : term
    else text += negative ? ` - ${term}` : ` + ${term}`
  })
  return text === '' ? '0x1' : text
}

/** Modelo → texto en el formato que acepta parseModel. Incluye la línea de no negatividad. */
export function modelToText(model: LinearModel): string {
  const n = model.objective.length
  const lines = [`${model.sense} z = ${linearToText(model.objective)}`]
  for (const constraint of model.constraints) {
    lines.push(`${linearToText(constraint.coefficients)} ${constraint.operator} ${toInputText(new Fraction(constraint.rhs))}`)
  }
  lines.push(`${Array.from({ length: n }, (_, j) => `x${j + 1}`).join(', ')} >= 0`)
  return lines.join('\n')
}
