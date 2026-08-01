# Medusa 2 on Render: compile to .medusa/server, reuse hoisted monorepo node_modules.
# Build context = restaurant-platform repo root.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
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
RUN pnpm run build || test -d .medusa/server
# Official runtime root is .medusa/server; attach already-fetched hoisted deps
RUN mkdir -p /server \
  && cp -a /app/apps/backend/.medusa/server/. /server/ \
  && cp -a /app/node_modules /server/node_modules \
  && (test -f /server/medusa-config.js || test -f /server/medusa-config.mjs) \
  && (test -e /server/node_modules/.bin/medusa || test -d /server/node_modules/@medusajs/medusa)

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /server
COPY --from=build /server /server
EXPOSE 9000
CMD ["sh", "-c", "npm run predeploy && npm run start"]
