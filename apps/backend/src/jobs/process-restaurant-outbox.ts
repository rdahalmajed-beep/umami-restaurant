import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import type RestaurantModuleService from "../modules/restaurant/service"

const MAX_ATTEMPTS = 8

/**
 * Process pending integration outbox rows (NOTIF-001 / INT-001).
 * Dev/stub: marks sent after logging; set NOTIFICATION_WEBHOOK_URL to POST payloads.
 */
export default async function processRestaurantOutbox(
  container: MedusaContainer
) {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const pending = await restaurant.listIntegrationOutboxes(
    { status: "pending" },
    { order: { created_at: "ASC" }, take: 25 }
  )

  const webhook = process.env.NOTIFICATION_WEBHOOK_URL

  for (const row of pending) {
    const attempts = Number(row.attempts || 0) + 1
    try {
      if (webhook) {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: row.id,
            event_type: row.event_type,
            payload: row.payload_json,
            idempotency_key: row.idempotency_key,
          }),
        })
        if (!res.ok) {
          throw new Error(`webhook ${res.status}`)
        }
      } else {
        logger.info(
          `[outbox] delivered stub event=${row.event_type} id=${row.id}`
        )
      }

      await restaurant.updateIntegrationOutboxes({
        id: row.id,
        status: "sent",
        attempts,
        last_error: null,
        next_attempt_at: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const dead = attempts >= MAX_ATTEMPTS
      await restaurant.updateIntegrationOutboxes({
        id: row.id,
        status: dead ? "dead" : "failed",
        attempts,
        last_error: message.slice(0, 500),
        next_attempt_at: dead
          ? null
          : new Date(Date.now() + Math.min(attempts, 5) * 60_000),
      })
      logger.warn(`[outbox] ${dead ? "dead" : "failed"} ${row.id}: ${message}`)
    }
  }

  // Requeue failed that are due
  const failed = await restaurant.listIntegrationOutboxes(
    { status: "failed" },
    { take: 25 }
  )
  const now = Date.now()
  for (const row of failed) {
    const next = row.next_attempt_at
      ? new Date(row.next_attempt_at).getTime()
      : 0
    if (next && next > now) continue
    await restaurant.updateIntegrationOutboxes({
      id: row.id,
      status: "pending",
    })
  }
}

export const config = {
  name: "process-restaurant-outbox",
  schedule: "*/1 * * * *",
}
