// Variables como en un libro: letra en cursiva de LaTeX (KaTeX_Math) y subíndice.

import { Fragment, type ReactNode } from 'react'

// x1, S2, e3, A4 (sin una letra antes: "40x1" sí, "Máx" no), los símbolos sueltos Z y M,
// y M pegada a una variable ("MA1" → M·A₁).
const MATH_TOKEN = /(?<!\p{L})(?:[xSeA]\d+|[ZM](?![\p{L}\d])|M(?=[xSeA]\d))|(?<=M)[xSeA]\d+/gu

/** Variable con letra en cursiva y subíndice. */
export function Var({ name }: { name: string }) {
  const match = /^([A-Za-z])(\d*)$/.exec(name)
  if (!match) return <span className="mv">{name}</span>
  return (
    <>
      <span className="mv">{match[1]}</span>
      {match[2] && <sub>{match[2]}</sub>}
    </>
  )
}

/** Texto con las variables (x1, S2, Z, M…) en notación matemática. */
export function MathText({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(MATH_TOKEN)) {
    const index = match.index
    if (index > last) parts.push(text.slice(last, index))
    parts.push(<Var key={index} name={match[0]} />)
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}
