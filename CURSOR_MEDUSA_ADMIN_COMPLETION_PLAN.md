# Cursor Execution Plan — Complete the Umami Medusa Admin

This file is the implementation contract for Cursor. It is intentionally ordered. Do not implement all phases in one pass.

## 0. Mission

Turn the current Medusa `2.18.0` restaurant MVP into a production-capable restaurant backend and owner-friendly admin before locking the custom storefront contracts.

The desired product has three properties at the same time:

1. Correct: the server cannot accept an internally inconsistent order.
2. Fast: restaurant hot-path actions feel immediate and kitchen orders arrive in near real time.
3. Flexible: the owner can control branches, hours, availability, menu presentation, modifiers, preparation time, fees, and content without code changes.

Read `MEDUSA_ADMIN_AUDIT_AR.md` before starting.

---

## 1. Non-negotiable rules

1. Use Medusa v2.18 APIs and patterns only. Never use Medusa v1 services, strategies, or plugin APIs.
2. Read the root and app `package.json` files, `medusa-config.ts`, existing module, workflows, API routes, admin extensions, and current `git diff` before editing.
3. The worktree already contains user changes. Preserve them. Do not reset, revert, overwrite, or reformat unrelated files.
4. Work on one phase at a time. At the start of each phase, list:
   - exact objective;
   - files to add/change;
   - migrations expected;
   - verification commands;
   - rollback/compatibility concerns.
5. At the end of each phase, stop and report evidence. Do not automatically continue.
6. Never edit generated Medusa internals under `.medusa` or dependencies under `node_modules`.
7. Generate/review module migrations using Medusa tooling. Do not hand-edit the production database.
8. Do not put durable business data into generic metadata when a typed model/link belongs in the restaurant domain. Metadata may hold immutable snapshots and compatibility fields.
9. Do not reimplement Medusa catalog, pricing, inventory, promotion, order, payment, tax, fulfillment, customer, or user modules.
10. Use Module Links to connect custom restaurant models to Medusa commerce models.
11. Every write that changes more than one invariant must be a workflow. Add compensation or keep the mutation in one transaction.
12. Every hot-path concurrent mutation needs a lock and/or optimistic version check.
13. A GET endpoint must not create or mutate records.
14. Store APIs must return stable error codes plus safe messages. The storefront translates codes.
15. Admin custom APIs require authentication and permission checks. Being under `/admin` is necessary but not sufficient for restaurant roles.
16. Do not add a broad CMS/page builder. Use versioned, validated content-block schemas.
17. Do not add nested/conditional modifiers until the real menu demonstrates the need.
18. Do not add a dependency without explaining why an installed dependency or Medusa module cannot solve the problem.
19. Never log secrets, payment payloads, access tokens, or full customer PII.
20. Keep Arabic/English and RTL requirements in every new customer- or admin-visible data model.

---

## 2. Current repository facts to verify, not assume

- Backend: `apps/backend`, Medusa `2.18.0`.
- Storefront: `apps/storefront`, Next.js `15.5.21`.
- Custom module: `apps/backend/src/modules/restaurant`.
- Current custom admin routes:
  - `src/admin/routes/restaurant/branches/page.tsx`
  - `src/admin/routes/restaurant/modifier-groups/**`
  - `src/admin/routes/restaurant/orders/page.tsx`
- Current widgets:
  - product modifiers;
  - order restaurant snapshot;
  - order kitchen status.
- Current custom Store APIs:
  - branches;
  - product modifiers;
  - cart restaurant metadata;
  - line item with modifiers;
  - order kitchen status.
- Current infrastructure is local/in-memory for events, locks, workflows, and cache.
- Current payment provider is `pp_system_default`.
- Current seed is demo-oriented and must not become production bootstrap unchanged.

---

## 3. Target architecture

### 3.1 Native Medusa responsibilities

Use native Medusa for:

- Product, Variant, Category, Collection, Tag.
- Price, Price List, Region and Currency.
- Inventory Item, Inventory Level, Stock Location, reservations.
- Sales Channel.
- Fulfillment Set, Service Zone, Shipping Option.
- Cart and Order.
- Payment, Refund, Fulfillment, Return, Exchange and Claim.
- Customer, Promotion, Tax, User, Invite and Auth.

### 3.2 Restaurant plugin/module responsibilities

The restaurant domain owns:

