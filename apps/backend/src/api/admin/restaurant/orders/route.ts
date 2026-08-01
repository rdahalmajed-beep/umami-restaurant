import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService, {
  ACTIVE_KITCHEN_STATUSES,
  RestaurantOrderStatus,
} from "../../../../modules/restaurant/service"

/**
 * GET /admin/restaurant/orders
 * Slim KDS list by default (?view=summary). Use ?view=full for legacy payload.
 *
 * Query:
 *  status, limit, cursor, updated_since, view=summary|full
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const statusParam =
    typeof req.query.status === "string" ? req.query.status : null
  const statuses: RestaurantOrderStatus[] | undefined =
    statusParam &&
    ACTIVE_KITCHEN_STATUSES.includes(statusParam as RestaurantOrderStatus)
      ? [statusParam as RestaurantOrderStatus]
      : undefined

  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 30
  const cursor =
    typeof req.query.cursor === "string" ? req.query.cursor : null
  const updatedSince =
    typeof req.query.updated_since === "string"
      ? req.query.updated_since
      : null
  const view =
    typeof req.query.view === "string" ? req.query.view : "summary"

  const { orders: kitchenRows, next_cursor, has_more } =
    await restaurant.listActiveKitchenOrders({
      statuses,
      limit,
      cursor,
      updated_since: updatedSince,
    })

  if (!kitchenRows.length) {
    res.json({ orders: [], next_cursor: null, has_more: false })
    return
  }

  const orderIds = kitchenRows.map((r: { order_id: string }) => r.order_id)

  const fields =
    view === "full"
      ? [
          "id",
          "display_id",
          "email",
          "currency_code",
          "total",
          "created_at",
          "metadata",
          "items.id",
          "items.title",
          "items.quantity",
          "items.thumbnail",
          "items.metadata",
          "shipping_address.first_name",
          "shipping_address.last_name",
          "shipping_address.phone",
          "shipping_address.address_1",
        ]
      : [
          "id",
          "display_id",
          "currency_code",
          "total",
          "created_at",
          "metadata",
          "items.id",
          "items.title",
          "items.quantity",
          "shipping_address.first_name",
          "shipping_address.phone",
        ]

  const { data: medusaOrders } = await query.graph({
    entity: "order",
    fields,
    filters: { id: orderIds },
  })

  const orderById = new Map(
    (medusaOrders || []).map((o: { id: string }) => [o.id, o])
  )

  const branchIds = [
    ...new Set(
      kitchenRows
        .map((r: { branch_id?: string | null }) => r.branch_id)
        .filter(Boolean) as string[]
    ),
  ]
  const branchNameById = new Map<string, string>()
  const branchPrepById = new Map<string, number>()
  if (branchIds.length) {
    const branches = await restaurant.listBranches({ id: branchIds })
    for (const b of branches as {
      id: string
      name: string
      preparation_minutes?: number
    }[]) {
      branchNameById.set(b.id, b.name)
      branchPrepById.set(b.id, b.preparation_minutes ?? 20)
    }
  }

  const now = Date.now()

  const orders = kitchenRows.map(
    (row: {
      id: string
      order_id: string
      status: string
      version?: number
      order_type?: string | null
      branch_id?: string | null
      last_transition_at?: string | Date | null
      created_at?: string | Date
    }) => {
      const order = orderById.get(row.order_id) as
        | {
            id: string
            display_id?: number
            currency_code?: string
            total?: number
            created_at?: string
            metadata?: {
              restaurant?: {
                order_type?: string
                branch_id?: string
                branch_name?: string
                customer_note?: string
                estimated_preparation_minutes?: number
              }
            }
            items?: {
              id: string
              title?: string
              quantity?: number
              thumbnail?: string | null
              metadata?: {
                restaurant_modifiers?: {
                  group_name?: string
                  option_name?: string
                  price_adjustment?: number
                }[]
                restaurant_note?: string
              }
            }[]
            shipping_address?: {
              first_name?: string
              last_name?: string
              phone?: string
              address_1?: string
            }
          }
        | undefined

      const restaurantMeta = order?.metadata?.restaurant
      const orderType = row.order_type || restaurantMeta?.order_type || null
      const branchId = row.branch_id || restaurantMeta?.branch_id || null
      const branchName =
        restaurantMeta?.branch_name ||
        (branchId ? branchNameById.get(branchId) : undefined) ||
        null

      const prepMinutes =
        restaurantMeta?.estimated_preparation_minutes ??
        (branchId ? branchPrepById.get(branchId) : undefined) ??
        20

      const createdAt = order?.created_at || row.created_at
      const createdMs = createdAt ? new Date(createdAt).getTime() : now
      const promisedAt = new Date(createdMs + prepMinutes * 60_000).toISOString()
      const overdue = now > new Date(promisedAt).getTime() &&
        !["completed", "cancelled"].includes(row.status)

      const itemCount = (order?.items || []).reduce(
        (sum, i) => sum + (i.quantity || 1),
        0
      )
      const ticket_summary = (order?.items || [])
        .slice(0, 3)
        .map((i) => `${i.quantity || 1}× ${i.title || ""}`)
        .join(", ")

      const base = {
        id: row.id,
        order_id: row.order_id,
        status: row.status,
        version: Number(row.version ?? 1),
        order_type: orderType,
        branch_id: branchId,
        branch_name: branchName,
        last_transition_at: row.last_transition_at || null,
        created_at: createdAt || null,
        promised_at: promisedAt,
        overdue,
        display_id: order?.display_id ?? null,
        currency_code: order?.currency_code || "bhd",
        total: order?.total ?? null,
        item_count: itemCount,
        ticket_summary,
        customer_first_name: order?.shipping_address?.first_name || null,
        customer_phone: order?.shipping_address?.phone || null,
        customer_note: restaurantMeta?.customer_note || null,
        estimated_preparation_minutes: prepMinutes,
      }

      if (view !== "full") {
        return base
      }

      return {
        ...base,
        email: (order as { email?: string })?.email || null,
        customer_name: [
          order?.shipping_address?.first_name,
          order?.shipping_address?.last_name,
        ]
          .filter(Boolean)
          .join(" ") || null,
        address: order?.shipping_address?.address_1 || null,
        items: (order?.items || []).map((item) => {
          const mods = item.metadata?.restaurant_modifiers || []
          return {
            id: item.id,
            title: item.title || "",
            quantity: item.quantity || 1,
            thumbnail: item.thumbnail || null,
            note: item.metadata?.restaurant_note || null,
            modifiers: mods.map((m) => ({
              group_name: m.group_name || "",
              option_name: m.option_name || "",
              price_adjustment: Number(m.price_adjustment || 0),
            })),
          }
        }),
      }
    }
  )

  res.json({ orders, next_cursor, has_more })
}
