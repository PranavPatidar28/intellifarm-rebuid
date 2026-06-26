# @intellifarm/web

The Intellifarm farmer dashboard: a Next.js 16 App Router web app that runs as a thin client over the backend `/v1` REST API. All auth, business logic, and data live in `@intellifarm/api`.

For monorepo-wide setup and shared conventions see the [root README](../../README.md) and [CLAUDE.md](../../CLAUDE.md).

> **Read [`AGENTS.md`](./AGENTS.md) before writing web code.** This repo uses a Next.js version with breaking changes from older training data — consult `node_modules/next/dist/docs/` for current APIs and heed deprecation notices.

## Tech stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- SWR for data fetching

## Running

From the repo root (so `@intellifarm/contracts` builds first):

```powershell
pnpm install
pnpm --filter @intellifarm/web dev
```

The app runs on **http://localhost:3000** and expects the API on port 4000. Dev login after seeding: farmer `9876543210` / OTP `123456`.

## API clients

There are two clients, chosen by where the code runs:

- **`src/lib/api.ts`** — for client components (`"use client"`). Sends cookies (`credentials: "include"`) and transparently retries once after refreshing the access token on a 401.
- **`src/lib/api.server.ts`** — for server components. Forwards the incoming request cookies and `redirect("/login")`s on a 401.

## Component structure

UI is composed bottom-up:

- `src/components/ui/` — primitives
- `src/components/templates/` — page templates built from primitives
- `src/components/` — the app shell

## Tests

There are no automated web tests yet (`pnpm --filter @intellifarm/web test` is a stub).

## Deploy

A `Dockerfile` (standalone output) is present in this directory.
