interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Control segmentado: pestañas, Max/Min, Decimales/Fracciones. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-suave p-[3px]">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-all duration-200 active:scale-[0.97] ${
              active ? 'bg-hoja text-tinta shadow-hoja' : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
