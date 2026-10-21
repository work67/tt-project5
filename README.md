# Project 5

Full stack TypeScript app with username/password authentication.

- `client/`: React 19 + TypeScript + Vite
- `server/`: Express 5 + TypeScript
  - **Local:** runs on Node with SQLite (`node:sqlite`, stored in `server/data/local.db`)
  - **Production:** runs the same Express app on Cloudflare Workers with a D1 database; the Worker also serves the built client

## Getting started

```sh
npm install
npm run db:seed   # (re)creates the local database with sample users
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3000/api

In development, Vite forwards `/api/*` to the Express server, so the client calls `fetch('/api/...')` and the session cookie stays same-origin.

### Sample users

Seeding **resets the whole database**: it drops every table, re-applies all migrations, then creates `alice`, `bob` and `charlie`. All other data is lost.

| Command                           | Database                       |
| --------------------------------- | ------------------------------ |
| `npm run db:seed`                 | Local SQLite (Node dev server) |
| `npm run cf:seed:local -w server` | Local D1 (`wrangler dev`)      |
| `npm run cf:seed -w server`       | Production D1                  |

The password is `SEED_PASSWORD` if set, otherwise `password`. Set it in your shell when seeding production rather than committing it, for example in PowerShell:

```powershell
$env:SEED_PASSWORD = '<production password>'; npm run cf:seed -w server; Remove-Item Env:SEED_PASSWORD
```

## Auth API

| Method | Path                 | Body                     | Result                                       |
| ------ | -------------------- | ------------------------ | -------------------------------------------- |
| POST   | `/api/auth/register` | `{ username, password }` | `201 { user }` and signs in, `400`, or `409` |
| POST   | `/api/auth/login`    | `{ username, password }` | `200 { user }` or `401`                      |
| POST   | `/api/auth/logout`   |                          | `204`                                        |
| GET    | `/api/auth/me`       |                          | `200 { user }` or `401`                      |

- **Usernames** are the primary key: 3–32 letters, numbers or underscores, case-insensitive (`Alice` and `alice` are the same account).
- **Passwords** need 8–128 characters, an uppercase and a lowercase letter, a number and a symbol, and must not contain the username. Rules live in `server/src/auth/validation.ts`.
- **Passwords** are hashed with scrypt.
- **Sessions** are random tokens in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only a SHA-256 hash of the token is stored, so logging out revokes the session on the server. Sessions last 7 days.
- To protect another route, use `requireAuth(db)` from `server/src/routes/auth.ts`; it sets `res.locals.username`.

## Database

Migrations are plain SQL files in `server/migrations/`, shared by both environments:

- **Local:** applied automatically when the server starts, and by `npm run db:seed`.
- **Production:** applied with `npm run cf:migrate -w server` (`wrangler d1 migrations apply`).

To add a table, create the next numbered file, for example `0002_add_posts.sql`.

## Deploying to Cloudflare

First create the D1 database (once):

```sh
cd server
npx wrangler login
npx wrangler d1 create tt-project5-db   # copy the database_id into wrangler.jsonc and commit it
```

### Deploying with GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main`: typecheck, build the client, apply D1 migrations, then deploy the Worker. Pushes never touch existing data. Until Cloudflare is configured, the deploy steps are skipped with a warning and the run stays green.

Add these in the repo's **Settings → Secrets and variables → Actions**:

| Name                    | Kind              | Value                                                                                       |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Secret            | API token with **Workers Scripts: Edit** and **D1: Edit** permissions on your account       |
| `CLOUDFLARE_ACCOUNT_ID` | Secret or variable | Your account ID (`npx wrangler whoami`)                                                     |
| `SEED_PASSWORD`         | Secret            | Password for the sample users. Reseeding refuses to run without it (never the default `password`) |

A fresh database has no users. To seed it, or to start over later, run the workflow manually (**Actions → Deploy to Cloudflare → Run workflow**) with **Reseed database** ticked. It runs `cf:seed`, which drops every table, re-applies migrations, and recreates the sample users with the current `SEED_PASSWORD`.

### Deploying from your machine

```sh
cd server
npm run cf:migrate   # apply D1 migrations
npm run cf:seed      # optional: reset D1 and add sample users (password from SEED_PASSWORD)
cd ..
npm run deploy       # build the client, then wrangler deploy
```

To try the Worker build locally (Workers runtime + local D1) before deploying: `npm run build -w client && npm run cf:dev -w server`.

After changing `wrangler.jsonc`, run `npm run cf:types -w server` to regenerate `worker-configuration.d.ts`.

## Scripts (root)

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Run client and server together in watch mode    |
| `npm run build`     | Type-check and build both apps for Node         |
| `npm start`         | Run the built Node server                       |
| `npm run typecheck` | Type-check the client and the server (Node and Worker) |
| `npm run db:seed`   | Reset the local SQLite database and add sample users |
| `npm run deploy`    | Build the client and deploy the Worker          |

## Configuration

Local server settings live in `server/.env` (see `server/.env.example`):

- `PORT`: API port (default `3000`)
- `DATABASE_PATH`: SQLite file (default `server/data/local.db`)
- `CLIENT_ORIGIN`: enables CORS for a client on another origin (not needed with the Vite proxy)
- `SEED_PASSWORD`: password for sample users created by `db:seed` and `cf:seed` (default `password`)
