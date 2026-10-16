import { describe, expect, it } from 'vitest'
import { formatParseError, modelToText, parseModel, parseNumber } from '../src/core/parser'
import { solveSimplex } from '../src/core/simplex'

function errorsOf(text: string): string[] {
  return parseModel(text).errors.map(formatParseError)
}

describe('parseModel: formato básico', () => {
  it('lee el ejemplo de referencia', () => {
    const { model, errors } = parseModel(`max z = 40x1 + 30x2
2x1 + x2 <= 40
3x1 + 4x2 <= 120`)
    expect(errors).toEqual([])
    expect(model).toEqual({
      sense: 'max',
      objective: ['40', '30'],
      constraints: [
        { coefficients: ['2', '1'], operator: '<=', rhs: '40' },
        { coefficients: ['3', '4'], operator: '<=', rhs: '120' },
      ],
    })
    const result = solveSimplex(model!)
    expect(result.z.toFraction()).toBe('1040')
  })

  it('acepta min, ≥, ≤, = y la línea de no negatividad', () => {
    const { model, errors } = parseModel(`min z = 2x1 + 3x2
x1 + x2 ≥ 4
x1 + 3x2 >= 6
x1 = 3
x1 ≤ 10
x1, x2 >= 0`)
    expect(errors).toEqual([])
    expect(model!.sense).toBe('min')
    expect(model!.constraints.map((c) => c.operator)).toEqual(['>=', '>=', '=', '<='])
  })

  it('acepta decimales, fracciones, negativos y espacios opcionales', () => {
    const { model, errors } = parseModel(`MAX Z=1.5x1-x2+3/2x3
-2x1+0.5x2   -  x3<=-4
x1+x2=7.25`)
    expect(errors).toEqual([])
    expect(model!.objective).toEqual(['1.5', '-1', '1.5'])
    expect(model!.constraints[0]).toEqual({ coefficients: ['-2', '0.5', '-1'], operator: '<=', rhs: '-4' })
    expect(model!.constraints[1].rhs).toBe('7.25')
  })

  it('pone coeficiente 0 a las variables que no aparecen en una línea', () => {
    const { model } = parseModel(`max z = 3x1 + 5x2
x1 <= 4
2x2 <= 12
3x1 + 2x2 = 18`)
    expect(model!.constraints.map((c) => c.coefficients)).toEqual([
      ['1', '0'],
      ['0', '2'],
      ['3', '2'],
    ])
    expect(solveSimplex(model!).z.toFraction()).toBe('36')
  })

  it('acepta símbolos tipográficos: −, x₁, ·, máx y "s.a."', () => {
    const { model, errors } = parseModel(`Máx Z = 40x₁ + 30·x₂
s.a.
2x₁ + x₂ ≤ 40
3x₁ − 4x₂ ≥ −120`)
    expect(errors).toEqual([])
    expect(model!.constraints[1]).toEqual({ coefficients: ['3', '-4'], operator: '>=', rhs: '-120' })
  })

  it('ignora líneas vacías y comentarios, y suma términos repetidos', () => {
    const { model, errors } = parseModel(`
# Fábrica de muebles
max z = 2x1 + x1   // utilidad
x1 <= 5
`)
    expect(errors).toEqual([])
    expect(model!.objective).toEqual(['3'])
  })

  it('la no negatividad puede declarar variables que no aparecen en otra línea', () => {
    const { model } = parseModel(`max z = x1
x1 <= 3
x1, x2, x3 >= 0`)
    expect(model!.objective).toEqual(['1', '0', '0'])
  })
})

