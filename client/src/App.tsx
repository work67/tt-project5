import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  timestamp: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json() as Promise<HealthResponse>
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <main className="app">
      <h1>Full Stack Boilerplate</h1>
      <p>React + TypeScript frontend, Express + TypeScript backend.</p>

      <section className="card">
        <h2>API status</h2>
        {error && <p className="error">{error}</p>}
        {!error && !health && <p>Loading…</p>}
        {health && (
          <p>
            <strong>{health.status}</strong> at{' '}
            {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        )}
      </section>
    </main>
  )
}

export default App
