import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import RestaurantModule from "../modules/restaurant"

export default defineLink(
  {
    linkable: RestaurantModule.linkable.restaurantOrder,
    deleteCascade: true,
  },
  OrderModule.linkable.order
)
