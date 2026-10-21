import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import type { Db, SqlValue } from './types.js'

// Resolved from this file so they work from both src/ (tsx) and dist/ (node).
export const LOCAL_DB_PATH = fileURLToPath(new URL('../../data/local.db', import.meta.url))
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))

export class SqliteDb implements Db {
  readonly raw: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.raw = new DatabaseSync(path)
    this.raw.exec('PRAGMA foreign_keys = ON')
  }

  async get<T>(sql: string, ...params: SqlValue[]) {
    return this.raw.prepare(sql).get(...params) as T | undefined
  }

  async all<T>(sql: string, ...params: SqlValue[]) {
    return this.raw.prepare(sql).all(...params) as T[]
  }

  async run(sql: string, ...params: SqlValue[]) {
    const { changes } = this.raw.prepare(sql).run(...params)
    return { changes: Number(changes) }
  }

  /** Drops every table, index and view, leaving an empty database. */
  reset() {
    const objects = this.raw
      .prepare(
        "SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { type: 'table' | 'view'; name: string }[]

    this.raw.exec('PRAGMA foreign_keys = OFF')
    try {
      for (const { type, name } of objects) {
        this.raw.exec(`DROP ${type.toUpperCase()} IF EXISTS "${name.replaceAll('"', '""')}"`)
      }
    } finally {
      this.raw.exec('PRAGMA foreign_keys = ON')
    }
  }

  /** Applies pending .sql files from migrationsDir, tracked the same way as `wrangler d1 migrations`. */
  migrate(migrationsDir: string) {
    this.raw.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    const applied = new Set(
      this.raw
        .prepare('SELECT name FROM d1_migrations')
        .all()
        .map((row) => row.name as string),
    )
    const pending = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql') && !applied.has(file))
      .sort()

    for (const file of pending) {
      this.raw.exec('BEGIN')
      try {
        this.raw.exec(readFileSync(join(migrationsDir, file), 'utf8'))
        this.raw.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(file)
        this.raw.exec('COMMIT')
      } catch (err) {
        this.raw.exec('ROLLBACK')
        throw err
      }
    }
    return pending
  }
}