- Restaurant settings and operating state.
- Branch profile, schedule, closures, pause/capacity/prep overrides.
- Links between branch and Medusa stock/fulfillment entities.
- Menu presentation, sections, schedules and publication.
- Per-branch operational availability.
- Modifier groups, options and per-product configuration.
- Restaurant fulfillment intent validation.
- Restaurant order/KDS state and immutable transition log.
- Staff restaurant roles/permissions and audit log.
- Menu read projection and cache invalidation events.
- Integration outbox records where needed.

### 3.3 Recommended read and write paths

- Writes: typed API → validation middleware → workflow → transaction/lock → event after commit.
- KDS reads: paginated summary projection + details on demand + real-time event stream.
- Storefront menu reads: cached projection keyed by branch/order type/locale.
- Admin configuration reads: normalized entities, pagination, filters, saved views where useful.

---

# Phase 0 — Repair the engineering gate

Do this before adding business features.

## QG-001 Make root commands truthful

### Work

- Add explicit `typecheck`, `lint`, `test`, and `build` tasks for both apps.
- Ensure `pnpm test` executes tests; Turbo must not report `0 tasks`.
- Make environment-variable scripts cross-platform.
- Replace deprecated `next lint` with ESLint CLI configuration compatible with Next 15.
- Remove `ignoreBuildErrors` and `eslint.ignoreDuringBuilds` after errors are fixed.
- Make production builds independent of downloading Google Fonts; self-host fonts or use checked-in/local assets according to license.

### Expected files

- root `package.json`
- `turbo.json`
- backend/storefront `package.json`
- storefront ESLint/Next config
- `src/app/layout.tsx` and font assets if self-hosting

### Acceptance

- `pnpm typecheck` runs both apps.
- `pnpm lint` runs both apps.
- `pnpm test` runs a nonzero number of tests.
- `pnpm build` does not ignore TypeScript or ESLint failures.

## QG-002 Repair Jest and test the real code

### Work

- Fix or remove the missing `integration-tests/setup.js` reference.
- Split unit/module-integration/HTTP configs cleanly.
- Replace tests that duplicate service logic with tests invoking the actual service/workflow.
- Create isolated test database setup and cleanup.
- Never point tests at the developer or production database.

### Acceptance

- Modifier tests fail when `validateAndPriceModifiers` is intentionally broken.
- Status tests fail when the real transition map/service is intentionally broken.
- Tests pass again after reverting the intentional mutation.

## QG-003 Fix current TypeScript errors

Known areas from the audit:

- Admin JSON imports versus backend `module` setting.
- `opening_hours_json` typed as `unknown` in branch routes.
- Store order status route infers `branch` as only `null`.
- Unused `@ts-expect-error` in seed.
- `never[]` inference in shipping/product seed arrays.

Do not hide these errors with `any`, `@ts-ignore`, or global skip settings.

## QG-004 Add CI

CI order:

1. install frozen lockfile;
2. typecheck;
3. lint;
4. unit tests;
5. module/HTTP integration tests with disposable PostgreSQL;
6. builds;
7. optional E2E/smoke stage.

### Phase 0 gate

- All commands are green locally and in CI.
- A deliberately failing test or TypeScript error makes CI red.
- No product feature work starts until this gate is met.

---

# Phase 1 — Enforce order correctness and secure the existing APIs

## ORD-001 Introduce a canonical Restaurant Fulfillment Intent

### Problem

`cart.metadata.restaurant.order_type/branch_id` and the Medusa shipping method are currently mutated through separate paths.

### Work

Create a workflow, for example:

`setRestaurantFulfillmentIntentWorkflow`

Input:

```ts
type SetRestaurantFulfillmentIntentInput = {
  cart_id: string
  branch_id: string
  order_type: "delivery" | "pickup"
  delivery_zone_id?: string
  customer_note?: string
}
```

The workflow must:

1. lock `cart:{cart_id}:restaurant-intent`;
2. retrieve cart, branch and linked fulfillment configuration;
3. validate branch active/open/not paused/accepts type;
4. validate delivery coverage when delivery;
5. choose the exact Shipping Option linked to this branch and order type;
6. set/replace the cart shipping method through Medusa workflow APIs;
7. write the typed intent snapshot to cart metadata or linked cart record;
8. refresh totals/payment collection when required by Medusa;
9. return the updated minimal cart;
10. emit `restaurant.cart_fulfillment_intent.updated` after success.

