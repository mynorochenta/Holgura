import { describe, expect, it } from 'vitest'
import type { LinearModel } from '../src/core/model'
import { parseModel } from '../src/core/parser'
import { solveSimplex, type Tableau } from '../src/core/simplex'
import { buildSteps, describeStep, formatCalculation, formatObjectiveRow } from '../src/core/steps'
import { EXAMPLES } from '../src/examples'

/** Tabla en texto (fracciones exactas) para comparar. */
function snapshot(t: Tableau) {
  return {
    basis: t.basis,
    rows: t.rows.map((row) => row.map((v) => v.toFraction())),
    rhs: t.rhs.map((v) => v.toFraction()),
    z: t.z.map((v) => `${v.k.toFraction()}|${v.m.toFraction()}`),
    zRhs: `${t.zRhs.k.toFraction()}|${t.zRhs.m.toFraction()}`,
  }
}

const EXTRA_MODELS: Record<string, LinearModel> = {
  'Máx Z = 40x1 + 30x2; 2x1 + x2 ≤ 40; 3x1 + 4x2 ≤ 120': {
    sense: 'max',
    objective: [40, 30],
    constraints: [
      { coefficients: [2, 1], operator: '<=', rhs: 40 },
      { coefficients: [3, 4], operator: '<=', rhs: 120 },
    ],
  },
  'Min con =, ≥ y ≤': {
    sense: 'min',
    objective: [4, 1],
    constraints: [
      { coefficients: [3, 1], operator: '=', rhs: 3 },
      { coefficients: [4, 3], operator: '>=', rhs: 6 },
      { coefficients: [1, 2], operator: '<=', rhs: 4 },
    ],
  },
  'No acotado': {
    sense: 'max',
    objective: [1, 1],
    constraints: [{ coefficients: [1, -1], operator: '<=', rhs: 2 }],
  },
}

const MODELS: [string, LinearModel][] = [
  ...EXAMPLES.map((e): [string, LinearModel] => [e.title, parseModel(e.text).model!]),
  ...Object.entries(EXTRA_MODELS),
]

describe.each(MODELS)('%s', (_, model) => {
  const result = solveSimplex(model)
  const steps = buildSteps(result)

  it('la última tabla de los pasos coincide con la del motor', () => {
    expect(snapshot(steps[steps.length - 1].tableau)).toEqual(snapshot(result.finalTableau))
  })

  it('cada iteración termina en la tabla que calcula el motor', () => {
    for (const it of result.iterations) {
      const last = steps.filter((s) => s.group === 'iteration' && s.iteration === it.number && s.kind !== 'enter' && s.kind !== 'leave').at(-1)!
      expect(snapshot(last.tableau)).toEqual(snapshot(it.after))
    }
  })

  it('empieza con la tabla inicial y termina con el resultado', () => {
    expect(steps[0].kind).toBe('initial')
    expect(steps[steps.length - 1].kind).toBe('result')
    steps.forEach((s, i) => expect(s.index).toBe(i))
  })

  it('todos los pasos tienen texto', () => {
    for (const step of steps) {
      for (const format of ['decimal', 'fraction'] as const) {
        const text = describeStep(step, result, format)
        expect(text.title.length).toBeGreaterThan(0)
        expect(text.explanation.length).toBeGreaterThan(0)
        expect(text.explanation).not.toContain('undefined')
      }
    }
  })
})

