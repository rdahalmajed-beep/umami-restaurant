import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"
import { z } from "zod"

const UpdateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  selection_type: z.enum(["single", "multiple"]).optional(),
  is_required: z.boolean().optional(),
  min_selections: z.number().int().min(0).optional(),
  max_selections: z.number().int().min(1).optional(),
  sort_order: z.number().int().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const group = await restaurant.retrieveModifierGroup(req.params.id, {
    relations: ["options"],
  })
  res.json({ modifier_group: group })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const raw = (req.body || {}) as Record<string, unknown>

  if (raw.action === "duplicate") {
    const group = await restaurant.duplicateModifierGroup(req.params.id)
    res.status(201).json({ modifier_group: group })
    return
  }

  const body = UpdateGroupSchema.parse(raw)
  await restaurant.updateModifierGroups({
    id: req.params.id,
    ...body,
  })
  const group = await restaurant.retrieveModifierGroup(req.params.id, {
    relations: ["options"],
  })
  res.json({ modifier_group: group })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  await restaurant.deleteModifierGroups(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
