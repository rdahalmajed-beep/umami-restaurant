import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"
import { createGuestOrderAccessToken } from "../modules/restaurant/guest-order-access"
import { kitchenEvents } from "../modules/restaurant/kitchen-events"

/**
 * When a Medusa order is placed:
 * - ensure kitchen row (idempotent)
 * - stamp guest access token on order metadata for status page
 */
export default async function orderPlacedRestaurantHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = container.resolve(Modules.ORDER)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: data.id },
  })

  const order = orders?.[0] as
    | {
        id: string
        metadata?: {
          restaurant?: {
            order_type?: "delivery" | "pickup"
            branch_id?: string
            guest_access_token?: string
          }
        }
      }
    | undefined

  const restaurantMeta = order?.metadata?.restaurant

  try {
    await restaurant.ensureRestaurantOrder({
      order_id: data.id,
      order_type: restaurantMeta?.order_type ?? null,
      branch_id: restaurantMeta?.branch_id ?? null,
      changed_by: "system",
    })
  } catch (err) {
    // Unique race: another worker created the row — treat as success.
    const existing = await restaurant.getRestaurantOrderByOrderId(data.id)
    if (!existing) {
      logger.error(
        `[restaurant] Failed to ensure restaurant_order for ${data.id}: ${
          err instanceof Error ? err.message : err
        }`
      )
      throw err
    }
  }

  const token =
    restaurantMeta?.guest_access_token ||
    createGuestOrderAccessToken(data.id)

  const prevMeta = (order?.metadata || {}) as Record<string, unknown>
  await orderModule.updateOrders(data.id, {
    metadata: {
      ...prevMeta,
      restaurant: {
        ...(restaurantMeta || {}),
        guest_access_token: token,
      },
    },
  })

  kitchenEvents.emitKitchen({
    type: "order.received",
    order_id: data.id,
    status: "received",
    branch_id: restaurantMeta?.branch_id,
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
