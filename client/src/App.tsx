import { useEffect, useState } from 'react'
import { api, type User } from './api'
import { AuthForm } from './AuthForm'
import './App.css'

function App() {
  // undefined = still checking the session, null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((err: Error) => setError(err.message))
  }, [])

  async function handleLogout() {
    await api.logout()
    setUser(null)
  }

  return (
    <main className="app">
      <h1>Full Stack Boilerplate</h1>
      <p>React + TypeScript frontend, Express + TypeScript backend.</p>

      {error && <p className="error">{error}</p>}
      {!error && user === undefined && <p>Loading…</p>}
      {user === null && <AuthForm onAuthenticated={setUser} />}
      {user && (
        <section className="card">
          <p>
            Signed in as <strong>{user.username}</strong>
          </p>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </section>
      )}
    </main>
  )
}

export default App