Do not mutate cart totals or shipping inside `completeCartWorkflow.validate`; Medusa explicitly warns that the order/payment snapshot has already been read.

### API

Replace or version the current `/store/carts/:id/restaurant-meta` contract. During migration, keep a compatibility response if the existing storefront needs it.

### Acceptance tests

- Pickup intent always has a pickup shipping option for the same branch.
- Delivery intent always has a delivery shipping option for the same branch/zone.
- Branch that rejects the selected type is rejected.
- Changing intent replaces the previous shipping method and recalculates totals.
- Two concurrent intent changes produce one valid final state.

## ORD-002 Add complete-cart invariant validation

Consume `completeCartWorkflow.hooks.validate` in `src/workflows/hooks`.

Validate only; do not mutate:

- restaurant intent exists;
- branch exists and is not archived;
- branch is open/available according to the checkout policy;
- shipping option matches branch and order type;
- delivery address is in zone for delivery;
- pickup does not charge delivery;
- every restaurant line item still has valid variant/modifier snapshots according to the chosen “revalidate at checkout” policy;
- items are operationally available;
- minimum order/capacity/schedule rules pass.

Return stable codes, for example:

- `RESTAURANT_BRANCH_CLOSED`
- `RESTAURANT_BRANCH_PAUSED`
- `RESTAURANT_FULFILLMENT_MISMATCH`
- `RESTAURANT_OUTSIDE_DELIVERY_ZONE`
- `RESTAURANT_ITEM_UNAVAILABLE`
- `RESTAURANT_MINIMUM_ORDER_NOT_MET`

## ORD-003 Make restaurant order creation durable

- Prefer creating the restaurant order in a workflow hook tied to order creation if atomicity is supported cleanly; otherwise use a durable Redis event subscriber plus idempotent workflow and alert/retry.
- Keep the `order.placed` subscriber idempotent.
- Handle unique-conflict races as “already created”.
- Add a read-only backfill script/job for existing Medusa orders missing restaurant rows; require explicit execution and print counts before writes.
- Never create a restaurant order from GET.

## ORD-004 Secure guest order status

Replace the public behavior with one of:

- authenticated customer owns order; or
- signed guest order access token bound to order ID, stored in an HTTP-only cookie or returned once after checkout.

Requirements:

- GET only.
- no customer PII in response.
- rate limited.
- token comparison is safe.
- absent restaurant row returns a clear recoverable state and raises an internal alert; it does not create data.
- test guessed/other order IDs.

## ORD-005 Atomic kitchen transitions

Create `transitionRestaurantOrderWorkflow`:

- lock `restaurant-order:{order_id}`;
- retrieve current row and version;
- validate transition and actor permission;
- update state and append event atomically;
- store reason/note where required;
- emit `restaurant.order_status.updated` after commit;
- return new row/version.

Add an optimistic `version` number. Reject stale commands with `RESTAURANT_ORDER_VERSION_CONFLICT` and let the admin refresh.

## ORD-006 Align restaurant state with Medusa payment/order actions

Define and document rules:

- When does a paid online order enter `received`?
- Can COD enter `received` before payment?
- What does restaurant `cancelled` trigger in Medusa Order/Payment?
- When does `completed` create/complete fulfillment?
- What if refund fails after restaurant rejection?

Do not silently map kitchen status to payment/fulfillment status. Use explicit workflows that coordinate them when the business action requires it.

### Phase 1 gate

- No API path can complete a mismatched branch/type/shipping order.
- Public status is authorized and read-only.
- Status updates are concurrency-safe and audited.
- Existing orders can be backfilled idempotently.
- Integration tests cover all failures.

---

# Phase 2 — Rebuild the restaurant domain around links and operating controls

## DATA-001 Define Module Links

Create files under `apps/backend/src/links` for required associations. At minimum evaluate and implement:

- RestaurantBranch → StockLocation.
- RestaurantBranch → FulfillmentSet or a typed BranchFulfillmentPolicy linked to Medusa shipping entities.
- Restaurant Product Configuration → Product.
- Restaurant Order → Order, unless the chosen order-extension pattern needs a different direction.

Do not retain plain text IDs as the sole relationship when a Module Link applies.

Run/generate link sync through Medusa migrations. Add orphan/duplicate tests.

## DATA-002 Restaurant settings

Add a typed singleton model with:

- timezone and default locale;
- supported locales;
- default prep time and max item quantity;
- manual/automatic acceptance policy;
- scheduling enabled and lead-time policy;
- customer notes policy;
- tips policy;
- global ordering state;
- contact/social/legal references;
- schema version.

