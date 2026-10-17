import { EXAMPLES, type Example } from '../examples'
import { MathText } from './MathText'

interface ExampleGalleryProps {
  activeId: string | null
  onSelect: (example: Example) => void
}

/** Problemas de ejemplo que se cargan en el editor con un clic. */
export function ExampleGallery({ activeId, onSelect }: ExampleGalleryProps) {
  return (
    <section aria-labelledby="ejemplos">
      <h3 id="ejemplos" className="kicker mb-1">
        Ejemplos
      </h3>
      <ul className="border-t border-rule">
        {EXAMPLES.map((example) => {
          const active = example.id === activeId
          return (
            <li key={example.id} className="border-b border-rule">
              <button
                type="button"
                onClick={() => onSelect(example)}
                aria-pressed={active}
                className={`group w-full cursor-pointer border-l-2 py-2.5 pr-1 pl-3 text-left transition-[border-color,padding] duration-200 hover:pl-4 ${
                  active ? 'border-sel' : 'border-transparent'
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-[16px]">{example.title}</span>
                  <span className="text-[11px] whitespace-nowrap text-muted">{example.tag}</span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                  <MathText text={example.description} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
