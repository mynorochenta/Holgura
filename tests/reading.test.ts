import { describe, expect, it } from 'vitest'
import { parseModel } from '../src/core/parser'
import { solveSimplex } from '../src/core/simplex'
import { EXAMPLES } from '../src/examples'
import { readSolution } from '../src/examples/reading'

function readExample(id: string) {
  const example = EXAMPLES.find((e) => e.id === id)!
  const result = solveSimplex(parseModel(example.text).model!)
  return readSolution(example.reading, result)
}

describe('lectura de la solución de los ejemplos', () => {
  it('taller: qué armar, utilidad y recursos', () => {
    expect(readExample('taller')).toEqual({
      headline: 'Conviene armar 30 mesas y 40 sillas, con una utilidad máxima de Q2,400.',
      details: [
        'Se usan las 100 horas máquina.',
        'Sobran 10 horas de ensamble.',
        'Se venden las 40 sillas que admite el mercado.',
      ],
    })
  })

  it('café: minimiza el costo y lee los excesos', () => {
    const reading = readExample('cafe')!
    expect(reading.headline).toBe('Conviene mezclar 30 lb de café de Atitlán y 10 lb de Huehuetenango, con un costo mínimo de Q900.')
    expect(reading.details).toEqual(['La mezcla pesa justo las 40 lb pedidas.', 'El aroma llega justo a los 60 puntos.'])
  })

  it('textil: la utilidad se expresa en quetzales (cientos × 100)', () => {
    const reading = readExample('textil')!
    expect(reading.headline).toBe('Conviene tejer 2 lotes de güipiles y 6 lotes de mantas, con una utilidad máxima de Q3,600.')
    expect(reading.details[0]).toBe('Quedan 2 lotes de güipiles por debajo del máximo de 4.')
  })

  it('panadería: explica por qué no hay plan', () => {
    expect(readExample('panaderia')!.headline).toMatch(/^No hay plan posible/)
  })
})
