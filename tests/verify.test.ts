import { describe, expect, it } from 'vitest'
import type { LinearModel } from '../src/core/model'
import { parseModel } from '../src/core/parser'
import { solveSimplex } from '../src/core/simplex'
import { solveExternally, verify } from '../src/core/verify'
import { EXAMPLES } from '../src/examples'

function check(model: LinearModel) {
  const result = solveSimplex(model)
  return { result, verification: verify(model, result) }
}

describe('verify: coincide con javascript-lp-solver', () => {
  const cases: [string, LinearModel, string, string | null][] = [
    [
      'Máx 40x1 + 30x2 (Z = 1040)',
      {
        sense: 'max',
        objective: [40, 30],
        constraints: [
          { coefficients: [2, 1], operator: '<=', rhs: 40 },
          { coefficients: [3, 4], operator: '<=', rhs: 120 },
        ],
      },
      'optimal',
      '1040',
    ],
    [
      'Mín con ≥ (Z = 9)',
      {
        sense: 'min',
        objective: [2, 3],
        constraints: [
          { coefficients: [1, 1], operator: '>=', rhs: 4 },
          { coefficients: [1, 3], operator: '>=', rhs: 6 },
        ],
      },
      'optimal',
      '9',
    ],
    [
      'Mín con =, ≥ y ≤ (Z = 17/5)',
      {
        sense: 'min',
        objective: [4, 1],
        constraints: [
          { coefficients: [3, 1], operator: '=', rhs: 3 },
          { coefficients: [4, 3], operator: '>=', rhs: 6 },
          { coefficients: [1, 2], operator: '<=', rhs: 4 },
        ],
      },
      'optimal',
      '17/5',
    ],
    [
      'Infactible',
      {
        sense: 'max',
        objective: [1, 1],
        constraints: [
          { coefficients: [1, 1], operator: '<=', rhs: 2 },
          { coefficients: [1, 1], operator: '>=', rhs: 5 },
        ],
      },
      'infeasible',
      null,
    ],
    [
      'No acotado',
      {
        sense: 'max',
        objective: [1, 1],
        constraints: [{ coefficients: [1, -1], operator: '<=', rhs: 2 }],
      },
      'unbounded',
      null,
    ],
  ]

  it.each(cases)('%s', (_, model, status, z) => {
    const { result, verification } = check(model)
    expect(result.status).toBe(status)
    if (z !== null) expect(result.z.toFraction()).toBe(z)
    expect(verification.external.status).toBe(status)
    expect(verification.matches).toBe(true)
  })

  it('detecta cuando el resultado no coincide', () => {
    const model: LinearModel = {
      sense: 'max',
      objective: [40, 30],
      constraints: [{ coefficients: [2, 1], operator: '<=', rhs: 40 }],
    }
    const result = solveSimplex({ ...model, constraints: [{ coefficients: [2, 1], operator: '<=', rhs: 50 }] })
    expect(verify(model, result).matches).toBe(false)
  })

  it('solveExternally devuelve Z del solver externo', () => {
    const external = solveExternally({
      sense: 'max',
      objective: [3, 5],
      constraints: [
        { coefficients: [1, 0], operator: '<=', rhs: 4 },
        { coefficients: [0, 2], operator: '<=', rhs: 12 },
        { coefficients: [3, 2], operator: '=', rhs: 18 },
      ],
    })
    expect(external).toEqual({ status: 'optimal', z: 36 })
  })
})

describe('ejemplos precargados', () => {
  const expected: Record<string, { status: string; z?: string; values?: Record<string, string> }> = {
    taller: { status: 'optimal', z: '2400', values: { x1: '30', x2: '40' } },
    cafe: { status: 'optimal', z: '900', values: { x1: '30', x2: '10' } },
    textil: { status: 'optimal', z: '36', values: { x1: '2', x2: '6' } },
    panaderia: { status: 'infeasible' },
  }

  it('hay 4 ejemplos', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual(Object.keys(expected))
  })

  it.each(EXAMPLES)('$title: se lee, se resuelve y coincide con el solver externo', (example) => {
    const { model, errors } = parseModel(example.text)
    expect(errors).toEqual([])
    const { result, verification } = check(model!)
    const want = expected[example.id]
    expect(result.status).toBe(want.status)
    if (want.z) expect(result.z.toFraction()).toBe(want.z)
    for (const [name, value] of Object.entries(want.values ?? {})) {
      expect(result.values[name].toFraction()).toBe(value)
    }
    expect(verification.matches).toBe(true)
  })
})
