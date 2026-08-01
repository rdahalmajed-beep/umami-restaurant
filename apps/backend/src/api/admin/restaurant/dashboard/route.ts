import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { kitchenEvents } from "../../../../modules/restaurant/kitchen-events"

/**
 * GET /admin/restaurant/dashboard
 * Control Center snapshot: kitchen counts, settings, branches, today commerce.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const settings = await restaurant.getOrCreateSettings()
  const { orders: active } = await restaurant.listActiveKitchenOrders({
    limit: 100,
  })

  const counts = {
    received: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    out_for_delivery: 0,
    active_total: active.length,
    overdue: 0,
  }

  const now = Date.now()
  for (const row of active as {
    status: string
    created_at?: string | Date
    branch_id?: string | null
  }[]) {
    if (row.status === "received") counts.received++
    else if (row.status === "accepted") counts.accepted++
    else if (row.status === "preparing") counts.preparing++
    else if (row.status === "ready") counts.ready++
    else if (row.status === "out_for_delivery") counts.out_for_delivery++

    const created = row.created_at ? new Date(row.created_at).getTime() : now
    const prep = Number(settings.default_prep_minutes || 20)
    if (now > created + prep * 60_000) {
      counts.overdue++
    }
  }

  const branches = await restaurant.listBranches({}, { take: 50 })
  const branch_states = await Promise.all(
    (branches as {
      id: string
      name: string
      is_active: boolean
      is_paused?: boolean
      pause_until?: Date | string | null
      opening_hours_json?: Record<string, unknown> | null
      timezone?: string | null
      capacity_orders_per_hour?: number | null
      preparation_minutes?: number
    }[]).map(async (b) => ({
      id: b.id,
      name: b.name,
      is_active: b.is_active,
      is_paused: !!b.is_paused,
      preparation_minutes: b.preparation_minutes ?? 20,
      operational_state: await restaurant.getBranchOperationalState(b),
    }))
  )

  const unavailable = await restaurant.listBranchResourceAvailabilities({
    available: false,
  })

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data: todayOrders } = await query.graph({
    entity: "order",
    fields: ["id", "total", "created_at", "currency_code"],
    filters: {
      created_at: { $gte: startOfDay.toISOString() },
    },
  })

  const todayList = (todayOrders || []) as {
    total?: number | null
    currency_code?: string
  }[]
  const today_orders = todayList.length
  const today_revenue = todayList.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  )
  const today_aov = today_orders ? today_revenue / today_orders : 0

  res.json({
    counts,
    settings: {
      id: settings.id,
      ordering_enabled: settings.ordering_enabled,
      default_prep_minutes: settings.default_prep_minutes,
      timezone: settings.timezone,
      default_locale: settings.default_locale,
    },
    branches: branch_states,
    unavailable_count: unavailable.length,
    today: {
      orders: today_orders,
      revenue: today_revenue,
      aov: today_aov,
      currency_code: todayList[0]?.currency_code || "bhd",
    },
  })
}

/**
 * POST /admin/restaurant/dashboard/actions
 * Hot actions: pause/resume ordering, adjust default prep.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = (req.body || {}) as {
    action?: string
    prep_delta?: number
    prep_minutes?: number
  }

  const settings = await restaurant.getOrCreateSettings()

  if (body.action === "pause_ordering") {
    await restaurant.updateSettings({ ordering_enabled: false })
  } else if (body.action === "resume_ordering") {
    await restaurant.updateSettings({ ordering_enabled: true })
  } else if (body.action === "prep_adjust") {
    const delta = Number(body.prep_delta || 0)
    const next = Math.max(5, Number(settings.default_prep_minutes || 20) + delta)
    await restaurant.updateSettings({ default_prep_minutes: next })
  } else if (body.action === "prep_reset") {
    await restaurant.updateSettings({
      default_prep_minutes: Number(body.prep_minutes || 20),
    })
  } else {
    res.status(400).json({ message: "Unknown action" })
    return
  }

  const updated = await restaurant.getOrCreateSettings()
  kitchenEvents.emitKitchen({ type: "settings.updated" })

  res.json({
    settings: {
      id: updated.id,
      ordering_enabled: updated.ordering_enabled,
      default_prep_minutes: updated.default_prep_minutes,
    },
  })
}
