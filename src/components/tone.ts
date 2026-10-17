// Colores de cada tipo de operación (paleta Macaron). Son variables CSS definidas por tema en
// index.css, así que cambian solas con el tema.

import type { SimplexResult } from '../core/simplex'
import type { Step } from '../core/steps'

export type Tone = 'sel' | 'piv' | 'cero' | 'zeta' | 'error'

const VAR: Record<Tone, string> = { sel: 'sel', piv: 'piv', cero: 'cero', zeta: 'zeta', error: 'err' }

/** Variables CSS del tono: pastel (fondo), acento (bordes) y tinta (texto de color con buen contraste). */
export function toneVars(tone: Tone): { pastel: string; accent: string; ink: string } {
  const name = VAR[tone]
  return { pastel: `var(--${name}-t)`, accent: `var(--${name})`, ink: `var(--${name}-ink)` }
}

/** Fija --c, --c-t y --c-ink en un elemento para que sus hijos usen el color del tono. */
export function toneStyle(tone: Tone): Record<string, string> {
  const v = toneVars(tone)
  return { '--c': v.accent, '--c-t': v.pastel, '--c-ink': v.ink }
}

export const LEGEND: { tone: Tone; label: string }[] = [
  { tone: 'sel', label: 'Selección' },
  { tone: 'piv', label: 'Pivote a 1' },
  { tone: 'cero', label: 'Hacer cero' },
  { tone: 'zeta', label: 'Fila Z' },
]

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
