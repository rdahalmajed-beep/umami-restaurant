# Codex Handoff Report — Umami Restaurant Platform after `CURSOR_MEDUSA_ADMIN_COMPLETION_PLAN.md`

**Audience:** ChatGPT Codex (or any reviewer) analyzing what Cursor implemented against the plan.  
**Plan file:** `CURSOR_MEDUSA_ADMIN_COMPLETION_PLAN.md`  
**Stack:** Medusa `2.18.0` backend (`apps/backend`) + Next.js `15` storefront (`apps/storefront`)  
**Report date context:** Implementation completed through Phases 0–7 *as far as code allows without payment-gateway credentials / production Redis / SMS-email provider accounts*.  
**Local ports:** Admin/API `http://localhost:9000` · Storefront `http://localhost:8000`

---

## 1. Mission of this report

This document answers:

1. What happened after the plan was received.
2. What was added (models, APIs, admin UX, storefront, jobs, tests).
3. Current architecture and folder structure.
4. **Full Admin user journeys** (step-by-step) so you can critique UX/architecture against the plan.
5. What remains intentionally unfinished / blocked on the business owner.

Related companion docs already in repo:

- `docs/USER_REQUIRED_SETUP.md` — secrets and choices only the owner can supply
- `docs/OPS_CHECKLIST.md` — production ops checklist
- Plan non-negotiable: kitchen status ≠ Medusa payment/fulfillment (no silent mapping)

---

## 2. How work was executed (vs plan instructions)

The plan says: one phase at a time, stop and report after each gate.  
**In practice (owner request):** Cursor was asked to continue aggressively across remaining phases without pausing for manual trials mid-stream, then produce a test checklist. Later: finish everything possible without returning for decisions, then list owner-owned items.

Consequence for Codex review:

- Phases were **batched**, not strictly gated with human sign-off between Phase 0 → 7.
- Several plan “nice-to-haves” are partial (drag-drop menu builder, full multi-instance Redis, real Bahrain payment provider, full notification templates UI).
- Engineering gate (typecheck/lint/test/CI) and restaurant domain were prioritized over payment gateway selection (correct per plan: *do not choose gateway in code*).

---

## 3. Phase completion matrix (honest)

| Phase | Plan theme | Status | Notes |
|------:|------------|--------|-------|
| **0** | Engineering gate | **Mostly done** | Truthful `typecheck`/`lint`/`test`/`build`; Windows-safe Jest; CI workflow; domain unit tests (26 passing). Some storefront/build edge cases may still need periodic verification. |
| **1** | Order correctness + secure APIs | **Done (core)** | Fulfillment intent workflow; `completeCart` validate hook; durable `order.placed` restaurant order; guest status HMAC + claim; atomic kitchen transitions + version; explicit kitchen→commerce stub (no silent payment map). |
| **2** | Domain links + operating controls | **Done (core)** | Module links: branch↔stock_location, branch↔fulfillment_set, restaurant_order↔order, product_modifier_group↔product (read-oriented). Settings singleton; branch pause/hours/capacity; availability (86) API. |
| **3** | Control Center + KDS | **Done (core)** | Hub dashboard; slim KDS list + ticket detail; history; SSE + poll fallback; overdue/sound/cancel reason. In-memory event bus (not Redis). |
| **4** | Menu + modifiers + projection | **Mostly done** | Menu/section/product models + Admin UI; store projection + ETag; MOD overrides on link model + applied in service; BHD-only policy; cache revalidate helper; storefront consumes projection with category fallback. Drag-drop / rich product picker incomplete. |
| **5** | Policies, CMS, roles, audit | **Mostly done** | Fulfillment policies Admin+Store; brand content Admin+Store; audit log; permission middleware + roles matrix; role from `user.metadata.restaurant_role` (default owner). No full staff-assignment Admin UI. |
| **6** | Payments, notifications, outbox | **Partial by design** | Outbox model + Admin + scheduled processor (stub/webhook). Status→outbox enqueue. Kitchen completed → coordinate workflow (metadata + outbox). **No** production payment provider. **No** Medusa Notification Module templates UI. |
| **7** | Infra/ops | **Docs only** | `OPS_CHECKLIST.md`, env templates for revalidate/guest secret/webhook. Redis/Cloud/S3/backups not wired in code. |

---

## 4. What was added (inventory)

### 4.1 Restaurant module models

Under `apps/backend/src/modules/restaurant/models/`:

