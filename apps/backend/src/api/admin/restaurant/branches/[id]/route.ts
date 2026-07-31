import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"
import { z } from "zod"

const UpdateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  preparation_minutes: z.number().int().positive().optional(),
  opening_hours_json: z.unknown().optional().nullable(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch = await restaurant.retrieveBranch(req.params.id)
  res.json({ branch })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpdateBranchSchema.parse(req.body)
  const branch = await restaurant.updateBranches({
    id: req.params.id,
    ...body,
  })
  res.json({ branch })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  await restaurant.deleteBranches(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
