import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import { buildMenuProjection } from "../../../../modules/restaurant/menu-projection"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { BrandContentSchema } from "../../../../modules/restaurant/content-schema"

/**
 * GET /store/restaurant/bootstrap
 * STORE-CONTRACT-001 — single contract for storefront decisions.
 * Query: branch_id, order_type, locale, currency_code, at (ISO), lat, lng
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const branch_id =
    typeof req.query.branch_id === "string" ? req.query.branch_id : null
  const order_type =
    req.query.order_type === "delivery" || req.query.order_type === "pickup"
      ? req.query.order_type
      : null
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : "ar"
  const currency_code =
    typeof req.query.currency_code === "string"
      ? req.query.currency_code
      : "bhd"
  const at =
    typeof req.query.at === "string" ? new Date(req.query.at) : new Date()

  const settings = await restaurant.getOrCreateSettings()
  const branches = await restaurant.listBranches(
    { is_active: true },
    { take: 50 }
  )

  const branchPayload = []
  for (const b of branches) {
    const operational_state = await restaurant.getBranchOperationalState(
      b as Parameters<RestaurantModuleService["getBranchOperationalState"]>[0],
      at
    )
    const zones = await restaurant.listDeliveryZones(
      { branch_id: b.id, is_active: true },
      { order: { sort_order: "ASC" }, take: 50 }
    )
    const policies = await restaurant.listBranchFulfillmentPolicies({
      branch_id: b.id,
    })
    branchPayload.push({
      id: b.id,
      name: (b as { name_i18n_json?: Record<string, string> }).name_i18n_json?.[
        locale
      ] || b.name,
      phone: b.phone,
      address: b.address,
      timezone: b.timezone,
      operational_state,
      accepts_delivery: b.accepts_delivery && !(b as { delivery_paused?: boolean }).delivery_paused,
      accepts_pickup: b.accepts_pickup && !(b as { pickup_paused?: boolean }).pickup_paused,
      preparation_minutes:
        (b as { prep_override_minutes?: number | null }).prep_override_minutes ??
        b.preparation_minutes,
      scheduling_enabled: !!(b as { scheduling_enabled?: boolean }).scheduling_enabled,
      slot_minutes: (b as { slot_minutes?: number }).slot_minutes ?? 15,
      schedule_max_days: (b as { schedule_max_days?: number }).schedule_max_days ?? 7,
      delivery_zones: zones.map((z: {
        id: string
        name: string
        name_i18n_json?: Record<string, string> | null
        min_order_amount: number
        fee_amount: number
        free_threshold?: number | null
        estimated_minutes: number
      }) => ({
        id: z.id,
        name: z.name_i18n_json?.[locale] || z.name,
        min_order_amount: Number(z.min_order_amount || 0),
        fee_amount: Number(z.fee_amount || 0),
        free_threshold: z.free_threshold != null ? Number(z.free_threshold) : null,
        estimated_minutes: Number(z.estimated_minutes || 30),
      })),
      policies: policies.map((p: {
        order_type: string
        min_order_amount: number
        flat_fee?: number | null
        estimated_minutes: number
        is_paused: boolean
      }) => ({
        order_type: p.order_type,
        min_order_amount: Number(p.min_order_amount || 0),
        fee_amount: p.flat_fee != null ? Number(p.flat_fee) : null,
        estimated_minutes: Number(p.estimated_minutes || 30),
        is_paused: !!p.is_paused,
      })),
    })
  }

  const { body: menu, etag } = await buildMenuProjection(req.scope, {
    branch_id,
    order_type,
    locale,
    currency_code,
  })

  const contentRows = await restaurant.listRestaurantContents({
    key: "brand",
    locale,
  })
  const contentParsed = BrandContentSchema.safeParse(
    contentRows[0]?.content_json || {}
  )

  const meals = await restaurant.listMeals(
    { status: "published" },
    { take: 50, relations: ["steps", "steps.items"] }
  )

  const offers = await restaurant.listRestaurantOffers(
    { status: "active" },
    { take: 50 }
  )

  const unavailable = branch_id
    ? await restaurant.listBranchResourceAvailabilities({
        branch_id,
        available: false,
      })
    : []

  const setup = {
    has_published_menu: (menu.menus || []).length > 0,
    has_branch: branches.length > 0,
    ordering_enabled: !!settings.ordering_enabled,
    missing: [] as string[],
  }
  if (!setup.has_branch) setup.missing.push("NO_BRANCH")
  if (!setup.has_published_menu) setup.missing.push("NO_PUBLISHED_MENU")
  if (!setup.ordering_enabled) setup.missing.push("ORDERING_PAUSED")

  res.setHeader("ETag", etag)
  res.json({
    contract_version: 1,
    locale,
    currency_code,
    at: at.toISOString(),
    settings: {
      timezone: settings.timezone,
      default_locale: settings.default_locale,
      supported_locales: settings.supported_locales_json || ["ar", "en"],
      default_currency: (settings as { default_currency?: string }).default_currency || "bhd",
      ordering_enabled: settings.ordering_enabled,
      ordering_pause_reason: (settings as { ordering_pause_reason?: string | null }).ordering_pause_reason || null,
      scheduling_enabled: settings.scheduling_enabled,
      show_sold_out: (settings as { show_sold_out?: boolean }).show_sold_out ?? true,
      show_allergens: (settings as { show_allergens?: boolean }).show_allergens ?? true,
      price_display_mode: (settings as { price_display_mode?: string }).price_display_mode || "from",
      locale_fallback: (settings as { locale_fallback?: string }).locale_fallback || "ar",
      tips_enabled: settings.tips_enabled,
      customer_notes_enabled: settings.customer_notes_enabled,
      max_item_quantity: settings.max_item_quantity,
    },
    content: contentParsed.success ? contentParsed.data : {},
    setup,
    branches: branchPayload,
    menu,
    availability: unavailable.map((u: {
      resource_type: string
      resource_id: string
      reason_code?: string | null
      display_mode?: string
      ends_at?: Date | string | null
    }) => ({
      resource_type: u.resource_type,
      resource_id: u.resource_id,
      reason_code: u.reason_code || null,
      display_mode: u.display_mode || "sold_out",
      ends_at: u.ends_at || null,
    })),
    meals: meals.map((m: {
      id: string
      title: string
      title_i18n_json?: Record<string, string> | null
      meal_type: string
      pricing_mode: string
      base_price: number
      unavailable_policy: string
      steps?: unknown[]
    }) => ({
      id: m.id,
      title: m.title_i18n_json?.[locale] || m.title,
      meal_type: m.meal_type,
      pricing_mode: m.pricing_mode,
      base_price: Number(m.base_price || 0),
      unavailable_policy: m.unavailable_policy,
      steps: m.steps || [],
    })),
    offers: offers.map((o: {
      id: string
      title: string
      title_i18n_json?: Record<string, string> | null
      offer_type: string
      code?: string | null
      auto_apply: boolean
      exclusive: boolean
      badge?: string | null
      rules_json?: unknown
      ends_at?: Date | string | null
    }) => ({
      id: o.id,
      title: o.title_i18n_json?.[locale] || o.title,
      offer_type: o.offer_type,
      code: o.code || null,
      auto_apply: o.auto_apply,
      exclusive: o.exclusive,
      badge: o.badge || null,
      rules: o.rules_json || {},
      ends_at: o.ends_at || null,
    })),
  })

  // silence unused if query needed later for prices
  void query
  void QueryContext
}
