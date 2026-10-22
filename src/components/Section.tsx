import { forwardRef, type ReactNode } from 'react'

interface SectionProps {
  number: number
  title: string
  /** Nota a la derecha del título. */
  note?: ReactNode
  children: ReactNode
}

/** Sección de la hoja ("Modelo", "Solución"), separada por una línea fina. El número solo arma el id. */
export const Section = forwardRef<HTMLElement, SectionProps>(function Section({ number, title, note, children }, ref) {
  const id = `seccion-${number}`
  return (
    <section ref={ref} aria-labelledby={id} className="scroll-mt-4 border-t border-line pt-[18px] pb-7 sm:pl-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={id} className="font-display text-[23px] leading-tight font-normal">
          {title}
        </h2>
        {note && <div className="ml-auto text-xs text-muted">{note}</div>}
      </div>
      {children}
    </section>
  )
})
