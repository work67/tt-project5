import { Router, type CookieOptions, type RequestHandler, type Response } from 'express'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createSession,
  deleteSession,
  getSessionUsername,
  SESSION_TTL_MS,
} from '../auth/sessions.js'
import { validatePassword, validateUsername } from '../auth/validation.js'
import type { Db } from '../db/types.js'

export const SESSION_COOKIE = 'sid'

declare global {
  namespace Express {
    interface Locals {
      username: string
    }
  }
}

type AuthOptions = {
  db: Db
  /** Send the cookie over HTTPS only. Enable everywhere except local HTTP. */
  secureCookies: boolean
}

function readCredentials(body: unknown) {
  const { username, password } = (body ?? {}) as Record<string, unknown>
  return {
    username: typeof username === 'string' ? username.trim() : '',
    password: typeof password === 'string' ? password : '',
  }
}

/** Rejects requests without a valid session; otherwise sets `res.locals.username`. */
export function requireAuth(db: Db): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE]
    const username = typeof token === 'string' ? await getSessionUsername(db, token) : undefined
    if (!username) {
      res.status(401).json({ error: 'Not signed in.' })
      return
    }
    res.locals.username = username
    next()
  }
}

export function authRouter({ db, secureCookies }: AuthOptions) {
  const router = Router()
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
  }

  // Verifying against a throwaway hash when the user doesn't exist keeps login
  // timing the same, so response time doesn't reveal which usernames exist.
  let dummyHash: Promise<string> | undefined

  async function startSession(res: Response, username: string) {
    const token = await createSession(db, username)
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS })
  }

  async function endSession(token: unknown, res: Response) {
    if (typeof token === 'string') await deleteSession(db, token)
    res.clearCookie(SESSION_COOKIE, cookieOptions)
  }

  router.post('/register', async (req, res) => {
    const { username, password } = readCredentials(req.body)
    const errors = [...validateUsername(username), ...validatePassword(password, username)]
    if (errors.length > 0) {
      res.status(400).json({ error: errors[0], errors })
      return
    }

    const { changes } = await db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) ON CONFLICT (username) DO NOTHING',
      username,
      await hashPassword(password),
    )
    if (changes === 0) {
      res.status(409).json({ error: 'That username is already taken.' })
      return
    }

    await startSession(res, username)
    res.status(201).json({ user: { username } })
  })

  router.post('/login', async (req, res) => {
    const { username, password } = readCredentials(req.body)
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' })
      return
    }

    const user = await db.get<{ username: string; password_hash: string }>(
      'SELECT username, password_hash FROM users WHERE username = ?',
      username,
    )
    dummyHash ??= hashPassword('dummy-password')
    const valid = await verifyPassword(password, user?.password_hash ?? (await dummyHash))
    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid username or password.' })
      return
    }

    await endSession(req.cookies?.[SESSION_COOKIE], res)
    await startSession(res, user.username)
    res.json({ user: { username: user.username } })
  })

  router.post('/logout', async (req, res) => {
    await endSession(req.cookies?.[SESSION_COOKIE], res)
    res.status(204).end()
  })

  router.get('/me', requireAuth(db), (_req, res) => {
    res.json({ user: { username: res.locals.username } })
  })

  return router
}
