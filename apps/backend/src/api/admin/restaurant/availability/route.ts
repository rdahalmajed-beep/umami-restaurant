import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const BodySchema = z.object({
  branch_id: z.string().min(1),
  resource_type: z.enum(["product", "variant", "modifier_option"]),
  resource_id: z.string().min(1),
  available: z.boolean(),
  reason_code: z.string().max(100).optional().nullable(),
  display_mode: z
    .enum(["hide", "sold_out", "visible_disabled"])
    .optional()
    .nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  expected_version: z.number().int().positive().optional().nullable(),
})

/**
 * GET /admin/restaurant/availability?branch_id=
 * POST 86 / restore
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : undefined
  const available =
    req.query.available === "true"
      ? true
      : req.query.available === "false"
        ? false
        : undefined

  const filters: Record<string, unknown> = {}
  if (branch_id) filters.branch_id = branch_id
  if (available !== undefined) filters.available = available

  const rows = await restaurant.listBranchResourceAvailabilities(filters, {
    order: { updated_at: "DESC" },
    take: 200,
  })
  res.json({ availabilities: rows })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const body = BodySchema.parse(req.body)
  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id || "admin"

  const availability = await restaurant.setBranchResourceAvailability({
    branch_id: body.branch_id,
    resource_type: body.resource_type,
    resource_id: body.resource_id,
    available: body.available,
    reason_code: body.reason_code,
    expected_version: body.expected_version,
    changed_by: actor,
    display_mode: body.display_mode ?? undefined,
    ends_at: body.ends_at ? new Date(body.ends_at) : undefined,
  })

  const row = Array.isArray(availability) ? availability[0] : availability

  await restaurant.writeAuditLog({
    actor_id: actor,
    action: body.available ? "availability.restore" : "availability.86",
    resource_type: body.resource_type,
    resource_id: body.resource_id,
    after: body,
  })

  await eventBus.emit({
    name: "restaurant.availability.changed",
    data: {
      branch_id: body.branch_id,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      available: body.available,
      version: row.version,
    },
  })

  res.json({ availability: row })
}
