import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { setCartRestaurantMetadataWorkflow } from "../../../../../workflows/set-cart-restaurant-metadata"
import { Modules } from "@medusajs/framework/utils"

const BodySchema = z.object({
  order_type: z.enum(["delivery", "pickup"]),
  branch_id: z.string().min(1),
  customer_note: z.string().max(500).optional(),
})

/**
 * POST /store/carts/:id/restaurant-meta
 * Persist order_type + branch snapshot on cart metadata (copied to order on complete).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = BodySchema.parse(req.body)

  await setCartRestaurantMetadataWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      order_type: body.order_type,
      branch_id: body.branch_id,
      customer_note: body.customer_note,
    },
  })

  const cartModule = req.scope.resolve(Modules.CART)
  const cart = await cartModule.retrieveCart(req.params.id)

  res.json({ cart })
}
