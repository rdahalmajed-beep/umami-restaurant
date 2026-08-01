import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const CreateSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  applies_delivery: z.boolean().optional(),
  applies_pickup: z.boolean().optional(),
})

/**
 * GET/POST /admin/restaurant/menus
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const menus = await restaurant.listMenus(
    {},
    { order: { sort_order: "ASC" }, take: 100, relations: ["sections"] }
  )
  res.json({ menus })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateSchema.parse(req.body)
  const [menu] = await restaurant.createMenus([
    {
      title: body.title,
      subtitle: body.subtitle ?? null,
      applies_delivery: body.applies_delivery ?? true,
      applies_pickup: body.applies_pickup ?? true,
      status: "draft",
    },
  ])
  res.status(201).json({ menu })
}
