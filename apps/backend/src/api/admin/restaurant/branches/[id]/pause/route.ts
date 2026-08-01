import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../../modules/restaurant/service"
import { kitchenEvents } from "../../../../../../modules/restaurant/kitchen-events"

const BodySchema = z.object({
  paused: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
  pause_until: z.string().datetime().optional().nullable(),
})

/**
 * POST /admin/restaurant/branches/:id/pause
 * Pause or resume a single branch.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  const body = BodySchema.parse(req.body)
  const branchId = req.params.id

  const branch = body.paused
    ? await restaurant.pauseBranch({
        branch_id: branchId,
        reason: body.reason,
        pause_until: body.pause_until,
      })
    : await restaurant.resumeBranch(branchId)

  const row = Array.isArray(branch) ? branch[0] : branch
  const operational_state = await restaurant.getBranchOperationalState(
    row as {
      is_active: boolean
      is_paused?: boolean | null
      pause_until?: Date | string | null
      opening_hours_json?: Record<string, unknown> | null
      timezone?: string | null
      capacity_orders_per_hour?: number | null
    }
  )

  await eventBus.emit({
    name: body.paused
      ? "restaurant.branch.paused"
      : "restaurant.branch.resumed",
    data: { branch_id: branchId, operational_state },
  })

  kitchenEvents.emitKitchen({
    type: body.paused ? "branch.paused" : "branch.resumed",
    branch_id: branchId,
  })

  res.json({ branch: row, operational_state })
}
