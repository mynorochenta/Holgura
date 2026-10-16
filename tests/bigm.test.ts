import { describe, expect, it } from 'vitest'
import type { LinearModel } from '../src/core/model'
import {
  BIG_M_ADJUSTMENT_TITLE,
  describeOperation,
  describePreparationStep,
  explainInfeasibility,
  explainObjectiveValue,
  solveSimplex,
  type SimplexResult,
} from '../src/core/simplex'

function values(result: SimplexResult, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, result.values[name].toFraction()]))
}

describe('a) Min Z = 2x1 + 3x2; x1 + x2 ≥ 4; x1 + 3x2 ≥ 6', () => {
  const result = solveSimplex({
    sense: 'min',
    objective: [2, 3],
    constraints: [
      { coefficients: [1, 1], operator: '>=', rhs: 4 },
      { coefficients: [1, 3], operator: '>=', rhs: 6 },
    ],
  })

  it('x1 = 3, x2 = 1, Z = 9', () => {
    expect(result.status).toBe('optimal')
    expect(values(result, ['x1', 'x2'])).toEqual({ x1: '3', x2: '1' })
    expect(result.z.toFraction()).toBe('9')
  })

  it('convierte Min en Max (−Z) y explica el signo final', () => {
    expect(result.preparation.map((step) => describePreparationStep(step))).toEqual([
      'Min Z = 2x1 + 3x2 se convierte en Max (−Z) = −2x1 − 3x2',
      'Restricción 1 (≥): se resta e1 y se suma A1',
      'Restricción 2 (≥): se resta e2 y se suma A2',
      'Cada artificial entra en la función objetivo con −M: Max (−Z) = −2x1 − 3x2 − MA1 − MA2',
    ])
    expect(explainObjectiveValue(result)).toBe('Z = −(−Z) = −(−9) = 9')
  })

  it('ordena las columnas x, luego e, luego A', () => {
    expect(result.initialTableau.variables).toEqual(['x1', 'x2', 'e1', 'e2', 'A1', 'A2'])
    expect(result.initialTableau.basis.map((j) => result.initialTableau.variables[j])).toEqual(['A1', 'A2'])
  })
})

describe('b) Máx Z = 3x1 + 5x2; x1 ≤ 4; 2x2 ≤ 12; 3x1 + 2x2 = 18', () => {
  const model: LinearModel = {
    sense: 'max',
    objective: [3, 5],
    constraints: [
      { coefficients: [1, 0], operator: '<=', rhs: 4 },
      { coefficients: [0, 2], operator: '<=', rhs: 12 },
      { coefficients: [3, 2], operator: '=', rhs: 18 },
    ],
  }
  const result = solveSimplex(model)

  it('x1 = 2, x2 = 6, Z = 36', () => {
    expect(result.status).toBe('optimal')
    expect(values(result, ['x1', 'x2', 'A3'])).toEqual({ x1: '2', x2: '6', A3: '0' })
    expect(result.z.toFraction()).toBe('36')
    expect(explainObjectiveValue(result)).toBe('Z = 36')
  })

  it('la fila Z inicial tiene +M en la artificial y el ajuste la deja en 0', () => {
    const initial = result.initialTableau
    expect(initial.variables).toEqual(['x1', 'x2', 'S1', 'S2', 'A3'])
    const a3 = initial.variables.indexOf('A3')
    expect(initial.z[a3].m.toFraction()).toBe('1')

    const adjustment = result.bigMAdjustment!
    expect(BIG_M_ADJUSTMENT_TITLE).toBe('Ajuste de la fila Z: las artificiales básicas deben tener 0 en Z')
    expect(adjustment.before).toBe(initial)
    expect(adjustment.operations.map((op) => describeOperation(op))).toEqual(['Z ← Z − M·R3'])
    expect(adjustment.after.z[a3].isZero()).toBe(true)
  })

  it('f) tras el ajuste, x1 y x2 tienen M distinto de cero en la fila Z', () => {
    const z = result.bigMAdjustment!.after.z
    expect(z[0].m.toFraction()).toBe('-3')
    expect(z[0].k.toFraction()).toBe('-3')
    expect(z[1].m.toFraction()).toBe('-2')
    expect(z[1].k.toFraction()).toBe('-5')
    expect(result.bigMAdjustment!.after.zRhs.m.toFraction()).toBe('-18')
  })

  it('la columna A3 sigue visible en todas las tablas', () => {
    for (const it of result.iterations) {
      expect(it.before.variables).toContain('A3')
      expect(it.after.variables).toContain('A3')
    }
  })
})

