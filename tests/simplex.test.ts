import { describe, expect, it } from 'vitest'
import { Fraction } from '../src/core/fraction'
import type { LinearModel } from '../src/core/model'
import {
  describeOperation,
  explainEntering,
  explainLeaving,
  solveSimplex,
  type Tableau,
} from '../src/core/simplex'

/** Fila de la tabla cuya variable básica es `name`, como fracciones "a/b" (coeficientes + RHS). */
function row(tableau: Tableau, name: string): string[] {
  const i = tableau.basis.findIndex((column) => tableau.variables[column] === name)
  expect(i, `${name} debería ser básica`).toBeGreaterThanOrEqual(0)
  return [...tableau.rows[i], tableau.rhs[i]].map((v) => v.toFraction())
}

/** Fila Z (sin M) como fracciones "a/b". */
function zRow(tableau: Tableau): string[] {
  return [...tableau.z, tableau.zRhs].map((v) => {
    expect(v.hasM()).toBe(false)
    return v.k.toFraction()
  })
}

function expected(values: number[]): string[] {
  return values.map((v) => new Fraction(v).toFraction())
}

describe('a) Máx Z = 40x1 + 30x2; 2x1 + x2 ≤ 40; 3x1 + 4x2 ≤ 120', () => {
  const model: LinearModel = {
    sense: 'max',
    objective: [40, 30],
    constraints: [
      { coefficients: [2, 1], operator: '<=', rhs: 40 },
      { coefficients: [3, 4], operator: '<=', rhs: 120 },
    ],
  }
  const result = solveSimplex(model)

  it('arma la tabla inicial con la fila Z con signo cambiado', () => {
    const initial = result.iterations[0].before
    expect(initial.variables).toEqual(['x1', 'x2', 'S1', 'S2'])
    expect(row(initial, 'S1')).toEqual(expected([2, 1, 1, 0, 40]))
    expect(row(initial, 'S2')).toEqual(expected([3, 4, 0, 1, 120]))
    expect(zRow(initial)).toEqual(expected([-40, -30, 0, 0, 0]))
  })

  it('iteración 1: entra x1, sale S1 y explica las operaciones', () => {
    const it1 = result.iterations[0]
    expect(it1.before.variables[it1.entering]).toBe('x1')
    expect(it1.ratios.map((r) => r?.toFraction() ?? null)).toEqual(['20', '40'])
    expect(it1.before.variables[it1.before.basis[it1.leaving]]).toBe('S1')
    expect(it1.pivot.toFraction()).toBe('2')
    expect(it1.operations.map((op) => describeOperation(op))).toEqual([
      'Se divide R1 entre 2 para que el pivote sea 1',
      'R2 ← R2 − 3·R1',
      'Z ← Z + 40·R1',
    ])
    expect(explainEntering(it1)).toBe(
      'Entra x1 porque tiene el coeficiente más negativo en la fila Z (−40).',
    )
    expect(explainLeaving(it1)).toBe('Sale S1 porque tiene la razón mínima (40 ÷ 2 = 20).')

    expect(row(it1.after, 'x1')).toEqual(expected([1, 0.5, 0.5, 0, 20]))
    expect(row(it1.after, 'S2')).toEqual(expected([0, 2.5, -1.5, 1, 60]))
    expect(zRow(it1.after)).toEqual(expected([0, -10, 20, 0, 800]))
  })

  it('llega al óptimo x1 = 8, x2 = 24, Z = 1040', () => {
    expect(result.status).toBe('optimal')
    expect(result.iterations).toHaveLength(2)
    const final = result.finalTableau
    expect(row(final, 'x1')).toEqual(expected([1, 0, 0.8, -0.2, 8]))
    expect(row(final, 'x2')).toEqual(expected([0, 1, -0.6, 0.4, 24]))
    expect(zRow(final)).toEqual(expected([0, 0, 14, 4, 1040]))
    expect(result.z.toFraction()).toBe('1040')
    expect(result.values.x1.toFraction()).toBe('8')
    expect(result.values.x2.toFraction()).toBe('24')
    expect(result.warnings).toEqual([])
  })
})

