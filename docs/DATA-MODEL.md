# Data model (summary)

## Medusa (commerce)

- Product, ProductVariant, Price, ProductCategory
- Cart, LineItem (restaurant modifiers snapshotted in line-item metadata)
- Order, Payment, Fulfillment, Region (BHD / `bh`), SalesChannel, StockLocation

## Restaurant module (`apps/backend/src/modules/restaurant`)

- `restaurant_settings` — singleton ops settings
- `restaurant_branch`, fulfillment policies, delivery zones
- `restaurant_modifier_group`, `restaurant_modifier_option`, product links
- `restaurant_menu`, `restaurant_menu_section`, `restaurant_menu_product`
- `restaurant_order` — kitchen lifecycle + version for optimistic concurrency
- `restaurant_outbox`, audit logs, content, meals/offers (admin)

## Storefront contract

- Prefer `GET /store/restaurant/bootstrap` and `GET /store/restaurant/menu`
- Cart restaurant metadata: `metadata.restaurant.{branch_id,order_type,...}`
- Modifiers: `POST /store/carts/:id/line-items-with-modifiers`

Full field-level detail lives in module models under `apps/backend/src/modules/restaurant/models/`.