describe('Máx Z = 40x1 + 30x2 (dos restricciones ≤)', () => {
  const result = solveSimplex(EXTRA_MODELS['Máx Z = 40x1 + 30x2; 2x1 + x2 ≤ 40; 3x1 + 4x2 ≤ 120'])
  const steps = buildSteps(result)
  const texts = steps.map((s) => describeStep(s, result))

  it('una operación por paso, en el orden de la clase', () => {
    expect(steps.map((s) => s.kind)).toEqual([
      'initial',
      'enter', 'leave', 'scale', 'eliminate', 'objective',
      'enter', 'leave', 'scale', 'eliminate', 'objective',
      'result',
    ])
    expect(texts.map((t) => t.title)).toEqual([
      'Tabla inicial',
      'Entra x1', 'Sale S1', 'R1 ← R1 ÷ 2', 'R2 ← R2 − 3·R1', 'Z ← Z + 40·R1',
      'Entra x2', 'Sale S2', 'R2 ← R2 ÷ 2.5', 'R1 ← R1 − 0.5·R2', 'Z ← Z + 10·R2',
      'Solución óptima',
    ])
  })

  it('explica la tabla inicial con la fila Z de la clase', () => {
    expect(texts[0].explanation).toContain('Z − 40x1 − 30x2 = 0')
    expect(texts[0].explanation).toContain('holgura (S1 y S2)')
  })

  it('explica el pivote y las razones', () => {
    expect(texts[2].explanation).toContain('40 ÷ 2 = 20 y 120 ÷ 3 = 40')
    expect(texts[2].explanation).toContain('sale S1. El pivote es 2.')
    expect(texts[3].explanation).toBe('Se divide R1 entre 2 para que el pivote sea 1. x1 reemplaza a S1 en la base.')
  })

  it('guarda la fila que cambió, los valores anteriores y el cálculo de cada celda', () => {
    const step = steps[4]
    expect(step.changedRow).toBe(1)
    expect(step.sourceRow).toBe(0)
    const rhs = step.calculations!.find((c) => c.column === step.tableau.variables.length)!
    expect(rhs.previous.k.toFraction()).toBe('120')
    expect(formatCalculation(rhs)).toBe('60 = 120 − 3 × 20')
    expect(formatCalculation(steps[3].calculations![0])).toBe('1 = 2 ÷ 2')
    expect(formatCalculation(steps[5].calculations![0])).toBe('0 = −40 − (−40) × 1')
  })

  it('cambia la base en el paso del pivote', () => {
    const scale = steps[3]
    expect(scale.basisChanged).toBe(true)
    expect(scale.tableau.variables[scale.tableau.basis[0]]).toBe('x1')
    expect(scale.previous.variables[scale.previous.basis[0]]).toBe('S1')
  })

  it('el resultado da los valores', () => {
    expect(texts.at(-1)!.explanation).toContain('x1 = 8 y x2 = 24')
    expect(texts.at(-1)!.explanation).toContain('Z = 1040')
  })
})

describe('Gran M', () => {
  const result = solveSimplex(parseModel(EXAMPLES.find((e) => e.id === 'textil')!.text).model!)
  const steps = buildSteps(result)

  it('el ajuste de la fila Z es un paso de preparación', () => {
    const adjust = steps[1]
    expect(adjust.group).toBe('preparation')
    expect(adjust.kind).toBe('objective')
    expect(describeStep(adjust, result).title).toBe('Z ← Z − M·R3')
    expect(describeStep(adjust, result).explanation).toContain('A3 está en la base, pero tiene M en la fila Z')
  })

  it('muestra los términos con M legibles', () => {
    expect(formatObjectiveRow(result.initialTableau)).toBe('Z − 3x1 − 5x2 + MA3 = 0')
    expect(formatObjectiveRow(steps[1].tableau)).toBe('Z + (−3M − 3)x1 + (−2M − 5)x2 = −18M')
  })
})

describe('Pivote que ya vale 1', () => {
  it('igual hay un paso de pivote que cambia la base', () => {
    const result = solveSimplex(parseModel(EXAMPLES.find((e) => e.id === 'textil')!.text).model!)
    const steps = buildSteps(result)
    const scale = steps.find((s) => s.kind === 'scale' && s.calculations!.length === 0)
    if (scale) {
      expect(describeStep(scale, result).explanation).toContain('El pivote ya vale 1')
      expect(scale.basisChanged).toBe(true)
    }
  })
})

describe('Casos especiales', () => {
  it('no acotado: el último paso explica la columna sin positivos', () => {
    const result = solveSimplex(EXTRA_MODELS['No acotado'])
    const steps = buildSteps(result)
    const last = steps.at(-1)!
    expect(result.status).toBe('unbounded')
    expect(steps.at(-2)!.kind).toBe('enter')
    expect(last.ratios!.every((r) => r === null)).toBe(true)
    expect(describeStep(last, result).explanation).toContain('Ningún coeficiente de la columna x2 es positivo')
  })

  it('infactible: el último paso explica la artificial en la base', () => {
    const result = solveSimplex(parseModel(EXAMPLES.find((e) => e.id === 'panaderia')!.text).model!)
    const last = buildSteps(result).at(-1)!
    expect(result.status).toBe('infeasible')
    const text = describeStep(last, result)
    expect(text.title).toBe('Sin solución factible')
    expect(text.explanation).toContain('la artificial A2 = 50 sigue en la base')
  })

  it('minimización: explica −Z al inicio y al final', () => {
    const result = solveSimplex(parseModel(EXAMPLES.find((e) => e.id === 'cafe')!.text).model!)
    const steps = buildSteps(result)
    expect(describeStep(steps[0], result).explanation).toContain('Max (−Z): la última fila es −Z + 20x1 + 30x2 + MA1 + MA2 = 0')
    expect(describeStep(steps.at(-1)!, result).explanation).toContain('Z = −(−Z)')
  })
})
