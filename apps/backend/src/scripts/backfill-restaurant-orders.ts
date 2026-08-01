/**
 * Idempotent backfill: create restaurant_order rows for Medusa orders that lack them.
 *
 * Usage:
 *   pnpm medusa exec ./src/scripts/backfill-restaurant-orders.ts
 *
 * Dry-run by default prints counts; pass CREATE=1 to write.
 */
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"

export default async function backfillRestaurantOrders(
  container: MedusaContainer
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)

  const write = process.env.CREATE === "1"

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
  })

  const existing = await restaurant.listRestaurantOrders({}, { take: 10000 })
  const existingIds = new Set(
    existing.map((r: { order_id: string }) => r.order_id)
  )

  const missing = (orders || []).filter(
    (o: { id: string }) => !existingIds.has(o.id)
  )

  logger.info(
    `[backfill] Medusa orders=${orders?.length ?? 0} restaurant_rows=${existing.length} missing=${missing.length} write=${write}`
  )

  if (!write) {
    logger.info("[backfill] Dry-run only. Re-run with CREATE=1 to insert rows.")
    return
  }

  let created = 0
  for (const order of missing as {
    id: string
    metadata?: {
      restaurant?: {
        order_type?: "delivery" | "pickup"
        branch_id?: string
      }
    }
  }[]) {
    const meta = order.metadata?.restaurant
    try {
      await restaurant.ensureRestaurantOrder({
        order_id: order.id,
        order_type: meta?.order_type ?? null,
        branch_id: meta?.branch_id ?? null,
        changed_by: "backfill",
      })
      created++
    } catch (err) {
      logger.warn(
        `[backfill] skip ${order.id}: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  logger.info(`[backfill] created=${created}`)
}
