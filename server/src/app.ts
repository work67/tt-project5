import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import type { Db } from './db/types.js'
import { authRouter } from './routes/auth.js'
import { healthRouter } from './routes/health.js'

type AppOptions = {
  db: Db
  secureCookies: boolean
  /** Origin allowed to call the API cross-origin. Omit when the client is served from the same origin. */
  corsOrigin?: string
}

export function createApp({ db, secureCookies, corsOrigin }: AppOptions) {
  const app = express()

  if (corsOrigin) app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter({ db, secureCookies }))

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
  app.use(errorHandler)

  return app
}
