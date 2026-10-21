import { useState, type FormEvent } from 'react'
import { api, ApiError, type User } from './api'

type Mode = 'login' | 'register'

const PASSWORD_RULES = [
  '8–128 characters',
  'An uppercase and a lowercase letter',
  'A number and a symbol',
  'Must not contain your username',
]

export function AuthForm({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setErrors([])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])
    try {
      const user = await (mode === 'login' ? api.login : api.register)({ username, password })
      onAuthenticated(user)
    } catch (err) {
      setErrors(err instanceof ApiError ? err.errors : ['Something went wrong. Please try again.'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card auth-form" onSubmit={handleSubmit}>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => switchMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </label>

      {mode === 'register' && (
        <ul className="hint">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul className="error" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="primary" disabled={submitting}>
        {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
    </form>
  )
}
