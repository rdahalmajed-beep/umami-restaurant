import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"
import { verifyGuestOrderAccessToken } from "../../../../../../modules/restaurant/guest-order-access"
import { consumeRateLimit } from "../../../../../../modules/restaurant/rate-limit"

function clientKey(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ||
    req.socket?.remoteAddress ||
    "unknown"
  return ip
}

function extractToken(req: MedusaRequest): string | null {
  const header = req.headers["x-restaurant-order-token"]
  if (typeof header === "string" && header.trim()) {
    return header.trim()
  }
  const q = req.query?.token
  if (typeof q === "string" && q.trim()) {
    return q.trim()
  }
  const cookieHeader = req.headers.cookie || ""
  const match = cookieHeader.match(/(?:^|;\s*)_umami_order_access=([^;]+)/)
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }
  return null
}

async function assertCanReadOrderStatus(
  req: MedusaRequest,
  orderId: string
): Promise<void> {
  const limit = consumeRateLimit({
    key: `guest-status:${clientKey(req)}:${orderId}`,
    limit: 30,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Rate limit exceeded. Retry in ${limit.retryAfterSec}s`
    )
  }

  const token = extractToken(req)
  if (verifyGuestOrderAccessToken(orderId, token)) {
    return
  }

  const auth = (
    req as {
      auth_context?: { actor_id?: string; actor_type?: string }
    }
  ).auth_context

  if (auth?.actor_type === "customer" && auth.actor_id) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: { id: orderId },
    })
    const order = orders?.[0] as { customer_id?: string | null } | undefined
    if (order?.customer_id && order.customer_id === auth.actor_id) {
      return
    }
  }

  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "RESTAURANT_ORDER_ACCESS_DENIED: provide guest access token or customer auth"
  )
}

/**
 * GET /store/restaurant/orders/:id/status
 * Authorized, read-only kitchen status. Never creates restaurant_order rows.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await assertCanReadOrderStatus(req, req.params.id)

  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const orderId = req.params.id
  const row = await restaurant.getRestaurantOrderByOrderId(orderId)

  if (!row) {
    logger.warn(
      `[restaurant] Missing restaurant_order for Medusa order ${orderId} — run backfill if needed`
    )
  }

  let branch: {
    id: string
    name: string
    address: string | null
    preparation_minutes: number
  } | null = null

  if (row?.branch_id) {
    const branches = await restaurant.listBranches({ id: row.branch_id })
    const b = branches[0] as
      | {
          id: string
          name: string
          address?: string | null
          preparation_minutes: number
        }
      | undefined
    branch = b
      ? {
          id: b.id,
          name: b.name,
          address: b.address ?? null,
          preparation_minutes: b.preparation_minutes,
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
    missing_restaurant_order: !row,
  })
}