describe('parseModel: errores con número de línea', () => {
  it('falta el signo', () => {
    expect(errorsOf(`max z = 3x1 + 5x2
x1 <= 4
2x1 + x2 40`)).toEqual(['Línea 3: falta el signo ≤, ≥ o ='])
  })

  it('la primera línea no es la función objetivo', () => {
    expect(errorsOf('z = 3x1\nx1 <= 4')).toEqual([
      'Línea 1: la primera línea debe ser la función objetivo y empezar con max o min (ej. max z = 3x1 + 5x2)',
      'Línea 2: la primera línea debe ser la función objetivo y empezar con max o min (ej. max z = 3x1 + 5x2)',
    ])
  })

  it('reporta cada línea con error', () => {
    expect(errorsOf(`max z = 3x1 + 5x2
x1 <= 4y
2x1 + 3 <= 10
x1 + x2 <= x3
x1 < 5
x1 <= 2 <= 3`)).toEqual([
      'Línea 2: el lado derecho «4y» no es un número',
      'Línea 3: el término «3» no tiene variable; pasa las constantes al lado derecho',
      'Línea 4: el lado derecho debe ser un número; pasa las variables al lado izquierdo',
      'Línea 5: usa ≤ (<=); las desigualdades estrictas no se usan en programación lineal',
      'Línea 6: hay más de un signo ≤, ≥ o =; escribe una restricción por línea',
    ])
  })

  it('términos no reconocidos y variables mal numeradas', () => {
    expect(errorsOf('max z = 3a + 5x2\nx1 <= 4')).toEqual([
      'Línea 1: no se reconoce «3a»; escribe los términos como 3x1, −x2 o 1.5x3',
    ])
    expect(errorsOf('max z = 3x0\nx0 <= 4')[0]).toBe('Línea 1: las variables se numeran desde x1')
    expect(errorsOf('max z = 3x1 +\nx1 <= 4')[0]).toBe('Línea 1: hay un signo + o − sin término')
  })

  it('falta la función objetivo o las restricciones', () => {
    expect(errorsOf('')).toEqual(['Línea 1: escribe la función objetivo, por ejemplo max z = 3x1 + 5x2'])
    expect(errorsOf('max z =')).toEqual([
      'Línea 1: falta la función objetivo después de max/min, por ejemplo max z = 3x1 + 5x2',
    ])
    expect(errorsOf('max z = 3x1')).toEqual(['Línea 2: agrega al menos una restricción, por ejemplo 2x1 + x2 <= 40'])
  })

  it('dos funciones objetivo y división entre cero', () => {
    expect(errorsOf('max z = x1\nmin z = x1\nx1 <= 1')).toEqual([
      'Línea 2: solo puede haber una función objetivo (max o min)',
    ])
    expect(errorsOf('max z = 3/0x1\nx1 <= 1')[0]).toBe('Línea 1: el coeficiente «3/0» no es válido')
  })
})

describe('parseNumber (celdas de la tabla)', () => {
  it('acepta vacío, negativos, decimales y fracciones', () => {
    expect(parseNumber('')!.toFraction()).toBe('0')
    expect(parseNumber(' −3 ')!.toFraction()).toBe('-3')
    expect(parseNumber('1.5')!.toFraction()).toBe('3/2')
    expect(parseNumber('-3/4')!.toFraction()).toBe('-3/4')
  })

  it('rechaza lo que no es número', () => {
    expect(parseNumber('-')).toBeNull()
    expect(parseNumber('2x1')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('modelToText', () => {
  it('ida y vuelta: el texto generado se vuelve a leer igual', () => {
    const original = parseModel(`min z = 1.5x1 - x2 + 1/3x3
-2x1 + x2 >= -4
x2 = 7
x1, x2, x3 >= 0`).model!
    const text = modelToText(original)
    expect(text).toBe(`min z = 1.5x1 - x2 + 1/3x3
-2x1 + x2 >= -4
x2 = 7
x1, x2, x3 >= 0`)
    expect(parseModel(text).model).toEqual(original)
  })

  it('mantiene las variables cuyos coeficientes son todos cero', () => {
    const text = modelToText({ sense: 'max', objective: [0, 0], constraints: [{ coefficients: [0, 0], operator: '<=', rhs: 5 }] })
    expect(text).toBe('max z = 0x1\n0x1 <= 5\nx1, x2 >= 0')
    expect(parseModel(text).model!.objective).toEqual(['0', '0'])
  })
})
