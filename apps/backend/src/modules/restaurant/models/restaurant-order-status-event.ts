import { model } from "@medusajs/framework/utils"
import RestaurantOrder from "./restaurant-order"

/**
 * Immutable kitchen status transition log (timestamps + actor).
 */
const RestaurantOrderStatusEvent = model.define(
  "restaurant_order_status_event",
  {
    id: model.id().primaryKey(),
    from_status: model.text().nullable(),
    to_status: model.text(),
    changed_by: model.text().nullable(),
    note: model.text().nullable(),
    restaurant_order: model.belongsTo(() => RestaurantOrder, {
      mappedBy: "events",
    }),
  }
)

export default RestaurantOrderStatusEvent
