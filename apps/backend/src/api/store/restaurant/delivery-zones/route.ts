import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

/**
 * GET /store/restaurant/delivery-zones?branch_id=
 * Authoritative fees for checkout (same numbers as admin).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : null
  if (!branch_id) {
    res.status(400).json({
      code: "MISSING_BRANCH",
      message: "branch_id required",
    })
    return
  }

  const locale =
    typeof req.query.locale === "string" ? req.query.locale : "ar"

  const zones = await restaurant.listDeliveryZones(
    { branch_id, is_active: true },
    { order: { sort_order: "ASC" }, take: 50 }
  )

  res.json({
    zones: zones.map(
      (z: {
        id: string
        name: string
        name_i18n_json?: Record<string, string> | null
        min_order_amount: number
        fee_amount: number
        free_threshold?: number | null
        estimated_minutes: number
        geometry_type: string
        geometry_json?: unknown
      }) => ({
        id: z.id,
        name: z.name_i18n_json?.[locale] || z.name,
        min_order_amount: Number(z.min_order_amount || 0),
        fee_amount: Number(z.fee_amount || 0),
        free_threshold:
          z.free_threshold != null ? Number(z.free_threshold) : null,
        estimated_minutes: Number(z.estimated_minutes || 30),
        geometry_type: z.geometry_type,
        geometry: z.geometry_json || null,
      })
    ),
  })
}
