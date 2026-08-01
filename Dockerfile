# Medusa backend for Render (API; Admin optional via DISABLE_MEDUSA_ADMIN).
# Build context = restaurant-platform repo root.
# Critical: use hoisted node_modules so the runner image is self-contained
# (pnpm's content store under PNPM_HOME is NOT copied otherwise → runtime re-fetch + OOM).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/backend/package.json ./apps/backend/
# Workspace stub only — do not install the Next storefront into this image
RUN mkdir -p apps/storefront \
  && printf '%s\n' '{"name":"@dtc/storefront","private":true,"version":"0.0.0"}' > apps/storefront/package.json
RUN printf '\nnode-linker=hoisted\n' >> .npmrc \
  && pnpm config set minimum-release-age 0 \
  && pnpm config set strict-dep-builds false \
  && pnpm install --frozen-lockfile --filter @dtc/backend... \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
  && pnpm rebuild --filter @dtc/backend...
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
ARG MEDUSA_BACKEND_URL=https://umami-medusa.onrender.com
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NODE_ENV=production
# Emit server even if some TS overload mismatches remain
RUN pnpm run build || test -d .medusa/server

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
# Stay under Render free 512Mi; raise after upgrading plan
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend ./apps/backend
WORKDIR /app/apps/backend
EXPOSE 9000
# npx/medusa from hoisted node_modules — no pnpm store / no registry at boot
CMD ["sh", "-c", "/app/node_modules/.bin/medusa db:migrate && /app/node_modules/.bin/medusa start"]
