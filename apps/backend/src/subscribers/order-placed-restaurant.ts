import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"

/**
 * When a Medusa order is placed, create kitchen status = received + history event.
 */
export default async function orderPlacedRestaurantHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

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
          }
        }
      }
    | undefined

  const restaurantMeta = order?.metadata?.restaurant

  await restaurant.ensureRestaurantOrder({
    order_id: data.id,
    order_type: restaurantMeta?.order_type ?? null,
    branch_id: restaurantMeta?.branch_id ?? null,
    changed_by: "system",
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
