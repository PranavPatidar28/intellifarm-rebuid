# CLAUDE.md — @intellifarm/mobile

Guidance for working in the Intellifarm mobile app. For shared API, auth, and contract conventions, see the [root CLAUDE.md](../../CLAUDE.md). This file covers what's specific to the Expo / React Native client.

## What this is

An Expo / React Native 0.81 app that consumes the same `/v1` REST API as `apps/web`, over HTTP. It depends on `@intellifarm/contracts` (workspace) for Zod schemas and enums, so it must stay in sync with the API's contract.

## Project structure

- `app/` — Expo Router file-based routes, grouped into `(auth)`, `(onboarding)`, and `(tabs)`
- `components/` — reusable UI components
- `features/` — feature modules
- `lib/` — the API client and local storage helpers
- `theme/` — colors, typography, and shared styling

## Conventions

- **API client** mirrors the `apps/web` client patterns (cookie/session handling, 401 refresh-and-retry) but adapted for React Native networking — reuse it in `lib/` rather than calling `fetch` ad hoc.
- **Contracts** are the source of truth for request/response shapes. Import schemas/types from `@intellifarm/contracts`; rebuild contracts after editing them.
- **Routing** follows Expo Router conventions — add screens as files under the appropriate `app/` group.
- **Typecheck** before considering work done: `pnpm --filter @intellifarm/mobile typecheck`.

## Commands

```powershell
pnpm --filter @intellifarm/mobile start      # expo start
pnpm --filter @intellifarm/mobile android    # run on Android
pnpm --filter @intellifarm/mobile ios        # run on iOS
pnpm --filter @intellifarm/mobile web        # run in the browser
pnpm --filter @intellifarm/mobile typecheck
```

The voice assistant (`@speechmatics/expo-two-way-audio`) needs a custom dev client or production build, not Expo Go, plus a Gemini key on the API side. There are no automated mobile tests yet.
