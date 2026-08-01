# Medusa 2 on Render: build → install inside .medusa/server → run that tree only.
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
# Official prod layout: deps live inside the compiled server output
WORKDIR /app/apps/backend/.medusa/server
RUN npm install --omit=dev --no-audit --no-fund \
      --registry=https://registry.npmmirror.com \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
  && test -f medusa-config.js -o -f medusa-config.ts -o -f medusa-config.mjs

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /server
COPY --from=build /app/apps/backend/.medusa/server /server
EXPOSE 9000
CMD ["sh", "-c", "npm run predeploy && npm run start"]
