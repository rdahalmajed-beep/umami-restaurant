import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  const branches = await restaurant.listBranches(
    { is_active: true },
    { order: { name: "ASC" } }
  )

  res.json({ branches })
}
