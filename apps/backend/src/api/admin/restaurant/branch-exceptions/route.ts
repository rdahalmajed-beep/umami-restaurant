import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const Schema = z.object({
  id: z.string().optional(),
  branch_id: z.string().min(1),
  title: z.string().min(1),
  title_i18n_json: z.record(z.string(), z.string()).optional().nullable(),
  kind: z.enum(["closed", "special_hours", "capacity_override"]).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  opening_hours_json: z.unknown().optional().nullable(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : undefined
  const rows = await restaurant.listBranchExceptions(
    branch_id ? { branch_id } : {},
    { order: { starts_at: "ASC" }, take: 100 }
  )
  res.json({ exceptions: rows })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = Schema.parse(req.body)
  const payload = {
    ...body,
    starts_at: new Date(body.starts_at),
    ends_at: new Date(body.ends_at),
  }
  if (body.id) {
    const { id, ...rest } = payload
    const row = await restaurant.updateBranchExceptions({ id, ...rest })
    res.json({ exception: row })
    return
  }
  const [row] = await restaurant.createBranchExceptions([payload])
  res.status(201).json({ exception: row })
}