| Model | Purpose |
|-------|---------|
| `branch` | Branch profile, hours, pause, capacity, prep minutes, delivery/pickup flags |
| `restaurant_settings` | Global singleton (ordering on/off, default prep, locale, timezone, max qty) |
| `branch_resource_availability` | Per-branch 86 for product/variant/modifier (+ version) |
| `modifier_group` / `modifier_option` | MOD catalog |
| `product_modifier_group` | Product↔group link + overrides (`is_required_override`, min/max, `variant_ids_json`, `branch_ids_json`) |
| `restaurant_order` / `restaurant_order_status_event` | KDS state + immutable transition log |
| `menu` / `menu_section` / `menu_product` | Presentation layer (not native price/inventory) |
| `branch_fulfillment_policy` | Min order, flat fee hint, free threshold, ETA, pause per type |
| `restaurant_content` | Versioned brand blocks (Zod-validated); unique `(key, locale)` |
| `restaurant_audit_log` | Append-only admin/system actions |
| `integration_outbox` | Durable pending/sent/failed/dead messages |

Migrations live in `apps/backend/src/modules/restaurant/migrations/` (generated via `medusa db:generate restaurant`).

### 4.2 Module links

`apps/backend/src/links/`:

- `restaurant-branch-stock-location.ts`
- `restaurant-branch-fulfillment-set.ts`
- `restaurant-order-order.ts`
- `product-modifier-group-product.ts`

### 4.3 Workflows & hooks

`apps/backend/src/workflows/`:

- `set-restaurant-fulfillment-intent` (+ step) — cart restaurant intent / shipping best-effort
- `set-cart-restaurant-metadata` / `add-item-with-modifiers`
- `transition-restaurant-order` — locked/versioned kitchen transition + domain event
- `coordinate-kitchen-completed` — explicit commerce coordination stub
- Hook: `hooks/complete-cart-restaurant-validate.ts` — ordering pause, branch state, shipping type match, empty cart, **BHD currency**, **policy pause**, **min order**

### 4.4 Subscribers & jobs

Subscribers:

- `order-placed-restaurant.ts` — create restaurant order on Medusa order placed
- `restaurant-order-status-notify.ts` — enqueue notification intents to outbox
- `restaurant-order-completed-coordinate.ts` — run coordinate workflow when status=`completed`

Job:

- `jobs/process-restaurant-outbox.ts` — every minute; stub log or POST `NOTIFICATION_WEBHOOK_URL`; retry failed → pending; dead after max attempts

### 4.5 Admin custom routes (UI)

All under `apps/backend/src/admin/routes/restaurant/`:

| Path | Page |
|------|------|
| `/restaurant` | Control Center hub |
| `/restaurant/orders` | Live Kitchen (KDS) |
| `/restaurant/orders/history` | Completed/cancelled history |
| `/restaurant/branches` | Branches CRUD + pause |
| `/restaurant/modifier-groups` | Groups list + create + duplicate |
| `/restaurant/modifier-groups/:id` | Edit group + options |
| `/restaurant/menus` | Menus list + create + publish |
| `/restaurant/menus/:id` | Sections + attach product by ID |
| `/restaurant/policies` | Delivery/pickup policies |
| `/restaurant/content` | Brand content (ar/en) |
| `/restaurant/settings` | Global ordering pause + defaults |
| `/restaurant/audit` | Audit log viewer |
| `/restaurant/outbox` | Outbox list + retry failed |

i18n: `apps/backend/src/admin/i18n/json/en.json` + `ar.json` (restaurant.* keys).

### 4.6 Admin widgets

- `product-modifiers-widget.tsx` — link/unlink groups on Product detail
- `order-restaurant-widget.tsx` — restaurant snapshot on Order
- `order-kitchen-status-widget.tsx` — kitchen status on Order

### 4.7 Admin APIs (`/admin/restaurant/*`)

Dashboard, settings, branches (+ pause), availability, modifier groups/options, product modifier links (with overrides), menus, orders (list/summary, ticket, status, history, SSE stream), fulfillment-policies, content, audit-logs, outbox.

Middleware: `api/middlewares.ts` + `api/middlewares/restaurant-auth.ts`  
Attaches role from `user.metadata.restaurant_role`; guards write routes (settings/menus/availability/content/outbox/policies/audit read).

### 4.8 Store APIs (`/store/restaurant/*`)

- branches
- products/:id/modifiers (respects branch/variant scope)
- carts restaurant-meta / line-items-with-modifiers (existing)
- orders/:id/status + /access (guest HMAC)
- **menu** projection (ETag)
- **content** (brand, read-only)
- **fulfillment-policies** (read-only filtered)

