# Medusa 2 on Render — full hoisted install so runtime has @medusajs/* packages.
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
  && pnpm install --frozen-lockfile \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
  && pnpm rebuild -r
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
ARG MEDUSA_BACKEND_URL=https://umami-medusa.onrender.com
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NODE_ENV=production
RUN pnpm run build || test -f .medusa/server/medusa-config.js
RUN mkdir -p /server \
  && cp -a .medusa/server/. /server/ \
  && rm -rf /server/node_modules \
  && cp -a /app/node_modules /server/node_modules \
  && test -f /server/medusa-config.js \
  && test -d /server/node_modules/@medusajs/cli \
  && test -d /server/node_modules/@medusajs/medusa \
  && ls /server/node_modules/@medusajs \
  && (test -f /server/node_modules/@medusajs/cli/cli.js \
      || test -f /server/node_modules/@medusajs/cli/dist/index.js \
      || test -f /server/node_modules/@medusajs/medusa/dist/cli.js)

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /server
COPY --from=build /server /server
EXPOSE 9000
# Resolve CLI entry dynamically (package layout differs by version)
CMD ["sh", "-c", "CLI=$(node -p \"try{require.resolve('@medusajs/cli/cli.js')}catch(e){try{require.resolve('@medusajs/medusa/cli')}catch(e2){require.resolve('@medusajs/cli')}}\"); node \"$CLI\" db:migrate && node \"$CLI\" start"]
