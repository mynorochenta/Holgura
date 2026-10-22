import { EXAMPLES, type Example } from '../examples'

interface ExampleGalleryProps {
  activeId: string | null
  onSelect: (example: Example) => void
}

/**
 * Problemas de ejemplo: una lista compacta (título y tipo). Al elegir uno se carga y se resuelve;
 * su historia aparece encima del editor, junto al modelo que describe.
 */
export function ExampleGallery({ activeId, onSelect }: ExampleGalleryProps) {
  return (
    <section aria-labelledby="ejemplos">
      <h3 id="ejemplos" className="block-title">
        Ejemplos
      </h3>
      <p className="mt-1 mb-3 text-[14px] text-muted">Se cargan y se resuelven al instante.</p>
      <ul className="space-y-1">
        {EXAMPLES.map((example) => {
          const active = example.id === activeId
          return (
            <li key={example.id}>
              <button
                type="button"
                onClick={() => onSelect(example)}
                aria-pressed={active}
                className={`flex min-h-11 w-full cursor-pointer items-baseline justify-between gap-3 rounded-[3px] border px-3.5 py-2.5 text-left transition-[background-color,border-color] duration-200 ${
                  active ? 'border-line bg-paper' : 'border-transparent hover:bg-paper/60'
                }`}
              >
                <span className={`text-[15px] ${active ? 'font-semibold' : 'font-medium'}`}>{example.title}</span>
                <span className="text-[13px] whitespace-nowrap text-muted">{example.tag}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