### 4.9 Storefront changes

- Menu template prefers published restaurant menu projection; falls back to Medusa categories
- Home hero consumes brand content (title/subtitle/announcement/CTA)
- Cart shows min-order / ETA / pause hints from policies
- Order confirmed: live kitchen status poller + link to `/order/:id/status`
- Revalidate route: `apps/storefront/src/app/api/revalidate/route.ts` (HMAC)

### 4.10 Tests & quality

Unit tests under `modules/restaurant/__tests__/`:

- status transitions, modifiers validation, fulfillment/access, branch operational state, permissions + currency

Root/apps scripts: typecheck, lint, test, CI. Windows Jest runner: `apps/backend/scripts/run-jest.js`.

---

## 5. Current architecture (mental model)

```
┌─────────────────────────────────────────────────────────────┐
│ Storefront (Next 15 :8000)                                  │
│  Menu projection · Brand content · Policies · Guest status  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Store APIs + publishable key
┌───────────────────────────▼─────────────────────────────────┐
│ Medusa Admin + API (:9000)                                  │
│  Native: Products, Orders, Shipping, Payment (system), …    │
│  Custom Admin: Restaurant hub + nested operational UIs      │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
     ┌──────────▼──────────┐       ┌──────────▼──────────┐
     │ Restaurant Module   │       │ Medusa Commerce     │
     │ settings, branch,   │links│ catalog, cart, order │
     │ menu, MOD, KDS,     │─────│ payment, fulfillment │
     │ policy, CMS, audit, │       │                     │
     │ outbox              │       │                     │
     └──────────┬──────────┘       └─────────────────────┘
                │ events / jobs
     ┌──────────▼──────────┐
     │ Subscribers + Outbox processor (stub/webhook)
     │ Kitchen SSE bus = in-memory EventEmitter
     └─────────────────────┘
```

**Invariant (ORD-006):** Kitchen `completed` does **not** mark Medusa order paid/fulfilled. It enqueues `commerce.fulfillment.requested` and sets `metadata.restaurant_kitchen_completed_at` only.

**Currency (MOD-003):** Modifier prices are **BHD-only**; complete-cart rejects other cart currencies.

---

## 6. Admin UX — detailed user journeys

Assume admin is logged in at `http://localhost:9000/app`. Sidebar shows **Restaurant** (and may also list nested route labels depending on Medusa admin route registration). Preferred navigation: open **Restaurant** hub, then cards.

### 6.1 Hub — Control Center (`/restaurant`)

**Purpose:** One owner landing: live kitchen pulse + global hot controls + navigation cards.

**What the user sees:**

1. Title/subtitle (i18n EN/AR).
2. **Live kitchen** strip: counts for received / preparing / ready; overdue badge; button **Open kitchen**.
3. **Global pause:** toggle ordering enabled/disabled via dashboard actions.
4. **Default prep** quick adjust (± and reset to 20).
5. **Today stats:** order count, revenue, AOV (BHD formatting with 3 decimals).
6. **Branch chips:** each branch operational_state (`open` / `paused` / `closed` / `at_capacity`).
7. **Card grid** links to:
   - Kitchen, History, Branches, Modifiers, Menus, Delivery policies, Brand content, Settings, Audit, Outbox, Commerce Orders (`/orders` native Medusa).
8. Footnote: kitchen ≠ payment/fulfillment.

**Hot actions expected feel:** optimistic-ish refresh via react-query invalidate after POST to dashboard/settings endpoints.

### 6.2 Kitchen / KDS (`/restaurant/orders`)

**Purpose:** Fast accept/advance of active tickets.

**Flow:**

1. Load summary list (`view=summary`) — lightweight rows (display id, type, branch, money, age, overdue).
2. Tabs: All / Received / Accepted / Preparing / Ready.
3. **Live transport:** EventSource → `/admin/restaurant/orders/stream`; on failure, poll interval. Badge shows Live vs Polling.
4. Optional sound on new/received events.
5. Primary CTA per status:
   - received → Accept
   - accepted → Start preparing
   - preparing → Mark ready
   - ready → Out for delivery (delivery) or Completed (pickup)
   - out_for_delivery → Completed
6. Expand **ticket** → fetch `/orders/:id/ticket` (items, modifiers, note, address).
7. Cancel requires reason string.
8. Transitions send `expected_version` → conflict if stale (optimistic concurrency).
9. Link back to hub; link to History.

