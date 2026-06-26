# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Intellifarm is an India-first farmer platform: a `pnpm` + Turborepo monorepo with a NestJS backend, an Expo mobile app, and shared contracts. The backend is the single source of truth for auth, business logic, and data — the mobile app is a thin client over the `/v1` REST API.

## Workspace layout

- `apps/api` — NestJS REST API (`@intellifarm/api`), Prisma + PostgreSQL, Swagger at `/docs`
- `apps/mobile` — Expo / React Native app (`@intellifarm/mobile`), Expo Router, EAS Build. Consumes `@intellifarm/contracts` and the `/v1` API over HTTP. See `apps/mobile/CLAUDE.md`.
- `packages/contracts` — shared Zod schemas + enums (`@intellifarm/contracts`), the contract between API and clients
- `packages/config` — shared TypeScript/Prettier config
- `iot/esp32` — Arduino firmware for the sensor/pump node (not part of the JS build)

## Commands

Run from the repo root (Turborepo fans out to workspaces):

```powershell
pnpm dev          # api + contracts watcher, in parallel
pnpm build        # build all workspaces
pnpm lint         # eslint across workspaces
pnpm typecheck    # tsc --noEmit across workspaces
pnpm test         # jest (api only)
```

Database (all proxy to `@intellifarm/api`, loading `../../.env` via dotenv-cli):

```powershell
pnpm db:generate  # prisma generate
pnpm db:migrate   # prisma migrate dev (local DBs)
pnpm db:deploy    # prisma migrate deploy (managed/pooled DBs — preferred)
pnpm db:seed      # tsx prisma/seed.ts — demo farmer, admin, crops, mandis
```

Single API test (jest runs only inside `apps/api`):

```powershell
pnpm --filter @intellifarm/api test -- devices.service.spec
pnpm --filter @intellifarm/api test:watch
```

## Critical build ordering

`@intellifarm/contracts` compiles with `tsup` to `dist/`, and the API imports from `@intellifarm/contracts` → `dist`. Contracts **must be built before** the API typecheck, build, or test.

- `postinstall` and `predev` already build contracts, so `pnpm install` and `pnpm dev` are safe.
- API jest maps `@intellifarm/contracts` → `packages/contracts/dist/index.cjs` (see `apps/api/package.json` jest config). If tests fail with a missing-module error for contracts, run `pnpm --filter @intellifarm/contracts build` first.
- After editing `packages/contracts/src/{enums,schemas}.ts`, rebuild contracts (the `pnpm dev` watcher does this automatically).

## API conventions (NestJS)

- Global route prefix is `v1` (set in `apps/api/src/main.ts`); `/health` is excluded. So `POST /v1/auth/login`, but `GET /health`.
- Validation: controllers parse request bodies with shared Zod schemas via `parseWithSchema(schema, body)` from `common/utils/zod.util`, in addition to the global `ValidationPipe`. New endpoints should define their schema in `packages/contracts` and validate with it.
- Auth is cookie-based JWT. Protect routes with `@UseGuards(AuthGuard)` and read the user via the `@CurrentUser()` decorator. Role-gated routes add `RolesGuard` + `@Roles(...)`.
- WebSockets use the `ws` adapter (`WsAdapter`), not socket.io. The live voice socket is mounted at `/voice`.
- Each domain is a self-contained module under `apps/api/src/<domain>/` (controller + service + module). Cross-module dependencies are wired by importing the owning module and injecting its exported service.

## Pluggable provider pattern

Several domains have swappable data sources selected at runtime by `MARKET_PROVIDER_MODE`-style env vars, wired with a DI token + `useFactory` reading `ConfigService`. Example: `markets.module.ts` picks between `ScraperMarketProvider` (default `scraper`), `SeededMarketProvider` (`seeded`), and `DataGovMarketProvider` (`live`) for the `MARKET_PROVIDER` token. The same pattern applies to disease analysis, predictions, and the assistant. When adding a provider, implement the shared interface, register it in the module's providers, and extend the factory's `switch` — callers depend only on the token.

## IoT / devices

ESP32 nodes push telemetry to `POST /v1/devices/ingest` authenticated by an `x-device-key` header (not the user JWT). Pump control is two-step and confirmation-gated — a control intent creates a pending command that only executes after explicit confirmation (this holds for both the device API and the voice assistant's `turnPumpOn`/`turnPumpOff` tools). See `docs/voice-assistant.md` for the voice + pump confirmation flow.

## Environment

Copy `.env.example` to `.env` at the repo root (the API loads `.env` and `../../.env`). `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are required. The app runs fully on mock/seeded providers by default; live providers (Gemini assistant/voice, ML predictions, disease detection, mandi feeds) are opt-in via the `*_MODE` and key/URL vars documented in `.env.example`.

Dev login (after `pnpm db:seed`): farmer `9876543210` / OTP `123456`; admin `9999999998` / OTP `123456`.
