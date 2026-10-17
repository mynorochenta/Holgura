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
  const [solved, setSolved] = useState<{ model: LinearModel; text: string; key: number } | null>(null)
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

  function selectExample(example: Example) {
    changeText(example.text)
    setTableKey((k) => k + 1)
  }

  function solve() {
    if (!parsed.model) return
    setSolved((prev) => ({ model: parsed.model!, text, key: (prev?.key ?? 0) + 1 }))
  }

  // Al resolver, baja hasta la solución.
  const solvedKey = solved?.key
  useEffect(() => {
    if (solvedKey === undefined) return
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
