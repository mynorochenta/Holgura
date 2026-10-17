// Anotaciones a mano (rough-notation) sobre los elementos marcados con data-rough.
//
// rough-notation inserta su SVG junto al elemento anotado. Para no meter nodos ajenos en el DOM que
// controla React (filas y celdas de la tabla), cada anotación se dibuja sobre un "proxy": un div
// invisible con la misma posición y tamaño que el elemento, dentro de una capa que React deja vacía.
//
// Marcado: data-rough="circle | box | underline" y data-rough-color="var(--sel)" (o un color fijo).
// Las variables CSS se resuelven al dibujar: la clave debe cambiar con el tema para redibujar.

import { annotate } from 'rough-notation'
import type { RoughAnnotation, RoughAnnotationType } from 'rough-notation/lib/model'
import { useEffect, type RefObject } from 'react'

/** "var(--sel)" → el color que tiene esa variable en el tema actual. */
function resolveColor(color: string | undefined, element: Element): string | undefined {
  const match = color && /^var\((--[\w-]+)\)$/.exec(color)
  return match ? getComputedStyle(element).getPropertyValue(match[1]).trim() : color
}

const PADDING: Partial<Record<RoughAnnotationType, number | [number, number]>> = {
  circle: [5, 11],
  box: [1, 4],
  underline: 1,
}

export function useRoughAnnotations(
  container: RefObject<HTMLElement | null>,
  layer: RefObject<HTMLElement | null>,
  /** Cambia en cada paso: las anotaciones se vuelven a dibujar con animación. */
  key: string,
  animate: boolean,
) {
  useEffect(() => {
    const root = container.current
    const overlay = layer.current
    if (!root || !overlay) return

    let annotations: RoughAnnotation[] = []
    let drawn = false
    let resizeTimer: ReturnType<typeof setTimeout> | undefined

    const clear = () => {
      annotations.forEach((a) => a.remove())
      annotations = []
      overlay.replaceChildren()
    }

    const draw = (withAnimation: boolean) => {
      clear()
      const origin = overlay.getBoundingClientRect()
      root.querySelectorAll<HTMLElement>('[data-rough]').forEach((element) => {
        const rect = element.getBoundingClientRect()
        const proxy = document.createElement('div')
        Object.assign(proxy.style, {
          position: 'absolute',
          left: `${rect.left - origin.left}px`,
          top: `${rect.top - origin.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        })
        overlay.appendChild(proxy)
        const type = element.dataset.rough as RoughAnnotationType
        const annotation = annotate(proxy, {
          type,
          color: resolveColor(element.dataset.roughColor, element),
          animate: withAnimation,
          animationDuration: type === 'underline' ? 450 : 650,
          strokeWidth: type === 'circle' ? 1.8 : 1.6,
          padding: PADDING[type],
          iterations: type === 'circle' ? 2 : 1,
        })
        annotation.show()
        annotations.push(annotation)
      })
      drawn = true
    }

    // Se espera a que la tabla termine de acomodarse (columna de razón, números nuevos).
    const firstDraw = setTimeout(() => draw(animate), 90)

    // Si la tabla cambia de tamaño, se redibuja sin animación en la nueva posición.
    const observer = new ResizeObserver(() => {
      if (!drawn) return
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => draw(false), 160)
    })
    observer.observe(root)

    return () => {
      clearTimeout(firstDraw)
      clearTimeout(resizeTimer)
      observer.disconnect()
      clear()
    }
  }, [container, layer, key, animate])
}
