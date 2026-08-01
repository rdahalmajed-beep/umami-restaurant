# Production ops checklist (Phase 7 — INFRA)

Use this before going live. Do not invent payment gateway credentials; choose the Bahrain provider with the business first.

## Environment

- [ ] `DATABASE_URL` points at managed Postgres with PITR/backups enabled
- [ ] `JWT_SECRET` / `COOKIE_SECRET` / `AUTH_MFA_ENCRYPTION_KEY` are unique, long, and not committed
- [ ] `RESTAURANT_GUEST_STATUS_SECRET` set for guest order status tokens
- [ ] `STOREFRONT_REVALIDATE_URL` + `REVALIDATE_SECRET` match storefront `REVALIDATE_SECRET`
- [ ] `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` list only real origins
- [ ] Publishable key on storefront only; never admin secrets in the browser
- [ ] Payment provider secrets only in server env (not chosen until business picks gateway)

## Medusa Cloud vs self-hosted

### Cloud
- Prefer Cloud-managed Redis/events/locking; do not double-register conflicting modules

### Self-hosted
- [ ] Redis event module + workflow engine + caching + locking configured for installed Medusa version
- [ ] S3-compatible file provider for uploads
- [ ] Connection pooling and migrate step in deploy pipeline

## Data safety

- [ ] Automated Postgres backups + documented restore drill
- [ ] Separate staging vs production DB and secrets
- [ ] Migration backup taken before `db:migrate` in prod

## Observability

- [ ] Structured logs with request/cart/order correlation
- [ ] Error tracking on backend + storefront
- [ ] Alerts: payment failures, outbox dead-letter growth, KDS stream disconnects, high checkout 4xx

## Restaurant domain smoke (staging)

1. Admin hub: pause/resume ordering, prep ±
2. Kitchen: accept → prepare → ready → complete; cancel with reason
3. History + SSE/live updates
4. Menus: draft → section → attach product → publish; `GET /store/restaurant/menu` returns published
5. Policies: min order blocks checkout below threshold
6. Content: save ar/en brand content
7. Audit log shows policy/content/menu publish
8. Outbox shows notification intents after status changes; retry failed
9. Commerce Orders still used for payment/fulfillment (kitchen complete ≠ paid)

## Known intentional gaps until Phase 6 payment choice

- No production payment provider wired
- Outbox enqueue only (no full notification provider delivery worker yet)
- Kitchen completed enqueues `commerce.fulfillment.requested` + metadata; does not auto-fulfill Medusa
