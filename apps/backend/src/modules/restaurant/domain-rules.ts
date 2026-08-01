import { MedusaError } from "@medusajs/framework/utils"

export type ModifierSnapshotItem = {
  group_id: string
  group_name: string
  option_id: string
  option_name: string
  price_adjustment: number
}

export type ValidatedModifiersResult = {
  snapshot: ModifierSnapshotItem[]
  modifiers_unit_price: number
}

export type RestaurantOrderStatus =
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"

export const RESTAURANT_ORDER_STATUSES: RestaurantOrderStatus[] = [
  "received",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
]

/** Active kitchen statuses shown in the inbox (not completed/cancelled). */
export const ACTIVE_KITCHEN_STATUSES: RestaurantOrderStatus[] = [
  "received",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
]

/** Allowed forward transitions (kitchen flow). Cancelled is terminal. */
export const ALLOWED_TRANSITIONS: Record<
  RestaurantOrderStatus,
  RestaurantOrderStatus[]
> = {
  received: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export type ModifierGroupInput = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  is_required: boolean
  min_selections: number
  max_selections: number
  options: {
    id: string
    name: string
    price_adjustment: number
    is_default?: boolean
    is_active?: boolean
    sort_order?: number
  }[]
}

function roundMoney(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Pure modifier validation + pricing (shared by service and unit tests).
 */
export function validateModifierSelections(
  groups: ModifierGroupInput[],
  optionIds: string[]
): ValidatedModifiersResult {
  const selected = new Set(optionIds)
  const snapshot: ModifierSnapshotItem[] = []
  let modifiersUnitPrice = 0

  const optionToGroup = new Map<
    string,
    {
      group: ModifierGroupInput
      option: ModifierGroupInput["options"][number]
    }
  >()

  for (const group of groups) {
    for (const option of group.options) {
      optionToGroup.set(option.id, { group, option })
    }
  }

  for (const optionId of selected) {
    if (!optionToGroup.has(optionId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Modifier option ${optionId} is not valid for this product`
      )
    }
  }

  for (const group of groups) {
    const chosen = group.options.filter((o) => selected.has(o.id))
    const count = chosen.length

    if (group.selection_type === "single" && count > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Group "${group.name}" allows only one selection`
      )
    }

    const min = group.is_required
      ? Math.max(group.min_selections, 1)
      : group.min_selections
    const max = group.max_selections

    if (count < min) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Group "${group.name}" requires at least ${min} selection(s)`
      )
    }

    if (count > max) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Group "${group.name}" allows at most ${max} selection(s)`
      )
    }

    for (const option of chosen) {
      const adjustment = Number(option.price_adjustment) || 0
      modifiersUnitPrice += adjustment
      snapshot.push({
        group_id: group.id,
        group_name: group.name,
        option_id: option.id,
        option_name: option.name,
        price_adjustment: adjustment,
      })
    }
  }

  return {
    snapshot,
    modifiers_unit_price: roundMoney(modifiersUnitPrice),
  }
}

/**
 * Pure kitchen status transition rules (shared by service and unit tests).
 */
export function assertRestaurantStatusTransition(
  from: RestaurantOrderStatus,
  to: RestaurantOrderStatus,
  orderType?: "delivery" | "pickup" | null
) {
  if (from === to) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Status is already ${to}`
    )
  }

  if (from === "cancelled") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot transition from cancelled"
    )
  }

  if (to === "ready" && (from === "received" || from === "accepted")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot set ready before preparing (must accept first)"
    )
  }

  const allowed = ALLOWED_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid transition ${from} → ${to}`
    )
  }

  if (to === "out_for_delivery" && orderType === "pickup") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Pickup orders cannot enter out_for_delivery"
    )
  }
}

export function canTransitionRestaurantStatus(
  from: RestaurantOrderStatus,
  to: RestaurantOrderStatus,
  orderType: "delivery" | "pickup" = "delivery"
): boolean {
  try {
    assertRestaurantStatusTransition(from, to, orderType)
    return true
  } catch {
    return false
  }
}
