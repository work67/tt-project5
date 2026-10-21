import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// scrypt's interactive-login parameters (16 MiB of memory). They are stored
// with each hash, so they can be raised later without breaking old hashes.
const N = 16384
const r = 8
const p = 1
const KEY_LENGTH = 64

function deriveKey(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

/** Returns a self-describing hash: `scrypt$N$r$p$salt$key` (salt and key in base64url). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt, { N, r, p })
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, rr, pp, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false

  const expected = Buffer.from(key, 'base64url')
  const actual = await deriveKey(password, Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(rr),
    p: Number(pp),
  })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
