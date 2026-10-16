import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import type { NumberFormat } from './core/fraction'
import type { LinearModel } from './core/model'
import { parseModel } from './core/parser'
import { EXAMPLES, type Example } from './examples'
import { InputPage, type InputTab } from './pages/InputPage'
import { SolutionPage } from './pages/SolutionPage'

const FIRST_EXAMPLE = EXAMPLES[0]

function App() {
  const [text, setText] = useState(FIRST_EXAMPLE.text)
  const [lastValidModel, setLastValidModel] = useState<LinearModel | null>(() => parseModel(FIRST_EXAMPLE.text).model)
  const [tab, setTab] = useState<InputTab>('text')
  const [activeExampleId, setActiveExampleId] = useState<string | null>(FIRST_EXAMPLE.id)
  const [tableKey, setTableKey] = useState(0)
  const [solvedModel, setSolvedModel] = useState<LinearModel | null>(null)
  const [format, setFormat] = useState<NumberFormat>('decimal')

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
    setSolvedModel(parsed.model)
    window.scrollTo({ top: 0 })
  }

  function edit() {
    setSolvedModel(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen">
      <Header onHome={edit} />
      <main>
        {solvedModel ? (
          <SolutionPage model={solvedModel} format={format} onFormatChange={setFormat} onEdit={edit} />
        ) : (
          <InputPage
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
        )}
      </main>
    </div>
  )
}

export default App
