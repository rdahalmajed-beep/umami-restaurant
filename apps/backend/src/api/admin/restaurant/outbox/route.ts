import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

/**
 * GET/POST /admin/restaurant/outbox
 * POST { action: "retry", id } to requeue a failed message.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const rows = await restaurant.listIntegrationOutboxes(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: 100 }
  )
  res.json({ messages: rows })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = (req.body || {}) as { action?: string; id?: string }
  if (body.action !== "retry" || !body.id) {
    res.status(400).json({ message: "action=retry and id required" })
    return
  }
  const updated = await restaurant.updateIntegrationOutboxes({
    id: body.id,
    status: "pending",
    next_attempt_at: new Date(),
    last_error: null,
  })
  res.json({ message: updated })
}
