import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"

/**
 * GET /admin/restaurant/orders/history
 * Completed/cancelled kitchen orders (separate from live board).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 30
  const offset =
    typeof req.query.offset === "string" ? Number(req.query.offset) : 0
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""

  const rows = await restaurant.listKitchenHistory({ limit, offset, q })
  if (!rows.length) {
    res.json({ orders: [], offset, limit })
    return
  }

  const orderIds = rows.map((r: { order_id: string }) => r.order_id)
  const { data: medusaOrders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "total", "currency_code", "created_at"],
    filters: { id: orderIds },
  })
  const orderById = new Map(
    (medusaOrders || []).map((o: { id: string }) => [o.id, o])
  )

  let orders = rows.map(
    (row: {
      id: string
      order_id: string
      status: string
      order_type?: string | null
      branch_id?: string | null
      last_transition_at?: string | Date | null
      version?: number
    }) => {
      const order = orderById.get(row.order_id) as
        | {
            display_id?: number
            total?: number
            currency_code?: string
            created_at?: string
          }
        | undefined
      return {
        id: row.id,
        order_id: row.order_id,
        status: row.status,
        version: Number(row.version ?? 1),
        order_type: row.order_type,
        branch_id: row.branch_id,
        last_transition_at: row.last_transition_at || null,
        display_id: order?.display_id ?? null,
        total: order?.total ?? null,
        currency_code: order?.currency_code || "bhd",
        created_at: order?.created_at || null,
      }
    }
  )

  if (q) {
    const needle = q.toLowerCase()
    orders = orders.filter(
      (o) =>
        String(o.display_id ?? "").includes(needle) ||
        o.order_id.toLowerCase().includes(needle) ||
        o.status.includes(needle)
    )
  }

  res.json({ orders, offset, limit })
}
