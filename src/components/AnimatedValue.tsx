import NumberFlow, { type Format } from '@number-flow/react'
import { motion, useReducedMotion } from 'motion/react'
import { MValue, formatMValue, type NumberFormat } from '../core/fraction'
import { MathText } from './MathText'

const NUMBER_FORMAT: Format = { useGrouping: false, maximumFractionDigits: 4 }

/**
 * Número de la tabla. En decimales usa NumberFlow (los dígitos giran al cambiar);
 * en fracciones, y en valores con M, el texto entra con una transición suave.
 */
export function AnimatedValue({
  value,
  format,
  delay = 0,
  animated = true,
}: {
  value: MValue
  format: NumberFormat
  delay?: number
  /** false: el valor cambia sin transición (al arrastrar la línea de tiempo). */
  animated?: boolean
}) {
  const reduce = useReducedMotion() || !animated

  if (format === 'decimal' && !value.hasM()) {
    const n = Number(value.k.valueOf().toFixed(4))
    return (
      <NumberFlow
        value={Math.abs(n)}
        prefix={n < 0 ? '−' : undefined}
        locales="en-US"
        format={NUMBER_FORMAT}
        animated={!reduce}
      />
    )
  }

  const text = formatMValue(value, format)
  return (
    <motion.span
      key={text}
      className="inline-block whitespace-nowrap"
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <MathText text={text} />
    </motion.span>
  )
}
