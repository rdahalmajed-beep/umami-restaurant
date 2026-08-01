import { model } from "@medusajs/framework/utils"
import RestaurantOrderStatusEvent from "./restaurant-order-status-event"

/**
 * Kitchen/restaurant status for a Medusa order (separate from payment/fulfillment).
 */
const RestaurantOrder = model
  .define("restaurant_order", {
    id: model.id().primaryKey(),
    order_id: model.text().unique().searchable(),
    status: model
      .enum([
        "received",
        "accepted",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ])
      .default("received"),
    order_type: model.enum(["delivery", "pickup"]).nullable(),
    branch_id: model.text().nullable(),
    version: model.number().default(1),
    last_transition_at: model.dateTime().nullable(),
    last_transition_by: model.text().nullable(),
    events: model.hasMany(() => RestaurantOrderStatusEvent, {
      mappedBy: "restaurant_order",
    }),
  })
  .cascades({
    delete: ["events"],
  })

export default RestaurantOrder
