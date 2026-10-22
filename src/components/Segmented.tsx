import { useRef, type KeyboardEvent } from 'react'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}

/**
 * Opciones excluyentes (pestañas, Max/Min): texto plano, la activa subrayada con tinta.
 * Con el teclado se entra con Tab a la opción activa y se cambia con las flechas.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.value === value)
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else return
    event.preventDefault()
    // Las flechas no deben mover también el paso a paso.
    event.stopPropagation()
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-4" onKeyDown={onKeyDown}>
      {options.map((option, i) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer border-b-[1.5px] pb-1 text-[13px] transition-colors duration-200 ${
              active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
