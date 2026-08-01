# Medusa backend for Render (API; Admin optional via DISABLE_MEDUSA_ADMIN).
# Build context = restaurant-platform repo root.
# Copy PNPM_HOME + /app so runtime does not re-fetch from the registry (OOM/429).

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
  && pnpm install --frozen-lockfile --filter @dtc/backend... \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
  && pnpm rebuild --filter @dtc/backend...
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
ARG MEDUSA_BACKEND_URL=https://umami-medusa.onrender.com
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NODE_ENV=production
RUN pnpm run build || test -d .medusa/server

FROM base AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY --from=build /pnpm /pnpm
COPY --from=build /app /app
WORKDIR /app/apps/backend
EXPOSE 9000
CMD ["sh", "-c", "pnpm exec medusa db:migrate && pnpm exec medusa start"]
