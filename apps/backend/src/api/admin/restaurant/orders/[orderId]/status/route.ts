import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService, {
  RestaurantOrderStatus,
} from "../../../../../../modules/restaurant/service"

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
})

/**
 * GET /admin/restaurant/orders/:orderId/status
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  let row = await restaurant.getRestaurantOrderByOrderId(req.params.orderId)
  if (!row) {
    await restaurant.ensureRestaurantOrder({
      order_id: req.params.orderId,
      changed_by: "admin",
    })
    row = await restaurant.getRestaurantOrderByOrderId(req.params.orderId)
  }

  res.json({ restaurant_order: row })
}

/**
 * POST /admin/restaurant/orders/:orderId/status
 * Transition kitchen status with validation + history timestamps.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = BodySchema.parse(req.body)

  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id || "admin"

  const restaurant_order = await restaurant.transitionRestaurantOrderStatus({
    order_id: req.params.orderId,
    to_status: body.status as RestaurantOrderStatus,
    changed_by: actor,
    note: body.note,
  })

  res.json({ restaurant_order })
}
