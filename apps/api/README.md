# @intellifarm/api

The Intellifarm backend: a NestJS 11 REST API and the single source of truth for auth, business logic, and data. The web and mobile apps are thin clients over the same `/v1` API.

For monorepo-wide setup, build ordering, and shared conventions see the [root README](../../README.md) and [CLAUDE.md](../../CLAUDE.md).

## Tech stack

- NestJS 11 (REST + WebSockets)
- Prisma + PostgreSQL
- Zod validation via shared `@intellifarm/contracts`
- Cookie-based JWT auth
- Swagger / OpenAPI

## Running

From the repo root (so the `@intellifarm/contracts` build runs first):

```powershell
pnpm install        # postinstall builds contracts
pnpm db:deploy      # apply migrations (preferred for managed/pooled DBs)
pnpm db:seed        # demo farmer, admin, crops, mandis
pnpm --filter @intellifarm/api dev
```

The API listens on **port 4000**. Swagger UI is at **http://localhost:4000/docs**.

Dev login after seeding: farmer `9876543210` / OTP `123456`, admin `9999999998` / OTP `123456`.

## Conventions

- **Global `v1` prefix.** All routes are under `/v1` (e.g. `POST /v1/auth/otp/request`). The only exception is `GET /health`, which is excluded from the prefix and checks DB connectivity.
- **Cookie JWT auth.** Protect routes with `@UseGuards(AuthGuard)` and read the user via `@CurrentUser()`. Role-gated routes add `RolesGuard` + `@Roles(...)`.
- **Zod contracts.** Define request schemas in `packages/contracts` and validate with `parseWithSchema(schema, body)` from `common/utils/zod.util`, alongside the global `ValidationPipe`.
- **Pluggable providers.** Several domains pick a data source at runtime via a DI token + `useFactory` reading `ConfigService`:
  - Markets — `MARKET_PROVIDER_MODE`: `seeded` | `scraper` | `live`
  - Disease — `DISEASE_PROVIDER_MODE`: `mock` | `live`

  To add a provider, implement the shared interface, register it in the module's providers, and extend the factory's `switch`.
- **WebSockets use the `ws` adapter** (not socket.io). The live voice socket is mounted at `/voice`.
- **Modules are self-contained** under `src/<domain>/` (controller + service + module); cross-module deps are wired by importing the owning module and injecting its exported service.

## Database

All commands proxy to this package and load the root `.env`:

```powershell
pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev (local DBs)
pnpm db:deploy      # prisma migrate deploy (managed/pooled DBs)
pnpm db:seed        # tsx prisma/seed.ts
```

## Tests

```powershell
pnpm --filter @intellifarm/api test
pnpm --filter @intellifarm/api test -- devices.service.spec   # single suite
pnpm --filter @intellifarm/api test:watch
```

Jest maps `@intellifarm/contracts` to its built `dist`, so build contracts first if you hit a missing-module error.

## Security

- `helmet` headers
- `@nestjs/throttler` rate limiting (OTP endpoints tightened, device ingest exempt)
- Zod validation of environment variables at startup
- Graceful shutdown

## Deploy

A `Dockerfile` and `fly.toml` are present in this directory. Required env vars (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and opt-in provider keys) are documented in the root `.env.example`.
