import { defineLink } from "@medusajs/framework/utils"
import FulfillmentModule from "@medusajs/medusa/fulfillment"
import RestaurantModule from "../modules/restaurant"

export default defineLink(
  RestaurantModule.linkable.restaurantBranch,
  FulfillmentModule.linkable.fulfillmentSet
)
