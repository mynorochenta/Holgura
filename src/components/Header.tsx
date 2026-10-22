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
    <header className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 pt-6 pb-5 sm:px-10">
      <div>
        <h1 className="font-display text-[25px] leading-none tracking-[-0.01em] sm:text-[29px]">Holgura</h1>
        <p className="mt-1.5 text-[14px] text-muted">Programación lineal, paso a paso</p>
      </div>
      <div className="flex items-center gap-4 text-[13px] text-muted sm:gap-6">
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
          className="btn min-h-9 gap-2 px-3 text-[13px]"
          onClick={() => onFormatChange(next)}
          title={format === 'decimal' ? 'Ver los números en fracciones' : 'Ver los números en decimales'}
          aria-label={`Formato de los números: ${format === 'decimal' ? 'decimales' : 'fracciones'}. Cambiar a ${format === 'decimal' ? 'fracciones' : 'decimales'}`}
        >
          Formato
          <b className="min-w-7 text-center font-display text-sm font-normal">{format === 'decimal' ? '2.5' : '5/2'}</b>
        </button>
        <div className="flex items-end gap-[7px]" role="group" aria-label="Tema de la hoja">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={theme === t.id}
              aria-label={`Tema ${t.label}`}
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
