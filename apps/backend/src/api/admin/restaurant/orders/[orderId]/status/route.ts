import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService, {
  RestaurantOrderStatus,
} from "../../../../../../modules/restaurant/service"
import { transitionRestaurantOrderWorkflow } from "../../../../../../workflows/transition-restaurant-order"

const BodySchema = z.object({
  status: z.enum([
    "received",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
  ]),
  note: z.string().max(500).optional().nullable(),
  expected_version: z.number().int().positive().optional().nullable(),
})

/**
 * GET /admin/restaurant/orders/:orderId/status
 * Read-only. Does not create restaurant_order rows.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  const row = await restaurant.getRestaurantOrderByOrderId(req.params.orderId)

  res.json({ restaurant_order: row })
}

/**
 * POST /admin/restaurant/orders/:orderId/status
 * Transition kitchen status via workflow (version-aware).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = BodySchema.parse(req.body)

  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id || "admin"

  const { result } = await transitionRestaurantOrderWorkflow(req.scope).run({
    input: {
      order_id: req.params.orderId,
      to_status: body.status as RestaurantOrderStatus,
      changed_by: actor,
      note: body.note,
      expected_version: body.expected_version,
    },
  })

  res.json({ restaurant_order: result.restaurant_order })
}
