import { model } from "@medusajs/framework/utils"

/** Branch calendar exceptions (holiday, Ramadan, special hours). */
const BranchException = model.define("restaurant_branch_exception", {
  id: model.id().primaryKey(),
  branch_id: model.text().searchable(),
  title: model.text(),
  title_i18n_json: model.json().nullable(),
  /** closed | special_hours | capacity_override */
  kind: model.enum(["closed", "special_hours", "capacity_override"]).default("closed"),
  starts_at: model.dateTime(),
  ends_at: model.dateTime(),
  opening_hours_json: model.json().nullable(),
  priority: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default BranchException
