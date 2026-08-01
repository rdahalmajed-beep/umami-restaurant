import { model } from "@medusajs/framework/utils"

/**
 * Per-branch delivery/pickup commercial policy (FUL-001).
 * Actual shipping amounts still come from Medusa shipping options.
 */
const BranchFulfillmentPolicy = model.define(
  "restaurant_branch_fulfillment_policy",
  {
    id: model.id().primaryKey(),
    branch_id: model.text().searchable(),
    order_type: model.enum(["delivery", "pickup"]),
    min_order_amount: model.number().default(0),
    flat_fee: model.number().nullable(),
    free_threshold: model.number().nullable(),
    estimated_minutes: model.number().default(30),
    lead_time_minutes: model.number().default(0),
    is_paused: model.boolean().default(false),
    zone_notes_json: model.json().nullable(),
  }
)

export default BranchFulfillmentPolicy
