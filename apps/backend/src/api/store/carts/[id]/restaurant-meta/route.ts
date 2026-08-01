import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { setRestaurantFulfillmentIntentWorkflow } from "../../../../../workflows/set-restaurant-fulfillment-intent"

const BodySchema = z.object({
  order_type: z.enum(["delivery", "pickup"]),
  branch_id: z.string().min(1),
  customer_note: z.string().max(500).optional(),
  delivery_zone_id: z.string().min(1).optional(),
})

/**
 * POST /store/carts/:id/restaurant-meta
 * Canonical restaurant fulfillment intent (branch + type + shipping option).
 * Keeps the historical path name for storefront compatibility.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = BodySchema.parse(req.body)

  const { result } = await setRestaurantFulfillmentIntentWorkflow(
    req.scope
  ).run({
    input: {
      cart_id: req.params.id,
      order_type: body.order_type,
      branch_id: body.branch_id,
      customer_note: body.customer_note,
      delivery_zone_id: body.delivery_zone_id,
    },
  })

  res.json({
    cart: result.cart,
    restaurant: result.restaurant,
    shipping_option_id: result.shipping_option_id,
  })
}
