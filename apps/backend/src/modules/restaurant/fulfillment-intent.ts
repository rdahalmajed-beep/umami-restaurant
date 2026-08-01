import { MedusaError } from "@medusajs/framework/utils"

export type ShippingOptionLike = {
  id: string
  name?: string | null
  amount?: number | null
  type?: { code?: string | null; label?: string | null } | null
}

export function isPickupShippingOption(option: ShippingOptionLike): boolean {
  const code = option.type?.code?.toLowerCase()
  if (code === "pickup") return true
  if (code === "delivery") return false
  const name = (option.name || "").toLowerCase()
  return name.includes("pickup")
}

export function isDeliveryShippingOption(option: ShippingOptionLike): boolean {
  const code = option.type?.code?.toLowerCase()
  if (code === "delivery") return true
  if (code === "pickup") return false
  return !isPickupShippingOption(option)
}

/**
 * Choose the shipping option that matches order_type for this cart.
 * Until Module Links (Phase 2), match by option type.code / name heuristics.
 */
export function selectShippingOptionForIntent(
  options: ShippingOptionLike[],
  orderType: "delivery" | "pickup"
): ShippingOptionLike {
  const matched =
    orderType === "pickup"
      ? options.filter(isPickupShippingOption)
      : options.filter(isDeliveryShippingOption)

  if (!matched.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `RESTAURANT_FULFILLMENT_MISMATCH: no ${orderType} shipping option available for cart`
    )
  }

  // Prefer exact type.code match, then first remaining.
  const exact = matched.find(
    (o) => o.type?.code?.toLowerCase() === orderType
  )
  return exact || matched[0]
}

export function assertShippingMatchesIntent(input: {
  orderType: "delivery" | "pickup"
  shippingOption: ShippingOptionLike | null | undefined
  expectedOptionId?: string | null
}): void {
  if (!input.shippingOption) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: cart has no shipping method"
    )
  }

  if (
    input.expectedOptionId &&
    input.shippingOption.id !== input.expectedOptionId
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: shipping option does not match restaurant intent"
    )
  }

  const ok =
    input.orderType === "pickup"
      ? isPickupShippingOption(input.shippingOption)
      : isDeliveryShippingOption(input.shippingOption)

  if (!ok) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `RESTAURANT_FULFILLMENT_MISMATCH: shipping option is not ${input.orderType}`
    )
  }

  if (
    input.orderType === "pickup" &&
    input.shippingOption.amount != null &&
    Number(input.shippingOption.amount) > 0
  ) {
    // Soft rule: warn via error code if pickup is charged delivery-like fee.
    // Seed uses 0 for pickup; reject unexpected positive delivery fees on pickup.
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RESTAURANT_FULFILLMENT_MISMATCH: pickup must not charge delivery"
    )
  }
}
