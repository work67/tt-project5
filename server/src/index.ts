// Local development entry point (Node + SQLite). Production runs src/worker.ts on Cloudflare.
import 'dotenv/config'
import { createApp } from './app.js'
import { LOCAL_DB_PATH, MIGRATIONS_DIR, SqliteDb } from './db/sqlite.js'

const port = Number(process.env.PORT) || 3000

const db = new SqliteDb(process.env.DATABASE_PATH || LOCAL_DB_PATH)
for (const name of db.migrate(MIGRATIONS_DIR)) console.log(`Applied migration ${name}`)

const app = createApp({
  db,
  secureCookies: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CLIENT_ORIGIN,
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
