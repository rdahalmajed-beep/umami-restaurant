import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"
import { z } from "zod"

const UpdateOptionSchema = z.object({
  name: z.string().min(1).optional(),
  price_adjustment: z.number().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpdateOptionSchema.parse(req.body)
  const option = await restaurant.updateModifierOptions({
    id: req.params.id,
    ...body,
  })
  res.json({ modifier_option: option })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  await restaurant.deleteModifierOptions(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
