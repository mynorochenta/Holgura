interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Opciones excluyentes (pestañas, Max/Min): texto plano, la activa subrayada con tinta. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-4">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
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
