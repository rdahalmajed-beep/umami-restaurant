import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildMenuProjection } from "../../../../modules/restaurant/menu-projection"
import { consumeRateLimit } from "../../../../modules/restaurant/rate-limit"

/**
 * GET /store/restaurant/menu
 * Query: branch_id, order_type, locale, currency_code
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = consumeRateLimit({
    key: `menu-proj:${req.socket?.remoteAddress || "unknown"}`,
    limit: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    res.status(429).json({ message: "Rate limit exceeded" })
    return
  }

  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : null
  const order_type =
    req.query.order_type === "delivery" || req.query.order_type === "pickup"
      ? req.query.order_type
      : null
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : null
  const currency_code =
    typeof req.query.currency_code === "string"
      ? req.query.currency_code
      : "bhd"

  const { body, etag } = await buildMenuProjection(req.scope, {
    branch_id,
    order_type,
    locale,
    currency_code,
  })

  const ifNoneMatch = req.headers["if-none-match"]
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end()
    return
  }

  res.setHeader("ETag", etag)
  res.setHeader("Cache-Control", "public, max-age=15")
  res.json(body)
}
