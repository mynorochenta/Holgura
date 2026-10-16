// Spotlight Card de React Bits (https://reactbits.dev/components/spotlight-card), variante TS + Tailwind.
// Ajustes para Holgura: la posición del brillo se guarda en variables CSS (no en estado de React,
// así la tabla no se vuelve a renderizar con cada movimiento del mouse), el brillo usa
// mix-blend-mode: multiply para no lavar el texto, y el estilo base es la tarjeta del proyecto.

import { useRef, useState, type HTMLAttributes, type MouseEvent } from 'react'

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Color del brillo; por defecto, el pastel de la operación actual (--spot). */
  spotlightColor?: string
}

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'var(--spot, var(--color-sel))',
  ...rest
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    divRef.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    divRef.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(0.55)}
      onMouseLeave={() => setOpacity(0)}
      className={`card relative ${className}`}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          mixBlendMode: 'multiply',
          background: `radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  )
}