**Not in KDS:** payment capture, refunds, Medusa fulfillment create — those stay in native Orders.

### 6.3 History (`/restaurant/orders/history`)

**Purpose:** Paginated completed/cancelled tickets, searchable. Does not mix into live board.

### 6.4 Branches (`/restaurant/branches`)

**Purpose:** Location operating profile.

**User can:**

1. Create branch (name, slug, phone, address, prep minutes).
2. See delivery/pickup acceptance, active flag.
3. Pause / resume branch (operational pause, not global settings).
4. (API supports hours/capacity fields; UI depth may be simpler than full weekly editor — verify current form fields when reviewing).

**Downstream effect:** Hub chips + complete-cart rejects paused/closed/at_capacity branches.

### 6.5 Modifiers (`/restaurant/modifier-groups`)

**List page:**

1. Create group: name, single/multiple, required, min/max.
2. Table of groups with option counts.
3. **Duplicate** → POST `{ action: "duplicate" }` creates copy with options.
4. Edit → detail page.

**Detail page (`/modifier-groups/:id`):**

1. Edit group fields (name, required, min, max) → Save group.
2. Add option (name, BHD price_adjustment, default).
3. Toggle option active.
4. Sort order displayed (no drag-drop yet).

**Product detail widget:**

1. On native Product page, Restaurant modifiers widget.
2. Select group → Link (sort_order auto).
3. Unlink.
4. API supports overrides on link POST (`is_required_override`, min/max, variant_ids, branch_ids) — **widget UI for overrides is still thin**; overrides apply in `listProductModifierGroupsDetailed` / store modifiers when set via API.

### 6.6 Menus (`/restaurant/menus`)

**List:**

1. Create draft menu (title).
2. Publish from list or detail.
3. Open detail.

**Detail:**

1. Add section (title).
2. Attach product by pasting **Medusa product_id** into a section (no product search picker yet).
3. Publish → status published + audit + storefront revalidate attempt (if env configured).

**Store effect:** After publish, storefront `/store` prefers projection sections; if no published menus/products, falls back to categories.

### 6.7 Delivery & pickup policies (`/restaurant/policies`)

**User flow:**

1. Select branch + order_type (delivery|pickup).
2. Set min_order_amount, flat_fee, free_threshold, ETA minutes, paused flag.
3. Save (upsert).
4. List existing policies.

**Enforcement:**

- complete-cart: pause + min order vs cart subtotal.
- Storefront cart/menu: display hints (flat_fee is **informational**; actual shipping price still from Medusa shipping options).

### 6.8 Brand content (`/restaurant/content`)

**User flow:**

1. Choose locale `ar` or `en`.
2. Edit brand_name, hero title/subtitle, announcement, phone.
3. Save → Zod `BrandContentSchema` validation; audit; revalidate tags.

**Store effect:** Home hero + metadata prefer CMS content; empty → i18n/constants fallback.

Schema allows more fields (logo, SEO, legal, social) than the current form exposes — expandable without model change.

### 6.9 Settings (`/restaurant/settings`)

**User flow:**

1. Pause/resume **all** customer ordering (`ordering_enabled`).
2. Timezone, default locale, default prep, max item qty.
3. Save.

**Enforcement:** complete-cart blocks when ordering disabled; menu projection reports paused.

### 6.10 Audit (`/restaurant/audit`)

Read-only list of recent audit rows (action, resource, actor, time, reason). Auto-refresh ~15s. Used after policy/content/menu publish/coordinate events.

### 6.11 Outbox (`/restaurant/outbox`)

1. See pending/sent/failed/dead messages (event_type, attempts, last_error).
2. Retry failed → requeue pending.
3. Background job every minute processes pending (stub or webhook).

### 6.12 Native Medusa Orders (`/orders`)

Hub card “Commerce orders”: payment collections, fulfillments, refunds. Kitchen completion does not replace this screen.

### 6.13 Recommended owner day workflow (end-to-end)

1. **Morning:** Hub → ensure ordering open; check branch chips; adjust prep if busy.
2. **Menu:** Menus → publish day’s sections; Content → announcement if needed.
3. **Service:** Kitchen board open on a tablet; sound on; advance tickets; cancel with reason when needed.
4. **Exceptions:** Branches pause one location; Settings pause all if emergency.
5. **Commerce:** For refunds/payment issues → native Orders (until gateway + coordination workflows mature).
6. **Ops:** Audit for who changed what; Outbox if notifications stuck.

