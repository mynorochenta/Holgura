// Helpers sobre fraction.js para cálculo exacto y para mostrar números.
// Lógica pura: este módulo no depende de React.

import Fraction, { type FractionInput } from 'fraction.js'

export { Fraction }

/** Cómo se muestran los números: decimales (por defecto) o fracciones. */
export type NumberFormat = 'decimal' | 'fraction'

const MINUS = '−'
const ZERO = new Fraction(0)

export function frac(value: FractionInput): Fraction {
  return new Fraction(value)
}

/** 1.5 → "1.5", 4/5 → "0.8", 1/3 → "0.3333"; en formato fracción: "3/2", "4/5", "1/3". */
export function formatNumber(value: Fraction, format: NumberFormat = 'decimal'): string {
  const text =
    format === 'fraction'
      ? value.toFraction()
      : String(Number(value.valueOf().toFixed(4)))
  return text.replace('-', MINUS)
}

/**
 * Valor de la forma k + m·M, donde M es un número arbitrariamente grande (método de la Gran M).
 * Se compara primero por m y, si empata, por k.
 */
export class MValue {
  readonly k: Fraction
  readonly m: Fraction

  constructor(k: FractionInput = 0, m: FractionInput = 0) {
    this.k = new Fraction(k)
    this.m = new Fraction(m)
  }

  static of(k: FractionInput, m: FractionInput = 0): MValue {
    return new MValue(k, m)
  }

  add(other: MValue): MValue {
    return new MValue(this.k.add(other.k), this.m.add(other.m))
  }

  sub(other: MValue): MValue {
    return new MValue(this.k.sub(other.k), this.m.sub(other.m))
  }

  /** Multiplicación por un número (no por otro valor con M). */
  mul(scalar: FractionInput): MValue {
    return new MValue(this.k.mul(scalar), this.m.mul(scalar))
  }

  neg(): MValue {
    return new MValue(this.k.neg(), this.m.neg())
  }

  compare(other: MValue): number {
    const byM = this.m.compare(other.m)
    return byM !== 0 ? byM : this.k.compare(other.k)
  }

  equals(other: MValue): boolean {
    return this.compare(other) === 0
  }

  isZero(): boolean {
    return this.m.equals(ZERO) && this.k.equals(ZERO)
  }

  isNegative(): boolean {
    return this.compare(MValue.of(0)) < 0
  }

  hasM(): boolean {
    return !this.m.equals(ZERO)
  }
}

/** −3M + 40, M, −M, 3M − 40, 40… En formato fracción: (3/2)M + 1/2. */
export function formatMValue(value: MValue, format: NumberFormat = 'decimal'): string {
  if (!value.hasM()) return formatNumber(value.k, format)

  let mPart: string
  if (value.m.equals(1)) mPart = 'M'
  else if (value.m.equals(-1)) mPart = `${MINUS}M`
  else {
    const coefficient = formatNumber(value.m, format)
    mPart = coefficient.includes('/') ? `(${coefficient})M` : `${coefficient}M`
  }

  if (value.k.equals(ZERO)) return mPart
  const sign = value.k.compare(ZERO) < 0 ? MINUS : '+'
  return `${mPart} ${sign} ${formatNumber(value.k.abs(), format)}`
}
