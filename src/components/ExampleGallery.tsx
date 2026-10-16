import { EXAMPLES, type Example } from '../examples'

interface ExampleGalleryProps {
  activeId: string | null
  onSelect: (example: Example) => void
}

/** Problemas de ejemplo que se cargan en el editor con un clic. */
export function ExampleGallery({ activeId, onSelect }: ExampleGalleryProps) {
  return (
    <section aria-labelledby="ejemplos">
      <h2 id="ejemplos" className="kicker">
        Ejemplos
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {EXAMPLES.map((example) => {
          const active = example.id === activeId
          return (
            <button
              key={example.id}
              type="button"
              onClick={() => onSelect(example)}
              aria-pressed={active}
              className={`group card cursor-pointer p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-tinta-suave/40 active:scale-[0.99] ${
                active ? 'border-sel-acento ring-1 ring-sel-acento' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{example.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] whitespace-nowrap ${
                    active ? 'bg-sel' : 'bg-suave'
                  }`}
                >
                  {example.tag}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave">{example.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
