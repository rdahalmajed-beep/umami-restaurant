import { defineLink } from "@medusajs/framework/utils"
import StockLocationModule from "@medusajs/medusa/stock-location"
import RestaurantModule from "../modules/restaurant"

export default defineLink(
  RestaurantModule.linkable.restaurantBranch,
  StockLocationModule.linkable.stockLocation
)
