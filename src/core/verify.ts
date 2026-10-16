// Comparación de resultados con javascript-lp-solver.
// Lógica pura: este módulo no depende de React.
//
// El solver externo usa punto flotante y su propio algoritmo; si coincide en el estado
// (óptimo, infactible, no acotado) y en el valor de Z, el resultado de Holgura queda verificado.

import solver, { type Model } from 'javascript-lp-solver'
import { Fraction } from './fraction'
import type { LinearModel } from './model'
import type { SimplexResult } from './simplex'

export type VerifiedStatus = 'optimal' | 'infeasible' | 'unbounded'

export interface ExternalSolution {
  status: VerifiedStatus
  /** Valor de Z (solo si es óptimo). */
  z: number | null
}

export interface Verification {
  matches: boolean
  external: ExternalSolution
  /** Estado de nuestro motor tal como se compara. */
  ownStatus: SimplexResult['status']
  ownZ: number | null
}

const TOLERANCE = 1e-6

/** Resuelve el modelo con javascript-lp-solver. */
export function solveExternally(model: LinearModel): ExternalSolution {
  const lpModel: Model = {
    optimize: 'z',
    opType: model.sense,
    constraints: {},
    variables: {},
  }
  model.constraints.forEach((constraint, i) => {
    const rhs = new Fraction(constraint.rhs).valueOf()
    lpModel.constraints[`r${i + 1}`] =
      constraint.operator === '<=' ? { max: rhs } : constraint.operator === '>=' ? { min: rhs } : { equal: rhs }
  })
  model.objective.forEach((c, j) => {
    const column: Record<string, number> = { z: new Fraction(c).valueOf() }
    model.constraints.forEach((constraint, i) => {
      column[`r${i + 1}`] = new Fraction(constraint.coefficients[j]).valueOf()
    })
    lpModel.variables[`x${j + 1}`] = column
  })

  const result = solver.Solve(lpModel) as { feasible: boolean; bounded?: boolean; result: number }
  if (!result.feasible) return { status: 'infeasible', z: null }
  if (result.bounded === false || !Number.isFinite(result.result)) return { status: 'unbounded', z: null }
  return { status: 'optimal', z: result.result }
}

/** Compara el resultado de Holgura con el del solver externo. */
export function verify(model: LinearModel, result: SimplexResult): Verification {
  const external = solveExternally(model)
  const ownZ = result.status === 'optimal' ? result.z.valueOf() : null
  let matches = result.status === external.status
  if (matches && ownZ !== null && external.z !== null) {
    matches = Math.abs(ownZ - external.z) <= TOLERANCE * Math.max(1, Math.abs(ownZ))
  }
  return { matches, external, ownStatus: result.status, ownZ }
}