---

## 7. Customer-facing journeys tied to Admin config

| Customer step | Depends on Admin |
|---------------|------------------|
| See hero/announcement | Content |
| Browse menu | Published Menus (+ Products in Medusa) |
| Choose delivery/pickup + branch | Branches + cart restaurant-meta |
| See min order / ETA | Policies |
| Add modifiers | Modifier groups linked on Product (+ overrides) |
| Checkout | Intent + shipping match + branch open + min order + BHD |
| Track kitchen | Guest token / claim email → status API; live poll page |
| Kitchen receives order | order.placed subscriber → restaurant_order |

---

## 8. Gaps vs plan (for Codex analysis)

### Implementable later (no owner secrets)

- Drag-drop reorder for menu sections/products and modifier options
- Product search picker in menu attach (instead of raw product_id)
- Richer Content Admin (logo, SEO, legal fields already in schema)
- Staff role assignment UI (metadata editor or invites)
- Apply `flat_fee` into Medusa shipping option amounts via workflow (today informational)
- Full HTTP/module integration tests from plan matrix §6
- Versioned `/store/restaurant/v1/...` if freezing contracts
- SSE Last-Event-ID / multi-instance (needs Redis Event Module)

### Blocked on owner (do not invent)

- Bahrain payment provider choice + sandbox credentials (PAY-001)
- Real email/SMS provider (or keep webhook stub)
- Production Redis / Medusa Cloud decision
- Managed Postgres backups, domains, CORS, publishable key, all secrets listed in `docs/USER_REQUIRED_SETUP.md`

### Known intentional behaviors

- Kitchen completed ≠ paid/fulfilled
- Outbox “sent” without webhook = stub success (logged)
- In-memory kitchen bus: multi-server KDS will miss events
- Menu Admin still requires copying product IDs
- Default restaurant role = `owner` if metadata unset

---

## 9. Verification snapshot (as of handoff)

- Unit tests: **26 passed** (`pnpm --filter @dtc/backend test`)
- Migrations applied for menus, policies, content, audit, outbox, MOD overrides, content `(key,locale)` unique index
- Dev: `pnpm dev:fast` or separate backend + storefront; watch for Windows `EADDRINUSE` / Medusa watcher `taskkill` flakes — restart if Admin blank

Suggested smoke path for humans (also useful for Codex eval scripts):

1. Admin hub loads counts  
2. Publish menu → store menu shows section  
3. Save content ar → home hero updates (after revalidate or cache miss)  
4. Policy min order → checkout below min fails  
5. Place order → Kitchen received → advance → completed → Outbox rows → Audit rows  
6. Confirmation page status updates while kitchen advances  

---

## 10. File map (high-signal paths)

```
restaurant-platform/
  CURSOR_MEDUSA_ADMIN_COMPLETION_PLAN.md   # original contract
  docs/
    CODEX_HANDOFF_REPORT.md                # this file
    USER_REQUIRED_SETUP.md
    OPS_CHECKLIST.md
  apps/backend/src/
    modules/restaurant/                    # domain
    admin/routes/restaurant/**             # Admin UX
    admin/widgets/**
    admin/i18n/json/{en,ar}.json
    api/admin/restaurant/**
    api/store/restaurant/**
    api/middlewares.ts
    workflows/**
    subscribers/**
    jobs/process-restaurant-outbox.ts
    links/**
  apps/storefront/src/
    modules/menu/templates/
    modules/home/components/hero/
    modules/order/**/kitchen-status-tracker/
    app/.../order/[id]/status/
    lib/data/restaurant.ts
    app/api/revalidate/route.ts
```

---

## 11. Questions Codex should answer when analyzing

1. Does Admin IA (single Restaurant hub + cards) satisfy “owner-first Control Center,” or is sidebar label clutter from nested `defineRouteConfig` labels still a problem?
2. Is pasting `product_id` for menu attach acceptable MVP, or must product search ship before storefront contract freeze?
3. Should `flat_fee` remain display-only until shipping option sync exists?
4. Is stub outbox “sent” acceptable for Phase 6 gate, or must Notification Module be required?
5. Against §6 test matrix: which rows are highest risk given current coverage (unit-heavy, HTTP/E2E light)?
6. Any violation of non-negotiables (metadata vs typed models, validate-hook mutations, silent kitchen→payment mapping)?

---

*End of handoff report. Prefer citing this file + the plan together rather than re-deriving status from git history alone.*
