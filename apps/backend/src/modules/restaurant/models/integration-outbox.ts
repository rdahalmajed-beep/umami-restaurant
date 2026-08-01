import { model } from "@medusajs/framework/utils"

/**
 * Durable outbox for notifications / POS / printer (INT-001).
 */
const IntegrationOutbox = model.define("restaurant_integration_outbox", {
  id: model.id().primaryKey(),
  event_type: model.text().searchable(),
  payload_json: model.json(),
  status: model
    .enum(["pending", "sent", "failed", "dead"])
    .default("pending"),
  attempts: model.number().default(0),
  last_error: model.text().nullable(),
  idempotency_key: model.text().unique(),
  next_attempt_at: model.dateTime().nullable(),
})

export default IntegrationOutbox