describe('b) Taller: Máx Z = 40x1 + 30x2; 2x1 + x2 ≤ 100; x1 + x2 ≤ 80; x2 ≤ 40', () => {
  const result = solveSimplex({
    sense: 'max',
    objective: [40, 30],
    constraints: [
      { coefficients: [2, 1], operator: '<=', rhs: 100 },
      { coefficients: [1, 1], operator: '<=', rhs: 80 },
      { coefficients: [0, 1], operator: '<=', rhs: 40 },
    ],
  })

  it('x1 = 30, x2 = 40, Z = 2400 con holguras 0, 10, 0', () => {
    expect(result.status).toBe('optimal')
    const values = Object.fromEntries(
      Object.entries(result.values).map(([name, v]) => [name, v.toFraction()]),
    )
    expect(values).toEqual({ x1: '30', x2: '40', S1: '0', S2: '10', S3: '0' })
    expect(result.z.toFraction()).toBe('2400')
  })

  it('la fila Z final tiene 20, 0, 10 en las columnas de holgura', () => {
    const z = result.finalTableau.z.map((v) => v.k.toFraction())
    expect(z.slice(2)).toEqual(['20', '0', '10'])
  })
})

describe('c) No acotado: Máx Z = x1 + x2; x1 − x2 ≤ 1', () => {
  it('termina con estado no acotado', () => {
    const result = solveSimplex({
      sense: 'max',
      objective: [1, 1],
      constraints: [{ coefficients: [1, -1], operator: '<=', rhs: 1 }],
    })
    expect(result.status).toBe('unbounded')
    expect(result.finalTableau.variables[result.unboundedColumn!]).toBe('x2')
    // En la primera iteración x1 y x2 empatan con −1 y se elige x1 (menor índice).
    expect(result.iterations[0].enteringTies).toEqual([0, 1])
    expect(result.iterations[0].entering).toBe(0)
  })
})

describe('d) Soluciones múltiples: Máx Z = 2x1 + 4x2; x1 + 2x2 ≤ 5; x1 + x2 ≤ 4', () => {
  it('Z = 10 con aviso de soluciones múltiples', () => {
    const result = solveSimplex({
      sense: 'max',
      objective: [2, 4],
      constraints: [
        { coefficients: [1, 2], operator: '<=', rhs: 5 },
        { coefficients: [1, 1], operator: '<=', rhs: 4 },
      ],
    })
    expect(result.status).toBe('optimal')
    expect(result.z.toFraction()).toBe('10')
    expect(result.warnings).toContainEqual({ kind: 'multiple_optima', variables: ['x1'] })
  })
})

describe('Modelo mal formado', () => {
  it('rechaza una restricción con un número distinto de coeficientes', () => {
    expect(() =>
      solveSimplex({
        sense: 'max',
        objective: [1, 1],
        constraints: [{ coefficients: [1, 1, 1], operator: '<=', rhs: 4 }],
      }),
    ).toThrow('La restricción 1 tiene 3 coeficientes y se esperaban 2.')
  })

  it('rechaza una función objetivo sin variables', () => {
    expect(() => solveSimplex({ sense: 'max', objective: [], constraints: [] })).toThrow(
      'La función objetivo no tiene variables.',
    )
  })
})

describe('Degeneración', () => {
  it('marca el empate en la razón mínima', () => {
    // Máx Z = 3x1 + 2x2; x1 ≤ 2; x1 + x2 ≤ 2 → al entrar x1 empatan S1 y S2 con razón 2.
    const result = solveSimplex({
      sense: 'max',
      objective: [3, 2],
      constraints: [
        { coefficients: [1, 0], operator: '<=', rhs: 2 },
        { coefficients: [1, 1], operator: '<=', rhs: 2 },
      ],
    })
    expect(result.status).toBe('optimal')
    expect(result.iterations[0].degenerate).toBe(true)
    expect(result.iterations[0].leavingTies).toEqual([0, 1])
    expect(result.warnings).toContainEqual({ kind: 'degeneracy', iteration: 1 })
  })
})
