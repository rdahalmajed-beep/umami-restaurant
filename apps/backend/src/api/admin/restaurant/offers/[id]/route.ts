import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"

const UpdateSchema = z.object({
  internal_name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  title_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  description_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  terms: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional(),
  offer_type: z.string().optional(),
  code: z.string().nullable().optional(),
  auto_apply: z.boolean().optional(),
  exclusive: z.boolean().optional(),
  priority: z.number().int().optional(),
  rules_json: z.record(z.string(), z.unknown()).optional(),
  branch_ids_json: z.array(z.string()).nullable().optional(),
  order_types_json: z.array(z.string()).nullable().optional(),
  schedule_json: z.unknown().nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
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
  action: z.enum(["activate", "pause", "duplicate", "simulate"]).optional(),
  simulate_cart: z
    .object({
      subtotal: z.number(),
      item_count: z.number().optional(),
      branch_id: z.string().optional(),
      order_type: z.enum(["delivery", "pickup"]).optional(),
      product_ids: z.array(z.string()).optional(),
    })
    .optional(),
})

function evaluateOffer(
  offer: {
    status: string
    exclusive: boolean
    auto_apply: boolean
    code?: string | null
    rules_json?: Record<string, unknown> | null
    branch_ids_json?: string[] | null
    order_types_json?: string[] | null
    starts_at?: Date | string | null
    ends_at?: Date | string | null
  },
  cart: {
    subtotal: number
    item_count?: number
    branch_id?: string
    order_type?: string
    product_ids?: string[]
  }
) {
  const reasons: string[] = []
  const now = Date.now()
  if (offer.status !== "active" && offer.status !== "scheduled") {
    reasons.push("OFFER_NOT_ACTIVE")
  }
  if (offer.starts_at && new Date(offer.starts_at).getTime() > now) {
    reasons.push("OFFER_NOT_STARTED")
  }
  if (offer.ends_at && new Date(offer.ends_at).getTime() < now) {
    reasons.push("OFFER_ENDED")
  }
  const branches = offer.branch_ids_json
  if (
    cart.branch_id &&
    Array.isArray(branches) &&
    branches.length &&
    !branches.includes(cart.branch_id)
  ) {
    reasons.push("OFFER_BRANCH_MISMATCH")
  }
  const types = offer.order_types_json
  if (
    cart.order_type &&
    Array.isArray(types) &&
    types.length &&
    !types.includes(cart.order_type)
  ) {
    reasons.push("OFFER_ORDER_TYPE_MISMATCH")
  }

  const rules = (offer.rules_json || {}) as {
    min_order?: number
    max_discount?: number
    percent?: number
    amount?: number
    buy_qty?: number
    get_qty?: number
    bundle_qty?: number
    bundle_price?: number
    free_delivery_min?: number
  }

  if (rules.min_order != null && cart.subtotal < rules.min_order) {
    reasons.push(
      `OFFER_MIN_ORDER:${(rules.min_order - cart.subtotal).toFixed(3)}`
    )
  }

  let discount = 0
  if (!reasons.length) {
    if (rules.percent != null) {
      discount = (cart.subtotal * Number(rules.percent)) / 100
      if (rules.max_discount != null) {
        discount = Math.min(discount, Number(rules.max_discount))
      }
    } else if (rules.amount != null) {
      discount = Math.min(Number(rules.amount), cart.subtotal)
    } else if (
      rules.bundle_qty != null &&
      rules.bundle_price != null &&
      (cart.item_count || 0) >= rules.bundle_qty
    ) {
      // illustrative: fixed bundle savings vs subtotal not computed without item prices
      discount = 0
    } else if (rules.free_delivery_min != null) {
      if (cart.subtotal >= rules.free_delivery_min) {
        discount = 0 // delivery fee waived separately
      } else {
        reasons.push(
          `OFFER_MIN_ORDER:${(rules.free_delivery_min - cart.subtotal).toFixed(3)}`
        )
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    discount,
    free_delivery:
      !reasons.length &&
      rules.free_delivery_min != null &&
      cart.subtotal >= rules.free_delivery_min,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const offer = await restaurant.retrieveRestaurantOffer(req.params.id)
  res.json({ offer })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = UpdateSchema.parse(req.body)

  if (body.action === "simulate" && body.simulate_cart) {
    const offer = await restaurant.retrieveRestaurantOffer(req.params.id)
    const result = evaluateOffer(
      offer as Parameters<typeof evaluateOffer>[0],
      body.simulate_cart
    )
    res.json({ simulation: result, offer })
    return
  }

  if (body.action === "duplicate") {
    const src = await restaurant.retrieveRestaurantOffer(req.params.id)
    const [copy] = await restaurant.createRestaurantOffers([
      {
        internal_name: `${src.internal_name} (copy)`,
        title: src.title,
        offer_type: src.offer_type,
        description: src.description,
        rules_json: src.rules_json || {},
        status: "draft",
        auto_apply: src.auto_apply,
        exclusive: src.exclusive,
        priority: Number(src.priority || 100) + 1,
      },
    ])
    res.status(201).json({ offer: copy })
    return
  }

  const patch: Record<string, unknown> = { ...body }
  delete patch.action
  delete patch.simulate_cart
  if (body.action === "activate") patch.status = "active"
  if (body.action === "pause") patch.status = "paused"
  if (body.starts_at !== undefined) {
    patch.starts_at = body.starts_at ? new Date(body.starts_at) : null
  }
  if (body.ends_at !== undefined) {
    patch.ends_at = body.ends_at ? new Date(body.ends_at) : null
  }

  const offer = await restaurant.updateRestaurantOffers({
    id: req.params.id,
    ...patch,
  })
  res.json({ offer })
}
