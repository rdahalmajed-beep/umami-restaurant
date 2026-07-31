import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { z } from "zod"

const CreateGroupSchema = z.object({
  name: z.string().min(1),
  selection_type: z.enum(["single", "multiple"]).default("single"),
  is_required: z.boolean().default(false),
  min_selections: z.number().int().min(0).default(0),
  max_selections: z.number().int().min(1).default(1),
  sort_order: z.number().int().default(0),
  options: z
    .array(
      z.object({
        name: z.string().min(1),
        price_adjustment: z.number().default(0),
        is_default: z.boolean().default(false),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
    )
    .optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const groups = await restaurant.listModifierGroups(
    {},
    {
      relations: ["options"],
      order: { sort_order: "ASC" },
    }
  )
  res.json({ modifier_groups: groups })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateGroupSchema.parse(req.body)
  const { options, ...groupData } = body

  const [group] = await restaurant.createModifierGroups([groupData])

  if (options?.length) {
    await restaurant.createModifierOptions(
      options.map((o) => ({
        ...o,
        group_id: group.id,
      }))
    )
  }

  const full = await restaurant.retrieveModifierGroup(group.id, {
    relations: ["options"],
  })

  res.status(201).json({ modifier_group: full })
}
