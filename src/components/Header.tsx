import type { NumberFormat } from '../core/fraction'
import { THEMES, type Theme } from '../hooks/useTheme'

const REPOSITORY_URL = 'https://github.com/mynorochenta/Holgura'

interface HeaderProps {
  format: NumberFormat
  onFormatChange: (format: NumberFormat) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

export function Header({ format, onFormatChange, theme, onThemeChange }: HeaderProps) {
  const next = format === 'decimal' ? 'fraction' : 'decimal'
  return (
    <header className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4 px-4 pt-5 pb-3.5 sm:px-7 sm:pt-6">
      <div>
        <h1 className="font-display text-[29px] leading-none tracking-[-0.01em]">Holgura</h1>
        <p className="mt-1.5 text-xs tracking-[0.02em] text-muted">Programación lineal, paso a paso</p>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted sm:gap-5">
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden transition-colors duration-200 hover:text-ink sm:inline"
        >
          Código fuente
        </a>
        <button
          type="button"
          className="btn gap-2 px-2.5 py-1 text-xs"
          onClick={() => onFormatChange(next)}
          title={format === 'decimal' ? 'Ver los números en fracciones' : 'Ver los números en decimales'}
          aria-label={`Formato de los números: ${format === 'decimal' ? 'decimales' : 'fracciones'}. Cambiar a ${format === 'decimal' ? 'fracciones' : 'decimales'}`}
        >
          Formato
          <b className="min-w-7 text-center font-display text-sm font-normal">{format === 'decimal' ? '2.5' : '5/2'}</b>
        </button>
        <div className="flex items-end gap-[7px]" role="radiogroup" aria-label="Tema">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              aria-label={t.label}
              title={t.label}
              className="paper-swatch"
              style={{ background: t.swatch }}
              onClick={() => onThemeChange(t.id)}
            />
          ))}
        </div>
      </div>
    </header>
  )
}
