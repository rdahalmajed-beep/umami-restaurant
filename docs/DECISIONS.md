# Architecture decisions

## ADR-001 — Storefront menu from Medusa, not a local catalog

**Status:** Accepted (2026-08-07)

**Context:** A temporary `FastUmamiMenu` + `umami-menu.ts` hardcoded BHD catalog and `sessionStorage` cart shipped for mobile speed. That violated one-source-of-truth and created a second product/cart system.

**Decision:** Remove the hardcoded catalog. Home and `/store` render `MenuTemplate`, which loads restaurant menu projection or Medusa category products. Cart mutations go only through Medusa Store APIs.

**Consequences:** First paint depends on backend latency (Render cold start on free tier). Correctness over convenience.

## ADR-002 — Guest order token secret

**Status:** Accepted

**Decision:** Prefer `RESTAURANT_GUEST_STATUS_SECRET`, then `JWT_SECRET` / `COOKIE_SECRET`. In production, missing secrets throw. Dev-only fallback string allowed locally.

## ADR-003 — Payment provider

**Status:** Temporary

**Decision:** Seed still attaches `pp_system_default` until a Bahrain gateway (Tap / Benefit / Stripe ME) is configured. Not customer-production ready.

## ADR-004 — Docker build vs TypeScript noise

**Status:** Accepted with debt

**Decision:** Image build requires `.medusa/server/medusa-config.js`. Medusa may still log TS overload mismatches from generated module types; casts (`as never`) are used at known create* call sites until Medusa typings align. Deploy must not succeed without compiled server output.

## ADR-005 — Restaurant menu seed

**Status:** Accepted

**Decision:** `seed-umami-menu.ts` creates Medusa products **and** a published restaurant menu with sections so `/store/restaurant/menu` projection is non-empty after seed.
