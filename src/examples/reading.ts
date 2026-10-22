// Lectura de la solución en el lenguaje de un ejemplo: qué conviene hacer, cuánto se gana o
// cuesta, y qué pasa con cada recurso. Lógica pura: no depende de React.

import { Fraction, formatNumber } from '../core/fraction'
import type { SimplexResult } from '../core/simplex'
import type { ExampleReading } from './index'

export interface SolutionReading {
  /** "Conviene armar 30 mesas y 40 sillas, con una utilidad máxima de Q2,400." */
  headline: string
  /** Una oración por restricción. */
  details: string[]
}

const money = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 2 })

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

/** Cantidad en decimales cortos ("30", "2.5"), sea cual sea el formato de la pantalla. */
function amount(value: Fraction): string {
  return formatNumber(value, 'decimal')
}

export function readSolution(reading: ExampleReading, result: SimplexResult): SolutionReading | null {
  if (result.status === 'infeasible') {
    return reading.infeasible ? { headline: reading.infeasible, details: [] } : null
  }
  if (result.status !== 'optimal') return null

  const decision: Record<string, string> = {}
  result.finalTableau.variables.forEach((name, j) => {
    if (result.finalTableau.kinds[j] === 'decision') decision[name] = amount(result.values[name])
  })
  const z = money.format(Number(result.z.valueOf()) * (reading.scale ?? 1))
  let headline = `Conviene ${fill(reading.plan, decision)}, con ${fill(reading.objective, { z })}.`
  if (result.warnings.some((w) => w.kind === 'multiple_optima')) {
    headline += ' Es una de varias soluciones con el mismo valor.'
  }

  const details = reading.constraints.map((text, i) => {
    // La holgura (≤) o el exceso (≥) de la restricción i; las igualdades no tienen.
    const auxiliary = result.values[`S${i + 1}`] ?? result.values[`e${i + 1}`]
    if (!auxiliary || auxiliary.equals(0) || !text.loose) return text.tight
    return fill(text.loose, { v: amount(auxiliary) })
  })
  return { headline, details }
}