Expose a settings page under Medusa Admin Settings if appropriate.

## DATA-003 Branch schedule and operating state

Prefer typed rows over arbitrary JSON:

- weekly intervals;
- timezone;
- special closure/opening overrides;
- pause state, reason and resume time;
- current prep override and expiry;
- capacity configuration;
- pickup/delivery policies.

Implement a pure service that computes:

```ts
type BranchOperationalState =
  | "open"
  | "closed"
  | "paused"
  | "at_capacity"
```

Cover overnight hours, daylight/timezone boundaries, special dates and invalid overlaps.

## DATA-004 Per-branch operational availability

Model availability for:

- product;
- variant;
- modifier option;
- menu section if needed.

Fields:

- branch link;
- resource type/link;
- available boolean;
- reason code;
- starts_at/ends_at;
- changed_by;
- version;
- optional automatic reset.

Hot-path “86 item” must be one command, optimistic in the admin, concurrency-safe, and event emitting.

## DATA-005 Database constraints and indexes

Add constraints for:

- modifier min/max consistency;
- single group max one;
- valid defaults;
- nonnegative prep/capacity values;
- unique product/group association;
- unique branch/resource availability row when no time window is used.

Add indexes described in the audit, then capture `EXPLAIN ANALYZE` for active KDS and menu projection queries using realistic test data.

### Phase 2 gate

- Branch is connected to actual Medusa stock/fulfillment entities.
- Server computes and enforces branch operational state.
- Owner can pause/resume and 86/restore items without editing products or code.
- Changes emit events and have audit data.

---

# Phase 3 — Build an owner-first Control Center and real-time KDS

## ADM-001 Restaurant Control Center

Create `/restaurant` as the owner landing page.

Required cards/actions:

- new orders waiting;
- preparing/late/ready counts;
- branch current state;
- Pause/Resume Orders;
- current prep time and quick +5/+10/reset;
- unavailable items count and quick manage link;
- today orders/revenue/AOV;
- payment/notification/printer failures when integrations exist.

Hot actions must:

- show current server state;
- be optimistic with rollback;
- disable duplicate clicks;
- show actor-safe confirmation for risky actions;
- update all open admin views through event invalidation.

## KDS-001 Split list summary from details

Replace the every-6-second full payload pattern.

List response should contain only:

- order ID/display ID;
- status/version;
- type/branch;
- created/promised timestamps;
- item count or compact ticket summary;
- customer first name/phone only if operationally necessary;
- SLA flags;
- total only if KDS role is allowed to see it.

Fetch full items/modifiers/address only on expanded detail or a selected board projection.

Add cursor pagination and `updated_since` support. Never use a silent fixed limit of 50.

## KDS-002 Real-time transport

Preferred target:

- Redis-backed Medusa events internally in self-hosted production, or managed equivalents on Medusa Cloud.
- Authenticated SSE for one-way KDS updates, unless the deployment already has a justified WebSocket service.
- Fallback adaptive polling with backoff.
- heartbeat, reconnect and last-event cursor.
- dedupe by event ID/version.

Events:

- order received;
- order updated/cancelled;
- status changed;
- branch paused/resumed;
- availability changed.

Do not send full sensitive order payloads through broad pub/sub channels.

## KDS-003 Kitchen usability

- sound and visible new-order alert;
- explicit acknowledge/accept;
- large touch targets;
- elapsed and promised timers;
- overdue colors;
- branch/station filters;
- modifier and note emphasis;
- reason-required reject/cancel dialogs;
- connection state and last sync;
- tablet/desktop layouts;
- accessible keyboard and screen-reader behavior.

## KDS-004 Order history

Add a separate paginated/searchable history for completed/cancelled orders. Do not mix unlimited history into the live board.

### Performance acceptance

- New committed order normally appears in KDS in under 2 seconds.
- Status button acknowledges locally immediately and confirms server result.
- Reconnect does not lose or duplicate the effective state.
- 500 active test orders do not create an unbounded DOM or full-table scan.
- p95 command latency and event-delivery metrics are recorded.

---

# Phase 4 — Flexible Menu and Modifier Admin

## MENU-001 Menu presentation model

Add:

- Menu.
- MenuSection.
- MenuProduct association.
- locale-aware title/subtitle.
- order type applicability.
- branch applicability.
- schedules.
- sorting.
- draft/published version and published_at.
- optional featured/badge flags.

