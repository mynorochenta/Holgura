function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-sm tracking-wide text-acento">
        Investigación de Operaciones
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Holgura
      </h1>
      <p className="mt-2 text-xl text-tinta-suave sm:text-2xl">
        Programación lineal paso a paso
      </p>

      <hr className="my-8 border-linea" />

      <p className="max-w-xl leading-relaxed">
        Método Simplex con Gran M, problema dual y análisis de sensibilidad,
        con cada tabla e iteración explicada como en clase.
      </p>

      <pre className="mt-8 overflow-x-auto rounded border border-linea bg-white/60 p-4 font-mono text-sm leading-6">
{`Máx  Z = 40x₁ + 30x₂
s.a.     2x₁ +   x₂ ≤  40
         3x₁ +  4x₂ ≤ 120
          x₁, x₂ ≥ 0`}
      </pre>
    </main>
  )
}

export default App
