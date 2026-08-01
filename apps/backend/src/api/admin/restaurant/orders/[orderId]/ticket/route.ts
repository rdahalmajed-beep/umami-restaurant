import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"

/**
 * GET /admin/restaurant/orders/:orderId/ticket
 * Full ticket payload for expanded KDS card / detail.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = req.params.orderId

  const row = await restaurant.getRestaurantOrderByOrderId(orderId)
  if (!row) {
    res.status(404).json({ message: "Restaurant order not found" })
    return
  }

  const { data: medusaOrders } = await query.graph({
    entity: "order",
    fields: [
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
    ],
    filters: { id: orderId },
  })

  const order = medusaOrders?.[0] as
    | {
        display_id?: number
        email?: string
        currency_code?: string
        total?: number
        created_at?: string
        metadata?: {
          restaurant?: {
            customer_note?: string
            estimated_preparation_minutes?: number
            branch_name?: string
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

  let branch_name = order?.metadata?.restaurant?.branch_name || null
  if (!branch_name && row.branch_id) {
    const branches = await restaurant.listBranches({ id: row.branch_id })
    branch_name = (branches[0] as { name?: string } | undefined)?.name || null
  }

  res.json({
    restaurant_order: row,
    ticket: {
      order_id: orderId,
      display_id: order?.display_id ?? null,
      status: row.status,
      version: Number(row.version ?? 1),
      order_type: row.order_type,
      branch_id: row.branch_id,
      branch_name,
      currency_code: order?.currency_code || "bhd",
      total: order?.total ?? null,
      created_at: order?.created_at || row.created_at,
      customer_note: order?.metadata?.restaurant?.customer_note || null,
      customer_name: [
        order?.shipping_address?.first_name,
        order?.shipping_address?.last_name,
      ]
        .filter(Boolean)
        .join(" ") || null,
      customer_phone: order?.shipping_address?.phone || null,
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
    },
  })
}
