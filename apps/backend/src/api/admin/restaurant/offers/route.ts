import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const CreateSchema = z.object({
  internal_name: z.string().min(1),
  title: z.string().min(1),
  offer_type: z.string().min(1),
  description: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  auto_apply: z.boolean().optional(),
  exclusive: z.boolean().optional(),
  priority: z.number().int().optional(),
  rules_json: z.record(z.string(), z.unknown()).optional(),
  branch_ids_json: z.array(z.string()).nullable().optional(),
  order_types_json: z.array(z.string()).nullable().optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  status: z
    .enum([
      "draft",
      "ready",
      "scheduled",
      "active",
      "paused",
      "ended",
      "archived",
    ])
    .optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const offers = await restaurant.listRestaurantOffers(
    {},
    { order: { priority: "ASC" }, take: 100 }
  )
  res.json({ offers })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = CreateSchema.parse(req.body)
  const [offer] = await restaurant.createRestaurantOffers([
    {
      ...body,
      starts_at: body.starts_at ? new Date(body.starts_at) : null,
      ends_at: body.ends_at ? new Date(body.ends_at) : null,
      rules_json: body.rules_json || {},
    },
  ])
  await restaurant.writeAuditLog({
    action: "offer.create",
    resource_type: "offer",
    resource_id: offer.id,
    after: body,
  })
  res.status(201).json({ offer })
}
