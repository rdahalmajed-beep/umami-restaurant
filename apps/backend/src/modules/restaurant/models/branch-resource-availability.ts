import { model } from "@medusajs/framework/utils"

/**
 * Per-branch operational availability (86 / restore) for products, variants, modifiers.
 */
const BranchResourceAvailability = model.define(
  "restaurant_branch_resource_availability",
  {
    id: model.id().primaryKey(),
    branch_id: model.text().searchable(),
    resource_type: model.enum(["product", "variant", "modifier_option"]),
    resource_id: model.text().searchable(),
    available: model.boolean().default(true),
    reason_code: model.text().nullable(),
    /** hide | sold_out | visible_disabled */
    display_mode: model
      .enum(["hide", "sold_out", "visible_disabled"])
      .default("sold_out"),
    starts_at: model.dateTime().nullable(),
    ends_at: model.dateTime().nullable(),
    changed_by: model.text().nullable(),
    version: model.number().default(1),
  }
)

export default BranchResourceAvailability
