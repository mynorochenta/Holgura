const REPOSITORY_URL = 'https://github.com/mynorochenta/Holgura'

interface HeaderProps {
  onHome: () => void
}

/** Marca: un recipiente con un nivel de llenado, la "holgura" que queda libre arriba. */
function BrandMark() {
  return (
    <span aria-hidden className="relative inline-block size-[18px] rounded-[3px] border-2 border-sel-acento">
      <span className="absolute inset-x-[3px] bottom-[3px] h-[5px] rounded-[1px] bg-sel-acento" />
    </span>
  )
}

export function Header({ onHome }: HeaderProps) {
  return (
    <header className="border-b border-linea">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-7">
        <button
          type="button"
          onClick={onHome}
          className="flex cursor-pointer items-center gap-2.5 text-lg font-semibold tracking-tight"
        >
          <BrandMark />
          Holgura
        </button>
        <nav className="flex items-center gap-5 text-sm text-tinta-suave">
          <span className="hidden text-tinta sm:inline">Simplex · Gran M</span>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-200 hover:text-tinta"
          >
            Código fuente
          </a>
        </nav>
      </div>
    </header>
  )
}
