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
      <h3 id="ejemplos" className="block-title mb-2">
        Ejemplos
      </h3>
      <ul className="space-y-1">
        {EXAMPLES.map((example) => {
          const active = example.id === activeId
          return (
            <li key={example.id}>
              <button
                type="button"
                onClick={() => onSelect(example)}
                aria-pressed={active}
                className={`w-full cursor-pointer rounded-[3px] border px-3.5 py-3 text-left transition-[background-color,border-color] duration-200 ${
                  active ? 'border-line bg-paper' : 'border-transparent hover:bg-paper/60'
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-medium">{example.title}</span>
                  <span className="text-[13px] whitespace-nowrap text-muted">{example.tag}</span>
                </span>
                <span className="mt-1 block text-[14px] leading-snug text-muted">
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
