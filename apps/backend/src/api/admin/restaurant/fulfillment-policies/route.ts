import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const UpsertSchema = z.object({
  branch_id: z.string().min(1),
  order_type: z.enum(["delivery", "pickup"]),
  min_order_amount: z.number().nonnegative().optional(),
  flat_fee: z.number().nonnegative().nullable().optional(),
  free_threshold: z.number().nonnegative().nullable().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  lead_time_minutes: z.number().int().nonnegative().optional(),
  is_paused: z.boolean().optional(),
  zone_notes_json: z.unknown().optional(),
})

/**
 * GET/POST /admin/restaurant/fulfillment-policies
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : undefined
  const policies = await restaurant.listBranchFulfillmentPolicies(
    branch_id ? { branch_id } : {},
    { take: 100 }
  )
  res.json({ policies })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpsertSchema.parse(req.body)
  const policy = await restaurant.upsertFulfillmentPolicy(body)
  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ||
    null
  await restaurant.writeAuditLog({
    actor_id: actor,
    action: "fulfillment_policy.upsert",
    resource_type: "branch_fulfillment_policy",
    resource_id: Array.isArray(policy) ? policy[0]?.id : policy.id,
    after: body,
  })
  res.json({ policy })
}
