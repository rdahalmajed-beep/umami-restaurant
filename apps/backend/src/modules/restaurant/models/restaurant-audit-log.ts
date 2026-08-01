import { model } from "@medusajs/framework/utils"

/** Append-only audit trail (AUD-001). */
const RestaurantAuditLog = model.define("restaurant_audit_log", {
  id: model.id().primaryKey(),
  actor_id: model.text().nullable(),
  actor_role: model.text().nullable(),
  action: model.text().searchable(),
  resource_type: model.text().searchable(),
  resource_id: model.text().nullable(),
  before_json: model.json().nullable(),
  after_json: model.json().nullable(),
  reason: model.text().nullable(),
  correlation_id: model.text().nullable(),
  ip: model.text().nullable(),
})

export default RestaurantAuditLog
