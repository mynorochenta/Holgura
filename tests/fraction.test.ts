import { describe, expect, it } from 'vitest'
import { Fraction, MValue, formatMValue, formatNumber } from '../src/core/fraction'
import { describeOperation } from '../src/core/simplex'

describe('formatNumber', () => {
  it('decimales: máximo 4 cifras y sin ceros sobrantes', () => {
    expect(formatNumber(new Fraction(3, 2))).toBe('1.5')
    expect(formatNumber(new Fraction(4, 5))).toBe('0.8')
    expect(formatNumber(new Fraction(1, 3))).toBe('0.3333')
    expect(formatNumber(new Fraction(2, 3))).toBe('0.6667')
    expect(formatNumber(new Fraction(1040))).toBe('1040')
    expect(formatNumber(new Fraction(-1, 5))).toBe('−0.2')
    expect(formatNumber(new Fraction(0))).toBe('0')
  })

  it('fracciones', () => {
    expect(formatNumber(new Fraction(3, 2), 'fraction')).toBe('3/2')
    expect(formatNumber(new Fraction(-3, 5), 'fraction')).toBe('−3/5')
    expect(formatNumber(new Fraction(24), 'fraction')).toBe('24')
  })
})

describe('MValue', () => {
  it('compara primero por M y luego por la constante', () => {
    expect(MValue.of(1000, -1).compare(MValue.of(-5))).toBeLessThan(0)
    expect(MValue.of(40, -3).compare(MValue.of(0, -3))).toBeGreaterThan(0)
    expect(MValue.of(2, 1).equals(MValue.of(2, 1))).toBe(true)
  })

  it('suma, resta y multiplica por número', () => {
    const v = MValue.of(40, -3).add(MValue.of(-10, 1)).mul(2)
    expect(v.k.toFraction()).toBe('60')
    expect(v.m.toFraction()).toBe('-4')
    expect(v.sub(MValue.of(60, -4)).isZero()).toBe(true)
  })

  it('se muestra como k + m·M', () => {
    expect(formatMValue(MValue.of(40, -3))).toBe('−3M + 40')
    expect(formatMValue(MValue.of(-40, 3))).toBe('3M − 40')
    expect(formatMValue(MValue.of(0, 1))).toBe('M')
    expect(formatMValue(MValue.of(0, -1))).toBe('−M')
    expect(formatMValue(MValue.of(7))).toBe('7')
    expect(formatMValue(MValue.of('1/2', '3/2'), 'fraction')).toBe('(3/2)M + 1/2')
    expect(formatMValue(MValue.of('1/2', '3/2'))).toBe('1.5M + 0.5')
  })
})

describe('describeOperation', () => {
  it('escribe operaciones con M en la fila Z', () => {
    const op = { kind: 'eliminate', target: 'Z', source: 0, factor: MValue.of(40, -3) } as const
    expect(describeOperation(op)).toBe('Z ← Z + (3M − 40)·R1')
    const onlyM = { kind: 'eliminate', target: 'Z', source: 1, factor: MValue.of(0, -1) } as const
    expect(describeOperation(onlyM)).toBe('Z ← Z + M·R2')
  })
})
