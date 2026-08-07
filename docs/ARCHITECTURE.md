# Architecture overview

## Monorepo

| App | Role |
|-----|------|
| `apps/backend` | Medusa 2 — commerce + restaurant module + Admin |
| `apps/storefront` | Next.js customer storefront (Store API / SDK only) |

## Source of truth

| Concept | Owner |
|---------|--------|
| Products, variants, prices, categories | Medusa Product / Pricing |
| Cart, checkout, payment, order | Medusa Cart / Order / Payment |
| Modifier groups / options / links | Restaurant module |
| Published customer menu layout | Restaurant menus (projection) |
| Kitchen ticket status | Restaurant orders |
| Branch / fulfillment policies | Restaurant module |

Storefront **must not** hardcode product catalogs or parallel carts. Browse uses:

1. `GET /store/restaurant/menu` (published menus), else
2. Medusa categories + priced products via Store API.

Add-to-cart uses `addToCart` / `addToCartWithModifiers` only.

## Deploy

- **API + Admin:** Render Docker (`Dockerfile` → `.medusa/server`)
- **Storefront:** Vercel (`apps/storefront`)
- Seeds on Render: `cd /server && ./node_modules/.bin/medusa exec ./src/scripts/seed-*.ts`

See also `docs/DECISIONS.md` and `PROJECT_ENGINEERING_RULES.md`.
