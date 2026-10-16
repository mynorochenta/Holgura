import Fraction from 'fraction.js'
import { describe, expect, it } from 'vitest'

describe('entorno de pruebas', () => {
  it('Vitest funciona', () => {
    expect(1 + 1).toBe(2)
  })

  it('fraction.js calcula de forma exacta', () => {
    expect(new Fraction(1, 10).add(new Fraction(2, 10)).equals(new Fraction(3, 10))).toBe(true)
  })
})
