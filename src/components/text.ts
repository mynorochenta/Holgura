// Formato de textos planos (atributos, aria-label). Para mostrar variables en pantalla: MathText.

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/** x1 → x₁, S12 → S₁₂ */
export function subscript(name: string): string {
  return name.replace(/\d+/g, (digits) => digits.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]))
}

/** "x1", "x1 y x2", "x1, x2 y S3". */
export function joinNames(names: string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
