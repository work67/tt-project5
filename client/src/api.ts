export type User = {
  username: string
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor(message: string, status: number, errors: string[] = [message]) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.errors)
  }
  return body as T
}

type Credentials = { username: string; password: string }

export const api = {
  async me() {
    try {
      return (await request<{ user: User }>('/auth/me')).user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null
      throw err
    }
  },
  async login(credentials: Credentials) {
    return (await request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })).user
  },
  async register(credentials: Credentials) {
    return (await request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })).user
  },
  logout() {
    return request<void>('/auth/logout', { method: 'POST' })
  },
}
