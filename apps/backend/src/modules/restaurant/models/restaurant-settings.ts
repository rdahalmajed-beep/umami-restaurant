import { model } from "@medusajs/framework/utils"

/**
 * Singleton restaurant settings (one row; ensure via service).
 */
const RestaurantSettings = model.define("restaurant_settings", {
  id: model.id().primaryKey(),
  timezone: model.text().default("Asia/Bahrain"),
  default_locale: model.text().default("ar"),
  supported_locales_json: model.json().default(["ar", "en"]),
  default_currency: model.text().default("bhd"),
  default_prep_minutes: model.number().default(20),
  max_item_quantity: model.number().default(20),
  max_cart_quantity: model.number().nullable(),
  auto_accept_orders: model.boolean().default(false),
  scheduling_enabled: model.boolean().default(false),
  lead_time_minutes: model.number().default(0),
  schedule_slot_minutes: model.number().default(15),
  schedule_max_days: model.number().default(7),
  customer_notes_enabled: model.boolean().default(true),
  tips_enabled: model.boolean().default(false),
  tip_presets_json: model.json().nullable(),
  guest_checkout_enabled: model.boolean().default(true),
  require_phone: model.boolean().default(true),
  require_email: model.boolean().default(false),
  show_sold_out: model.boolean().default(true),
  show_calories: model.boolean().default(false),
  show_allergens: model.boolean().default(true),
  price_display_mode: model
    .enum(["exact", "from"])
    .default("from"),
  locale_fallback: model.text().default("ar"),
  ordering_enabled: model.boolean().default(true),
  ordering_pause_reason: model.text().nullable(),
  ordering_pause_until: model.dateTime().nullable(),
  bag_fee_amount: model.number().nullable(),
  service_fee_amount: model.number().nullable(),
  cancel_grace_minutes: model.number().nullable(),
  overdue_threshold_minutes: model.number().default(15),
  schema_version: model.number().default(2),
  readiness_json: model.json().nullable(),
})

export default RestaurantSettings
