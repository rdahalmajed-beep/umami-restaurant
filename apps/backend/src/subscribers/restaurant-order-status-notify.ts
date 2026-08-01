import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"

/**
 * Queue customer notification intents on kitchen status changes (NOTIF-001).
 * Delivery is async via outbox processor — never blocks the transition.
 */
export default async function restaurantOrderStatusNotify({
  event: { data },
  container,
}: SubscriberArgs<{
  order_id: string
  status: string
  restaurant_order_id?: string
}>) {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)

  const status = data.status
  const map: Record<string, string> = {
    accepted: "order.accepted",
    preparing: "order.preparing",
    ready: "order.ready",
    out_for_delivery: "order.out_for_delivery",
    completed: "order.completed",
    cancelled: "order.cancelled",
  }
  const eventType = map[status]
  if (!eventType) return

  await restaurant.enqueueOutbox({
    event_type: eventType,
    idempotency_key: `${eventType}:${data.order_id}:${data.restaurant_order_id || ""}`,
    payload: {
      order_id: data.order_id,
      status,
      channels: ["email"],
      locales: ["ar", "en"],
    },
  })
}

export const config: SubscriberConfig = {
  event: "restaurant.order_status.updated",
}
