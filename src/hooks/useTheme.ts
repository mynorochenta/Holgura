// Tema de la hoja (Papel, Blanco, Sepia, Pizarra). Se recuerda en localStorage; si el navegador
// no lo permite (modo privado, almacenamiento bloqueado), se usa Papel sin fallar.
// index.html aplica el tema guardado antes de pintar para evitar un destello.

import { useEffect, useState } from 'react'

export type Theme = 'papel' | 'blanco' | 'sepia' | 'pizarra'

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: 'papel', label: 'Papel', swatch: '#F0EFEB' },
  { id: 'blanco', label: 'Blanco', swatch: '#FFFFFF' },
  { id: 'sepia', label: 'Sepia', swatch: '#ECE0C8' },
  { id: 'pizarra', label: 'Pizarra', swatch: '#1A1C20' },
]

const STORAGE_KEY = 'holgura-tema'

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (THEMES.some((t) => t.id === saved)) return saved as Theme
  } catch {
    // Sin acceso al almacenamiento: tema predeterminado.
  }
  return 'papel'
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // La barra del navegador en celular toma el color del papel.
    const swatch = THEMES.find((t) => t.id === theme)?.swatch
    if (swatch) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', swatch)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Se ignora: el tema funciona igual durante la visita.
    }
  }, [theme])

  return [theme, setTheme]
}
