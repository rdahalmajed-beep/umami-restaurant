import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const UpsertSchema = z.object({
  branch_id: z.string().min(1),
  name: z.string().min(1),
  name_i18n_json: z.record(z.string(), z.string()).optional().nullable(),
  geometry_type: z
    .enum(["radius_km", "postal", "polygon", "named"])
    .optional(),
  geometry_json: z.unknown().optional().nullable(),
  min_order_amount: z.number().nonnegative().optional(),
  fee_amount: z.number().nonnegative().optional(),
  free_threshold: z.number().nonnegative().nullable().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  schedule_json: z.unknown().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  medusa_shipping_option_id: z.string().nullable().optional(),
  id: z.string().optional(),
})

/**
 * GET/POST /admin/restaurant/delivery-zones
 * fee_amount is the authoritative delivery fee for checkout (FUL-UX-001).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : undefined
  const zones = await restaurant.listDeliveryZones(
    branch_id ? { branch_id } : {},
    { order: { sort_order: "ASC" }, take: 100 }
  )
  res.json({ zones })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpsertSchema.parse(req.body)
  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ||
    null

  let zone
  if (body.id) {
    const { id, ...rest } = body
    zone = await restaurant.updateDeliveryZones({ id, ...rest })
  } else {
    const [created] = await restaurant.createDeliveryZones([body])
    zone = created
  }

  await restaurant.writeAuditLog({
    actor_id: actor,
    action: body.id ? "delivery_zone.update" : "delivery_zone.create",
    resource_type: "delivery_zone",
    resource_id: Array.isArray(zone) ? zone[0]?.id : zone.id,
    after: body,
  })

  res.json({ zone })
}
