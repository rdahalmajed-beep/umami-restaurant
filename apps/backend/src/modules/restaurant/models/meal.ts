import { model } from "@medusajs/framework/utils"
import MealStep from "./meal-step"

/**
 * Restaurant meal / combo (MEAL-001) — composite product definition.
 * Native Medusa product_id optional for catalog linkage.
 */
const Meal = model
  .define("restaurant_meal", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    subtitle: model.text().nullable(),
    title_i18n_json: model.json().nullable(),
    subtitle_i18n_json: model.json().nullable(),
    status: model.enum(["draft", "published", "archived"]).default("draft"),
    /** fixed | choose | mix_match | family | upgrade | seasonal */
    meal_type: model
      .enum(["fixed", "choose", "mix_match", "family", "upgrade", "seasonal"])
      .default("choose"),
    /** fixed | from | components_discount | dynamic */
    pricing_mode: model
      .enum(["fixed", "from", "components_discount", "dynamic"])
      .default("fixed"),
    base_price: model.number().default(0),
    discount_amount: model.number().nullable(),
    product_id: model.text().nullable(),
    thumbnail: model.text().nullable(),
    badge: model.text().nullable(),
    badge_i18n_json: model.json().nullable(),
    branch_ids_json: model.json().nullable(),
    applies_delivery: model.boolean().default(true),
    applies_pickup: model.boolean().default(true),
    schedule_json: model.json().nullable(),
    /** hide_choice | show_substitute | pause_meal */
    unavailable_policy: model
      .enum(["hide_choice", "show_substitute", "pause_meal"])
      .default("hide_choice"),
    max_per_order: model.number().nullable(),
    sort_order: model.number().default(0),
    version: model.number().default(1),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same module
    steps: model.hasMany(() => MealStep, { mappedBy: "meal" }),
  })
  .cascades({ delete: ["steps"] })

export default Meal
