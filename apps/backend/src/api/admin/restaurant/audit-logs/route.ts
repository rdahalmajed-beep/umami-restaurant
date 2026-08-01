import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

/**
 * GET /admin/restaurant/audit-logs
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 50
  const offset =
    typeof req.query.offset === "string" ? Number(req.query.offset) : 0
  const resource_type =
    typeof req.query.resource_type === "string"
      ? req.query.resource_type
      : undefined

  const logs = await restaurant.listRestaurantAuditLogs(
    resource_type ? { resource_type } : {},
    {
      order: { created_at: "DESC" },
      take: Math.min(limit, 100),
      skip: offset,
    }
  )

  res.json({ logs, limit, offset })
}
