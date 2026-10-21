// Cloudflare Workers entry point: the same Express app, backed by D1.
// The Worker also serves the built client (see "assets" in wrangler.jsonc).
import { httpServerHandler } from 'cloudflare:node'
import { env } from 'cloudflare:workers'
import { createApp } from './app.js'
import { D1Db } from './db/d1.js'

const PORT = 3000

createApp({ db: new D1Db(env.DB), secureCookies: true }).listen(PORT)

export default httpServerHandler({ port: PORT })
