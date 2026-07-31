import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"

/**
 * GET /store/restaurant/orders/:id/status
 * Public kitchen status snapshot for the order success page.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)

  const orderId = req.params.id
  let row = await restaurant.getRestaurantOrderByOrderId(orderId)

  if (!row) {
    await restaurant.ensureRestaurantOrder({
      order_id: orderId,
      changed_by: "storefront",
    })
    row = await restaurant.getRestaurantOrderByOrderId(orderId)
  }

  let branch = null
  if (row?.branch_id) {
    const branches = await restaurant.listBranches({ id: row.branch_id })
    branch = branches[0]
      ? {
          id: branches[0].id,
          name: branches[0].name,
          address: branches[0].address,
          preparation_minutes: branches[0].preparation_minutes,
        }
      : null
  }

  res.json({
    restaurant_order: row
      ? {
          order_id: row.order_id,
          status: row.status,
          order_type: row.order_type,
          branch_id: row.branch_id,
          last_transition_at: row.last_transition_at,
        }
      : null,
    branch,
  })
}
