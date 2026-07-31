# Restaurant Platform (Umami MVP)

Medusa v2 + Next.js storefront monorepo for the Umami restaurant ordering MVP.

Follows `RESTAURANT_MVP_PLAN(1).md`. **Phases 1–7 complete** (restaurant MVP UI polish done).

## Stack

- Medusa v2.18 backend + Admin (`apps/backend`)
- Next.js 15 storefront (`apps/storefront`)
- PostgreSQL via Neon (preferred) or local Docker Postgres
- pnpm workspaces (no Redis required yet)

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL (Neon connection string, or local Docker as below)

## Quick start

### 1. Database

**Preferred — Neon:** create project/database `restaurant`, copy the connection string into `apps/backend/.env` as `DATABASE_URL` (keep `sslmode=require`).

**Local verification** (Docker):

```powershell
docker run -d --name umami-postgres `
  -e POSTGRES_USER=medusa `
  -e POSTGRES_PASSWORD=medusa `
  -e POSTGRES_DB=restaurant `
  -p 5432:5432 postgres:16-alpine
```

### 2. Install, migrate & seed

```powershell
cd restaurant-platform
pnpm install

cd apps/backend
# Ensure apps/backend/.env has DATABASE_URL and CORS secrets (see .env.example)
pnpm medusa db:migrate
pnpm medusa user -e admin@restaurant.local -p SuperSecret123!
```

`db:migrate` runs the Phase 2 restaurant commerce seed (Bahrain / BHD / Web Store / Main Branch / Delivery+Pickup / demo menu).

To re-run the idempotent seed later:

```powershell
pnpm seed
# or: pnpm medusa exec ./src/scripts/seed.ts
```

### 3. Storefront env

Copy the publishable API key printed by the seed (or from Admin → Settings → Publishable API Keys) into `apps/storefront/.env.local`:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=bh
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

### 4. Run (fast local — keep this running)

Leave one terminal open. Edits hot-reload; do **not** restart after every change.

```powershell
pnpm dev:fast
```

- Storefront: http://localhost:8000 (Turbopack HMR)
- Admin / API: http://localhost:9000 — Admin at `/app`

UI-only or API-only:

```powershell
pnpm dev:ui    # storefront only
pnpm dev:api   # backend + admin only
```

### Admin login (local)

- URL: http://localhost:9000/app
- Email: `admin@restaurant.local`
- Password: `SuperSecret123!`

## Phase 1 checklist status

- [x] Backend runs
- [x] Admin opens
- [x] Admin user created
- [x] Storefront runs
- [x] CORS configured for local ports
- [x] PostgreSQL connected + migrations applied
- [ ] Neon as primary DB (optional swap — local Docker used when Neon URL not provided)

## Phase 2 checklist status (إعداد التجارة)

- [x] Bahrain Region
- [x] BHD (store default currency; prices in major units with 3 dp)
- [x] Sales Channel (`Web Store`)
- [x] Publishable Key (linked to Web Store)
- [x] Stock Location (`Main Branch`)
- [x] Delivery (1.000 BHD)
- [x] Pickup (`Pickup from Main Branch`, 0.000 BHD)
- [x] Store named `Restaurant Demo`
- [x] Idempotent seed script (`pnpm seed`)

**Gate:** Storefront can fetch Bahrain region and products at `/bh`.

## Phase 3 checklist status (بيانات تجريبية)

- [x] 4 categories (`Burgers`, `Meals`, `Sides`, `Drinks`)
- [x] 4 products (`Classic Beef Burger`, `Crispy Chicken Meal`, `French Fries`, `Soft Drink`)
- [x] Variants (Size / Drink / Type options per plan §12)
- [x] Images (Unsplash thumbnails + gallery)
- [x] Correct BHD prices (major units, 3 dp)
- [x] Products Published + linked to `Web Store` + `Menu` collection

**Gate:** Products appear on storefront `/bh` from the Store API (not hardcoded).

## Phase 4 checklist status (طلب End-to-End)