Do not duplicate native product price/inventory. Link to Product and retrieve the correct Medusa calculated price/inventory for context.

## MENU-002 Owner UI

- list/create/duplicate/archive menu;
- section drag/drop;
- product search and bulk attach;
- branch/order-type selectors;
- schedule editor;
- draft preview URL;
- publish with validation summary;
- show unavailable/missing-price/unlinked-stock warnings.

High-risk publication should be explicit; daily availability toggles should remain immediate.

## MOD-001 Complete modifier editing

Add UI/API for:

- edit group fields;
- edit option name/price/default/active;
- delete/archive with impact check;
- drag/drop reorder;
- duplicate group;
- bulk product attachment;
- translations;
- description/allergen/image when required by product design.

## MOD-002 Per-product modifier configuration

Create a configuration association instead of only `product_id + group_id + sort_order`.

Support overrides:

- required;
- min/max;
- default selection;
- sort order;
- variant applicability;
- branch applicability;
- price override strategy if approved;
- schedule/availability.

Do not implement every theoretical modifier feature. Add quantity/free allowance only if the real menu requires them, with explicit pricing tests.

## MOD-003 Multi-currency and pricing decision

Choose one documented approach:

- keep modifiers BHD-only and enforce store currency BHD; or
- model modifier price sets by currency/region/branch.

Never silently apply a BHD number to another currency.

## MENU-003 Store menu projection

Create a minimal projection endpoint keyed by:

- branch;
- order type;
- locale;
- optional customer/region context only when required.

It should return in one compact response:

- restaurant operational state;
- menu sections;
- products/variants and calculated price fields needed by the UI;
- modifiers and defaults;
- availability;
- version/ETag.

Avoid fetching categories with full products and then a second full products list.

## CACHE-001 Invalidation

- emit restaurant menu/availability events after committed changes;
- invalidate Medusa/Redis projection cache by tags/keys;
- call a signed Next.js revalidation endpoint for affected paths/tags;
- protect the revalidation endpoint with a secret/signature and rate limit;
- record failures and retry asynchronously.

### Phase 4 gate

- Owner builds and publishes a realistic bilingual menu without code edits.
- Modal data is available immediately from projection/prefetch.
- Price, availability, and modifier edits propagate within documented SLA.
- Old orders keep immutable snapshots.

---

# Phase 5 — Delivery policy, content, roles and audit

## FUL-001 Delivery and pickup policies

Per branch/order type support:

- minimum order;
- flat or tiered fee;
- free threshold;
- estimated duration;
- lead time;
- service zones;
- zone pause/closure;
- scheduled slots/capacity if enabled.

Keep the final shipping price represented by Medusa Shipping Options/price rules or an approved calculated fulfillment provider, not a storefront-only number.

## CMS-001 Structured brand/content settings

Admin-managed:

- brand name/logo/favicon;
- hero title/subtitle/media/CTA;
- announcement banner;
- category/featured blocks;
- contact/social links;
- SEO defaults/social image;
- legal document links;
- Arabic/English values.

Use a versioned allow-list of block types and validated fields. No arbitrary scripts or unsafe HTML.

## AUTH-001 Restaurant roles and permissions

Define permissions, not UI hiding only:

- restaurant.settings.read/write;
- branch.read/write/pause;
- menu.read/write/publish;
- availability.write;
- order.read/accept/advance/cancel;
- payment/refund permissions;
- report.read;
- integration.write.

Suggested roles: owner, manager, kitchen, cashier, content editor.

Every custom Admin route checks permissions. Add tests for all roles.

## AUD-001 Audit log

Append-only records for:

- actor and role;
- action;
- resource type/id;
- before/after or a safe diff;
- request/correlation ID;
- timestamp/IP where allowed;
- reason for sensitive actions.

Redact secrets and unnecessary PII. Provide a filtered admin page for owner/authorized manager.

### Phase 5 gate

- Owner delegates kitchen/menu tasks without exposing all admin powers.
- Every sensitive operational/config change is attributable.
- Website identity and structured homepage content are editable without deployment.

---

# Phase 6 — Payments, notifications and operational integrations

## PAY-001 Production payment provider

Implement the chosen Bahrain payment gateway as a Medusa Payment Module provider.

Requirements:

