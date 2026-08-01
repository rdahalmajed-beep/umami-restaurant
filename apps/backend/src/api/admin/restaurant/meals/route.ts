import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const CreateSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  meal_type: z
    .enum(["fixed", "choose", "mix_match", "family", "upgrade", "seasonal"])
    .optional(),
  pricing_mode: z
    .enum(["fixed", "from", "components_discount", "dynamic"])
    .optional(),
  base_price: z.number().nonnegative().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const meals = await restaurant.listMeals(
    {},
    {
      order: { sort_order: "ASC" },
      take: 100,
      relations: ["steps", "steps.items"],
    }
  )
  res.json({ meals })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateSchema.parse(req.body)
  const [meal] = await restaurant.createMeals([body])
  await restaurant.writeAuditLog({
    action: "meal.create",
    resource_type: "meal",
    resource_id: meal.id,
    after: body,
  })
  res.status(201).json({ meal })
}
