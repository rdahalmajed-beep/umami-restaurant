# Medusa 2 on Render: build app, then npm install inside .medusa/server (official path).
# Build context = restaurant-platform repo root.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

FROM base AS build
ARG CACHE_BUST=20260807a
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
# Require compiled server output (fail deploy if build produces nothing)
RUN pnpm run build; \
    test -f .medusa/server/medusa-config.js
WORKDIR /app/apps/backend/.medusa/server
RUN npm install --omit=dev --no-audit --no-fund \
      --registry=https://registry.npmjs.org/ \
      --fetch-retries=8 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
  && test -f medusa-config.js \
  && test -f package.json \
  && ls node_modules/.bin/medusa \
  && node -e "require('@medusajs/framework')"

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /server
COPY --from=build /app/apps/backend/.medusa/server /server
COPY --from=build /app/apps/backend/src/scripts /server/src/scripts
EXPOSE 9000
CMD ["sh", "-c", "./node_modules/.bin/medusa db:migrate && ./node_modules/.bin/medusa start"]
