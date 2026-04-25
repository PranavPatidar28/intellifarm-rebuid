# Intellifarm MVP

An India-first farmer platform built as a `pnpm` + `Turborepo` monorepo with:

- `apps/web`: Next.js farmer web app
- `apps/api`: NestJS shared backend API
- `packages/contracts`: shared enums, schemas, and API contracts
- `packages/config`: shared workspace config

The product is still intentionally narrow, but phase 2 adds the missing planning and support layers around the original crop-season copilot:

- phone OTP authentication
- farmer profile setup
- farm plot and crop season onboarding
- weekly dashboard with tasks, alerts, and weather
- deterministic crop rules engine and crop timeline
- crop suggestion and resource prediction providers
- grounded AI farming assistant
- dual-angle disease reporting with mock/live provider hooks
- location-aware mandis and warehouses
- government schemes with crop-aware filters
- lightweight internal admin view

## Tech Stack

- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js App Router, React 19, Tailwind 4
- API: NestJS, REST, Swagger
- Database: PostgreSQL + Prisma
- Storage: local file storage in dev behind a storage service abstraction
- Auth: OTP flow with secure cookies and a mock OTP adapter for v1
- Weather: Open-Meteo integration
- Live provider hooks:
  - assistant: OpenAI-compatible chat endpoint
  - predictions: external HTTP prediction service
  - disease analysis: external HTTP analysis service
  - mandi prices: Data.gov / Agmarknet-style feed adapter

## Repo Structure

```text
apps/
  api/
  web/
packages/
  config/
  contracts/
```

## Local Setup

1. Enable Corepack and install dependencies:

```powershell
corepack enable
pnpm install
```

2. Copy the environment file and fill in a PostgreSQL connection:

```powershell
Copy-Item .env.example .env
```

Required:

- `DATABASE_URL` should point to a PostgreSQL database
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` should be replaced with long random values

3. Apply migrations and seed demo content:

```powershell
pnpm db:deploy
pnpm db:seed
```

If you are using a fully local PostgreSQL database for development, `pnpm db:migrate` also works. If you are using a managed pooled connection, prefer `pnpm db:deploy` against the committed migrations.

4. Start the web app, API, and shared contracts watcher:

```powershell
pnpm dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger docs: `http://localhost:4000/docs`

OTP login requires both the web app and API to be running. In development,
local auth is allowed from both `http://localhost:3000` and
`http://localhost:3001` so the web app can still sign in if `3000` is already
occupied.

## Demo Login

The dev OTP adapter uses:

- Phone: `9876543210`
- OTP: `123456`

That seeded farmer already has demo farm plots and crop seasons. You can also log in with a new phone number and go through onboarding.

Admin demo:

- Phone: `9999999998`
- OTP: `123456`

The admin account can access `/admin` for internal crop-rule, scheme, and report review.

## Useful Commands

```powershell
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

## Seeded Demo Content

The seed script adds:

- crop definitions for Wheat, Paddy, and Cotton
- crop stage rules and task templates
- demo schemes with crop-aware tags
- geolocated mandi and warehouse facilities
- demo market records linked to facilities
- a demo farmer account with farm plots and active crop seasons
- an internal admin account

## Phase 2 Features

- Crop suggestions:
  - `/v1/predictions/crop-suggestions`
  - mock scoring now, external HTTP prediction provider later
- Resource prediction:
  - `/v1/predictions/resources`
  - weekly water, fertilizer review, pesticide watch level, and safety note
- Grounded assistant:
  - `/v1/assistant/threads`
  - `/v1/assistant/threads/:id`
  - `/v1/assistant/threads/:id/messages`
  - answers are restricted to saved farm data, rules, weather, markets, schemes, and disease history
- Nearby facilities:
  - `/v1/facilities/nearby`
  - separate mandi and warehouse discovery with distance-first ranking
- Upgraded markets:
  - `/v1/markets`
  - seeded or live-provider mode, plus best-price callout support
- Upgraded disease reports:
  - `/v1/disease-reports`
  - supports `captureMode=CAMERA_DUAL_ANGLE`
- Weather:
  - normalized 3-day forecast blocks
  - cached snapshots and safe fallback behavior
- Voice:
  - browser speech recognition for note/chat input
  - browser text-to-speech for weather and assistant replies

## Provider Configuration

The app runs fully with mock providers by default.

To enable live providers later:

- Set `PREDICTION_PROVIDER_MODE=live` and configure `PREDICTION_PROVIDER_URL`
- Set `DISEASE_PROVIDER_MODE=live` and configure `DISEASE_PROVIDER_URL`
- Set `AI_ASSISTANT_PROVIDER_MODE=live` and configure `AI_ASSISTANT_BASE_URL`, `AI_ASSISTANT_API_KEY`, and `AI_ASSISTANT_MODEL`
- Set `MARKET_PROVIDER_MODE=live` and configure `DATA_GOV_API_KEY` plus `DATA_GOV_RESOURCE_ID`

The web app and any future mobile app continue to use the same backend routes, auth, business logic, uploads, and stored history regardless of provider mode.

## Current Notes

- Crop/resource prediction is advisory and provider-backed; there is no in-repo trained model.
- Disease analysis stays escalation-first and avoids blind chemical prescriptions.
- Assistant answers are grounded and should not be treated as open-ended agronomy guarantees.
- Weather is live through Open-Meteo and can use current browser GPS when permission is allowed.
- Uploaded media flows through authenticated API routes under `/v1/media/...`.
- Voice support is browser-based in this phase.
- The future mobile app should reuse the same API, auth flow, business logic, and data models from this repo.