describe('c) Min Z = 4x1 + x2; 3x1 + x2 = 3; 4x1 + 3x2 ≥ 6; x1 + 2x2 ≤ 4', () => {
  it('x1 = 2/5, x2 = 9/5, Z = 17/5 exactos', () => {
    const result = solveSimplex({
      sense: 'min',
      objective: [4, 1],
      constraints: [
        { coefficients: [3, 1], operator: '=', rhs: 3 },
        { coefficients: [4, 3], operator: '>=', rhs: 6 },
        { coefficients: [1, 2], operator: '<=', rhs: 4 },
      ],
    })
    expect(result.status).toBe('optimal')
    expect(values(result, ['x1', 'x2'])).toEqual({ x1: '2/5', x2: '9/5' })
    expect(result.z.toFraction()).toBe('17/5')
    expect(result.initialTableau.variables).toEqual(['x1', 'x2', 'e2', 'S3', 'A1', 'A2'])
  })
})

describe('d) Infactible: Máx Z = x1 + x2; x1 + x2 ≤ 2; x1 + x2 ≥ 5', () => {
  it('termina con estado infactible y explica qué artificial quedó', () => {
    const result = solveSimplex({
      sense: 'max',
      objective: [1, 1],
      constraints: [
        { coefficients: [1, 1], operator: '<=', rhs: 2 },
        { coefficients: [1, 1], operator: '>=', rhs: 5 },
      ],
    })
    expect(result.status).toBe('infeasible')
    expect(result.infeasibleArtificials).toEqual(['A2'])
    expect(explainInfeasibility(result)).toBe(
      'El problema no tiene solución factible: la artificial A2 quedó con valor 3 en la solución final',
    )
    expect(result.warnings.some((w) => w.kind === 'multiple_optima')).toBe(false)
  })
})

describe('e) Lado derecho negativo: Máx Z = 2x1 + x2; x1 + x2 ≤ 6; x1 − x2 ≥ −2', () => {
  const result = solveSimplex({
    sense: 'max',
    objective: [2, 1],
    constraints: [
      { coefficients: [1, 1], operator: '<=', rhs: 6 },
      { coefficients: [1, -1], operator: '>=', rhs: -2 },
    ],
  })

  it('multiplica la restricción 2 por −1 y la vuelve ≤', () => {
    expect(describePreparationStep(result.preparation[0])).toBe(
      'La restricción 2 tiene lado derecho negativo: se multiplica por −1 → −x1 + x2 ≤ 2',
    )
    expect(describePreparationStep(result.preparation[2])).toBe('Restricción 2 (≤): se suma S2')
    expect(result.bigMAdjustment).toBeNull()
  })

  it('x1 = 6, x2 = 0, Z = 12', () => {
    expect(result.status).toBe('optimal')
    expect(values(result, ['x1', 'x2'])).toEqual({ x1: '6', x2: '0' })
    expect(result.z.toFraction()).toBe('12')
  })
})

describe('Restricción = con lado derecho negativo', () => {
  it('se multiplica por −1 y sigue siendo =', () => {
    const result = solveSimplex({
      sense: 'max',
      objective: [1, 1],
      constraints: [{ coefficients: [-1, -1], operator: '=', rhs: -3 }],
    })
    expect(describePreparationStep(result.preparation[0])).toBe(
      'La restricción 1 tiene lado derecho negativo: se multiplica por −1 → x1 + x2 = 3',
    )
    expect(result.status).toBe('optimal')
    expect(result.z.toFraction()).toBe('3')
  })
})
