// Resets a database and seeds sample users. Everything else in the database is deleted.
//   npm run db:seed         local SQLite (Node dev server)
//   npm run cf:seed:local   local D1 (wrangler dev)
//   npm run cf:seed         remote D1 (production)
// Each run drops every table, re-applies all migrations, then adds the users.
// The password comes from SEED_PASSWORD (default "password").
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from '../auth/password.js'
import { LOCAL_DB_PATH, MIGRATIONS_DIR, SqliteDb } from '../db/sqlite.js'

const SAMPLE_USERS = ['alice', 'bob', 'charlie']
const DEFAULT_PASSWORD = 'password'
const INSERT_USER = 'INSERT INTO users (username, password_hash) VALUES (?, ?)'

// --d1=local or --d1=remote targets D1 through wrangler; no flag means local SQLite.
const d1Arg = process.argv.find((arg) => arg.startsWith('--d1='))?.slice('--d1='.length)
if (d1Arg && d1Arg !== 'local' && d1Arg !== 'remote') {
  console.error(`Unknown --d1 target "${d1Arg}". Use --d1=local or --d1=remote.`)
  process.exit(1)
}
const d1Target = d1Arg as 'local' | 'remote' | undefined

const password = process.env.SEED_PASSWORD || DEFAULT_PASSWORD
if (d1Target === 'remote' && password === DEFAULT_PASSWORD) {
  console.warn(`Warning: SEED_PASSWORD is not set; production users get "${DEFAULT_PASSWORD}".`)
}

const users = await Promise.all(
  SAMPLE_USERS.map(async (username) => ({ username, hash: await hashPassword(password) })),
)

if (d1Target) {
  await seedD1(d1Target)
} else {
  const db = new SqliteDb(process.env.DATABASE_PATH || LOCAL_DB_PATH)
  db.reset()
  db.migrate(MIGRATIONS_DIR)
  console.log('Reset local database')
  for (const { username, hash } of users) {
    await db.run(INSERT_USER, username, hash)
    console.log(`Created ${username}`)
  }
}

async function seedD1(target: 'local' | 'remote') {
  // Run wrangler's JS entry with node directly (no shell), so SQL needs no shell quoting on any OS.
  const require = createRequire(import.meta.url)
  const wranglerBin = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js')
  const serverDir = fileURLToPath(new URL('../../', import.meta.url))

  function wrangler(args: string[], { capture = false } = {}) {
    const result = spawnSync(process.execPath, [wranglerBin, ...args, `--${target}`], {
      cwd: serverDir,
      encoding: 'utf8',
      stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    })
    if (result.status !== 0) {
      if (capture) console.error(result.stdout)
      process.exit(result.status ?? 1)
    }
    return result.stdout
  }

  function execute(sql: string) {
    return wrangler(['d1', 'execute', 'DB', '--json', '--command', sql], { capture: true })
  }

  // Leave SQLite's and Cloudflare's internal tables (sqlite_*, _cf_*) alone.
  const [{ results }] = JSON.parse(
    execute(`SELECT type, name FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND substr(name, 1, 7) != 'sqlite_'
        AND substr(name, 1, 4) != '_cf_'`),
  ) as [{ results: { type: 'table' | 'view'; name: string }[] }]

  if (results.length > 0) {
    // D1 can't turn foreign keys off, but deferring them lets parents drop before children.
    execute(
      [
        'PRAGMA defer_foreign_keys = on',
        ...results.map(
          ({ type, name }) => `DROP ${type.toUpperCase()} IF EXISTS "${name.replaceAll('"', '""')}"`,
        ),
      ].join('; '),
    )
  }
  console.log(`Dropped ${results.length} table(s) from ${target} D1`)

  wrangler(['d1', 'migrations', 'apply', 'DB'])

  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
  execute(
    users
      .map(({ username, hash }) => INSERT_USER.replace('?', quote(username)).replace('?', quote(hash)))
      .join('; '),
  )
  for (const { username } of users) console.log(`Created ${username}`)
}
