import { createHash, randomBytes } from 'node:crypto'
import type { Db } from '../db/types.js'

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a session and returns the raw token to put in the cookie. */
export async function createSession(db: Db, username: string) {
  const token = randomBytes(32).toString('base64url')
  await db.run(
    'INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)',
    hashToken(token),
    username,
    Date.now() + SESSION_TTL_MS,
  )
  return token
}

/** Returns the username for a valid session token, or undefined. */
export async function getSessionUsername(db: Db, token: string) {
  const id = hashToken(token)
  const session = await db.get<{ username: string; expires_at: number }>(
    'SELECT username, expires_at FROM sessions WHERE id = ?',
    id,
  )
  if (!session) return undefined
  if (session.expires_at <= Date.now()) {
    await db.run('DELETE FROM sessions WHERE id = ?', id)
    return undefined
  }
  return session.username
}

export async function deleteSession(db: Db, token: string) {
  await db.run('DELETE FROM sessions WHERE id = ?', hashToken(token))
}