- authorize/capture/cancel/refund state mapping;
- signed webhooks;
- idempotency and replay handling;
- timeout/retry policy;
- reconciliation identifiers;
- no secret sent to storefront;
- partial/full refund tests;
- double-submit and concurrent completion tests.

Do not choose the gateway in code before the business selects it and supplies sandbox docs/credentials.

## NOTIF-001 Notification provider and templates

Use Medusa Notification Module/provider or a clean provider integration.

Events:

- order confirmed;
- accepted/rejected;
- preparation time changed;
- ready;
- out for delivery;
- completed/cancelled/refunded.

Requirements:

- Arabic/English templates;
- channel preferences;
- retries and failure visibility;
- idempotent event-to-message keys;
- preview/test-send in admin;
- no blocking external calls in checkout/KDS commands.

## INT-001 Outbox for POS/printer/external systems

Use an outbox/job pattern so request success does not depend on a printer or POS being online. Track pending/sent/failed/dead-letter and allow safe retry.

### Phase 6 gate

- Payment and notification failures are observable and recoverable.
- Replayed webhooks/messages do not duplicate business effects.
- External outages do not block core order persistence.

---

# Phase 7 — Production infrastructure and operations

## INFRA-001 Choose deployment mode first

### If Medusa Cloud

- Do not manually register Redis caching/event/locking/workflow modules that Cloud manages.
- Follow Cloud environment, DB, Redis and file-provider guidance.

### If self-hosted

Configure for the installed Medusa version:

- Redis Event Module;
- Redis Workflow Engine;
- Redis Caching Provider with caching feature flag;
- Redis or PostgreSQL Locking Provider;
- S3-compatible File Provider;
- connection pooling and migrations deployment step.

## INFRA-002 Observability

- structured JSON logs;
- request ID, cart ID, order ID and workflow correlation;
- error tracking;
- traces for checkout/KDS/payment;
- metrics: order rate, command latency, queue lag, subscriber failures, payment failures, KDS delivery delay;
- alerts with actionable runbooks.

## INFRA-003 Data safety

- automated PostgreSQL backups/PITR;
- documented and tested restore;
- separate staging/prod databases and secrets;
- retention/privacy policy;
- migration backup and forward-fix plan.

## INFRA-004 Performance and resilience

- load test menu and cart;
- burst order placement;
- concurrent last-stock item;
- KDS reconnect/soak;
- payment/provider timeouts;
- Redis/DB temporary outage behavior;
- CDN/image optimization;
- accessibility and mobile tests.

### Phase 7 gate

- Production readiness checklist is signed off with evidence.
- Backup restore and incident runbooks have been exercised.
- Load targets and p95/p99 budgets are met.

---

## 4. Admin UX design principles

Classify controls before building them.

### Hot controls — one action, immediate

- pause/resume ordering;
- 86/restore product/variant/modifier;
- accept/advance order;
- prep time quick override;
- acknowledge alert.

Rules:

- optimistic UI;
- response/version confirmation;
- rollback on failure;
- event propagation to other sessions;
- no full-page form.

### Configuration — explicit save or draft/publish

- opening hours;
- delivery zones/fees;
- menu structure;
- modifier rules;
- homepage content;
- notification templates.

Rules:

- validation summary;
- unsaved-change warning;
- preview where customer-facing;
- draft/publish for grouped changes;
- impact scope: affected branches/channels/locales.

### High-risk actions — confirmation, reason, audit

- cancel/refund;
- archive branch/menu;
- publish price changes;
- rotate integration credentials;
- delete data.

---

## 5. API and data contract standards

### Responses

- Version custom Store contracts, for example `/store/restaurant/v1/menu` if breaking changes are expected.
- Return IDs, version, timestamps and stable status enums.
- Use cursor pagination for growing lists.
- Return a machine error code and safe message.
- Do not return internal provider payloads or PII by default.

### Writes

- Support idempotency key where retry is plausible.
- Require expected version for concurrent operational resources.
- Emit domain event after commit.
- Include actor in audit data.

### Money

- Always include currency code in custom money contracts.
- Use Medusa BigNumber/money conventions consistently.
- Define rounding point and test BHD three-decimal cases.
- Document tax-inclusive behavior.

### Time

- Store timestamps in UTC.
- Store IANA timezone on branch/settings.
- Send ISO timestamps and timezone separately.
- Never use server local time for opening rules.

### Translation

- Use locale codes accepted by Medusa.
- Define fallback locale.
- Snapshot the customer-visible localized names used in an order.
- Verify RTL in Admin custom pages and storefront contracts.

