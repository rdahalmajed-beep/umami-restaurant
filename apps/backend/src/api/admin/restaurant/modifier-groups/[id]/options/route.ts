import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"
import { z } from "zod"

const CreateOptionSchema = z.object({
  name: z.string().min(1),
  price_adjustment: z.number().default(0),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateOptionSchema.parse(req.body)

  // Ensure group exists
  await restaurant.retrieveModifierGroup(req.params.id)

  const [option] = await restaurant.createModifierOptions([
    {
      ...body,
      group_id: req.params.id,
    },
  ])

  res.status(201).json({ modifier_option: option })
}
