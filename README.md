<div align="center">

# 🌾 Intellifarm

### An India-first farmer platform — a crop-season copilot that helps smallholder farmers plan, decide, and act.

[![CI](https://github.com/PranavPatidar28/intellifarm-rebuid/actions/workflows/ci.yml/badge.svg)](https://github.com/PranavPatidar28/intellifarm-rebuid/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-24.x-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-Proprietary-red)

<sub>NestJS API · Next.js web · Expo mobile · PostgreSQL · shared Zod contracts</sub>

<br/>

<img src="./docs/screenshots/login-desktop.png" alt="Intellifarm" width="80%"/>

</div>

---

## ✨ Overview

Intellifarm is a monorepo built around a **NestJS backend as the single source of truth**, with thin Next.js and Expo clients consuming the same `/v1` REST API. It runs fully on **mock/seeded providers out of the box** — no external API keys needed to demo — and swaps in live providers via environment variables.

> **Status:** active hackathon project, hardened for production-readiness. Builds green from a fresh clone; ships with Docker, CI, and a one-command local stack.

## 🚜 Features

| | |
|---|---|
| 📱 **Phone OTP auth** | Passwordless login with JWT in secure HTTP-only cookies |
| 🌱 **Crop-season planning** | Farm plots, crop seasons, a deterministic rules engine + timeline |
| 📊 **Weekly dashboard** | Tasks, alerts, and live weather at a glance |
| 🤖 **Grounded AI assistant** | Text + voice answers from *your* farm data, rules, markets & schemes |
| 🔬 **Disease reporting** | Dual-angle photo capture with escalation-first triage |
| 🏪 **Mandis & warehouses** | Location-aware discovery with best-price callouts |
| 📜 **Government schemes** | Crop-aware filtering of official programs |
| 💧 **IoT pump control** | ESP32 telemetry ingest with two-step, confirmation-gated commands |

## 🏗️ Architecture

```
                    ┌──────────────────┐      ┌──────────────────┐
                    │   Web (Next.js)  │      │  Mobile (Expo)   │
                    │   React 19 :3000 │      │  React Native    │
                    └────────┬─────────┘      └────────┬─────────┘
                             │   REST /v1 + cookies     │  REST /v1 + WS /voice
                             └────────────┬─────────────┘
                                          ▼
                              ┌───────────────────────┐
                              │   API (NestJS) :4000   │
                              │  REST · Swagger /docs  │
                              │  WebSocket /voice      │
                              │  helmet · rate-limit   │
                              └───────────┬───────────┘
                                          │ Prisma
                                          ▼
                              ┌───────────────────────┐
                              │      PostgreSQL        │
                              └───────────────────────┘

   pluggable providers (env-selected) ─ markets · disease · assistant
   external: Open-Meteo · Gemini · Data.gov · ML/disease HTTP services

   ESP32 node ──POST /v1/devices/ingest (x-device-key)──▶ API
```

`packages/contracts` (Zod schemas + enums) is the shared contract imported by the API and every client.

## 🧰 Tech stack

| Layer | Stack |
|---|---|
| **Monorepo** | Turborepo · pnpm workspaces · Node 24 |
| **Web** | Next.js 16 (App Router) · React 19 · Tailwind 4 · SWR |
| **Mobile** | Expo · React Native 0.81 · Expo Router · EAS Build |
| **API** | NestJS 11 · REST · Swagger · WebSockets (`ws`) |
| **Database** | PostgreSQL · Prisma |
| **Auth** | Phone OTP → JWT in secure HTTP-only cookies |
| **Contracts** | Zod schemas shared across API + clients |

## 📁 Project structure

```
intellifarm/
├── apps/
│   ├── api/         NestJS REST API        @intellifarm/api
│   ├── web/         Next.js web app        @intellifarm/web
│   └── mobile/      Expo mobile app        @intellifarm/mobile
├── packages/
│   ├── contracts/   Shared Zod schemas     @intellifarm/contracts
│   └── config/      Shared TS/Prettier config
├── iot/
│   └── esp32/       Arduino sensor/pump firmware
└── docs/            Diagrams, pitch assets, specs
```

Each app has its own README → [api](./apps/api/README.md) · [web](./apps/web/README.md) · [mobile](./apps/mobile/README.md)

## 🚀 Quick start

### Option A — Docker (one command)

```bash
docker compose up --build
# once the API is healthy, seed demo data:
docker compose run --rm api pnpm --filter @intellifarm/api db:seed
```

→ Web **http://localhost:3000** · API **http://localhost:4000** · Swagger **http://localhost:4000/docs**

### Option B — Local dev

```powershell
corepack enable
pnpm install

Copy-Item .env.example .env   # set DATABASE_URL + JWT secrets (required)

pnpm db:deploy                # apply migrations
pnpm db:seed                  # seed demo content
pnpm dev                      # web + api + contracts watcher
```

> Required env vars are validated at API startup — a missing `DATABASE_URL` or JWT secret fails fast with a clear message.

### 🔑 Demo login

| Role | Phone | OTP |
|---|---|---|
| Farmer *(seeded farm + crops)* | `9876543210` | `123456` |
| Admin *(`/admin` access)* | `9999999998` | `123456` |

## 📜 Commands

```bash
pnpm dev          # web + api + contracts watcher, in parallel
pnpm build        # build all workspaces
pnpm lint         # eslint across workspaces
pnpm typecheck    # tsc --noEmit across workspaces
pnpm test         # jest (api) + vitest (web)

pnpm db:generate  # prisma generate
pnpm db:migrate   # prisma migrate dev   (local DBs)
pnpm db:deploy    # prisma migrate deploy (managed/pooled DBs)
pnpm db:seed      # demo farmer, admin, crops, mandis
```

## 🔌 Provider configuration

Runs fully on **mock/seeded providers** by default. Live providers are opt-in (see `.env.example`):

| Domain | Mode var | Live config |
|---|---|---|
| Markets / mandi prices | `MARKET_PROVIDER_MODE` &nbsp;`seeded ∣ scraper ∣ live` | `DATA_GOV_API_KEY`, `DATA_GOV_RESOURCE_ID` |
| Disease analysis | `DISEASE_PROVIDER_MODE` &nbsp;`mock ∣ live` | `DISEASE_PROVIDER_URL`, `DISEASE_PROVIDER_API_KEY` |
| AI assistant | — | `GEMINI_API_KEY`, `AI_ASSISTANT_MODEL` |
| Weather | always live (Open-Meteo) | `OPEN_METEO_BASE_URL` |

## ☁️ Deployment

| Target | Platform | Config |
|---|---|---|
| Web | Vercel | `vercel.json` (builds contracts first) |
| API | Fly.io / any Docker host | `apps/api/fly.toml` · `apps/api/Dockerfile` |
| Database | Neon · Supabase · RDS | `prisma migrate deploy` on release |

CI (`.github/workflows/ci.yml`) runs lint · typecheck · test · build and builds both Docker images on every PR. `/health` checks DB connectivity for load-balancer probes.

## 📚 Documentation

- **[Development guide](./CLAUDE.md)** — conventions and architecture
- **[Contributing](./CONTRIBUTING.md)** — setup, commit style, workflow
- **[docs/](./docs/README.md)** — user-flow diagrams, pitch slides, the [voice assistant spec](./docs/voice-assistant.md)
- **API reference** — Swagger/OpenAPI at `/docs` when the API is running

## 🔒 Notes

- Crop/resource predictions are advisory and provider-backed — no in-repo trained model.
- Disease analysis is escalation-first and avoids blind chemical prescriptions.
- Assistant answers are grounded in saved farm data, not open-ended agronomy guarantees.
- Pump control is confirmation-gated end to end (device API and voice assistant alike).

## ⚖️ License

**Proprietary — all rights reserved.** Copyright © 2026 Pranav Patidar.

This repository may be publicly visible, but **no rights are granted**. You may
not use, copy, modify, distribute, or create derivative works from any part of
it without the owner's prior written permission. See [LICENSE](./LICENSE) for
the full terms. To request permission, contact the owner.

---

<div align="center">
<sub>Built for Indian smallholder farmers 🇮🇳</sub>
</div>
