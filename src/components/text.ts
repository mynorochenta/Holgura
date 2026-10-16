// Formato de textos para la interfaz: subíndices en los nombres de variables.

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

function subscriptDigits(digits: string): string {
  return digits.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
}

/** x1 → x₁, S12 → S₁₂ */
export function subscript(name: string): string {
  return name.replace(/\d+/g, subscriptDigits)
}

/** Pone subíndices a las variables (x, S, e, A) dentro de un texto; R1, R2… se quedan igual. */
export function prettyText(text: string): string {
  return text.replace(/([xSeA])(\d+)/g, (_, letter: string, digits: string) => letter + subscriptDigits(digits))
}

export function joinNames(names: string[]): string {
  const pretty = names.map(subscript)
  return pretty.length === 1 ? pretty[0] : `${pretty.slice(0, -1).join(', ')} y ${pretty[pretty.length - 1]}`
}
