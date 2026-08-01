import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

/**
 * GET /store/restaurant/fulfillment-policies?branch_id=&order_type=
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : undefined
  const order_type =
    req.query.order_type === "delivery" || req.query.order_type === "pickup"
      ? req.query.order_type
      : undefined

  const filters: Record<string, string> = {}
  if (branch_id) filters.branch_id = branch_id
  if (order_type) filters.order_type = order_type

  const policies = await restaurant.listBranchFulfillmentPolicies(filters, {
    take: 50,
  })

  res.json({
    policies: policies.map(
      (p: {
        id: string
        branch_id: string
        order_type: string
        min_order_amount: number
        flat_fee?: number | null
        free_threshold?: number | null
        estimated_minutes: number
        lead_time_minutes: number
        is_paused: boolean
      }) => ({
        id: p.id,
        branch_id: p.branch_id,
        order_type: p.order_type,
        min_order_amount: Number(p.min_order_amount || 0),
        flat_fee: p.flat_fee != null ? Number(p.flat_fee) : null,
        free_threshold:
          p.free_threshold != null ? Number(p.free_threshold) : null,
        estimated_minutes: Number(p.estimated_minutes || 30),
        lead_time_minutes: Number(p.lead_time_minutes || 0),
        is_paused: !!p.is_paused,
      })
    ),
  })
}
