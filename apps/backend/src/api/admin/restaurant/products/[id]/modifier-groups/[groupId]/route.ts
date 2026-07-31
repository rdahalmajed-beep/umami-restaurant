import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../../modules/restaurant/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  await restaurant.unlinkModifierGroupFromProduct(
    req.params.id,
    req.params.groupId
  )

  res.status(200).json({
    product_id: req.params.id,
    modifier_group_id: req.params.groupId,
    deleted: true,
  })
}
