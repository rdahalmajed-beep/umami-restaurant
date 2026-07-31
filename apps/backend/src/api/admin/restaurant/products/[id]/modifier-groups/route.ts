import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"
import { z } from "zod"

const LinkSchema = z.object({
  modifier_group_id: z.string().min(1),
  sort_order: z.number().int().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const groups = await restaurant.listProductModifierGroupsDetailed(
    req.params.id
  )
  res.json({ product_id: req.params.id, modifier_groups: groups })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = LinkSchema.parse(req.body)

  await restaurant.retrieveModifierGroup(body.modifier_group_id)

  const link = await restaurant.linkModifierGroupToProduct(
    req.params.id,
    body.modifier_group_id,
    body.sort_order ?? 0
  )

  const groups = await restaurant.listProductModifierGroupsDetailed(
    req.params.id
  )

  res.status(201).json({ link, modifier_groups: groups })
}