- [x] Product → Cart
- [x] Cart → Checkout
- [x] Customer details (Bahrain address)
- [x] Delivery (1.000 BHD) / Pickup from Main Branch (0)
- [x] Test payment (`pp_system_default`)
- [x] Order completed (Store API `POST /store/carts/:id/complete`)
- [x] Order visible in Admin (`/app` → Orders)

**Gate:** One full order without manual DB edits. Smoke script:

```powershell
cd restaurant-platform
powershell -File .\scripts\phase4-e2e-smoke.ps1
```

### Manual browser verification

1. Open http://localhost:8000/bh
2. Open **Classic Beef Burger** → choose Regular or Double → Add to cart
3. Open cart → Checkout
4. Enter Bahrain customer details (country **Bahrain**), continue
5. Choose **Delivery** or **Pick up your order** / **Pickup from Main Branch**
6. Select **Test payment** → Continue to review → **Place order**
7. Confirm success page shows a real order number
8. Admin http://localhost:9000/app → Orders → open the new order

## Phase 5 checklist status (Restaurant Module)

- [x] Branch model (`restaurant_branch`)
- [x] Modifier groups / options
- [x] Product ↔ modifier group link
- [x] Store API (`/store/restaurant/...`, line-items-with-modifiers)
- [x] Admin UI (Modifiers, Branches, product widget, order modifiers widget)
- [x] Backend price validation (server-side; client prices ignored)
- [x] Cart display (modifiers + note on line items)
- [x] Order snapshot (line item metadata + cart `metadata.restaurant`)

**Gate:** Burger with Cheddar + Extra Sauce + note appears correctly in Admin.

```powershell
cd restaurant-platform
pnpm seed                    # includes Phase 5 modifiers on Classic Beef Burger
pnpm smoke:phase5
```

### Manual verification

1. Storefront `/bh/products/classic-beef-burger` → Double, Cheddar, Extra Sauce, note "No onions"
2. Add to cart → cart shows modifiers; set Pickup + Main Branch
3. Complete checkout → Admin order shows modifiers snapshot + restaurant meta

## Phase 6 checklist status (Restaurant / kitchen status)

- [x] `received` on order placed
- [x] `accepted` / `preparing` / `ready` / `completed` (+ `out_for_delivery`, `cancelled`)
- [x] Transition validation (no ready before preparing/accepted; pickup blocks `out_for_delivery`; cancelled terminal)
- [x] Timestamps + actor on each transition (`restaurant_order_status_event`)
- [x] Admin order widget to view/update kitchen status + history

**Gate:** Status updates persist with history.

```powershell
cd restaurant-platform
pnpm smoke:phase6
```

Admin: open an order → **Kitchen status** widget → Accepted → Preparing → Ready → Completed.

## Phase 7 checklist status (تحسين الواجهة)

- [x] Menu layout (category sections + product cards: image, name, short description, “From” price, unavailable)
- [x] Sticky category navigation on `/bh/store`
- [x] Product modal (variants, modifiers, notes, qty, live price, **Add to Order**)
- [x] Mobile cart drawer (items, modifiers/notes, qty, fees, total, Checkout) — works at 375px
- [x] Checkout simplification (Delivery/Pickup + branch, address only for delivery, Confirm Order)
- [x] Success page (order #, kitchen status, est. prep, order type, branch, summary)
- [x] Header: Umami text logo, Menu, Cart, order-type indicator
- [x] Home: full-bleed hero, View Menu, categories, featured

**Gate:** Comfortable on phone at 375px width.

```powershell
cd restaurant-platform
pnpm smoke:phase7
```

### Manual 375px verification

1. Open http://localhost:8000/bh in DevTools → iPhone SE (375px)
2. Hero shows **Umami** + **View Menu** → Menu with sticky categories
3. Tap Classic Beef Burger → modal → modifiers + qty → Add to Order
4. Open Cart drawer → verify line items → Checkout
5. Pickup: customer details only (no street fields) → Confirm Order
6. Success page shows order #, Received, prep time, branch

## Overall MVP status

Phases **1–7** of the plan are complete. Remaining outside this MVP plan: production launch work (real Bahrain payment, webhooks, notifications, ops) described in plan §30 — not numbered phases.

Manual E2E scenario in plan §27 can be run end-to-end on the polished UI.
