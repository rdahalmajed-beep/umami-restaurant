import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"

/**
 * GET /store/restaurant/products/:id/modifiers
 * Returns modifier groups + active options for a product.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  const groups = await restaurant.listProductModifierGroupsDetailed(
    req.params.id
  )

  res.json({
    product_id: req.params.id,
    modifier_groups: groups,
  })
}
