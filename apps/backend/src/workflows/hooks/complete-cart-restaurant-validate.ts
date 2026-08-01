import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../modules/restaurant"
import RestaurantModuleService from "../../modules/restaurant/service"
import {
  assertShippingMatchesIntent,
  type ShippingOptionLike,
} from "../../modules/restaurant/fulfillment-intent"
import { assertModifierCurrency } from "../../modules/restaurant/modifier-currency-policy"
import type { RestaurantOrderMetadata } from "../../modules/restaurant/types"

/**
 * ORD-002 — validate-only complete-cart hook. Never mutate cart here.
 */
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const settings = await restaurant.getOrCreateSettings()
  if (!settings.ordering_enabled) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_BRANCH_PAUSED: ordering is globally paused"
    )
  }

  const meta = (cart?.metadata?.restaurant || null) as
    | RestaurantOrderMetadata
    | null

  if (!meta?.branch_id || !meta?.order_type) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: restaurant intent missing on cart"
    )
  }

  let branch: {
    id: string
    is_active: boolean
    accepts_delivery: boolean
    accepts_pickup: boolean
    is_paused?: boolean
    pause_until?: Date | string | null
    opening_hours_json?: Record<string, unknown> | null
    timezone?: string | null
    capacity_orders_per_hour?: number | null
  }
  try {
    branch = await restaurant.retrieveBranch(meta.branch_id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_BRANCH_CLOSED: branch not found"
    )
  }

  if (!branch.is_active) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_BRANCH_CLOSED: branch is not active"
    )
  }

  const operational = await restaurant.getBranchOperationalState(branch)
  if (operational === "paused") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_BRANCH_PAUSED: branch is paused"
    )
  }
  if (operational === "closed") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_BRANCH_CLOSED: branch is closed"
    )
  }
  if (operational === "at_capacity") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_BRANCH_PAUSED: branch is at capacity"
    )
  }

  if (meta.order_type === "delivery" && !branch.accepts_delivery) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: branch does not accept delivery"
    )
  }

  if (meta.order_type === "pickup" && !branch.accepts_pickup) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: branch does not accept pickup"
    )
  }

  const shippingMethods = (cart.shipping_methods || []) as {
    shipping_option_id?: string
    amount?: number | null
  }[]

  const optionId =
    shippingMethods[shippingMethods.length - 1]?.shipping_option_id || null

  if (!optionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: cart has no shipping method"
    )
  }

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "type.code", "type.label"],
    filters: { id: optionId },
  })

  const option = (options?.[0] || null) as ShippingOptionLike | null
  const methodAmount =
    shippingMethods[shippingMethods.length - 1]?.amount ?? null

  assertShippingMatchesIntent({
    orderType: meta.order_type,
    shippingOption: option
      ? { ...option, amount: methodAmount }
      : null,
    // Type match is enough until branch↔option Module Links exist.
    // Exact option id may diverge if the customer picks another same-type option.
    expectedOptionId: null,
  })

  // Soft availability: refuse empty carts (Medusa also checks, but keep explicit).
  if (!cart.items?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_ITEM_UNAVAILABLE: cart has no items"
    )
  }

  try {
    assertModifierCurrency(
      (cart as { currency_code?: string }).currency_code || null
    )
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : "RESTAURANT_CURRENCY_MISMATCH"
    )
  }

  const policies = await restaurant.listBranchFulfillmentPolicies({
    branch_id: meta.branch_id,
    order_type: meta.order_type,
  })
  const policy = policies[0]
  if (policy?.is_paused) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `RESTAURANT_FULFILLMENT_PAUSED: ${meta.order_type} paused for branch`
    )
  }
  if (policy && Number(policy.min_order_amount || 0) > 0) {
    const subtotal = Number(
      (cart as { subtotal?: number; item_total?: number }).subtotal ??
        (cart as { item_total?: number }).item_total ??
        0
    )
    if (subtotal < Number(policy.min_order_amount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `RESTAURANT_MIN_ORDER: minimum ${policy.min_order_amount} required`
      )
    }
  }

  // FUL-UX-001: delivery zone fee is authoritative (must match cart metadata).
  if (meta.order_type === "delivery" && meta.delivery_zone_id) {
    const zones = await restaurant.listDeliveryZones({
      id: meta.delivery_zone_id,
      branch_id: meta.branch_id,
    })
    const zone = zones[0]
    if (!zone || zone.is_active === false) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "RESTAURANT_ZONE_INVALID: delivery zone not available"
      )
    }
    const zoneMin = Number(zone.min_order_amount || 0)
    const subtotal = Number(
      (cart as { subtotal?: number; item_total?: number }).subtotal ??
        (cart as { item_total?: number }).item_total ??
        0
    )
    if (zoneMin > 0 && subtotal < zoneMin) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `RESTAURANT_MIN_ORDER: minimum ${zoneMin} required for zone`
      )
    }
    const expectedFee =
      zone.free_threshold != null && subtotal >= Number(zone.free_threshold)
        ? 0
        : Number(zone.fee_amount || 0)
    const metaFee =
      meta.delivery_fee != null ? Number(meta.delivery_fee) : null
    if (metaFee == null || Math.abs(metaFee - expectedFee) > 0.001) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `RESTAURANT_DELIVERY_FEE_MISMATCH: expected ${expectedFee}`
      )
    }
  }

  if (
    meta.order_type === "delivery" &&
    (branch as { delivery_paused?: boolean }).delivery_paused
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_FULFILLMENT_PAUSED: delivery paused for branch"
    )
  }
  if (
    meta.order_type === "pickup" &&
    (branch as { pickup_paused?: boolean }).pickup_paused
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "RESTAURANT_FULFILLMENT_PAUSED: pickup paused for branch"
    )
  }
})
