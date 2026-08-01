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
  && pnpm install --frozen-lockfile --fetch-retries=5 --fetch-retry-mintimeout=20000
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
# Admin needs backend URL inlined at build when set
ARG MEDUSA_BACKEND_URL
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NODE_ENV=production
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/backend
COPY --from=build /app /app
WORKDIR /app/apps/backend/.medusa/server
RUN npm install --omit=dev
EXPOSE 9000
# Render sets PORT; Medusa respects PORT
CMD ["sh", "-c", "npm run predeploy && npm run start"]
