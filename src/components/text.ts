// Formato de textos planos (atributos, aria-label). Para mostrar variables en pantalla: MathText.

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/**
 * x1 → x₁, S12 → S₁₂. Solo los dígitos de una variable (x, S, e, A); los coeficientes y los
 * renglones quedan igual: "R2 ← R2 − 2·R1" no cambia y "Entra x2" queda "Entra x₂".
 */
export function subscript(text: string): string {
  return text.replace(/(?<![\p{L}\d])([xSeA])(\d+)/gu, (_, letter: string, digits: string) =>
    letter + digits.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]),
  )
}

/** "x1", "x1 y x2", "x1, x2 y S3". */
export function joinNames(names: string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
