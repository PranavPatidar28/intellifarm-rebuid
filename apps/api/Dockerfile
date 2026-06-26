# syntax=docker/dockerfile:1

# ── Base: pnpm on Node 24 ───────────────────────────────────────────────────
FROM node:24.14.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# OpenSSL is required by Prisma's query engine.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ── Dependencies: install the full workspace (cached on lockfile) ───────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
# postinstall runs the contracts build + prisma generate, which needs sources.
COPY packages ./packages
COPY apps/api/prisma ./apps/api/prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# ── Build: compile contracts then the API ──────────────────────────────────
FROM deps AS build
COPY apps/api ./apps/api
RUN pnpm --filter @intellifarm/contracts build \
  && pnpm --filter @intellifarm/api db:generate \
  && pnpm --filter @intellifarm/api build

# ── Production deps only ────────────────────────────────────────────────────
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod --ignore-scripts

# ── Runner: minimal runtime image ──────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
# Workspace metadata so `pnpm --filter` has context for on-boot migrations.
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
# Production node_modules (workspace symlinks preserved by pnpm).
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/packages ./packages
# Built artifacts: compiled API, built contracts, generated Prisma client + schema.
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api
EXPOSE 4000
# Default: run migrations (prisma is a runtime dep) then start. docker-compose
# overrides this with the same intent; override in your platform if migrations
# are gated elsewhere in the pipeline.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
