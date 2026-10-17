import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { StepText } from '../core/steps'
import { MathText } from './MathText'
import { subscript } from './text'
import { toneVars, type Tone } from './tone'

interface TimelineProps {
  texts: StepText[]
  tones: Tone[]
  current: number
  /** dragging: true mientras se arrastra (sin animaciones de paso). */
  onGo: (index: number, dragging: boolean) => void
}

interface Group {
  label: string
  items: number[]
}

/** Etiqueta corta para celular: "Iteración 2" → "It. 2". */
function shortLabel(label: string): string {
  if (label === 'Preparación') return 'Inicio'
  if (label === 'Resultado') return 'Fin'
  return label.replace('Iteración', 'It.')
}

/**
 * Línea de tiempo arrastrable: un segmento por paso con el color de su operación, agrupados por
 * iteración. Se arrastra con el mouse o el dedo; el indicador muestra el nombre del paso.
 */
export function Timeline({ texts, tones, current, onGo }: TimelineProps) {
  const root = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [centers, setCenters] = useState<number[]>([])
  const [width, setWidth] = useState(0)

  const groups: Group[] = []
  texts.forEach((text, i) => {
    const last = groups[groups.length - 1]
    if (last && last.label === text.kicker) last.items.push(i)
    else groups.push({ label: text.kicker, items: [i] })
  })

  // Centro de cada segmento, para el indicador y para elegir el paso más cercano al dedo.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => {
      const origin = el.getBoundingClientRect()
      const segments = el.querySelectorAll<HTMLElement>('[data-seg]')
      setCenters(Array.from(segments, (s) => {
        const r = s.getBoundingClientRect()
        return r.left - origin.left + r.width / 2
      }))
      setWidth(origin.width)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [texts.length])

  function nearest(clientX: number): number {
    const el = root.current
    if (!el || centers.length === 0) return current
    const x = clientX - el.getBoundingClientRect().left
    let best = 0
    centers.forEach((c, i) => {
      if (Math.abs(c - x) < Math.abs(centers[best] - x)) best = i
    })
    return best
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    dragging.current = true
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    const index = nearest(event.clientX)
    if (index !== current) onGo(index, true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const index = nearest(event.clientX)
    if (dragging.current) {
      if (index !== current) onGo(index, true)
    } else if (event.pointerType === 'mouse') setHover(index)
  }

  function endDrag() {
    dragging.current = false
    setIsDragging(false)
  }

  const labelIndex = isDragging ? current : (hover ?? current)
  const showLabel = isDragging || hover !== null
  const labelX = centers[labelIndex] ?? 0
  const thumbX = centers[current] ?? 0
  // El indicador se alinea al borde cuando el segmento está cerca de una orilla.
  const labelShift = labelX < width * 0.2 ? '-12px' : labelX > width * 0.8 ? 'calc(-100% + 12px)' : '-50%'

  return (
    <div
      ref={root}
      className={`timeline ${isDragging ? 'dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Línea de tiempo de los pasos"
      aria-valuemin={1}
      aria-valuemax={texts.length}
      aria-valuenow={current + 1}
      aria-valuetext={`Paso ${current + 1} de ${texts.length}: ${subscript(texts[current]?.title ?? '')}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => setHover(null)}
    >
      <div className="flex gap-2 sm:gap-3.5">
        {groups.map((group) => (
          <div key={group.label} className="flex min-w-0 flex-col gap-1.5" style={{ flex: Math.max(group.items.length, 2.5) }}>
            <div className="flex gap-[3px]">
              {group.items.map((i) => {
                const vars = toneVars(tones[i])
                return (
                  <div
                    key={i}
                    data-seg
                    className={`segment ${i < current ? 'done' : i === current ? 'current' : ''}`}
                    style={{ '--a': vars.accent, '--t': vars.pastel } as CSSProperties}
                  />
                )
              })}
            </div>
            <div className="truncate text-[11px] tracking-[0.06em] text-muted uppercase">
              <span className="hidden sm:inline">{group.label}</span>
              <span className="sm:hidden">{shortLabel(group.label)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="timeline-thumb" style={{ transform: `translateX(${thumbX - 1}px)` }} />
      {showLabel && texts[labelIndex] && (
        <div
          className="timeline-label"
          style={{ left: labelX, transform: `translateX(${labelShift})` }}
        >
          {labelIndex + 1}. <MathText text={texts[labelIndex].title} />
        </div>
      )}
    </div>
  )
}
