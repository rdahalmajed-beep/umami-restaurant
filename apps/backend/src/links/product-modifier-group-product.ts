import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import RestaurantModule from "../modules/restaurant"

/**
 * Read-only: restaurant_product_modifier_group.product_id → product
 * (join table already owns the FK text; no duplicate stored link.)
 */
export default defineLink(
  {
    linkable: RestaurantModule.linkable.restaurantProductModifierGroup,
    field: "product_id",
  },
  ProductModule.linkable.product,
  { readOnly: true }
)