---

## 6. Required test matrix before storefront contract freeze

| Scenario | Unit | Module | HTTP | E2E |
|---|---:|---:|---:|---:|
| Pickup branch/type/shipping consistency | ✓ | ✓ | ✓ | ✓ |
| Delivery zone/fee/minimum | ✓ | ✓ | ✓ | ✓ |
| Branch closed/paused/capacity | ✓ | ✓ | ✓ | ✓ |
| Product/variant/modifier unavailable | ✓ | ✓ | ✓ | ✓ |
| Modifier min/max/default/price/rounding | ✓ | ✓ | ✓ | ✓ |
| Concurrent add/update/status |  | ✓ | ✓ | ✓ |
| Double cart completion |  | ✓ | ✓ | ✓ |
| Guest order-status authorization |  |  | ✓ | ✓ |
| Role permissions |  |  | ✓ | ✓ |
| Cache invalidation |  | ✓ | ✓ | ✓ |
| KDS reconnect/dedupe | ✓ | ✓ |  | ✓ |
| Payment webhook replay | ✓ | ✓ | ✓ | ✓ |
| Arabic/English snapshots | ✓ | ✓ | ✓ | ✓ |

---

## 7. Definition of done for every task

A task is not done until:

- schema/API/workflow behavior is documented;
- migration is generated and reviewed when needed;
- old data compatibility/backfill is addressed;
- permissions are applied;
- audit/event behavior is defined;
- unit/integration tests cover success and failure;
- relevant typecheck/lint/test/build commands pass;
- performance impact is measured for hot paths;
- no unrelated user changes are overwritten;
- final report lists exact files and verification output.

---

## 8. First Cursor prompt to execute

Use this prompt first:

```text
Read MEDUSA_ADMIN_AUDIT_AR.md and CURSOR_MEDUSA_ADMIN_COMPLETION_PLAN.md.

Implement Phase 0 only: Repair the engineering gate.

Before editing:
1. Inspect git status and git diff and preserve all user changes.
2. Read root/backend/storefront package.json, turbo.json, Jest config, TypeScript configs, ESLint configs, Next config, and current admin i18n imports.
3. Reproduce the current test/typecheck/lint/build failures.
4. List exact files you will change and why.
5. Do not add product features, Redis, payment providers, or redesign UI.

Requirements:
- pnpm test must execute a nonzero number of real tests.
- Test scripts must work on Windows and CI/Linux.
- Backend and storefront typecheck must be real.
- Replace deprecated next lint with ESLint CLI.
- Fix current TypeScript errors without any/ts-ignore/global build ignores.
- Repair Jest setup and make unit tests call real production logic.
- Remove ignoreBuildErrors and eslint.ignoreDuringBuilds only after the code is clean.
- Make font/build behavior deterministic without requiring Google Fonts during build.

After editing:
- Run typecheck, lint, unit tests, and builds.
- Report exact passed/failed commands honestly.
- Show git diff --stat and list only files you changed.
- Stop after Phase 0. Do not start Phase 1.
```

After Phase 0 is accepted, prompt Cursor with one Phase 1 task at a time, starting with `ORD-001`, not the whole phase in a single uncontrolled change.

---

## 9. Official documentation to consult during implementation

- [Medusa Module Links](https://docs.medusajs.com/learn/fundamentals/module-links)
- [Workflow Hooks](https://docs.medusajs.com/learn/fundamentals/workflows/workflow-hooks)
- [Complete Cart](https://docs.medusajs.com/resources/storefront-development/checkout/complete-cart)
- [Events and Subscribers](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)
- [Event Module](https://docs.medusajs.com/resources/infrastructure-modules/event)
- [Locking Module](https://docs.medusajs.com/resources/infrastructure-modules/locking)
- [Caching Module](https://docs.medusajs.com/resources/infrastructure-modules/caching)
- [General Deployment](https://docs.medusajs.com/learn/deployment/general)
- [Next.js cache revalidation](https://docs.medusajs.com/resources/nextjs-starter/guides/revalidate-cache)
- [Auth actor types and route protection](https://docs.medusajs.com/resources/commerce-modules/auth/auth-identity-and-actor-types)
- [Inventory reservations](https://docs.medusajs.com/resources/commerce-modules/inventory/reservations-lifecycle)

Always verify examples against installed Medusa `2.18.0` types and packages before copying code.
