import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { addItemWithModifiersWorkflow } from "../../../../../workflows/add-item-with-modifiers"

const BodySchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  option_ids: z.array(z.string()).default([]),
  note: z.string().max(500).optional(),
})

/**
 * POST /store/carts/:id/line-items-with-modifiers
 * Validates modifiers server-side, prices from DB, snapshots into line item metadata.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = BodySchema.parse(req.body)

  const { result } = await addItemWithModifiersWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      variant_id: body.variant_id,
      quantity: body.quantity,
      option_ids: body.option_ids,
      note: body.note,
    },
  })

  res.status(200).json({ cart: result.cart })
}
