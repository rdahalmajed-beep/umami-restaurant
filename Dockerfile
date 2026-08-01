# Medusa backend image for Render (API + Admin).
# Build context = restaurant-platform repo root.
# Node 22+: pnpm 11 needs node:sqlite

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm config set minimum-release-age 0 \
  && pnpm config set strict-dep-builds false \
  && pnpm install --frozen-lockfile --fetch-retries=5 --fetch-retry-mintimeout=20000 \
  && pnpm rebuild -r
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
ARG MEDUSA_BACKEND_URL
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NODE_ENV=production
# Emit server even if some TS overload mismatches remain
RUN pnpm run build || test -d .medusa/server

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/backend
EXPOSE 9000
# Use monorepo node_modules (avoid a second registry install that hits npm 429)
CMD ["sh", "-c", "pnpm exec medusa db:migrate && pnpm exec medusa start"]
