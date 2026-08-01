import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"

const UpdateSchema = z.object({
  timezone: z.string().min(1).optional(),
  default_locale: z.string().min(1).optional(),
  supported_locales: z.array(z.string()).optional(),
  default_currency: z.string().optional(),
  default_prep_minutes: z.number().int().positive().optional(),
  max_item_quantity: z.number().int().positive().optional(),
  max_cart_quantity: z.number().int().positive().nullable().optional(),
  auto_accept_orders: z.boolean().optional(),
  scheduling_enabled: z.boolean().optional(),
  lead_time_minutes: z.number().int().nonnegative().optional(),
  schedule_slot_minutes: z.number().int().positive().optional(),
  schedule_max_days: z.number().int().positive().optional(),
  customer_notes_enabled: z.boolean().optional(),
  tips_enabled: z.boolean().optional(),
  guest_checkout_enabled: z.boolean().optional(),
  require_phone: z.boolean().optional(),
  require_email: z.boolean().optional(),
  show_sold_out: z.boolean().optional(),
  show_calories: z.boolean().optional(),
  show_allergens: z.boolean().optional(),
  price_display_mode: z.enum(["exact", "from"]).optional(),
  ordering_enabled: z.boolean().optional(),
  bag_fee_amount: z.number().nonnegative().nullable().optional(),
  service_fee_amount: z.number().nonnegative().nullable().optional(),
  cancel_grace_minutes: z.number().int().nonnegative().nullable().optional(),
  overdue_threshold_minutes: z.number().int().positive().optional(),
})

function serializeSettings(row: Record<string, unknown>) {
  const locales = row.supported_locales_json
  return {
    id: row.id,
    timezone: row.timezone,
    default_locale: row.default_locale,
    supported_locales: Array.isArray(locales) ? locales : ["ar", "en"],
    default_currency: row.default_currency,
    default_prep_minutes: row.default_prep_minutes,
    max_item_quantity: row.max_item_quantity,
    max_cart_quantity: row.max_cart_quantity,
    auto_accept_orders: row.auto_accept_orders,
    scheduling_enabled: row.scheduling_enabled,
    lead_time_minutes: row.lead_time_minutes,
    schedule_slot_minutes: row.schedule_slot_minutes,
    schedule_max_days: row.schedule_max_days,
    customer_notes_enabled: row.customer_notes_enabled,
    tips_enabled: row.tips_enabled,
    guest_checkout_enabled: row.guest_checkout_enabled,
    require_phone: row.require_phone,
    require_email: row.require_email,
    show_sold_out: row.show_sold_out,
    show_calories: row.show_calories,
    show_allergens: row.show_allergens,
    price_display_mode: row.price_display_mode,
    ordering_enabled: row.ordering_enabled,
    bag_fee_amount: row.bag_fee_amount,
    service_fee_amount: row.service_fee_amount,
    cancel_grace_minutes: row.cancel_grace_minutes,
    overdue_threshold_minutes: row.overdue_threshold_minutes,
    schema_version: row.schema_version,
  }
}

/**
 * GET /admin/restaurant/settings
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const settings = await restaurant.getOrCreateSettings()
  res.json({ settings: serializeSettings(settings as Record<string, unknown>) })
}

/**
 * POST /admin/restaurant/settings
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpdateSchema.parse(req.body)

  const patch: Record<string, unknown> = { ...body }
  if (body.supported_locales) {
    patch.supported_locales_json = body.supported_locales
    delete patch.supported_locales
  }

  const settings = await restaurant.updateSettings(patch)
  const row = Array.isArray(settings) ? settings[0] : settings
  res.json({ settings: serializeSettings(row as Record<string, unknown>) })
}
