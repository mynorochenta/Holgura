import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Section } from './components/Section'
import type { NumberFormat } from './core/fraction'
import type { LinearModel } from './core/model'
import { parseModel } from './core/parser'
import { EXAMPLES, type Example } from './examples'
import { useTheme } from './hooks/useTheme'
import { ModelSection, type InputTab } from './pages/ModelSection'
import { SolutionSection } from './pages/SolutionSection'

const FIRST_EXAMPLE = EXAMPLES[0]

interface Solved {
  model: LinearModel
  text: string
  key: number
  /** Ejemplo resuelto, si el texto es exactamente el de uno: da la lectura de la solución. */
  example?: Example
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function App() {
  const [theme, setTheme] = useTheme()
  const [text, setText] = useState(FIRST_EXAMPLE.text)
  const [lastValidModel, setLastValidModel] = useState<LinearModel | null>(() => parseModel(FIRST_EXAMPLE.text).model)
  const [tab, setTab] = useState<InputTab>('text')
  const [activeExampleId, setActiveExampleId] = useState<string | null>(FIRST_EXAMPLE.id)
  const [tableKey, setTableKey] = useState(0)
  // Al abrir, el primer ejemplo ya está resuelto: la solución paso a paso se ve desde el principio.
  const [solved, setSolved] = useState<Solved | null>(() => ({
    model: parseModel(FIRST_EXAMPLE.text).model!,
    text: FIRST_EXAMPLE.text,
    key: 0,
    example: FIRST_EXAMPLE,
  }))
  const [format, setFormat] = useState<NumberFormat>('decimal')
  const solutionRef = useRef<HTMLElement>(null)

  const parsed = useMemo(() => parseModel(text), [text])

  function changeText(next: string) {
    setText(next)
    const model = parseModel(next).model
    if (model) setLastValidModel(model)
    const example = EXAMPLES.find((e) => e.text === next)
    setActiveExampleId(example?.id ?? null)
  }

  function solveText(source: string) {
    const model = parseModel(source).model
    if (!model) return
    const example = EXAMPLES.find((e) => e.text === source)
    setSolved((prev) => ({ model, text: source, key: (prev?.key ?? 0) + 1, example }))
  }

  /** Un ejemplo se carga y se resuelve de inmediato: su modelo siempre es válido. */
  function selectExample(example: Example) {
    changeText(example.text)
    setTableKey((k) => k + 1)
    solveText(example.text)
  }

  function solve() {
    solveText(text)
  }

  // Al resolver, baja hasta la solución.
  // (La solución inicial, key 0, no mueve la página.)
  const solvedKey = solved?.key
  useEffect(() => {
    if (!solvedKey) return
    solutionRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [solvedKey])

  const stale = solved !== null && solved.text !== text

  return (
    <>
      <Header format={format} onFormatChange={setFormat} theme={theme} onThemeChange={setTheme} />
      <main className="sheet">
        <ModelSection
          text={text}
          parsed={parsed}
          lastValidModel={lastValidModel}
          tab={tab}
          onTabChange={setTab}
          onTextChange={changeText}
          activeExampleId={activeExampleId}
          tableKey={tableKey}
          onSelectExample={selectExample}
          onSolve={solve}
        />
        {solved ? (
          <SolutionSection
            key={solved.key}
            ref={solutionRef}
            model={solved.model}
            example={solved.example}
            format={format}
            theme={theme}
            stale={stale}
            canResolve={parsed.model !== null}
            onResolve={solve}
          />
        ) : (
          <Section number={2} title="Solución">
            <p className="text-muted">
              Presiona <span className="text-ink">Resolver</span> para ver la solución paso a paso: cada operación de
              renglón, con su cálculo y su explicación.
            </p>
          </Section>
        )}
      </main>
    </>
  )
}

export default App
