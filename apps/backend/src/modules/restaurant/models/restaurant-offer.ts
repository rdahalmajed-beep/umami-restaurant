import { model } from "@medusajs/framework/utils"

/**
 * Unified restaurant offers center (OFFER-001).
 * rules_json holds conditions + reward (compositional builder).
 */
const RestaurantOffer = model.define("restaurant_offer", {
  id: model.id().primaryKey(),
  internal_name: model.text().searchable(),
  title: model.text().searchable(),
  title_i18n_json: model.json().nullable(),
  description: model.text().nullable(),
  description_i18n_json: model.json().nullable(),
  terms: model.text().nullable(),
  terms_i18n_json: model.json().nullable(),
  badge: model.text().nullable(),
  badge_i18n_json: model.json().nullable(),
  image_url: model.text().nullable(),
  banner_url: model.text().nullable(),
  cta_label: model.text().nullable(),
  cta_href: model.text().nullable(),
  status: model
    .enum([
      "draft",
      "ready",
      "scheduled",
      "active",
      "paused",
      "ended",
      "archived",
    ])
    .default("draft"),
  /** See ADMIN_UX report §14.2 offer types */
  offer_type: model.text().default("percent_order"),
  code: model.text().nullable(),
  auto_apply: model.boolean().default(false),
  exclusive: model.boolean().default(false),
  priority: model.number().default(100),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  schedule_json: model.json().nullable(),
  rules_json: model.json().default({}),
  branch_ids_json: model.json().nullable(),
  order_types_json: model.json().nullable(),
  medusa_promotion_id: model.text().nullable(),
  version: model.number().default(1),
})

export default RestaurantOffer
