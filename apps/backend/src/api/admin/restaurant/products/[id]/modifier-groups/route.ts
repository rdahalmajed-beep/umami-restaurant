import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"
import { z } from "zod"

const LinkSchema = z.object({
  modifier_group_id: z.string().min(1),
  sort_order: z.number().int().optional(),
  is_required_override: z.boolean().nullable().optional(),
  min_selections_override: z.number().int().nullable().optional(),
  max_selections_override: z.number().int().nullable().optional(),
  variant_ids: z.array(z.string()).nullable().optional(),
  branch_ids: z.array(z.string()).nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const groups = await restaurant.listProductModifierGroupsDetailed(
    req.params.id
  )
  const links = await restaurant.listProductModifierGroups(
    { product_id: req.params.id },
    { order: { sort_order: "ASC" } }
  )
  res.json({ product_id: req.params.id, modifier_groups: groups, links })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = LinkSchema.parse(req.body)

  await restaurant.retrieveModifierGroup(body.modifier_group_id)

  let link = await restaurant.linkModifierGroupToProduct(
    req.params.id,
    body.modifier_group_id,
    body.sort_order ?? 0
  )

  const patch: Record<string, unknown> = {}
  if (body.is_required_override !== undefined) {
    patch.is_required_override = body.is_required_override
  }
  if (body.min_selections_override !== undefined) {
    patch.min_selections_override = body.min_selections_override
  }
  if (body.max_selections_override !== undefined) {
    patch.max_selections_override = body.max_selections_override
  }
  if (body.variant_ids !== undefined) {
    patch.variant_ids_json = body.variant_ids
  }
  if (body.branch_ids !== undefined) {
    patch.branch_ids_json = body.branch_ids
  }
  if (Object.keys(patch).length) {
    link = await restaurant.updateProductModifierGroups({
      id: (link as { id: string }).id,
      ...patch,
    })
  }

  const groups = await restaurant.listProductModifierGroupsDetailed(
    req.params.id
  )

  res.status(201).json({ link, modifier_groups: groups })
}
