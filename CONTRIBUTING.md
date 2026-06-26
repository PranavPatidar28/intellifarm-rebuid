# Contributing to Intellifarm

Thanks for helping improve Intellifarm. This guide covers the basics for getting set up and landing changes cleanly.

## Prerequisites

- **Node 24** (see `.nvmrc` — `nvm use` picks it up)
- **pnpm 10.33** (`corepack enable` provides it)
- **PostgreSQL** (local, or use `docker compose up db`)

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env        # fill in DATABASE_URL + JWT secrets
pnpm db:deploy
pnpm db:seed
pnpm dev
```

See the [root README](./README.md) for full setup and Docker options.

## Build ordering

`@intellifarm/contracts` compiles to `dist/` and is imported by the API and both clients, so **it must build before** anything that typechecks or builds against it. `postinstall` and `predev` handle this automatically — but if you see a missing-module error for `@intellifarm/contracts`, run:

```bash
pnpm --filter @intellifarm/contracts build
```

## Before opening a PR

Run the full verification suite — CI runs the same checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass. CI also builds the API Docker image.

## Conventions

- **Commits:** use [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **Branches:** work on a feature branch, never push directly to `main`. Open a PR.
- **Line endings:** LF everywhere (enforced by `.gitattributes` + `.editorconfig`).
- **Formatting:** Prettier (`pnpm format` to check). The API enforces it via ESLint.
- **API endpoints:** define request schemas in `packages/contracts` and validate with `parseWithSchema`. New domains follow the controller + service + module pattern.
- **Mobile:** Expo / React Native — see `apps/mobile/CLAUDE.md` for conventions; reuse the `lib/` API client rather than calling `fetch` directly.
- **Don't commit:** `.env`, build outputs, generated Prisma client (`apps/api/src/generated/`), or local logs — all gitignored.

## Project layout

See the [workspace layout in the README](./README.md#workspace-layout). Each app has its own README and the [development guide](./CLAUDE.md) documents architecture and conventions in depth.

## Security

- Never commit secrets. Required env vars are validated at API startup.
- File uploads are MIME- and size-validated; the OTP endpoints are rate-limited.
- Pump control is confirmation-gated end to end — preserve that two-step flow.
- Report security concerns privately rather than in a public issue.
