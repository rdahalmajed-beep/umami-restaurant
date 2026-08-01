# P0 Delivery Report — Admin UX & Storefront Readiness

**Spec:** `docs/ADMIN_UX_STOREFRONT_READINESS_REPORT_AR.md`  
**Date:** 2026-07-31  
**Scope:** Implement P0 items (sections 18 + contracts 21–22) as product UX, not API-only.

---

## 1. Final screen map (who sees what)

| Route | Audience | Purpose |
|-------|----------|---------|
| `/restaurant` | Owner / manager | Hub: live ops + grouped navigation (IA-001). **Only** Restaurant item in sidebar. |
| `/restaurant/orders` | Kitchen / manager | Live KDS |
| `/restaurant/orders/history` | Manager | History |
| `/restaurant/availability` | Kitchen / manager | 86 / restore by product search (AVL-001) |
| `/restaurant/branches` | Manager | Branch list + pause |
| `/restaurant/branches/:id` | Manager | Full branch: general, hours, exceptions, zones, capacity (BR-001) |
| `/restaurant/menus` · `/menus/:id` | Menu editor | Builder with product picker, reorder, i18n section titles (MENU-UX) |
| `/restaurant/modifier-groups` · `/:id` | Menu editor | Groups/options + product link overrides (existing + MOD) |
| `/restaurant/meals` · `/meals/:id` | Menu editor | Combo builder steps/items (MEAL-001) |
| `/restaurant/offers` · `/offers/:id` | Marketing | Unified offers + simulate (OFFER-001) |
| `/restaurant/policies` | Manager | Legacy policy upsert (still used alongside zones) |
| `/restaurant/content` | Content | Full brand/SEO/legal + locale isolation (CMS-UX) |
| `/restaurant/translations` | Content | Completeness overview (UX-001 center) |
| `/restaurant/settings` | Owner | General / checkout / kitchen / scheduling / display (SETTINGS-001) |
| `/restaurant/audit` · `/outbox` | Owner / tech | System (hidden from daily IA clutter; linked under نظام) |
| Native `/orders` | Commerce | Payment/fulfillment |

**Sidebar:** nested `defineRouteConfig` labels removed — only hub “Restaurant”.

---

## 2. P0 checklist

| ID | Status | Evidence / notes |
|----|--------|------------------|
| UX-001 i18n/RTL | **Partial→Mostly** | AR/EN keys expanded for new screens; hub grouped; locale bleed fixed on content. Full RTL audit of every Medusa chrome string is Medusa-core limited. Raw enums still appear in some technical badges — translated where restaurant.* covers. |
| IA-001 navigation | **Done** | Hub sections: تشغيل / قائمة / عروض / فروع / محتوى / إعدادات / نظام. Nested routes no sidebar labels. |
| BR-001 branch page | **Done** | `/branches/:id` tabs: general, hours, exceptions, delivery zones, capacity; pause with reason/duration. |
| AVL-001 availability | **Done** | `/availability` branch select, product search, 86 with reason/display_mode/EOD, restore list. |
| MENU-UX-001 | **Mostly** | Product picker, attach, reorder API, section i18n. Drag-drop visual DnD not shipped (up/down reorder). Draft/preview/publish warnings basic (publish exists; full diff preview P1). Schedule application in projection for menu/product schedule_json: data fields exist; runtime schedule filter in projection still limited to order_type/branch. |
| MOD-UX-001 | **Mostly** | Group edit/save, duplicate, options; link API supports overrides. Widget still simpler than full override form — overrides usable via API + product link POST body. |
| MEAL-001 | **Done (MVP)** | Models + Admin list/detail: steps, items, upgrade price, publish, policies. Cart/ticket meal line rendering P1 polish. |
| OFFER-001 | **Done (MVP)** | Compositional `rules_json` + types + activate/pause/simulate. Not every §14.2 type has unique UI — builder covers behaviors via rules fields. Medusa Promotion sync optional (`medusa_promotion_id`). |
| FUL-UX-001 | **Done (core)** | `restaurant_delivery_zone.fee_amount` authoritative; stored on cart `metadata.restaurant.delivery_fee`; complete-cart validates zone fee + min; store `/delivery-zones` + bootstrap. Shipping option auto-price sync to Medusa option amount: deferred — storefront must use zone fee / matching option. |
| ORDER-UX-001 | **Partial** | Kitchen + commerce remain separate screens; coordination stub on kitchen completed; unified restaurant order timeline UI not fully merged into one page (P1). |
| SETTINGS-001 | **Done** | Expanded settings model + Admin sections + API. |
| CMS-UX-001 | **Done** | Logo, SEO, contact, legal; locale reset; preview still soft (no device frame). |
| STORE-CONTRACT-001 | **Done (v1)** | `GET /store/restaurant/bootstrap` returns settings, setup.missing, branches+zones+fees, menu, availability, meals, offers, content. Production menu no longer falls back to all catalog products unless `RESTAURANT_ALLOW_CATALOG_FALLBACK=true`. |

