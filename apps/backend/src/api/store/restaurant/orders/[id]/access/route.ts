import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"
import { createGuestOrderAccessToken } from "../../../../../../modules/restaurant/guest-order-access"
import { consumeRateLimit } from "../../../../../../modules/restaurant/rate-limit"

const BodySchema = z.object({
  email: z.string().email(),
})

function clientKey(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ||
    req.socket?.remoteAddress ||
    "unknown"
  return ip
}

/**
 * POST /store/restaurant/orders/:id/access
 * Claim a guest access token when email matches the order (rate limited).
 * Sets HTTP-only cookie `_umami_order_access` and returns the token once.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = BodySchema.parse(req.body)
  const orderId = req.params.id

  const limit = consumeRateLimit({
    key: `guest-claim:${clientKey(req)}`,
    limit: 10,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Rate limit exceeded. Retry in ${limit.retryAfterSec}s`
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = req.scope.resolve(Modules.ORDER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "email", "metadata"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as
    | {
        id: string
        email?: string | null
        metadata?: Record<string, unknown> | null
      }
    | undefined

  if (!order?.email) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_ORDER_ACCESS_DENIED"
    )
  }

  if (order.email.trim().toLowerCase() !== body.email.trim().toLowerCase()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_ORDER_ACCESS_DENIED"
    )
  }

  const token = createGuestOrderAccessToken(orderId)
  const prevMeta = (order.metadata || {}) as Record<string, unknown>
  const restaurantMeta = {
    ...((prevMeta.restaurant as Record<string, unknown>) || {}),
    guest_access_token: token,
  }

  await orderModule.updateOrders(orderId, {
    metadata: {
      ...prevMeta,
      restaurant: restaurantMeta,
    },
  })

  res.setHeader(
    "Set-Cookie",
    `_umami_order_access=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  )

  res.json({ access_token: token })
}
