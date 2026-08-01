import { model } from "@medusajs/framework/utils"

/** Per-locale translation review status for restaurant entities (CMS/i18n). */
const TranslationStatus = model.define("restaurant_translation_status", {
  id: model.id().primaryKey(),
  resource_type: model.text().searchable(),
  resource_id: model.text().searchable(),
  locale: model.text(),
  /** missing | draft | ready | needs_review */
  status: model
    .enum(["missing", "draft", "ready", "needs_review"])
    .default("missing"),
  updated_by: model.text().nullable(),
})

export default TranslationStatus