**Migration:** `Migration20260731202705` applied (zones, exceptions, meals, offers, translation_status, branch/settings/menu/availability expansions).

**Unit tests:** 26 passed after migration.

---

## 3. Storefront contract examples

### Bootstrap
`GET /store/restaurant/bootstrap?locale=ar&currency_code=bhd&branch_id=...&order_type=delivery`

Returns `contract_version: 1`, `setup.missing[]` (`NO_BRANCH`, `NO_PUBLISHED_MENU`, `ORDERING_PAUSED`), authoritative `delivery_zones[].fee_amount`, menu projection, active offers, published meals, availability 86 list.

### Zones
`GET /store/restaurant/delivery-zones?branch_id=...` — same fee numbers as Admin.

### Intent
`POST /store/carts/:id/restaurant-meta` with `delivery_zone_id` → sets `delivery_fee` / `min_order_amount` on cart metadata.

### Complete cart
Rejects `RESTAURANT_DELIVERY_FEE_MISMATCH`, `RESTAURANT_MIN_ORDER`, delivery/pickup pause flags, BHD mismatch, policy pause.

---

## 4. What remains P1 / P2 (does not invent payment gateway)

**P1 (should not block starting Storefront design if contracts above are used):**
- Visual DnD for menus; full menu schedule filter by `at` time; menu version restore UI
- Unified single Order page (kitchen+payment+refund timeline)
- Auto-update Medusa shipping option amounts when zone fee changes
- Full meal cart/KDS line item UX; offer conflict matrix UI; banner auto-end with offer
- Staff invite UI; readiness wizard card; reports
- Modifier widget full override form; free-allowance pricing
- Screenshot/video evidence pack for §20 acceptance (manual QA by owner)

**P2:** loyalty, gift cards, table QR, reservations, catering, subscriptions, multi-station printers.

**Owner-supplied (never invented):** Bahrain payment provider credentials, Redis/Cloud, production secrets, real SMS/email (`NOTIFICATION_WEBHOOK_URL`), publishable key — see `docs/USER_REQUIRED_SETUP.md`.

---

## 5. Honest gaps vs “do not say backend-only”

| Spec ask | UI shipped? |
|----------|-------------|
| Availability without IDs | Yes |
| Branch hours/exceptions/zones | Yes |
| Product picker for menus | Yes |
| Meals builder | Yes |
| Offers center + simulator | Yes |
| Content full fields | Yes |
| Translations center | Overview yes; side-by-side editor deep links |
| Every §14.2 offer as unique wizard | No — one compositional builder |
| Drag-drop | No — reorder buttons |
| Device preview frames | No |
| Unified order page | No |
| Map polygon zone drawing | No — named/radius JSON |

---

## 6. Recommended owner smoke (§20 subset)

1. Hub → Availability → 86 product by search → confirm list → restore.  
2. Branch detail → hours → exception → create zone fee 1.500 / min 5 → save.  
3. Menus → attach via picker → reorder → publish.  
4. Meals → steps → items → publish.  
5. Offers → percent + min_order → simulate → activate.  
6. Content ar then en without bleed.  
7. `GET /store/restaurant/bootstrap` shows setup + zones + menu.  
8. Cart with zone: metadata `delivery_fee` matches zone; checkout below min fails.

---

## 7. Definition vs Storefront start (section 22)

Storefront **can start** against `bootstrap` + menu + zones + modifiers + offers + meals contracts **if** designers consume those APIs and do not hardcode restaurant logic. Remaining P1 items improve Admin completeness but are not required to invent parallel storefront business rules.

Payment capture UX and production notifications remain owner-gated.
