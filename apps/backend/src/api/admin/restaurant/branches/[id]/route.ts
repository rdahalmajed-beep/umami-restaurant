import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OpeningHoursJsonSchema } from "../../../../../modules/restaurant/opening-hours"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"
import { z } from "zod"

const UpdateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  name_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  slug: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  address_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  pickup_instructions: z.string().optional().nullable(),
  pickup_instructions_i18n_json: z
    .record(z.string(), z.string())
    .nullable()
    .optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  delivery_paused: z.boolean().optional(),
  pickup_paused: z.boolean().optional(),
  preparation_minutes: z.number().int().positive().optional(),
  prep_override_minutes: z.number().int().positive().nullable().optional(),
  prep_override_until: z.string().datetime().nullable().optional(),
  capacity_orders_per_hour: z.number().int().positive().nullable().optional(),
  scheduling_enabled: z.boolean().optional(),
  slot_minutes: z.number().int().positive().optional(),
  max_orders_per_slot: z.number().int().positive().nullable().optional(),
  schedule_max_days: z.number().int().positive().optional(),
  timezone: z.string().optional(),
  opening_hours_json: OpeningHoursJsonSchema.optional().nullable(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const branch = await restaurant.retrieveBranch(req.params.id)
  const operational_state = await restaurant.getBranchOperationalState(
    branch as Parameters<RestaurantModuleService["getBranchOperationalState"]>[0]
  )
  const zones = await restaurant.listDeliveryZones(
    { branch_id: req.params.id },
    { take: 50 }
  )
  const exceptions = await restaurant.listBranchExceptions(
    { branch_id: req.params.id },
    { take: 50 }
  )
  res.json({ branch, operational_state, zones, exceptions })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpdateBranchSchema.parse(req.body)
  const patch: Record<string, unknown> = { ...body }
  if (body.prep_override_until !== undefined) {
    patch.prep_override_until = body.prep_override_until
      ? new Date(body.prep_override_until)
      : null
  }
  const branch = await restaurant.updateBranches({
    id: req.params.id,
    ...patch,
  })
  await restaurant.writeAuditLog({
    action: "branch.update",
    resource_type: "branch",
    resource_id: req.params.id,
    after: body,
  })
  res.json({ branch })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  await restaurant.deleteBranches(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
