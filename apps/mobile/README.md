# @intellifarm/mobile

The Intellifarm mobile app: an Expo / React Native client that talks to the same backend `/v1` REST API as the web app. It shares the `@intellifarm/contracts` package as a workspace dependency, so request/response shapes stay in sync with the API.

For monorepo-wide setup and shared conventions see the [root README](../../README.md) and [CLAUDE.md](../../CLAUDE.md). Mobile-specific dev conventions live in [`CLAUDE.md`](./CLAUDE.md) in this directory.

## Tech stack

- Expo with Expo Router (file-based routing under `app/`, grouped into `(auth)`, `(onboarding)`, `(tabs)`)
- React Native 0.81
- `@intellifarm/contracts` for shared Zod schemas and enums

## Prerequisites

- Node 24.x (see repo-root `.nvmrc`) and `pnpm`
- Expo CLI (invoked via `pnpm exec expo` / the package scripts)
- Android Studio (for an Android emulator) and/or Xcode (for the iOS simulator) for native builds
- A **custom dev client or production build** if you need the voice assistant (see below) — plain Expo Go won't work

## Running

Install from the repo root so the workspace and contracts are wired up:

```powershell
pnpm install
```

Then start the app:

```powershell
pnpm --filter @intellifarm/mobile start     # expo start
pnpm --filter @intellifarm/mobile android    # build/run on Android
pnpm --filter @intellifarm/mobile ios        # build/run on iOS
pnpm --filter @intellifarm/mobile web        # run in the browser
pnpm --filter @intellifarm/mobile typecheck
```

The app calls the API on port 4000. Dev login after seeding the API: farmer `9876543210` / OTP `123456`.

## Voice assistant

The live voice assistant uses `@speechmatics/expo-two-way-audio`, which ships native code. It does **not** run in plain Expo Go — you need a custom dev client or a production build. The API side also needs a Gemini API key configured (see the root `.env.example`).

## Builds (EAS)

Cloud builds are configured in `eas.json` with `dev`, `preview`, and `production` profiles. Note that `android/` and `dist/` are gitignored.

## Tests

There are no automated mobile tests yet.
