import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { OpeningHoursJsonSchema } from "../../../../modules/restaurant/opening-hours"
import { z } from "zod"

const CreateBranchSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  preparation_minutes: z.number().int().positive().optional(),
  opening_hours_json: OpeningHoursJsonSchema,
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branches = await restaurant.listBranches({}, { order: { name: "ASC" } })
  res.json({ branches })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateBranchSchema.parse(req.body)
  const [branch] = await restaurant.createBranches([body])
  res.status(201).json({ branch })
}
