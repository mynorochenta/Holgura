// Colores de cada tipo de operación (paleta Macaron). Los mismos valores están en index.css;
// aquí se repiten en hex para que Motion pueda interpolarlos.

import type { SimplexResult } from '../core/simplex'
import type { Step } from '../core/steps'

export type Tone = 'sel' | 'piv' | 'cero' | 'zeta' | 'error'

export const TONE_COLORS: Record<Tone, { pastel: string; acento: string }> = {
  sel: { pastel: '#c4f0dc', acento: '#4bb88c' },
  piv: { pastel: '#cfe2ff', acento: '#5b8def' },
  cero: { pastel: '#ffd9bf', acento: '#f0955a' },
  zeta: { pastel: '#e5d4ff', acento: '#9b6fe0' },
  error: { pastel: '#ffdbde', acento: '#e0606c' },
}

/** Clases de Tailwind por tono (escritas completas para que Tailwind las detecte). */
export const TONE_CLASS: Record<Tone, { pastel: string; dot: string; ring: string }> = {
  sel: { pastel: 'bg-sel', dot: 'bg-sel-acento', ring: 'ring-sel' },
  piv: { pastel: 'bg-piv', dot: 'bg-piv-acento', ring: 'ring-piv' },
  cero: { pastel: 'bg-cero', dot: 'bg-cero-acento', ring: 'ring-cero' },
  zeta: { pastel: 'bg-zeta', dot: 'bg-zeta-acento', ring: 'ring-zeta' },
  error: { pastel: 'bg-error', dot: 'bg-error-acento', ring: 'ring-error' },
}

export const LEGEND: { tone: Tone; label: string }[] = [
  { tone: 'sel', label: 'Selección' },
  { tone: 'piv', label: 'Pivote a 1' },
  { tone: 'cero', label: 'Hacer cero' },
  { tone: 'zeta', label: 'Fila Z' },
]

export const TRANSPARENT = 'rgba(255, 255, 255, 0)'

export function resultTone(result: SimplexResult): Tone {
  if (result.status === 'optimal') return 'sel'
  if (result.status === 'infeasible') return 'error'
  return 'cero'
}

export function stepTone(step: Step, result: SimplexResult): Tone {
  switch (step.kind) {
    case 'initial':
    case 'enter':
    case 'leave':
      return 'sel'
    case 'scale':
      return 'piv'
    case 'eliminate':
      return 'cero'
    case 'objective':
      return 'zeta'
    case 'result':
      return resultTone(result)
  }
}
