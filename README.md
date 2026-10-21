# Project 5

Full stack TypeScript boilerplate.

- `client/`: React 19 + TypeScript + Vite
- `server/`: Express 5 + TypeScript (run with `tsx` in dev)

## Getting started

```sh
npm install
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3000/api/health

In development, Vite proxies `/api/*` to the Express server, so the client can call `fetch('/api/...')` directly.

## Scripts (root)

| Script          | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Run client and server together in watch mode |
| `npm run build` | Type-check and build both apps           |
| `npm start`     | Run the built server                     |

## Configuration

Server environment variables live in `server/.env` (see `server/.env.example`):

- `PORT`: API port (default `3000`)
- `CLIENT_ORIGIN`: allowed CORS origin (default `http://localhost:5173`)
