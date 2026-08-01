import { model } from "@medusajs/framework/utils"

/**
 * Versioned brand/homepage content blocks (CMS-001).
 * content_json is schema-validated at the API layer.
 * Unique per (key, locale) — not key alone.
 */
const RestaurantContent = model
  .define("restaurant_content", {
    id: model.id().primaryKey(),
    key: model.text().searchable(),
    locale: model.text().default("ar"),
    content_json: model.json(),
    schema_version: model.number().default(1),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["key", "locale"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default RestaurantContent
